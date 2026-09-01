import type { Node, Edge } from '@xyflow/react'

export type NodeKind = 'ingestion' | 'llm' | 'math' | 'output'

export interface NodeConfig {
  [key: string]: unknown
  label: string
  kind: NodeKind
  icon: string
  agentName?: string
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  ruleLogic?: string
  precision?: string
  errorStrategy?: string
  variables?: { source: string; target: string }[]
}

export type FlowNode = Node<NodeConfig>

const initialNodes: FlowNode[] = [
  {
    id: 'feed',
    type: 'custom',
    position: { x: 40, y: 40 },
    data: { label: 'Market Feed API', kind: 'ingestion', icon: 'dataset' },
  },
  {
    id: 'history',
    type: 'custom',
    position: { x: 340, y: 40 },
    data: { label: 'Historical DB', kind: 'ingestion', icon: 'storage' },
  },
  {
    id: 'processor',
    type: 'custom',
    position: { x: 190, y: 260 },
    data: {
      label: 'NX-V4 Processor',
      kind: 'llm',
      icon: 'memory',
      agentName: 'Semantic Analyzer Alpha',
      model: 'nexus-v4-turbo',
      temperature: 0.2,
      maxTokens: 4096,
      systemPrompt:
        'Analyze the incoming financial datastream for anomalies in transaction velocity.\nIf velocity > baseline * 1.5, tag as HIGH_RISK and forward to secondary review node.\nOtherwise, format standard output schema.',
    },
  },
  {
    id: 'risk',
    type: 'custom',
    position: { x: 40, y: 500 },
    data: {
      label: 'Risk Matrix',
      kind: 'math',
      icon: 'functions',
      ruleLogic:
        'let score = (input.base_value * 1.5) + (input.multiplier * 10);\n\nif (score > 1000) {\n  return { status: "HIGH_VALUE", calculated_score: score };\n} else if (score < 0) {\n  throw new Error("Score cannot be negative");\n}\n\nreturn { status: "STANDARD", calculated_score: score };',
      precision: '2 Decimal Places',
      errorStrategy: 'Fail on Error',
      variables: [
        { source: 'payload.data.base', target: 'input.base_value' },
        { source: 'payload.meta.mult', target: 'input.multiplier' },
      ],
    },
  },
  {
    id: 'terminal',
    type: 'custom',
    position: { x: 340, y: 500 },
    data: { label: 'Terminal Feed', kind: 'output', icon: 'output' },
  },
]

const initialEdges: Edge[] = [
  { id: 'e-feed-proc', source: 'feed', target: 'processor', animated: true },
  { id: 'e-hist-proc', source: 'history', target: 'processor', animated: true },
  { id: 'e-proc-risk', source: 'processor', target: 'risk', animated: true },
  { id: 'e-proc-term', source: 'processor', target: 'terminal', animated: true },
]

export { initialNodes, initialEdges }
