import { useMemo, useState } from "react";
import { Check, AlertTriangle, Clock, Lock, RotateCcw, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import type { Servico, ServicoTarefa } from "@/types/servicos";
import { calcularProgresso, formatDate, tarefaAtrasada } from "@/lib/dateCalculations";

export function CronogramaServico({
  servico,
  onConcluir,
  onReabrir,
  onExtend,
}: {
  servico: Servico;
  onConcluir: (tarefaId: string) => void;
  onReabrir: (tarefaId: string) => void;
  onExtend: (tarefaId: string, dias: number) => void;
}) {
  const progresso = calcularProgresso(servico);

  const fases = useMemo(() => {
    const map = new Map<string, ServicoTarefa[]>();
    for (const t of servico.tarefas) {
      if (t.gerar_apos_conclusao && t.status === "bloqueada") continue;
      const list = map.get(t.fase_nome) ?? [];
      list.push(t);
      map.set(t.fase_nome, list);
    }
    return Array.from(map.entries());
  }, [servico.tarefas]);

  return (
    <div className="space-y-5">
      <div className="surface-elevated rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Progresso geral
          </div>
          <span className="font-display text-2xl font-bold tabular-nums">{progresso}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {fases.map(([nomeFase, tarefas]) => (
        <div key={nomeFase} className="space-y-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {nomeFase || "Sem fase"}
          </h3>
          <div className="space-y-2">
            {tarefas.map((t) => (
              <TarefaRow
                key={t.id}
                t={t}
                onConcluir={() => onConcluir(t.id)}
                onReabrir={() => onReabrir(t.id)}
                onExtend={(dias) => onExtend(t.id, dias)}
              />
            ))}
          </div>
        </div>
      ))}

      {fases.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem tarefas neste serviço.</p>
      )}
    </div>
  );
}

function TarefaRow({
  t,
  onConcluir,
  onReabrir,
  onExtend,
}: {
  t: ServicoTarefa;
  onConcluir: () => void;
  onReabrir: () => void;
  onExtend: (dias: number) => void;
}) {
  const isLate = tarefaAtrasada(t);
  const [dias, setDias] = useState(1);

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3 ${
        t.status === "concluida"
          ? "border-success/30 bg-success/5"
          : isLate
            ? "border-destructive/30 bg-destructive/5"
            : t.status === "bloqueada"
              ? "border-muted bg-muted/30 opacity-70"
              : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3 sm:flex-1">
        <div className="mt-0.5 shrink-0 sm:mt-0">
          <TaskIcon status={t.status} isLate={isLate} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`break-words font-medium ${t.status === "concluida" ? "line-through opacity-60" : ""}`}>
              {t.titulo}
            </span>
            {t.impacta_prazo && (
              <Badge variant="outline" className="border-warning/40 text-[10px] text-warning-foreground">
                impacta prazo
              </Badge>
            )}
            {t.gerar_apos_conclusao && (
              <Badge variant="outline" className="text-[10px]">gerar após</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t.duracao_dias}d • Previsão: {formatDate(t.data_prevista)}
            {t.data_conclusao && ` • Concluída: ${formatDate(t.data_conclusao)}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:justify-start">
        {t.status === "pendente" && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" title="Estender prazo" className="h-8 w-8 p-0">
                  <CalendarPlus className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(calc(100vw-2rem),14rem)] space-y-2 p-3">
                <p className="text-xs font-medium">Estender prazo</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={dias}
                    onChange={(e) => setDias(parseInt(e.target.value) || 1)}
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => onExtend(dias)}>+{dias}d</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={onConcluir} className="h-8 gap-1">
              <Check className="h-3.5 w-3.5" />
              <span>Concluir</span>
            </Button>
          </>
        )}
        {t.status === "concluida" && (
          <Button size="sm" variant="ghost" onClick={onReabrir} title="Reabrir" className="h-8 w-8 p-0">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function TaskIcon({ status, isLate }: { status: string; isLate: boolean }) {
  if (status === "concluida") return <Check className="h-4 w-4 text-success" />;
  if (status === "bloqueada") return <Lock className="h-4 w-4 text-muted-foreground" />;
  if (isLate) return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}
