import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDashboard } from "@/lib/dashboard.functions";
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
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Search,
  Clock,
  TrendingUp,
  Settings,
  ClipboardList,
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
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [empresaModal, setEmpresaModal] = useState<string | null>(null);
  const [processoModal, setProcessoModal] = useState<string | null>(null);
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

  const porEmpresa = useMemo(() => {
    return empresas
      .map((e) => {
        const procs = processos.filter((p) => p.empresa_id === e.id);
        return {
          empresa: e,
          grupo: e.grupo_id ? grupoMap.get(e.grupo_id) : null,
          total: procs.length,
          ativos: procs.filter((p) => p.status === "ativo").length,
          concluidos: procs.filter((p) => p.status === "concluido").length,
          parados: procs.filter(isParado).length,
        };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [empresas, processos, grupoMap, ultimaPorProcesso]);

  const porTipo = useMemo(() => {
    return tipos
      .map((t) => ({
        tipo: t,
        total: processos.filter((p) => p.tipo_processo_id === t.id).length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tipos, processos]);

  const processosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return processos.filter((p) => {
      if (empresaFiltro && p.empresa_id !== empresaFiltro) return false;
      if (statusFiltro && p.status !== statusFiltro) return false;
      if (tipoFiltro && p.tipo_processo_id !== tipoFiltro) return false;
      if (q) {
        const empresa = empresaMap.get(p.empresa_id)?.nome ?? "";
        const hay = `${p.nome} ${p.numero_protocolo ?? ""} ${empresa} ${p.responsavel ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [processos, search, empresaFiltro, statusFiltro, tipoFiltro, empresaMap]);

  const ultimasTramitacoes = tramitacoes.slice(0, 12);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Acompanhamento de Processos Administrativos
              </h1>
              <p className="text-xs text-sidebar-foreground/70">
                Visão consolidada de licenças, alvarás e tramitações junto a órgãos públicos
              </p>
            </div>
          </div>
          <Link
            to="/configuracoes"
            className="inline-flex items-center gap-2 rounded-md border border-sidebar-foreground/20 px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-foreground/10"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
        {/* KPIs */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPI icon={<FileText />} label="Total de processos" value={kpis.total} tone="default" />
          <KPI icon={<Activity />} label="Em andamento" value={kpis.ativos} tone="info" />
          <KPI icon={<CheckCircle2 />} label="Concluídos" value={kpis.concluidos} tone="success" />
          <KPI
            icon={<AlertTriangle />}
            label="Parados há mais de 30 dias"
            value={kpis.parados}
            tone="warning"
          />
        </section>

        {/* Empresas + Tipos */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionTitle icon={<Building2 className="h-4 w-4" />} title="Empresas" />
            <div className="grid gap-3 sm:grid-cols-2">
              {porEmpresa.map((row) => (
                <button
                  key={row.empresa.id}
                  onClick={() => { setEmpresaModal(row.empresa.id); setModalStatusFiltro(""); }}
                  className="group rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-card-foreground">
                        {row.empresa.nome}
                      </h3>
                      {row.grupo && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.grupo.nome}
                        </p>
                      )}
                    </div>
                    {row.parados > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        {row.parados} parado{row.parados > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs">
                    <Metric label="Total" value={row.total} />
                    <Metric label="Ativos" value={row.ativos} tone="info" />
                    <Metric label="Concluídos" value={row.concluidos} tone="success" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle icon={<TrendingUp className="h-4 w-4" />} title="Processos por tipo" />
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              {porTipo.map((row) => {
                const max = Math.max(...porTipo.map((r) => r.total));
                const pct = max ? (row.total / max) * 100 : 0;
                return (
                  <button
                    key={row.tipo.id}
                    onClick={() =>
                      setTipoFiltro(tipoFiltro === row.tipo.id ? "" : row.tipo.id)
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-card-foreground">{row.tipo.nome}</span>
                      <span className="font-medium tabular-nums">{row.total}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Processos table */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              icon={<FileText className="h-4 w-4" />}
              title={`Processos (${processosFiltrados.length})`}
            />
          </div>

          {/* Filters */}
          <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, protocolo, empresa ou responsável..."
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">Todas as empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">Todos os tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {(search || empresaFiltro || tipoFiltro || statusFiltro) && (
              <button
                onClick={() => {
                  setSearch("");
                  setEmpresaFiltro("");
                  setTipoFiltro("");
                  setStatusFiltro("");
                }}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sidebar text-sidebar-foreground">
                  <tr className="text-left">
                    <Th>Empresa</Th>
                    <Th>Tipo</Th>
                    <Th>Processo</Th>
                    <Th>Protocolo</Th>
                    <Th>Data</Th>
                    <Th>Etapa atual</Th>
                    <Th>Status</Th>
                    <Th>Responsável</Th>
                    <Th>Progresso</Th>
                  </tr>
                </thead>
                <tbody>
                  {processosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
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
                        className={`border-t border-border hover:bg-muted/40 ${dim}`}
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
                          {etapaAtual ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
                              style={{
                                borderColor: etapaAtual.cor + "55",
                                background: etapaAtual.cor + "1a",
                                color: etapaAtual.cor,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: etapaAtual.cor }}
                              />
                              {etapaAtual.nome}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status]}`}
                          >
                            {STATUS_LABEL[p.status]}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Últimas tramitações */}
        <section>
          <SectionTitle icon={<Clock className="h-4 w-4" />} title="Últimas tramitações" />
          <div className="rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {ultimasTramitacoes.map((t) => {
                const proc = processos.find((p) => p.id === t.processo_id);
                const empresa = proc ? empresaMap.get(proc.empresa_id) : null;
                const etapa = t.etapa_id ? etapaMap.get(t.etapa_id) : null;
                return (
                  <li key={t.id} className="flex gap-4 px-4 py-3 hover:bg-muted/40">
                    <div className="w-24 shrink-0 text-xs text-muted-foreground">
                      {fmtDate(t.data_evento)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-card-foreground">
                          {empresa?.nome ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{proc?.nome}</span>
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
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{t.descricao}</p>
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

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Plataforma de acompanhamento de processos administrativos
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
      />
    </div>

  );
}

function KPI({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "default" | "info" | "success" | "warning";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
          <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-card-foreground">{value}</div>
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
      <DialogContent className="max-w-[1100px] p-0">
        <DialogHeader className="border-b border-border bg-sidebar px-6 py-4 text-sidebar-foreground">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            {empresa?.nome ?? "Empresa"}
          </DialogTitle>
          <DialogDescription className="text-sidebar-foreground/70">
            {grupo ? grupo.nome + " · " : ""}
            {procs.length} processo{procs.length !== 1 ? "s" : ""} no total
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border bg-muted/30 px-6 py-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => {
              const active = statusFiltro === tab.key;
              const count = counts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFiltro(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
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
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sidebar text-sidebar-foreground">
              <tr className="text-left">
                <Th>Tipo</Th>
                <Th>Processo</Th>
                <Th>Protocolo</Th>
                <Th>Data</Th>
                <Th>Etapa atual</Th>
                <Th>Status</Th>
                <Th>Responsável</Th>
                <Th>Progresso</Th>
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
                const statusLabel = STATUS_TAB_LABEL[p.status] ?? p.status;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/40">
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
                      {etapaAtual ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={{
                            borderColor: etapaAtual.cor + "55",
                            background: etapaAtual.cor + "1a",
                            color: etapaAtual.cor,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: etapaAtual.cor }}
                          />
                          {etapaAtual.nome}
                        </span>
                      ) : (
                        "—"
                      )}
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
