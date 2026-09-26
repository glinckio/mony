# Style guide — Mony

## Direção: Índigo Suave

Fintech leve e confiável: página lavanda, cartões brancos flutuando com sombra azulada, o gradiente azul → índigo da marca (o mesmo do logo "M") no que é principal, ícones em círculos pastel e números grandes e limpos.

**Origem:** referência visual enviada pelo usuário em 2026-09-25 (três telas de app financeiro: Home com cartão de saldo em gradiente, Transações agrupadas por dia, Orçamento com barras de progresso). Ela substitui a direção "Caderno de Contas", reprovada pelo usuário ("não gostei do design", "muitas fontes cortando"). O logo "M" (gradiente teal → azul → índigo) foi aprovado e continua.

- **Atributos:** leve, confiável, organizado.
- **Referências:**
  - a imagem do usuário: cartão de saldo em gradiente com brilho de vidro, listas em cartões brancos, abas em pílula, botão "+" central com gradiente;
  - Revolut e Nubank: números grandes e diretos;
  - o próprio logo do Mony: o gradiente azul → índigo vira a cor de marca.
- **Elemento assinatura:** o **gradiente índigo da marca** com brilho de vidro, no cartão de saldo, no botão "+" da tab bar, no botão principal e no segmento ativo.

## Linguagem visual

| Motivo             | O que é                                                                     | Onde aparece                                                                 | Como se desenha                                                           | Intensidade                     |
| ------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| Gradiente da marca | azul `#4361EE` → índigo `#6A4CF0`, diagonal                                 | botão principal, "+" da tab bar, segmento ativo, avatar, barras de progresso | `expo-linear-gradient` a partir de `gradient.brand` / `gradient.progress` | protagonista (1 herói por tela) |
| Vidro              | brilho radial branco no canto + pílulas/selos translúcidos com borda branca | cartão de saldo                                                              | SVG `RadialGradient` + `glassFill`/`glassBorder`                          | detalhe                         |
| Cartão flutuante   | branco, raio 18, sombra azulada suave, sem borda                            | listas, resumos, metas, gráfico                                              | `Card`                                                                    | estrutura                       |
| Círculo pastel     | ícone colorido sobre a mesma cor a 14%                                      | categorias, linhas de resumo, estados vazios, toasts                         | `IconBadge`                                                               | detalhe                         |
| Pílula             | tudo que é escolha ou status é arredondado por completo                     | abas, chips, status, caderno                                                 | raio `full`                                                               | detalhe                         |

## Voz

- **Tom:** direto e calmo; nunca culpa nem assusta; número primeiro.
- **Glossário:** "lançamento" (não "transação") na UI; "a pagar" (não "pendente") para despesa; "caderno Pessoal / Empresa" (não "workspace"); "quitada"; "desfazer pagamento".
- **Exemplos:**
  - Vazio: "Nenhum lançamento por aqui ainda. Toque no + para registrar o primeiro."
  - Erro de rede: "Não consegui falar com o Mony agora." + "Algo deu errado. Tente novamente."
  - Sucesso do loop: toast "Lançamento registrado." com o valor.
  - CTA principal: "Salvar lançamento" / botão "+" da tab bar.

## Momentos

| Momento                         | O que o usuário sente | Conceito visual                                                       | Movimento e haptic                           |
| ------------------------------- | --------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| Lançamento feito                | "anotado"             | toast branco com o valor e o círculo verde de sucesso                 | sobe + fade (220 ms), haptic de sucesso      |
| Conta paga                      | alívio                | a pílula muda de "A pagar" (âmbar) para "Pago" (verde) com um pulinho | escala 1,18 → 1 (spring curto), haptic médio |
| Dívida quitada / meta alcançada | vitória               | barra de progresso completa + pílula "Quitada"/"Alcançada"            | barra enche (480 ms), haptic de sucesso      |

## Vida

- **Nível:** 1 · Calmo (finanças). Formulários sem efeito; momentos com um pouco mais.
- **Fundo:** gradiente lavanda vertical fixo em todas as telas (`gradient.screen`); no topo do Início, um brilho suave (manchas lavanda/azul/teal, ciclo de 16 s) que sobe mais devagar que o conteúdo e some ao rolar. Reduzido: parado.
- **Transições:** nativas do native-stack; formulários sobem como folha; troca de aba com fade curto; a pílula do segmento ativo desliza.
- **Scroll:** a barra do topo ganha fundo branco e linha fina quando o conteúdo passa por baixo; no Início, o título aparece na barra quando a saudação sai de cena.
- **Dados vivos:** saldo conta até o valor novo; barras de progresso e do gráfico crescem da base.
- **Espera:** skeleton com brilho no formato dos cartões; loader de 3 traços dentro dos botões.

## Chrome

- **Tab bar (`AppTabBar`):** branca, cantos superiores arredondados (24) e sombra; 4 abas (Início, Lançamentos, Metas, Mais) com ícone e rótulo; ativa em índigo com ícone preenchido; no centro o "+" em círculo de gradiente (56 px) elevado. Some com o teclado.
- **Barra do topo (`TopBar`):** botões circulares brancos com sombra nas laterais (voltar, ações) e o título centralizado; fundo branco só ao rolar.
- **Início:** saudação ("Bom dia,") + nome grande em vez de título; avatar com iniciais à direita.
- **Sheets:** brancos, raio 24 no topo, alça cinza; confirmação com a miniatura do item e botões empilhados.
- **Toast:** cartão branco flutuante com círculo do tom, acima da tab bar.

**Alternativas descartadas**

- **Caderno de Contas** (papel, tinta, marca-texto, Fraunces): reprovada pelo usuário em 2026-09-25.
- **Cofre Digital** (escuro, neon): o usuário quer só tema claro.

## Paleta

| Papel                         | Cor                               | Uso                                  |
| ----------------------------- | --------------------------------- | ------------------------------------ |
| background / backgroundTop    | `#F1F2FA` / `#E3E7FF`             | página lavanda (gradiente vertical)  |
| surface                       | `#FFFFFF`                         | cartões, campos, tab bar, sheets     |
| surfaceMuted                  | `#EEF0F8`                         | trilhos, skeleton, áreas secundárias |
| border                        | `#E6E8F2`                         | divisórias finas                     |
| text / textMuted / textSubtle | `#1C1E3A` / `#5B5F76` / `#858AA3` | texto                                |
| primary                       | `#5550F0`                         | índigo: ação, aba ativa, links       |
| gradiente da marca            | `#4361EE` → `#6A4CF0`             | botão principal, "+", segmento ativo |
| gradiente do saldo            | `#4458E8` → `#6454DC`             | cartão de saldo (texto branco)       |
| accent                        | `#22B8C4`                         | teal do logo: detalhes de gráfico    |
| success                       | `#0C7F3F` (pastel `#E4F6EC`)      | receita (+), pago                    |
| warning                       | `#F59E0B` (pastel `#FFF3DC`)      | a pagar                              |
| danger                        | `#D92D20` (pastel `#FDECEC`)      | despesa (−), vencida, excluir        |

Estratégia: base clara neutra-lavanda + índigo de marca + verde/vermelho só para entrada/saída e estado (com sinal +/− junto). **Só tema claro** (decisão do usuário, 2026-09-25).

## Tipografia

- **Família única:** Manrope (400–800). Moderna, números claros, algarismos tabulares nas colunas de valor.
- **Altura de linha ≥ 1,4× o tamanho em todos os tokens**: a Manrope tem ascendentes/descendentes altos, e alturas menores cortavam o texto no Android (queixa do usuário).
- **Escala:** display 34/48 (saldo) · title1 26/37 (nome no Início) · title2 18/26 (seções) · title3 17/24 (título de barra/cartão) · body 15/22 · subhead 13/19 · footnote/caption 12/17 · numeral 15/21 e numeralLarge 20/28 (tabulares) · amountInput 36/50.

## Forma, espaço e elevação

- **Forma:** arredondada. Cartões 18, botões e campos 14, sheets e cartão de saldo 24, pílulas `full`.
- **Densidade:** arejada; padding de tela 20; cartões com 16 de padding interno; seções separadas por 24.
- **Elevação:** sombras suaves azuladas (`shadow` `#3B3FA8`, 6–14% de opacidade), sem bordas nos cartões.

## Ícones

Ionicons, contorno no normal e preenchido no ativo; dentro de círculos pastel (`IconBadge`) nas listas.

## Movimento

- **Personalidade:** suave e rápido; entradas desacelerando; springs curtos só em pílulas de status e sheets.
- **Toque:** botões afundam levemente (escala 0,97); linhas ganham fundo `surfaceMuted`; chips e segmentos respondem com haptic de seleção.

## Imagens

### Onde entra cada tipo

- **Fotos:** só a foto do veículo (do usuário).
- **Ilustrações:** estados vazios e topo das telas de entrada, em ilustração vetorial suave nas cores da marca. Enquanto não existem, o app mostra um círculo pastel grande com o ícone.

### Bloco de estilo: ilustrações

```text
Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces.
```

### Bloco de estilo: efeitos

Nenhum efeito gerado por imagem: o fundo e o brilho do topo são feitos em código.

## Plataforma

- **iOS:** formulários como folha (`presentation: "modal"`), gesto de voltar nativo.
- **Android:** edge-to-edge com insets por peça; botão voltar fecha sheet antes da tela.
