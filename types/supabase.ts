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
      // Add your database tables here
      todos: {
        Row: {
          id: string
          title: string
          completed: boolean
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          title: string
          completed?: boolean
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          completed?: boolean
          created_at?: string
          user_id?: string | null
        }
      }
    }
    Views: {
      // Add views here if you have any
    }
    Functions: {
      // Add functions here if you have any
    }
    Enums: {
      // Add enums here if you have any
    }
  }
} 