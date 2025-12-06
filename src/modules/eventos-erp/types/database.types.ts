export interface Database {
  public: {
    Tables: {
      evt_documentos_erp: {
        Row: {
          id: number
          evento_id: number
          nombre: string
          url: string
          path: string
          created_by: string | null
          created_at?: string
        }
        Insert: {
          evento_id: number
          nombre: string
          url: string
          path: string
          created_by?: string | null
          created_at?: string
        }
      }
    }
  }
}