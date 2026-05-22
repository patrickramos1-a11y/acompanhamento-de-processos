## Objetivo

Transformar os 6 filtros (empresa, tipo, status, responsável, mês, ano) em **multi-select com busca**, mais compactos visualmente, com mês e ano atuais já marcados por padrão.

## Mudanças

### 1. Novo componente `src/components/multi-select.tsx`

Componente reusável baseado em `Popover` + `Command` (já instalados — `cmdk` tem busca nativa). Props:

```ts
type Option = { value: string; label: string };
type Props = {
  label: string;            // ex: "Responsáveis"
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  width?: string;           // ex: "w-44"
};
```

**Comportamento:**
- Trigger compacto: botão pequeno (`h-8`, `text-xs`) mostrando:
  - `selected.length === 0` → "Todos" + label (ex: "Todos os responsáveis")
  - `selected.length === 1` → label do item selecionado
  - `selected.length > 1` → "N selecionados" + badge com contagem
- Popover abre `CommandInput` (busca) + `CommandList` com `CommandItem` por opção, cada um com `Checkbox` à esquerda
- Clicar em item alterna seleção sem fechar popover
- Botão "Limpar" no rodapé do popover quando há seleções

### 2. Refatorar `src/routes/index.tsx`

**Estado:** trocar os 6 `useState<string>` por `useState<string[]>`:
```ts
const [empresaFiltro, setEmpresaFiltro] = useState<string[]>([]);
const [tipoFiltro, setTipoFiltro] = useState<string[]>([]);
const [statusFiltro, setStatusFiltro] = useState<string[]>([]);
const [responsavelFiltro, setResponsavelFiltro] = useState<string[]>([]);
const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");
const anoAtual = String(new Date().getFullYear());
const [mesFiltro, setMesFiltro] = useState<string[]>([mesAtual]);
const [anoFiltro, setAnoFiltro] = useState<string[]>([anoAtual]);
```

**Lógica de filtro** em `processosFiltrados`: trocar `if (X && p.x !== X)` por `if (X.length && !X.includes(p.x))` em cada campo. Para mês/ano usar `p.data_protocolo.slice(0,4)` e `.slice(5,7)`.

**UI dos filtros:** trocar os 6 `<select>` por 6 `<MultiSelect>` numa linha mais densa:
- Container: `flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-2`
- Search input fica compacto: `h-8 text-xs`
- Cada `MultiSelect` com largura própria adequada ao conteúdo
- Botão "Limpar filtros" aparece quando qualquer filtro difere do default (incluindo mês/ano ≠ atual)

### 3. Outros detalhes

- `setTipoFiltro` é chamado no card "Processos por tipo" (toggle de 1 item) — atualizar para `setTipoFiltro(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])`.
- Botão "Limpar filtros" reseta tudo para arrays vazios, **exceto** mês/ano que voltam para `[mesAtual]` e `[anoAtual]` (manter o default consistente). Alternativa: limpar tudo de verdade — confirmo abaixo.

## Detalhes técnicos

- Reaproveitamos `Popover`, `Command`, `Checkbox`, `Badge`, `Button` de `src/components/ui/*` (já existem).
- Sem mudanças em backend, schema ou rotas.
- Sem novas dependências.
