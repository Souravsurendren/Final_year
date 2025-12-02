#!/usr/bin/env python3
"""
Simple HTTP server to serve the metrics dashboard
"""
import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

def serve_dashboard(port=8080):
    """Start a simple HTTP server to serve the metrics dashboard"""
    
    # Change to the project directory
    os.chdir(Path(__file__).parent)
    
    # Create handler
    handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"🌐 Serving metrics dashboard at http://localhost:{port}")
            print(f"📊 Open http://localhost:{port}/metrics_dashboard.html in your browser")
            print("🔴 Press Ctrl+C to stop the server")
            
            # Try to open the browser automatically
            try:
                webbrowser.open(f'http://localhost:{port}/metrics_dashboard.html')
            except:
                pass
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n✅ Server stopped")
    except OSError as e:
        if e.errno == 10048:  # Address already in use on Windows
            print(f"❌ Port {port} is already in use. Try a different port.")
            serve_dashboard(port + 1)
        else:
            print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    serve_dashboard()