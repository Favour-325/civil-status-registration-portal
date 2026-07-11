from typing import Protocol
from .drawing import DocumentCanvas, draw_label, draw_dotted_line, draw_signature_line
from .layout import LayoutAnchors
from .constants import LABEL_FONT_SIZE, BODY_FONT_SIZE
from .models import Registration

class FooterRenderer:
    """
    Renders the final date and signature section of the Birth Certificate.
    """

    def __init__(self, pdf: DocumentCanvas):
        self.pdf = pdf

    def render(self, registration: Registration) -> None:
        # 1. Date line
        self._draw_date_line(registration)
        
        # 2. Signature block
        self._draw_signatures()

    def _draw_date_line(self, reg: Registration) -> None:
        label = "Le - On the"
        y = LayoutAnchors.FOOTER_DATE_Y
        
        draw_label(self.pdf, label, LayoutAnchors.LEFT_COL + (LayoutAnchors.FULL_WIDTH / 4), y)
        
        label_w = self.pdf.get_string_width(label)
        line_start_x = LayoutAnchors.LEFT_COL + (LayoutAnchors.FULL_WIDTH / 4) + label_w + 2
        
        draw_dotted_line(self.pdf, line_start_x, y + 0.5, line_start_x + 60, y + 0.5)
        
        if reg.drawn_up_date:
            draw_value(self.pdf, reg.drawn_up_date, line_start_x, y)

    def _draw_signatures(self) -> None:
        y = LayoutAnchors.SIGNATURE_BLOCK_TOP
        
        # Secretary Signature (Left side)
        sig_width = LayoutAnchors.HALF_WIDTH / 2
        draw_signature_line(
            self.pdf, 
            LayoutAnchors.LEFT_COL, 
            y, 
            sig_width, 
            "Le Secrétaire d'état civil\nSecretary"
        )
        
        # Registrar Signature (Right side)
        draw_signature_line(
            self.pdf, 
            LayoutAnchors.RIGHT_COL - sig_width, 
            y, 
            sig_width, 
            "Signature de l'Officier d'état civil\nSignature of Civil Status Registrar"
        )
