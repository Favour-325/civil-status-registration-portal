from typing import Protocol
from .drawing import DocumentCanvas, Cursor, draw_field, draw_label, draw_value, draw_dotted_line
from .layout import LayoutAnchors
from .constants import LABEL_FONT_SIZE, BODY_FONT_SIZE, DEFAULT_LINE_HEIGHT

class ChildSectionRenderer:
    """
    Renders the child's personal information section of the Birth Certificate.
    Follows the bilingual layout exactly as per the template.
    """

    def __init__(self, pdf: DocumentCanvas):
        self.pdf = pdf

    def render(self, child) -> None:
        # Initialize cursor at the designated start anchor for the child section
        cursor = Cursor(LayoutAnchors.LEFT_COL, LayoutAnchors.CHILD_SECTION_START)
        
        # 1. Surname
        self._draw_bilingual_field(cursor, "Nom de l'enfant :", "Surname of the child", child.surname)
        cursor.next()
        
        # 2. Given names
        self._draw_bilingual_field(cursor, "Prénoms de l'enfant :", "Given names of the child", child.given_names)
        cursor.next()
        
        # 3. Born on
        self._draw_bilingual_field(cursor, "Né le - Born on the", "", child.birth_date)
        cursor.next()
        
        # 4. At
        self._draw_bilingual_field(cursor, "A - At", "", child.birth_place)
        cursor.next()
        
        # 5. Sex
        self._draw_bilingual_field(cursor, "De sexo - Sex", "", child.sex)
        cursor.next()
        
        # 6. Of
        self._draw_bilingual_field(cursor, "De - Of", "", child.origin)
        cursor.next()
        
        # 7. Born at
        self._draw_bilingual_field(cursor, "Né à - Born at", "", child.birth_place)
        cursor.next()
        
        # 8. On
        self._draw_bilingual_field(cursor, "Le - On the", "", child.birth_date)
        cursor.next()
        
        # 9. Residence
        self._draw_bilingual_field(cursor, "Domicilié à - Resident at", "", child.residence)
        cursor.next()
        
        # 10. Occupation
        self._draw_bilingual_field(cursor, "Profession - Occupation", "", child.occupation)
        cursor.next()
        
        # 11. Nationality
        self._draw_bilingual_field(cursor, "Nationalité - Nationality", "", child.nationality)
        cursor.next()
        
        # 12. Reference Document Block
        # This block has a more complex layout with a descriptive paragraph
        self._draw_reference_document_block(cursor, child.reference_document)

    def _draw_bilingual_field(self, cursor: Cursor, label_fr: str, label_en: str, value: str) -> None:
        """
        Renders a field with bilingual labels and a dotted line.
        """
        # Combine labels if both are provided
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
        """
        Renders the reference document section which includes detailed explanations.
        """
        # Main Label
        label_main = "Document de référence - Reference document :"
        draw_label(self.pdf, label_main, cursor.x, cursor.y)
        
        # Dotted line for value
        label_w = self.pdf.get_string_width(label_main)
        draw_dotted_line(self.pdf, cursor.x + label_w + 2, cursor.y + 0.5, cursor.x + LayoutAnchors.FULL_WIDTH, cursor.y + 0.5)
        if value:
            draw_value(self.pdf, value, cursor.x + label_w + 2, cursor.y)
        
        # Explanation text (small and italic)
        cursor.next(2) # Tight spacing for explanation
        explanation_fr = "Numéro de la Carte Nationale d'identité, ou références de l'acte de naissance, ou références du document prouvant la nationalité"
        explanation_en = "(National Identity Card Number, or references of the Birth Certificate, or References of the Document attesting the Nationality)"
        
        # We wrap the text manually or using a simple helper since fpdf2 cell can wrap
        self.pdf.set_font("Inter", "I", 8)
        self.pdf.set_xy(cursor.x, cursor.y)
        
        # Multicell is used for wrapped text
        self.pdf.multi_cell(LayoutAnchors.FULL_WIDTH, 4, f"{explanation_fr}\n{explanation_en}", align="L")
        
        # Update cursor based on multicell height (approx 4mm * 2 lines)
        cursor.set_y(cursor.y + 12)
