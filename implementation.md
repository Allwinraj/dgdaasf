# Nexus 2.0 — Implementation Plan (Phase by Phase)

## 1. Goal

Build Nexus 2.0 as a **real, usable product**: a FastAPI backend + the existing
React frontend, where a user describes any finance process in plain English, uploads
working data and optional knowledge documents, completes an adaptive interview,
watches the agent pipeline **build live on the canvas**, confirms a plain-language
summary, studio test-runs it, and **saves** the confirmed DAG so it appears in the
Super Agent list — with per-run audit traces for studio executions.

The existing frontend is a **branded shell** (static copilot, Market Risk demo DAG,
placeholder `AgentChat`). Phases 6–7 rewrite Architect Studio and list saved
pipelines; they do not turn `AgentChat` into a production runner.

### Product-spec alignment (locked v1 cuts)

`product-feature.md` §5 journeys describe a full ops platform. §11 and the
decisions below **narrow v1** so the next build does not re-expand from the
journeys:

1. **Super Agent Library = minimal.** Persist confirmed pipelines to disk
   (`name` + version string + DAG JSON) and show them in `SuperAgents.tsx`.
   Opening a card loads the DAG in Architect (`/architect/create?pipeline=id`)
   for view/tune. **No** version compare, rollback, run-count/status as product
   behavior, or production re-run from the library.
2. **Expert handoff = UI only.** At the question cap, chat shows a structured
   summary and the canvas draft is saved. **No** ticket, email, or specialist
   assignment (auth/email are out of scope).
3. **Alert Dispatcher out of v1.** Output Agent ships **Excel + PDF + local
   download only**. Slack / Teams / Email, webhooks, and dispatch destination
   fields are deferred.
4. **Journeys are tests, not templates.** 3-way match, bank recon, intercompany,
   and rebate flows prove the universal engine. None of those column names or
   graphs are hardcoded.

Treat product §11 (“library deferred”) as **partially** applied: list/save yes;
operational library (re-run, compare, rollback) no.

### Non-negotiable design rules

1. **Zero hardcoding.** No column names, match keys, formulas, tolerances, or
   pipeline templates in source code. Everything is detected, LLM-compiled into
   dynamic AST expressions / parameterized configs, and stored as versioned DAG
   configurations. P2P, O2C, R2R, and FP&A are served by the *same* universal engine.
2. **Envelope-first.** Every agent is a pure `Envelope -> list[Envelope]` transform.
   Agents compose; the engine stays simple.
3. **Tune the behavior, not the code.** All agent behavior (prompts, match keys,
   windows, math gates, decision policies) lives in versioned YAML. Every run
   traces which version produced which outcome.
4. **Progressive reveal.** The pipeline emerges on the canvas as the interview
   progresses — incremental deltas (upsert/remove/reconfigure), never a full
   graph replace.
5. **One source of truth.** Canvas config-panel edits and chat stay synchronized
   bidirectionally.

### Locked infrastructure decisions

| Concern | Decision | Rationale |
|---|---|---|
| Persistence | Local filesystem (JSON snapshots + YAML configs) | No DB for v1; `storage.py` is the swap-in seam |
| Auth | Skipped entirely | No login/roles/permissions in v1 |
| Execution | In-process `asyncio` | No message broker, no Celery, no workers |
| Files | Local `data/uploads/` | Working data + knowledge docs on disk |
| LLM | Env-switchable: **Gemini** or **SAP AI Core** | `LLM_PROVIDER` in `.env` decides; all LLM calls route through it |
| Currency | Single currency | Multi-currency deferred |
| Output | Excel + PDF files, local download | No ERP mutations; no live Slack/Teams/Email in v1 |
| Library | Save + list only | No production re-run, compare, or rollback |
| Handoff | Chat/UI summary + saved draft | No ticket or email |

### Tech stack

- **Backend:** Python 3.11+, FastAPI, uvicorn, pydantic v2 + pydantic-settings,
  openpyxl, pandas, pypdf, httpx, pyyaml, pytest, pytest-asyncio.
- **Frontend (exists):** React 18 + Vite + TypeScript, ReactFlow (`@xyflow/react`),
  React Router 6, Tailwind CSS, zustand.
- **Testing:** pytest (unit + integration), mocked HTTP for LLM calls.

---

## 2. System Architecture

```
template_v4/
  backend/                          # NEW — FastAPI application
    pyproject.toml
    app/
      main.py                       # entrypoint, router mounts, CORS
      core/
        settings.py                 # env-driven settings
        logging.py                  # structured JSON logs + correlation IDs
        llm.py                      # LLMProvider + GeminiProvider + SAPAICoreProvider
        storage.py                  # atomic local file/JSON store abstraction
      models/
        envelope.py                 # A2A Envelope (universal data contract)
        pipeline.py                 # Pipeline, Node, Edge, Port
        run.py                      # Run, RunStep, RunStatus
        behavior.py                 # AgentBehavior + versions ("fine-tune" unit)
        chat.py                     # InterviewSession, ChatMessage, ProgressiveReveal
        knowledge.py                # session knowledge store (chunks + facts + file link)
      agents/
        base.py                     # Agent protocol + AgentRegistry
        ingestor.py                 # Data mode / Knowledge mode
        matcher.py                  # Dedupe / Structural / Semantic (+ relationship flags)
        math_engine.py              # Calculation / Rule / Hybrid (catalog + Python AST)
        decision.py                 # Anomaly / Policy / Approval
        exporter.py                 # Excel / PDF (local download)
      engine/
        dag.py                      # topo sort + level-parallel exec + port routing
        runner.py                   # run loop, step capture, error strategy
        conditional.py              # gate/branch edge handling
        schema_sync.py              # schema-override propagation downstream
      services/
        interview.py                # adaptive interview orchestration
        pipeline_builder.py         # requirements -> DAG (incremental reveal deltas)
        parser.py                   # .xlsx / .csv / .pdf parsing + schema detection
        knowledge.py                # chunk / extract / retrieve-by-id
        exporter.py                 # Excel + PDF deliverable generation
      api/
        chat.py                     # session, message, upload, confirm, handoff, node sync
        agents.py                   # catalog + versioned behaviors
        pipelines.py                # CRUD + save-to-library list
        runs.py                     # studio execute + status + snapshot
    data/
      uploads/                      # user files
      knowledge/                    # per-session chunks + extracted facts
      runs/                         # JSON run snapshots
      pipelines/                    # persisted pipeline DAGs (library list)
      formulas/<version>.yaml       # versioned proven-formula catalog
      agents/<name>/<version>.yaml  # versioned behavior configs
    config/
      ai_models.yaml                # SAP AI Core model role mapping
    tests/
      unit/                         # agents, engine, models
      integration/                  # API flows
  frontend/                         # EXISTING React + Vite app
    src/
      lib/api.ts                    # NEW — typed API client
      types/                        # NEW — backend type mirrors
      components/ChatPanel.tsx      # NEW — live interview chat
      components/Canvas.tsx         # NEW — ReactFlow surface for reveals
      components/RunTrace.tsx       # NEW — studio run step audit
      pages/CreateAgent.tsx         # REWRITE — real session + live canvas
      pages/RunDetail.tsx           # NEW — studio run audit view (not ops console)
      pages/SuperAgents.tsx         # REWIRE — list saved pipelines; open in Architect
      pages/AgentChat.tsx           # STUB — unused as a runner; Launch redirects to Architect
      data/flowNodes.ts             # GENERALIZE — dynamic nodes, drop demo data
      components/NodeConfigPanel.tsx# REWRITE — schema-driven, chat-synced
      context/AgentContext.tsx      # REWIRE — API-backed pipeline + session state
```

### The four key abstractions

1. **Envelope** — the typed message flowing between nodes:
   ```python
   class Envelope(BaseModel):
       run_id: str
       node_id: str
       port: str = "default"   # default | matched | residuals | exceptions
                               # | approved | flagged | escalated
       payload: dict[str, Any]
       knowledge_context: dict[str, Any] | None = None  # structured facts + chunk ids
       meta: dict[str, Any]    # lineage, tags, timestamps
       schema_ref: str | None = None
       emitted_by: str         # e.g. "matcher@v1.2" — version traceability
   ```
2. **Agent protocol + registry** — `name` +
   `async execute(ctx, env) -> list[Envelope]`; `AgentRegistry` maps name → class
   so new agents are drop-in.
3. **Versioned behavior configs** — `data/agents/<name>/<version>.yaml` hold
   modes, join keys, windows, relationship flags, math gates, prompts, thresholds.
   Loaded by `name@version`.
4. **DAG engine** — topological sort, level-parallel `asyncio.gather` execution,
   multi-port routing (downstream runs only when a source port emits), gate/branch
   edges, and schema-override propagation.

---

## Phase 1 — Backend foundation & LLM integration

**Files:** `backend/pyproject.toml`, `app/main.py`, `core/settings.py`,
`core/logging.py`, `core/llm.py`, `core/storage.py`, `models/envelope.py`,
`agents/base.py`

1. **Dependencies** — fastapi, uvicorn, pydantic v2, pydantic-settings,
   python-multipart, openpyxl, pandas, pypdf, httpx, pyyaml, pytest,
   pytest-asyncio.
2. **`settings.py`** — env-driven settings for **both** providers:
   - Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_BASE_URL`.
   - SAP AI Core: `XSUAA_URL`, `XSUAA_CLIENT_ID`, `XSUAA_CLIENT_SECRET`,
     `AICORE_API_URL`, `AICORE_RESOURCE_GROUP`, the four
     `AICORE_*_DEPLOYMENT_ID` role mappings, `AICORE_OPENAI_API_VERSION`.
   - Plus the active `LLM_PROVIDER` switch, `HOST`/`PORT`, `LOG_LEVEL`,
     `DATA_DIR`.
3. **`logging.py`** — structured JSON logs with request/run correlation IDs so
   any run/step is traceable end-to-end (critical with no auth/user context).
4. **`llm.py`** — `LLMProvider` protocol + two interchangeable providers,
   selected at startup by `LLM_PROVIDER` in `.env` (`gemini` | `sap_ai_core`).
   Switching the env value switches **all** LLM calls app-wide — no code change:
   - **`GeminiProvider`** — Google Generative Language API
     (`generateContent`, `X-goog-api-key` header). Settings: `GEMINI_API_KEY`,
     `GEMINI_MODEL` (default `gemini-flash-lite-latest`,
     see `test_gemini.py` for the validated smoke test), `GEMINI_BASE_URL`.
   - **`SAPAICoreProvider`** — Azure OpenAI-compatible inference via SAP AI
     Core (XSUAA OAuth2 client-credentials against `XSUAA_URL`; token cached
     with expiry + refresh). Requests go to `AICORE_API_URL` with
     `AICORE_RESOURCE_GROUP` routing and `?api-version=` from
     `AICORE_OPENAI_API_VERSION`. **Role → best deployment mapping** (from
     `AICORE_*_DEPLOYMENT_ID` env vars):
     | Role | Model | Used for |
     |---|---|---|
     | `extraction` | gpt-4o-mini | fast schema/requirement extraction, Q&A analyst |
     | `reasoning` | gpt-5.5 | strongest reasoning — Architect interview & DAG compilation |
     | `general` | gpt-4.1 | balanced capability — semantic policy judge |
     | `reconciliation` | gpt-4o | high-capability complex reconciliation reasoning |
   - Common contract regardless of provider: `complete(model_role, prompt,
     temperature) -> str`; role routing (`extraction` | `reasoning` |
     `general`) resolved per provider from `ai_models.yaml` / env.
   - **Deterministic JSON-mode prompts** for structured outputs (schema
     extraction, requirement extraction, DAG deltas) with strict JSON-schema
     validation on responses — repair-retry on malformed output.
   - Retry with exponential backoff (handles transient 503s) and clear typed
     errors on exhaustion.
   - `.env` carries **both** providers' credentials; only the one named by
     `LLM_PROVIDER` is activated.
5. **`storage.py`** — thin filesystem store: read/write JSON/YAML, list, delete,
   **atomic writes (temp file + rename)** to prevent corruption.
6. **`envelope.py`** — the A2A contract (see §2).
7. **`agents/base.py`** — Agent protocol, `RunContext` (run id, LLM provider,
   storage, logger, optional knowledge store), `AgentRegistry`.

**Verification:** unit tests for settings loading, storage atomicity (crash-safe
writes), and the token cache/refresh/retry path (mocked HTTP).

---

## Phase 2 — Domain models & DAG execution engine

**Files:** `models/pipeline.py`, `models/run.py`, `models/behavior.py`,
`models/chat.py`, `models/knowledge.py`, `engine/dag.py`, `engine/runner.py`,
`engine/conditional.py`, `engine/schema_sync.py`

1. **`pipeline.py`** — `Pipeline`, `Node` (id, agent, mode, behavior ref,
   dynamic config), `Edge` (source, source_port, target, type: normal |
   conditional), `Port`. Load/persist from `data/pipelines/`. Node `agent` is
   one of `ingestion | matcher | math | decision | output`.
2. **`run.py`** — `Run`, `RunStep`, `RunStatus` (`queued`, `running`,
   `completed`, `failed_with_exceptions`). Each step records input/output
   envelopes, behavior version, duration, and error. Studio test runs write
   snapshots under `data/runs/` (not a production ops console).
3. **`behavior.py`** — `AgentBehavior` + `BehaviorVersion`, loaded from
   `data/agents/<name>/<version>.yaml`.
4. **`chat.py`** — `InterviewSession` (created **empty**; files arrive later),
   `ChatMessage`, `ExtractedRequirement`, `ProgressiveReveal`:
   `upsert_nodes`, `remove_node_ids`, `upsert_edges`, `remove_edge_ids`,
   `config_patches`. Incremental — not a full graph replace.
5. **`knowledge.py`** — per-session store: original file link, section chunks
   (id, heading, text), extracted structured facts. Downstream agents consume
   facts by default and may `retrieve(chunk_id)` for a cited passage. File-backed;
   no vector DB in v1.
6. **`dag.py`** — topological sort; execute each level concurrently with
   `asyncio.gather`; route envelopes across multi-ports; downstream nodes
   execute only when a source port emits (partial branches stay dormant).
7. **`runner.py`** — run loop: build context, walk the DAG, capture a
   `RunStep` per node (in/out envelopes, version, duration), collect errors,
   write the JSON snapshot at completion. Two error layers: **per-record error
   isolation** (a bad row lands in the exceptions stream, not a crash) and
   **node-level error strategy** (fail-fast vs. emit-to-exceptions-port).
8. **`conditional.py`** — gate/branch edges (e.g., "route rows where variance
   > 0 to node X"), evaluated against envelope payloads with dynamic
   expressions.
9. **`schema_sync.py`** — when a user edits a detected column/type on an
   Ingestion node, propagate the override to all downstream connected nodes.

**Verification:** unit tests for topo ordering, parallel level execution,
multi-port routing, conditional gating, schema propagation, and reveal delta
apply (upsert + remove + patch) — on synthetic pipelines with stub agents
(no LLM).

---

## Phase 3 — The five core agents (split into focused sub-phases)

This is the **most critical and focused** part of the build, so it is split
into five sub-phases — one per agent, in dependency order. Each sub-phase ends
with its own verification gate, so we ship and validate agents incrementally
instead of one giant phase. Modes are behaviors of one agent, selected by the
node's behavior config — never separate agents.

**Build order rationale:** Ingestion first (everything consumes its Envelopes),
then Math Engine (deterministic, no LLM, proves the engine), then Matcher (the
relational core), then Decision (LLM judgment), then Exporter (terminal
deliverables). After 3B a minimal ingest → compute → export pipeline can run
end-to-end; after 3C the first realistic recon/match flow works.

### Phase 3A — Ingestion Agent (Agent 1)

**Files:** `agents/ingestor.py`, `services/parser.py`, `services/knowledge.py`

- *Data Mode* (working files) and *Knowledge Mode* (policy/SOP/rulebooks).
  Formats: `.xlsx`, `.csv`, `.pdf`. Mode is chosen from upload intent (working
  vs knowledge), not file extension. Both modes appear on the canvas as
  distinct labeled nodes (`Ingest: Data` and `Ingest: Knowledge`) with visible
  edges into consumers.
- Dynamic **schema detection** (columns, types, sample values) via
  `services/parser.py` — nothing hardcoded; the detected schema rides on the
  Envelope, is editable in the panel, and propagates downstream
  (`schema_sync`).
- Knowledge Mode follows the four-part product approach:
  1. Read the entire document.
  2. Break into logical chunks (section / heading / topic).
  3. Extract structured rules and facts (thresholds, entities, formulas).
  4. Keep the original file linked; store chunk ids so Matcher/Decision can
     retrieve a cited passage instead of re-reading the whole doc.
- LLM role: `extraction` (gpt-4o-mini / Gemini flash) for knowledge parsing
  and schema interpretation.

**Verification:** parse fixtures in all 3 formats × 2 modes; detected-schema
snapshot tests; malformed-file error handling; knowledge facts JSON schema;
chunk retrieve-by-id returns the original passage.

### Phase 3B — Rule & Math Engine (Agent 3)

**Files:** `agents/math_engine.py`, `data/formulas/<version>.yaml`

- *Calculation* (per-row; aggregate with Summary-Table / Window-Column toggle;
  sequential running balances; scalar totals), *Rule/Gate* (nested AND/OR,
  thresholds, filtering), *Hybrid* (compute then gate in one pass).
- **Exact decimal arithmetic** (never floats), configurable rounding.
- **Per-record empty-value handling** without breaking execution.
- **Proven formula catalog first:** versioned YAML of common finance logic
  (variance %, min(pct, amount) tolerance gate, running balance, etc.) — not
  use-case pipeline templates. The LLM maps plain English to a catalog id
  **or**, if nothing matches, compiles a sandboxed Python AST. The engine
  validates AST against an operator whitelist and exposes it in the dual-mode
  inspector.
- **Numeric tolerances live here**, not on the Matcher (e.g. Journey 1
  `2% / $50` hybrid gate).
- LLM role: `reasoning` (gpt-5.5 / Gemini) only for catalog mapping / formula
  compilation; execution itself is 100% deterministic.

**Verification:** decimal-precision test suite (money-critical); AST sandbox
security tests (whitelist bypass attempts); empty-value matrix; gate
expression truth tables; catalog-id vs AST fallback with mocked LLM.

### Phase 3C — N-Way Matcher (Agent 2)

**Files:** `agents/matcher.py`

- *Dedupe* (1 source; dual stream: clean master + duplicate-cluster audit),
  *Structural* (2+ sources; exact/composite keys, windowed & multi-way joins),
  *Semantic* (2+ sources; LLM entity normalization, fuzzy fields, date drift).
- **Relationship shapes as config-driven flags on this one agent** (not extra
  agents, not hardcoded P2P templates): directional match, split / M:N
  allocation, residual emit, reversal, keyless/identity, distinct-entity
  guard, temporal window. Chained Matcher nodes only when the interview needs
  multi-stage flows.
- **Multi-output ports:** `matched`, `residuals`, `exceptions` — wired into the
  DAG engine's port routing. Unified records carry status, confidence, keys,
  evidence, residuals, and (when relevant) direction / allocation detail.
- **Matcher finds and scores; it does not apply amount/variance tolerances.**
  Config = join keys, window, confidence threshold, relationship flags, port
  wiring. Numeric gates → Math. Qualitative / policy calls → Decision.
- Join keys come only from the behavior config / interview — zero hardcoded
  keys. Confidence scoring for fuzzy matches. Single currency.
- LLM role: `reconciliation` (gpt-4o / Gemini) for semantic normalization.

**Verification:** join correctness tests (composite/windowed/multi-way);
dedupe cluster quality; directional + M:N + residual fixtures; port-routing
integration with Phase 2 engine; semantic-mode tests with mocked LLM.
Tolerance-boundary tests belong in Phase 3B (Math), not here.

### Phase 3D — Decision Agent (Agent 4)

**Files:** `agents/decision.py`

- *Anomaly & Risk Classification*, *Policy & Contract Interpretation* (vs.
  upstream structured facts + optional retrieved chunks), *Approval &
  Escalation Gateway* (`Approved` / `Flagged for Review` / `Escalated to
  Management` ports).
- Authority levels: **Autonomous** (auto-decide above confidence threshold) vs.
  **Advisory** (hold for human sign-off — enrich records; studio shows the
  review stream, there is no ticket queue in v1).
- Shared output contract: verdict, confidence, plain-English explanation,
  policy citation (document + section / chunk id), remediation hint.
- LLM role: `general` (gpt-4.1 / Gemini) for judgment; JSON-validated verdicts
  with repair-retry.

**Verification:** verdict-contract schema tests; authority-threshold
simulation; port routing for the 3 verdicts; mocked-LLM determinism tests;
policy-citation includes chunk id when a passage was retrieved.

### Phase 3E — Output Exporter (Agent 5)

**Files:** `agents/exporter.py`, `services/exporter.py`

- *Styled Excel Workbook* (multi-tab, styled headers, frozen panes, native
  formulas, conditional color, multi-stream tab packaging) and *Visual PDF
  Report* (KPI cards, optional suggested charts: match donut, variance bars,
  balance trends; sign-off blocks).
- Built-in themes: Executive Classic, Modern Slate, Audit Clean. Multiple
  Output nodes per canvas supported. Artifact = file on the run snapshot +
  **local download**.
- **Out of v1:** Alert Dispatcher, Slack / Teams / Email, webhooks, dispatch
  metadata, delivery-destination fields.

**Verification:** workbook/PDF golden-file comparisons; theme rendering;
multi-stream tab packing; artifact saved-to-snapshot + download URI; **no**
alert payload tests.

**Phase 3 integration gate (after 3E):** run a full synthetic pipeline —
Ingestion → Matcher → Math Engine → Decision → Exporter — on fixture data with
mocked LLM, asserting envelope version tags (`emitted_by`) at every hop and
the Excel/PDF deliverable in the run snapshot.

---

## Phase 4 — Adaptive interview & progressive pipeline reveal

**Files:** `services/interview.py`, `services/pipeline_builder.py`, `api/chat.py`

The heart of the product. The LLM decides in real time what it knows and what
to ask — no rigid questionnaire, no hardcoded flows.

Conversation lifecycle (matches product 4.1 / §5 — files are **not** required
at session create):

1. Welcome + business-context warm-up (role, industry, finance domain:
   P2P/O2C/R2R/FP&A) — lightweight and open-ended.
2. Process description in plain English.
3. Working data upload → schema detection (Phase 3 parser).
4. Knowledge upload (optional, one or many).
5. Initial pipeline proposal on the canvas as soon as description + data
   (+ knowledge) land — a concrete draft to react to.
6. Adaptive interview: minimum 5 grounding questions, adaptive stop once
   confident (typically 5–8), hard cap 12–15. Each answer is distilled into
   structured `ExtractedRequirement`s (sources, keys, math gates, rules,
   outputs) stored on the session.
7. Confirm & summarize: plain-language pipeline summary; user must confirm
   before a studio test run.
8. Expert handoff (UI only): if still unclear at the cap, freeze the session,
   persist the canvas draft + structured summary for display in chat. No
   ticket, email, or specialist assignment.

Confidence gating per node: the LLM builds when it has enough; asks when it
doesn't; recognizes processes the agents can't serve.

**`services/pipeline_builder.py`** — turns requirements into a DAG
**incrementally**. After each answer (and after the post-upload draft),
returns a `ProgressiveReveal` with `upsert_nodes`, `remove_node_ids`,
`upsert_edges`, `remove_edge_ids`, `config_patches` — never a full rebuild.
Selects only the agents the process needs; chains nodes only for complex
multi-stage flows. Knowledge and Data ingestion are separate labeled nodes.

**`api/chat.py`:**

- `POST /chat/session` — create an **empty** session; return session id and
  the welcome message. No description, no files.
- `POST /chat/message` — context, description, or interview answer; returns
  assistant message + optional reveal delta + optional “ready to confirm”.
- `POST /chat/upload` — working data vs knowledge (many files); triggers
  parse/schema (and knowledge chunk/extract). After description + data
  (+ optional knowledge): first `ProgressiveReveal` draft + first interview
  question.
- `POST /chat/confirm` — user accepts the plain-language summary; session
  marked confirmed (gate for studio test run / save-to-library).
- `POST /chat/handoff` — freeze session; persist draft DAG + structured
  summary for UI. No external dispatch.
- `POST /chat/sync-node` — accept a config-panel edit, regenerate dependent
  config, return a chat confirmation message (bidirectional sync, one source
  of truth).

**Verification:** integration test scripted around the invoice 3-way match
journey asserting empty-session start, upload-then-draft, node reveal
sequence (including a remove/reconfigure), question budget bounds, confirm
gate, and handoff-at-cap. Repeat for a bank-reconciliation description to
confirm no journey logic is hardcoded.

---

## Phase 5 — Pipeline, run & agent APIs

**Files:** `api/agents.py`, `api/pipelines.py`, `api/runs.py`

- `GET /agents` — catalog (5 agents, their modes, config schemas for the panel).
- `GET /agents/{name}/versions` — versioned behaviors.
- `POST /pipelines`, `GET /pipelines`, `GET /pipelines/{id}` — persist/load DAGs
  for the **minimal library list**.
- `POST /pipelines/preview` — preview DAG from a natural-language draft
  (optional; Architect normally uses chat reveals).
- `POST /pipelines/{id}/save` — save confirmed session pipeline to the library
  list (`name` + version string + DAG JSON). Replaces “publish with run count /
  status”. **No** production re-run endpoint from the library.
- `POST /runs` — studio execute against the **session (or saved) pipeline**
  (`{pipeline_id or session_id, inputs}` → `run_id`); uploads resolved from
  `data/uploads/`. Allowed after confirm (or on a saved pipeline opened in
  Architect). Intermediate step status is available via `GET /runs/{run_id}`.
- `GET /runs/{run_id}` — status + steps (for canvas per-node pills + RunTrace).
- `GET /runs/{run_id}/snapshot` — full JSON snapshot for studio replay/audit.
- `GET /runs/{run_id}/artifacts/{name}` — download Excel/PDF from the snapshot.

**Verification:** integration test posting a studio run and asserting every
`RunStep` carries the correct `emitted_by` version tag; a second studio run
after a Math-gate config edit shows a traceable outcome difference in the
snapshot. Library list returns the saved DAG; there is no “re-run from
library” product assertion.

---

## Phase 6 — Frontend: live canvas + interview

**Modify:** `vite.config.ts`, `src/data/flowNodes.ts`, `src/pages/CreateAgent.tsx`,
`src/context/AgentContext.tsx`, `src/components/NodeConfigPanel.tsx`
**New:** `src/lib/api.ts`, `src/types/`, `src/components/ChatPanel.tsx`,
`src/components/Canvas.tsx`

1. **Vite proxy** — `/api` → `http://localhost:8000`.
2. **Typed client** — `api.ts` wraps chat/pipeline/run/agent endpoints; types
   in `src/types/` mirror the pydantic models.
3. **`CreateAgent.tsx`** — replace the static copilot + demo nodes:
   - On mount, `POST /chat/session` (empty) and render `ChatPanel` starting at
     **welcome** — do not require description or files to create the session.
   - Uploads appear when Nexus asks: separate widgets for working data vs
     knowledge (`POST /chat/upload`).
   - Apply each `ProgressiveReveal` (upsert/remove/patch) to ReactFlow; canvas
     starts **empty** — no hardcoded nodes anywhere.
   - After the interview, show the plain-language summary and a Confirm
     control (`POST /chat/confirm`). Handoff renders the structured summary
     in chat and keeps the draft on the canvas.
   - “Test Run” (post-confirm) calls `POST /runs` and paints per-step status
     on canvas nodes.
   - `?pipeline=id` loads a saved library DAG for view/tune (no AgentChat).
4. **`flowNodes.ts`** — `NodeConfig` carries `agent` (`ingestion | matcher |
   math | decision | output`), `mode`, `behaviorVersion`, `ports`, and dynamic
   config. Delete Market Feed / Risk Matrix demo data. Multi-output handles:
   Matcher `matched` / `residuals` / `exceptions`; Decision `approved` /
   `flagged` / `escalated`. Ingestion Data vs Knowledge as separate labeled
   nodes with visible edges into consumers.
5. **`NodeConfigPanel.tsx`** — **mode-adaptive** fields from backend schemas
   (Matcher: keys, window, confidence, relationship flags, port routing —
   **not** amount tolerances; Math: plain-English formula, shape, precision,
   empty-value, AST inspector; Decision: authority + confidence slider;
   Output: Excel vs PDF, tabs/sections, optional charts, theme; Ingestion:
   file/sheet/header + expandable schema overrides). Advanced: LLM model /
   temperature collapsed. Edits `POST /chat/sync-node` and display the
   returned chat confirmation.
6. **`AgentContext.tsx`** — session + pipeline state from the API; keep chat ↔
   panel ↔ canvas coherent; after confirm, `POST /pipelines/{id}/save` adds
   the DAG to the SuperAgents list.

**Verification:** browser walkthrough — welcome → context → describe → upload
data/knowledge → draft appears → interview deltas (including a panel edit
synced to chat) → confirm → studio test run → download Excel/PDF → save to
list.

---

## Phase 7 — Studio traceability & minimal library UI

**Files:** `src/pages/RunDetail.tsx` (new), `src/components/RunTrace.tsx`
(new), `src/pages/SuperAgents.tsx` (rewire), `src/pages/SkillLibrary.tsx`
(rewire), `src/pages/AgentChat.tsx` (redirect or leave stub)

1. **`RunDetail.tsx`** — **studio** audit view (not a production ops console):
   step-by-step trace, behavior versions, envelopes, durations, errors,
   Excel/PDF download links.
2. **`RunTrace.tsx`** — reusable per-step trace (status pill, envelope
   inspector reusing `InspectionModal`).
3. **`SuperAgents.tsx`** — list saved pipelines (name, version string). Card
   open → `/architect/create?pipeline=id`. **No** run count, status badges as
   product, launch-to-chat, or production re-run.
4. **`SkillLibrary.tsx`** — show the 5 specialist agents + modes from
   `GET /agents`; “Deploy to Pipeline” opens empty Architect (`/architect/create`).
5. **`AgentChat.tsx`** — not an execution surface. Redirect Launch/deep links
   to Architect, or leave the existing echo stub unused.

**Verification:** complete a studio run, open RunDetail, confirm the trace and
downloads; save to library; open the card and see the same DAG in Architect.
Do **not** assert re-run-from-library or version increment as product.

---

## 3. Frontend usage plan (product-level)

1. **Landing & navigation** — `Landing` (entry), `TopNav` + `SideNav`
   (Architect studio routes), `SuperAgents` (saved-pipeline list).
2. **Skill Library** — browse the 5 agents and their modes; “Deploy to Pipeline”
   opens Architect (does not inject a hardcoded graph).
3. **Architect Studio (core)** — split view: left = live interview chat;
   center = ReactFlow canvas with progressive reveal + multi-port handles;
   right = mode-adaptive NodeConfigPanel, bidirectionally synced.
4. **Confirm → studio test run → audit** — Confirm in chat, then Test Run →
   canvas step status + optional `RunDetail`.
5. **Minimal library** — save confirmed pipelines; open in Architect to view
   or tune. No production re-run from the list.

---

## 4. Reliability & quality (production-grade)

- **Exact decimal math** everywhere money is involved; never floats.
- **Per-record error isolation** separate from node-level error strategy.
- **Atomic JSON writes** (temp file + rename) to avoid corruption.
- **Correlation IDs** in every log line for end-to-end run/step tracing.
- **Retries + backoff** on external LLM calls; strict JSON-schema validation
  of LLM outputs with repair-retry.
- **Sandboxed dynamic expressions** — operator-whitelisted AST validation for
  all LLM-compiled formulas and gate conditions.
- **Structured validation** (pydantic) at every boundary.
- **Full test suite**: unit (agents/engine/models) + integration (API flows).

---

## 5. Out of scope (explicit decisions)

- Authentication / authorization / user roles.
- Database, object storage, message brokers, distributed workers.
- Multi-currency conversion.
- LLM weight fine-tuning (behavior configs are the "fine-tune" layer).
- Live ERP mutations; output is Excel/PDF files + local download only.
- Live Slack / Teams / Email Alert Dispatcher (and webhooks).
- Expert handoff tickets, email notifications, or specialist assignment.
- Super Agent Library as an operational runner: no production re-run, version
  compare, or rollback. List + save + open-in-Architect only.
- `AgentChat` as a production execution surface.
- LLM failure-mode guardrails beyond JSON-schema validation + retry (e.g.,
  hallucinated-key confidence scoring for ingestion) — deferred.

All deferred items sit behind existing seams (`storage.py`, `LLMProvider`,
`AgentRegistry`) and can be added without engine rework.

---

## 6. Verification (end-to-end)

1. `uvicorn app.main:app --reload` (backend) + `npm run dev` (frontend).
2. Complete an **invoice 3-way match (P2P)** journey through Architect: welcome
   → upload → interview → confirm → studio test run → Excel download → save
   to list. Matcher does not apply the 2%/$50 gate (Math does).
3. Complete a **bank reconciliation (R2R)** with **no code change** — proving
   universality (temporal window, chained math, PDF).
4. Optional matcher-capability check (not a required demo with Slack): cash
   application / M:N + residuals **without** Alert Dispatcher.
5. Confirm a config-panel edit (match key or Math threshold) produces a chat
   confirmation and a different, traceable outcome on a **second studio run**.
6. At question cap on an ambiguous description, UI handoff summary appears and
   the draft is saved — no ticket/email.
7. `pytest tests/` green.

---

## 7. Build order & biggest risks

Build phases strictly in order (1 → 7); Phase 3 runs as sub-phases
3A → 3B → 3C → 3D → 3E (see the build-order rationale in Phase 3). Phases 2
and 4 carry the most engineering risk and should get early prototypes.

| Risk | Mitigation in plan |
|---|---|
| Interview quality (when to build vs. ask) | Strict JSON schemas for `ExtractedRequirement` / `ProgressiveReveal`; confidence gating; question budget; empty-session + upload-then-draft tests (Phase 4) |
| Reveal races (add/remove/reconfigure) | Delta apply unit tests: upsert + remove + config_patches (Phase 2) |
| LLM-compiled formulas breaking runs | Formula catalog first + operator-whitelisted AST sandbox + retry (Phases 2–3) |
| Schema/edit sync complexity | `schema_sync` as a dedicated engine module with unit tests (Phase 2) |
| Scope creep from journeys (alerts, tickets, library re-run) | Locked v1 cuts in §1 Product-spec alignment |
| Filesystem limits at scale | Accepted for v1; `storage.py` is the swap-in seam |
