## Objetivo

Ao abrir o modal de uma empresa e clicar em um processo (ou no novo botão "Ver acompanhamentos"), abrir um segundo modal mostrando todos os acompanhamentos (tramitações) apenas daquele processo daquela empresa, em ordem cronológica decrescente.

## Mudanças

### `src/routes/index.tsx`

1. **Estado novo**: `processoModal: string | null` no componente raiz, passado para o `EmpresaProcessosModal`.

2. **Coluna de ação no modal da empresa**: adicionar uma coluna "Ações" no final da tabela com um botão "Ver acompanhamentos" (ícone `ClipboardList` + texto compacto). A linha inteira também fica clicável (cursor pointer, hover destacado) — ambos abrem o segundo modal.

3. **Novo componente `ProcessoTramitacoesModal`** (mesmo arquivo). Props:
   - `processoId: string | null`
   - `onClose: () => void`
   - `processos`, `empresaMap`, `tipoMap`, `etapaMap`, `tramitacoes`

   Renderiza um `<Dialog>` (max-w-[800px]) com:
   - Header: nome da empresa + nome do processo + nº protocolo + status badge
   - Lista cronológica (mais recente primeiro) de tramitações daquele processo:
     - data (dd/MM/yyyy)
     - etapa (badge colorido, se houver)
     - descrição completa
     - responsável · setor/órgão
   - Vazio: mensagem "Nenhum acompanhamento registrado para este processo."

4. **Render**: o `ProcessoTramitacoesModal` fica empilhado depois do `EmpresaProcessosModal`. Ambos os modals podem ficar abertos simultaneamente (o segundo sobre o primeiro) — comportamento normal do Radix Dialog.

5. O `EmpresaProcessosModal` recebe um novo prop `onAbrirProcesso: (id: string) => void` que é chamado tanto pelo clique na linha quanto pelo botão.

Sem mudanças no backend ou schema — todas as tramitações já vêm no loader.
