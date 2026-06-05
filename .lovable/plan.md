# Plano: Tarefas vinculadas ao processo

Adicionar à linha do processo um botão "Criar tarefa" ao lado de "Ver acompanhamentos". A tarefa é um **serviço** criado a partir de um template, vinculado tanto à empresa quanto ao processo. O modal de acompanhamentos passa a mostrar e gerenciar esses serviços, e a tela de Serviços continua refletindo o mesmo estado em tempo real.

## 1. Banco de dados (migration)

Adicionar vínculo opcional do serviço ao processo:

- `servicos.processo_id uuid NULL` — referência lógica a `processos.id` (sem FK rígida, seguindo o padrão atual do projeto).
- Índice em `servicos.processo_id` para listar rápido por processo.

Vários serviços por processo são suportados naturalmente (sem unique).

## 2. Backend (`src/lib/servicos.functions.ts`)

- `criarServicoFromTemplate`: aceitar `processo_id?: string` opcional e persistir na nova coluna.
- `getServicosData` e `getServicoById`: incluir `processo_id` no DTO de serviço.
- Nova `getServicosByProcesso({ processo_id })`: retorna a lista de serviços do processo com suas tarefas — usada pelo modal de acompanhamentos.
- `getServicosData` continua devolvendo todos os serviços para a tela de Serviços (lá eles aparecem normalmente, mesmo vinculados a processo).

## 3. UI — Lista de processos (`src/routes/index.tsx`)

Na coluna **AÇÕES** da tabela de processos, ao lado de "Ver acompanhamentos":

- Novo botão **"Criar tarefa"** (ícone `ListPlus` ou `Plus`).
- Abre um modal com:
  - Empresa pré-preenchida (do processo) — somente leitura.
  - Select de **Template** (carregado de `getServicosData`).
  - Campo **Data inicial** (default = hoje).
  - Botão "Criar" chama `criarServicoFromTemplate({ empresa_id, processo_id, template_id, data_inicial })`.
- Após criar: invalidar caches (`servicos-data` e a query do modal) e fechar o modal.

A barra de **Progresso** da linha continua refletindo a **etapa do processo** (sem alteração).

## 4. UI — Modal "Ver acompanhamentos" (`ProcessoTramitacoesModal`)

Acrescentar uma nova seção **"Tarefas / Serviços"** acima ou abaixo das tramitações:

- Lista os serviços vinculados ao processo (via `getServicosByProcesso`).
- Cada serviço mostra: nome do template, status, data prevista, e a lista de tarefas por fase.
- Cada tarefa traz checkbox para **concluir/reabrir**, chamando `concluirTarefa` / `reabrirTarefa` já existentes.
- Tarefas bloqueadas aparecem desabilitadas com indicação visual.
- Link "Abrir serviço" leva para `/servicos/$id` para edição completa.
- Após cada mutação: invalidar `["servicos-por-processo", processoId]` e `["servicos-data"]` para sincronizar a tela de Serviços.

## 5. Sincronização bidirecional

Como ambos os lados (modal de acompanhamentos e tela de Serviços) leem das mesmas tabelas (`servicos` / `servico_tarefas`) e usam as mesmas mutations, o estado é sempre o mesmo. As invalidações garantem que concluir uma tarefa em um lugar reflita imediatamente no outro ao recarregar/abrir.

## Detalhes técnicos

- Tipos: atualizar `src/types/servicos.ts` para incluir `processo_id?: string | null` em `Servico`.
- Query keys novas: `["servicos-por-processo", processoId]`.
- Reaproveitar `criarServicoFromTemplate`, `concluirTarefa`, `reabrirTarefa` — sem duplicar lógica.
- Sem alteração na barra de progresso do processo nem na regra de "parados há mais de 30 dias".
