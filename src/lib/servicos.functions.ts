import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { addDays, parseISO } from "date-fns";
import { recalcularServico, toISODate } from "@/lib/dateCalculations";
import type { Template, TemplateFase, TemplateTarefa, Servico, ServicoTarefa, TipoPrazo, ProcessoResumo } from "@/types/servicos";

const CANCELLED_TASK_DATE = "1900-01-01";

function toAppTaskStatus(tarefa: {
  status: string;
  data_conclusao: string | null;
  impacta_prazo: boolean;
}) {
  if (
    tarefa.status === "concluida" &&
    tarefa.impacta_prazo === false &&
    (tarefa.data_conclusao === CANCELLED_TASK_DATE || tarefa.data_conclusao === null)
  ) {
    return "cancelada" as const;
  }
  return tarefa.status as ServicoTarefa["status"];
}

function toAppCompletionDate(tarefa: { data_conclusao: string | null }) {
  return tarefa.data_conclusao === CANCELLED_TASK_DATE ? null : tarefa.data_conclusao;
}

function toDbTaskPatch(tarefa: ServicoTarefa) {
  if (tarefa.status === "cancelada") {
    return {
      status: "concluida" as const,
      data_conclusao: CANCELLED_TASK_DATE,
      impacta_prazo: false,
      data_prevista: tarefa.data_prevista,
    };
  }

  return {
    status: tarefa.status,
    data_prevista: tarefa.data_prevista,
  };
}

// ============================================================
// Loaders
// ============================================================

export const getServicosData = createServerFn({ method: "GET" }).handler(async () => {
  const [empresasRes, processosRes, templatesRes, fasesRes, ttarefasRes, servicosRes, starefasRes] = await Promise.all([
    supabaseAdmin.from("empresas").select("id, nome, cnpj").order("nome"),
    supabaseAdmin.from("processos").select("id,nome,numero_protocolo,empresa_id,status").order("nome"),
    supabaseAdmin.from("templates").select("*").order("criado_em", { ascending: false }),
    supabaseAdmin.from("template_fases").select("*").order("ordem"),
    supabaseAdmin.from("template_tarefas").select("*").order("ordem"),
    supabaseAdmin.from("servicos").select("*").order("criado_em", { ascending: false }),
    supabaseAdmin.from("servico_tarefas").select("*").order("ordem"),
  ]);

  const templates: Template[] = (templatesRes.data ?? []).map((t) => {
    const fases: TemplateFase[] = (fasesRes.data ?? [])
      .filter((f) => f.template_id === t.id)
      .map((f) => ({
        id: f.id,
        template_id: f.template_id,
        nome: f.nome,
        ordem: f.ordem,
        tarefas: (ttarefasRes.data ?? [])
          .filter((tt) => tt.fase_id === f.id)
          .map((tt) => ({
            id: tt.id,
            fase_id: tt.fase_id,
            titulo: tt.titulo,
            duracao_dias: tt.duracao_dias,
            tipo_prazo: tt.tipo_prazo as TipoPrazo,
            impacta_prazo: tt.impacta_prazo,
            depende_de_template_tarefa_id: tt.depende_de_template_tarefa_id,
            gerar_apos_conclusao: tt.gerar_apos_conclusao,
            ordem: tt.ordem,
          })),
      }));
    return {
      id: t.id,
      nome: t.nome,
      prazo_base_dias: t.prazo_base_dias,
      descricao: t.descricao,
      fases,
    };
  });

  const servicos: Servico[] = (servicosRes.data ?? []).map((s) => ({
    id: s.id,
    empresa_id: s.empresa_id,
    processo_id: (s as any).processo_id ?? null,
    template_id: s.template_id,
    nome: s.nome,
    data_inicial: s.data_inicial,
    prazo_base_dias: s.prazo_base_dias,
    data_prevista_base: s.data_prevista_base,
    data_prevista_atual: s.data_prevista_atual,
    status: s.status,
    tarefas: (starefasRes.data ?? [])
      .filter((st) => st.servico_id === s.id)
      .map((st) => ({
        id: st.id,
        servico_id: st.servico_id,
        titulo: st.titulo,
        fase_nome: st.fase_nome,
        duracao_dias: st.duracao_dias,
        tipo_prazo: st.tipo_prazo as TipoPrazo,
        impacta_prazo: st.impacta_prazo,
        depende_de_servico_tarefa_id: st.depende_de_servico_tarefa_id,
        gerar_apos_conclusao: st.gerar_apos_conclusao,
        status: toAppTaskStatus(st),
        data_prevista: st.data_prevista,
        data_conclusao: toAppCompletionDate(st),
        template_tarefa_id: st.template_tarefa_id,
        ordem: st.ordem,
      })),
  }));


  return {
    empresas: empresasRes.data ?? [],
    processos: (processosRes.data ?? []) as ProcessoResumo[],
    templates,
    servicos,
  };
});

export const getServicosByProcesso = createServerFn({ method: "GET" })
  .inputValidator((d: { processo_id: string }) => d)
  .handler(async ({ data }) => {
    const { data: srvs, error } = await supabaseAdmin
      .from("servicos")
      .select("*")
      .eq("processo_id" as any, data.processo_id)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (srvs ?? []).map((s) => s.id);
    const { data: tarefas } = ids.length
      ? await supabaseAdmin.from("servico_tarefas").select("*").in("servico_id", ids).order("ordem")
      : { data: [] as any[] };
    const servicos: Servico[] = (srvs ?? []).map((s) => ({
      id: s.id,
      empresa_id: s.empresa_id,
      processo_id: (s as any).processo_id ?? null,
      template_id: s.template_id,
      nome: s.nome,
      data_inicial: s.data_inicial,
      prazo_base_dias: s.prazo_base_dias,
      data_prevista_base: s.data_prevista_base,
      data_prevista_atual: s.data_prevista_atual,
      status: s.status,
      tarefas: (tarefas ?? [])
        .filter((t) => t.servico_id === s.id)
        .map((t) => ({
          id: t.id,
          servico_id: t.servico_id,
          titulo: t.titulo,
          fase_nome: t.fase_nome,
          duracao_dias: t.duracao_dias,
          tipo_prazo: t.tipo_prazo as TipoPrazo,
          impacta_prazo: t.impacta_prazo,
          depende_de_servico_tarefa_id: t.depende_de_servico_tarefa_id,
          gerar_apos_conclusao: t.gerar_apos_conclusao,
          status: toAppTaskStatus(t),
          data_prevista: t.data_prevista,
          data_conclusao: toAppCompletionDate(t),
          template_tarefa_id: t.template_tarefa_id,
          ordem: t.ordem,
        })),
    }));
    return { servicos };
  });

export const getServicoById = createServerFn({ method: "GET" })

  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { data: srv, error } = await supabaseAdmin
      .from("servicos").select("*").eq("id", data.id).single();
    if (error || !srv) throw new Error(error?.message ?? "Serviço não encontrado");
    const [{ data: tarefas }, { data: empresa }] = await Promise.all([
      supabaseAdmin.from("servico_tarefas").select("*").eq("servico_id", data.id).order("ordem"),
      supabaseAdmin.from("empresas").select("id, nome, cnpj").eq("id", srv.empresa_id).maybeSingle(),
    ]);
    return {
      servico: {
        ...srv,
        tarefas: (tarefas ?? []).map((t) => ({
          ...t,
          tipo_prazo: t.tipo_prazo as TipoPrazo,
          status: toAppTaskStatus(t),
          data_conclusao: toAppCompletionDate(t),
        })),
      } as Servico,
      empresa: empresa ?? null,
    };
  });

export const getTemplateById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { data: tpl, error } = await supabaseAdmin
      .from("templates").select("*").eq("id", data.id).single();
    if (error || !tpl) throw new Error(error?.message ?? "Template não encontrado");
    const { data: fases } = await supabaseAdmin
      .from("template_fases").select("*").eq("template_id", tpl.id).order("ordem");
    const faseIds = (fases ?? []).map((f) => f.id);
    const { data: ttarefas } = faseIds.length
      ? await supabaseAdmin.from("template_tarefas").select("*").in("fase_id", faseIds).order("ordem")
      : { data: [] as any[] };
    const template: Template = {
      id: tpl.id,
      nome: tpl.nome,
      prazo_base_dias: tpl.prazo_base_dias,
      descricao: tpl.descricao,
      fases: (fases ?? []).map((f) => ({
        id: f.id,
        template_id: f.template_id,
        nome: f.nome,
        ordem: f.ordem,
        tarefas: (ttarefas ?? []).filter((tt) => tt.fase_id === f.id).map((tt) => ({
          id: tt.id,
          fase_id: tt.fase_id,
          titulo: tt.titulo,
          duracao_dias: tt.duracao_dias,
          tipo_prazo: tt.tipo_prazo as TipoPrazo,
          impacta_prazo: tt.impacta_prazo,
          depende_de_template_tarefa_id: tt.depende_de_template_tarefa_id,
          gerar_apos_conclusao: tt.gerar_apos_conclusao,
          ordem: tt.ordem,
        })),
      })),
    };
    return { template };
  });

// ============================================================
// Templates
// ============================================================

export const createTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { nome: string; prazo_base_dias: number; descricao?: string }) => d)
  .handler(async ({ data }) => {
    const { data: t, error } = await supabaseAdmin
      .from("templates")
      .insert({ nome: data.nome, prazo_base_dias: data.prazo_base_dias, descricao: data.descricao ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return t;
  });

export const updateTemplateMeta = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; nome?: string; prazo_base_dias?: number; descricao?: string }) => d)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin.from("templates").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTemplateFase = createServerFn({ method: "POST" })
  .inputValidator((d: { template_id: string; nome: string; ordem: number }) => d)
  .handler(async ({ data }) => {
    const { data: f, error } = await supabaseAdmin.from("template_fases").insert(data).select().single();
    if (error) throw new Error(error.message);
    return f;
  });

export const updateTemplateFase = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; nome?: string; ordem?: number }) => d)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin.from("template_fases").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTemplateFase = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("template_fases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const tarefaInputSchema = z.object({
  fase_id: z.string().uuid(),
  titulo: z.string().min(1),
  duracao_dias: z.number().int().min(0),
  tipo_prazo: z.enum(["RELATIVO_AO_INICIO", "RELATIVO_A_CONCLUSAO_DE_TAREFA"]),
  impacta_prazo: z.boolean(),
  depende_de_template_tarefa_id: z.string().uuid().nullable(),
  gerar_apos_conclusao: z.boolean(),
  ordem: z.number().int().default(0),
});

export const addTemplateTarefa = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tarefaInputSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: t, error } = await supabaseAdmin.from("template_tarefas").insert(data).select().single();
    if (error) throw new Error(error.message);
    return t;
  });

export const updateTemplateTarefa = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).merge(tarefaInputSchema.partial()).parse(d))
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin.from("template_tarefas").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTemplateTarefa = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("template_tarefas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Serviços
// ============================================================

async function criarServicoFromTemplateCore(data: {
  empresa_id: string;
  template_id: string;
  data_inicial: string;
  processo_id?: string | null;
}) {
    // Carrega template
    const { data: tpl, error: tplErr } = await supabaseAdmin
      .from("templates").select("*").eq("id", data.template_id).single();
    if (tplErr || !tpl) throw new Error(tplErr?.message ?? "Template não encontrado");

    const { data: fases } = await supabaseAdmin
      .from("template_fases").select("*").eq("template_id", tpl.id).order("ordem");
    const faseIds = (fases ?? []).map((f) => f.id);
    const { data: ttarefas } = faseIds.length
      ? await supabaseAdmin.from("template_tarefas").select("*").in("fase_id", faseIds).order("ordem")
      : { data: [] as any[] };

    const dataPrevistaBase = toISODate(addDays(parseISO(data.data_inicial), tpl.prazo_base_dias));

    // Cria serviço
    const { data: srv, error: srvErr } = await supabaseAdmin.from("servicos").insert({
      empresa_id: data.empresa_id,
      processo_id: data.processo_id ?? null,
      template_id: tpl.id,
      nome: tpl.nome,
      data_inicial: data.data_inicial,
      prazo_base_dias: tpl.prazo_base_dias,
      data_prevista_base: dataPrevistaBase,
      data_prevista_atual: dataPrevistaBase,
      status: "em_andamento",
    } as any).select().single();
    if (srvErr || !srv) throw new Error(srvErr?.message ?? "Falha ao criar serviço");


    // Cria tarefas mapeando ids
    const idMap = new Map<string, string>();
    for (const tt of ttarefas ?? []) idMap.set(tt.id, crypto.randomUUID());

    const faseNomeById = new Map((fases ?? []).map((f) => [f.id, f.nome]));

    const rows = (ttarefas ?? []).map((tt, idx) => {
      const id = idMap.get(tt.id)!;
      const dependeId = tt.depende_de_template_tarefa_id ? (idMap.get(tt.depende_de_template_tarefa_id) ?? null) : null;
      const status: "pendente" | "bloqueada" = tt.gerar_apos_conclusao ? "bloqueada" : dependeId ? "bloqueada" : "pendente";
      return {
        id,
        servico_id: srv.id,
        titulo: tt.titulo,
        fase_nome: faseNomeById.get(tt.fase_id) ?? "",
        duracao_dias: tt.duracao_dias,
        tipo_prazo: tt.tipo_prazo,
        impacta_prazo: tt.impacta_prazo,
        depende_de_servico_tarefa_id: dependeId,
        gerar_apos_conclusao: tt.gerar_apos_conclusao,
        status,
        data_prevista: null,
        data_conclusao: null,
        template_tarefa_id: tt.id,
        ordem: idx,
      };
    });


    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from("servico_tarefas").insert(rows);
      if (error) throw new Error(error.message);
    }

    // Recalcula datas
    await recalcAndPersist(srv.id);

    return { id: srv.id };
}

export const criarServicoFromTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { empresa_id: string; template_id: string; data_inicial: string; processo_id?: string | null }) => d)
  .handler(async ({ data }) => {
    return criarServicoFromTemplateCore(data);
  });

export const criarServicosFromTemplateBatch = createServerFn({ method: "POST" })
  .inputValidator((d: { empresa_ids: string[]; template_id: string; data_inicial: string; processo_id?: null }) => d)
  .handler(async ({ data }) => {
    const empresaIds = Array.from(new Set(data.empresa_ids.filter(Boolean)));
    if (empresaIds.length === 0) throw new Error("Selecione ao menos uma empresa.");

    const created = [];
    for (const empresa_id of empresaIds) {
      const result = await criarServicoFromTemplateCore({
        empresa_id,
        template_id: data.template_id,
        data_inicial: data.data_inicial,
        processo_id: null,
      });
      created.push(result.id);
    }

    return { ids: created };
  });

export const deleteServico = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("servicos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const concluirTarefa = createServerFn({ method: "POST" })
  .inputValidator((d: { servico_id: string; tarefa_id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("servico_tarefas")
      .update({ status: "concluida", data_conclusao: toISODate(new Date()) })
      .eq("id", data.tarefa_id)
      .eq("status", "pendente");
    if (error) throw new Error(error.message);
    await recalcAndPersist(data.servico_id);
    return { ok: true };
  });

export const reabrirTarefa = createServerFn({ method: "POST" })
  .inputValidator((d: { servico_id: string; tarefa_id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("servico_tarefas")
      .update({ status: "pendente", data_conclusao: null })
      .eq("id", data.tarefa_id)
      .eq("status", "concluida");
    if (error) throw new Error(error.message);
    await recalcAndPersist(data.servico_id);
    return { ok: true };
  });

export const cancelarTarefa = createServerFn({ method: "POST" })
  .inputValidator((d: { servico_id: string; tarefa_id: string }) => d)
  .handler(async ({ data }) => {
    const { data: tarefas, error } = await supabaseAdmin
      .from("servico_tarefas")
      .select("id,depende_de_servico_tarefa_id,status")
      .eq("servico_id", data.servico_id);
    if (error) throw new Error(error.message);

    const idsParaCancelar = new Set<string>([data.tarefa_id]);
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const tarefa of tarefas ?? []) {
        if (
          tarefa.depende_de_servico_tarefa_id &&
          idsParaCancelar.has(tarefa.depende_de_servico_tarefa_id) &&
          !idsParaCancelar.has(tarefa.id)
        ) {
          idsParaCancelar.add(tarefa.id);
          mudou = true;
        }
      }
    }

    const ids = (tarefas ?? [])
      .filter((tarefa) => idsParaCancelar.has(tarefa.id) && tarefa.status !== "concluida")
      .map((tarefa) => tarefa.id);

    if (ids.length === 0) {
      await recalcAndPersist(data.servico_id);
      return { ok: true, tarefasCanceladas: 0 };
    }

    const { error: updateError } = await supabaseAdmin
      .from("servico_tarefas")
      .update({ status: "concluida", data_conclusao: CANCELLED_TASK_DATE, impacta_prazo: false })
      .in("id", ids);
    if (updateError) throw new Error(updateError.message);

    await recalcAndPersist(data.servico_id);
    return { ok: true, tarefasCanceladas: ids.length };
  });

export const extendTarefaDias = createServerFn({ method: "POST" })
  .inputValidator((d: { servico_id: string; tarefa_id: string; dias_extras: number }) => d)
  .handler(async ({ data }) => {
    const { data: t, error } = await supabaseAdmin
      .from("servico_tarefas").select("duracao_dias").eq("id", data.tarefa_id).single();
    if (error || !t) throw new Error(error?.message ?? "Tarefa não encontrada");
    const { error: e2 } = await supabaseAdmin
      .from("servico_tarefas")
      .update({ duracao_dias: t.duracao_dias + data.dias_extras })
      .eq("id", data.tarefa_id);
    if (e2) throw new Error(e2.message);
    await recalcAndPersist(data.servico_id);
    return { ok: true };
  });

const tarefaServicoInput = z.object({
  servico_id: z.string().uuid(),
  titulo: z.string().min(1),
  fase_nome: z.string().min(1),
  duracao_dias: z.number().int().min(0),
  tipo_prazo: z.enum(["RELATIVO_AO_INICIO", "RELATIVO_A_CONCLUSAO_DE_TAREFA"]),
  impacta_prazo: z.boolean(),
  depende_de_servico_tarefa_id: z.string().uuid().nullable(),
  gerar_apos_conclusao: z.boolean(),
});

export const adicionarTarefaServico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tarefaServicoInput.parse(d))
  .handler(async ({ data }) => {
    const status = data.gerar_apos_conclusao ? "bloqueada" : data.depende_de_servico_tarefa_id ? "bloqueada" : "pendente";
    const { error } = await supabaseAdmin.from("servico_tarefas").insert({ ...data, status, ordem: 999 });
    if (error) throw new Error(error.message);
    await recalcAndPersist(data.servico_id);
    return { ok: true };
  });

export const editarTarefaServico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).merge(tarefaServicoInput.partial()).parse(d))
  .handler(async ({ data }) => {
    const { id, servico_id, ...rest } = data;
    const { error } = await supabaseAdmin.from("servico_tarefas").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    if (servico_id) await recalcAndPersist(servico_id);
    return { ok: true };
  });

export const deleteTarefaServico = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; servico_id: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("servico_tarefas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await recalcAndPersist(data.servico_id);
    return { ok: true };
  });

// ============================================================
// Helpers
// ============================================================

async function recalcAndPersist(servicoId: string) {
  const { data: srv } = await supabaseAdmin.from("servicos").select("*").eq("id", servicoId).single();
  if (!srv) return;
  const { data: tarefas } = await supabaseAdmin.from("servico_tarefas").select("*").eq("servico_id", servicoId);

  const recalc = recalcularServico({
    id: srv.id,
    empresa_id: srv.empresa_id,
    template_id: srv.template_id,
    nome: srv.nome,
    data_inicial: srv.data_inicial,
    prazo_base_dias: srv.prazo_base_dias,
    data_prevista_base: srv.data_prevista_base,
    data_prevista_atual: srv.data_prevista_atual,
    status: srv.status,
    tarefas: (tarefas ?? []).map((t) => ({
      id: t.id,
      servico_id: t.servico_id,
      titulo: t.titulo,
      fase_nome: t.fase_nome,
      duracao_dias: t.duracao_dias,
      tipo_prazo: t.tipo_prazo as TipoPrazo,
      impacta_prazo: t.impacta_prazo,
      depende_de_servico_tarefa_id: t.depende_de_servico_tarefa_id,
      gerar_apos_conclusao: t.gerar_apos_conclusao,
      status: toAppTaskStatus(t),
      data_prevista: t.data_prevista,
      data_conclusao: toAppCompletionDate(t),
      template_tarefa_id: t.template_tarefa_id,
      ordem: t.ordem,
    })),
  });

  await supabaseAdmin.from("servicos").update({
    data_prevista_atual: recalc.data_prevista_atual,
    status: recalc.status,
  }).eq("id", servicoId);

  for (const t of recalc.tarefas) {
    await supabaseAdmin.from("servico_tarefas").update(toDbTaskPatch(t)).eq("id", t.id);
  }
}
