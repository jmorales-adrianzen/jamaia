export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          city: string | null
          color_depth: number | null
          connection_type: string | null
          country_code: string | null
          country_name: string | null
          cpu_cores: number | null
          created_at: string | null
          device_memory: number | null
          device_pixel_ratio: number | null
          device_type: string | null
          event_type: string
          id: number
          language: string | null
          languages: string | null
          orientation: string | null
          os_name: string | null
          page_path: string | null
          prefers_dark_mode: boolean | null
          referrer: string | null
          region: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          timezone: string | null
          user_agent: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          city?: string | null
          color_depth?: number | null
          connection_type?: string | null
          country_code?: string | null
          country_name?: string | null
          cpu_cores?: number | null
          created_at?: string | null
          device_memory?: number | null
          device_pixel_ratio?: number | null
          device_type?: string | null
          event_type: string
          id?: number
          language?: string | null
          languages?: string | null
          orientation?: string | null
          os_name?: string | null
          page_path?: string | null
          prefers_dark_mode?: boolean | null
          referrer?: string | null
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          timezone?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          city?: string | null
          color_depth?: number | null
          connection_type?: string | null
          country_code?: string | null
          country_name?: string | null
          cpu_cores?: number | null
          created_at?: string | null
          device_memory?: number | null
          device_pixel_ratio?: number | null
          device_type?: string | null
          event_type?: string
          id?: number
          language?: string | null
          languages?: string | null
          orientation?: string | null
          os_name?: string | null
          page_path?: string | null
          prefers_dark_mode?: boolean | null
          referrer?: string | null
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          timezone?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      categorias_ingredientes: {
        Row: {
          activo: boolean | null
          codigo: string
          icono: string | null
          id: number
          nombre: string
          orden: number | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          icono?: string | null
          id?: number
          nombre: string
          orden?: number | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          icono?: string | null
          id?: number
          nombre?: string
          orden?: number | null
        }
        Relationships: []
      }
      ingrediente_traducciones: {
        Row: {
          id: number
          ingrediente_id: number
          nombre: string
          ubicacion_id: number
        }
        Insert: {
          id?: number
          ingrediente_id: number
          nombre: string
          ubicacion_id: number
        }
        Update: {
          id?: number
          ingrediente_id?: number
          nombre?: string
          ubicacion_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingrediente_traducciones_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingrediente_traducciones_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredientes: {
        Row: {
          categoria_id: number | null
          es_comun: boolean | null
          id: number
          nombre_base: string
          unidad_medida: string
        }
        Insert: {
          categoria_id?: number | null
          es_comun?: boolean | null
          id?: number
          nombre_base: string
          unidad_medida: string
        }
        Update: {
          categoria_id?: number | null
          es_comun?: boolean | null
          id?: number
          nombre_base?: string
          unidad_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredientes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_ingredientes"
            referencedColumns: ["id"]
          },
        ]
      }
      platillo_embeddings: {
        Row: {
          activo: boolean | null
          dimensiones: number
          embedding: string | null
          fecha_generacion: string | null
          id: number
          modelo: string
          platillo_id: number
          proveedor: string
          texto_fuente: string | null
          tipo: string
          ubicacion_id: number | null
          version: number | null
        }
        Insert: {
          activo?: boolean | null
          dimensiones?: number
          embedding?: string | null
          fecha_generacion?: string | null
          id?: number
          modelo?: string
          platillo_id: number
          proveedor?: string
          texto_fuente?: string | null
          tipo: string
          ubicacion_id?: number | null
          version?: number | null
        }
        Update: {
          activo?: boolean | null
          dimensiones?: number
          embedding?: string | null
          fecha_generacion?: string | null
          id?: number
          modelo?: string
          platillo_id?: number
          proveedor?: string
          texto_fuente?: string | null
          tipo?: string
          ubicacion_id?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "platillo_embeddings_platillo_id_fkey"
            columns: ["platillo_id"]
            isOneToOne: false
            referencedRelation: "platillos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platillo_embeddings_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      platillo_ingredientes: {
        Row: {
          cantidad: number
          id: number
          ingrediente_id: number
          platillo_id: number
          unidad: string
        }
        Insert: {
          cantidad: number
          id?: number
          ingrediente_id: number
          platillo_id: number
          unidad: string
        }
        Update: {
          cantidad?: number
          id?: number
          ingrediente_id?: number
          platillo_id?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "platillo_ingredientes_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platillo_ingredientes_platillo_id_fkey"
            columns: ["platillo_id"]
            isOneToOne: false
            referencedRelation: "platillos"
            referencedColumns: ["id"]
          },
        ]
      }
      platillo_traducciones: {
        Row: {
          id: number
          nombre: string
          platillo_id: number
          preparacion: string | null
          ubicacion_id: number
        }
        Insert: {
          id?: number
          nombre: string
          platillo_id: number
          preparacion?: string | null
          ubicacion_id: number
        }
        Update: {
          id?: number
          nombre?: string
          platillo_id?: number
          preparacion?: string | null
          ubicacion_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "platillo_traducciones_platillo_id_fkey"
            columns: ["platillo_id"]
            isOneToOne: false
            referencedRelation: "platillos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platillo_traducciones_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      platillos: {
        Row: {
          categoria_id: number | null
          id: number
          imagen_url: string | null
          tiempo_prep: string | null
        }
        Insert: {
          categoria_id?: number | null
          id?: number
          imagen_url?: string | null
          tiempo_prep?: string | null
        }
        Update: {
          categoria_id?: number | null
          id?: number
          imagen_url?: string | null
          tiempo_prep?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platillos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      precios_ingredientes: {
        Row: {
          activo: boolean | null
          fecha_actualizacion: string | null
          fuente: string | null
          id: number
          ingrediente_id: number
          precio: number
          tipo_precio_id: number
          ubicacion_id: number
          unidad_referencia: string
        }
        Insert: {
          activo?: boolean | null
          fecha_actualizacion?: string | null
          fuente?: string | null
          id?: number
          ingrediente_id: number
          precio: number
          tipo_precio_id: number
          ubicacion_id: number
          unidad_referencia: string
        }
        Update: {
          activo?: boolean | null
          fecha_actualizacion?: string | null
          fuente?: string | null
          id?: number
          ingrediente_id?: number
          precio?: number
          tipo_precio_id?: number
          ubicacion_id?: number
          unidad_referencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "precios_ingredientes_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_ingredientes_tipo_precio_id_fkey"
            columns: ["tipo_precio_id"]
            isOneToOne: false
            referencedRelation: "tipos_precio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_ingredientes_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      recomendaciones: {
        Row: {
          id: number
          origen: string | null
          platillo_id: number
          sugerencia: string
          ubicacion_id: number
        }
        Insert: {
          id?: number
          origen?: string | null
          platillo_id: number
          sugerencia: string
          ubicacion_id: number
        }
        Update: {
          id?: number
          origen?: string | null
          platillo_id?: number
          sugerencia?: string
          ubicacion_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "recomendaciones_platillo_id_fkey"
            columns: ["platillo_id"]
            isOneToOne: false
            referencedRelation: "platillos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      recomendaciones_acompanamiento: {
        Row: {
          id: number
          orden: number | null
          platillo_id: number
          sugerencia: string
          tipo_id: number
          ubicacion_id: number
        }
        Insert: {
          id?: number
          orden?: number | null
          platillo_id: number
          sugerencia: string
          tipo_id: number
          ubicacion_id: number
        }
        Update: {
          id?: number
          orden?: number | null
          platillo_id?: number
          sugerencia?: string
          tipo_id?: number
          ubicacion_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "recomendaciones_acompanamiento_platillo_id_fkey"
            columns: ["platillo_id"]
            isOneToOne: false
            referencedRelation: "platillos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_acompanamiento_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_recomendacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_acompanamiento_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_precio: {
        Row: {
          codigo: string
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tipos_recomendacion: {
        Row: {
          codigo: string
          icono: string | null
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          icono?: string | null
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          icono?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      ubicaciones: {
        Row: {
          activo: boolean | null
          codigo_iso: string | null
          id: number
          nombre: string
          padre_id: number | null
          tipo: string
        }
        Insert: {
          activo?: boolean | null
          codigo_iso?: string | null
          id?: number
          nombre: string
          padre_id?: number | null
          tipo: string
        }
        Update: {
          activo?: boolean | null
          codigo_iso?: string | null
          id?: number
          nombre?: string
          padre_id?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ubicaciones_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_platos_por_ingredientes: {
        Args: {
          p_ingredientes: number[]
          p_limit?: number
          p_max_faltantes?: number
          p_ubicacion_id: number
        }
        Returns: {
          imagen_url: string
          ingredientes_faltantes: number
          ingredientes_tiene: number
          ingredientes_totales: number
          nombre: string
          platillo_id: number
          porcentaje_match: number
          tiempo_prep: string
        }[]
      }
      ingredientes_faltantes_agrupados: {
        Args: {
          p_ingredientes: number[]
          p_personas?: number
          p_platillos_ids: number[]
          p_ubicacion_id: number
        }
        Returns: {
          cantidad_total: number
          categoria_icono: string
          categoria_nombre: string
          categoria_orden: number
          costo_estimado: number
          ingrediente_id: number
          nombre: string
          unidad: string
        }[]
      }
      ingredientes_faltantes_plato: {
        Args: {
          p_ingredientes: number[]
          p_platillo_id: number
          p_ubicacion_id: number
        }
        Returns: {
          cantidad: number
          ingrediente_id: number
          nombre: string
          precio_unitario: number
          unidad: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
