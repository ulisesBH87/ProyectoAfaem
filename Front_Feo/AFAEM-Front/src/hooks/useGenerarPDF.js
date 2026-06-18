import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { C } from '../pages/Admin/RegistrarPresidente/constants';

/**
 * useGenerarPDF
 * Genera y descarga el formato de afiliación en PDF rellenando los campos
 * del formulario con los datos del presidente registrado.
 *
 * @returns {{ descargarFormato: Function }}
 */
export function useGenerarPDF() {
  // ── Helper: escribe texto en un campo del formulario PDF ─────────────────
  const safeField = (form, name, val, fontSize) => {
    if (!val) return;
    try {
      const field = form.getTextField(name);
      if (field) {
        field.setText(String(val));
        if (fontSize) field.setFontSize(fontSize);
      }
    } catch { /* campo no existe en el PDF — ignorar */ }
  };

  /**
   * descargarFormato
   * @param {object} params
   * @param {object} params.ocrResults        - Datos extraídos por OCR
   * @param {object} params.cuenta            - Datos de cuenta (Paso 1)
   * @param {object} params.documents         - Archivos subidos
   * @param {string} params.codigoPaisCuenta  - Código de país de cuenta
   * @param {string} params.tipoAfiliacion    - Tipo de afiliación seleccionado
   * @param {string} params.asociacion        - Nombre de la asociación
   * @param {string} params.liga              - ID o nombre de liga
   * @param {Array}  params.ligasCatalogo     - Catálogo de ligas cargado
   * @param {string} params.equipo            - Nombre del equipo
   * @param {boolean} params.esEntrenador     - Indica si se genera el PDF para un entrenador
   */
  const descargarFormato = async ({
    ocrResults,
    cuenta,
    documents,
    codigoPaisCuenta,
    tipoAfiliacion,
    asociacion,
    liga,
    ligasCatalogo,
    equipo,
    esEntrenador,
  }) => {
    try {
      Swal.fire({ title: 'Generando PDF…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const bytes = await fetch('/formato_afiliacion_directivo.pdf').then(r => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      const page = pdfDoc.getPages()[0];

      // Fotografía
      if (documents.fotografia) {
        try {
          const pb = await documents.fotografia.arrayBuffer();
          const img = documents.fotografia.name.toLowerCase().endsWith('.png')
            ? await pdfDoc.embedPng(pb)
            : await pdfDoc.embedJpg(pb);
          page.drawImage(img, { x: 479, y: 676, width: 76, height: 90 });
        } catch { /* foto opcional */ }
      }

      // Nombre
      const { nombre, curp, fecha_nac } = ocrResults;
      const nacionalidad = cuenta.nacionalidad || ocrResults.nacionalidad;

      const nombreVal = cuenta.nombre || '';
      const primerApellidoVal = cuenta.primerApellido || '';
      const segundoApellidoVal = cuenta.segundoApellido || '';

      if (nombreVal || primerApellidoVal || segundoApellidoVal) {
        safeField(form, 'Apellido Paterno', primerApellidoVal);
        safeField(form, 'Apellido Materno', segundoApellidoVal);
        safeField(form, 'Nombres', nombreVal);
      } else if (nombre && nombre !== 'No detectado') {
        const parts = nombre.split(' ');
        if (parts.length >= 3) {
          safeField(form, 'Apellido Paterno', parts[0]);
          safeField(form, 'Apellido Materno', parts[1]);
          safeField(form, 'Nombres', parts.slice(2).join(' '));
        } else if (parts.length === 2) {
          safeField(form, 'Apellido Paterno', parts[0]);
          safeField(form, 'Nombres', parts[1]);
        } else {
          safeField(form, 'Nombres', nombre);
        }
      }

      const curpVal = cuenta.curp || curp;
      safeField(form, 'CURP o Clave Única de Registro de Población', curpVal);

      const fechaNacVal = cuenta.fechaNacimiento || fecha_nac;
      safeField(form, 'Fecha de Nacimiento', fechaNacVal);

      // Correo (tamaño adaptativo)
      const correoVal = cuenta.correo || '';
      const correoFontSize = correoVal.length > 35 ? 6 : correoVal.length > 25 ? 7 : correoVal.length > 18 ? 8 : 10;
      safeField(form, 'Correo electrónico', correoVal, correoFontSize);

      // Teléfono
      const telLocal = cuenta.telefono || ocrResults.telefono || '';
      const codPais = telLocal.startsWith('+') ? '' : codigoPaisCuenta;
      safeField(form, 'Teléfono', codPais + telLocal);

      // Afiliación
      safeField(form, 'fill_20', tipoAfiliacion);
      safeField(form, 'Tipo', tipoAfiliacion);
      safeField(form, 'Asociación', asociacion);

      // Liga (tamaño adaptativo)
      const ligaObj = ligasCatalogo.find(l => String(l.id) === String(liga));
      const nombreLiga = (ligaObj ? ligaObj.nombre : liga)?.split('(')[0].trim().toUpperCase() || '';
      const fontSizeLiga = nombreLiga.length > 25 ? 6 : nombreLiga.length > 15 ? 8 : 10;
      safeField(form, 'Liga', nombreLiga, fontSizeLiga);
      safeField(form, 'Equipo', equipo?.toUpperCase());

      if (nacionalidad) safeField(form, 'Lugar de Nacimiento', nacionalidad);

      // Sexo
      let sexoTexto = '';
      if (cuenta.sexoId === '1' || cuenta.sexoId === 1) sexoTexto = 'MASCULINO';
      else if (cuenta.sexoId === '2' || cuenta.sexoId === 2) sexoTexto = 'FEMENINO';
      else if (cuenta.sexoId === '3' || cuenta.sexoId === 3) sexoTexto = 'OTRO';
      else if (curpVal?.length >= 11) {
        const sx = curpVal.charAt(10).toUpperCase();
        sexoTexto = sx === 'H' ? 'MASCULINO' : sx === 'M' ? 'FEMENINO' : '';
      }
      safeField(form, 'Sexo', sexoTexto);

      // Fecha de firma
      const hoy = new Date();
      const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      safeField(form, 'A', String(hoy.getDate()).padStart(2, '0'));
      safeField(form, 'de', MESES[hoy.getMonth()]);
      safeField(form, 'del 20', String(hoy.getFullYear()).slice(-2));
      safeField(form, 'Cargo', esEntrenador ? 'ENTRENADOR' : 'PRESIDENTE');

      // Descargar
      const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const defaultName = esEntrenador ? 'Entrenador' : 'Presidente';
      const nombreParaNombreArchivo = cuenta.nombre || nombre || defaultName;
      link.download = `Formato_${nombreParaNombreArchivo.replace(/[^a-zA-Z0-9 ]/g, '').trim()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Swal.fire('¡Listo!', 'Formato descargado.', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo generar el PDF: ' + err.message, 'error');
    }
  };

  return { descargarFormato };
}
