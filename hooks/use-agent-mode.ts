'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AgentModeState {
  agentMode: boolean
  toggleAgentMode: () => void
  setAgentMode: (mode: boolean) => void
}

export const useAgentMode = create<AgentModeState>()(
  persist(
    (set) => ({
      agentMode: false,
      toggleAgentMode: () => set((state) => ({ agentMode: !state.agentMode })),
      setAgentMode: (mode: boolean) => set({ agentMode: mode }),
    }),
    {
      name: 'agent-mode-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
) 