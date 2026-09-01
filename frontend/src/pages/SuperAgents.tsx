import TopNav from '../components/TopNav'
import Icon from '../components/Icon'
import StatusPill from '../components/StatusPill'
import { useAgents } from '../context/AgentContext'
import type { SuperAgent } from '../data/superAgents'

const categories = [
  { icon: 'grid_view', label: 'All Agents' },
  { icon: 'payments', label: 'Financials' },
  { icon: 'settings_applications', label: 'Operations' },
  { icon: 'verified_user', label: 'Compliance' },
  { icon: 'archive', label: 'Archived' },
]

export default function SuperAgents() {
  const { superAgents } = useAgents()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopNav />
      <div className="relative flex flex-1 overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute right-[-10%] top-[-20%] h-1/2 w-1/2 rounded-full bg-primary-container/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] h-2/5 w-2/5 rounded-full bg-tertiary-fixed/5 blur-[100px]" />
        </div>

        <aside className="flex h-full w-64 flex-col border-r border-outline-variant/10 bg-surface-container-low py-sm">
          <div className="mb-sm border-b border-outline-variant/10 px-sm pb-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant/20 bg-background text-primary">
                <Icon name="widgets" fill />
              </div>
              <div>
                <h2 className="text-[16px] font-headline-md text-primary">Agent Library</h2>
                <p className="text-[12px] font-label-md text-on-surface-variant">
                  Management Console
                </p>
              </div>
            </div>
            <button className="flex h-10 w-full items-center justify-center gap-2 rounded bg-primary-container font-label-md text-label-md text-on-primary-container transition-colors hover:bg-primary-fixed">
              <Icon name="add" className="text-[18px]" />
              Deploy New Agent
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-2" aria-label="Agent categories">
            {categories.map((cat, i) => (
              <a
                key={cat.label}
                href="#"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-all ${
                  i === 0
                    ? 'scale-95 border-r-4 border-primary bg-primary-container/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon name={cat.icon} className="text-[20px]" fill={i === 0} />
                {cat.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto space-y-1 border-t border-outline-variant/10 px-2 pt-4">
            {['Help Center', 'Documentation'].map((label, i) => (
              <a
                key={label}
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-label-md text-on-surface-variant transition-all hover:bg-surface-container-high"
              >
                <Icon name={i === 0 ? 'help' : 'description'} className="text-[18px]" />
                {label}
              </a>
            ))}
          </div>
        </aside>

        <main className="relative z-10 flex-1 overflow-y-auto p-gutter">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="mb-2 font-display-lg text-display-lg text-on-surface">
                Super Agents Library
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Manage and deploy your automated finance agents.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-tertiary-fixed/30 bg-tertiary-fixed/5 px-4 py-2 font-mono-label text-mono-label uppercase tracking-widest text-tertiary-fixed">
              <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary-fixed" />
              All Systems Operational
            </div>
          </div>

          <div className="grid grid-cols-1 gap-md pb-xl md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {superAgents.map((agent) => (
              <AgentTile key={agent.id} agent={agent} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

function AgentTile({ agent }: { agent: SuperAgent }) {
  return (
    <div className="glass-card group relative flex flex-col justify-between overflow-hidden rounded-xl border border-outline-variant/20 p-md hover:border-primary-container/30">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="z-10 mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container transition-colors group-hover:border-primary-container/30">
          <Icon name={agent.icon} className="text-[24px] text-tertiary-fixed" />
        </div>
        <StatusPill status={agent.status} />
      </div>
      <div className="z-10 flex-1">
        <h3 className="text-[18px] font-headline-md text-on-surface transition-colors group-hover:text-primary">
          {agent.name}
        </h3>
        <p className="mb-4 mt-1 font-mono-label text-[10px] uppercase tracking-wider text-on-surface-variant">
          {agent.category}
        </p>
        <p className="line-clamp-3 font-label-md text-[13px] text-on-surface-variant">
          {agent.description}
        </p>
      </div>
      <div className="z-10 mt-6 flex items-center justify-between border-t border-outline-variant/10 pt-4">
        <div className="font-mono-label text-[10px] uppercase text-on-surface-variant">
          {agent.version} • {agent.runs} runs
        </div>
        <button
          className={`rounded border px-4 py-2 text-[12px] font-label-md transition-colors ${
            agent.status === 'draft'
              ? 'border-surface-tint/30 bg-transparent text-surface-tint hover:bg-surface-tint/10'
              : 'border-primary/20 bg-primary-container/10 text-primary hover:bg-primary-container/20'
          }`}
        >
          {agent.status === 'draft' ? 'Test Agent' : 'Launch'}
        </button>
      </div>
    </div>
  )
}
