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

def validacion_fecha(value: date):
    
    minima = 5
    hoy = date.today()

    if value > date.today():
        raise ValueError('La fecha no puede ser futura')
        

    if value < date(1900, 1, 1):
        raise ValueError('La fecha no puede ser anterior a 01-01-1900')
    
    #Edad mínima
    age = hoy.year - value.year - (
        (hoy.month, hoy.day) < (value.month, value.day)
    )

    if age < minima:
        raise ValueError(f'La edad mínima debe ser de {minima} años')
    
    
    return value