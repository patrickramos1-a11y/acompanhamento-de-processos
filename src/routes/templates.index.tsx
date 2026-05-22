import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  getServicosData,
  createTemplate,
  deleteTemplate,
  updateTemplateMeta,
  addTemplateFase,
  deleteTemplateFase,
  addTemplateTarefa,
  deleteTemplateTarefa,
} from "@/lib/servicos.functions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Pencil,
} from "lucide-react";
import type { Template, TipoPrazo } from "@/types/servicos";

const servicosDataQuery = queryOptions({
  queryKey: ["servicos-data"],
  queryFn: () => getServicosData(),
});

export const Route = createFileRoute("/templates/")({
  head: () => ({
    meta: [
      { title: "Templates — Acompanhamento de Processos" },
      { name: "description", content: "Gerenciamento de templates de serviços com fases e tarefas." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicosDataQuery),
  component: TemplatesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function TemplatesPage() {
  const { data } = useSuspenseQuery(servicosDataQuery);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", prazo_base_dias: 30, descricao: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.nome.trim()) return;
    const t = await createTemplate({ data: form });
    setForm({ nome: "", prazo_base_dias: 30, descricao: "" });
    setOpen(false);
    toast.success("Template criado!");
    router.invalidate();
    setEditId(t.id);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate({ data: { id } });
    toast.success("Template excluído");
    router.invalidate();
  };

  const editingTemplate = editId ? data.templates.find((t) => t.id === editId) : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        current="templates"
        eyebrow="Modelos reutilizáveis"
        title="Templates"
        subtitle="Crie modelos com fases e tarefas para gerar serviços rapidamente"
        icon={<FileText className="h-5 w-5" />}
      />

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {data.templates.length} template(s)
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-lg sm:w-[calc(100vw-2rem)]">
              <DialogHeader>
                <DialogTitle>Novo Template</DialogTitle>
                <DialogDescription>Defina o nome e o prazo base.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <Label>Prazo Base (dias)</Label>
                  <Input
                    type="number"
                    value={form.prazo_base_dias}
                    onChange={(e) =>
                      setForm({ ...form, prazo_base_dias: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Criar Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3">
          {data.templates.length === 0 && (
            <div className="surface-elevated rounded-2xl p-8 text-center text-sm text-muted-foreground">
              Nenhum template ainda. Crie o primeiro para começar.
            </div>
          )}
          {data.templates.map((t) => {
            const totalTarefas = t.fases.reduce((s, f) => s + f.tarefas.length, 0);
            return (
              <div
                key={t.id}
                className="surface-card group flex items-center justify-between rounded-xl p-4 transition-all hover:shadow-[var(--shadow-md)]"
              >
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => setEditId(t.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{t.nome}</p>
                      <Badge variant="secondary">{t.prazo_base_dias} dias</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.fases.length} fase(s) • {totalTarefas} tarefa(s)
                      {t.descricao && ` • ${t.descricao}`}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          As fases e tarefas serão removidas. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(t.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Link to="/templates/$id" params={{ id: t.id }}>
                    <Button variant="ghost" size="icon" title="Ver detalhe">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] max-w-3xl overflow-y-auto sm:w-[calc(100vw-2rem)]">
          {editingTemplate && (
            <TemplateEditor
              template={editingTemplate}
              onClose={() => setEditId(null)}
              onChanged={() => router.invalidate()}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
  onChanged,
}: {
  template: Template;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [meta, setMeta] = useState({
    nome: template.nome,
    prazo_base_dias: template.prazo_base_dias,
    descricao: template.descricao ?? "",
  });
  const [addingFase, setAddingFase] = useState(false);
  const [novaFase, setNovaFase] = useState("");
  const [addingTarefa, setAddingTarefa] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    titulo: "",
    duracao_dias: 3,
    tipo_prazo: "RELATIVO_AO_INICIO" as TipoPrazo,
    impacta_prazo: true,
    depende_de_template_tarefa_id: null as string | null,
    gerar_apos_conclusao: false,
  });

  const saveMeta = async () => {
    await updateTemplateMeta({ data: { id: template.id, ...meta } });
    toast.success("Template atualizado");
    onChanged();
  };

  const addFase = async () => {
    if (!novaFase.trim()) return;
    await addTemplateFase({
      data: { template_id: template.id, nome: novaFase, ordem: template.fases.length + 1 },
    });
    setNovaFase("");
    setAddingFase(false);
    toast.success("Fase adicionada");
    onChanged();
  };

  const removeFase = async (id: string) => {
    await deleteTemplateFase({ data: { id } });
    toast.success("Fase removida");
    onChanged();
  };

  const addTarefa = async (faseId: string) => {
    if (!taskForm.titulo.trim()) return;
    await addTemplateTarefa({
      data: {
        fase_id: faseId,
        ...taskForm,
        ordem: 999,
      },
    });
    setTaskForm({
      titulo: "",
      duracao_dias: 3,
      tipo_prazo: "RELATIVO_AO_INICIO",
      impacta_prazo: true,
      depende_de_template_tarefa_id: null,
      gerar_apos_conclusao: false,
    });
    setAddingTarefa(null);
    toast.success("Tarefa adicionada");
    onChanged();
  };

  const removeTarefa = async (id: string) => {
    await deleteTemplateTarefa({ data: { id } });
    toast.success("Tarefa removida");
    onChanged();
  };

  const allTarefas = template.fases.flatMap((f) => f.tarefas);

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Editar template</DialogTitle>
        <DialogDescription>{template.nome}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 rounded-lg bg-muted/30 p-4 sm:grid-cols-[1fr_140px]">
        <div>
          <Label>Nome</Label>
          <Input value={meta.nome} onChange={(e) => setMeta({ ...meta, nome: e.target.value })} />
        </div>
        <div>
          <Label>Prazo base (dias)</Label>
          <Input
            type="number"
            value={meta.prazo_base_dias}
            onChange={(e) =>
              setMeta({ ...meta, prazo_base_dias: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            value={meta.descricao}
            onChange={(e) => setMeta({ ...meta, descricao: e.target.value })}
          />
        </div>
        <Button size="sm" className="sm:col-span-2 sm:w-fit" onClick={saveMeta}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Salvar dados
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fases ({template.fases.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAddingFase(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar fase
        </Button>
      </div>

      {addingFase && (
        <div className="flex gap-2 rounded-lg bg-muted/40 p-3">
          <Input
            placeholder="Nome da fase"
            value={novaFase}
            onChange={(e) => setNovaFase(e.target.value)}
            autoFocus
          />
          <Button size="sm" onClick={addFase}>
            Adicionar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingFase(false)}>
            Cancelar
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {template.fases.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Fase {f.ordem}</Badge>
                <span className="font-medium text-foreground">{f.nome}</span>
                <span className="text-xs text-muted-foreground">
                  · {f.tarefas.length} tarefa(s)
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setAddingTarefa(f.id)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Tarefa
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir fase?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todas as tarefas dela serão removidas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeFase(f.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-1.5">
              {f.tarefas.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="flex-1">
                    <span className="font-medium">{t.titulo}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t.duracao_dias}d •{" "}
                      {t.tipo_prazo === "RELATIVO_AO_INICIO" ? "relativo ao início" : "após dependência"}
                      {t.impacta_prazo && " • impacta prazo"}
                      {t.gerar_apos_conclusao && " • gerar após"}
                    </span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeTarefa(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              {f.tarefas.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa nesta fase.</p>
              )}
            </div>

            {addingTarefa === f.id && (
              <div className="mt-3 space-y-3 rounded-lg border border-dashed border-border p-3">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={taskForm.titulo}
                    onChange={(e) => setTaskForm({ ...taskForm, titulo: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Duração (dias)</Label>
                    <Input
                      type="number"
                      value={taskForm.duracao_dias}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, duracao_dias: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Tipo prazo</Label>
                    <Select
                      value={taskForm.tipo_prazo}
                      onValueChange={(v) => setTaskForm({ ...taskForm, tipo_prazo: v as TipoPrazo })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RELATIVO_AO_INICIO">Relativo ao início</SelectItem>
                        <SelectItem value="RELATIVO_A_CONCLUSAO_DE_TAREFA">
                          Relativo à conclusão
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Depende de</Label>
                  <Select
                    value={taskForm.depende_de_template_tarefa_id ?? "none"}
                    onValueChange={(v) =>
                      setTaskForm({
                        ...taskForm,
                        depende_de_template_tarefa_id: v === "none" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {allTarefas.map((tt) => (
                        <SelectItem key={tt.id} value={tt.id}>
                          {tt.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Impacta prazo</Label>
                  <Switch
                    checked={taskForm.impacta_prazo}
                    onCheckedChange={(v) => setTaskForm({ ...taskForm, impacta_prazo: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Gerar após conclusão do pai</Label>
                  <Switch
                    checked={taskForm.gerar_apos_conclusao}
                    onCheckedChange={(v) => setTaskForm({ ...taskForm, gerar_apos_conclusao: v })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addTarefa(f.id)} className="flex-1">
                    Adicionar tarefa
                  </Button>
                  <Button variant="ghost" onClick={() => setAddingTarefa(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {template.fases.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Adicione fases para começar a estruturar o template.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
