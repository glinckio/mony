# Telas — Mony

## Inventário do app atual

Feito na Fase 0 a partir do código (`apps/mobile/src/screens/`, commit `fa6ac49`). Descreve o que cada tela **faz**, não como ela é. Por decisão do usuário (refino só visual), este inventário **é o contrato**: toda funcionalidade abaixo continua existindo, e nenhuma nova entra.

| Tela                     | Arquivo                                   | O que faz hoje                                                                                                                                                                                                                                                                                                                                                                                                            | Regras e integrações                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrar                   | `auth/LoginScreen.tsx`                    | e-mail + senha (olho para revelar); "Esqueceu sua senha?" → Esqueci; "Criar conta" → Cadastro; erro geral acima do botão                                                                                                                                                                                                                                                                                                  | `POST /auth/login`; 403 → "Sua conta está inativa. Entre em contato com o suporte."; 429 → "Muitas tentativas…"; outro → "E-mail ou senha incorretos."; sucesso grava a sessão (SecureStore) e troca para o app               |
| Criar conta              | `auth/RegisterScreen.tsx`                 | nome, e-mail, telefone (opcional), senha, confirmar senha; "Entrar" → Login                                                                                                                                                                                                                                                                                                                                               | `POST /auth/register`; 409 → erro no campo e-mail "Este e-mail já está cadastrado."; validações zod em PT-BR                                                                                                                  |
| Esqueci a senha          | `auth/ForgotPasswordScreen.tsx`           | e-mail → "Enviar código"; depois de enviado: e-mail travado, aviso de sucesso e "Já tenho um código" → Redefinir (leva o e-mail); "Entrar" → Login                                                                                                                                                                                                                                                                        | `POST /auth/password-reset/request`; resposta sempre genérica (não revela se o e-mail existe)                                                                                                                                 |
| Redefinir senha          | `auth/ResetPasswordScreen.tsx`            | e-mail, código de 6 dígitos, nova senha, confirmar; sucesso vira tela "Senha redefinida" com "Ir para o login"                                                                                                                                                                                                                                                                                                            | `POST /auth/password-reset/confirm`; 429 → "Muitas tentativas…"; outro → "Código inválido ou expirado."                                                                                                                       |
| Início                   | `dashboard/DashboardScreen.tsx`           | "Bem-vindo, {nome}"; seletor Dia / Semana / Mês / Personalizado (com De/Até DD/MM/AAAA); saldo (verde/vermelho); receitas, despesas pagas, despesas pendentes, % da renda comprometida; variação de receita vs. período anterior (se existir); média diária de despesas; metas em andamento (título, barra, "x de y"; tocar → Metas); "Ver todas" → Metas; gráfico de barras receitas × despesas no ano; botão **Sair**   | `GET /dashboard?period=…(&dateFrom&dateTo)`; personalizado só busca com as duas datas válidas; recarrega ao voltar para a aba; filtrado pelo caderno ativo (servidor)                                                         |
| Lançamentos (Transações) | `transactions/TransactionsListScreen.tsx` | filtro Todos / Despesas / Receitas; busca por descrição (debounce 300 ms); lista paginada infinita (20 por página) com pull-to-refresh; linha: descrição, data, valor (receita verde); despesa tem botão de status Pago ↔ Pendente; lixeira por linha; toque → editar; toque longo → modo seleção (caixinhas, "N selecionada(s)", "Excluir selecionadas", "Cancelar"); "+" → novo                                         | `GET /transactions?page&perPage&type&search`; `PATCH /transactions/:id/status` (só despesa); `DELETE /transactions/:id` ou `POST /transactions/bulk-delete`; confirmação antes de excluir; invalida dívidas e dashboard junto |
| Lançamento (form)        | `transactions/TransactionFormScreen.tsx`  | modal; tipo Despesa/Receita (travado na edição; trocar limpa a categoria); status Pendente/Pago (só despesa); categoria (chips da categoria do tipo); descrição; valor (máscara R$); data (DD/MM/AAAA); só na criação: "Repetir todo mês" + "Por quantos meses (1-60)"; "Criar transação" / "Salvar alterações"; fechar (×)                                                                                               | `POST /transactions` ou `PATCH /transactions/:id` (edição manda só categoria, descrição, valor, data); `GET /categories?type=`; validação zod                                                                                 |
| Metas                    | `goals/GoalsScreen.tsx`                   | "+" → nova; lista em andamento e "Concluídas"; linha: título, "Atrasada" (prazo passou e não concluída), barra, "x de y (n%)", lixeira; toque → editar                                                                                                                                                                                                                                                                    | `GET /goals`; `DELETE /goals/:id` com confirmação; recarrega ao voltar                                                                                                                                                        |
| Meta (form)              | `goals/GoalFormScreen.tsx`                | modal; título; descrição (opcional); valor da meta; valor atual; data limite (opcional); categoria (opcional, "Nenhuma"); só na edição: "Meta concluída"; "Criar meta" / "Salvar alterações"                                                                                                                                                                                                                              | `POST /goals` ou `PATCH /goals/:id` (com `completed`); `GET /categories`                                                                                                                                                      |
| Mais                     | `more/MoreScreen.tsx`                     | menu: Categorias, Dívidas, Mercado, Veículos (cada um com descrição)                                                                                                                                                                                                                                                                                                                                                      | só navegação                                                                                                                                                                                                                  |
| Perfil                   | `profile/ProfileScreen.tsx`               | (aba) nome, e-mail, telefone, telefone secundário (máscara); "Salvar alterações" com aviso de sucesso; "Alterar senha" → Alterar senha                                                                                                                                                                                                                                                                                    | `GET /users/me`; `PATCH /users/me`; 409 → erro no e-mail                                                                                                                                                                      |
| Alterar senha            | `profile/ChangePasswordScreen.tsx`        | senha atual, nova, confirmar; "Alterar senha"; fechar; sucesso volta                                                                                                                                                                                                                                                                                                                                                      | `POST /users/me/change-password`; 400 "Current password is incorrect." → erro no campo "Senha atual incorreta."                                                                                                               |
| Categorias               | `categories/CategoriesScreen.tsx`         | seções Despesas e Receitas; linha: ícone na cor, nome, editar, excluir; "Nova categoria"; excluir pede confirmação; se a categoria está em uso (400), pede uma substituta do mesmo tipo e exclui migrando                                                                                                                                                                                                                 | `GET /categories` (ao focar); `DELETE /categories/:id(?replacementCategoryId=)`                                                                                                                                               |
| Categoria (form)         | `categories/CategoryFormScreen.tsx`       | modal; nome; tipo Despesa/Receita (travado na edição); cor (paleta fixa); ícone (grade fixa de Ionicons); "Criar categoria" / "Salvar alterações"                                                                                                                                                                                                                                                                         | `POST /categories` / `PATCH` (nome, cor, ícone); `CATEGORY_COLORS`, `CATEGORY_ICONS` do shared-types                                                                                                                          |
| Dívidas                  | `debts/DebtsListScreen.tsx`               | "+" → nova; seções Atrasadas, Ativas, Quitadas (nessa ordem); linha: nome, status, barra, "x de y parcelas pagas", "Restam R$ de R$"; toque → detalhe                                                                                                                                                                                                                                                                     | `GET /debts` (chave inclui o caderno); recarrega ao voltar                                                                                                                                                                    |
| Dívida (detalhe)         | `debts/DebtDetailScreen.tsx`              | editar, excluir (confirmação: "As transações das parcelas também serão excluídas."); resumo: status, total, pago, restante, barra, "x de y parcelas pagas", início/término, juros (informativo), observações; lista virtualizada de parcelas: número, status (Paga / Vencida / Pendente), valor, vencimento, "Paga em"; "Pagar" → sheet; "Desfazer" (confirmação)                                                         | `GET /debts/:id`; `POST …/installments/:id/pay`; `POST …/cancel-payment`; `DELETE /debts/:id`; "Vencida" usa a data UTC (igual ao servidor); invalida lançamentos e dashboard                                                 |
| Pagar parcela (sheet)    | `debts/PayInstallmentSheet.tsx`           | vencimento e valor; data do pagamento (padrão hoje, local); valor pago (padrão = parcela); "Registrar pagamento"; erro inline                                                                                                                                                                                                                                                                                             | 400 → "Esta parcela já está paga." (e recarrega); outro → "Não foi possível registrar o pagamento…"                                                                                                                           |
| Dívida (form)            | `debts/DebtFormScreen.tsx`                | modal; nome; valor total; nº de parcelas; prévia "12x de R$ (a última parcela ajusta os centavos)"; vencimento da 1ª; data final (opcional); juros % a.m. (opcional, informativo); categoria de despesa ("Automática" ou uma); observações; sem categoria de despesa → aviso + "Criar categoria" e botão travado; com parcela paga, nº de parcelas e 1º vencimento travados + aviso                                       | `POST /debts` / `PATCH /debts/:id`; `GET /categories?type=EXPENSE` (recarrega ao voltar); 400 → "Não foi possível salvar. Verifique os dados…"                                                                                |
| Mercado                  | `grocery/GroceryScreen.tsx`               | compartilhar lista (desabilitado até carregar); "+" → novo item; cartão de orçamento: orçamento mensal (ou "Não definido") com lápis → sheet, estimativa de compra, barra (≤70% verde, ≤90% amarelo, acima vermelho), saldo disponível (vermelho se estourou), "N itens · M faltando"; filtro Todos / Faltando; lista por categoria; item: nome, "Faltando", "x de y un · R$/un", −/+ (otimista, em fila); toque → editar | `GET /grocery/items`, `/budget`, `/summary`; `PATCH /grocery/items/:id` (quantidade); compartilhar pelo share sheet (mensagem do legado); sem faltando → toast                                                                |
| Orçamento (sheet)        | `grocery/GroceryBudgetSheet.tsx`          | aviso "Apenas informativo…"; valor; "Salvar orçamento"; erro inline                                                                                                                                                                                                                                                                                                                                                       | `POST /grocery/budget` (cada salvamento é um registro novo no servidor)                                                                                                                                                       |
| Item (form)              | `grocery/GroceryItemFormScreen.tsx`       | modal; nome; unidade; quantidade ideal; quantidade atual (decimais com vírgula); preço estimado por unidade; categoria (12 fixas); "Adicionar item" / "Salvar alterações"; na edição: "Excluir item" (confirmação)                                                                                                                                                                                                        | `POST`/`PATCH`/`DELETE /grocery/items`                                                                                                                                                                                        |
| Veículos                 | `vehicles/VehiclesListScreen.tsx`         | "+" → novo; lista: foto (ou ícone), nome, placa · km; toque → detalhe                                                                                                                                                                                                                                                                                                                                                     | `GET /vehicles` (URLs de foto assinadas expiram em 1 h: recarrega ao voltar)                                                                                                                                                  |
| Veículo (detalhe)        | `vehicles/VehicleDetailScreen.tsx`        | editar, excluir (confirmação); foto 4:3; "Adicionar/Trocar foto" (galeria), "Remover foto" (confirmação); quilometragem + "Atualizar" → sheet; dados: placa, ano fab./modelo, cor, combustível, aquisição ("—" se vazio); "Manutenções: Em breve"                                                                                                                                                                         | `GET /vehicles/:id` (usa a cópia da lista enquanto carrega); `PUT/DELETE /vehicles/:id/photo`; 413 → "A foto é muito grande (máx. 5 MB)."; 409 → "A foto foi alterada em outro lugar…"                                        |
| Quilometragem (sheet)    | `vehicles/UpdateMileageSheet.tsx`         | "Atual: x km"; nova quilometragem; "Salvar"; erro de campo se menor (confere com o servidor)                                                                                                                                                                                                                                                                                                                              | `PATCH /vehicles/:id`                                                                                                                                                                                                         |
| Veículo (form)           | `vehicles/VehicleFormScreen.tsx`          | modal; na criação: foto opcional (galeria, 4:3); marca; modelo; ano fab.; ano modelo; km atual; placa (maiúsculas, opcional); aquisição (opcional); cor (opcional); combustível (8 opções, toque de novo desmarca); "Cadastrar veículo" / "Salvar alterações"                                                                                                                                                             | na edição manda só os campos alterados; km não pode diminuir; foto enviada depois de criar (falha não bloqueia: toast)                                                                                                        |

Componentes com comportamento (não são telas): `WorkspaceSwitcher` (Pessoal / Empresarial em todo `AppHeader`, otimista, reverte com toast), `Toast` global.

Sem uso aparente: nada. (`Manutenções: Em breve` era um espaço reservado para a feature 12 do roadmap; foi substituído pelas telas 23–27 em 2026-09-27, ver `docs/specs/vehicle-maintenance/`.)

## Progresso

| #   | Tela                              | Origem     | Fluxo   | Prioridade | Status     |
| --- | --------------------------------- | ---------- | ------- | ---------- | ---------- |
| 0   | Design system (catálogo)          | nova (dev) | Dev     | P1         | Pronta     |
| 1   | Início ★ tela-chave               | existente  | Núcleo  | P1         | Pronta     |
| 2   | Lançamentos                       | existente  | Núcleo  | P1         | Pronta     |
| 3   | Lançamento (form)                 | existente  | Núcleo  | P1         | Pronta     |
| 4   | Entrar                            | existente  | Entrada | P1         | Pronta     |
| 5   | Criar conta                       | existente  | Entrada | P1         | Pronta     |
| 6   | Metas                             | existente  | Núcleo  | P2         | Pronta     |
| 7   | Meta (form)                       | existente  | Núcleo  | P2         | Pronta     |
| 8   | Mais                              | existente  | Conta   | P2         | Pronta     |
| 9   | Dívidas                           | existente  | Casa    | P2         | Pronta     |
| 10  | Dívida (detalhe) + Pagar parcela  | existente  | Casa    | P2         | Pronta     |
| 11  | Dívida (form)                     | existente  | Casa    | P2         | Pronta     |
| 12  | Mercado + Orçamento               | existente  | Casa    | P2         | Pronta     |
| 13  | Item do mercado (form)            | existente  | Casa    | P2         | Pronta     |
| 14  | Veículos                          | existente  | Casa    | P2         | Pronta     |
| 15  | Veículo (detalhe) + Quilometragem | existente  | Casa    | P2         | Pronta     |
| 16  | Veículo (form)                    | existente  | Casa    | P2         | Pronta     |
| 17  | Categorias                        | existente  | Conta   | P3         | Pronta     |
| 18  | Categoria (form)                  | existente  | Conta   | P3         | Pronta     |
| 19  | Perfil                            | existente  | Conta   | P3         | Pronta     |
| 20  | Alterar senha                     | existente  | Conta   | P3         | Pronta     |
| 21  | Esqueci a senha                   | existente  | Entrada | P3         | Pronta     |
| 22  | Redefinir senha                   | existente  | Entrada | P3         | Pronta     |
| 23  | Veículo › cartão Manutenções      | nova       | Casa    | P2         | Em revisão |
| 24  | Manutenções (alertas + histórico) | nova       | Casa    | P2         | Em revisão |
| 25  | Registrar manutenção (form)       | nova       | Casa    | P2         | Em revisão |
| 26  | Tipos de manutenção               | nova       | Casa    | P3         | Em revisão |
| 27  | Tipo de manutenção (form)         | nova       | Casa    | P3         | Em revisão |
| 28  | Assinatura                        | nova       | Conta   | P3         | Pronta     |

Status: Pendente → Em progresso → Em revisão → Pronta (só depois de ≥ 2 rodadas de revisão visual)

Telas removidas: nenhuma.

## Navegação

O roteador continua o React Navigation. Mudanças de estrutura (nenhuma funcionalidade some):

- **Perfil sai da tab bar** e vira tela empilhada, aberta pelo cartão "Você" no topo de **Mais** e pelo avatar no Início.
- O **botão Lançar** entra no centro da tab bar (abre o formulário de lançamento).
- **Sair** sai do Início e vai para o fim de **Mais**.
- Os `testID` continuam (`tab-home`, `tab-transactions`, `tab-goals`, `tab-more`; `tab-profile` deixa de existir; entra `tab-new-transaction` e `more-profile`). Fluxos Maestro que usam `tab-profile` passam a usar `tab-more` → `more-profile`.

```
Raiz
├── (entrada, sem sessão)          fundo: InkBloom
│   ├── Entrar ──→ Criar conta
│   └── Entrar ──→ Esqueci a senha ──→ Redefinir senha ──→ Entrar
├── (app, com sessão)
│   ├── (tabs) LedgerTabBar
│   │   ├── Início ──→ Metas (aba) · Perfil (avatar)
│   │   ├── Lançamentos ──→ Lançamento (form, modal)
│   │   ├── [ Lançar ] ──→ Lançamento (form, modal)
│   │   ├── Metas ──→ Meta (form, modal)
│   │   └── Mais ──→ Perfil ──→ Alterar senha (modal)
│   │            ├─→ Dívidas ──→ Dívida ──→ Dívida (form, modal) · Pagar parcela (sheet)
│   │            ├─→ Mercado ──→ Item (form, modal) · Orçamento (sheet)
│   │            ├─→ Veículos ──→ Veículo ──→ Veículo (form, modal) · Quilometragem (sheet)
│   │            ├─→ Categorias ──→ Categoria (form, modal)
│   │            └─→ Sair
│   └── (dev) Catálogo de Telas · Design system
```

## Loop principal

1. Abrir o app → **Início**: o saldo do mês e o que falta pagar, sem toque.
2. **[toque]** botão Lançar (tab bar) → **Lançamento (form)** com o teclado já aberto no valor.
3. **[toque]** "Lançar despesa" → volta com o recibo do momento "Lançamento feito".

Caminho secundário: **Lançamentos** → **[toque]** no carimbo A PAGAR → bate o PAGO.

---

## 1 — Início ★

- **Rota:** tab `Home` (`MainTabs`)
- **Origem:** existente (`dashboard/DashboardScreen.tsx`)
- **Prioridade · status:** P1 · Pendente
- **Propósito:** saber, em um olhar, como está o período do caderno ativo.
- **Funcionalidades** (contrato):
  - cumprimento com o nome `(existente)`;
  - seletor Dia / Semana / Mês / Personalizado, com De/Até `(existente)`;
  - saldo, receitas, despesas pagas, a pagar, % da renda comprometida, variação vs. período anterior, média diária `(existente)`;
  - metas em andamento com progresso; tocar → Metas; "Ver todas" `(existente)`;
  - receitas × despesas no ano `(existente)`;
  - trocar de caderno `(existente)`;
  - Sair `(existente, movido para Mais)`.
- **Removidas:** nenhuma.
- **Regras de negócio a preservar:** personalizado só busca com as duas datas válidas; recarregar ao voltar para a aba; a chave de cache inclui período e datas.
- **Vem de → vai para:** abertura do app / tab bar → Metas (aba), Perfil (avatar), Lançamento (botão Lançar).
- **Composição (vigente, "Índigo Suave", 2026-09-25):**
  - Ponto focal: o **cartão de saldo** em gradiente.
  - Conceito: como a Home da referência: saudação + nome, seletor de período em pílula, cartão de saldo em gradiente, e cada bloco (resumo, metas, ano) num cartão branco.
  - Wireframe:
    ```
    ┌──────────────────────────────────┐
    │ ░ brilho lavanda ░         (MC)  │ avatar → Perfil
    │ Bom dia,                         │
    │ Marina Costa                     │ title1
    │ (Pessoal|Empresa)                │ NotebookSwitch
    │ ( Dia | Semana |▓Mês▓| Período ) │ SegmentedControl
    │ ╭──────────────────────────────╮ │
    │ │ Saldo de setembro      [💼]  │ │ BalanceCard (gradiente)
    │ │ R$ 3.117,51                  │ │
    │ │ (↗ +13,6% de receita vs ago) │ │
    │ ╰──────────────────────────────╯ │
    │ Resumo do período                │
    │ ╭ (↓) Receitas    + R$ 6.588,72 ╮│ PeriodSummary
    │ │ (↑) Despesas    − R$ 3.471,21 ││
    │ │ (⏱) A pagar       R$ 1.091,53 ││
    │ │ (◔) Renda comprometida   53% ▬▬││
    │ ╰ (📅) Gasto médio/dia R$ 115,71╯│
    ├─ ─ ─ fim da 1ª dobra ─ ─ ─ ─ ─ ─ ┤
    │ Metas                 Ver todas  │ GoalProgress em cartão
    │ Receitas × despesas em 2026      │ YearChart em cartão
    │ [Início][Lanç.] (+) [Metas][Mais]│ AppTabBar
    └──────────────────────────────────┘
    ```
- **Composição anterior (Caderno de Contas, substituída):**
  - Ponto focal: o **saldo** com o traço duplo.
  - Conceito: a tela é **a conta do mês armada no papel**: o saldo e a conta que chega nele dominam; metas e ano são o rodapé do caderno.
  - Ritmo: herói arejado (saldo + conta) → denso (metas) → respiro → denso (ano).
  - Padrão genérico evitado: "saudação + card de saldo + grid 2×2 de números coloridos + seções com título". No lugar: a conta armada em coluna do livro-caixa, sem card, e o secundário como nota de rodapé.
  - Elemento que só existe neste app, na primeira dobra: `PeriodLedger` (conta armada + traço duplo + marca-texto no "A pagar").
  - Wireframe escolhido (A):
    ```
    ┌──────────────────────────────────┐
    │ ░░ tinta na água ░░         (MS) │ ← avatar → Perfil
    │ Olá, Marina                      │ subhead
    │ Pessoal · ▰Empresa▰              │ NotebookSwitch
    │                                  │
    │ Dia  Semana ▰Mês▰  Período       │ MarkerTabs
    │                                  │
    │ SALDO DE SETEMBRO                │ overline
    │ R$ 2.059,45                      │ display 52
    │ ══════════                       │ traço duplo
    │ + Receitas            5.200,00   │ numeral (success)
    │ − Despesas pagas      3.140,55   │ numeral
    │   A pagar            ▰480,00▰    │ marca-texto
    │ ──────────────────────────────── │ pauta
    │ ↑ 12,5% de receita vs. agosto    │ footnote
    │ Renda comprometida 60% ||||||··· │
    │ Gasto médio por dia   R$ 104,68  │
    ├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ fim da 1ª dobra (375×667)
    │ Metas                  Ver todas │ title2
    │ Viagem  ▰▰▰▰▰▰|||||   3.000/5.000│ GoalRuler compacta
    │ Reserva ▰▰|||||||||   800/10.000 │
    │                                  │
    │ Seu ano                          │ title2
    │ ▌▌ ▌▌ ▌▌ ▌▌ ▌▌ ▌▌ ▌▌ ▌▌ ░▌▌░ ...  │ YearLedgerChart
    │ J  F  M  A  M  J  J  A  S  O N D │
    │ [Início][Lanç.]( + )[Metas][Mais]│ LedgerTabBar
    └──────────────────────────────────┘
    ```
  - Alternativas:
    - B) "Extrato primeiro": saldo compacto no topo e os últimos lançamentos logo abaixo. Perdeu: o `GET /dashboard` não traz lançamentos, e buscar outra lista seria funcionalidade nova (fora do contrato "só visual").
    - C) "Termômetro do mês": um anel grande de "% da renda comprometida" como herói, com o saldo no meio. Perdeu: é o template de fintech (donut), esconde a conta que explica o saldo e usa cor como único código.
- **Bordas e teclado:** modo **herói sangrando** (a tinta na água vai até o topo, por trás da status bar; o conteúdo começa abaixo do inset). Status bar automática pelo tema. Teclado: só no período personalizado (De/Até): o scroll leva os campos para cima do teclado; a tab bar some.
- **Layout:**
  1. topo (`PageHeader` sem título grande: cumprimento + avatar + `NotebookSwitch`);
  2. `MarkerTabs` de período (+ De/Até quando "Período");
  3. `PeriodLedger`;
  4. seção Metas (`title2` + "Ver todas") com até 3 `GoalRuler` compactas;
  5. seção "Seu ano" com `YearLedgerChart`;
  6. espaço para a tab bar.
- **Componentes:** domínio: **`PeriodLedger`**, `GoalRuler` (compacta), `YearLedgerChart`, `NotebookSwitch` · chrome: `PageHeader`, `CompactHeader`, `LedgerTabBar` · primitivas: `MarkerTabs`, `TextField` (datas), `Text`, `Icon`.
- **Dados:** `DashboardData` (1 por período × 4 períodos no mock); casos de borda: saldo negativo, sem comparação, sem metas, ano sem dados, valor de 7 dígitos, nome longo. Serviço real: `GET /dashboard`.
- **Estados:**
  - normal: como acima;
  - vazio (conta nova): saldo "R$ 0,00", conta zerada, metas com `EmptyState` compacto ("Nenhuma meta em andamento." + "Criar meta"), ano "Nada lançado em 2026 ainda";
  - carregando: skeleton do `PeriodLedger` + 2 réguas + 12 pares de barras;
  - erro: `ErrorState` no lugar da conta ("Algo deu errado. Tente novamente." + "Tentar de novo");
  - personalizado incompleto: dica "Escolha as duas datas para ver a conta" no lugar do saldo.
- **Imagens:** nenhuma.
- **Interações e movimento:**
  - trocar período/caderno: o marca-texto desliza; saldo e totais contam até o novo valor; o traço duplo redesenha;
  - tocar numa meta → aba Metas;
  - tocar num mês do gráfico → detalhe do mês acima dele;
  - pull-to-refresh.
- **Vida:** ambiente: `InkBloom` atrás do topo, com parallax 0,4× (some ao rolar) · scroll: `CompactHeader` com "Início" aparece depois do saldo · dados vivos: `CountUp` + `DoubleRule` + `GrowIn` (régua e barras) · espera: skeleton com `Shimmer` · celebração: — · reduzir movimento: fundo parado, números trocam seco, nada cresce.
- **Texto:** cumprimento "Olá, {primeiro nome}" · vazio de metas "Nenhuma meta em andamento." · erro "Algo deu errado. Tente novamente." · rótulos da conta "Receitas", "Despesas pagas", "A pagar".
- **Mensagens:** trocar caderno falhou → `LedgerToast`.
- **Acessibilidade:** ordem: cumprimento → caderno → período → conta (grupo único) → metas → ano (tabela); `InkBloom` e marcas decorativos; avatar "Abrir perfil".

## 2 — Lançamentos

- **Rota:** tab `Transactions`
- **Origem:** existente (`transactions/TransactionsListScreen.tsx`)
- **Prioridade · status:** P1 · Pendente
- **Propósito:** conferir, achar e acertar os lançamentos (marcar pago, corrigir, excluir).
- **Funcionalidades:** filtro Todos/Despesas/Receitas · busca por descrição · lista paginada infinita + pull-to-refresh · alternar pago/a pagar (despesa) · editar ao tocar · excluir 1 (com confirmação) · seleção múltipla por toque longo + excluir selecionados (com confirmação) + cancelar seleção · novo lançamento · trocar de caderno. Todas `(existente)`.
- **Regras:** busca com debounce 300 ms; status só em despesa; exclusão invalida dívidas e dashboard; página de 20.
- **Vem de → vai para:** tab bar → Lançamento (form) (tocar / "+").
- **Composição:**
  - Ponto focal: a **coluna de valores** da primeira data.
  - Conceito: o **livro-caixa aberto**: os dias são as divisões, os valores formam uma coluna só, e o carimbo diz o que está pago.
  - Ritmo: header + filtros (leve) → dias densos com cabeçalhos de respiro.
  - Padrão genérico evitado: "ListItem com ícone redondo + badge + lixeira em toda linha". No lugar: margem de cor da categoria, carimbo tocável e exclusão por gesto.
  - Elemento único na primeira dobra: `LedgerDay` com `StatusStamp`.
  - Wireframe escolhido (A):
    ```
    ┌──────────────────────────────────┐
    │ LANÇAMENTOS · PESSOAL        ⌕   │ overline + busca (ícone)
    │ Setembro                         │ title1 (mês do 1º grupo visível)
    │ Pessoal · ▰Empresa▰              │
    │ ▰Todos▰  Despesas  Receitas      │ MarkerTabs
    │──────────────────────────────────│
    │ SEX · 12 SET            − 332,40 │ cabeçalho do dia
    │ ▎Mercado Pão de Açúcar  − 212,40 │
    │ ▎Mercado            [A PAGAR]    │ carimbo
    │ ▎Uber                    − 120,00│
    │ ▎Transporte             [PAGO]   │
    │ QUI · 11 SET          + 5.200,00 │
    │ ▎Salário              + 5.200,00 │
    │ ▎Salário                         │
    │ ...                              │
    │ [Início][Lanç.]( + )[Metas][Mais]│
    └──────────────────────────────────┘
    Modo seleção: tab bar dá lugar à ActionBar
    │ ✕  3 selecionados · − 540,00  [Excluir] │
    ```
  - Alternativas:
    - B) "Calendário do mês": grade mensal com totais por dia e a lista do dia tocado embaixo. Perdeu: a API é paginada por lançamento, não por mês, e a busca não combina com calendário.
    - C) "Lista plana com data em cada linha" (a de hoje, restilizada). Perdeu: repete a data em todas as linhas e não tem ritmo; o subtotal por dia se perde.
- **Bordas e teclado:** contida. Busca: tocar no ⌕ abre o campo de busca no lugar do título (foco automático); a lista ganha padding inferior igual ao teclado; a tab bar some com o teclado.
- **Layout:** `PageHeader` (overline, título, busca, caderno) → `MarkerTabs` → `SectionList` de `LedgerDay` (cabeçalho do dia fixo ao rolar) → rodapé com loader de página (3 marcas pulsando).
- **Componentes:** domínio: **`LedgerDay`/`LedgerLine`**, `StatusStamp`, `NotebookSwitch` · chrome: `PageHeader`, `CompactHeader`, `ActionBar` (seleção), `LedgerTabBar`, `ConfirmSheet`, `LedgerToast` · primitivas: `MarkerTabs`, `TextField` (busca), `Checkbox`.
- **Dados:** `Transaction` × 46 no mock (3 páginas), 12 dias, com receita, despesa paga, a pagar, descrição longa, valor de 5 dígitos. Serviço real: `GET/PATCH/DELETE /transactions…`.
- **Estados:**
  - normal;
  - vazio: `EmptyState` (ilustração `vazio_lancamentos`) "Caderno em branco." + "Lance a primeira conta do mês e o Mony faz as somas." + [Lançar];
  - vazio com busca/filtro: "Nada com "{busca}" por aqui." sem ilustração;
  - carregando: 2 dias de skeleton;
  - erro: `ErrorState` + "Tentar de novo";
  - carregando próxima página: loader de marcas no rodapé;
  - seleção.
- **Imagens:** `vazio_lancamentos` (240×180 dp, 4:3, tingida).
- **Interações e movimento:**
  - carimbo bate (otimista) com haptic;
  - deslizar para a esquerda revela "Excluir";
  - toque longo entra na seleção (haptic `impactMedium`, margens viram caixinhas);
  - a `ActionBar` sobe no lugar da tab bar.
- **Vida:** ambiente: nenhum (lista densa) · scroll: `CompactHeader` + cabeçalho do dia fixo · dados vivos: carimbo · espera: skeleton + loader de página · reduzir movimento: carimbo aparece sem bater.
- **Texto:** título "Lançamentos" (o nome da aba); busca "Buscar na descrição"; vazio e erro acima.
- **Mensagens:** excluir 1 / N → `ConfirmSheet`; falha → `LedgerToast`.
- **Acessibilidade:** cabeçalho do dia como `header`; linha com rótulo composto e ações acessíveis; `ActionBar` anunciada ao entrar na seleção.

## 3 — Lançamento (form)

- **Rota:** `TransactionForm` (modal)
- **Origem:** existente (`transactions/TransactionFormScreen.tsx`)
- **Prioridade · status:** P1 · Pendente
- **Propósito:** anotar uma despesa ou receita em segundos.
- **Funcionalidades:** tipo (travado na edição; trocar limpa a categoria) · status (despesa) · categoria · descrição · valor · data · repetir todo mês + meses (só criação) · criar / salvar · fechar. Todas `(existente)`.
- **Regras:** validação zod (mensagens PT-BR do shared-types); edição manda só categoria, descrição, valor e data.
- **Vem de → vai para:** botão Lançar, "+" de Lançamentos, tocar numa linha → volta para quem abriu (com o momento).
- **Composição:**
  - Ponto focal: o **valor** com o sinal.
  - Conceito: **um canhoto de lançamento**: primeiro o quanto (e se entra ou sai), depois o quê e quando.
  - Ritmo: herói (valor) → grupo compacto (categoria) → campos → CTA grudado no teclado.
  - Padrão genérico evitado: "formulário de campos iguais empilhados com rótulo em cima". No lugar: o valor como herói sem caixa, o tipo como sinal, a categoria como etiquetas.
  - Elemento único na primeira dobra: `AmountField` com o sinal + `CategoryPicker` com marca-texto.
  - Wireframe escolhido (A):
    ```
    ┌──────────────────────────────────┐
    │           ▔▔▔▔ (alça)            │
    │ ✕   Novo lançamento              │ title2
    │ ▰Despesa▰  Receita               │ MarkerTabs (vira o sinal)
    │ VALOR DA DESPESA                 │
    │ −  R$ 212,40                     │ amountInput
    │ ──────────────────────────────── │ pauta (primary no foco)
    │ ▰A pagar▰  Pago                  │ MarkerTabs (só despesa)
    │ CATEGORIA                        │
    │ ●Mercado ▰●Casa▰ ●Carro ●Lazer ›│ CategoryPicker (2 linhas, rola)
    │ Descrição  [Pão de Açúcar     ]  │
    │ Data       [12/09/2026        ]  │
    │ ☐ Repetir todo mês               │
    │══════════════════════════════════│
    │ [        Lançar despesa        ] │ ActionBar grudada no teclado
    └──────────────────────────────────┘
    ```
  - Alternativas:
    - B) "Calculadora": teclado numérico próprio ocupando a metade de baixo, campos acima. Perdeu: troca o teclado do sistema (acessibilidade, colar valor) e fica ruim para editar a descrição.
    - C) "Passo a passo" (valor → categoria → detalhes, 3 telas). Perdeu: mais toques no loop principal e pior para editar.
- **Bordas e teclado:** contida (modal). Formulário com vários campos: `KeyboardAwareScrollView` leva o campo focado para a vista; "próximo" entre campos; **CTA grudado em cima do teclado** (`KeyboardStickyView`). Na criação, o foco abre no valor. `keyboardAppearance` do tema.
- **Layout:** `SheetHeader` → tipo → `AmountField` → status → `CategoryPicker` → descrição → data → repetir (+ meses) → `InlineNotice` de erro → `ActionBar` com o CTA.
- **Componentes:** domínio: **`AmountField`**, `CategoryPicker` · chrome: `SheetHeader`, `ActionBar` · primitivas: `MarkerTabs`, `TextField`, `Checkbox`, `Button`, `InlineNotice`.
- **Dados:** `Category` × 9 (6 despesa, 3 receita) no mock, uma com nome longo. Serviço real: `GET /categories?type=`, `POST/PATCH /transactions`.
- **Estados:** criação · edição (tipo travado, sem "repetir") · sem categorias do tipo (chip tracejado "Criar categoria" → Categoria form) · erro de campo · erro de envio (notice + haptic) · enviando (CTA com loader).
- **Imagens:** nenhuma.
- **Interações e movimento:** o sinal gira ao trocar o tipo; o marca-texto desliza entre categorias; o CTA muda de rótulo com o tipo ("Lançar despesa" / "Lançar receita"; "Salvar alterações" na edição); ao salvar, momento **Lançamento feito**.
- **Vida:** nível 0 (tarefa): só microinterações · reduzir movimento: sem giro.
- **Texto:** título "Novo lançamento" / "Editar lançamento"; CTA acima; "Repetir todo mês"; "Por quantos meses (1-60)".
- **Mensagens:** erro de envio → `InlineNotice`; sucesso → `LedgerToast` recibo.
- **Acessibilidade:** foco inicial no valor; rótulos em todos os campos; categorias como `radiogroup`.

## 4 — Entrar

- **Rota:** `Login` (auth)
- **Origem:** existente (`auth/LoginScreen.tsx`)
- **Prioridade · status:** P1 · Pendente
- **Propósito:** entrar no caderno.
- **Funcionalidades:** e-mail · senha com olho · esqueci a senha · criar conta · erros mapeados. Todas `(existente)`.
- **Composição:**
  - Ponto focal: a **marca** ("Mony" em Fraunces) sobre a tinta na água.
  - Conceito: **a capa do caderno**: o nome e uma linha de convite no alto; os campos na metade de baixo, na zona do polegar.
  - Ritmo: capa arejada → formulário compacto → links.
  - Padrão genérico evitado: "ícone num círculo + título + campos". No lugar: a capa com o nome em Fraunces e a ilustração em traço (`capa_caderno`).
  - Wireframe:
    ```
    ┌──────────────────────────────────┐
    │ ░░░ tinta na água ░░░            │
    │   [ilustração: caderno + caneta] │
    │ Mony                             │ title1 Fraunces (grande)
    │ O caderno de contas da casa,     │
    │ passado a limpo.                 │ body textMuted
    │                                  │
    │ E-mail  [                    ]   │
    │ Senha   [                 👁 ]   │
    │                Esqueceu a senha? │
    │ [            Entrar            ] │
    │ Não tem conta? Criar conta       │
    └──────────────────────────────────┘
    ```
- **Bordas e teclado:** herói sangrando (tinta até o topo). Teclado: o conteúdo sobe junto (KeyboardAwareScrollView), a ilustração pode sair de cena, o CTA fica visível; "próximo" do e-mail para a senha; senha com "entrar" no teclado. Autocomplete `email`/`password`.
- **Componentes:** domínio: marca em Fraunces + `InkBloom` · primitivas: `TextField`, `Button`, `InlineNotice`, `AppImage`.
- **Estados:** normal · enviando · erro (notice) · erro de campo.
- **Imagens:** `capa_caderno` (220×160 dp, tingida).
- **Vida:** ambiente `InkBloom` (desacelera quando um campo tem foco) · reduzir movimento: parado.
- **Texto:** "Mony" · "O caderno de contas da casa, passado a limpo." · CTA "Entrar" · "Esqueceu sua senha?" · "Não tem uma conta? Criar conta".

## 5 — Criar conta

- **Rota:** `Register` (auth)
- **Origem:** existente (`auth/RegisterScreen.tsx`)
- **Prioridade · status:** P1 · Pendente
- **Funcionalidades:** nome · e-mail · telefone (opcional) · senha · confirmar · entrar. Todas `(existente)`.
- **Composição:** mesma capa da Entrar em versão compacta (tinta no topo, "Abra seu caderno" em `title1`), campos em sequência, CTA grudado no teclado. Ponto focal: o título. Padrão evitado: badge de ícone em círculo.
- **Bordas e teclado:** herói sangrando; formulário longo com scroll que acompanha o foco e CTA grudado no teclado; `textContentType` nome/e-mail/telefone/nova senha.
- **Texto:** "Abra seu caderno" · "Comece a organizar suas finanças em poucos minutos." · CTA "Criar conta" · "Já tem uma conta? Entrar".
- **Estados, mensagens:** e-mail já cadastrado no campo; erro geral no notice.

## 6 — Metas

- **Rota:** tab `Goals`
- **Origem:** existente (`goals/GoalsScreen.tsx`)
- **Prioridade · status:** P2 · Pendente
- **Funcionalidades:** listar em andamento e concluídas · atrasada · progresso · excluir (confirmação) · editar · nova. Todas `(existente)`.
- **Composição:**
  - Ponto focal: a **primeira régua**.
  - Conceito: **o quadro de campanhas**: cada meta é uma régua sendo pintada a marca-texto; as concluídas descem com o carimbo.
  - Padrão evitado: "cards iguais com barra". No lugar: réguas sobre a pauta, sem card.
  - Wireframe:
    ```
    │ METAS · PESSOAL                + │
    │ Metas                            │ title1
    │ Pessoal · ▰Empresa▰              │
    │ Viagem para Salvador  [ATRASADA] │ title3 + carimbo
    │ ▰▰▰▰▰▰▰▰|····|····|····|  R$ 5 mil│ GoalRuler
    │ R$ 3.000 · 60% · até 01/07/2026  │
    │──────────────────────────────────│
    │ Reserva de emergência            │
    │ ▰▰|····|····|····|····| R$ 10 mil│
    │ CONCLUÍDAS                       │ overline
    │ Notebook novo       [ALCANÇADA]  │ esmaecida
    ```
- **Bordas e teclado:** contida.
- **Estados:** vazio (ilustração `vazio_metas`: "Nenhuma meta ainda." + "Toda economia começa com um número. Crie a primeira meta." + [Criar meta]) · carregando (3 réguas de skeleton) · erro.
- **Interações:** régua corre na primeira exibição; deslizar para excluir; toque → editar.
- **Mensagens:** excluir → `ConfirmSheet`; falha → toast.

## 7 — Meta (form)

- **Rota:** `GoalForm` (modal) · **Origem:** `goals/GoalFormScreen.tsx` · P2
- **Funcionalidades:** título · descrição · valor da meta · valor atual · data limite · categoria (Nenhuma) · concluída (edição) · criar/salvar · fechar. `(existente)`
- **Composição:** `SheetHeader` → título (campo em `title3`) → `AmountField` herói "VALOR DA META" → `GoalRuler` de prévia que se pinta conforme o valor atual → valor atual → data limite → categoria → "Meta concluída" (checkbox; ao marcar, a prévia vira ALCANÇADA) → CTA grudado. Ponto focal: o valor da meta.
- **Teclado:** formulário; CTA grudado; "próximo" entre campos.
- **Momento:** salvar com "Meta concluída" marcado → carimbo ALCANÇADA na prévia antes de fechar (400 ms) + haptic `success`.

## 8 — Mais

- **Rota:** tab `More` · **Origem:** `more/MoreScreen.tsx` · P2
- **Funcionalidades:** Categorias, Dívidas, Mercado, Veículos `(existente)` · Perfil `(existente, veio da tab bar)` · Alterar senha (atalho) `(existente, via Perfil)` · Sair `(existente, veio do Início)`.
- **Composição:** o **índice do caderno**: cartão "Você" no topo (iniciais em círculo de tinta, nome, e-mail → Perfil), depois o índice em dois grupos com números de seção do lado ("A CASA": Mercado, Veículos; "O DINHEIRO": Dívidas, Categorias), cada linha com ícone de tinta, nome em `headline`, descrição em `footnote`, e um dado vivo à direita quando o app já tem (ex.: nenhum no contrato: só a seta). No fim, "Sair" (botão `ghost` `danger`). Padrão evitado: lista de `ListRow` com ícone em badge azul.
- **Bordas:** contida.

## 9 — Dívidas

- **Rota:** `Debts` · **Origem:** `debts/DebtsListScreen.tsx` · P2
- **Funcionalidades:** seções Atrasadas / Ativas / Quitadas · status · progresso de parcelas · restante de total · detalhe · nova · caderno. `(existente)`
- **Composição:** ponto focal: o **restante** da primeira dívida. Conceito: **o carnê da casa**, cada dívida é uma linha com as marcas das parcelas. `StackHeader` + título "Dívidas" + caderno → seções com `overline` ("ATRASADAS", em `danger`) → `DebtEntry`. Padrão evitado: card + badge + barra.
- **Estados:** vazio (`vazio_dividas`: "Nenhuma dívida ainda." + "Parcelou alguma coisa? Anote aqui e o Mony lembra de cada parcela." + [Nova dívida]) · carregando · erro.

## 10 — Dívida (detalhe) + Pagar parcela

- **Rota:** `DebtDetail` · **Origem:** `debts/DebtDetailScreen.tsx`, `PayInstallmentSheet.tsx` · P2
- **Funcionalidades:** todas do inventário `(existente)`.
- **Composição:**
  - Ponto focal: **"Restam R$ 21.000,00"** com traço duplo.
  - Conceito: **a folha da dívida**: em cima a conta (total − pago = restante) e as marcas; embaixo, o carnê parcela a parcela.
  - Wireframe:
    ```
    │ ‹                       ✎   🗑   │
    │ Financiamento do carro   [ATIVA] │ title1 + carimbo
    │ RESTAM                           │
    │ R$ 21.000,00                     │ display (menor: 40)
    │ ════════════                     │
    │   Total              36.000,00   │
    │ − Pago               15.000,00   │
    │ ||||||||||||······  7 de 12      │ InstallmentTrack
    │ Início 10/03/2026 · Término …    │ footnote
    │ Juros 1,2% a.m. (informativo)    │
    │ PARCELAS                         │
    │ 01  vence 10/03   3.000  [PAGA]  │
    │ 08  ▰vence 10/10▰ 3.000 [Pagar]  │ próxima com marca-texto
    ```
  - Sheet Pagar parcela: `PaymentReceipt` (overline "PARCELA 08 DE 12", `AmountField` compacto, data, serrilhado, CTA).
- **Bordas e teclado:** contida; o sheet sobe com o teclado.
- **Momentos:** conta paga (carimbo PAGA na linha) e **dívida quitada** (carimbo QUITADA grande sobre o resumo + marcas acendendo).
- **Mensagens:** excluir dívida, desfazer pagamento → `ConfirmSheet`; falhas → toast; erros do pagamento dentro do sheet.

## 11 — Dívida (form)

- **Rota:** `DebtForm` (modal) · **Origem:** `debts/DebtFormScreen.tsx` · P2
- **Composição:** `SheetHeader` → aviso "sem categoria de despesa" (`InlineNotice` aviso + "Criar categoria") → nome → `AmountField` "VALOR TOTAL" → nº de parcelas + prévia viva ("12× de R$ 3.000,00", com `InstallmentTrack` de prévia) → 1º vencimento → data final → juros (com a nota "apenas informativo") → categoria ("Automática" tracejada + explicação) → observações → CTA grudado. Campos travados com `InlineNotice` neutro.
- **Teclado:** formulário longo; CTA grudado.

## 12 — Mercado + Orçamento

- **Rota:** `Grocery` · **Origem:** `grocery/GroceryScreen.tsx`, `GroceryBudgetSheet.tsx` · P2
- **Composição:**
  - Ponto focal: a **sobra** no cupom.
  - Conceito: **a lista na porta da geladeira com o cupom do mês**: o cupom em cima diz se a compra cabe; a lista embaixo mostra o que falta com marca-texto.
  - Wireframe:
    ```
    │ ‹                      ⇪    +    │
    │ Mercado                          │ title1
    │ ┌──────────────────────────────┐ │ GroceryReceipt
    │ │ Orçamento do mês   800,00  ✎ │ │
    │ │ Estimativa         612,40    │ │
    │ │ ──────────────────────────── │ │
    │ │ Sobra              187,60    │ │
    │ │                    ══════    │ │
    │ │ ||||||||···  32 itens · 7 f. │ │
    │ └/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\┘ │ serrilhado
    │ ▰Todos▰  Faltando                │
    │ ALIMENTOS                        │ overline
    │ ▰Arroz▰             (−)  2  (+)  │ PantryItem faltando
    │ ▮▮▯▯  2 de 4 kg · R$ 5,49/kg     │
    ```
  - Orçamento (sheet): `AmountField` compacto + nota "Apenas informativo…" + CTA.
- **Bordas e teclado:** contida; sheet sobe com o teclado.
- **Estados:** sem orçamento · estourado · lista vazia (`vazio_mercado`: "Nenhum item ainda." + "Anote o que a casa usa e o Mony monta a lista do que falta." + [Novo item]) · filtro Faltando vazio ("Nada faltando por aqui.") · carregando · erro.

## 13 — Item do mercado (form)

- **Rota:** `GroceryItemForm` (modal) · **Origem:** `grocery/GroceryItemFormScreen.tsx` · P2
- **Composição:** `SheetHeader` → nome → unidade → "Tenho" / "Preciso" lado a lado com um `PantryLevel` de prévia → preço por unidade (`AmountField` compacto) → categoria (`MarkerChip`, 12, rola) → CTA grudado; na edição, "Excluir item" (`ghost` `danger`) no fim do conteúdo.

## 14 — Veículos

- **Rota:** `Vehicles` · **Origem:** `vehicles/VehiclesListScreen.tsx` · P2
- **Composição:** ponto focal: a **foto** do primeiro veículo. Conceito: **a garagem**: cada veículo é uma linha grande com a foto 4:3 à esquerda (96×72, raio `md`), nome em `title3`, `MercosulPlate` compacta e a km em `numeral`. Padrão evitado: card com foto + chevron.
- **Estados:** vazio (`vazio_veiculos`: "Nenhum veículo ainda." + "Cadastre o carro ou a moto e acompanhe a quilometragem." + [Cadastrar veículo]) · sem foto (placeholder com ícone de carro em traço) · carregando · erro.

## 15 — Veículo (detalhe) + Quilometragem

- **Rota:** `VehicleDetail` · **Origem:** `vehicles/VehicleDetailScreen.tsx`, `UpdateMileageSheet.tsx` · P2
- **Composição:**
  - Ponto focal: o **hodômetro**.
  - Conceito: **o painel do carro**: a foto sangrando no topo, a placa e o hodômetro como protagonistas, a ficha técnica como nota.
  - Wireframe:
    ```
    │[‹]  ░░░░ foto 4:3 ░░░░   [✎][🗑]│ herói sangrando (botões em círculo overlay)
    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
    │ Trocar foto · Remover            │ links
    │ Jeep Renegade 2022   [ABC·1D23]  │ title1 + MercosulPlate
    │ QUILOMETRAGEM                    │
    │ [0][3][6][2][0][0] km [Atualizar]│ Odometer
    │ Ano 2021/2022 · Prata · Flex     │ ficha em frases
    │ Aquisição 12/05/2023             │
    │ MANUTENÇÕES  2 atrasadas · 1 urg.│ cartão da tela 23
    │ Óleo      [Atrasada] ▓▓▓▓▓▓▓▓▓▓  │ 3 mais urgentes
    │ Faltam 1.200 km · Vence em 12 d  │
    │ [+ Registrar]      [Ver todas]   │
    ```
  - Quilometragem (sheet): `Odometer` atual + campo da nova km (teclado numérico) + CTA "Salvar".
- **Bordas:** **herói sangrando** (a foto vai até o topo, por trás da status bar; voltar/editar/excluir em círculos `overlay` abaixo do inset; status bar clara sobre a foto, automática depois de rolar).
- **Momento:** ao salvar a km, os dígitos do hodômetro rolam.

## 16 — Veículo (form)

- **Rota:** `VehicleForm` (modal) · **Origem:** `vehicles/VehicleFormScreen.tsx` · P2
- **Composição:** `SheetHeader` → (criação) foto 4:3 tocável com "Adicionar foto (opcional)" → marca / modelo → anos lado a lado → km atual (com `Odometer` de prévia) → placa (com `MercosulPlate` de prévia ao digitar) → aquisição → cor → combustível (`MarkerChip`, toque de novo desmarca) → CTA grudado.

## 17 — Categorias

- **Rota:** `Categories` · **Origem:** `categories/CategoriesScreen.tsx` · P3
- **Composição:** as duas seções (Despesas e Receitas) continuam visíveis juntas (contrato), cada uma como um bloco de etiquetas-linha (`CategoryTag` grande: filete de cor, ícone, nome) com editar e excluir; "Nova categoria" como `ActionBar` no rodapé.
- **Mensagens:** excluir → `ConfirmSheet`; em uso → `OptionsSheet` (substituta).

## 18 — Categoria (form)

- **Rota:** `CategoryForm` (modal) · **Origem:** `categories/CategoryFormScreen.tsx` · P3
- **Composição:** prévia viva da `CategoryTag` no topo (muda com nome, cor e ícone) → nome → tipo → cor (bolinhas de 40 com anel de seleção em `text`) → ícone (grade de 48, selecionado com marca-texto) → CTA grudado.

## 19 — Perfil

- **Rota:** `Profile` (empilhada, via Mais e avatar) · **Origem:** `profile/ProfileScreen.tsx` · P3
- **Composição:** iniciais grandes em círculo de tinta + nome em `title1` → campos → CTA → "Alterar senha" como linha do índice.
- **Estados:** carregando (skeleton dos campos) · salvo (notice sucesso) · erro.

## 20 — Alterar senha

- **Rota:** `ChangePassword` (modal) · **Origem:** `profile/ChangePasswordScreen.tsx` · P3
- **Composição:** `SheetHeader` + 3 campos de senha + CTA grudado; sucesso volta com toast "Senha alterada.".

## 21 — Esqueci a senha

- **Rota:** `ForgotPassword` (auth) · **Origem:** `auth/ForgotPasswordScreen.tsx` · P3
- **Composição:** capa compacta com tinta ("Esqueceu sua senha?") → e-mail → notice de sucesso → "Enviar código" / "Já tenho um código" → "Lembrou a senha? Entrar". Voltar em círculo no topo.

## 22 — Redefinir senha

- **Rota:** `ResetPassword` (auth) · **Origem:** `auth/ResetPasswordScreen.tsx` · P3
- **Composição:** capa compacta → e-mail → código (campo único de 6 dígitos com `textContentType="oneTimeCode"` e espaçamento largo entre os algarismos, para o preenchimento automático do SMS/e-mail funcionar) → nova senha → confirmar → CTA. Sucesso: estado próprio com carimbo "PRONTO" + "Ir para o login".

## 23 — Veículo › cartão Manutenções

- **Rota:** dentro de `VehicleDetail` · **Origem:** `vehicles/MaintenanceSummaryCard.tsx` (nova, feature 12) · P2
- **Composição:** `IconBadge` de chave + "Manutenções" e a contagem ("2 atrasadas · 1 urgente", ou "Tudo em dia" em verde) → as 3 mais urgentes (`MaintenanceAlertRow`: nome, sistema, `StatusPill`, barra fina no tom do status, "Faltam 1.200 km · Vence em 12 dias") → "Registrar" + "Ver todas (N)".
- **Estados:** sem tipos (texto explicando o que acompanhar + "Cadastrar tipo de manutenção") · carregando (skeleton) · erro (compacto, tentar de novo).
- **Regras:** nunca feita = "Atrasada" (igual ao legado); toque numa linha abre o registro já com o tipo escolhido.

## 24 — Manutenções

- **Rota:** `Maintenance { vehicleId, tab? }` · **Origem:** `vehicles/MaintenanceScreen.tsx` · P2
- **Composição:** `SegmentedControl` Alertas / Histórico. Alertas: um cartão com todas as linhas de status, da mais urgente para a menos. Histórico: "N manutenções · Gasto R$ X" e as linhas (tipo, data · km, ícone de comprovante, valor). Topo: voltar, "Tipos" (ícone de ajustes) e "+" (registrar).
- **Registro (sheet):** detalhes (sistema, data, km, valor, onde, observações), comprovante (foto na própria sheet; PDF abre no navegador do app) e "Excluir manutenção" — a confirmação troca o conteúdo da mesma sheet (o iOS não abre um segundo modal por cima).
- **Estados:** sem tipos (vazio com "Cadastrar tipo") · sem registros (vazio com "Registrar manutenção") · carregando · erro.

## 25 — Registrar manutenção

- **Rota:** `MaintenanceRecordForm { vehicleId, maintenanceTypeId? }` (modal) · **Origem:** `vehicles/MaintenanceRecordFormScreen.tsx` · P2
- **Composição:** "Qual manutenção" (chips agrupados por sistema + chip tracejado "Novo tipo") → km no dia (vem com a do veículo) e data (hoje) → aviso se a km for menor que a atual ("vai ficar registrada como manutenção passada", igual ao legado) → valor (`AmountField` compacto) → onde e observações → comprovante: Câmera · Galeria · PDF, com prévia e remover → CTA grudado.
- **Regras:** data no futuro é recusada no próprio campo; o comprovante sobe depois do registro (falha não perde a manutenção: toast de aviso); foto ou PDF de até 10 MB.

## 26 — Tipos de manutenção

- **Rota:** `MaintenanceTypes` · **Origem:** `vehicles/MaintenanceTypesScreen.tsx` · P3
- **Composição:** blocos por sistema (título + cartão de linhas: nome, "a cada 10.000 km ou 12 meses", descrição) com excluir; "+" no topo.
- **Mensagens:** excluir → `ConfirmSheet`; tipo com registros → erro na própria sheet ("Esse tipo tem manutenções registradas. Exclua esses registros antes.").
- **Estados:** vazio (o que acompanhar + "Novo tipo") · carregando · erro.

## 27 — Tipo de manutenção (form)

- **Rota:** `MaintenanceTypeForm` (modal) · **Origem:** `vehicles/MaintenanceTypeFormScreen.tsx` · P3
- **Composição:** nome → "A cada (km)" e "Ou a cada (meses)" lado a lado + nota "vale o que vencer primeiro" → sistema (13 chips, toque de novo desmarca) → descrição → CTA grudado. Ao criar, o tipo passa a ser acompanhado em todos os veículos.

## 28 — Assinatura

- **Rota:** `Subscription` (Mais → Conta → "Assinatura") · **Origem:** `more/SubscriptionScreen.tsx` (nova, feature 13) · P3
- **Composição (refino 2026-09-29):** herói em gradiente com vidro no topo (`SubscriptionHero` — chip de vidro com o status, título, preço e data). Sem assinatura viva, o herói é a oferta: chip "7 dias grátis", "Experimente o Mony", "Nada é cobrado até dd/mm." e o que o plano inclui (tabela de comparação do legado, condensada em 3 itens). Abaixo, "Escolha o plano" com dois `PlanCard` (rádio; anual primeiro e pré-selecionado, pílula "Economize 45%", preço com "R$" e centavos menores, "Equivale a R$ 5,45/mês" / "Cobrado todo mês"), "Como funciona o teste" (`TrialTimeline`: Hoje · Até dd/mm cancele sem pagar · dd/mm cobrança do plano escolhido) só para quem nunca assinou, e a nota "O pagamento é feito no Stripe, que recebe seu e-mail." (LGPD art. 9). O CTA "Começar 7 dias grátis" (ou "Assinar") fica fixo no rodapé (`ScrollScreen footer`). Com assinatura viva: no herói, a barra do teste ("Dia 2 de 7 · faltam 6 dias") quando em teste; abaixo, um cartão com "Gerenciar pagamento" (portal do Stripe) e "Cancelar assinatura" (`ConfirmSheet`, com a data até quando continua). Pagamento pendente vira chip branco de alerta e o botão principal "Atualizar forma de pagamento"; cancelamento agendado mostra "Reativar assinatura" (secundário se houver pagamento pendente: um só botão principal).
- **Pagamento:** página do Stripe no navegador do app; ao voltar, "Confirmando seu pagamento…" enquanto o webhook não chega (até 20 s).
- **Mensagens:** 409 → "Você já tem uma assinatura."; 503 → "Pagamentos indisponíveis no momento. Tente mais tarde."; outro → genérica.
- **Estados:** carregando (skeleton) · erro (tentar de novo) · planos indisponíveis (aviso).
