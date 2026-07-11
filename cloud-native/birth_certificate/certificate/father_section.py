from typing import Protocol
from .drawing import DocumentCanvas, Cursor, draw_field, draw_label, draw_value, draw_dotted_line
from .layout import LayoutAnchors
from .constants import LABEL_FONT_SIZE, BODY_FONT_SIZE
from .models import Parent

class FatherSectionRenderer:
    """
    Renders the father's personal information section of the Birth Certificate.
    """

    def __init__(self, pdf: DocumentCanvas):
        self.pdf = pdf

    def render(self, father: Parent) -> None:
        if not father:
            return

        # Initialize cursor at the designated start anchor for the father section
        cursor = Cursor(LayoutAnchors.LEFT_COL, LayoutAnchors.FATHER_SECTION_START)
        
        # 1. Father's Name
        self._draw_bilingual_field(cursor, "Et de - And of", "", father.full_name)
        cursor.next()
        
        # 2. Born at
        self._draw_bilingual_field(cursor, "Né à - Born at", "", father.birth_place)
        cursor.next()
        
        # 3. On the
        self._draw_bilingual_field(cursor, "Le - On the", "", father.birth_date)
        cursor.next()
        
        # 4. Residence
        self._draw_bilingual_field(cursor, "Domicilié à - Resident at", "", father.residence)
        cursor.next()
        
        # 5. Occupation
        self._draw_bilingual_field(cursor, "Profession - Occupation", "", father.occupation)
        cursor.next()
        
        # 6. Nationality
        self._draw_bilingual_field(cursor, "Nationalité - Nationality", "", father.nationality)
        cursor.next()
        
        # 7. Reference Document Block
        self._draw_reference_document_block(cursor, father.reference_document)

    def _draw_bilingual_field(self, cursor: Cursor, label_fr: str, label_en: str, value: str) -> None:
        full_label = f"{label_fr} {label_en}".strip()
        draw_field(
            self.pdf, 
            full_label, 
            value, 
            cursor.x, 
            cursor.y, 
            LayoutAnchors.FULL_WIDTH,
            label_size=LABEL_FONT_SIZE,
            value_size=BODY_FONT_SIZE
        )

    def _draw_reference_document_block(self, cursor: Cursor, value: str) -> None:
        label_main = "Document de référence - Reference document :"
        draw_label(self.pdf, label_main, cursor.x, cursor.y)
        
        label_w = self.pdf.get_string_width(label_main)
        draw_dotted_line(self.pdf, cursor.x + label_w + 2, cursor.y + 0.5, cursor.x + LayoutAnchors.FULL_WIDTH, cursor.y + 0.5)
        if value:
            draw_value(self.pdf, value, cursor.x + label_w + 2, cursor.y)
        
        cursor.next(2)
        explanation_fr = "Numéro de la Carte Nationale d'identité, ou références de l'acte de naissance, ou références du document prouvant la nationalité"
        explanation_en = "(National Identity Card Number, or references of the Birth Certificate, or References of the Document attesting the Nationality)"
        
        self.pdf.set_font("Inter", "I", 8)
        self.pdf.set_xy(cursor.x, cursor.y)
        self.pdf.multi_cell(LayoutAnchors.FULL_WIDTH, 4, f"{explanation_fr}\n{explanation_en}", align="L")
        
        cursor.set_y(cursor.y + 12)
