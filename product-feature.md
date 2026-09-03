# Nexus 2.0 — Product Feature Document

## 1. Product Overview

Nexus 2.0 is an **AI-powered finance operations platform**. A user describes a
process in plain language, uploads their data, and Nexus **interviews them** to fill
in what it doesn't know. As the conversation progresses, Nexus **builds a live
pipeline on the canvas** — selecting only the agents it needs, connecting them, and
showing the workflow take shape in real time.

When Nexus has enough to be confident, it summarizes the pipeline in simple terms for
confirmation. If the requirements are still unclear after the interview, Nexus hands
off gracefully to a **human expert** with everything captured so far.

The platform replaces repetitive, error-prone spreadsheet work with **autonomous
agent pipelines** that keep humans in control at every stage.

### The one-line promise
> Describe your process in plain English, share your data, and answer a few
> questions. Nexus assembles the right agents into a live pipeline you can see,
> confirm, and tune.

### Core Architectural Tenet: Zero Hardcoding / Universal Dynamic Engine
> **IMPORTANT NOTE:** All workflows and journeys mentioned in this document
> (3-way match, bank reconciliation, budget variance, intercompany recon, distributor rebates)
> are **illustrative examples and stress tests only**.
> 
> **Nexus is built to solve ANY finance use case.**
> In code, **NOTHING is hardcoded**:
> - **No hardcoded schemas or column names** (`po_number`, `invoice_amount`, etc.) — schemas are detected and handled dynamically at runtime.
> - **No hardcoded matching keys or rules** — logic is compiled from natural language into dynamic AST expressions and parameterized configs.
> - **No hardcoded pipeline templates in source code** — all pipelines exist purely as dynamic, versioned DAG configurations.
> 
> The codebase is an open-ended, general-purpose finance agent operating system.

---

## 2. The Problem We Solve

Finance teams today spend the majority of their time on manual, repetitive work:

- Copying and re-keying data between invoices, POs, and receipts
- Matching transactions across systems by eye
- Recomputing the same formulas and tolerances every month
- Chasing exceptions and approvals over email
- Rebuilding the same reports and reconciliations every cycle

These processes are slow, hard to scale, and difficult to audit. When a rule changes
— a tolerance, an approval threshold, a matching key — the team has to find every
spreadsheet and every person that uses the old logic.

---

## 3. Who It's For

| Role | What they get |
|------|---------------|
| **Finance operations manager** | Visibility into every running process and every exception |
| **Controller / CFO** | Confidence that processes follow governed, traceable rules |
| **Business analyst** | Ability to define and tune workflows without writing code |
| **Auditor** | A complete, replayable record of what ran and why |

---

## 4. Core Capabilities

### 4.1 Build workflows through a guided conversation
A user opens the chat where Nexus warmly welcomes them. Before diving into the process,
Nexus briefly collects the **business context** so its questions, terminology, and
defaults match the user's world — for example, the user's role (finance ops, controller,
analyst, auditor), company type or industry, and the finance domain they work in
(P2P, O2C, R2R, or FP&A). This is a lightweight, open-ended warm-up, not a rigid form.

Once it has that context, Nexus asks the user to describe their finance process or
problem in plain language. Nexus then asks for the **working input data** — an Excel
file, a CSV, a PDF of records, or similar — so it can understand the actual columns,
structure, and meaning behind the request.

Next, Nexus asks whether the user has any **knowledge documents**: policy PDFs, SOPs,
rulebooks, contracts, examples, or templates. If so, the user uploads them — one or
many (knowledge upload is completely optional).

As soon as the description, working data, and optional knowledge are collected, Nexus
uses its underlying LLM to comprehend the full problem context and **immediately
proposes an initial pipeline solution on the canvas**. This is a starting-point
architecture — the nodes and connections Nexus believes it needs — presented in plain
language before the interview begins. It is *not* final: it gives the user a concrete
draft to react to.

To ensure complete understanding of requirements without guessing, Nexus then leads a
short, adaptive interview of **at least 5 questions**. The interview is where the
initial pipeline is **refined** — nodes are added, removed, or reconfigured as the
answers fill in the details.

Crucially, Nexus **builds in parallel using Progressive Node Reveal**: the initial
pipeline emerges immediately after upload, and every interview answer updates it live
on the canvas. Nodes emerge, connect, and reconfigure *at the same time* as the
conversation proceeds, rather than waiting until the end. Within 5 to 8 questions,
Nexus usually has the complete architecture, summarizes the refined pipeline in simple
terms, and asks for confirmation.

> "Match vendor invoices against purchase orders, flag any amount over 2% variance,
> and send me an exception report."

Nexus turns that into a working pipeline — no coding, no schema setup.

### 4.2 A library of specialist agents
Each agent is an expert at one stage of a finance process:

- **Ingestion** — reads files (working data and knowledge documents)
- **Matching** — relates records across sources (structural and semantic)
- **Rules & Math** — applies exact calculations, proven formula libraries, and policy gates
- **Decision** — LLM reasoning: classifies anomalies, interprets policy, approves or flags
- **Output** — produces formatted Excel workbooks, visual PDF briefings, and team alerts

**Use only the agents needed — and repeat agents when complex:**
- Nexus **uses only the agents the process needs**. If three agents are enough, it
  builds three; it never forces unused agents into a pipeline.
- Conversely, **nodes can be used multiple times**. When a process is complex, Nexus
  repeats and chains agents of the same type (e.g., 3 Ingestion nodes ➔ 2 Chained Matcher
  nodes ➔ 2 Math nodes ➔ 2 Output nodes).

**Universal A2A Contracts (Flawless Agent Handoff):**
Every agent receives and returns data conforming to the universal **A2A Envelope contract**.
Ingestion outputs universal typed tables; Matcher outputs unified relational records;
Math outputs money-safe calculated tables; Decision outputs enriched records with plain-English
rationales. Data flows seamlessly from one agent to the next without custom glue or format mismatches.

**One agent, multiple modes:**
Each agent follows the same pattern: **one agent, multiple modes**. A mode is a
behavior, not a separate agent — Nexus picks the right mode based on the use case.

This has a direct benefit for the config panel: **complexity is split across modes**.
When an agent is complex, its modes break that complexity into simple, focused
configs. The user only sees the fields for the active mode, so every panel stays
short and clear — even for the most capable agent. Nexus chooses the mode; the user
can change it and the panel adapts instantly.

### 4.2.1 Ingestion Agent

The Ingestion agent is the **starting point** of every pipeline. It is the only
agent that touches the outside world — everything else works on what it produces.

#### 4.2.1.1 Capabilities & Behavior

The Ingestion agent is **one agent with two modes**, chosen automatically by Nexus
based on what the user uploads:

**Data mode** — reads the user's *working files* that contain actual records:
invoices, purchase orders, bank statements, transactions.

**Knowledge mode** — reads *knowledge documents* that contain the rules and
expectations behind the process: policy files, SOPs, rulebooks, contracts, examples,
and templates.

**LLM-driven parsing:** Because every use case brings different Excel and PDF
layouts — different column names, merged cells, headers, and structures — Nexus uses
an **LLM (GPT) as its primary engine** for reading and understanding files. Rather
than relying on rigid, template-based extraction that breaks when a format changes,
Nexus lets the LLM interpret each file's actual structure, detect meaning from
context, and handle layout variation naturally. This makes ingestion robust across
any format the user brings, with better and more consistent output.

Both modes support the **same three formats**: `.xlsx`, `.csv`, and `.pdf`. Nexus
decides which mode a file belongs to by **what the file contains, not by its
extension** — so a policy written in an Excel workbook is handled perfectly well as
knowledge, just like a policy PDF would be. The upload step already asks the user to
separate "working data" from "knowledge documents," which gives Nexus the signal it
needs; the format itself never limits where the file can go.

**Explicit DAG Canvas Nodes for Knowledge:** Both modes appear on the visual canvas
as distinct, labeled nodes (`[Ingest: Data]` and `[Ingest: Knowledge]`). Nexus draws
explicit, visible connection edges from Knowledge nodes into the downstream Matcher,
Math, or Decision nodes that consume those rules. This creates a clean, transparent
**tree-shaped DAG**: one or more data inputs and one or more knowledge inputs feed
into the downstream stages.

**Supported formats:** `.xlsx`, `.csv`, `.pdf`

**What data mode outputs:**
Data mode turns every file into **structured tables with column headers and detected
data types** — for example, recognizing that a column is a date, a number, or text.

Critically, this output is built to be **universal and consumable by any other
agent**. Whether the next step is Matching, Rules & Math, or Judgment, it receives
the same clean, typed table — no re-extraction, no custom glue. This is the shared
contract that lets Nexus connect any ingestion node to any downstream agent.

**What knowledge mode outputs:**
Knowledge mode reads a policy or SOP and extracts **structured rules and facts** —
thresholds, constraints, entities, formulas, and expected outcomes. These become
the inputs that guide how downstream agents match, calculate, and judge.

**How Nexus handles long knowledge documents:**
A policy PDF may be 30 pages or more. Nexus does not push the whole document into
every downstream step. Instead, it follows a four-part approach:

1. **Read everything** — Nexus ingests the entire document, so no rule is missed.
2. **Break it into logical parts** — by section, heading, or topic, so it understands
   where each rule lives.
3. **Extract structured knowledge** — the thresholds, rules, formulas, constraints,
   and entities that actually drive decisions, in a compact form.
4. **Keep the full original as a traceable reference** — the document stays linked
   to the pipeline, so nothing is ever lost.

Downstream agents use the **structured knowledge** for routine decisions. When they
need more detail, they **retrieve the specific passage** from the original — rather
than re-reading the whole document. This gives Nexus full understanding up front
without slowing down every step of the process.

#### 4.2.1.2 Configuration Panel

The Ingestion config panel is designed to be **easy to understand, not complex**. It
shows only what matters for the current use case, with advanced detail tucked away.

- **Mode** — a read-only label showing whether this node is handling *Data* or
  *Knowledge*. Nexus decides this; the user just sees it.
- **File & parsing** — the file name, sheet (for Excel), and header-row detection.
  These are the familiar, everyday controls.
- **Detected schema & Overrides** — the columns and data types Nexus found, shown as an
  **optional, expandable** section. The user can manually rename a column or correct a
  data type (e.g., cast string to Date/Currency). When a column name or type is changed,
  Nexus **automatically propagates the updated schema** to all downstream connected
  Matcher and Math nodes, keeping mappings and formulas completely in sync.
- **LLM settings** — model and temperature, editable when the user wants finer
  control over how files are read.

The panel adapts to the use case: sections appear only when they're relevant. The
goal is always clarity — a user should be able to glance at it and understand what
the node is doing without reading documentation. The LLM works behind the scenes
wherever it's needed, but the user never has to manage it unless they choose to.

### 4.2.2 Matching Agent

The Matching agent is the **mid-pipeline** agent that answers one question: *"Are
these records the same thing?"* It takes the structured tables produced by one or
more Ingestion nodes and aligns them into a single, connected view.

#### 4.2.2.1 Capabilities & Behavior

The Matching agent is **one agent with modes**, chosen automatically by Nexus based
on how many sources there are and how clean the data is:

**Dedupe mode** — one source, find duplicates and near-duplicates within it:

- Supports both deterministic exact duplicates and semantic fuzzy duplicates (e.g.,
  "Acme Corp" vs. "Acme LLC" within the same vendor master or ledger).
- **Dual Output Stream:** Emits (1) a clean, deduplicated master table, and (2) an
  audit log of duplicate clusters and near-misses with confidence scores and merge
  suggestions for review.

**Structural mode** — two or more well-structured sources, deterministic matching:

- **Exact key match** — align on a single unique identifier (invoice number, line ID)
- **Composite key match** — align on several columns together (vendor + date + amount)
- **Temporal / windowed match** — join events within a time window (date +/– 2 days)
- **Multi-way join** — cross-reference many sources into one consolidated record

**Semantic mode** — two or more messy, real-world sources, powered by the LLM:

- **Entity normalization** — "IBM Corp" and "International Business Machines" are the
  same vendor
- **Fuzzy field match** — near-miss values, typos, formatting differences
- **Date drift** — a date off by a day or a timezone is still the same event

The modes are the **same job on a spectrum** — from dedupe (one source) to exact
join to fuzzy join. Nexus decides which mode (or blend) to apply based on the data
and the knowledge it has.

The Matcher can also express the **relationship shapes** that more complex finance
processes need. Importantly, these are *capabilities*, not settings the user has to
manage:

- **Directional matching** — distinguishes *who owes whom*. "Entity A → Entity B,
  receivable" is not the same as "Entity B → Entity A, payable." Used for
  intercompany and counterparty flows.
- **Split matching** — one record can relate to *parts* of several records. A $1,000
  receipt may cover two invoices of $400 and $600.
- **Allocation (M:N) matching** — the general case of splits: several payments to
  several invoices as one allocation matrix. Used for cash application.
- **Residual output** — after a partial match, the leftover ($200 short-pay) is
  emitted explicitly so downstream nodes don't recompute it.
- **Reversal matching** — a *negative* relationship that cancels a prior match (a
  returned payment or reversal).
- **Keyless & identity matching** — matches with no shared key, using evidence like
  name, address, and tax ID.
- **Distinct-entity guard** — keeps similar-but-different records apart ("Acme LLC"
  vs "Acme Inc") with an explicit `distinct` verdict and evidence.

**Single Node vs. Chained Matchers:**
- If the matching requirement involves straightforward composite keys, single-stage
  tolerances, or basic semantic normalization, Nexus configures it cleanly **inside a
  single Matcher node**.
- Nexus **chains Matcher nodes on the canvas only when dealing with complex multi-stage
  flows** — such as Directional Alignment feeding into an M:N Allocation Matrix, followed
  by Reversal Matching. This keeps simple pipelines lightweight while keeping complex
  multi-step logic clear and visual.

**Currency scope:** in v1, matching assumes a single currency. Currency conversion is
out of scope for the Matcher — if multi-currency arrives later, conversion will be
handled by a Math/Rule node *before* matching, so the Matcher always compares like
with like.

**How it works:**

1. **Receive** — the Matcher takes the clean, typed tables from one or more data
   ingestion nodes. For a 3-way match, three ingestion nodes feed one Matcher.
2. **Receive knowledge** — matching rules (e.g., "match on invoice_no + line_id")
   are passed in from the knowledge ingestion nodes. Tolerances (e.g., "2% variance
   is acceptable") are *not* applied here — the Matcher only finds and scores
   candidates; the Decision node approves or flags them.
3. **Align** — the Matcher relates records using Dedupe, Structural, or Semantic
   mode, depending on the source count and data quality.
4. **Score** — each match gets a **confidence score** (exact = high, fuzzy = lower).
5. **Emit a unified record** — every matched group becomes one record that carries:
   the source records, the match status, the confidence score, and the matched keys
   and values. Downstream nodes can consume this directly.

**Multi-Output Canvas Handles & Routing:**
On the visual canvas, each Matcher node provides **multi-output handles** so users and
Nexus can intuitively connect specific streams directly to downstream nodes:
- **`Matched` port** — cleanly matched groups (flows to Rules/Math, Decision, or Output).
- **`Residuals` port** — leftover amounts/unapplied cash (flows to Math for netting or settlement).
- **`Exceptions / Unmatched` port** — breaks, near-matches below threshold, or missing pairs (flows to Decision for classification or Output for exception reporting).

Every result emitted is a **unified record** with:
- **Grouped source records** — the original rows that were related
- **Match status** — `matched`, `near-match`, `unmatched`, or `distinct`
- **Confidence score** — how certain the match is (exact = high, fuzzy = lower)
- **Matched keys & values** — the columns and values that drove the match
- **Direction** — when relevant, who owes whom (e.g., `A → B`, receivable vs. payable)
- **Allocation detail** — for split or M:N matches, how records map to parts of each other
- **Residual** — the leftover after a partial match (e.g., `$200 short-pay`)
- **Relationship type** — normal, reversal/cancellation, or distinct-entity
- **Evidence trail** — fields compared, similarity scores, and thresholds applied
- **Variance details** — raw differences (e.g., amount differs by $0.02) passed forward

#### 4.2.2.2 Configuration Panel

The Matching config panel is built around the question *"how should records relate?"*
It shows plain, business-friendly controls — no code required.

The panel follows a strict **"simple first" rule**: it shows only the fields that
matter for the mode Nexus has selected. Complex options are hidden behind the mode
switch, so the user never faces a wall of settings.

- **Mode** — *Dedupe*, *Structural*, or *Semantic*. Nexus pre-selects the best mode,
  and the user can change it if needed. Changing the mode automatically adapts the fields.
- **Match keys** — the columns used to align records (e.g., "Invoice No", "Line ID").
  Add, remove, or change keys. Shown for Structural and Semantic modes; hidden in Dedupe.
- **Confidence threshold** — a simple slider: how certain a match must be to be
  accepted automatically vs. sent for review. Shown only in Semantic mode.
- **Output & Exception routing** — visual indicators and dropdowns for where `Matched`,
  `Residuals`, and `Exceptions` are routed on the canvas.
- **Advanced (collapsed by default)** — LLM settings (model, temperature) tucked away.

The panel updates live from the interview: when Nexus asks a matching question (for
example, *"which columns should be used to match?"*), the user's answer fills in the
**Match keys** section automatically. The user can still open the panel later and
adjust anything — and the change syncs back to the conversation.

**Example — Invoice 3-Way Match:**

> Three files arrive: a purchase order, a goods receipt, and a vendor invoice.
> Nexus builds one Matcher node with three data inputs.
>
> - **Structural mode** aligns line items on PO number + line ID (exact).
> - **Semantic mode** catches the vendor name spelled differently across the three
>   documents and treats them as one vendor.
> - An amount off by $0.02 is a **near-match** with high confidence (the raw $0.02
>   variance is passed forward); a $50 gap becomes **unmatched**.
>
> The Matcher emits unified records: 412 matched, 6 near-match, 3 unmatched. The
> near-matches and unmatched flow to the Decision node, which applies the 2%
> tolerance and approves or flags each one.

**Example — Intercompany Reconciliation (stress test):**

> Twelve subsidiaries each export their intercompany ledger. The goal is to match
> what A recorded as "receivable from B" against what B recorded as "payable to A,"
> and surface the breaks.
>
> - **Directional matching** aligns A → B receivables against B → A payables,
>   keeping opposite flows distinct.
> - **Temporal windowing** catches in-transit entries (A recorded Jan 31, B recorded
>   Feb 3).
> - **Semantic mode** normalizes "Nexus GmbH" vs "Nexus Germany" as the same entity.
> - **Chained Matcher nodes** handle A ↔ B ↔ C chains without overloading one node.
>
> The Matcher emits unified, directional records. The Decision node then handles
> netting and approves in-transit breaks while flagging true mismatches. (Currency
> conversion is out of scope in v1 — single currency assumed.)

**Example — Cash Application (Order-to-Cash):**

> A $10,000 remittance arrives to be applied to two open invoices. The actual
> payment is $9,800, one invoice was already partially paid, and a $150 credit memo
> exists.
>
> - **Allocation (M:N) matching** relates the payment batch to the invoice batch as
>   a single matrix.
> - **Residual output** emits the `$200 short-pay` explicitly, plus the `$150 credit`
>   available to net.
> - **Reversal matching** cancels a returned prior payment so it can be re-applied.
>
> The Matcher outputs a complete allocation with matched amounts, residuals, and
> credits. The Decision node then approves how the short-pay and credit are settled.

**Example — Cross-System Master Data Consolidation:**

> Two ERPs hold vendor records with no shared key. ERP A has "V-1001, IBM Corp."
> ERP B has "ABC-556, International Business Machines." Separately, "Acme LLC" and
> "Acme Inc" exist and look similar but are genuinely different vendors.
>
> - **Keyless & identity matching** matches IBM Corp to International Business
>   Machines using name, address, and tax ID evidence.
> - **Distinct-entity guard** keeps Acme LLC and Acme Inc separate, with an explicit
>   `distinct` verdict and the evidence for why they were not merged.
> - **Evidence trail** records exactly which fields and similarity scores drove each
>   decision, for auditability.
>
> The Matcher emits a reconciled vendor map: true matches merged, lookalikes kept
> distinct, each with a full evidence trail.

### 4.2.3 Rules & Math Engine

The Rules & Math Engine is where **exact numbers are computed and deterministic
decisions are made**. Finance depends on this agent being precise: a variance
percentage, a tolerance gate, a dedup rule, an approval threshold. It does the
arithmetic and the black-and-white policy logic that must never be fuzzy.

#### 4.2.3.1 Capabilities & Behavior

The Rules & Math Engine is **one agent with three modes**, chosen by Nexus based on
what the process needs:

**Calculation mode** — exact arithmetic and formula evaluation:

- Sums, variances, percentages, ratios, weighted averages
- Precision control (2 decimals, 4 decimals, integer rounding)
- Multi-step calculations

Calculation mode supports four **shapes**, covering every finance pattern:

- **Per-row** — compute a value for each record (variance = actual − budget)
- **Aggregate** — group and roll up (sum by department, then by entity). Supports
  both **Summary Table** (one row per group, ideal for management roll-ups) and
  **Window / Appended Column** (keeps row-level detail while attaching group totals,
  ideal for % of total calculations), selectable via a clean toggle.
- **Sequential / cross-row** — running balances and cumulative totals (one row
  depends on the previous)
- **Scalar** — a single value from a whole dataset (grand total, company average)

**Rule / Gate mode** — deterministic policy logic:

- If/else conditions and thresholds
- **Nested AND/OR with clear precedence** — e.g., "flag if (amount > $10,000 AND
  category = 'travel') OR (amount > $50,000)"
- Approval routing ("if variance > 2%, flag for review")
- Deduplication and filtering

**Hybrid mode** — calculate *then* decide in one pass:

- Compute a value, then apply a gate to that value
- Example: calculate variance %, then approve/flag based on the result

**Exact money arithmetic (a guarantee):**

Finance math must never drift. The engine uses **exact decimal arithmetic** — not
floating point — so `$0.10 + $0.20` always equals exactly `$0.30`. Rounding is a
configurable rule (round half up, down, or to nearest), applied consistently.

**Empty and zero values (per-record):**

Division-by-zero and missing values are handled **per record**, not as a whole-node
failure. The user sets a simple rule: "if budget is 0, show '—' and skip the %." Each
record gets a clean result instead of crashing the pipeline. This is separate from
the node-level error strategy, which covers genuine failures.

**How formulas and rules are created:**

Nexus uses an **LLM (GPT)** to understand the interview answers and generate the
exact formula or rule. When the user says "flag anything over 2% variance," the LLM
turns that into the precise logic.

Nexus draws on a **library of common finance logic** first — variance percentage,
tolerance gates, deduplication, rounding. If a formula matches the library, Nexus
uses that proven logic. If not, the LLM writes new logic from the user's plain
English. This gives reliability for common cases and flexibility for the rest.

**How chaining works:**

Each Math node does **one focused calculation or rule**. Complex chains are built by
composing multiple Math nodes in the pipeline — the output of one node feeds the
next. This keeps each node simple, each config panel small, and the canvas easy to
read. A three-step calculation becomes three clear nodes, not one crowded node.

**Example — Budget vs. Actual Variance:**

> A budget file and an actuals file arrive.
>
> - **Math node 1 (Calculation)** — computes variance amount = actual − budget for
>   every account.
> - **Math node 2 (Calculation)** — computes variance % = variance amount ÷ budget.
> - **Math node 3 (Hybrid)** — applies the rule: if variance % > 10%, flag as
>   "material"; otherwise "within threshold."
>
> Each node is simple, and the chain is visible on the canvas. The Decision agent
> then handles the qualitative interpretation of what to do about the material
> variances.

**Example — Bank Reconciliation running balance:**

> A bank statement arrives with deposits and withdrawals. The goal is to compute a
> running balance and flag any row where the computed balance doesn't match the
> statement's stated balance.
>
> - **Math node 1 (Calculation, sequential)** — computes running balance =
>   previous balance + deposit − withdrawal, row by row.
> - **Math node 2 (Calculation, per-row)** — computes the difference between the
>   computed balance and the statement's stated balance.
> - **Math node 3 (Rule)** — flags any row where the difference is not zero.
>
> Division-by-zero doesn't apply here, but if a row has a missing deposit, the
> per-record empty rule shows a clean "—" instead of breaking the chain.

#### 4.2.3.2 Configuration Panel (Dual Mode)

The Rules & Math config panel follows the **simple-first** rule. The user sees plain
English, not code, with the ability to inspect exact logic when desired.

- **Mode** — *Calculation*, *Rule / Gate*, or *Hybrid*. Nexus pre-selects it;
  changing it adapts the panel.
- **Formula / Rule (Plain English)** — the user types what they want in everyday
  language, e.g., "flag anything over 2% variance" or "calculate running balance."
  The LLM generates the exact deterministic logic behind the scenes.
- **Calculation shape & Output Type** — *per-row*, *aggregate* (with Summary Table
  vs. Appended Column toggle), *sequential*, or *scalar*.
- **Inputs** — a simple list of which columns or prior-node outputs this formula uses.
- **Precision & rounding** — a dropdown (2 decimals, 4 decimals, integer) plus the
  rounding rule (half up, half down, nearest). Money-safe exact decimal by default.
- **Empty-value rule** — what to do when a value is missing or zero (e.g., "show '—'
  and skip"). A plain-English field, separate from error strategy.
- **Error strategy** — what to do on genuine failure: fail, return null, return
  default, or skip.
- **Logic & AST Inspector (Dual Mode)** — business users interact via Plain English;
  technical users and auditors can toggle the inspector to verify, test, or directly
  edit the generated Python AST expression.

The panel updates live from the interview: when Nexus asks "what variance threshold
should trigger a flag?", the user's answer fills in the **Rule** field automatically.
The user can open the panel later, change the plain-English wording, and the LLM
regenerates the underlying logic — keeping the user in control without ever asking
them to write code.

### 4.2.4 Decision Agent

The Decision Agent is the **cognitive reasoning engine** of Nexus. Where the Rules &
Math Engine handles black-and-white arithmetic and deterministic logic gates, the
Decision Agent applies LLM intelligence to evaluate context, interpret unstructured
business policies, classify complex anomalies, and render governed finance decisions
with plain-English rationales.

#### 4.2.4.1 Capabilities & Behavior

The Decision Agent is **one agent with three modes**, chosen automatically by Nexus
based on the workflow requirement:

**Anomaly & Risk Classification mode** — contextual pattern analysis:

- Evaluates records to detect unusual transactions, suspicious outliers, and
  unexpected drivers (e.g., unexpected departmental expense spikes, split-transaction
  structuring, vendor billing pattern drift).
- Assigns qualitative risk categories, severity scores, and tags to each record.

**Policy & Contract Interpretation mode** — unstructured rule evaluation:

- Reads policy documents, vendor contracts, SOPs, and compliance manuals (passed in
  from Knowledge Ingestion nodes) and evaluates transactions against nuanced clauses.
- Handles context-dependent rules that cannot be reduced to simple math formulas
  (e.g., *"Does this travel invoice qualify for an overseas per diem exception under
  Section 4.2 of the corporate travel policy?"* or *"Is rush shipping reimbursable
  under the vendor master services agreement?"*).

**Approval & Escalation Gateway mode** — governed decision making:

- Evaluates records from upstream Matcher or Math nodes and renders a formal verdict:
  `Approved`, `Flagged for Review`, or `Escalated to Management`.
- Bridges automated execution with human oversight by deciding which transactions
  can proceed autonomously and which require human attention.

**Execution Authority (Configurable per Node):**
- **Autonomous Mode (Default for high-confidence rules):** The agent automatically
  approves records that exceed a user-configured confidence threshold (e.g., > 85%
  confidence), routing them directly to downstream standard outputs, while diverting
  uncertain or high-risk items to review.
- **Advisory Mode:** The agent analyzes and enriches every record with verdicts,
  scores, and explanations, but routes all items to a human review report or queue
  for final sign-off.

**The "One Node = One Job" & Chaining Rule:**
When a complex process requires multiple stages of reasoning — for example, first
classifying anomalies on expense records, then evaluating contract terms, and finally
routing approvals — Nexus composes multiple Decision nodes in sequence on the canvas.
Each node stays simple, glanceable, and easy to audit.

**Multi-Output Canvas Handles & Routing:**
On the visual canvas, each Decision node provides distinct output handles so users
can route different outcome streams directly to downstream Output or review nodes:
- **`Approved` port** — cleanly approved records flowing to final reports or schedules.
- **`Flagged` port** — records requiring human review or secondary analysis.
- **`Escalated` port** — severe breaches or high-risk items flowing to manager review
  summaries or alert dispatchers.

**What the Decision Agent outputs (the shared contract):**

Every result emitted is a **structured, enriched record** containing:
- **Enriched source data** — all original fields and calculations from upstream nodes
- **Verdict** — `approved`, `flagged`, `escalated`, or specific anomaly tags
- **Confidence score** — numerical certainty (0.0 to 1.0)
- **Plain-English explanation** — a clear, human-readable justification of why the
  decision was made
- **Policy citation** — direct reference to the specific policy document, section,
  or contract clause that justified the verdict
- **Suggested remediation** — recommended action for human reviewers when an item is
  flagged or escalated

**Example — Travel & Expense Policy Exception Analysis:**

> An expense report dataset arrives with attached travel receipts and corporate travel SOP.
>
> - **Decision node (Policy Interpretation mode)** evaluates hotel charges that exceed
>   standard caps. For an employee in Tokyo during peak conference season, the agent
>   identifies that the corporate policy allows a 25% lodging exception for Tier-1 cities
>   during peak events, cites "Travel Policy 2024 Section 4.3.1", and marks the line as
>   `Approved` with full rationale.
> - An unapproved first-class rail ticket is marked as `Flagged for Review` with the
>   explanation: "Exceeds standard business class allowance; missing VP pre-authorization."

**Example — Vendor Invoice Contract Compliance:**

> Invoices from a major logistics provider arrive after 3-way matching.
>
> - **Decision node (Approval Gateway mode)** evaluates fuel surcharges and accessorial
>   fees against the vendor's Master Service Agreement (MSA).
> - Charges matching the contract table are routed through the **`Approved` port** with
>   98% confidence.
> - An unexpected "weekend delivery surcharge" not listed in the MSA is routed to the
>   **`Escalated` port** with citation to "MSA Schedule B (Fee Structure)" for buyer review.

#### 4.2.4.2 Configuration Panel

The Decision config panel is built for clarity and speed:

- **Mode** — *Anomaly & Risk Classification*, *Policy & Contract Interpretation*, or
  *Approval & Escalation Gateway*.
- **Decision Policy (Plain English)** — the user types what they want the LLM to look
  for in plain language (e.g., *"Approve invoices under $5,000 if goods receipt is
  confirmed; flag any rush freight charges exceeding 10% of subtotal"*).
- **Execution Authority** — a simple toggle/dropdown between *Autonomous (Auto-approve
  above confidence threshold)* and *Advisory (Human sign-off required)*.
- **Confidence Threshold Slider** — a slider (default 85%) determining the minimum
  certainty required to auto-approve.
- **Output Routing** — visual controls showing where `Approved`, `Flagged`, and
  `Escalated` streams connect on the canvas.
- **Advanced (collapsed by default)** — LLM reasoning model selection (e.g., GPT-4o,
  Claude 3.5 Sonnet) and temperature (default 0.1 for consistent, deterministic
  evaluations).

### 4.2.5 Smart Custom Output Exporter

The Output Exporter is the **terminal delivery stage** of every pipeline. It takes
the enriched, matched, calculated, and judged datasets from upstream nodes and
transforms them into polished, executive-ready deliverables — formatted multi-tab
Excel workbooks, presentation-ready PDF reports with embedded financial charts, and
real-time team alerts.

In v1, live ERP mutations and database writes are out of scope; the focus is on
producing pristine, human-consumable files and notifying the right stakeholders.

#### 4.2.5.1 Capabilities & Behavior

The Output Exporter is **one agent with three modes**, chosen automatically by Nexus
during the conversational interview:

**Styled Excel Workbook mode** — multi-tab structured workbooks:

- Generates fully formatted `.xlsx` files with clean header styling, auto-fit column
  widths, frozen header panes, and consistent number/currency formatting.
- Embeds native Excel formula rows (sums, averages, variance percentages) and conditional
  formatting (e.g., subtle green fills on matched records, soft red highlights on
  material variances).
- **Multi-Stream Tab Packaging:** A single Excel node can package multiple upstream
  streams into dedicated, labeled tabs (e.g., Tab 1: *Executive Summary*, Tab 2:
  *Matched Transactions*, Tab 3: *Exception & Residual Audit Trail*).

**Visual PDF Report mode (with Financial Graphs)** — executive briefings:

- Generates paginated, publication-ready `.pdf` reports featuring company headers,
  KPI summary cards, formatted data tables, and formal sign-off / audit blocks.
- **Automated Financial Visualizations:** Nexus automatically suggests and generates
  clean charts based on the process data, which the user can toggle on or off:
  - *Match / Status Donut Chart* — visual breakdown of Auto-Matched vs. Flagged vs.
    Unmatched records.
  - *Variance Breakdown Bar Chart* — ranking top variance drivers and budget overages
    by department or account.
  - *Balance & Trend Line Chart* — tracking daily cash flow or running balances over
    time.

**Alert & Notification Dispatcher mode** — real-time stakeholder communication:

- Dispatches immediate notifications to Slack, Microsoft Teams, or Email upon pipeline
  completion or exception breach.
- Formats messages with concise KPI cards (e.g., *"3-Way Match Completed: 412 matched
  ($1.2M), 3 exceptions ($4,200) require review"*) and direct download links to the
  generated Excel/PDF deliverables.

**Single Node vs. Multi-Output Composition:**
- A single Output node easily packages all streams into one consolidated Excel workbook
  or PDF briefing.
- When a workflow requires multiple distinct deliverables — for example, an operational
  Excel workbook for the AP team *plus* an executive PDF briefing for the CFO *plus* an
  urgent Slack alert on exceptions — Nexus places multiple Output nodes on the canvas,
  each connected to its respective stream.

**Curated Professional Themes:**
The Exporter comes with built-in, finance-tailored styling themes (*Executive Classic*,
*Modern Slate*, *Audit Clean*) that ensure professional typography, subtle borders,
and accessible contrast out of the box without requiring manual design work.

**What the Output Exporter outputs (the shared contract):**

Every execution produces:
- **Deliverable file artifact** — `.xlsx` workbook, `.pdf` report, or `.csv` export
  saved directly to the run snapshot for immediate download.
- **Dispatch metadata** — channel status, delivery timestamp, recipient metadata, and
  download URIs.
- **Executive summary payload** — condensed KPI metrics passed to the run audit trail.

**Example — Month-End Bank Reconciliation Package:**

> Bank transactions and ledger entries have been matched, balanced, and verified.
>
> - **Output node 1 (Styled Excel mode)** emits a workbook with three tabs: *Reconciliation
>   Summary*, *Cleared Items*, and *Outstanding Checks & Deposits in Transit*, formatted
>   with exact decimal currency styling and sum formulas.
> - **Output node 2 (Alert Dispatcher mode)** sends a message to the `#finance-close`
>   Slack channel: "May Cash Reconciliation complete — 1,240 items cleared ($4.8M),
>   2 in-transit items flagged. [Download Excel Package]".

**Example — FP&A Budget Variance Executive Briefing:**

> Actuals and budget variance calculations have been completed and classified.
>
> - **Output node (Visual PDF mode)** generates a 3-page executive briefing. Page 1
>   features KPI summary cards and an embedded **Variance Breakdown Bar Chart** showing
>   the top 5 department overages. Pages 2–3 provide detailed account line items with
>   explanatory commentary generated by the Decision Agent.

#### 4.2.5.2 Configuration Panel

The Output config panel follows the **simple-first** rule:

- **Mode** — *Styled Excel Workbook*, *Visual PDF Report*, or *Alert & Notification Dispatcher*.
- **Report Title & File Name** — a plain-English title (e.g., "Q2 Vendor Reconciliation Summary").
- **Included Sections / Tabs** — simple checkboxes for what data streams to include
  (`[✓] Executive Summary`, `[✓] Matched Records`, `[✓] Exception Audit Log`).
- **Visual Graphs & Charts** (in PDF / Excel mode) — checkboxes for Nexus-suggested
  charts (e.g., `[✓] Match Status Donut`, `[✓] Top Variance Bar Chart`).
- **Delivery Destination** — *Local Download*, or dispatch to *Slack*, *Teams*, or *Email*
  with channel/webhook destination fields.
- **Theme & Formatting (Advanced / collapsed)** — preset selection (*Executive Classic*,
  *Modern Slate*, *Audit Clean*), page orientation (Landscape/Portrait for PDF), and
  number/currency formats.

---

### 4.3 A smart question budget
Nexus keeps the interview as short as possible while ensuring it truly understands
the business requirement without guessing:

- It asks a **minimum of 5 questions** to thoroughly ground the request in real context.
- It is **adaptive** — it stops asking the moment it has enough confidence to build
  (typically within 5 to 8 questions).
- It **caps the interview at 12–15 questions** to respect the user's time and avoid
  frustrating interrogation loops.

If Nexus still hasn't fully captured the requirement by question 15 due to excessive
complexity or ambiguity, it doesn't guess. It gracefully hands the conversation —
along with a comprehensive structured summary of everything captured so far — over to
a **Nexus expert** for assisted configuration.

### 4.4 The LLM decides what it knows — nothing is hardcoded
Nexus does not rely on fixed rules or a rigid questionnaire. The **LLM decides, in
real time**, whether it has enough to build each node:

- If the description, data, and agent capabilities are sufficient, it builds.
- If a formula, rule, or business detail is missing, it asks for it.
- If a process is outside what the agents can handle, it recognizes the gap.

Because Nexus is built for any finance process rather than a single pre-programmed
workflow, the platform leverages the LLM extensively across ingestion parsing,
semantic matching, natural-language formula translation, and qualitative policy judgment.

### 4.5 Versioned behavior — tune without fear
Every agent's behavior — its thresholds, matching keys, rules, and prompts — is
stored as a **versioned configuration**. Teams can:

- Create a new version of a rule
- Compare results across versions
- Roll back instantly if a change causes problems

This is the "fine-tuning" layer: **tune the behavior, not the code.**

### 4.6 Edit in the panel, synced to the conversation
When a user wants to change a node's configuration, the config panel opens directly
in the interface. Edits made there are **synced bidirectionally with chat confirmation**:
- A change in the config panel (e.g., changing a Match Key or Variance Threshold)
  instantly triggers a confirmation message in the Copilot chat (e.g., *"Updated
  match key to `po_number` in the Matcher node"*).
- Conversely, a change requested in the chat updates the corresponding fields in the
  config panel and reflects on the canvas immediately. There is one source of truth,
  always in sync.

### 4.7 Full traceability
Every run records what happened at each step:

- Which agent ran
- Which behavior version was used
- What came in, what went out
- How long it took
- Where it succeeded or failed

This gives auditors and managers a complete, replayable story of every decision.

### 4.8 Human-in-the-loop control
Nexus automates the routine work but routes exceptions to the right person. When an
agent can't confidently match a record or a threshold is breached, a human gets a
clear, contextual alert — not a wall of raw data.

---

## 5. How a Process Flows

Every process in Nexus follows the same conversational lifecycle:

1. **Welcome & gather business context** — Nexus welcomes the user in chat and briefly
   collects who they are and where they work (role, company/industry, and finance
   domain) so the rest of the conversation is grounded in their world.
2. **Describe the process** — the user states the finance problem or workflow in plain
   English.
3. **Share working data** — Nexus asks for the input files (Excel, CSV, PDF, etc.) so
   it can understand the columns, structure, and meaning behind the request.
4. **Share knowledge (optional)** — Nexus asks whether the user has any policy PDFs,
   SOPs, rulebooks, contracts, examples, or templates. If yes, the user uploads them
   (one or many).
5. **Propose an initial pipeline** — the moment the description, data, and knowledge are
   in, Nexus presents a **starting-point pipeline on the canvas** in plain language.
   This draft is not final; it gives the user a concrete architecture to react to.
6. **Adaptive Interview** — with the data, knowledge, and initial pipeline in hand,
   Nexus asks focused questions only about what it still doesn't know — formulas,
   rules, thresholds, or business logic. It asks a minimum of 5 questions and never
   more than 12–15.
7. **Build live via Progressive Node Reveal** — the initial pipeline appears immediately
   after upload, and every interview answer refines it live on the canvas. Nodes are
   added, removed, connected, and reconfigured *alongside* asking, not only after all
   questions are answered.
8. **Confirm & Summarize** — once Nexus is confident, it summarizes the complete, refined
   pipeline architecture in simple terms and asks the user to confirm.
9. **Test Run with Working Data** — the user can immediately upload sample Excel data
   or trigger a test run in the studio, previewing intermediate outputs and verifying
   the flow node by node.
10. **Deploy to Super Agent Library** — the confirmed, tested pipeline is published
    and saved to the workspace's Super Agent Library for recurring production runs.
11. **Tune or hand off** — users can open any node's config panel and make adjustments
    (synced with chat confirmations). If requirements were too complex during creation,
    Nexus hands off to a human expert with a complete summary.
12. **Review & Replay** — users and auditors see a complete, step-by-step trace of what
    ran, why each decision was made, and which behavior version was used.

---

## 5.1 Detailed Conversation Journeys

Below are four end-to-end conversation journeys demonstrating how Nexus interacts with
users, asks adaptive questions, progressively reveals nodes on the visual canvas, and
handles testing, tuning, and expert escalation.

### Journey 1: Invoice 3-Way Matching (Procure-to-Pay — Standard Flow)

**Scenario:** An Accounts Payable manager wants to automate matching vendor invoices against purchase orders and goods receipts.

```
[Chat Interaction]
Nexus:  "Welcome to Nexus 2.0! Before we dive in, tell me a little about your role and
         where you work — for example, are you on the AP team at a mid-market
         manufacturer, and which finance domain does this touch?"
User:   "I'm an Accounts Payable manager at a mid-market manufacturer, working in P2P."
Nexus:  "Great, that helps me frame everything around AP and procurement. What finance
         workflow would you like to build today?"
User:   "I need to match vendor invoices against purchase orders and goods receipts,
         flag any price or quantity variances, and get an exception report."
Nexus:  "Understood! Please upload your working data files (e.g., PO export, Goods
         Receipt log, and Invoices)."
User:   [Uploads: PO_Export.xlsx, Goods_Receipts.csv, Invoices.pdf]
Nexus:  "Files received. I detected 3 data sources with 14 shared column headers. Do
         you have any supporting knowledge documents, such as your AP SOP or procurement policy?"
User:   [Uploads: AP_Procurement_Policy_2024.pdf]
        --> [Canvas Update: Initial pipeline proposed — [Ingest: PO], [Ingest: Receipts],
            [Ingest: Invoices], [Ingest: AP Policy (Knowledge)] ➔ [Matcher] ➔ [Decision]
            ➔ [Output], shown in plain language as a starting draft]

Nexus:  "Here's the pipeline I'm starting with: ingest your three data sources and the AP
         policy, match them, apply an approval decision, and output an exception report.
         I'll refine it as I learn more. First question:"

Nexus:  "Q1/5: Which unique identifiers should be used to align records across all three documents?"
User:   "Match on PO Number and PO Line Item ID."
        --> [Canvas Update: [Matcher Node] emerges in Structural Mode, wired to the 3 Ingestion nodes]

Nexus:  "Q2/5: Vendor names in the invoices sometimes differ slightly from the vendor master
         (e.g., 'Dell Computers' vs. 'Dell Inc'). Should I normalize vendor names?"
User:   "Yes, use fuzzy semantic normalization so slight naming differences don't break the match."
        --> [Canvas Update: [Matcher Node] enables Semantic Entity Normalization]

Nexus:  "Q3/5: What amount or percentage variance between the PO amount and Invoiced amount
         is acceptable without flagging?"
User:   "Allow up to 2% variance or $50, whichever is smaller. Anything higher must be flagged."
        --> [Canvas Update: [Rules & Math Node (Hybrid Mode)] emerges from Matcher 'Matched' port
            with per-row variance logic: MIN(0.02 * po_amount, 50.00)]

Nexus:  "Q4/5: When an invoice has no matching Goods Receipt, how should it be routed?"
User:   "If under $500, auto-approve if the vendor is Tier-1; otherwise, flag for buyer review."
        --> [Canvas Update: [Decision Agent (Approval Gateway)] emerges, connecting to Matcher
            'Exceptions' port and Knowledge node to check vendor tier exception rules]

Nexus:  "Q5/5: How should the final results be delivered and communicated?"
User:   "Generate a multi-tab Excel workbook with Summary, Matched, and Exceptions tabs, and
         send a Slack alert to #ap-exceptions if any invoice exceeds $5,000."
        --> [Canvas Update: [Output Node (Styled Excel)] and [Output Node (Slack Dispatcher)]
            emerge and connect to the Decision and Math nodes]

Nexus:  "Pipeline complete! Here is the summary:
         • 3 Data Ingestors + 1 Knowledge Ingestor
         • Structural + Semantic Matcher on PO Number + Line ID
         • 2% / $50 Tolerance Math Gate
         • Decision Agent for Tier-1 unreceived invoice exceptions
         • Multi-Tab Excel Workbook + Slack Exception Alert
         Please confirm to proceed."
User:   "Confirmed. Let's test it."
        --> [User triggers Studio Test Run with sample files]
        --> [Execution Trace: 412 matched (100% accurate), 6 within tolerance, 2 flagged for review]
        --> [User clicks 'Publish to Super Agent Library' with version 'invoice_3way@v1.0']
```

---

### Journey 2: Bank Reconciliation with Running Balances (Record-to-Report — Chained Math)

**Scenario:** A Treasury analyst wants to reconcile daily bank statement feeds against ERP general ledger entries and verify running cash balances.

```
[Chat Interaction]
Nexus:  "Welcome to Nexus 2.0! To tailor this to your close process, what's your role and
         the domain you work in?"
User:   "I'm a Treasury analyst on the R2R team at a retail company."
Nexus:  "Perfect — I'll keep everything aligned to record-to-report and the close. Describe
         the finance process you want to automate."
User:   "Daily bank reconciliation. Match bank statement transactions to our general ledger,
         calculate running balances, and flag any discrepancies or stale uncleared items."
Nexus:  "Please upload your bank statement file and general ledger export."
User:   [Uploads: Bank_Statement_May.csv, GL_Cash_Export.xlsx]
Nexus:  "Files received. Any Treasury policy or bank reconciliation guidelines to attach?"
User:   [Uploads: Treasury_Recon_SOP.pdf]
        --> [Canvas Update: Initial pipeline proposed — [Ingest: Bank Data], [Ingest: GL Data],
            [Ingest: Treasury SOP (Knowledge)] ➔ [Matcher] ➔ [Math] ➔ [Output], shown as a
            starting draft]

Nexus:  "Starting point: ingest the bank and GL files plus your Treasury SOP, match the
         records, run the balance math, and produce a reconciliation output. I'll tune this
         as we go. First question:"

Nexus:  "Q1/5: How should bank statement records match against general ledger entries?"
User:   "Match on Amount and Reference Number. The date can drift by up to +/- 2 business days."
        --> [Canvas Update: [Matcher Node] emerges with Structural Mode + Temporal Window (+/- 2 days)]

Nexus:  "Q2/5: Single bank deposits sometimes cover multiple customer payments. How should
         these be handled?"
User:   "Use split/allocation matching to group payments to single deposits, and emit any
         residual unapplied cash separately."
        --> [Canvas Update: [Matcher Node] configures Allocation (M:N) with active 'Residuals' port]

Nexus:  "Q3/5: How should the running balance check be calculated?"
User:   "Sequential calculation: previous balance + deposit - withdrawal row-by-row. Flag any
         row where computed balance differs from stated statement balance."
        --> [Canvas Update: [Math Node 1 (Sequential Calc)] chained into [Math Node 2 (Per-Row Rule)]]

Nexus:  "Q4/5: What is the rule for uncleared checks and stale deposits in transit?"
User:   "Flag any uncleared check older than 30 days as high risk and cite the Treasury SOP."
        --> [Canvas Update: [Decision Agent (Anomaly Classification)] connects to Treasury SOP Knowledge node]

Nexus:  "Q5/5: What output deliverable do you require?"
User:   "A certified PDF audit report with a Match Status Donut chart and sign-off block."
        --> [Canvas Update: [Output Node (Visual PDF with Donut Chart)] connects downstream]

Nexus:  "Pipeline summarized: Bank & GL Matcher (temporal +/- 2 days) ➔ Chained Running Balance
         Math Nodes ➔ Stale Check Decision Agent ➔ Certified PDF Report. Confirm to test."
User:   "Confirmed."
        --> [User opens Matcher config panel on canvas to change date window from 2 to 3 days]
        --> [Chat Sync: "Noted! Updated date window tolerance to +/- 3 business days in Matcher node."]
        --> [Studio Test Run completes: 1,240 cleared items, 2 stale items flagged with SOP citation]
        --> [Deploys to Super Agent Library as 'daily_bank_recon@v1.0']
```

---

### Journey 3: Intercompany AR/AP Reconciliation (Stress Test — Directional & Multi-Entity)

**Scenario:** A Corporate Controller needs to reconcile intercompany ledger transactions across 12 legal entities with directional netting and transit break detection.

```
[Chat Interaction]
Nexus:  "Welcome to Nexus 2.0! What's your role and the finance domain this involves?"
User:   "I'm a Corporate Controller on the R2R team."
Nexus:  "Thanks — I'll frame this around consolidation and intercompany. What process are we
         automating today?"
User:   "Intercompany AR/AP reconciliation across our 12 subsidiaries. We need to match Entity A's
         receivables against Entity B's payables, detect in-transit breaks, and compute net balances."
Nexus:  "Please upload your subsidiary intercompany ledger exports and your intercompany policy."
User:   [Uploads: 12 Ledger Files (.xlsx) + Intercompany_Governance_Policy.pdf]
        --> [Canvas Update: Initial pipeline proposed — Multi-file Ingestion nodes + Knowledge Node
            ➔ Chained Matchers ➔ Math (Netting) ➔ Decision (Break Gate) ➔ Outputs, shown as a
            starting draft]

Nexus:  "Starting draft: ingest the 12 ledgers and governance policy, run directional matching,
         compute net balances, gate material breaks, and produce your deliverables. I'll refine
         this with a few questions. First:"

Nexus:  "Q1/6: Intercompany flows are directional (Entity A ➔ Entity B receivable vs. Entity B ➔ Entity A
         payable). Should directional matching be enforced?"
User:   "Yes, absolutely. A's receivable from B must only match B's payable to A."
        --> [Canvas Update: [Matcher Node 1] emerges in Directional Matching Mode]

Nexus:  "Q2/6: Entity names vary across local ERPs (e.g. 'Nexus Germany GmbH' vs 'DE-Nexus Corp').
         Should I apply entity normalization?"
User:   "Yes, normalize all 12 entity codes according to the master entity table in the policy."
        --> [Canvas Update: [Matcher Node 1] enables Entity Normalization from Knowledge context]

Nexus:  "Q3/6: Entries near month-end often have timing differences (booked Jan 31 in entity A,
         Feb 3 in entity B). What in-transit window should be allowed?"
User:   "Allow a 5-day in-transit window. Tag them as 'In-Transit Timing Break' instead of hard mismatch."
        --> [Canvas Update: [Matcher Node 1] sets Temporal Window to 5 days]

Nexus:  "Q4/6: When multiple invoices are settled with a single netting payment, how should they relate?"
User:   "Use an M:N allocation matrix node chained after the directional match."
        --> [Canvas Update: [Matcher Node 2 (Allocation Matrix)] chained after Matcher Node 1]

Nexus:  "Q5/6: How should net intercompany balances be computed?"
User:   "Sum total receivables minus payables by entity pair, and highlight any material net break over $1,000."
        --> [Canvas Update: [Math Node (Aggregate Summary Table)] + [Decision Node (Material Break Gate)]]

Nexus:  "Q6/6: What final deliverables are needed?"
User:   "A consolidated multi-tab Excel matrix for treasury and an executive PDF briefing for the Controller."
        --> [Canvas Update: [Output Node 1: Excel Matrix] and [Output Node 2: Executive PDF]]

Nexus:  "Pipeline summarized: 12-Entity Ingestors ➔ Chained Directional & Allocation Matchers
         ➔ Aggregate Netting Math ➔ Break Decision Gate ➔ Dual Excel & PDF Outputs. Confirm to test."
User:   "Confirmed. Run preview test."
        --> [Test Run completes: $18.4M intercompany volume reconciled, $42K in-transit items flagged,
            netting matrix verified; saved to Super Agent Library as 'intercompany_recon@v1.0']
```

---

### Journey 4: Ambiguous Custom Process & Expert Escalation (Edge Case Flow)

**Scenario:** A business analyst wants to automate a non-standard revenue sharing agreement across multiple distributors with missing contract rules and ambiguous tier structures.

```
[Chat Interaction]
Nexus:  "Welcome to Nexus 2.0! Before we start, what's your role and which finance area does
         this fall under?"
User:   "I'm a business analyst in revenue operations, focused on O2C."
Nexus:  "Got it — I'll keep this centered on revenue operations. What workflow are we building
         today?"
User:   "I have distributor sales reports and want to compute custom quarterly rebate shares
         based on tiered performance, volume accelerators, and return deductions."
Nexus:  "Please share your working sales data and distributor contract documents."
User:   [Uploads: Distributor_Sales_Q2.xlsx, Partner_Agreements_Draft.pdf]
        --> [Canvas Update: Initial pipeline proposed — [Ingest: Data] + [Ingest: Knowledge]
            ➔ [Matcher] ➔ [Math] ➔ [Output], shown as a starting draft]

Nexus:  "Here's a starting draft: ingest the sales data and agreements, match them to the
         rebate tiers, run the tiered math, and output the rebate schedule. It may shift as
         we resolve the contract details. First question:"

Nexus:  "Q1/15: Which identifier connects the sales records to the distributor tier schedules?"
User:   "Distributor ID and Product Category."
        --> [Canvas Update: [Matcher Node] emerges]

Nexus:  "Q2/15: Contract Section 3 mentions a 4% base rebate, but Exhibit B lists a 6% rate for
         Q2 promotions. Which rate takes precedence?"
User:   "It depends on whether the distributor met the promotional threshold in April."

Nexus:  "Q3/15: The promotional threshold formula in Exhibit B references 'Net Qualifying Volume',
         but Distributor_Sales_Q2.xlsx only has 'Gross Sales' and 'Returns'. How should Net Qualifying
         Volume be calculated?"
User:   "I think we subtract returns, but some products have non-refundable warranty fees that might be excluded."

Nexus:  "Q4/15: Are warranty fee exclusions itemized by SKU, or applies globally?"
User:   "It varies by distributor tier, but it's not written down clearly in the draft contract."

... [Nexus continues focused probing through Questions 5 to 12 on edge conditions, dispute allowances,
     and split-tier thresholds, progressively mapping whatever logic is clear onto the canvas] ...

Nexus:  "Q13/15: We have reached Question 13. While basic matching and standard 4% rebates are
         defined, the promotional tier precedence and warranty fee deductions remain ambiguous
         and contradictory across the uploaded agreements.
         
         To protect your financial accuracy, I will not guess. Would you like me to package our
         progress and hand off to a Nexus Finance Specialist?"
User:   "Yes, please hand off to an expert."

Nexus:  "🤝 Graceful Escalation Initiated!
         • Structured Summary Generated: Captured variables, SKU groupings, and validated 4% base rules.
         • Scaffolding Saved: Canvas draft saved as 'Distributor_Rebate_Draft_v0.1'.
         • Ticket Dispatched: Assigned to Nexus Solutions Specialist with full chat transcript and file links.
         You will receive an email notification when your specialist completes the configuration review."
```

---

## 6. Coverage by Finance Domain

Nexus is designed to solve the majority of routine finance operations work across the
three core finance domains — **Procure-to-Pay (P2P)**, **Order-to-Cash (O2C)**, and
**Record-to-Report (R2R)**. The examples below are representative, not exhaustive:
because nothing is hardcoded, the same agent library composes into any process within
these domains.

### 6.1 Procure-to-Pay (P2P)

**Goal:** from vendor onboarding through invoice approval to payment, ensure every
purchase is legitimate, correctly priced, and properly authorized.

| Workflow | What Nexus does |
|----------|-----------------|
| **Vendor master consolidation** | Dedupe and merge vendor records across ERPs, keeping lookalikes distinct with an evidence trail. |
| **Invoice 3-way match** | Ingest PO, goods receipt, and vendor invoice; match line items; apply tolerance rules; route breaches to approvers. |
| **Duplicate invoice detection** | Dedupe incoming invoices against historical payments to stop double-payment. |
| **Contract & rate compliance** | Read the vendor MSA and check invoiced rates, fuel surcharges, and accessorials against it. |
| **PO-backed vs. non-PO spend** | Split invoices into PO-backed and non-PO streams, applying different approval paths to each. |
| **Payment proposal & exception report** | Emit an approved-for-payment list plus an exception report with plain-English reasons. |

**Reference flow:** Invoice 3-Way Matching (Journey 1) — 3 data ingestors + 1 knowledge
ingestor → Structural + Semantic Matcher → 2%/$50 tolerance Math gate → Decision gateway
→ multi-tab Excel + Slack alert.

### 6.2 Order-to-Cash (O2C)

**Goal:** from order and billing through cash application and collections, ensure revenue
is billed, collected, applied, and recognized correctly.

| Workflow | What Nexus does |
|----------|-----------------|
| **Cash application (M:N allocation)** | Match a payment batch to open invoices as an allocation matrix, emit residuals and short-pays. |
| **Deductions & credit memos** | Classify customer deductions (promo, shortage, pricing) and net credits against open balances. |
| **Collections & aging** | Age receivables, prioritize accounts, and generate dunning/collection worklists with reasons. |
| **Unapplied cash & reversal handling** | Identify unapplied payments and cancel/re-apply returned payments and reversals. |
| **Revenue recognition checks** | Validate that billing and delivery evidence align before revenue is recognized. |
| **Billing accuracy & exception reporting** | Reconcile orders to invoices and flag under/over-billing for review. |

**Reference flow:** Cash Application (Order-to-Cash) — M:N allocation matcher → residual
output → reversal matching → Decision node approving how short-pays and credits settle.

### 6.3 Record-to-Report (R2R)

**Goal:** from ledger close through reconciliation and consolidation, ensure the books
tie out, breaks are explained, and reporting is accurate and auditable.

| Workflow | What Nexus does |
|----------|-----------------|
| **Bank reconciliation** | Match bank transactions to GL entries, compute running balances, and flag discrepancies. |
| **GL account reconciliation** | Match sub-ledger detail to GL control accounts and surface unexplained breaks. |
| **Intercompany reconciliation** | Directionally match AR/AP across entities, detect in-transit timing breaks, and compute net balances. |
| **Close management & checklist** | Drive close tasks, flag overdue items, and produce a close status summary. |
| **Journal entry validation** | Check entries against policy thresholds and route out-of-policy entries for approval. |
| **Consolidation & elimination checks** | Verify intercompany eliminations and roll up entity balances for consolidated reporting. |
| **Budget vs. actual variance** | Compute variances by account/department and explain top drivers. |
| **Financial close reporting** | Produce sign-off-ready reconciliation summaries and executive close briefings. |

**Reference flow:** Bank Reconciliation (Journey 2) — bank & GL matcher (temporal ±2
days) → chained running-balance Math nodes → stale-check Decision → certified PDF report.

---

## 7. Key Business Benefits

- **Speed** — processes that took days run in minutes
- **Accuracy** — deterministic rules eliminate manual arithmetic errors
- **Consistency** — every run uses the same governed logic
- **Auditability** — complete, replayable records of every step
- **Scalability** — the same agent library powers unlimited use cases
- **Control** — humans approve exceptions and tune behavior, not code

---

## 8. What Makes Nexus Different

1. **A conversation, not a form.** Nexus interviews the user dynamically, asking only
   what it needs — then builds the pipeline live as it learns.
2. **The LLM decides.** Nothing is hardcoded. Nexus judges in real time whether it has
   enough to build, what to ask next, and when to stop or hand off.
3. **Agents, not scripts.** Each step is a specialized expert, not a brittle macro —
   and Nexus uses only the agents the process actually needs.
4. **Behavior is versioned.** Tuning rules is safe, reversible, and traceable.
5. **One source of truth.** Canvas edits and chat stay in sync bidirectionally.
6. **Graceful escalation.** When requirements stay unclear, Nexus hands off to a
   human expert with a full summary instead of guessing.
7. **Traceability built in.** Every decision is captured and replayable.

---

## 9. Target Use-Case Areas

Nexus targets the majority of routine finance operations work across the three core
finance domains. These are the primary areas where the universal engine is designed to
deliver out of the box, with FP&A as a supporting area on top of the same agents.

- **Procure-to-Pay (P2P)** — vendor master consolidation, invoice 3-way match, duplicate
  detection, contract compliance, PO/non-PO routing, payment proposals
- **Order-to-Cash (O2C)** — cash application, deductions & credit memos, collections,
  aging, unapplied cash & reversals, billing accuracy, revenue recognition checks
- **Record-to-Report (R2R)** — bank & GL reconciliation, intercompany reconciliation,
  close management, journal validation, consolidation & elimination, budget vs. actual
- **FP&A** — variance analysis, forecasting, management reporting (supporting area)

---

## 10. Product Status & Vision

**Current:** Nexus 2.0 has a working platform shell with an agent library, a visual
workflow builder (the Architect Studio), a copilot chat panel, and a super-agent
gallery.

**Next:** bring the conversational builder to life — Nexus interviews the user,
learns from their data, builds the pipeline live on the canvas, and syncs every edit
between chat and the config panel.

**Vision:** become the operating system for finance operations — where any user
describes a process, answers a few questions, and gets a governed, explainable,
tunable agent pipeline running in minutes.

---

## 11. Scope & Limitations

Nexus 2.0 as described in this document is a **full product**. It is built to run
governed finance operations across most finance use cases, with a clean conversational
build flow and live canvas. The following are explicitly out of scope for the current
release:

- **Authentication & authorization** — no login, user roles, or per-user permissions.
- **Database persistence** — runs are held in memory and written to JSON snapshots; there
  is no durable database, message broker, or distributed worker layer.
- **LLM failure modes & guardrails** — no specified handling for hallucinated matching
  keys, incorrect formula generation, or LLM unavailability. Confidence scoring exists
  for Matching only, not for Ingestion parsing or formula translation.
- **Multi-currency** — out of scope; the single-currency assumption holds throughout.
- **Super Agent Library** — referenced in the flow but not specified as a deliverable;
  treated as a future/deferred feature.
- **Non-functional requirements** — no performance, concurrency, scalability, security,
  or SLA targets are defined.
- **File storage & retention** — no lifecycle or retention policy for uploaded
  Excel/CSV/PDF inputs.
- **Live ERP mutations / database writes** — out of scope in v1; output is limited to
  human-consumable files and notifications.
- **Model training / weight fine-tuning** — out of scope; "fine-tuning" means versioned
  behavior configuration only, never LLM weight training.
