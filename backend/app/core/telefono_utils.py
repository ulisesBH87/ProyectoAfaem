import re
from fastapi import HTTPException

def validar_y_normalizar_telefono(telefono: str | None) -> str | None:
    if not telefono:
        return None
    
    # Limpiar caracteres especiales: mantener solo números y '+'
    tel_clean = re.sub(r"[^0-9+]", "", telefono.strip())
    
    # Asegurar que el '+' solo esté al inicio
    if "+" in tel_clean:
        has_plus_at_start = tel_clean.startswith("+")
        tel_clean = tel_clean.replace("+", "")
        if has_plus_at_start:
            tel_clean = "+" + tel_clean
            
    # Si viene como 10 dígitos sin prefijo, auto-completar con México (+52)
    if re.match(r"^\d{10}$", tel_clean):
        tel_clean = f"+52{tel_clean}"
        
    # Validar formato E.164: + seguido de 7 a 15 dígitos
    if not re.match(r"^\+\d{7,15}$", tel_clean):
        raise HTTPException(
            status_code=400,
            detail="Formato de teléfono inválido. Debe cumplir con el estándar E.164 (ej: +527352444742)."
        )
        
    return tel_clean
