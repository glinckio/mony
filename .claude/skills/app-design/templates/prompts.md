# Prompts de imagem — {Nome do app}

## Como usar
1. Gere na ordem da tabela. A primeira de cada conjunto é a **âncora** do estilo.
2. Cole o prompt inteiro no ChatGPT. Se ele perguntar o formato, use o de **Gerar em**.
3. Imagens do mesmo conjunto: continue na conversa da âncora, ou abra uma conversa nova e anexe a âncora com a frase:
   > Use a imagem anexada só como referência de estilo (técnica, traço, paleta, luz). Não copie o conteúdo nem a composição.
4. Antes de salvar, olhe o **Confira ao receber** da imagem. Se falhar, peça o ajuste na mesma conversa.
5. Salve em `design/img-original/` com o **nome exato** (minúsculo, sem espaços). Não precisa redimensionar nem comprimir.
6. Quando terminar (ou parte delas), rode `/app-design imagens`.

## Ordem e prioridade
| # | Arquivo | Onde entra | Gerar em | Fundo | Prioridade | Conjunto |
|---|---|---|---|---|---|---|
| 1 | `icone_app.png` | Ícone do app | 1024x1024 | opaco | essencial | marca |
| 2 | `icone_simbolo.png` | Ícone adaptativo, splash | 1024x1024 | transparente | essencial | marca |
| 3 | `onboarding_1.png` | Onboarding 1 | 1024x1536 | transparente | essencial | onboarding (âncora) |
| 4 | `luz_refletor.png` | Efeito: luz no topo da Home | 1024x1536 | **preto puro** | complementar | efeitos (âncora) |

## Blocos de estilo (já incluídos em cada prompt)
**Fotos**
```text
{bloco de estilo de fotos do style-guide.md}
```

**Ilustrações**
```text
{bloco de estilo de ilustrações do style-guide.md}
```

**Efeitos** (wallpaper, luz, textura, peças)
```text
{bloco de estilo de efeitos do style-guide.md}
```

---

## 1. Marca

### `icone_app.png`
**Onde entra:** ícone do app (iOS e Android)
**Gerar em:** 1024x1024 · **Fundo:** opaco · **Final:** 1:1

**Prompt:**
```text
{prompt completo}
```
**Confira ao receber:** símbolo legível bem pequeno · fundo preenche até as bordas, sem cantos arredondados · sem texto

### `icone_simbolo.png`
**Onde entra:** foreground do ícone adaptativo Android, ícone monocromático, splash
**Gerar em:** 1024x1024 · **Fundo:** transparente · **Final:** 1:1 (o script aplica a margem)

**Prompt** (na mesma conversa do ícone):
```text
Agora gere só o símbolo do ícone, sem o fundo: mesmo desenho, mesmas cores, centralizado, em PNG com fundo transparente de verdade (canal alfa). Sem sombra, sem texto.
```
**Confira ao receber:** fundo transparente de verdade (não branco nem xadrez desenhado) · mesmo desenho do ícone

---

## 2. {Conjunto}

### `{arquivo}`
**Onde entra:** {tela › posição}
**Gerar em:** {tamanho} · **Fundo:** {transparente/opaco} · **Final:** {proporção}

**Prompt:**
```text
{prompt completo}
```
**Confira ao receber:** {critério 1} · {critério 2} · sem texto

---

## Imagens de conteúdo MOCK
> Servem só para o app parecer real durante o design. Troque por fotos reais do cliente antes de publicar.
