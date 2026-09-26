# Brief — Mony

## Status

- [x] 0. Contexto e inventário (rede de segurança: branch `main`, base = commit `fa6ac49`; decisão do usuário: sem branch nova)
- [x] 1. Brief
- [x] 2. Telas e funcionalidades (sem entrevista, por decisão do usuário em 2026-09-25: refino **só visual**; as specs em `docs/specs/` são o contrato de funcionalidades)
- [x] 3. Direção de arte
- [x] 4. Design system (tokens validados)
- [ ] 5. Composição, componentes, specs e checkpoint (aprovado em: —)
- [ ] 6. Prompts de imagem
- [ ] 7. Código
  - [ ] base: tema, primitivas, chrome, componentes de domínio, dados, catálogo
  - [ ] tela-chave revisada e aprovada no checkpoint visual (em: —)
  - [ ] telas prontas (≥ 2 rodadas de revisão): 0 de 22
  - [ ] passe de acabamento
- [ ] 8. Imagens integradas: 0 de N
- [ ] 9. Entrega

### Refino

- Iniciado em 2026-09-25 (`/app-design refinar todo design.`).
- [x] 1. Rede de segurança: árvore limpa na `main` (só `.claude/skills/` não rastreado). O usuário optou por não criar branch. Base de comparação: `fa6ac49`.
- [x] 2. Diagnóstico (Rodada 0, por código; ver `design/revisao.md`)
- [x] 3. Mantém / revê
- [x] 4. Direção completa (style guide)
- [x] 5. Composição, componentes, specs e checkpoint (aprovado em 2026-09-25)
- [ ] 6. Código (Fase 7 a partir do passo 2)
  - [x] Fase 6: `prompts.md` + `assets.json`; ícone/splash gerados do logo do cliente (`apps/mobile/assets/`); registro `src/theme/images.ts`
  - [x] tokens: `design/tokens.json` → `packages/ui-tokens/src/generated.ts` (`pnpm --filter @mony/ui-tokens sync`); exportados como `tokens`; os nomes antigos (`color`, `spacing`…) seguiram exportados de `legacy.ts` até a migração acabar (removido em 2026-09-26)
  - [x] componentes antigos movidos para `apps/mobile/src/components/legacy-ui/` (telas antigas continuaram compilando; pasta removida em 2026-09-26)
  - [x] tema: `src/theme/` (`ThemeProvider`, `useTheme`, `useThemedStyles`, `useMotion`)
  - [x] dev: `src/dev/flags.ts`, `design-lab.ts`, API mock em memória `src/dev/mock-api/` ligada no `apiFetch`
  - [x] dependências instaladas pelo usuário (2026-09-25)
  - [x] Jest: gesture-handler `jestSetup`, keyboard-controller mock, Reanimated `setUpTests`, resolver do Worklets
  - [x] Metro: busca hierárquica religada (o Reanimated precisa do `semver` 7 da pasta dele no pnpm)
  - [x] fontes (só os 6 `.ttf` usados), haptics, splash/ícone no `app.json`, `App.tsx` com providers
  - [x] primitivas (`components/ui/`), chrome (`LedgerTabBar`, `TopBar`/`LargeTitle`, `ScrollScreen`, `FormScreen`, `PaperSheet`, `ConfirmSheet`, `LedgerToast`, estados), efeitos (`Highlight`/`SlidingMarker`, `DoubleRule`, `useCountUp`, `InkBloom`)
  - [x] domínio: `PeriodLedger`, `MoneyHero`, `GoalRuler`, `YearLedgerChart`, `StatusStamp`, `NotebookSwitch`, `Initials`
  - [x] navegação: tab bar própria com botão Lançar; Perfil vira tela empilhada; rotas de dev (Catálogo, Design system, cópias das telas de entrada)
  - [x] Catálogo de Telas + tela Design system + pílula do Lab + simulação de aparelho (carregados só em `__DEV__`; conferido que não entram no bundle de produção)
  - [x] Início reescrito (tela-chave) e testado pelo usuário
  - [x] transição: Mais ganhou Perfil e Sair (visual antigo até ser refeita)
  - [x] **2026-09-25: direção "Caderno de Contas" reprovada pelo usuário** ("não gostei do design", "muitas fontes cortando"). Nova direção **"Índigo Suave"** a partir da imagem de referência enviada por ele; só tema claro. Refeitos: tokens, tipografia (só Manrope, altura de linha ≥ 1,4×), tema, primitivas, chrome, componentes de domínio, Início, catálogo e Design system.
  - [x] rodada 2 do usuário: valor do saldo cortado (corrigido: trechos aninhados sem altura de linha própria) e toasts (refeitos)
  - [x] rodada 3 do usuário: "Início muito bonito, tab bar show de bola"; pediu um hero melhor no topo → `BalanceHero` (faixa em gradiente de ponta a ponta, saudação, seletores em vidro, saldo em branco; cartão de resumo sobre a borda); manchas animadas removidas
  - [x] Lançamentos (dias em cartões, pílula de status, deslizar para excluir, seleção com barra flutuante, `ConfirmSheet`) e Lançamento (form) (valor em destaque, CTA grudado no teclado, toast com o valor ao salvar) — aguardando o usuário
  - [x] E2E Maestro ajustado à navegação/cópias novas (saudação, Sair em Mais, Perfil via Mais, "A pagar", confirmação própria)
  - [x] usuário aprovou Início, Lançamentos, Lançamento (form) e Design system (2026-09-25)
  - [x] demais telas refeitas (2026-09-25): Metas, Meta (form), Mais, Perfil, Alterar senha, Dívidas, Dívida (+ pagar parcela), Dívida (form), Mercado (+ orçamento), Item (form), Veículos, Veículo (+ quilometragem), Veículo (form), Categorias (+ substituição), Categoria (form), Entrar, Criar conta, Esqueci a senha, Redefinir senha — **aguardando a revisão do usuário**
  - [x] nenhum `Alert.alert` restante; nenhuma tela importa `legacy-ui` nem os tokens antigos; `docs/steering/design-system.md` reescrito
  - [x] usuário aprovou todas as telas ("do jeito que ficou todas as telas estão perfeitas", 2026-09-26)
  - [x] `CATALOG_ON_START = false` e `MOCKS_BY_DEFAULT = false` (src/dev/flags.ts): o dev volta a abrir no fluxo normal contra a API real; catálogo e mocks seguem pela pílula do Lab
  - [x] revisões code-reviewer, performance-auditor e lgpd-security-reviewer (2026-09-26), achados corrigidos:
    - regressões: pílula "Faltando" no Mercado; rótulo "Saldo disponível" (saldo zerado quando estoura, como na spec); foto de veículo volta ao marcador quando a URL assinada expira; sheet de substituição de categoria abre só depois que a confirmação sai (iOS não empilha dois `Modal`);
    - "Criar categoria" no form de lançamento: já vem com o tipo atual e a lista de categorias recarrega ao voltar;
    - erros dentro de telas modais aparecem na própria tela (no iOS o toast fica atrás do modal);
    - acessibilidade: ação "Marcar como pago/pendente" na linha do lançamento; nomes pt-BR de cores e ícones nos seletores; texto comum segue a escala de fonte do sistema sem teto;
    - LGPD: cache do TanStack Query limpo quando o usuário da sessão muda; sessão de mock sai ao desligar os mocks; cópias de dev das telas de entrada não trocam a sessão aberta;
    - desempenho: callbacks estáveis e busca isolada em Lançamentos, seções com chave, linhas não remontam ao entrar na seleção, `useMotion` compartilhado, barras e progresso animados por transform, Início sem remontar ao escolher "Período", toast com animação de saída;
    - `Field` compartilhado em `components/ui/`; registro de imagens com chaves em inglês (`emptyTransactions`…; script com `"idioma": "en"`);
    - `docs/steering/tech.md` e `structure.md` atualizados; nome do usuário editado no Perfil aparece no Início/Mais; troca de caderno recarrega os dados.
  - [x] qa-engineer (2026-09-26): 52 suites / 164 testes; fluxos Maestro revisados (Mercado, Categorias em uso, Perfil, data do lançamento, abertura do app); cache de categorias invalidado ao excluir
  - [x] workflow-guardian (2026-09-26): checagens limpas; mensagens de commit rascunhadas para o usuário aplicar
- [ ] 7. Data do refinamento (2026-09-25 → 2026-09-26) + entrega

**Próximo passo:** usuário aplica os commits (legado removido em 2026-09-26); gerar as ilustrações (opcional) e rodar `/app-design imagens`.

## Projeto

- **Stack:** Expo SDK 57 · React Native 0.86 (Nova Arquitetura) · TypeScript · monorepo pnpm + turbo.
- **Roteador (mantido):** React Navigation 7 (`native-stack` + `bottom-tabs`), em `apps/mobile/src/navigation/RootNavigator.tsx`. Não é expo-router.
- **Serviços de dados / auth (mantidos):** `lib/api-client.ts` (`apiFetch` com refresh de token), TanStack Query 5, Zustand (`auth-store` com SecureStore, `workspace-store`, `toast-store`), react-hook-form + zod (`@mony/shared-types`).
- **i18n:** nenhum. Textos PT-BR direto no código (regra do `CLAUDE.md`: UI em PT-BR; código, comentários e mensagens da API em inglês).
- **Convenções de código:** identificadores e comentários em inglês; telas em `src/screens/<feature>/`; utilitários em `src/lib/`; testes Jest (`*.test.tsx`) e Maestro (`e2e/flows/*.yaml`) apoiados em `testID`.
- **Onde fica a camada nova** (conciliando a skill com a regra 7 do `CLAUDE.md`, que exige `@mony/ui-tokens` + `components/ui/`):
  - tokens: `design/tokens.json` (fonte) → `packages/ui-tokens/src/` (gerado por script, claro + escuro);
  - tema: `apps/mobile/src/theme/` (`ThemeProvider`, `useTheme`, fontes, `useMotion`);
  - primitivas e chrome: `apps/mobile/src/components/ui/` (reescrito do zero; nenhum arquivo novo imita o antigo);
  - componentes de domínio: `apps/mobile/src/components/domain/`;
  - efeitos (vida): `apps/mobile/src/components/effects/`;
  - dev (DesignLab, Catálogo, API mock): `apps/mobile/src/dev/`.
- **Pasta de assets:** `apps/mobile/assets/images/`.
- **Checagem:** `pnpm --filter @mony/mobile typecheck && pnpm --filter @mony/mobile lint && pnpm --filter @mony/mobile test`.
- **Rodar:** `pnpm --filter @mony/mobile dev` (Expo Go). Revisão visual: emulador Android (`Pixel_10_Pro_XL`) + `adb exec-out screencap`.
- **Git:** `main`, sem branch de trabalho. Commits são sempre do usuário (regra 5 do `CLAUDE.md`).

## Assunto

"refinar todo design." App de finanças pessoais Mony: reconstrução mobile (Expo) do app PHP legado, com API NestJS. O usuário pediu o refino de todo o design, só visual, com identidade livre (o logo fica só no ícone).

## Diagnóstico

- **Público:** adultos brasileiros de 25 a 55 anos que organizam o dinheiro da casa. Parte deles tem um negócio pequeno (o caderno "Empresarial"). Não são especialistas em finanças: querem saber se o mês fecha.
- **Contexto de uso:**
  - em casa, à noite, revendo o mês (sessão calma, duas mãos);
  - logo depois de pagar uma conta (marcar como pago; uma mão, em pé);
  - no supermercado, com a lista (uma mão, carrinho na outra, luz forte);
  - no posto ou na oficina (atualizar a quilometragem).
- **Frequência e duração:** várias vezes por semana, sessões curtas (30 s a 2 min); uma revisão mais longa no começo ou no fim do mês.
- **Loop principal:** abrir → ver como está o mês (saldo, o que falta pagar) → lançar uma despesa ou receita, ou marcar uma conta como paga. No máximo 2 toques da abertura até o formulário de lançamento.
- **Tom emocional:** dinheiro dá ansiedade. O app tem que passar **calma e controle**: a casa em ordem, sem alarme e sem sermão.
- **Restrições:**
  - marca livre (o logo "M" fica só como ícone do app até ser redesenhado);
  - Expo Go no iOS (sem Xcode local): toda dependência nativa precisa estar no Expo Go do SDK 57;
  - testes Jest e Maestro apoiados em `testID`: os `testID` existentes são preservados;
  - LGPD: dados financeiros e pessoais; nada de dado real nos mocks.

## Premissas assumidas

- O loop principal é lançar e conferir o mês; a tela-chave é **Início**. (confirmar no checkpoint)
- Tema claro e escuro seguindo o sistema (o app hoje só tem claro; `app.json` já está em `automatic`).
- A navegação pode ser redesenhada (é design, não funcionalidade), desde que toda funcionalidade continue alcançável e os `testID` continuem existindo.
- Mover ações de lugar (ex.: "Sair" sai do Início e vai para Mais) é layout, não remoção.

## Dependências novas

Todas estão no `bundledNativeModules.json` do Expo SDK 57 (funcionam no Expo Go).

| Pacote                                              | Para quê                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `react-native-reanimated` + `react-native-worklets` | microinterações, transições de layout, header que reage ao scroll, números que contam, carimbo, marca-texto |
| `react-native-gesture-handler`                      | deslizar linha para revelar ação, arrastar sheet para fechar                                                |
| `react-native-keyboard-controller`                  | comportamento de teclado desenhado (formulários, sheets com campo, CTA grudado no teclado)                  |
| `expo-haptics`                                      | haptics do carimbo, do marca-texto e dos momentos                                                           |
| `expo-font` + `@expo-google-fonts/manrope`          | tipografia da direção                                                                                       |
| `expo-splash-screen`                                | segurar a splash até as fontes carregarem (sem salto de fonte)                                              |
| `expo-system-ui`                                    | cor de fundo da janela = `background` do tema (sem flash branco)                                            |

## Animações pendentes

Nenhuma por enquanto: carimbo, marca-texto, traço duplo e hodômetro são desenhados em código.

| Slot | Onde | Formato | Origem sugerida | Status |
| ---- | ---- | ------- | --------------- | ------ |

## Legado (sem uso depois do redesign)

Removido com o ok do usuário em 2026-09-26.

| Item                                                                                                      | Tipo                                            | Remover? |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- |
| `apps/mobile/src/components/legacy-ui/` (16 componentes do kit antigo)                                    | componentes antigos, sem uso                    | removido |
| `packages/ui-tokens/src/legacy.ts` + exports `color`, `spacing`, `radius`, `typography`, `shadow`, `size` | tokens antigos, sem uso no app                  | removido |
| `react-native-gifted-charts`                                                                              | lib de gráfico, sem uso (gráfico anual próprio) | removido |
| `@expo-google-fonts/fraunces`                                                                             | fonte da direção reprovada, sem uso             | removido |

## Decisões

| Data       | Decisão                                                                              | Por quê                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-25 | Refino só visual; specs atuais = contrato                                            | escolha do usuário                                                                                                           |
| 2026-09-25 | Identidade livre; logo "M" só no ícone                                               | escolha do usuário                                                                                                           |
| 2026-09-25 | Trabalho direto na `main`                                                            | escolha do usuário                                                                                                           |
| 2026-09-25 | Docs de `design/` em PT-BR                                                           | escolha do usuário (`design/` fica fora de `apps/`, `packages/` e `docs/`)                                                   |
| 2026-09-25 | Camada nova dentro de `@mony/ui-tokens` + `components/ui/` (+ `domain/`, `effects/`) | conciliar a skill com a regra 7 do `CLAUDE.md`                                                                               |
| 2026-09-25 | Ícones continuam `Ionicons` (`@expo/vector-icons`)                                   | o ícone de cada categoria é gravado no banco como nome de glifo Ionicons; uma biblioteca só                                  |
| 2026-09-25 | Direção trocada para "Índigo Suave" (referência do usuário)                          | o usuário reprovou "Caderno de Contas" e enviou a referência; o logo "M" aprovado continua                                   |
| 2026-09-25 | Só tema claro                                                                        | pedido explícito do usuário; `color.dark` no `tokens.json` é cópia do claro só para o validador; `userInterfaceStyle: light` |
| 2026-09-25 | Manrope única, altura de linha ≥ 1,4×                                                | texto cortado no Android com alturas de 1,17–1,33×                                                                           |
| 2026-09-25 | Diagnóstico (Rodada 0) por código, sem prints do "antes"                             | rodar o app real exige a API + `.env`, cuja leitura foi bloqueada; o "antes" está no commit `fa6ac49`                        |
