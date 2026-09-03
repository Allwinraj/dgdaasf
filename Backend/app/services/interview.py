from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from app.core.llm import LLMError, LLMProvider
from app.core.logging import new_id
from app.core.storage import Storage
from app.engine.reveal import apply_reveal
from app.engine.schema_sync import propagate_schema
from app.models.chat import ChatMessage, ConfigPatch, ExtractedRequirement, InterviewSession, ProgressiveReveal
from app.models.knowledge import KnowledgeDocument, SessionKnowledge
from app.models.pipeline import Pipeline
from app.services.knowledge import chunk_text, extract_facts, load_knowledge, save_knowledge, upsert_document
from app.services.parser import ParseError, columns_as_dicts, parse_file
from app.services.pipeline_builder import (
    DECISION_KINDS,
    MATCH_KINDS,
    MATH_KINDS,
    OUTPUT_KINDS,
    capabilities_from,
    reveal_for_session,
    reveal_is_empty,
)
from app.services.sessions import load_session, save_session, session_pipeline, store_pipeline

log = logging.getLogger("nexus.interview")

MIN_QUESTIONS = 5
MAX_QUESTIONS = 15
CONFIDENCE_STOP = 0.75

WELCOME_FALLBACK = "Hi — I'm Nexus. What best describes your role?"

SKIP_PHRASES = (
    "no",
    "nope",
    "none",
    "skip",
    "not yet",
    "don't have",
    "do not have",
    "no files",
    "nothing",
    "later",
)

GROUNDING = (
    "When you line these files up, which fields tell you it's the same item?",
    "If the numbers are a little off, how much difference is still acceptable?",
    "What should happen to rows that don't match or sit outside that range?",
    "Who should review exceptions, and is there anything you can auto-approve?",
    "What should I hand you at the end — Excel, PDF, or both?",
    "Can dates drift a day or two, or must they match exactly?",
    "If one row on one side covers several on the other, how should we group them?",
    "Anything else I should lock in before we test this?",
)

TURN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["assistant_message", "requirements", "capabilities"],
    "properties": {
        "assistant_message": {"type": "string"},
        "requirements": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "kind", "value"],
                "properties": {
                    "id": {"type": "string"},
                    "kind": {"type": "string"},
                    "value": {"type": "object"},
                },
            },
        },
        "capabilities": {
            "type": "object",
            "properties": {
                "matcher": {"type": "boolean"},
                "math": {"type": "boolean"},
                "decision": {"type": "boolean"},
                "output": {"type": "boolean"},
                "matcher_stages": {"type": "integer"},
                "math_stages": {"type": "integer"},
                "keys": {"type": "array", "items": {"type": "string"}},
                "output_formats": {"type": "array", "items": {"type": "string"}},
            },
        },
        "ask_question": {"type": "boolean"},
        "question": {"type": "string"},
        "ready": {"type": "boolean"},
        "confidence": {"type": "number"},
        "summary": {"type": "string"},
        "cannot_serve": {"type": "boolean"},
        "is_description": {"type": "boolean"},
    },
}

ONBOARDING_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["assistant_message", "next_step"],
    "properties": {
        "assistant_message": {"type": "string"},
        "next_step": {
            "type": "string",
            "description": "role|industry|ai_priorities|workflow|data_prompt|data_interview|knowledge_prompt|done",
        },
        "upload_offer": {"type": ["string", "null"]},
        "capture": {
            "type": "object",
            "properties": {
                "role": {"type": "string"},
                "industry": {"type": "string"},
                "ai_priorities": {"type": "string"},
                "description": {"type": "string"},
            },
        },
        "virtual_sources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "description": {"type": "string"},
                    "columns": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string"},
                            },
                        },
                    },
                },
            },
        },
        "requirements": TURN_SCHEMA["properties"]["requirements"],
        "capabilities": TURN_SCHEMA["properties"]["capabilities"],
    },
}


def _ilog(session: InterviewSession | None, event: str, **fields: Any) -> None:
    sid = session.id[:8] if session else "—"
    step = session.extra.get("onboarding_step") if session else None
    bits = " ".join(f"{k}={v!r}" for k, v in fields.items() if v is not None and v != "")
    log.info("session=%s step=%s | %s %s", sid, step, event, bits)


async def bootstrap_session(storage: Storage, llm: LLMProvider) -> InterviewSession:
    session = InterviewSession(id=new_id(), status="welcome")
    session.extra["onboarding_step"] = "start"
    _ilog(session, "session.create")
    turn = await _llm_onboarding_turn(llm, session, user_text="", trigger="session_start")
    _apply_onboarding_fields(session, turn)
    assistant = ChatMessage(
        id=new_id(),
        role="assistant",
        content=str(turn.get("assistant_message") or WELCOME_FALLBACK),
        meta={"kind": "welcome", "upload_offer": session.extra.get("upload_offer")},
    )
    session.messages.append(assistant)
    save_session(storage, session)
    _ilog(session, "session.ready", reply=assistant.content[:160])
    return session


def create_session(storage: Storage) -> InterviewSession:
    """Sync fallback when no LLM is available (tests)."""
    session = InterviewSession(id=new_id(), status="welcome")
    session.extra["onboarding_step"] = "role"
    session.messages.append(
        ChatMessage(
            id=new_id(),
            role="assistant",
            content=WELCOME_FALLBACK,
            meta={"kind": "welcome"},
        )
    )
    save_session(storage, session)
    return session


async def handle_message(
    storage: Storage,
    llm: LLMProvider,
    session_id: str,
    content: str,
) -> dict[str, Any]:
    session = load_session(storage, session_id)
    user = ChatMessage(id=new_id(), role="user", content=content)
    session.messages.append(user)
    step = str(session.extra.get("onboarding_step") or "done")
    _ilog(session, "user.message", text=content[:200], phase=step)
    if step != "done":
        return await _handle_onboarding(storage, llm, session, content, step, user.id)
    turn = await _llm_turn(llm, session, content, trigger="message")
    return await _apply_turn(storage, session, turn, user.id)


async def handle_upload(
    storage: Storage,
    llm: LLMProvider,
    session_id: str,
    *,
    kind: str,
    files: list[tuple[str, bytes]],
) -> dict[str, Any]:
    session = load_session(storage, session_id)
    if kind not in {"data", "knowledge"}:
        raise ValueError("kind must be data or knowledge")
    saved: list[dict[str, Any]] = []
    for filename, blob in files:
        record = await _store_upload(storage, llm, session, kind, filename, blob)
        session.uploads.append(record)
        saved.append(record)
    note = f"Attached {len(saved)} file(s): " + ", ".join(s["name"] for s in saved)
    user = ChatMessage(
        id=new_id(),
        role="user",
        content=note,
        meta={"kind": "upload", "files": [s["file_id"] for s in saved]},
    )
    session.messages.append(user)
    if session.status == "welcome":
        session.status = "collecting"
    step = str(session.extra.get("onboarding_step") or "done")
    _ilog(session, "user.upload", kind=kind, files=[s["name"] for s in saved], phase=step)

    if kind == "data" and step == "data_prompt":
        session.extra["onboarding_step"] = "knowledge_prompt"
        session.extra["upload_offer"] = "knowledge"
        reveal = _maybe_reveal(session)
        turn = await _llm_onboarding_turn(llm, session, note, trigger="data_uploaded")
        _apply_onboarding_fields(session, turn)
        session.extra["onboarding_step"] = "knowledge_prompt"
        session.extra["upload_offer"] = "knowledge"
        assistant = ChatMessage(
            id=new_id(),
            role="assistant",
            content=str(turn.get("assistant_message") or "Any policy or reference documents to attach?"),
            meta={"kind": "onboarding", "upload_offer": "knowledge"},
        )
        session.messages.append(assistant)
        save_session(storage, session)
        _ilog(session, "upload.data.done", reveal=bool(reveal), reply=assistant.content[:160])
        result = _response(session, assistant, reveal)
        result["uploads"] = saved
        return result

    if kind == "knowledge" and step == "knowledge_prompt":
        session.extra["onboarding_step"] = "done"
        session.extra.pop("upload_offer", None)
        _ilog(session, "upload.knowledge.start")
        turn = await _llm_turn(llm, session, note, trigger="upload")
        result = await _apply_turn(storage, session, turn, user.id)
        result["uploads"] = saved
        return result

    turn = await _llm_turn(llm, session, note, trigger="upload")
    result = await _apply_turn(storage, session, turn, user.id)
    result["uploads"] = saved
    return result


def confirm_session(storage: Storage, session_id: str) -> dict[str, Any]:
    session = load_session(storage, session_id)
    pipeline = session_pipeline(session)
    if not pipeline.nodes:
        raise ValueError("cannot confirm an empty draft")
    if session.status == "handoff":
        raise ValueError("handoff sessions cannot be confirmed")
    session.confirmed = True
    session.status = "confirmed"
    if not session.summary:
        session.summary = _fallback_summary(session, pipeline)
    assistant = ChatMessage(
        id=new_id(),
        role="assistant",
        content=f"Confirmed. {session.summary}",
        meta={"kind": "confirm"},
    )
    session.messages.append(assistant)
    save_session(storage, session)
    return _response(session, assistant, None)


def handoff_session(storage: Storage, session_id: str) -> dict[str, Any]:
    session = load_session(storage, session_id)
    pipeline = session_pipeline(session)
    session.status = "handoff"
    session.confirmed = False
    session.summary = session.summary or _fallback_summary(session, pipeline)
    session.extra["handoff"] = {
        "question_count": session.question_count,
        "node_ids": [n.id for n in pipeline.nodes],
        "requirements": [r.model_dump(mode="json") for r in session.requirements],
    }
    assistant = ChatMessage(
        id=new_id(),
        role="assistant",
        content=(
            "I've frozen this draft for an expert to review in the product UI. "
            "The canvas and a structured summary are saved on the session — "
            "nothing was published to the Super Agent library.\n\n"
            f"{session.summary}"
        ),
        meta={"kind": "handoff"},
    )
    session.messages.append(assistant)
    save_session(storage, session)
    return _response(session, assistant, None)


def sync_node(
    storage: Storage,
    session_id: str,
    node_id: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    session = load_session(storage, session_id)
    current = session_pipeline(session)
    if node_id not in current.node_map():
        raise KeyError(node_id)
    overrides = dict(session.extra.get("node_overrides") or {})
    overrides[node_id] = {**dict(overrides.get(node_id) or {}), **config}
    session.extra["node_overrides"] = overrides
    delta = ProgressiveReveal(config_patches=[ConfigPatch(node_id=node_id, config=config)])
    updated = apply_reveal(current, delta)
    node = updated.get_node(node_id)
    if node.agent == "ingestion":
        updated = propagate_schema(updated, node_id)
    store_pipeline(session, updated)
    req = ExtractedRequirement(
        id=f"sync-{node_id}",
        kind="config",
        value={"node_id": node_id, "config": config},
    )
    session.requirements = [r for r in session.requirements if r.id != req.id] + [req]
    assistant = ChatMessage(
        id=new_id(),
        role="assistant",
        content=f"Updated {node.label or node_id} from the canvas. Config is now the source of truth.",
        meta={"kind": "sync-node", "node_id": node_id},
    )
    session.messages.append(assistant)
    save_session(storage, session)
    return _response(session, assistant, delta)


async def _handle_onboarding(
    storage: Storage,
    llm: LLMProvider,
    session: InterviewSession,
    content: str,
    step: str,
    user_id: str,
) -> dict[str, Any]:
    turn = await _llm_onboarding_turn(llm, session, content, trigger="onboarding")
    _apply_onboarding_fields(session, turn)
    next_step = str(turn.get("next_step") or step)
    _ilog(
        session,
        "onboarding.llm",
        next=next_step,
        offer=turn.get("upload_offer"),
        virtual=len(session.extra.get("virtual_sources") or []),
    )

    if next_step == "done":
        session.extra["onboarding_step"] = "done"
        session.extra.pop("upload_offer", None)
        session.status = "collecting"
        interview = {
            "assistant_message": str(turn.get("assistant_message") or "Let's refine the pipeline."),
            "requirements": turn.get("requirements") or [],
            "capabilities": turn.get("capabilities") or session.extra.get("capabilities") or {},
            "ask_question": True,
            "question": None,
            "ready": False,
            "confidence": 0.55,
            "summary": turn.get("summary"),
            "cannot_serve": False,
            "is_description": True,
        }
        return await _apply_turn(storage, session, interview, user_id)

    reveal = _maybe_reveal(session)
    assistant = ChatMessage(
        id=new_id(),
        role="assistant",
        content=str(turn.get("assistant_message") or "Got it."),
        meta={
            "kind": "onboarding",
            "upload_offer": session.extra.get("upload_offer"),
        },
    )
    session.messages.append(assistant)
    save_session(storage, session)
    _ilog(session, "onboarding.reply", reveal=bool(reveal), reply=assistant.content[:160])
    return _response(session, assistant, reveal)


def _apply_onboarding_fields(session: InterviewSession, turn: dict[str, Any]) -> None:
    for key, val in (turn.get("capture") or {}).items():
        if val:
            session.extra[key] = val
    if turn.get("capture", {}).get("description"):
        session.extra["description"] = turn["capture"]["description"]
    incoming = turn.get("virtual_sources") or []
    if incoming:
        existing = list(session.extra.get("virtual_sources") or [])
        seen = {(s.get("label"), s.get("description")) for s in existing}
        for src in incoming:
            key = (src.get("label"), src.get("description"))
            if key not in seen:
                existing.append(src)
                seen.add(key)
        session.extra["virtual_sources"] = existing
        _ilog(session, "virtual.sources", count=len(existing), labels=[s.get("label") for s in existing])
    next_step = turn.get("next_step")
    if next_step:
        session.extra["onboarding_step"] = next_step
    offer = turn.get("upload_offer")
    if offer in {"data", "knowledge"}:
        session.extra["upload_offer"] = offer
    elif next_step not in {"data_prompt", "knowledge_prompt"}:
        session.extra.pop("upload_offer", None)
    if turn.get("capabilities"):
        session.extra["capabilities"] = {
            **dict(session.extra.get("capabilities") or {}),
            **turn["capabilities"],
        }
    if turn.get("requirements"):
        _merge_requirements(session, turn["requirements"], "onboarding")


def _is_skip(text: str) -> bool:
    lower = text.strip().lower()
    return any(p in lower for p in SKIP_PHRASES)


def _has_data_upload(session: InterviewSession) -> bool:
    return any(u.get("kind") == "data" for u in session.uploads)


def _maybe_reveal(session: InterviewSession) -> ProgressiveReveal | None:
    if not _can_draft(session):
        return None
    delta = reveal_for_session(session)
    if reveal_is_empty(delta):
        return None
    updated = apply_reveal(session_pipeline(session), delta)
    store_pipeline(session, updated)
    if session.status in {"welcome", "collecting"}:
        session.status = "interview"
    return delta


async def _apply_turn(
    storage: Storage,
    session: InterviewSession,
    turn: dict[str, Any],
    source_message_id: str,
) -> dict[str, Any]:
    _ilog(
        session,
        "interview.llm.apply",
        ready=turn.get("ready"),
        confidence=turn.get("confidence"),
        reqs=len(turn.get("requirements") or []),
    )
    _merge_requirements(session, turn.get("requirements") or [], source_message_id)
    if turn.get("capabilities") is not None:
        session.extra["capabilities"] = {
            **dict(session.extra.get("capabilities") or {}),
            **turn["capabilities"],
        }
    if turn.get("is_description") and turn.get("assistant_message"):
        session.extra["description"] = session.extra.get("description") or session.messages[-1].content
    if turn.get("cannot_serve"):
        session.extra["cannot_serve"] = True

    reveal = None
    if _can_draft(session):
        delta = reveal_for_session(session)
        if not reveal_is_empty(delta):
            updated = apply_reveal(session_pipeline(session), delta)
            store_pipeline(session, updated)
            reveal = delta
            if session.status in {"welcome", "collecting"}:
                session.status = "interview"

    ready_flag, question = _question_budget(session, turn)
    ack = str(turn.get("assistant_message") or "").strip()
    parts: list[str] = []
    if question:
        session.question_count += 1
        session.status = "interview"
        if _already_asks(ack, question):
            parts.append(ack)
        else:
            if ack:
                parts.append(ack)
            parts.append(question)
        if session.question_count >= MAX_QUESTIONS:
            session.extra["suggest_handoff"] = True
    elif ack:
        parts.append(ack)
    if turn.get("summary"):
        session.summary = str(turn["summary"])
    if ready_flag:
        session.status = "ready_to_confirm"
        session.extra["ready_to_confirm"] = True
        if session.summary:
            parts.append(session.summary)
        parts.append("If this matches what you need, confirm the pipeline.")
    if session.extra.get("suggest_handoff"):
        parts.append(
            "We've hit the interview cap. I can freeze this draft for expert review, or you can confirm if the canvas is close enough."
        )

    content = "\n\n".join(p for p in parts if p) or "Got it."
    assistant = ChatMessage(
        id=new_id(),
        role="assistant",
        content=content,
        meta={"kind": "turn", "ready": ready_flag, "question_count": session.question_count},
    )
    session.messages.append(assistant)
    save_session(storage, session)
    _ilog(session, "interview.reply", status=session.status, reveal=bool(reveal), ready=ready_flag)
    return _response(session, assistant, reveal)


def _question_budget(session: InterviewSession, turn: dict[str, Any]) -> tuple[bool, str | None]:
    if session.status in {"confirmed", "handoff"}:
        return False, None
    confidence = float(turn.get("confidence") or 0)
    llm_ready = bool(turn.get("ready"))
    cannot = bool(turn.get("cannot_serve") or session.extra.get("cannot_serve"))
    if cannot:
        return False, None
    if session.question_count >= MAX_QUESTIONS:
        session.extra["suggest_handoff"] = True
        return False, None
    want_ask = bool(turn.get("ask_question", True))
    question = (turn.get("question") or "").strip() or None
    drafted = _can_draft(session)
    if not drafted:
        return False, None
    if session.question_count < MIN_QUESTIONS:
        return False, question or _fallback_question(session)
    if llm_ready and confidence >= CONFIDENCE_STOP:
        return True, None
    if session.question_count >= MAX_QUESTIONS - 1 and want_ask:
        return False, question or _fallback_question(session)
    if want_ask:
        return False, question or _fallback_question(session)
    if llm_ready:
        return True, None
    return False, None


def _can_draft(session: InterviewSession) -> bool:
    has_description = bool(session.extra.get("description"))
    has_data = _has_data_upload(session)
    has_virtual = bool(session.extra.get("virtual_sources"))
    ok = bool(has_description and (has_data or has_virtual))
    _ilog(session, "draft.check", ok=ok, files=has_data, virtual=has_virtual)
    return ok


def _already_asks(ack: str, question: str) -> bool:
    if not ack:
        return False
    q = question.strip().casefold()
    a = ack.strip().casefold()
    if q and q in a:
        return True
    return ack.strip().endswith("?") and "?" in ack


def _req_lookup(session: InterviewSession, kinds: set[str]) -> dict:
    for req in reversed(session.requirements):
        if req.kind.lower() in kinds:
            return dict(req.value or {})
    return {}


def _missing_slots(session: InterviewSession) -> list[str]:
    caps = capabilities_from(session)
    missing: list[str] = []
    match = _req_lookup(session, MATCH_KINDS)
    math = _req_lookup(session, MATH_KINDS)
    decision = _req_lookup(session, DECISION_KINDS)
    output = _req_lookup(session, OUTPUT_KINDS)
    if caps.get("matcher") and not (match.get("keys") or (session.extra.get("capabilities") or {}).get("keys")):
        missing.append("match_keys")
    if caps.get("math") and not (math.get("formula_en") or math.get("ast") or math.get("catalog_id") or math.get("threshold") is not None):
        missing.append("tolerance_or_formula")
    if caps.get("decision") and not decision.get("policy"):
        missing.append("exception_routing")
    formats = list((session.extra.get("capabilities") or {}).get("output_formats") or output.get("formats") or [])
    if caps.get("output") and not formats:
        missing.append("output_format")
    return missing


def _fallback_question(session: InterviewSession) -> str:
    missing = _missing_slots(session)
    by_slot = {
        "match_keys": "When you line these files up, which fields tell you it's the same item?",
        "tolerance_or_formula": "If the numbers are a little off, how much difference is still acceptable?",
        "exception_routing": "When something doesn't match, who reviews it — and is there anything you can auto-approve?",
        "output_format": "What should I hand you at the end — Excel, PDF, or both?",
    }
    for slot in missing:
        if slot in by_slot:
            return by_slot[slot]
    caps = capabilities_from(session)
    if caps.get("matcher") and not _req_lookup(session, MATCH_KINDS).get("window_days"):
        return "Can the dates drift by a day or two, or do they need to match exactly?"
    return GROUNDING[session.question_count % len(GROUNDING)]


def _merge_requirements(
    session: InterviewSession,
    incoming: list[dict[str, Any]],
    source_message_id: str,
) -> None:
    by_id = {r.id: r for r in session.requirements}
    for raw in incoming:
        item = ExtractedRequirement(
            id=str(raw["id"]),
            kind=str(raw["kind"]),
            value=dict(raw.get("value") or {}),
            source_message_id=source_message_id,
        )
        by_id[item.id] = item
    session.requirements = list(by_id.values())


def _conversation_snapshot(session: InterviewSession, user_text: str, trigger: str) -> dict[str, Any]:
    pipeline = session_pipeline(session)
    return {
        "trigger": trigger,
        "onboarding_step": session.extra.get("onboarding_step"),
        "status": session.status,
        "question_count": session.question_count,
        "role": session.extra.get("role"),
        "industry": session.extra.get("industry"),
        "ai_priorities": session.extra.get("ai_priorities"),
        "description": session.extra.get("description"),
        "virtual_sources": session.extra.get("virtual_sources") or [],
        "uploads": [
            {"file_id": u.get("file_id"), "kind": u.get("kind"), "schema": u.get("schema"), "name": u.get("name")}
            for u in session.uploads
        ],
        "knowledge_facts": session.extra.get("knowledge_facts") or [],
        "recent_messages": [
            {"role": m.role, "content": m.content[:400]}
            for m in session.messages[-8:]
        ],
        "requirements": [r.model_dump(mode="json") for r in session.requirements],
        "capabilities": session.extra.get("capabilities"),
        "missing_slots": _missing_slots(session),
        "pipeline": {
            "nodes": [{"id": n.id, "agent": n.agent, "mode": n.mode, "label": n.label} for n in pipeline.nodes],
            "edges": [
                {"source": e.source, "source_port": e.source_port, "target": e.target}
                for e in pipeline.edges
            ],
        },
        "user_text": user_text,
        "min_questions": MIN_QUESTIONS,
        "max_questions": MAX_QUESTIONS,
    }


async def _llm_onboarding_turn(
    llm: LLMProvider,
    session: InterviewSession,
    user_text: str,
    *,
    trigger: str,
) -> dict[str, Any]:
    snapshot = _conversation_snapshot(session, user_text, trigger)
    prompt = (
        "You are Nexus, a finance pipeline co-pilot. Generate the next onboarding message from context.\n"
        "Rules:\n"
        "- Warm, human, concise. assistant_message is 1-2 short sentences max.\n"
        "- Ask exactly ONE crisp question per turn (single line, never a paragraph).\n"
        "- First three questions are ALWAYS general warm-up, in this order: "
        "role → industry → ai_priorities. Do not skip them.\n"
        "- Fourth question is the use case: what finance workflow they want to build today.\n"
        "- Then: data_prompt → data_interview (only if user has no files) → knowledge_prompt → done.\n"
        "- At data_prompt: ask if they have input files to attach; set upload_offer to 'data'.\n"
        "- If user says they have NO files (no/none/don't have/not yet): set next_step to "
        "'data_interview', clear upload_offer, and ask how ONE data source looks "
        "(name, columns, file type). Add each described source to virtual_sources with "
        "label, description, and columns[{name,type}]. Keep interviewing until at least one "
        "source is clear, then move to knowledge_prompt.\n"
        "- At knowledge_prompt: ask about policy/SOP/reference docs; upload_offer='knowledge'. "
        "If user declines, set next_step='done'.\n"
        "- Populate capture from the latest user answer (role, industry, ai_priorities, description).\n"
        "- When entering done, emit initial requirements/capabilities for THIS use case only "
        "(Matcher/Math/Decision/Output only if needed — never pad unused agents).\n"
        "- Never mention 'data folder', 'knowledge folder', DAG, or agent class names.\n\n"
        f"{json.dumps(snapshot, default=str)}"
    )
    _ilog(session, "llm.onboarding.request", trigger=trigger, user=user_text[:120])
    turn = await llm.complete_json("general", prompt, ONBOARDING_SCHEMA, 0.35)
    _ilog(session, "llm.onboarding.response", next=turn.get("next_step"), offer=turn.get("upload_offer"))
    return turn


async def _llm_turn(
    llm: LLMProvider,
    session: InterviewSession,
    user_text: str,
    *,
    trigger: str,
) -> dict[str, Any]:
    snapshot = _conversation_snapshot(session, user_text, trigger)
    prompt = (
        "You are Nexus, interviewing a finance teammate to design a live ops pipeline.\n"
        "Voice: warm colleague, not a form. assistant_message is a short acknowledgment "
        "(1-2 sentences, no question). Put the ONE interview question in `question`.\n"
        "Never use jargon: Matcher, Math node, Decision agent, DAG, residuals port, "
        "semantic normalization, AST. Speak in business language; still extract the tech.\n"
        "Ask only questions this use case and the current canvas still need. "
        "If Matcher is on the canvas, ask how they pair records (fields, date wiggle room, "
        "one-to-many deposits). If Math is on the canvas, ask for the formula/threshold "
        "in plain words (e.g. '2% or $50, whichever is smaller'). If Decision is on the canvas, "
        "ask who reviews exceptions and any auto-approve rules. If Output is on the canvas, "
        "ask Excel vs PDF. Skip agents that are not in the pipeline.\n"
        "Fill missing_slots first. Minimum 5 questions, typically 5–8, hard cap 15. "
        "Do not set ready true before min_questions. After that, ready when keys, formula, "
        "routing, and output format are captured.\n"
        "Emit requirements with kinds match|math|decision|output|excel|pdf. "
        "For match: value.keys, mode, window_days, flags.allocation. "
        "For math: value.formula_en and threshold or catalog_id (never invent column names "
        "that are not in the uploaded schemas). "
        "For decision: value.policy in one sentence. "
        "For output: value.formats ['xlsx'] and/or ['pdf'].\n"
        "Set capabilities from THIS process only. Never insert Matcher, Math, or Decision "
        "as placeholders. Do not add Knowledge ingest unless a knowledge file was uploaded. "
        "Repeat an agent type only for true multi-stage work. "
        "Each answer should refine the live DAG — update keys/formula/policy so the canvas changes.\n\n"
        f"{json.dumps(snapshot, default=str)}"
    )
    _ilog(session, "llm.interview.request", trigger=trigger, user=user_text[:120])
    try:
        turn = await llm.complete_json("reasoning", prompt, TURN_SCHEMA, 0.2)
    except LLMError:
        turn = await llm.complete_json("general", prompt, TURN_SCHEMA, 0.2)
    _ilog(
        session,
        "llm.interview.response",
        ready=turn.get("ready"),
        confidence=turn.get("confidence"),
    )
    return turn


async def _store_upload(
    storage: Storage,
    llm: LLMProvider,
    session: InterviewSession,
    kind: str,
    filename: str,
    blob: bytes,
) -> dict[str, Any]:
    file_id = _file_id(filename, {u.get("file_id") for u in session.uploads})
    rel = f"uploads/{session.id}/{file_id}{Path(filename).suffix.lower() or '.bin'}"
    path = storage.write_bytes(blob, *rel.split("/"))
    parsed = parse_file(path)
    record: dict[str, Any] = {
        "kind": kind,
        "file_id": file_id,
        "name": filename,
        "path": str(path),
        "label": Path(filename).stem,
    }
    if kind == "data":
        if not parsed.tables:
            raise ParseError("data upload needs a tabular structure")
        table = parsed.tables[0]
        record["schema"] = columns_as_dicts(table.columns)
        record["sheet"] = table.sheet
        record["row_count"] = len(table.rows)
        _ilog(session, "upload.parsed", kind="data", file=filename, rows=len(table.rows))
    else:
        chunks = chunk_text(parsed.text, file_id=file_id)
        facts = await extract_facts(llm, chunks)
        knowledge = _session_knowledge(storage, session.id)
        upsert_document(
            knowledge,
            KnowledgeDocument(
                file_id=file_id,
                original_path=str(path),
                chunks=chunks,
                facts=facts,
            ),
        )
        save_knowledge(storage, knowledge)
        record["chunk_ids"] = [c.id for c in chunks]
        record["fact_count"] = len(facts)
        session.extra["knowledge_facts"] = [f.model_dump(mode="json") for f in facts[:24]]
    return record


def _session_knowledge(storage: Storage, session_id: str) -> SessionKnowledge:
    if storage.exists("knowledge", f"{session_id}.json"):
        return load_knowledge(storage, session_id)
    return SessionKnowledge(session_id=session_id)


def _file_id(filename: str, taken: set) -> str:
    import re

    base = re.sub(r"[^a-zA-Z0-9_-]+", "_", Path(filename).stem).strip("_") or "file"
    candidate = base[:40]
    n = 2
    while candidate in taken:
        candidate = f"{base[:36]}_{n}"
        n += 1
    return candidate


def _fallback_summary(session: InterviewSession, pipeline: Pipeline) -> str:
    agents = [n.agent for n in pipeline.nodes]
    return (
        f"Draft pipeline with {len(pipeline.nodes)} nodes ({', '.join(agents) or 'none'}). "
        f"Requirements captured: {len(session.requirements)}."
    )


def _response(
    session: InterviewSession,
    message: ChatMessage,
    reveal: ProgressiveReveal | None,
) -> dict[str, Any]:
    return {
        "session_id": session.id,
        "status": session.status,
        "confirmed": session.confirmed,
        "question_count": session.question_count,
        "ready_to_confirm": session.status == "ready_to_confirm" or session.confirmed,
        "summary": session.summary,
        "upload_offer": session.extra.get("upload_offer"),
        "message": message.model_dump(mode="json"),
        "reveal": None if reveal is None else reveal.model_dump(mode="json"),
        "pipeline": session.pipeline,
    }
