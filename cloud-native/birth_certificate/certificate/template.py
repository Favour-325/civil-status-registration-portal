from typing import Protocol
from .drawing import DocumentCanvas
from .models import BirthCertificate
from .header import HeaderRenderer
from .child_section import ChildSectionRenderer
from .father_section import FatherSectionRenderer
from .mother_section import MotherSectionRenderer
from .declaration import DeclarationRenderer
from .footer import FooterRenderer

class BirthCertificateTemplate:
    """
    Orchestrates the rendering of the entire Birth Certificate document.
    It coordinates the various section renderers to produce the final PDF.
    """

    def __init__(self, pdf: DocumentCanvas):
        self.pdf = pdf
        # Initialize all section renderers
        self.header_renderer = HeaderRenderer(pdf)
        self.child_renderer = ChildSectionRenderer(pdf)
        self.father_renderer = FatherSectionRenderer(pdf)
        self.mother_renderer = MotherSectionRenderer(pdf)
        self.declaration_renderer = DeclarationRenderer(pdf)
        self.footer_renderer = FooterRenderer(pdf)

    def render(self, certificate: BirthCertificate) -> None:
        """
        Executes the rendering pipeline in the correct order.
        """
        # 1. Render Header (titles, regions, certificate number)
        self.header_renderer.render(certificate.registration)
        
        # 2. Render Child Section
        self.child_renderer.render(certificate.child)
        
        # 3. Render Father Section
        self.father_renderer.render(certificate.father)
        
        # 4. Render Mother Section
        self.mother_renderer.render(certificate.mother)
        
        # 5. Render Declaration Section
        self.declaration_renderer.render(certificate.registration)
        
        # 6. Render Footer (final date and signatures)
        self.footer_renderer.render(certificate.registration)
