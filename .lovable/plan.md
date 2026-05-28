## Objetivo

Colocar os filtros (Empresa, Tipo, Status, Responsável, Mês, Ano + busca) acima da seção **EMPRESAS**, mantendo o mesmo componente multi-seleção com busca interna (igual ao da segunda imagem), e fazendo com que os filtros recortem tanto os **cards de empresa** quanto a **tabela de processos**.

## Mudanças (apenas `src/routes/index.tsx`)

### 1. Reposicionar a barra de filtros
- Mover o bloco `<div className="glass mb-4 grid ...">` (linhas 309–388, que já contém o input de busca + 6 `MultiSelect` + botão "Limpar filtros") para **acima da seção "Empresas"**, dentro do `<main>`, logo depois dos KPIs.
- A seção "Processos" abaixo continua usando os mesmos estados (`empresaFiltro`, `statusFiltro`, etc.) — os filtros viram globais para a página.

### 2. Cards de empresa passam a respeitar os filtros
- Trocar a base de `porEmpresa` de `processos` para `processosFiltrados` (já calculado mais abaixo). Mover o `useMemo` de `processosFiltrados` para **antes** de `porEmpresa` para evitar uso-antes-de-declarar.
- Cards com `total === 0` continuam sendo escondidos (filtro `.filter((x) => x.total > 0)`), então os cards somem naturalmente quando o filtro de empresa estiver ativo em outras.
- Se o filtro **Empresa** estiver selecionado, mostrar só os cards dessas empresas.

### 3. Filtro de Status passa a usar `status_detalhado`
- Hoje as opções vêm de `STATUS_LABEL` (apenas: Ativo, Concluído, Cancelado, Suspenso).
- Trocar por uma lista derivada dos `processos` agregando `status_detalhado` distintos (ex.: "EM ANÁLISE PELA RAMOS", "EM ANÁLISE PELO ÓRGÃO", "DEFERIDO", "NOTIFICADO"), ordenada alfabeticamente. Isso bate exatamente com as pills coloridas que aparecem nos cards.
- Atualizar a lógica de filtro em `processosFiltrados`: comparar `statusFiltro` contra `p.status_detalhado?.trim()` em vez de `p.status`.

### 4. Ajustes de UX
- Manter os defaults atuais de Mês (mês atual) e Ano (ano atual) — só esses dois iniciam preenchidos.
- A barra fica sticky-friendly: `glass` arredondado, com wrap horizontal no desktop e grid 1-coluna no mobile (já é o comportamento atual).
- A `SectionTitle` de "Empresas" passa a mostrar a contagem filtrada: `Empresas (${porEmpresa.length})`, análogo ao que já é feito em "Processos".

### Fora de escopo
- Aparência dos cards, KPIs do topo, modais e tabela de processos — sem mudanças visuais.
- Nada de backend / migrations.
