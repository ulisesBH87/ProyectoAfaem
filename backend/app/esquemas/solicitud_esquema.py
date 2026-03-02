from pydantic import BaseModel, EmailStr, field_validator, model_validator, Field
from datetime import datetime, date
import re

class SolicitudCrear(BaseModel):
    UsuarioId: int
    FechaSolicitud: datetime
    EstatusValidacion: int

    CURP: str
    RFC: str
    SexoId: int = Field(..., ge=1, le=3, description="1: Masculino, 2: Femenino, 3: No binario")
    FechaNacimiento: date

    @field_validator('CURP')
    @classmethod
    def validar_curp(cls, value: str):
        val = value.upper()
        curp_regex = (
            r'^([A-Z][AEIOUX][A-Z]{2}\d{2}' # Letras iniciales y año
            r'(?:0[1-9]|1[0-2])'            # Mes (01-12)
            r'(?:0[1-9]|[12]\d|3[01])'      # Día (01-31)
            r'[HM]'                         # Género
            r'(?:AS|B[CS]|C[CLMSH]|D[FG]|G[TR]|HG|JC|M[CNS]|N[ETL]|OC|PL|Q[TR]|S[PLR]|T[CSL]|VZ|YN|ZS)' # Estados
            r'[B-DF-HJ-NP-TV-Z]{3}'         # Consonantes internas
            r'[A-Z\d])(\d)$'                # Homoclave y dígito verificador
        )

        if not re.fullmatch(curp_regex, val):
            raise ValueError('Formato de CURP inválido')
        return val

    @field_validator('RFC')
    @classmethod
    def validar_rfc(cls, value: str):
        val = value.upper()
        # 4 escenarios de calendario
        meses_31  = r"([A-ZÑ&]{4})([0-9]{2})([0][13578]|[1][02])([0][1-9]|[12][\d]|3[01])([A-Z0-9]{3})"
        meses_30  = r"([A-ZÑ&]{4})([0-9]{2})([0][13456789]|[1][012])([0][1-9]|[12][\d]|3[0])([A-Z0-9]{3})"
        bisiesto  = r"([A-ZÑ&]{4})([02468][048]|[13579][26])[0][2]([0][1-9]|[12][\d])([A-Z0-9]{3})"
        febrero   = r"([A-ZÑ&]{4})([0-9]{2})[0][2]([0][1-9]|[1][\d]|2[0-8])([A-Z0-9]{3})"

        rfc_regex = (
            # Unifica todo en un solo patrón
            f"^({meses_31}|{meses_30}|{bisiesto}|{febrero})$"
        )

        if not re.fullmatch(rfc_regex, val):
            raise ValueError('Formato de RFC inválido')
        return val

    @field_validator('FechaNacimiento')
    @classmethod
    def validar_fecha_nacimiento(cls, value: date):
        if value < date(1900, 1, 1):
            raise ValueError('La fecha de nacimiento debe ser posterior al 1 de enero de 1900')

        hoy = date.today()
        edad = hoy.year - value.year - ((hoy.month, hoy.day) < (value.month, value.day))

        if edad < 4:
            raise ValueError('La edad mínima para solicitar es de 4 años')

        return value


class SolicitudesTodas(BaseModel):
    SolicitudId: int
    UsuarioId: int
    FechaSolicitud: datetime
    EstatusValidacion: int
    
    model_config = {
        "from_attributes": True
    }