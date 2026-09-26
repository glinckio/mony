# Telas e fluxos

## 1. Loop principal e telas típicas

O **loop principal** é a tarefa que o usuário faz toda vez: pedir comida, registrar treino, agendar horário. Ela precisa caber em no máximo 3 toques a partir da abertura do app. As telas do loop são prioridade 1.

Conjunto típico, para propor telas novas (use só o que o app precisa):

| Grupo | Telas |
|---|---|
| Entrada | Boas-vindas, Onboarding (2 a 4 slides, só se o app precisa explicar algo), Login, Cadastro, Recuperar senha |
| Permissões | Pré-permissão (explica antes do popup do sistema: notificações, localização, câmera) |
| Núcleo | Home, Lista/Busca, Detalhe, Criar/Editar, Confirmação/Sucesso |
| Conta | Perfil, Configurações, Notificações |
| Monetização | Planos/Paywall, Checkout |
| Estados globais | Sem conexão, Erro genérico, Atualização obrigatória |

Para a primeira versão, 8 a 15 telas. Prioridades:
- **P1**: loop principal + entrada
- **P2**: telas de suporte (perfil, busca, configurações)
- **P3**: extras

A splash é nativa (cor + símbolo), não uma tela.

## 2. Entrevista de funcionalidades

Objetivo: cada tela nova faz exatamente o que o usuário quer. Nada que ele não pediu entra, e nada que ele usava some sem ele saber. **Nunca é pulada**, nem com `--direto`.

**Ferramenta**: use a ferramenta de perguntas (AskUserQuestion) nas rodadas 1 e 2. Ela aceita até 4 perguntas por chamada e de 2 a 4 opções por pergunta; `multiSelect: true` para adicionar/remover; o usuário sempre pode digitar outra resposta. Na rodada 3 (tela nova), pergunte em texto: a lista é do usuário, não sua.

### 2.1 Inventário (feito na Fase 0)

Para cada tela existente, em linguagem de usuário (não de código):
- **O que mostra**: dados e de onde vêm;
- **O que o usuário faz ali**: ações, formulários, gestos;
- **Para onde leva**: navegação;
- **Regras escondidas**: validações, permissões por perfil, feature flags, cálculos, limites;
- **Integrações**: API, câmera, localização, notificações, pagamento.

Exemplos: "Lista os pedidos do usuário, mais recentes primeiro (GET /orders)". "Botão Cancelar, só aparece se o pedido está pendente".

Código sem uso (tela sem rota, ação nunca chamada) entra marcado como **sem uso aparente**.

### 2.2 Rodada 1: lista de telas

Numa mensagem, mostre:
- **Existentes**: nome e resumo de uma linha, do inventário;
- **Novas que você propõe**, com o porquê (loop principal, estado global, padrão do domínio);
- **Telas inteiras para remover**, com o porquê (duplicada, sem uso, fora do escopo do assunto).

Depois pergunte (multiSelect): "Quais telas novas devo criar?" e "Alguma tela existente deve sair?". O que o usuário não marcar: tela nova não entra, tela existente fica. App sem telas: pule a pergunta de remover.

### 2.3 Rodada 2: telas existentes (adicionar / remover)

Para cada tela que fica, mostre primeiro o que ela faz hoje:

```
**Início** (hoje)
- Mostra o saldo e as últimas 5 transações
- Botão "Transferir" → tela Transferência
- Banner promocional fixo (vem de /banners)
```

Depois, duas perguntas multiSelect:
- **"Início: o que adicionar?"**: até 4 sugestões, cada uma com o porquê na descrição. Ex.: "Pull-to-refresh: o saldo muda com frequência".
- **"Início: o que remover?"**: até 4 itens do inventário que parecem desnecessários, com o porquê. Ex.: "Banner promocional fixo: compete com a ação principal".

Quando sugerir **adicionar**:
- o que o domínio espera nessa tela e está faltando;
- estados ausentes (vazio, erro, offline);
- atalhos que encurtam o loop principal;
- acessibilidade.

Quando sugerir **remover**:
- duplicado em outra tela;
- sem uso aparente;
- ação que pertence a outra tela;
- poluição que compete com a ação principal;
- algo que só existia por limitação do design antigo.

Regras:
- Regra de negócio ou de segurança (validação, permissão, limite) nunca entra como "enxugar". Se achar que é desnecessária, faça uma pergunta separada e explícita.
- Só 1 sugestão numa das perguntas: pergunte em forma de sim/não. Nenhuma sugestão: não faça a pergunta.
- Telas sem nenhuma sugestão vão juntas numa pergunta só: "Estas telas ficam com as mesmas funcionalidades?".
- Até 2 telas por chamada (4 perguntas).
- O que não for marcado fica como está: a sugestão não entra, o item não sai.

### 2.4 Rodada 3: telas novas (o usuário lista)

Pergunta aberta, em texto, com várias telas na mesma mensagem:

```
Para cada tela nova, liste o que ela deve fazer:

1. **Agenda**: o que o usuário vê e faz aqui?
2. **Perfil do barbeiro**: o que o usuário vê e faz aqui?
```

Espere a resposta. Depois:
- Organize a lista em funcionalidades claras, sem mudar o sentido.
- Se faltar algo que o fluxo exige (ex.: pagamento sem forma de pagamento, uma tela que ninguém consegue abrir), faça **uma** pergunta de complemento, no máximo.
- Não adicione o que ele não pediu. Sugestão sua só entra se ele aceitar.

### 2.5 Registro

No `design/telas.md`, cada tela recebe:
- **Origem**: existente (`arquivo`) ou nova;
- **Funcionalidades**, cada uma marcada com `(existente)`, `(sugerida, aceita)` ou `(pedida)`;
- **Removidas**: o que saiu, por decisão de quem;
- **Regras de negócio a preservar**.

Isso é o contrato da tela: a spec (seção 6) e o código cobrem todas as funcionalidades e nenhuma das removidas.

## 3. Navegação

A estrutura de navegação também é redesenhada do zero (o roteador continua o mesmo):
- **Tab bar**: 3 a 5 destinos do mesmo nível, os mais usados. Sempre ícone + rótulo curto. É um componente **desenhado** para o app, nunca a barra padrão da plataforma ou da lib (regras e implementação em [09-componentes-proprios.md](09-componentes-proprios.md)).
- **Stack**: para aprofundar (lista → detalhe).
- **Modal / sheet**: tarefa curta e interrompível (filtro, confirmação, criação rápida). Sheet com alça e arrastar para fechar.
- Evite menu hambúrguer como navegação principal.
- Todo destino volta por gesto (iOS) e pelo botão voltar (Android).
- Links externos para rotas antigas (deep links, notificações push) continuam funcionando: mantenha as URLs/rotas ou crie redirecionamentos.

No `telas.md`, documente como árvore:

```
Raiz
├── (entrada) Boas-vindas → Login → Cadastro
└── (tabs)
    ├── Início → Detalhe
    ├── Buscar
    └── Perfil → Configurações
```

## 4. Padrões mobile obrigatórios

- Uma ação principal por tela, visualmente dominante.
- Carregamento com skeleton no formato do conteúdo, não spinner de tela cheia.
- Pull-to-refresh nas listas que atualizam.
- Estado vazio útil: explica o que falta e oferece a ação (não só "Nada aqui").
- Erro com a causa em linguagem humana + "Tentar de novo".
- Formulários:
  - teclado certo por campo (email, número, telefone) e "próximo" entre campos;
  - comportamento do teclado desenhado por tela: campo focado e próxima ação sempre visíveis ([12-bordas-e-teclado.md](12-bordas-e-teclado.md));
  - validação ao sair do campo.
- Listas longas virtualizadas.
- Feedback imediato ao toque: estado pressionado, haptic nas ações importantes, UI otimista quando for seguro.
- Bordas decididas por tela (contida, herói sangrando ou imersiva): o fundo pode sangrar, e texto e toques nunca ficam atrás da ilha, da status bar, do indicador de home ou da barra do Android ([12-bordas-e-teclado.md](12-bordas-e-teclado.md)).
- Textos curtos, com verbo de ação nos botões ("Agendar horário", não "OK").

## 5. Composição

A lista de funcionalidades diz **o que** a tela tem. A composição diz **como** ela se organiza para o olho. Pular essa etapa é o que faz toda tela virar "título → seções empilhadas → lista de cards". Faça antes de escrever a spec.

### 5.1 Para cada tela

1. **Ponto focal**: a UMA coisa que o usuário tem que ver primeiro. Uma só.
2. **Conceito de layout** em uma frase, que não seja a lista de seções. Ex.: "a tela é o dia da quadra: a régua de horários domina, o resto é contexto recolhível", e não "header, fotos, informações, horários, botão".
3. **Ritmo**: a sequência de densidades ao rolar (herói → denso → respiro → denso). Evite blocos de mesmo peso em sequência.
4. **Wireframe ASCII** com proporções aproximadas (o que ocupa a primeira dobra de 375×667, o que fica fixo e o que rola).
5. **Padrão genérico evitado**: qual padrão da lista 5.3 essa tela tenderia a repetir e o que ela faz no lugar.
6. **Componentes de domínio** que aparecem e qual deles é o protagonista.
7. **Momento**, se a tela tem um (ver direção de arte).
8. **Bordas e teclado**: modo de borda (contida, herói sangrando, imersiva), estilo da status bar e, se há campo, o que sobe e o que continua visível com o teclado ([12-bordas-e-teclado.md](12-bordas-e-teclado.md)).
9. **Vida**: as camadas presentes (ambiente, transição, scroll, dados vivos, espera, celebração), respeitando o nível do app e o orçamento por tela ([11-vida-e-efeitos.md](11-vida-e-efeitos.md)).

### 5.2 Exploração nas telas-chave

Para a **tela-chave** (a mais importante do loop) e para as outras telas P1 do loop principal, desenhe **2 ou 3 wireframes alternativos** com conceitos diferentes (não variações de espaçamento). Escolha um e registre em uma linha por que os outros perderam. Ex.:

```
A) Lista primeiro            B) Mapa + folha            C) "Agora" primeiro
┌──────────────────┐        ┌──────────────────┐       ┌──────────────────┐
│ Título           │        │   ░░ mapa ░░     │       │ HOJE · 19h livre │
│ [busca]          │        │   ░ • ░ • ░      │       │ ███ 3 quadras ██ │
│ [chips]          │        ├──────────────────┤       │ perto de você    │
│ ┌──────────────┐ │        │ ▔▔ alça ▔▔       │       ├──────────────────┤
│ │ card         │ │        │ Quadra A · 19h   │       │ [esporte ▸]      │
│ └──────────────┘ │        │ Quadra B · 20h   │       │ lista compacta   │
└──────────────────┘        └──────────────────┘       └──────────────────┘
Escolhida: C. O organizador abre o app para achar horário hoje; A é o template
de qualquer catálogo e B exige localização real, que o app não tem.
```

### 5.3 Padrões genéricos (os defaults de IA)

Estes padrões aparecem em quase todo app gerado por LLM. Eles **podem** ser usados quando são a melhor resposta, mas como escolha consciente registrada na spec, nunca por inércia:

| Padrão | Por que vira template | Caminhos alternativos |
|---|---|---|
| Pilha de seções com rótulo em caixa-alta (SOBRE, ESTRUTURA, HORÁRIOS), todas com o mesmo peso | nada tem prioridade; a tela vira formulário de leitura | hierarquia por tamanho e posição; agrupe e recolha o secundário; o protagonista fica sem rótulo |
| Grid de "fatos" com ícone em cima e rótulo embaixo (2×2, 4×1) | igual em qualquer app de detalhe | frase única ("Society coberto para 14, grama sintética"); fatos integrados ao componente protagonista; só o fato que decide |
| Header = saudação + título + busca + chips + lista | é o layout padrão de catálogo | comece pelo que o usuário veio fazer (próximo compromisso, sugestão do agora); busca como ação, não como bloco |
| Card de lista = imagem 16:9 + título + 2 linhas cinza + rodapé com divisória | todo marketplace | proporção e recorte próprios; dado decisivo em destaque; layout de item que varia com o estado |
| Estado vazio = ícone cinza centralizado + título + texto + botão | não tem voz nem motivo | ilustração ou motivo da linguagem visual, texto na voz do app, ação que resolve |
| Tudo dentro de card com borda de 1 px | tudo tem o mesmo peso | fundo e espaço separando; superfície só para o que é tocável ou agrupado |
| Badge para tudo (status, categoria, atributo) | dados diferentes com a mesma forma | status com forma própria; atributo como texto; categoria como cor ou ícone do componente |
| Barra fixa "Selecione um item" + botão apagado | parece erro | barra que só aparece ou se transforma quando há escolha; resumo vivo da seleção |
| Detalhe = foto hero + título + linha de ícones | página de produto genérica | o protagonista (horário, preço, ação) sobe para a primeira dobra; a foto serve ao conteúdo |

**Regra**: toda tela P1 tem pelo menos **um elemento que só existe neste app** (componente de domínio ou momento), visível na primeira dobra.

## 6. Spec de cada tela

Use o template [../templates/telas.md](../templates/telas.md). Cada tela tem:

- **id, rota, origem, prioridade e status**
- **Propósito**: em uma frase, o que o usuário resolve aqui
- **Funcionalidades** e **removidas** (vêm da entrevista)
- **Vem de → vai para**
- **Composição**: ponto focal, conceito, ritmo, wireframe escolhido (e alternativas nas telas-chave), padrão genérico evitado (seção 5)
- **Layout** de cima para baixo (header, seções, rodapé fixo)
- **Bordas e teclado**: modo de borda, status bar e comportamento do teclado
- **Componentes**: de domínio (protagonista em destaque), chrome e primitivas
- **Dados**: tipos, quantidade de mocks e o serviço real existente (se houver)
- **Estados**: normal, vazio, carregando e erro, mais os específicos (sem permissão, offline, lista longa...)
- **Imagens**: slots (arquivo, proporção, onde a UI sobrepõe)
- **Interações e movimento**: microinterações dos componentes de domínio, transição de entrada e saída, momento (se houver)
- **Vida**: fundo ambiente (se houver), efeitos de scroll, dados vivos, espera e celebração desta tela, cada um com a versão para "reduzir movimento"
- **Texto**: título, CTA, vazio e erro na voz do app
- **Mensagens**: as confirmações, toasts, erros, avisos e sheets que a tela dispara, com a superfície de cada uma (do inventário em `componentes.md`)
- **Acessibilidade**: rótulos, ordem de leitura, o que é decorativo

Toda funcionalidade da lista aparece em algum ponto do layout ou das interações. Confira antes de fechar a spec.

## 7. Slots de imagem

Para cada imagem que uma tela usa, defina:
- **arquivo** em snake_case, com prefixo do contexto: `onboarding_1`, `vazio_favoritos`, `hero_home`, `mock_prato_1`;
- **tamanho de exibição** em dp/pt (largura × altura, ou `tela` × proporção);
- **sobreposição**: onde a UI coloca texto ou botões por cima (vira "zona livre" no prompt);
- **ajuste**: `cobrir` (recorta para preencher) ou `conter` (encaixa inteira, com margem);
- **fundo**: transparente ou opaco.

Esses dados vão para o `assets.json` e para o prompt da imagem.
