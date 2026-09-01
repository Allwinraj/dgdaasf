import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { seedSuperAgents, type SuperAgent } from '../data/superAgents'

interface AgentContextValue {
  superAgents: SuperAgent[]
  createAgent: (agent: Omit<SuperAgent, 'id' | 'runs' | 'status'>) => SuperAgent
}

const AgentContext = createContext<AgentContextValue | null>(null)

const STORAGE_KEY = 'nexus.superAgents'

export function AgentProvider({ children }: { children: ReactNode }) {
  const [superAgents, setSuperAgents] = useState<SuperAgent[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as SuperAgent[]
    } catch {
      // fall through to seed data
    }
    return seedSuperAgents
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(superAgents))
    } catch {
      // storage may be unavailable; app still works in memory
    }
  }, [superAgents])

  const createAgent = useCallback(
    (agent: Omit<SuperAgent, 'id' | 'runs' | 'status'>) => {
      const created: SuperAgent = {
        ...agent,
        id: `agent-${Date.now()}`,
        runs: 0,
        status: 'draft',
      }
      setSuperAgents((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const value = useMemo(
    () => ({ superAgents, createAgent }),
    [superAgents, createAgent],
  )

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgents() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgents must be used within AgentProvider')
  return ctx
}
