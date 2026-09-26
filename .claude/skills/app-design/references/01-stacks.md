# Stacks: detecção e mapeamento

## 1. Detectar a stack

| Sinal no projeto | Stack | `stack` no assets.json |
|---|---|---|
| `package.json` com `expo` | Expo (React Native) | `expo` |
| `package.json` com `react-native`, sem `expo` | React Native CLI | `react-native` |
| `pubspec.yaml` com `flutter:` | Flutter | `flutter` |
| `*.xcodeproj` ou `Package.swift` + `.swift` com `import SwiftUI` | SwiftUI (iOS) | `ios` |
| `build.gradle(.kts)` com `androidx.compose` ou `compose = true` | Jetpack Compose | `android` |
| `build.gradle.kts` com `org.jetbrains.compose` / `kotlin("multiplatform")` | Compose Multiplatform | `android` (destino em `composeResources`) |
| `*.csproj` com `<UseMaui>true</UseMaui>` | .NET MAUI | `unico` |
| `package.json` com `@ionic/*` ou `@capacitor/core` | Ionic / Capacitor | `unico` |
| `package.json` com `@nativescript/core` | NativeScript | `unico` |

Pasta vazia ou stack ambígua: **pergunte**. Não escolha a stack pelo usuário.

## 2. O que ler do projeto (e para quê)

A camada visual é feita do zero. O projeto existente é lido por três motivos: saber onde encaixar o código novo, entender o que cada tela faz e não quebrar o que funciona.

**Continua e é usado pelo código novo:**
- **Roteador**: expo-router (pasta `app/` + dep), `@react-navigation/*`, go_router, auto_route, `NavigationStack`, Navigation Compose, Shell (MAUI). A biblioteca fica; a estrutura de navegação é redesenhada.
- **Serviços de dados, auth e estado de negócio**: clientes de API, TanStack Query, SWR, Zustand, Redux, Riverpod, Bloc... A camada de dados nova delega para eles, sem reescrevê-los.
- **i18n**: i18next, intl/arb, `Localizable.strings`, `strings.xml`. Se existir, os textos novos passam por ele.
- **Config do app**: nome, bundle id, permissões, deep links.
- **Convenções de código**: idioma dos identificadores, estrutura de pastas (feature-first ou type-first), aliases de import, lint.
- **Marca oficial do cliente** (logo, cores de marca), se existir e o usuário confirmar.

**Lido só para o inventário funcional (Fase 0), depois substituído:**
- **Telas**: o que mostram, o que o usuário faz, para onde levam, regras e integrações.

**Ignorado (não reaproveite, não imite):**
- **Tema e estilos**: arquivos `theme`, `colors`, `tokens`, `ThemeData`, `Color+Theme.swift`, `Theme.kt`, `Colors.xaml`, classes utilitárias.
- **Componentes visuais** do app.
- **Libs de UI**: React Native Paper, NativeBase, gluestack, Tamagui, UI Kitten, NativeWind (as classes), Material customizado etc. O código novo usa componentes próprios. Exceção: primitivas sem estilo que resolvem comportamento difícil (bottom sheet, gestos, listas virtualizadas, animação), escolhidas por mérito e não porque já estavam instaladas.
- **Fontes, ícones e imagens atuais** (exceto a marca oficial).

Registre na seção "Projeto" do `design/brief.md` o que continua e, na seção "Legado", o que vai ficar sem uso (arquivos de tema, componentes, libs de UI) para oferecer a remoção na entrega.

## 3. Onde fica o código novo

- Crie a camada nova numa pasta própria (`src/design/`, `lib/design/`, grupo `Design/`, pacote `design`) para tema, componentes e registro de imagens, mais `mocks/` e `dev/` (catálogo). Não misture com arquivos antigos, mesmo que já exista uma pasta `theme` ou `components`.
- Os **arquivos de rota** continuam onde o roteador exige (ex.: `app/` no expo-router). Cada rota passa a renderizar a tela nova; o conteúdo antigo da rota é substituído (o git guarda a versão anterior).
- Se um nome colidir com arquivo antigo que ainda está em uso por outra parte do app, use outro nome. Nunca edite componente antigo para "encaixar" no design novo.

## 4. Mapa de conceitos

Toda stack precisa destes itens. A seção da sua stack diz como fazer cada um.

| Conceito | O que é |
|---|---|
| Tema | `tokens.json` convertido para o sistema de tema da stack, claro/escuro automático |
| Fontes | carregamento das famílias escolhidas |
| Ícones | UMA biblioteca de ícones para o app inteiro |
| Primitivas | componentes sem opinião de domínio, que só leem o tema |
| Chrome próprio | tab bar, header, sheet e toast desenhados (ver [09-componentes-proprios.md](09-componentes-proprios.md)) |
| Componentes de domínio | as peças próprias do app (ver [09-componentes-proprios.md](09-componentes-proprios.md)) |
| Desenho em código | SVG ou canvas para os motivos da linguagem visual |
| Ver o app | como tirar print das telas para a revisão visual (ver [10-revisao-visual.md](10-revisao-visual.md)) |
| Imagem com placeholder | componente que recebe uma chave e mostra placeholder se a imagem não existir |
| Registro de imagens | mapa chave → arquivo (gerado pelo script em Expo/RN/Flutter) |
| Mocks | tipos + dados + camada de acesso |
| Catálogo de Telas | tela dev-only com lista de telas, estado e tema |
| Guarda de dev | o que garante que catálogo e atalho não vão para produção |
| Checagem | comando que valida o código após cada etapa |

## 5. Por stack

### Expo / React Native
- **Tema**: `src/design/theme/` com `tokens.ts` (espelho do `tokens.json`), `theme.ts` (claro/escuro semântico), `ThemeProvider` e `useTheme()` baseado em `useColorScheme()` e no override do DesignLab, estilizando com `StyleSheet`. Componentes em `src/design/components/`. No Expo, use `"userInterfaceStyle": "automatic"` no app.json.
- **Fontes**: `@expo-google-fonts/<familia>` + `useFonts`, segurando a splash com `SplashScreen.preventAutoHideAsync()`. No RN CLI: `.ttf` em `assets/fonts`, `react-native.config.js` e `npx react-native-asset`. Use uma família por peso (`Manrope_700Bold`), porque `fontWeight` com fonte customizada não é confiável no Android.
- **Ícones**: o Expo já traz `@expo/vector-icons`. Alternativas: `lucide-react-native` e `phosphor-react-native` (precisam de `react-native-svg`).
- **Imagens**: `expo-image` quando possível (cache, cor de placeholder, transição); senão, `Image` do RN. A densidade vem do sufixo `@2x`/`@3x`, e o `require` escolhe sozinho. O registro fica em `src/design/images.ts`, gerado pelo script: ele só escreve `require` de arquivo que existe, porque `require` de arquivo inexistente quebra o bundler.
- **Navegação**: tab bar própria com `Tabs` em JS e a prop `tabBar`, ou com as tabs headless de `expo-router/ui`. `expo-router/unstable-native-tabs` só na exceção registrada (ver [09-componentes-proprios.md](09-componentes-proprios.md)). Header próprio com `headerShown: false` ou `header: (props) => ...`.
- **Bordas e teclado** ([12-bordas-e-teclado.md](12-bordas-e-teclado.md)): `react-native-safe-area-context` com `useSafeAreaInsets()` por peça (o `SafeAreaView` do React Native está obsoleto); `react-native-keyboard-controller` para formulários, chat e CTA grudado no teclado.
- **Úteis**: `react-native-safe-area-context` (obrigatório), `react-native-svg` (motivos da linguagem visual e ilustrações em código), `expo-linear-gradient`, `expo-blur`, `expo-haptics`, `react-native-reanimated` (microinterações, layout, scroll e transições), `react-native-gesture-handler`, `@shopify/flash-list` para listas longas.
- **Vida** ([11-vida-e-efeitos.md](11-vida-e-efeitos.md)): `@shopify/react-native-skia` para fundos vivos, partículas e shaders (na web, precisa do setup do CanvasKit); `lottie-react-native` ou Skottie do Skia para ilustração animada; `expo-sensors` para parallax pelo giroscópio. `rive-react-native` exige development build.
- **Instalar deps**: no Expo, sempre `npx expo install <pkg>` (garante versão compatível com o SDK).
- **Guarda**: `__DEV__`.
- **Checagem**: `npx tsc --noEmit` (se TS) e o script de lint do projeto. Rodar: `npx expo start`. Ícone e splash não atualizam no Expo Go: precisa de development build (`npx expo run:android` / `run:ios`).
- **Ver o app**: se o projeto tem `react-native-web`, `npx expo start --web` + painel de navegador em viewport mobile. Senão, emulador/simulador (ver [10-revisao-visual.md](10-revisao-visual.md)).

### Flutter
- **Tema**: `lib/design/theme/` com `app_tokens.dart` (espelho do JSON), `ThemeData(useMaterial3: true)` claro e escuro com `ColorScheme` montado a partir dos tokens, e `ThemeExtension` para o que o Material não cobre (espaçamentos, raios, cores extras). `themeMode` vem do DesignLab (padrão `ThemeMode.system`).
- **Fontes**: pacote `google_fonts` ou `.ttf` declarados em `pubspec.yaml` (`fonts:`). Para release, prefira os arquivos embutidos.
- **Ícones**: Material Symbols (nativo), `phosphor_flutter` ou `lucide_icons_flutter`.
- **Imagens**: declare a pasta em `pubspec.yaml` (`assets: - assets/images/`). Variantes `2.0x/` e `3.0x/` são escolhidas automaticamente. O registro fica em `lib/design/app_images.dart`, gerado pelo script.
- **Navegação**: tab bar própria no `bottomNavigationBar` do `Scaffold`, com go_router `StatefulShellRoute.indexedStack`. Desenho em código com `CustomPainter`.
- **Guarda**: `kDebugMode`.
- **Checagem**: `flutter analyze`. Instalar: `flutter pub add <pkg>`. Rodar: `flutter run`. Ver o app: `flutter screenshot -o <arquivo>`.

### SwiftUI (iOS)
- **Tema**: grupo `Design/Theme/` com as cores em Asset Catalog (Color Set com aparência Any/Dark) ou em código (`Color(UIColor { $0.userInterfaceStyle == .dark ? ... : ... })`), mais `Font` e `CGFloat` estáticos para tipografia, espaços e raios.
- **Fontes**: `.ttf` no bundle, listados em `UIAppFonts` no Info.plist. Use `Font.custom(_:size:relativeTo:)` para respeitar o Dynamic Type. SF Pro é o padrão do sistema.
- **Ícones**: SF Symbols.
- **Imagens**: imagesets em `Assets.xcassets`. Placeholder por busca em tempo de execução: `UIImage(named:) == nil`.
- **Preview nativo**: além do catálogo, `#Preview` para cada tela em cada estado e tema.
- **Navegação**: `TabView` com `.toolbar(.hidden, for: .tabBar)` + barra própria em `.safeAreaInset(edge: .bottom)`. Desenho em código com `Shape`/`Path`/`Canvas`.
- **Guarda**: `#if DEBUG`.
- **Checagem**: `xcodebuild -scheme <App> -destination 'platform=iOS Simulator,name=<iPhone>' build` (só no macOS; no Windows, escreva o código e avise que não dá para compilar aqui).

### Jetpack Compose (Android) / Compose Multiplatform
- **Tema**: pacote `design/theme/` (ex.: `com.app.design.theme`) com `Color.kt`, `Type.kt`, `Shape.kt` e `Theme.kt`: `MaterialTheme(colorScheme, typography, shapes)` claro e escuro, mais um `CompositionLocal` para os tokens extras (espaços, cores extras).
- **Fontes**: `res/font/` com `FontFamily`, ou Downloadable Google Fonts (`ui-text-google-fonts`).
- **Ícones**: `material-icons-extended` ou Phosphor para Compose.
- **Imagens**: `res/drawable-*dpi/` (no Compose Multiplatform, `composeResources/drawable-*dpi/`). Recurso inexistente quebra a compilação, então o placeholder busca pelo nome em tempo de execução (`resources.getIdentifier(nome, "drawable", packageName)`, que devolve 0 quando falta) ou usa um mapa mantido pelo LLM, só com os recursos que existem.
- **Preview nativo**: `@Preview` por estado, e `uiMode = UI_MODE_NIGHT_YES` para o escuro.
- **Navegação**: `Scaffold(bottomBar = { AppTabBar(...) })` com composable próprio (não o `NavigationBar` padrão só com cores trocadas). Desenho em código com `Canvas`/`drawBehind`.
- **Guarda**: `BuildConfig.DEBUG` (no AGP 8+, ative `buildFeatures { buildConfig = true }`) ou código no source set `src/debug/`.
- **Checagem**: `./gradlew :app:assembleDebug` (no Windows, `gradlew.bat`).

### .NET MAUI
- **Tema**: `Resources/Styles/Colors.xaml` + `Styles.xaml`, com `AppThemeBinding` para claro/escuro.
- **Fontes**: `Resources/Fonts` + `builder.ConfigureFonts`.
- **Imagens**: `Resources/Images` (o MAUI redimensiona por plataforma a partir de um arquivo em alta resolução, por isso `stack: "unico"`).
- **Guarda**: `#if DEBUG`. **Checagem**: `dotnet build -f net9.0-android` (ou o TFM do projeto).

### Ionic / Capacitor
- **Tema**: variáveis CSS (`--ion-color-*`, `:root` e `@media (prefers-color-scheme: dark)`) geradas dos tokens.
- **Imagens**: um arquivo em alta resolução (`stack: "unico"`), usando `<img>` com `width`/`height` fixos.
- **Ícone e splash**: `npx @capacitor/assets generate` a partir de `assets/icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png` e `splash-dark.png`.
- **Checagem**: `npx tsc --noEmit` / `npm run build`.

### Stack fora da lista
Use o mapa de conceitos da seção 4. Pesquise na documentação da stack como cada conceito se faz e registre as escolhas no brief antes de codar.
