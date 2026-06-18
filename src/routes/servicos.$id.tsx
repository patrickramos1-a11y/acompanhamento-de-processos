import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { ArrowLeft, Building2, Calendar, ClipboardList, Target } from "lucide-react";
import {
  getServicoById,
  concluirTarefa,
  reabrirTarefa,
  extendTarefaDias,
  cancelarTarefa,
} from "@/lib/servicos.functions";
import { AppHeader } from "@/components/app-header";
import { CronogramaServico } from "@/components/cronograma-servico";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateCalculations";

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
  const { data } = useSuspenseQuery(servicoQuery(id));
  const { servico, empresa } = data;

  const now = new Date();
  const atrasado = servico.status !== "concluido" && parseISO(servico.data_prevista_atual) < now;
  const diasDesvio = Math.round(
    (parseISO(servico.data_prevista_atual).getTime() - parseISO(servico.data_prevista_base).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const handleConcluir = async (tarefaId: string) => {
    await concluirTarefa({ data: { servico_id: id, tarefa_id: tarefaId } });
    router.invalidate();
  };
  const handleReabrir = async (tarefaId: string) => {
    await reabrirTarefa({ data: { servico_id: id, tarefa_id: tarefaId } });
    router.invalidate();
  };
  const handleExtend = async (tarefaId: string, dias: number) => {
    await extendTarefaDias({ data: { servico_id: id, tarefa_id: tarefaId, dias_extras: dias } });
    router.invalidate();
  };
  const handleCancelar = async (tarefaId: string) => {
    await cancelarTarefa({ data: { servico_id: id, tarefa_id: tarefaId } });
    router.invalidate();
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

        <div className="surface-elevated grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 sm:gap-4 sm:p-5 md:grid-cols-4">
          <InfoCard
            icon={<Building2 className="h-4 w-4" />}
            label="Empresa"
            value={empresa?.nome ?? "—"}
            sub={empresa?.cnpj ?? undefined}
          />
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
