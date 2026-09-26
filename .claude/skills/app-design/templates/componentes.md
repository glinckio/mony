# Componentes — {Nome do app}

Três camadas: **domínio** (onde mora a identidade), **chrome** (o que emoldura as telas) e **primitivas** (base técnica). Processo em `references/09-componentes-proprios.md`.

## Componentes de domínio

| Componente | Representa | Telas | Status |
|---|---|---|---|
| `{MatchTicket}` | {a reserva confirmada} | {Reserva, Confirmação} | Pendente |

---

### `{MatchTicket}` — {nome em português}
- **Representa:** {o objeto do domínio}
- **Dados por prioridade:** {código} > {data e hora} > {quadra} > {valor}
- **Origem no mundo real:** {ingresso de jogo}. Traço tirado: {picote lateral e algarismos de placar}
- **Conceitos:**
  - Convencional: {card com ícone de check e linhas de dados}
  - Ousado: {ingresso inteiro, com canhoto destacável por gesto}
  - Equilíbrio: {painel com picote, código grande em fonte de placar e canhoto com os dados}
  - **Escolhido:** {Equilíbrio}, porque {identidade forte sem gesto escondido}
- **Anatomia:**
  - {topo}: {overline `caption` textMuted "RESERVA"}
  - {corpo}: {código em `score` accent; data em `title2`}
  - {canhoto}: {separado por picote (círculos recortados nas laterais + linha tracejada `border`)}
  - Raio {lg}; padding {xl}; fundo {court}
- **Estados:** padrão · pressionado · skeleton (mesma silhueta, com o picote) · cancelado ({carimbo "Cancelada", texto riscado, cor `danger`}) · concluído ({esmaecido}) · texto longo ({nome da quadra quebra em 2 linhas})
- **Movimento próprio:** {entra subindo 24 px + fade; o carimbo "Confirmada" aparece com escala 1,2 → 1 e haptic de sucesso; 600 ms, sem bloquear}
- **Variações:** compacto ({lista de reservas}) · herói ({confirmação})
- **Acessibilidade:** {"Reserva QD-7K2P9, sábado 26 de setembro, 19h às 20h, Arena Madalena, confirmada"}; picote e carimbo são decorativos

---

## Chrome

| Superfície | Decisão | Por quê |
|---|---|---|
| Tab bar | {flutuante em pílula, fundo `surfaceElevated`, indicador que desliza sob o ícone ativo, ícone ativo preenchido, some nas telas de tarefa} | {a linguagem de placas da direção; libera a borda para o conteúdo} |
| Header | {título grande no conteúdo; ao rolar, barra compacta com fundo e borda aparece} | |
| Botão voltar | {círculo 40 com fundo `overlay` sobre imagem; só a seta sobre fundo liso} | |
| Barra de ação fixa | {aparece quando há seleção; resumo vivo à esquerda e CTA à direita; borda superior só com conteúdo por baixo} | |
| Pull-to-refresh | {cores dos tokens / indicador próprio} | |
| Status bar | {clara sobre hero escuro; automática no resto} | |
| Splash → app | {fundo `background`; primeira tela entra com fade de 200 ms} | |

## Mensagens e interações

Processo em `references/09-componentes-proprios.md` (seção 5). Só as peças que o inventário pede.

### Inventário
| Mensagem | Tela / gatilho | Superfície | Tom | Texto (na voz do app) |
|---|---|---|---|---|
| {Cancelar reserva} | {Reserva → "Cancelar"} | `ConfirmSheet` | perigo | {"Cancelar a partida de sábado?" · "R$ 180 voltam para o seu cartão em até 2 dias." · [Cancelar partida] [Manter reserva]} |
| {Código copiado} | {Reserva → copiar} | feedback no botão | sucesso | {"Copiado"} |
| {Horário acabou de ser reservado} | {Pagamento → 409} | `Banner` no topo do resumo | aviso | {"Alguém pegou esse horário. Escolha outro."} |
| {Sem conexão} | {global} | `Banner` fixo | aviso | {…} |

### Família
| Peça | Anatomia | Linguagem visual | Movimento | Comportamento |
|---|---|---|---|---|
| `{ConfirmSheet}` | {miniatura do objeto afetado + título-pergunta + consequência + 2 botões com verbo} | {raio xl, picote no topo, alça própria} | {sobe com spring; backdrop fade} | {fecha por gesto/backdrop; loader e erro dentro} |
| `{Toast}` | {ícone do tom + texto + ação opcional} | {pílula, fundo `surfaceElevated`} | {desce do topo; some em 4–6 s} | {fila; pausa ao tocar; não cobre a tab bar} |

## Efeitos (vida)

Efeitos reutilizáveis do mapa de vida do style guide. Todos leem o serviço único de movimento.

| Efeito | Onde | Técnica | Duração / ciclo | Reduzir movimento | Versão barata |
|---|---|---|---|---|---|
| `{AmbientAurora}` | {boas-vindas, topo da Home, confirmação} | {3 gradientes radiais deslocando em Skia} | {14 s em loop} | {primeiro quadro estático} | {sem blur; 2 manchas} |
| `{CollapsingHeader}` | {Home, Detalhe} | {scroll → altura, tamanho do título, fundo} | {acompanha o dedo} | {troca seca, sem escala} | — |
| `{Celebration}` | {Confirmação} | {carimbo + 24 partículas do acento} | {650 ms, uma vez} | {check estático + haptic} | {sem partículas} |
| `{ShimmerSkeleton}` | {listas e detalhe} | {brilho diagonal em `surfaceMuted`} | {1,2 s em loop} | {sem brilho} | — |

## Primitivas

| Primitiva | Variantes | Observação |
|---|---|---|
| Button | {primary, secondary, ghost, destructive · md/lg} | {feedback: afunda 1 px + escurece} |
| Text | {escala inteira} | |
| AppImage | — | placeholder com nome do arquivo em dev |
