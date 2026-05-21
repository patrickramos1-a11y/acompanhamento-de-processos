import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


type Row = Record<string, unknown>;

function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function normKey(v: unknown): string {
  return norm(v).toLowerCase();
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = norm(v);
  if (!s) return null;
  // dd/MM/yyyy or dd/MM/yyyy HH:mm:ss
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function mapStatus(raw: unknown): "ativo" | "concluido" | "cancelado" | "suspenso" {
  const s = normKey(raw)
    .replace(/[áàâã]/g, "a")
    .replace(/[éê]/g, "e")
    .replace(/[í]/g, "i")
    .replace(/[óôõ]/g, "o")
    .replace(/[ú]/g, "u");
  if (s.includes("deferido") && !s.includes("indeferido")) return "concluido";
  if (s.includes("reprovado") || s.includes("indeferido")) return "cancelado";
  if (s.includes("notificado") || s.includes("suspenso")) return "suspenso";
  // ANALISE_ORGAO / Em análise pela Ramos / Em análise pelo órgão → ativo
  return "ativo";
}

function normNome(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const importProcessos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Arquivo inválido");
    }
    const file = input.get("file");
    if (!(file instanceof File)) {
      throw new Error("Arquivo não enviado");
    }
    return { file };
  })
  .handler(async ({ data }) => {
    const XLSX = await import("xlsx");
    const bin = Buffer.from(await data.file.arrayBuffer());
    const wb = XLSX.read(bin, { type: "buffer", cellDates: true });
    const sheetName =
      wb.SheetNames.find((n) => n.toLowerCase() === "data") ?? wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null });

    const erros: { linha: number; mensagem: string }[] = [];
    let processosCriados = 0;
    let processosAtualizados = 0;
    let empresasCriadas = 0;
    let gruposCriados = 0;
    let tiposCriados = 0;

    // pre-load existentes
    const [{ data: gruposDb }, { data: empresasDb }, { data: tiposDb }] =
      await Promise.all([
        supabaseAdmin.from("grupos_empresariais").select("id,nome"),
        supabaseAdmin.from("empresas").select("id,nome,grupo_id"),
        supabaseAdmin.from("tipos_processo").select("id,nome"),
      ]);

    const grupoCache = new Map<string, string>(
      (gruposDb ?? []).map((g) => [normKey(g.nome), g.id]),
    );
    const empresaCache = new Map<string, { id: string; grupo_id: string | null }>(
      (empresasDb ?? []).map((e) => [normKey(e.nome), { id: e.id, grupo_id: e.grupo_id }]),
    );
    const tipoCache = new Map<string, string>(
      (tiposDb ?? []).map((t) => [normKey(t.nome), t.id]),
    );

    async function getOrCreateGrupo(nome: string): Promise<string | null> {
      const n = norm(nome);
      if (!n || normKey(n) === "undefined") return null;
      const k = normKey(n);
      if (grupoCache.has(k)) return grupoCache.get(k)!;
      const { data: created, error } = await supabaseAdmin
        .from("grupos_empresariais")
        .insert({ nome: n })
        .select("id")
        .single();
      if (error || !created) throw new Error(`grupo "${n}": ${error?.message}`);
      grupoCache.set(k, created.id);
      gruposCriados++;
      return created.id;
    }

    async function getOrCreateEmpresa(
      nome: string,
      grupoId: string | null,
    ): Promise<string> {
      const n = norm(nome);
      const k = normKey(n);
      if (empresaCache.has(k)) {
        const ex = empresaCache.get(k)!;
        if (grupoId && !ex.grupo_id) {
          await supabaseAdmin.from("empresas").update({ grupo_id: grupoId }).eq("id", ex.id);
          ex.grupo_id = grupoId;
        }
        return ex.id;
      }
      const { data: created, error } = await supabaseAdmin
        .from("empresas")
        .insert({ nome: n, grupo_id: grupoId })
        .select("id,grupo_id")
        .single();
      if (error || !created) throw new Error(`empresa "${n}": ${error?.message}`);
      empresaCache.set(k, { id: created.id, grupo_id: created.grupo_id });
      empresasCriadas++;
      return created.id;
    }

    async function getOrCreateTipo(nome: string): Promise<string> {
      let n = norm(nome);
      if (!n || normKey(n) === "undefined") n = "Outros";
      const k = normKey(n);
      if (tipoCache.has(k)) return tipoCache.get(k)!;
      const { data: created, error } = await supabaseAdmin
        .from("tipos_processo")
        .insert({ nome: n })
        .select("id")
        .single();
      if (error || !created) throw new Error(`tipo "${n}": ${error?.message}`);
      tipoCache.set(k, created.id);
      tiposCriados++;
      return created.id;
    }

    for (let i = 0; i < rows.length; i++) {
      const linha = i + 2; // header + 1
      const row = rows[i];
      try {
        const empresaNome = norm(row["Empresa"]);
        if (!empresaNome) {
          erros.push({ linha, mensagem: "Empresa vazia" });
          continue;
        }
        const grupoId = await getOrCreateGrupo(norm(row["Grupo Empresarial"]));
        const empresaId = await getOrCreateEmpresa(empresaNome, grupoId);
        const tipoId = await getOrCreateTipo(norm(row["Tipo de Processo"]));

        const numero = norm(row["Nº do Processo"]) || norm(row["N° do Processo"]) || null;
        const nomeBruto = norm(row["Nome"]);
        const nome =
          nomeBruto ||
          numero ||
          `${norm(row["Tipo de Processo"]) || "Processo"} — ${empresaNome}`;
        const dataProtocolo = parseDate(row["Data do Protocolo"]);
        const status = mapStatus(row["Status"]);
        const statusDetalhado = norm(row["Status"]) || null;
        const responsavel = norm(row["Responsável"]) || null;

        // upsert por (empresa_id, numero_protocolo) se houver, senão por (empresa_id, nome)
        let existingId: string | null = null;
        if (numero) {
          const { data: ex } = await supabaseAdmin
            .from("processos")
            .select("id")
            .eq("empresa_id", empresaId)
            .eq("numero_protocolo", numero)
            .maybeSingle();
          existingId = ex?.id ?? null;
        } else {
          const { data: ex } = await supabaseAdmin
            .from("processos")
            .select("id")
            .eq("empresa_id", empresaId)
            .eq("nome", nome)
            .is("numero_protocolo", null)
            .maybeSingle();
          existingId = ex?.id ?? null;
        }

        const payload = {
          empresa_id: empresaId,
          tipo_processo_id: tipoId,
          nome,
          numero_protocolo: numero,
          data_protocolo: dataProtocolo,
          status,
          status_detalhado: statusDetalhado,
          responsavel,
        };

        if (existingId) {
          const { error } = await supabaseAdmin
            .from("processos")
            .update(payload)
            .eq("id", existingId);
          if (error) throw new Error(error.message);
          processosAtualizados++;
        } else {
          const { error } = await supabaseAdmin.from("processos").insert(payload);
          if (error) throw new Error(error.message);
          processosCriados++;
        }
      } catch (e: any) {
        erros.push({ linha, mensagem: e?.message ?? String(e) });
      }
    }

    return {
      totalLinhas: rows.length,
      processosCriados,
      processosAtualizados,
      empresasCriadas,
      gruposCriados,
      tiposCriados,
      erros,
    };
  });

export const importAcompanhamentos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("Arquivo inválido");
    const file = input.get("file");
    if (!(file instanceof File)) throw new Error("Arquivo não enviado");
    return { file };
  })
  .handler(async ({ data }) => {
    const XLSX = await import("xlsx");
    const bin = Buffer.from(await data.file.arrayBuffer());
    const wb = XLSX.read(bin, { type: "buffer", cellDates: true });
    const sheetName =
      wb.SheetNames.find((n) => n.toLowerCase() === "data") ?? wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null });

    const erros: { linha: number; mensagem: string }[] = [];
    let tramitacoesCriadas = 0;
    let tramitacoesIgnoradas = 0;

    // pre-load empresas, processos, tipos
    const [{ data: empresasDb }, { data: tiposDb }, { data: processosDb }] =
      await Promise.all([
        supabaseAdmin.from("empresas").select("id,nome"),
        supabaseAdmin.from("tipos_processo").select("id,nome"),
        supabaseAdmin
          .from("processos")
          .select("id,nome,numero_protocolo,empresa_id,tipo_processo_id"),
      ]);

    const empresaPorNome = new Map<string, string>();
    for (const e of empresasDb ?? []) empresaPorNome.set(normNome(e.nome), e.id);

    const tipoPorNome = new Map<string, string>();
    for (const t of tiposDb ?? []) tipoPorNome.set(normNome(t.nome), t.id);

    type Proc = {
      id: string;
      nome: string;
      numero_protocolo: string | null;
      empresa_id: string;
      tipo_processo_id: string;
    };
    const procsPorEmpresa = new Map<string, Proc[]>();
    for (const p of (processosDb ?? []) as Proc[]) {
      if (!procsPorEmpresa.has(p.empresa_id)) procsPorEmpresa.set(p.empresa_id, []);
      procsPorEmpresa.get(p.empresa_id)!.push(p);
    }

    function findProcesso(
      empresaId: string,
      numero: string,
      tipoId: string | null,
    ): Proc | null {
      const lista = procsPorEmpresa.get(empresaId) ?? [];
      const numK = normNome(numero);
      if (numK) {
        const byNum = lista.find(
          (p) => p.numero_protocolo && normNome(p.numero_protocolo) === numK,
        );
        if (byNum) return byNum;
        const byNome = lista.find((p) => normNome(p.nome) === numK);
        if (byNome) return byNome;
      }
      if (tipoId) {
        const sameTipo = lista.filter((p) => p.tipo_processo_id === tipoId);
        if (sameTipo.length === 1) return sameTipo[0];
      }
      return null;
    }

    // dedup: carrega tramitações existentes por processo
    const tramExistentes = new Map<string, Set<string>>();
    {
      const { data: tramsDb } = await supabaseAdmin
        .from("tramitacoes")
        .select("processo_id,data_evento,descricao");
      for (const t of tramsDb ?? []) {
        const key = `${t.data_evento}::${(t.descricao ?? "").slice(0, 200)}`;
        if (!tramExistentes.has(t.processo_id)) tramExistentes.set(t.processo_id, new Set());
        tramExistentes.get(t.processo_id)!.add(key);
      }
    }

    const hoje = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < rows.length; i++) {
      const linha = i + 2;
      const row = rows[i];
      try {
        const empresaNome = norm(row["Empresa"]);
        if (!empresaNome) {
          erros.push({ linha, mensagem: "Empresa vazia" });
          continue;
        }
        const empresaId = empresaPorNome.get(normNome(empresaNome));
        if (!empresaId) {
          erros.push({ linha, mensagem: `Empresa não encontrada: "${empresaNome}"` });
          continue;
        }

        const tipoNome = norm(row["Tipo de processo"]) || norm(row["Tipo de Processo"]);
        const tipoId = tipoNome ? (tipoPorNome.get(normNome(tipoNome)) ?? null) : null;

        const numero =
          norm(row["Nº do processo"]) ||
          norm(row["Nº do Processo"]) ||
          norm(row["N° do Processo"]);

        const proc = findProcesso(empresaId, numero, tipoId);
        if (!proc) {
          erros.push({
            linha,
            mensagem: `Processo não encontrado para "${empresaNome}" / "${numero || tipoNome || "-"}"`,
          });
          continue;
        }

        const descricao = norm(row["Descrição"]) || norm(row["Descricao"]);
        if (!descricao) {
          erros.push({ linha, mensagem: "Descrição vazia" });
          continue;
        }

        const dataEvento = parseDate(row["Data"]) ?? hoje;
        const responsavel = norm(row["Responsável"]) || norm(row["Responsavel"]) || null;
        const status = mapStatus(row["Status"]);

        const dedupKey = `${dataEvento}::${descricao.slice(0, 200)}`;
        const set = tramExistentes.get(proc.id);
        if (set?.has(dedupKey)) {
          tramitacoesIgnoradas++;
          continue;
        }

        const { error } = await supabaseAdmin.from("tramitacoes").insert({
          processo_id: proc.id,
          descricao,
          data_evento: dataEvento,
          responsavel,
          status_no_momento: status,
          setor_orgao: null,
          etapa_id: null,
        });
        if (error) throw new Error(error.message);

        if (!set) tramExistentes.set(proc.id, new Set([dedupKey]));
        else set.add(dedupKey);

        // atualiza status do processo conforme a tramitação importada
        await supabaseAdmin
          .from("processos")
          .update({ status, atualizado_em: new Date().toISOString() })
          .eq("id", proc.id);

        tramitacoesCriadas++;
      } catch (e: any) {
        erros.push({ linha, mensagem: e?.message ?? String(e) });
      }
    }

    return {
      totalLinhas: rows.length,
      tramitacoesCriadas,
      tramitacoesIgnoradas,
      erros,
    };
  });
