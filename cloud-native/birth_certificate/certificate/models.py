from dataclasses import dataclass, field
from typing import Optional
from datetime import date

@dataclass(frozen=True)
class Parent:
    full_name: str
    birth_date: Optional[str] = None
    birth_place: Optional[str] = None
    residence: Optional[str] = None
    occupation: Optional[str] = None
    nationality: Optional[str] = None
    reference_document: Optional[str] = None

@dataclass(frozen=True)
class Child:
    surname: str
    given_names: str
    birth_date: str
    birth_place: str
    sex: str
    origin: Optional[str] = None
    residence: Optional[str] = None
    occupation: Optional[str] = None
    nationality: Optional[str] = None
    reference_document: Optional[str] = None

@dataclass(frozen=True)
class Registration:
    certificate_number: str
    drawn_up_date: str
    registrar_name: str
    secretary_name: str
    registration_center: str
    region: str
    division: str
    subdivision: str

@dataclass(frozen=True)
class BirthCertificate:
    child: Child
    father: Optional[Parent] = None
    mother: Optional[Parent] = None
    registration: Registration = field(default_factory=lambda: None) # Will be set via generator
