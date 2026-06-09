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

    if (!d.nombre || d.nombre === 'No detectado' || d.nombre.split(' ').length < 2) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let nombres = '', ap1 = '', ap2 = '';
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toUpperCase();
        if (l.includes('NOMBRE(S)') && i + 1 < lines.length) nombres = lines[i + 1];
        if (l.includes('PRIMER APELLIDO') && i + 1 < lines.length) ap1 = lines[i + 1];
        if (l.includes('SEGUNDO APELLIDO') && i + 1 < lines.length) ap2 = lines[i + 1];
      }
      if (nombres && ap1) {
        d.nombre = `${ap1} ${ap2} ${nombres}`.replace(/\s+/g, ' ').toUpperCase();
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
      html: 'Extrayendo información vía OCR. <b>Por favor espere.</b>',
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
        if (label.includes('nombre')) extracted.nombre = val;
        if (label.includes('nacionalidad')) extracted.nacionalidad = val;
        if (label.includes('fecha de nacimiento')) extracted.fecha_nac = val;
        if (label.includes('edad')) extracted.edad = val;
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
        title: 'Error OCR',
        text: 'No se pudo leer el documento automáticamente. Puedes continuar manualmente.',
        icon: 'warning',
      });
    }
  };

  // ── Edición manual de campos OCR ─────────────────────────────────────────
  const handleOcrManual = (field, val) => {
    const uppercased = typeof val === 'string' ? val.toUpperCase() : val;
    setOcrResults(prev => ({
      ...prev,
      [field]: uppercased,
      actaNacimiento: prev.actaNacimiento || 'Manual',
      identificacion: prev.identificacion || 'Manual',
    }));
  };

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
    handleOcrManual,
    preFillFromCuenta,
  };
}
