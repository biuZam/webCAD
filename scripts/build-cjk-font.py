"""T4.2 Build the CJK PDF font: Noto Sans SC Regular, subset to GB2312 (6,763 hanzi), CJK punctuation,
full-width forms, ASCII and Latin-1, as a glyf TrueType font that jsPDF can embed (jsPDF can't read CFF).

Source: NotoSansSC[wght].ttf from https://github.com/google/fonts/tree/main/ofl/notosanssc (SIL OFL 1.1).
Needs fontTools (pip install fonttools). Run once when updating the font, then commit the output:

    python3 scripts/build-cjk-font.py path/to/NotoSansSC[wght].ttf public/fonts/NotoSansSC-GB2312.ttf

jsPDF subsets again on export, so a PDF only carries the glyphs it uses.
"""

import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def gb2312_chars():
    """Every character GB2312 encodes (rows 0xA1–0xF7, cells 0xA1–0xFE)."""
    out = set()
    for hi in range(0xA1, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return out


def main(src, dst):
    font = TTFont(src)
    if "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": 400})
    chars = gb2312_chars()
    chars |= {chr(c) for c in range(0x20, 0x7F)}  # ASCII
    chars |= {chr(c) for c in range(0xA0, 0x100)}  # Latin-1
    chars |= {chr(c) for c in range(0x3000, 0x3040)}  # CJK symbols and punctuation
    chars |= {chr(c) for c in range(0xFF00, 0xFFF0)}  # full-width forms
    chars |= set("·—–‘’“”…•′″℃×÷±≤≥→←↔°")
    options = subset.Options()
    options.layout_features = []  # PDF text needs no shaping features
    options.hinting = False
    options.name_IDs = ["*"]  # keep copyright and licence names (OFL)
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(text="".join(sorted(chars)))
    sub.subset(font)
    font.save(dst)
    print(f"{dst}: {len(font.getBestCmap())} characters")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
