import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app can be imported
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

def create_sample_pdf(file_path: str):
    """
    Creates a sample PDF with multi-page lecture notes for testing.
    Uses basic PDF binary generation standard to ensure pypdf can read it natively without extra dependencies.
    """
    # Create a 2-page sample PDF file
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"5 0 obj << /Length 210 >> stream\n"
        b"BT /F1 14 Tf 50 750 Td (Lecture 1: Introduction to Artificial Intelligence) Tj ET\n"
        b"BT /F1 12 Tf 50 720 Td (Artificial Intelligence is the simulation of human intelligence in machines.) Tj ET\n"
        b"BT /F1 12 Tf 50 690 Td (Key concepts: Machine Learning, Neural Networks, Natural Language Processing.) Tj ET\n"
        b"endstream\n"
        b"endobj\n"
        b"6 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >> endobj\n"
        b"7 0 obj << /Length 230 >> stream\n"
        b"BT /F1 14 Tf 50 750 Td (Lecture 2: Document Processing and Chunking) Tj ET\n"
        b"BT /F1 12 Tf 50 720 Td (Text chunking breaks documents into manageable pieces for vector search.) Tj ET\n"
        b"BT /F1 12 Tf 50 690 Td (RecursiveCharacterTextSplitter preserves semantic context across chunks.) Tj ET\n"
        b"endstream\n"
        b"endobj\n"
        b"xref\n"
        b"0 8\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000122 00000 n \n"
        b"0000000253 00000 n \n"
        b"0000000325 00000 n \n"
        b"0000000587 00000 n \n"
        b"0000000718 00000 n \n"
        b"trailer << /Size 8 /Root 1 0 R >>\n"
        b"startxref\n"
        b"1000\n"
        b"%%EOF\n"
    )
    with open(file_path, "wb") as f:
        f.write(pdf_content)
    print(f"Created sample PDF file at: {file_path}")

def run_test():
    uploads_dir = backend_dir / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    sample_pdf_path = uploads_dir / "sample_lecture.pdf"
    
    print("\n==========================================")
    print("STEP 1: Upload / Create Sample Lecture PDF")
    print("==========================================")
    create_sample_pdf(str(sample_pdf_path))
    
    print("\n==========================================")
    print("STEP 2 & 3: Extract Content & Print Chunks")
    print("==========================================")
    try:
        from app.pdf_processor import process_pdf
        # Use small chunk size for test output demonstration
        result = process_pdf(str(sample_pdf_path), chunk_size=150, chunk_overlap=20)
        
        print(f"Page Count: {result['num_pages']}")
        print(f"Total Chunks: {result['num_chunks']}")
        print("\n--- Preview Text Snippet ---")
        print(result['preview_text'])
        
        print("\n--- Generated Chunks ---")
        for idx, chunk in enumerate(result['chunks'], 1):
            print(f"\n[Chunk {idx}]:")
            print(chunk)
            print("-" * 40)
            
        print("\n==========================================")
        print("STEP 4: Verification Result")
        print("==========================================")
        assert result['num_pages'] == 2, f"Expected 2 pages, got {result['num_pages']}"
        assert result['num_chunks'] > 0, "Expected at least 1 chunk generated"
        assert len(result['chunks']) == result['num_chunks'], "Chunk count mismatch"
        print("VERIFICATION SUCCESS: PDF Reader and text chunking processor operate correctly!")
        
    except Exception as e:
        print(f"ERROR: PDF Processor test failed with exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
