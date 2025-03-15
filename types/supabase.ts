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