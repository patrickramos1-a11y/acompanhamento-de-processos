## Objetivo
Fazer a importação de processos funcionar de verdade na aba de configurações e mostrar mensagens claras de sucesso ou erro para o usuário.

## O que vou corrigir
1. Ajustar a tela de configurações para garantir que a seleção de arquivo e o clique no botão disparem a ação corretamente.
2. Corrigir a função de importação para evitar falhas de runtime ligadas ao uso do parser de planilha no carregamento do servidor.
3. Garantir feedback visual completo: carregando, sucesso, erro geral e erros por linha da planilha.
4. Validar o fluxo final no preview para confirmar que o botão responde e que erros aparecem na interface.

## Detalhes técnicos
- Revisar `src/routes/configuracoes.tsx` para reforçar o fluxo do arquivo selecionado, estado de loading e exibição de mensagens.
- Revisar `src/lib/import.functions.ts` para mover o carregamento do `xlsx` para dentro do handler da server function, evitando quebra de SSR/import graph.
- Adicionar/confirmar o componente global de toast no root (`src/routes/__root.tsx`), porque hoje o código chama `toast.*`, mas o app não parece ter o toaster montado.
- Manter a regra automática de conversão de status `Em análise pela Ramos` para `Análise pelo órgão`.
- Validar o comportamento após a correção reproduzindo a ação de importação e verificando logs/resultado.

## Resultado esperado
- Ao escolher um arquivo, o nome dele aparece na tela.
- Ao clicar em `Importar processos`, o botão entra em estado de carregamento.
- Se der certo, o sistema mostra confirmação e resumo da importação.
- Se der erro, o sistema mostra a mensagem na tela e em toast, sem ficar “sem acontecer nada”.
- A importação volta a funcionar com a planilha enviada.