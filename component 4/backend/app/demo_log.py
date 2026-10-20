"""
Demo-friendly terminal logging for showing how Nova's backend works.

Enable/disable with DEMO_LOG (default: on). All output uses one shape:

    HH:MM:SS [STAGE] message | key=value key=value

Secrets must never be passed to these helpers.
"""
import json
import os
from datetime import datetime
from typing import Any

# Enable ANSI escape sequences in Windows terminals once, at import time.
if os.name == "nt":
    os.system("")

DEMO_LOG_ENABLED = os.getenv("DEMO_LOG", "1").strip().lower() not in {
    "0",
    "false",
    "off",
    "no",
}

STAGE_COLOURS = {
    "HTTP": "36",   # cyan
    "AUTH": "35",   # magenta
    "INGEST": "34", # blue
    "RAG": "32",    # green
    "LLM": "33",    # yellow
    "QUIZ": "95",   # bright magenta
    "NOVA": "97",   # bright white
    "STATE": "90",  # grey
    "ERROR": "91",  # bright red
}
_RESET = "\033[0m"


def _format_value(value: Any) -> str:
    """Formats a detail value without changing strings or pretty JSON bodies."""
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, ensure_ascii=False, default=str)
    return str(value)


def _preview(text: Any, limit: int = 150) -> str:
    """Returns a single-line preview truncated to `limit` characters."""
    cleaned = " ".join(str(text).split())
    return cleaned if len(cleaned) <= limit else f"{cleaned[:limit]}..."


def _emit(stage: str, message: str, details: dict[str, Any]) -> None:
    if not DEMO_LOG_ENABLED:
        return
    stage = stage.upper()
    colour = STAGE_COLOURS.get(stage, "37")
    stamp = datetime.now().strftime("%H:%M:%S")
    suffix = " ".join(
        f"{key}={_format_value(value)}"
        for key, value in details.items()
        if value is not None
    )
    line = f"\033[{colour}m{stamp} [{stage}]\033[0m {message}"
    if suffix:
        line = f"{line} | {suffix}"
    print(line, flush=True)


def step(stage: str, message: str, **details: Any) -> None:
    """Logs one pipeline step."""
    _emit(stage, message, details)


def decision(stage: str, message: str, **details: Any) -> None:
    """Logs a decision or verdict, using the same fixed format as step()."""
    _emit(stage, message, details)


def llm_call(
    provider: str,
    model: str,
    prompt: str,
    *,
    json_mode: bool = False,
    seconds: float | None = None,
    response: str | None = None,
    attempt: int | None = None,
    error: str | None = None,
) -> None:
    """Logs one LLM call (or one retry/validation failure)."""
    details: dict[str, Any] = {
        "provider": provider,
        "model": model,
        "json_mode": json_mode,
        "prompt_len": len(prompt),
        "prompt": _preview(prompt),
    }
    if seconds is not None:
        details["seconds"] = round(seconds, 3)
    if response is not None:
        details["response_len"] = len(response)
        details["response"] = _preview(response)
    if attempt is not None:
        details["attempt"] = attempt
    if error is not None:
        details["error"] = _preview(error, 300)
    _emit("LLM", "call", details)
