# Revisão visual — Mony

Processo e rubrica em `.claude/skills/app-design/references/10-revisao-visual.md`. Uma tela só fica **Pronta** com ≥ 2 rodadas e a última sem problema alto ou médio.

**Regra:** prints de revisão só com "Dados → Mock" ligado no catálogo (dados fictícios). A pasta `design/revisao/` está no `.gitignore`: nunca commite prints com dados de conta real.

Como os prints serão tirados: emulador Android (`Pixel_10_Pro_XL`) com Expo Go, `adb exec-out screencap -p`, DesignLab para estado/tema/aparelho. Prints em `design/revisao/` (sugestão: pôr no `.gitignore`).

## Resumo

| Tela    | Rodadas | Última rodada          | Situação |
| ------- | ------- | ---------------------- | -------- |
| (todas) | 0       | diagnóstico por código | Pendente |

---

## Rodada 0 — diagnóstico do design atual (refino, 2026-09-25)

Feita **por código** (seção 4 da rubrica), sem prints: rodar o app atual exige a API com o `.env` local, cuja leitura foi bloqueada nesta sessão. O "antes" fica no commit `fa6ac49`. Crítica do usuário ("refinar todo design") entra como severidade alta em identidade.

### Problemas do app inteiro

| #   | Critério                   | Problema (concreto)                                                                                                                                                                                                                            | Severidade | Correção planejada                                                                                                                      |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Anti-genérico / Identidade | O app é Tailwind/shadcn portado: azul `#166FE3`, fonte do sistema, `radius.md` 12 e borda de 1 px `#E1E7EF` em tudo. Sem logo, nada identifica o Mony num print.                                                                               | alta       | direção "Caderno de Contas": papel + tinta + marca-texto, Fraunces + Manrope, motivos do domínio                                        |
| 2   | Anti-genérico              | Todas as listas (metas, dívidas, veículos, parcelas, mercado) são o mesmo card branco com borda (`row` copiado em 8 arquivos) com título em negrito + 2 linhas cinza. Horário, dinheiro, status e categoria têm a mesma forma.                 | alta       | componentes de domínio por natureza de dado (`LedgerLine`, `DebtEntry`, `GoalRuler`, `PantryItem`, `Odometer`…) sobre a pauta, sem card |
| 3   | Chrome                     | Tab bar do `bottom-tabs` com o tint trocado; 5 abas iguais, sem ação do loop principal; "Perfil" ocupa uma aba.                                                                                                                                | alta       | `LedgerTabBar` própria com botão Lançar e marca-texto                                                                                   |
| 4   | Chrome / Mensagens         | `Alert.alert` nativo em 9 exclusões/confirmações ("Excluir", "Tem certeza"-like), sem mostrar o objeto nem a consequência; erros de exclusão também em `Alert` "Erro".                                                                         | alta       | `ConfirmSheet` com miniatura e consequência; `LedgerToast` para falhas                                                                  |
| 5   | Estados                    | Carregando = texto "Carregando..." ou `ActivityIndicator` centralizado; vazio = uma linha cinza ("Nenhuma meta ainda."); erro = texto vermelho sem "Tentar de novo".                                                                           | alta       | skeleton no formato do componente, `EmptyState` com ilustração e ação, `ErrorState` com retry                                           |
| 6   | Cor / Escuro               | Só tema claro, cores estáticas importadas em todo `StyleSheet`; `app.json` já diz `automatic`, então no escuro do sistema o app fica claro com status bar forçada `dark`.                                                                      | alta       | tema claro/escuro semântico via `useTheme()`                                                                                            |
| 7   | Hierarquia                 | `Text` só tem 6 variantes e `caption` (14/20) serve de rótulo, ajuda, erro, metadado e link; `heading` 28 em toda tela. Muitos níveis com o mesmo peso.                                                                                        | média      | escala da direção (18 tokens, com `overline`, `numeral`, `stamp`)                                                                       |
| 8   | Números                    | Valores em fonte proporcional, sem alinhamento em coluna; saldo verde/vermelho por cor apenas; unidade "R$" do mesmo tamanho do valor.                                                                                                         | média      | `tabular-nums`, sinal +/−, "R$" menor, coluna à direita                                                                                 |
| 9   | Bordas e teclado           | `Screen` envolve tudo em `SafeAreaView` com `edges` topo+base (faixa morta, nada sangra); teclado via `automaticallyAdjustKeyboardInsets` (só iOS) e CTA no fim do formulário (some atrás do teclado nos formulários longos: Dívida, Veículo). | média      | insets por peça; keyboard-controller com CTA grudado no teclado                                                                         |
| 10  | Vida                       | Nada anima: sem transição de layout, sem feedback além da opacidade do `TouchableOpacity`, números trocam seco, gráfico com `isAnimated={false}`.                                                                                              | média      | nível 1 · Calmo: marca-texto, carimbo, números que contam, tinta na água nas telas de entrada                                           |
| 11  | Chrome                     | O `WorkspaceSwitcher` (segmentado azul) repete em todo header, com o mesmo peso do título.                                                                                                                                                     | média      | `NotebookSwitch` discreto, com marca-texto                                                                                              |
| 12  | Acabamento                 | Ícones de cabeçalho `add-circle-outline` azuis de 24 com `hitSlop` 8 (alvo < 44 visualmente) e lixeira vermelha em toda linha.                                                                                                                 | baixa      | `IconButton` com alvo 48; exclusão por gesto + ação acessível                                                                           |

### Por tela (destaques)

| Tela                 | Problema principal                                                                                                                    | Severidade |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Início               | grid 2×2 de números coloridos num card; "Sair" como botão grande no fim da tela principal; gráfico genérico sem destaque do mês atual | alta       |
| Lançamentos          | data repetida em toda linha; badge Pago/Pendente e lixeira competem com o valor; seleção só por texto "N selecionada(s)"              | alta       |
| Lançamento (form)    | o valor é mais um campo; tipo e status como dois segmentados iguais; CTA no fim, sai de vista com o teclado                           | alta       |
| Entrar / Criar conta | sem marca nenhuma (badge com ícone de carteira); formulário centralizado sem ponto focal                                              | alta       |
| Metas / Dívidas      | card + barra azul + "x de y"; "Atrasada" e "Ativa" são badges iguais aos de qualquer app                                              | média      |
| Dívida (detalhe)     | 3 valores (Total/Pago/Restante) com o mesmo peso; parcelas como cards com botão "Pagar" secundário em cada                            | média      |
| Mercado              | cartão de orçamento genérico; "Faltando" como badge; stepper com dois quadrados azuis                                                 | média      |
| Veículo (detalhe)    | foto contida numa caixa com botões embaixo; km como "title" simples; ficha em pares rótulo/valor                                      | média      |
| Mais                 | lista de `ListRow` com badges de ícone azuis, sem hierarquia                                                                          | média      |

---

## Rodada 1 — retorno do usuário (2026-09-25)

O usuário abriu o app no aparelho (Expo Go) e a tela Design system.

| #   | Critério   | Problema                                                                                                                           | Severidade | Correção                                                                                                                 |
| --- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Tipografia | "muitas fontes cortando": alturas de linha de 1,17–1,33× o tamanho (Manrope e Fraunces) cortam ascendentes/descendentes no Android | alta       | escala nova com altura de linha ≥ 1,4× em todos os tokens; Fraunces removida                                             |
| 2   | Identidade | "não gostei do design": a direção "Caderno de Contas" (papel, tinta, marca-texto) não é o que o dono quer                          | alta       | nova direção "Índigo Suave" a partir da referência enviada (fintech lavanda/índigo, cartões brancos, gradiente da marca) |
| 3   | Tema       | "não precisa de light mode e dark mode"                                                                                            | média      | só tema claro                                                                                                            |
| —   | Ícone      | "a logo do app ficou maravilhosa"                                                                                                  | —          | mantida                                                                                                                  |

## Rodada 2 — retorno do usuário na direção nova (2026-09-25)

| #   | Critério   | Problema                                                                                          | Severidade | Correção                                                                                                                                                                                                                                                                                                                               |
| --- | ---------- | ------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tipografia | valor do cartão de saldo cortado (Início e Design system), e o "2.059,45" do Design system também | alta       | causa: no `MoneyHero`, "R$" e centavos são trechos aninhados com altura de linha própria (26), que no Android passa a valer para a linha inteira e corta os dígitos de 34; mais o `adjustsFontSizeToFit`. Agora os trechos aninhados usam `inline` (sem altura de linha própria) e valores longos descem um tamanho em vez de encolher |
| 2   | Mensagens  | "os toasts podem ficar mais bonitos"                                                              | média      | toast refeito: cartão branco com círculo sólido do tom e ícone branco, rótulo do tom + mensagem em destaque, valor à direita (lançamento), ação em pílula ou ×, barra de tempo embaixo, entrada com mola e arrastar para dispensar                                                                                                     |

## Rodada 3 — retorno do usuário (2026-09-25)

| #   | Critério     | Problema                                                                          | Severidade | Correção                                                                                                                                                    |
| --- | ------------ | --------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Vida / topo  | o efeito de manchas no topo do Início "pode ficar melhor"; sugeriu um hero banner | média      | `BalanceHero`: faixa em gradiente de ponta a ponta, saudação, seletores em vidro, saldo em branco, anéis e brilho estáticos; cartão de resumo sobre a borda |
| 2   | Estabilidade | erro de "FiberNode" na home                                                       | alta       | o worklet do `ScrollScreen` (troca da status bar sobre o hero) capturava a prop `hero` (elemento React); agora captura só um booleano                       |

## Rodada 4 — aprovação (2026-09-26)

O usuário revisou no aparelho as 18 telas restantes e aprovou todas ("do jeito que ficou todas as telas estão perfeitas"). Nenhum ajuste pedido.

---

## Passe de acabamento

Feito pelo usuário no aparelho, percorrendo o app inteiro (Rodadas 2 a 4). Consistência aplicada por construção: todas as telas usam as mesmas peças de chrome (`TopBar` com título centralizado e botões circulares, `ScrollScreen`/`FormScreen`/`AuthLayout`, `AppTabBar`, `ConfirmSheet`, `AppToast`), o mesmo início de conteúdo (`useScreenInsets`) e a mesma folga inferior (`useBottomClearance`).

---

## Tela 28 — Assinatura (refino, 2026-09-29)

Prints no emulador Android (Expo Go, dados Mock ligados só no emulador), em `design/revisao/assinatura-*`.

| Rodada    | Problemas (severidade)                                                                                                                                                                                                                                                                                                             | Correção                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0 (antes) | cartão "Sem assinatura" com ✨ abre a tela com uma negativa, sem herói (alta, crítica do usuário); cartões de plano sem rádio, "R$"/"/mês" do tamanho do valor, argumento (R$ 5,45/mês, −45%) em cinza (média); mensal primeiro com o anual pré-selecionado (média); o teste não diz quando cobra (média); meia tela vazia (média) | herói em gradiente (`SubscriptionHero`), `PlanCard` com rádio, anual primeiro, `TrialTimeline`                                    |
| 1         | título do herói com "dias" sozinho na última linha (média); "Cancele quando quiser" repetido 3× (média); pílula "Economize" grande, disputa com o nome (média); "ano." sozinho no fim da linha do tempo (baixa); CTA abaixo da dobra (média)                                                                                       | título "Experimente o Mony", frase só com a data, pílula `caption`, texto da cobrança encurtado, CTA fixo (`ScrollScreen footer`) |
| 2         | barra do teste vazia no 1º dia e texto redundante (média); com pagamento pendente + cancelamento agendado, dois botões principais e o chip escondendo o problema (média); nota do Stripe com "cobrança." sozinho (baixa)                                                                                                           | "Dia 1 de 7 · faltam 7 dias" com a barra a partir de 1/7; pendente tem prioridade no herói, "Reativar" secundário; nota encurtada |
| 3         | nenhum alto ou médio                                                                                                                                                                                                                                                                                                               | —                                                                                                                                 |

Situação: **Pronta**. Carregando/erro mantêm o último dado em cache por decisão (uma falha de polling não derruba a tela); o skeleton e o `ErrorState` são os componentes padrão.

---

## Tela 29 — Relatórios (nova, 2026-09-29)

Prints no emulador Android (Expo Go, dados Mock ligados só no emulador), em `design/revisao/relatorios-*`.

| Rodada | Problemas (severidade)                                                                                                                                                                                                                                                   | Correção                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | com um mês só, a faixa de seleção do gráfico mensal cobria o cartão inteiro (média); "Caderno Pessoal" sob as datas repetia o chip do herói (média); tabela mensal com respiro dobrado no topo e no fim (baixa); valores pequenos viravam ora traço, ora bolinha (baixa) | colunas com largura máxima e centradas; legenda do caderno removida (fica no chip); linhas da tabela sem o padding das pontas; valor pequeno sempre como ponto |
| 2      | nenhum alto ou médio (3 meses, dia da semana, tabela e estado vazio conferidos)                                                                                                                                                                                          | —                                                                                                                                                              |

Situação: **Pronta**.

Depois das revisões de código e desempenho (2026-09-30): o relatório fica na tela, esmaecido, enquanto uma data está incompleta ou o novo período carrega (antes sumia e remontava a cada tecla); o chip do herói usa as datas do relatório (com os dois anos quando diferem); o dia de maior gasto é reselecionado a cada período; o centro da rosca diz "Total" com menos de 5 categorias; os rótulos dos gráficos de colunas crescem com a fonte do sistema. Efeito no Início: a `ChartBar` compartilhada mostra valor pequeno como ponto (7 px, antes 4 px) — mudança deliberada da rodada 1.
