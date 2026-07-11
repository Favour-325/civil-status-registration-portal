from typing import Protocol, Tuple
from fpdf import FPDF
from .constants import (
    COLOR_BLACK, 
    LABEL_FONT_SIZE, 
    BODY_FONT_SIZE, 
    SMALL_FONT_SIZE,
    DEFAULT_LINE_HEIGHT
)

class Cursor:
    """
    Manages vertical positioning to avoid manual Y coordinate calculations.
    """
    def __init__(self, x: float, y: float, line_height: float = DEFAULT_LINE_HEIGHT):
        self.x = x
        self.y = y
        self.line_height = line_height

    def next(self, spacing: float = DEFAULT_LINE_HEIGHT) -> None:
        self.y += spacing

    def set_y(self, y: float) -> None:
        self.y = y

    def set_x(self, x: float) -> None:
        self.x = x

class DocumentCanvas(Protocol):
    def set_font(self, family: str, style: str = "", size: float = 0) -> None: ...
    def set_text_color(self, r: int, g: int, b: int) -> None: ...
    def text(self, x: float, y: float, txt: str) -> None: ...
    def line(self, x1: float, y1: float, x2: float, y2: float) -> None: ...
    def rect(self, x: float, y: float, w: float, h: float) -> None: ...
    def cell(self, w: float, h: float, text: str, border: int = 0, ln: int = 0, align: str = "", fill: bool = False) -> None: ...
    def get_string_width(self, text: str) -> float: ...

def draw_centered_text(pdf: DocumentCanvas, text: str, x: float, y: float, size: float, style: str = "") -> None:
    pdf.set_font("Inter", style, size)
    pdf.set_xy(0, y)
    pdf.cell(210, 0, text, align="C")

def draw_label(pdf: DocumentCanvas, text: str, x: float, y: float, size: float = LABEL_FONT_SIZE, style: str = "B") -> None:
    pdf.set_font("Inter", style, size)
    pdf.set_text_color(*COLOR_BLACK)
    pdf.text(x, y, text)

def draw_value(pdf: DocumentCanvas, text: str, x: float, y: float, size: float = BODY_FONT_SIZE, style: str = "") -> None:
    pdf.set_font("Inter", style, size)
    pdf.set_text_color(*COLOR_BLACK)
    pdf.text(x, y, text)

def draw_dotted_line(pdf: DocumentCanvas, x1: float, y1: float, x2: float, y2: float) -> None:
    dash_length = 1.0
    gap_length = 1.0
    curr_x, curr_y = x1, y1
    dx = x2 - x1
    dy = y2 - y1
    total_dist = (dx**2 + dy**2)**0.5
    if total_dist == 0: return
    ux, uy = dx/total_dist, dy/total_dist
    dist = 0.0
    while dist < total_dist:
        end_dist = min(dist + dash_length, total_dist)
        pdf.line(
            curr_x + ux * (dist), curr_y + uy * (dist), 
            curr_x + ux * (end_dist), curr_y + uy * (end_dist)
        )
        dist += dash_length + gap_length

def draw_horizontal_rule(pdf: DocumentCanvas, x1: float, y1: float, x2: float, y2: float) -> None:
    pdf.line(x1, y1, x2, y2)

def draw_field(pdf: DocumentCanvas, label: str, value: str, x: float, y: float, width: float, 
               label_size: float = LABEL_FONT_SIZE, value_size: float = BODY_FONT_SIZE) -> None:
    draw_label(pdf, label, x, y, size=label_size)
    label_width = pdf.get_string_width(label)
    line_start_x = x + label_width + 2
    draw_dotted_line(pdf, line_start_x, y + 0.5, x + width, y + 0.5)
    if value:
        draw_value(pdf, value, line_start_x, y, size=value_size)

def draw_signature_line(pdf: DocumentCanvas, x: float, y: float, width: float, label: str) -> None:
    draw_horizontal_rule(pdf, x, y, x + width, y)
    label_w = pdf.get_string_width(label)
    draw_label(pdf, label, x + (width/2) - (label_w/2), y + 4, size=SMALL_FONT_SIZE)
