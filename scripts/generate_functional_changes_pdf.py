"""Generate the August 2026 functional changes user guide as a PDF."""

from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs" / "functional-changes-1c70043-to-8b9cf07.md"
DEFAULT_OUTPUT = (
    ROOT / "output" / "pdf" / "compania-functional-changes-1c70043-to-8b9cf07.pdf"
)

NAVY = colors.HexColor("#172554")
BLUE = colors.HexColor("#2563EB")
CYAN = colors.HexColor("#22D3EE")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#5D6678")
PALE_BLUE = colors.HexColor("#EFF6FF")
PALE_CYAN = colors.HexColor("#ECFEFF")
LIGHT_LINE = colors.HexColor("#DCE4EF")
TABLE_HEAD = colors.HexColor("#E9F0FB")
WHITE = colors.white


def register_fonts() -> None:
    font_dir = Path("C:/Windows/Fonts")
    fonts = {
        "GuideSans": font_dir / "arial.ttf",
        "GuideSans-Bold": font_dir / "arialbd.ttf",
        "GuideMono": font_dir / "cour.ttf",
        "GuideMono-Bold": font_dir / "courbd.ttf",
    }
    for name, path in fonts.items():
        if not path.exists():
            raise FileNotFoundError(f"Required font was not found: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path)))


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles = {
        "body": ParagraphStyle(
            "GuideBody",
            parent=base["BodyText"],
            fontName="GuideSans",
            fontSize=9.2,
            leading=12.8,
            textColor=INK,
            spaceAfter=7,
            splitLongWords=True,
        ),
        "body_small": ParagraphStyle(
            "GuideBodySmall",
            parent=base["BodyText"],
            fontName="GuideSans",
            fontSize=8.1,
            leading=10.6,
            textColor=INK,
            splitLongWords=True,
        ),
        "list_item": ParagraphStyle(
            "GuideListItem",
            parent=base["BodyText"],
            fontName="GuideSans",
            fontSize=9.2,
            leading=12.8,
            textColor=INK,
            spaceAfter=0,
            splitLongWords=True,
        ),
        "list_marker": ParagraphStyle(
            "GuideListMarker",
            parent=base["BodyText"],
            fontName="GuideSans-Bold",
            fontSize=8.5,
            leading=12.8,
            textColor=BLUE,
            alignment=TA_LEFT,
            spaceAfter=0,
        ),
        "section": ParagraphStyle(
            "GuideSection",
            parent=base["Heading1"],
            fontName="GuideSans-Bold",
            fontSize=18,
            leading=22,
            textColor=NAVY,
            spaceAfter=12,
            keepWithNext=True,
        ),
        "change": ParagraphStyle(
            "GuideChange",
            parent=base["Heading2"],
            fontName="GuideSans-Bold",
            fontSize=12.6,
            leading=16,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=7,
            keepWithNext=True,
        ),
        "location_heading": ParagraphStyle(
            "LocationHeading",
            parent=base["BodyText"],
            fontName="GuideSans-Bold",
            fontSize=7.6,
            leading=9,
            textColor=BLUE,
            spaceAfter=3,
        ),
        "location": ParagraphStyle(
            "LocationBody",
            parent=base["BodyText"],
            fontName="GuideSans",
            fontSize=8.0,
            leading=10.8,
            textColor=INK,
            splitLongWords=True,
        ),
        "formula": ParagraphStyle(
            "GuideFormula",
            parent=base["BodyText"],
            fontName="GuideSans-Bold",
            fontSize=9.2,
            leading=13,
            textColor=NAVY,
            alignment=TA_LEFT,
        ),
        "table_header": ParagraphStyle(
            "GuideTableHeader",
            parent=base["BodyText"],
            fontName="GuideSans-Bold",
            fontSize=8.0,
            leading=10,
            textColor=NAVY,
        ),
        "table_cell": ParagraphStyle(
            "GuideTableCell",
            parent=base["BodyText"],
            fontName="GuideSans",
            fontSize=7.7,
            leading=10.2,
            textColor=INK,
            splitLongWords=True,
        ),
        "cover_brand": ParagraphStyle(
            "CoverBrand",
            parent=base["BodyText"],
            fontName="GuideSans-Bold",
            fontSize=10,
            leading=13,
            tracking=1.5,
            textColor=CYAN,
            spaceAfter=16,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="GuideSans-Bold",
            fontSize=28,
            leading=33,
            alignment=TA_LEFT,
            textColor=WHITE,
            spaceAfter=14,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["BodyText"],
            fontName="GuideSans",
            fontSize=12,
            leading=17,
            textColor=colors.HexColor("#DCEBFF"),
            spaceAfter=22,
        ),
        "cover_meta": ParagraphStyle(
            "CoverMeta",
            parent=base["BodyText"],
            fontName="GuideSans-Bold",
            fontSize=9,
            leading=13,
            textColor=WHITE,
        ),
        "cover_metric_value": ParagraphStyle(
            "CoverMetricValue",
            parent=base["BodyText"],
            fontName="GuideSans-Bold",
            fontSize=17,
            leading=20,
            alignment=TA_CENTER,
            textColor=WHITE,
        ),
        "cover_metric_label": ParagraphStyle(
            "CoverMetricLabel",
            parent=base["BodyText"],
            fontName="GuideSans",
            fontSize=7.5,
            leading=9,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#C9D8F0"),
        ),
    }
    return styles


def inline_markup(value: str) -> str:
    tokens: list[str] = []

    def save_code(match: re.Match[str]) -> str:
        printable_code = match.group(1).replace("<", "{").replace(">", "}")
        escaped = html.escape(printable_code, quote=False)
        tokens.append(
            f'<font name="GuideMono" color="#1D4ED8" size="8.2">{escaped}</font>'
        )
        return f"@@CODE{len(tokens) - 1}@@"

    value = re.sub(r"`([^`]+)`", save_code, value)
    value = html.escape(value, quote=False)
    value = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    for index, token in enumerate(tokens):
        value = value.replace(f"@@CODE{index}@@", token)
    return value


class GuideDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs: object) -> None:
        super().__init__(filename, **kwargs)
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="content",
        )
        self.addPageTemplates(
            [
                PageTemplate(id="guide", frames=[frame], onPage=draw_page_chrome),
            ]
        )
        self._outline_counter = 0

    def afterFlowable(self, flowable: object) -> None:
        if not isinstance(flowable, Paragraph):
            return
        if flowable.style.name not in {"GuideSection", "GuideChange"}:
            return
        self._outline_counter += 1
        key = f"section-{self._outline_counter}"
        level = 0 if flowable.style.name == "GuideSection" else 1
        title = flowable.getPlainText()
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(title, key, level=level, closed=False)


def draw_page_chrome(canvas: object, doc: BaseDocTemplate) -> None:
    width, height = letter
    canvas.saveState()
    canvas.setTitle("Compania Service - Functional Changes User Guide")
    canvas.setAuthor("Compania Service")
    if doc.page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setFillColor(BLUE)
        canvas.rect(0, height - 0.18 * inch, width, 0.18 * inch, fill=1, stroke=0)
        canvas.setFillColor(CYAN)
        canvas.rect(0, 0, 0.14 * inch, height, fill=1, stroke=0)
        canvas.setFont("GuideSans", 8)
        canvas.setFillColor(colors.HexColor("#B9C9E4"))
        canvas.drawRightString(width - 0.65 * inch, 0.42 * inch, "August 2026")
    else:
        canvas.setFillColor(NAVY)
        canvas.rect(0, height - 0.12 * inch, width, 0.12 * inch, fill=1, stroke=0)
        canvas.setStrokeColor(LIGHT_LINE)
        canvas.setLineWidth(0.6)
        canvas.line(0.65 * inch, height - 0.47 * inch, width - 0.65 * inch, height - 0.47 * inch)
        canvas.setFont("GuideSans-Bold", 7.6)
        canvas.setFillColor(NAVY)
        canvas.drawString(0.65 * inch, height - 0.36 * inch, "COMPANIA SERVICE")
        canvas.setFont("GuideSans", 7.6)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(
            width - 0.65 * inch,
            height - 0.36 * inch,
            "Functional Changes User Guide",
        )
        canvas.setStrokeColor(LIGHT_LINE)
        canvas.line(0.65 * inch, 0.47 * inch, width - 0.65 * inch, 0.47 * inch)
        canvas.setFont("GuideSans", 7.4)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.65 * inch, 0.3 * inch, "Release 1c70043 to 8b9cf07")
        canvas.drawRightString(width - 0.65 * inch, 0.3 * inch, f"Page {doc.page}")
    canvas.restoreState()


def cover_story(styles: dict[str, ParagraphStyle]) -> list[object]:
    metrics = []
    for value, label in (("12", "DOCUMENTED CHANGES"), ("11", "PAGE ROUTES"), ("2", "REPORT VIEWS")):
        metrics.append(
            Table(
                [
                    [Paragraph(value, styles["cover_metric_value"])],
                    [Paragraph(label, styles["cover_metric_label"])],
                ],
                colWidths=[1.55 * inch],
                rowHeights=[0.34 * inch, 0.28 * inch],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#22356C")),
                        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#49639B")),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ]
                ),
            )
        )

    return [
        Spacer(1, 1.25 * inch),
        Paragraph("COMPANIA SERVICE", styles["cover_brand"]),
        Paragraph("Functional Changes<br/>User Guide", styles["cover_title"]),
        Paragraph(
            "A page-by-page guide to the production changes introduced in the August 2026 release.",
            styles["cover_subtitle"],
        ),
        Table(
            [[Paragraph("Previous live version<br/><b>1c70043</b>", styles["cover_meta"]),
              Paragraph("Production version<br/><b>8b9cf07</b>", styles["cover_meta"])]],
            colWidths=[2.35 * inch, 2.35 * inch],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#22356C")),
                    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#49639B")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#49639B")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            ),
        ),
        Spacer(1, 0.35 * inch),
        Table(
            [metrics],
            colWidths=[1.65 * inch] * 3,
            hAlign="LEFT",
            style=TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            ),
        ),
        Spacer(1, 0.65 * inch),
        Paragraph(
            "Audience: application users and administrators",
            styles["cover_meta"],
        ),
        PageBreak(),
    ]


def make_location_card(
    locations: list[str], styles: dict[str, ParagraphStyle]
) -> Table:
    content: list[object] = [
        Paragraph("WHERE TO SEE IT", styles["location_heading"]),
    ]
    for location in locations:
        content.append(Paragraph(f"• {inline_markup(location)}", styles["location"]))
    return Table(
        [[content]],
        colWidths=[6.95 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#BFD2F3")),
                ("LINEBEFORE", (0, 0), (0, -1), 4, BLUE),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        ),
        hAlign="LEFT",
    )


def make_formula_card(text: str, styles: dict[str, ParagraphStyle]) -> Table:
    return Table(
        [[Paragraph(inline_markup(text), styles["formula"])]],
        colWidths=[6.65 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE_CYAN),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#A5E8EF")),
                ("LINEBEFORE", (0, 0), (0, -1), 4, CYAN),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        ),
        hAlign="LEFT",
    )


def make_list(
    items: list[str],
    styles: dict[str, ParagraphStyle],
    ordered: bool,
) -> Table:
    rows = []
    for item_index, item in enumerate(items, start=1):
        marker = f"{item_index}." if ordered else "-"
        rows.append(
            [
                Paragraph(marker, styles["list_marker"]),
                Paragraph(inline_markup(item), styles["list_item"]),
            ]
        )
    table = Table(
        rows,
        colWidths=[0.22 * inch, 6.73 * inch],
        hAlign="LEFT",
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        ),
    )
    table.spaceAfter = 7
    return table


def make_markdown_table(
    rows: list[list[str]], styles: dict[str, ParagraphStyle]
) -> Table:
    rendered: list[list[Paragraph]] = []
    for row_index, row in enumerate(rows):
        style = styles["table_header"] if row_index == 0 else styles["table_cell"]
        rendered.append([Paragraph(inline_markup(cell), style) for cell in row])
    return Table(
        rendered,
        colWidths=[1.85 * inch, 5.1 * inch],
        repeatRows=1,
        hAlign="LEFT",
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEAD),
                ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.45, LIGHT_LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F8FAFD")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        ),
    )


def parse_markdown(
    markdown: str, styles: dict[str, ParagraphStyle]
) -> list[object]:
    lines = markdown.replace("\r\n", "\n").split("\n")
    story: list[object] = []
    first_h2 = True
    index = 0

    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith("# "):
            index += 1
            continue
        if line.startswith("## "):
            if not first_h2:
                story.append(CondPageBreak(4.8 * inch))
            first_h2 = False
            story.append(Paragraph(inline_markup(line[3:]), styles["section"]))
            index += 1
            continue
        if line.startswith("### "):
            story.append(CondPageBreak(1.55 * inch))
            story.append(Paragraph(inline_markup(line[4:]), styles["change"]))
            index += 1
            continue
        if line == "**Where to see it**":
            index += 1
            while index < len(lines) and not lines[index].strip():
                index += 1
            locations: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("- "):
                locations.append(lines[index].strip()[2:])
                index += 1
            story.extend([make_location_card(locations, styles), Spacer(1, 7)])
            continue
        if line.startswith("> "):
            story.extend([make_formula_card(line[2:], styles), Spacer(1, 8)])
            index += 1
            continue
        if line.startswith("| "):
            raw_rows: list[list[str]] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", cell) for cell in cells):
                    raw_rows.append(cells)
                index += 1
            story.extend([make_markdown_table(raw_rows, styles), Spacer(1, 8)])
            continue
        if line.startswith("- "):
            items: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("- "):
                items.append(lines[index].strip()[2:])
                index += 1
            story.append(make_list(items, styles, ordered=False))
            continue
        if re.match(r"\d+\. ", line):
            items = []
            while index < len(lines) and re.match(r"\d+\. ", lines[index].strip()):
                items.append(re.sub(r"^\d+\. ", "", lines[index].strip()))
                index += 1
            story.append(make_list(items, styles, ordered=True))
            continue

        paragraph_lines = [line]
        index += 1
        while index < len(lines):
            next_line = lines[index].strip()
            if (
                not next_line
                or next_line.startswith("#")
                or next_line.startswith("- ")
                or next_line.startswith("> ")
                or next_line.startswith("| ")
                or re.match(r"\d+\. ", next_line)
                or next_line == "**Where to see it**"
            ):
                break
            paragraph_lines.append(next_line)
            index += 1
        story.append(
            Paragraph(inline_markup(" ".join(paragraph_lines)), styles["body"])
        )

    return story


def build_pdf(source: Path, output: Path) -> None:
    register_fonts()
    styles = make_styles()
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = GuideDocTemplate(
        str(output),
        pagesize=letter,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.62 * inch,
        bottomMargin=0.62 * inch,
        title="Compania Service - Functional Changes User Guide",
        author="Compania Service",
        subject="User-visible production changes from 1c70043 to 8b9cf07",
    )
    markdown = source.read_text(encoding="utf-8")
    story = cover_story(styles)
    story.extend(parse_markdown(markdown, styles))
    doc.build(story)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    build_pdf(args.source.resolve(), args.output.resolve())
    print(args.output.resolve())


if __name__ == "__main__":
    main()
