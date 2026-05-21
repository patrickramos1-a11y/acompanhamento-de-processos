
# Plataforma de Acompanhamento de Processos Administrativos

Sistema em português do Brasil, sem autenticação, para gestão de processos junto a órgãos públicos. Identidade visual sóbria e institucional (verde escuro), com dados de exemplo realistas pré-populados.

---

## Etapa 1 — Fundação: Backend, Schema e Dados de Exemplo

**Objetivo:** ter o banco modelado, populado e pronto antes de qualquer tela.

1. Ativar Lovable Cloud.
2. Criar as tabelas principais com RLS aberta (acesso público, sem login):
   - `grupos_empresariais` (id, nome)
   - `empresas` (id, nome, grupo_id, cnpj opcional, segmento)
   - `tipos_processo` (id, nome, descricao)
   - `etapas` (id, tipo_processo_id, nome, descricao, cor, ordem)
   - `processos` (id, empresa_id, tipo_processo_id, nome, numero_protocolo, data_protocolo, etapa_atual_id, status [ativo/concluido/cancelado/suspenso], responsavel, criado_em, atualizado_em)
   - `tramitacoes` (id, processo_id, data_evento, descricao, status_no_momento, etapa_id, responsavel, setor_orgao, criado_em)
3. Índices em colunas usadas em filtro (empresa_id, tipo_processo_id, status, data_protocolo, etapa_atual_id).
4. View ou função auxiliar para identificar **processos parados** (ativos sem tramitação há >30 dias) — usada no painel e na sinalização por empresa.
5. **Seed realista** com inserts: ~6 grupos empresariais, ~15 empresas (postos, restaurantes, farmácias, indústrias, transportadoras), ~6 tipos de processo (licença de operação, alvará sanitário, carta de anuência, licença ambiental, alvará de funcionamento, AVCB), cada um com 4–7 etapas com cores; ~40 processos distribuídos em etapas e status variados; ~150 tramitações com descrições verossímeis e datas espalhadas.

---

## Etapa 2 — Design System e Shell da Aplicação

**Objetivo:** definir a linguagem visual antes de construir as telas.

1. Definir tokens em `src/styles.css` (oklch): verde escuro institucional como `--primary`, neutros frios para fundos/textos, cores semânticas para status (ativo, concluído, parado/alerta, cancelado, suspenso).
2. Tipografia sóbria adequada a contexto governamental (ex.: Inter para corpo + uma display discreta).
3. Padronizar componentes shadcn que serão reutilizados: tabela densa com cabeçalho verde escuro, badges de status/etapa, cards de KPI, timeline, stepper de progresso, formulários, dialogs de confirmação, toasts.
4. Layout shell em `__root.tsx`: sidebar/topbar de navegação com as seções **Painel, Processos, Acompanhamento, Empresas, Configurações**, breadcrumbs e área de conteúdo.
5. Utilitários globais: formatação de datas em pt-BR (`dd/MM/yyyy`), helper de "tempo desde última tramitação", componente de estado vazio com CTA, wrapper de loading/skeleton.

---

## Etapa 3 — Rotas, Server Functions e Camada de Dados

**Objetivo:** estrutura de rotas TanStack e RPC tipado pronto antes das telas.

1. Criar arquivos de rota: `index.tsx` (painel), `processos.tsx`, `processos.$id.tsx`, `acompanhamento.tsx`, `empresas.tsx`, `configuracoes.tsx`.
2. Cada rota com `head()` próprio (title/description em pt-BR).
3. Server functions (`createServerFn`) agrupadas por domínio em `src/lib/`:
   - `dashboard.functions.ts` — KPIs, resumo por empresa, processos ativos com progresso, últimas tramitações, distribuição por tipo.
   - `processos.functions.ts` — list (com filtros), get, create, update, delete, histórico expandido.
   - `tramitacoes.functions.ts` — list global com filtros, create (com flag de atualizar etapa atual do processo).
   - `empresas.functions.ts` — CRUD + resumo de processos por empresa + bloqueio de remoção quando houver vínculos.
   - `grupos.functions.ts` — CRUD.
   - `tipos.functions.ts` — CRUD de tipos e etapas, reordenação, validação de remoção quando a etapa é "atual" em algum processo.
4. Integração com TanStack Query (`ensureQueryData` + `useSuspenseQuery`); invalidação cruzada após mutações (ex.: nova tramitação invalida dashboard, processo, acompanhamento).
5. Validação com Zod em todas as entradas.

---

## Etapa 4 — Painel Principal

**Objetivo:** dashboard rico e nunca vazio.

1. Faixa superior com 4 KPIs visualmente distintos: Total, Ativos, Concluídos, Parados (>30 dias sem tramitação).
2. Grade de cards por empresa: nome, grupo, contagens por situação, badge de alerta quando houver processos parados; card clicável → `/processos?empresa=ID`.
3. Lista/grade de processos ativos com **stepper compacto** mostrando posição na sequência de etapas do seu tipo; processos parados com indicador de alerta.
4. Coluna lateral ou seção com **últimas tramitações** (cronológica, com link para o processo).
5. Mini-visualização de **processos por tipo** (barras simples ou lista com contagem).
6. Skeletons durante carregamento; nunca renderizar vazio sem contexto.

---

## Etapa 5 — Listagem e Cadastro de Processos

**Objetivo:** tabela densa, filtrável, com expansão inline.

1. Tabela com colunas: Empresa, Tipo, Nome/Descrição, Protocolo, Data do protocolo, Etapa atual (badge colorido), Status, Responsável, Ações.
2. Filtros funcionais no topo (empresa, grupo, tipo, status, responsável, período, busca textual por nome/protocolo); combinados e instantâneos.
3. **Estado dos filtros persistido na URL** via `validateSearch` + `zodValidator` + `fallback`, com `retainSearchParams` para sobreviver à navegação ida-e-volta ao detalhe.
4. Linha expansível mostrando histórico de tramitações inline (read-only, com link para o detalhe completo).
5. Linhas de processos **cancelados/suspensos** com aparência visual distinta (opacidade, badge).
6. Botão "Novo processo" abrindo dialog/sheet com formulário: ao escolher o tipo, as etapas daquele tipo aparecem dinamicamente para escolha da etapa inicial. Validação Zod com mensagens amigáveis em pt-BR.
7. Ações por linha: Editar, Registrar tramitação, Ver detalhe, Excluir (com confirmação).

---

## Etapa 6 — Página de Detalhe do Processo

**Objetivo:** visão completa com timeline e progresso.

1. Cabeçalho com dados cadastrais editáveis inline (ou em modo edição).
2. **Stepper horizontal** com todas as etapas do tipo, destacando a atual e marcando as anteriores como percorridas; processos concluídos com stepper totalmente completo.
3. Timeline vertical de tramitações (mais recente no topo) com data, status no momento, descrição completa sem truncar, responsável, setor/órgão, badge da etapa associada.
4. Botão destacado "Registrar tramitação" abrindo formulário com: data do evento, descrição, status atual, etapa associada (opcional), responsável, setor/órgão, e **checkbox "Atualizar etapa atual do processo" marcado por padrão**.
5. Após submissão: invalidar queries de processo, dashboard e acompanhamento; toast de confirmação.

---

## Etapa 7 — Seção de Acompanhamento

**Objetivo:** leitura global de atividade.

1. Tabela única consolidando todas as tramitações com colunas: Data, Processo (link), Empresa, Tipo, Descrição (truncada com tooltip), Responsável, Setor.
2. Filtros: empresa, tipo, responsável, **intervalo de datas**, busca textual na descrição.
3. Estado de filtros também na URL.
4. CTA "Registrar tramitação" com seletor de processo por nome ou protocolo (combobox de busca).

---

## Etapa 8 — Empresas e Grupos Empresariais

**Objetivo:** CRUD com gestão integrada de grupos.

1. Listagem em cards/tabela com nome, grupo, resumo visual de processos (total e por situação).
2. CRUD de empresas (dialog) com seleção de grupo existente ou criação inline.
3. Gestão de grupos no mesmo lugar (aba ou painel lateral): criar, renomear, remover (apenas se sem empresas vinculadas).
4. Remoção de empresa bloqueada quando houver processos, com mensagem explicativa listando o motivo.

---

## Etapa 9 — Configuração de Tipos de Processo e Etapas

**Objetivo:** administração do fluxo.

1. Lista de tipos de processo com contagem de processos vinculados.
2. CRUD de tipos (nome, descrição).
3. Painel de etapas por tipo: lista ordenável (drag-and-drop com `@dnd-kit`), cada etapa editável (nome, descrição, **cor** via color picker controlado).
4. Adicionar/editar/remover etapa; remoção bloqueada se a etapa é etapa atual de algum processo, com lista dos processos afetados.
5. Persistir nova ordem após reordenação.

---

## Etapa 10 — Polimento, Microinterações e QA

**Objetivo:** entregar com nível de produto.

1. Toasts (sonner) em todas as mutações; mensagens de erro amigáveis (nunca técnicas).
2. Dialogs de confirmação para exclusões.
3. Skeletons em todas as telas de carregamento; estados vazios com CTA contextual.
4. Revisão de acessibilidade básica (labels, foco, contraste).
5. Verificar formato pt-BR em todas as datas e números.
6. Revisar consistência visual (badges, espaçamentos, cabeçalho verde escuro nas tabelas).
7. Testar fluxos completos: cadastrar processo → registrar tramitações → ver progresso evoluir no stepper e no dashboard; filtros persistirem na URL ao voltar do detalhe; remoções bloqueadas funcionando.

---

## Detalhes técnicos

- **Stack:** TanStack Start + React 19 + Tailwind v4 + shadcn/ui + TanStack Query + Lovable Cloud (Supabase via cliente autenticado nas server functions, RLS pública por escolha de produto).
- **Rotas:** arquivos planos em `src/routes/` (`index`, `processos`, `processos.$id`, `acompanhamento`, `empresas`, `configuracoes`).
- **Filtros na URL:** `validateSearch` com Zod + `fallback` + `retainSearchParams`.
- **Drag-and-drop** de etapas: `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Datas:** `date-fns` com locale `ptBR`.
- **Processos parados:** calculado em server function como `status='ativo' AND (última tramitação ou data_protocolo) < now() - interval '30 days'`.
- **Seed:** migração SQL com inserts realistas; idempotente via `ON CONFLICT DO NOTHING` por chaves naturais.

## Fora do escopo

- Autenticação/usuários (acesso direto, como solicitado).
- Versão mobile dedicada (foco em desktop, mas responsivo básico).
- Upload de arquivos/anexos em tramitações.
- Notificações por e-mail.
