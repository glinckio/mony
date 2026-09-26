# Prompts de imagem para o ChatGPT

O usuário gera as imagens no ChatGPT. Seu trabalho é escrever prompts que produzam imagens que **encaixam no slot sem retrabalho** e que **parecem da mesma família**.

## 1. Tamanhos que o ChatGPT gera

`1024x1024` (quadrado) · `1536x1024` (paisagem 3:2) · `1024x1536` (retrato 2:3)

Gere no tamanho mais próximo da proporção final e diga no prompt o quanto será cortado. O script recorta para a proporção exata.

| Proporção final do slot | Gerar em | O que o recorte tira |
|---|---|---|
| 1:1 | 1024x1024 | nada |
| 2:3 | 1024x1536 | nada |
| 3:4 | 1024x1536 | 5,6% em cima e embaixo |
| 4:5 | 1024x1536 | 8,3% em cima e embaixo |
| 9:16 | 1024x1536 | 7,8% em cada lateral |
| tela cheia (≈ 9:19,5) | 1024x1536 | 15,4% em cada lateral (e a resolução fica baixa para @3x) |
| 3:2 | 1536x1024 | nada |
| 4:3 | 1536x1024 | 5,6% em cada lateral |
| 5:4 | 1536x1024 | 8,3% em cada lateral |
| 16:9 | 1536x1024 | 7,8% em cima e embaixo |
| 2:1 | 1536x1024 | 12,5% em cima e embaixo |

Evite **foto** em tela cheia: o ChatGPT não entrega resolução para @3x. Se for inevitável, use a imagem sob véu, blur ou gradiente, ou troque por gradiente/forma feita em código. **Efeito suave** em tela cheia (wallpaper abstrato, luz, névoa) funciona bem: sem detalhe fino, a falta de resolução não aparece (seção 8).

## 2. Tipos de imagem de um app

| Tipo | Arquivo (exemplo) | Gerar em | Fundo | Regras |
|---|---|---|---|---|
| Ícone do app | `icone_app.png` | 1024x1024 | opaco, preenche tudo | sem cantos arredondados (o sistema aplica a máscara), sem borda, sem texto; símbolo simples, legível em 29 px, ocupando ~60% do centro |
| Símbolo | `icone_simbolo.png` | 1024x1024 | transparente | só o símbolo do ícone, centralizado. Vira o foreground adaptativo do Android, o ícone monocromático e a imagem da splash |
| Splash | — | — | — | **não gere imagem cheia**: splash = símbolo sobre a cor sólida dos tokens (padrão do Android 12+ e do iOS) |
| Onboarding | `onboarding_1.png` … | 1024x1536 ou 1024x1024 | transparente | conjunto: mesma técnica, paleta e escala de personagem |
| Estado vazio / erro / sucesso | `vazio_favoritos.png` | 1024x1024 | transparente | ilustração simples, sem cenário complexo; aparece com ~40% da largura da tela |
| Hero / banner | `hero_home.png` | 1536x1024 | opaco | zona livre para o texto definida no prompt |
| Capa de categoria / card | `categoria_massas.png` | 1024x1024 ou 1536x1024 | opaco | sujeito único, legível em tamanho pequeno |
| Conteúdo mock | `mock_prato_1.png` | 1024x1024 | opaco | marcado como MOCK no prompts.md: substituir por conteúdo real |
| Avatar mock | `mock_avatar_1.png` | 1024x1024 | opaco | rosto centralizado, pessoa fictícia |
| Efeitos: wallpaper, camadas, luz, textura, peças de partícula | `fundo_home.png`, `luz_refletor.png`, `textura_giz.png`, `peca_confete_1.png` | ver seção 8 | depende do tipo | matéria-prima que o código anima (seção 8) |
| Feature graphic Play Store (opcional) | `loja_destaque.png` | 1536x1024 | opaco | recorte final 1024x500 |

**Nunca gere**: ícones de interface (vêm da biblioteca), texto, botões, telas de app, mockup de celular, logotipo com letras (se o cliente tem logo, ele fornece o arquivo).

**Quantidade**: de 10 a 20 prompts, priorizados em **essencial**, **complementar** e **opcional**. Imagens de conteúdo mock são poucas e reaproveitadas entre vários itens. Efeitos contam à parte (normalmente 2 a 6), só os que o mapa de vida pede.

## 3. Estrutura de um prompt

Nesta ordem:
1. **Tipo e técnica**: "Ilustração vetorial flat para tela de onboarding de app mobile", "Fotografia editorial para o topo da tela inicial...".
2. **Assunto e ação**: concreto. Quem, o quê, onde, fazendo o quê.
3. **Composição para o slot**: proporção final, posição do sujeito, zona livre para texto/UI (e com que cor ela fica), quanto será cortado em cada borda.
4. **Bloco de estilo**: colado **igual** ao do `style-guide.md`, em todos os prompts.
5. **Fundo**: transparente (PNG com canal alfa), cor sólida (nome + hex) ou cenário.
6. **Restrições (fixas)**: "Sem texto, letras, números, logotipos, marca d'água, moldura, bordas ou mockup de celular."

### Cores
O modelo não respeita hex com precisão. Escreva sempre **nome + hex** ("azul-petróleo profundo #0B4F6C") e diga qual cor domina e onde entra o acento.

### Transparência
- Imagens transparentes: o sujeito aparece **inteiro, centralizado, sem encostar nas bordas**. O script apara a sobra e posiciona. Zonas de texto não importam aqui, porque quem posiciona é o código.
- Peça explicitamente: "fundo transparente (PNG com canal alfa), sem sombra no chão, sem cenário atrás".
- Se vier fundo branco ou um xadrez desenhado, o usuário pede de novo na mesma conversa: "o fundo precisa ser transparente de verdade, não branco nem xadrez". Último recurso: remover o fundo no remove.bg, no Canva ou no Photoshop.

### Imagens opacas com texto por cima
Defina a zona livre e a luminosidade dela: "o terço esquerdo fica escuro e desfocado, sem detalhes (o app sobrepõe o título ali, em texto claro)". O código ainda aplica o token `overlay` quando precisar.

## 4. Consistência do conjunto

- Gere primeiro a **âncora**: a imagem mais representativa do estilo (normalmente o primeiro onboarding ou o hero).
- Para as outras do mesmo conjunto, continue na mesma conversa da âncora, ou abra uma conversa nova e anexe a âncora com a frase: "Use a imagem anexada só como referência de estilo (técnica, traço, paleta, luz). Não copie o conteúdo nem a composição."
- Ícone e símbolo: conversa própria. Primeiro o `icone_app.png`; depois, na mesma conversa: "Agora só o símbolo, sem o fundo, em PNG transparente".
- Fotos de conteúdo mock: uma conversa por foto, para evitar repetição.

## 5. Exemplos

**Ilustração transparente (onboarding)**
```text
Ilustração vetorial flat para tela de onboarding de app mobile. Cena: uma mulher jovem, negra, de tranças, sentada num banco de praça olhando o celular com um sorriso tranquilo; um cachorro caramelo deitado aos pés dela. Personagens inteiros, centralizados, sem encostar nas bordas. {BLOCO DE ESTILO}. Fundo transparente (PNG com canal alfa), sem sombra no chão, sem cenário atrás dos personagens. Sem texto, letras, números, logotipos, marca d'água, moldura, bordas ou mockup de celular.
```

**Foto opaca com zona de texto (hero 16:9)**
```text
Fotografia editorial para o topo da tela inicial de um app de delivery. Tigela de ramen fumegante vista em ângulo de 45 graus, hashis apoiados na borda, sobre mesa de madeira escura. Composição horizontal para recorte final 16:9: a tigela ocupa o terço direito; o terço esquerdo fica escuro e desfocado, sem detalhes (o app sobrepõe o título ali, em texto claro). Cerca de 8% da imagem será cortada em cima e embaixo: mantenha a tigela inteira longe dessas bordas. {BLOCO DE ESTILO}. Sem texto, letras, números, logotipos, marca d'água, moldura, bordas ou mockup de celular.
```

**Ícone**
```text
Ícone de aplicativo mobile para {app/assunto}. Um símbolo único e simples: {descrição do símbolo}, centralizado, ocupando cerca de 60% da área, legível mesmo em tamanho muito pequeno. Fundo {cor + hex} preenchendo o quadrado inteiro até as bordas. Formas {geométricas/orgânicas} com {sombreamento}. Sem cantos arredondados, sem borda, sem sombra externa, sem brilho de vidro, sem texto, letras ou números. Quadrado 1024x1024.
```

## 6. Formato do `design/prompts.md`

Siga [../templates/prompts.md](../templates/prompts.md). Cada imagem tem:
- **Arquivo** (nome exato), **onde entra**, **gerar em**, **fundo** e **proporção final**;
- **Prompt** num bloco de código `text`, pronto para copiar;
- **Confira ao receber**: 2 ou 3 critérios objetivos para o usuário checar antes de salvar (ex.: "terço esquerdo escuro e limpo", "fundo transparente de verdade", "sem texto").

Tabela de ordem e prioridade no topo, indicando as âncoras.

## 7. `design/assets.json`

Um registro por arquivo gerado. É ele que o script usa para recortar e integrar. Template com exemplos: [../templates/assets.json](../templates/assets.json).

Configuração geral:

| Campo | Valor |
|---|---|
| `stack` | `expo`, `react-native`, `flutter`, `ios`, `android` ou `unico` (define o formato das densidades) |
| `origem` | `design/img-original` |
| `destino` | pasta de assets da stack (`assets/images`, `ios/App/Assets.xcassets`, `app/src/main/res`) |
| `larguraTela` / `alturaTela` | tela de referência para `"tela"` (padrão 430 × 932) |
| `fundo` | cor para achatar imagens opacas (use o `background` claro dos tokens) |
| `registro` | `{"arquivo": "src/design/images.ts", "linguagem": "ts"}` (ts, js ou dart) ou `null` |

Por imagem:

| Campo | Obrigatório | Valor |
|---|---|---|
| `arquivo` | sim | nome que o usuário salva em `origem`. **Sempre `.png`** (é o que o ChatGPT baixa); o formato de saída vem de `formato` |
| `nome` | não | nome da saída (padrão: o nome do `arquivo`). Permite gerar variantes do mesmo original (ex.: `adaptive-icon` e `splash-icon` a partir de `icone_simbolo.png`) |
| `exibicao` | sim* | `{"largura": 320, "altura": 400}`, `{"largura": "tela", "proporcao": "16:9"}` ou `{"largura": "tela", "altura": "tela"}`, em dp/pt |
| `ajuste` | não | `cobrir` (padrão: recorta para preencher) ou `conter` (encaixa inteira) |
| `foco` | não | `centro` (padrão), `topo`, `base`, `esquerda`, `direita`, `topo-esquerda`... ou `[x, y]` de 0 a 1 |
| `aparar` | não | `true` corta a sobra transparente antes de encaixar |
| `margem` | não | 0 a 0.45, fração de respiro em cada lado (só com `conter`) |
| `transparente` | sim | `true`/`false`. Imagem opaca com canal alfa é achatada sobre `fundo` |
| `formato` | não | `png`, `jpg` ou `webp` (padrão: png se transparente, jpg se opaca) |
| `qualidade` | não | 1 a 100 (padrão 85) para jpg/webp |
| `quantizar` | não | `true` reduz o png para 256 cores (bom para ilustração flat) |
| `destino`, `densidades` | não | sobrescrevem a configuração geral (ex.: ícone com `"densidades": [1]`). Padrão: `[1, 2, 3]`; Android `[1, 1.5, 2, 3]` |
| `ampliar` | não | `true` permite ampliar até o tamanho pedido. Só para ícone e splash, que precisam ter exatamente 1024 px. O padrão nunca amplia: entrega a maior resolução disponível e avisa |
| `registro` | não | `false` tira do registro de imagens (ícones, splash) |
| `processar` | não | `false` só confere se o arquivo existe |
| `status` | sim | `pendente` → `aprovada` / `reprovada` → `integrado` |
| `efeito` | não | imagem de efeito: `"luz"`, `"textura"`... ou objeto com `tipo`, `luz_para_alfa`, `preto`, `repetir`, `suave`, `mistura` (seção 8.3) |
| `slot`, `tipo`, `conjunto`, `prioridade`, `gerar` | não | documentação (o script mostra no relatório) |

\* Não é obrigatório quando `processar` é `false`.

WebP só se a stack suportar bem (Flutter, Android nativo, Expo com `expo-image`). Na dúvida, png/jpg.

## 8. Imagens de efeito

O ChatGPT não serve só para pessoas e objetos. Wallpapers, texturas, luzes, brilhos e peças soltas geradas por ele trazem uma riqueza orgânica (pincelada, grão, névoa, luz) que o código sozinho não alcança. A imagem é a **matéria-prima**. O **movimento vem do código** ([11-vida-e-efeitos.md](11-vida-e-efeitos.md)).

**Imagem ou código?**
- Código: o geométrico e paramétrico (gradiente simples, linhas, pontos, confete geométrico, pulso).
- Imagem: o orgânico e rico (aurora pintada, bokeh, feixe de luz com névoa, concreto, papel, areia, fumaça, aquarela).
- O melhor costuma ser **os dois juntos**: gradiente do código embaixo e textura ou luz da imagem por cima.

Só gere efeito que o mapa de vida do style guide pede (proporção, não excesso).

### 8.1 Tipos

| `efeito.tipo` | O que é | Gerar em | Fundo pedido | Como o código usa |
|---|---|---|---|---|
| `fundo` | wallpaper de tela ou herói: aurora, mesh, abstrato pintado, cena sem sujeito | 1024x1536 | opaco | deriva e zoom lentos, parallax com scroll ou giroscópio, véu de cor que respira, troca suave entre variações |
| `camada` | camadas de profundidade de uma cena (distante, meio, perto): `fundo_home_1`, `_2`, `_3` | 1024x1536 cada | 1ª opaca, as outras transparentes | parallax: cada camada numa velocidade |
| `luz` | brilho, feixe, bokeh, reflexo, névoa iluminada, partículas de luz | 1024x1536 ou 1024x1024 | **preto puro #000000** | o script transforma o preto em transparência; o código pulsa a opacidade, desloca, gira devagar ou mistura em modo tela |
| `textura` | grão, papel, concreto, tecido, areia, giz | 1024x1024 | opaco | repetida (tile) sobre superfícies com opacidade baixa; o grão pode "tremer" trocando o deslocamento |
| `peca` | elemento solto para partículas: confete, folha, faísca, bolha, estrela | 1024x1024, **um elemento por arquivo** | transparente | várias cópias pequenas, com caminho, rotação e escala diferentes |

### 8.2 Como escrever o prompt

Mesma estrutura da seção 3, com estas diferenças:
1. **Tipo e técnica**: "Wallpaper abstrato pintado digitalmente para o fundo de tela de app mobile", "Efeito de luz isolado para animar sobre a interface", "Textura contínua (seamless tileable)".
2. **O efeito parado no meio do movimento**: "manchas de luz se espalhando da direita para a esquerda", "feixe diagonal vindo de cima". Ajuda o código a animar no sentido certo.
3. **Composição**:
   - zona calma onde fica o conteúdo ("metade de baixo mais escura e lisa, onde fica a lista");
   - **~10% livre em todas as bordas** (o código desloca e amplia a imagem);
   - sem ponto focal forte: fundo não compete com o conteúdo.
4. **Bloco de estilo de efeitos** do style guide (paleta com nome + hex, qualidade da luz, grão, suavidade), igual em todos.
5. **Fundo**, conforme o tipo:
   - luz: "sobre fundo preto puro #000000, sem nenhum outro elemento";
   - peça: transparente;
   - textura: "padrão contínuo que se repete sem emenda nas quatro bordas (seamless tileable), iluminação plana, sem elemento que chame atenção sozinho".
6. **Restrições fixas** da seção 3, e, quando for abstrato: "sem objetos reconhecíveis, sem pessoas".

**Claro e escuro**: um `fundo` é pensado para um tema. Para o outro, peça na mesma conversa "mesma composição, versão clara com base {nome + hex}" e salve com o sufixo `_claro` / `_escuro`. O componente escolhe pelo tema. Luz e textura costumam servir aos dois temas: o código só muda a opacidade.

**Luz (sobre preto)**
```text
Efeito de luz isolado para animar sobre a interface de um app mobile: feixe largo de refletor de estádio entrando pelo canto superior direito em diagonal, com névoa leve iluminada e pequenas partículas de poeira brilhando dentro do feixe. Luz branca levemente quente com borda amarelo-bola #DAF15A. Sobre fundo preto puro #000000, sem nenhum outro elemento, sem chão, sem a estrutura do refletor. Deixe cerca de 10% livre em todas as bordas. Sem texto, letras, números, logotipos, marca d'água ou moldura.
```

**Fundo (wallpaper)**
```text
Wallpaper abstrato pintado digitalmente para o fundo da tela inicial de um app de reserva de quadras, formato vertical 2:3. Manchas amplas e suaves de verde-tinta #172017 e verde-quadra #3F5A2E se misturando, como luz de fim de tarde refletida numa quadra, com um brilho difuso amarelo-bola #DAF15A no terço superior, espalhando-se da direita para a esquerda. A metade de baixo é mais escura e lisa (o app coloca a lista ali). Sem ponto focal forte, sem objetos reconhecíveis, sem pessoas. Grão de filme sutil. Nada importante a menos de 10% das bordas. Sem texto, letras, números, logotipos, marca d'água ou moldura.
```

**Textura**
```text
Textura contínua de piso de quadra de cimento com poeira de giz, vista de cima, para repetir como padrão no fundo de um app mobile. Verde-quadra #3F5A2E uniforme, com variação sutil de grão e poeira clara #F6F7F1. Padrão que se repete sem emenda nas quatro bordas (seamless tileable), iluminação plana e uniforme, sem sombras direcionais, sem manchas ou elementos que chamem atenção sozinhos. Quadrado 1024x1024. Sem texto, letras, números, logotipos ou moldura.
```

**Confira ao receber** (efeitos):
- luz: fundo preto de verdade, sem chão nem objeto;
- fundo: zona calma respeitada, bordas sem nada importante, nenhum sujeito;
- textura: sem mancha que denuncie a repetição (o script confere a emenda das bordas);
- peça: um elemento só, inteiro, transparente.

### 8.3 No `assets.json`

Campo `efeito` na entrada da imagem: um atalho (`"efeito": "luz"`) ou um objeto:

| Campo | Padrão | O que faz |
|---|---|---|
| `tipo` | — | `fundo`, `camada`, `luz`, `textura` ou `peca` |
| `luz_para_alfa` | `true` em luz | converte o preto em transparência (o brilho vira alfa e a cor é preservada): a luz funciona sobre qualquer fundo, mesmo onde a stack não tem modo de mistura |
| `preto` | `12` | nível (0 a 255) até onde o fundo vira transparente total; limpa o "quase preto" que o ChatGPT entrega |
| `repetir` | `true` em textura | marca como tile no registro e confere a emenda das bordas. Use `exibicao` com a mesma proporção da imagem (o tamanho do ladrilho em dp, ex.: 256×256) |
| `suave` | `true` em luz | efeito sem detalhe fino: não avisa falta de resolução e não amplia (o app amplia sem perda visível). Use também em `fundo` abstrato |
| `mistura` | `tela` em luz, `normal` nos outros | como o código compõe a imagem: `normal` ou `tela` (screen) |

O registro de imagens (`images.ts` / `app_images.dart`) ganha `efeito`, `repetir` e `mistura`, e o componente de efeito lê daí como desenhar.

**Peso**: luz e fundo com transparência pesam. Prefira `"formato": "webp"` quando a stack exibe webp com alfa (ver a nota acima).
