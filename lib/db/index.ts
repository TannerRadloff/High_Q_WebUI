// Mock database module for build compatibility
import * as schema from './schema';

// Create a mock database object that satisfies the interface
// but doesn't actually connect to a database during build
export const db = {
  query: {
    user: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    chat: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    message: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    agentTrace: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    agentTraceStep: {
      findFirst: async () => null,
      findMany: async () => [],
    },
  },
  insert: () => ({
    values: async () => ({}),
  }),
  update: () => ({
    set: () => ({
      where: async () => ({}),
    }),
  }),
  delete: () => ({
    where: async () => ({}),
  }),
};

// Export schema for convenience
export { schema }; 