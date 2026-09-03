from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.logging import new_id
from app.core.storage import Storage
from app.deps import get_storage
from app.engine.persist import list_pipelines, load_pipeline, save_pipeline
from app.models.pipeline import Pipeline
from app.services.sessions import load_session, session_pipeline

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


class SaveBody(BaseModel):
    session_id: str
    name: str
    version: str = "v1"


class PreviewBody(BaseModel):
    session_id: str
    extra: dict = Field(default_factory=dict)


def _session(storage: Storage, session_id: str):
    try:
        return load_session(storage, session_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="session not found") from exc


@router.get("")
def get_pipelines(storage: Storage = Depends(get_storage)) -> dict:
    items = list_pipelines(storage)
    return {
        "pipelines": [
            {"id": p.id, "name": p.name, "version": p.version, "nodes": len(p.nodes)}
            for p in items
        ]
    }


@router.get("/{pipeline_id}")
def get_pipeline(pipeline_id: str, storage: Storage = Depends(get_storage)) -> dict:
    try:
        pipeline = load_pipeline(storage, pipeline_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="pipeline not found") from exc
    return pipeline.model_dump(mode="json")


@router.post("", status_code=status.HTTP_201_CREATED)
def save_to_library(body: SaveBody, storage: Storage = Depends(get_storage)) -> dict:
    session = _session(storage, body.session_id)
    if not session.confirmed:
        raise HTTPException(status_code=400, detail="session is not confirmed")
    draft = session_pipeline(session)
    if not draft.nodes:
        raise HTTPException(status_code=400, detail="session has no draft DAG")
    pipeline = draft.model_copy(
        update={"id": new_id(), "name": body.name, "version": body.version}
    )
    save_pipeline(storage, pipeline)
    return pipeline.model_dump(mode="json")


@router.post("/preview")
def preview_pipeline(body: PreviewBody, storage: Storage = Depends(get_storage)) -> dict:
    session = _session(storage, body.session_id)
    pipeline = session_pipeline(session)
    return {"session_id": session.id, "confirmed": session.confirmed, "pipeline": pipeline.model_dump(mode="json")}
