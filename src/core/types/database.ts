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
      evt_eventos: {
        Row: {
          id: number
          clave_evento: string
          nombre_proyecto: string
          fecha_evento: string
          estado_id: number
          // ... otros campos
        }
        Insert: {
          // ...
        }
        Update: {
          // ...
        }
      }
      evt_estados: {
        Row: {
          id: number
          nombre: string
          descripcion: string
          color: string
          orden: number
        }
        Insert: {
          // ...
        }
        Update: {
          // ...
        }
      }
      evt_ingresos: {
        Row: {
          id: number
          evento_id: number
          concepto: string
          total: number
          facturado: boolean
          es_pagado: boolean // Columna correcta
          fecha_compromiso_pago: string | null
          // ... otros campos
        }
        Insert: {
          // ...
        }
        Update: {
          // ...
        }
      }
      // ... otras tablas
    }
    Views: {
      // ...
    }
    Functions: {
      // ...
    }
    Enums: {
      // ...
    }
    CompositeTypes: {
      // ...
    }
  }
}
