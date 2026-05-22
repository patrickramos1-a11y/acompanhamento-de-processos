## Redesign visual da plataforma (referência: PROSPECÇÃO)

Apenas mudanças visuais — sem tocar em filtros, queries, rotas ou lógica de dados.

### 1. Sistema de design (`src/styles.css`)

- Adicionar fontes **Inter** (corpo) + **Syne** (títulos H1-H3) via `<link>` no `__root.tsx`.
- Definir tokens em `oklch` mantendo a paleta verde mata + bege terra + âmbar (já presente), e adicionar:
  - `--gradient-hero` (verde profundo → verde médio)
  - `--gradient-card` (branco → bege muito claro)
  - `--gradient-accent` (âmbar)
  - `--shadow-sm / md / lg` com tinta verde
  - `--accent` reposicionado como âmbar (hoje está como verde claro)
- Utilitários novos: `.surface-card`, `.surface-elevated`, `.glass`, `.text-gradient`, animação `.animate-fade-in`.

### 2. Header (`src/routes/index.tsx`)

- Hero header alto com `--gradient-hero` de fundo, padrão sutil (radial highlight), texto em Syne.
- Ícone do logo em cartão âmbar com glow.
- Subtítulo em tom claro com melhor hierarquia.
- Botão "Configurações" com tratamento `glass`.

### 3. KPIs (4 cards superiores)

- Aumentar para `surface-elevated` com gradiente sutil e shadow-md.
- Número grande em Syne (tabular).
- Ícone dentro de bolha colorida (success/info/warning/destructive).
- Microbarra ou delta abaixo de cada KPI (ex.: "% do total").

### 4. Cartões de empresa

- Cards com `surface-card`, hover lift (transform + shadow-lg + ring leve).
- Cabeçalho com avatar/inicial em bolha verde, nome em Syne.
- Stats (Total / Ativos / Concluídos) em mini-pills com cor própria.
- Mini progress bar no rodapé do card (concluídos/total).

### 5. "Processos por tipo"

- Card próprio com gradiente claro, barra de progresso mais grossa e arredondada com cor por tipo.
- Hover destacando a linha clicada (já é seletor).

### 6. Filtros

- Cápsula `glass` com leve sombra; trigger dos multi-selects ganha estilo "pill" com ícone à esquerda.
- Search input com ícone integrado e ring verde no foco.
- Badge de contagem com cor `primary` em vez de neutro.

### 7. Tabela de processos

- Cabeçalho com gradiente verde escuro suave e texto âmbar claro (em vez de verde chapado atual).
- Linhas com hover `bg-accent/40` e zebra muito sutil.
- Badges de status usando classes `.status-*` (alta/média/baixa fidelidade) com bordas finas.
- Barra de progresso mais grossa (h-2) com cantos arredondados e fundo gradient por etapa.

### 8. Divisor "Histórico" + Últimas tramitações

- Divisor já existe — ajustar pill para usar `surface-elevated` com âmbar.
- Cartão da seção em `bg-gradient-card` com header destacado.
- Cada item de tramitação com avatar da empresa (inicial em bolha), badge de status colorido, "data" em chip âmbar discreto.

### 9. Footer

- Manter, mas em tipografia menor + ícone discreto.

### 10. Refinos transversais

- Cantos: trocar `rounded-lg` → `rounded-xl` em superfícies principais.
- Animação `animate-fade-in` em todos os blocos no mount.
- Scrollbar custom (já no PROSPECÇÃO) portada.
- Spacing geral: respiros maiores entre seções (gap-8 → gap-10).

### Arquivos afetados

- `src/styles.css` (tokens, fontes, utilitários, scrollbar, animações)
- `src/routes/__root.tsx` (link das fontes Google)
- `src/routes/index.tsx` (header, KPIs, cards empresa, processos por tipo, filtros, tabela, tramitações)
- Possivelmente pequenos ajustes em `src/components/multi-select.tsx` para o estilo pill

Sem mudanças em rotas, schema, server functions ou lógica de filtragem.