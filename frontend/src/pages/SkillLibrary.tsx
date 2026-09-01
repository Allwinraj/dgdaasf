import { useState } from 'react'
import TopNav from '../components/TopNav'
import SideNav from '../components/SideNav'
import Icon from '../components/Icon'
import InspectionModal from '../components/InspectionModal'
import { agents, type CoreAgent } from '../data/agents'

export default function SkillLibrary() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = agents.find((a) => a.id === selectedId) ?? null

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="flex flex-1 pt-16">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-gutter md:p-margin-desktop">
          <div className="mx-auto max-w-6xl">
            <header className="mb-12">
              <h1 className="mb-2 font-display-lg text-display-lg text-on-surface">
                Skill Library
              </h1>
              <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                Deploy specialized AI agents into your orchestration pipelines.
                Each agent is meticulously engineered for a specific stage of the
                data lifecycle.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-6">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onInspect={setSelectedId} />
              ))}
            </div>
          </div>
        </main>
      </div>

      {selected && (
        <InspectionModal agent={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

function AgentCard({
  agent,
  onInspect,
}: {
  agent: CoreAgent
  onInspect: (id: string) => void
}) {
  return (
    <div className="glass-card group flex flex-col justify-between rounded-xl p-6 transition-all duration-300 md:col-span-1 lg:col-span-2">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-surface-container-high text-primary-fixed-dim transition-colors group-hover:bg-primary-container/10">
          <Icon name={agent.icon} className="text-[24px]" />
        </div>
        <h3 className="mb-2 font-headline-md text-headline-md text-on-surface">
          {agent.name}
        </h3>
        <p className="mb-6 line-clamp-2 font-body-md text-body-md text-on-surface-variant">
          {agent.description}
        </p>
      </div>
      <button
        onClick={() => onInspect(agent.id)}
        className="flex w-full items-center justify-center gap-2 rounded border border-white/20 py-2 font-label-md text-label-md text-on-surface transition-colors hover:border-primary-fixed-dim hover:text-primary-fixed-dim"
      >
        <Icon name="search" className="text-[18px]" />
        Inspect
      </button>
    </div>
  )
}
