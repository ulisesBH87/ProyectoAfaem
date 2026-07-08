import { parsearTelefonoE164 } from './preRegistroUtils';

export const mejorarExtraccionActa = (rawText, currentData) => {
  if (!rawText) return currentData;
  const data = { ...currentData };

  // Intentar emparejar layout cruzado/macho en una sola línea
  const cleanText = rawText.replace(/\s+/g, ' ').toUpperCase();
  const mashedMatch = cleanText.match(/DATOS\s+DEL\s+REGISTRADO\s+([A-Z0-9\s]+?)\s+NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)(?:$|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO))/i);
  if (mashedMatch) {
    const nombresVal = mashedMatch[1].trim();
    const ap1Val = mashedMatch[2].trim();
    const ap2Val = mashedMatch[3].trim();

    data.nombre = `${nombresVal} ${ap1Val} ${ap2Val}`.replace(/\s+/g, ' ').toUpperCase();
    data.nombres = nombresVal.toUpperCase();
    data.apellido_paterno = ap1Val.toUpperCase();
    data.apellido_materno = ap2Val.toUpperCase();
    data.nombreSolo = nombresVal.toUpperCase();
    data.primerApellido = ap1Val.toUpperCase();
    data.segundoApellido = ap2Val.toUpperCase();

    const rest = mashedMatch[4].trim();
    if (rest && !rest.includes('NACIONALIDAD') && rest.length > 2) {
      data.nacionalidad = rest.toUpperCase();
    } else if (cleanText.includes('NACIONALIDAD')) {
      const nacMatch = cleanText.match(/(?:NACIONALIDAD|PAIS)\s+([A-Z\s]+)/i);
      if (nacMatch) data.nacionalidad = nacMatch[1].trim().toUpperCase();
    }
    return data;
  }

  // 1. RESCATE DE NOMBRE (Especialmente para actas digitales mexicanas)
  // Buscamos patrones de etiquetas seguidas de valores en líneas subsecuentes
  const firstWord = data.nombre ? data.nombre.split(' ')[0] : '';
  if (!data.nombre || data.nombre === 'No detectado' || data.nombre.split(' ').length < 2 || firstWord.length <= 1) {
    // Intento 1: Formato "Nombre(s) \n VALOR \n Primer Apellido \n VALOR ..."
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    let nombres = '', ap1 = '', ap2 = '';

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].toUpperCase();
      if (l.includes('NOMBRE(S)') && i + 1 < lines.length) {
        const nextVal = lines[i + 1].toUpperCase();
        if ((nextVal === 'S' || nextVal === '(S)' || nextVal.length <= 1) && i + 2 < lines.length) {
          nombres = lines[i + 2];
        } else {
          nombres = lines[i + 1];
        }
      }
      if (l.includes('PRIMER APELLIDO') && i + 1 < lines.length) {
        const val = lines[i + 1];
        if (!val.toUpperCase().includes('APELLIDO') && !val.toUpperCase().includes('NOMBRE')) {
          ap1 = val;
        }
      }
      if (l.includes('SEGUNDO APELLIDO') && i + 1 < lines.length) {
        const val = lines[i + 1];
        if (!val.toUpperCase().includes('APELLIDO') && !val.toUpperCase().includes('NOMBRE')) {
          ap2 = val;
        }
      }
    }

    if (nombres && ap1) {
      data.nombre = `${nombres} ${ap1} ${ap2}`.replace(/\s+/g, ' ').toUpperCase();
      data.nombres = nombres.toUpperCase();
      data.apellido_paterno = ap1.toUpperCase();
      data.apellido_materno = ap2.toUpperCase();
      data.nombreSolo = nombres.toUpperCase();
      data.primerApellido = ap1.toUpperCase();
      data.segundoApellido = ap2.toUpperCase();
    }
  }

  // 2. RESCATE DE FECHA DE NACIMIENTO (Soporte para formatos de texto: "15 de Mayo de 1990")
  if (!data.fecha_nac || data.fecha_nac === 'No detectada') {
    const meses = {
      'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04', 'MAYO': '05', 'JUNIO': '06',
      'JULIO': '07', 'AGOSTO': '08', 'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
    };

    const regexFechaTexto = /(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i;
    const matchFecha = rawText.match(regexFechaTexto);

    if (matchFecha) {
      const dia = matchFecha[1].padStart(2, '0');
      const mesNombre = matchFecha[2].toUpperCase();
      const anio = matchFecha[3];

      if (meses[mesNombre]) {
        data.fecha_nac = `${dia}/${meses[mesNombre]}/${anio}`;

        // Intentar recalcular edad
        try {
          const hoy = new Date();
          const d = parseInt(dia), m = parseInt(meses[mesNombre]), a = parseInt(anio);
          let edad = hoy.getFullYear() - a;
          if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
          data.edad = `${edad} años`;
        } catch (e) { }
      }
    }
  }

  return data;
};

export const procesarOCRReal = async (docKey, file, prevDoc, { API_BASE, Swal, setOcrResults, setCodigoPais, setDocuments }) => {
  Swal.fire({
    title: 'Analizando Documento...',
    html: 'Extrayendo información. <b>Por favor espere.</b>',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const formData = new FormData();
    formData.append('file_id', file);
    const token = localStorage.getItem('token') || sessionStorage.getItem('temp_token');
    const response = await fetch(`${API_BASE}/documentos/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('Ocurrió un error al cargar el documento');

    // Parsea el HTML del OCR para extraer los datos
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const cleanVal = (val) => {
      if (!val) return '';
      const cleaned = val.trim();
      const lower = cleaned.toLowerCase();
      if (lower === 'no detectado' || lower === 'no detectada' || lower === 'sin anotaciones' || lower === 'vacio') {
        return '';
      }
      return cleaned;
    };

    let nombreEncontrado = '';
    let nombresEncontrados = '';
    let apellidoPaternoEncontrado = '';
    let apellidoMaternoEncontrado = '';
    let curpEncontrada = '';
    let fechaNacEncontrada = '';
    let nacionalidadEncontrada = '';
    let edadEncontrada = '';
    let sexoEncontrado = '';
    let documentoEncontrado = '';

    const rows = doc.querySelectorAll('.dato-fila');
    rows.forEach(row => {
      const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
      const value = cleanVal(row.querySelector('.valor')?.textContent);

      if (!value) return;

      if (label.includes('nombres')) {
        nombresEncontrados = value;
      } else if (label.includes('nombre completo') || label === 'nombre') {
        nombreEncontrado = value;
      } else if (label.includes('nombre')) {
        if (!nombresEncontrados) nombresEncontrados = value;
      }

      if (label.includes('apellido paterno') || label.includes('paterno')) {
        apellidoPaternoEncontrado = value;
      }
      if (label.includes('apellido materno') || label.includes('materno')) {
        apellidoMaternoEncontrado = value;
      }

      if (label.includes('curp')) curpEncontrada = value;
      if (label.includes('nacionalidad')) nacionalidadEncontrada = value;

      if (label.includes('fecha de nacimiento') || label.includes('fecha nac') || (label.includes('nacimiento') && !label.includes('lugar'))) {
        let dateVal = value;
        if (dateVal.includes('-')) {
          const p = dateVal.split('-');
          if (p.length === 3 && p[0].length === 4) {
            dateVal = `${p[2]}/${p[1]}/${p[0]}`;
          }
        }
        fechaNacEncontrada = dateVal;
      }

      if (label.includes('edad')) edadEncontrada = value;
      if (label.includes('sexo')) sexoEncontrado = value;
      if (label.includes('documento')) documentoEncontrado = value;
    });

    let firstName = '', lastNamePaterno = '', lastNameMaterno = '';

    if (nombresEncontrados || apellidoPaternoEncontrado || apellidoMaternoEncontrado) {
      firstName = nombresEncontrados;
      lastNamePaterno = apellidoPaternoEncontrado;
      lastNameMaterno = apellidoMaternoEncontrado;
    } else if (nombreEncontrado) {
      const parts = nombreEncontrado.split(' ');
      if (parts.length === 4) {
        firstName = parts.slice(0, 2).join(' ');
        lastNamePaterno = parts[2];
        lastNameMaterno = parts[3];
      } else if (parts.length === 3) {
        firstName = parts[0];
        lastNamePaterno = parts[1];
        lastNameMaterno = parts[2];
      } else if (parts.length === 2) {
        firstName = parts[0];
        lastNamePaterno = parts[1];
      } else {
        firstName = nombreEncontrado;
      }
    }

    const fullNombre = [firstName, lastNamePaterno, lastNameMaterno].filter(Boolean).join(' ') || nombreEncontrado;

    let detectedSexo = sexoEncontrado;
    if (curpEncontrada && curpEncontrada.length >= 11) {
      const char = curpEncontrada.charAt(10).toUpperCase();
      if (char === 'M') detectedSexo = 'FEMENINO';
      else if (char === 'H') detectedSexo = 'MASCULINO';
    }

    let extractedData = {
      curp: curpEncontrada || '',
      nombre: fullNombre || '',
      nombres: firstName || '',
      apellido_paterno: lastNamePaterno || '',
      apellido_materno: lastNameMaterno || '',
      nombreSolo: firstName || '',
      primerApellido: lastNamePaterno || '',
      segundoApellido: lastNameMaterno || '',
      nacionalidad: nacionalidadEncontrada || '',
      fecha_nac: fechaNacEncontrada || '',
      edad: edadEncontrada || '',
      sexo: detectedSexo || '',
      documento: documentoEncontrado || ''
    };

    // --- REFUERZO DESDE EL FRONTEND (RESCATE DE TEXTO CRUDO) ---
    const rawText = doc.querySelector('pre')?.textContent;
    if (rawText && (docKey === 'actaNacimiento' || extractedData.documento?.includes('ACTA'))) {
      extractedData = mejorarExtraccionActa(rawText, extractedData);
    }

    // VALIDACIÓN DE COINCIDENCIA DE TIPO DE DOCUMENTO
    const isActaField = ['acta', 'actaNacimiento'].includes(docKey);
    const isIneField = ['ine', 'ineTutor', 'identificacion'].includes(docKey);
    const isOcrActa = (extractedData.documento || '').toUpperCase() === 'ACTA DE NACIMIENTO';
    const isOcrIne = (extractedData.documento || '').toUpperCase() === 'INE';

    if ((isActaField && isOcrIne) || (isIneField && isOcrActa)) {
      Swal.close();
      const result = await Swal.fire({
        title: 'Este documento no parece ser el que se solicita. ¿Deseas cargarlo de todos modos?',
        text: 'Si el documento no es el correcto, podría ser rechazado durante la validación.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Cargar de todos modos',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1a3b5c',
        cancelButtonColor: '#cbd5e1'
      });

      if (!result.isConfirmed) {
        setDocuments(prev => {
          const updated = { ...prev };
          if (prevDoc) {
            updated[docKey] = prevDoc;
          } else {
            delete updated[docKey];
          }
          return updated;
        });
        return;
      }
    }

    setOcrResults(prev => {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const uInfo = u.usuario || {};
      const regNombre = (uInfo.nombre || u.Nombre || u.NombreUsuario || '').toUpperCase();
      const regTelefono = uInfo.telefono || u.telefono || u.NumeroTelefono || '';
      const { codigoPais: parsedCodigo, telefono: parsedLocal } = parsearTelefonoE164(regTelefono || extractedData.telefono);

      if (parsedCodigo && parsedCodigo !== '+52') {
        setCodigoPais(parsedCodigo);
      }

      return {
        ...prev,
        ...extractedData,
        nombre: regNombre || prev.nombre || (extractedData.nombre || '').toUpperCase(),
        telefono: parsedLocal || prev.telefono || '',
        [docKey]: `OCR Procesado: ${extractedData.nombre}`
      };
    });

    if (extractedData.nombre) {
      Swal.fire({
        title: '¡Lectura Exitosa!',
        text: `Se detectó a: ${extractedData.nombre}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        title: '¡Lectura Exitosa!',
        text: 'Algunos campos no pudieron ser detectados, ingrésalos manualmente',
        icon: 'warning',
        timer: 3500,
        showConfirmButton: true
      });
    }

  } catch (err) {
    Swal.fire({
      title: 'Error',
      text: 'No se pudo leer el documento de forma automática pero podrás continuar de forma manual.',
      icon: 'warning'
    });
  }
};
