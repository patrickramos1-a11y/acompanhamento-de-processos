import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { importProcessos, importAcompanhamentos } from "@/lib/import.functions";
import { toast } from "sonner";
import {
  Settings,
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Acompanhamento de Processos" },
      { name: "description", content: "Configurações da plataforma e importação de processos." },
    ],
  }),
  component: ConfiguracoesPage,
});

type Resultado = Awaited<ReturnType<typeof importProcessos>>;
type ResultadoAcomp = Awaited<ReturnType<typeof importAcompanhamentos>>;

function ConfiguracoesPage() {
  const importar = useServerFn(importProcessos);
  const importarAcomp = useServerFn(importAcompanhamentos);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [loadingAcomp, setLoadingAcomp] = useState(false);
  const [resultadoAcomp, setResultadoAcomp] = useState<ResultadoAcomp | null>(null);
  const [erroAcomp, setErroAcomp] = useState<string | null>(null);
  const inputAcompRef = useRef<HTMLInputElement>(null);


  async function handleImportarArquivo(file: File | null) {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      const msg = "Selecione uma planilha .xlsx ou .xls";
      setErroGeral(msg);
      toast.error(msg);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setLoading(true);
    setErroGeral(null);
    setResultado(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await importar({ data: formData });
      setResultado(res);
      toast.success(
        `Importação concluída: ${res.processosCriados} criado(s), ${res.processosAtualizados} atualizado(s)`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["servicos-data"], refetchType: "active" }),
      ]);
    } catch (e: any) {
      console.error("Erro na importação:", e);
      const msg = e?.message ?? "Falha na importação";
      setErroGeral(msg);
      toast.error(msg);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setLoading(false);
    }
  }

  function abrirSeletorArquivo() {
    if (loading) return;
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  async function handleImportarAcomp(file: File | null) {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      const msg = "Selecione uma planilha .xlsx ou .xls";
      setErroAcomp(msg);
      toast.error(msg);
      if (inputAcompRef.current) inputAcompRef.current.value = "";
      return;
    }
    setLoadingAcomp(true);
    setErroAcomp(null);
    setResultadoAcomp(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await importarAcomp({ data: formData });
      setResultadoAcomp(res);
      toast.success(
        `Acompanhamentos: ${res.tramitacoesCriadas} criado(s), ${res.tramitacoesIgnoradas} ignorado(s)`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["servicos-data"], refetchType: "active" }),
      ]);
    } catch (e: any) {
      console.error("Erro na importação de acompanhamentos:", e);
      const msg = e?.message ?? "Falha na importação";
      setErroAcomp(msg);
      toast.error(msg);
    } finally {
      if (inputAcompRef.current) inputAcompRef.current.value = "";
      setLoadingAcomp(false);
    }
  }

  function abrirSeletorAcomp() {
    if (loadingAcomp) return;
    if (inputAcompRef.current) inputAcompRef.current.value = "";
    inputAcompRef.current?.click();
  }


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">Configurações</h1>
              <p className="truncate text-xs text-sidebar-foreground/70">
                Importação de dados e ajustes da plataforma
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-foreground/20 px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-foreground/10 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-card-foreground">
                Importar processos a partir de planilha
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Envie um arquivo <code className="rounded bg-muted px-1">.xlsx</code> com as
                colunas: <strong>Empresa</strong>, <strong>Grupo Empresarial</strong>,{" "}
                <strong>Tipo de Processo</strong>, <strong>Nome</strong>,{" "}
                <strong>Nº do Processo</strong>, <strong>Data do Protocolo</strong>,{" "}
                <strong>Status</strong> e <strong>Responsável</strong>. Empresas, grupos e
                tipos serão criados automaticamente quando não existirem.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Processos com status <em>"Em análise pela Ramos"</em> são convertidos
                automaticamente para <em>"Em análise pelo órgão"</em>.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <input
                  id="file-input"
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => void handleImportarArquivo(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={abrirSeletorArquivo}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {loading ? "Importando..." : "Importar processos"}
                </button>
                <span className="text-sm text-muted-foreground">
                  Clique no botão para escolher a planilha e iniciar a importação automaticamente.
                </span>
              </div>
            </div>
          </div>

          {erroGeral && (
            <div className="mt-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <div className="font-medium">Erro na importação</div>
                <div className="mt-0.5 text-xs">{erroGeral}</div>
              </div>
            </div>
          )}

          {resultado && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Importação concluída — {resultado.totalLinhas} linha(s) processada(s)
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Stat label="Processos criados" value={resultado.processosCriados} tone="success" />
                <Stat label="Processos atualizados" value={resultado.processosAtualizados} tone="info" />
                <Stat label="Empresas criadas" value={resultado.empresasCriadas} />
                <Stat label="Grupos criados" value={resultado.gruposCriados} />
                <Stat label="Tipos criados" value={resultado.tiposCriados} />
              </div>
              {resultado.erros.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    {resultado.erros.length} linha(s) com problema
                  </div>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-muted-foreground">
                    {resultado.erros.map((e, i) => (
                      <li key={i} className="font-mono">
                        Linha {e.linha}: {e.mensagem}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-card-foreground">
                Importar acompanhamentos de processos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Envie um arquivo <code className="rounded bg-muted px-1">.xlsx</code> com as
                colunas: <strong>Empresa</strong>, <strong>Tipo de processo</strong>,{" "}
                <strong>Nº do processo</strong>, <strong>Status</strong>,{" "}
                <strong>Descrição</strong>, <strong>Data</strong> e{" "}
                <strong>Responsável</strong>. Cada linha será vinculada automaticamente ao
                processo já cadastrado pelo nome da empresa + nº do processo.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Importe primeiro os processos. Linhas sem processo correspondente são
                listadas como pendência (nada é criado em branco).
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <input
                  ref={inputAcompRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => void handleImportarAcomp(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={abrirSeletorAcomp}
                  disabled={loadingAcomp}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loadingAcomp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {loadingAcomp ? "Importando..." : "Importar acompanhamentos"}
                </button>
                <span className="text-sm text-muted-foreground">
                  Clique no botão para escolher a planilha de acompanhamentos.
                </span>
              </div>
            </div>
          </div>

          {erroAcomp && (
            <div className="mt-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <div className="font-medium">Erro na importação</div>
                <div className="mt-0.5 text-xs">{erroAcomp}</div>
              </div>
            </div>
          )}

          {resultadoAcomp && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Importação concluída — {resultadoAcomp.totalLinhas} linha(s) processada(s)
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Acompanhamentos criados" value={resultadoAcomp.tramitacoesCriadas} tone="success" />
                <Stat label="Ignorados (duplicados)" value={resultadoAcomp.tramitacoesIgnoradas} tone="info" />
                <Stat label="Linhas com erro" value={resultadoAcomp.erros.length} />
              </div>
              {resultadoAcomp.erros.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    {resultadoAcomp.erros.length} linha(s) com problema
                  </div>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-muted-foreground">
                    {resultadoAcomp.erros.map((e, i) => (
                      <li key={i} className="font-mono">
                        Linha {e.linha}: {e.mensagem}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "info";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "info"
        ? "text-info"
        : "text-card-foreground";
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
