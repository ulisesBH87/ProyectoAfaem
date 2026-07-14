import { jsPDF } from 'jspdf';
import logoAfaem from '../assets/afaem-letras-azul.jpg';
import logoAmateur from '../assets/amateur-logo-color.png';
import logoFmf from '../assets/fmf-logo-color.svg';
import logoSantander from '../assets/logo-santander.png';

export const DEFAULT_BANK_INFO = {
  banco: 'SANTANDER',
  titular: 'AFAEM ASOCIACIÓN DE FÚTBOL AMATEUR DEL ESTADO AC',
  cuenta: '65 50917824-5',
  clabe: '0145 4065 5091 7824 58',
  tarjeta: '5579 0890 0364 2694',
  referencia: 'RHX-CL26-001'
};

const formatCurrency = (amount) => `$${Number(amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const loadImage = (src) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 100;
        canvas.height = img.naturalHeight || img.height || 100;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error('Error rasterizing image:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

const renderOrdenPagoPDF = async ({
  ordenId,
  schoolOrClub,
  concepts,
  total,
  bankInfo = DEFAULT_BANK_INFO,
  referenciaPago
}) => {
  const [imgAfaem, imgAmateur, imgFmf, imgSantander] = await Promise.all([
    loadImage(logoAfaem),
    loadImage(logoAmateur),
    loadImage(logoFmf),
    loadImage(logoSantander),
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('es-MX');

  // 1. Logos de cabecera
  if (imgAfaem) doc.addImage(imgAfaem, 'PNG', 15, 10, 24, 24);
  if (imgAmateur) doc.addImage(imgAmateur, 'PNG', 135, 13, 25, 17);
  if (imgFmf) doc.addImage(imgFmf, 'PNG', 168, 13, 24, 17);

  // 2. Título de la asociación y orden
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('AFAEM ASOCIACIÓN DE FÚTBOL AMATEUR DEL ESTADO MORELOS', pageWidth / 2, 48, { align: 'center' });

  doc.setFontSize(13);
  doc.text('ORDEN DE PAGO', pageWidth / 2, 55, { align: 'center' });

  // 3. Subtítulos informativos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Orden de Pago No. ${ordenId}`, 15, 65);
  doc.text(`Nombre del solicitante/nombre del equipo: ${schoolOrClub}`, 15, 71);

  let yPosition = 77;

  // 4. Tabla de Conceptos (Cabecera)
  doc.setFillColor(94, 94, 94);
  doc.rect(15, yPosition, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Concepto', 15 + 67.5, yPosition + 5.5, { align: 'center' });
  doc.text('Importe', 15 + 135 + 22.5, yPosition + 5.5, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPosition += 8;

  // Tabla de Conceptos (Filas)
  doc.setDrawColor(204, 204, 204);
  concepts.forEach((c) => {
    doc.rect(15, yPosition, 180, 12);
    doc.line(15 + 135, yPosition, 15 + 135, yPosition + 12);

    doc.text(c.concepto, 17, yPosition + 7.5);
    doc.setFont(undefined, 'bold');
    doc.text(formatCurrency(c.importe), 15 + 135 + 22.5, yPosition + 7.5, { align: 'center' });
    doc.setFont(undefined, 'normal');
    yPosition += 12;
  });

  // Subtotal & Total
  yPosition += 5;
  doc.setFont(undefined, 'normal');
  doc.text(`Subtotal: ${formatCurrency(total)}`, 195, yPosition, { align: 'right' });
  yPosition += 6;
  doc.setFont(undefined, 'bold');
  doc.text(`Total: ${formatCurrency(total)}`, 195, yPosition, { align: 'right' });

  // 5. Opciones de pago texto informativo
  yPosition += 10;
  doc.setFont(undefined, 'bold');
  doc.text('*Para realizar su pago, favor de utilizar las siguientes opciones:', 15, yPosition);
  yPosition += 6;
  doc.setFont(undefined, 'normal');
  doc.text('* Los depósitos en ventanilla se verán reflejados en el sistema en un máximo de 48hrs.', 15, yPosition);

  // 6. Tabla de Mes/Año (Cabecera)
  yPosition += 8;
  doc.setFillColor(94, 94, 94);
  doc.rect(15, yPosition, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Mes/Año', 15 + 47.5, yPosition + 5.5, { align: 'center' });
  doc.text('Pagar antes de', 15 + 95 + 15, yPosition + 5.5, { align: 'center' });
  doc.text('Pagado', 15 + 125 + 12.5, yPosition + 5.5, { align: 'center' });
  doc.text('Fecha de Pago', 15 + 150 + 15, yPosition + 5.5, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPosition += 8;

  // Tabla de Mes/Año (Fila única)
  doc.rect(15, yPosition, 180, 12);
  doc.line(15 + 95, yPosition, 15 + 95, yPosition + 12);
  doc.line(15 + 125, yPosition, 15 + 125, yPosition + 12);
  doc.line(15 + 150, yPosition, 15 + 150, yPosition + 12);

  doc.text('ABONO A CUENTA DE LA ASOCIACION', 17, yPosition + 7.5);
  doc.text('Si [ ]', 15 + 125 + 12.5, yPosition + 7.5, { align: 'center' });
  yPosition += 12;

  // 7. Recuadro Santander
  yPosition += 10;
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition, 180, 36);

  if (imgSantander) {
    doc.addImage(imgSantander, 'PNG', 20, yPosition + 3, 39, 13.6);
  }

  const yText = yPosition + 22;
  doc.setFontSize(8.5);
  doc.text('Nombre: ' + bankInfo.titular, 20, yText);
  doc.text('N° de Cuenta: ' + bankInfo.cuenta, 20, yText + 5);
  doc.text('N° de Tarjeta: ' + bankInfo.tarjeta, 105, yText + 5);
  doc.text('Cuenta Clave: ' + bankInfo.clabe, 20, yText + 10);

  doc.setFont(undefined, 'bold');
  doc.text('Referencia Obligatoria: ' + referenciaPago, 105, yText + 10);

  const nombreArchivo = `Orden_Pago_${ordenId}_${today.replace(/\//g, '-')}.pdf`;
  doc.save(nombreArchivo);
};

export const generarPDFCuota = async ({
  ordenId,
  user = {},
  bankInfo = DEFAULT_BANK_INFO,
  catalogoAfiliaciones = [],
  catalogoSeguros = [],
  asignacionSeguros = {},
  total = 0,
  cantidadJugadores = 0,
  incluirPresidente = true,
  referenciaPago = null
}) => {
  const schoolOrClub = (
    user.NombreEquipo ||
    user.equipo ||
    user.usuario?.nombre ||
    user.usuario?.Nombre ||
    user.Nombre ||
    user.NombreUsuario ||
    'N/A'
  ).toUpperCase().trim();

  const concepts = [];
  catalogoSeguros.forEach((seg) => {
    const cantidad = Number(asignacionSeguros[seg.id] || asignacionSeguros[String(seg.id)] || 0);
    if (cantidad > 0) {
      const subtotal = Number(seg.precio || 0) * cantidad;
      concepts.push({
        concepto: `${seg.nombre} (x${cantidad})`,
        importe: subtotal
      });
    }
  });

  if (concepts.length === 0) {
    concepts.push({
      concepto: 'ABONO A CUENTA DE LA ASOCIACION',
      importe: total
    });
  }

  const refFinal = referenciaPago || bankInfo.referencia || 'N/A';

  await renderOrdenPagoPDF({
    ordenId,
    schoolOrClub,
    concepts,
    total,
    bankInfo,
    referenciaPago: refFinal
  });
};

export const generarPDFOrdenPagoJugador = async ({
  ordenId,
  cantidadJugadores = 1,
  bankInfo = DEFAULT_BANK_INFO,
  catalogoSeguros = [],
  asignacionSeguros = {},
  total = 0,
  referenciaPago = null,
  user = {}
}) => {
  const schoolOrClub = (
    user.NombreEquipo ||
    user.equipo ||
    user.usuario?.nombre ||
    user.usuario?.Nombre ||
    user.Nombre ||
    user.NombreUsuario ||
    'N/A'
  ).toUpperCase().trim();

  const concepts = [];
  catalogoSeguros.forEach((seg) => {
    const cantidad = Number(asignacionSeguros[seg.id] || asignacionSeguros[String(seg.id)] || 0);
    if (cantidad > 0) {
      const subtotal = Number(seg.precio || 0) * cantidad;
      concepts.push({
        concepto: `${seg.nombre} (x${cantidad})`,
        importe: subtotal
      });
    }
  });

  if (concepts.length === 0) {
    concepts.push({
      concepto: `Pago de jugadores (x${cantidadJugadores})`,
      importe: total
    });
  }

  const refFinal = referenciaPago || bankInfo.referencia || 'N/A';

  await renderOrdenPagoPDF({
    ordenId,
    schoolOrClub,
    concepts,
    total,
    bankInfo,
    referenciaPago: refFinal
  });
};

