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

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "afaem-487315-9fef755ac1dc.json"

app = Flask(__name__)

# --- TUS FUNCIONES DE API Y CÁLCULO SE MANTIENEN INTACTAS ---

def validar_verificamex(curp):
    if not curp or curp == "No detectado":
        return {"verificado": False, "mensaje": "Sin CURP para verificar"}
        
    url = "https://api.verificamex.com/identity/v1/scraping/renapo"
    token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNjg4YjQ5OThjNzM5YjQ4YTY4ZTM1ZmExYTlhOTI2YTFiZWUzMzM1MzVhMjZmNTFhNjVlOTM1OTkwYmI0ZmQzMDU2OTNlMTlmYWEzZDE0NzIiLCJpYXQiOjE3NzI3MjY5NTkuNzc3Nzg1LCJuYmYiOjE3NzI3MjY5NTkuNzc3ODEsImV4cCI6MTgwNDI2Mjk1OS43NjQzMzQsInN1YiI6Ijk1ODkiLCJzY29wZXMiOltdfQ.TF4rnhKYrnPvAzS8w4kHsEoWVcTuLmsPq36RNwkWfCW8uZBDE9R-w1MHecFkHK5BZg_umXUrokKcqeScakJPq2lgsBWEWTNQxqFNteakGbh-XEt9CyWsx8_vHfxRaFalaDesSArFwIYUznYq7TxWLoejxAunXTcTqlczkfZkb76Atj0fMXiGpO-OkkWlXHpKKYoVen_yr0WfAzGILU5SHI8W_XO6hzXShqgvd9_y1SHBMmqTH2nUUx4tbEseZG-KkRt93bDCoxUsawNarNArZG33JA02K2M9zt1UJqJXDENByg6F0KTtTfeA0qdsHU7R41opJX5ARuv5o2oN5EK6J-wJnL5VO-qeu0Ynn9Yq2a74sLEFefIlp0E7NSdHZGiZ_lKtYN9QqRsvwKQ_cmdyfO-XBNGJqtSCL3FsStq8kCDwoVJB0mywB6De3hOS7xvEzKdnAGcc1D7c1vdwomlVAgaKYvmtvFuJj9rGBSoY9cSB9BfhW6f72nh8oELlRDdZqvA3fmGkpQhDVtQAqKcEIUL51vqbiV-NUe3MYJHadn4-HLH3w15Y0G1bqJxEnSZmN6xWyRmP2niafvl8zou2kcdIbtMEX0Ycz28rfZoa1naqWi5yVP-GsMnWNwrn83juIVqbVgVGYkvpK6b_08WynjrSGV0VpSNeXq9ZJtpvrWQ"
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    payload = {"curp": curp}
    
    try:
        if token == "TU_TOKEN_DE_VERIFICAMEX_AQUI":
            return {"verificado": True, "mensaje": "CURP Validada en RENAPO (Simulación)"}
            
        respuesta = requests.post(url, json=payload, headers=headers)
        
        if respuesta.status_code == 200:
            datos_api = respuesta.json()
            if "data" in datos_api and "citizen" in datos_api["data"]:
                return {"verificado": True, "mensaje": "CURP Validada Oficialmente en RENAPO"}
            
        return {"verificado": False, "mensaje": "CURP Rechazada o No Encontrada"}
    except:
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
    texto = unicodedata.normalize('NFKD', str(texto)).encode('ascii', 'ignore').decode('utf-8')
    texto = re.sub(r'[^A-Z0-9\s<]', ' ', texto.upper())
    return re.sub(r'\s+', ' ', texto).strip()

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
        # En el acta, buscamos lo que hay entre "DATOS DE LA PERSONA" y "FECHA DE NACIMIENTO"
        match = re.search(r'(NOMBRE|NOMBRE S|NOMBRES)(.*?)FECHA', texto_norm)
        if match:
            bloque = match.group(2).strip()
            # Quitamos etiquetas sueltas que suelen colarse en el acta
            bloque = re.sub(r'(PRIMER APELLIDO|SEGUNDO APELLIDO|SEXO|CURP)', ' ', bloque)
            bloque = re.sub(r'\s+', ' ', bloque).strip()
            
            partes = bloque.split()
            if len(partes) >= 3:
                datos["nombres"] = " ".join(partes[:-2])
                datos["apellido_paterno"] = partes[-2]
                datos["apellido_materno"] = partes[-1]
                datos["nombre_completo"] = bloque
                return datos

    # PRIORIDAD 3: Rescate Genérico si todo falla
    # Extraemos las palabras más largas alrededor de donde se encontró la CURP
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
            lugar_nacimiento = match.group(1).strip()

    return lugar_nacimiento, lugar_residencia

# --- ORQUESTADOR PRINCIPAL ---

def procesar_texto(texto):
    texto_norm = normalizar_texto(texto)
    tipo_doc = determinar_tipo_documento(texto_norm)
    curp = extraer_curp_segura(texto)
    
    # Extraer Nombres
    info_doc = extraer_datos_inteligentes(texto, tipo_doc, curp)
    
    # Extraer Datos Fijos de CURP (Lo más seguro)
    edad = "No calculada"
    fecha_nac = "No detectada"
    sexo = "No detectado"
    
    if curp != "No detectado":
        edad, fecha_nac = calcular_datos_curp(curp)
        letra_sexo = curp[10]
        sexo = "MASCULINO" if letra_sexo == 'H' else "FEMENINO" if letra_sexo == 'M' else "NO BINARIO"

    # Ubicaciones y Estado
    lugar_nac, lugar_res = extraer_ubicaciones(texto, tipo_doc)
    nacionalidad = "MEXICANA" if "MEXIC" in texto_norm else "EXTRANJERA"
    estado = "MENOR DE EDAD" if isinstance(edad, int) and edad < 18 else "ADULTO"
    
    validacion_api = validar_verificamex(curp)
    
    return {
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

def ejecutar_vision_ocr(filename, content):
    if filename.endswith('.pdf'):
        doc = fitz.open(stream=content, filetype="pdf")
        page = doc.load_page(0) 
        pix = page.get_pixmap(dpi=150)
        image_content = pix.tobytes("png")
    else:
        image_content = content

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
    app.run(debug=True, port=5001)