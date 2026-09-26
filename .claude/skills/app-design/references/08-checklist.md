# Checklist de qualidade

Passe no fim do código (Fase 7) e depois de integrar imagens (Fase 8). Marque o que não se aplica como "n/a". Qualquer item reprovado: corrija ou registre como pendência no brief.

## Do zero
- [ ] Nenhum arquivo novo importa tema, componente, estilo ou lib de UI antiga (procure os caminhos antigos nos imports da camada nova e das telas).
- [ ] Toda rota antiga que ficou aponta para a tela nova. Deep links e notificações continuam abrindo o lugar certo.
- [ ] Seção "Legado" do `brief.md` lista o que ficou sem uso (arquivos, pastas, dependências), pronta para oferecer a remoção.

## Funcionalidades
- [ ] Cada funcionalidade combinada na entrevista (`telas.md`) está implementada e alcançável.
- [ ] Nenhuma funcionalidade marcada como removida aparece.
- [ ] Regras de negócio do inventário preservadas (validações, permissões por perfil, limites).
- [ ] Funcionalidade que já tinha serviço real: a implementação real da camada de dados delega para ele e funciona com `USAR_MOCKS` desligado.

## Design system
- [ ] `validar_tokens.py` passa sem falhas.
- [ ] Nenhuma cor, fonte, tamanho de fonte, espaçamento ou raio hardcoded nas telas. Procure hex e números mágicos nos arquivos de tela (ex.: `#[0-9a-fA-F]{3,8}`, `Color(0x`, `fontSize: 1`).
- [ ] Fontes carregadas antes da primeira tela (sem flash de fonte do sistema).
- [ ] A tela "Design system" do catálogo mostra todos os tokens, nos dois temas.

## Componentes próprios e chrome
- [ ] Toda tela P1 tem o conteúdo principal feito com componentes de domínio, e nenhum deles falha no teste do componente genérico ([09](09-componentes-proprios.md)).
- [ ] Cada componente de domínio tem os estados de domínio e a microinteração própria de `design/componentes.md`.
- [ ] Tab bar própria: ativo reconhecível sem cor, alvo ≥ 48, safe area, some nas telas de tarefa e com o teclado, tocar na aba ativa volta ao topo, papel e estado acessíveis. (Tab bar nativa só com a exceção registrada em Decisões.)
- [ ] Header, voltar, sheet, toast, confirmação e barra de ação fixa seguem as decisões de chrome. Nenhum ficou no visual padrão da lib.
- [ ] Toda mensagem do inventário (`componentes.md`) usa a superfície certa e a peça da família própria: confirmações com a consequência e o objeto afetado, botões com verbo, ação reversível com "Desfazer" em vez de confirmação, erro de campo inline.
- [ ] Modais: fecham por gesto, backdrop e botão voltar; loader e erro dentro do modal; foco entra e volta; nunca modal sobre modal. Toasts não cobrem a tab bar nem o CTA.
- [ ] Nada ficou básico por omissão: o que ficou nativo, simples ou parado tem decisão registrada no brief.
- [ ] Os motivos da linguagem visual aparecem onde o style guide diz, e em nenhum lugar a mais.
- [ ] Os momentos da direção de arte estão implementados.
- [ ] Textos na voz do app (títulos, CTAs, vazios, erros), usando o glossário.

## Vida
- [ ] O nível de vida do style guide foi aplicado: telas de tarefa um nível abaixo, momentos um nível acima.
- [ ] Cada tela tem as camadas de vida da spec (ambiente, transição, scroll, dados vivos, espera, celebração) e respeita o orçamento: 1 efeito ambiente e 1 loop extra no máximo.
- [ ] Nenhuma tela P1 está "parada": o scroll, a troca de estado e o fim da tarefa têm resposta visual.
- [ ] Texto sobre fundo animado passa no contraste do pior quadro (pares em `contrastChecks`).
- [ ] Todo efeito tem versão "reduzir movimento" (conferida com o DesignLab) e versão barata para aparelho fraco.
- [ ] Efeitos pausam fora da tela e com o app em segundo plano. Sem queda de fps ao rolar.
- [ ] Animações que dependem de arquivo (Lottie/Rive) têm versão estática no lugar e estão listadas em "Animações pendentes" no brief, se faltarem.

## Revisão visual
- [ ] Toda tela passou por ≥ 2 rodadas de revisão com print, registradas em `design/revisao.md`, e a última sem problema alto ou médio.
- [ ] A tela-chave foi aprovada no checkpoint visual (ou `--direto`).
- [ ] O passe de acabamento no app inteiro foi feito e registrado.
- [ ] Nenhuma tela P1 cai nos padrões genéricos de [04](04-telas-e-fluxos.md) (seção 5.3) sem justificativa na spec.

## Telas
- [ ] Toda tela de `telas.md` está como Pronta no registro de telas e no catálogo.
- [ ] Todo estado (normal, vazio, carregando, erro e os específicos) implementado e alcançável pelo catálogo.
- [ ] Escuro revisado tela a tela: nada sumindo, nada com contraste errado, imagens transparentes legíveis sobre o fundo escuro.
- [ ] Modo de borda de cada tela aplicado como na spec: sem faixa morta acima do herói; nada tocável ou legível atrás da ilha, da status bar, do indicador de home ou da barra do Android; listas passam por baixo da tab bar com o último item alcançável; status bar com o estilo certo em cada tela.
- [ ] Nenhum `SafeAreaView` do React Native (obsoleto); insets aplicados por peça.
- [ ] Tela pequena (375 × 667) sem corte e tela grande (430 × 932) sem vazio estranho.
- [ ] Texto longo trunca ou quebra com elegância (os mocks têm o caso de borda).
- [ ] Teclado: cada tela com campo segue o comportamento da spec (campo focado e próxima ação visíveis, CTA grudado ou no fim, tab bar some, nada pula, fecha ao tocar fora ou arrastar). Revisado com o teclado aberto em emulador, aparelho ou prints do usuário.
- [ ] Formulários: teclado certo, "próximo" entre campos, autocomplete e `textContentType`.
- [ ] Listas longas virtualizadas.

## Acessibilidade
- [ ] Alvos de toque ≥ 44 pt (iOS) / 48 dp (Android).
- [ ] Botões só com ícone têm rótulo acessível.
- [ ] Imagens decorativas escondidas do leitor de tela; informativas com descrição.
- [ ] Layout aguenta fonte do sistema em 130%.
- [ ] "Reduzir movimento" desliga as animações não essenciais.
- [ ] Informação nunca depende só de cor (estado de erro tem ícone/texto além do vermelho).

## Imagens
- [ ] Toda imagem vem do registro, via AppImage. Nenhum caminho solto nas telas.
- [ ] Sem imagem esticada ou borrada (o relatório do script não tem aviso de resolução em slot importante).
- [ ] Sem texto dentro das imagens.
- [ ] Imagens de efeito: luz convertida em transparência (sem halo preto sobre fundo claro), textura sem emenda visível quando repetida, wallpaper com zona calma sob o conteúdo e sem borda aparecendo quando anima, variante `_claro`/`_escuro` onde o fundo depende do tema.
- [ ] @3x com menos de ~400 KB cada.
- [ ] Ícone e splash configurados com as cores dos tokens.

## Movimento e feedback
- [ ] Todo elemento tocável tem estado pressionado, com o feedback do seu tipo de peça (não o mesmo em tudo).
- [ ] Mudanças de layout e de valor animam em vez de pular.
- [ ] Transições ≤ 400 ms, com easing dos tokens.
- [ ] Haptic nas ações importantes, sem exagero.

## Produção
- [ ] Catálogo, atalho, tela Design system e DesignLab protegidos pela guarda de dev.
- [ ] Flag de início do catálogo em `false` se todas as telas estão prontas.
- [ ] Camada de dados isolada: `USAR_MOCKS` desligado em release; funcionalidades só com mock listadas na entrega.
- [ ] Checagem da stack (typecheck, analyze ou build) passando.
- [ ] Nenhuma dependência nova instalada sem uso (as antigas sem uso vão para o Legado, não são removidas sem ok).
