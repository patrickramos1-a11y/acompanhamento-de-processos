## O que falta concluir

Na implementação anterior foram criadas as listas de **Serviços** e **Templates**, mas algumas peças do plano original ficaram pendentes e a preview apresenta um erro de runtime (`AppHeader is not defined`) que está derrubando a renderização SSR do painel.

### 1. Corrigir o erro de SSR em `/`

`src/routes/index.tsx` importa `AppHeader` corretamente, mas o erro `AppHeader is not defined` aparece em SSR. Causa provável: cache stale do dev server após a criação simultânea de `app-header.tsx`. Plano:

- Reiniciar o dev server (já feito) e reabrir a preview.
- Se persistir, reposicionar o import de `AppHeader` junto com os demais imports de `@/components/*` (linhas 7–15) para garantir que o code-splitter do TanStack o inclua no bundle do componente do route, e validar que o build limpo passa.

### 2. Componente `CronogramaServico`

Criar `src/components/cronograma-servico.tsx` — visualização de fases + tarefas com:

- Agrupamento por fase, ordenado por `ordem`.
- Cada tarefa: título, data prevista, status (pendente / concluída / atrasada), botão **Concluir**, popover **Estender prazo** (+N dias) e ação **Editar**.
- Indicador visual quando `impacta_prazo = true` ou `gerar_apos_conclusao = true`.
- Barra de progresso geral do serviço (concluídas / total).

Esse componente será usado tanto no expand do card em `/servicos` quanto na página de detalhe.

### 3. Página de detalhe `/servicos/$id`

Criar `src/routes/servicos.$id.tsx`:

- Loader com `ensureQueryData` em `getServicoById(id)` (server fn nova em `servicos.functions.ts`).
- Header com `AppHeader current="servicos"` + breadcrumb voltando para `/servicos`.
- Card de resumo: empresa, template de origem, data inicial, data prevista base vs atual, status, progresso.
- `CronogramaServico` completo + botão **Salvar como template** (chama `salvarServicoComoTemplate`).

### 4. Editor de template `/templates/$id`

Criar `src/routes/templates.$id.tsx`:

- Loader com `getTemplateById(id)` retornando template + fases + tarefas.
- Edição inline de nome, descrição, `prazo_base_dias`.
- CRUD de **Fases** (adicionar, renomear, remover, reordenar).
- CRUD de **Tarefas** por fase, com campos: título, `duracao_dias`, `tipo_prazo` (RELATIVO_AO_INICIO / RELATIVO_A_TAREFA / DATA_FIXA), `impacta_prazo`, `depende_de_template_tarefa_id` (Combobox listando tarefas do mesmo template), `gerar_apos_conclusao`, `ordem`.
- Botão **Duplicar template**.

### 5. Server functions adicionais em `src/lib/servicos.functions.ts`

- `getServicoById({ id })` — retorna serviço + empresa + tarefas ordenadas.
- `getTemplateById({ id })` — retorna template + fases + tarefas.
- `updateTemplateTarefa`, `reorderTemplateFases`, `reorderTemplateTarefas`.
- `extendTarefaDias({ tarefaId, dias })` + recálculo via `recalcularServico`.
- `salvarServicoComoTemplate({ servicoId, nome })`.

### 6. Links de navegação

- Em `/servicos`: tornar o nome do serviço clicável → `/servicos/$id`.
- Em `/templates`: botão **Editar** em cada card → `/templates/$id`.

### Detalhes técnicos

- Todas as queries seguem o padrão `queryOptions` + `ensureQueryData` no loader + `useSuspenseQuery` no componente.
- Mutações usam `useServerFn` + `useMutation` + `queryClient.invalidateQueries`.
- Reusar tokens do design system (`bg-gradient-hero`, `surface-elevated`, `glass`, `font-display`) já definidos em `src/styles.css` — sem cores hardcoded.
- Não criar tabelas novas; o schema atual já cobre tudo.
- Manter o cabeçalho `AppHeader` consistente em todas as três páginas (painel / serviços / templates) e suas filhas.
