## Objetivo

Permitir importar uma planilha de "Acompanhamento de processos" em Configurações, criando registros em `tramitacoes` vinculados automaticamente aos `processos` já cadastrados (importados anteriormente).

## Planilha de entrada

Aba `data`, colunas detectadas:

- Empresa
- Grupo Empresarial
- Tipo de processo
- Nº do processo
- Status (ex.: ANALISE_ORGAO, DEFERIDO, etc.)
- Descrição
- Data (dd/MM/yyyy)
- Responsável

## Regra de vinculação (automática)

Para cada linha, encontrar o `processo_id` na seguinte ordem:

1. Buscar empresa por nome (case/acento-insensível). Se não existir → erro na linha "Empresa não encontrada".
2. Match do processo dentro dessa empresa:
   - a) `numero_protocolo` igual ao "Nº do processo" da linha; senão
   - b) `nome` igual ao "Nº do processo" (cobre processos internos cujo "número" é descritivo); senão
   - c) se existir apenas 1 processo da empresa com o mesmo "Tipo de processo", usa esse; senão
   - d) erro "Processo não encontrado" (linha vira pendência, não cria processo novo — assim mantém a base limpa).

Não cria empresas/grupos/tipos novos nesta importação — esta planilha é só de acompanhamento.

## Inserção em `tramitacoes`

Campos preenchidos por linha:

- `processo_id` → do match acima
- `descricao` → coluna Descrição (obrigatória; se vazia, erro)
- `data_evento` → Data parseada (default hoje se vazia)
- `responsavel` → Responsável
- `status_no_momento` → mapeado para enum existente (`ANALISE_ORGAO` → `ativo`, `DEFERIDO` → `concluido`, `INDEFERIDO`/`REPROVADO` → `cancelado`, `NOTIFICADO` → `suspenso`)
- `setor_orgao` → null (não está na planilha)
- `etapa_id` → null

Deduplicação: se já existir uma tramitação com mesmo `processo_id` + `data_evento` + primeiros 200 chars de `descricao`, pula (idempotente para reimportações).

Após inserir, atualiza `processos.status` e `processos.atualizado_em` para refletir a tramitação mais recente.

## Mudanças no código

1. **`src/lib/import.functions.ts`** — adicionar `importAcompanhamentos` (novo `createServerFn`) reutilizando os helpers de parse de data e normalização. Retorna: `{ totalLinhas, tramitacoesCriadas, tramitacoesIgnoradas, erros[] }`.

2. **`src/routes/configuracoes.tsx`** — adicionar um segundo card "Importar acompanhamentos de processos" abaixo do card existente, com o mesmo padrão de UX (botão único que abre o seletor, toast, resumo, lista de erros). Texto explicando que os acompanhamentos são vinculados automaticamente aos processos pelo nome da empresa + nº do processo.

3. **Modal de empresa em `src/routes/index.tsx`** — já lista tramitações por processo via dados existentes; sem mudanças necessárias além de garantir que a invalidação de cache (`queryClient.invalidateQueries`) inclua as tramitações após a importação.

Nenhuma alteração de schema é necessária — a tabela `tramitacoes` já suporta tudo.

## Saída para o usuário

Após importar, mostra:

- N tramitações criadas
- N ignoradas (duplicadas)
- Lista de linhas com erro (empresa não encontrada, processo não encontrado, descrição vazia) com o nº da linha original para correção.
