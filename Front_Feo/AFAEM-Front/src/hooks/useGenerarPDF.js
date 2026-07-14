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

      const getFs = (val) => val ? (val.length > 35 ? 6 : val.length > 25 ? 7 : val.length > 18 ? 8 : 10) : undefined;

      const nombreVal = cuenta.nombre || '';
      const primerApellidoVal = cuenta.primerApellido || '';
      const segundoApellidoVal = cuenta.segundoApellido || '';

      if (nombreVal || primerApellidoVal || segundoApellidoVal) {
        safeField(form, 'Apellido Paterno', primerApellidoVal, getFs(primerApellidoVal));
        safeField(form, 'Apellido Materno', segundoApellidoVal, getFs(segundoApellidoVal));
        safeField(form, 'Nombres', nombreVal, getFs(nombreVal));
      } else if (nombre && nombre !== 'No detectado') {
        const parts = nombre.split(' ');
        if (parts.length >= 3) {
          const apPaterno = parts[0];
          const apMaterno = parts[1];
          const nombres = parts.slice(2).join(' ');
          safeField(form, 'Apellido Paterno', apPaterno, getFs(apPaterno));
          safeField(form, 'Apellido Materno', apMaterno, getFs(apMaterno));
          safeField(form, 'Nombres', nombres, getFs(nombres));
        } else if (parts.length === 2) {
          const apPaterno = parts[0];
          const nombres = parts[1];
          safeField(form, 'Apellido Paterno', apPaterno, getFs(apPaterno));
          safeField(form, 'Nombres', nombres, getFs(nombres));
        } else {
          safeField(form, 'Nombres', nombre, getFs(nombre));
        }
      }

      const curpVal = cuenta.curp || curp;
      safeField(form, 'CURP o Clave Única de Registro de Población', curpVal);

      const fechaNacVal = cuenta.fechaNacimiento || fecha_nac;
      safeField(form, 'Fecha de Nacimiento', fechaNacVal);

      // Correo (tamaño adaptativo)
      const correoVal = cuenta.correo || '';
      const correoFontSize = getFs(correoVal);
      safeField(form, 'Correo electrónico', correoVal, correoFontSize);

      // Teléfono
      const telLocal = cuenta.telefono || ocrResults.telefono || '';
      const codPais = telLocal.startsWith('+') ? '' : codigoPaisCuenta;
      safeField(form, 'Teléfono', codPais + telLocal);

      // Afiliación
      const obtenerLetraSeguro = (nombreSeguro) => {
        if (!nombreSeguro) return '';
        const limpio = nombreSeguro.toString().trim().toUpperCase();
        if (limpio.startsWith('TIPO ')) {
          return limpio.replace('TIPO ', '').trim();
        }
        return limpio;
      };
      const seguroLetra = obtenerLetraSeguro(tipoAfiliacion);
      safeField(form, 'fill_20', seguroLetra);
      safeField(form, 'Tipo', seguroLetra);
      safeField(form, 'Asociación', asociacion);

      // Liga (tamaño adaptativo)
      const ligaObj = ligasCatalogo.find(l => String(l.id) === String(liga));
      const nombreLiga = (ligaObj ? ligaObj.nombre : liga)?.split('(')[0].trim().toUpperCase() || '';
      const fontSizeLiga = getFs(nombreLiga);
      safeField(form, 'Liga', nombreLiga, fontSizeLiga);

      const equipoVal = equipo?.toUpperCase() || '';
      safeField(form, 'Equipo', equipoVal, getFs(equipoVal));

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
