from typing import Protocol
from .drawing import DocumentCanvas, Cursor, draw_label, draw_dotted_line, draw_value, draw_horizontal_rule
from .layout import LayoutAnchors
from .constants import LABEL_FONT_SIZE, BODY_FONT_SIZE, SMALL_FONT_SIZE, DEFAULT_LINE_HEIGHT
from .models import Registration

class DeclarationRenderer:
    """
    Renders the declaration and legal certification section of the Birth Certificate.
    """

    def __init__(self, pdf: DocumentCanvas):
        self.pdf = pdf

    def render(self, registration: Registration) -> None:
        # Initialize cursor at the designated start anchor for the declaration section
        cursor = Cursor(LayoutAnchors.LEFT_COL, LayoutAnchors.DECLARATION_START)
        
        # 1. Drawn up on
        self._draw_drawn_up_date(cursor, registration.drawn_up_date)
        cursor.next(8)
        
        # 2. Declaration statement
        self._draw_declaration_statement(cursor)
        cursor.next(10)
        
        # 3. Attestation statement
        self._draw_attestation_statement(cursor)
        cursor.next(12)
        
        # 4. Registrar and Secretary Block
        self._draw_officer_block(cursor, registration)

    def _draw_drawn_up_date(self, cursor: Cursor, date_str: str) -> None:
        label = "Dressé le - Drawn up on the"
        draw_label(self.pdf, label, cursor.x, cursor.y)
        
        label_w = self.pdf.get_string_width(label)
        draw_dotted_line(self.pdf, cursor.x + label_w + 2, cursor.y + 0.5, cursor.x + LayoutAnchors.FULL_WIDTH, cursor.y + 0.5)
        if date_str:
            draw_value(self.pdf, date_str, cursor.x + label_w + 2, cursor.y)

    def _draw_declaration_statement(self, cursor: Cursor) -> None:
        label = "• Sur la déclaration de - In accordance with the declaration of"
        draw_label(self.pdf, label, cursor.x, cursor.y)
        
        label_w = self.pdf.get_string_width(label)
        draw_dotted_line(self.pdf, cursor.x + label_w + 2, cursor.y + 0.5, cursor.x + LayoutAnchors.FULL_WIDTH, cursor.y + 0.5)

    def _draw_attestation_statement(self, cursor: Cursor) -> None:
        text_fr = "Lesquels ont certifié la sincérité de la présente déclaration,"
        text_en = "Who attested to the truth of this declaration,"
        
        self.pdf.set_font("Inter", "B", LABEL_FONT_SIZE)
        self.pdf.set_xy(cursor.x, cursor.y)
        self.pdf.multi_cell(LayoutAnchors.FULL_WIDTH, 5, f"{text_fr}\n{text_en}", align="L")

    def _draw_officer_block(self, cursor: Cursor, reg: Registration) -> None:
        # Par Nous, / By Us,
        draw_label(self.pdf, "Par Nous, / By Us,", cursor.x, cursor.y)
        cursor.next(6)
        
        # Registrar Line
        label_reg = "d'état Civil - Civil Status Registrar"
        draw_label(self.pdf, label_reg, cursor.x, cursor.y)
        
        # Value (Registrar Name)
        reg_name = reg.registrar_name
        # We'll center the name on the line or place it appropriately
        # For the template, it's a dotted line ending with "Officier"
        label_w = self.pdf.get_string_width(label_reg)
        draw_dotted_line(self.pdf, cursor.x + label_w + 2, cursor.y + 0.5, cursor.x + LayoutAnchors.FULL_WIDTH - 20, cursor.y + 0.5)
        if reg_name:
            draw_value(self.pdf, reg_name, cursor.x + label_w + 2, cursor.y)
        
        draw_label(self.pdf, "Officier", LayoutAnchors.RIGHT_COL - 20, cursor.y, size=BODY_FONT_SIZE)
        
        cursor.next(6)
        
        # Secretary Line
        label_sec = "Assisté de - In the presence of\nd'état civil - Secretary"
        # Note: The template has this on two lines or a slightly different layout.
        # Let's do it as two lines for clarity.
        
        draw_label(self.pdf, "Assisté de - In the presence of", cursor.x, cursor.y)
        cursor.next(5)
        draw_label(self.pdf, "d'état civil - Secretary", cursor.x, cursor.y)
        
        label_sec_w = self.pdf.get_string_width("d'état civil - Secretary")
        draw_dotted_line(self.pdf, cursor.x + label_sec_w + 2, cursor.y + 0.5, cursor.x + LayoutAnchors.FULL_WIDTH - 20, cursor.y + 0.5)
        
        sec_name = reg.secretary_name
        if sec_name:
            draw_value(self.pdf, sec_name, cursor.x + label_sec_w + 2, cursor.y)
            
        draw_label(self.pdf, "Secrétaire", LayoutAnchors.RIGHT_COL - 20, cursor.y, size=BODY_FONT_SIZE)
