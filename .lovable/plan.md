# Aba de Configurações + Importação de Processos

## Visão geral

Criar uma nova rota `/configuracoes` com um botão "Importar processos" que aceita arquivos `.xlsx` no formato da planilha enviada. A importação cria/reaproveita empresas, grupos e tipos automaticamente, e converte status `EM ANÁLISE PELA RAMOS` para `EM ANÁLISE PELO ORGÃO` antes de gravar.

## 1. Navegação

Adicionar um header de navegação no `__root.tsx` (ou no header existente da Painel) com dois links:
- **Painel** → `/`
- **Configurações** → `/configuracoes` (ícone de engrenagem)

## 2. Página `/configuracoes` (`src/routes/configuracoes.tsx`)

Layout simples com seções de configuração. A primeira seção é "Importação de dados":

- Card "Importar processos a partir de planilha"
- Texto explicativo: colunas esperadas (Empresa, Grupo Empresarial, Tipo de Processo, Nome, Nº do Processo, Data do Protocolo, Status, Responsável)
- Input `<input type="file" accept=".xlsx,.xls">` + botão "Importar"
- Após o envio, exibe um resumo: total processado, criados, atualizados, ignorados, erros (com lista das linhas com problema)
- Toast de sucesso/erro
- Botão "Baixar modelo da planilha" (opcional, gera xlsx vazio com os cabeçalhos)

## 3. Parser e server function (`src/lib/import.functions.ts`)

`createServerFn({ method: "POST" })` que recebe `FormData` com o arquivo:

1. Lê o arquivo com a lib **`xlsx`** (SheetJS) — compatível com o runtime Worker
2. Converte a aba `data` (ou primeira aba) para JSON
3. Para cada linha:
   - **Grupo**: se `Grupo Empresarial` ≠ `undefined`/vazio → upsert por nome em `grupos_empresariais`
   - **Empresa**: upsert por nome em `empresas` (case-insensitive, trim), vinculando ao `grupo_id`
   - **Tipo**: upsert por nome em `tipos_processo` (ignora `undefined`/vazio → usa tipo "Outros")
   - **Status** (mapeamento):
     - `EM ANÁLISE PELA RAMOS` → `ativo` (convertido para "Em análise pelo órgão")
     - `EM ANÁLISE PELO ORGÃO` → `ativo`
     - `DEFERIDO` → `concluido`
     - Demais valores → `ativo` (com aviso)
   - **Data do protocolo**: parse `dd/MM/yyyy` para `YYYY-MM-DD`
   - **Processo**: upsert por (`empresa_id`, `numero_protocolo`) quando há protocolo; senão por (`empresa_id`, `nome`)
   - Campos: `nome` (usa `Nome`; fallback para `Nº do Processo` ou tipo), `numero_protocolo`, `data_protocolo`, `responsavel`, `status`
4. Usa `supabaseAdmin` (RLS bypass, escrita server-side)
5. Retorna `{ totalLinhas, processosCriados, processosAtualizados, empresasCriadas, gruposCriados, tiposCriados, erros: [{linha, mensagem}] }`

## 4. Mapeamento visual de status (já existente)

O dashboard e o modal já mostram:
- `ativo` → "Em análise pelo órgão" (badge azul)
- `concluido` → "Deferido" (verde)
- `suspenso` → "Notificado" (amarelo)
- `cancelado` → "Reprovado" (vermelho)

Portanto a conversão automática `RAMOS → ORGÃO` é resolvida no momento da importação ao gravar `status = 'ativo'`, e a UI já renderiza como "Em análise pelo órgão".

## 5. Dependências e detalhes técnicos

```text
bun add xlsx
```

- Lê o arquivo com `XLSX.read(arrayBuffer, { type: 'array' })` + `XLSX.utils.sheet_to_json`
- Normalização: `.trim()` e comparação case-insensitive para nomes de grupo/empresa/tipo
- Cache em memória dentro da função para evitar lookups repetidos por linha
- Após import, o cliente faz `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` para o painel refletir os novos dados

## 6. Arquivos a criar/editar

- `src/routes/configuracoes.tsx` (novo)
- `src/lib/import.functions.ts` (novo)
- `src/routes/__root.tsx` ou header existente (adicionar nav com Painel/Configurações)
- `package.json` (dependência `xlsx`)
