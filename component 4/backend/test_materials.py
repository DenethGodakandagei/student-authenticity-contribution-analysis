"""Tests for student PDF materials, private KB ownership, and pages.json.

The embedding model and LLM are stubbed, so no model download or Ollama call
is made. Route tests use FastAPI's dependency override for authentication.

Run: python test_materials.py
"""
import json
import os
import shutil
import sys
import tempfile
from types import SimpleNamespace

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.config import settings

settings.JWT_SECRET = "test-secret-" + "x" * 50
settings.JWT_ALGORITHM = "HS256"

from app import grounded_misconceptions as grounded_module
from app import ingest as ingest_module
from app import materials as materials_module
from app.auth import get_current_user
from app.grounded_misconceptions import build_misconception_repository
from app.ingest import save_pages

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"


def test_save_pages_numbers_lines():
    tmpdir = tempfile.mkdtemp(prefix="nova-pages-test-")
    old_dir = ingest_module.KNOWLEDGE_DIR
    ingest_module.KNOWLEDGE_DIR = tmpdir
    try:
        save_pages(
            [{"page": 2, "text": "First line\nSecond line"}, {"page": 5, "text": "Only"}],
            "kb1",
        )
        with open(os.path.join(tmpdir, "kb1", "pages.json"), "r", encoding="utf-8") as f:
            pages = json.load(f)
        assert pages == [
            {"page": 2, "lines": ["1: First line", "2: Second line"]},
            {"page": 5, "lines": ["1: Only"]},
        ]
        print("  OK save_pages: page text stored as numbered lines.")
    finally:
        ingest_module.KNOWLEDGE_DIR = old_dir
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_repository_uses_supplied_concepts():
    tmpdir = tempfile.mkdtemp(prefix="nova-concepts-test-")
    old_dir = grounded_module.KNOWLEDGE_DIR
    old_load = grounded_module.KnowledgeBase.load
    old_extract = grounded_module._extract_concepts
    old_generate = grounded_module._generate_grounded_for_concept
    seen = []

    grounded_module.KNOWLEDGE_DIR = tmpdir
    grounded_module.KnowledgeBase.load = classmethod(
        lambda cls, kb_id: SimpleNamespace(
            kb_id=kb_id,
            chunks=[{"chunk_id": "p1_c0", "page": 1, "text": "text"}],
        )
    )
    grounded_module._extract_concepts = lambda *args, **kwargs: (_ for _ in ()).throw(
        AssertionError("extraction must be skipped when concepts are supplied")
    )

    def fake_generate(kb, concept, per_concept, chunk_lookup):
        seen.append(concept)
        return [], 0

    grounded_module._generate_grounded_for_concept = fake_generate
    try:
        result = build_misconception_repository(
            "kb1", concepts=["constructor", "inheritance"]
        )
        assert result == []
        assert seen == ["constructor", "inheritance"]
        assert os.path.exists(os.path.join(tmpdir, "kb1", "misconceptions.json"))
        print("  OK repository: supplied concepts are reused without extraction.")
    finally:
        grounded_module.KNOWLEDGE_DIR = old_dir
        grounded_module.KnowledgeBase.load = old_load
        grounded_module._extract_concepts = old_extract
        grounded_module._generate_grounded_for_concept = old_generate
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_material_routes_and_ownership():
    from fastapi.testclient import TestClient
    from app.main import app

    tmpdir = tempfile.mkdtemp(prefix="nova-materials-test-")
    knowledge_dir = os.path.join(tmpdir, "knowledge")
    upload_dir = os.path.join(tmpdir, "uploads")
    os.makedirs(os.path.join(knowledge_dir, "demo"))

    old_materials_knowledge = materials_module.KNOWLEDGE_DIR
    old_materials_uploads = materials_module.UPLOAD_DIR
    old_ingest_knowledge = ingest_module.KNOWLEDGE_DIR
    old_build = materials_module.KnowledgeBase.build
    old_extract = materials_module._extract_concepts
    old_repository = materials_module.build_misconception_repository
    materials_module.KNOWLEDGE_DIR = knowledge_dir
    materials_module.UPLOAD_DIR = upload_dir
    ingest_module.KNOWLEDGE_DIR = knowledge_dir

    built = {}
    repository_calls = []

    def fake_build(pdf_path, kb_id):
        kb_dir = os.path.join(knowledge_dir, kb_id)
        os.makedirs(kb_dir, exist_ok=True)
        pages = [{"page": 1, "text": "Line one\nLine two"}]
        save_pages(pages, kb_id)
        with open(os.path.join(kb_dir, "chunks.json"), "w", encoding="utf-8") as f:
            json.dump([{"chunk_id": "p1_c0", "page": 1, "text": "Line one"}], f)
        built["kb_id"] = kb_id
        built["pdf_path"] = pdf_path
        return SimpleNamespace(kb_id=kb_id, chunks=[])

    def fake_repository(kb_id, **kwargs):
        repository_calls.append((kb_id, kwargs))
        with open(
            os.path.join(knowledge_dir, kb_id, "misconceptions.json"),
            "w",
            encoding="utf-8",
        ) as f:
            json.dump([{"id": "m1", "concept": "constructor"}], f)
        return []

    materials_module.KnowledgeBase.build = fake_build
    materials_module._extract_concepts = lambda kb, max_concepts: [
        "constructor",
        "inheritance",
    ]
    materials_module.build_misconception_repository = fake_repository

    current_user = {"id": "u1", "role": "student"}
    app.dependency_overrides[get_current_user] = lambda: current_user
    client = TestClient(app)

    try:
        # Invalid extension and invalid file signature are rejected.
        bad_ext = client.post(
            "/materials", files={"file": ("notes.txt", PDF_BYTES, "text/plain")}
        )
        assert bad_ext.status_code == 400, bad_ext.text
        bad_pdf = client.post(
            "/materials", files={"file": ("notes.pdf", b"not a pdf", "application/pdf")}
        )
        assert bad_pdf.status_code == 400, bad_pdf.text

        upload = client.post(
            "/materials", files={"file": ("lecture.pdf", PDF_BYTES, "application/pdf")}
        )
        assert upload.status_code == 200, upload.text
        body = upload.json()
        kb_id = body["kb_id"]
        assert kb_id.startswith("uu1_") and len(kb_id.split("_")[-1]) == 8
        assert body["state"] == "ingesting"

        # Background task has completed in TestClient by the time the call returns.
        status_resp = client.get(f"/materials/{kb_id}/status")
        assert status_resp.status_code == 200, status_resp.text
        status = status_resp.json()
        assert status["state"] == "ready"
        assert status["page_count"] == 1
        assert status["chunk_count"] == 1
        assert status["concept_count"] == 2
        assert repository_calls and repository_calls[0][1]["concepts"] == [
            "constructor",
            "inheritance",
        ]
        with open(
            os.path.join(knowledge_dir, kb_id, "meta.json"), "r", encoding="utf-8"
        ) as f:
            meta = json.load(f)
        assert meta["owner_id"] == "u1"
        assert meta["pdf_path"] == built["pdf_path"]
        assert set(meta) == {
            "owner_id",
            "name",
            "pdf_path",
            "state",
            "message",
            "created_at",
        }

        # The list contains the user's material and the public demo.
        listed = client.get("/materials")
        assert listed.status_code == 200, listed.text
        kb_ids = {item["kb_id"] for item in listed.json()}
        assert kb_ids == {kb_id, "demo"}

        pdf = client.get(f"/materials/{kb_id}/pdf")
        assert pdf.status_code == 200
        assert pdf.headers["content-type"].startswith("application/pdf")
        assert pdf.content.startswith(b"%PDF-")

        # Another user can see demo, but cannot open/read the private material.
        current_user.clear()
        current_user.update({"id": "u2", "role": "student"})
        assert client.get(f"/materials/{kb_id}/status").status_code == 403
        assert client.get(f"/materials/{kb_id}/pdf").status_code == 403
        assert client.post(
            "/sessions/create-from-kb", json={"kb_id": kb_id}
        ).status_code == 403
        other_list = client.get("/materials")
        assert {item["kb_id"] for item in other_list.json()} == {"demo"}

        # Unknown material is a 404.
        assert client.get("/materials/missing/status").status_code == 404
        print("  OK materials routes: upload, status, list, PDF, 403 ownership, 400 validation.")
    finally:
        app.dependency_overrides.clear()
        materials_module.KNOWLEDGE_DIR = old_materials_knowledge
        materials_module.UPLOAD_DIR = old_materials_uploads
        ingest_module.KNOWLEDGE_DIR = old_ingest_knowledge
        materials_module.KnowledgeBase.build = old_build
        materials_module._extract_concepts = old_extract
        materials_module.build_misconception_repository = old_repository
        shutil.rmtree(tmpdir, ignore_errors=True)


def run_test():
    print("==========================================================")
    print("TEST: student PDF materials and private knowledge bases")
    print("==========================================================")
    test_save_pages_numbers_lines()
    test_repository_uses_supplied_concepts()
    test_material_routes_and_ownership()
    print("\n==========================================================")
    print("SUCCESS: PDF materials pipeline verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
