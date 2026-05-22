## Problema

O layout atual usa `float` para o card "Processos por tipo", mas o container dos cards de empresa usa `display: grid`, que estabelece seu próprio contexto de formatação e **não envolve floats** — por isso fica o buraco vazio embaixo do gráfico.

## Solução

Trocar o `float` por um **único CSS Grid de 3 colunas** que contém tudo (cards de empresa + card de tipos), posicionando o card de tipos explicitamente na coluna 3 e limitando sua altura em linhas. As empresas usam auto-placement com `grid-auto-flow: dense`, então elas ocupam todas as células livres — inclusive abaixo do card de tipos.

### Estrutura

```text
┌─────────┬─────────┬─────────┐
│ Empresa │ Empresa │  Tipos  │  ← linha 1-2: tipos ocupa col 3
│ Empresa │ Empresa │ (chart) │
├─────────┼─────────┼─────────┤
│ Empresa │ Empresa │ Empresa │  ← linha 3+: empresas preenchem tudo
│ Empresa │ Empresa │ Empresa │
└─────────┴─────────┴─────────┘
```

### Mudanças em `src/routes/index.tsx`

1. Remover a section atual com `float-right` e `clear-both`.
2. Criar uma `<section>` única com:
   - Título "Empresas" no topo (largura total) + título "Processos por tipo" como sub-header dentro do próprio card no canto superior direito (col 3).
   - Container `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 [grid-auto-flow:dense]`.
   - Card de tipos com classes `xl:col-start-3 xl:row-span-2 xl:self-start` (ocupa col 3, linhas 1-2, alinhado ao topo).
   - Cards de empresa auto-posicionados — com `dense` eles preenchem qualquer célula livre, inclusive linha 3+ na coluna 3.
3. Em telas menores (`<xl`), o grid colapsa para 2 ou 1 coluna e o card de tipos vira um bloco normal no fluxo (sem posicionamento).

### Detalhes técnicos

- Os títulos de seção ("Empresas" / "Processos por tipo") ficam dentro dos próprios cards/áreas para não quebrar o grid.
- `row-span-2` no card de tipos garante altura suficiente para o `max-h-72` interno com scroll já existente.
- `grid-auto-flow: dense` é essencial — sem ele, o auto-placement deixa buracos quando empresas têm tamanho diferente do slot disponível.
- Sem mudanças em dados, server functions ou outros componentes.
