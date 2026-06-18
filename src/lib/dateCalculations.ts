import { addDays, format, parseISO, max, differenceInDays } from "date-fns";
import type { ServicoTarefa, Servico } from "@/types/servicos";

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function calcularDataPrevistaTarefa(
  tarefa: ServicoTarefa,
  dataInicial: string,
  todas: ServicoTarefa[],
): string | null {
  if (tarefa.tipo_prazo === "RELATIVO_AO_INICIO") {
    return toISODate(addDays(parseISO(dataInicial), tarefa.duracao_dias));
  }
  if (tarefa.tipo_prazo === "RELATIVO_A_CONCLUSAO_DE_TAREFA" && tarefa.depende_de_servico_tarefa_id) {
    const pai = todas.find((t) => t.id === tarefa.depende_de_servico_tarefa_id);
    if (pai?.data_conclusao) return toISODate(addDays(parseISO(pai.data_conclusao), tarefa.duracao_dias));
    if (pai?.data_prevista) return toISODate(addDays(parseISO(pai.data_prevista), tarefa.duracao_dias));
    return null;
  }
  return null;
}

export function recalcularServico(servico: Servico): Servico {
  const tarefas = servico.tarefas.map((t) => ({ ...t }));

  for (const t of tarefas) {
    if (t.status === "concluida" || t.status === "cancelada") continue;
    if (t.depende_de_servico_tarefa_id) {
      const pai = tarefas.find((x) => x.id === t.depende_de_servico_tarefa_id);
      if (pai?.status === "cancelada") {
        t.status = "cancelada";
        t.data_conclusao = null;
      } else if (pai && pai.status !== "concluida") {
        t.status = "bloqueada";
      } else if (pai && pai.status === "concluida" && t.status === "bloqueada") {
        t.status = "pendente";
      }
    }
  }

  for (let pass = 0; pass < 3; pass++) {
    for (const t of tarefas) {
      t.data_prevista = calcularDataPrevistaTarefa(t, servico.data_inicial, tarefas);
    }
  }

  const datas: Date[] = [parseISO(servico.data_prevista_base)];
  for (const t of tarefas) {
    if (t.status !== "cancelada" && t.impacta_prazo && t.data_prevista) {
      datas.push(parseISO(t.data_prevista));
    }
  }
  const dataPrevistaAtual = max(datas);

  const visible = tarefas.filter((t) => !(t.gerar_apos_conclusao && t.status === "bloqueada"));
  const allDone =
    visible.length > 0 && visible.every((t) => t.status === "concluida" || t.status === "cancelada");

  return {
    ...servico,
    tarefas,
    data_prevista_atual: toISODate(dataPrevistaAtual),
    status: allDone ? "concluido" : servico.status === "cancelado" ? "cancelado" : "em_andamento",
  };
}

export function calcularProgresso(servico: Servico): number {
  const visible = servico.tarefas.filter((t) => !(t.gerar_apos_conclusao && t.status === "bloqueada"));
  if (visible.length === 0) return 0;
  const done = visible.filter((t) => t.status === "concluida" || t.status === "cancelada").length;
  return Math.round((done / visible.length) * 100);
}

export function tarefaAtrasada(t: ServicoTarefa): boolean {
  if (t.status !== "pendente" || !t.data_prevista) return false;
  return differenceInDays(new Date(), parseISO(t.data_prevista)) > 0;
}
