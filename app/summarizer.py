import math, time, re
from pathlib import Path
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from .config import SUMMARIZE_BATCH_TOKENS
from .utils import log_event, write_json
from .config import CHUNK_TOKENS, CHUNK_OVERLAP

SYSTEM_PROMPT = """You are a professional medical summarization assistant specialized in analyzing hospital medical reports.

Your goal is to generate a comprehensive and structured medical summary based strictly on the retrieved report sections below.

Instructions:
1. Adhere to recognized Indian clinical and diagnostic guidelines (ICMR, NMC, NABH).
2. Present only verified information found in the provided text — do not infer or assume missing details.
3. Clearly indicate any incomplete, unclear, or missing information.
4. Use precise, formal medical terminology suitable for healthcare professionals.
5. Present the summary in clear, professional medical language.
6. Remove any original bullet points, symbols (+, *, -), or formatting from the retrieved text.
7. Use plain text with proper headings as shown below.
8. IMPORTANT: Always start with Patient Demographics - extract the patient's name, age, and gender from the report.

---

**Output Format:**

1. Patient Demographics:
<Extract and display: Patient Name, Age, Gender. Look for patterns like "Mrs./Mr. [Name]", "[Age] Yrs/Years", "Male/Female". This MUST be the first section.>

2. Patient Presentation & Chief Complaint:  
<describe symptoms and reason for admission>

3. Clinical Findings & Examination Results:
<document physical findings, vital signs, physician observations>

4. Diagnostic Tests & Imaging Findings:  
<list laboratory, radiology, and diagnostic reports with their values and interpretations>

5. Treatment & Medications: 
<summarize treatments administered and drugs prescribed or suggest the medications related to the diseases patient diagnosed with>

6. Follow-up Recommendations & Prognosis: 
<include discharge advice, further tests, prognosis, or review schedule>

7. Notes:  
<clearly mention if any data is missing or ambiguous>

---

Retrieved Report Content:
{context}

"""

# Initialize NVIDIA client
nvidia_client = ChatNVIDIA(
    model="mistralai/mixtral-8x22b-instruct-v0.1",
    api_key="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", 
    temperature=0.5,
    top_p=0.7,
    max_tokens=1024,
)

def call_nvidia_llm(messages, temperature=0.5, max_retries=3):
    """Call NVIDIA API with retry logic"""
    for attempt in range(max_retries):
        try:
            # Create a temporary client with the specified temperature
            temp_client = ChatNVIDIA(
                model="mistralai/mixtral-8x22b-instruct-v0.1",
                api_key="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", 
                temperature=temperature,
                top_p=0.7,
                max_tokens=1024,
            )
            
            # Get the response (non-streaming)
            response = temp_client.invoke(messages)
            return response.content
            
        except Exception as e:
            print(f"NVIDIA API Error (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt == max_retries - 1:  # Last attempt
                print("All retries failed")
                raise e
            else:
                print(f"Retrying in 5 seconds...")
                time.sleep(5)
                continue
    
    # If we get here, all retries failed
    raise Exception("Failed to get response from NVIDIA API after all retries")

def format_summary_text(text):
    """Convert markdown-style markers to HTML bold/italic and preserve line breaks."""
    # First, preserve line breaks by converting \n to placeholder
    text = text.replace('\n', '\x00NEWLINE\x00')
    
    # Convert ***text*** to <b><i>text</i></b>
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<b><i>\1</i></b>', text, flags=re.DOTALL)
    # Convert **text** to <b>text</b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text, flags=re.DOTALL)
    # Convert *text* to <i>text</i>
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text, flags=re.DOTALL)
    # Convert __text__ to <b>text</b>
    text = re.sub(r'__(.+?)__', r'<b>\1</b>', text, flags=re.DOTALL)
    # Convert _text_ to <i>text</i>  (not within words)
    text = re.sub(r'(?<!\w)_(.+?)_(?!\w)', r'<i>\1</i>', text, flags=re.DOTALL)
    # Remove any leftover stray * that aren't part of patterns
    text = re.sub(r'(?<!\w)\*(?!\*)', '', text)
    
    # Convert numbered lists - preserve indentation
    lines = text.split('\x00NEWLINE\x00')
    formatted_lines = []
    for line in lines:
        # Preserve indentation for continuations
        if line.strip():
            # Convert lines starting with numbers to proper format
            line = re.sub(r'^(\s*)(\d+)\.\s+', r'\1<strong>\2.</strong> ', line)
        formatted_lines.append(line)
    
    # Restore line breaks as HTML <br> tags
    text = '<br>'.join(formatted_lines)
    return text

def map_reduce_summarize(chunks, final_context_limit=SUMMARIZE_BATCH_TOKENS):
    """
    chunks: list of chunk dicts (ordered)
    Strategy:
      - Batch chunks into groups that approximate token limit
      - Summarize each batch (map)
      - Consolidate intermediate summaries (reduce)
      - Final polishing pass with verification prompt
    """
    # batch accumulation (approx by characters)
    batches = []
    cur = []
    cur_chars = 0
    for c in chunks:
        cur.append(c)
        cur_chars += len(c["text"])
        # heuristic: average 4 chars per token -> chunk when exceed threshold
        if cur_chars > final_context_limit * 4:
            batches.append(cur)
            cur = []
            cur_chars = 0
    if cur:
        batches.append(cur)

    intermediate_summaries = []
    for i, batch in enumerate(batches):
        content = "\n\n".join([f"PAGE {b['page_index']}\n{b['text']}" for b in batch])
        messages = [
            {"role":"system","content": SYSTEM_PROMPT},
            {"role":"user","content": f"Analyze and summarize the following medical content. Focus on clinical significance and medical details. Section {i+1} of {len(batches)}:\n\n{content}"}
        ]
        summary = call_nvidia_llm(messages)
        intermediate_summaries.append(summary)
        # Longer delay to avoid rate limits
        time.sleep(2.0)

    # reduce
    combined = "\n\n".join(intermediate_summaries)
    messages = [
        {"role":"system","content": SYSTEM_PROMPT},
        {"role":"user","content": f"Create a comprehensive, well-structured medical summary by consolidating these section summaries. Organize with proper medical headings and ensure all important clinical details are preserved:\n\n{combined}"}
    ]
    final_summary = call_nvidia_llm(messages)
    
    # Clean markdown markers and convert to HTML formatting
    final_summary = format_summary_text(final_summary)
    
    # store audit
    write_json(Path("logs") / f"summary_{int(time.time())}.json", {"intermediate": intermediate_summaries, "consolidated": combined, "final": final_summary})
    log_event("summarization", {"num_chunks": len(chunks)})
    return final_summary
