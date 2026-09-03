from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from app.core.settings import BACKEND_ROOT
from app.engine.ast_sandbox import validate_expr

COMPILE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["catalog_id", "ast"],
    "properties": {
        "catalog_id": {"type": "string"},
        "ast": {"type": "string"},
        "gate_ast": {"type": "string"},
        "shape": {"type": "string"},
        "output": {"type": "string"},
        "mode": {"type": "string"},
    },
}


class CatalogFormula(BaseModel):
    id: str
    description: str = ""
    mode: str = "calculation"
    shape: str = "per_row"
    output: str = "result"
    inputs: list[str] = Field(default_factory=list)
    ast: str
    gate_ast: str | None = None


class FormulaCatalog(BaseModel):
    version: str
    formulas: list[CatalogFormula]

    def get(self, formula_id: str) -> CatalogFormula:
        for item in self.formulas:
            if item.id == formula_id:
                return item
        raise KeyError(formula_id)

    def ids(self) -> list[str]:
        return [item.id for item in self.formulas]


@lru_cache
def load_catalog(path: str | None = None) -> FormulaCatalog:
    file = Path(path) if path else BACKEND_ROOT / "data" / "formulas" / "v1.yaml"
    data = yaml.safe_load(file.read_text(encoding="utf-8"))
    catalog = FormulaCatalog.model_validate(data)
    for item in catalog.formulas:
        _assert_safe(item.ast)
        if item.gate_ast:
            _assert_safe(item.gate_ast)
    return catalog


def _assert_safe(expression: str) -> None:
    validate_expr(expression)


class CompiledLogic(BaseModel):
    catalog_id: str | None = None
    ast: str
    gate_ast: str | None = None
    shape: str = "per_row"
    mode: str = "calculation"
    output: str = "result"
    inputs: list[str] = Field(default_factory=list)


async def compile_logic(config: dict[str, Any], llm) -> CompiledLogic:
    catalog = load_catalog(config.get("catalog_path"))
    if config.get("ast"):
        _assert_safe(config["ast"])
        if config.get("gate_ast"):
            _assert_safe(config["gate_ast"])
        return CompiledLogic(
            catalog_id=config.get("catalog_id"),
            ast=config["ast"],
            gate_ast=config.get("gate_ast"),
            shape=config.get("shape") or "per_row",
            mode=config.get("mode") or "calculation",
            output=config.get("output_column") or config.get("output") or "result",
            inputs=list(config.get("inputs") or []),
        )
    catalog_id = config.get("catalog_id")
    if catalog_id:
        item = catalog.get(catalog_id)
        return CompiledLogic(
            catalog_id=item.id,
            ast=item.ast,
            gate_ast=item.gate_ast,
            shape=config.get("shape") or item.shape,
            mode=config.get("mode") or item.mode,
            output=config.get("output_column") or item.output,
            inputs=item.inputs,
        )
    english = config.get("formula_en") or config.get("formula")
    if not english:
        raise ValueError("math node needs catalog_id, ast, or formula_en")
    prompt = (
        "Map this finance formula to a catalog id if it matches, else a sandboxed "
        "Python expression using only + - * / min max abs sum and comparisons. "
        f"Catalog ids: {catalog.ids()}. "
        "Use canonical names actual, budget, expected, pct, amount, deposit, "
        "withdrawal, previous, measure, variance_amount when they fit.\n"
        f"Formula: {english}"
    )
    payload = await llm.complete_json("reasoning", prompt, COMPILE_SCHEMA)
    cid = (payload.get("catalog_id") or "").strip()
    if cid and cid in catalog.ids():
        item = catalog.get(cid)
        return CompiledLogic(
            catalog_id=item.id,
            ast=item.ast,
            gate_ast=payload.get("gate_ast") or item.gate_ast,
            shape=payload.get("shape") or item.shape,
            mode=payload.get("mode") or item.mode,
            output=payload.get("output") or item.output,
            inputs=item.inputs,
        )
    ast_expr = payload.get("ast") or ""
    _assert_safe(ast_expr)
    gate = payload.get("gate_ast") or None
    if gate:
        _assert_safe(gate)
    return CompiledLogic(
        catalog_id=None,
        ast=ast_expr,
        gate_ast=gate,
        shape=payload.get("shape") or config.get("shape") or "per_row",
        mode=payload.get("mode") or config.get("mode") or "calculation",
        output=payload.get("output") or config.get("output_column") or "result",
        inputs=list(config.get("inputs") or []),
    )
