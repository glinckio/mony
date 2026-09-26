# Revisão visual — {Nome do app}

Processo e rubrica em `references/10-revisao-visual.md`. Uma tela só fica **Pronta** com ≥ 2 rodadas e a última sem problema alto ou médio.

Como os prints foram tirados: {web 375×812 via `npx expo start --web` | emulador Android | prints do usuário}

## Resumo
| Tela | Rodadas | Última rodada | Situação |
|---|---|---|---|
| {Quadra} | 2 | 0 alta · 0 média · 1 baixa | Pronta |

---

## {Quadra}

### Rodada 1 — prints: `quadra-normal-claro-r1.png`, `quadra-normal-escuro-r1.png`, `quadra-vazio-claro-r1.png`
| # | Critério | Problema (concreto) | Severidade | Correção |
|---|---|---|---|---|
| 1 | Ponto focal | {a foto domina a primeira dobra; a régua de horários só aparece depois de rolar} | alta | {foto reduzida para 3:1; régua sobe para a primeira dobra} |
| 2 | Ritmo | {espaço entre "Sobre" e "Estrutura" igual ao espaço dentro delas (16)} | média | {entre seções 32; dentro 8} |
| 3 | Anti-genérico | {grid 4×1 de fatos com ícone} | média | {virou frase única abaixo do título} |

### Rodada 2 — prints: `...-r2.png`
| # | Critério | Problema | Severidade | Correção |
|---|---|---|---|---|
| 1 | Acabamento | {ícone de pico 1 px acima da linha da hora} | baixa | {alinhado pela baseline} |

---

## Passe de acabamento
Caminho percorrido: {Explorar → Quadra → Pagamento → Reserva → Reservas}

| Problema | Onde | Correção |
|---|---|---|
| {header de Pagamento começa 8 px mais alto que o de Quadra} | {Pagamento} | {usa o mesmo `ScreenHeader`} |
