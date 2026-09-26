# Design system

`design/tokens.json` é a fonte de verdade. São três camadas:

1. **Paleta** (primitivos): escalas de cor cruas. As telas **nunca** usam direto.
2. **Semântico** (um conjunto por modo, claro e escuro): papéis como `background`, `text`, `primary`. É isto que as telas usam.
3. **Componente** (no código): cada componente mapeia seus estados para tokens semânticos.

Schema completo com exemplo preenchido: [../templates/tokens.json](../templates/tokens.json). Não renomeie as chaves semânticas obrigatórias: o validador e o tema dependem delas. Chaves extras são bem-vindas.

## Cores semânticas obrigatórias (em `color.light` e `color.dark`)

| Token | Uso |
|---|---|
| `background` | fundo das telas |
| `surface` | cards, inputs, listas |
| `surfaceMuted` | áreas secundárias, chips, skeleton |
| `surfaceElevated` | sheets, modais, menus (no escuro, mais claro que `surface`) |
| `border` | divisórias e contornos |
| `text` | texto principal |
| `textMuted` | texto secundário (ainda com contraste ≥ 4.5:1) |
| `primary` / `onPrimary` | ação principal e o conteúdo sobre ela |
| `primaryMuted` / `onPrimaryMuted` | fundo suave de marca (chip selecionado, badge) e o conteúdo sobre ele |
| `accent` / `onAccent` | destaque raro |
| `success` / `onSuccess`, `warning` / `onWarning`, `danger` / `onDanger` | estados |
| `overlay` | véu sobre imagens e modais (`#RRGGBBAA`) |
| `placeholder` | fundo do placeholder de imagem |

Pares validados pelo script, com contraste mínimo:

| Par | Mínimo |
|---|---|
| `text` sobre `background`, `surface` e `surfaceElevated` | 4.5 |
| `textMuted` sobre `background` e `surface` | 4.5 |
| `onPrimary`/`primary`, `onPrimaryMuted`/`primaryMuted`, `onAccent`/`accent` | 4.5 |
| `onSuccess`/`success`, `onWarning`/`warning`, `onDanger`/`danger` | 4.5 |
| `primary` sobre `background` e `surface` (ícones, links, bordas de foco) | 3.0 |

Pares extras vão em `contrastChecks` no `tokens.json`. Exemplo: `{"fg": "border", "bg": "background", "min": 1.5}`.

Validação: `python .claude/skills/app-design/scripts/validar_tokens.py`. Quando um par falha, o script sugere uma cor próxima que passa.

## Tipografia

Os **nomes** dos tokens abaixo são obrigatórios. Os **valores** saem da direção de arte, não desta tabela. A tabela é o ponto de partida neutro (proporção ~1,2) e, se for copiada sem ajuste, o app fica com o ritmo de qualquer app iOS.

Como derivar:
- **Base**: `body` em 15 a 17, conforme o público e a densidade.
- **Proporção** entre os passos, pela personalidade: 1,125 a 1,15 para direções densas e utilitárias; ~1,2 para o equilíbrio; 1,25 a 1,333 para direções expressivas (esporte, eventos, editorial).
- **Topo expressivo**: `display` pode ir muito além de 34 (48 a 72) quando a direção tem números ou títulos-herói (placar, saldo, horário). Nesse caso, tem no máximo um por tela e altura de linha justa (1,0 a 1,1).
- **Tokens extras** são bem-vindos quando a direção pede: `overline`, `score`/`numeral` (algarismos grandes tabulares), `mono` (códigos). Registre o uso de cada um.
- **Contraste de peso**, não só de tamanho: um display 700 ao lado de corpo 400 cria hierarquia com menos tamanhos.

| Token | Tamanho / altura de linha (ponto de partida) | Peso | Uso |
|---|---|---|---|
| `display` | 34 / 40 | 700 | número ou título herói, no máximo 1 por tela |
| `title1` | 28 / 34 | 700 | título grande de tela |
| `title2` | 22 / 28 | 700 | título de seção |
| `title3` | 20 / 25 | 600 | título de card |
| `headline` | 17 / 22 | 600 | destaque em lista |
| `body` | 16 / 24 | 400 | texto corrido |
| `bodyStrong` | 16 / 24 | 600 | ênfase |
| `callout` | 15 / 20 | 400 | texto de apoio |
| `subhead` | 14 / 20 | 500 | metadados |
| `footnote` | 13 / 18 | 400 | legendas |
| `caption` | 12 / 16 | 500 | rótulos pequenos (mínimo absoluto) |
| `label` | 15 / 20 | 600 | botões |

Regras:
- Nunca menor que 12.
- Respeite a escala de fonte do sistema (Dynamic Type / `fontScale`); o layout precisa aguentar 130%.
- `letterSpacing` negativo só em tamanhos ≥ 22.
- Números que mudam ou se alinham em coluna usam algarismos tabulares.

## Espaçamento e layout

Grade de 4: `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- Padding lateral de tela: um valor só, entre 16 e 24 (`layout.screenPadding`).
- Alvo de toque mínimo: 44 pt no iOS e 48 dp no Android (`layout.touchTarget: 48`). A área de toque respeita o mínimo mesmo quando o visual é menor (hitSlop/padding).
- Ação principal na zona do polegar (metade de baixo) nas telas de tarefa.
- Em tablet, o conteúdo tem largura máxima (`layout.maxContentWidth`).

## Raio e forma

Escala: `none, sm, md, lg, xl, full`.
- Raio interno = raio externo − padding (card `lg` = 20 com padding 12 → imagem interna com raio 8).
- Botões e inputs usam o mesmo raio.
- A linguagem de forma vem da direção de arte (afiada, suave ou pílula) e vale para o app inteiro.

## Elevação

- **Claro**: poucas sombras e suaves (`sm`, `md`, `lg`). Cada nível define a versão iOS (`y`, `blur`, `opacity`) e a Android (`android`: elevation).
- **Escuro**: sombra quase não aparece, então a elevação vem da superfície mais clara (`surfaceElevated`).
- Use borda sutil **ou** sombra, não as duas no mesmo elemento.
- **Nem tudo é card.** Superfície com borda ou sombra existe para separar o que é tocável ou agrupado. Conteúdo que só informa pode morar direto no fundo, separado por espaço e tipografia. Tela com tudo dentro de card com borda é sintoma de template.

## Textura e profundidade (opcional, pela direção)

Grão sutil, gradiente, padrão geométrico ou traço do motivo desenhado em SVG dão materialidade ao app. Use quando a direção pede, em código ou como **imagem de efeito** gerada no ChatGPT ([06-prompts-imagem.md](06-prompts-imagem.md), seção 8), com intensidade baixa (o conteúdo continua legível) e com versão para o escuro. Registre no style guide onde cada textura aparece.

## Movimento

| Token | Valor | Uso |
|---|---|---|
| `duration.fast` | 120 ms | feedback de toque |
| `duration.base` | 220 ms | transição de componente |
| `duration.slow` | 360 ms | entrada de tela ou sheet |
| `easing.standard` | `[0.2, 0, 0, 1]` | movimento comum |
| `easing.decelerate` | `[0.05, 0.7, 0.1, 1]` | entradas |
| `easing.accelerate` | `[0.3, 0, 0.8, 0.15]` | saídas |
| `spring` | damping 18–22, stiffness 180–260 | gestos, sheets, arrastar |
| `stagger` | 30–50 ms | intervalo entre itens numa entrada escalonada |
| `moment` | 500–800 ms | duração dos momentos (celebração, confirmação) |
| `ambientLoop` | 8000–20000 ms | ciclo dos fundos vivos e loops lentos |

Os valores seguem a personalidade de movimento da direção. O que usa cada um (fundos, transições, scroll, celebração) está em [11-vida-e-efeitos.md](11-vida-e-efeitos.md).

Regras:
- Respeite o "reduzir movimento" do sistema.
- Animação nunca bloqueia interação.
- Nenhuma transição de UI passa de 400 ms. Exceção: os **momentos** da direção de arte, com até ~800 ms, sem bloquear. Loops de ambiente não são transição: são lentos de propósito (`ambientLoop`).
- Haptic leve nas confirmações importantes (favoritar, concluir, erro).

Coreografia (o que diferencia movimento pensado de animação solta):
- **Feedback de toque por tipo de peça**, não um `scale 0.98` igual em tudo: botão afunda, item de lista escurece, peça selecionável "acende", carta levanta.
- **Mudança de layout animada**: item que entra, sai ou muda de lugar anima a posição, sem pular.
- **Entrada escalonada** só na primeira carga de uma lista curta (poucos itens, 30 a 50 ms entre eles). Nunca em cada scroll ou refresh.
- **Valores que mudam** (preço, contador, saldo) fazem transição do número, não trocam seco.
- Cada componente de domínio tem a microinteração própria definida em `design/componentes.md`.

## Componentes

Os componentes se dividem em três camadas: **primitivas**, **chrome do app** e **componentes de domínio**. O design mora nos dois últimos. Leia [09-componentes-proprios.md](09-componentes-proprios.md) antes de criar qualquer componente.

Primitivas (construa só as que as telas usam):
- Text (variantes da escala), Icon, Pressable com feedback, Surface, Skeleton, Divider;
- Button (variantes que a direção pede, tamanhos, loading, disabled, ícone opcional) e IconButton (sempre com rótulo acessível);
- TextField (rótulo, ajuda, erro, ícone);
- **AppImage** (com placeholder).

Regras:
- Cada componente lê só tokens semânticos.
- Os estados pressionado, foco e desabilitado são definidos para todo componente interativo.
- Mesmo as primitivas seguem a direção: o Button tem a forma, o peso e o feedback de toque da linguagem do app, e não o de um Material com outra cor.
- Não crie primitiva "para o futuro". `Card`, `ListItem`, `Badge` e `Chip` genéricos só existem se alguma tela precisa deles como **apoio**, nunca como conteúdo principal de tela P1.
- Controles de sistema com comportamento complexo (seletor de data e hora, teclado, share sheet) ficam nativos. Switch e checkbox podem ser próprios se a direção pede, mantendo acessibilidade e alvo de toque.

## AppImage (spec)

- Recebe a **chave** do registro de imagens, não o caminho.
- Se a imagem existe: renderiza com `resizeMode/contentFit` cover (ou contain, se o slot pedir), usando a `cor` média do registro como fundo enquanto carrega.
- Se não existe: placeholder com a mesma proporção, fundo `placeholder`, borda tracejada `border`, ícone de imagem e, só em dev, o nome do arquivo (ex.: `hero_home.jpg · 16:9`).
- Imagem decorativa não tem rótulo de acessibilidade. Imagem informativa tem.
- **Variantes por tema**: se existir `chave_claro` / `chave_escuro` no registro, usa a do tema atual.
- **Imagens de efeito** (`efeito` no registro) não usam o AppImage: vão para o componente de efeito (ex.: `EffectLayer`), que lê `efeito`, `repetir` e `mistura` e aplica a animação do mapa de vida ([11-vida-e-efeitos.md](11-vida-e-efeitos.md)). Sem a imagem, ele cai para o efeito feito em código ou para nada, nunca para o placeholder tracejado.
