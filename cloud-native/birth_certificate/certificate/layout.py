from typing import Final
from .constants import (
    TOP_MARGIN, 
    LEFT_MARGIN, 
    PAGE_WIDTH, 
    PAGE_HEIGHT
)

class LayoutAnchors:
    """
    Central coordinate map for the Birth Certificate.
    Coordinates are in mm.
    """
    # --- Header Section ---
    HEADER_TOP: Final[float] = TOP_MARGIN
    REPUBLIC_TITLE_Y: Final[float] = TOP_MARGIN + 10
    ADMIN_REGION_Y: Final[float] = TOP_MARGIN + 25
    REGISTRATION_CENTRE_Y: Final[float] = TOP_MARGIN + 45
    DOCUMENT_TITLE_Y: Final[float] = TOP_MARGIN + 65
    CERTIFICATE_NUMBER_Y: Final[float] = TOP_MARGIN + 75
    
    # --- Main Body Sections ---
    CHILD_SECTION_START: Final[float] = TOP_MARGIN + 85
    FATHER_SECTION_START: Final[float] = TOP_MARGIN + 155
    MOTHER_SECTION_START: Final[float] = TOP_MARGIN + 215
    
    # --- Declaration & Footer ---
    DECLARATION_START: Final[float] = TOP_MARGIN + 260
    FOOTER_DATE_Y: Final[float] = TOP_MARGIN + 275
    SIGNATURE_BLOCK_TOP: Final[float] = TOP_MARGIN + 282
    
    # --- X-Coordinates for alignment ---
    LEFT_COL: Final[float] = LEFT_MARGIN
    CENTER_X: Final[float] = PAGE_WIDTH / 2
    RIGHT_COL: Final[float] = PAGE_WIDTH - LEFT_MARGIN
    
    # --- Widths ---
    FULL_WIDTH: Final[float] = PAGE_WIDTH - (2 * LEFT_MARGIN)
    HALF_WIDTH: Final[float] = (PAGE_WIDTH - (2 * LEFT_MARGIN)) / 2
