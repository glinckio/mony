# Bordas da tela e teclado

Três coisas invadem o layout no celular:
- o sistema em cima: status bar, notch, ilha;
- o sistema embaixo: indicador de home, barra de gestos ou de navegação do Android;
- o teclado.

Ignorar isso deixa conteúdo cortado e botão atrás do teclado. Aplicar área segura em tudo deixa faixas mortas, herói que não chega na borda e app sem imersão. O designer decide **por tela**.

**Princípio: o fundo sangra, o toque se protege.** Cor, imagem, efeito e mapa podem ir até todas as bordas. Texto de leitura e tudo o que é tocável respeitam a área segura. A imersão é do conteúdo visual, nunca dos controles.

## 1. Modos de borda

Decididos na composição de cada tela e registrados na spec (campo "Bordas"). Não existe modo padrão: é uma decisão.

| Modo | O que vai até a borda | O que respeita a área segura | Quando | Exemplos |
|---|---|---|---|---|
| **Contida** | só a cor de fundo (e o fundo da tab bar e do CTA fixo) | todo o conteúdo | telas de tarefa e leitura: listas, formulários, checkout, configurações | Pagamento, Perfil, Configurações |
| **Herói sangrando** | a imagem, o efeito, o mapa ou a cor do topo, por trás da status bar e da ilha | título, botões (voltar, compartilhar) e todo o resto da tela | detalhe com foto, perfil com capa, confirmação com efeito, home com fundo vivo | Quadra, Reserva confirmada |
| **Imersiva** | o conteúdo inteiro, nas 4 bordas | só os controles, longe das bordas e das áreas de gesto; podem sumir e voltar com um toque | quando o conteúdo é a experiência: foto e vídeo em tela cheia, câmera, scanner, mapa, onboarding ilustrado, stories, player, modo cozinha ou leitura, jogo | galeria, leitor de QR, player |

Regras:
- **Status bar** combina com o que está atrás dela naquele momento. No herói sangrando, ela muda de estilo quando o header ganha fundo ao rolar. Imagem clara e irregular atrás dela ganha um véu sutil (gradiente do `overlay`) no topo.
- Esconder a status bar só na imersiva de conteúdo (vídeo, galeria, câmera), nunca em tela com tarefa.
- **Nunca** faixa de cor diferente acima do herói. Esse é o erro de envolver a tela inteira com área segura.
- **Nunca** botão, texto ou campo atrás da ilha, da status bar, do indicador de home ou da barra de navegação do Android.
- **Borda de baixo**:
  - listas rolam até a borda física e passam **por baixo** da tab bar e do indicador de home;
  - o padding inferior da lista é a altura da barra + o inset inferior, para o último item ser alcançável;
  - tab bar, CTA fixo e sheets têm o fundo até a borda e o padding interno igual ao inset inferior.
- **Laterais**: em paisagem, a ilha vira inset lateral, e o conteúdo respeita esquerda e direita (vídeo pode ignorar).
- **Áreas de gesto**: nada importante colado nas bordas laterais (gesto de voltar) nem na borda de baixo (gesto de home).
- **Android**: edge-to-edge é o padrão atual (obrigatório com targetSdk 35 / Android 15). As barras do sistema ficam por cima do app, e sem os insets o conteúdo vai para baixo delas. `statusBarTranslucent` e `statusBarBackgroundColor` estão obsoletos.

## 2. Teclado

Toda tela ou sheet com campo de texto tem o **comportamento do teclado desenhado** na spec: o que sobe, o que continua visível, o que some.

Com o teclado aberto, o usuário continua vendo o **campo focado** (com rótulo e erro) e a **próxima ação** (o CTA ou o "próximo").

| Situação | Comportamento |
|---|---|
| Formulário com vários campos | o scroll acompanha o foco; "próximo/anterior" entre campos e "concluir" no último; o CTA gruda em cima do teclado ou fica no fim do formulário |
| Campo no rodapé (chat, comentário, busca embaixo) | a barra do campo gruda no teclado e sobe com a mesma curva; a lista de cima encolhe e mantém a última mensagem visível |
| Busca no topo | nada sobe; a lista ganha padding inferior igual à altura do teclado |
| Sheet com campo | o sheet inteiro sobe com o teclado |
| Tela de um campo (código, valor, OTP) | pensada para a metade de cima: campo e CTA acima do teclado desde o início, e o teclado abre sozinho |

Regras:
- Teclado certo por campo (`keyboardType`/`inputMode`), tecla de retorno certa, e autocomplete / `textContentType` (e-mail, senha, código por SMS). Preenchimento automático é design.
- `keyboardAppearance` segue o tema.
- Formas de fechar o teclado: tocar fora, arrastar a lista e o botão "concluir".
- A tab bar some com o teclado aberto.
- **O movimento acompanha o teclado**, com a mesma curva e a mesma duração. Nada pula depois que o teclado termina de abrir.
- Nunca: altura fixa de tela que corta com o teclado; `ScrollView` puro com campo no fim sem tratamento; CTA escondido atrás do teclado.

## 3. Implementação por stack

Confira a documentação da versão do projeto antes de usar.

| Stack | Área segura | Teclado |
|---|---|---|
| **Expo / RN** | `react-native-safe-area-context`: `SafeAreaProvider` na raiz; **prefira `useSafeAreaInsets()`** aplicado a peças específicas (header, CTA, `contentContainerStyle` das listas) em vez de envolver a tela; o `SafeAreaView` da lib (com `edges`) só em tela contida simples. **Nunca** o `SafeAreaView` do React Native (obsoleto desde a 0.81, só iOS, não funciona com edge-to-edge). Status bar por tela com `expo-status-bar` | `KeyboardAvoidingView` (`padding` no iOS) só para o caso simples. Formulário, chat e CTA grudado: `react-native-keyboard-controller` (`KeyboardProvider` na raiz, `KeyboardAwareScrollView`, `KeyboardStickyView`, `KeyboardToolbar`, e `useReanimatedKeyboardAnimation` para animar junto) |
| **Flutter** | `MediaQuery.paddingOf(context)`; `SafeArea(top: false, ...)` por lado; `Scaffold(extendBody: true, extendBodyBehindAppBar: true)` para sangrar; `SystemUiMode.edgeToEdge`; `AnnotatedRegion<SystemUiOverlayStyle>` para a status bar | `resizeToAvoidBottomInset`; `MediaQuery.viewInsetsOf(context).bottom`; `Scrollable.ensureVisible`; `TextInputAction.next` |
| **SwiftUI** | área segura automática; `.ignoresSafeArea(edges:)` **só no fundo** (imagem, cor, efeito); barras próprias em `.safeAreaInset(edge:)` | evitação automática; `.ignoresSafeArea(.keyboard)` onde não deve subir; `.scrollDismissesKeyboard(.interactively)`; `@FocusState` + `.submitLabel(.next)` |
| **Compose** | `enableEdgeToEdge()`; `WindowInsets.safeDrawing` / `systemBars` com `Modifier.windowInsetsPadding`; `contentWindowInsets` do `Scaffold` | `windowSoftInputMode="adjustResize"`; `Modifier.imePadding()`; `WindowInsets.ime`; `ImeAction.Next` |
| **Ionic / Capacitor** | `viewport-fit=cover` + `env(safe-area-inset-*)` | plugin `@capacitor/keyboard` (modo `resize`) |
| **.NET MAUI** | `UseSafeArea` (iOS, específico de plataforma) por página | `WindowSoftInputModeAdjust.Resize` no Android |

## 4. Revisão

**A web e o simulador sem ilha escondem esses problemas**: no preview web os insets são zero e não existe teclado virtual. Por isso:
- **DesignLab → `aparelho`**: `real` | `iPhone com ilha` (topo 59, base 34) | `Android com gestos` (topo 32, base 24). Em dev, ele sobrescreve os insets no provider de área segura (RN: `SafeAreaInsetsContext.Provider`; Flutter: `MediaQuery` com `padding` sobrescrito) e desenha uma status bar e uma ilha falsas por cima, para os prints da web mostrarem as bordas reais. Com os insets vindo de `useSafeAreaInsets()` (e não de componente nativo), a simulação funciona.
- **Teclado**: revise num emulador ou aparelho, com o teclado aberto em cada campo importante. Sem emulador, peça os prints ao usuário (lista exata de telas e campos). Enquanto isso, faça a revisão por código: toda tela com campo usa o tratamento de teclado da spec.
- Capture também a tela imersiva e a de herói sangrando no modo `iPhone com ilha`.
