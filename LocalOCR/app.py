import os
import re
import base64
import requests
import difflib
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, render_template, request
import pytesseract
from datetime import datetime
import fitz
import unicodedata
import cv2
import numpy as np

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuración de ruta para ejecutable de Tesseract
tesseract_cmd = os.getenv("TESSERACT_CMD")
if not tesseract_cmd:
    typical_win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(typical_win_path):
        tesseract_cmd = typical_win_path

if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

app = Flask(__name__)

VERIFIED_CURPS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verified_curps.json")

def cargar_cache_curps():
    import json
    if os.path.exists(VERIFIED_CURPS_FILE):
        try:
            with open(VERIFIED_CURPS_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception as e:
            print(f"[ERROR] No se pudo leer el cache de CURPs: {str(e)}")
    return set()

def guardar_cache_curps(cache):
    import json
    try:
        with open(VERIFIED_CURPS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(cache), f, indent=4)
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el cache de CURPs: {str(e)}")

def validar_verificamex(curp):
    if not curp or curp == "No detectado":
        return {"verificado": False, "mensaje": "Sin CURP para verificar"}
        
    curp_norm = curp.strip().upper()
    cache = cargar_cache_curps()
    if curp_norm in cache:
        return {"verificado": True, "mensaje": "CURP Validada Oficialmente en RENAPO (Cache local)"}
        
    # 1. Intentar validar con Verificamex si esta configurado
    token = os.getenv("VERIFICAMEX_API_TOKEN")
    if token and token != "TU_TOKEN_DE_VERIFICAMEX_AQUI":
        url = "https://api.verificamex.com/identity/v1/scraping/renapo"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        payload = {"curp": curp_norm}
        
        try:
            respuesta = requests.post(url, json=payload, headers=headers)
            
            if respuesta.status_code == 200:
                datos_api = respuesta.json()
                if "data" in datos_api and "citizen" in datos_api["data"]:
                    cache.add(curp_norm)
                    guardar_cache_curps(cache)
                    return {"verificado": True, "mensaje": "CURP Validada Oficialmente en RENAPO"}
                
            return {"verificado": False, "mensaje": "CURP Rechazada o No Encontrada"}
        except Exception as e:
            print(f"[ERROR] Error de conexion con la API de Verificamex: {str(e)}")
            return {"verificado": False, "mensaje": "Error de conexion con la API"}

    # 2. Fallback a Simulacion si no esta configurado
    print("[WARNING] VERIFICAMEX_API_TOKEN no configurado en variables de entorno. Ejecutando en modo Simulacion.")
    return {"verificado": True, "mensaje": "CURP Validada en RENAPO (Simulacion)"}

def calcular_datos_curp(curp):
    try:
        aa, mm, dd = int(curp[4:6]), int(curp[6:8]), int(curp[8:10])
        anio = 2000 + aa if aa < 26 else 1900 + aa
        fecha_nac = datetime(anio, mm, dd)
        hoy = datetime.now()
        edad = hoy.year - anio - ((hoy.month, hoy.day) < (mm, dd))
        return edad, fecha_nac.strftime("%d/%m/%Y")
    except:
        return "No calculada", "No detectada"

# --- FUNCIONES DE LIMPIEZA MEJORADAS ---

def normalizar_texto(texto):
    """Quita acentos y caracteres raros para estandarizar el texto"""
    if not texto: return ""
    texto = re.sub(r'\([Ss]\)', '', texto)
    texto = unicodedata.normalize('NFKD', str(texto)).encode('ascii', 'ignore').decode('utf-8')
    texto = re.sub(r'[^A-Z0-9\s<]', ' ', texto.upper())
    return re.sub(r'\s+', ' ', texto).strip()

BLACKLISTED_WORDS = [
    "CLAVE", "UNICA", "REGISTRO", "REGISTF", "CURP",
    "POBLACION", "ESTADOS", "UNIDOS", "UNITS", "UNITOS", "MEXICA", "MEXICAL", "MEXICANO", "MEXICANOS",
    "ACTA", "NACIMIENTO", "REGISTRO CIVIL", "ENTIDAD", "MUNICIPIO",
    "LOCALIDAD", "OFICIALIA", "LIBRO", "FOJA", "TOMO", "NACIONALIDAD", "SEXO", "SEXC",
    "NOMORE", "NOMRES", "NOMRE", "NOMBRES", "APELIDO", "APELIDOS", "APELLIDO", "APELLIDOS",
    "GOBIERNO", "MEXICO", "MARCA", "AGUA", "SELLO", "CIVIL",
    "FEMENINO", "MASCULINO", "REGISTRADO", "REGISTRADA", "FECHA", "LUGAR",
    "TADOS", "INICIO", "INILOS", "OS", "CO", "COMPARECIO", "FOLIO"
]

INVALID_SINGLE_WORDS = ["DE", "DEL", "LA", "LAS", "LOS", "EL", "Y"]

def contiene_basura(texto):
    if not texto: return False
    texto_up = normalizar_texto(texto)
    words = texto_up.split()
    for w in words:
        if w in BLACKLISTED_WORDS:
            return True
    return False

def letters_match_or_similar(c1, c2):
    if c1 == c2:
        return True
    substitutions = {
        'B': ['8', 'B'], '8': ['B', '8'],
        'O': ['0', 'O'], '0': ['O', '0'],
        'I': ['1', 'I', 'L'], '1': ['I', '1', 'L'], 'L': ['1', 'L', 'I'],
        'S': ['5', 'S'], '5': ['S', '5'],
        'G': ['6', 'G'], '6': ['G', '6'],
        'T': ['7', 'T'], '7': ['T', '7'],
        'Z': ['2', 'Z'], '2': ['Z', '2']
    }
    if c1 in substitutions and c2 in substitutions[c1]:
        return True
    return False

def curp_coincide_con_nombre(curp, nombres, ap1, ap2):
    if not curp or curp == "No detectado" or len(curp) < 4:
        return False, False
    curp = curp.strip().upper()
    c_n = normalizar_texto(nombres) if nombres else ""
    c_ap1 = normalizar_texto(ap1) if ap1 else ""
    c_ap2 = normalizar_texto(ap2) if ap2 else ""
    if not c_n or not c_ap1:
        return False, False
    n_words = c_n.split()
    first_name = ""
    if len(n_words) > 1 and n_words[0] in ["MARIA", "MA", "MA.", "M.", "JOSE", "J", "J."]:
        first_name = n_words[1]
    else:
        first_name = n_words[0] if n_words else ""
    if not first_name:
        return False, False

    def get_vocal_interna(w):
        for char in w[1:]:
            if char in "AEIOU":
                return char
        return "X"

    def get_consonante_interna(w):
        for char in w[1:]:
            if char in "BCDFGHJKLMNPQRSTVWXYZ":
                return char
            elif char == "Ñ":
                return "X"
        return "X"

    ap1_letra = c_ap1[0] if c_ap1 else "X"
    ap1_vocal = get_vocal_interna(c_ap1)
    ap2_letra = c_ap2[0] if c_ap2 else "X"
    n_letra = first_name[0] if first_name else "X"

    # Intentar coincidencia estándar
    standard_match = (
        letters_match_or_similar(curp[0], ap1_letra) and
        letters_match_or_similar(curp[1], ap1_vocal) and
        letters_match_or_similar(curp[2], ap2_letra) and
        letters_match_or_similar(curp[3], n_letra)
    )

    # Intentar coincidencia con apellidos invertidos (a veces ocurre en el registro)
    swapped_match = False
    if c_ap2:
        swapped_match = (
            letters_match_or_similar(curp[0], ap2_letra) and
            letters_match_or_similar(curp[1], get_vocal_interna(c_ap2)) and
            letters_match_or_similar(curp[2], ap1_letra) and
            letters_match_or_similar(curp[3], n_letra)
        )

    # Validar consonantes internas en posiciones 13, 14, 15 (si la longitud de la CURP lo permite)
    if len(curp) >= 16:
        ap1_cons = get_consonante_interna(c_ap1)
        ap2_cons = get_consonante_interna(c_ap2)
        n_cons = get_consonante_interna(first_name)
        
        if standard_match:
            cons_match = (
                letters_match_or_similar(curp[13], ap1_cons) or
                letters_match_or_similar(curp[14], ap2_cons) or
                letters_match_or_similar(curp[15], n_cons)
            )
            if cons_match:
                return True, False
        if swapped_match:
            cons_match_swapped = (
                letters_match_or_similar(curp[13], ap2_cons) or
                letters_match_or_similar(curp[14], ap1_cons) or
                letters_match_or_similar(curp[15], n_cons)
            )
            if cons_match_swapped:
                return True, True
    else:
        if standard_match:
            return True, False
        if swapped_match:
            return True, True

    return False, False

def limpiar_basura_del_nombre(campo):
    if not campo: return ""
    palabras = campo.split()
    palabras_limpias = []
    ruidos = ["EXICA", "MEXICA", "UNISEXICA", "ROSINI", "ROS", "ESTADOS", "UNIDOS", "MEXICANOS", "ECHA"]
    for p in palabras:
        p_up = p.upper()
        if p_up in ruidos:
            continue
        cleaned_word = p_up
        for r in ruidos:
            if r in cleaned_word and cleaned_word != r:
                cleaned_word = cleaned_word.replace(r, "")
        if cleaned_word:
            palabras_limpias.append(cleaned_word)
    return " ".join(palabras_limpias).strip()

def extraer_por_proximidad_etiquetas(texto_crudo, curp):
    raw_lines = [l.strip() for l in texto_crudo.split('\n') if l.strip()]
    lines_up = [l.upper() for l in raw_lines]
    
    idx_nombre = -1
    idx_ap1 = -1
    idx_ap2 = -1
    
    for idx, l in enumerate(lines_up):
        if any(kw in l for kw in ["FILIACION", "FILIACIÓN", "PROGENITORES", "PADRES"]):
            break
            
        if "NOMBRE(S)" in l or "NOMBRE" == l or "NOMBRES" in l:
            if idx_nombre == -1:
                idx_nombre = idx
        elif "PRIMER APELLIDO" in l or "PATERNO" in l:
            if idx_ap1 == -1:
                idx_ap1 = idx
        elif "SEGUNDO APELLIDO" in l or "MATERNO" in l:
            if idx_ap2 == -1:
                idx_ap2 = idx
                
    candidatos_nombres = []
    candidatos_ap1 = []
    candidatos_ap2 = []
    
    def es_linea_valida(linea):
        norm = normalizar_texto(linea)
        if not norm: return False
        if contiene_basura(norm): return False
        for etiqueta in ["SEXO", "HOMBRE", "MUJER", "CURP", "FECHA", "LUGAR", "NACIMIENTO", "ESTADO", "REGISTRO", "APELLIDO"]:
            if etiqueta in norm:
                return False
        return True

    if idx_nombre != -1:
        for offset in [-1, 1, -2, 2]:
            neighbor_idx = idx_nombre + offset
            if 0 <= neighbor_idx < len(raw_lines):
                val = raw_lines[neighbor_idx].strip()
                if es_linea_valida(val):
                    candidatos_nombres.append(val)
                    
    if idx_ap1 != -1:
        for offset in [-1, 1, -2, 2]:
            neighbor_idx = idx_ap1 + offset
            if 0 <= neighbor_idx < len(raw_lines):
                val = raw_lines[neighbor_idx].strip()
                if es_linea_valida(val):
                    candidatos_ap1.append(val)
                    
    if idx_ap2 != -1:
        for offset in [-1, 1, -2, 2]:
            neighbor_idx = idx_ap2 + offset
            if 0 <= neighbor_idx < len(raw_lines):
                val = raw_lines[neighbor_idx].strip()
                if es_linea_valida(val):
                    candidatos_ap2.append(val)
                    
    curp_prefix = curp[:4].upper() if curp and curp != "No detectado" else ""
    
    for c_nom in candidatos_nombres:
        for c_a1 in candidatos_ap1:
            for c_a2 in candidatos_ap2:
                nom_clean = limpiar_basura_del_nombre(c_nom)
                a1_clean = limpiar_basura_del_nombre(c_a1)
                a2_clean = limpiar_basura_del_nombre(c_a2)
                
                if not nom_clean or not a1_clean or not a2_clean:
                    continue
                    
                if curp_prefix:
                    coincide, invertido = curp_coincide_con_nombre(curp, nom_clean, a1_clean, a2_clean)
                    if coincide:
                        paterno = a2_clean if invertido else a1_clean
                        materno = a1_clean if invertido else a2_clean
                        return {
                            "nombres": nom_clean,
                            "apellido_paterno": paterno,
                            "apellido_materno": materno,
                            "nombre_completo": f"{nom_clean} {paterno} {materno}".strip(),
                            "origen": "Etiqueta Proximidad Match"
                        }
                else:
                    return {
                        "nombres": nom_clean,
                        "apellido_paterno": a1_clean,
                        "apellido_materno": a2_clean,
                        "nombre_completo": f"{nom_clean} {a1_clean} {a2_clean}".strip(),
                        "origen": "Etiqueta Proximidad Match (Sin CURP)"
                    }
                    
    return None

def validar_candidato_nombre(nombres, ap1, ap2, discarded_list=None):
    n_val = normalizar_texto(nombres)
    a1_val = normalizar_texto(ap1)
    a2_val = normalizar_texto(ap2)
    
    if not n_val or not a1_val:
        if discarded_list is not None:
            discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Empty nombres or paternal surname")
        return False
        
    if len(n_val) > 30 or len(a1_val) > 30 or len(a2_val) > 30:
        if discarded_list is not None:
            discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Field length > 30 characters")
        return False
        
    for field_val, field_name in [(n_val, "Nombres"), (a1_val, "Paterno"), (a2_val, "Materno")]:
        if field_val and any(c.isdigit() for c in field_val):
            if discarded_list is not None:
                discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Field '{field_name}' contains digits")
            return False
            
    for field_val, field_name in [(n_val, "Nombres"), (a1_val, "Paterno"), (a2_val, "Materno")]:
        if not field_val:
            continue
        words = field_val.split()
        for w in words:
            if w in BLACKLISTED_WORDS:
                if discarded_list is not None:
                    discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Field '{field_name}' contains blacklist word '{w}'")
                return False
                
    # Filtrar palabras demasiado cortas que no sean preposiciones o abreviaturas comunes
    ALLOWED_SHORT_WORDS = {"DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "MA", "ME", "DO", "DI", "DA", "UN", "AL", "TO", "FE", "JO"}
    for field_val, field_name in [(n_val, "Nombres"), (a1_val, "Paterno"), (a2_val, "Materno")]:
        if not field_val:
            continue
        words = field_val.split()
        for w in words:
            if len(w) <= 2:
                if w not in ALLOWED_SHORT_WORDS and not w.endswith('.'):
                    if discarded_list is not None:
                        discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Field '{field_name}' contains invalid short word '{w}'")
                    return False

    if n_val in INVALID_SINGLE_WORDS:
        if discarded_list is not None:
            discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Nombres is a single grammatical word '{n_val}'")
        return False
    if a1_val in INVALID_SINGLE_WORDS:
        if discarded_list is not None:
            discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Paternal surname is a single grammatical word '{a1_val}'")
        return False
    if a2_val in INVALID_SINGLE_WORDS:
        if discarded_list is not None:
            discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Maternal surname is a single grammatical word '{a2_val}'")
        return False
        
    return True

def buscar_nombre_por_curp(texto_crudo, curp, discarded_list=None, first_header_idx=0):
    if not curp or curp == "No detectado" or len(curp) < 4:
        return None
    raw_lines = texto_crudo.split('\n')
    lineas = []
    
    for idx, l in enumerate(raw_lines):
        if idx <= first_header_idx:
            continue
        norm = normalizar_texto(l)
        if norm and not contiene_basura(norm):
            lineas.append((idx, norm))
            
    for original_idx, line in lineas:
        partes = line.split()
        n = len(partes)
        if 2 <= n <= 7:
            for i in range(1, n):
                nombres = " ".join(partes[:i])
                ap1 = partes[i]
                ap2 = partes[i+1] if i+1 < n else ""
                
                if validar_candidato_nombre(nombres, ap1, ap2, discarded_list):
                    coincide, invertido = curp_coincide_con_nombre(curp, nombres, ap1, ap2)
                    if coincide:
                        paterno = limpiar_basura_del_nombre(ap2 if invertido else ap1)
                        materno = limpiar_basura_del_nombre(ap1 if invertido else ap2)
                        nombres_limpios = limpiar_basura_del_nombre(nombres)
                        return {
                            "nombres": nombres_limpios, "apellido_paterno": paterno, "apellido_materno": materno,
                            "nombre_completo": f"{nombres_limpios} {paterno} {materno}".strip(), "origen": f"Proximity/Line Match (standard) at line {original_idx}"
                        }
                    else:
                        if discarded_list is not None:
                            discarded_list.append(f"({nombres}, {ap1}, {ap2}) -> Discarded: Does not match CURP prefix")
                        
    for original_idx, line in lineas:
        partes = line.split()
        n = len(partes)
        if 3 <= n <= 7:
            for i in range(2, n):
                ap1 = partes[0]
                ap2 = partes[1]
                nombres = " ".join(partes[2:])
                
                if validar_candidato_nombre(nombres, ap1, ap2, discarded_list):
                    coincide, invertido = curp_coincide_con_nombre(curp, nombres, ap1, ap2)
                    if coincide:
                        paterno = limpiar_basura_del_nombre(ap2 if invertido else ap1)
                        materno = limpiar_basura_del_nombre(ap1 if invertido else ap2)
                        nombres_limpios = limpiar_basura_del_nombre(nombres)
                        return {
                            "nombres": nombres_limpios, "apellido_paterno": paterno, "apellido_materno": materno,
                            "nombre_completo": f"{nombres_limpios} {paterno} {materno}".strip(), "origen": f"Proximity/Line Match (reverse) at line {original_idx}"
                        }
                    else:
                        if discarded_list is not None:
                            discarded_list.append(f"({nombres}, {ap1}, {ap2}) -> Discarded: Does not match CURP prefix")
                        
    return None

def normalizar_curp_ocr(curp_raw):
    """Corrige errores comunes de Tesseract (sustituciones de letras/números) según su posición en la CURP"""
    digit_map = {'O': '0', 'Q': '0', 'I': '1', 'L': '1', 'T': '1', 'S': '5', 'G': '6', 'Z': '2', 'B': '8'}
    letter_map = {'0': 'O', '1': 'I', '5': 'S', '2': 'Z', '6': 'G', '7': 'T', '8': 'B'}
    
    curp_chars = list(curp_raw.upper())
    
    # Índices que deben ser letras (0-3, 10, 11-12, 13-15)
    letter_indices = [0, 1, 2, 3, 10, 11, 12, 13, 14, 15]
    # Índices que deben ser números (4-9, 17) -- el 16 puede ser letra o número
    digit_indices = [4, 5, 6, 7, 8, 9, 17]
    
    for idx in letter_indices:
        if idx < len(curp_chars):
            c = curp_chars[idx]
            if c in letter_map:
                curp_chars[idx] = letter_map[c]
                
    for idx in digit_indices:
        if idx < len(curp_chars):
            c = curp_chars[idx]
            if c in digit_map:
                curp_chars[idx] = digit_map[c]
                
    return "".join(curp_chars)

def extraer_curp_segura(texto):
    """Extrae la CURP usando Expresiones Regulares tolerantes a errores de OCR y las normaliza"""
    texto_limpio = texto.replace(" ", "").replace("\n", "").upper()
    # Expresión regular tolerante a sustituciones comunes en las posiciones numéricas y alfabéticas
    patron_tolerante = r'[A-Z0-9]{4}[0-9OQILTSGZ]{6}[HM][A-Z0-9]{5}[A-Z0-9OQILTSGZ][0-9OQILTSGZ]'
    match = re.search(patron_tolerante, texto_limpio)
    if match:
        curp_candidata = match.group(0)
        return normalizar_curp_ocr(curp_candidata)
    return "No detectado"

def determinar_tipo_documento(texto_up):
    if "ACTA" in texto_up and ("NACIMIENTO" in texto_up or "REGISTRO CIVIL" in texto_up):
        return "ACTA DE NACIMIENTO"
    elif "ELECTORAL" in texto_up or "CREDENCIAL" in texto_up or "INE" in texto_up or "IDMEX" in texto_up:
        return "INE"
    elif "PASAPORTE" in texto_up or "PASSPORT" in texto_up:
        return "PASAPORTE"
    elif "CLAVE UNICA" in texto_up or "POBLACION" in texto_up or "CURP" in texto_up:
        return "CURP"
    return "DOCUMENTO NO RECONOCIDO"

def obtener_estado_curp(curp):
    estados = {
        "AS": "AGUASCALIENTES",
        "BC": "BAJA CALIFORNIA",
        "BS": "BAJA CALIFORNIA SUR",
        "CC": "CAMPECHE",
        "CL": "COAHUILA",
        "CM": "COLIMA",
        "CS": "CHIAPAS",
        "CH": "CHIHUAHUA",
        "DF": "CIUDAD DE MEXICO",
        "DG": "DURANGO",
        "GT": "GUANAJUATO",
        "GR": "GUERRERO",
        "HG": "HIDALGO",
        "JC": "JALISCO",
        "MC": "MEXICO",
        "MN": "MICHOACAN",
        "MS": "MORELOS",
        "NT": "NAYARIT",
        "NL": "NUEVO LEON",
        "OC": "OAXACA",
        "PL": "PUEBLA",
        "QT": "QUERETARO",
        "QR": "QUINTANA ROO",
        "SP": "SAN LUIS POTOSI",
        "SL": "SINALOA",
        "SR": "SONORA",
        "TC": "TABASCO",
        "TS": "TAMAULIPAS",
        "TL": "TLAXCALA",
        "VZ": "VERACRUZ",
        "YN": "YUCATAN",
        "ZS": "ZACATECAS",
        "NE": "NACIDO EN EL EXTRANJERO"
    }
    if curp and len(curp) >= 13:
        clave_estado = curp[11:13]
        return estados.get(clave_estado, "No detectado")
    return "No detectado"

def extraer_nombre_mrz(texto_crudo):
    """Busca el nombre en las líneas de código <<< (INE reverso y Pasaporte)"""
    texto_lineal = texto_crudo.replace(" ", "")
    lineas = texto_crudo.split('\n')
    for i, linea in enumerate(lineas):
        l_limpia = linea.replace(" ", "")
        if "<<" in l_limpia and not l_limpia.startswith("IDMEX") and not l_limpia[0].isdigit():
            partes = l_limpia.split("<<")
            if len(partes) >= 2:
                apellidos = partes[0].replace("<", " ").strip()
                nombres = partes[1].replace("<", " ").strip()
                
                ap_split = apellidos.split()
                ap1 = ap_split[0] if len(ap_split) > 0 else ""
                ap2 = ap_split[1] if len(ap_split) > 1 else ""
                
                if len(nombres) > 2 and len(apellidos) > 2:
                    return {
                        "nombres": nombres, "apellido_paterno": ap1, "apellido_materno": ap2,
                        "nombre_completo": f"{nombres} {ap1} {ap2}".strip(),
                        "origen": "MRZ Match"
                    }

    match_pasaporte = re.search(r'P<MEX([A-Z<]+)<<([A-Z<]+)', texto_lineal)
    if match_pasaporte:
        apellidos = match_pasaporte.group(1).replace("<", " ").strip()
        nombres = match_pasaporte.group(2).replace("<", " ").strip()
        ap_split = apellidos.split()
        return {
            "nombres": nombres, "apellido_paterno": ap_split[0] if len(ap_split)>0 else "", 
            "apellido_materno": ap_split[1] if len(ap_split)>1 else "",
            "nombre_completo": f"{nombres} {apellidos}".strip(),
            "origen": "MRZ Match"
        }
    return None

def corregir_apellidos_con_evidencia_y_curp(nombres, ap1, ap2, curp, texto_crudo):
    if not curp or curp == "No detectado" or len(curp) < 4:
        return ap1, ap2
        
    curp_prefix = curp[:4].upper()
    words_in_text = set(normalizar_texto(texto_crudo).split())
    
    def corregir_apellido(ap, curp_char):
        if not ap or ap == "No detectado" or len(ap) < 2:
            return ap
            
        ap_norm = normalizar_texto(ap)
        for w in words_in_text:
            if w != ap_norm and w.startswith(ap_norm) and len(w) <= len(ap_norm) + 2:
                if letters_match_or_similar(curp_char, w[0]):
                    if w not in BLACKLISTED_WORDS:
                        return w
        return ap
        
    new_ap1 = corregir_apellido(ap1, curp_prefix[0])
    new_ap2 = corregir_apellido(ap2, curp_prefix[2])
    
    return new_ap1, new_ap2

def corregir_apellidos_contaminados_s(nombres, ap1, ap2, texto_crudo):
    n_norm = normalizar_texto(nombres) if nombres else ""
    ap1_norm = normalizar_texto(ap1) if ap1 else ""
    ap2_norm = normalizar_texto(ap2) if ap2 else ""
    
    lineas = [normalizar_texto(l) for l in texto_crudo.split('\n') if l.strip()]
    
    def corregir_uno(apellido, resto_completo):
        if not apellido or len(apellido) <= 2 or not apellido.endswith('S'):
            return apellido
            
        sin_s = apellido[:-1]
        for l in lineas:
            if l == resto_completo or l == f"{n_norm} {ap1_norm} {ap2_norm}".strip():
                continue
            words_in_line = l.split()
            if sin_s in words_in_line and apellido not in words_in_line:
                return sin_s
                
        is_isolated = False
        for l in lineas:
            if l == apellido:
                is_isolated = True
                break
                
        if is_isolated:
            resto_candidates = [n_norm, f"{n_norm} {ap1_norm}".strip(), f"{n_norm} {ap2_norm}".strip()]
            resto_found = False
            for rc in resto_candidates:
                if not rc:
                    continue
                for l in lineas:
                    if l == rc:
                        resto_found = True
                        break
                if resto_found:
                    break
                    
            if resto_found:
                return sin_s
                
        return apellido

    new_ap1 = corregir_uno(ap1_norm, f"{n_norm} {ap2_norm}".strip())
    new_ap2 = corregir_uno(ap2_norm, f"{n_norm} {ap1_norm}".strip())
    
    return new_ap1, new_ap2

def extraer_nombre_acta_por_lineas_crudas(texto_crudo, curp="No detectado", texto_original=None):
    log_lines = []
    log_lines.append("\n=== EXTRAER NOMBRE ACTA POR LINEAS CRUDAS START ===")
    
    raw_lines = texto_crudo.split('\n')
    lines_norm = [normalizar_texto(l) for l in raw_lines]
    
    LABEL_WORDS = {"NOMBRE", "PRIMER", "SEGUNDO", "APELLIDO"}
    
    for idx, l in enumerate(lines_norm):
        words = set(l.split())
        matching = LABEL_WORDS & words
        if len(matching) >= 2:
            log_lines.append(f"Label line matched at index {idx}: '{l}' (matched: {list(matching)})")
            
            for offset in [1, 2, 3]:
                prev_idx = idx - offset
                if prev_idx < 0:
                    continue
                candidate_raw = raw_lines[prev_idx]
                candidate_norm = lines_norm[prev_idx]
                candidate_words = candidate_norm.split()
                
                log_lines.append(f"  Evaluating candidate line at index {prev_idx}: '{candidate_raw}'")
                
                if not (3 <= len(candidate_words) <= 5):
                    log_lines.append(f"    -> Discarded: word count is {len(candidate_words)} (must be between 3 and 5)")
                    continue
                    
                if any(c.isdigit() for c in candidate_raw):
                    log_lines.append(f"    -> Discarded: contains digits")
                    continue
                    
                NOISE_WORDS = {"SEXO", "FECHA", "NACIMIENTO", "LUGAR", "CUAUTLA", "MORELOS", "HOMBRE", "MUJER", "MEXICANOS", "UNIDOS", "ESTADOS"}
                found_noise = NOISE_WORDS & set(candidate_words)
                if found_noise:
                    log_lines.append(f"    -> Discarded: contains noise/garbage words {list(found_noise)}")
                    continue
                    
                if not any(c.isalpha() for c in candidate_norm):
                    log_lines.append(f"    -> Discarded: does not contain alphabetic characters")
                    continue
                    
                log_lines.append(f"    -> SELECTED CANDIDATE: '{candidate_raw}'")
                
                ap2 = candidate_words[-1]
                ap1 = candidate_words[-2]
                nombres = " ".join(candidate_words[:-2])
                
                ap1_clean, ap2_clean = corregir_apellidos_contaminados_s(nombres, ap1, ap2, texto_crudo)
                if ap1_clean != ap1:
                    log_lines.append(f"    -> Cleaned S-contamination from ap1: '{ap1}' -> '{ap1_clean}'")
                    ap1 = ap1_clean
                if ap2_clean != ap2:
                    log_lines.append(f"    -> Cleaned S-contamination from ap2: '{ap2}' -> '{ap2_clean}'")
                    ap2 = ap2_clean
                    
                txt_for_evidence = texto_original if texto_original else texto_crudo
                ap1_ev, ap2_ev = corregir_apellidos_con_evidencia_y_curp(nombres, ap1, ap2, curp, txt_for_evidence)
                if ap1_ev != ap1:
                    log_lines.append(f"    -> Corrected ap1 with CURP/evidence: '{ap1}' -> '{ap1_ev}'")
                    ap1 = ap1_ev
                if ap2_ev != ap2:
                    log_lines.append(f"    -> Corrected ap2 with CURP/evidence: '{ap2}' -> '{ap2_ev}'")
                    ap2 = ap2_ev
                    
                nombre_completo = f"{nombres} {ap1} {ap2}".strip()
                
                log_lines.append(f"    -> Result: Nombres='{nombres}', Ap1='{ap1}', Ap2='{ap2}', Completo='{nombre_completo}'")
                log_lines.append("=== EXTRAER NOMBRE ACTA POR LINEAS CRUDAS END ===")
                
                try:
                    with open("ocr_output.log", "a", encoding="utf-8") as f_log:
                        f_log.write("\n".join(log_lines) + "\n")
                except Exception as log_ex:
                    print(f"[ERROR] Failed to write raw line fallback logs: {str(log_ex)}")
                    
                return {
                    "nombres": nombres,
                    "apellido_paterno": ap1,
                    "apellido_materno": ap2,
                    "nombre_completo": nombre_completo,
                    "origen": "Acta Raw Line Fallback"
                }
                
    log_lines.append("  No matching candidate found in the evaluated lines before labels.")
    log_lines.append("=== EXTRAER NOMBRE ACTA POR LINEAS CRUDAS END ===")
    
    try:
        with open("ocr_output.log", "a", encoding="utf-8") as f_log:
            f_log.write("\n".join(log_lines) + "\n")
    except Exception as log_ex:
        print(f"[ERROR] Failed to write raw line fallback logs: {str(log_ex)}")
        
    return None

def extraer_datos_inteligentes(texto_crudo, tipo_doc, curp, texto_original=None):
    texto_norm = normalizar_texto(texto_crudo)
    lineas = [normalizar_texto(l) for l in texto_crudo.split('\n') if l.strip()]
    
    datos = {
        "nombre_completo": "No detectado", "nombres": "No detectado",
        "apellido_paterno": "No detectado", "apellido_materno": "No detectado"
    }

    mrz_datos = extraer_nombre_mrz(texto_crudo)
    if mrz_datos:
        return mrz_datos

    discarded_list = []
    candidatos_encontrados = []

    if tipo_doc == "INE":
        for i, linea in enumerate(lineas):
            if linea == "NOMBRE":
                if i + 3 < len(lineas):
                    ap1 = lineas[i+1]
                    ap2 = lineas[i+2]
                    nombres = lineas[i+3]
                    
                    if "DOMICILIO" not in nombres and "EDAD" not in ap1:
                        datos["apellido_paterno"] = ap1
                        datos["apellido_materno"] = ap2
                        datos["nombres"] = nombres
                        datos["nombre_completo"] = f"{nombres} {ap1} {ap2}".strip()
                        datos["origen"] = "Anchor Regex Match"
                        return datos

    elif tipo_doc == "ACTA DE NACIMIENTO":
        matched_candidate = None
        header_keywords = ["ESTADOS UNIDOS MEXICANOS", "REGISTRO CIVIL", "ACTA DE NACIMIENTO", "CERTIFICADO DE NACIMIENTO"]
        first_header_idx = 0
        for idx, l in enumerate(lineas):
            if any(hk in l for hk in header_keywords):
                first_header_idx = idx
                break

        patron_mashed = re.search(
            r'DATOS\s+DEL\s+REGISTRADO\s+([A-Z0-9\s]+?)\s+NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)($|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO)\b)',
            texto_norm
        )

        patron = None
        if patron_mashed:
            patron = patron_mashed
        else:
            patron = re.search(
                r'NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)($|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO)\b)',
                texto_norm
            )

        if patron:
            nombres = patron.group(1).strip()
            ap1 = patron.group(2).strip()
            ap2 = patron.group(3).strip()

            n_words = nombres.split()
            if n_words and len(n_words[0]) <= 1:
                nombres = " ".join(n_words[1:])

            if contiene_basura(nombres) or nombres in INVALID_SINGLE_WORDS: nombres = ""
            if contiene_basura(ap1) or ap1 in INVALID_SINGLE_WORDS: ap1 = ""
            if contiene_basura(ap2) or ap2 in INVALID_SINGLE_WORDS: ap2 = ""

            if validar_candidato_nombre(nombres, ap1, ap2, discarded_list):
                coincide, invertido = False, False
                if curp == "No detectado":
                    coincide = True
                else:
                    coincide, invertido = curp_coincide_con_nombre(curp, nombres, ap1, ap2)
                
                if coincide:
                    paterno = limpiar_basura_del_nombre(ap2 if invertido else ap1)
                    materno = limpiar_basura_del_nombre(ap1 if invertido else ap2)
                    nombres_limpios = limpiar_basura_del_nombre(nombres)
                    candidatos_encontrados.append({
                        "nombres": nombres_limpios, "apellido_paterno": paterno, "apellido_materno": materno,
                        "nombre_completo": f"{nombres_limpios} {paterno} {materno}".strip(), "origen": "Anchor Regex Match"
                    })
                else:
                    discarded_list.append(f"({nombres}, {ap1}, {ap2}) [Anchor Regex] -> Discarded: Does not match CURP prefix")
            else:
                discarded_list.append(f"({nombres}, {ap1}, {ap2}) [Anchor Regex] -> Rejected: Failed validation checks")

        patron_simple = re.search(
            r'DATOS\s+DEL\s+REGISTRADO.*?NOMBRE\s+([A-Z\s]+)',
            texto_norm
        )

        if patron_simple:
            nombre_linea = patron_simple.group(1).strip()
            nombre_linea = re.split(
                r'FECHA|SEXO|CURP|NACIONALIDAD|ENTIDAD|MUNICIPIO',
                nombre_linea
            )[0].strip()

            PALABRAS_BASURA = [
                "OFICIALIA", "LIBRO", "ACTA", "LOCALIDAD", "MUNICIPIO", "ENTIDAD", "CRIP", "REGISTRADO", "DATOS"
            ]
            for basura in PALABRAS_BASURA:
                nombre_linea = nombre_linea.replace(basura, "")

            nombre_linea = re.sub(r'\s+', ' ', nombre_linea).strip()
            partes = nombre_linea.split()

            if len(partes) >= 3:
                nombres_val = " ".join(partes[:-2])
                ap1_val = partes[-2]
                ap2_val = partes[-1]

                if contiene_basura(nombres_val) or nombres_val in INVALID_SINGLE_WORDS: nombres_val = ""
                if contiene_basura(ap1_val) or ap1_val in INVALID_SINGLE_WORDS: ap1_val = ""
                if contiene_basura(ap2_val) or ap2_val in INVALID_SINGLE_WORDS: ap2_val = ""

                if validar_candidato_nombre(nombres_val, ap1_val, ap2_val, discarded_list):
                    coincide, invertido = False, False
                    if curp == "No detectado":
                        coincide = True
                    else:
                        coincide, invertido = curp_coincide_con_nombre(curp, nombres_val, ap1_val, ap2_val)
                    if coincide:
                        paterno = limpiar_basura_del_nombre(ap2_val if invertido else ap1_val)
                        materno = limpiar_basura_del_nombre(ap1_val if invertido else ap2_val)
                        nombres_limpios = limpiar_basura_del_nombre(nombres_val)
                        candidatos_encontrados.append({
                            "nombres": nombres_limpios, "apellido_paterno": paterno, "apellido_materno": materno,
                            "nombre_completo": f"{nombres_limpios} {paterno} {materno}".strip(), "origen": "Simple Regex Match"
                        })
                    else:
                        discarded_list.append(f"({nombres_val}, {ap1_val}, {ap2_val}) [Simple Regex] -> Discarded: Does not match CURP prefix")
                else:
                    discarded_list.append(f"({nombres_val}, {ap1_val}, {ap2_val}) [Simple Regex] -> Rejected: Failed validation checks")

        if curp != "No detectado":
            res_curp = buscar_nombre_por_curp(texto_crudo, curp, discarded_list, first_header_idx)
            if res_curp:
                candidatos_encontrados.append(res_curp)

        if not candidatos_encontrados:
            res_prox = extraer_por_proximidad_etiquetas(texto_crudo, curp)
            if res_prox:
                candidatos_encontrados.append(res_prox)

        try:
            with open("ocr_output.log", "a", encoding="utf-8") as log_file:
                log_file.write("\n=== OCR NAME CANDIDATES SEARCH DIAGNOSTICS ===\n")
                log_file.write(f"Detected CURP: {curp}\n")
                log_file.write("Discarded Candidates:\n")
                for disc in discarded_list:
                    log_file.write(f"  - {disc}\n")
                log_file.write("Valid Candidates Found:\n")
                for cand in candidatos_encontrados:
                    log_file.write(f"  - {cand}\n")
                log_file.write("==============================================\n")
        except Exception as e:
            print(f"[ERROR] Failed to write diagnostics to log: {str(e)}")

        if candidatos_encontrados:
            final_cand = candidatos_encontrados[0]
            nombres = final_cand["nombres"]
            ap1 = final_cand["apellido_paterno"]
            ap2 = final_cand["apellido_materno"]
            
            ap1_clean, ap2_clean = corregir_apellidos_contaminados_s(nombres, ap1, ap2, texto_crudo)
            if ap1_clean != ap1:
                ap1 = ap1_clean
            if ap2_clean != ap2:
                ap2 = ap2_clean
                
            txt_for_evidence = texto_original if texto_original else texto_crudo
            ap1_ev, ap2_ev = corregir_apellidos_con_evidencia_y_curp(nombres, ap1, ap2, curp, txt_for_evidence)
            if ap1_ev != ap1:
                ap1 = ap1_ev
            if ap2_ev != ap2:
                ap2 = ap2_ev
                
            datos["nombres"] = nombres
            datos["apellido_paterno"] = ap1
            datos["apellido_materno"] = ap2
            datos["nombre_completo"] = f"{nombres} {ap1} {ap2}".strip()
            datos["origen"] = final_cand.get("origen", "Desconocido")
            return datos
        else:
            res_raw = extraer_nombre_acta_por_lineas_crudas(texto_crudo, curp=curp, texto_original=texto_original)
            if res_raw:
                datos["nombres"] = res_raw["nombres"]
                datos["apellido_paterno"] = res_raw["apellido_paterno"]
                datos["apellido_materno"] = res_raw["apellido_materno"]
                datos["nombre_completo"] = res_raw["nombre_completo"]
                datos["origen"] = res_raw["origen"]
                return datos
            return datos

    if curp != "No detectado":
        for i, linea in enumerate(lineas):
            if curp in linea.replace(" ", ""):
                if i > 0 and len(lineas[i-1].split()) >= 2:
                    candidato = lineas[i-1]
                    partes = candidato.split()
                    if len(partes) >= 3:
                        datos["nombres"] = " ".join(partes[:-2])
                        datos["apellido_paterno"] = partes[-2]
                        datos["apellido_materno"] = partes[-1]
                        datos["nombre_completo"] = candidato
                        datos["origen"] = "Fallback CURP Proximity Match"
                        return datos

    return datos

def extraer_ubicaciones(texto_crudo, tipo_doc):
    lugar_nacimiento = "No detectado"
    lugar_residencia = "No detectado"
    texto_norm = normalizar_texto(texto_crudo)

    if tipo_doc == "INE":
        match = re.search(r'DOMICILIO(.*?)CLAVE', texto_norm)
        if match:
            lugar_residencia = match.group(1).strip()
    elif tipo_doc == "ACTA DE NACIMIENTO":
        match = re.search(r'LUGAR DE NACIMIENTO(.*?)FECHA', texto_norm)
        if match:
            val = match.group(1).strip()
            val = re.sub(r'[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d', '', val)
            for b in BLACKLISTED_WORDS:
                val = val.replace(b, "")
            val = re.sub(r'\s+', ' ', val).strip()
            if len(val) > 2:
                lugar_nacimiento = val
                
        if lugar_nacimiento == "No detectado":
            match_alt = re.search(r'([A-Z\s]+?)\s+LUGAR DE NACIMIENTO', texto_norm)
            if match_alt:
                val = match_alt.group(1).strip()
                val = re.sub(r'[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d', '', val)
                for b in BLACKLISTED_WORDS:
                    val = val.replace(b, "")
                val = re.sub(r'\s+', ' ', val).strip()
                if len(val) > 2:
                    lugar_nacimiento = val

    return lugar_nacimiento, lugar_residencia

# --- ORQUESTADOR PRINCIPAL ---

def procesar_texto(texto, vision_response=None):
    try:
        with open("ocr_output.log", "a", encoding="utf-8") as log_file:
            log_file.write(f"\n=========================================\n")
            log_file.write(f"OCR PROCESAR_TEXTO START AT: {datetime.now().isoformat()}\n")
            log_file.write(f"RAW OCR TEXT:\n{texto}\n")
            log_file.write(f"=========================================\n")
    except Exception as log_ex:
        print(f"[ERROR] Failed to write initial OCR logs: {str(log_ex)}")

    texto_upper = texto.upper()
    filiacion_idx = -1
    for keyword in ["FILIACION", "FILIACIÓN", "DATOS DE FILIACION", "DATOS DE FILIACIÓN", "DATOS DE LOS PADRES", "PADRES", "PROGENITORES"]:
        idx = texto_upper.find(keyword)
        if idx != -1:
            if filiacion_idx == -1 or idx < filiacion_idx:
                filiacion_idx = idx
                
    if filiacion_idx != -1:
        texto_para_procesar = texto[:filiacion_idx]
    else:
        texto_para_procesar = texto

    texto_norm = normalizar_texto(texto_para_procesar)
    tipo_doc = determinar_tipo_documento(texto_norm)
    curp = extraer_curp_segura(texto)
    
    info_doc = None
    edad = "No calculada"
    fecha_nac = "No detectada"
    sexo = "No detectado"
    lugar_nac = "No detectado"

    if tipo_doc == "ACTA DE NACIMIENTO" and vision_response is not None:
        spatial_data = extraer_datos_acta_por_layout(vision_response, curp)
        if spatial_data:
            nombres = spatial_data["nombres"]
            ap1 = spatial_data["apellido_paterno"]
            ap2 = spatial_data["apellido_materno"]
            
            ap1_clean, ap2_clean = corregir_apellidos_contaminados_s(nombres, ap1, ap2, texto_para_procesar)
            if ap1_clean != ap1:
                ap1 = ap1_clean
            if ap2_clean != ap2:
                ap2 = ap2_clean
                
            ap1_ev, ap2_ev = corregir_apellidos_con_evidencia_y_curp(nombres, ap1, ap2, curp, texto)
            if ap1_ev != ap1:
                ap1 = ap1_ev
            if ap2_ev != ap2:
                ap2 = ap2_ev
                
            info_doc = {
                "nombres": nombres,
                "apellido_paterno": ap1,
                "apellido_materno": ap2,
                "nombre_completo": f"{nombres} {ap1} {ap2}".strip(),
                "origen": spatial_data["origen"]
            }
            if spatial_data["sexo"] != "No detectado":
                sexo = spatial_data["sexo"]
            if spatial_data["fecha_nac"] != "No detectada":
                fecha_nac = spatial_data["fecha_nac"]
            if spatial_data["lugar_nacimiento"] != "No detectado":
                lugar_nac = spatial_data["lugar_nacimiento"]

    if not info_doc or not info_doc["nombres"] or info_doc["nombres"] == "No detectado":
        info_doc = extraer_datos_inteligentes(texto_para_procesar, tipo_doc, curp, texto_original=texto)

    if curp != "No detectado":
        edad, curp_fecha = calcular_datos_curp(curp)
        if fecha_nac == "No detectada" or not fecha_nac:
            fecha_nac = curp_fecha
        letra_sexo = curp[10]
        curp_sexo = "HOMBRE" if letra_sexo == 'H' else "MUJER" if letra_sexo == 'M' else "OTRO"
        if sexo == "No detectado" or not sexo:
            sexo = curp_sexo
    else:
        if sexo == "No detectado" or not sexo:
            texto_upper_proc = texto_norm.upper()
            if "FEMENINO" in texto_upper_proc or "MUJER" in texto_upper_proc:
                sexo = "MUJER"
            elif "MASCULINO" in texto_upper_proc or "HOMBRE" in texto_upper_proc:
                sexo = "HOMBRE"

    lugar_nac_text, lugar_res = extraer_ubicaciones(texto_para_procesar, tipo_doc)
    if lugar_nac == "No detectado" or not lugar_nac:
        lugar_nac = lugar_nac_text
    if lugar_nac == "No detectado" and curp != "No detectado":
        lugar_nac = obtener_estado_curp(curp)

    nacionalidad = "MEXICANA" if "MEXIC" in texto_norm else "EXTRANJERA"
    estado = "MENOR DE EDAD" if isinstance(edad, int) and edad < 18 else "ADULTO"
    
    validacion_api = validar_verificamex(curp)
    
    resultado = {
        "documento": tipo_doc,
        "nombre_completo": info_doc['nombre_completo'],
        "nombres": info_doc['nombres'],
        "apellido_paterno": info_doc['apellido_paterno'],
        "apellido_materno": info_doc['apellido_materno'],
        "origen": info_doc.get("origen", "Desconocido"),
        "nacionalidad": nacionalidad,
        "sexo": sexo,
        "lugar_nacimiento": lugar_nac,
        "lugar_residencia": lugar_res,
        "curp": curp,
        "fecha_nac": fecha_nac,
        "edad": f"{edad} años" if isinstance(edad, int) else edad,
        "estado": estado,
        "clasificacion": estado,
        "validacion": validacion_api,
        "texto_crudo": texto
    }

    try:
        with open("ocr_output.log", "a", encoding="utf-8") as log_file:
            log_file.write(f"PROCESSED RESULT:\n")
            for k, v in resultado.items():
                if k != "texto_crudo":
                    log_file.write(f"  {k}: {v}\n")
            log_file.write(f"=========================================\n")
    except Exception as log_ex:
        print(f"[ERROR] Failed to write final OCR logs: {str(log_ex)}")

    return resultado

def comparar_documentos(datos_identidad, texto_formato):
    curp_id = datos_identidad.get("curp", "No detectado")
    curp_formato = extraer_curp_segura(texto_formato)
    
    resultado_comparacion = {
        "curp_formato": curp_formato,
        "coinciden": False,
        "mensaje_verificacion": ""
    }
    
    if curp_id == "No detectado" or curp_formato == "No detectado":
        resultado_comparacion["mensaje_verificacion"] = "⚠️ No se pudo extraer la CURP en uno o ambos documentos para comparar."
        return resultado_comparacion
        
    if curp_id == curp_formato:
        resultado_comparacion["coinciden"] = True
        resultado_comparacion["mensaje_verificacion"] = f"✅ ÉXITO: La CURP ({curp_id}) coincide perfectamente en ambos documentos."
    else:
        similitud = difflib.SequenceMatcher(None, curp_id, curp_formato).ratio()
        if similitud >= 0.85:
            resultado_comparacion["coinciden"] = True
            resultado_comparacion["mensaje_verificacion"] = f"✅ COINCIDENCIA ACEPTADA (Similitud del {int(similitud*100)}%): Identidad: {curp_id} | Formato: {curp_formato} (Posible error de caligrafía)."
        else:
            resultado_comparacion["mensaje_verificacion"] = f"❌ ERROR: Los datos no coinciden. Identidad: {curp_id} | Formato: {curp_formato}"
            
    return resultado_comparacion

def preprocesar_imagen_acta(image_content):
    import cv2
    import numpy as np
    try:
        nparr = np.frombuffer(image_content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        gray = np.max(img, axis=2)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        contrast = clahe.apply(gray)
        binarized = cv2.adaptiveThreshold(
            contrast, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 15
        )
        cleaned = cv2.medianBlur(binarized, 3)
        _, encoded_img = cv2.imencode('.png', cleaned)
        return encoded_img.tobytes()
    except Exception as e:
        print(f"[ERROR] Error al preprocesar la imagen del acta: {str(e)}")
        return None

def limpiar_contaminacion_s(valor, ocr_text_alternativo):
    if not valor or valor == "No detectado" or not ocr_text_alternativo:
        return valor
        
    palabras = valor.split()
    palabras_limpias = []
    
    for p in palabras:
        if len(p) > 2 and p.endswith('S'):
            sin_s = p[:-1]
            p_norm = normalizar_texto(sin_s)
            alt_norm = normalizar_texto(ocr_text_alternativo)
            
            pattern = r'\b' + re.escape(p_norm) + r'\b'
            if re.search(pattern, alt_norm):
                if p.isupper():
                    palabras_limpias.append(sin_s.upper())
                else:
                    palabras_limpias.append(sin_s)
                continue
        palabras_limpias.append(p)
        
    return " ".join(palabras_limpias)

def extraer_datos_acta_por_layout(vision_response, curp="No detectado"):
    if not vision_response:
        return None

    annotations = []
    if hasattr(vision_response, 'text_annotations'):
        annotations = vision_response.text_annotations
    elif isinstance(vision_response, dict) and 'text_annotations' in vision_response:
        annotations = vision_response['text_annotations']

    if not annotations or len(annotations) <= 1:
        return None

    words = []
    for annot in annotations[1:]:
        if hasattr(annot, 'description'):
            text = annot.description
            poly = annot.bounding_poly
            vertices = poly.vertices
            xs = [v.x for v in vertices if v.x is not None]
            ys = [v.y for v in vertices if v.y is not None]
        else:
            text = annot.get('description', '')
            poly = annot.get('bounding_poly', {})
            vertices = poly.get('vertices', [])
            xs = [v.get('x') for v in vertices if v.get('x') is not None]
            ys = [v.get('y') for v in vertices if v.get('y') is not None]

        if not xs: xs = [0]
        if not ys: ys = [0]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        x_center = sum(xs) / len(xs)
        y_center = sum(ys) / len(ys)
        words.append({
            'text': text,
            'x': x_center,
            'y': y_center,
            'x_range': [x_min, x_max],
            'y_range': [y_min, y_max]
        })

    log_lines = []
    log_lines.append("\n=== EXTRAER DATOS ACTA POR LAYOUT START ===")

    def agrupar_lineas(words_list, tolerance=15):
        words_sorted = sorted(words_list, key=lambda x: x['y'])
        lines = []
        for w in words_sorted:
            placed = False
            for line in lines:
                avg_y = sum(item['y'] for item in line) / len(line)
                if abs(w['y'] - avg_y) <= tolerance:
                    line.append(w)
                    placed = True
                    break
            if not placed:
                lines.append([w])
        for line in lines:
            line.sort(key=lambda w: w['x'])
        lines.sort(key=lambda line: sum(w['y'] for w in line)/len(line))
        return lines

    all_lines = agrupar_lineas(words)
    
    log_lines.append("\nAll Reconstructed Lines in Image:")
    for idx, line in enumerate(all_lines):
        line_txt = " ".join(w['text'] for w in line)
        avg_y = sum(w['y'] for w in line) / len(line)
        log_lines.append(f"  Line {idx:02d} (Y={avg_y:.1f}): {line_txt}")
    
    y_start = None
    y_end = None
    
    START_VARIANTS = [
        "DATOS DE LA PERSONA REGISTRADA",
        "DATOS PERSONA REGISTRADA",
        "DATOS DEL REGISTRADO",
        "DATOS DE LA PERSONA"
    ]
    
    for line in all_lines:
        line_txt = normalizar_texto(" ".join(w['text'] for w in line))
        for var in START_VARIANTS:
            if var in line_txt and y_start is None:
                y_start = max(w['y_range'][1] for w in line)
                log_lines.append(f"Start Header matched: '{line_txt}' -> y_start={y_start}")
                break

    y_label_min = None
    for line in all_lines:
        line_txt = normalizar_texto(" ".join(w['text'] for w in line))
        LABEL_WORDS_CHECK = [
            "NOMBRE", "NOMBRES", "APELLIDO", "APELLIDOS", "PATERNO", "MATERNO",
            "SEXO", "FECHA DE NACIMIENTO", "LUGAR DE NACIMIENTO"
        ]
        if any(lw in line_txt for lw in LABEL_WORDS_CHECK):
            line_y_min = min(w['y_range'][0] for w in line)
            if y_label_min is None or line_y_min < y_label_min:
                y_label_min = line_y_min

    if y_start is not None and y_label_min is not None and y_label_min < y_start:
        log_lines.append(f"Adjusting y_start because label was found above header: y_start={y_start} -> {y_label_min - 20}")
        y_start = y_label_min - 20
                
    END_VARIANTS = [
        "DATOS DE FILIACION DE LA PERSONA REGISTRADA",
        "DATOS DE FILIACION",
        "DATOS DE FILIACIÓN",
        "DATOS DE LOS PADRES",
        "DATOS DE LOS PROGENITORES",
        "ANOTACIONES MARGINALES",
        "ANOTACIONES MARGINAL",
        "CERTIFICACION",
        "CERTIFICACIÓN",
        "FIRMA ELECTRONICA",
        "FIRMA ELECTRÓNICA",
        "VALIDACION",
        "VERIFICACION",
        "SINOPSIS",
        "PADRES:",
        "PROGENITORES"
    ]
    
    for line in all_lines:
        line_txt = normalizar_texto(" ".join(w['text'] for w in line))
        for var in END_VARIANTS:
            if var in line_txt:
                temp_y = min(w['y_range'][0] for w in line)
                if y_start is None or temp_y > y_start:
                    if y_end is None or temp_y < y_end:
                        y_end = temp_y
                        log_lines.append(f"End Header matched: '{line_txt}' -> y_end={y_end}")
                        break
                        
    if y_start is None:
        y_start = 0
    if y_end is None:
        y_end = max(w['y'] for w in words) + 100 if words else 2000

    region_words = [w for w in words if y_start <= w['y'] <= y_end]
    region_lines = agrupar_lineas(region_words)

    EXCLUDED_NAME_WORDS = [
        "PRIMER", "APELLIDO", "APELLIDOS", "APELIDO", "APELIDOS", "SEGUNDO", "NOMBRE", "NOMBRES",
        "NOMORES", "NOMRES", "NOMORE", "NOMRE", "PATERNO", "MATERNO", "REGISTRADO", "REGISTRADA",
        "DATOS", "PERSONA", "CURP", "CRIP",
        "SEXO", "SEXC", "FECHA", "NACIMIENTO", "LUGAR",
        "CUAUTLA", "MORELOS", "HOMBRE", "MUJER", "MEXICANA", "MEXICANO", "FEMENINO", "MASCULINO",
        "ESTADOS", "UNIDOS", "MEXICANOS", "GOBIERNO", "MARCA", "AGUA", "SELLO", "CIVIL",
        "UNITS", "UNITOS", "MEXICA", "MEXICAL", "TADOS", "INICIO", "INILOS", "OS", "CO",
        "COMPARECIO", "OFICIALIA", "LIBRO", "ACTA", "REGISTRO", "FOLIO"
    ]

    def merge_boxes(b1, b2):
        xs = b1['x_range'] + b2['x_range']
        ys = b1['y_range'] + b2['y_range']
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        return {
            'text': b1['text'] + " " + b2['text'],
            'x': (min_x + max_x) / 2.0,
            'y': (min_y + max_y) / 2.0,
            'x_range': [min_x, max_x],
            'y_range': [min_y, max_y]
        }

    def find_labels_in_line(line):
        labels = {}
        i = 0
        while i < len(line):
            w = line[i]
            norm = normalizar_texto(w['text'])
            
            if i + 1 < len(line):
                w_next = line[i+1]
                phrase2 = normalizar_texto(w['text'] + " " + w_next['text'])
                if phrase2 in ["PRIMER APELLIDO", "APELLIDO PATERNO", "APELLIDOPATERNO"]:
                    labels["primer_apellido"] = merge_boxes(w, w_next)
                    i += 2
                    continue
                elif phrase2 in ["SEGUNDO APELLIDO", "APELLIDO MATERNO", "APELLIDOMATERNO"]:
                    labels["segundo_apellido"] = merge_boxes(w, w_next)
                    i += 2
                    continue
                elif phrase2 in ["FECHA NACIMIENTO", "FECHADENACIMIENTO", "FECHADENACIMIENT"]:
                    labels["fecha_nacimiento"] = merge_boxes(w, w_next)
                    i += 2
                    continue
                elif phrase2 in ["LUGAR NACIMIENTO", "LUGARDENACIMIENTO"]:
                    labels["lugar_nacimiento"] = merge_boxes(w, w_next)
                    i += 2
                    continue
                    
            if i + 2 < len(line):
                w_next = line[i+1]
                w_next2 = line[i+2]
                phrase3 = normalizar_texto(w['text'] + " " + w_next['text'] + " " + w_next2['text'])
                if phrase3 in ["FECHA DE NACIMIENTO", "FECHA DE NACIMIENT", "FECHA DE NACIMIEN"]:
                    labels["fecha_nacimiento"] = merge_boxes(w, merge_boxes(w_next, w_next2))
                    i += 3
                    continue
                elif phrase3 in ["LUGAR DE NACIMIENTO"]:
                    labels["lugar_nacimiento"] = merge_boxes(w, merge_boxes(w_next, w_next2))
                    i += 3
                    continue

            if norm in ["NOMBRE", "NOMBRES", "NOMBRE(S)", "NOMBRES(S)"] or "NOMBRE" in norm or "NOMRE" in norm:
                labels["nombres"] = w
            elif "PATERNO" in norm or "PRIMER" in norm:
                labels["primer_apellido"] = w
            elif "MATERNO" in norm or "SEGUNDO" in norm:
                labels["segundo_apellido"] = w
            elif "SEXO" in norm:
                labels["sexo"] = w
            elif "FECHA" in norm:
                labels["fecha_nacimiento"] = w
            elif "LUGAR" in norm:
                labels["lugar_nacimiento"] = w
                
            i += 1
        return labels

    def split_nombre_completo(fullname, curp_code="No detectado"):
        partes = fullname.split()
        n = len(partes)
        if n < 2:
            return fullname, "", ""
        if curp_code and curp_code != "No detectado" and len(curp_code) >= 4:
            for i in range(1, n):
                nombres = " ".join(partes[:i])
                ap1 = partes[i]
                ap2 = " ".join(partes[i+1:]) if i+1 < n else ""
                if curp_coincide_con_nombre(curp_code, nombres, ap1, ap2):
                    return nombres, ap1, ap2
            if n >= 3:
                for i in range(2, n):
                    ap1 = partes[0]
                    ap2 = partes[1]
                    nombres = " ".join(partes[2:])
                    if curp_coincide_con_nombre(curp_code, nombres, ap1, ap2):
                        return nombres, ap1, ap2
        if n >= 3:
            nombres = " ".join(partes[:-2])
            ap1 = partes[-2]
            ap2 = partes[-1]
            return nombres, ap1, ap2
        else:
            return partes[0], partes[1], ""

    label_line_idx = -1
    detected_labels = {}
    for idx, line in enumerate(region_lines):
        line_labels = find_labels_in_line(line)
        if "nombres" in line_labels or "primer_apellido" in line_labels:
            label_line_idx = idx
            detected_labels = line_labels
            break

    val_nombres = ""
    val_ap1 = ""
    val_ap2 = ""
    origen_names = "Spatial Layout Parser"

    x_n = detected_labels["nombres"]["x"] if "nombres" in detected_labels else None
    x_ap1 = detected_labels["primer_apellido"]["x"] if "primer_apellido" in detected_labels else None
    x_ap2 = detected_labels["segundo_apellido"]["x"] if "segundo_apellido" in detected_labels else None

    val_lines_to_try = []
    if label_line_idx != -1:
        if label_line_idx > 0:
            val_lines_to_try.append((label_line_idx - 1, "above"))
        if label_line_idx + 1 < len(region_lines):
            val_lines_to_try.append((label_line_idx + 1, "below"))
        val_lines_to_try.append((label_line_idx, "same"))

    best_cand = None
    
    if label_line_idx != -1:
        log_lines.append(f"Found Label Row at idx {label_line_idx}:")
        for k, v in detected_labels.items():
            log_lines.append(f"  Label '{k}': center X={v['x']:.1f}, Y={v['y']:.1f}, x_range={v['x_range']}")

    for v_idx, relative_pos in val_lines_to_try:
        value_line = region_lines[v_idx]
        
        line_words = []
        for w in value_line:
            wt = w['text'].strip()
            # Ignorar palabras con caracteres de control, paréntesis o signos raros
            if not re.match(r'^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\.\-]+$', wt):
                continue
            norm = normalizar_texto(wt)
            if not norm or wt in [":", ",", ";", "-", "/"] or norm in EXCLUDED_NAME_WORDS or norm in BLACKLISTED_WORDS:
                continue
            if any(c.isdigit() for c in wt):
                continue
            line_words.append(w)
            
        if not line_words:
            continue
            
        if x_n is not None and x_ap1 is not None and x_ap2 is not None:
            n_words = []
            ap1_words = []
            ap2_words = []
            
            centers = sorted([("n", x_n), ("ap1", x_ap1), ("ap2", x_ap2)], key=lambda x: x[1])
            mid1 = (centers[0][1] + centers[1][1]) / 2.0
            mid2 = (centers[1][1] + centers[2][1]) / 2.0
            c_order = [c[0] for c in centers]
            
            for w in line_words:
                if w['x'] < mid1:
                    group = c_order[0]
                elif mid1 <= w['x'] < mid2:
                    group = c_order[1]
                else:
                    group = c_order[2]
                    
                if group == "n": n_words.append(w['text'])
                elif group == "ap1": ap1_words.append(w['text'])
                else: ap2_words.append(w['text'])
                
            n_str = " ".join(n_words).strip()
            a1_str = " ".join(ap1_words).strip()
            a2_str = " ".join(ap2_words).strip()
            
        else:
            fullname_line = " ".join(w['text'] for w in line_words).strip()
            n_str, a1_str, a2_str = split_nombre_completo(fullname_line, curp)

        log_lines.append(f"Trying Layout Row {relative_pos} at idx {v_idx}: Nombres='{n_str}', Ap1='{a1_str}', Ap2='{a2_str}'")
        
        if n_str and a1_str:
            discard_reasons = []
            if validar_candidato_nombre(n_str, a1_str, a2_str, discard_reasons):
                matches_curp = False
                if curp != "No detectado" and curp_coincide_con_nombre(curp, n_str, a1_str, a2_str):
                    matches_curp = True
                
                cand_score = 5
                if matches_curp:
                    cand_score += 10
                if relative_pos == "same":
                    cand_score += 1
                elif relative_pos == "above":
                    cand_score += 3
                else:
                    cand_score += 2
                    
                cand_info = {
                    'nombres': n_str,
                    'apellido_paterno': a1_str,
                    'apellido_materno': a2_str,
                    'score': cand_score,
                    'origen': f"Spatial Layout Parser ({relative_pos} line)"
                }
                if best_cand is None or cand_info['score'] > best_cand['score']:
                    best_cand = cand_info
                    log_lines.append(f"  -> New best candidate: {best_cand}")

    if best_cand:
        val_nombres = best_cand['nombres']
        val_ap1 = best_cand['apellido_paterno']
        val_ap2 = best_cand['apellido_materno']
        origen_names = best_cand['origen']
        log_lines.append(f"Layout Row chosen: Nombres='{val_nombres}', Ap1='{val_ap1}', Ap2='{val_ap2}'")

    def fallback_nombre_linea_completa(lines, label_idx):
        start_idx = label_idx - 1 if (label_idx is not None and label_idx > 0) else len(lines) - 1
        for idx in range(start_idx, -1, -1):
            line = lines[idx]
            words_cand = []
            for w in line:
                wt = w['text'].strip()
                if not re.match(r'^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\.\-]+$', wt):
                    continue
                norm = normalizar_texto(wt)
                if not norm or wt in [":", ",", ";", "-", "/"] or norm in EXCLUDED_NAME_WORDS or norm in BLACKLISTED_WORDS:
                    continue
                if any(c.isdigit() for c in wt):
                    continue
                if wt.isupper():
                    words_cand.append(wt)
            if 3 <= len(words_cand) <= 5:
                n = " ".join(words_cand[:-2])
                a1 = words_cand[-2]
                a2 = words_cand[-1]
                discard_reasons = []
                if validar_candidato_nombre(n, a1, a2, discard_reasons):
                    return n, a1, a2
                else:
                    log_lines.append(f"  Fallback line '{' '.join(words_cand)}' discarded: {', '.join(discard_reasons)}")
        return None, None, None

    if not val_nombres or not val_ap1:
        log_lines.append("Fields empty or layout parsing failed, running fallback complete line search...")
        fallback_n, fallback_ap1, fallback_ap2 = fallback_nombre_linea_completa(region_lines, label_line_idx)
        if fallback_n and fallback_ap1:
            val_nombres = fallback_n
            val_ap1 = fallback_ap1
            val_ap2 = fallback_ap2
            origen_names = "Layout Fallback Complete Line"
            log_lines.append(f"Fallback extracted: Nombres='{val_nombres}', Ap1='{val_ap1}', Ap2='{val_ap2}'")

    meta_labels = {}
    for line in region_lines:
        line_labels = find_labels_in_line(line)
        for k, v in line_labels.items():
            if k in ["sexo", "fecha_nacimiento", "lugar_nacimiento"] and k not in meta_labels:
                meta_labels[k] = v

    def obtener_valor_campo_coordenadas(label_box, all_words):
        lx_min, lx_max = label_box['x_range']
        ly_min, ly_max = label_box['y_range']
        lcx = label_box['x']
        lcy = label_box['y']
        
        above_candidates = []
        below_candidates = []
        right_candidates = []
        
        for w in all_words:
            if w['x_range'][0] >= lx_min and w['x_range'][1] <= lx_max and w['y_range'][0] >= ly_min and w['y_range'][1] <= ly_max:
                continue
            
            dx = abs(w['x'] - lcx)
            dy_below = w['y'] - lcy
            if 5 < dy_below < 80 and dx < 100:
                below_candidates.append(w)
                
            dy_above = lcy - w['y']
            if 5 < dy_above < 80 and dx < 100:
                above_candidates.append(w)
                
            dy_right = abs(w['y'] - lcy)
            dx_right = w['x'] - lcx
            if dy_right < 15 and 10 < dx_right < 300:
                right_candidates.append(w)
                
        if right_candidates:
            right_candidates.sort(key=lambda w: w['x'])
            return " ".join([w['text'] for w in right_candidates]).strip()
            
        if below_candidates:
            below_candidates.sort(key=lambda w: w['x'])
            return " ".join([w['text'] for w in below_candidates]).strip()
            
        if above_candidates:
            above_candidates.sort(key=lambda w: w['x'])
            return " ".join([w['text'] for w in above_candidates]).strip()
            
        return ""

    val_sexo = ""
    val_fecha = ""
    val_lugar = ""
    
    if "sexo" in meta_labels:
        val_sexo = obtener_valor_campo_coordenadas(meta_labels["sexo"], region_words)
    if "fecha_nacimiento" in meta_labels:
        val_fecha = obtener_valor_campo_coordenadas(meta_labels["fecha_nacimiento"], region_words)
    if "lugar_nacimiento" in meta_labels:
        val_lugar = obtener_valor_campo_coordenadas(meta_labels["lugar_nacimiento"], region_words)

    if val_sexo:
        sex_upper = normalizar_texto(val_sexo)
        if "FEM" in sex_upper or "MUJ" in sex_upper:
            val_sexo = "MUJER"
        elif "MAS" in sex_upper or "HOM" in sex_upper:
            val_sexo = "HOMBRE"
        else:
            val_sexo = ""
            
    if val_fecha:
        clean_date = normalizar_texto(val_fecha)
        MESES = {
            'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04', 'MAYO': '05', 'JUNIO': '06',
            'JULIO': '07', 'AGOSTO': '08', 'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12',
            'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
            'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
        }
        match_slash = re.search(r'(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})', clean_date)
        match_written = re.search(r'(\d{1,2})\s+DE\s+([A-Z]+)\s+DE\s+(\d{4})', clean_date)
        if match_slash:
            dd_val = match_slash.group(1).zfill(2)
            mm_val = match_slash.group(2).zfill(2)
            yyyy_val = match_slash.group(3)
            val_fecha = f"{dd_val}/{mm_val}/{yyyy_val}"
        elif match_written and match_written.group(2) in MESES:
            dd_val = match_written.group(1).zfill(2)
            mm_val = MESES[match_written.group(2)]
            yyyy_val = match_written.group(3)
            val_fecha = f"{dd_val}/{mm_val}/{yyyy_val}"
        else:
            val_fecha = ""
            
    if val_lugar:
        val_lugar = val_lugar.replace(":", "").strip()
        for b in EXCLUDED_NAME_WORDS + BLACKLISTED_WORDS:
            val_lugar = val_lugar.replace(b, "")
        val_lugar = re.sub(r'\s+', ' ', val_lugar).strip()

    log_lines.append(f"Final extracted: Sexo='{val_sexo}', Fecha='{val_fecha}', Lugar='{val_lugar}'")
    log_lines.append("=== EXTRAER DATOS ACTA POR LAYOUT END ===")

    try:
        with open("ocr_output.log", "a", encoding="utf-8") as f_log:
            f_log.write("\n".join(log_lines) + "\n")
    except Exception as log_ex:
        print(f"[ERROR] Failed to write spatial logs: {str(log_ex)}")

    return {
        'nombres': val_nombres or "No detectado",
        'apellido_paterno': val_ap1 or "No detectado",
        'apellido_materno': val_ap2 or "",
        'nombre_completo': f"{val_nombres} {val_ap1} {val_ap2}".strip() or "No detectado",
        'sexo': val_sexo or "No detectado",
        'fecha_nac': val_fecha or "No detectada",
        'lugar_nacimiento': val_lugar or "No detectado",
        'origen': origen_names
    }

def evaluar_calidad_extraccion(datos):
    if not datos or datos.get("error"):
        return -1
        
    score = 0
    es_acta = datos.get("documento") == "ACTA DE NACIMIENTO"
    
    curp = datos.get("curp")
    if curp and curp != "No detectado" and len(curp) == 18:
        score += 3
        
    nombres = datos.get("nombres", "No detectado")
    ap_pat = datos.get("apellido_paterno", "No detectado")
    ap_mat = datos.get("apellido_materno", "No detectado")
    
    if not nombres or nombres == "No detectado" or nombres.strip() == "":
        score -= 5
    else:
        score += 3 if es_acta else 2
        
    if not ap_pat or ap_pat == "No detectado" or ap_pat.strip() == "":
        score -= 5
    else:
        score += 3 if es_acta else 2
        
    if ap_mat and ap_mat != "No detectado" and ap_mat.strip() != "":
        score += 2 if es_acta else 1
        
    LABEL_WORDS = ["PRIMER", "APELLIDO", "SEGUNDO", "NOMBRE", "NOMBRES", "SEXO", "FECHA", "NACIMIENTO", "LUGAR"]
    for field in [nombres, ap_pat, ap_mat]:
        if field and field != "No detectado":
            field_up = normalizar_texto(field)
            if any(lw in field_up.split() for lw in LABEL_WORDS):
                score -= 10
                
    FORBIDDEN_WORDS = [
        "UNIDOS", "UNITS", "UNITOS", "MEXICA", "MEXICAL", "MEXICANO", "MEXICANOS",
        "ESTADOS", "TADOS", "INICIO", "INILOS", "OS", "CO", "COMPARECIO",
        "OFICIALIA", "LIBRO", "ACTA", "REGISTRO", "FOLIO"
    ]
    for field in [nombres, ap_pat, ap_mat]:
        if field and field != "No detectado":
            field_up = normalizar_texto(field)
            if any(fw in field_up.split() for fw in FORBIDDEN_WORDS):
                score -= 20
                
    for field in [ap_pat, ap_mat]:
        if field and field != "No detectado" and len(field) > 2:
            if field.upper().endswith('S') and any(w in field.upper() for w in ["ESTADOS", "UNIDOS", "MEXICANOS", "GOBIERNO", "CIVIL"]):
                score -= 3

    if curp and curp != "No detectado" and len(curp) >= 4:
        if nombres and ap_pat and nombres != "No detectado" and ap_pat != "No detectado":
            if not curp_coincide_con_nombre(curp, nombres, ap_pat, ap_mat):
                score -= 15

    origen = datos.get("origen", "")
    if "Spatial Layout Parser" in origen:
        score += 4
    elif "Layout Fallback Complete Line" in origen:
        score += 3
    elif "Acta Raw Line Fallback" in origen:
        score += 3
    elif "Anchor Regex Match" in origen:
        score += 3
    elif "Simple Regex Match" in origen:
        score += 2
    elif "Proximity/Line Match" in origen:
        score += 1
        
    fecha_nac = datos.get("fecha_nac")
    if fecha_nac and fecha_nac != "No detectada" and fecha_nac.strip() != "":
        score += 2 if es_acta else 1
        
    sexo = datos.get("sexo")
    if sexo and sexo != "No detectado" and sexo.strip() != "":
        score += 2 if es_acta else 1
        
    lugar_nac = datos.get("lugar_nacimiento")
    if lugar_nac and lugar_nac != "No detectado" and lugar_nac.strip() != "":
        score += 1
        
    return score

def preprocesar_imagen_canales(image_content):
    """
    Retorna la imagen original intacta.
    Se desactivó el escalado de grises y binarización para evitar problemas con la legibilidad
    y guardado de documentos a color en el sistema.
    """
    return image_content

# --- ADAPTADOR TESSERACT OCR LOCAL ---

def run_tesseract_on_bytes(image_content):
    try:
        nparr = np.frombuffer(image_content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None, None

        # Configurar carpeta local de tessdata
        tessdata_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tessdata").replace('\\', '/')
        config = f'--tessdata-dir {tessdata_dir}'

        # Ejecutar Tesseract
        texto_original = pytesseract.image_to_string(img, lang='spa+eng', config=config)
        data = pytesseract.image_to_data(img, lang='spa+eng', output_type=pytesseract.Output.DICT, config=config)

        annotations = []

        # El primer elemento representa todo el texto
        class MockAnnotationPrincipal:
            def __init__(self, desc):
                self.description = desc

        annotations.append(MockAnnotationPrincipal(texto_original))

        # Los siguientes elementos representan cada palabra individual con sus coordenadas
        n_words = len(data['text'])
        for i in range(n_words):
            word_text = data['text'][i].strip()
            if not word_text:
                continue
            
            left = data['left'][i]
            top = data['top'][i]
            width = data['width'][i]
            height = data['height'][i]

            class MockVertex:
                def __init__(self, x, y):
                    self.x = x
                    self.y = y

            class MockPoly:
                def __init__(self, left, top, width, height):
                    self.vertices = [
                        MockVertex(left, top),
                        MockVertex(left + width, top),
                        MockVertex(left + width, top + height),
                        MockVertex(left, top + height)
                    ]

            class MockWordAnnotation:
                def __init__(self, text, left, top, width, height):
                    self.description = text
                    self.bounding_poly = MockPoly(left, top, width, height)

            annotations.append(MockWordAnnotation(word_text, left, top, width, height))

        class MockVisionResponse:
            def __init__(self, annots):
                self.text_annotations = annots

        return texto_original, MockVisionResponse(annotations)
    except Exception as e:
        print(f"[ERROR TESSERACT RUN] {e}")
        return None, None

def ejecutar_tesseract_ocr(filename, content):
    if filename.endswith('.pdf'):
        doc = fitz.open(stream=content, filetype="pdf")
        page = doc.load_page(0) 
        pix = page.get_pixmap(dpi=150)
        image_content = pix.tobytes("png")
    else:
        image_content = content

    image_content = preprocesar_imagen_canales(image_content)
    img_b64 = base64.b64encode(image_content).decode('utf-8')

    texto_original, response = run_tesseract_on_bytes(image_content)
    
    if not texto_original:
        return None, None, None, None
        
    es_acta_por_nombre = any(k in filename.lower() for k in ["acta", "nacimiento", "birth", "cert"])
    texto_norm = normalizar_texto(texto_original)
    es_acta = (determinar_tipo_documento(texto_norm) == "ACTA DE NACIMIENTO") or es_acta_por_nombre
    
    if not es_acta:
        return texto_original, img_b64, response, None
        
    preprocessed_content = preprocesar_imagen_acta(image_content)
    if preprocessed_content:
        try:
            texto_preprocesado, response_prep = run_tesseract_on_bytes(preprocessed_content)
            
            if texto_preprocesado:
                datos_original = procesar_texto(texto_original, response)
                datos_preprocesado = procesar_texto(texto_preprocesado, response_prep)
                
                for field_key in ['nombres', 'apellido_paterno', 'apellido_materno']:
                    datos_original[field_key] = limpiar_contaminacion_s(datos_original.get(field_key), texto_preprocesado)
                    datos_preprocesado[field_key] = limpiar_contaminacion_s(datos_preprocesado.get(field_key), texto_original)
                    
                ap1_orig_c, ap2_orig_c = corregir_apellidos_con_evidencia_y_curp(
                    datos_original['nombres'], datos_original['apellido_paterno'], datos_original['apellido_materno'], 
                    datos_original['curp'], texto_original
                )
                datos_original['apellido_paterno'] = ap1_orig_c
                datos_original['apellido_materno'] = ap2_orig_c

                ap1_prep_c, ap2_prep_c = corregir_apellidos_con_evidencia_y_curp(
                    datos_preprocesado['nombres'], datos_preprocesado['apellido_paterno'], datos_preprocesado['apellido_materno'], 
                    datos_preprocesado['curp'], texto_preprocesado
                )
                datos_preprocesado['apellido_paterno'] = ap1_prep_c
                datos_preprocesado['apellido_materno'] = ap2_prep_c

                datos_original['nombre_completo'] = f"{datos_original['nombres']} {datos_original['apellido_paterno']} {datos_original['apellido_materno']}".strip()
                datos_preprocesado['nombre_completo'] = f"{datos_preprocesado['nombres']} {datos_preprocesado['apellido_paterno']} {datos_preprocesado['apellido_materno']}".strip()
                
                score_orig = evaluar_calidad_extraccion(datos_original)
                score_prep = evaluar_calidad_extraccion(datos_preprocesado)
                
                try:
                    with open("ocr_output.log", "a", encoding="utf-8") as log_file:
                        log_file.write("\n=== OCR DUAL-FLOW ACTA DE NACIMIENTO COMPARISON ===\n")
                        log_file.write(f"Original score: {score_orig} | Preprocessed score: {score_prep}\n")
                        log_file.write(f"Original names: {datos_original.get('nombre_completo')} | CURP: {datos_original.get('curp')}\n")
                        log_file.write(f"Preprocessed names: {datos_preprocesado.get('nombre_completo')} | CURP: {datos_preprocesado.get('curp')}\n")
                        log_file.write("==================================================\n")
                except Exception as log_ex:
                    print(f"[ERROR] Failed to write comparison logs: {str(log_ex)}")
                
                if score_prep > score_orig:
                    return texto_preprocesado, img_b64, response_prep, datos_preprocesado
                else:
                    return texto_original, img_b64, response, datos_original
        except Exception as e:
            print(f"[ERROR] Error running Tesseract on preprocessed image: {str(e)}")
            
    datos_original = procesar_texto(texto_original, response)
    return texto_original, img_b64, response, datos_original

@app.route('/', methods=['GET', 'POST'])
def index():
    datos = None
    if request.method == 'POST':
        archivo_id = request.files.get('file_id')
        archivo_formato = request.files.get('file_formato')
        
        if archivo_id and archivo_id.filename != '':
            try:
                id_name = archivo_id.filename.lower()
                id_content = archivo_id.read()
                
                form_name = None
                form_content = None
                if archivo_formato and archivo_formato.filename != '':
                    form_name = archivo_formato.filename.lower()
                    form_content = archivo_formato.read()

                with ThreadPoolExecutor(max_workers=2) as executor:
                    futuro_id = executor.submit(ejecutar_tesseract_ocr, id_name, id_content)
                    
                    futuro_formato = None
                    if form_content:
                        futuro_formato = executor.submit(ejecutar_tesseract_ocr, form_name, form_content)
                        
                    texto_id, img_id_b64, response_id, datos_id = futuro_id.result()
                    texto_formato, img_form_b64, response_formato, datos_formato = (futuro_formato.result() if futuro_formato else (None, None, None, None))

                if texto_id:
                    if datos_id:
                        datos = datos_id
                    else:
                        datos = procesar_texto(texto_id, response_id)
                    datos['imagen_b64'] = img_id_b64
                    
                    if texto_formato:
                        resultado_comp = comparar_documentos(datos, texto_formato)
                        datos['comparacion'] = resultado_comp
                        datos['imagen_formato_b64'] = img_form_b64
                else:
                    datos = {"error": "No se pudo leer ningún texto del documento de Identidad."}
            except Exception as e:
                datos = {"error": f"Error técnico: {str(e)}"}
                
    return render_template('index.html', datos=datos)

if __name__ == '__main__':
    ocr_host = os.getenv("OCR_HOST", "127.0.0.1")
    ocr_port = int(os.getenv("OCR_PORT", "5001"))
    ocr_debug = os.getenv("OCR_DEBUG", "False").lower() in ("true", "1", "t")
    app.run(host=ocr_host, port=ocr_port, debug=ocr_debug)
