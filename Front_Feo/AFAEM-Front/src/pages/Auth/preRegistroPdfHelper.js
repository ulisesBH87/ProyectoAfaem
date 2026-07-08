export const safeSetField = (form, fieldName, value, fontSize) => {
  if (value === null || value === undefined || value === '') return;
  try {
    const field = form.getTextField(fieldName);
    if (field) {
      field.setText(String(value));
      if (fontSize) {
        field.setFontSize(fontSize);
      }
    }
  } catch (e) {
    console.warn(`[PDF] Campo no encontrado: "${fieldName}" → omitido.`);
  }
};

export const generarPDFCuota = (ordenId, refDirecta = null, { jsPDF, Swal, bankInfo, user, totalMostrado, catalogoSeguros, asignacionSeguros, referenciaPago }) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Encabezado
    doc.setFontSize(16);
    doc.setTextColor(11, 78, 166);
    doc.text('FICHA DE PAGO - AFAEM', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Número de Orden: ${ordenId}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    const today = new Date().toLocaleDateString('es-MX');
    doc.text(`Fecha: ${today}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Datos del Usuario
    doc.setFontSize(12);
    doc.setTextColor(11, 78, 166);
    doc.text('DATOS DEL SOLICITANTE', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const userName = (user.usuario?.nombre || user.usuario?.Nombre || user.Nombre || user.NombreUsuario || 'N/A').toUpperCase();
    doc.text(`Nombre: ${userName}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Correo: ${user.Correo || user.email || 'N/A'}`, margin, yPosition);
    yPosition += 10;

    // Datos Bancarios
    doc.setFontSize(12);
    doc.setTextColor(11, 78, 166);
    doc.text('INSTRUCCIONES DE PAGO', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Banco: ${bankInfo.banco}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Titular: ${bankInfo.titular}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Cuenta: ${bankInfo.cuenta}`, margin, yPosition);
    yPosition += 6;
    doc.text(`CLABE: ${bankInfo.clabe}`, margin, yPosition);
    yPosition += 6;
    const refFinal = refDirecta || referenciaPago || 'N/A';
    doc.text(`Referencia Obligatoria: ${refFinal}`, margin, yPosition);
    yPosition += 12;

    // Desglose de Cuota
    doc.setFontSize(12);
    doc.setTextColor(11, 78, 166);
    doc.text('DESGLOSE DE CUOTA', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Afiliaciones (Omitidas del PDF según requerimiento)

    // Seguros
    let tieneSeguros = false;
    catalogoSeguros.forEach(seg => {
      if (asignacionSeguros[seg.id] > 0) {
        tieneSeguros = true;
        const subtotal = seg.precio * asignacionSeguros[seg.id];
        doc.text(`${seg.nombre} (x${asignacionSeguros[seg.id]})`, margin, yPosition);
        doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 30, yPosition);
        yPosition += 6;
      }
    });

    // Línea divisoria
    yPosition += 2;
    doc.setDrawColor(11, 78, 166);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // Total
    doc.setFontSize(12);
    doc.setTextColor(11, 78, 166);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL A PAGAR:', margin, yPosition);
    doc.text(`$${totalMostrado.toFixed(2)}`, pageWidth - margin - 30, yPosition);
    yPosition += 10;

    // Nota final
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'normal');
    doc.text('Por favor, incluye la referencia obligatoria en tu transferencia bancaria.', margin, yPosition, { maxWidth: contentWidth });
    yPosition += 6;
    doc.text('Una vez realizado el pago, sube el comprobante en la plataforma para procesar tu registro. Recuerda que el comprobante de pago debe tener la referencia obligatoria impresa para que sea aceptado.', margin, yPosition, { maxWidth: contentWidth });

    // Descargar PDF
    const nombreArchivo = `Cuota_AFAEM_${ordenId}_${today.split('/').join('-')}.pdf`;
    doc.save(nombreArchivo);
  } catch (err) {
    console.error('Error al generar PDF:', err);
    Swal.fire({ title: 'Error', text: 'No se pudo generar el PDF de la cuota', icon: 'error' });
  }
};

export const handleDownloadFormato = async ({ Swal, PDFDocument, documents, ocrResults, user, asociacion, codigoPais, tipoAfiliacion, liga, ligasCatalogo, cargoSeleccionado }) => {
  try {
    Swal.fire({
      title: 'Generando PDF...',
      text: 'Preparando tu formato de afiliación pre-llenado.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    // Cargar la plantilla real con campos de formulario
    const templateUrl = '/formato_afiliacion_directivo.pdf';
    const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const firstPage = pdfDoc.getPages()[0];

    // INCRUSTAR FOTOGRAFÍA SI EXISTE
    if (documents.fotografia) {
      try {
        const photoBytes = await documents.fotografia.arrayBuffer();
        let photoImage;
        const nameLower = documents.fotografia.name.toLowerCase();

        if (nameLower.endsWith('.png')) {
          photoImage = await pdfDoc.embedPng(photoBytes);
        } else {
          photoImage = await pdfDoc.embedJpg(photoBytes);
        }

        firstPage.drawImage(photoImage, {
          x: 479,
          y: 676,
          width: 76,
          height: 90,
        });
      } catch (photoErr) {
        console.warn("Error al incrustar foto:", photoErr);
      }
    }

    const { nombreSolo, primerApellido, segundoApellido, nombre, curp, fecha_nac, nacionalidad } = ocrResults;

    let nombresVal = '';
    let apPaternoVal = '';
    let apMaternoVal = '';

    if (nombreSolo || primerApellido || segundoApellido) {
      if (nombreSolo) nombresVal = nombreSolo.toUpperCase();
      if (primerApellido) apPaternoVal = primerApellido.toUpperCase();
      if (segundoApellido) apMaternoVal = segundoApellido.toUpperCase();
    } else if (nombre && nombre !== "No detectado") {
      const parts = nombre.split(' ');
      if (parts.length === 4) {
        nombresVal = parts.slice(0, 2).join(' ').toUpperCase();
        apPaternoVal = parts[2].toUpperCase();
        apMaternoVal = parts[3].toUpperCase();
      } else if (parts.length === 3) {
        nombresVal = parts[0].toUpperCase();
        apPaternoVal = parts[1].toUpperCase();
        apMaternoVal = parts[2].toUpperCase();
      } else if (parts.length === 2) {
        nombresVal = parts[0].toUpperCase();
        apPaternoVal = parts[1].toUpperCase();
      } else {
        nombresVal = nombre.toUpperCase();
      }
    }

    const getFs = (val) => val.length > 35 ? 6 : val.length > 25 ? 7 : val.length > 18 ? 8 : 10;

    if (nombresVal) safeSetField(form, 'Nombres', nombresVal, getFs(nombresVal));
    if (apPaternoVal) safeSetField(form, 'Apellido Paterno', apPaternoVal, getFs(apPaternoVal));
    if (apMaternoVal) safeSetField(form, 'Apellido Materno', apMaternoVal, getFs(apMaternoVal));

    // CURP
    if (curp && curp !== "No detectado") {
      safeSetField(form, 'CURP o Clave Única de Registro de Población', curp);
    }

    // Fecha de Nacimiento
    if (fecha_nac && fecha_nac !== "No detectada") {
      safeSetField(form, 'Fecha de Nacimiento', fecha_nac);
    }

    // Correo electrónico
    const email = user.Correo || user.correo || user.email;
    const emailVal = email || '';
    const emailFontSize = emailVal.length > 35 ? 6 : emailVal.length > 25 ? 7 : emailVal.length > 18 ? 8 : 10;
    safeSetField(form, 'Correo electrónico', emailVal, emailFontSize);

    // Sexo
    let sexoTexto = ocrResults.sexo || '';
    if (!sexoTexto && curp && curp.length >= 11) {
      const sexoChar = curp.charAt(10).toUpperCase();
      sexoTexto = sexoChar === 'H' ? 'MASCULINO' : sexoChar === 'M' ? 'FEMENINO' : '';
    }
    if (sexoTexto) {
      safeSetField(form, 'Sexo', sexoTexto);
    }

    // Nacionalidad / Lugar de Nacimiento
    safeSetField(form, 'Lugar de Nacimiento', nacionalidad);

    // Teléfono (fill_24 en la plantilla directivo — puede no existir)
    safeSetField(form, 'fill_24', asociacion.toUpperCase());
    const telLocalPdf = (ocrResults.telefono || '').replace(/\D/g, '');
    safeSetField(form, 'Teléfono', telLocalPdf ? (codigoPais + telLocalPdf) : '');

    // Tipo de afiliación
    safeSetField(form, 'fill_20', tipoAfiliacion);
    safeSetField(form, 'Tipo', tipoAfiliacion);

    // Asociación, Liga, Equipo
    if (asociacion) safeSetField(form, 'Asociación', asociacion.toUpperCase());
    if (liga) {
      const selectedLigaObj = ligasCatalogo.find(l => String(l.id) === String(liga));
      if (selectedLigaObj) {
        const nameStr = selectedLigaObj.nombre.split('(')[0].trim().toUpperCase();
        const fontSize = nameStr.length > 35 ? 6 : nameStr.length > 25 ? 7 : nameStr.length > 18 ? 8 : 10;
        safeSetField(form, 'Liga', nameStr, fontSize);
      }
    }
    const equipoVal = (ocrResults.equipo || '').toUpperCase();
    const equipoFs = equipoVal.length > 35 ? 6 : equipoVal.length > 25 ? 7 : equipoVal.length > 18 ? 8 : 10;
    safeSetField(form, 'Equipo', equipoVal, equipoFs);

    // Fecha automática (A __ de __ del 20__)
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const mes = meses[hoy.getMonth()];
    const anio = String(hoy.getFullYear()).slice(-2);

    safeSetField(form, 'A', dia);
    safeSetField(form, 'de', mes);
    safeSetField(form, 'del 20', anio);

    // Cargo: dinámico de acuerdo a la selección y tamaño de letra ajustado
    const cargoValor = (cargoSeleccionado || 'Presidente Equipo').toUpperCase();
    const cargoFontSize = cargoValor.length > 10 ? 8 : 10;
    safeSetField(form, 'Cargo', cargoValor, cargoFontSize);

    // Generar bytes del PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const safeNombre = (nombre || 'Presidente').toString().replace(/[^a-zA-Z0-9_\s]/g, '').trim();
    const link = document.createElement('a');
    link.href = url;
    link.download = `Formato_Afiliacion_${safeNombre}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire('¡Listo!', 'El formato se ha descargado correctamente.', 'success');
  } catch (err) {
    console.error("Error generando PDF:", err);
    Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
  }
};

export const handleEmbedNewPhotoInFormat = async ({
  Swal,
  PDFDocument,
  previews,
  documents,
  API_BASE,
  solicitudActualId,
  cargarDocumentosSolicitud,
  COLORS
}) => {
  try {
    Swal.fire({
      title: 'Procesando formato...',
      text: 'Incrustando la nueva fotografía en tu formato de afiliación ya subido.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    if (!previews.formatoAfiliacion) {
      throw new Error('No se encontró el formato de afiliación cargado.');
    }
    const pdfBytes = await fetch(previews.formatoAfiliacion).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const firstPage = pdfDoc.getPages()[0];

    let photoBytes;
    let isPng = false;

    if (documents.fotografia) {
      photoBytes = await documents.fotografia.arrayBuffer();
      isPng = documents.fotografia.name.toLowerCase().endsWith('.png');
    } else if (previews.fotografia) {
      const photoRes = await fetch(previews.fotografia);
      photoBytes = await photoRes.arrayBuffer();
      const contentType = photoRes.headers.get('content-type') || '';
      isPng = contentType.includes('png') || previews.fotografia.startsWith('data:image/png');
    } else {
      throw new Error('No se encontró la nueva fotografía para incrustar.');
    }

    let photoImage;
    if (isPng) {
      photoImage = await pdfDoc.embedPng(photoBytes);
    } else {
      photoImage = await pdfDoc.embedJpg(photoBytes);
    }

    firstPage.drawImage(photoImage, {
      x: 479,
      y: 676,
      width: 76,
      height: 90,
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const modifiedBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const modifiedFile = new File([modifiedBlob], `Formato_Afiliacion_Firmado_Con_Foto.pdf`, { type: 'application/pdf' });

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('documento_afiliacion_ids', '10');
    formData.append('archivo', modifiedFile);
    formData.append('solicitud_id', solicitudActualId);

    const res = await fetch(`${API_BASE}/documentos/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Error al actualizar el formato en el servidor.');
    }

    Swal.close();
    await Swal.fire({
      title: '¡Fotografía Incrustada!',
      text: 'La nueva fotografía ha sido colocada exitosamente en el formato de afiliación firmado ya subido.',
      icon: 'success',
      confirmButtonColor: COLORS.primary
    });

    await cargarDocumentosSolicitud(solicitudActualId);
  } catch (err) {
    console.error("Error al incrustar fotografía en formato:", err);
    Swal.fire({
      title: 'Error',
      text: err.message || 'No se pudo incrustar la fotografía en el formato.',
      icon: 'error'
    });
  }
};
