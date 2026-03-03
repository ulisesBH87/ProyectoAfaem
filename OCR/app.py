import os
import re
import base64
from flask import Flask, render_template, request
from google.cloud import vision
from datetime import datetime
import fitz

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "afaem-487315-9fef755ac1dc.json"

app = Flask(__name__)

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

def limpiar_nombre_basura(texto):
    if not texto or texto == "No detectado":
        return "No detectado"
        
    basura = [
        "ESTADOS UNIDOS MEXICANOS", "ESTADOS", "UNIDOS", "MEXICANOS",
        "MEXICA VICANOS", "MEXICAVICANOS", "GOBIERNO DE MEXICO", "GOBIERNO", "REPUBLICA",
        "SECRETARIA DE GOBERNACION", "SECRETARIA", "GOBERNACION",
        "PRIMER APELLIDO", "SEGUNDO APELLIDO", "NOMBRE(S)", "NOMBRES", "APELLIDOS", 
        "NOMBRE", "MUESTRA", "CLAVE UNICA", "REGISTRO DE POBLACION", "CURP",
        "SURNAMES", "GIVEN NAMES", "SURNAME", "GIVEN", "NAMES", "PASAPORTE", "PASSPORT",
        "NACIONALIDAD", "NATIONALITY", "SEXO H", "SEXO M", "SEXOH", "SEXOM", "SEXO", "SEX", 
        "FECHA", "DATE", "LUGAR", "PLACE", "TIPO", "TYPE", "CLAVE", "CODE", "AUTHORITY", 
        "DE NACIMIENTO", "OF BIRTH", "SUMAME", "ELECCIONES", "FEDERALES", "LOCALES", 
        "INSTITUTO", "NACIONAL", "ELECTORAL", "INE", "CREDENCIAL", "PARA", "VOTAR", 
        "EMISION", "VIGENCIA", "REGISTRO", "KEKERADRRHAGIAS", "OS UNIDOS", "SOY MEXICO",
        "MEXICO", "CONSTANCIA", "ENTIDAD"
    ]
    res = texto.upper()
    for b in basura:
        res = res.replace(b, " ")
        
    res = re.sub(r'[^A-ZÑ\s]', '', res)
    
    palabras = res.split()
    palabras_limpias = [p for p in palabras if len(p) <= 13]
    res = " ".join(palabras_limpias)
    
    return res if len(res) > 3 else "No detectado"

def determinar_tipo_documento(texto_up):
    if "INSTITUTO NACIONAL ELECTORAL" in texto_up or "CREDENCIAL PARA VOTAR" in texto_up or "ELECCIONES FEDERALES" in texto_up:
        return "INE"
    elif "PASAPORTE" in texto_up or "PASSPORT" in texto_up or "SURNAMES" in texto_up:
        return "PASAPORTE"
    elif "CLAVE UNICA DE REGISTRO DE POBLACION" in texto_up.replace("Ú", "U").replace("Ó", "O") or "REGISTRO NACIONAL" in texto_up:
        return "CURP"
    elif "ACTA DE NACIMIENTO" in texto_up:
        return "ACTA DE NACIMIENTO"
    else:
        return "DOCUMENTO NO RECONOCIDO"

def extraer_datos_por_tipo(lineas, tipo_doc, curp_original, texto_up):
    datos = {"nombre": "No detectado"}
    
    texto_lineal = texto_up.replace("\n", " ")
    
    mrz_pasaporte = re.search(r'P<MEX([A-ZÑ<]+)<<([A-ZÑ<]+)', texto_lineal.replace(" ", ""))
    if mrz_pasaporte:
        ap = mrz_pasaporte.group(1).replace("<", " ").strip()
        nom = mrz_pasaporte.group(2).replace("<", " ").strip()
        datos["nombre"] = limpiar_nombre_basura(f"{ap} {nom}")
        if datos["nombre"] != "No detectado": return datos

    matches_ine = re.findall(r'\b([A-ZÑ]{2,})[< ]+([A-ZÑ]{2,})<<([A-ZÑ<]{2,})', texto_lineal)
    for p, m, n in matches_ine:
        if "MEX" not in p and "ID" not in p:
            n_clean = n.replace("<", " ").strip()
            nomb_limpio = limpiar_nombre_basura(f"{p} {m} {n_clean}")
            if nomb_limpio != "No detectado":
                datos["nombre"] = nomb_limpio
                return datos

    if tipo_doc == "INE":
        texto_unido = " ".join(lineas).upper()
        if "NOMBRE" in texto_unido:
            inicio = texto_unido.find("NOMBRE") + 6
            stop_words = ["DOMICILIO", "CLAVE DE ELECTOR", "EDAD", "FECHA DE NACIMIENTO", "CURP"]
            fin = len(texto_unido)
            for w in stop_words:
                pos = texto_unido.find(w, inicio)
                if pos != -1 and pos < fin:
                    fin = pos
            
            texto_medio = texto_unido[inicio:fin]
            datos["nombre"] = limpiar_nombre_basura(texto_medio)
            
    elif tipo_doc == "PASAPORTE":
        apellidos = ""
        nombres = ""
        for i, linea in enumerate(lineas):
            l_up = linea.upper()
            if ("APELLIDO" in l_up or "SURNAME" in l_up or "SUMAME" in l_up) and i + 1 < len(lineas):
                apellidos = lineas[i+1]
            if ("NOMBRE" in l_up or "GIVEN" in l_up) and i + 1 < len(lineas):
                nombres = lineas[i+1]
        
        if apellidos or nombres:
            datos["nombre"] = f"{apellidos} {nombres}".strip()
            
    elif tipo_doc == "CURP" or tipo_doc == "ACTA DE NACIMIENTO":
        for i, linea in enumerate(lineas):
            if "NOMBRE" in linea.upper():
                for j in range(1, 6):
                    if i + j < len(lineas):
                        candidato = limpiar_nombre_basura(lineas[i+j])
                        if candidato != "No detectado" and len(candidato.split()) >= 2:
                            datos["nombre"] = candidato
                            break
                if datos["nombre"] != "No detectado":
                    break
                    
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
    
    edad, fecha_nac = calcular_datos_curp(curp) if curp != "No detectado" else ("No calculada", "No detectada")
    
    if fecha_nac == "No detectada":
        fecha_match = re.search(r'\b(\d{2})[/ \-](\d{2})[/ \-](\d{4})\b', texto_up)
        if fecha_match:
            fecha_nac = f"{fecha_match.group(1)}/{fecha_match.group(2)}/{fecha_match.group(3)}"
            try:
                anio = int(fecha_match.group(3))
                edad = datetime.now().year - anio
            except:
                pass

    info_doc = extraer_datos_por_tipo(lineas, tipo_doc, curp, texto_up)
    estado = "MENOR DE EDAD" if isinstance(edad, int) and edad < 18 else "ADULTO"
    
    return {
        "documento": tipo_doc,
        "nombre": info_doc['nombre'],
        "nacionalidad": "MEXICANA" if "MEXIC" in texto_up else "EXTRANJERA",
        "curp": curp,
        "fecha_nac": fecha_nac,
        "edad": f"{edad} años" if isinstance(edad, int) else edad,
        "estado": estado,
        "texto_crudo": texto
    }

@app.route('/', methods=['GET', 'POST'])
def index():
    datos = None
    if request.method == 'POST':
        archivo = request.files['file']
        if archivo:
            try:
                filename = archivo.filename.lower()
                content = archivo.read()
                
                if filename.endswith('.pdf'):
                    doc = fitz.open(stream=content, filetype="pdf")
                    page = doc.load_page(0) 
                    pix = page.get_pixmap(dpi=200) 
                    image_content = pix.tobytes("png")
                else:
                    image_content = content

                img_b64 = base64.b64encode(image_content).decode('utf-8')

                client = vision.ImageAnnotatorClient()
                image = vision.Image(content=image_content)
                response = client.document_text_detection(image=image)
                
                if response.text_annotations:
                    texto_full = response.text_annotations[0].description
                    datos = procesar_texto(texto_full)
                    datos['imagen_b64'] = img_b64
                else:
                    datos = {"error": "No se pudo leer ningún texto del documento."}
            except Exception as e:
                datos = {"error": f"Error técnico: {str(e)}"}
                
    return render_template('index.html', datos=datos)

if __name__ == '__main__':
    app.run(debug=True, port=5000)