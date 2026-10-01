# Componentes — Mony

> **Atualização 2026-09-25 — direção "Índigo Suave" (vigente).** O usuário reprovou "Caderno de Contas" e enviou uma referência (fintech lavanda/índigo). Valem as peças abaixo; as seções seguintes descrevem a direção anterior e são revistas tela a tela, conforme cada uma é refeita.
>
> | Antes (Caderno de Contas)    | Agora (Índigo Suave)                                               | O que é                                                                                                                                                                                                                |
> | ---------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | `PeriodLedger`               | `BalanceCard` + `PeriodSummary`                                    | saldo no cartão em gradiente com brilho de vidro e selo da variação; embaixo, cartão branco com as linhas (receitas, despesas pagas, a pagar, renda comprometida com barra, média diária), cada uma com círculo pastel |
> | `GoalRuler`                  | `GoalProgress`                                                     | círculo pastel + título + % + barra em gradiente + "R$ x / R$ y" + status                                                                                                                                              |
> | `YearLedgerChart`            | `YearChart`                                                        | barras arredondadas em gradiente (receita verde, despesa índigo), mês selecionado em faixa lavanda                                                                                                                     |
> | `StatusStamp` (carimbo)      | `StatusPill`                                                       | pílula pastel com ícone (Pago, A pagar, Paga, Vencida, Ativa, Atrasada, Quitada, Alcançada) com um "pulinho" ao mudar                                                                                                  |
> | `MarkerTabs` (marca-texto)   | `SegmentedControl`                                                 | trilho branco em pílula; a pílula em gradiente desliza até a opção escolhida                                                                                                                                           |
> | `MarkerChip`                 | `SelectChip`                                                       | chip em pílula; selecionado em índigo claro com contorno índigo                                                                                                                                                        |
> | `LedgerTabBar`               | `AppTabBar`                                                        | barra branca com cantos arredondados, aba ativa em índigo, "+" central em gradiente                                                                                                                                    |
> | `LedgerToast`                | `AppToast`                                                         | cartão branco flutuante: círculo sólido do tom com ícone branco, rótulo do tom (ou a categoria) + mensagem, valor à direita, ação em pílula ou ×, barra de tempo; arrastar para baixo dispensa                         |
> | —                            | `Card`, `IconBadge`, `ProgressBar`, `Gradient`, `ScreenBackground` | superfícies da direção nova                                                                                                                                                                                            |
> | `TopBar` (título à esquerda) | `TopBar` (título centralizado, botões circulares brancos)          | barra do topo; fundo branco só ao rolar                                                                                                                                                                                |
>
> Removidos: `Highlight`/`SlidingMarker`, `DoubleRule`, `ZigzagEdge`, Fraunces.

Três camadas: **domínio** (onde mora a identidade), **chrome** (o que emoldura as telas) e **primitivas** (base técnica). Processo em `.claude/skills/app-design/references/09-componentes-proprios.md`.

Código: domínio em `apps/mobile/src/components/domain/`, chrome e primitivas em `apps/mobile/src/components/ui/`, efeitos em `apps/mobile/src/components/effects/`.

## Componentes de domínio

| Componente                       | Representa                                                                 | Telas                                                          | Status   |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| `PeriodLedger`                   | a conta do período (receitas − despesas = saldo)                           | Início ★                                                       | Pendente |
| `LedgerDay` / `LedgerLine`       | lançamentos do dia no livro-caixa                                          | Lançamentos, confirmação de exclusão                           | Pendente |
| `StatusStamp`                    | o carimbo de status (PAGO, A PAGAR, QUITADA, ATRASADA, VENCIDA, ALCANÇADA) | Lançamentos, Dívidas, Dívida, Metas                            | Pendente |
| `AmountField`                    | o valor sendo lançado, com sinal                                           | Lançamento (form), Meta (form), Dívida (form), sheets de valor | Pendente |
| `CategoryTag` / `CategoryPicker` | a categoria como etiqueta de cor + ícone                                   | Lançamento (form), Meta (form), Dívida (form), Categorias      | Pendente |
| `InstallmentTrack`               | as parcelas como marcas de régua                                           | Dívidas, Dívida                                                | Pendente |
| `DebtEntry`                      | a dívida na lista                                                          | Dívidas                                                        | Pendente |
| `InstallmentLine`                | a parcela no detalhe                                                       | Dívida                                                         | Pendente |
| `PaymentReceipt`                 | o recibo do pagamento de parcela                                           | Pagar parcela (sheet)                                          | Pendente |
| `GoalRuler`                      | a meta como régua preenchida a marca-texto                                 | Metas, Início, Meta (form)                                     | Pendente |
| `YearLedgerChart`                | receitas × despesas mês a mês no ano                                       | Início                                                         | Pendente |
| `GroceryReceipt`                 | o orçamento do mercado como cupom fiscal                                   | Mercado                                                        | Pendente |
| `PantryItem` / `PantryLevel`     | o item da despensa (tem × precisa) com stepper                             | Mercado                                                        | Pendente |
| `Odometer`                       | a quilometragem como hodômetro                                             | Veículo, Veículos, Quilometragem (sheet)                       | Pendente |
| `MercosulPlate`                  | a placa do veículo                                                         | Veículo, Veículos                                              | Pendente |
| `NotebookSwitch`                 | o caderno ativo (Pessoal / Empresa)                                        | todos os headers com caderno                                   | Pendente |

---

### `PeriodLedger` — Conta do período ★

- **Representa:** o resumo financeiro do período escolhido (`GET /dashboard`).
- **Dados por prioridade:**
  1. saldo;
  2. receitas e despesas pagas (a conta que dá o saldo);
  3. a pagar;
  4. variação de receita vs. período anterior;
  5. % da renda comprometida;
  6. média diária de despesas.
- **Origem no mundo real:** a conta feita à mão no pé da página do caderno. Traços tirados: a **conta armada** (linhas com sinal, traço de soma, resultado) e o **traço duplo** embaixo do total.
- **Conceitos:**
  - Convencional: card com "Saldo" grande + grid 2×2 de números coloridos (é o que existe hoje).
  - Ousado: a página inteira é uma folha de caderno pautada, com a conta escrita à mão (fonte cursiva) e o total circulado.
  - Equilíbrio: saldo herói em Fraunces com traço duplo, e embaixo a conta armada em coluna de livro-caixa (`+ Receitas`, `− Despesas pagas`); "A pagar" com marca-texto; os indicadores secundários como uma nota de rodapé.
  - **Escolhido:** Equilíbrio. A conta armada explica o saldo sem gráfico, o traço duplo e o marca-texto dão a identidade, e nada disso depende de fonte cursiva (que falha em acessibilidade e em número).
- **Anatomia:**
  - sobretítulo `overline` textMuted: "SALDO DE SETEMBRO" (varia com o período: "SALDO DE HOJE", "SALDO DA SEMANA", "SALDO DE 01/09 A 15/09");
  - saldo em `display` (Fraunces 52, tabular): `R$` em `title2` alinhado ao topo dos algarismos, centavos em `title2`; cor `text` (negativo: `danger` + sinal "−"), nunca verde;
  - `DoubleRule` embaixo do saldo, na largura do número;
  - conta armada: 2 `LedgerLine` compactas sem toque: `+ Receitas` (valor em `success`) e `− Despesas pagas` (valor em `text`); coluna de valores alinhada à direita (`numeral`), sinal em coluna própria de 16 px;
  - "A pagar": linha com o valor sob **marca-texto** (`accent`, texto `onAccent`), só aparece se > 0;
  - rodapé (`footnote` textMuted, separado por linha de pauta):
    - "↑ 12,5% de receita vs. o período anterior" (seta e cor `success`/`danger`, só se existir);
    - "Renda comprometida 60%" com mini régua de 10 marcas;
    - "Gasto médio por dia R$ 104,68".
  - Sem card: mora direto no papel, sobre a mancha de tinta.
- **Estados:**
  - padrão;
  - skeleton: sobretítulo + bloco 60% da largura com 52 de altura + traço duplo apagado + 2 linhas de pauta com blocos à direita;
  - saldo negativo ("− R$ 320,00" em `danger`; o traço duplo também em `danger`);
  - sem receitas no período (linha mostra "R$ 0,00");
  - sem comparação (`previousPeriodIncomeChangePercent` nulo: a linha some);
  - período personalizado incompleto (mostra a dica "Escolha as duas datas" no lugar do número, sem skeleton);
  - valor enorme (R$ 1.234.567,89: o display cai para 40 via `adjustsFontSizeToFit`, mínimo 0,7).
- **Movimento próprio:** ao trocar o período, o saldo **conta** do valor anterior até o novo (400 ms, desacelerando) e o **traço duplo se redesenha** da esquerda para a direita (320 ms, 80 ms depois do número assentar). O marca-texto do "A pagar" entra por último (220 ms).
- **Variações:** padrão (Início). Só uma.
- **Acessibilidade:** um único grupo lido como "Saldo de setembro: dois mil e cinquenta e nove reais e quarenta e cinco centavos. Receitas: 5.200 reais. Despesas pagas: 3.140 reais e 55 centavos. A pagar: 480 reais." O traço duplo e as marcas são decorativos.

---

### `LedgerDay` + `LedgerLine` — Dia do livro-caixa

- **Representa:** os lançamentos (`Transaction`) agrupados por data.
- **Dados por prioridade:** valor com sinal > descrição > status (despesa) > categoria > data (vira o cabeçalho do grupo).
- **Origem no mundo real:** o extrato impresso e o livro-caixa. Traços tirados: a **data na margem** como cabeçalho do grupo, a **coluna de valores** tabular com o sinal, o subtotal do dia.
- **Conceitos:**
  - Convencional: `ListItem` com ícone redondo colorido + descrição + data cinza + valor colorido + badge (hoje).
  - Ousado: cada dia é uma folha de caderno separada, com a data escrita na margem vermelha e o subtotal circulado.
  - Equilíbrio: cabeçalho do dia em `overline` ("SEX · 12 SET") com o subtotal do dia à direita em `footnote`; linhas de pauta finas; a linha tem uma barrinha vertical de 3 px na cor da categoria (a "etiqueta" da categoria na margem), descrição em `bodyStrong`, categoria + status em `footnote`, e o valor na coluna da direita.
  - **Escolhido:** Equilíbrio. A data vira estrutura (não repete em toda linha), o valor é lido em coluna e a categoria aparece sem ícone redondo genérico.
- **Anatomia (`LedgerLine`):**
  - altura mínima 60, padding horizontal 20 (a pauta vai de borda a borda);
  - margem: barra vertical 3×28 na cor da categoria, raio `full` (se a categoria não vem no lançamento, `borderStrong`);
  - centro: descrição (`bodyStrong`, 1 linha, reticências no fim); embaixo, `footnote` textMuted com o nome da categoria;
  - direita: valor (`numeral`, tabular, alinhado à direita, com sinal: `+ 5.200,00` em `success` / `− 212,40` em `text`) e, embaixo, o `StatusStamp` pequeno (só despesa): PAGO (success) ou A PAGAR (warning);
  - o carimbo é o botão de alternar status (alvo de 48 com `hitSlop`).
- **Estados:**
  - padrão;
  - pressionado (fundo `surfaceMuted`);
  - selecionado no modo de seleção: a margem vira uma caixinha marcada (quadrado 20 com check em `primary`) e o fundo recebe `primaryMuted`;
  - skeleton: 3 linhas de pauta com bloco na margem, 2 barras e um bloco à direita;
  - descrição longa (reticências);
  - lançamento sem categoria conhecida;
  - receita (sem carimbo).
- **Movimento próprio:**
  - ao tocar o carimbo, ele **bate** (escala 1,35→1, spring de carimbo) trocando PAGO ↔ A PAGAR, com haptic `impactMedium` e UI otimista;
  - deslizar a linha para a esquerda revela "Excluir" (gesto; também existe como ação acessível);
  - ao entrar no modo de seleção, as margens viram caixinhas com stagger de 20 ms.
- **Variações:**
  - padrão (lista);
  - miniatura (dentro do `ConfirmSheet` de exclusão, sem ações);
  - conta (no `PeriodLedger`: sem margem, sem carimbo).
- **Acessibilidade:**
  - linha: "Mercado Pão de Açúcar, despesa de 212 reais e 40 centavos, categoria Mercado, a pagar, 12 de setembro";
  - ações acessíveis "Marcar como pago" / "Marcar como a pagar", "Excluir lançamento", "Selecionar".

---

### `StatusStamp` — Carimbo

- **Representa:** o estado de uma conta: PAGO, A PAGAR, PAGA, VENCIDA, QUITADA, ATIVA, ATRASADA, ALCANÇADA.
- **Origem:** o carimbo de "PAGO" do caixa da lotérica. Traços tirados: caixa-alta espaçada, borda, leve rotação.
- **Conceitos:** convencional = badge pílula com fundo suave (hoje); ousado = carimbo com textura de tinta falhada e rotação aleatória; **equilíbrio (escolhido)** = borda de 1,5 px, raio 4, rotação fixa −4°, texto `stamp` na cor do tom, sem textura (legível em 12 px).
- **Tons:**
  - `success`: PAGO, PAGA, QUITADA, ALCANÇADA;
  - `warning`: A PAGAR;
  - `danger`: VENCIDA, ATRASADA;
  - `ink`: ATIVA (em `primary`).
- **Tamanhos:** `sm` (linha de lista), `lg` (herói do momento: `title2` em caixa-alta, borda 2,5, rotação −8°).
- **Estados:** padrão · pressionado (fundo `*Muted`) · entrando (bate) · saindo (desbota 160 ms).
- **Acessibilidade:** o texto do carimbo é lido como palavra ("pago"); se é tocável, papel `button` com a ação no rótulo.

---

### `AmountField` — Valor lançado

- **Representa:** o valor em reais sendo digitado (lançamento, meta, dívida, parcela, orçamento).
- **Origem:** a calculadora de balcão e o valor escrito no canhoto. Traço: o número grande à direita, com o sinal à frente.
- **Conceitos:**
  - Convencional: `TextField` "Valor" com máscara R$ (hoje).
  - Ousado: teclado numérico próprio na tela.
  - Equilíbrio: campo herói sem caixa: sobretítulo ("VALOR DA DESPESA"), `R$` em `title2` textMuted e os algarismos em `amountInput` (Fraunces 44) com a máscara existente; o **sinal** à frente (− em `text` para despesa, + em `success` para receita; nunca vermelho, despesa não é erro); linha de pauta embaixo que vira `primary` no foco; teclado numérico do sistema.
  - **Escolhido:** Equilíbrio. O valor é o protagonista do lançamento, e o teclado do sistema continua (comportamento nativo).
- **Estados:** vazio ("0,00" em `textSubtle`) · digitando · foco (pauta `primary` 2 px) · erro (pauta `danger` + mensagem embaixo) · desabilitado.
- **Movimento próprio:** ao trocar despesa ↔ receita, o sinal gira (rotação 90° + troca, 180 ms) e muda de cor.
- **Variações:** herói (formulários de lançamento, meta e dívida) · compacto (dentro dos sheets: `title1`).
- **Acessibilidade:** rótulo "Valor da despesa, em reais"; o valor lido por extenso pelo leitor de tela.

---

### `CategoryTag` + `CategoryPicker` — Etiqueta de categoria

- **Representa:** a categoria (nome, cor e ícone Ionicons gravados no banco).
- **Origem:** a etiqueta colorida de pasta sanfonada. Traço: o pontinho/filete de cor + o nome.
- **Conceitos:** convencional = chips cinza com ícone e fundo `primary` quando selecionado (hoje); ousado = grade de etiquetas de papel penduradas; **equilíbrio (escolhido)** = chip plano com o ícone na cor da categoria e o nome; o selecionado ganha o **marca-texto** atrás do nome e o ícone preenchido; rolagem horizontal em 2 linhas quando há muitas (fade nas bordas).
- **Estados:** padrão · pressionado · selecionado (marca-texto) · "Nenhuma"/"Automática" (chip tracejado) · desabilitado.
- **Movimento próprio:** o marca-texto passa do chip anterior para o novo (220 ms), haptic `selection`.
- **Acessibilidade:** papel `radio` dentro de um `radiogroup` com o rótulo do campo; "Mercado, selecionada".

---

### `InstallmentTrack` — Marcas das parcelas

- **Representa:** o progresso de pagamento de uma dívida (`paidInstallments` de `totalInstallments`).
- **Origem:** as marcas de contagem na margem do caderno ("|||| ||"). Traço: uma marca vertical por parcela.
- **Conceitos:** convencional = barra de progresso (hoje); ousado = calendário de parcelas em grade; **equilíbrio (escolhido)** = fileira de marcas de 1,5×14 px (espaço 3 px); pagas em `text`, a próxima com o marca-texto atrás, vencidas (dívida atrasada) em `danger`, as futuras em `borderStrong`. Acima de 48 parcelas, as marcas viram grupos de 12 (um bloco por ano), para caber numa linha.
- **Estados:** em dia · atrasada (a próxima marca em `danger`) · quitada (todas em `success`) · skeleton (marcas em `surfaceMuted`).
- **Movimento próprio:** ao pagar, a marca da parcela "enche" de baixo para cima (180 ms); na quitação, todas acendem em sequência (stagger 12 ms, máx. 500 ms).
- **Acessibilidade:** "7 de 12 parcelas pagas" (papel `progressbar` com `accessibilityValue`).

---

### `DebtEntry` — Dívida na lista

- **Dados por prioridade:** restante > nome > marcas > "7 de 12" > status > total.
- **Anatomia:**
  - nome em `title3` (1 linha) + `StatusStamp` sm à direita (ATIVA / ATRASADA / QUITADA);
  - "Restam" `footnote` + restante em `numeralLarge`, com "de R$ 36.000,00" em `footnote` textMuted;
  - `InstallmentTrack` e "7 de 12 parcelas" em `caption`;
  - separada das vizinhas por linha de pauta (sem card);
  - quitadas esmaecidas (opacidade 0,7).
- **Conceitos:** convencional = card com badge + barra + 2 linhas cinza (hoje); ousado = cada dívida como um carnê destacável; **equilíbrio (escolhido)** = linha larga do livro-caixa com as marcas, porque o carnê fica bonito uma vez só e cansa numa lista.
- **Movimento próprio:** pressionado → fundo `surfaceMuted`; entra na lista com fade na primeira carga.
- **Acessibilidade:** "Financiamento do carro, ativa, restam 21 mil reais de 36 mil, 7 de 12 parcelas pagas".

---

### `InstallmentLine` — Parcela

- **Anatomia:**
  - número da parcela em `numeral` numa coluna de 40 ("03");
  - vencimento em `bodyStrong` ("vence 10/10") e, se paga, "paga em 08/10" em `footnote`;
  - valor em `numeral` à direita;
  - ação à direita: botão **Pagar** (secundário de tinta, compacto) ou carimbo **PAGA** (tocar abre "Desfazer pagamento") ou **VENCIDA** + botão Pagar.
- **Estados:** a pagar · vencida (número e data em `danger`) · paga (carimbo; valor em textMuted) · desfazendo (carimbo com loader) · próxima a vencer (marca-texto no "vence 10/10").
- **Movimento próprio:** ao pagar, o botão some e o carimbo PAGA bate no lugar.
- **Acessibilidade:** "Parcela 3, 1.500 reais, vence 10 de outubro, a pagar. Botão Pagar."

---

### `PaymentReceipt` — Recibo de pagamento

- **Representa:** o formulário de pagar parcela (data + valor pago), dentro do `PaperSheet`.
- **Origem:** o recibo com canhoto. Traços: o **serrilhado** no pé do recibo e a conta "Parcela 3 de 12 · vence 10/10".
- **Anatomia:**
  - cabeçalho com "PARCELA 03 DE 12" (`overline`) e o vencimento;
  - valor com `AmountField` compacto;
  - data do pagamento;
  - serrilhado separando a área de ação;
  - CTA "Registrar pagamento".
- **Movimento próprio:** ao confirmar, o CTA vira loader; no sucesso o sheet fecha e o carimbo bate na linha (momento "Conta paga").

---

### `GoalRuler` — Régua da meta

- **Representa:** a meta de economia (`Goal`: título, atual, alvo, prazo, concluída).
- **Origem:** a régua escolar e o "termômetro da campanha" (o cartaz de arrecadação da escola ou da igreja). Traço: régua com marcas a cada 10%, preenchida a marca-texto.
- **Conceitos:**
  - Convencional: título + `ProgressBar` + "R$ x de R$ y (60%)" (hoje).
  - Ousado: termômetro vertical grande por meta.
  - Equilíbrio: régua horizontal com marcas (10% finas, 25/50/75 maiores), o trecho alcançado pintado com **marca-texto**, o valor atual em `numeralLarge` "cavalgando" o fim do preenchimento, o alvo na ponta direita em `footnote`.
  - **Escolhido:** Equilíbrio. Cabe na lista, lê bem de longe e é o motivo-assinatura trabalhando como dado.
- **Estados:**
  - em andamento;
  - atrasada (prazo passou e não concluída): carimbo ATRASADA + prazo em `danger`;
  - concluída: carimbo ALCANÇADA; régua inteira no marca-texto; título com opacidade 0,8;
  - 0% (régua vazia, "Comece guardando qualquer valor");
  - acima de 100% (limitado a 100% no desenho, valor real no texto);
  - skeleton.
- **Movimento próprio:** o marca-texto corre de 0 até o valor na primeira exibição (400 ms, desacelerando, stagger 35 ms entre metas).
- **Variações:** compacta (Início: sem prazo, sem ações) · padrão (Metas).
- **Acessibilidade:** "Viagem para Salvador, 3 mil de 5 mil reais, 60%, prazo 1º de julho de 2026".

---

### `YearLedgerChart` — Ano no caderno

- **Representa:** `yearlyBreakdown`: receitas × despesas pagas por mês do ano corrente.
- **Conceitos:**
  - Convencional: barras agrupadas verde/vermelho com eixo (hoje, `react-native-gifted-charts`).
  - Ousado: tabela de 12 linhas com mini barras (livro-caixa anual).
  - Equilíbrio: 12 colunas (SVG); em cada mês, uma barra fina de receita (`success`) e uma de despesa (`text`), lado a lado, com topos arredondados; o mês corrente fica sob uma faixa de **marca-texto** vertical suave e com o rótulo em 700; sem eixo Y, só a linha de base (pauta); tocar num mês mostra "Set · + 5.200 · − 3.140" acima do gráfico.
  - **Escolhido:** Equilíbrio (componente próprio em `react-native-svg`, sem a lib de gráfico).
- **Estados:** padrão · ano sem dados (linha de base + "Nada lançado em 2026 ainda") · skeleton (12 pares de barras em `surfaceMuted`).
- **Movimento próprio:** as barras crescem da base na primeira exibição (stagger 20 ms, 400 ms); tocar num mês move o marca-texto até ele (220 ms) + haptic `selection`.
- **Acessibilidade:** lido como tabela: "Setembro: receitas 5.200 reais, despesas 3.140 reais" (um item acessível por mês).

---

### `GroceryReceipt` — Cupom do mercado

- **Representa:** orçamento mensal + estimativa da compra + sobra + contagem de itens (`GroceryBudget` + `GrocerySummary`).
- **Origem:** o cupom fiscal do supermercado. Traços: **serrilhado** no pé, colunas de valor, o total com traço duplo.
- **Conceitos:**
  - Convencional: card com título, valor, linhas e barra (hoje).
  - Ousado: cupom inteiro em fonte monoespaçada, com cabeçalho de loja.
  - Equilíbrio: cartão `surface` com serrilhado embaixo; linhas "Orçamento do mês" / "Estimativa da compra" em coluna de livro-caixa; traço de soma; "Sobra" (ou "Passou") com traço duplo; régua de uso com 10 marcas que muda de tom (≤70% `success`, ≤90% `warning`, acima `danger`, regra do legado); rodapé "32 itens · 7 faltando"; lápis para editar o orçamento.
  - **Escolhido:** Equilíbrio.
- **Estados:** sem orçamento ("Sem orçamento definido" + "Definir orçamento" como link) · dentro · perto (≥ 70%) · estourado ("Passou R$ 42,10" em `danger`) · skeleton.
- **Movimento próprio:** a estimativa **conta** quando o stepper muda um item; a régua anda junto.
- **Acessibilidade:** "Orçamento 800 reais, estimativa 612 reais e 40 centavos, sobra 187 reais e 60, 32 itens, 7 faltando".

---

### `PantryItem` + `PantryLevel` — Item da despensa

- **Representa:** o `GroceryItem` (nome, unidade, quantidade atual × ideal, preço estimado, faltando).
- **Dados por prioridade:** nome > quanto tem de quanto precisa > faltando > preço/unidade.
- **Origem:** a lista de compras presa na geladeira. Traço: o **marca-texto** no nome do que falta comprar e marcas de contagem para as unidades.
- **Conceitos:** convencional = card com nome, badge "Faltando" e −/+ (hoje); ousado = prateleira ilustrada com potes enchendo; **equilíbrio (escolhido)** = linha de pauta: nome (com marca-texto se faltando), `PantryLevel` embaixo (uma marca por unidade ideal, cheias até a atual; para frações ou mais de 12 unidades vira uma régua contínua) + "2 de 4 un · R$ 5,49/un" em `footnote`; stepper de tinta à direita (− número +).
- **Estados:** abastecido · faltando (marca-texto) · zerado (− desabilitado) · nome longo (1 linha com reticências) · fração ("0,5 de 5 kg").
- **Movimento próprio:** + / − dão um pulinho no número (escala 1,15 → 1, 160 ms) e a marca enche/esvazia; quando o item deixa de faltar, o marca-texto sai (scaleX → 0 da direita); haptic `impactLight`.
- **Acessibilidade:** "Arroz, 2 de 4 quilos, faltando, 5 reais e 49 o quilo"; botões "Aumentar arroz" / "Diminuir arroz" (mantidos).

---

### `Odometer` — Hodômetro

- **Representa:** a quilometragem atual do veículo.
- **Origem:** o hodômetro mecânico do painel. Traço: cada dígito numa "janela" de tambor.
- **Conceitos:** convencional = "Quilometragem · 36.200 km" em texto (hoje); ousado = painel de carro inteiro com ponteiros; **equilíbrio (escolhido)** = 6 janelas (`surfaceMuted`, raio `xs`, 26×36) com os dígitos em `odometer`, zeros à esquerda em `textSubtle`, e "km" em `footnote` ao lado.
- **Estados:** padrão · compacto (lista: texto "36.200 km" em `numeral`, sem janelas) · atualizando (dígitos rolam) · acima de 999.999 (7 janelas).
- **Movimento próprio:** ao salvar a nova quilometragem, os dígitos que mudaram **rolam** verticalmente até o valor novo (stagger da direita para a esquerda, 60 ms, 420 ms no total).
- **Acessibilidade:** "36.200 quilômetros".

---

### `MercosulPlate` — Placa

- **Representa:** a placa do veículo (opcional).
- **Origem:** a placa Mercosul brasileira (faixa azul com "BRASIL" no topo e letras pretas no fundo branco).
- **Conceitos:** convencional = texto "ABC1D23" (hoje); ousado = placa fotográfica com relevo; **equilíbrio (escolhido)** = placa desenhada: retângulo branco com borda de 1,5 px, faixa superior de 6 px em azul-tinta (fixa nos dois temas, é a cor da placa real), os caracteres em Manrope 800 caixa-alta, espaçados. A faixa é só cor, sem a palavra "BRASIL" (texto abaixo de 12 é proibido).
- **Estados:** padrão · sem placa (não renderiza; a linha mostra só o modelo) · compacta (lista, 72×24).
- **Acessibilidade:** "Placa A B C 1 D 2 3" (soletrada).

---

### `NotebookSwitch` — Caderno ativo

- **Representa:** o espaço ativo (`WorkspaceType`: PERSONAL / BUSINESS).
- **Origem:** o caderno de duas matérias, com as abas coloridas de divisória.
- **Conceitos:** convencional = segmented "Pessoal | Empresarial" com fundo azul (hoje); ousado = abas de fichário presas no topo da tela; **equilíbrio (escolhido)** = par de rótulos pequenos ("Pessoal · Empresa") em `subhead`, com o ativo sob o **marca-texto** e o inativo em textMuted; toque troca (otimista, reverte com toast se falhar).
- **Estados:** padrão · trocando (inativo desabilitado) · sem caderno carregado (os dois em textMuted).
- **Movimento próprio:** o marca-texto desliza de um rótulo para o outro (220 ms) + haptic `selection`; os números da tela contam até os novos valores quando chegam.
- **Acessibilidade:** `radiogroup` "Caderno", opções "Pessoal" e "Empresarial" com estado selecionado (os `testID` `workspace-option-*` são mantidos).

---

### `SubscriptionHero` + `PlanCard` + `TrialTimeline` — Assinatura (refino 2026-09-29)

- **Conceito:** a tela onde o Mony se apresenta usa o elemento assinatura (gradiente com vidro, `HeroDecoration` compartilhada com o saldo do Início). Descartados: cartão branco com pílula de status (parecia gerado, abria com uma negativa) e seletor Mensal/Anual dentro do herói (esconde a comparação).
- **`SubscriptionHero`:** chip de vidro com o status (pagamento pendente vira chip branco com ícone âmbar), título (plano ou "Experimente o Mony"), preço, barra de vidro do teste ("Dia 2 de 7 · faltam 6 dias") e a frase com a data; na oferta, o que o plano inclui (tabela do legado condensada). Lido como um resumo só (`accessibilityRole="summary"`).
- **`PlanCard`:** rádio com o ponto no gradiente da marca (entra com mola; parado em "reduzir movimento"), nome, pílula "Economize 45%", preço com "R$" e centavos menores e o intervalo; selecionado ganha borda índigo 2 e sombra maior. Lido como "Plano Anual, 65 reais e 34 centavos por ano. Melhor valor…".
- **`TrialTimeline`:** trilho de pontos (hoje preenchido no gradiente, futuro em anel) — Hoje · Até dd/mm cancele e não paga nada · dd/mm cobrança do plano escolhido (muda ao trocar de plano). Texto do FAQ do legado.

### Relatórios — `ReportHero`, `ColumnChart` + `ChartBar`, `TrendChart`, `CategoryDonut`, `ReportMonthRow` (2026-09-29)

- **Conceito:** o relatório conversa com o Início: o resumo é o herói em gradiente (a mesma `HeroDecoration`) e os gráficos usam a mesma barra arredondada em gradiente, agora `ChartBar` (extraída do `YearChart`, que passa a usá-la). Descartados: gráficos de pizza/linha de biblioteca (não seguem o design; `tech.md`) e uma tabela no lugar do resumo (sem ponto focal).
- **`ColumnChart`:** colunas selecionáveis com faixa lavanda, uma ou duas séries, legenda, legenda sob o rótulo (o saldo do mês) e a linha de valores acima; colunas com largura máxima, centradas quando são poucas.
- **`TrendChart`:** SVG com uma linha por série, preenchimento suave sob a primeira, faixa-guia e pontos no mês tocado; rótulos de mês abaixo.
- **`CategoryDonut`:** rosca SVG com as cores das categorias (espaço entre fatias), total no centro, legenda com valor e percentual da fatia (sobre as 5, como a pizza do legado).
- **`ReportHero`:** chip de período, saldo em `display`, ladrilhos de vidro de receitas/despesas, barra da razão com as cores e mensagens do legado.
- **`ReportMonthRow`:** linha da tabela mensal com a barra da razão (80% / 100%).

### Novidades — `NewsSheet`, `NewsCard`, `AdminNewsRow` (2026-09-30)

- **Conceito:** a novidade é um recado do Mony, não um alerta: folha de papel com um selo de megafone, sem vermelho nem modal de sistema. O vídeo é um cartão em gradiente da marca com "Assistir" (abre o YouTube só no toque, nada de player embutido: privacidade e peso). Descartados: player do YouTube na folha (carrega o YouTube antes de a pessoa querer) e um carrossel com todas as não lidas (o legado mostra uma por vez e avisa quantas faltam).
- **`NewsSheet`:** `PaperSheet` com rolagem (até 55% da tela): selo, "Novidade" e a pílula "N novas", título `title2`, data ou "Lida em", cartão do vídeo, texto simples e a nota das que faltam; botões "Marcar como lida" (só se não lida) e "Fechar". Usada pelo aviso do Início e pela lista.
- **`NewsCard`:** cartão tocável da lista: título, pílula "Nova" com borda índigo (ou "Lida em …" em cinza), data, prévia em até 2 linhas (`excerpt`, texto corrido cortado na palavra) e "Tem vídeo". Lido como um botão com título, estado e data.
- **`AdminNewsRow`:** linha do admin: título, pílula de estado (Ativa em verde, Vencida em âmbar, Inativa em cinza), período ("Desde dd/mm/aaaa" ou "dd/mm/aaaa até dd/mm/aaaa"), leituras · autor e ícone de vídeo.

## Chrome

| Superfície                               | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                            | Por quê                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Tab bar (`LedgerTabBar`)                 | barra cheia `chrome` com linha de pauta no topo; 4 abas (Início, Lançamentos, Metas, Mais) + botão **Lançar** no centro (círculo `primary` 52 px, "+" `onPrimary`, sombra `md`, 10 px acima da barra, rótulo "Lançar" embaixo); ativa = ícone preenchido + rótulo 700 sob **marca-texto** que desliza entre abas; haptic `selection`; tocar a aba ativa rola ao topo; some com teclado e nas telas empilhadas; padding inferior = inset do sistema | o loop principal (lançar) a 1 toque de qualquer aba; o marca-texto é a assinatura no lugar mais visto do app |
| Header de tela-raiz (`PageHeader`)       | no conteúdo: sobretítulo `overline` + título `title1` (Fraunces) + `NotebookSwitch` + ações (ícones de 24 em alvo de 48)                                                                                                                                                                                                                                                                                                                           | título editorial, e o caderno ativo sempre visível onde os números mudam com ele                             |
| Header compacto (`CompactHeader`)        | aparece com fade quando o título grande sai da tela: fundo `chrome`, título `headline`, linha de pauta embaixo                                                                                                                                                                                                                                                                                                                                     | orientação ao rolar sem ocupar espaço no topo                                                                |
| Header de tela empilhada (`StackHeader`) | voltar (círculo `surfaceMuted` 40 px com `chevron-back`) + ações à direita na barra; o título grande (`title1`) vem no conteúdo, logo abaixo, e passa para a barra compacta ao rolar                                                                                                                                                                                                                                                               | o mesmo título editorial das telas-raiz, sem depender do alinhamento de cada plataforma                      |
| Header de formulário (`SheetHeader`)     | alça de tinta (36×4) no topo + "Fechar" (×) à esquerda + título `title2` + nada à direita (o CTA fica embaixo)                                                                                                                                                                                                                                                                                                                                     | formulários são folhas de papel; o × no mesmo lugar em todos                                                 |
| Botão voltar                             | seta em círculo `surfaceMuted` 40 px; sobre foto (veículo), círculo `overlay` com seta `onPrimary`                                                                                                                                                                                                                                                                                                                                                 | contraste garantido sobre qualquer fundo                                                                     |
| Barra de ação fixa (`ActionBar`)         | nos formulários: CTA de tinta largo grudado em cima do teclado (`KeyboardStickyView`), fundo `background` com linha de pauta que só aparece quando há conteúdo por baixo; em Lançamentos, no modo seleção: "3 selecionados · − R$ 540,00" + botão "Excluir" `danger`, substituindo a tab bar                                                                                                                                                       | o CTA sempre à vista com o teclado; a seleção mostra o resumo vivo                                           |
| Pull-to-refresh                          | `RefreshControl` com `tintColor`/`colors` `primary` e fundo `surface`                                                                                                                                                                                                                                                                                                                                                                              | comportamento nativo, cor da direção                                                                         |
| Listas horizontais (categorias)          | fade de 24 px nas bordas (gradiente para `background`), peek do próximo chip                                                                                                                                                                                                                                                                                                                                                                       | nada cortado seco                                                                                            |
| Status bar                               | automática pelo tema (escura no claro, clara no escuro); nunca escondida                                                                                                                                                                                                                                                                                                                                                                           | o topo do Início é claro/escuro conforme o tema                                                              |
| Splash → app                             | splash na cor `background` do tema do sistema com o "M"; a splash fica até as fontes carregarem; a primeira tela entra com fade de 200 ms                                                                                                                                                                                                                                                                                                          | sem flash branco nem troca de fonte                                                                          |
| Carregando / vazio / erro                | skeleton no formato do componente de domínio com brilho lento; vazio com ilustração em traço de caneta + frase na voz do app + ação; erro com causa + "Tentar de novo"                                                                                                                                                                                                                                                                             | nada de "Carregando..." em texto nem ícone cinza                                                             |

## Mensagens e interações

Processo em `.claude/skills/app-design/references/09-componentes-proprios.md` (seção 5). Nenhum `Alert` nativo sobra.

### Inventário

| Mensagem                                             | Tela / gatilho                            | Superfície                                                | Tom     | Texto (na voz do app)                                                                                                             |
| ---------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Excluir 1 lançamento                                 | Lançamentos → deslizar / "Excluir"        | `ConfirmSheet` com a `LedgerLine` em miniatura            | perigo  | "Excluir este lançamento?" · "Ele sai do caderno e das somas do período." · [Excluir lançamento] [Manter]                         |
| Excluir N lançamentos                                | Lançamentos → modo seleção → "Excluir"    | `ConfirmSheet` com a contagem e a soma                    | perigo  | "Excluir 3 lançamentos?" · "Somam − R$ 540,00 e saem das somas do período." · [Excluir 3 lançamentos] [Manter]                    |
| Falha ao excluir                                     | Lançamentos, Metas, Dívida, Veículo, Item | `LedgerToast`                                             | perigo  | "Não foi possível excluir. Tente novamente."                                                                                      |
| Status alternado                                     | Lançamentos → carimbo                     | feedback no próprio carimbo (bate)                        | sucesso | —                                                                                                                                 |
| Lançamento criado (momento)                          | Lançamento (form) → "Lançar"              | `LedgerToast` variante recibo                             | sucesso | "Lançado · − R$ 212,40 · Mercado"                                                                                                 |
| Lançamento salvo (edição)                            | Lançamento (form) → "Salvar"              | `LedgerToast`                                             | sucesso | "Alterações salvas."                                                                                                              |
| Erro ao salvar formulário                            | todos os formulários                      | `InlineNotice` acima do CTA (sem fechar) + haptic `error` | perigo  | "Algo deu errado. Tente novamente." (ou o texto específico já mapeado)                                                            |
| Excluir meta                                         | Metas → deslizar / "Excluir"              | `ConfirmSheet` com a `GoalRuler` compacta                 | perigo  | "Excluir a meta "Viagem"?" · "O progresso anotado nela some junto." · [Excluir meta] [Manter]                                     |
| Excluir dívida                                       | Dívida → lixeira                          | `ConfirmSheet` com o `DebtEntry` compacto                 | perigo  | "Excluir "Financiamento do carro"?" · "As 12 parcelas e os lançamentos delas também serão excluídos." · [Excluir dívida] [Manter] |
| Desfazer pagamento                                   | Dívida → carimbo PAGA                     | `ConfirmSheet` com a `InstallmentLine`                    | aviso   | "Desfazer o pagamento da parcela 3?" · "Ela volta a ficar a pagar." · [Desfazer pagamento] [Voltar]                               |
| Falha ao desfazer                                    | Dívida                                    | `LedgerToast`                                             | perigo  | "Não foi possível desfazer o pagamento. Tente novamente."                                                                         |
| Parcela já paga (400)                                | Pagar parcela (sheet)                     | `InlineNotice` dentro do sheet                            | aviso   | "Esta parcela já está paga."                                                                                                      |
| Falha no pagamento                                   | Pagar parcela (sheet)                     | `InlineNotice` dentro do sheet                            | perigo  | "Não foi possível registrar o pagamento. Tente novamente."                                                                        |
| Sem categoria de despesa                             | Dívida (form)                             | `InlineNotice` aviso no topo, com ação "Criar categoria"  | aviso   | "Cada parcela vira uma despesa, então você precisa de pelo menos uma categoria de despesa para registrar uma dívida."             |
| Estrutura travada                                    | Dívida (form, com parcelas pagas)         | `InlineNotice` info junto dos campos travados             | neutro  | "Como já há parcelas pagas, o número de parcelas e o vencimento da 1ª não podem mais ser alterados."                              |
| Excluir item                                         | Item (form) → "Excluir item"              | `ConfirmSheet`                                            | perigo  | "Excluir "Detergente" da lista?" · "Você pode adicionar de novo quando quiser." · [Excluir item] [Manter]                         |
| Falha no stepper                                     | Mercado → +/−                             | `LedgerToast`                                             | perigo  | "Não foi possível atualizar a quantidade."                                                                                        |
| Nada para compartilhar                               | Mercado → compartilhar                    | `LedgerToast`                                             | neutro  | "Não há itens faltando para compartilhar."                                                                                        |
| Falha ao compartilhar                                | Mercado                                   | `LedgerToast`                                             | perigo  | "Não foi possível compartilhar. Tente novamente."                                                                                 |
| Compartilhar lista                                   | Mercado → compartilhar                    | share sheet do sistema                                    | —       | mensagem do legado (WhatsApp)                                                                                                     |
| Falha ao salvar orçamento                            | Orçamento (sheet)                         | `InlineNotice` no sheet                                   | perigo  | "Não foi possível salvar o orçamento. Tente novamente."                                                                           |
| Excluir veículo                                      | Veículo → lixeira                         | `ConfirmSheet` com a `MercosulPlate` + nome               | perigo  | "Excluir "Jeep Renegade 2022"?" · "A foto e os dados dele saem do Mony." · [Excluir veículo] [Manter]                             |
| Remover foto                                         | Veículo → "Remover foto"                  | `ConfirmSheet`                                            | perigo  | "Remover a foto deste veículo?" · "Você pode escolher outra depois." · [Remover foto] [Manter]                                    |
| Foto grande (413) / alterada (409) / falha / galeria | Veículo, Veículo (form)                   | `LedgerToast`                                             | perigo  | textos atuais mantidos                                                                                                            |
| Veículo salvo sem foto                               | Veículo (form)                            | `LedgerToast`                                             | aviso   | "Veículo salvo, mas não foi possível enviar a foto. Tente de novo na tela do veículo."                                            |
| Quilometragem menor                                  | Quilometragem (sheet), Veículo (form)     | erro de campo inline                                      | perigo  | "A quilometragem não pode ser menor que a atual (36.200 km)"                                                                      |
| Excluir categoria                                    | Categorias → lixeira                      | `ConfirmSheet` com a `CategoryTag`                        | perigo  | "Excluir a categoria "Mercado"?" · [Excluir categoria] [Manter]                                                                   |
| Categoria em uso (400)                               | Categorias → após confirmar               | `OptionsSheet` (as outras categorias do mesmo tipo)       | aviso   | ""Mercado" está em uso. Escolha uma categoria para substituir as transações:" · opções · [Cancelar]                               |
| Trocar de caderno falhou                             | todos os headers                          | `LedgerToast`                                             | perigo  | "Não foi possível trocar de caderno. Tente novamente."                                                                            |
| Login: inativa / 429 / credenciais                   | Entrar                                    | `InlineNotice` acima do CTA                               | perigo  | textos atuais mantidos                                                                                                            |
| E-mail já cadastrado                                 | Criar conta, Perfil                       | erro de campo inline                                      | perigo  | "Este e-mail já está cadastrado."                                                                                                 |
| Código enviado                                       | Esqueci a senha                           | `InlineNotice` sucesso                                    | sucesso | "Se este e-mail estiver cadastrado, você receberá um código em instantes."                                                        |
| Senha redefinida                                     | Redefinir senha                           | estado de sucesso da tela (carimbo pequeno "PRONTO")      | sucesso | "Senha redefinida" · "Sua senha foi atualizada. Entre com sua nova senha para continuar."                                         |
| Perfil salvo                                         | Perfil                                    | `InlineNotice` sucesso + botão vira "Salvo ✓" por 2 s     | sucesso | "Perfil atualizado com sucesso."                                                                                                  |
| Senha alterada                                       | Alterar senha → volta                     | `LedgerToast`                                             | sucesso | "Senha alterada."                                                                                                                 |
| Erro que impede a tela                               | todas as telas com dados                  | `ErrorState` (estado da tela)                             | perigo  | "Não consegui falar com o Mony agora." · "Algo deu errado. Tente novamente." · [Tentar de novo]                                   |

### Família

| Peça                        | Anatomia                                                                                                                                                                                                            | Linguagem visual                                                                             | Movimento                                                               | Comportamento                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `PaperSheet`                | alça + (título opcional) + conteúdo + área de ação                                                                                                                                                                  | papel `surfaceElevated`, raio `xl` no topo, sombra `lg` no claro                             | sobe com spring (damping 22); backdrop `overlay` com fade; saída 180 ms | fecha por arrastar, backdrop, voltar do Android; sobe com o teclado (keyboard-controller); nunca sheet sobre sheet          |
| `ConfirmSheet`              | miniatura do objeto afetado + título-pergunta (`title2`) + consequência (`body` textMuted) + 2 botões com verbo, empilhados: a ação (`danger` ou `primary`) em cima, a segura (`ghost`) embaixo, na zona do polegar | `PaperSheet`; faixa fina do tom no topo da miniatura                                         | idem `PaperSheet`                                                       | backdrop e gesto fecham (fechar = não fazer nada); a ação só acontece no botão; o botão vira loader e o erro aparece dentro |
| `OptionsSheet`              | título + corpo + lista de opções (`CategoryTag` como linha) + "Cancelar"                                                                                                                                            | `PaperSheet`                                                                                 | idem                                                                    | tocar numa opção executa e fecha                                                                                            |
| `LedgerToast`               | ícone do tom + texto + ação opcional; variante **recibo** com serrilhado embaixo e valor em `numeral`                                                                                                               | pílula `text`-sobre-`surfaceElevated` invertida (tinta no claro, papel no escuro), raio `md` | sobe 16 px + fade (220 ms); sai com fade (160 ms)                       | acima da tab bar ou da `ActionBar`; 4 s (6 s com ação); pausa ao tocar; fila de 1; anunciado ao leitor de tela              |
| `InlineNotice`              | ícone + texto + ação opcional                                                                                                                                                                                       | fundo `*Muted` do tom, texto `on*Muted`, raio `md`, sem borda                                | entra com altura animada (layout)                                       | fica até resolver                                                                                                           |
| `ErrorState` / `EmptyState` | ilustração em traço (vazio) ou ícone de tinta (erro) + título `title2` + frase + ação                                                                                                                               | papel, sem card                                                                              | fade + 8 px                                                             | ação resolve (lançar, tentar de novo)                                                                                       |

## Efeitos (vida)

Todos leem `useMotion()` (preferência "reduzir movimento" do sistema + override do DesignLab).

| Efeito         | Onde                                                                                 | Técnica                                                                                                                          | Duração / ciclo                | Reduzir movimento                 | Versão barata            |
| -------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------- | ------------------------ |
| `InkBloom`     | Entrar, Criar conta, Esqueci/Redefinir senha, topo do Início                         | 3 `Svg` com `RadialGradient` (`bloomA/B/C` → transparente) em `Animated.View`, transladando e escalando (1,0 ↔ 1,12)             | 18 s em loop, fases defasadas  | primeiro quadro parado            | 2 manchas, só translação |
| `Highlighter`  | tab bar, `MarkerTabs`, `NotebookSwitch`, `CategoryPicker`, "A pagar", itens faltando | `Animated.View` `accent` com `skewX(-8deg)`, `scaleX` a partir da esquerda; posição animada (layout) quando desliza entre opções | 220 ms                         | aparece sem crescer (fade 120 ms) | —                        |
| `DoubleRule`   | saldo, restante da dívida, sobra do mercado, recibo                                  | 2 barras `scaleX` 0 → 1 a partir da esquerda                                                                                     | 320 ms, 80 ms depois do número | já desenhado                      | —                        |
| `CountUp`      | saldo e conta do período, restante da dívida, estimativa do mercado, toast recibo    | `useSharedValue` + `useAnimatedReaction` → texto formatado em pt-BR (`runOnJS` com throttle por frame)                           | 400 ms                         | troca seca                        | troca seca               |
| `StampIn`      | `StatusStamp`                                                                        | escala 1,35 → 1 (spring de carimbo) + opacidade                                                                                  | ≈ 280 ms                       | fade 120 ms                       | —                        |
| `OdometerRoll` | `Odometer`                                                                           | cada dígito é uma coluna 0–9 com `translateY`                                                                                    | 420 ms, stagger 60 ms          | troca seca                        | —                        |
| `ScrollHeader` | todas as telas-raiz e empilhadas com título grande                                   | `useAnimatedScrollHandler` → opacidade do `CompactHeader` e da linha de pauta                                                    | acompanha o dedo               | troca seca no limiar              | —                        |
| `Shimmer`      | skeletons                                                                            | faixa diagonal de `surface` a 40% passando por `surfaceMuted`                                                                    | 1,4 s em loop                  | sem brilho (bloco parado)         | sem brilho               |
| `GrowIn`       | `YearLedgerChart`, `GoalRuler`, `InstallmentTrack`                                   | `scaleY`/`scaleX` a partir da base, stagger                                                                                      | 400 ms                         | já desenhado                      | —                        |

## Primitivas

| Primitiva                 | Variantes                                                                                                                    | Observação                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Text`                    | toda a escala tipográfica (`display` … `stamp`) + `tone` (text, muted, subtle, primary, success, warning, danger, onAccent…) | aplica família, peso, `tabular-nums` e caixa-alta do token                                                                             |
| `Icon`                    | Ionicons, tamanhos sm/md/lg/xl, `filled`                                                                                     | troca `-outline` ↔ preenchido                                                                                                          |
| `Pressable` (`Touchable`) | `feedback`: `sink` (botão), `row` (fundo), `none`                                                                            | estado pressionado por tipo de peça, haptic opcional                                                                                   |
| `Button`                  | `primary` (tinta), `secondary` (contorno de tinta 1,5), `ghost`, `danger` · `md`/`sm` · `loading`, `disabled`, ícone         | afunda 0,97 + escurece; loader próprio (3 marcas de régua pulsando)                                                                    |
| `IconButton`              | `plain` (header), `soft` (círculo `surfaceMuted`), `ink` (stepper)                                                           | alvo ≥ 48, rótulo acessível obrigatório                                                                                                |
| `TextField`               | padrão, senha (olho), multilinha, desabilitado                                                                               | rótulo `subhead` em cima, caixa `surface` raio `md` borda `border` → `primary` 1,5 no foco → `danger` no erro; erro com ícone embaixo  |
| `MarkerTabs`              | 2 a 4 opções                                                                                                                 | segmentado sem trilho: rótulos com o marca-texto deslizando (período, filtro Todos/Despesas/Receitas, Todos/Faltando, Despesa/Receita) |
| `MarkerChip`              | padrão, selecionado, tracejado                                                                                               | base do `CategoryPicker`, combustível e categoria do mercado                                                                           |
| `Checkbox`                | marcado, desmarcado                                                                                                          | "Repetir todo mês", "Meta concluída" (quadrado de tinta com check que se desenha)                                                      |
| `Skeleton`                | bloco, linha, círculo                                                                                                        | com `Shimmer`                                                                                                                          |
| `Rule`                    | pauta (1 px `border`), traço de soma (1,5 px `text`), `DoubleRule`                                                           | separadores do livro-caixa                                                                                                             |
| `ZigzagEdge`              | cima, baixo                                                                                                                  | o serrilhado do cupom                                                                                                                  |
| `AppImage`                | —                                                                                                                            | placeholder com nome do arquivo em dev; aceita `tint` para as ilustrações em traço                                                     |
| `Screen` / `ScrollScreen` | contida, formulário (keyboard-aware), lista                                                                                  | aplica insets por peça (topo no header, base no conteúdo), `KeyboardAwareScrollView` no formulário                                     |
