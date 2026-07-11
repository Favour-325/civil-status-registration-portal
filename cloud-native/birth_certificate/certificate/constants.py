from typing import Final

# Page Dimensions (A4 in mm)
PAGE_WIDTH: Final[float] = 210.0
PAGE_HEIGHT: Final[float] = 297.0

# Margins
LEFT_MARGIN: Final[float] = 15.0
RIGHT_MARGIN: Final[float] = 15.0
TOP_MARGIN: Final[float] = 15.0
BOTTOM_MARGIN: Final[float] = 15.0

# Calculated Body Width
BODY_WIDTH: Final[float] = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

# Typography
TITLE_FONT_SIZE: Final[float] = 16.0
SUBTITLE_FONT_SIZE: Final[float] = 12.0
LABEL_FONT_SIZE: Final[float] = 10.0
BODY_FONT_SIZE: Final[float] = 10.0
SMALL_FONT_SIZE: Final[float] = 8.0

# Spacing
DEFAULT_LINE_HEIGHT: Final[float] = 6.0
SECTION_SPACING: Final[float] = 10.0
FIELD_SPACING: Final[float] = 5.0
SIGNATURE_AREA_HEIGHT: Final[float] = 30.0

# Colors
COLOR_BLACK: Final[tuple[int, int, int]] = (0, 0, 0)
COLOR_GREY: Final[tuple[int, int, int]] = (128, 128, 128)

# Font Paths (Relative to project root)
FONT_REGULAR: Final[str] = "birth_certificate/assets/fonts/Inter-Regular.ttf"
FONT_BOLD: Final[str] = "birth_certificate/assets/fonts/Inter-Bold.ttf"
FONT_ITALIC: Final[str] = "birth_certificate/assets/fonts/Inter-Italic.ttf"
