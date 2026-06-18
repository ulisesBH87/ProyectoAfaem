from pydantic import BaseModel, EmailStr, field_validator, model_validator, Field
from datetime import datetime, date
import re
from typing import List, Optional

def validacion_curp(value: str):
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

def parse_y_validar_fecha(fecha_str: str) -> date:
    if not fecha_str or not isinstance(fecha_str, str):
        raise ValueError("Ingresa una fecha válida.")

    fecha_str = fecha_str.strip()
    
    # Regex to enforce exactly 4-digit years
    regex_iso = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    regex_slash = re.compile(r'^\d{2}/\d{2}/\d{4}$')
    
    if regex_iso.match(fecha_str):
        parts = fecha_str.split('-')
        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    elif regex_slash.match(fecha_str):
        parts = fecha_str.split('/')
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
    else:
        raise ValueError("Ingresa una fecha válida.")
        
    try:
        parsed_date = date(year, month, day)
    except ValueError:
        raise ValueError("Ingresa una fecha válida.")
        
    return parsed_date

def validacion_fecha(value):
    if isinstance(value, str):
        value = parse_y_validar_fecha(value)
    elif isinstance(value, datetime):
        value = value.date()
    elif not isinstance(value, date):
        raise ValueError("Ingresa una fecha válida.")

    if value.year < 1900:
        raise ValueError("El año debe ser igual o mayor a 1900.")

    hoy = date.today()
    if value > hoy:
        raise ValueError("La fecha de nacimiento no puede ser futura.")

    age = hoy.year - value.year - (
        (hoy.month, hoy.day) < (value.month, value.day)
    )

    if age < 5:
        raise ValueError("El jugador debe tener al menos 5 años de edad.")

    if age > 125:
        raise ValueError("Ingresa una fecha válida.")

    return value