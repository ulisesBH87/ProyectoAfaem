import os
import re
import base64
import logging
import requests
import difflib
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, render_template
from google.cloud import vision
from datetime import datetime
import fitz

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "afaem-487315-9fef755ac1dc.json"

app = Flask(__name__)

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
        return edad, fecha_nac.strftime("%d/%m/%Y")
    except:
        return "No calculada", "No detectada"

def inicial_curp(texto):
    partes = texto.split()
    ignoradas = ["DE", "LA", "LAS", "LOS", "MAC", "VON", "VAN", "Y", "DEL"]
    for p in partes:
        if p not in ignoradas:
            return p[0]
    return texto[0] if texto else ""

def limpiar_nombre_basura(texto):
    if not texto or texto == "No detectado":
        return "No detectado"
        
    res = texto.upper()
    res = res.replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U")
    
    palabras_preliminares = res.split()
    palabras_sin_numeros = [p for p in palabras_preliminares if not any(c.isdigit() for c in p)]
    res = " ".join(palabras_sin_numeros)
    
    basura_legal = [
        "CIVIL CERTIFICO Y HAGO CONSTAR QUE EN LOS ARCHIVOS QUE OBRAN EN",
        "ESTA OFICIALIA DEL REGISTRO CIVIL SE ENCUENTRA ASENTADA UN ACTA DE",
        "NACIMIENTO EN LA CUAL SE CONTIENEN ENTRE OTROS LOS SIGUIENTES DATOS",
        "EN NOMBRE DEL ESTADO LIBRE Y SOBERANO DE SINALOA Y COMO OFICIAL DEL",
        "REGISTRO CIVIL SE EXPIDE LA PRESENTE CERTIFICACION",
        "EL C OFICIAL DEL REGISTRO CIVIL", "DOY FE",
        "DATOS DE LA PERSONA REGISTRADA", "DATOS DE FILIACION", "COPIA CERTIFICADA"
    ]
    
    for b in basura_legal:
        res = res.replace(b, " ")

    res = re.sub(r'[^A-ZÑ\s]', ' ', res)
    
    basura = [
        "ESTADOS UNIDOS MEXICANOS", "ESTADOS", "UNIDOS", "MEXICANOS",
        "MEXICA VICANOS", "MEXICAVICANOS", "GOBIERNO DE MEXICO", "GOBIERNO", "REPUBLICA",
        "SECRETARIA DE GOBERNACION", "SECRETARIA", "GOBERNACION",
        "PRIMER APELLIDO", "SEGUNDO APELLIDO", "NOMBRE S", "NOMBRES", "APELLIDOS", 
        "NOMBRE", "MUESTRA", "CLAVE UNICA", "REGISTRO DE POBLACION", "CURP",
        "SURNAMES", "GIVEN NAMES", "SURNAME", "GIVEN", "NAMES", "PASAPORTE", "PASSPORT",
        "NACIONALIDAD", "NATIONALITY", "SEXO H", "SEXO M", "SEXOH", "SEXOM", "SEXO", "SEX", 
        "FECHA", "DATE", "LUGAR", "PLACE", "TIPO", "TYPE", "CLAVE", "CODE", "AUTHORITY", 
        "DE NACIMIENTO", "OF BIRTH", "SUMAME", "ELECCIONES", "FEDERALES", "LOCALES", 
        "INSTITUTO", "NACIONAL", "ELECTORAL", "INE", "CREDENCIAL", "PARA", "VOTAR", 
        "EMISION", "VIGENCIA", "REGISTRO", "KEKERADRRHAGIAS", "OS UNIDOS", "SOY MEXICO",
        "MEXICO", "CONSTANCIA", "ENTIDAD", "DOMICILIO", "INF", "SINALOA", "ESTADO",
        "NOMORES", "NOMORE", "NOBRES", "PERSONA REGISTRADA", 
        "FILIACION", "OFICIALIA", "LIBRO", "ACTA", "NUMERO DE ACTA", 
        "FECHA DE REGISTRO", "CERTIFICADO DE NACIMIENTO", "IDENTIFICADOR ELECTRONICO", 
        "HOMBRE", "MUJER", "MASCULINO", "FEMENINO", "MUNICIPIO", "ENTIDAD", "CODIGO QR",
        "CODIGO DE VERIFICACION", "FIRMA ELECTRONICA", "AVANZADA", "DIRECTORA GENERAL",
        "SECRETARIA DE GOBIERNO", "FUNDAMENTO", "ARTICULOS", 
        "FRACCIONES", "REGLAMENTO", "CIVIL", "MORELOS", "CUAUTLA", "POBLACION", 
        "IDENTIFICADOR", "ELECTRONICO"
    ]
    
    for b in basura:
        res = re.sub(rf'\b{b}\b', ' ', res)
        
    res = re.sub(r'\s+', ' ', res).strip()
    
    palabras = res.split()
    palabras_limpias = [p for p in palabras if len(p) > 1 or p in ['Y', 'M', 'J']]
    res = " ".join(palabras_limpias)
    
    return res if len(res) > 3 else "No detectado"

def determinar_tipo_documento(texto_up):
    if "ACTA DE NACIMIENTO" in texto_up or "ESTADO LIBRE Y SOBERANO" in texto_up:
        return "ACTA DE NACIMIENTO"
    elif "INSTITUTO NACIONAL ELECTORAL" in texto_up or "CREDENCIAL PARA VOTAR" in texto_up or "ELECCIONES FEDERALES" in texto_up:
        return "INE"
    elif "PASAPORTE" in texto_up or "PASSPORT" in texto_up or "SURNAMES" in texto_up:
        return "PASAPORTE"
    elif "CLAVE UNICA DE REGISTRO DE POBLACION" in texto_up.replace("Ú", "U").replace("Ó", "O") or "REGISTRO NACIONAL" in texto_up or "CURP" in texto_up:
        return "CURP"
    else:
        return "DOCUMENTO NO RECONOCIDO"

def extraccion_misma_linea_o_arriba(lineas, i, etiquetas):
    l_up = lineas[i].upper().strip()
    parte = l_up
    for et in etiquetas:
        parte = parte.replace(et, "")
    cand = limpiar_nombre_basura(parte)
    if cand != "No detectado":
        return cand
        
    for j in range(1, 3):
        if i - j >= 0:
            cand = limpiar_nombre_basura(lineas[i-j])
            if cand != "No detectado":
                return cand
    return ""

def extraer_datos_por_tipo(lineas, tipo_doc, curp_original, texto_up):
    datos = {"nombre": "No detectado"}
    texto_lineal = texto_up.replace("\n", " ")
    texto_limpio_curp = texto_up.replace(" ", "").replace("\n", "").upper()
    
    if tipo_doc == "ACTA DE NACIMIENTO":
        nombres_encontrados = []
        primeros_apellidos = []
        segundos_apellidos = []
        
        for i, linea in enumerate(lineas):
            l_up = linea.upper().strip()
            
            if any(x in l_up for x in ["NOMBRE(S)", "NOMBRE S", "NOMBRES"]):
                cand = extraccion_misma_linea_o_arriba(lineas, i, ["NOMBRE(S)", "NOMBRE S", "NOMBRES"])
                if cand: nombres_encontrados.append(cand)
                
            elif "PRIMER APELLIDO" in l_up:
                cand = extraccion_misma_linea_o_arriba(lineas, i, ["PRIMER APELLIDO"])
                if cand: primeros_apellidos.append(cand)
                
            elif "SEGUNDO APELLIDO" in l_up:
                cand = extraccion_misma_linea_o_arriba(lineas, i, ["SEGUNDO APELLIDO"])
                if cand: segundos_apellidos.append(cand)

        nombres = nombres_encontrados[0] if nombres_encontrados else ""
        ap1 = ""
        ap2 = ""
        
        if curp_original != "No detectado" and len(curp_original) >= 4:
            letra_ap1 = curp_original[0]
            letra_ap2 = curp_original[2]
            
            for cand in primeros_apellidos:
                if inicial_curp(cand) == letra_ap1:
                    ap1 = cand
                    break
            
            todos_aps = primeros_apellidos + segundos_apellidos
            for cand in todos_aps:
                if inicial_curp(cand) == letra_ap2 and cand != ap1:
                    ap2 = cand
                    break
                    
        if not ap1 and primeros_apellidos:
            ap1 = primeros_apellidos[0]
        if not ap2 and segundos_apellidos:
            ap2 = segundos_apellidos[0]
            
        candidato_federal = f"{nombres} {ap1} {ap2}".strip()
        candidato_limpio = limpiar_nombre_basura(candidato_federal)
        
        if len(candidato_limpio.split()) >= 2 and candidato_limpio != "No detectado":
            datos["nombre"] = candidato_limpio
            return datos

        match_bloque = re.search(r'NOMBRE\s*:(.*?)FECHA\s*DE\s*NACIMIENTO', texto_up, re.DOTALL)
        if match_bloque:
            contenido_nombre = match_bloque.group(1).strip()
            nombre_sucio = contenido_nombre.replace("\n", " ")
            datos["nombre"] = limpiar_nombre_basura(nombre_sucio)
            if datos["nombre"] != "No detectado":
                return datos
                
        curp_match = re.search(r'[A-Z]{4}[0-9O]{6}[HMI][A-Z]{5}[A-Z0-9][0-9O]', texto_limpio_curp)
        if curp_match:
            curp_str = curp_match.group(0)
            for i, linea in enumerate(lineas):
                if curp_str in linea.replace(" ", ""):
                    candidatos = []
                    for j in range(-3, 4):
                        if 0 <= i + j < len(lineas) and j != 0:
                            cand = limpiar_nombre_basura(lineas[i+j])
                            if cand != "No detectado" and len(cand.split()) >= 2:
                                candidatos.append(cand)
                    if candidatos:
                        datos["nombre"] = max(candidatos, key=len)
                        return datos

    if tipo_doc == "PASAPORTE":
        mrz_pasaporte = re.search(r'P<MEX([A-ZÑ<]+)<<([A-ZÑ<]+)', texto_lineal.replace(" ", ""))
        if mrz_pasaporte:
            ap = mrz_pasaporte.group(1).replace("<", " ").strip()
            nom = mrz_pasaporte.group(2).replace("<", " ").strip()
            datos["nombre"] = limpiar_nombre_basura(f"{ap} {nom}")
            if datos["nombre"] != "No detectado": 
                return datos
        
        apellidos, nombres = "", ""
        for i, linea in enumerate(lineas):
            l_up = linea.upper()
            if ("APELLIDO" in l_up or "SURNAME" in l_up or "SUMAME" in l_up) and i + 1 < len(lineas):
                apellidos = lineas[i+1]
            if ("NOMBRE" in l_up or "GIVEN" in l_up) and i + 1 < len(lineas):
                nombres = lineas[i+1]
        if apellidos or nombres:
            datos["nombre"] = limpiar_nombre_basura(f"{apellidos} {nombres}".strip())
            return datos

    if tipo_doc == "INE":
        matches_ine = re.findall(r'\b([A-ZÑ]{2,})[< ]+([A-ZÑ]{2,})<<([A-ZÑ<]{2,})', texto_lineal)
        for p, m, n in matches_ine:
            if "MEX" not in p and "ID" not in p:
                n_clean = n.replace("<", " ").strip()
                nomb_limpio = limpiar_nombre_basura(f"{p} {m} {n_clean}")
                if nomb_limpio != "No detectado":
                    datos["nombre"] = nomb_limpio
                    return datos

        nombres_lineas = []
        capturando = False
        for linea in lineas:
            l_up = linea.upper().replace("É", "E").replace("Í", "I").strip()
            if l_up in ["NOMBRE", "NOMBRE(S)", "NOMBRES"]:
                capturando = True
                continue
            if capturando:
                if any(stop in l_up for stop in ["DOMICILIO", "CLAVE", "EDAD", "FECHA", "CURP", "VIGENCIA"]):
                    break
                if "SEXO" in l_up:
                    parte_nombre = l_up.split("SEXO")[0].strip()
                    if parte_nombre and not any(c.islower() for c in linea[:len(parte_nombre)]):
                        nombres_lineas.append(parte_nombre)
                    continue
                if any(c.islower() for c in linea):
                    continue
                nombres_lineas.append(linea)
                
        if nombres_lineas:
            datos["nombre"] = limpiar_nombre_basura(" ".join(nombres_lineas))
            return datos
            
    for i, linea in enumerate(lineas):
        if "NOMBRE" in linea.upper():
            for j in range(1, 6):
                if i + j < len(lineas):
                    candidato = limpiar_nombre_basura(lineas[i+j])
                    if candidato != "No detectado" and len(candidato.split()) >= 2:
                        datos["nombre"] = candidato
                        return datos
                        
    if datos["nombre"] == "No detectado":
        for i, linea in enumerate(lineas):
            if re.search(r'[A-Z]{4}[0-9O]{6}[HMI][A-Z]{5}[A-Z0-9][0-9O]', linea.upper().replace(" ", "")):
                if i > 0:
                    cand_arriba = limpiar_nombre_basura(lineas[i-1])
                    if cand_arriba != "No detectado" and len(cand_arriba.split()) >= 2:
                        datos["nombre"] = cand_arriba
                        break
                if i + 2 < len(lineas):
                    cand_abajo = limpiar_nombre_basura(lineas[i+2])
                    if cand_abajo != "No detectado" and len(cand_abajo.split()) >= 2:
                        datos["nombre"] = cand_abajo
                        break

    if datos["nombre"] == "No detectado" or datos["nombre"] == "":
        datos["nombre"] = limpiar_nombre_basura(datos["nombre"])
        
    return datos

def procesar_texto(texto):
    lineas = [l.strip() for l in texto.split('\n') if l.strip()]
    texto_limpio = texto.replace(" ", "").replace("\n", "").upper()
    texto_up = texto.upper()
    
    tipo_doc = determinar_tipo_documento(texto_up)
    
    curp_match = re.search(r'[A-Z]{4}[0-9O]{6}[HMI][A-Z]{5}[A-Z0-9][0-9O]', texto_limpio)
    curp = curp_match.group(0) if curp_match else "No detectado"
    
    if curp != "No detectado":
        parte_num = curp[4:10].replace("O", "0").replace("I", "1")
        parte_final = curp[16:].replace("O", "0").replace("I", "1")
        curp = curp[:4] + parte_num + curp[10:16] + parte_final
    
    if tipo_doc == "DOCUMENTO NO RECONOCIDO" and curp != "No detectado":
        tipo_doc = "CURP"
        
    texto_sin_acentos = texto_up.replace("É", "E").replace("Á", "A").replace("Í", "I").replace("Ó", "O").replace("Ú", "U")
    nacionalidad = "MEXICANA" if "MEXIC" in texto_sin_acentos else "EXTRANJERA"
    
    edad = "No calculada"
    fecha_nac = "No detectada"
    
    fecha_match = re.search(r'FECHA DE NACIMIENTO[\s\n]*(\d{2})[/ \-](\d{2})[/ \-](\d{4})', texto_up)
    if fecha_match:
        fecha_nac = f"{fecha_match.group(1)}/{fecha_match.group(2)}/{fecha_match.group(3)}"
    else:
        fecha_match = re.search(r'\b(\d{2})[/ \-](\d{2})[/ \-](\d{4})\b', texto_up)
        if fecha_match:
            fecha_nac = f"{fecha_match.group(1)}/{fecha_match.group(2)}/{fecha_match.group(3)}"
        elif curp != "No detectado":
            _, fecha_nac = calcular_datos_curp(curp)
            
    if fecha_nac != "No detectada":
        try:
            partes = fecha_nac.split('/')
            dd, mm, aaaa = int(partes[0]), int(partes[1]), int(partes[2])
            hoy = datetime.now()
            edad = hoy.year - aaaa - ((hoy.month, hoy.day) < (mm, dd))
        except:
            if curp != "No detectado":
                edad, _ = calcular_datos_curp(curp)

    info_doc = extraer_datos_por_tipo(lineas, tipo_doc, curp, texto_up)
    estado = "MENOR DE EDAD" if isinstance(edad, int) and edad < 18 else "ADULTO"
    
    validacion_api = validar_verificamex(curp)
    
    return {
        "documento": tipo_doc,
        "nombre": info_doc['nombre'],
        "nacionalidad": nacionalidad,
        "curp": curp,
        "fecha_nac": fecha_nac,
        "edad": f"{edad} años" if isinstance(edad, int) else edad,
        "estado": estado,
        "validacion": validacion_api,
        "texto_crudo": texto
    }

def extraer_curp_de_texto(texto):
    texto_limpio = texto.replace(" ", "").replace("\n", "").upper()
    curp_match = re.search(r'[A-Z]{4}[0-9O]{6}[HMI][A-Z]{5}[A-Z0-9][0-9O]', texto_limpio)
    
    if curp_match:
        curp = curp_match.group(0)
    else:
        rescate = re.search(r'CURP.*?([A-Z0-9]{18})', texto_limpio)
        if rescate:
            curp = rescate.group(1)
        else:
            return "No detectado"
            
    parte_num = curp[4:10].replace("O", "0").replace("I", "1")
    parte_final = curp[16:].replace("O", "0").replace("I", "1")
    return curp[:4] + parte_num + curp[10:16] + parte_final

def comparar_documentos(datos_identidad, texto_formato):
    curp_id = datos_identidad.get("curp", "No detectado")
    curp_formato = extraer_curp_de_texto(texto_formato)
    
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
                logger.error(f"Error en el procesamiento OCR: {e}")
                datos = {"error": f"Error técnico: {str(e)}"}
                
    return render_template('index.html', datos=datos)

if __name__ == '__main__':
    app.run(debug=True, port=5001)