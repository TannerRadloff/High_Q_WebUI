export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chat: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          visibility: 'private' | 'public'
        }
        Insert: {
          id: string
          user_id: string
          title: string
          created_at?: string
          visibility?: 'private' | 'public'
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          visibility?: 'private' | 'public'
        }
      }
      agent_workflow: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          created_at: string
          updated_at: string
          is_active: boolean
          entry_point_agent_id: string
        }
        Insert: {
          id: string
          user_id: string
          name: string
          description?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          entry_point_agent_id?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          entry_point_agent_id?: string
        }
      }
      agent_workflow_version: {
        Row: {
          id: string
          workflow_id: string
          version: number
          agents: Json
          connections: Json
          created_at: string
        }
        Insert: {
          id: string
          workflow_id: string
          version: number
          agents: Json
          connections: Json
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          version?: number
          agents?: Json
          connections?: Json
          created_at?: string
        }
      }
      message: {
        Row: {
          id: string
          role: 'system' | 'user' | 'assistant' | 'data'
          content: string
          chat_id: string
          created_at: string
          document_id?: string
          artifact_title?: string
        }
        Insert: {
          id: string
          role: 'system' | 'user' | 'assistant' | 'data'
          content: string
          chat_id: string
          created_at?: string
          document_id?: string
          artifact_title?: string
        }
        Update: {
          id?: string
          role?: 'system' | 'user' | 'assistant' | 'data'
          content?: string
          chat_id?: string
          created_at?: string
          document_id?: string
          artifact_title?: string
        }
      }
      vote: {
        Row: {
          id: string
          chat_id: string
          message_id: string
          is_upvoted: boolean
          created_at?: string
        }
        Insert: {
          id?: string
          chat_id: string
          message_id: string
          is_upvoted: boolean
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          message_id?: string
          is_upvoted?: boolean
          created_at?: string
        }
      }
      document: {
        Row: {
          id: string
          content: string
          kind: string
          title?: string
          user_id?: string
          created_at: string
        }
        Insert: {
          id: string
          content: string
          kind: string
          title?: string
          user_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          kind?: string
          title?: string
          user_id?: string
          created_at?: string
        }
      }
      agent_trace: {
        Row: {
          id: string
          workflow_name: string
          trace_id: string
          group_id?: string
          session_id?: string
          user_id?: string
          chat_id?: string
          status: 'running' | 'completed' | 'error'
          started_at: string
          ended_at?: string
          metadata?: Json
          created_at: string
        }
        Insert: {
          id?: string
          workflow_name: string
          trace_id: string
          group_id?: string
          session_id?: string
          user_id?: string
          chat_id?: string
          status: 'running' | 'completed' | 'error'
          started_at?: string
          ended_at?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workflow_name?: string
          trace_id?: string
          group_id?: string
          session_id?: string
          user_id?: string
          chat_id?: string
          status?: 'running' | 'completed' | 'error'
          started_at?: string
          ended_at?: string
          metadata?: Json
          created_at?: string
        }
      }
      agent_trace_span: {
        Row: {
          id: string
          span_id: string
          trace_id: string
          parent_id?: string
          name: string
          span_type: 'agent' | 'generation' | 'function' | 'guardrail' | 'handoff' | 'custom'
          span_data: Json
          started_at: string
          ended_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          span_id: string
          trace_id: string
          parent_id?: string
          name: string
          span_type: 'agent' | 'generation' | 'function' | 'guardrail' | 'handoff' | 'custom'
          span_data: Json
          started_at: string
          ended_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          span_id?: string
          trace_id?: string
          parent_id?: string
          name?: string
          span_type?: 'agent' | 'generation' | 'function' | 'guardrail' | 'handoff' | 'custom'
          span_data?: Json
          started_at?: string
          ended_at?: string
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: number
          title: string
        }
        Insert: {
          id?: never
          title: string
        }
        Update: {
          id?: never
          title?: string
        }
      }
    }
    Views: {
      // Views are not being used in this application
    }
    Functions: {
      // Custom functions are not being used in this application
    }
    Enums: {
      // Enums are not being used in this application
    }
  }
} 