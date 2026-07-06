# Servicio OCR Local (Offline)

Este servicio reemplaza a Google Cloud Vision API utilizando **Tesseract OCR** localmente, garantizando una ejecución 100% offline y gratuita.

## Requisitos Previos

1. **Instalar Tesseract OCR** en Windows:
   - Abra PowerShell o CMD como administrador y ejecute:
     ```powershell
     winget install UB-Mannheim.TesseractOCR --accept-package-agreements --accept-source-agreements
     ```
   - O bien, descargue e instale manualmente el ejecutable oficial de UB Mannheim:
     https://github.com/UB-Mannheim/tesseract/wiki

2. **Instalar el idioma Español (`spa.traineddata`)**:
   - Descargue [spa.traineddata (fast)](https://github.com/tesseract-ocr/tessdata_fast/raw/main/spa.traineddata) o [spa.traineddata (best)](https://github.com/tesseract-ocr/tessdata/raw/main/spa.traineddata).
   - Coloque el archivo descargado en el directorio de datos de Tesseract. Por defecto en Windows es:
     `C:\Program Files\Tesseract-OCR\tessdata\`

3. **Verificar la instalación**:
   - En una nueva terminal, compruebe que `tesseract` se puede ejecutar:
     ```bash
     tesseract --version
     tesseract --list-langs
     ```
   - Si no se reconoce el comando, añada `C:\Program Files\Tesseract-OCR` a sus Variables de Entorno del Sistema (`PATH`).

---

## Instrucciones de Ejecución

1. **Crear el Entorno Virtual**:
   ```bash
   python -m venv venv
   ```

2. **Activar el Entorno**:
   - En Windows (PowerShell):
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - En Windows (CMD):
     ```cmd
     .\venv\Scripts\activate.bat
     ```

3. **Instalar Dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configuración (`.env`)**:
   Cree un archivo `.env` en este directorio si desea cambiar el puerto o la ruta del ejecutable de Tesseract.
   ```env
   OCR_PORT=5001
   OCR_HOST=127.0.0.1
   # Opcional (si tesseract no está en el PATH):
   # TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   ```

5. **Iniciar el Servidor**:
   ```bash
   python app.py
   ```

---

## Cómo reconectar el OCR Local (Solución tras Merges o Conflictos)

Si tras un git merge o actualización el backend vuelve a intentar usar el OCR antiguo de Google o se desconecta el OCR local, siga estos sencillos pasos para reestablecer la conexión:

1. **Configurar el Backend (`backend/.env`)**:
   Abra el archivo `backend/.env` y asegúrese de tener configurada la URL del microservicio local:
   ```env
   OCR_URL=http://127.0.0.1:5001/
   ```
   *(Asegúrese también de eliminar o comentar cualquier línea `GOOGLE_APPLICATION_CREDENTIALS` o `GGOOGLE_...`).*

2. **Verificar la Ruta de Comunicación en el Código**:
   En el archivo `backend/app/rutas/documentos_ruta.py`, el servicio debe leer dinámicamente el `OCR_URL` configurado. Confirme que la línea 237 está configurada así:
   ```python
   ocr_url = os.getenv("OCR_URL", "http://127.0.0.1:5001/")
   ```

3. **Eliminar directorios heredados**:
   Si la carpeta obsoleta `OCR/` (que contenía las credenciales json antiguas de Google) volvió a aparecer tras el merge, elimínela para mantener limpio el entorno de desarrollo.

