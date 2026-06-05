import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/dashboard.functions";
import {
  getServicosData,
  getServicosByProcesso,
  criarServicoFromTemplate,
  concluirTarefa,
  reabrirTarefa,
} from "@/lib/servicos.functions";
import { useMemo, useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MultiSelect } from "@/components/multi-select";
import { AppHeader } from "@/components/app-header";

import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Search,
  Clock,
  Settings,
  ClipboardList,
  ListPlus,
  Loader2,
  ExternalLink,
} from "lucide-react";


const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboard(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Acompanhamento de Processos" },
      {
        name: "description",
        content:
          "Painel de acompanhamento de processos administrativos junto a órgãos públicos: licenças, alvarás, anuências e tramitações.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: Painel,
});

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
  suspenso: "Suspenso",
};

const STATUS_CLASS: Record<string, string> = {
  ativo: "bg-info/15 text-info border-info/30",
  concluido: "bg-success/15 text-success border-success/30",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
  suspenso: "bg-warning/15 text-warning-foreground border-warning/40",
};

function statusToTone(status: string): "info" | "success" | "warning" | "destructive" {
  if (status === "concluido") return "success";
  if (status === "suspenso") return "warning";
  if (status === "cancelado") return "destructive";
  return "info";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function Painel() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { empresas, grupos, tipos, etapas, processos, tramitacoes } = data;

  const [search, setSearch] = useState("");
  const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");
  const anoAtual = String(new Date().getFullYear());
  const [empresaFiltro, setEmpresaFiltro] = useState<string[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<string[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([]);
  const [responsavelFiltro, setResponsavelFiltro] = useState<string[]>([]);
  const [mesFiltro, setMesFiltro] = useState<string[]>([mesAtual]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([anoAtual]);

  const [empresaModal, setEmpresaModal] = useState<string | null>(null);
  const [processoModal, setProcessoModal] = useState<string | null>(null);
  const [criarTarefaProcesso, setCriarTarefaProcesso] = useState<string | null>(null);
  const [modalStatusFiltro, setModalStatusFiltro] = useState<string>("");



  const empresaMap = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas]);
  const grupoMap = useMemo(() => new Map(grupos.map((g) => [g.id, g])), [grupos]);
  const tipoMap = useMemo(() => new Map(tipos.map((t) => [t.id, t])), [tipos]);
  const etapaMap = useMemo(() => new Map(etapas.map((e) => [e.id, e])), [etapas]);
  const etapasByTipo = useMemo(() => {
    const m = new Map<string, typeof etapas>();
    for (const e of etapas) {
      if (!m.has(e.tipo_processo_id)) m.set(e.tipo_processo_id, []);
      m.get(e.tipo_processo_id)!.push(e);
    }
    return m;
  }, [etapas]);

  const ultimaPorProcesso = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tramitacoes) {
      if (!m.has(t.processo_id)) m.set(t.processo_id, t.data_evento);
    }
    return m;
  }, [tramitacoes]);

  const isParado = (p: (typeof processos)[number]) => {
    if (p.status !== "ativo") return false;
    const ultima = ultimaPorProcesso.get(p.id) ?? p.data_protocolo;
    if (!ultima) return false;
    return differenceInDays(new Date(), parseISO(ultima)) > 30;
  };

  const kpis = useMemo(() => {
    const total = processos.length;
    const ativos = processos.filter((p) => p.status === "ativo").length;
    const concluidos = processos.filter((p) => p.status === "concluido").length;
    const parados = processos.filter(isParado).length;
    return { total, ativos, concluidos, parados };
  }, [processos, ultimaPorProcesso]);

  const responsaveis = useMemo(() => {
    const s = new Set<string>();
    for (const p of processos) if (p.responsavel) s.add(p.responsavel);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [processos]);

  const anos = useMemo(() => {
    const s = new Set<string>();
    for (const p of processos) if (p.data_protocolo) s.add(p.data_protocolo.slice(0, 4));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [processos]);

  const statusDetalhadoOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of processos) {
      const v = p.status_detalhado?.trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [processos]);

  const processosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return processos.filter((p) => {
      if (empresaFiltro.length && !empresaFiltro.includes(p.empresa_id)) return false;
      if (statusFiltro.length) {
        const sd = p.status_detalhado?.trim() ?? "";
        if (!statusFiltro.includes(sd)) return false;
      }
      if (tipoFiltro.length && !tipoFiltro.includes(p.tipo_processo_id)) return false;
      if (responsavelFiltro.length && (!p.responsavel || !responsavelFiltro.includes(p.responsavel))) return false;
      if (anoFiltro.length) {
        if (!p.data_protocolo || !anoFiltro.includes(p.data_protocolo.slice(0, 4))) return false;
      }
      if (mesFiltro.length) {
        if (!p.data_protocolo || !mesFiltro.includes(p.data_protocolo.slice(5, 7))) return false;
      }

      if (q) {
        const empresa = empresaMap.get(p.empresa_id)?.nome ?? "";
        const hay = `${p.nome} ${p.numero_protocolo ?? ""} ${empresa} ${p.responsavel ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [processos, search, empresaFiltro, statusFiltro, tipoFiltro, responsavelFiltro, mesFiltro, anoFiltro, empresaMap]);

  const porEmpresa = useMemo(() => {
    return empresas
      .map((e) => {
        const procs = processosFiltrados.filter((p) => p.empresa_id === e.id);
        const concluidos = procs.filter((p) => p.status === "concluido").length;
        // Agrupa por status_detalhado (apenas os que vieram da planilha)
        const detalheMap = new Map<string, { label: string; value: number; status: string }>();
        for (const p of procs) {
          const label = p.status_detalhado?.trim();
          if (!label) continue;
          const key = `${p.status}::${label}`;
          const cur = detalheMap.get(key);
          if (cur) cur.value += 1;
          else detalheMap.set(key, { label, value: 1, status: p.status });
        }
        const detalhes = Array.from(detalheMap.values()).sort((a, b) => b.value - a.value);
        return {
          empresa: e,
          grupo: e.grupo_id ? grupoMap.get(e.grupo_id) : null,
          total: procs.length,
          concluidos,
          parados: procs.filter(isParado).length,
          detalhes,
        };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [empresas, processosFiltrados, grupoMap, ultimaPorProcesso]);

  const ultimasTramitacoes = useMemo(() => {
    const ids = new Set(processosFiltrados.map((p) => p.id));
    return tramitacoes.filter((t) => ids.has(t.processo_id)).slice(0, 12);
  }, [tramitacoes, processosFiltrados]);



  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        current="painel"
        eyebrow="Painel Institucional"
        title="Acompanhamento de Processos"
        subtitle="Licenças, alvarás, anuências e tramitações junto a órgãos públicos"
        icon={<FileText className="h-5 w-5" />}
      />


      <main className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
        {/* KPIs */}
        <section className="grid animate-fade-in gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <KPI icon={<FileText />} label="Total de processos" value={kpis.total} tone="default" />
          <KPI icon={<Activity />} label="Em andamento" value={kpis.ativos} tone="info" total={kpis.total} />
          <KPI icon={<CheckCircle2 />} label="Concluídos" value={kpis.concluidos} tone="success" total={kpis.total} />
          <KPI
            icon={<AlertTriangle />}
            label="Parados há mais de 30 dias"
            value={kpis.parados}
            tone="warning"
            total={kpis.total}
          />
        </section>

        {/* Filtros globais (cards + tabela) */}
        <section className="animate-fade-in-up">
          <div className="glass grid gap-2 rounded-xl p-2 shadow-sm sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
            <div className="relative w-full sm:min-w-[240px] sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome do cliente, protocolo, empresa..."
                className="h-9 w-full rounded-lg border border-input/60 bg-background/70 pl-9 pr-3 text-xs outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <MultiSelect
              label="Todas as empresas"
              searchPlaceholder="Buscar empresa..."
              options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
              selected={empresaFiltro}
              onChange={setEmpresaFiltro}
            />
            <MultiSelect
              label="Todos os tipos"
              searchPlaceholder="Buscar tipo..."
              options={tipos.map((t) => ({ value: t.id, label: t.nome }))}
              selected={tipoFiltro}
              onChange={setTipoFiltro}
            />
            <MultiSelect
              label="Todos os status"
              searchPlaceholder="Buscar status..."
              options={statusDetalhadoOptions.map((s) => ({ value: s, label: s }))}
              selected={statusFiltro}
              onChange={setStatusFiltro}
            />
            <MultiSelect
              label="Todos os responsáveis"
              searchPlaceholder="Buscar responsável..."
              options={responsaveis.map((r) => ({ value: r, label: r }))}
              selected={responsavelFiltro}
              onChange={setResponsavelFiltro}
            />
            <MultiSelect
              label="Todos os meses"
              searchPlaceholder="Buscar mês..."
              options={[
                ["01", "Janeiro"], ["02", "Fevereiro"], ["03", "Março"], ["04", "Abril"],
                ["05", "Maio"], ["06", "Junho"], ["07", "Julho"], ["08", "Agosto"],
                ["09", "Setembro"], ["10", "Outubro"], ["11", "Novembro"], ["12", "Dezembro"],
              ].map(([v, l]) => ({ value: v, label: l }))}
              selected={mesFiltro}
              onChange={setMesFiltro}
            />
            <MultiSelect
              label="Todos os anos"
              searchPlaceholder="Buscar ano..."
              options={anos.map((a) => ({ value: a, label: a }))}
              selected={anoFiltro}
              onChange={setAnoFiltro}
            />
            {(search ||
              empresaFiltro.length ||
              tipoFiltro.length ||
              statusFiltro.length ||
              responsavelFiltro.length ||
              mesFiltro.join(",") !== mesAtual ||
              anoFiltro.join(",") !== anoAtual) && (
              <button
                onClick={() => {
                  setSearch("");
                  setEmpresaFiltro([]);
                  setTipoFiltro([]);
                  setStatusFiltro([]);
                  setResponsavelFiltro([]);
                  setMesFiltro([mesAtual]);
                  setAnoFiltro([anoAtual]);
                }}
                className="h-9 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </section>

        {/* Empresas */}
        <section className="animate-fade-in-up">
          <SectionTitle icon={<Building2 className="h-4 w-4" />} title={`Empresas (${porEmpresa.length})`} />
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {porEmpresa.length === 0 && (
              <div className="surface-card col-span-full rounded-2xl px-6 py-10 text-center text-sm text-muted-foreground">
                Nenhuma empresa encontrada com os filtros aplicados.
              </div>
            )}
            {porEmpresa.map((row) => {
              const pctConcluido = row.total ? (row.concluidos / row.total) * 100 : 0;
              const initial = row.empresa.nome.trim().charAt(0).toUpperCase();
              return (
                <button
                  key={row.empresa.id}
                  onClick={() => { setEmpresaModal(row.empresa.id); setModalStatusFiltro(""); }}
                  className="group surface-elevated relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-lg)] sm:p-5"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-accent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow font-display text-sm font-bold text-primary-foreground shadow-sm sm:h-11 sm:w-11 sm:text-base">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 break-words font-display text-[15px] font-semibold leading-tight text-card-foreground sm:text-base">
                        {row.empresa.nome}
                      </h3>
                      {row.grupo && (
                        <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-muted-foreground sm:text-xs">
                          {row.grupo.nome}
                        </p>
                      )}
                    </div>
                    {row.parados > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-warning/40 bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground sm:px-2">
                        <AlertTriangle className="h-3 w-3" />
                        {row.parados}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:gap-2">
                    <PillMetric label="Total" value={row.total} tone="total" />
                    {row.detalhes.map((d) => (
                      <PillMetric
                        key={d.label}
                        label={d.label}
                        value={d.value}
                        tone={statusToTone(d.status)}
                      />
                    ))}
                  </div>
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>Conclusão</span>
                      <span className="font-display text-sm font-bold text-primary">{Math.round(pctConcluido)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-success to-primary transition-all duration-500"
                        style={{ width: `${pctConcluido}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Processos table */}
        <section className="animate-fade-in-up">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              icon={<FileText className="h-4 w-4" />}
              title={`Processos (${processosFiltrados.length})`}
            />
          </div>



          <div className="surface-elevated overflow-hidden rounded-2xl">
            {/* Mobile: cards */}
            <div className="md:hidden">
              <div className="max-h-[640px] divide-y divide-border/60 overflow-auto">
                {processosFiltrados.length === 0 && (
                  <div className="px-4 py-14 text-center text-sm text-muted-foreground">
                    Nenhum processo encontrado com os filtros aplicados.
                  </div>
                )}
                {processosFiltrados.map((p) => {
                  const empresa = empresaMap.get(p.empresa_id);
                  const tipo = tipoMap.get(p.tipo_processo_id);
                  const etapaAtual = p.etapa_atual_id ? etapaMap.get(p.etapa_atual_id) : null;
                  const etapasDoTipo = etapasByTipo.get(p.tipo_processo_id) ?? [];
                  const idxAtual = etapaAtual
                    ? etapasDoTipo.findIndex((e) => e.id === etapaAtual.id)
                    : -1;
                  const total = etapasDoTipo.length;
                  const progresso =
                    p.status === "concluido"
                      ? 100
                      : total > 0 && idxAtual >= 0
                        ? ((idxAtual + 1) / total) * 100
                        : 0;
                  const parado = isParado(p);
                  return (
                    <div key={p.id} className="space-y-2 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium text-card-foreground">{empresa?.nome ?? "—"}</p>
                            {parado && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{p.nome}</p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[p.status]}`}
                        >
                          {p.status_detalhado ?? STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {tipo?.nome && <span className="truncate">{tipo.nome}</span>}
                        {p.numero_protocolo && <span className="font-mono">#{p.numero_protocolo}</span>}
                        {p.data_protocolo && <span>{fmtDate(p.data_protocolo)}</span>}
                        {p.responsavel && <span>{p.responsavel}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progresso}%`,
                              background:
                                p.status === "concluido"
                                  ? "var(--success)"
                                  : etapaAtual?.cor ?? "var(--primary)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                          {idxAtual >= 0 && total > 0
                            ? `${idxAtual + 1}/${total}`
                            : p.status === "concluido"
                              ? `${total}/${total}`
                              : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop/tablet: table */}
            <div className="hidden max-h-[640px] overflow-auto md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gradient-hero text-sidebar-foreground">
                  <tr className="text-left">
                    <Th>Empresa</Th>
                    <Th>Tipo</Th>
                    <Th>Processo</Th>
                    <Th>Protocolo</Th>
                    <Th>Data</Th>
                    <Th>Status</Th>
                    <Th>Responsável</Th>
                    <Th>Progresso</Th>
                  </tr>
                </thead>
                <tbody>
                  {processosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center text-sm text-muted-foreground">
                        Nenhum processo encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                  {processosFiltrados.map((p) => {
                    const empresa = empresaMap.get(p.empresa_id);
                    const tipo = tipoMap.get(p.tipo_processo_id);
                    const etapaAtual = p.etapa_atual_id ? etapaMap.get(p.etapa_atual_id) : null;
                    const etapasDoTipo = etapasByTipo.get(p.tipo_processo_id) ?? [];
                    const idxAtual = etapaAtual
                      ? etapasDoTipo.findIndex((e) => e.id === etapaAtual.id)
                      : -1;
                    const total = etapasDoTipo.length;
                    const progresso =
                      p.status === "concluido"
                        ? 100
                        : total > 0 && idxAtual >= 0
                          ? ((idxAtual + 1) / total) * 100
                          : 0;
                    const parado = isParado(p);
                    const dim =
                      p.status === "cancelado" || p.status === "suspenso"
                        ? "opacity-60"
                        : "";
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-border/60 transition-colors hover:bg-accent-soft/40 ${dim}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-card-foreground">
                            {empresa?.nome ?? "—"}
                          </div>
                          {empresa?.grupo_id && (
                            <div className="text-xs text-muted-foreground">
                              {grupoMap.get(empresa.grupo_id)?.nome}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tipo?.nome ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-card-foreground">{p.nome}</span>
                            {parado && (
                              <span title="Sem movimentação há mais de 30 dias">
                                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.numero_protocolo ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {fmtDate(p.data_protocolo)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status]}`}
                          >
                            {p.status_detalhado ?? STATUS_LABEL[p.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.responsavel ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${progresso}%`,
                                  background:
                                    p.status === "concluido"
                                      ? "var(--success)"
                                      : etapaAtual?.cor ?? "var(--primary)",
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                              {idxAtual >= 0 && total > 0
                                ? `${idxAtual + 1}/${total}`
                                : p.status === "concluido"
                                  ? `${total}/${total}`
                                  : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Divisor */}
        <div className="my-2 flex items-center gap-4" aria-hidden="true">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border" />
          <span className="surface-elevated inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent-foreground">
            <Clock className="h-3 w-3" />
            Histórico
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border" />
        </div>

        {/* Últimas tramitações */}
          <section className="surface-elevated animate-fade-in-up rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground shadow-accent-glow">
                <Clock className="h-4 w-4" />
              </div>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  Últimas tramitações
                </h2>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                  {ultimasTramitacoes.length} evento{ultimasTramitacoes.length !== 1 ? "s" : ""} mais recente{ultimasTramitacoes.length !== 1 ? "s" : ""} dos filtros aplicados
                </p>
              </div>
            </div>
          </div>
          <div className="surface-card max-h-[640px] overflow-auto rounded-xl">
            <ul className="divide-y divide-border/60">
              {ultimasTramitacoes.length === 0 && (
                <li className="px-6 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma tramitação para os filtros atuais.
                </li>
              )}
              {ultimasTramitacoes.map((t) => {
                const proc = processos.find((p) => p.id === t.processo_id);
                const empresa = proc ? empresaMap.get(proc.empresa_id) : null;
                const tipo = proc ? tipoMap.get(proc.tipo_processo_id) : null;
                const etapa = t.etapa_id ? etapaMap.get(t.etapa_id) : null;
                const statusAtual = proc?.status;
                const statusLabel = proc?.status_detalhado ?? (statusAtual ? STATUS_TAB_LABEL[statusAtual] ?? statusAtual : null);
                const initial = (empresa?.nome ?? "—").trim().charAt(0).toUpperCase();
                return (
                  <li key={t.id} className="flex gap-3 px-3 py-3.5 transition-colors hover:bg-accent-soft/30 sm:gap-4 sm:px-4">
                    <div className="hidden w-24 shrink-0 flex-col sm:flex">
                      <span className="inline-flex w-fit items-center rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tabular-nums text-accent-foreground">
                        {fmtDate(t.data_evento)}
                      </span>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow font-display text-xs font-bold text-primary-foreground">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-[10px] font-semibold tabular-nums text-accent-foreground sm:hidden">
                        {fmtDate(t.data_evento)}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="break-words font-medium text-card-foreground">
                          {empresa?.nome ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="break-words text-xs text-muted-foreground">{proc?.nome}</span>
                        {tipo && (
                          <span className="inline-flex max-w-full items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {tipo.nome}
                          </span>
                        )}
                        {statusLabel && (
                          <span
                            className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[statusAtual!] ?? ""}`}
                          >
                            {statusLabel}
                          </span>
                        )}
                        {etapa && (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              background: etapa.cor + "1a",
                              color: etapa.cor,
                            }}
                          >
                            {etapa.nome}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{t.descricao}</p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t.responsavel ?? "—"}
                        {t.setor_orgao ? ` · ${t.setor_orgao}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Plataforma de acompanhamento de processos administrativos
        </span>
      </footer>


      <EmpresaProcessosModal
        empresaId={empresaModal}
        onClose={() => setEmpresaModal(null)}
        statusFiltro={modalStatusFiltro}
        setStatusFiltro={setModalStatusFiltro}
        empresas={empresas}
        grupos={grupoMap}
        tipos={tipoMap}
        etapas={etapaMap}
        etapasByTipo={etapasByTipo}
        processos={processos}
        isParado={isParado}
        onAbrirProcesso={(id) => setProcessoModal(id)}
        onCriarTarefa={(id) => setCriarTarefaProcesso(id)}
      />

      <ProcessoTramitacoesModal
        processoId={processoModal}
        onClose={() => setProcessoModal(null)}
        processos={processos}
        empresaMap={empresaMap}
        tipoMap={tipoMap}
        etapaMap={etapaMap}
        tramitacoes={tramitacoes}
      />

      <CriarTarefaModal
        processoId={criarTarefaProcesso}
        processos={processos}
        empresaMap={empresaMap}
        onClose={() => setCriarTarefaProcesso(null)}
      />
    </div>

  );
}


function KPI({
  icon,
  label,
  value,
  tone,
  total,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "default" | "info" | "success" | "warning";
  total?: number;
}) {
  const toneClass = {
    default: "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
  }[tone];
  const barColor = {
    default: "bg-gradient-to-r from-primary to-primary-glow",
    info: "bg-info",
    success: "bg-success",
    warning: "bg-warning",
  }[tone];
  const pct = total && total > 0 ? Math.min(100, (value / total) * 100) : null;
  return (
    <div className="surface-elevated group relative overflow-hidden rounded-2xl p-5 transition-all hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass} shadow-sm`}>
          <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        </div>
      </div>
      <div className="mt-3 font-display text-4xl font-bold tabular-nums leading-none text-foreground">
        {value}
      </div>
      {pct !== null ? (
        <div className="mt-4">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">
            {Math.round(pct)}% do total
          </div>
        </div>
      ) : (
        <div className="mt-4 h-[26px]" />
      )}
    </div>
  );
}

function PillMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "info" | "success" | "warning" | "destructive" | "total";
}) {
  const cls =
    tone === "info"
      ? "bg-info/20 text-info border-info/50 shadow-[0_0_0_1px_hsl(var(--info)/0.1)]"
      : tone === "success"
        ? "bg-success/20 text-success border-success/50 shadow-[0_0_0_1px_hsl(var(--success)/0.1)]"
        : tone === "warning"
          ? "bg-warning/25 text-warning-foreground border-warning/60"
          : tone === "destructive"
            ? "bg-destructive/20 text-destructive border-destructive/50"
            : tone === "total"
              ? "bg-gradient-to-br from-primary/15 to-primary/5 text-primary border-primary/40"
              : "bg-secondary/70 text-foreground border-border";
  const dim = value === 0 ? "opacity-50" : "";
  return (
    <div className={`min-w-0 rounded-lg border px-2 py-1.5 shadow-sm sm:px-2.5 ${cls} ${dim}`}>
      <div className="truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] sm:text-[10px]" title={label}>{label}</div>
      <div className="mt-1 font-display text-base font-bold tabular-nums leading-none sm:text-lg">{value}</div>
    </div>
  );
}


function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">{children}</th>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "info" | "success";
}) {
  const cls =
    tone === "info"
      ? "text-info"
      : tone === "success"
        ? "text-success"
        : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{title}</span>
    </div>
  );
}

const STATUS_TABS = [
  { key: "", label: "Todos" },
  { key: "ativo", label: "Em análise pelo órgão" },
  { key: "concluido", label: "Deferido" },
  { key: "suspenso", label: "Notificado" },
  { key: "cancelado", label: "Reprovado" },
] as const;

const STATUS_TAB_LABEL: Record<string, string> = {
  ativo: "Em análise pelo órgão",
  concluido: "Deferido",
  suspenso: "Notificado",
  cancelado: "Reprovado",
};

function EmpresaProcessosModal({
  empresaId,
  onClose,
  statusFiltro,
  setStatusFiltro,
  empresas,
  grupos,
  tipos,
  etapas,
  etapasByTipo,
  processos,
  isParado,
  onAbrirProcesso,
}: {
  empresaId: string | null;
  onClose: () => void;
  statusFiltro: string;
  setStatusFiltro: (s: string) => void;
  empresas: any[];
  grupos: Map<string, any>;
  tipos: Map<string, any>;
  etapas: Map<string, any>;
  etapasByTipo: Map<string, any[]>;
  processos: any[];
  isParado: (p: any) => boolean;
  onAbrirProcesso: (id: string) => void;
}) {
  const empresa = empresaId ? empresas.find((e) => e.id === empresaId) : null;
  const grupo = empresa?.grupo_id ? grupos.get(empresa.grupo_id) : null;
  const procs = useMemo(
    () => (empresaId ? processos.filter((p) => p.empresa_id === empresaId) : []),
    [processos, empresaId],
  );
  const procsFiltrados = useMemo(
    () => (statusFiltro ? procs.filter((p) => p.status === statusFiltro) : procs),
    [procs, statusFiltro],
  );
  const counts = useMemo(() => {
    const m: Record<string, number> = { "": procs.length };
    for (const p of procs) m[p.status] = (m[p.status] ?? 0) + 1;
    return m;
  }, [procs]);

  return (
    <Dialog open={!!empresaId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[1100px] p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border bg-sidebar px-4 py-3.5 text-sidebar-foreground sm:px-6 sm:py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{empresa?.nome ?? "Empresa"}</span>
          </DialogTitle>
          <DialogDescription className="text-sidebar-foreground/70">
            {grupo ? grupo.nome + " · " : ""}
            {procs.length} processo{procs.length !== 1 ? "s" : ""} no total
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {STATUS_TABS.map((tab) => {
              const active = statusFiltro === tab.key;
              const count = counts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFiltro(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? "bg-primary-foreground/20" : "bg-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <div className="md:hidden divide-y divide-border/60">
            {procsFiltrados.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nenhum processo nesta categoria.
              </div>
            )}
            {procsFiltrados.map((p) => {
              const tipo = tipos.get(p.tipo_processo_id);
              const etapaAtual = p.etapa_atual_id ? etapas.get(p.etapa_atual_id) : null;
              const etapasDoTipo = etapasByTipo.get(p.tipo_processo_id) ?? [];
              const idxAtual = etapaAtual
                ? etapasDoTipo.findIndex((e: any) => e.id === etapaAtual.id)
                : -1;
              const total = etapasDoTipo.length;
              const progresso =
                p.status === "concluido"
                  ? 100
                  : total > 0 && idxAtual >= 0
                    ? ((idxAtual + 1) / total) * 100
                    : 0;
              const parado = isParado(p);
              const statusLabel = p.status_detalhado ?? STATUS_TAB_LABEL[p.status] ?? p.status;
              return (
                <button
                  key={p.id}
                  onClick={() => onAbrirProcesso(p.id)}
                  className="block w-full space-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="break-words font-medium text-card-foreground">{tipo?.nome ?? "—"}</p>
                        {parado && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />}
                      </div>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">{p.nome}</p>
                    </div>
                    <span className={`inline-flex max-w-[11rem] items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[p.status]}`}>
                      <span className="truncate">{statusLabel}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {p.numero_protocolo && <span className="font-mono">#{p.numero_protocolo}</span>}
                    <span>{p.data_protocolo ? format(parseISO(p.data_protocolo), "dd/MM/yyyy", { locale: ptBR }) : "—"}</span>
                    {p.responsavel && <span>{p.responsavel}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progresso}%`,
                          background:
                            p.status === "concluido"
                              ? "var(--success)"
                              : etapaAtual?.cor ?? "var(--primary)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {idxAtual >= 0 && total > 0
                        ? `${idxAtual + 1}/${total}`
                        : p.status === "concluido"
                          ? `${total}/${total}`
                          : "—"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <table className="hidden w-full min-w-[640px] text-sm md:table">
            <thead className="sticky top-0 bg-sidebar text-sidebar-foreground">
              <tr className="text-left">
                <Th>Tipo</Th>
                <Th>Processo</Th>
                <Th>Protocolo</Th>
                <Th>Data</Th>
                <Th>Status</Th>
                <Th>Responsável</Th>
                <Th>Progresso</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {procsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum processo nesta categoria.
                  </td>
                </tr>
              )}
              {procsFiltrados.map((p) => {
                const tipo = tipos.get(p.tipo_processo_id);
                const etapaAtual = p.etapa_atual_id ? etapas.get(p.etapa_atual_id) : null;
                const etapasDoTipo = etapasByTipo.get(p.tipo_processo_id) ?? [];
                const idxAtual = etapaAtual
                  ? etapasDoTipo.findIndex((e: any) => e.id === etapaAtual.id)
                  : -1;
                const total = etapasDoTipo.length;
                const progresso =
                  p.status === "concluido"
                    ? 100
                    : total > 0 && idxAtual >= 0
                      ? ((idxAtual + 1) / total) * 100
                      : 0;
                const parado = isParado(p);
                const statusLabel = p.status_detalhado ?? STATUS_TAB_LABEL[p.status] ?? p.status;
                return (
                  <tr
                    key={p.id}
                    onClick={() => onAbrirProcesso(p.id)}
                    className="cursor-pointer border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{tipo?.nome ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-card-foreground">{p.nome}</span>
                        {parado && (
                          <span title="Parado há mais de 30 dias">
                            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {p.numero_protocolo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.data_protocolo
                        ? format(parseISO(p.data_protocolo), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">

                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status]}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.responsavel ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progresso}%`,
                              background:
                                p.status === "concluido"
                                  ? "var(--success)"
                                  : etapaAtual?.cor ?? "var(--primary)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {idxAtual >= 0 && total > 0
                            ? `${idxAtual + 1}/${total}`
                            : p.status === "concluido"
                              ? `${total}/${total}`
                              : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAbrirProcesso(p.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Ver acompanhamentos
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProcessoTramitacoesModal({
  processoId,
  onClose,
  processos,
  empresaMap,
  tipoMap,
  etapaMap,
  tramitacoes,
}: {
  processoId: string | null;
  onClose: () => void;
  processos: any[];
  empresaMap: Map<string, any>;
  tipoMap: Map<string, any>;
  etapaMap: Map<string, any>;
  tramitacoes: any[];
}) {
  const processo = processoId ? processos.find((p) => p.id === processoId) : null;
  const empresa = processo ? empresaMap.get(processo.empresa_id) : null;
  const tipo = processo ? tipoMap.get(processo.tipo_processo_id) : null;
  const tramsDoProcesso = useMemo(() => {
    if (!processoId) return [];
    return tramitacoes
      .filter((t) => t.processo_id === processoId)
      .slice()
      .sort((a, b) => (a.data_evento < b.data_evento ? 1 : -1));
  }, [tramitacoes, processoId]);

  const statusLabel = processo ? STATUS_LABEL[processo.status] ?? processo.status : "";

  return (
    <Dialog open={!!processoId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[800px] p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border bg-sidebar px-4 py-3.5 text-sidebar-foreground sm:px-6 sm:py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Acompanhamentos do processo
          </DialogTitle>
          <DialogDescription className="space-y-2 text-sidebar-foreground/70">
            <span className="block break-words">
            {empresa?.nome ?? "—"} · {tipo?.nome ?? "—"} · {processo?.nome ?? ""}
            {processo?.numero_protocolo ? ` · ${processo.numero_protocolo}` : ""}
            </span>
            {processo && (
              <span
                className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[processo.status]}`}
              >
                {statusLabel}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto">
          {tramsDoProcesso.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Nenhum acompanhamento registrado para este processo.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tramsDoProcesso.map((t) => {
                const etapa = t.etapa_id ? etapaMap.get(t.etapa_id) : null;
                return (
                  <li key={t.id} className="flex flex-col gap-1 px-4 py-3.5 hover:bg-muted/30 sm:flex-row sm:gap-4 sm:px-6 sm:py-4">
                    <div className="shrink-0 text-xs font-medium text-muted-foreground sm:w-24">
                      {fmtDate(t.data_evento)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {etapa && (
                          <span
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              background: etapa.cor + "1a",
                              color: etapa.cor,
                            }}
                          >
                            {etapa.nome}
                          </span>
                        )}
                        {t.status_no_momento && (
                          <span
                            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[t.status_no_momento] ?? ""}`}
                          >
                            {STATUS_LABEL[t.status_no_momento] ?? t.status_no_momento}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-card-foreground">{t.descricao}</p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t.responsavel ?? "—"}
                        {t.setor_orgao ? ` · ${t.setor_orgao}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
