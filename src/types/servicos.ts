export type TipoPrazo = "RELATIVO_AO_INICIO" | "RELATIVO_A_CONCLUSAO_DE_TAREFA";
export type StatusTarefa = "pendente" | "concluida" | "bloqueada";
export type StatusServico = "em_andamento" | "concluido" | "cancelado";

export interface TemplateTarefa {
  id: string;
  fase_id: string;
  titulo: string;
  duracao_dias: number;
  tipo_prazo: TipoPrazo;
  impacta_prazo: boolean;
  depende_de_template_tarefa_id: string | null;
  gerar_apos_conclusao: boolean;
  ordem: number;
}

export interface TemplateFase {
  id: string;
  template_id: string;
  nome: string;
  ordem: number;
  tarefas: TemplateTarefa[];
}

export interface Template {
  id: string;
  nome: string;
  prazo_base_dias: number;
  descricao: string | null;
  fases: TemplateFase[];
}

export interface ServicoTarefa {
  id: string;
  servico_id: string;
  titulo: string;
  fase_nome: string;
  duracao_dias: number;
  tipo_prazo: TipoPrazo;
  impacta_prazo: boolean;
  depende_de_servico_tarefa_id: string | null;
  gerar_apos_conclusao: boolean;
  status: StatusTarefa;
  data_prevista: string | null;
  data_conclusao: string | null;
  template_tarefa_id: string | null;
  ordem: number;
}

export interface Servico {
  id: string;
  empresa_id: string;
  template_id: string | null;
  nome: string;
  data_inicial: string;
  prazo_base_dias: number;
  data_prevista_base: string;
  data_prevista_atual: string;
  status: StatusServico;
  tarefas: ServicoTarefa[];
}
