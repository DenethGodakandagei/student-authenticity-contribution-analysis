import os
# pyrefly: ignore [missing-import]
from pypdf import PdfReader
# pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter

def process_pdf(file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200):
    """
    Extracts text and page count from a PDF file, splits the text into chunks.
    
    Returns:
        dict: Containing 'num_pages', 'chunks', and 'preview_text'.
    """
    reader = PdfReader(file_path)
    num_pages = len(reader.pages)
    
    extracted_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            extracted_text += text + "\n"
            
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    
    chunks = text_splitter.split_text(extracted_text)
    
    # Generate a preview snippet from extracted text
    preview_text = extracted_text[:300].strip() if extracted_text else ""
    
    return {
        "num_pages": num_pages,
        "chunks": chunks,
        "num_chunks": len(chunks),
        "preview_text": preview_text
    }
