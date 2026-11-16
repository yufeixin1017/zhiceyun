import re
import sys
from pathlib import Path
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


def set_font(run, name="PingFang SC", size=10.5, bold=None, color=None):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_inline(paragraph, text, base_size=10.5):
    parts = re.split(r"(\*\*.*?\*\*|`.*?`)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = paragraph.add_run(part[2:-2])
            set_font(run, size=base_size, bold=True)
        elif part.startswith("`") and part.endswith("`"):
            run = paragraph.add_run(part[1:-1])
            set_font(run, name="Menlo", size=base_size - 1)
        else:
            run = paragraph.add_run(part)
            set_font(run, size=base_size)


def is_table_separator(line):
    return bool(re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]*$", line)) and "-" in line


def main(source, destination):
    lines = Path(source).read_text(encoding="utf-8").splitlines()
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(1.9)
    section.right_margin = Cm(1.9)
    for name, size, color in (("Normal", 10.5, "263449"), ("Heading 1", 17, "4C51C6"), ("Heading 2", 13, "202A44"), ("Heading 3", 11, "4C51C6")):
        style = doc.styles[name]
        style.font.name = "PingFang SC"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "PingFang SC")
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        if name != "Normal":
            style.font.bold = True
            style.paragraph_format.keep_with_next = True
    if "Code Block" not in doc.styles:
        from docx.enum.style import WD_STYLE_TYPE
        code_style = doc.styles.add_style("Code Block", WD_STYLE_TYPE.PARAGRAPH)
    else:
        code_style = doc.styles["Code Block"]
    code_style.font.name = "Menlo"
    code_style._element.rPr.rFonts.set(qn("w:eastAsia"), "Menlo")
    code_style.font.size = Pt(8.5)
    code_style.paragraph_format.left_indent = Cm(0.5)
    code_style.paragraph_format.space_after = Pt(6)

    i = 0
    in_code = False
    code_lines = []
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            if in_code:
                for code in code_lines:
                    doc.add_paragraph(code or " ", style="Code Block")
                code_lines = []
            in_code = not in_code
            i += 1
            continue
        if in_code:
            code_lines.append(line)
            i += 1
            continue
        if not line.strip():
            i += 1
            continue
        if line.strip() == "---":
            p = doc.add_paragraph("────────────────────────────────")
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                set_font(run, size=8, color="B4BDCE")
            i += 1
            continue
        heading = re.match(r"^(#{1,3})\s+(.*)$", line)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1:
                doc.add_heading(text, 0)
            else:
                doc.add_heading(text, level=level - 1)
            i += 1
            continue
        if line.lstrip().startswith(">"):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.5)
            add_inline(p, line.lstrip()[1:].strip())
            for run in p.runs:
                run.font.color.rgb = RGBColor.from_string("4C51C6")
            i += 1
            continue
        if line.strip().startswith("|") and line.strip().endswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            rows = [[cell.strip() for cell in row.strip("|").split("|")] for row in table_lines if not is_table_separator(row)]
            if rows:
                table = doc.add_table(rows=1, cols=len(rows[0]))
                table.style = "Table Grid"
                for col, text in enumerate(rows[0]):
                    table.rows[0].cells[col].text = text
                    for run in table.rows[0].cells[col].paragraphs[0].runs:
                        set_font(run, size=9, bold=True, color="FFFFFF")
                    from docx.oxml import OxmlElement
                    shd = OxmlElement("w:shd")
                    shd.set(qn("w:fill"), "4C51C6")
                    table.rows[0].cells[col]._tc.get_or_add_tcPr().append(shd)
                for values in rows[1:]:
                    cells = table.add_row().cells
                    for col, text in enumerate(values):
                        cells[col].text = text
                        for run in cells[col].paragraphs[0].runs:
                            set_font(run, size=9)
                doc.add_paragraph()
            continue
        bullet = re.match(r"^\s*[-*]\s+(.*)$", line)
        if bullet:
            p = doc.add_paragraph(style="List Bullet")
            add_inline(p, bullet.group(1))
            i += 1
            continue
        numbered = re.match(r"^\s*\d+\.\s+(.*)$", line)
        if numbered:
            p = doc.add_paragraph(style="List Number")
            add_inline(p, numbered.group(1))
            i += 1
            continue
        p = doc.add_paragraph()
        add_inline(p, line)
        i += 1
    doc.core_properties.title = "智测云 AI 协同 Prompt 演进记录"
    doc.save(destination)
    print(destination)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
