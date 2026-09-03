import { Navigate } from 'react-router-dom'

/** AgentChat is not an execution surface in v1. Launch/deep links go to Architect. */
export default function AgentChat() {
  return <Navigate to="/architect/create" replace />
}
