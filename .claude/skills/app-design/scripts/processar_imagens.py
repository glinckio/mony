#!/usr/bin/env python3
"""
Integra as imagens geradas no ChatGPT ao app.

Lê design/assets.json e, para cada imagem encontrada em design/img-original/:
  - apara a sobra transparente (aparar)
  - recorta para a proporção do slot respeitando o foco (cobrir) ou encaixa com margem (conter)
  - achata o canal alfa quando a imagem deve ser opaca
  - gera as densidades da stack (@2x/@3x, 2.0x/3.0x, drawable-*dpi, imageset) sem ampliar
  - comprime (png otimizado/quantizado, jpg progressivo, webp)
  - calcula a cor média (fundo do placeholder enquanto carrega)
  - imagens de efeito ("efeito" no manifesto): converte luz sobre preto em transparência,
    confere a emenda de texturas que repetem e aceita ampliar efeitos suaves
  - regrava o registro de imagens (ts/js/dart) e o status no assets.json

Uso (da raiz do projeto; no macOS/Linux use python3):
  python .claude/skills/app-design/scripts/processar_imagens.py              # processa o que existir
  python .claude/skills/app-design/scripts/processar_imagens.py --verificar  # só relatório, não grava nada
  python .claude/skills/app-design/scripts/processar_imagens.py --so hero_home.png --so vazio.png
  python .claude/skills/app-design/scripts/processar_imagens.py --manifesto outro/assets.json

Requer Pillow: pip install pillow
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from PIL import Image, ImageChops, ImageMath, ImageOps, ImageStat
except ImportError:
    print("Pillow não está instalado. Rode: pip install pillow")
    sys.exit(2)

LAYOUT_POR_STACK = {
    "expo": "sufixo", "react-native": "sufixo", "rn": "sufixo",
    "flutter": "flutter",
    "android": "android", "compose": "android", "kmp": "android",
    "ios": "ios", "swiftui": "ios",
    "unico": "unico", "ionic": "unico", "capacitor": "unico", "maui": "unico",
    "nativescript": "unico", "web": "unico",
}
DENSIDADES_PADRAO = {
    "sufixo": [1, 2, 3],
    "flutter": [1, 2, 3],
    "android": [1, 1.5, 2, 3],  # xxxhdpi (4) só se pedir em "densidades": o ChatGPT raramente tem resolução
    "ios": [1, 2, 3],
    "unico": [3],
}
PASTA_ANDROID = {1: "drawable-mdpi", 1.5: "drawable-hdpi", 2: "drawable-xhdpi", 3: "drawable-xxhdpi", 4: "drawable-xxxhdpi"}
FOCOS = {
    "centro": (0.5, 0.5), "topo": (0.5, 0.0), "base": (0.5, 1.0),
    "esquerda": (0.0, 0.5), "direita": (1.0, 0.5),
    "topo-esquerda": (0.0, 0.0), "topo-direita": (1.0, 0.0),
    "base-esquerda": (0.0, 1.0), "base-direita": (1.0, 1.0),
}
EXTENSOES = (".png", ".jpg", ".jpeg", ".webp")
EXT_FORMATO = {"png": ".png", "jpg": ".jpg", "webp": ".webp"}
LIMIAR_ALFA = 8  # pixels com alfa abaixo disso contam como transparentes ao aparar
TIPOS_EFEITO = ("fundo", "camada", "luz", "textura", "peca")
PADRAO_EFEITO = {
    "luz": {"luz_para_alfa": True, "suave": True, "mistura": "tela"},
    "textura": {"repetir": True},
}


class ErroConfig(Exception):
    pass


# ---------------------------------------------------------------- utilidades

def hex_para_rgb(valor: str) -> tuple[int, int, int]:
    h = valor.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if not re.fullmatch(r"[0-9a-fA-F]{6}([0-9a-fA-F]{2})?", h):
        raise ErroConfig(f"cor inválida: {valor}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_para_hex(rgb) -> str:
    return "#" + "".join(f"{round(c):02X}" for c in rgb[:3])


def tem_transparencia(img: Image.Image) -> bool:
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        return img.convert("RGBA").getchannel("A").getextrema()[0] < 250
    return False


def fmt_d(d: float) -> str:
    return str(int(d)) if float(d).is_integer() else str(d)


def kb(caminho: Path) -> float:
    return caminho.stat().st_size / 1024


def camel(nome: str) -> str:
    partes = [p for p in re.split(r"[^0-9a-zA-Z]+", nome) if p]
    if not partes:
        return "img"
    s = partes[0].lower() + "".join(p[:1].upper() + p[1:] for p in partes[1:])
    return s if s[0].isalpha() else "img" + s[0].upper() + s[1:]


# ---------------------------------------------------------------- manifesto

def dimensoes_exibicao(a: dict, cfg: dict) -> tuple[float, float]:
    ex = a.get("exibicao")
    if not isinstance(ex, dict):
        raise ErroConfig("'exibicao' ausente ou inválida")
    lt = float(cfg.get("larguraTela", 430))
    at = float(cfg.get("alturaTela", 932))
    w = ex.get("largura")
    w = lt if w == "tela" else w
    h = ex.get("altura")
    h = at if h == "tela" else h
    if h is None and "proporcao" in ex:
        try:
            pw, ph = (float(x) for x in str(ex["proporcao"]).split(":"))
        except ValueError:
            raise ErroConfig(f"proporcao inválida: {ex['proporcao']}")
        h = float(w) * ph / pw
    if not isinstance(w, (int, float)) or not isinstance(h, (int, float)) or w <= 0 or h <= 0:
        raise ErroConfig("'exibicao' precisa de largura e altura (ou proporcao) positivas")
    return float(w), float(h)


def foco(a: dict) -> tuple[float, float]:
    f = a.get("foco", "centro")
    if isinstance(f, list) and len(f) == 2:
        return min(max(float(f[0]), 0), 1), min(max(float(f[1]), 0), 1)
    if f in FOCOS:
        return FOCOS[f]
    raise ErroConfig(f"foco inválido: {f}")


def achar_origem(pasta: Path, arquivo: str) -> tuple[Path | None, str | None]:
    exato = pasta / arquivo
    if exato.is_file():
        return exato, None
    if not pasta.is_dir():
        return None, None
    alvo = Path(arquivo).stem.lower()
    for p in sorted(pasta.iterdir()):
        if p.is_file() and p.suffix.lower() in EXTENSOES and p.stem.lower().strip() == alvo:
            return p, f"encontrado como '{p.name}' (renomeie para '{arquivo}')"
    return None, None


# ---------------------------------------------------------------- imagem

def preparar(img: Image.Image, a: dict, cfg: dict, avisos: list[str]) -> Image.Image:
    """Devolve a imagem-base já na proporção do slot, na maior resolução disponível."""
    img = ImageOps.exif_transpose(img)
    ef = efeito(a)
    transparente = eh_transparente(a)
    if ef.get("luz_para_alfa"):
        if tem_transparencia(img):
            avisos.append("luz_para_alfa: a imagem já tem transparência; converti mesmo assim pelo brilho")
        img = luz_para_alfa(img, int(ef.get("preto", 12)))
    alfa = tem_transparencia(img)
    img = img.convert("RGBA")

    if transparente and not alfa:
        avisos.append("esperava fundo transparente, mas a imagem é opaca")

    if a.get("aparar"):
        if alfa:
            mascara = img.getchannel("A").point(lambda v: 255 if v > LIMIAR_ALFA else 0)
            caixa = mascara.getbbox()
            if caixa:
                img = img.crop(caixa)
        else:
            avisos.append("'aparar' ignorado: a imagem não tem transparência")

    w_dp, h_dp = dimensoes_exibicao(a, cfg)
    alvo = w_dp / h_dp
    fx, fy = foco(a)
    iw, ih = img.size
    ajuste = a.get("ajuste", "cobrir")

    if ef.get("repetir") and abs(iw / ih - alvo) > 0.01:
        avisos.append("textura que repete foi recortada: use 'exibicao' com a mesma proporção da imagem, "
                      "senão a emenda quebra")

    if ajuste == "cobrir":
        if iw / ih > alvo:
            nw = round(ih * alvo)
            x = round((iw - nw) * fx)
            img = img.crop((x, 0, x + nw, ih))
        else:
            nh = round(iw / alvo)
            y = round((ih - nh) * fy)
            img = img.crop((0, y, iw, y + nh))
    elif ajuste == "conter":
        margem = float(a.get("margem", 0))
        if not 0 <= margem < 0.5:
            raise ErroConfig("margem precisa estar entre 0 e 0.45")
        util = 1 - 2 * margem
        if iw / ih > alvo:
            cw = iw / util
            ch = cw / alvo
        else:
            ch = ih / util
            cw = ch * alvo
        cw, ch = round(cw), round(ch)
        cor = (0, 0, 0, 0) if transparente else (*fundo(a, cfg), 255)
        tela = Image.new("RGBA", (cw, ch), cor)
        livre_x, livre_y = cw - iw, ch - ih
        # com margem, o foco alinha dentro da área útil; sem margem, dentro da tela toda
        mx, my = round(cw * margem), round(ch * margem)
        x = mx + round((livre_x - 2 * mx) * fx) if livre_x >= 2 * mx else round(livre_x * fx)
        y = my + round((livre_y - 2 * my) * fy) if livre_y >= 2 * my else round(livre_y * fy)
        tela.alpha_composite(img, (x, y))
        img = tela
    else:
        raise ErroConfig(f"ajuste inválido: {ajuste} (use 'cobrir' ou 'conter')")

    if not transparente:
        base = Image.new("RGBA", img.size, (*fundo(a, cfg), 255))
        base.alpha_composite(img)
        img = base.convert("RGB")
    if ef.get("repetir"):
        checar_emenda(img, avisos)
    return img


# ---------------------------------------------------------------- efeitos

def efeito(a: dict) -> dict:
    """Config de efeito da entrada, com os padrões do tipo. Vazio se a imagem não é efeito."""
    ef = a.get("efeito")
    if not ef:
        return {}
    if isinstance(ef, str):
        ef = {"tipo": ef}
    tipo = ef.get("tipo")
    if tipo not in TIPOS_EFEITO:
        raise ErroConfig(f"efeito.tipo inválido: {tipo} (use {', '.join(TIPOS_EFEITO)})")
    return {"mistura": "normal", **PADRAO_EFEITO.get(tipo, {}), **ef}


def eh_transparente(a: dict) -> bool:
    return bool(a.get("transparente", False)) or bool(efeito(a).get("luz_para_alfa"))


def luz_para_alfa(img: Image.Image, preto: int) -> Image.Image:
    """Luz sobre fundo preto -> PNG transparente: o brilho vira alfa e a cor é despremultiplicada,
    para a luz aparecer igual sobre qualquer fundo (claro ou escuro)."""
    r, g, b = img.convert("RGB").split()
    m = ImageChops.lighter(ImageChops.lighter(r, g), b)

    def dividir(c: Image.Image) -> Image.Image:
        if hasattr(ImageMath, "lambda_eval"):
            return ImageMath.lambda_eval(
                lambda x: x["convert"](x["min"](x["c"] * 255 / x["m"], 255), "L"), c=c, m=m)
        return ImageMath.eval("convert(min(c * 255 / m, 255), 'L')", c=c, m=m)

    escala = 255 / (255 - preto) if preto < 255 else 1
    alfa = m.point(lambda v: 0 if v <= preto else min(255, round((v - preto) * escala)))
    return Image.merge("RGBA", (dividir(r), dividir(g), dividir(b), alfa))


def checar_emenda(img: Image.Image, avisos: list[str]) -> None:
    """Textura que repete: compara as bordas opostas com a variação normal entre linhas vizinhas."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    if w < 4 or h < 4:
        return

    def dif(x: Image.Image, y: Image.Image) -> float:
        return sum(ImageStat.Stat(ImageChops.difference(x, y)).mean) / 3

    def col(i: int) -> Image.Image:
        return rgb.crop((i, 0, i + 1, h))

    def lin(i: int) -> Image.Image:
        return rgb.crop((0, i, w, i + 1))

    for eixo, borda, normal in (
        ("esquerda/direita", dif(col(0), col(w - 1)), dif(col(w // 2), col(w // 2 + 1))),
        ("topo/base", dif(lin(0), lin(h - 1)), dif(lin(h // 2), lin(h // 2 + 1))),
    ):
        if borda > max(10.0, 3 * normal):
            avisos.append(f"textura com emenda visível nas bordas {eixo} (diferença {borda:.0f}): "
                          "peça de novo como 'seamless tileable' ou use sem repetir")


def fundo(a: dict, cfg: dict) -> tuple[int, int, int]:
    return hex_para_rgb(a.get("fundo") or cfg.get("fundo") or "#FFFFFF")


def cor_media(img: Image.Image) -> str:
    if img.mode == "RGBA":
        mascara = img.getchannel("A").point(lambda v: 255 if v > 32 else 0)
        if mascara.getbbox() is None:
            return "#000000"
        media = ImageStat.Stat(img.convert("RGB"), mask=mascara).mean
    else:
        media = ImageStat.Stat(img.convert("RGB")).mean
    return rgb_para_hex(media)


def salvar(img: Image.Image, caminho: Path, formato: str, a: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    qualidade = int(a.get("qualidade", 85))
    if formato == "jpg":
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(caminho, "JPEG", quality=qualidade, optimize=True, progressive=True)
    elif formato == "webp":
        img.save(caminho, "WEBP", quality=qualidade, method=6)
    else:
        if a.get("quantizar"):
            img = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        img.save(caminho, "PNG", optimize=True)


def caminhos_saida(layout: str, destino: Path, nome: str, ext: str, d: float) -> Path:
    if layout == "sufixo":
        return destino / (f"{nome}{ext}" if d == 1 else f"{nome}@{fmt_d(d)}x{ext}")
    if layout == "flutter":
        return destino / (f"{nome}{ext}" if d == 1 else f"{d:.1f}x/{nome}{ext}")
    if layout == "android":
        if d not in PASTA_ANDROID:
            raise ErroConfig(f"densidade {d} sem pasta Android (use 1, 1.5, 2, 3, 4)")
        return destino / PASTA_ANDROID[d] / f"{nome}{ext}"
    if layout == "ios":
        return destino / f"{nome}.imageset" / (f"{nome}{ext}" if d == 1 else f"{nome}@{fmt_d(d)}x{ext}")
    return destino / f"{nome}{ext}"  # unico


def gerar_densidades(base: Image.Image, a: dict, cfg: dict, layout: str, destino: Path,
                     nome: str, formato: str, gravar: bool, avisos: list[str]) -> tuple[list[Path], tuple[int, int]]:
    w_dp, h_dp = dimensoes_exibicao(a, cfg)
    densidades = a.get("densidades") or cfg.get("densidades") or DENSIDADES_PADRAO[layout]
    densidades = sorted(float(d) for d in densidades)
    if layout == "unico":
        densidades = [densidades[-1]]
    ext = EXT_FORMATO[formato]
    bw, bh = base.size
    saidas: list[Path] = []
    maior = (0, 0)
    suave = bool(efeito(a).get("suave"))
    for d in densidades:
        tw, th = round(w_dp * d), round(h_dp * d)
        if tw > bw:
            if suave:
                # efeito suave (glow, gradiente, bokeh): o app amplia sem perda visível,
                # então a densidade maior fica na resolução original (arquivo menor, sem aviso)
                tw, th = bw, bh
            elif a.get("ampliar"):
                if d == densidades[-1]:
                    avisos.append(f"@{fmt_d(d)}x ampliado de {bw}x{bh} para {tw}x{th} ({tw / bw:.0%})")
            else:
                if d == densidades[-1]:
                    avisos.append(f"@{fmt_d(d)}x ficou com {bw}x{bh} ({bw / tw:.0%} do ideal {tw}x{th})")
                tw, th = bw, bh
        img = base if (tw, th) == (bw, bh) else base.resize((tw, th), Image.Resampling.LANCZOS)
        caminho = caminhos_saida(layout, destino, nome, ext, d)
        if gravar:
            salvar(img, caminho, formato, a)
        saidas.append(caminho)
        maior = (tw, th)
    if gravar and layout == "ios":
        conteudo = {
            "images": [
                {"filename": p.name, "idiom": "universal", "scale": f"{fmt_d(d)}x"}
                for p, d in zip(saidas, densidades)
            ],
            "info": {"author": "xcode", "version": 1},
        }
        (destino / f"{nome}.imageset" / "Contents.json").write_text(json.dumps(conteudo, indent=2), encoding="utf-8")
    return saidas, maior


# ---------------------------------------------------------------- registro

def arquivo_base(layout: str, destino: Path, nome: str, formato: str, a: dict, cfg: dict) -> Path:
    densidades = sorted(float(d) for d in (a.get("densidades") or cfg.get("densidades") or DENSIDADES_PADRAO[layout]))
    d = densidades[-1] if layout == "unico" else (1.0 if 1.0 in densidades else densidades[0])
    return caminhos_saida(layout, destino, nome, EXT_FORMATO[formato], d)


def escrever_registro(cfg: dict, entradas: list[dict], layout: str) -> Path | None:
    reg = cfg.get("registro")
    if not reg:
        return None
    arquivo = Path(reg["arquivo"])
    linguagem = reg.get("linguagem", arquivo.suffix.lstrip("."))
    # "idioma": "en" no registro: campos e comentário do arquivo gerado em
    # inglês, para projetos cujo código é todo em inglês.
    ingles = reg.get("idioma") == "en"
    if ingles:
        cabecalho = (
            "Generated by .claude/skills/app-design/scripts/processar_imagens.py\n"
            "Do not edit by hand: run the script again after saving images to design/img-original/."
        )
    else:
        cabecalho = (
            "Gerado por .claude/skills/app-design/scripts/processar_imagens.py\n"
            "Não edite à mão: rode o script de novo depois de salvar imagens em design/img-original/."
        )
    if linguagem in ("ts", "js"):
        if layout != "sufixo":
            raise ErroConfig("registro ts/js só funciona com stack expo/react-native")
        linhas_img, linhas_meta = [], []
        for e in entradas:
            chave = e["nome"] if re.fullmatch(r"[A-Za-z_$][\w$]*", e["nome"]) else f"'{e['nome']}'"
            if e["existe"]:
                rel = os.path.relpath(e["base"], arquivo.parent).replace(os.sep, "/")
                rel = rel if rel.startswith(".") else "./" + rel
                linhas_img.append(f"  {chave}: require('{rel}'),")
            else:
                linhas_img.append(f"  {chave}: null,")
            cor = f"'{e['cor']}'" if e["cor"] else "null"
            ef = f"'{e['efeito']}'" if e["efeito"] else "null"
            campos = (
                ("file", "width", "height", "color", "effect", "repeat", "blend")
                if ingles
                else ("arquivo", "largura", "altura", "cor", "efeito", "repetir", "mistura")
            )
            valores = (
                f"'{e['arquivo']}'", f"{e['w']:g}", f"{e['h']:g}", cor, ef,
                "true" if e["repetir"] else "false", f"'{e['mistura']}'",
            )
            linhas_meta.append(
                f"  {chave}: {{ " + ", ".join(f"{c}: {v}" for c, v in zip(campos, valores)) + " },"
            )
        comentario = "\n".join(f"// {l}" for l in cabecalho.splitlines())
        if linguagem == "ts":
            corpo = (
                f"{comentario}\n"
                "import type { ImageSourcePropType } from 'react-native';\n\n"
                "export const images = {\n" + "\n".join(linhas_img) + "\n"
                "} satisfies Record<string, ImageSourcePropType | null>;\n\n"
                "export const imageMeta = {\n" + "\n".join(linhas_meta) + "\n"
                "} as const;\n\n"
                "export type ImageKey = keyof typeof images;\n"
            )
        else:
            corpo = (
                f"{comentario}\n"
                "export const images = {\n" + "\n".join(linhas_img) + "\n};\n\n"
                "export const imageMeta = {\n" + "\n".join(linhas_meta) + "\n};\n"
            )
    elif linguagem == "dart":
        if layout != "flutter":
            raise ErroConfig("registro dart só funciona com stack flutter")
        consts, mapa = [], []
        for e in entradas:
            ident = camel(e["nome"])
            caminho = f"'{e['base'].as_posix()}'" if e["existe"] else "null"
            cor = f"0xFF{e['cor'][1:]}" if e["cor"] else "null"
            ef = f"'{e['efeito']}'" if e["efeito"] else "null"
            consts.append(
                f"  static const {ident} = AppImageInfo(path: {caminho}, arquivo: '{e['arquivo']}', "
                f"largura: {float(e['w'])}, altura: {float(e['h'])}, cor: {cor}, "
                f"efeito: {ef}, repetir: {'true' if e['repetir'] else 'false'}, mistura: '{e['mistura']}');"
            )
            mapa.append(f"    '{e['nome']}': {ident},")
        comentario = "\n".join(f"// {l}" for l in cabecalho.splitlines())
        corpo = (
            f"{comentario}\n\n"
            "class AppImageInfo {\n"
            "  const AppImageInfo({required this.path, required this.arquivo, required this.largura, required this.altura, this.cor,\n"
            "      this.efeito, this.repetir = false, this.mistura = 'normal'});\n"
            "  final String? path;\n  final String arquivo;\n  final double largura;\n  final double altura;\n  final int? cor;\n"
            "  /// fundo, camada, luz, textura ou peca (null = imagem comum)\n  final String? efeito;\n"
            "  final bool repetir;\n  /// normal ou tela (screen)\n  final String mistura;\n"
            "  bool get disponivel => path != null;\n  double get proporcao => largura / altura;\n}\n\n"
            "abstract final class AppImages {\n" + "\n".join(consts) + "\n\n"
            "  static const all = <String, AppImageInfo>{\n" + "\n".join(mapa) + "\n  };\n}\n"
        )
    else:
        raise ErroConfig(f"linguagem de registro não suportada: {linguagem} (use ts, js ou dart)")
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    arquivo.write_text(corpo, encoding="utf-8")
    return arquivo


# ---------------------------------------------------------------- principal

def main() -> int:
    ap = argparse.ArgumentParser(description="Integra as imagens do ChatGPT ao app.")
    ap.add_argument("--manifesto", default="design/assets.json")
    ap.add_argument("--verificar", action="store_true", help="só relatório, não grava nada")
    ap.add_argument("--so", action="append", default=[], help="processa só este arquivo/nome (pode repetir)")
    args = ap.parse_args()

    manifesto = Path(args.manifesto)
    if not manifesto.exists():
        print(f"ERRO: {manifesto} não encontrado. Rode da raiz do projeto.")
        return 1
    cfg = json.loads(manifesto.read_text(encoding="utf-8"))

    stack = str(cfg.get("stack", "")).lower()
    if stack not in LAYOUT_POR_STACK:
        print(f"ERRO: stack '{stack}' inválida. Use: {', '.join(sorted(set(LAYOUT_POR_STACK)))}")
        return 1
    layout = LAYOUT_POR_STACK[stack]
    origem = Path(cfg.get("origem", "design/img-original"))
    destino_geral = Path(cfg.get("destino", "assets/images"))
    gravar = not args.verificar
    filtro = {s.lower() for s in args.so}

    linhas = []
    registro = []
    erros = 0
    arquivos_mapeados = set()

    for a in cfg.get("assets", []):
        arquivo = a.get("arquivo")
        if not arquivo:
            print("ERRO: entrada sem 'arquivo' no manifesto")
            erros += 1
            continue
        nome = a.get("nome") or Path(arquivo).stem
        arquivos_mapeados.add(Path(arquivo).stem.lower())
        try:
            ef_cfg = efeito(a)
        except ErroConfig as e:
            print(f"ERRO: {arquivo}: {e}")
            erros += 1
            continue
        transparente = eh_transparente(a)
        formato = a.get("formato") or ("png" if transparente else "jpg")
        if formato not in EXT_FORMATO:
            print(f"ERRO: {arquivo}: formato '{formato}' inválido (png, jpg, webp)")
            erros += 1
            continue
        if formato == "jpg" and transparente:
            print(f"ERRO: {arquivo}: jpg não tem transparência. Use png ou webp.")
            erros += 1
            continue
        destino = Path(a.get("destino") or destino_geral)
        avisos: list[str] = []
        situacao = ""
        tam_origem = "-"
        tam_saida = "-"
        peso = "-"

        if layout == "android" and not re.fullmatch(r"[a-z][a-z0-9_]*", nome):
            avisos.append(f"nome '{nome}' inválido para recurso Android (use a-z, 0-9 e _)")

        selecionado = not filtro or arquivo.lower() in filtro or nome.lower() in filtro
        caminho, aviso_nome = achar_origem(origem, arquivo)
        if aviso_nome:
            avisos.append(aviso_nome)

        if caminho is None:
            situacao = "pendente"
            if gravar and a.get("status") != "reprovada":
                a["status"] = "pendente"
        elif not selecionado:
            situacao = "ignorado (--so)"
        elif a.get("status") == "reprovada" and not filtro:
            situacao = "reprovada (pulei)"
        else:
            try:
                with Image.open(caminho) as bruta:
                    bruta.load()
                    tam_origem = f"{bruta.size[0]}x{bruta.size[1]}"
                    if a.get("tipo") in ("icone", "simbolo") and bruta.size[0] != bruta.size[1]:
                        avisos.append("ícone/símbolo deveria ser quadrado")
                    if a.get("tipo") in ("icone", "simbolo") and min(bruta.size) < 1024:
                        avisos.append("ícone/símbolo menor que 1024 px")
                    alfa = tem_transparencia(bruta)
                    if a.get("tipo") == "icone" and not transparente and alfa:
                        avisos.append("ícone com transparência: achatado sobre 'fundo' (iOS exige opaco)")
                    if a.get("processar", True) is False:
                        situacao = "ok (só conferido)"
                    else:
                        base = preparar(bruta, a, cfg, avisos)
                        saidas, maior = gerar_densidades(base, a, cfg, layout, destino, nome, formato, gravar, avisos)
                        tam_saida = f"{maior[0]}x{maior[1]}"
                        cor = cor_media(base)
                        if gravar:
                            peso = f"{sum(kb(p) for p in saidas):.0f} KB"
                            a["status"] = "integrado"
                            a["cor_media"] = cor
                        situacao = "integrado" if gravar else "pronto p/ processar"
            except ErroConfig as e:
                situacao = "ERRO"
                avisos.append(str(e))
                erros += 1
            except OSError as e:
                situacao = "ERRO"
                avisos.append(f"não consegui abrir: {e}")
                erros += 1

        if a.get("processar", True) is not False and a.get("registro", True) is not False:
            try:
                w_dp, h_dp = dimensoes_exibicao(a, cfg)
                base_path = arquivo_base(layout, destino, nome, formato, a, cfg)
                registro.append({
                    "nome": nome,
                    "arquivo": base_path.name,
                    "base": base_path,
                    "existe": base_path.exists(),
                    "w": round(w_dp, 1),
                    "h": round(h_dp, 1),
                    "cor": a.get("cor_media") if base_path.exists() else None,
                    "efeito": ef_cfg.get("tipo"),
                    "repetir": bool(ef_cfg.get("repetir")),
                    "mistura": ef_cfg.get("mistura", "normal"),
                })
            except ErroConfig as e:
                if situacao != "ERRO":
                    avisos.append(str(e))
                    erros += 1

        linhas.append((nome if nome == Path(arquivo).stem else f"{nome} <- {arquivo}",
                       situacao, tam_origem, tam_saida, peso, avisos, a.get("prioridade", "")))

    nao_mapeados = []
    if origem.is_dir():
        for p in sorted(origem.iterdir()):
            if p.is_file() and p.suffix.lower() in EXTENSOES and p.stem.lower().strip() not in arquivos_mapeados:
                nao_mapeados.append(p.name)

    # relatório
    print(f"\nStack: {stack} ({layout})  ·  origem: {origem}  ·  destino: {destino_geral}"
          f"{'  ·  MODO VERIFICAR (nada gravado)' if args.verificar else ''}\n")
    col = max([len(l[0]) for l in linhas] + [6])
    print(f"{'imagem':<{col}}  {'situação':<22} {'original':<11} {'maior saída':<12} {'peso':<9} prioridade")
    print("-" * (col + 72))
    for nome, situacao, to, ts, peso, avisos, prio in linhas:
        print(f"{nome:<{col}}  {situacao:<22} {to:<11} {ts:<12} {peso:<9} {prio}")
        for av in avisos:
            print(f"{'':<{col}}    ! {av}")
    if nao_mapeados:
        print("\nArquivos em img-original que não estão no manifesto:")
        for n in nao_mapeados:
            print(f"  - {n}")

    integrados = sum(1 for l in linhas if l[1] == "integrado")
    pendentes = sum(1 for l in linhas if l[1] == "pendente")
    print(f"\nResumo: {integrados} integrada(s), {pendentes} pendente(s), {erros} erro(s).")

    if gravar:
        try:
            reg = escrever_registro(cfg, registro, layout)
            if reg:
                disponiveis = sum(1 for e in registro if e["existe"])
                print(f"Registro de imagens: {reg} ({disponiveis} de {len(registro)} disponíveis)")
        except ErroConfig as e:
            print(f"ERRO no registro: {e}")
            erros += 1
        manifesto.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
