"""
Student PDF materials: private knowledge bases built in the background.

Uploaded PDFs are stored under backend/uploads/, then processed into
backend/knowledge/{kb_id}/ with pages, chunks, vectors, concepts, and
misconceptions. A small meta.json records ownership and processing state.

A knowledge-base folder without meta.json is public (used by the existing
"demo" knowledge base).
"""
import json
import logging
import os
import secrets
import shutil
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse

from app.auth import get_current_user
from app.demo_log import step
from app.grounded_misconceptions import _extract_concepts, build_misconception_repository
from app.ingest import KNOWLEDGE_DIR, KnowledgeBase

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

PUBLIC_KB_ID = "demo"
MAX_CONCEPTS = 8

router = APIRouter(prefix="/materials", tags=["materials"])


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def _kb_dir(kb_id: str) -> str:
    """Returns the knowledge directory for a safe kb_id, or raises 404."""
    if not kb_id or os.path.basename(kb_id) != kb_id or kb_id in {".", ".."}:
        raise HTTPException(status_code=404, detail="Material not found.")
    return os.path.join(KNOWLEDGE_DIR, kb_id)


def _read_meta(kb_id: str) -> Optional[Dict[str, Any]]:
    """Loads a knowledge base's meta.json; returns None when it is public."""
    meta_path = os.path.join(_kb_dir(kb_id), "meta.json")
    if not os.path.exists(meta_path):
        return None
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def _write_meta(kb_id: str, meta: Dict[str, Any]) -> None:
    """Atomically writes meta.json so status polling never sees partial JSON."""
    kb_dir = _kb_dir(kb_id)
    os.makedirs(kb_dir, exist_ok=True)
    meta_path = os.path.join(kb_dir, "meta.json")
    temp_path = f"{meta_path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    os.replace(temp_path, meta_path)


def _update_meta(kb_id: str, **changes: Any) -> None:
    """Merges changes into meta.json, preserving owner and creation fields."""
    meta = _read_meta(kb_id) or {}
    meta.update(changes)
    _write_meta(kb_id, meta)


def _change_state(kb_id: str, state: str, message: str) -> None:
    """Updates meta.json and logs a demo-friendly state transition."""
    _update_meta(kb_id, state=state, message=message)
    step("STATE", "state change", kb_id=kb_id, state=state, state_message=message)


def _load_json(path: str, default: Any) -> Any:
    """Reads JSON, returning default when the file is missing or still being written."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return default


def _counts(kb_id: str) -> Dict[str, int]:
    """Returns page, chunk, and concept counts for a knowledge base."""
    kb_dir = _kb_dir(kb_id)
    pages = _load_json(os.path.join(kb_dir, "pages.json"), [])
    chunks = _load_json(os.path.join(kb_dir, "chunks.json"), [])
    concepts = _load_json(os.path.join(kb_dir, "concepts.json"), None)
    misconceptions = _load_json(os.path.join(kb_dir, "misconceptions.json"), [])
    if concepts is None:
        concepts = {
            item.get("concept")
            for item in misconceptions
            if isinstance(item, dict) and item.get("concept")
        }
    if isinstance(pages, list):
        page_count = len(pages)
    elif isinstance(chunks, list):
        page_count = len(
            {
                chunk.get("page")
                for chunk in chunks
                if isinstance(chunk, dict) and chunk.get("page") is not None
            }
        )
    else:
        page_count = 0
    return {
        "page_count": page_count,
        "chunk_count": len(chunks) if isinstance(chunks, list) else 0,
        "concept_count": len(concepts) if isinstance(concepts, (list, set)) else 0,
    }


def check_kb_access(kb_id: str, user: Dict[str, Any], require_owner: bool = False) -> Optional[Dict[str, Any]]:
    """
    Ensures the KB exists and is not owned by another user.

    Public KBs (no meta.json) are readable unless require_owner is True.
    Raises 404 for unknown KBs and 403 for foreign or owner-only KBs.
    """
    kb_dir = _kb_dir(kb_id)
    if not os.path.isdir(kb_dir):
        raise HTTPException(status_code=404, detail="Material not found.")
    meta = _read_meta(kb_id)
    if meta is None:
        if require_owner:
            raise HTTPException(status_code=403, detail="You do not own this material.")
        return None
    if meta.get("owner_id") != str(user["id"]):
        raise HTTPException(status_code=403, detail="You do not own this material.")
    return meta


def _public_material(kb_id: str, meta: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Builds the list/status shape without exposing the stored PDF path."""
    return {
        "kb_id": kb_id,
        "name": (meta or {}).get("name") or kb_id,
        "state": (meta or {}).get("state") or "ready",
        "message": (meta or {}).get("message") or "Ready",
        "created_at": (meta or {}).get("created_at"),
        **_counts(kb_id),
    }


# ---------------------------------------------------------------------------
# Background processing
# ---------------------------------------------------------------------------

def _process_material(kb_id: str, pdf_path: str) -> None:
    """Builds the knowledge base and misconception repository in the background."""
    try:
        _change_state(kb_id, "ingesting", "Reading PDF…")
        kb = KnowledgeBase.build(pdf_path, kb_id)

        _change_state(kb_id, "extracting_concepts", "Finding concepts…")
        concepts = _extract_concepts(kb, MAX_CONCEPTS)
        kb_dir = _kb_dir(kb_id)
        with open(os.path.join(kb_dir, "concepts.json"), "w", encoding="utf-8") as f:
            json.dump(concepts, f, indent=2, ensure_ascii=False)
        step("INGEST", "concepts saved", kb_id=kb_id, concepts=len(concepts))

        _change_state(
            kb_id,
            "generating_misconceptions",
            "Finding misconceptions…",
        )
        build_misconception_repository(kb_id, concepts=concepts)

        _change_state(kb_id, "ready", "Ready")
        logger.info("Material '%s' is ready.", kb_id)
    except Exception as exc:
        logger.exception("Material '%s' failed", kb_id)
        _change_state(kb_id, "failed", str(exc) or "Processing failed.")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("")
async def upload_material(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Accepts a PDF, stores it, and starts background knowledge-base creation."""
    original_name = os.path.basename((file.filename or "").replace("\\", "/"))
    if not original_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF.")

    header = await file.read(5)
    if header != b"%PDF-":
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF.")
    await file.seek(0)

    kb_id = f"u{user['id']}_{secrets.token_hex(4)}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = original_name or "material.pdf"
    pdf_path = os.path.join(UPLOAD_DIR, f"{kb_id}_{safe_name}")
    try:
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not save PDF: {exc}")

    meta = {
        "owner_id": str(user["id"]),
        "name": original_name or "material.pdf",
        "pdf_path": pdf_path,
        "state": "ingesting",
        "message": "Reading PDF…",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_meta(kb_id, meta)
    step(
        "INGEST",
        "upload saved",
        kb_id=kb_id,
        filename=meta["name"],
        bytes=os.path.getsize(pdf_path),
    )
    step(
        "STATE",
        "state change",
        kb_id=kb_id,
        state=meta["state"],
        state_message=meta["message"],
    )
    background_tasks.add_task(_process_material, kb_id, pdf_path)

    return {
        "kb_id": kb_id,
        "name": meta["name"],
        "state": meta["state"],
        "message": meta["message"],
    }


@router.get("")
def list_materials(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Lists the current user's materials plus the public demo knowledge base."""
    owner = str(user["id"])
    materials: List[Dict[str, Any]] = []
    if not os.path.isdir(KNOWLEDGE_DIR):
        return materials

    for entry in os.scandir(KNOWLEDGE_DIR):
        if not entry.is_dir():
            continue
        meta = _read_meta(entry.name)
        if meta is None and entry.name != PUBLIC_KB_ID:
            continue
        if meta is not None and meta.get("owner_id") != owner:
            continue
        materials.append(_public_material(entry.name, meta))

    materials.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return materials


@router.get("/{kb_id}/status")
def get_material_status(
    kb_id: str, user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Returns polling-friendly processing state and counts for one material."""
    meta = check_kb_access(kb_id, user)
    return _public_material(kb_id, meta)


@router.get("/{kb_id}/pdf")
def get_material_pdf(kb_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Streams the original PDF to its owner."""
    meta = check_kb_access(kb_id, user, require_owner=True)
    pdf_path = (meta or {}).get("pdf_path")
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found.")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=(meta or {}).get("name") or "material.pdf",
    )
