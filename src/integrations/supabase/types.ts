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
  public: {
    Tables: {
      empresas: {
        Row: {
          cnpj: string | null
          criado_em: string
          grupo_id: string | null
          id: string
          nome: string
          segmento: string | null
        }
        Insert: {
          cnpj?: string | null
          criado_em?: string
          grupo_id?: string | null
          id?: string
          nome: string
          segmento?: string | null
        }
        Update: {
          cnpj?: string | null
          criado_em?: string
          grupo_id?: string | null
          id?: string
          nome?: string
          segmento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_empresariais"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          cor: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          tipo_processo_id: string
        }
        Insert: {
          cor?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          tipo_processo_id: string
        }
        Update: {
          cor?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          tipo_processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_tipo_processo_id_fkey"
            columns: ["tipo_processo_id"]
            isOneToOne: false
            referencedRelation: "tipos_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_empresariais: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      processos: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_protocolo: string | null
          empresa_id: string
          etapa_atual_id: string | null
          id: string
          nome: string
          numero_protocolo: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["processo_status"]
          tipo_processo_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_protocolo?: string | null
          empresa_id: string
          etapa_atual_id?: string | null
          id?: string
          nome: string
          numero_protocolo?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["processo_status"]
          tipo_processo_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_protocolo?: string | null
          empresa_id?: string
          etapa_atual_id?: string | null
          id?: string
          nome?: string
          numero_protocolo?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["processo_status"]
          tipo_processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_etapa_atual_id_fkey"
            columns: ["etapa_atual_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tipo_processo_id_fkey"
            columns: ["tipo_processo_id"]
            isOneToOne: false
            referencedRelation: "tipos_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_processo: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tramitacoes: {
        Row: {
          criado_em: string
          data_evento: string
          descricao: string
          etapa_id: string | null
          id: string
          processo_id: string
          responsavel: string | null
          setor_orgao: string | null
          status_no_momento:
            | Database["public"]["Enums"]["processo_status"]
            | null
        }
        Insert: {
          criado_em?: string
          data_evento?: string
          descricao: string
          etapa_id?: string | null
          id?: string
          processo_id: string
          responsavel?: string | null
          setor_orgao?: string | null
          status_no_momento?:
            | Database["public"]["Enums"]["processo_status"]
            | null
        }
        Update: {
          criado_em?: string
          data_evento?: string
          descricao?: string
          etapa_id?: string | null
          id?: string
          processo_id?: string
          responsavel?: string | null
          setor_orgao?: string | null
          status_no_momento?:
            | Database["public"]["Enums"]["processo_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "tramitacoes_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tramitacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      processo_status: "ativo" | "concluido" | "cancelado" | "suspenso"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      processo_status: ["ativo", "concluido", "cancelado", "suspenso"],
    },
  },
} as const
