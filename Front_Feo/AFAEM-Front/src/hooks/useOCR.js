import { useState } from 'react';
import Swal from 'sweetalert2';
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

    // Intentar emparejar layout cruzado/macho en una sola línea
    const cleanText = rawText.replace(/\s+/g, ' ').toUpperCase();
    const mashedMatch = cleanText.match(/DATOS\s+DEL\s+REGISTRADO\s+([A-Z0-9\s]+?)\s+NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)(?:$|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO))/i);
    if (mashedMatch) {
      const nombresVal = mashedMatch[1].trim();
      const ap1Val = mashedMatch[2].trim();
      const ap2Val = mashedMatch[3].trim();
      
      d.nombre = `${ap1Val} ${ap2Val} ${nombresVal}`.replace(/\s+/g, ' ').toUpperCase();
      d.nombres = nombresVal.toUpperCase();
      d.apellido_paterno = ap1Val.toUpperCase();
      d.apellido_materno = ap2Val.toUpperCase();
      
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
        d.nombre = `${ap1} ${ap2} ${nombres}`.replace(/\s+/g, ' ').toUpperCase();
        d.nombres = nombres.toUpperCase();
        d.apellido_paterno = ap1.toUpperCase();
        d.apellido_materno = ap2.toUpperCase();
      }
    }

    if (!d.fecha_nac || d.fecha_nac === 'No detectada') {
      const MESES = {
        ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06',
        JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12',
      };
      const m = rawText.match(/(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i);
      if (m && MESES[m[2].toUpperCase()]) {
        d.fecha_nac = `${m[1].padStart(2, '0')}/${MESES[m[2].toUpperCase()]}/${m[3]}`;
      }
    }

    return d;
  };

  // ── Procesar documento vía OCR ───────────────────────────────────────────
  const procesarOCR = async (docKey, file) => {
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
      const res = await fetch('/ocr-api', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const htmlText = await res.text();
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');

      let extracted = {};
      doc.querySelectorAll('.dato-fila').forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const val = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('curp')) extracted.curp = val;
        if (label.includes('nombre completo')) extracted.nombre = val;
        else if (label.includes('nombres')) extracted.nombres = val;
        else if (label.includes('nombre')) extracted.nombre = val;
        if (label.includes('apellido paterno')) extracted.apellido_paterno = val;
        if (label.includes('apellido materno')) extracted.apellido_materno = val;
        if (label.includes('nacionalidad')) extracted.nacionalidad = val;
        if (label.includes('fecha de nacimiento')) {
          let dateVal = val;
          if (dateVal.includes('-')) {
            const p = dateVal.split('-');
            if (p.length === 3 && p[0].length === 4) {
              dateVal = `${p[2]}/${p[1]}/${p[0]}`;
            }
          }
          extracted.fecha_nac = dateVal;
        }
        if (label.includes('edad')) extracted.edad = val;
        if (label.includes('sexo')) extracted.sexo = val;
        if (label.includes('documento')) extracted.documento = val;
      });

      const rawText = doc.querySelector('pre')?.textContent;
      if (rawText && (docKey === 'actaNacimiento' || extracted.documento?.includes('ACTA'))) {
        extracted = mejorarActa(rawText, extracted);
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
