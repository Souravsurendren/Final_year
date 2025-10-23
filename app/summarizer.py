import math, time
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
5.Present the summary in clear, professional medical language.
6.Remove any original bullet points, symbols (+, *, -), or formatting from the retrieved text.
7. Use plain text with proper headings as shown below.

---

**Output Format:**

1. Patient Presentation & Chief Complaint:  
<describe symptoms and reason for admission>

2. Clinical Findings & Examination Results:
<document physical findings, vital signs, physician observations>

3. Diagnostic Tests & Imaging Findings:  
<list laboratory, radiology, and diagnostic reports>

4. Treatment & Medications: 
<summarize treatments administered and drugs prescribed or suggest the medications related to the diseases patient diagnosed with>

5. Follow-up Recommendations & Prognosis: 
<include discharge advice, further tests, prognosis, or review schedule>

6. Notes:  
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
    
    # store audit
    write_json(Path("logs") / f"summary_{int(time.time())}.json", {"intermediate": intermediate_summaries, "consolidated": combined, "final": final_summary})
    log_event("summarization", {"num_chunks": len(chunks)})
    return final_summary
