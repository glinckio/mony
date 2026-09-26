# Style guide — {Nome do app}

## Direção: {Nome da direção}
{Conceito em uma frase.}

- **Atributos:** {a}, {b}, {c}
- **Referências:** {App X} ({o que tirar dele}), {App Y} ({o que tirar dele}), {referência de fora dos apps: placar, sinalização, embalagem...} ({o que tirar dela})
- **Elemento assinatura:** {a coisa memorável e repetida}

## Linguagem visual
| Motivo | O que é | Onde aparece | Como se desenha | Intensidade |
|---|---|---|---|---|
| {picote} | {recorte lateral de ingresso} | {MatchTicket, confirmação, comprovante} | {2 círculos com a cor de fundo + linha tracejada `border`} | protagonista |
| {algarismos de placar} | {números grandes condensados} | {hora, código, preço herói} | {token `score`} | detalhe |

## Voz
- **Tom:** {regra 1}; {regra 2}; {regra 3}
- **Glossário:** {use "partida"} / {evite "evento"}; {use "horário livre"} / {evite "slot"}
- **Exemplos:**
  - Vazio principal: {…}
  - Erro de rede: {…}
  - Sucesso do loop: {…}
  - CTA principal: {…}

## Momentos
| Momento | O que o usuário sente | Conceito visual | Movimento e haptic |
|---|---|---|---|
| {Reserva confirmada} | {garantiu o jogo} | {ingresso recebe o carimbo} | {sobe + carimbo; 600 ms; haptic de sucesso} |

## Vida
- **Nível:** {2 · Vivo}: {por quê, pelo assunto e pelo público}
- **Fundo ambiente:** {aurora de 3 manchas nas cores da marca, ciclo de 14 s} · onde: {boas-vindas, topo da Home (some ao rolar), confirmação, vazios} · reduzido: {primeiro quadro estático} · barato: {gradientes radiais sem blur}
- **Transições de tela:** {card da lista → detalhe com a foto crescendo; sheets recuam o fundo}
- **Scroll:** {header grande → compacto; parallax 0,5× no herói; fade nas bordas das listas horizontais}
- **Dados vivos:** {preços e contadores contam até o valor; selo "ao vivo" pulsando}
- **Espera:** {skeleton com brilho na cor `surfaceMuted`; loader próprio com o motivo}
- **Celebração:** {no fim do loop: carimbo + partículas do acento, 650 ms, haptic de sucesso}
- **Ilustração animada:** {estados vazios com leve flutuação em código | Lottie pendente: …}
- **Sensores:** {parallax leve pelo giroscópio no fundo da boas-vindas | nenhum}

## Chrome
Resumo (decisões completas em `design/componentes.md`):
- **Tab bar:** {forma, fundo, indicador do ativo, comportamento}
- **Headers:** {grande no conteúdo / compacto ao rolar / transparente sobre imagem}
- **Sheets e toasts:** {forma e entrada}

**Alternativas descartadas**
- **{Nome}**: {uma linha}. Descartada porque {motivo}.
- **{Nome}**: {uma linha}. Descartada porque {motivo}.

## Paleta
| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| background | `#` | `#` | fundo das telas |
| surface | `#` | `#` | cards, inputs |
| primary | `#` | `#` | ação principal |
| accent | `#` | `#` | destaque raro |
| text | `#` | `#` | texto principal |
| textMuted | `#` | `#` | texto secundário |

Estratégia: {marca dominante ou neutro + acento; claro ou escuro por padrão; por quê}

## Tipografia
- **Display:** {Família} ({pesos}): {por quê}
- **Texto:** {Família} ({pesos}): {por quê}
- **Escala:** base {16}, proporção {1,25}: {por quê, pela personalidade da direção}

| Token | Tamanho / altura | Peso | Família |
|---|---|---|---|
| display | 34 / 40 | 700 | |
| title1 | 28 / 34 | 700 | |
| body | 16 / 24 | 400 | |
| caption | 12 / 16 | 500 | |

## Forma, espaço e elevação
- **Linguagem de forma:** {afiada / suave / pílula}; raios {sm, md, lg}
- **Densidade:** {compacta / arejada}; padding de tela {n}
- **Elevação:** {sombra ou borda; como funciona no escuro}

## Ícones
- Biblioteca: {nome}, estilo {regular/fill/duotone}, tamanhos 16/20/24

## Movimento
- **Personalidade:** {preciso / elástico / calmo}
- **Transições de tela:** {tipo; continuidade entre a peça tocada e a tela seguinte}
- **Feedback de toque por tipo de peça:** {botão: …; item de lista: …; peça selecionável: …}
- **Microinterações:** {onde e como; as de cada componente de domínio ficam em `componentes.md`}
- **Haptics:** {em quais ações}

## Imagens
### Onde entra cada tipo
- **Fotos:** {onde}
- **Ilustrações:** {onde}
- **Sem imagem:** {onde a UI é só tipografia e cor}

### Bloco de estilo: fotos
```text
{Parágrafo fixo colado em todo prompt de foto: técnica, luz, lente, tratamento de cor, paleta com nome + hex, clima.}
```

### Bloco de estilo: ilustrações
```text
{Parágrafo fixo colado em todo prompt de ilustração: técnica, traço, sombreamento, paleta com nome + hex, proporção dos personagens, nível de detalhe.}
```

### Bloco de estilo: efeitos
```text
{Parágrafo fixo colado em todo prompt de efeito (wallpaper, luz, textura, peças): técnica (pintura digital suave, fotografia de luz, textura fotográfica), paleta com nome + hex e onde cada cor domina, qualidade da luz (quente/fria, difusa/dura), grão, nível de suavidade, clima. Sem objetos reconhecíveis nem pessoas.}
```

### Efeitos gerados (matéria-prima da vida)
| Arquivo | Tipo | Onde | Como anima |
|---|---|---|---|
| `{luz_refletor.png}` | luz | {topo da Explorar, confirmação} | {pulsa devagar; o feixe varre 6° em 12 s} |
| `{textura_giz.png}` | textura | {cartão-quadra, fundo da tab bar} | {parada, 8% de opacidade} |

## Plataforma
- **iOS:** {adaptações}
- **Android:** {adaptações}
