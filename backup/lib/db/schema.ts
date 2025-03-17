import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  name: varchar('name', { length: 64 }),
  image: varchar('image', { length: 255 }),
  emailVerified: timestamp('emailVerified'),
  provider: varchar('provider', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

// Password reset token table
export const passwordReset = pgTable('PasswordReset', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  token: varchar('token', { length: 64 }).notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  used: boolean('used').notNull().default(false),
});

export type PasswordReset = InferSelectModel<typeof passwordReset>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

// Agent trace tables
export const agentTrace = pgTable('AgentTrace', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  agentId: varchar('agentId', { length: 64 }).notNull(),
  agentName: varchar('agentName', { length: 64 }).notNull(),
  agentIcon: varchar('agentIcon', { length: 16 }).notNull(),
  query: text('query').notNull(),
  startTime: timestamp('startTime').notNull(),
  endTime: timestamp('endTime'),
  status: varchar('status', { enum: ['running', 'completed', 'error'] }).notNull(),
  reasoning: text('reasoning'),
  userId: uuid('userId').references(() => user.id),
  chatId: uuid('chatId').references(() => chat.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type AgentTrace = InferSelectModel<typeof agentTrace>;

export const agentTraceStep = pgTable('AgentTraceStep', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  traceId: uuid('traceId')
    .notNull()
    .references(() => agentTrace.id),
  agentId: varchar('agentId', { length: 64 }).notNull(),
  agentName: varchar('agentName', { length: 64 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  type: varchar('type', { 
    enum: ['thought', 'action', 'observation', 'decision', 'handoff', 'error'] 
  }).notNull(),
  content: text('content').notNull(),
  metadata: json('metadata'),
  status: varchar('status', { enum: ['completed', 'in-progress', 'planned'] }).default('completed'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type AgentTraceStep = InferSelectModel<typeof agentTraceStep>;
