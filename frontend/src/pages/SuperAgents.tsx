import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import Icon from '../components/Icon'
import { api } from '../lib/api'
import type { LibraryPipeline } from '../types/nexus'

export default function SuperAgents() {
  const navigate = useNavigate()
  const [pipelines, setPipelines] = useState<LibraryPipeline[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listPipelines()
      .then((body) => setPipelines(body.pipelines))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load library'))
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopNav />
      <div className="relative flex flex-1 overflow-hidden pt-16">
        <aside className="flex h-full w-64 flex-col border-r border-outline-variant/10 bg-surface-container-low py-sm">
          <div className="mb-sm border-b border-outline-variant/10 px-sm pb-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant/20 bg-background text-primary">
                <Icon name="widgets" fill />
              </div>
              <div>
                <h2 className="text-[16px] font-headline-md text-primary">Super Agents</h2>
                <p className="text-[12px] font-label-md text-on-surface-variant">Saved pipelines</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/architect/create')}
              className="flex h-10 w-full items-center justify-center gap-2 rounded bg-primary-container font-label-md text-on-primary-container hover:bg-primary-fixed"
            >
              <Icon name="add" className="text-[18px]" />
              New in Architect
            </button>
          </div>
        </aside>

        <main className="relative z-10 flex-1 overflow-y-auto p-gutter">
          <div className="mb-8">
            <h1 className="mb-2 font-display-lg text-display-lg text-on-surface">Super Agents Library</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Confirmed pipelines saved from Architect. Open a card to view or tune the DAG — this list is not a production runner.
            </p>
          </div>
          {error && <p className="mb-4 font-body-md text-red-300">{error}</p>}
          {pipelines.length === 0 && !error && (
            <p className="font-body-md text-on-surface-variant">No saved pipelines yet. Confirm a draft in Architect and press Save.</p>
          )}
          <div className="grid grid-cols-1 gap-md pb-xl md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pipelines.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/architect/create?pipeline=${item.id}`)}
                className="glass-card group flex flex-col rounded-xl border border-outline-variant/20 p-md text-left hover:border-primary-container/30"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container">
                  <Icon name="account_tree" className="text-[24px] text-tertiary-fixed" />
                </div>
                <h3 className="text-[18px] font-headline-md text-on-surface group-hover:text-primary">{item.name}</h3>
                <p className="mt-2 font-mono-label text-[11px] uppercase tracking-wider text-on-surface-variant">
                  {item.version}
                </p>
                <p className="mt-3 font-body-md text-on-surface-variant">{item.nodes} nodes</p>
                <span className="mt-6 font-label-md text-primary-fixed-dim">Open in Architect</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
