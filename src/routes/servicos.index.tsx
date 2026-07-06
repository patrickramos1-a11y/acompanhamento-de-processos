import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import {
  getServicosData,
  criarServicoFromTemplate,
  criarServicosFromTemplateBatch,
  deleteServico,
  concluirTarefa,
  reabrirTarefa,
  extendTarefaDias,
  cancelarTarefa,
} from "@/lib/servicos.functions";
import { AppHeader } from "@/components/app-header";
import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Lock,
  RotateCcw,
  CalendarPlus,
  Building2,
  XCircle,
} from "lucide-react";
import { calcularProgresso, formatDate, tarefaAtrasada, toISODate } from "@/lib/dateCalculations";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const servicosDataQuery = queryOptions({
  queryKey: ["servicos-data"],
  queryFn: () => getServicosData(),
});

export const Route = createFileRoute("/servicos/")({
  head: () => ({
    meta: [
      { title: "Serviços — Acompanhamento de Processos" },
      { name: "description", content: "Gestão de serviços por empresa, com cronograma de tarefas e prazos." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicosDataQuery),
  component: ServicosPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function ServicosPage() {
  const { data } = useSuspenseQuery(servicosDataQuery);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { empresas, processos, templates, servicos } = data;

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterEmpresas, setFilterEmpresas] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterTemplates, setFilterTemplates] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"individual" | "lote">("individual");
  const [creating, setCreating] = useState(false);
  const [novoForm, setNovoForm] = useState({
    empresa_id: "",
    processo_id: "",
    template_id: "",
    data_inicial: toISODate(new Date()),
  });
  const [loteForm, setLoteForm] = useState({
    empresa_ids: [] as string[],
    template_id: "",
    data_inicial: toISODate(new Date()),
  });

  const empresaMap = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas]);
  const processosDaEmpresa = useMemo(
    () => processos.filter((p) => p.empresa_id === novoForm.empresa_id),
    [processos, novoForm.empresa_id],
  );

  const visivelNoMes = (s: typeof servicos[number]) => {
    const inicio = parseISO(s.data_inicial);
    const previsao = parseISO(s.data_prevista_atual);
    const filterStart = new Date(filterYear, filterMonth, 1);
    const inicioMonth = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const previsaoMonth = new Date(previsao.getFullYear(), previsao.getMonth(), 1);
    if (filterStart >= inicioMonth && filterStart <= previsaoMonth) return { visible: true, atrasado: false };
    if (s.status !== "concluido" && filterStart > previsaoMonth) return { visible: true, atrasado: true };
    return { visible: false, atrasado: false };
  };

  const filtered = useMemo(() => {
    return servicos
      .map((s) => ({ ...s, _vis: visivelNoMes(s) }))
      .filter((s) => {
        if (!s._vis.visible) return false;
        if (filterEmpresas.length && !filterEmpresas.includes(s.empresa_id)) return false;
        if (filterTemplates.length && (!s.template_id || !filterTemplates.includes(s.template_id))) return false;
        if (filterStatus.length) {
          const atrasado = s._vis.atrasado || (s.status !== "concluido" && parseISO(s.data_prevista_atual) < now);
          const ok =
            (filterStatus.includes("em_andamento") && s.status === "em_andamento" && !atrasado) ||
            (filterStatus.includes("concluido") && s.status === "concluido") ||
            (filterStatus.includes("atrasado") && atrasado);
          if (!ok) return false;
        }
        return true;
      });
  }, [servicos, filterMonth, filterYear, filterEmpresas, filterTemplates, filterStatus]);

  const anos = useMemo(() => {
    const s = new Set<number>([now.getFullYear()]);
    servicos.forEach((sv) => {
      s.add(parseISO(sv.data_inicial).getFullYear());
      s.add(parseISO(sv.data_prevista_atual).getFullYear());
    });
    return Array.from(s).sort();
  }, [servicos]);

  const allTarefas = filtered.flatMap((s) => s.tarefas).filter((t) => !(t.gerar_apos_conclusao && t.status === "bloqueada"));
  const kpis = {
    servicos: filtered.length,
    concluidas: allTarefas.filter((t) => t.status === "concluida").length,
    canceladas: allTarefas.filter((t) => t.status === "cancelada").length,
    atrasadas: allTarefas.filter((t) => tarefaAtrasada(t)).length,
    pendentes: allTarefas.filter((t) => t.status === "pendente" && !tarefaAtrasada(t)).length,
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["servicos-data"], refetchType: "active" });
    await router.invalidate({ sync: true });
  };

  const handleCriar = async () => {
    if (!novoForm.empresa_id || !novoForm.template_id || !novoForm.data_inicial) return;
    setCreating(true);
    try {
      const r = await criarServicoFromTemplate({
        data: {
          ...novoForm,
          processo_id: novoForm.processo_id || null,
        },
      });
      setCreateOpen(false);
      setNovoForm({ empresa_id: "", processo_id: "", template_id: "", data_inicial: toISODate(new Date()) });
      toast.success("Servico criado!");
      await refresh();
      setExpanded((p) => new Set(p).add(r.id));
    } finally {
      setCreating(false);
    }
  };

  const handleCriarLote = async () => {
    if (!loteForm.empresa_ids.length || !loteForm.template_id || !loteForm.data_inicial) return;
    setCreating(true);
    try {
      const r = await criarServicosFromTemplateBatch({
        data: {
          empresa_ids: loteForm.empresa_ids,
          template_id: loteForm.template_id,
          data_inicial: loteForm.data_inicial,
          processo_id: null,
        },
      });
      setCreateOpen(false);
      setLoteForm({ empresa_ids: [], template_id: "", data_inicial: toISODate(new Date()) });
      toast.success(`${r.ids.length} servico(s) criado(s)`);
      await refresh();
      setExpanded((p) => {
        const next = new Set(p);
        r.ids.forEach((id) => next.add(id));
        return next;
      });
    } finally {
      setCreating(false);
    }
  };

  const handleConcluir = async (servico_id: string, tarefa_id: string) => {
    await concluirTarefa({ data: { servico_id, tarefa_id } });
    await refresh();
  };

  const handleReabrir = async (servico_id: string, tarefa_id: string) => {
    await reabrirTarefa({ data: { servico_id, tarefa_id } });
    await refresh();
  };

  const handleExtend = async (servico_id: string, tarefa_id: string, dias: number) => {
    await extendTarefaDias({ data: { servico_id, tarefa_id, dias_extras: dias } });
    toast.success(`+${dias} dia(s)`);
    await refresh();
  };

  const handleCancelarTarefa = async (servico_id: string, tarefa_id: string) => {
    const res = await cancelarTarefa({ data: { servico_id, tarefa_id } });
    toast.success(`${res.tarefasCanceladas} tarefa(s) cancelada(s)`);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteServico({ data: { id } });
    toast.success("Serviço excluído");
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        current="servicos"
        eyebrow="Gestão operacional"
        title="Serviços"
        subtitle="Acompanhe serviços por empresa com cronograma de tarefas e prazos"
        icon={<ClipboardList className="h-5 w-5" />}
      />

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* KPIs */}
        <section className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <Kpi icon={<ClipboardList />} label="Serviços" value={kpis.servicos} tone="default" />
          <Kpi icon={<Check />} label="Concluídas" value={kpis.concluidas} tone="success" />
          <Kpi icon={<XCircle />} label="Canceladas" value={kpis.canceladas} tone="default" />
          <Kpi icon={<Clock />} label="Pendentes" value={kpis.pendentes} tone="info" />
        </section>

        {/* Filtros */}
        <section className="glass grid gap-2 rounded-xl p-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
            <SelectTrigger className="h-9 w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
            <SelectTrigger className="h-9 w-full sm:w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MultiSelect
            label="Empresa"
            options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
            selected={filterEmpresas}
            onChange={setFilterEmpresas}
          />
          <MultiSelect
            label="ServiÃ§o/Template"
            options={templates.map((t) => ({ value: t.id, label: t.nome }))}
            selected={filterTemplates}
            onChange={setFilterTemplates}
          />
          <MultiSelect
            label="Status do Serviço"
            options={[
              { value: "em_andamento", label: "Em andamento" },
              { value: "concluido", label: "Concluído" },
              { value: "atrasado", label: "Atrasado" },
            ]}
            selected={filterStatus}
            onChange={setFilterStatus}
          />
          <div className="hidden sm:ml-auto sm:block" />
          <Dialog open={createOpen} onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) setCreateMode("individual");
          }}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto"><Plus className="h-4 w-4" />Novo Serviço</Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-lg sm:w-[calc(100vw-2rem)]">
              <DialogHeader>
                <DialogTitle>Novo Serviço</DialogTitle>
                <DialogDescription>Vincule a uma empresa e a um template existente.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
                  <Button type="button" variant={createMode === "individual" ? "default" : "ghost"} size="sm" onClick={() => setCreateMode("individual")}>
                    Individual
                  </Button>
                  <Button type="button" variant={createMode === "lote" ? "default" : "ghost"} size="sm" onClick={() => setCreateMode("lote")}>
                    Em lote
                  </Button>
                </div>

                {createMode === "individual" ? (
                  <>
                    <div>
                      <Label>Empresa *</Label>
                      <Select value={novoForm.empresa_id} onValueChange={(v) => setNovoForm({ ...novoForm, empresa_id: v, processo_id: "" })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {empresas.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome}{e.cnpj ? ` - ${e.cnpj}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Processo vinculado</Label>
                      <Select
                        value={novoForm.processo_id || "none"}
                        onValueChange={(v) => setNovoForm({ ...novoForm, processo_id: v === "none" ? "" : v })}
                        disabled={!novoForm.empresa_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={novoForm.empresa_id ? "Sem processo vinculado" : "Escolha uma empresa para listar processos"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem processo vinculado</SelectItem>
                          {processosDaEmpresa.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}{p.numero_protocolo ? ` - ${p.numero_protocolo}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!novoForm.empresa_id && (
                        <p className="mt-1 text-xs text-muted-foreground">Escolha uma empresa para listar processos.</p>
                      )}
                    </div>
                    <div>
                      <Label>Template *</Label>
                      <Select value={novoForm.template_id} onValueChange={(v) => setNovoForm({ ...novoForm, template_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome} ({t.prazo_base_dias}d)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data inicial</Label>
                      <Input
                        type="date"
                        value={novoForm.data_inicial}
                        onChange={(e) => setNovoForm({ ...novoForm, data_inicial: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCriar} className="w-full" disabled={!novoForm.empresa_id || !novoForm.template_id || creating}>
                      {creating ? "Criando..." : "Criar servico"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Empresas *</Label>
                      <MultiSelect
                        label="Selecionar empresas"
                        options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
                        selected={loteForm.empresa_ids}
                        onChange={(empresa_ids) => setLoteForm({ ...loteForm, empresa_ids })}
                        className="mt-1 w-full sm:w-full"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Cada empresa selecionada recebera um servico sem processo vinculado.
                      </p>
                    </div>
                    <div>
                      <Label>Template *</Label>
                      <Select value={loteForm.template_id} onValueChange={(v) => setLoteForm({ ...loteForm, template_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome} ({t.prazo_base_dias}d)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data inicial</Label>
                      <Input
                        type="date"
                        value={loteForm.data_inicial}
                        onChange={(e) => setLoteForm({ ...loteForm, data_inicial: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={handleCriarLote}
                      className="w-full"
                      disabled={!loteForm.empresa_ids.length || !loteForm.template_id || !loteForm.data_inicial || creating}
                    >
                      {creating ? "Criando..." : `Criar ${loteForm.empresa_ids.length || ""} servico(s)`}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </section>

        {/* Lista */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} serviço(s) em {MONTHS[filterMonth]} {filterYear}
          </p>

          {filtered.length === 0 && (
            <div className="surface-elevated rounded-2xl p-8 text-center text-sm text-muted-foreground">
              Nenhum serviço visível neste filtro.
            </div>
          )}

          {filtered.map((s) => {
            const empresa = empresaMap.get(s.empresa_id);
            const progresso = calcularProgresso(s);
            const isOpen = expanded.has(s.id);
            const atrasado = s._vis.atrasado || (s.status !== "concluido" && parseISO(s.data_prevista_atual) < now);

            return (
              <div key={s.id} className="surface-card rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:items-center sm:gap-3">
                  <button onClick={() => toggle(s.id)} className="mt-1 text-muted-foreground hover:text-foreground sm:mt-0">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-foreground sm:flex">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        to="/servicos/$id"
                        params={{ id: s.id }}
                        className="break-words font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {s.nome}
                      </Link>
                      <Badge variant="outline" className="max-w-full truncate">{empresa?.nome ?? "—"}</Badge>
                      <StatusBadge status={s.status} atrasado={atrasado} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Início: {formatDate(s.data_inicial)} • Previsão: {formatDate(s.data_prevista_atual)} • {progresso}%
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${atrasado ? "bg-destructive" : "bg-gradient-to-r from-primary to-primary-glow"}`}
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="mt-0.5 shrink-0 sm:mt-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                        <AlertDialogDescription>Todas as tarefas serão removidas.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(s.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    {s.tarefas
                      .filter((t) => !(t.gerar_apos_conclusao && t.status === "bloqueada"))
                      .map((t) => {
                        const isLate = tarefaAtrasada(t);
                        return (
                          <div
                            key={t.id}
                            className={`flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-3 ${
                              t.status === "cancelada"
                                ? "border-muted bg-muted/40 opacity-75"
                                : t.status === "concluida"
                                ? "border-success/30 bg-success/5"
                                : isLate
                                  ? "border-destructive/30 bg-destructive/5"
                                  : t.status === "bloqueada"
                                    ? "border-muted bg-muted/30 opacity-70"
                                    : "border-border bg-card"
                            }`}
                          >
                            <TaskStatusIcon status={t.status} isLate={isLate} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`break-words font-medium ${
                                    t.status === "concluida" || t.status === "cancelada"
                                      ? "line-through opacity-60"
                                      : ""
                                  }`}
                                >
                                  {t.titulo}
                                </span>
                                <Badge variant="outline" className="text-[10px]">{t.fase_nome}</Badge>
                                {t.status === "cancelada" && (
                                  <Badge variant="outline" className="border-muted-foreground/40 text-[10px] text-muted-foreground">
                                    cancelada
                                  </Badge>
                                )}
                                {t.impacta_prazo && (
                                  <span className="text-[10px] text-muted-foreground">impacta prazo</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t.duracao_dias}d • Previsão: {formatDate(t.data_prevista)}
                                {t.data_conclusao && ` • Concluída: ${formatDate(t.data_conclusao)}`}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1 sm:justify-end">
                              {(t.status === "pendente" || t.status === "bloqueada") && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" title="Cancelar atividade" className="h-8 gap-1 text-destructive hover:text-destructive">
                                      <XCircle className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Cancelar</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancelar atividade?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta atividade e todas as tarefas que dependem dela serao canceladas. Elas nao poderao mais ser concluidas.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleCancelarTarefa(s.id, t.id)}>
                                        Cancelar atividade
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              {t.status === "pendente" && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleExtend(s.id, t.id, 1)} title="+1 dia" className="h-8 w-8 p-0">
                                    <CalendarPlus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" onClick={() => handleConcluir(s.id, t.id)} className="h-8 gap-1">
                                    <Check className="h-3.5 w-3.5" />
                                    Concluir
                                  </Button>
                                </>
                              )}
                              {t.status === "concluida" && (
                                <Button size="sm" variant="ghost" onClick={() => handleReabrir(s.id, t.id)} className="h-8 w-8 p-0">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {s.tarefas.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem tarefas neste serviço.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Kpi({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "default" | "info" | "success" | "warning";
}) {
  const cls = {
    default: "bg-primary text-primary-foreground",
    info: "bg-info/15 text-info border border-info/30",
    success: "bg-success/18 text-success border border-success/35",
    warning: "bg-warning/22 text-warning-foreground border border-warning/45",
  }[tone];
  return (
    <div className="surface-elevated rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cls}`}>
          <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        </div>
      </div>
      <div className="mt-3 font-display text-4xl font-bold tabular-nums leading-none text-foreground">{value}</div>
    </div>
  );
}

function StatusBadge({ status, atrasado }: { status: string; atrasado: boolean }) {
  if (atrasado) return <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">Atrasado</Badge>;
  if (status === "concluido") return <Badge className="bg-success/15 text-success border-success/30 border">Concluído</Badge>;
  if (status === "cancelado") return <Badge variant="outline">Cancelado</Badge>;
  return <Badge className="bg-info/15 text-info border-info/30 border">Em andamento</Badge>;
}

function TaskStatusIcon({ status, isLate }: { status: string; isLate: boolean }) {
  if (status === "cancelada") return <XCircle className="h-4 w-4 text-muted-foreground" />;
  if (status === "concluida") return <Check className="h-4 w-4 text-success" />;
  if (status === "bloqueada") return <Lock className="h-4 w-4 text-muted-foreground" />;
  if (isLate) return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}
