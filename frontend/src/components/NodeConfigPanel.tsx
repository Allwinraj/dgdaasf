import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import type { NodeConfig } from '../data/flowNodes'

export default function NodeConfigPanel({
  config,
  onChange,
  onClose,
}: {
  config: NodeConfig
  onChange: (config: NodeConfig) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<NodeConfig>(config)

  useEffect(() => {
    setDraft(config)
  }, [config])

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const update = (patch: Partial<NodeConfig>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      return next
    })
  }

  const isMath = draft.kind === 'math'
  const isLlm = draft.kind === 'llm'

  return (
    <aside
      className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-surface shadow-[-10px_0_30px_rgba(0,0,0,0.5)] lg:w-96"
      aria-label="Node configuration"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-surface-container-low p-md">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Node Configuration
          </h2>
          <p className="mt-1 font-mono-label text-mono-label text-primary-fixed-dim">
            Target: {draft.label}
          </p>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close configuration panel"
          className="text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="flex-1 space-y-md overflow-y-auto p-md">
        {isLlm && (
          <>
            <Section title="General Settings">
              <Field label="Agent Name">
                <input
                  className="field"
                  type="text"
                  value={draft.agentName ?? ''}
                  onChange={(e) => update({ agentName: e.target.value })}
                />
              </Field>
              <Field label="LLM Model Selection">
                <select
                  className="field"
                  value={draft.model ?? 'nexus-v4-turbo'}
                  onChange={(e) => update({ model: e.target.value })}
                >
                  <option value="nexus-v4-turbo">Nexus V4 Turbo (Optimized)</option>
                  <option value="nexus-v4-omni">Nexus V4 Omni (Multimodal)</option>
                  <option value="custom-endpoint">Custom Endpoint Integration</option>
                </select>
              </Field>
            </Section>

            <Section title="Execution Parameters">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-mono-label text-on-surface-variant">
                    Temperature
                  </label>
                  <span className="font-mono-label text-primary-fixed-dim">
                    {draft.temperature ?? 0.2}
                  </span>
                </div>
                <input
                  className="w-full accent-primary-fixed-dim"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={draft.temperature ?? 0.2}
                  onChange={(e) => update({ temperature: Number(e.target.value) })}
                />
              </div>
              <Field label="Max Tokens">
                <input
                  className="field"
                  type="number"
                  value={draft.maxTokens ?? 4096}
                  onChange={(e) => update({ maxTokens: Number(e.target.value) })}
                />
              </Field>
            </Section>

            <Section title="Logic / System Prompt">
              <textarea
                className="field min-h-[150px] resize-none font-mono-label text-xs"
                value={draft.systemPrompt ?? ''}
                onChange={(e) => update({ systemPrompt: e.target.value })}
              />
            </Section>
          </>
        )}

        {isMath && (
          <>
            <Section
              title="Rule Logic Editor"
              action={<button className="text-tertiary-fixed-dim hover:underline">View Docs</button>}
            >
              <div className="relative">
                <textarea
                  className="field min-h-[180px] resize-none font-mono-label text-sm text-tertiary"
                  spellCheck={false}
                  value={draft.ruleLogic ?? ''}
                  onChange={(e) => update({ ruleLogic: e.target.value })}
                />
                <div className="absolute bottom-2 right-2 font-mono-label text-xs text-on-surface-variant">
                  JavaScript (V8)
                </div>
              </div>
            </Section>

            <Section title="Variable Mapping">
              <div className="space-y-3 rounded border border-white/5 bg-surface-container-lowest p-4">
                {(draft.variables ?? []).map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      className="field flex-1"
                      value={v.source}
                      onChange={(e) => {
                        const variables = [...(draft.variables ?? [])]
                        variables[i] = { ...variables[i], source: e.target.value }
                        update({ variables })
                      }}
                    />
                    <Icon name="arrow_forward" className="text-sm text-on-surface-variant" />
                    <input
                      className="field flex-1 text-tertiary-fixed-dim"
                      value={v.target}
                      onChange={(e) => {
                        const variables = [...(draft.variables ?? [])]
                        variables[i] = { ...variables[i], target: e.target.value }
                        update({ variables })
                      }}
                    />
                    <button
                      className="text-on-surface-variant transition-colors hover:text-error"
                      aria-label="Remove mapping"
                      onClick={() =>
                        update({
                          variables: (draft.variables ?? []).filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      <Icon name="close" className="text-sm" />
                    </button>
                  </div>
                ))}
                <button
                  className="flex w-full items-center justify-center gap-1 border border-dashed border-white/10 py-2 font-label-md text-xs text-on-surface-variant transition-colors hover:bg-white/5"
                  onClick={() =>
                    update({
                      variables: [...(draft.variables ?? []), { source: '', target: '' }],
                    })
                  }
                >
                  <Icon name="add" className="text-sm" /> Add Mapping
                </button>
              </div>
            </Section>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Precision">
                <select
                  className="field"
                  value={draft.precision ?? '2 Decimal Places'}
                  onChange={(e) => update({ precision: e.target.value })}
                >
                  <option>2 Decimal Places</option>
                  <option>4 Decimal Places</option>
                  <option>Float (Exact)</option>
                  <option>Integer (Round)</option>
                </select>
              </Field>
              <Field label="Error Strategy">
                <select
                  className="field"
                  value={draft.errorStrategy ?? 'Fail on Error'}
                  onChange={(e) => update({ errorStrategy: e.target.value })}
                >
                  <option>Fail on Error</option>
                  <option>Return Null</option>
                  <option>Return Default</option>
                  <option>Skip Node</option>
                </select>
              </Field>
            </div>
          </>
        )}

        {!isMath && !isLlm && (
          <div className="card-elevated rounded-xl p-md">
            <p className="font-body-md text-body-md text-on-surface-variant">
              {draft.label} is a{' '}
              {draft.kind === 'ingestion' ? 'data ingestion' : 'terminal output'} node.
              Its configuration is handled upstream by the pipeline, not this panel.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-sm border-t border-white/10 bg-surface-container-low p-md">
        <button
          onClick={onClose}
          className="flex-1 rounded border border-white/10 px-4 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onChange(draft)
            onClose()
          }}
          className="flex flex-1 items-center justify-center gap-xs rounded bg-primary-container px-4 py-2 font-label-md font-bold text-on-primary-container transition-colors hover:bg-primary-fixed"
        >
          <Icon name="sync" className="text-[18px]" />
          Sync Node
        </button>
      </div>
    </aside>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-surface-container-low p-sm">
      <div className="mb-sm flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="font-label-md text-label-md text-on-surface">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col gap-sm">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block font-mono-label text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  )
}
