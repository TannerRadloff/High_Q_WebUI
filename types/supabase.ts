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
      // For example:
      // users: {
      //   Row: {
      //     id: string
      //     name: string
      //     email: string
      //   }
      //   Insert: {
      //     id?: string
      //     name: string
      //     email: string
      //   }
      //   Update: {
      //     id?: string
      //     name?: string
      //     email?: string
      //   }
      // }
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