import type {
  AgentCatalogEntry,
  ChatResponse,
  LibraryPipeline,
  Pipeline,
  RunSnapshot,
  RunView,
} from '../types/nexus'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init)
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
      else if (body.detail) detail = JSON.stringify(body.detail)
    } catch {
      /* keep statusText */
    }
    throw new Error(detail)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  createSession: () => request<ChatResponse>('/chat/session', { method: 'POST' }),

  sendMessage: (session_id: string, content: string) =>
    request<ChatResponse>('/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, content }),
    }),

  upload: (session_id: string, kind: 'data' | 'knowledge', files: FileList | File[]) => {
    const form = new FormData()
    form.append('session_id', session_id)
    form.append('kind', kind)
    for (const file of Array.from(files)) form.append('files', file)
    return request<ChatResponse>('/chat/upload', { method: 'POST', body: form })
  },

  confirm: (session_id: string) =>
    request<ChatResponse>('/chat/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id }),
    }),

  handoff: (session_id: string) =>
    request<ChatResponse>('/chat/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id }),
    }),

  syncNode: (session_id: string, node_id: string, config: Record<string, unknown>) =>
    request<ChatResponse>('/chat/sync-node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, node_id, config }),
    }),

  listAgents: () => request<{ agents: AgentCatalogEntry[] }>('/agents'),

  listPipelines: () => request<{ pipelines: LibraryPipeline[] }>('/pipelines'),

  getPipeline: (id: string) => request<Pipeline>(`/pipelines/${id}`),

  savePipeline: (session_id: string, name: string, version: string) =>
    request<Pipeline>('/pipelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, name, version }),
    }),

  startRun: (body: { session_id?: string; pipeline_id?: string }) =>
    request<RunView>('/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  artifactUrl: (runId: string, name: string) => `/api/runs/${runId}/artifacts/${encodeURIComponent(name)}`,

  getSnapshot: (runId: string) => request<RunSnapshot>(`/runs/${runId}/snapshot`),
}
