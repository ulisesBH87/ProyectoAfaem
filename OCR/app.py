import os
import re
import base64
import requests
import difflib
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, render_template, request
from google.cloud import vision
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

credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not credentials_path:
    credentials_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "afaemocr-e6153e55388c.json")
elif not os.path.isabs(credentials_path):
    credentials_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), credentials_path)
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

app = Flask(__name__)

# --- TUS FUNCIONES DE API Y CÁLCULO SE MANTIENEN INTACTAS ---

def validar_verificamex(curp):
    if not curp or curp == "No detectado":
        return {"verificado": False, "mensaje": "Sin CURP para verificar"}
        
    url = "https://api.verificamex.com/identity/v1/scraping/renapo"
    token = os.getenv("VERIFICAMEX_API_TOKEN")
    
    if not token or token == "TU_TOKEN_DE_VERIFICAMEX_AQUI":
        print("[WARNING] VERIFICAMEX_API_TOKEN no configurado en variables de entorno. Ejecutando en modo Simulación.")
        return {"verificado": True, "mensaje": "CURP Validada en RENAPO (Simulación)"}
        
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    payload = {"curp": curp}
    
    try:
        respuesta = requests.post(url, json=payload, headers=headers)
        
        if respuesta.status_code == 200:
            datos_api = respuesta.json()
            if "data" in datos_api and "citizen" in datos_api["data"]:
                return {"verificado": True, "mensaje": "CURP Validada Oficialmente en RENAPO"}
            
        return {"verificado": False, "mensaje": "CURP Rechazada o No Encontrada"}
    except Exception as e:
        print(f"[ERROR] Error de conexión con la API de Verificamex: {str(e)}")
        return {"verificado": False, "mensaje": "Error de conexión con la API"}

def calcular_datos_curp(curp):
    try:
        aa, mm, dd = int(curp[4:6]), int(curp[6:8]), int(curp[8:10])
        anio = 2000 + aa if aa < 26 else 1900 + aa
        fecha_nac = datetime(anio, mm, dd)
        hoy = datetime.now()
        edad = hoy.year - anio - ((hoy.month, hoy.day) < (mm, dd))
        return edad, fecha_nac.strftime("%Y-%m-%d")
    except:
        return "No calculada", "No detectada"

# --- FUNCIONES DE LIMPIEZA MEJORADAS ---

def normalizar_texto(texto):
    """Quita acentos y caracteres raros para estandarizar el texto"""
    if not texto: return ""
    # Remove parenthesized (S) or (s) to avoid turning into a standalone 'S'
    texto = re.sub(r'\([Ss]\)', '', texto)
    texto = unicodedata.normalize('NFKD', str(texto)).encode('ascii', 'ignore').decode('utf-8')
    texto = re.sub(r'[^A-Z0-9\s<]', ' ', texto.upper())
    return re.sub(r'\s+', ' ', texto).strip()

BLACKLISTED_WORDS = [
    "CLAVE", "UNICA", "REGISTRO", "REGISTF", "CURP",
    "POBLACION", "ESTADOS", "UNIDOS", "MEXICANOS",
    "ACTA", "NACIMIENTO", "REGISTRO CIVIL", "ENTIDAD", "MUNICIPIO",
    "LOCALIDAD", "OFICIALIA", "LIBRO", "FOJA", "TOMO", "NACIONALIDAD", "SEXO",
    "NOMORE", "NOMRE", "NOMBRES", "APELIDO", "APELIDOS"
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
    c_n = nombres.strip().upper() if nombres else ""
    c_ap1 = ap1.strip().upper() if ap1 else ""
    c_ap2 = ap2.strip().upper() if ap2 else ""
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
    l_ap1 = c_ap1[0] if c_ap1 else ""
    l_ap2 = c_ap2[0] if c_ap2 else ""
    l_n = first_name[0] if first_name else ""
    curp_prefix = curp[:4].upper()
    
    m3 = letters_match_or_similar(curp_prefix[3], l_n)
    if not m3:
        return False, False
        
    if l_ap2:
        m0_standard = letters_match_or_similar(curp_prefix[0], l_ap1)
        m2_standard = letters_match_or_similar(curp_prefix[2], l_ap2)
        if m0_standard and m2_standard:
            return True, False
            
        m0_swapped = letters_match_or_similar(curp_prefix[2], l_ap1)
        m2_swapped = letters_match_or_similar(curp_prefix[0], l_ap2)
        if m0_swapped and m2_swapped:
            return True, True
    else:
        m0_standard = letters_match_or_similar(curp_prefix[0], l_ap1)
        if m0_standard:
            return True, False
        m0_swapped = letters_match_or_similar(curp_prefix[2], l_ap1)
        if m0_swapped:
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
        if not field_val:
            continue
        words = field_val.split()
        for w in words:
            if w in BLACKLISTED_WORDS:
                if discarded_list is not None:
                    discarded_list.append(f"({n_val}, {a1_val}, {a2_val}) -> Rejected: Field '{field_name}' contains blacklist word '{w}'")
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
            
    # Scan standard order: NOMBRES APELLIDO1 APELLIDO2
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
                        
    # Scan reverse order: APELLIDO1 APELLIDO2 NOMBRES
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

def extraer_curp_segura(texto):
    """Extrae la CURP usando Expresiones Regulares estrictas"""
    texto_limpio = texto.replace(" ", "").replace("\n", "").upper()
    # Patrón estricto de CURP Mexicana
    match = re.search(r'[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d', texto_limpio)
    return match.group(0) if match else "No detectado"

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

# --- EL CEREBRO DE EXTRACCIÓN (NUEVO) ---
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
    
    # 1. Intentar formato INE reverso (IDMEX)
    # Ej: IDMEX1234567891<<1234... \n 900101M2512314MEX<02<<...\n APELLIDO<PATERNO<MATERNO<<NOMBRES<
    lineas = texto_crudo.split('\n')
    for i, linea in enumerate(lineas):
        l_limpia = linea.replace(" ", "")
        if "<<" in l_limpia and not l_limpia.startswith("IDMEX") and not l_limpia[0].isdigit():
            # Suele ser la tercera línea del MRZ
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
                        "nombre_completo": f"{nombres} {ap1} {ap2}".strip()
                    }

    # 2. Intentar formato Pasaporte (P<MEX)
    match_pasaporte = re.search(r'P<MEX([A-Z<]+)<<([A-Z<]+)', texto_lineal)
    if match_pasaporte:
        apellidos = match_pasaporte.group(1).replace("<", " ").strip()
        nombres = match_pasaporte.group(2).replace("<", " ").strip()
        ap_split = apellidos.split()
        return {
            "nombres": nombres, "apellido_paterno": ap_split[0] if len(ap_split)>0 else "", 
            "apellido_materno": ap_split[1] if len(ap_split)>1 else "",
            "nombre_completo": f"{nombres} {apellidos}".strip()
        }
    return None

def extraer_datos_inteligentes(texto_crudo, tipo_doc, curp):
    """Extrae datos basándose en anclas y estructura, no borrando basura"""
    texto_norm = normalizar_texto(texto_crudo)
    lineas = [normalizar_texto(l) for l in texto_crudo.split('\n') if l.strip()]
    
    datos = {
        "nombre_completo": "No detectado", "nombres": "No detectado",
        "apellido_paterno": "No detectado", "apellido_materno": "No detectado"
    }

    # PRIORIDAD 1: Si hay MRZ, es la verdad absoluta.
    mrz_datos = extraer_nombre_mrz(texto_crudo)
    if mrz_datos:
        return mrz_datos

    discarded_list = []
    candidatos_encontrados = []

    # PRIORIDAD 2: Extracción por anclas según documento
    if tipo_doc == "INE":
        # En el INE frontal, el nombre suele estar en 3 líneas debajo de la palabra "NOMBRE"
        for i, linea in enumerate(lineas):
            if linea == "NOMBRE":
                if i + 3 < len(lineas):
                    ap1 = lineas[i+1]
                    ap2 = lineas[i+2]
                    nombres = lineas[i+3]
                    
                    # Evitar que se coma otras etiquetas si el nombre es corto
                    if "DOMICILIO" not in nombres and "EDAD" not in ap1:
                        datos["apellido_paterno"] = ap1
                        datos["apellido_materno"] = ap2
                        datos["nombres"] = nombres
                        datos["nombre_completo"] = f"{nombres} {ap1} {ap2}".strip()
                        return datos

    elif tipo_doc == "ACTA DE NACIMIENTO":
        matched_candidate = None

        # Determine header line index to ignore lines before headers
        header_keywords = ["ESTADOS UNIDOS MEXICANOS", "REGISTRO CIVIL", "ACTA DE NACIMIENTO", "CERTIFICADO DE NACIMIENTO"]
        first_header_idx = 0
        for idx, l in enumerate(lineas):
            if any(hk in l for hk in header_keywords):
                first_header_idx = idx
                break

        # Try mashed layout first: DATOS DEL REGISTRADO [nombres] NOMBRE [ap1] PRIMER APELLIDO [ap2] SEGUNDO APELLIDO
        patron_mashed = re.search(
            r'DATOS\s+DEL\s+REGISTRADO\s+([A-Z0-9\s]+?)\s+NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)($|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO)\b)',
            texto_norm
        )

        patron = None
        if patron_mashed:
            patron = patron_mashed
        else:
            # Buscar estructura oficial moderna standard
            patron = re.search(
                r'NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)($|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO)\b)',
                texto_norm
            )

        if patron:
            nombres = patron.group(1).strip()
            ap1 = patron.group(2).strip()
            ap2 = patron.group(3).strip()

            # Clean leading single-letter noise (often OCR noise like 'S' from 'NOMBRE(S)')
            n_words = nombres.split()
            if n_words and len(n_words[0]) <= 1:
                nombres = " ".join(n_words[1:])

            # Clean blacklisted words from each field
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

        # Fallback simple
        patron_simple = re.search(
            r'DATOS\s+DEL\s+REGISTRADO.*?NOMBRE\s+([A-Z\s]+)',
            texto_norm
        )

        if patron_simple:
            nombre_linea = patron_simple.group(1).strip()

            # Cortar basura frecuente
            nombre_linea = re.split(
                r'FECHA|SEXO|CURP|NACIONALIDAD|ENTIDAD|MUNICIPIO',
                nombre_linea
            )[0].strip()

            # Limpiar palabras basura del OCR
            PALABRAS_BASURA = [
                "OFICIALIA", "LIBRO", "ACTA", "LOCALIDAD", "MUNICIPIO", "ENTIDAD", "CRIP", "REGISTRADO", "DATOS"
            ]

            for basura in PALABRAS_BASURA:
                nombre_linea = nombre_linea.replace(basura, "")

            # Limpiar espacios dobles
            nombre_linea = re.sub(r'\s+', ' ', nombre_linea).strip()

            partes = nombre_linea.split()

            if len(partes) >= 3:
                nombres_val = " ".join(partes[:-2])
                ap1_val = partes[-2]
                ap2_val = partes[-1]

                # Clean blacklisted words from each field
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

        # Fallback to candidate line search matching CURP
        if curp != "No detectado":
            res_curp = buscar_nombre_por_curp(texto_crudo, curp, discarded_list, first_header_idx)
            if res_curp:
                candidatos_encontrados.append(res_curp)

        # Fallback de proximidad por etiquetas si no se encontró candidato lineal
        if not candidatos_encontrados:
            res_prox = extraer_por_proximidad_etiquetas(texto_crudo, curp)
            if res_prox:
                candidatos_encontrados.append(res_prox)

        # Print/Log candidate verification diagnostics
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

        # Decision
        if candidatos_encontrados:
            final_cand = candidatos_encontrados[0]
            datos["nombres"] = final_cand["nombres"]
            datos["apellido_paterno"] = final_cand["apellido_paterno"]
            datos["apellido_materno"] = final_cand["apellido_materno"]
            datos["nombre_completo"] = final_cand["nombre_completo"]
            return datos
        else:
            # Return empty/No detectado fields rather than incorrect labels
            return datos

    # PRIORIDAD 3: Rescate Genérico si todo falla (for non birth certificates)
    if curp != "No detectado":
        for i, linea in enumerate(lineas):
            if curp in linea.replace(" ", ""):
                # El nombre suele estar arriba de la CURP
                if i > 0 and len(lineas[i-1].split()) >= 2:
                    candidato = lineas[i-1]
                    partes = candidato.split()
                    if len(partes) >= 3:
                        datos["nombres"] = " ".join(partes[:-2])
                        datos["apellido_paterno"] = partes[-2]
                        datos["apellido_materno"] = partes[-1]
                        datos["nombre_completo"] = candidato
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

def procesar_texto(texto):
    try:
        with open("ocr_output.log", "a", encoding="utf-8") as log_file:
            log_file.write(f"\n=========================================\n")
            log_file.write(f"OCR PROCESAR_TEXTO START AT: {datetime.now().isoformat()}\n")
            log_file.write(f"RAW OCR TEXT:\n{texto}\n")
            log_file.write(f"=========================================\n")
    except Exception as log_ex:
        print(f"[ERROR] Failed to write initial OCR logs: {str(log_ex)}")

    # Slice the text to only include the registered person's data (exclude parents/filiacion data)
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
    curp = extraer_curp_segura(texto) # Scan full text for CURP
    
    # Extraer Nombres
    info_doc = extraer_datos_inteligentes(texto_para_procesar, tipo_doc, curp)
    
    # Extraer Datos Fijos de CURP (Lo más seguro)
    edad = "No calculada"
    fecha_nac = "No detectada"
    sexo = "No detectado"
    
    if curp != "No detectado":
        edad, fecha_nac = calcular_datos_curp(curp)
        letra_sexo = curp[10]
        sexo = "MASCULINO" if letra_sexo == 'H' else "FEMENINO" if letra_sexo == 'M' else "OTRO"
    else:
        texto_upper_proc = texto_norm.upper()
        if "FEMENINO" in texto_upper_proc or "MUJER" in texto_upper_proc:
            sexo = "FEMENINO"
        elif "MASCULINO" in texto_upper_proc or "HOMBRE" in texto_upper_proc:
            sexo = "MASCULINO"

    # Ubicaciones y Estado
    lugar_nac, lugar_res = extraer_ubicaciones(texto_para_procesar, tipo_doc)

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
        "nacionalidad": nacionalidad,
        "sexo": sexo,
        "lugar_nacimiento": lugar_nac,
        "lugar_residencia": lugar_res,
        "curp": curp,
        "fecha_nac": fecha_nac,
        "edad": f"{edad} años" if isinstance(edad, int) else edad,
        "estado": estado,
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

def preprocesar_imagen_canales(image_content):
    try:
        nparr = np.frombuffer(image_content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return image_content
        # Separar canales y quedarnos con el verde para eliminar la marca de agua
        b, g, r = cv2.split(img)
        
        # Estimar el fondo (marca de agua + iluminación) dilatando la imagen
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 21))
        background = cv2.morphologyEx(g, cv2.MORPH_DILATE, kernel)
        
        # Dividir la imagen por su fondo estimado para neutralizar la marca de agua y sombras
        normalized = cv2.divide(g, background, scale=255)
        
        # Umbralización binaria simple sobre la imagen normalizada
        _, thresh = cv2.threshold(normalized, 180, 255, cv2.THRESH_BINARY)
        
        _, encoded_img = cv2.imencode(".png", thresh)
        return encoded_img.tobytes()
    except Exception as e:
        print(f"[ERROR PREPROCESAMIENTO] {e}")
        return image_content

def ejecutar_vision_ocr(filename, content):
    if filename.endswith('.pdf'):
        doc = fitz.open(stream=content, filetype="pdf")
        page = doc.load_page(0) 
        pix = page.get_pixmap(dpi=150)
        image_content = pix.tobytes("png")
    else:
        image_content = content

    # Aplicar preprocesamiento de canales para eliminar marcas de agua
    image_content = preprocesar_imagen_canales(image_content)

    img_b64 = base64.b64encode(image_content).decode('utf-8')
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_content)
    response = client.document_text_detection(image=image)
    
    if response.text_annotations:
        return response.text_annotations[0].description, img_b64
    return None, None

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
                    futuro_id = executor.submit(ejecutar_vision_ocr, id_name, id_content)
                    
                    futuro_formato = None
                    if form_content:
                        futuro_formato = executor.submit(ejecutar_vision_ocr, form_name, form_content)
                        
                    texto_id, img_id_b64 = futuro_id.result()
                    texto_formato, img_form_b64 = (futuro_formato.result() if futuro_formato else (None, None))

                if texto_id:
                    datos = procesar_texto(texto_id)
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