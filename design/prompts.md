# Prompts de imagem — Mony

## Como usar

1. Gere na ordem da tabela. A primeira é a **âncora** do estilo.
2. Cole o prompt inteiro no ChatGPT, no tamanho de **Gerar em**.
3. Para as demais, continue na conversa da âncora, ou abra outra e anexe a âncora com:
   > Use a imagem anexada só como referência de estilo (técnica, traço, paleta, luz). Não copie o conteúdo nem a composição.
4. Confira o **Confira ao receber**; se falhar, peça o ajuste na mesma conversa.
5. Salve em `design/img-original/` com o **nome exato**.
6. Rode `/app-design imagens`.

As imagens são opcionais: sem elas, cada estado vazio mostra um círculo pastel grande com o ícone.

## Ordem e prioridade

| #   | Arquivo                 | Onde entra                             | Gerar em                                      | Fundo        | Prioridade         |
| --- | ----------------------- | -------------------------------------- | --------------------------------------------- | ------------ | ------------------ |
| —   | `icone_simbolo.png`     | ícone do app, ícone adaptativo, splash | **não gerar** (logo "M" do cliente, aprovado) | transparente | essencial          |
| 1   | `capa_caderno.png`      | Entrar / Criar conta › topo            | 1024x1024                                     | transparente | essencial (âncora) |
| 2   | `vazio_lancamentos.png` | Lançamentos › vazio                    | 1024x1024                                     | transparente | essencial          |
| 3   | `vazio_metas.png`       | Metas › vazio                          | 1024x1024                                     | transparente | complementar       |
| 4   | `vazio_dividas.png`     | Dívidas › vazio                        | 1024x1024                                     | transparente | complementar       |
| 5   | `vazio_mercado.png`     | Mercado › vazio                        | 1024x1024                                     | transparente | complementar       |
| 6   | `vazio_veiculos.png`    | Veículos › vazio                       | 1024x1024                                     | transparente | complementar       |

## Bloco de estilo (já incluído em cada prompt)

```text
Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces.
```

---

### `capa_caderno.png` — âncora

**Onde entra:** Entrar e Criar conta, no topo (220×160 dp, encaixada inteira) · **Gerar em:** 1024x1024 · **Fundo:** transparente

```text
Illustration for the top of the sign-in screen of a personal-finance app: a rounded smartphone-free composition of a slim wallet with a glossy indigo card peeking out, three stacked coins and a small upward growth chart shape floating beside it, calm and reassuring. Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces.
```

**Confira ao receber:** fundo transparente de verdade · sem texto nem números na carteira/cartão · paleta índigo/lavanda

### `vazio_lancamentos.png`

**Onde entra:** Lançamentos › vazio (240×180 dp) · **Gerar em:** 1024x1024 · **Fundo:** transparente

```text
Illustration for the empty state of the transactions list: a clean blank receipt slip gently curling, with a round plus-sign badge floating next to it, inviting the first entry. Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces.
```

**Confira ao receber:** fundo transparente · recibo sem escrita · mesmo estilo da âncora

### `vazio_metas.png`

**Onde entra:** Metas › vazio (200×150 dp) · **Gerar em:** 1024x1024 · **Fundo:** transparente

```text
Illustration for the empty state of the savings goals screen: a glossy glass jar with a few coins inside and a small flag planted on top of a coin pile beside it. Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces.
```

**Confira ao receber:** fundo transparente · moedas sem símbolo · mesmo estilo da âncora

### `vazio_dividas.png`

**Onde entra:** Dívidas › vazio (200×150 dp) · **Gerar em:** 1024x1024 · **Fundo:** transparente

```text
Illustration for the empty state of the debts screen: a small stack of payment slips with a round green check badge on top, calm and under control. Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces.
```

**Confira ao receber:** fundo transparente · sem código de barras nem números · mesmo estilo da âncora

### `vazio_mercado.png`

**Onde entra:** Mercado › lista vazia (200×150 dp) · **Gerar em:** 1024x1024 · **Fundo:** transparente

```text
Illustration for the empty state of the grocery list: a rounded shopping basket with a few simple groceries peeking out (a leafy green, a baguette, a bottle), friendly and tidy. Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces.
```

**Confira ao receber:** fundo transparente · sem rótulos escritos · mesmo estilo da âncora

### `vazio_veiculos.png`

**Onde entra:** Veículos › vazio (220×150 dp) · **Gerar em:** 1024x1024 · **Fundo:** transparente

```text
Illustration for the empty state of the vehicles screen: a compact rounded hatchback car in three-quarter front view with a small key tag floating beside it, generic design with no brand. Soft flat vector illustration for a modern personal-finance mobile app, friendly and clean, with gentle gradients and no outlines. Palette: indigo #5550F0, periwinkle blue #4F86FF, lavender #C9CCFE, soft teal #43CFCF and white, with a single warm touch of amber #F59E0B only where it helps. Rounded, simple shapes with subtle soft shadows, a light glossy highlight like frosted glass, minimal detail. The subject is centered, whole, occupying about 60% of the canvas and not touching the edges. Transparent background (real PNG alpha channel), no floor, no scenery behind the subject. No text, no letters, no numbers, no logos, no UI elements, no frames, no people's faces. The license plate area is empty.
```

**Confira ao receber:** fundo transparente · sem logo nem placa escrita · mesmo estilo da âncora
