# Vida: animação, efeitos e fundos

Uma tela parada, mesmo com componentes bem desenhados, parece protótipo. Várias coisas fazem um app parecer vivo: o fundo que respira, o conteúdo que entra com intenção, o scroll que transforma a tela, a resposta física ao toque, a celebração no fim da tarefa.

A LLM tende a pular tudo isso porque "não é necessário". Aqui a vida é **decisão obrigatória** da direção de arte, e o padrão para app de consumidor é ter vida.

## 1. Nível de vida

Decidido na Fase 3, a partir do brief, e registrado no style guide.

| Nível | Sensação | O que entra (cumulativo) | Domínios típicos |
|---|---|---|---|
| **0 · Sóbrio** | ferramenta precisa | microinterações, animação de layout, feedback de toque e haptics | B2B denso, produtividade, utilitário |
| **1 · Calmo** | confiança, cuidado | + transições coreografadas, header que reage ao scroll, números animados, fundo com gradiente que respira devagar nas telas de entrada | finanças, saúde, igreja, imobiliário, serviços |
| **2 · Vivo** | energia com controle | + fundo ambiente nas telas de entrada e nos heróis, parallax, entradas escalonadas, celebração no fim do loop, loaders próprios, ícones da tab bar animados | delivery, e-commerce, clube, agendamento local, social, viagem |
| **3 · Expressivo / imersivo** | experiência | + fundo ambiente como parte da identidade (shader, partículas, aurora), sensor de movimento, transições cinematográficas, mascote ou ilustração animada | fitness, eventos, música, meditação (imersivo e lento), educação gamificada, infantil |

Regras:
- **Padrão: nível 2** para app de consumidor. Nível 0 só com justificativa escrita no brief.
- **Nível não é velocidade.** Meditação é nível 3 com tudo lento. Fitness é nível 3 com tudo rápido. A velocidade vem da personalidade de movimento da direção.
- O nível vale para o app, com duas variações: **telas de tarefa** (formulário, pagamento, configurações) ficam um nível abaixo, e **momentos** sobem um nível.

## 2. Camadas de vida

| Camada | O que é | Exemplos |
|---|---|---|
| **Ambiente** (fundos vivos) | o fundo tem movimento próprio, lento | gradiente em malha que se desloca, aurora de manchas desfocadas, grão animado, partículas lentas, o motivo da linguagem visual deslizando, shader, luz que acompanha o giroscópio, fundo que muda com o contexto (hora do dia, clima, estado do pedido) |
| **Transição de tela** | a troca de tela conta uma história | a peça tocada vira a tela seguinte; entrada coreografada (herói primeiro, detalhes depois); sheet que recua o fundo; troca de aba com deslize curto |
| **Scroll** | rolar transforma a tela | header grande que vira compacto; herói com parallax e zoom ao puxar para baixo; fade ou blur nas bordas; itens que entram quando aparecem; sticky que muda de estado |
| **Toque e gesto** | resposta física | spring ao soltar, arrastar com inércia, deslizar item para revelar ação, pressionar e segurar para prévia, pull-to-refresh com o motivo |
| **Dados vivos** | o valor tem movimento | número que conta até o valor, gráfico que se desenha, progresso que enche, selo "ao vivo" pulsando, badge que chega com um salto |
| **Espera** | esperar não parece travado | skeleton com brilho na cor do tema, loader próprio com o motivo, texto de espera que avança ("Confirmando com a quadra…", "Quase lá…") |
| **Celebração e erro** | o fim da tarefa tem peso | confete ou partículas no fim do loop, check que se desenha, carimbo, haptic de sucesso; erro com tremida curta e haptic de erro |
| **Ilustração e ícone animados** | a imagem tem vida | ícone da tab bar que se transforma ao selecionar, estado vazio com ilustração que se mexe devagar, onboarding animado, mascote |

## 3. Mapa de vida

Registre no style guide (seção "Vida") o nível, os efeitos do app e onde cada um aparece. Registre também na spec de cada tela (campo "Vida") as camadas presentes naquela tela.

**Orçamento por tela:**
- no máximo **1 efeito ambiente** visível;
- no máximo **1 outro loop contínuo** (ex.: pulso "ao vivo");
- todo o resto é **reativo**: acontece por causa de uma ação, do scroll ou da chegada de dados;
- o efeito ambiente nunca fica atrás de conteúdo denso (lista longa, formulário). Ele mora no herói, no topo que some ao rolar, nas telas de entrada, nos vazios e na confirmação.

Onde a vida costuma morar:

| Tipo de tela | O que combina |
|---|---|
| Boas-vindas, onboarding, login | ambiente forte, entrada coreografada, ilustração animada |
| Home | ambiente no topo/herói que some ao rolar, dados vivos, entrada escalonada só na primeira carga |
| Lista, busca | calma: layout animado ao filtrar, skeleton, itens que entram ao aparecer |
| Detalhe | continuidade vinda da lista, parallax no herói, header que muda ao rolar |
| Formulário, checkout | calma: foco animado, validação que aparece com suavidade, botão que vira loader |
| Confirmação, sucesso | **momento**: celebração + ambiente |
| Vazio, erro, offline | ilustração animada leve, texto na voz do app |
| Perfil, configurações | sóbrio; conquistas e números animados, se houver |

## 4. Fundos vivos: como fazer

Prefira **código**, sozinho ou animando **imagens de efeito do ChatGPT**, a vídeo ou GIF. Assim o fundo acompanha o tema claro/escuro, pesa pouco, fica nítido em qualquer tela e respeita "reduzir movimento".

Técnicas, da mais barata para a mais cara:
1. **Gradiente que respira**: 2 ou 3 cores dos tokens, com posição ou ângulo mudando devagar. No iOS 18+, `MeshGradient`.
2. **Aurora**: 2 a 4 manchas grandes se deslocando devagar. **Truque de desempenho**: gradientes radiais que vão até o transparente parecem blur e custam quase nada. Blur de verdade só onde o aparelho aguenta.
3. **Motivo em movimento**: o padrão da linguagem visual (linhas, grade, pontos, picote) deslizando devagar ou reagindo ao scroll.
4. **Partículas**: poucas (até ~40), grandes e lentas, desenhadas num canvas.
5. **Shader** (ruído, ondas, aurora em GLSL/SkSL/AGSL/Metal): o mais marcante e o mais caro. Só no nível 3 ou quando é o elemento assinatura, sempre com versão estática.
6. **Imagem de efeito do ChatGPT + movimento em código**: wallpaper pintado, camadas de parallax, luz sobre preto, textura que repete e peças de partícula ([06-prompts-imagem.md](06-prompts-imagem.md), seção 8). A imagem traz a riqueza orgânica, e o código traz o movimento e o tema. Veja a tabela abaixo.
7. **Vídeo em loop**: último recurso (peso, bateria, não acompanha o tema). Só quando o conteúdo já é vídeo (eventos, música), curto, mudo, comprimido e com imagem de capa.

Como o código anima cada imagem de efeito:

| Tipo | Animação típica | Detalhe de implementação |
|---|---|---|
| `fundo` | deriva e zoom lentos (1,0 → 1,08 em 15 a 20 s, vai e volta), parallax com scroll ou giroscópio, véu de cor que respira, troca suave entre `_claro`/`_escuro` ou entre variações | a imagem é maior que a tela (a margem de 10% do prompt existe para isso) |
| `camada` | cada camada desloca numa velocidade (distante 0,2×, meio 0,5×, perto 1×) com scroll, giroscópio ou tempo | camadas empilhadas, a de trás opaca |
| `luz` | opacidade pulsando devagar, deslocamento ou rotação lenta (feixe varrendo), acender ao entrar na tela | o script já deixa o PNG transparente. O modo tela (`mistura: tela`) intensifica onde a stack permite |
| `textura` | parada sobre a superfície (opacidade 4 a 12%); grão de filme "tremendo" (desloca o tile a cada ~80 ms) | desenhada repetida (tile) |
| `peca` | sistema de partículas: 10 a 40 cópias com caminho, rotação, escala e atraso determinísticos | versão reduzida: menos peças ou estático |

Repetir (tile) e modo tela por stack:

| Stack | Textura repetida | Modo tela (screen) |
|---|---|---|
| Expo / RN | `Image` com `resizeMode="repeat"`, ou `ImageShader` com `tx`/`ty="repeat"` no Skia | `mixBlendMode: 'screen'` no estilo (Nova Arquitetura) ou `blendMode="screen"` no Skia |
| Flutter | `DecorationImage(repeat: ImageRepeat.repeat)` | `CustomPainter` com `Paint()..blendMode = BlendMode.screen` |
| SwiftUI | `Image(...).resizable(resizingMode: .tile)` | `.blendMode(.screen)` |
| Compose | `ShaderBrush(ImageShader(img, TileMode.Repeated, TileMode.Repeated))` | `drawImage(..., blendMode = BlendMode.Screen)` no `Canvas` |
| Ionic / web | `background-repeat` | `mix-blend-mode: screen` |

Regras:
- **Loop lento**: 8 a 20 s por ciclo, movimento amplo e suave, contraste baixo. Se o olho vai para o fundo, ele está forte demais.
- **Texto sobre fundo animado**: meça o contraste contra o **pior quadro** (a cor mais próxima do texto que o fundo atinge). Adicione esses pares em `contrastChecks` no `tokens.json`. Use véu (`overlay`) sob o texto quando precisar.
- Atrás de campos de formulário, o fundo desacelera ou para.
- **Fundo que entende o contexto** (bônus que dá muita vida): manhã/noite, estado do pedido, meta quase batida. Só quando o dado existe (mesmo que mock).

## 5. Ilustração animada (Lottie / Rive)

- O que é geométrico se desenha em **código**: check, carimbo, pulso, loader, confete, motivo.
- Ilustração com personagem ou cena vira **Lottie** (JSON) ou **Rive** (interativa, com estados). O ChatGPT não gera esses arquivos. Há três caminhos:
  1. desenho em código (SVG animado) no estilo da linguagem visual;
  2. arquivo livre (LottieFiles, comunidade do Rive), conferindo a licença e se dá para trocar as cores pelos tokens;
  3. pedido ao usuário ou a um ilustrador: registre em "Animações pendentes" no `brief.md`, com o slot e a versão estática que fica no lugar enquanto isso.
- **O app funciona sem a animação**: primeiro a versão estática, depois a animada por cima.

## 6. Desempenho

Vida que trava é pior que nenhuma vida.
- A animação roda na thread de UI ou na GPU: worklets do Reanimated, Skia, Core Animation, `graphicsLayer` do Compose. Nunca anime com `setState` em loop (RN) ou reconstruindo a árvore inteira (Flutter).
- Anime `transform` e `opacity`. Não anime largura, altura ou posição de layout em loop.
- **Pause** o que está fora da tela, em tela sem foco (outra aba, tela coberta) e com o app em segundo plano.
- Blur em tempo real e shaders pesam no Android de entrada. Tenha a versão barata (gradiente radial no lugar do blur, imagem estática no lugar do shader) e use-a abaixo de um limite (ex.: Android < 12 não tem blur de view) ou com a flag de efeitos reduzidos.
- **Meça**: monitor de desempenho do menu de dev (RN), `showPerformanceOverlay` ou DevTools (Flutter), "Profile HWUI rendering" (Android), Instruments (iOS). Meta: 60 fps, sem queda ao rolar com o efeito ativo.

## 7. Acessibilidade

- **Reduzir movimento**: o ambiente vira estático (num quadro bonito, não vazio), parallax e zoom desligam, entradas viram fade curto ou nada, a celebração vira check estático + haptic. Loaders continuam, só que simples.
- Crie **um hook ou serviço único de movimento** (ex.: `useMotion()`) que junta a preferência do sistema com o override do DesignLab. Todos os efeitos leem dele.
- Nada pisca mais de 3 vezes por segundo.
- Evite parallax forte e movimento grande de "câmera" (gatilho vestibular).
- Efeito é decorativo: o leitor de tela ignora. O movimento nunca é a única forma de informar algo.

## 8. Por stack

Confira a documentação da versão do projeto antes de usar (APIs de animação mudam rápido).

| Stack | Transição e layout | Scroll | Ambiente e efeitos | Ilustração animada | Sensores |
|---|---|---|---|---|---|
| **Expo / RN** | Reanimated 4: `entering`/`exiting`, `layout={LinearTransition}`, animações e transições em estilo CSS, `withSpring`; `animation` do Stack. Shared element do Reanimated é experimental (feature flag): prefira fade/escala coordenados | `useAnimatedScrollHandler` + `interpolate` | `@shopify/react-native-skia` (`Canvas`, gradientes, `Blur`, shaders `RuntimeEffect` animados com `useClock`), `expo-linear-gradient`. Na web, o Skia precisa do CanvasKit (setup web da lib) | `lottie-react-native`, ou Skottie do Skia (troca cores pelos tokens); `rive-react-native` (development build) | `expo-sensors` (`DeviceMotion`) |
| **Flutter** | implícitas (`AnimatedContainer`, `AnimatedSwitcher`), `Hero`, `flutter_animate` | `SliverAppBar`, `SliverPersistentHeader`, `ScrollController` + `Transform` | `CustomPainter` + `AnimationController`, shaders `FragmentProgram` (`.frag` declarados em `pubspec.yaml`) | `lottie`, `rive` | `sensors_plus` |
| **SwiftUI** | `withAnimation`, `.transition`, `matchedGeometryEffect`, `.navigationTransition(.zoom)` (iOS 18), `PhaseAnimator`/`KeyframeAnimator` | `.scrollTransition`, `.visualEffect`, `onScrollGeometryChange` (iOS 18) | `TimelineView(.animation)` + `Canvas`, `MeshGradient` (iOS 18), shaders Metal `.colorEffect`/`.distortionEffect`/`.layerEffect` (iOS 17) | `lottie-ios`, `RiveRuntime`, `.symbolEffect` nos SF Symbols | Core Motion |
| **Compose** | `AnimatedVisibility`, `AnimatedContent`, `animate*AsState`, `SharedTransitionLayout` | `LazyListState`/`nestedScroll` + `graphicsLayer` | `rememberInfiniteTransition` + `Canvas`/`drawBehind`, `RuntimeShader` AGSL (Android 13+, com fallback), `Modifier.blur` (Android 12+) | `lottie-compose`, `rive-android` | `SensorManager` |
| **Ionic / web** | CSS transitions/`@keyframes`, Web Animations API | `IntersectionObserver`, scroll-driven animations do CSS | `canvas`, WebGL, gradientes CSS animados | `lottie-web` | `DeviceOrientationEvent` |
| **.NET MAUI** | `FadeTo`, `TranslateTo`, `ScaleTo`, `Animation` | `Scrolled` + transformações | SkiaSharp (`SKCanvasView`) | `SkiaSharp.Extended` (Lottie) | `Accelerometer` / `OrientationSensor` |

## 9. Revisão do movimento

Um print não mostra movimento. Na revisão visual ([10-revisao-visual.md](10-revisao-visual.md)):
- **Sequência de quadros**: 3 ou 4 prints com 300 a 500 ms de intervalo durante a transição ou o efeito. Eles confirmam que anima, que o texto se lê no pior quadro e que tudo termina no lugar certo.
- **Reduzir movimento**: alterne o DesignLab para "reduzido" e confira que cada efeito tem a versão estática.
- **Desempenho**: role a tela com o efeito ativo e o monitor de fps ligado.
- **Sensação**: movimento se julga sentindo. No checkpoint visual da tela-chave, peça ao usuário para interagir (no painel de navegador ou no aparelho) e comentar ritmo e intensidade ("forte demais", "lento", "quero mais"). Use a resposta para calibrar as outras telas e registre em "Decisões".
