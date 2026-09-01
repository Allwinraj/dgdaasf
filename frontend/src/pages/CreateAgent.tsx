import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Icon from '../components/Icon'
import NodeConfigPanel from '../components/NodeConfigPanel'
import { useAgents } from '../context/AgentContext'
import { initialNodes, initialEdges, type NodeConfig, type FlowNode } from '../data/flowNodes'

const nodeTypeColors: Record<NodeConfig['kind'], string> = {
  ingestion: 'border-tertiary-fixed-dim/30',
  llm: 'border-tertiary-fixed-dim/50',
  math: 'border-tertiary-fixed-dim/30',
  output: 'border-primary-fixed-dim/30',
}

function FlowNode({ data }: NodeProps<FlowNode>) {
  const config = data as NodeConfig
  const isOutput = config.kind === 'output'
  const isLlm = config.kind === 'llm'
  return (
    <div
      className={`rounded-xl border bg-surface-container-high p-4 transition-colors hover:border-tertiary-fixed-dim ${
        nodeTypeColors[config.kind] ?? 'border-white/10'
      } ${isOutput ? 'node-glow-gold' : 'node-glow'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-tertiary-fixed-dim" />
      <div className={`flex ${isLlm ? 'flex-col gap-3' : 'items-center gap-4'}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface border border-tertiary-fixed-dim/30">
          <Icon
            name={config.icon}
            className={isOutput ? 'text-primary-fixed-dim' : 'text-tertiary-fixed-dim'}
          />
        </div>
        <div>
          <div className="font-label-md text-on-surface">{config.label}</div>
          <div className={`mt-1 font-mono-label ${isOutput ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
            {kindLabel(config.kind)}
          </div>
        </div>
      </div>
      {isLlm && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between font-mono-label">
            <span className="text-on-surface-variant">Tokens/s</span>
            <span className="font-medium text-on-surface">4,520</span>
          </div>
          <div className="flex items-center justify-between font-mono-label">
            <span className="text-on-surface-variant">Latency</span>
            <span className="font-medium text-on-surface">12ms</span>
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-tertiary-fixed-dim" />
    </div>
  )
}

const nodeTypes = { custom: FlowNode }

function kindLabel(kind: NodeConfig['kind']) {
  switch (kind) {
    case 'ingestion':
      return 'Data Ingestion'
    case 'llm':
      return 'LLM Processing'
    case 'math':
      return 'Math Engine'
    case 'output':
      return 'Output Exporter'
  }
}

export default function CreateAgent() {
  const navigate = useNavigate()
  const { createAgent } = useAgents()
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<NodeConfig | null>(null)
  const [agentName, setAgentName] = useState('Market Risk Sentiment Agent')

  const nodeById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n.data])),
    [nodes],
  )

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      const config = nodeById.get(node.id)
      if (config) setSelectedNode(config)
    },
    [nodeById],
  )

  const handleSync = useCallback(
    (updated: NodeConfig) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.data.label === updated.label ? { ...n, data: updated as NodeConfig } : n,
        ),
      )
    },
    [setNodes],
  )

  const handleCreate = useCallback(() => {
    createAgent({
      name: agentName || 'Untitled Agent',
      category: 'Custom',
      description:
        'Pipeline composed in the Nexus 2.0 Architect Studio with data ingestion, LLM processing, math evaluation, and terminal output.',
      version: 'v0.1',
      icon: 'architecture',
    })
    navigate('/agents')
  }, [agentName, createAgent, navigate])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-container-lowest">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-surface/80 px-gutter backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Architect Studio
          </h1>
          <div className="h-4 w-px bg-white/10" />
          <div className="hidden rounded-lg border border-white/5 bg-surface-container-high p-1 md:block">
            <input
              className="bg-transparent px-2 py-1 font-label-md text-label-md text-on-surface outline-none"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              aria-label="Agent name"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="mr-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-container shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
            <span className="font-mono-label text-on-surface-variant">Live Sync</span>
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-label-md text-white transition-colors hover:bg-white/5">
            <Icon name="save" className="text-[18px]" />
            Save Draft
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2 font-label-md text-on-primary-container transition-all hover:brightness-110"
          >
            <Icon name="play_arrow" className="text-[18px]" />
            Create
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <IconRail />
        <CopilotSidebar />

        <div className="relative flex-1 bg-grid-pattern bg-surface">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.06)" />
            <Controls showInteractive={false} className="!border-white/10 !bg-surface-container" />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="flex w-full max-w-md lg:w-96">
            <NodeConfigPanel
              config={selectedNode}
              onChange={handleSync}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function IconRail() {
  const navItems = [
    { icon: 'home', label: 'Home' },
    { icon: 'architecture', label: 'Architect', active: true },
    { icon: 'account_tree', label: 'Workflows' },
    { icon: 'api', label: 'Solutions' },
  ]

  return (
    <nav
      className="z-20 flex w-16 flex-shrink-0 flex-col items-center border-r border-white/5 bg-surface-container py-6 md:w-20 lg:w-24"
      aria-label="Studio"
    >
      <div className="mb-12 font-headline-sm text-headline-sm font-bold tracking-tight text-primary-fixed-dim">
        N2
      </div>
      <div className="flex w-full flex-1 flex-col items-center gap-6">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`group relative flex h-12 w-12 flex-col items-center justify-center rounded-xl transition-all duration-300 ${
              item.active
                ? 'scale-95 bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed-dim'
            }`}
            aria-label={item.label}
          >
            <Icon name={item.icon} fill={item.active} />
            <span className="pointer-events-none absolute left-full z-50 ml-4 whitespace-nowrap rounded border border-white/10 bg-surface-container-highest px-3 py-1 font-mono-label text-on-surface opacity-0 transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-high text-on-surface-variant transition-colors hover:text-white"
          aria-label="Notifications"
        >
          <Icon name="notifications" className="text-[20px]" />
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-high text-on-surface-variant transition-colors hover:text-white"
          aria-label="Settings"
        >
          <Icon name="settings" className="text-[20px]" />
        </button>
        <div className="mt-2 h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-surface-container-highest">
          <span className="flex h-full w-full items-center justify-center font-label-md text-on-surface">
            E
          </span>
        </div>
      </div>
    </nav>
  )
}

function CopilotSidebar() {
  return (
    <aside className="hidden w-80 flex-shrink-0 flex-col border-r border-white/5 bg-surface-container md:flex">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-6">
        <div className="flex items-center gap-2">
          <Icon name="smart_toy" className="text-tertiary-fixed-dim" />
          <h2 className="font-label-md tracking-wider text-on-surface">NEXUS 2.0 CO-PILOT</h2>
        </div>
        <Icon name="more_horiz" className="text-[20px] text-on-surface-variant" />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <ChatBubble ai>
          I've initialized a new agent workspace. What kind of logic pipeline are we
          building today?
        </ChatBubble>
        <ChatBubble>
          Let's set up a pipeline that ingests market data, processes it with an LLM
          for sentiment, and outputs a risk score.
        </ChatBubble>
        <ChatBubble ai>
          Understood. I'll lay out the basic nodes for Data Ingestion, LLM Processing,
          and a Math Engine for the score calculation. Double-click any node to
          configure it.
        </ChatBubble>
      </div>

      <div className="shrink-0 border-t border-white/5 bg-surface-container p-4">
        <div className="relative flex items-center">
          <input
            className="w-full rounded-xl border border-white/10 bg-surface py-3 pl-4 pr-12 font-body-md text-body-md text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:border-primary-fixed-dim focus:ring-1 focus:ring-primary-fixed-dim"
            placeholder="Instruct the nexus pilot..."
            aria-label="Instruct the nexus pilot"
          />
          <button className="absolute right-3 rounded-lg p-1.5 text-primary-fixed-dim transition-colors hover:bg-white/5">
            <Icon name="send" />
          </button>
        </div>
        <div className="mt-2 flex justify-between px-1">
          <span className="font-mono-label text-on-surface-variant/60">Press Enter to send</span>
          <div className="flex gap-2">
            <Icon name="mic" className="cursor-pointer text-[16px] text-on-surface-variant/60 hover:text-white" />
            <Icon name="attach_file" className="cursor-pointer text-[16px] text-on-surface-variant/60 hover:text-white" />
          </div>
        </div>
      </div>
    </aside>
  )
}

function ChatBubble({ children, ai = false }: { children: React.ReactNode; ai?: boolean }) {
  return (
    <div className={`flex gap-3 ${ai ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
          ai ? 'border-white/10 bg-surface-container-highest' : 'border-white/20 bg-surface-variant'
        }`}
      >
        <Icon
          name={ai ? 'auto_awesome' : 'person'}
          className={`text-[16px] ${ai ? 'text-tertiary-fixed-dim' : 'text-on-surface'}`}
        />
      </div>
      <div
        className={`rounded-2xl border p-4 font-body-md text-body-md shadow-sm ${
          ai
            ? 'rounded-tl-sm border-white/5 bg-surface-container-high text-on-surface-variant'
            : 'rounded-tr-sm border-white/10 bg-surface-variant text-on-surface'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
