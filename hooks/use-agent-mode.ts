'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AgentModeState {
  agentMode: boolean
  toggleAgentMode: () => void
  setAgentMode: (mode: boolean) => void
}

// Safer localStorage implementation with error handling
const localStorageWithFallback = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(name);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
    return null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(name, value);
      }
    } catch (error) {
      console.error('Error storing in localStorage:', error);
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(name);
      }
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
};

export const useAgentMode = create<AgentModeState>()(
  persist(
    (set) => ({
      agentMode: false,
      toggleAgentMode: () => set((state) => ({ agentMode: !state.agentMode })),
      setAgentMode: (mode: boolean) => set({ agentMode: mode }),
    }),
    {
      name: 'agent-mode-storage', // Unique name for the storage key
      storage: createJSONStorage(() => localStorageWithFallback),
      partialize: (state) => ({ agentMode: state.agentMode }), // Only store the agentMode value
    }
  )
) 