# Direção de arte

O objetivo é o design certo para **este** app, não um tema bonito qualquer. Toda escolha precisa se explicar pelo brief.

## Processo

1. **Diagnóstico** (vem do brief): quem usa, onde, por quanto tempo, em que estado emocional e para fazer o quê.
2. **Três atributos**: três adjetivos que o app precisa transmitir, de preferência em tensão saudável. "Confiável, ágil, caloroso" diz alguma coisa; "moderno, bonito, clean" não diz nada.
3. **Referências**: 2 ou 3 apps reais que resolvem bem algo parecido (podem ser de outro domínio), dizendo o que tirar de cada um. Exemplo: "a densidade de informação do Nubank, o calor das ilustrações do Duolingo". Inclua uma referência **de fora do mundo dos apps** (sinalização, editorial, embalagem, placar, uniforme, bilhete): é ela que costuma trazer o que não é genérico.
4. **Direção**: nome curto, conceito em uma frase e as decisões da tabela abaixo.
5. **Linguagem visual**: os motivos que nascem do domínio e se repetem no app (seção abaixo).
6. **Voz**: como o app fala (seção abaixo).
7. **Momentos**: onde o app merece cuidado extra (seção abaixo).
8. **Vida**: nível de vida e mapa de efeitos ([11-vida-e-efeitos.md](11-vida-e-efeitos.md)).
9. **Alternativas descartadas**: duas, uma linha cada, com o porquê.

## Decisões que formam a direção

| Decisão | Pergunta a responder |
|---|---|
| Estratégia de cor | Marca dominante (superfícies coloridas) ou base neutra com acento? Claro ou escuro por padrão? |
| Tipografia | Personalidade no display e legibilidade no corpo. Qual família e por quê. |
| Linguagem de forma | Raios (afiado, suave ou pílula), borda ou sombra, densidade (compacta ou arejada). Os raios não precisam ser iguais em tudo: a variação também comunica (ex.: ingresso reto com picote, chips em pílula). |
| Estilo de imagem | Foto, ilustração (qual técnica), 3D ou só tipografia e cor. Onde entra cada um. |
| Movimento | Personalidade: preciso e rápido, elástico e brincalhão, ou lento e calmo. Como isso aparece no toque, na seleção, na troca de tela e nos momentos. |
| Linguagem visual | 3 a 5 motivos do domínio, um deles o **elemento assinatura**: a coisa memorável reconhecível num print de uma tela só. |
| Chrome | Como ficam a tab bar, os headers, o botão voltar, os sheets e os toasts nesta direção. Ver [09-componentes-proprios.md](09-componentes-proprios.md). |
| Voz | Tom e vocabulário dos textos da interface. |
| Vida | Nível de vida (0 a 3) e como o app se mexe: fundo ambiente, transições, scroll, celebração, espera. Ver [11-vida-e-efeitos.md](11-vida-e-efeitos.md). |

## Arquétipos por domínio

Ponto de partida, não receita. Se contrariar o arquétipo, justifique.

| Domínio | O usuário precisa sentir | Mantenha | Ouse em | Evite |
|---|---|---|---|---|
| Finanças / banco / carteira | segurança, controle | números grandes e legíveis, confirmações claras, verde/vermelho só para entrada/saída | cor de marca inesperada, tipografia numérica com caráter | vermelho como cor de marca, excesso de ilustração |
| Saúde / clínica / hospital / telemedicina | confiança, calma, cuidado | hierarquia simples, texto grande, contraste alto | calor humano: tons quentes, ilustração acolhedora | frieza azul-e-branco de hospital, ícones médicos clichê |
| Fitness / esporte individual | energia, progresso | dados de treino claros, feedback de conquista | escuro por padrão, tipografia condensada, uma cor vibrante, movimento | poluição de gráficos, neon em tudo |
| Clube / time / CT esportivo | orgulho, pertencimento | agenda, resultados, comunicados | cores do clube, tipografia de impacto, fotos de ação | cores do clube sem ajuste de contraste |
| Meditação / bem-estar / sono | calma, respiro | pouca informação por tela, ritmo lento | gradientes, formas orgânicas, escuro suave, animação lenta | vermelho, densidade, notificação agressiva |
| Comida / delivery / restaurante | apetite, rapidez | fotos grandes, preço claro, carrinho sempre à mão | tratamento de foto consistente, paleta quente | fotos sem padrão de luz, fundo que briga com a comida |
| Educação / cursos | progresso, motivação | trilha e progresso visíveis, feedback imediato | gamificação, mascote, cor por matéria | infantilizar adulto, blocos longos de texto |
| Infantil | diversão (criança), segurança (pais) | alvos grandes, pouco texto, área dos pais separada | cor saturada, formas redondas, personagens, som e haptics | letra pequena, navegação profunda |
| Produtividade / B2B / gestão | foco, eficiência | densidade, estados claros, fonte do sistema é aceitável | um acento forte, microinterações precisas | decoração e ilustração em tela de trabalho |
| Social / comunidade | pertencimento, expressão | conteúdo do usuário em destaque, UI recua | reações, perfis com personalidade | UI competindo com o conteúdo |
| E-commerce / moda / varejo | desejo, confiança na compra | foto do produto como protagonista, preço e frete claros, checkout curto | tom editorial, serifa, espaço em branco | poluição de banners e selos |
| Viagem / turismo / mobilidade | descoberta, tranquilidade | mapa, datas e preço claros | fotografia imersiva, cor do destino | excesso de filtros na primeira tela |
| Serviços locais / agendamento (barbearia, salão, pet, oficina) | praticidade, confiança no profissional | próximo horário livre a um toque, preço, endereço | identidade do negócio (textura, tipografia), fotos reais do espaço | template genérico de "app de agendamento" |
| Eventos / música / entretenimento | empolgação | data, local e ingresso claros | escuro, arte do evento, tipografia expressiva | legibilidade sacrificada pela arte |
| Igreja / comunidade religiosa | acolhimento, paz | agenda, transmissão, contribuição simples | serifa, luz natural, calor | kitsch, clip-art |
| Imobiliário | confiança, aspiração | fotos grandes, filtros, mapa | tom editorial, neutros sofisticados | poluição de ícones de características |

## Linguagem visual

É o que faz o app ter cara própria além da paleta. Olhe para o mundo real do domínio e extraia **motivos gráficos** que dá para desenhar em código (SVG, formas, bordas, tipografia):

| Domínio | Motivos possíveis |
|---|---|
| Quadras / esporte | linhas de marcação, algarismos de placar, número de camisa, luz de refletor |
| Eventos / shows | picote de ingresso, carimbo, pulseira, letreiro |
| Finanças | coluna de livro-caixa, fio de recibo, serrilhado de cupom fiscal |
| Saúde | folha de calendário, fio de prontuário, curva suave de batimento |
| Comida | etiqueta de preço, carimbo de feira, textura de papel de embrulho |
| Viagem | canhoto de bilhete de embarque, carimbo de passaporte, linha de rota |
| Educação | margem de caderno, marca-texto, estrela de nota |

Para cada motivo, registre no style guide:
- **o que é** (uma linha) e **onde aparece** (quais componentes e chrome);
- **como se desenha** na stack (SVG, borda tracejada, máscara, fonte);
- **intensidade**: protagonista (o elemento assinatura, com no máximo um protagonista por tela) ou detalhe (aparece discreto, como textura).

Regras:
- Motivo é **traço**, não fantasia. Não é skeuomorfismo (ingresso com textura de papel e sombra 3D). É o picote.
- O motivo precisa aparecer no chrome ou em pelo menos 3 componentes. Se aparece uma vez só, é enfeite.
- Legibilidade vence motivo. Se o motivo atrapalha a leitura de um dado, ele sai daquele lugar.

## Voz e microcopy

O texto também é design. Defina:
- **3 regras de tom** (ex.: "direto como um apito", "fala como quem organiza a pelada", "nunca culpa o usuário");
- **glossário do domínio**: a palavra certa e a proibida (ex.: "partida", não "evento"; "horário livre", não "slot disponível");
- **exemplos**: título de vazio, erro de rede, sucesso do loop principal e rótulo do CTA principal, na voz do app.

Regras: verbo de ação nos botões, erro explica a causa e a saída, nada de jargão técnico, gíria só se o público usa e sem forçar.

## Momentos

Todo app tem 2 a 4 momentos em que o usuário sente alguma coisa. É aí que o designer investe além do padrão:
- **Conclusão do loop principal** (reservou, pagou, publicou, terminou o treino): sempre é um momento.
- **Primeira abertura** e **primeiro estado vazio**: a primeira impressão.
- **Conquista ou marco** (se o domínio tem: sequência, meta, nível).
- **Espera** que não dá para evitar (pagamento processando, busca de motorista).

Para cada momento, registre: o que o usuário sente, o conceito visual e o movimento (ex.: "ingresso sobe de baixo e recebe o carimbo 'Confirmada' com haptic de sucesso; 600 ms; não bloqueia o toque"). Momentos podem ter até ~800 ms de animação, desde que não bloqueiem a interação e respeitem "reduzir movimento".

## Cor

- **60/30/10**: neutros (fundo e superfícies) / cor de marca / acento. Acento raro é acento forte.
- **Neutros tingidos** levemente com a matiz da marca (cinza quente ou frio), nunca um cinza puro qualquer.
- **Escalas de 11 passos** (50 a 950) para marca, acento e neutros. As cores semânticas (sucesso, aviso, perigo) são ajustadas para harmonizar com a marca, não os padrões saturados de framework.
- **Escuro não é inversão**: o fundo não é `#000` puro (use neutro 950/900 tingido), superfícies elevadas ficam **mais claras** e a cor de marca é clareada ou dessaturada para manter o contraste sem vibrar.
- **Significados fixos**: evite como cor de marca uma cor que conflita com estado (vermelho num app financeiro vira "erro").
- **Contraste** é validado pelo script, não no olho.

## Tipografia

- No máximo 2 famílias (display + texto). Uma família só, com pesos bem usados, também é uma escolha forte.
- Licença livre para app (OFL, Google Fonts) ou fonte do sistema.
- Use a fonte do sistema (SF Pro / Roboto) quando a sensação nativa importa mais que a marca (utilitários, produtividade densa).
- Teste mental: a fonte do corpo precisa funcionar em 13 px, peso 400, numa tela Android barata.

Sugestões (Google Fonts, OFL):

| Personalidade | Display | Corpo |
|---|---|---|
| Geométrica, tech, limpa | Sora, Outfit, Urbanist, Plus Jakarta Sans | Plus Jakarta Sans, Manrope |
| Humanista, acessível | Figtree, Onest | Figtree, DM Sans, Nunito Sans |
| Editorial, sofisticada | Fraunces, Instrument Serif, DM Serif Display, Young Serif | Inter, DM Sans, Source Sans 3 |
| Amigável, arredondada | Fredoka, Baloo 2, Nunito | Nunito, Nunito Sans |
| Esportiva, impacto | Barlow Condensed, Anton, Bebas Neue, Oswald | Barlow, Inter |
| Técnica, dados | Space Grotesk, JetBrains Mono (números) | IBM Plex Sans, Inter |
| Contemporânea com caráter | Bricolage Grotesque, Schibsted Grotesk, Syne | Inter, Geist, Figtree |

## Estilo de imagem

| Técnica | Quando usar | Cuidado |
|---|---|---|
| Fotografia editorial | conteúdo real: comida, lugares, pessoas, produtos | foto genérica não tem alma: defina luz, lente e tratamento de cor |
| Ilustração vetorial flat | onboarding, estados vazios; tom leve e amigável | defina traço, tipo de sombra e proporção dos personagens |
| 3D suave (clay) | fintech jovem, gamificação, tech amigável | arquivos pesados: use em poucos lugares |
| Line art monocromática | produtividade, saúde, serviços; elegante e leve | some em fundo escuro se o traço for fino |
| Isométrica | explicar sistemas e processos (logística, B2B) | fica datada se exagerar nos detalhes |
| Abstrato / gradiente granulado / formas | bem-estar, música, marca forte sem figura humana | pode virar papel de parede sem significado |
| Colagem / recorte | moda, cultura, público jovem | difícil manter a consistência entre imagens |
| Sem imagem (tipografia + cor) | utilitários, finanças densas | exige tipografia e cor muito bem resolvidas |

Regras:
- **Uma técnica** para todas as ilustrações. Fotos, só para conteúdo.
- Pessoas com diversidade brasileira real. Nada de modelo de banco de imagem sorrindo para a câmera sem motivo.
- Ícones de interface vêm da biblioteca de ícones, nunca de imagem gerada.

## Checagem anti-genérico (antes de fechar a direção)

- [ ] Não é roxo ou azul com gradiente sem motivo.
- [ ] Não é Inter + azul `#3B82F6` + card branco com sombra, a não ser que a justificativa seja explícita.
- [ ] Existe um elemento assinatura reconhecível num print de uma tela só.
- [ ] A linguagem visual tem motivos que vêm **do domínio**, não de "tendências de UI".
- [ ] Trocando o nome do app por um de outro domínio, o design deixa de fazer sentido (bom sinal).
- [ ] A tab bar e os headers foram pensados nesta direção, não herdados.
- [ ] Os textos de exemplo (vazio, erro, sucesso) soam como este app, não como qualquer app.
- [ ] O app tem vida no nível que o assunto pede: fundo ambiente, transições e celebração definidos (ou nível 0 justificado).
- [ ] Emoji não faz papel de ícone.
- [ ] Blur/vidro só onde a direção pede, não em tudo.

## Plataforma

- **Identidade mora em tudo o que aparece**, inclusive no chrome: tab bar, headers, sheets e toasts são desenhados com a direção (ver [09-componentes-proprios.md](09-componentes-proprios.md)). Herde da plataforma o **comportamento**, não a aparência.
- Continuam nativos: gestos (voltar por gesto no iOS, botão voltar no Android), teclado, seletores de data e hora, share sheet, pedidos de permissão e haptics.
- A direção pode **escolher** usar materiais do sistema (vidro do iOS 26, superfícies tonais do Material 3 Expressive) dentro dos componentes próprios, quando combinam com ela. É escolha, não padrão.
- Adapte por plataforma o que o usuário espera: alinhamento do título (grande à esquerda ou centralizado no iOS; à esquerda no Android), ripple no Android e feedback de opacidade/escala no iOS, posição dos botões em diálogos.
