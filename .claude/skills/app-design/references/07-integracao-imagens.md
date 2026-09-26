# Integração das imagens

Disparada por `/app-design imagens`. Pode rodar várias vezes: a cada rodada, integre o que chegou e reporte o que falta.

## 1. Conferir arquivos

```
python .claude/skills/app-design/scripts/processar_imagens.py --verificar
```

O relatório mostra, para cada entrada do `assets.json`: se o arquivo foi encontrado, o tamanho original, se tem transparência e os avisos. Também lista os arquivos em `img-original/` que não estão no manifesto.

- **Nome errado** (maiúscula, espaço, `.jpg` em vez de `.png`): o script aceita e avisa. Arquivos com nome padrão do ChatGPT ("ChatGPT Image ..."): abra a imagem, identifique o slot e sugira a renomeação ao usuário. Não renomeie arquivos dele sem confirmar.
- **Proporção diferente da pedida**: tudo bem se sobrar resolução para recortar. O script avisa quando o @3x fica abaixo do ideal.

## 2. Olhar cada imagem

Abra cada imagem nova com a ferramenta de leitura (você enxerga imagens) e avalie contra o `style-guide.md` e o prompt:

| Critério | Pergunta |
|---|---|
| Técnica | É a técnica do bloco de estilo (flat, foto editorial, 3D...)? |
| Paleta | As cores dominantes e o acento batem com a paleta? |
| Composição | O sujeito está onde o slot precisa? A zona de texto está livre e na luminosidade certa? Sobra margem para o recorte? |
| Limpeza | Sem texto, letras, marca d'água ou moldura? Mãos, rostos e objetos sem deformação? |
| Transparência | Se era para ser transparente, o fundo é transparente de verdade (o script confirma o canal alfa)? |
| Conjunto | Parece da mesma família que a âncora e as outras do conjunto? |
| Efeito | Imagem de efeito (`efeito` no manifesto): luz sobre preto de verdade, sem chão nem objeto; fundo com zona calma e bordas livres, sem sujeito; textura sem mancha que denuncie a repetição; peça com um elemento só. O script converte a luz em transparência e avisa emenda de textura. |

Veredito por imagem (registre em `status` no `assets.json`):
- **aprovada**: integra.
- **aprovada com ajuste de código**: integra e corrige no código (véu mais forte, outro `foco` de recorte, `ajuste: conter`).
- **reprovada**: não integra. Escreva um **prompt de correção** curto para colar **na mesma conversa** do ChatGPT:
  ```text
  Mantenha tudo igual, mas: {correção objetiva}. {Reforço da restrição violada}.
  ```
  Exemplo: "Mantenha tudo igual, mas mova a tigela para o terço direito e deixe o lado esquerdo escuro e vazio. Sem nenhum texto na imagem."

## 3. Processar

```
python .claude/skills/app-design/scripts/processar_imagens.py
```

Para cada imagem presente e não reprovada, o script:
1. apara a sobra transparente, se `aparar` estiver ligado;
2. recorta (`cobrir`, respeitando o `foco`) ou encaixa com margem (`conter`);
3. achata o canal alfa sobre `fundo` quando `transparente` é `false`;
4. gera as densidades da stack (`@2x/@3x`, `2.0x/3.0x`, `drawable-*dpi`, imageset), sem nunca ampliar além do original;
5. comprime (png otimizado ou quantizado, jpg progressivo, webp);
6. calcula a `cor_media` (fundo enquanto a imagem carrega) e marca `status: integrado`;
7. regrava o registro de imagens (ts/js/dart), com `require`/caminho só para os arquivos que existem.

Para uma imagem só: `--so hero_home.png`. Para reprocessar depois de mexer em `foco`, `ajuste` ou `margem`, é só rodar de novo.

## 4. Ícone e splash

Com `icone_app.png` e `icone_simbolo.png` aprovados:

| Stack | Como |
|---|---|
| Expo | Entradas no `assets.json` com `densidades: [1]` e `destino: "assets"`: `icon` (do `icone_app`, opaco), `adaptive-icon` (do símbolo, `ajuste: conter`, `aparar: true`, `margem: 0.25`) e `splash-icon` (do símbolo, `margem: 0.1`). No `app.json`: `icon`, `android.adaptiveIcon.foregroundImage` + `backgroundColor` (token), `android.adaptiveIcon.monochromeImage` e o plugin `expo-splash-screen` com `image`, `imageWidth` (~200), `backgroundColor` e `dark`. Precisa de um novo development build para ver. |
| React Native CLI | iOS: `AppIcon.appiconset` com um único 1024x1024 (Xcode 14+). Android: Image Asset Studio do Android Studio a partir do símbolo + cor. Splash: `react-native-bootsplash` (`npx react-native-bootsplash generate <simbolo.png> --background=<hex> --logo-width=120`). |
| Flutter | `flutter_launcher_icons` (`image_path`, `adaptive_icon_background` = token, `adaptive_icon_foreground`, `remove_alpha_ios: true`) e `flutter_native_splash` (`color`, `image`, `color_dark`, `android_12`). Rode `dart run flutter_launcher_icons` e `dart run flutter_native_splash:create`. |
| SwiftUI | `AppIcon` single-size 1024 (variantes dark/tinted são opcionais; no iOS 26+ dá para usar camadas do Icon Composer: fundo = cor, frente = símbolo). Launch screen: `UILaunchScreen` no Info.plist com `UIColorName` + `UIImageName`. |
| Compose | Adaptive icon em `mipmap-anydpi-v26/ic_launcher.xml` (background = cor, foreground e monochrome = símbolo com margem de 25%): use o Image Asset Studio. Splash: `androidx.core:core-splashscreen` com `windowSplashScreenBackground` e `windowSplashScreenAnimatedIcon`. |
| MAUI | `<MauiIcon Include="..." ForegroundFile="<simbolo>" Color="<hex>" />` e `<MauiSplashScreen Include="<simbolo>" Color="<hex>" BaseSize="128,128" />` no `.csproj`. |
| Ionic / Capacitor | Salve os arquivos em `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`) e rode `npx @capacitor/assets generate`. |

O símbolo precisa caber no círculo central (66% do lado) no Android adaptativo: por isso a margem de 25%.

## 5. Ajuste fino do design

Com as imagens no lugar, revise as telas que as usam:
- **Legibilidade**: o texto sobre a imagem passa? Se não, reforce o véu ou o gradiente (token `overlay`) ou mude o `foco`. Não escureça a imagem inteira.
- **Harmonia**: se as imagens puxaram a paleta para outro lado (acento mais quente, por exemplo), prefira ajustar o véu ou o fundo do slot. Só mexa nos tokens com motivo claro, e rode o `validar_tokens.py` de novo.
- **Peso**: imagem acima de ~400 KB no @3x deve ir para jpg/webp ou ter `quantizar: true`.
- **Placeholder**: com a `cor_media` no registro, o AppImage usa essa cor enquanto carrega.

## 6. Ver no app

- Se houver emulador ou aparelho Android conectado (`adb devices`), capture as telas do catálogo e olhe cada uma:
  `adb exec-out screencap -p > design/prints/<tela>.png`
- Simulador iOS (macOS): `xcrun simctl io booted screenshot design/prints/<tela>.png`.
- Sem nada disso, peça ao usuário prints das telas principais no Catálogo de Telas.

## 7. Atualizar status

- `assets.json`: o script marca `integrado`. Reprovadas ficam `reprovada` até chegar uma nova versão; nesse caso, volte para `aprovada` depois de olhar.
- `brief.md`: "Imagens integradas: X de N".
- Reporte ao usuário uma tabela com integradas, reprovadas (com o prompt de correção) e pendentes.
