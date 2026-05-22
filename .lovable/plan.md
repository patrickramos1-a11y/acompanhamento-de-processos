## Melhorar separação entre "Processos" e "Últimas tramitações"

Atualmente as duas seções ficam coladas, com apenas o espaçamento padrão entre elas e títulos do mesmo tamanho — fica difícil perceber onde uma termina e a outra começa.

### Mudanças (apenas visuais, em `src/routes/index.tsx`)

1. Aumentar o espaço vertical entre as seções (margem superior maior na seção "Últimas tramitações").
2. Adicionar um divisor sutil de largura total entre elas (linha fina + um pequeno rótulo/ícone centralizado, ou simplesmente um `<hr>` discreto com bastante respiro).
3. Dar mais destaque ao título "Últimas tramitações":
   - Tipografia ligeiramente maior
   - Contador de itens ao lado (ex.: "Últimas tramitações · 12")
   - Manter o ícone do relógio, mas com fundo levemente destacado
4. Opcional: leve mudança de fundo na seção de tramitações (ex.: `bg-muted/30` no contêiner) para reforçar visualmente que é um bloco diferente.

Sem alterações em dados, filtros ou lógica.