export interface CoreAgent {
  id: string
  name: string
  icon: string
  description: string
  tagline: string
  modes: string[]
  modeDetails: {
    title: string
    icon: string
    description: string
    highlight?: boolean
  }[]
}

export const agents: CoreAgent[] = [
  {
    id: 'agent-1',
    name: 'Universal Multi-Doc Ingestor',
    icon: 'document_scanner',
    description:
      'Responsible for multi-format file extraction, OCR, and table structuring.',
    tagline: '(MCP Powered)',
    modes: ['Single-Source Ingestion', 'Parallel Multi-Slot Ingestion', 'Batch Directory Ingestion'],
    modeDetails: [
      {
        title: 'Single-Source',
        icon: 'description',
        description: 'Ingests 1 file (PDF, Excel, or CSV) and extracts headers and line-item tables.',
      },
      {
        title: 'Parallel Multi-Slot',
        icon: 'account_tree',
        description:
          'Ingests 2 to 5+ distinct files concurrently (e.g. Slot 1: Invoice.pdf, Slot 2: PO.xlsx), emitting tagged data slots into the A2A envelope.',
        highlight: true,
      },
      {
        title: 'Batch Directory',
        icon: 'folder_copy',
        description: 'Ingests folders of multiple files of the same type and streams them sequentially or in parallel batches.',
      },
    ],
  },
  {
    id: 'agent-2',
    name: 'Dynamic N-Way Matcher',
    icon: 'join_inner',
    description:
      'Responsible for relational joins, record alignment, and multi-source cross-referencing across disparate datasets.',
    tagline: '(Relational & Temporal Alignment)',
    modes: ['Exact Primary Key Join', 'Composite Multi-Key Join', 'Temporal & Windowed Match', 'Multi-Way Converging Join'],
    modeDetails: [
      { title: 'Exact Primary Key Join', icon: 'key', description: 'Aligns records on a single deterministic key across two datasets.' },
      { title: 'Composite Multi-Key Join', icon: 'account_tree', description: 'Matches on several columns to disambiguate near-duplicate records.' },
      { title: 'Temporal & Windowed Match', icon: 'schedule', description: 'Joins events that fall within configured time windows or sequence tolerances.' },
      { title: 'Multi-Way Converging Join', icon: 'join_inner', description: 'Cross-references many sources into a single consolidated record.' },
    ],
  },
  {
    id: 'agent-3',
    name: 'Deterministic Rule & Math Engine',
    icon: 'calculate',
    description:
      'Responsible for exact mathematical calculations, formula evaluation, and logic gating.',
    tagline: '(Exact Python AST Math & Policy Gating)',
    modes: ['Pure Math Calculation', 'Pure Policy & Deduplication Gate', 'Hybrid Math + Tolerance Gate'],
    modeDetails: [
      { title: 'Pure Math Calculation', icon: 'functions', description: 'Evaluates deterministic formulas with exact precision and no external calls.' },
      { title: 'Policy & Deduplication Gate', icon: 'rule', description: 'Applies policy conditions and filters duplicate records before downstream flow.' },
      { title: 'Hybrid Math + Tolerance Gate', icon: 'balance', description: 'Combines computed values with tolerance bands for approval decisions.' },
    ],
  },
  {
    id: 'agent-4',
    name: 'Semantic Policy & Fuzzy Judge',
    icon: 'psychology',
    description:
      'Responsible for fuzzy entity matching, contextual understanding, and qualitative policy interpretation.',
    tagline: '(LLM Cognitive Layer & Fuzzy Matching)',
    modes: ['Fuzzy Entity & Vendor Normalization', 'Contract Clause & Terms Extraction', 'Qualitative Anomaly Classification'],
    modeDetails: [
      { title: 'Fuzzy Entity & Vendor Normalization', icon: 'hub', description: 'Resolves inconsistent vendor names into a canonical entity record.' },
      { title: 'Contract Clause & Terms Extraction', icon: 'find_in_page', description: 'Reads clauses and extracts structured terms from documents.' },
      { title: 'Qualitative Anomaly Classification', icon: 'psychology', description: 'Flags and categorizes unusual records using semantic judgment.' },
    ],
  },
  {
    id: 'agent-5',
    name: 'Smart Custom Output Exporter',
    icon: 'output',
    description:
      'Responsible for generating final user-defined deliverables across multiple formats.',
    tagline: '(User-Defined Excel, Styled PDFs, Webhooks)',
    modes: ['Styled Excel Workbook', 'Certified PDF Audit Report', 'Machine-Readable ERP Export', 'Communication & Alert Dispatcher'],
    modeDetails: [
      { title: 'Styled Excel Workbook', icon: 'table_view', description: 'Emits formatted workbooks with tabs, headers, and conditional styling.' },
      { title: 'Certified PDF Audit Report', icon: 'picture_as_pdf', description: 'Produces a signed, paginated PDF suitable for audit review.' },
      { title: 'Machine-Readable ERP Export', icon: 'data_object', description: 'Writes JSON/CSV payloads for downstream ERP ingestion.' },
      { title: 'Communication & Alert Dispatcher', icon: 'notifications', description: 'Sends Slack, Teams, or email alerts on terminal events.' },
    ],
  },
]
