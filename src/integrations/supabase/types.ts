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
          status_detalhado: string | null
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
          status_detalhado?: string | null
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
          status_detalhado?: string | null
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
      servico_tarefas: {
        Row: {
          criado_em: string
          data_conclusao: string | null
          data_prevista: string | null
          depende_de_servico_tarefa_id: string | null
          duracao_dias: number
          fase_nome: string
          gerar_apos_conclusao: boolean
          id: string
          impacta_prazo: boolean
          ordem: number
          servico_id: string
          status: Database["public"]["Enums"]["status_tarefa"]
          template_tarefa_id: string | null
          tipo_prazo: Database["public"]["Enums"]["tipo_prazo"]
          titulo: string
        }
        Insert: {
          criado_em?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          depende_de_servico_tarefa_id?: string | null
          duracao_dias?: number
          fase_nome?: string
          gerar_apos_conclusao?: boolean
          id?: string
          impacta_prazo?: boolean
          ordem?: number
          servico_id: string
          status?: Database["public"]["Enums"]["status_tarefa"]
          template_tarefa_id?: string | null
          tipo_prazo?: Database["public"]["Enums"]["tipo_prazo"]
          titulo: string
        }
        Update: {
          criado_em?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          depende_de_servico_tarefa_id?: string | null
          duracao_dias?: number
          fase_nome?: string
          gerar_apos_conclusao?: boolean
          id?: string
          impacta_prazo?: boolean
          ordem?: number
          servico_id?: string
          status?: Database["public"]["Enums"]["status_tarefa"]
          template_tarefa_id?: string | null
          tipo_prazo?: Database["public"]["Enums"]["tipo_prazo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_tarefas_depende_de_servico_tarefa_id_fkey"
            columns: ["depende_de_servico_tarefa_id"]
            isOneToOne: false
            referencedRelation: "servico_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_tarefas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_inicial: string
          data_prevista_atual: string
          data_prevista_base: string
          empresa_id: string
          id: string
          nome: string
          prazo_base_dias: number
          processo_id: string | null
          status: Database["public"]["Enums"]["status_servico"]
          template_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_inicial: string
          data_prevista_atual: string
          data_prevista_base: string
          empresa_id: string
          id?: string
          nome: string
          prazo_base_dias?: number
          processo_id?: string | null
          status?: Database["public"]["Enums"]["status_servico"]
          template_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_inicial?: string
          data_prevista_atual?: string
          data_prevista_base?: string
          empresa_id?: string
          id?: string
          nome?: string
          prazo_base_dias?: number
          processo_id?: string | null
          status?: Database["public"]["Enums"]["status_servico"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fases: {
        Row: {
          criado_em: string
          id: string
          nome: string
          ordem: number
          template_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          ordem?: number
          template_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          ordem?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_fases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tarefas: {
        Row: {
          criado_em: string
          depende_de_template_tarefa_id: string | null
          duracao_dias: number
          fase_id: string
          gerar_apos_conclusao: boolean
          id: string
          impacta_prazo: boolean
          ordem: number
          tipo_prazo: Database["public"]["Enums"]["tipo_prazo"]
          titulo: string
        }
        Insert: {
          criado_em?: string
          depende_de_template_tarefa_id?: string | null
          duracao_dias?: number
          fase_id: string
          gerar_apos_conclusao?: boolean
          id?: string
          impacta_prazo?: boolean
          ordem?: number
          tipo_prazo?: Database["public"]["Enums"]["tipo_prazo"]
          titulo: string
        }
        Update: {
          criado_em?: string
          depende_de_template_tarefa_id?: string | null
          duracao_dias?: number
          fase_id?: string
          gerar_apos_conclusao?: boolean
          id?: string
          impacta_prazo?: boolean
          ordem?: number
          tipo_prazo?: Database["public"]["Enums"]["tipo_prazo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tarefas_depende_de_template_tarefa_id_fkey"
            columns: ["depende_de_template_tarefa_id"]
            isOneToOne: false
            referencedRelation: "template_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_tarefas_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "template_fases"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          prazo_base_dias: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          prazo_base_dias?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          prazo_base_dias?: number
        }
        Relationships: []
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
      status_servico: "em_andamento" | "concluido" | "cancelado"
      status_tarefa: "pendente" | "concluida" | "bloqueada"
      tipo_prazo: "RELATIVO_AO_INICIO" | "RELATIVO_A_CONCLUSAO_DE_TAREFA"
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
      status_servico: ["em_andamento", "concluido", "cancelado"],
      status_tarefa: ["pendente", "concluida", "bloqueada"],
      tipo_prazo: ["RELATIVO_AO_INICIO", "RELATIVO_A_CONCLUSAO_DE_TAREFA"],
    },
  },
} as const
