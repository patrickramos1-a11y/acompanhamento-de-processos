import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import { ArrowLeft, Building2, Calendar, ClipboardList, Plus, Target } from "lucide-react";
import {
  getServicoById,
  concluirTarefa,
  reabrirTarefa,
  extendTarefaDias,
  cancelarTarefa,
  adicionarTarefaServico,
} from "@/lib/servicos.functions";
import { AppHeader } from "@/components/app-header";
import { CronogramaServico } from "@/components/cronograma-servico";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/dateCalculations";
import type { TipoPrazo } from "@/types/servicos";

const servicoQuery = (id: string) =>
  queryOptions({
    queryKey: ["servico", id],
    queryFn: () => getServicoById({ data: { id } }),
  });

export const Route = createFileRoute("/servicos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Serviço — Acompanhamento de Processos` },
      { name: "description", content: `Detalhe do serviço ${params.id}.` },
    ],
  }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(servicoQuery(params.id)),
  component: ServicoDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Serviço não encontrado</div>,
});

function ServicoDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(servicoQuery(id));
  const { servico, empresa, processo } = data;
  const [avulsaOpen, setAvulsaOpen] = useState(false);
  const [avulsaForm, setAvulsaForm] = useState({
    titulo: "",
    fase_nome: "",
    duracao_dias: 1,
    tipo_prazo: "RELATIVO_AO_INICIO" as TipoPrazo,
    impacta_prazo: true,
    depende_de_servico_tarefa_id: "",
  });

  const fasesExistentes = useMemo(
    () => Array.from(new Set(servico.tarefas.map((t) => t.fase_nome).filter(Boolean))).sort(),
    [servico.tarefas],
  );
  const tarefasParaDependencia = useMemo(
    () => servico.tarefas.filter((t) => t.status !== "cancelada"),
    [servico.tarefas],
  );

  const now = new Date();
  const atrasado = servico.status !== "concluido" && parseISO(servico.data_prevista_atual) < now;
  const diasDesvio = Math.round(
    (parseISO(servico.data_prevista_atual).getTime() - parseISO(servico.data_prevista_base).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["servico", id], refetchType: "active" }),
      queryClient.invalidateQueries({ queryKey: ["servicos-data"], refetchType: "active" }),
    ]);
    await router.invalidate({ sync: true });
  };

  const handleConcluir = async (tarefaId: string) => {
    await concluirTarefa({ data: { servico_id: id, tarefa_id: tarefaId } });
    await refresh();
  };
  const handleReabrir = async (tarefaId: string) => {
    await reabrirTarefa({ data: { servico_id: id, tarefa_id: tarefaId } });
    await refresh();
  };
  const handleExtend = async (tarefaId: string, dias: number) => {
    await extendTarefaDias({ data: { servico_id: id, tarefa_id: tarefaId, dias_extras: dias } });
    await refresh();
  };
  const handleCancelar = async (tarefaId: string) => {
    await cancelarTarefa({ data: { servico_id: id, tarefa_id: tarefaId } });
    await refresh();
  };
  const handleCriarAvulsa = async () => {
    const titulo = avulsaForm.titulo.trim();
    const faseNome = avulsaForm.fase_nome.trim();
    if (!titulo || !faseNome) return;
    await adicionarTarefaServico({
      data: {
        servico_id: id,
        titulo,
        fase_nome: faseNome,
        duracao_dias: avulsaForm.duracao_dias,
        tipo_prazo: avulsaForm.tipo_prazo,
        impacta_prazo: avulsaForm.impacta_prazo,
        depende_de_servico_tarefa_id:
          avulsaForm.tipo_prazo === "RELATIVO_A_CONCLUSAO_DE_TAREFA" && avulsaForm.depende_de_servico_tarefa_id
            ? avulsaForm.depende_de_servico_tarefa_id
            : null,
        gerar_apos_conclusao: false,
      },
    });
    setAvulsaOpen(false);
    setAvulsaForm({
      titulo: "",
      fase_nome: "",
      duracao_dias: 1,
      tipo_prazo: "RELATIVO_AO_INICIO",
      impacta_prazo: true,
      depende_de_servico_tarefa_id: "",
    });
    toast.success("Tarefa avulsa criada");
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        current="servicos"
        eyebrow="Detalhe do serviço"
        title={servico.nome}
        subtitle={empresa?.nome ?? "Empresa não encontrada"}
        icon={<ClipboardList className="h-5 w-5" />}
      />

      <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          to="/servicos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para serviços
        </Link>

        <div className="surface-elevated grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 sm:gap-4 sm:p-5 md:grid-cols-4 lg:grid-cols-5">
          <InfoCard
            icon={<Building2 className="h-4 w-4" />}
            label="Empresa"
            value={empresa?.nome ?? "—"}
            sub={empresa?.cnpj ?? undefined}
          />
          {processo && (
            <InfoCard
              icon={<ClipboardList className="h-4 w-4" />}
              label="Processo"
              value={processo.nome}
              sub={processo.numero_protocolo ?? undefined}
            />
          )}
          <InfoCard
            icon={<Calendar className="h-4 w-4" />}
            label="Data inicial"
            value={formatDate(servico.data_inicial)}
          />
          <InfoCard
            icon={<Target className="h-4 w-4" />}
            label="Previsão base"
            value={formatDate(servico.data_prevista_base)}
            sub={`${servico.prazo_base_dias} dias`}
          />
          <InfoCard
            icon={<Target className="h-4 w-4" />}
            label="Previsão atual"
            value={formatDate(servico.data_prevista_atual)}
            sub={diasDesvio === 0 ? "no prazo" : diasDesvio > 0 ? `+${diasDesvio}d de desvio` : `${diasDesvio}d antecipado`}
            tone={atrasado ? "warning" : diasDesvio > 0 ? "warning" : "success"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {servico.status === "concluido" && (
            <Badge className="border border-success/30 bg-success/15 text-success">Concluído</Badge>
          )}
          {atrasado && (
            <Badge className="border border-destructive/30 bg-destructive/15 text-destructive">
              Atrasado
            </Badge>
          )}
          {!atrasado && servico.status === "em_andamento" && (
            <Badge className="border border-info/30 bg-info/15 text-info">Em andamento</Badge>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Cronograma</h2>
            <p className="text-sm text-muted-foreground">Tarefas do serviÃ§o ativo, incluindo demandas avulsas.</p>
          </div>
          <Dialog open={avulsaOpen} onOpenChange={setAvulsaOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova tarefa avulsa
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-xl sm:w-[calc(100vw-2rem)]">
              <DialogHeader>
                <DialogTitle>Nova tarefa avulsa</DialogTitle>
                <DialogDescription>Adicione uma demanda apenas neste serviÃ§o, sem alterar o template.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>TÃ­tulo *</Label>
                  <Input value={avulsaForm.titulo} onChange={(e) => setAvulsaForm({ ...avulsaForm, titulo: e.target.value })} />
                </div>
                <div>
                  <Label>Fase *</Label>
                  <Input
                    list="fases-servico"
                    value={avulsaForm.fase_nome}
                    onChange={(e) => setAvulsaForm({ ...avulsaForm, fase_nome: e.target.value })}
                    placeholder="Ex.: Demanda avulsa"
                  />
                  <datalist id="fases-servico">
                    {fasesExistentes.map((fase) => (
                      <option key={fase} value={fase} />
                    ))}
                  </datalist>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>DuraÃ§Ã£o (dias)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={avulsaForm.duracao_dias}
                      onChange={(e) => setAvulsaForm({ ...avulsaForm, duracao_dias: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Tipo de prazo</Label>
                    <Select
                      value={avulsaForm.tipo_prazo}
                      onValueChange={(v) =>
                        setAvulsaForm({
                          ...avulsaForm,
                          tipo_prazo: v as TipoPrazo,
                          depende_de_servico_tarefa_id: v === "RELATIVO_AO_INICIO" ? "" : avulsaForm.depende_de_servico_tarefa_id,
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RELATIVO_AO_INICIO">Relativo ao inÃ­cio</SelectItem>
                        <SelectItem value="RELATIVO_A_CONCLUSAO_DE_TAREFA">Relativo Ã  conclusÃ£o de tarefa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {avulsaForm.tipo_prazo === "RELATIVO_A_CONCLUSAO_DE_TAREFA" && (
                  <div>
                    <Label>Depende da tarefa</Label>
                    <Select
                      value={avulsaForm.depende_de_servico_tarefa_id}
                      onValueChange={(v) => setAvulsaForm({ ...avulsaForm, depende_de_servico_tarefa_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {tarefasParaDependencia.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <Label>Impacta prazo</Label>
                    <p className="text-xs text-muted-foreground">Quando ativo, a previsÃ£o do serviÃ§o considera esta tarefa.</p>
                  </div>
                  <Switch
                    checked={avulsaForm.impacta_prazo}
                    onCheckedChange={(v) => setAvulsaForm({ ...avulsaForm, impacta_prazo: v })}
                  />
                </div>
                <Button
                  onClick={handleCriarAvulsa}
                  disabled={
                    !avulsaForm.titulo.trim() ||
                    !avulsaForm.fase_nome.trim() ||
                    (avulsaForm.tipo_prazo === "RELATIVO_A_CONCLUSAO_DE_TAREFA" && !avulsaForm.depende_de_servico_tarefa_id)
                  }
                >
                  Criar tarefa avulsa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <CronogramaServico
          servico={servico}
          onConcluir={handleConcluir}
          onReabrir={handleReabrir}
          onExtend={handleExtend}
          onCancelar={handleCancelar}
        />
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning";
}) {
  const subCls =
    tone === "warning"
      ? "text-destructive"
      : tone === "success"
        ? "text-success"
        : "text-muted-foreground";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-accent-foreground">{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 break-words font-display text-base font-semibold text-foreground sm:text-lg">{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${subCls}`}>{sub}</p>}
    </div>
  );
}
