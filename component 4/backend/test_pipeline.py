import os
import sys
import unittest

# Ensure app package is importable
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_mock_pdf_bytes():
    return (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"5 0 obj << /Length 150 >> stream\n"
        b"BT /F1 14 Tf 50 700 Td (Lecture Note: Machine Learning Fundamentals) Tj ET\n"
        b"BT /F1 12 Tf 50 670 Td (RAG pipeline converts text chunks to embeddings.) Tj ET\n"
        b"endstream\n"
        b"endobj\n"
        b"xref\n"
        b"0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000246 00000 n \n"
        b"0000000318 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\n"
        b"startxref\n"
        b"520\n"
        b"%%EOF\n"
    )

def test_full_pipeline_flow():
    print("\n--- Pipeline Step 1: Uploading Student Lecture PDF to FastAPI Upload API ---")
    pdf_bytes = create_mock_pdf_bytes()
    files = {"file": ("student_lecture.pdf", pdf_bytes, "application/pdf")}
    
    response = client.post("/upload-material", files=files)
    
    print(f"API Response Status Code: {response.status_code}")
    assert response.status_code == 200, f"Upload failed: {response.text}"
    
    data = response.json()
    print("\n--- Pipeline Step 2 & 3: FastAPI -> PDF Processor -> Atlas Misconception Generator ---")
    print(f"Uploaded Filename       : {data.get('filename')}")
    print(f"Number of Pages         : {data.get('number_of_pages')}")
    print(f"Number of Chunks        : {data.get('number_of_chunks')}")
    print(f"Detected Topic          : {data.get('detected_topic')}")
    print(f"Generated Misconceptions: {len(data.get('generated_misconceptions', []))} items")
    
    print("\n--- Sample Misconceptions Returned ---")
    for idx, item in enumerate(data.get("generated_misconceptions", []), 1):
        print(f"[{idx}] Misconception: {item['misconception']}")
        print(f"    Correction   : {item['correct_explanation']}")
    
    print("\n--- Pipeline Step 4: Verification Result ---")
    assert data["number_of_pages"] > 0
    assert data["number_of_chunks"] > 0
    assert "detected_topic" in data and len(data["detected_topic"]) > 0
    assert "generated_misconceptions" in data and len(data["generated_misconceptions"]) > 0
    print("STATUS: Upload API, PDF Extractor, and Atlas Misconception Generator verified end-to-end!")


if __name__ == "__main__":
    test_full_pipeline_flow()
