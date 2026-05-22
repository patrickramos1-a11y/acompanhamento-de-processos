## Objetivo

Tornar toda a plataforma totalmente responsiva, mantendo a identidade visual atual. Sem mudanças de regra de negócio — apenas layout, navegação e componentes de UI.

## Escopo

Arquivos afetados (apenas frontend/apresentação):
- `src/components/app-header.tsx`
- `src/components/cronograma-servico.tsx`
- `src/components/multi-select.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx` (1104 linhas — Painel + tabelas grandes)
- `src/routes/servicos.index.tsx`
- `src/routes/servicos.$id.tsx`
- `src/routes/templates.index.tsx`
- `src/routes/templates.$id.tsx`
- `src/routes/configuracoes.tsx`
- `src/styles.css` (ajustes pontuais de tokens/utilitários responsivos)

## Estratégia geral

Breakpoints Tailwind padrão:
- Mobile: base (< 640px)
- Tablet: `sm` (640px) e `md` (768px)
- Desktop: `lg` (1024px) e `xl` (1280px)

Princípios:
1. Mobile-first: classes base para mobile, escalando com `sm:`, `md:`, `lg:`.
2. Padding/tipografia fluida: `px-4 sm:px-6 lg:px-8`, `text-xl sm:text-2xl`.
3. Tabelas grandes → wrapper `overflow-x-auto` no desktop, **cards empilhados** no mobile (`md:hidden` para cards, `hidden md:table` para tabela).
4. Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` para KPIs.
5. Filtros e barras de ação: `flex-col sm:flex-row` com `flex-wrap` e largura total dos selects no mobile.

## Mudanças por arquivo

### `app-header.tsx`
- Container: `px-4 sm:px-6` e `py-5 sm:py-7`.
- Título: `text-xl sm:text-2xl`; ícone `h-10 w-10 sm:h-12 sm:w-12`.
- Tabs: scroll horizontal no mobile (`overflow-x-auto -mx-4 px-4` no wrapper, `whitespace-nowrap` nos links) para evitar quebra. Labels visíveis sempre; ícones reduzidos em mobile.
- Botão Configurações: já tem `hidden sm:inline` no label — manter, mas garantir área de toque mínima 40px.

### `__root.tsx`
- Garantir `<meta name="viewport" content="width=device-width, initial-scale=1">` no head (verificar e adicionar se faltar).
- `<body>` com `min-h-dvh` em vez de `min-h-screen` para evitar problema da barra do navegador mobile.

### `routes/index.tsx` (Painel)
- Container principal: `max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8`.
- KPIs (linha 208): manter `md:grid-cols-2 lg:grid-cols-4` mas adicionar `grid-cols-1 sm:grid-cols-2`.
- Grid de cards (linha 224): já ok, validar `gap-3 sm:gap-4`.
- **Tabela de processos (linhas 420–528) e segunda tabela (886–996)**:
  - Wrapper atual: adicionar `<div className="overflow-x-auto -mx-4 sm:mx-0">` no breakpoint desktop.
  - Versão mobile (`md:hidden`): renderizar lista de cards com os mesmos dados (status badge + colunas principais empilhadas).
  - Versão desktop (`hidden md:block`): tabela atual com scroll horizontal de segurança.
- Barra de busca/filtros (linha 339): `flex-col sm:flex-row`, busca `w-full sm:min-w-[240px]`.
- Botões de ação: `w-full sm:w-auto` no mobile; agrupar em `flex-wrap gap-2`.

### `routes/servicos.index.tsx`
- KPIs (linha 206): `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4` (KPIs em 2 colunas no mobile fica melhor que 1).
- Filtros (multi-select): empilhar verticalmente no mobile, `w-full` nos selects.
- Lista expansível: padding reduzido `p-3 sm:p-5`; ações em `flex-wrap`.

### `routes/servicos.$id.tsx`
- Card resumo (linha 82): `grid-cols-2 md:grid-cols-4` (4 KPIs em 2x2 no mobile).
- Header de ações: empilhar em mobile.

### `routes/templates.index.tsx` e `templates.$id.tsx`
- Editor fase/tarefa (linha 326): `sm:grid-cols-[1fr_140px]` já bom — adicionar `gap-2` no mobile.
- Diálogos: garantir `max-h-[90vh] overflow-y-auto` e `w-[95vw] sm:max-w-lg`.
- Grid de KPIs do template (linha 63): `grid-cols-1 sm:grid-cols-3`.

### `routes/configuracoes.tsx`
- Já parcialmente responsivo. Validar abas — usar scroll horizontal se necessário.
- Grids de cores (linha 217, 309): já corretos.

### `components/cronograma-servico.tsx`
- Cabeçalho da fase: `flex-col sm:flex-row` para barra de progresso.
- Tarefa: ações (concluir/estender) em `flex-wrap`; popover ajustado com `w-[calc(100vw-2rem)] sm:w-80`.
- Badges de status: encurtar texto no mobile via classes utilitárias ou apenas ícone.

### `components/multi-select.tsx`
- Trigger: `w-full` por padrão.
- Popover content: `w-[var(--radix-popover-trigger-width)]` para casar com o trigger.

### `styles.css`
- Adicionar utilitário `.no-scrollbar` para a faixa de tabs.
- Garantir `html { -webkit-text-size-adjust: 100%; }`.
- Revisar fontes display: `clamp()` para títulos hero se houver.

## Validação

1. `bun run build` (rodado automaticamente).
2. Testar em viewports: 375 (mobile), 768 (tablet), 1024 e 1440 (desktop) via preview.
3. Conferir: navegação header, KPIs, tabelas (sem overflow lateral indesejado da página), diálogos, filtros multi-select.

## Fora do escopo

- Mudanças em lógica de negócio, server functions, schema do banco.
- Reorganização de rotas ou criação de novas páginas.
- Alterações de paleta/identidade visual.
