# Telas — {Nome do app}

## Inventário do app atual
Feito na Fase 0, a partir do código. Descreve o que cada tela **faz**, não como ela é.

| Tela | Rota / arquivo | O que faz hoje | Regras e integrações |
|---|---|---|---|
| {Início} | `{app/(tabs)/index.tsx}` | {mostra saldo e últimas 5 transações; botão Transferir} | {GET /balance; só logado} |

Sem uso aparente: {telas ou ações sem rota/chamada}

## Progresso
| # | Tela | Origem | Fluxo | Prioridade | Status |
|---|---|---|---|---|---|
| 0 | Design system (catálogo) | nova | Dev | P1 | Pendente |
| 1 | {Início} ★ tela-chave | existente | Núcleo | P1 | Pendente |

Status: Pendente → Em progresso → Em revisão → Pronta (só depois de ≥ 2 rodadas de revisão visual)

Telas removidas na entrevista: {tela}: {motivo}

## Navegação
```
Raiz
├── (entrada) Boas-vindas → Login → Cadastro
└── (tabs)
    ├── Início → Detalhe
    ├── Buscar
    └── Perfil → Configurações
```

## Loop principal
{A tarefa que o usuário repete e o caminho em toques: Abrir → Início → [toque] Detalhe → [toque] Confirmar.}

---

## {id} — {Nome da tela}
- **Rota:** `{/rota}`
- **Origem:** existente (`{arquivo antigo}`) | nova
- **Prioridade · status:** P1 · Pendente
- **Propósito:** {o que o usuário resolve aqui, em uma frase}
- **Funcionalidades** (contrato combinado na entrevista):
  - {funcionalidade} `(existente)`
  - {funcionalidade} `(sugerida, aceita)`
  - {funcionalidade} `(pedida)`
- **Removidas:** {funcionalidade}: {decisão do usuário / motivo}
- **Regras de negócio a preservar:** {validações, permissões, limites}
- **Vem de → vai para:** {origem} → {destinos}
- **Composição:**
  - Ponto focal: {a UMA coisa que o olho vê primeiro}
  - Conceito: {o layout em uma frase, sem ser a lista de seções}
  - Ritmo: {herói → denso → respiro → ...}
  - Padrão genérico evitado: {qual} → {o que a tela faz no lugar}
  - Elemento que só existe neste app, na primeira dobra: {componente de domínio ou momento}
  - Wireframe (375×667; a linha `─ ─ ─` marca o fim da primeira dobra):
    ```
    ┌──────────────────┐
    │                  │
    └──────────────────┘
    ```
  - Alternativas (telas-chave): {B: conceito, por que perdeu} · {C: conceito, por que perdeu}
- **Bordas e teclado:** modo: {contida | herói sangrando | imersiva} · status bar: {clara sobre o herói; escura depois de rolar} · teclado: {— | formulário: scroll acompanha o foco, CTA gruda no teclado | campo no rodapé gruda no teclado}
- **Layout** (de cima para baixo):
  1. {header}
  2. {seção}
  3. {rodapé fixo / CTA}
- **Componentes:** domínio: **{protagonista}**, {outros} · chrome: {header, barra de ação...} · primitivas: {Button...}
- **Dados:** {tipo} × {quantidade de mocks}; casos de borda: {texto longo, sem foto...}; serviço real: `{serviço/endpoint existente}` | nenhum (só mock)
- **Estados:**
  - normal: {descrição}
  - vazio: {mensagem + ação}
  - carregando: {skeleton de quê}
  - erro: {mensagem + tentar de novo}
  - {outros}: {sem permissão, offline...}
- **Imagens:** `{arquivo}` ({largura}×{altura} dp, {proporção}; UI sobrepõe {onde})
- **Interações e movimento:** {microinterações dos componentes de domínio, gestos, entrada/saída da tela, momento, haptics}
- **Vida:** ambiente: {aurora no topo que some ao rolar | nenhum} · scroll: {header compacta, parallax no herói} · dados vivos: {preço conta até o valor} · espera: {skeleton com brilho} · celebração: {—} · reduzir movimento: {fundo estático, sem parallax}
- **Texto (na voz do app):** título: {…} · CTA: {…} · vazio: {…} · erro: {…}
- **Mensagens:** {cancelar reserva → `ConfirmSheet` perigo} · {copiar código → feedback no botão} · {erro de rede na ação → `Toast` com "Tentar de novo"}
- **Acessibilidade:** {rótulos, ordem de leitura, decorativo vs informativo}
- **Revisão visual:** {rodadas feitas; ver `design/revisao.md`}
