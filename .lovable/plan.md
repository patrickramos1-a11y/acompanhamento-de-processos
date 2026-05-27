## Problema
Os cards de empresa no Painel estão com aparência apagada: as pills "Total / Ativos / Concluídos" usam fundos muito sutis (`bg-muted/70`, `bg-info/10`, `bg-success/10`) sem borda, e o card em si tem pouco contraste e relevo.

## Mudanças (apenas visual, em `src/routes/index.tsx`)

### 1. `PillMetric` — mais vivo
- Aumentar saturação do fundo: `bg-info/15` → `bg-info/20` com `border border-info/30` (idem para success).
- Variante neutra (`Total`): trocar `bg-muted/70` por `bg-secondary/60 border border-border` para destacar.
- Aumentar tamanho do número (`text-lg`) e do label (`text-[10px]`, sem opacity).
- Adicionar `shadow-sm` sutil.

### 2. Card da empresa
- Trocar `surface-card` por `surface-elevated` para ganhar o gradiente sutil do tema.
- Borda mais marcada no hover: `hover:border-primary/50` + `hover:shadow-[var(--shadow-lg)]`.
- Faixa superior do gradiente accent: aumentar para `h-1` e deixar visível por padrão com `opacity-60`, indo a `opacity-100` no hover.
- Avatar: subir para `h-11 w-11`, adicionar `ring-2 ring-primary/20` e `shadow-accent-glow` leve.

### 3. Barra de progresso
- Aumentar altura para `h-2`.
- Fundo `bg-secondary` (em vez de `bg-muted`) para mais contraste.
- Percentual em `text-sm font-bold text-primary`.

### Fora de escopo
Layout, responsividade, lógica de dados, demais cards/KPIs da página.