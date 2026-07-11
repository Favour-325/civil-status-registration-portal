from typing import Protocol
from .drawing import DocumentCanvas, draw_centered_text, draw_label, draw_dotted_line, draw_field
from .layout import LayoutAnchors
from .constants import TITLE_FONT_SIZE, SUBTITLE_FONT_SIZE, LABEL_FONT_SIZE, BODY_FONT_SIZE, SMALL_FONT_SIZE
from .models import Registration

class HeaderRenderer:
    """
    Handles the rendering of the top section of the Birth Certificate,
    including government titles, administrative regions, and the document title.
    """
    
    def __init__(self, pdf: DocumentCanvas):
        self.pdf = pdf

    def render(self, registration: Registration) -> None:
        self._draw_government_titles()
        self._draw_administrative_regions(registration)
        self._draw_registration_center(registration)
        self._draw_official_stamp()
        self._draw_document_title(registration)

    def _draw_government_titles(self) -> None:
        # République du Cameroun / Republic of Cameroon
        draw_centered_text(self.pdf, "REPUBLIQUE DU CAMEROUN", LayoutAnchors.CENTER_X, LayoutAnchors.REPUBLIC_TITLE_Y, TITLE_FONT_SIZE, style="B")
        draw_centered_text(self.pdf, "Paix - Travail - Patrie", LayoutAnchors.CENTER_X, LayoutAnchors.REPUBLIC_TITLE_Y + 5, SMALL_FONT_SIZE, style="I")
        
        draw_centered_text(self.pdf, "REPUBLIC OF CAMEROON", LayoutAnchors.CENTER_X, LayoutAnchors.REPUBLIC_TITLE_Y + 10, TITLE_FONT_SIZE, style="B")
        draw_centered_text(self.pdf, "Peace - Work - Fatherland", LayoutAnchors.CENTER_X, LayoutAnchors.REPUBLIC_TITLE_Y + 15, SMALL_FONT_SIZE, style="I")

    def _draw_administrative_regions(self, reg: Registration) -> None:
        y = LayoutAnchors.ADMIN_REGION_Y
        
        # First Row: REGION (Left) | REGION (Right)
        # Labels
        draw_label(self.pdf, "REGION", LayoutAnchors.LEFT_COL, y)
        draw_label(self.pdf, "REGION", LayoutAnchors.RIGHT_COL - 30, y) # Adjust for label width
        
        # Values and dotted lines
        draw_field(self.pdf, "", reg.region, LayoutAnchors.LEFT_COL + 20, y, LayoutAnchors.HALF_WIDTH - 25)
        draw_field(self.pdf, "", reg.region, LayoutAnchors.RIGHT_COL - 40, y, LayoutAnchors.HALF_WIDTH - 25)
        
        y += 8
        
        # Second Row: DEPARTEMENT | DIVISION
        draw_label(self.pdf, "DEPARTEMENT", LayoutAnchors.LEFT_COL, y)
        draw_label(self.pdf, "DIVISION", LayoutAnchors.RIGHT_COL - 30, y)
        
        draw_field(self.pdf, "", reg.division, LayoutAnchors.LEFT_COL + 35, y, LayoutAnchors.HALF_WIDTH - 40) # using division for dept as example if not in model
        draw_field(self.pdf, "", reg.division, LayoutAnchors.RIGHT_COL - 40, y, LayoutAnchors.HALF_WIDTH - 40)
        
        y += 8
        
        # Third Row: ARRONDISSEMENT | SUBDIVISION
        draw_label(self.pdf, "ARRONDISSEMENT", LayoutAnchors.LEFT_COL, y)
        draw_label(self.pdf, "SUBDIVISION", LayoutAnchors.RIGHT_COL - 30, y)
        
        draw_field(self.pdf, "", reg.subdivision, LayoutAnchors.LEFT_COL + 40, y, LayoutAnchors.HALF_WIDTH - 45)
        draw_field(self.pdf, "", reg.subdivision, LayoutAnchors.RIGHT_COL - 40, y, LayoutAnchors.HALF_WIDTH - 40)

    def _draw_registration_center(self, reg: Registration) -> None:
        y = LayoutAnchors.REGISTRATION_CENTRE_Y
        
        title = "CENTRE D'ETAT CIVIL / CIVIL STATUS REGISTRATION CENTRE"
        draw_centered_text(self.pdf, title, LayoutAnchors.CENTER_X, y, SUBTITLE_FONT_SIZE, style="B")
        
        y += 7
        draw_label(self.pdf, "de - of", LayoutAnchors.LEFT_COL, y, size=BODY_FONT_SIZE)
        draw_dotted_line(self.pdf, LayoutAnchors.LEFT_COL + 15, y + 0.5, LayoutAnchors.RIGHT_COL, y + 0.5)
        draw_value(self.pdf, reg.registration_center, LayoutAnchors.LEFT_COL + 15, y, size=BODY_FONT_SIZE)
        
        y += 7
        sub_title = "Centre d'état civil de rattachement (pour les centres secondaires)"
        draw_centered_text(self.pdf, sub_title, LayoutAnchors.CENTER_X, y, SMALL_FONT_SIZE, style="I")
        
        y += 4
        sub_title_en = "Main Civil Status Registry of Attachment (for secondary civil status registry)"
        draw_centered_text(self.pdf, sub_title_en, LayoutAnchors.CENTER_X, y, SMALL_FONT_SIZE, style="I")

    def _draw_official_stamp(self) -> None:
        # Official stamp image in the upper-right corner
        # Image path: birth_certificate/assets/official_stamp.jpg
        # We use the pdf.image method.
        self.pdf.image(
            "birth_certificate/assets/official_stamp.jpg", 
            x=LayoutAnchors.RIGHT_COL - 20, 
            y=LayoutAnchors.TOP_MARGIN, 
            w=30
        )

    def _draw_document_title(self, reg: Registration) -> None:
        # Main Title
        title = "ACTE DE NAISSANCE / BIRTH CERTIFICATE"
        draw_centered_text(self.pdf, title, LayoutAnchors.CENTER_X, LayoutAnchors.DOCUMENT_TITLE_Y, TITLE_FONT_SIZE + 2, style="B")
        
        # Certificate Number Line
        # N° : / ____ / ____ / ________ / __ / __ / ____ /
        y = LayoutAnchors.CERTIFICATE_NUMBER_Y
        draw_label(self.pdf, "N° :", LayoutAnchors.CENTER_X - 50, y, size=SUBTITLE_FONT_SIZE)
        
        # Draw the number placeholders
        # We'll just draw the number and then the dotted line for the rest
        draw_value(self.pdf, reg.certificate_number, LayoutAnchors.CENTER_X - 40, y, size=SUBTITLE_FONT_SIZE)
        draw_dotted_line(self.pdf, LayoutAnchors.CENTER_X - 30, y + 0.5, LayoutAnchors.CENTER_X + 50, y + 0.5)
