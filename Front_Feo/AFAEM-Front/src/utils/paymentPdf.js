import { jsPDF } from 'jspdf';

export const DEFAULT_BANK_INFO = {
  banco: 'BBVA Mexico',
  titular: 'Asociacion Deportiva Estatal AC',
  cuenta: '0123456789 01',
  clabe: '012 180 0001234567 89',
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
  incluirPresidente = true
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
  doc.text(`Nombre: ${user.Nombre || user.NombreUsuario || 'N/A'}`, margin, yPosition);
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
  yPosition += 8;
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text(`Referencia obligatoria: ${bankInfo.referencia}`, margin, yPosition, { maxWidth: contentWidth });
  yPosition += 12;

  doc.setFontSize(12);
  doc.setTextColor(11, 78, 166);
  doc.text('DESGLOSE DE CUOTA', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const presidenteAf = catalogoAfiliaciones.find((a) => a.TipoAfiliacionId === 2);
  const jugadorAf = catalogoAfiliaciones.find((a) => a.TipoAfiliacionId === 4);

  if (incluirPresidente && presidenteAf) {
    const subtotal = Number(presidenteAf.CostoActual || 0);
    doc.text(`${presidenteAf.NombreAfiliacion} (x1)`, margin, yPosition);
    doc.text(formatCurrency(subtotal), pageWidth - margin - 30, yPosition);
    yPosition += 6;
  }

  if (jugadorAf && Number(cantidadJugadores) > 0) {
    const subtotal = Number(jugadorAf.CostoActual || 0) * Number(cantidadJugadores || 0);
    doc.text(`${jugadorAf.NombreAfiliacion} (x${Number(cantidadJugadores)})`, margin, yPosition);
    doc.text(formatCurrency(subtotal), pageWidth - margin - 30, yPosition);
    yPosition += 6;
  }

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
  doc.text('Por favor, incluye la referencia obligatoria en tu transferencia bancaria.', margin, yPosition, { maxWidth: contentWidth });
  yPosition += 6;
  doc.text('Una vez realizado el pago, sube el comprobante en la plataforma para procesar tu registro.', margin, yPosition, { maxWidth: contentWidth });

  const nombreArchivo = `Cuota_AFAEM_${ordenId}_${today.replace(/\//g, '-')}.pdf`;
  doc.save(nombreArchivo);
};
