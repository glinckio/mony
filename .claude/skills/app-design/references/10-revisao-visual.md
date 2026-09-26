# Revisão visual

Código que compila não é tela pronta. O designer abre a tela, olha, compara com a intenção e ajusta, várias vezes. Faça o mesmo: rode o app, tire print, critique com a rubrica, corrija e repita.

**Regra**: uma tela só vira **Pronta** depois de passar por pelo menos **2 rodadas** de revisão com print, e a última rodada não pode ter problema de severidade alta ou média.

## 1. Como ver o app

Salve os prints em `design/revisao/` com o nome `{tela}-{estado}-{tema}-r{rodada}.png` (ex.: `quadra-normal-escuro-r1.png`) e abra cada um com a ferramenta de leitura (você enxerga imagens). Sugira colocar `design/revisao/` no `.gitignore`.

| Stack | Caminho preferido | Alternativa |
|---|---|---|
| Expo / RN com `react-native-web` | `npx expo start --web` + painel de navegador (preview) em viewport mobile (375×812) e screenshot | emulador Android: `adb exec-out screencap -p > design/revisao/x.png` · simulador iOS (macOS): `xcrun simctl io booted screenshot design/revisao/x.png` |
| Expo / RN sem web | emulador ou simulador (acima) | pedir prints ao usuário |
| Flutter | `flutter screenshot -o design/revisao/x.png` com o app rodando num device/emulador | `flutter run -d chrome` + painel de navegador |
| SwiftUI | `xcrun simctl io booted screenshot ...` (só macOS) | pedir prints ao usuário |
| Compose | `adb exec-out screencap -p > ...` | pedir prints ao usuário |
| Ionic / Capacitor | servidor de dev + painel de navegador em viewport mobile | emulador |

Use o **DesignLab** para alternar estado e tema entre os prints, sem mexer no código.

**Web não é o aparelho.** Blur, sombras, fontes e barras nativas podem sair diferentes. Use a web para composição, hierarquia e ritmo, e, quando der, confirme os detalhes num emulador.

**Sem como rodar** (ex.: SwiftUI no Windows, sem emulador): peça ao usuário os prints de uma lista exata (tela × estado × tema) e revise a partir deles. Enquanto os prints não chegam, faça a revisão por código (seção 4). A tela fica marcada como "Pronta (sem revisão visual)" até os prints chegarem.

## 2. O que capturar por tela

- normal no claro e no escuro;
- vazio, carregando e erro (um tema basta);
- rolada até o meio, quando a tela rola (header colapsado, barra fixa sobre o conteúdo);
- nas telas P1: tela pequena (375×667);
- o estado específico da tela (selecionado, pico, lotado, cancelado...);
- cada mensagem que a tela dispara (confirmação, toast, erro, sheet de opções), aberta, no claro e no escuro;
- no DesignLab em `aparelho: iPhone com ilha` (a web tem insets zero), principalmente as telas de herói sangrando e imersivas;
- com o teclado aberto, em cada tela com campo (emulador, aparelho ou prints do usuário).

## 3. Rubrica

Critique como se o design fosse de outra pessoa e você tivesse que achar problemas. **Na primeira rodada, liste pelo menos 3 problemas por tela.** Se não achou, você não olhou direito: volte aos critérios 1, 3 e 6.

| # | Critério | Como checar |
|---|---|---|
| 1 | **Ponto focal** | Reduza o print mentalmente a 25% ou desfoque os olhos: o que aparece primeiro? Tem que ser o ponto focal da spec. Se duas coisas disputam, uma perde peso. |
| 2 | **Hierarquia** | No máximo 3 níveis de ênfase visíveis. Tudo com o mesmo peso é falha. Tamanhos vizinhos parecidos (14/15/16 lado a lado) viram ruído: escolha um. |
| 3 | **Ritmo e espaço** | Proximidade: itens do mesmo grupo ficam mais perto entre si do que de outros grupos. O espaço entre seções é claramente maior que o espaço dentro delas. Nada "flutuando" sem pertencer a um grupo. |
| 4 | **Alinhamento** | Poucos eixos verticais. Ícone alinhado opticamente com a primeira linha de texto. Números alinhados à direita e tabulares. Nada desalinhado por 2 px. |
| 5 | **Densidade** | A primeira dobra mostra a tarefa principal. Sem vazio de template, sem aperto. |
| 6 | **Anti-genérico** | A tela é uma pilha de seções iguais (rótulo em caixa-alta + bloco)? Cards idênticos com borda? Grid de ícone + rótulo? Algum componente de destaque falha no teste do componente genérico ([09](09-componentes-proprios.md))? |
| 7 | **Identidade** | Dá para reconhecer o app num print sem logo? A linguagem visual aparece com intenção, sem exagero? |
| 8 | **Cor** | 60/30/10 respeitado, acento raro, nada vibrando no escuro, estado nunca só por cor. |
| 9 | **Tipografia** | Display usado com intenção. Linha de texto ≤ ~70 caracteres. Truncamento elegante. Título sem palavra solitária na última linha, quando der para evitar. |
| 10 | **Chrome e mensagens** | Tab bar, header, voltar e CTA fixo coerentes com a direção. Conteúdo não fica escondido atrás deles. Safe area respeitada. Cada modal, sheet, toast e banner da tela usa a superfície certa (seção 5 de [09](09-componentes-proprios.md)), tem título e botões com verbo e mostra a consequência. Nenhum `Alert` nativo onde o inventário pediu peça própria. |
| 11 | **Acabamento** | Raio interno = externo − padding. Bordas e sombras só onde o design system define. Ícones do mesmo peso e tamanho óptico. Placeholders de imagem não quebram a composição. |
| 12 | **Escuro** | Não é inversão. Superfícies elevadas mais claras. Imagens e ilustrações legíveis. |
| 13 | **Estados** | Vazio, erro e carregando com a mesma qualidade da tela normal. Skeleton no formato do conteúdo. |
| 14 | **Texto** | Voz do app, verbo de ação nos botões, nenhum "Item 1", "Lorem" ou mensagem de sistema crua ("Error 500"). |
| 15 | **Vida** | A tela tem as camadas de vida da spec, no nível do app? A tela está parada onde deveria reagir (scroll, troca de estado, fim de tarefa)? O fundo ambiente compete com o conteúdo? O texto se lê no pior quadro? A versão "reduzido" existe e é bonita? O fps se mantém? Como revisar movimento: seção 9 de [11-vida-e-efeitos.md](11-vida-e-efeitos.md). |
| 16 | **Bordas e teclado** | O modo de borda da spec foi aplicado? Faixa morta acima do herói? Algo tocável ou legível atrás da ilha, da status bar, do indicador de home ou da barra do Android? Último item da lista alcançável acima da tab bar? Com o teclado aberto, o campo focado e a próxima ação aparecem? Nada pula? (ver [12-bordas-e-teclado.md](12-bordas-e-teclado.md), seção 4) |

Severidade:
- **alta**: quebra usabilidade, hierarquia ou identidade (ex.: o CTA some no escuro, a tela parece template);
- **média**: ritmo, alinhamento, consistência (ex.: espaço igual entre e dentro das seções);
- **baixa**: polimento (ex.: ícone 1 px acima da linha de texto).

Registre em `design/revisao.md` (template em [../templates/revisao.md](../templates/revisao.md)). Cada problema tem de ser **concreto e acionável**: "o preço compete com o nome da quadra: os dois em 17/600; preço vai para `score` e nome fica `headline`". "Melhorar hierarquia" não serve.

## 4. Revisão por código

Complementa a visual. É a única possível quando não dá para rodar.
- Conte os imports de cada tela P1: se ela só usa primitivas (`Card`, `Text`, `Section`, `Badge`), está genérica.
- Procure valores hardcoded (hex, `fontSize: 1x`, margens mágicas).
- Veja se o mesmo componente representa dados de natureza diferente.
- Confira se todo `Pressable` tem estado pressionado e se todo componente de domínio tem a microinteração própria da spec.
- Confira os paddings inferiores contra a altura da tab bar e da barra de ação fixa.

## 5. Passe de acabamento

Depois que todas as telas estão prontas, faça **um passe no app inteiro**, navegando pelo loop principal do começo ao fim como usuário. Isso pega o que a revisão tela a tela não vê:

- **Consistência entre telas**: mesmo topo, mesmo header, CTA sempre no mesmo lugar, mesmo espaçamento de início de conteúdo.
- **Continuidade**: a peça tocada "continua" na tela seguinte quando a stack permite (Hero no Flutter, `matchedGeometryEffect` no SwiftUI, `SharedTransitionLayout` no Compose; no RN, transição de layout do Reanimated ou fade coordenado). Se não der, a entrada da tela seguinte pelo menos ecoa a forma do que foi tocado.
- **Momentos**: os momentos da direção de arte (confirmação, primeira abertura, conquista) estão implementados com o cuidado combinado.
- **Microinterações**: cada ação importante tem resposta visual e háptica própria (selecionar, favoritar, confirmar, copiar, erro).
- **Vida no conjunto**: o app inteiro parece do mesmo nível de vida. Nenhuma tela ficou parada perto de outra animada, e nenhuma exagera. As transições entre telas contam a mesma história.
- **Números**: formatados em pt-BR, tabulares, com unidade menor que o valor.
- **Scroll**: header que reage, fades nas bordas das listas horizontais, barra fixa que ganha borda/sombra só quando há conteúdo por baixo.
- **Primeira abertura**: splash → app sem flash branco nem troca de fonte.
- **Teclado**: aparência do tema, CTA acessível, foco no primeiro campo quando faz sentido.
- **Ícones**: um peso só, ativo preenchido, mesmo tamanho óptico.

Registre o passe em `design/revisao.md` (seção "Passe de acabamento") com o que foi corrigido.

## 6. Checkpoint visual da tela-chave

A **tela-chave** é a que mais define o app: normalmente a tela central do loop principal. Ela é construída primeiro, passa pelas rodadas de revisão e então vai ao usuário **antes** das outras telas (pule com `--direto`):

- abra a tela no painel de navegador, se o ambiente tiver (o usuário vê junto), ou liste os prints de `design/revisao/` com links;
- mostre claro e escuro, mais um estado relevante;
- diga em 3 linhas o que a tela faz de próprio (componente de domínio, chrome, vida, momento);
- peça ao usuário para **interagir** (rolar, tocar, completar a ação) e dizer se a intensidade e o ritmo das animações estão certos.

Espere o ok ou os ajustes. O nível aprovado aqui vira a régua das outras telas.
