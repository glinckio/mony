# Mocks e Catálogo de Telas (regra obrigatória)

Enquanto o design está sendo construído, o app roda 100% com dados mock e, em dev, abre num **Catálogo de Telas**. O usuário navega por todas as telas, troca estado e tema, e vê o design de verdade na stack de verdade, sem mockup à parte.

## Peças

1. **Camada mock**: tipos, dados e acesso.
2. **DesignLab**: estado global de dev com `estado` (normal | vazio | carregando | erro), `tema` (sistema | claro | escuro), `movimento` (sistema | reduzido) e `aparelho` (real | iPhone com ilha | Android com gestos: simula os insets e desenha status bar e ilha falsas, porque a web tem insets zero; ver [12-bordas-e-teclado.md](12-bordas-e-teclado.md)).
3. **Catálogo de Telas**: tela dev-only que lista as telas e controla o DesignLab.
4. **Tela "Design system"**: paleta, tipografia e componentes renderizados no app.
5. **Atalho flutuante**: botão discreto em todas as telas (em dev) para voltar ao catálogo.
6. **Registro de telas**: lista com status, espelho de `design/telas.md`.

## 1. Camada mock

Estrutura (adapte nomes e pastas à stack e ao projeto):

```
mocks/
  tipos      # modelos de domínio (os mesmos que a API real vai usar)
  dados      # arrays fixos em PT-BR
  servicos   # funções/hooks de acesso que hoje leem os dados mock
```

Regras:
- **As telas nunca sabem de onde vem o dado.** Elas chamam `useReservas()`, `ReservaRepository` ou `ReservasViewModel` e nunca importam o array mock nem o serviço direto.
- **Duas implementações quando já existe serviço real.** Se a funcionalidade já funciona no app (o inventário diz qual serviço/endpoint ela usa), a camada de acesso tem:
  - **mock**: dados fixos, controlados pelo DesignLab;
  - **real**: delega ao serviço existente, sem reescrevê-lo. Os tipos e o formato dos dados mock seguem o que esse serviço devolve.

  Um flag único (ex.: `USAR_MOCKS`) escolhe: `true` em dev enquanto o design está sendo feito, e sempre `false` em release. Assim a tela nova não quebra o que já funcionava.
- **Funcionalidade nova sem serviço**: só a implementação mock, com a interface pronta para a API futura. Liste essas funcionalidades na entrega.
- Se o projeto já usa uma lib de dados (TanStack Query, SWR, Riverpod, RTK Query...), use-a nas duas implementações. Ela é estrutura, não visual.
- A camada lê o `estado` do DesignLab:
  - `normal` → devolve os dados (latência configurável, padrão 0);
  - `vazio` → lista vazia ou objeto nulo;
  - `carregando` → nunca resolve, para o skeleton ficar visível;
  - `erro` → falha com uma mensagem realista.
- **Determinístico.** Arrays fixos, nada aleatório por render, para que prints e revisões fiquem estáveis.
- **Realista e brasileiro.** Nomes diversos, cidades reais, `R$ 1.234,56`, datas `dd/mm`, telefones fictícios `(11) 90000-0000`. Nenhum dado real de pessoa.
- **Casos de borda embutidos.** Um item com texto bem longo, um sem os campos opcionais (sem foto, sem descrição), valores 0 e muito grandes, e itens suficientes para rolar (8 a 20).
- **Ações funcionam.** Favoritar, criar e excluir alteram um store em memória, para a interação parecer real.
- **Imagens dos mocks** usam chaves do registro de imagens (mostram placeholder até a imagem chegar). Reaproveite poucas imagens de conteúdo entre vários itens.

## 2. DesignLab

- Estado global simples: Context, InheritedNotifier, `@Observable` ou `CompositionLocal`, ou a lib de estado que o projeto já usa.
- O `tema` do DesignLab sobrescreve o esquema de cor do sistema no provider de tema.
- O `movimento` do DesignLab sobrescreve a preferência "reduzir movimento" do sistema no serviço único de movimento (ex.: `useMotion()`). Assim dá para revisar a versão estática de cada efeito sem mexer nas configurações do aparelho.
- Persistir entre reloads (AsyncStorage, SharedPreferences) é bônus, não obrigação.

## 3. Catálogo de Telas

- **Topo**: controles de **estado**, **tema**, **movimento** e **aparelho** (segmented controls).
- **Progresso**: "9 de 12 telas prontas".
- **Lista agrupada por fluxo** (Entrada, Núcleo, Conta...). Cada item mostra nome, status (Pronta / Em progresso / Pendente) e rota. Tocar abre a **tela real, pela navegação real**, com parâmetros mock (ex.: o id do primeiro item). Item pendente fica desabilitado.
- **Primeiro item fixo: "Design system"** (ver seção 4).
- O catálogo usa o próprio tema do app: é a primeira prova de que o design system funciona.

## 4. Tela "Design system"

É o style guide renderizado no app, para validar os tokens antes das telas:
- amostras de cor semântica com nome e hex (acompanha o tema claro/escuro);
- a escala tipográfica inteira, com nome do token e tamanho;
- os motivos da linguagem visual, desenhados;
- em seções separadas: **componentes de domínio** (primeiro, porque são o design), **chrome** (tab bar, header, sheet, toast, barra de ação) e **primitivas**, cada um em todas as variantes e estados, inclusive os estados de domínio (pico, lotado, cancelado...);
- as microinterações tocáveis ali mesmo (selecionar, confirmar), para revisar o movimento;
- uma seção **Mensagens**: cada peça da família (confirmação, diálogo, toast, banner, sheet de opções...) com botão para abrir, em todos os tons que o app usa (neutro, sucesso, aviso, perigo);
- uma seção **Efeitos**: cada fundo ambiente, celebração, loader e efeito de scroll do mapa de vida, com botão para disparar de novo e a versão "reduzido" ao lado;
- espaçamentos e raios;
- todos os slots do registro de imagens (placeholder ou imagem real), com o nome do arquivo.

## 5. Atalho flutuante

- Pílula pequena num canto seguro, só em dev, mostrando o estado atual (ex.: "Lab · vazio").
- Toque volta ao catálogo. Toque longo alterna o estado (ou abre um menu rápido com estado e tema).
- Nunca cobre a ação principal da tela: se precisar, mude de canto.

## 6. Registro de telas

Arquivo no código (ex.: `dev/telas.ts`, `lib/dev/telas.dart`) com `{ id, nome, fluxo, rota, status }`. Atualize a cada tela pronta, junto com `design/telas.md`.

## Guarda de produção (obrigatória)

- Catálogo, atalho, tela Design system e DesignLab só existem em dev: `__DEV__` (RN), `kDebugMode` (Flutter), `#if DEBUG` (Swift e MAUI), `BuildConfig.DEBUG` ou source set `debug` (Android).
- Flag de início (ex.: `CATALOGO_NO_INICIO`):
  - `true` enquanto houver tela pendente: o app em dev abre no catálogo;
  - quando todas estiverem prontas, mude para `false`: o app abre no fluxo normal e o catálogo continua acessível pelo atalho.
- Em release, nenhuma rota de catálogo pode ser alcançada. Os dados vêm da implementação real. Funcionalidade que só tem mock em release é decisão explícita do usuário.

## Por stack

| | Expo Router | React Navigation | Flutter | SwiftUI | Compose |
|---|---|---|---|---|---|
| Catálogo | `app/catalogo.tsx` (com `<Redirect href="/" />` se `!__DEV__`) + `<Redirect href="/catalogo" />` em `app/index.tsx` quando a flag está ligada | tela `Catalogo` como `initialRouteName` quando a flag está ligada; registrada só em `__DEV__` | rota `/catalogo` (`initialLocation` do go_router quando a flag está ligada) | `CatalogView` na raiz quando a flag está ligada | `CatalogScreen` como destino inicial do `NavHost` quando a flag está ligada |
| Atalho | componente no `app/_layout.tsx` | irmão do `NavigationContainer` | `MaterialApp.builder` com `Stack` | `.overlay` na raiz | `Box` na raiz do `setContent` |
| DesignLab | Context | Context | InheritedNotifier / Riverpod / Provider | `@Observable` + `.environment` | `CompositionLocal` + `mutableStateOf` |
| Preview nativo extra | — | — | Widgetbook, se o projeto já usa | `#Preview` por estado e tema | `@Preview` por estado e tema |
| Guarda | `__DEV__` | `__DEV__` | `kDebugMode` | `#if DEBUG` | `BuildConfig.DEBUG` / `src/debug` |
