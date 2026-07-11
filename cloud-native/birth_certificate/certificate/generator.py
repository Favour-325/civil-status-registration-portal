import os
from fpdf import FPDF
from .constants import FONT_REGULAR, FONT_BOLD, FONT_ITALIC
from .models import BirthCertificate
from .template import BirthCertificateTemplate

class BirthCertificatePDF(FPDF):
    """
    Custom FPDF class to handle font registration and basic setup.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Register Inter fonts as specified in the requirements
        self.add_font("Inter", style="", fname=FONT_REGULAR)
        self.add_font("Inter", style="B", fname=FONT_BOLD)
        self.add_font("Inter", style="I", fname=FONT_ITALIC)

class CertificateGenerator:
    """
    High-level generator that handles PDF creation and triggers the template rendering.
    """
    def __init__(self):
        pass

    def generate(self, certificate: BirthCertificate, output_path: str) -> None:
        """
        Generates the birth certificate PDF file.
        """
        # Initialize the custom PDF object
        pdf = BirthCertificatePDF(unit="mm", format="A4")
        pdf.add_page()
        
        # Create the template and render the certificate
        template = BirthCertificateTemplate(pdf)
        template.render(certificate)
        
        # Save the final document
        pdf.output(output_path)
