from certificate.models import BirthCertificate, Child, Parent, Registration
from certificate.generator import CertificateGenerator

def main():
    # 1. Create Sample Child Data
    child = Child(
        surname="EKOTTO",
        given_names="Jean-Pierre",
        birth_date="15 May 2023",
        birth_place="Yaoundé",
        sex="Male",
        origin="Centre",
        residence="Bastos",
        occupation="N/A",
        nationality="Cameroonian",
        reference_document="Birth Notification No 12345"
    )

    # 2. Create Sample Father Data
    father = Parent(
        full_name="EKOTTO Marc",
        birth_date="10 June 1985",
        birth_place="Douala",
        residence="Yaoundé",
        occupation="Engineer",
        nationality="Cameroonian",
        reference_document="CNI No 202012345678"
    )

    # 3. Create Sample Mother Data
    mother = Parent(
        full_name="MBONGE Alice",
        birth_date="22 August 1988",
        birth_place="Buea",
        residence="Yaoundé",
        occupation="Teacher",
        nationality="Cameroonian",
        reference_document="CNI No 202198765432"
    )

    # 4. Create Registration Data
    registration = Registration(
        certificate_number="2023/001/B",
        drawn_up_date="20 May 2023",
        registrar_name="Dr. Samuel Eto'o",
        secretary_name="Marie Claire",
        registration_center="Centre d'état civil de Yaoundé I",
        region="Centre",
        division="Mfoundi",
        subdivision="Yaoundé I"
    )

    # 5. Assemble Birth Certificate
    certificate = BirthCertificate(
        child=child,
        father=father,
        mother=mother,
        registration=registration
    )

    # 6. Generate PDF
    generator = CertificateGenerator()
    output_filename = "sample_birth_certificate.pdf"
    generator.generate(certificate, output_filename)
    
    print(f"Successfully generated birth certificate: {output_filename}")

if __name__ == "__main__":
    main()
