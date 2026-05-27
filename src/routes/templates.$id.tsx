import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { getTemplateById } from "@/lib/servicos.functions";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const templateQuery = (id: string) =>
  queryOptions({
    queryKey: ["template", id],
    queryFn: () => getTemplateById({ data: { id } }),
  });

export const Route = createFileRoute("/templates/$id")({
  head: () => ({
    meta: [
      { title: "Template — Acompanhamento de Processos" },
      { name: "description", content: "Estrutura do template de serviço." },
    ],
  }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(templateQuery(params.id)),
  component: TemplateDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Template não encontrado</div>,
});

function TemplateDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(templateQuery(id));
  const { template } = data;
  const total = template.fases.reduce((s, f) => s + f.tarefas.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        current="templates"
        eyebrow="Detalhe do template"
        title={template.nome}
        subtitle={template.descricao ?? `${template.prazo_base_dias} dias • ${total} tarefa(s)`}
        icon={<FileText className="h-5 w-5" />}
      />

      <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/templates"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para templates
          </Link>
          <Link to="/templates">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          </Link>
        </div>

        <div className="surface-elevated grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
          <Stat label="Prazo base" value={`${template.prazo_base_dias}d`} />
          <Stat label="Fases" value={String(template.fases.length)} />
          <Stat label="Tarefas" value={String(total)} />
        </div>

        <div className="space-y-4">
          {template.fases.map((f) => (
            <div key={f.id} className="surface-card rounded-xl p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">Fase {f.ordem}</Badge>
                <h3 className="font-display text-base font-semibold text-foreground">{f.nome}</h3>
                <span className="text-xs text-muted-foreground">· {f.tarefas.length} tarefa(s)</span>
              </div>
              <div className="space-y-1.5">
                {f.tarefas.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="break-words font-medium">{t.titulo}</span>
                      <span className="ml-0 mt-1 block text-xs text-muted-foreground sm:ml-2 sm:mt-0 sm:inline">
                        {t.duracao_dias}d •{" "}
                        {t.tipo_prazo === "RELATIVO_AO_INICIO" ? "relativo ao início" : "após dependência"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.impacta_prazo && (
                        <Badge variant="outline" className="text-[10px]">impacta prazo</Badge>
                      )}
                      {t.gerar_apos_conclusao && (
                        <Badge variant="outline" className="text-[10px]">gerar após</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {f.tarefas.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma tarefa nesta fase.</p>
                )}
              </div>
            </div>
          ))}
          {template.fases.length === 0 && (
            <div className="surface-elevated rounded-2xl p-8 text-center text-sm text-muted-foreground">
              Nenhuma fase definida. Vá em <Link to="/templates" className="text-primary underline">Templates</Link> para editar.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
    </div>
  );
}
