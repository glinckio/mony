#!/usr/bin/env python3
"""
Valida design/tokens.json: estrutura, cores hex e contraste WCAG nos modos claro e escuro.

Uso (da raiz do projeto):
  python .claude/skills/app-design/scripts/validar_tokens.py
  python .claude/skills/app-design/scripts/validar_tokens.py caminho/para/tokens.json

Sai com código 1 se algo falhar. Para cada par reprovado, sugere a cor mais próxima que passa.
Não precisa de dependências.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

MODOS = ("light", "dark")

OBRIGATORIOS = [
    "background", "surface", "surfaceMuted", "surfaceElevated", "border",
    "text", "textMuted",
    "primary", "onPrimary", "primaryMuted", "onPrimaryMuted",
    "accent", "onAccent",
    "success", "onSuccess", "warning", "onWarning", "danger", "onDanger",
    "overlay", "placeholder",
]

PARES = [
    ("text", "background", 4.5),
    ("text", "surface", 4.5),
    ("text", "surfaceElevated", 4.5),
    ("textMuted", "background", 4.5),
    ("textMuted", "surface", 4.5),
    ("onPrimary", "primary", 4.5),
    ("onPrimaryMuted", "primaryMuted", 4.5),
    ("onAccent", "accent", 4.5),
    ("onSuccess", "success", 4.5),
    ("onWarning", "warning", 4.5),
    ("onDanger", "danger", 4.5),
    ("primary", "background", 3.0),
    ("primary", "surface", 3.0),
]

HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")


def parse_hex(valor: str) -> tuple[float, float, float, float]:
    h = valor.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return r, g, b, a


def compor(fg: tuple, bg: tuple) -> tuple[float, float, float]:
    """Mistura fg (com alfa) sobre bg opaco."""
    a = fg[3]
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3))


def luminancia(rgb: tuple) -> float:
    def canal(c: float) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (canal(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a: tuple, b: tuple) -> float:
    la, lb = luminancia(a), luminancia(b)
    claro, escuro = max(la, lb), min(la, lb)
    return (claro + 0.05) / (escuro + 0.05)


def para_hex(rgb: tuple) -> str:
    return "#" + "".join(f"{round(max(0, min(255, c))):02X}" for c in rgb)


def sugerir(mover: tuple, fixo: tuple, minimo: float) -> str | None:
    """Menor mistura de `mover` com preto ou branco que atinge o contraste mínimo contra `fixo`."""
    melhor = None
    for alvo in ((0, 0, 0), (255, 255, 255)):
        for passo in range(1, 101):
            t = passo / 100
            cand = tuple(mover[i] + (alvo[i] - mover[i]) * t for i in range(3))
            if contraste(cand, fixo) >= minimo:
                if melhor is None or t < melhor[0]:
                    melhor = (t, cand)
                break
    return para_hex(melhor[1]) if melhor else None


def resolver(semantico: dict, nome: str, fundo_modo: tuple) -> tuple | None:
    """Cor opaca de um token semântico (tokens com alfa são compostos sobre o background do modo)."""
    valor = semantico.get(nome)
    if not isinstance(valor, str) or not HEX.match(valor):
        return None
    c = parse_hex(valor)
    return compor(c, fundo_modo) if c[3] < 1 else c[:3]


def coletar_hex(no, caminho: str, erros: list[str]) -> None:
    if isinstance(no, dict):
        for k, v in no.items():
            coletar_hex(v, f"{caminho}.{k}" if caminho else k, erros)
    elif isinstance(no, str) and no.startswith("#") and not HEX.match(no):
        erros.append(f"hex inválido em {caminho}: {no}")


def main() -> int:
    caminho = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("design/tokens.json")
    if not caminho.exists():
        print(f"ERRO: {caminho} não encontrado. Rode da raiz do projeto ou passe o caminho.")
        return 1
    try:
        tokens = json.loads(caminho.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"ERRO: JSON inválido em {caminho}: {e}")
        return 1

    erros: list[str] = []
    avisos: list[str] = []
    cores = tokens.get("color", {})

    coletar_hex(cores, "color", erros)

    for modo in MODOS:
        if modo not in cores:
            erros.append(f"falta color.{modo}")
            continue
        faltando = [k for k in OBRIGATORIOS if k not in cores[modo]]
        if faltando:
            erros.append(f"color.{modo} sem tokens obrigatórios: {', '.join(faltando)}")

    if all(m in cores for m in MODOS):
        so_claro = set(cores["light"]) - set(cores["dark"])
        so_escuro = set(cores["dark"]) - set(cores["light"])
        if so_claro:
            erros.append(f"tokens só no claro: {', '.join(sorted(so_claro))}")
        if so_escuro:
            erros.append(f"tokens só no escuro: {', '.join(sorted(so_escuro))}")

    escala = tokens.get("typography", {}).get("scale", {})
    for nome, estilo in escala.items():
        tam = estilo.get("size") if isinstance(estilo, dict) else None
        if isinstance(tam, (int, float)) and tam < 12:
            erros.append(f"typography.scale.{nome}: tamanho {tam} < 12")
        alt = estilo.get("lineHeight") if isinstance(estilo, dict) else None
        if isinstance(tam, (int, float)) and isinstance(alt, (int, float)) and alt < tam:
            erros.append(f"typography.scale.{nome}: lineHeight {alt} menor que size {tam}")

    alvo = tokens.get("layout", {}).get("touchTarget")
    if alvo is None:
        avisos.append("layout.touchTarget ausente (recomendado: 48)")
    elif alvo < 44:
        erros.append(f"layout.touchTarget {alvo} < 44")

    pares = list(PARES)
    for extra in tokens.get("contrastChecks", []):
        try:
            pares.append((extra["fg"], extra["bg"], float(extra["min"])))
        except (KeyError, TypeError, ValueError):
            erros.append(f"contrastChecks inválido: {extra}")

    falhas = 0
    for modo in MODOS:
        sem = cores.get(modo)
        if not isinstance(sem, dict):
            continue
        fundo = resolver(sem, "background", (255, 255, 255)) or (255, 255, 255)
        print(f"\n== Contraste: {modo} ==")
        for fg_nome, bg_nome, minimo in pares:
            fg = resolver(sem, fg_nome, fundo)
            bg = resolver(sem, bg_nome, fundo)
            if fg is None or bg is None:
                if fg_nome in sem and bg_nome in sem:
                    avisos.append(f"{modo}: não deu para calcular {fg_nome}/{bg_nome}")
                continue
            r = contraste(fg, bg)
            ok = r >= minimo
            linha = f"  {'ok   ' if ok else 'FALHA'}  {fg_nome:<15} sobre {bg_nome:<16} {r:5.2f}:1  (mín {minimo})"
            if not ok:
                falhas += 1
                s_fg = sugerir(fg, bg, minimo)
                s_bg = sugerir(bg, fg, minimo)
                opcoes = [f"{fg_nome} {s_fg}" if s_fg else "", f"{bg_nome} {s_bg}" if s_bg else ""]
                linha += "  -> sugestão: " + " ou ".join(o for o in opcoes if o)
            print(linha)

    if avisos:
        print("\nAvisos:")
        for a in avisos:
            print(f"  - {a}")
    if erros:
        print("\nErros:")
        for e in erros:
            print(f"  - {e}")

    total = falhas + len(erros)
    print(f"\n{'OK: tokens válidos.' if total == 0 else f'REPROVADO: {falhas} par(es) de contraste e {len(erros)} erro(s).'}")
    return 0 if total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
