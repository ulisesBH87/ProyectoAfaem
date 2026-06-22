import { jsPDF } from 'jspdf';

export const DEFAULT_BANK_INFO = {
  banco: 'SANTANDER',
  titular: 'AFAEM ASOCIACIÓN DE FÚTBOL AMATEUR DEL ESTADO AC',
  cuenta: '65 50917824-5',
  clabe: '0145 4065 5091 7824 58',
  tarjeta: '5579 0890 0364 2694',
  referencia: 'RHX-CL26-001'
};

const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export const generarPDFCuota = ({
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const today = new Date().toLocaleDateString('es-MX');

  doc.setFontSize(16);
  doc.setTextColor(11, 78, 166);
  doc.text('FICHA DE PAGO - AFAEM', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Numero de Orden: ${ordenId}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.text(`Fecha: ${today}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

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
  if (bankInfo.tarjeta) {
    doc.text(`Tarjeta: ${bankInfo.tarjeta}`, margin, yPosition);
    yPosition += 6;
  }
  const refFinal = referenciaPago || bankInfo.referencia || 'N/A';
  doc.text(`Referencia Obligatoria: ${refFinal}`, margin, yPosition);
  yPosition += 6;
  yPosition += 2;

  doc.setFontSize(12);
  doc.setTextColor(11, 78, 166);
  doc.text('DESGLOSE DE CUOTA', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  // Afiliaciones (Omitidas del PDF según requerimiento)

  catalogoSeguros.forEach((seg) => {
    const cantidad = Number(asignacionSeguros[seg.id] || asignacionSeguros[String(seg.id)] || 0);
    if (cantidad <= 0) return;

    const subtotal = Number(seg.precio || 0) * cantidad;
    doc.text(`${seg.nombre} (x${cantidad})`, margin, yPosition);
    doc.text(formatCurrency(subtotal), pageWidth - margin - 30, yPosition);
    yPosition += 6;
  });

  yPosition += 2;
  doc.setDrawColor(11, 78, 166);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  doc.setFontSize(12);
  doc.setTextColor(11, 78, 166);
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL A PAGAR:', margin, yPosition);
  doc.text(formatCurrency(total), pageWidth - margin - 30, yPosition);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');
  yPosition += 6;
  doc.text('Por favor, incluye la referencia obligatoria en tu transferencia bancaria.', margin, yPosition, { maxWidth: contentWidth });
  yPosition += 6;
  doc.text('Una vez realizado el pago, sube el comprobante en la plataforma para procesar tu registro. Recuerda que el comprobante de pago debe tener la referencia obligatoria para que sea procesado.', margin, yPosition, { maxWidth: contentWidth });

  const nombreArchivo = `Cuota_AFAEM_${ordenId}_${today.replace(/\//g, '-')}.pdf`;
  doc.save(nombreArchivo);
};

export const generarPDFOrdenPagoJugador = ({
  ordenId,
  cantidadJugadores = 1,
  bankInfo = DEFAULT_BANK_INFO,
  catalogoSeguros = [],
  asignacionSeguros = {},
  total = 0,
  referenciaPago = null,
  user = {}
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const today = new Date().toLocaleDateString('es-MX');

  doc.setFontSize(16);
  doc.setTextColor(11, 78, 166);
  doc.text('ORDEN DE PAGO - AFAEM', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Número de Orden: ${ordenId}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.text(`Fecha de Emisión: ${today}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Datos del Usuario/Solicitante
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

  doc.setFontSize(12);
  doc.setTextColor(11, 78, 166);
  doc.text('DATOS DE LA ORDEN', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Jugador(es): Por asignar (x${cantidadJugadores})`, margin, yPosition);
  yPosition += 6;
  doc.text(`Concepto: Pago de jugadores`, margin, yPosition);
  yPosition += 10;

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
  if (bankInfo.tarjeta) {
    doc.text(`Tarjeta: ${bankInfo.tarjeta}`, margin, yPosition);
    yPosition += 6;
  }
  const refFinal = referenciaPago || bankInfo.referencia || 'N/A';
  doc.text(`Referencia Obligatoria: ${refFinal}`, margin, yPosition);
  yPosition += 6;
  yPosition += 10;

  doc.setFontSize(12);
  doc.setTextColor(11, 78, 166);
  doc.text('DESGLOSE DE CONCEPTOS', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  catalogoSeguros.forEach((seg) => {
    const cantidad = Number(asignacionSeguros[seg.id] || asignacionSeguros[String(seg.id)] || 0);
    if (cantidad <= 0) return;

    const subtotal = Number(seg.precio || 0) * cantidad;
    doc.text(`${seg.nombre} (x${cantidad})`, margin, yPosition);
    doc.text(formatCurrency(subtotal), pageWidth - margin - 30, yPosition);
    yPosition += 6;
  });

  yPosition += 2;
  doc.setDrawColor(11, 78, 166);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  doc.setFontSize(12);
  doc.setTextColor(11, 78, 166);
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL A PAGAR:', margin, yPosition);
  doc.text(formatCurrency(total), pageWidth - margin - 30, yPosition);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');
  yPosition += 6;
  doc.text('Por favor, incluye la referencia obligatoria en tu transferencia bancaria.', margin, yPosition, { maxWidth: contentWidth });
  yPosition += 6;
  doc.text('Una vez realizado el pago, sube el comprobante en la plataforma para procesar tu registro. Recuerda que el comprobante de pago debe tener la referencia obligatoria para que sea procesado.', margin, yPosition, { maxWidth: contentWidth });

  const nombreArchivo = `Orden_Pago_${ordenId}_${today.replace(/\//g, '-')}.pdf`;
  doc.save(nombreArchivo);
};
