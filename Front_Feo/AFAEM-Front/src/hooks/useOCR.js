import { useState } from 'react';
import Swal from 'sweetalert2';
import { API_BASE } from '../config/config';
import { toDDMMYYYY } from '../pages/Admin/RegistrarPresidente/constants';

/**
 * useOCR
 * Encapsula la lógica de extracción OCR: parseo del HTML de respuesta,
 * mejora de datos de acta y edición manual de campos.
 */
export function useOCR() {
  const [ocrResults, setOcrResults] = useState({});

  // ── Mejora específica para Acta de Nacimiento ────────────────────────────
  const mejorarActa = (rawText, data) => {
    if (!rawText) return data;
    const d = { ...data };

    // Cortar rawText para excluir todo lo que esté después de filiación y anotaciones
    const filiacionKeywords = ["FILIACION", "FILIACIÓN", "DATOS DE FILIACION", "DATOS DE FILIACIÓN", "DATOS DE LOS PADRES", "PADRES", "PROGENITORES", "ANOTACIONES MARGINALES"];
    let cutIdx = -1;
    const rawTextUpper = rawText.toUpperCase();
    for (const kw of filiacionKeywords) {
      const idx = rawTextUpper.indexOf(kw);
      if (idx !== -1 && (cutIdx === -1 || idx < cutIdx)) {
        cutIdx = idx;
      }
    }
    const rawTextCleaned = cutIdx !== -1 ? rawText.substring(0, cutIdx) : rawText;

    // Intentar emparejar layout cruzado/macho en una sola línea
    const cleanText = rawTextCleaned.replace(/\s+/g, ' ').toUpperCase();
    const mashedMatch = cleanText.match(/DATOS\s+DEL\s+REGISTRADO\s+([A-Z0-9\s]+?)\s+NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)(?:$|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO))/i);
    if (mashedMatch) {
      const nombresVal = mashedMatch[1].trim();
      const ap1Val = mashedMatch[2].trim();
      const ap2Val = mashedMatch[3].trim();
      
      d.nombre = `${nombresVal} ${ap1Val} ${ap2Val}`.replace(/\s+/g, ' ').toUpperCase();
      d.nombres = nombresVal.toUpperCase();
      d.apellido_paterno = ap1Val.toUpperCase();
      d.apellido_materno = ap2Val.toUpperCase();
      d.nombreSolo = nombresVal.toUpperCase();
      d.primerApellido = ap1Val.toUpperCase();
      d.segundoApellido = ap2Val.toUpperCase();
      
      const rest = mashedMatch[4].trim();
      if (rest && !rest.includes('NACIONALIDAD') && rest.length > 2) {
        d.nacionalidad = rest.toUpperCase();
      } else if (cleanText.includes('NACIONALIDAD')) {
        const nacMatch = cleanText.match(/(?:NACIONALIDAD|PAIS)\s+([A-Z\s]+)/i);
        if (nacMatch) d.nacionalidad = nacMatch[1].trim().toUpperCase();
      }
      return d;
    }

    const firstWord = d.nombre ? d.nombre.split(' ')[0] : '';
    if (!d.nombre || d.nombre === 'No detectado' || d.nombre.split(' ').length < 2 || firstWord.length <= 1) {
      const lines = rawTextCleaned.split('\n').map(l => l.trim()).filter(Boolean);
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
        d.nombre = `${nombres} ${ap1} ${ap2}`.replace(/\s+/g, ' ').toUpperCase();
        d.nombres = nombres.toUpperCase();
        d.apellido_paterno = ap1.toUpperCase();
        d.apellido_materno = ap2.toUpperCase();
        d.nombreSolo = nombres.toUpperCase();
        d.primerApellido = ap1.toUpperCase();
        d.segundoApellido = ap2.toUpperCase();
      }
    }

    if (!d.fecha_nac || d.fecha_nac === 'No detectada') {
      const MESES = {
        ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06',
        JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12',
      };
      const m = rawTextCleaned.match(/(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i);
      if (m && MESES[m[2].toUpperCase()]) {
        d.fecha_nac = `${m[1].padStart(2, '0')}/${MESES[m[2].toUpperCase()]}/${m[3]}`;
      }
    }

    return d;
  };

  // ── Procesar documento vía OCR ───────────────────────────────────────────
  const procesarOCR = async (docKey, file, onCancel) => {
    Swal.fire({
      title: 'Analizando documento…',
      html: 'Extrayendo información. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const fd = new FormData();
      fd.append('file_id', file);
      const token = localStorage.getItem('token') || sessionStorage.getItem('temp_token');
      const res = await fetch(`${API_BASE}/documentos/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fd
      });
      if (!res.ok) throw new Error();
      const htmlText = await res.text();
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');

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

      doc.querySelectorAll('.dato-fila').forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const val = cleanVal(row.querySelector('.valor')?.textContent);

        if (!val) return;

        if (label.includes('nombres')) {
          nombresEncontrados = val;
        } else if (label.includes('nombre completo') || label === 'nombre') {
          nombreEncontrado = val;
        } else if (label.includes('nombre')) {
          if (!nombresEncontrados) nombresEncontrados = val;
        }

        if (label.includes('apellido paterno') || label.includes('paterno')) {
          apellidoPaternoEncontrado = val;
        }
        if (label.includes('apellido materno') || label.includes('materno')) {
          apellidoMaternoEncontrado = val;
        }

        if (label.includes('curp')) curpEncontrada = val;
        if (label.includes('nacionalidad')) nacionalidadEncontrada = val;

        if (label.includes('fecha de nacimiento') || label.includes('fecha nac') || (label.includes('nacimiento') && !label.includes('lugar'))) {
          let dateVal = val;
          if (dateVal.includes('-')) {
            const p = dateVal.split('-');
            if (p.length === 3 && p[0].length === 4) {
              dateVal = `${p[2]}/${p[1]}/${p[0]}`;
            }
          }
          fechaNacEncontrada = dateVal;
        }

        if (label.includes('edad')) edadEncontrada = val;
        if (label.includes('sexo')) sexoEncontrado = val;
        if (label.includes('documento')) documentoEncontrado = val;
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

      let extracted = {
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

      const rawText = doc.querySelector('pre')?.textContent;
      if (rawText && (docKey === 'actaNacimiento' || extracted.documento?.includes('ACTA'))) {
        extracted = mejorarActa(rawText, extracted);
      }

      // VALIDACIÓN DE COINCIDENCIA DE TIPO DE DOCUMENTO
      const isActaField = ['acta', 'actaNacimiento'].includes(docKey);
      const isIneField = ['ine', 'ineTutor', 'identificacion'].includes(docKey);
      const isOcrActa = (extracted.documento || '').toUpperCase() === 'ACTA DE NACIMIENTO';
      const isOcrIne = (extracted.documento || '').toUpperCase() === 'INE';

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
          if (onCancel) onCancel();
          return;
        }
      }

      setOcrResults(prev => ({ ...prev, ...extracted, [docKey]: `OCR: ${extracted.nombre || 'ok'}` }));
      Swal.fire({
        title: extracted.nombre ? '¡Lectura exitosa!' : 'Documento procesado',
        text: extracted.nombre
          ? `Detectado: ${extracted.nombre}`
          : 'No se extrajo el nombre, continúa manualmente.',
        icon: 'success',
        timer: 2200,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        title: 'Error al leer el documento',
        text: 'No se pudo leer el documento automáticamente. Puedes continuar manualmente.',
        icon: 'warning',
      });
    }
  };

  // ── Edición manual de campos OCR ─────────────────────────────────────────
  // ── Pre-rellenar con datos de cuenta al llegar al paso 3 ─────────────────
  const preFillFromCuenta = (cuenta) => {
    setOcrResults(prev => {
      const next = { ...prev };
      if (!next.nombre) {
        const fullName = `${cuenta.primerApellido} ${cuenta.segundoApellido} ${cuenta.nombre}`
          .replace(/\s+/g, ' ').trim().toUpperCase();
        if (fullName) next.nombre = fullName;
      }
      if (!next.curp && cuenta.curp) next.curp = cuenta.curp.toUpperCase();
      if (!next.fecha_nac && cuenta.fechaNacimiento) next.fecha_nac = toDDMMYYYY(cuenta.fechaNacimiento);
      return next;
    });
  };

  return {
    ocrResults,
    setOcrResults,
    procesarOCR,
    preFillFromCuenta,
  };
}
