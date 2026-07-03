import os
import sys
from app import ejecutar_tesseract_ocr, procesar_texto

def test_ocr():
    tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(tesseract_path):
        os.environ["TESSERACT_CMD"] = tesseract_path
        print(f"[TEST] Usando Tesseract desde: {tesseract_path}")
    else:
        print("[TEST] Tesseract no encontrado en C:\\Program Files\\Tesseract-OCR. Se usará el PATH del sistema.")

    test_file_path = os.path.join("..", "backend", "Formato de afiliación - Presidente - v2026.pdf")
    if not os.path.exists(test_file_path):
        test_file_path = os.path.join("d:\\ClonedRepos\\ProyectoAfaem\\backend", "Formato de afiliación - Presidente - v2026.pdf")

    if not os.path.exists(test_file_path):
        print(f"[ERROR] No se encontró el archivo de prueba en: {test_file_path}")
        sys.exit(1)

    print(f"[TEST] Leyendo archivo de prueba: {test_file_path}")
    with open(test_file_path, "rb") as f:
        content = f.read()

    print("[TEST] Ejecutando OCR local (Tesseract)...")
    texto, img_b64, response, datos = ejecutar_tesseract_ocr(os.path.basename(test_file_path), content)

    print(f"\n[TEST] === TEXTO CRUDO EXTRAÍDO ({len(texto) if texto else 0} caracteres) ===")
    print(texto[:1500] if texto else "Ningún texto extraído")
    print("===================================================\n")

    if not datos and texto:
        print("[TEST] Documento no es acta, ejecutando procesar_texto...")
        datos = procesar_texto(texto, response)

    if not datos:
        print("[ERROR] No se retornaron datos procesados.")
        sys.exit(1)

    print("\n[TEST] === RESULTADO DE LA EXTRACCIÓN ===")
    print(f"Documento detectado: {datos.get('documento')}")
    print(f"Nombre Completo:     {datos.get('nombre_completo')}")
    print(f"CURP:                {datos.get('curp')}")
    print(f"Fecha Nacimiento:    {datos.get('fecha_nac')}")
    print(f"Sexo:                {datos.get('sexo')}")
    print(f"Lugar Nacimiento:    {datos.get('lugar_nacimiento')}")
    print(f"Origen del Nombre:   {datos.get('origen')}")
    print("=========================================\n")
    print("[TEST] ¡Prueba completada con éxito!")

if __name__ == "__main__":
    test_ocr()
