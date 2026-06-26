import os
import re
import cv2
import numpy as np
import customtkinter as ctk
from tkinter import filedialog
from google.cloud import vision
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not credentials_path:
    credentials_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "afaem-500220-6c43ed3c7e1f.json")
elif not os.path.isabs(credentials_path):
    credentials_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), credentials_path)
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

class AppOCR(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Sistema AFAEM - Registro Universal")
        self.geometry("750x700")
        ctk.set_appearance_mode("dark")

        self.label_titulo = ctk.CTkLabel(self, text="Procesador de Documentos AFAEM", font=("Roboto", 24, "bold"))
        self.label_titulo.pack(pady=20)

        self.btn_seleccionar = ctk.CTkButton(self, text="Escanear Documento", command=self.procesar_imagen, height=40)
        self.btn_seleccionar.pack(pady=10)

        self.tabview = ctk.CTkTabview(self, width=700, height=500)
        self.tabview.pack(pady=10, padx=20)
        
        self.tab_interes = self.tabview.add("Datos de Interés")
        self.tab_obtenidos = self.tabview.add("Datos Obtenidos")

        self.txt_interes = ctk.CTkTextbox(self.tab_interes, width=650, height=450, font=("Consolas", 15))
        self.txt_interes.pack(padx=10, pady=10)

        self.txt_obtenidos = ctk.CTkTextbox(self.tab_obtenidos, width=650, height=450, font=("Consolas", 12))
        self.txt_obtenidos.pack(padx=10, pady=10)

    def calcular_datos_curp(self, curp):
        try:
            aa = int(curp[4:6])
            mm = int(curp[6:8])
            dd = int(curp[8:10])
            anio = 2000 + aa if aa < 26 else 1900 + aa
            fecha_nac = datetime(anio, mm, dd)
            hoy = datetime.now()
            edad = hoy.year - anio - ((hoy.month, hoy.day) < (mm, dd))
            return edad, fecha_nac.strftime("%d/%m/%Y")
        except:
            return "No calculada", "No detectada"

    def extraer_logica_ine(self, lineas):
        datos = {"nombre": "No detectado", "domicilio": "No detectado", "nacionalidad": "MEXICANA"}
        for i, linea in enumerate(lineas):
            l_up = linea.upper()
            if "NOMBRE" in l_up and i + 3 < len(lineas):
                datos["nombre"] = f"{lineas[i+1]} {lineas[i+2]} {lineas[i+3]}".strip()
            if "DOMICILIO" in l_up and i + 3 < len(lineas):
                datos["domicilio"] = f"{lineas[i+1]} {lineas[i+2]} {lineas[i+3]}".strip()
        return datos

    def mejorar_busqueda(self, texto):
        lineas = [l.strip() for l in texto.split('\n') if l.strip()]
        texto_limpio = texto.replace(" ", "").upper()
        
        curp_match = re.search(r'[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d', texto_limpio)
        curp = curp_match.group(0) if curp_match else "No detectado"
        
        edad, fecha_nac = self.calcular_datos_curp(curp) if curp != "No detectado" else ("No calculada", "No detectada")
        
        es_pasaporte = "PASAPORTE" in texto.upper() or "PASSPORT" in texto.upper()
        info_doc = self.extraer_logica_ine(lineas)
        
        estado = "MENOR DE EDAD" if isinstance(edad, int) and edad < 18 else "ADULTO"
        
        res = f"--- RESULTADOS DE ESCANEO AFAEM ---\n\n"
        res += f"DOCUMENTO:    {'PASAPORTE' if es_pasaporte else 'INE / CURP'}\n"
        res += f"NOMBRE:       {info_doc['nombre']}\n"
        res += f"NACIONALIDAD: {info_doc['nacionalidad']}\n"
        res += f"CURP:         {curp}\n"
        res += f"FECHA NAC:    {fecha_nac}\n"
        res += f"EDAD:         {edad} años\n"
        res += f"ESTADO:       {estado}\n"
        res += f"DOMICILIO:    {info_doc['domicilio']}\n"
        return res

    def procesar_imagen(self):
        ruta = filedialog.askopenfilename()
        if not ruta: return

        try:
            client = vision.ImageAnnotatorClient()
            with open(ruta, "rb") as f:
                content = f.read()
            
            # Preprocesar imagen (Separación de Canales de Color - Canal Verde + División de Fondo)
            try:
                nparr = np.frombuffer(content, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is not None:
                    b, g, r = cv2.split(img)
                    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 21))
                    background = cv2.morphologyEx(g, cv2.MORPH_DILATE, kernel)
                    normalized = cv2.divide(g, background, scale=255)
                    _, thresh = cv2.threshold(normalized, 180, 255, cv2.THRESH_BINARY)
                    _, encoded_img = cv2.imencode(".png", thresh)
                    content = encoded_img.tobytes()
            except Exception as pe:
                print(f"[ERROR PREPROCESAMIENTO] {pe}")
            
            image = vision.Image(content=content)
            response = client.document_text_detection(image=image)
            texto_full = response.text_annotations[0].description
            
            self.txt_obtenidos.delete("1.0", "end")
            self.txt_obtenidos.insert("0.0", texto_full)
            
            self.txt_interes.delete("1.0", "end")
            self.txt_interes.insert("0.0", self.mejorar_busqueda(texto_full))
            self.tabview.set("Datos de Interés")
        except Exception as e:
            self.txt_interes.insert("0.0", f"Error: {e}")

if __name__ == "__main__":
    app = AppOCR()
    app.mainloop()