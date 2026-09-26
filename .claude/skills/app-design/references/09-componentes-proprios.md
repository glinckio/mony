# Componentes próprios e chrome do app

O caminho mais fácil para uma LLM é montar um kit genérico (Button, Card, Chip, Badge, ListItem), trocar as cores e empilhar as telas com ele. O resultado parece um Bootstrap ou um Material com outra cor: funciona, mas não tem alma. Um designer faz o contrário. Ele parte do conteúdo do domínio, desenha a peça que representa esse conteúdo e cuida de cada superfície que o usuário vê, inclusive a tab bar.

## 1. Três camadas de componente

| Camada | O que é | Exemplos | Papel no design |
|---|---|---|---|
| **Primitivas** | peças sem opinião de domínio | Text, Icon, Pressable com feedback, Surface, Stack, Skeleton, AppImage, Button, TextField | Base técnica: poucas, lendo tokens. **Não são o design.** |
| **Chrome do app** | tudo que emoldura as telas | tab bar, header, botão voltar, sheet, toast, diálogo, barra de ação fixa, pull-to-refresh, status bar | Desenhado com a direção de arte. Nunca fica no visual padrão da lib ou da plataforma. |
| **Componentes de domínio** | o conteúdo do app com forma própria | *Quadras:* régua de horários do dia, ingresso da partida. *Finanças:* extrato agrupado como livro-caixa. *Receitas:* passo a passo em modo cozinha | **É aqui que mora a identidade.** |

Regras:
- O conteúdo principal de toda tela P1 é renderizado por **componentes de domínio**. Uma tela P1 montada só com primitivas e chrome está reprovada.
- Componente de domínio tem nome do domínio: `MatchTicket`, `DaySlotRuler`, `LedgerDay`, `RecipeStep`. Nada de `InfoCard`, `DataRow` ou `CustomCard`.
- Primitivas também seguem a direção (forma, peso e movimento), mas continuam poucas e simples.

## 2. Teste do componente genérico

Para cada componente que aparece com destaque numa tela, pergunte: **"Se eu colar este componente num app de outro domínio, ele funciona sem mudar nada?"**

Se funciona, ele é genérico. Pode existir, mas não pode ser o protagonista da tela.

Sinais de genérico:
- as props são só `title`, `subtitle`, `icon`, `right`, `onPress`;
- dados de natureza diferente têm a mesma forma: horário, preço, status e categoria viram todos um `Badge`;
- a hierarquia interna é sempre "título em negrito + 2 linhas cinza + rodapé";
- o componente não tem nenhum estado específico do domínio (lotado, pico, estornado, vencendo, ao vivo...);
- trocar o ícone e o texto transforma ele em outra coisa (um card de quadra vira card de hotel).

## 3. Como desenhar um componente de domínio

Faça isso para cada componente de domínio. Registre o resultado em `design/componentes.md` (template em [../templates/componentes.md](../templates/componentes.md)).

1. **Conteúdo real e prioridade.** Liste os dados que ele mostra, ordenados pelo que importa **nesta tarefa**, e não pela ordem dos campos do tipo. Ex.: no horário livre, a ordem é hora > preço > pico > status.
2. **Origem no mundo real.** Pergunte de onde esse objeto vem: ingresso, placar, recibo, carteirinha, cardápio, bilhete de embarque, prontuário, etiqueta de preço, caderno. Tire **um ou dois traços** dessa origem, sem imitar o objeto: o picote do ingresso, os algarismos do placar, a coluna de valores do livro-caixa.
3. **Três conceitos rápidos**, em texto ou ASCII:
   - **convencional**: o que qualquer app faria;
   - **ousado**: a origem do mundo real levada ao máximo;
   - **equilíbrio**: identidade forte sem custo de usabilidade.

   Escolha um e registre por quê. O convencional só vence com justificativa escrita (ex.: "controle de formulário: previsibilidade vale mais que marca").
4. **Anatomia.** Defina as partes, os tokens de tipografia e cor de cada parte, os espaçamentos, os raios e o alinhamento. Números usam algarismos tabulares, e a unidade fica menor que o valor (`R$` menor que `180`).
5. **Estados.** Cubra os estados comuns (padrão, pressionado, selecionado, desabilitado, skeleton no formato dele) e os de dados (texto longo, campo opcional faltando, valor zero ou enorme). Depois, os **estados de domínio**: lotado, pico, cancelado, ao vivo, vencido...
6. **Movimento próprio.** Todo componente de domínio tem ao menos uma microinteração que é só dele, além do `scale 0.98` genérico. Ex.: o horário escolhido "acende" como um refletor, o ingresso é "carimbado" ao confirmar, o valor rola até o número novo.
7. **Variações de contexto**: compacto (lista), padrão (tela), herói (confirmação ou destaque). Descreva só as que as telas usam.
8. **Acessibilidade.** Rótulo composto numa frase ("19h, R$ 240, horário de pico, livre"), papel, estado selecionado/desabilitado e alvo de toque ≥ 48.

### Exemplos (inspiração, não receita)

| Domínio | Versão genérica (evite) | Versão própria (o tipo de pensamento esperado) |
|---|---|---|
| Reserva de quadra | grade 4×N de caixas iguais com a hora | **régua do dia**: horários numa faixa contínua, com o trecho de pico marcado como a luz de um refletor; o escolhido vira uma placa com a hora em algarismos de placar |
| Confirmação de compra | card com ✓ verde + "Sucesso!" | **ingresso** com picote, código em fonte de placar, dados da partida no canhoto e um "carimbo" animado ao entrar |
| Extrato financeiro | ListItem com ícone redondo + valor colorido | **dia do livro-caixa**: data como cabeçalho fixo, valores alinhados pela vírgula numa coluna tabular, saldo do dia no rodapé; entrada/saída pelo sinal e pelo peso da fonte, não só pela cor |
| Consulta médica | card com foto do médico + data | **cartão de consulta** com a data em destaque como folha de calendário, preparo como checklist e "como chegar" no rodapé |
| Receita | card com foto + tempo + dificuldade | foto dominante, com tempo e porções como marcadores na borda; **modo cozinha** em tela cheia, com texto enorme e passo atual destacado |
| Treino | barra de progresso | **trilho do treino** com os blocos (aquecimento, séries, descanso) proporcionais ao tempo, e o bloco atual pulsando |
| Delivery | card de produto + botão "Adicionar" | foto protagonista, preço como etiqueta; o botão **vira o contador** +/− no lugar, e o total voa para a barra do carrinho |

## 4. Chrome do app: tudo o que aparece é desenhado

Herde da plataforma o **comportamento** (gestos, voltar, teclado, seletores de data, share sheet, permissões, haptics), não a **aparência**. Para cada superfície abaixo, registre a decisão em `design/componentes.md`, na seção "Chrome".

| Superfície | O que decidir | Armadilha padrão |
|---|---|---|
| **Tab bar** | forma (barra cheia, flutuante, pílula, com ação central?), fundo (sólido, vidro, borda), indicador do ativo (forma + animação), ícone ativo × inativo (peso/preenchimento), rótulo, badge, reação ao scroll, haptic na troca | tab bar nativa ou da lib com o tint trocado |
| **Header / top bar** | título grande que colapsa ao rolar? transparente sobre imagem e ganha fundo ao rolar? alinhamento, ações, divisória ou sombra só depois de rolar | header padrão do stack com cor trocada |
| **Botão voltar** | forma (círculo sobre imagem, só seta, seta + rótulo), área de toque, contraste sobre foto | seta padrão sem contraste em cima da foto |
| **Sheet, diálogo, toast, banner** | a família de mensagens e interações do app (seção 5) | `Alert` nativo e snackbar padrão para tudo |
| **Barra de ação fixa** | fundo, transição do conteúdo (fade/borda aparecendo ao rolar), resumo + CTA, estado desabilitado com motivo claro | "Selecione um item" cinza + botão apagado |
| **Pull-to-refresh** | no mínimo, as cores dos tokens; indicador próprio quando a linguagem visual tem um motivo que cabe ali | spinner padrão |
| **Listas horizontais** | peek do próximo item, fade nas bordas, snap, indicador escondido | lista cortada seca na borda |
| **Status bar e bordas** | modo de borda por tela (contida, herói sangrando, imersiva); status bar clara ou escura conforme o que está atrás dela ([12-bordas-e-teclado.md](12-bordas-e-teclado.md)) | área segura envolvendo tudo (faixa morta acima do herói) ou nenhuma (conteúdo atrás das barras) |
| **Teclado** | comportamento por tela: o que sobe, o que gruda no teclado, o que some; `keyboardAppearance` do tema; "próximo" entre campos ([12-bordas-e-teclado.md](12-bordas-e-teclado.md)) | campo ou CTA coberto; layout que pula depois que o teclado abre |
| **Splash → primeira tela** | a cor da splash continua na primeira tela, entrada suave | flash branco ou salto de fonte |
| **Carregando / vazio / erro** | skeleton no formato do componente de domínio; vazio e erro com a voz e a linguagem visual do app | ícone cinza centralizado + título + botão |

### Tab bar própria: ousar sem quebrar

A tab bar é o componente que o usuário mais vê. Ela é **sempre** desenhada.

- 3 a 5 destinos. Ícone + rótulo curto.
- Alvo de toque ≥ 48 (a área inclui o rótulo). A barra respeita a safe area inferior.
- O item ativo é reconhecível **sem depender de cor** (forma do indicador, ícone preenchido, peso do rótulo).
- Acessibilidade: papel de aba/lista de abas, estado selecionado, rótulo; badge anunciado ("Reservas, 2 novas").
- Tocar na aba ativa volta ao topo ou à raiz da pilha, como o padrão da plataforma.
- A barra some nas telas de tarefa (checkout, fluxo de criação) e quando o teclado abre.
- O conteúdo nunca fica escondido atrás dela: o padding inferior das listas é a altura da barra + safe area. Na barra flutuante, o conteúdo rola por baixo e aparece um fade.
- A troca de aba tem microinteração (o indicador desliza ou se transforma) e haptic leve. Respeita "reduzir movimento".
- Vidro (Liquid Glass, blur) pode ser a **escolha** da direção, aplicada numa barra própria.

**Exceção**: tab bar nativa só quando o brief justifica (utilitário em que a sensação de sistema vale mais que a marca) **e** o usuário aprova no checkpoint. Mesmo assim, customize tudo que a API permite (indicador, ícones próprios, fonte e cor do rótulo, badge) e registre em "Decisões" no `brief.md`.

## 5. Mensagens, modais e interações

Toda vez que o app fala com o usuário ou pede algo a ele (confirmar, avisar, errar, comemorar, escolher, digitar), existe uma superfície. O básico é usar `Alert` nativo e snackbar padrão para tudo. O designer escolhe a superfície certa para cada mensagem e desenha uma família própria, **só com as peças que o app precisa**.

### 5.1 Inventário de mensagens (Fase 5)

Percorra cada tela e cada funcionalidade combinada e liste as vezes em que o app precisa se comunicar:
- confirmação de ação com consequência (cancelar, excluir, pagar, sair sem salvar);
- erro de campo, de ação, de rede, de servidor, de permissão;
- sucesso de ação pequena e sucesso do loop principal;
- aviso ou limite (saldo baixo, último horário, pagamento pendente, offline);
- escolha rápida (ordenar, filtrar, opções de um item, compartilhar);
- entrada curta (avaliar, renomear, deixar um recado);
- ajuda contextual e novidade (explicar um ícone, apresentar uma função nova);
- pré-permissão (antes do popup do sistema);
- bloqueio (atualização obrigatória, sessão expirada).

Registre em `design/componentes.md` (seção "Mensagens e interações"): mensagem, gatilho, superfície, texto na voz do app. App com poucas mensagens tem inventário curto. Tudo bem, desde que nenhuma tenha ficado de fora.

### 5.2 A superfície certa para cada mensagem

Modal interrompe. Use a superfície mais leve que resolve.

| Mensagem | Superfície | Evite |
|---|---|---|
| Erro de campo | inline, abaixo do campo, ao sair dele | modal ou toast |
| Erro de ação recuperável | toast com "Tentar de novo", ou inline no próprio componente | diálogo que só diz "Erro" |
| Erro que impede a tela | estado de erro da tela | modal por cima de tela vazia |
| Ação com consequência (cancelar, excluir, pagar) | **sheet ou diálogo de confirmação próprio**, com a consequência concreta | `Alert` "Tem certeza?" |
| Ação reversível (arquivar, remover da lista) | executar direto + toast com **"Desfazer"** | pedir confirmação |
| Sucesso pequeno (copiou, salvou, favoritou) | feedback no próprio componente (o botão vira check) ou toast curto | diálogo de sucesso |
| Sucesso do loop principal | tela ou **momento** próprio (ver direção de arte) | toast |
| Escolha rápida | sheet de opções próprio; menu contextual ancorado ao item | lista de botões num `Alert` |
| Entrada curta | sheet com campo, subindo com o teclado | tela nova para um campo só |
| Aviso persistente (offline, pendência) | banner inline no topo ou no contexto, até resolver | toast que some antes de resolver |
| Ajuda contextual / novidade | tooltip ou popover ancorado, que aparece uma vez e dá para dispensar | modal de boas-vindas com 5 slides |
| Pré-permissão | sheet ou tela própria explicando o benefício, e só depois o popup do sistema | popup do sistema sem contexto |
| Tarefa com várias etapas | tela ou modal em tela cheia | diálogo com rolagem |

### 5.3 A família própria

Quando o inventário pede, crie uma família coerente, e só com as peças usadas. Por exemplo: `ConfirmSheet`, `AppDialog`, `Toast`, `Banner`, `OptionsSheet`, `InputSheet`, `Tooltip`. As peças compartilham:
- **anatomia**: elemento visual (ícone, ilustração ou miniatura do objeto), título, corpo e ações;
- **tom**: neutro, sucesso, aviso e perigo, cada um com cor semântica, ícone e haptic próprios;
- **linguagem visual**: forma, raio, motivo e fundo da direção (o picote no toast de reserva, a textura no sheet...);
- **movimento**: o sheet sobe com spring, o diálogo entra com escala 0,96 → 1 + fade, o backdrop faz fade, a saída é mais rápida que a entrada. Com "reduzir movimento", tudo vira fade.

**Com cara do domínio**: a confirmação não é um "Tem certeza?" genérico. Ela mostra o **objeto afetado** (a miniatura do componente de domínio: a partida, o pedido, o item) e o que acontece com ele.

### 5.4 Conteúdo

- **Título** é a pergunta ou o fato: "Cancelar a partida de sábado?", não "Atenção" nem "Tem certeza?".
- **Corpo** é a consequência concreta: "R$ 180 voltam para o seu cartão em até 2 dias".
- **Botões com verbo específico**: "Cancelar partida" / "Manter reserva", nunca "OK" / "Cancelar". A ação destrutiva usa a cor `danger`. A ação segura é o padrão. A posição segue a plataforma.
- Tudo na voz do app (glossário da direção de arte).

### 5.5 Comportamento

- Fecha por gesto (arrastar o sheet), por toque no backdrop (menos em decisão crítica), pelo botão voltar do Android e pelo Esc na web.
- Ação com espera: o botão vira loader **dentro** do modal. Se der erro, ele aparece ali mesmo, sem fechar o modal nem perder o que foi digitado.
- Nunca modal sobre modal. Se precisa, é uma etapa dentro do mesmo sheet.
- Acessibilidade: o foco entra no modal e o leitor de tela anuncia o título. Ao fechar, o foco volta ao elemento que abriu.
- Toast:
  - não rouba o foco, mas é anunciado;
  - dura de 4 a 6 s (mais, se tem ação);
  - pausa enquanto está sendo tocado;
  - nunca cobre a tab bar nem o CTA;
  - no máximo um por vez, com fila.
- O sheet com campo sobe com o teclado e respeita a safe area.

### 5.6 Implementação

| Stack | Diálogo próprio | Menu ancorado / tooltip |
|---|---|---|
| **Expo / RN** | `Modal` transparente + conteúdo e animação próprios (Reanimated), ou rota com `presentation: 'transparentModal'` | popover próprio posicionado pelo `measure` do gatilho; menu contextual nativo é aceitável (comportamento de sistema) |
| **Flutter** | `showGeneralDialog` com `transitionBuilder` e widget próprio | `OverlayPortal` / `MenuAnchor` com estilo próprio |
| **SwiftUI** | overlay próprio com `.transition`, ou `.sheet` com detents para confirmações | `.popover` com conteúdo próprio; `Menu` nativo é aceitável |
| **Compose** | `Dialog(properties = DialogProperties(usePlatformDefaultWidth = false))` + conteúdo próprio | `Popup` ancorado; `DropdownMenu` com cores e forma dos tokens |
| **Ionic** | `ion-modal` com CSS próprio (evite `ion-alert` para decisões importantes) | `ion-popover` com CSS |
| **.NET MAUI** | página modal transparente ou popup da comunidade, com layout próprio | popup ancorado |

Sheets e toasts: ver a tabela da seção 6.

## 6. Implementação por stack

Antes de usar qualquer API desta tabela, confira a documentação da versão do projeto (as APIs de navegação mudam entre versões).

| Stack | Tab bar própria | Header próprio | Sheet | Toast |
|---|---|---|---|---|
| **Expo Router** | `Tabs` em JS (React Navigation bottom tabs) com `tabBar={(props) => <AppTabBar {...props} />}`, ou tabs headless de `expo-router/ui` (`Tabs`, `TabSlot`, `TabList`, `TabTrigger asChild`). Não use `expo-router/unstable-native-tabs` (só aparência de sistema), salvo a exceção acima | `headerShown: false` + `ScreenHeader` próprio, ou `header: (props) => <AppHeader {...props} />` | `presentation: 'formSheet'` do Stack com conteúdo próprio, ou lib de sheet sem estilo compatível com o Reanimated do projeto | componente no layout raiz + Reanimated |
| **React Navigation** | `createBottomTabNavigator` com `tabBar`. No `onPress`, emita `navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })` antes de navegar | `header` custom nas `screenOptions` | idem Expo | idem Expo |
| **Flutter** | `Scaffold(bottomNavigationBar: AppTabBar(...))` com go_router `StatefulShellRoute.indexedStack` (`navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex)`) | `CustomScrollView` + `SliverAppBar`/`SliverPersistentHeader` próprio | `showModalBottomSheet` com `shape`, `backgroundColor`, `barrierColor` e alça própria, ou `DraggableScrollableSheet` | `SnackBar` com `behavior: floating` e conteúdo próprio, ou `Overlay` |
| **SwiftUI** | `TabView(selection:)` com `.toolbar(.hidden, for: .tabBar)` + barra própria em `.safeAreaInset(edge: .bottom)` | `.toolbar` com `ToolbarItem` próprios, ou barra oculta + view própria | `.sheet` + `.presentationDetents`, `.presentationBackground`, `.presentationCornerRadius`, `.presentationDragIndicator` | `.overlay` + `.transition` |
| **Compose** | `Scaffold(bottomBar = { AppTabBar(...) })` + `currentBackStackEntryAsState()` | `TopAppBar`/`LargeTopAppBar` com `scrollBehavior` e cores dos tokens, ou composable próprio | `ModalBottomSheet(shape, containerColor, scrimColor, dragHandle = { AlçaPropria() })` | `SnackbarHost(state) { data -> AppSnackbar(data) }` |
| **.NET MAUI** | `Shell.TabBarIsVisible="False"` + barra própria no layout da página (ou handler da tab bar) | `Shell.TitleView` ou `NavigationPage.HasNavigationBar="False"` + view própria | página modal com layout de sheet, ou lib comunitária | view sobreposta com animação |
| **Ionic** | `ion-tab-bar slot="bottom"` com CSS parts e variáveis, ou barra própria dentro de `ion-tabs` | `ion-header` com `collapse="condense"` e CSS próprio | `ion-modal` com `breakpoints`, `handle` e CSS | `ion-toast` com `cssClass` e parts |

## 7. Onde isso aparece no fluxo

- **Fase 3 (direção)**: a linguagem visual define os motivos que os componentes de domínio e o chrome usam.
- **Fase 5 (specs)**: `design/componentes.md` lista os componentes de domínio (com os 3 conceitos e o escolhido), as decisões de chrome e o inventário de mensagens com a superfície de cada uma. O checkpoint mostra a tab bar, os 2 ou 3 componentes principais e a confirmação mais importante do app.
- **Fase 7 (código)**: primitivas → chrome → componentes de domínio → telas. A tela "Design system" do catálogo mostra os três grupos em todos os estados.
- **Revisão visual** ([10-revisao-visual.md](10-revisao-visual.md)): o teste do componente genérico entra na rubrica.
