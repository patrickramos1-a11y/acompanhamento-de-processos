## Objetivo

Adicionar duas novas seções ao painel — **Serviços** e **Templates** — replicando a funcionalidade do projeto "Remix of Service Flow", mas vinculando os serviços às **empresas** já existentes (não há cadastro de clientes, pois as empresas vêm da importação de planilhas).

## Navegação

Adicionar uma barra de navegação no header (em `__root.tsx` ou no header já existente do `index.tsx`) com os links:

- **Painel** (`/`) — tela atual de processos
- **Serviços** (`/servicos`) — nova
- **Templates** (`/templates`) — nova

Mesmo visual "Verde Mata" do painel (glass, gradient hero, Syne nas headings).

## Banco de dados (nova migração)

Quatro tabelas novas em `public.*`, todas com RLS aberto por enquanto (mesmo padrão das tabelas atuais — sem auth no app):

- **`templates`** — `nome`, `prazo_base_dias`, `descricao`
- **`template_fases`** — pertence a um template — `nome`, `ordem`
- **`template_tarefas`** — pertence a uma fase — `titulo`, `duracao_dias`, `tipo_prazo` (`RELATIVO_AO_INICIO` | `RELATIVO_A_CONCLUSAO_DE_TAREFA`), `impacta_prazo`, `depende_de_template_tarefa_id`, `gerar_apos_conclusao`
- **`servicos`** — `empresa_id` (FK → `empresas.id`), `template_id`, `nome`, `data_inicial`, `prazo_base_dias`, `data_prevista_base`, `data_prevista_atual`, `status` (`em_andamento` | `concluido` | `cancelado`)
- **`servico_tarefas`** — pertence a um serviço — mesmos campos da template_tarefa + `fase_nome`, `status` (`pendente` | `concluida` | `bloqueada`), `data_prevista`, `data_conclusao`

Tudo com `created_at`/`updated_at` e trigger de `updated_at`.

## Server functions (TanStack)

Novo arquivo `src/lib/servicos.functions.ts` com:

- `listTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`
- `listServicos` (join com empresa), `criarServicoFromTemplate(empresaId, templateId, dataInicial)`, `deleteServico`
- `concluirTarefa`, `adicionarTarefa`, `editarTarefa`, `extendTarefaDias`, `salvarServicoComoTemplate`

E `src/lib/dateCalculations.ts` portado do projeto referência (recálculo de datas previstas com base em dependências + `tipo_prazo` + `impacta_prazo`).

## Rotas

- **`src/routes/servicos.tsx`** — lista de serviços com:
  - 4 KPI cards (Serviços, Concluídas, Atrasadas, Pendentes) calculadas a partir das tarefas filtradas
  - Filtros: mês, ano, empresa (multi-select), status do serviço, status de tarefa
  - Lista de serviços expansíveis mostrando tarefas (concluir / editar / +dias / cronograma)
  - Botão "Novo Serviço" → diálogo escolhe empresa + template + data inicial
  - Botão "Salvar como template"
- **`src/routes/servicos.$id.tsx`** — detalhe do serviço (cronograma completo, gerenciar tarefas)
- **`src/routes/templates.tsx`** — lista de templates (criar / excluir / abrir)
- **`src/routes/templates.$id.tsx`** — editor de template (fases + tarefas, dependências, prazos)

Cada rota com `head()` próprio, `errorComponent`, `notFoundComponent`, loader via TanStack Query (`ensureQueryData` + `useSuspenseQuery`).

## Diferenças vs. projeto referência

- **Sem rota `/clientes`** nem cadastro — o seletor de "cliente" no diálogo de novo serviço usa as **empresas existentes** (com busca por nome/CNPJ).
- Visual completo no estilo Verde Mata já implementado nesta plataforma (Syne nas headings, surface-elevated/glass nos containers, gradient-hero no header).
- Stack atual: TanStack Start + Supabase via server functions (não zustand/react-router-dom).

## Detalhes técnicos

- Tipos compartilhados em `src/types/servicos.ts` (TipoPrazo, StatusTarefa, StatusServico, Template, Servico, etc.).
- `dateCalculations.ts` puro (sem dependências de runtime) — usado tanto no servidor quanto no cliente.
- Componente `CronogramaServico` portado para `src/components/cronograma-servico.tsx`.
- Uso de `Dialog`, `AlertDialog`, `Popover`, `Command`, `Switch`, `Checkbox`, `Collapsible`, `Textarea` — todos já presentes em `src/components/ui/`.
- Invalidation: `router.invalidate()` após mutações para revalidar loaders.

## Entregáveis

1. Migração SQL com as 5 tabelas + RLS + triggers
2. `src/lib/servicos.functions.ts` + `src/lib/dateCalculations.ts` + `src/types/servicos.ts`
3. 4 novas rotas (`servicos`, `servicos.$id`, `templates`, `templates.$id`)
4. Componente `CronogramaServico`
5. Header com navegação entre Painel / Serviços / Templates
