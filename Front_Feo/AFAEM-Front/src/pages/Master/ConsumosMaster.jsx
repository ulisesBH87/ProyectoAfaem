import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { createPortal } from 'react-dom';
import {
  FaCoins,
  FaFileAlt,
  FaUserCheck,
  FaUserTie,
  FaDatabase,
  FaFutbol,
  FaRedo,
  FaFilter,
  FaSearch,
  FaReceipt,
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaDownload
} from 'react-icons/fa';

import Loader from '../../components/Loader';
import { COLORS } from '../../styles/colors';
import {
  getConsumoResumen,
  getConsumoLedger,
  getConsumoAuditoria,
  getConsumoTarifas,
  updateConsumoTarifa
} from '../../services/admin';

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" }
];

const ANIOS = [2025, 2026, 2027, 2028, 2029];

const SERVICE_ORDER = ['OCR', 'PHOTO_SCAN', 'VERIFICAMEX'];
const PDF_SCAN_ALERTS = {
  OCR: 8,
  PHOTO_SCAN: 5,
  VERIFICAMEX: 3
};
const SERVICE_TITLES = {
  OCR: 'Escaneo OCR',
  PHOTO_SCAN: 'Escaneo Fotografía',
  VERIFICAMEX: 'VerificaMEX'
};

const formatCurrency = (amount, currency) => {
  const value = Number(amount || 0);
  return `${value.toFixed(currency === 'USD' ? 4 : 2)} ${currency}`;
};

const formatDateLabel = (value) => {
  if (!value) return '-';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const getProviderDisplayName = (serviceType, provider) => {
  if (serviceType === 'PHOTO_SCAN' && (provider || '').toUpperCase() === 'DEFAULT') {
    return 'PHOTO SCAN';
  }
  return provider || 'DEFAULT';
};

const buildServiceSummary = (resumen) => {
  const tarifas = resumen?.tarifas || [];
  const operaciones = resumen?.operaciones_por_servicio || {};
  const costos = resumen?.costo_por_operacion || {};
  const knownServices = [...new Set([
    ...tarifas.map((tar) => tar.tipo_consumo),
    ...Object.keys(operaciones),
    ...Object.keys(costos)
  ])];

  return knownServices
    .map((tipo) => {
      const tarifa = tarifas.find((tar) => tar.tipo_consumo === tipo);
      return {
        tipo,
        proveedor: getProviderDisplayName(tipo, tarifa?.proveedor || 'DEFAULT'),
        cantidad: operaciones[tipo] || 0,
        costo: costos[tipo] || 0,
        divisa: tarifa?.divisa || 'MXN',
        descripcion: tarifa?.descripcion || ''
      };
    })
    .sort((a, b) => SERVICE_ORDER.indexOf(a.tipo) - SERVICE_ORDER.indexOf(b.tipo));
};

const renderModalPortal = (content) => {
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

const formatPdfCell = (text, options = {}) => ({
  text: String(text ?? ''),
  ...options
});

const sortReportRows = (rows) => {
  return [...rows].sort((a, b) => {
    const mxnDiff = Number(b?.costo_total_mxn || 0) - Number(a?.costo_total_mxn || 0);
    if (mxnDiff !== 0) {
      return mxnDiff;
    }

    const usdDiff = Number(b?.costo_total_usd || 0) - Number(a?.costo_total_usd || 0);
    if (usdDiff !== 0) {
      return usdDiff;
    }

    const totalOpsA =
      Number(a?.ocr_count || 0) +
      Number(a?.foto_count || 0) +
      Number(a?.verificamex_count || 0);
    const totalOpsB =
      Number(b?.ocr_count || 0) +
      Number(b?.foto_count || 0) +
      Number(b?.verificamex_count || 0);

    return totalOpsB - totalOpsA;
  });
};

export default function ConsumosMaster() {
  const [mesSeleccionado, setMesSeleccionado] = useState(() => new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => new Date().getFullYear());

  const [consumoResumen, setConsumoResumen] = useState(null);
  const [consumoLedger, setConsumoLedger] = useState([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerSize] = useState(10);

  const [loadingConsumo, setLoadingConsumo] = useState(false);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [filtroTipoConsumo, setFiltroTipoConsumo] = useState('');
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState('');
  const [filtroEsCobrable, setFiltroEsCobrable] = useState('todos');

  // Estados para Tarifas
  const [tarifas, setTarifas] = useState([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState(null);
  const [costoEdit, setCostoEdit] = useState('');
  const [divisaEdit, setDivisaEdit] = useState('MXN');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [estatusEdit, setEstatusEdit] = useState(true);
  const [submittingTarifa, setSubmittingTarifa] = useState(false);

  const [auditoriaData, setAuditoriaData] = useState({
    desglose_jugadores: [],
    desglose_directivos: [],
    desglose_equipos: [],
    desglose_ligas: []
  });

  const [searchJugador, setSearchJugador] = useState('');
  const [searchDirectivo, setSearchDirectivo] = useState('');
  const [searchEquipo, setSearchEquipo] = useState('');
  const [searchLiga, setSearchLiga] = useState('');
  const [showReporteModal, setShowReporteModal] = useState(false);
  const [reporteFechaInicio, setReporteFechaInicio] = useState('');
  const [reporteFechaFin, setReporteFechaFin] = useState('');
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const serviceCards = Object.values(
    buildServiceSummary(consumoResumen).reduce((acc, service) => {
      const rawType = String(service?.tipo || '').trim().toUpperCase();
      const normalizedType =
        rawType === 'PHOTO SCAN' ||
        rawType === 'ESCANEO FOTOGRAFÍA' ||
        rawType === 'ESCANEO FOTOGRAFIA' ||
        rawType === 'FOTOGRAFÍA' ||
        rawType === 'FOTOGRAFIA'
          ? 'PHOTO_SCAN'
        : rawType === 'VERIFICA MEX' ||
          rawType === 'VERIFICACIÓN CURP' ||
          rawType === 'VERIFICACION CURP' ||
          rawType === 'VERIFICACIÓN CURP/CIUDADANO' ||
          rawType === 'VERIFICACION CURP/CIUDADANO'
          ? 'VERIFICAMEX'
        : rawType === 'ESCANEO OCR'
          ? 'OCR'
        :
        rawType;

      if (!normalizedType) {
        return acc;
      }

      if (!acc[normalizedType]) {
        acc[normalizedType] = {
          ...service,
          tipo: normalizedType
        };
        return acc;
      }

      acc[normalizedType] = {
        ...acc[normalizedType],
        cantidad: Number(acc[normalizedType].cantidad || 0) + Number(service.cantidad || 0),
        costo: Number(acc[normalizedType].costo || 0) + Number(service.costo || 0),
        proveedor: (acc[normalizedType].proveedor && acc[normalizedType].proveedor !== 'DEFAULT')
          ? acc[normalizedType].proveedor
          : service.proveedor,
        divisa: acc[normalizedType].divisa || service.divisa,
        descripcion: acc[normalizedType].descripcion || service.descripcion
      };

      return acc;
    }, {})
  ).sort((a, b) => SERVICE_ORDER.indexOf(a.tipo) - SERVICE_ORDER.indexOf(b.tipo));

  // 1. Carga de Resumen Financiero y Ledger
  useEffect(() => {
    async function cargarConsumo() {
      setLoadingConsumo(true);
      try {
        const fechaInicio = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-01`;
        const ultimoDia = new Date(anioSeleccionado, mesSeleccionado, 0).getDate();
        const fechaFin = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-${ultimoDia}`;

        const resumenResp = await getConsumoResumen({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
        setConsumoResumen(resumenResp);

        const paramsLedger = {
          page: ledgerPage,
          size: ledgerSize,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        };
        if (filtroTipoConsumo) paramsLedger.tipo_consumo = filtroTipoConsumo;
        if (filtroTipoRegistro) paramsLedger.tipo_registro = filtroTipoRegistro;
        if (filtroEsCobrable === 'si') paramsLedger.es_cobrable = true;
        if (filtroEsCobrable === 'no') paramsLedger.es_cobrable = false;

        const ledgerResp = await getConsumoLedger(paramsLedger);
        setConsumoLedger(ledgerResp.data || []);
        setLedgerTotal(ledgerResp.total || 0);
      } catch (err) {
        console.error("Error al cargar datos de consumo:", err);
      } finally {
        setLoadingConsumo(false);
      }
    }
    cargarConsumo();
  }, [mesSeleccionado, anioSeleccionado, ledgerPage, filtroTipoConsumo, filtroTipoRegistro, filtroEsCobrable, refreshTrigger]);

  // 2. Carga de Auditoría de Escaneos Desglosados
  useEffect(() => {
    async function cargarAuditoria() {
      setLoadingAuditoria(true);
      try {
        const fechaInicio = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-01`;
        const ultimoDia = new Date(anioSeleccionado, mesSeleccionado, 0).getDate();
        const fechaFin = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-${ultimoDia}`;

        const data = await getConsumoAuditoria({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
        setAuditoriaData(data || { desglose_jugadores: [], desglose_directivos: [], desglose_equipos: [], desglose_ligas: [] });
      } catch (err) {
        console.error("Error al cargar datos de auditoría:", err);
      } finally {
        setLoadingAuditoria(false);
      }
    }
    cargarAuditoria();
  }, [mesSeleccionado, anioSeleccionado, refreshTrigger]);

  // 3. Carga de Catálogo de Tarifas
  useEffect(() => {
    async function cargarTarifas() {
      setLoadingTarifas(true);
      try {
        const data = await getConsumoTarifas();
        setTarifas(data || []);
      } catch (err) {
        console.error("Error al cargar catálogo de tarifas:", err);
      } finally {
        setLoadingTarifas(false);
      }
    }
    cargarTarifas();
  }, [refreshTrigger]);

  const handleOpenEdit = (tar) => {
    setEditingTarifa(tar);
    setCostoEdit(tar.CostoUnitario ?? tar.costo_unitario ?? 0);
    setDivisaEdit(tar.Divisa ?? tar.divisa ?? 'MXN');
    setDescripcionEdit(tar.Descripcion ?? tar.descripcion ?? '');
    setEstatusEdit(tar.Estatus !== undefined ? tar.Estatus : (tar.estatus !== undefined ? tar.estatus : true));
  };

  const handleSaveTarifa = async (e) => {
    e.preventDefault();
    if (!editingTarifa) return;

    setSubmittingTarifa(true);
    try {
      const id = editingTarifa.TarifaId || editingTarifa.tarifa_id;
      await updateConsumoTarifa(id, {
        CostoUnitario: parseFloat(costoEdit),
        Divisa: divisaEdit,
        Descripcion: descripcionEdit,
        Estatus: estatusEdit
      });
      setEditingTarifa(null);
      handleRecargar();
    } catch (err) {
      console.error("Error al guardar tarifa:", err);
      alert("No se pudo actualizar la tarifa. Intente nuevamente.");
    } finally {
      setSubmittingTarifa(false);
    }
  };

  const handleRecargar = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOpenReporte = () => {
    setReporteFechaInicio('');
    setReporteFechaFin('');
    setShowReporteModal(true);
  };

  const generarSeccionPdf = (doc, title, lines, y, color = '#0f172a') => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 16;
    const maxWidth = 178;

    if (y > pageHeight - 30) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(color);
    doc.text(title, marginX, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor('#334155');

    if (!lines.length) {
      doc.text('Sin registros para este periodo.', marginX, y);
      return y + 8;
    }

    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, maxWidth);
      if (y + wrapped.length * 5 > pageHeight - 16) {
        doc.addPage();
        y = 18;
      }
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 5 + 1;
    });

    return y + 3;
  };

  const generarTablaPdf = (doc, title, columns, rows, y, color = '#0f172a') => {
    const marginX = 16;
    const tableWidth = 178;
    const pageHeight = doc.internal.pageSize.getHeight();
    const rowPaddingY = 3;
    const minRowHeight = 8;

    if (y > pageHeight - 30) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(color);
    doc.text(title, marginX, y);
    y += 8;

    if (!rows.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor('#334155');
      doc.text('Sin registros para este periodo.', marginX, y);
      return y + 8;
    }

    const drawHeader = (currentY) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, currentY, tableWidth, 9, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, currentY, tableWidth, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.1);
      doc.setTextColor('#334155');

      let x = marginX;
      columns.forEach((column) => {
        const textX = column.align === 'right' ? x + column.width - 1.5 : x + 1.5;
        doc.text(column.header, textX, currentY + 5.6, {
          align: column.align === 'right' ? 'right' : 'left',
          baseline: 'middle'
        });
        x += column.width;
      });

      return currentY + 9;
    };

    y = drawHeader(y);

    rows.forEach((row, rowIndex) => {
      const preparedCells = columns.map((column) => {
        const rawValue = row[column.key];
        if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
          return {
            text: String(rawValue.text ?? ''),
            color: rawValue.color,
            fontStyle: rawValue.fontStyle,
            fontSize: rawValue.fontSize
          };
        }
        return { text: String(rawValue ?? '') };
      });

      const wrappedCells = preparedCells.map((cell, index) =>
        doc.splitTextToSize(cell.text, Math.max(columns[index].width - 3, 8))
      );
      const maxLines = Math.max(...wrappedCells.map((lines) => lines.length), 1);
      const rowHeight = Math.max(minRowHeight, maxLines * 4 + rowPaddingY * 2);

      if (y + rowHeight > pageHeight - 14) {
        doc.addPage();
        y = 18;
        y = drawHeader(y);
      }

      doc.setFillColor(rowIndex % 2 === 0 ? 255 : 248, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 252);
      doc.rect(marginX, y, tableWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, y, tableWidth, rowHeight);

      let x = marginX;
      columns.forEach((column, columnIndex) => {
        const cell = preparedCells[columnIndex];
        const textX = column.align === 'right' ? x + column.width - 1.5 : x + 1.5;
        doc.setFont('helvetica', cell.fontStyle || column.fontStyle || (column.emphasis ? 'bold' : 'normal'));
        doc.setFontSize(cell.fontSize || column.fontSize || 8);
        doc.setTextColor(cell.color || column.color || '#0f172a');
        doc.text(wrappedCells[columnIndex], textX, y + rowPaddingY + 3.2, {
          align: column.align === 'right' ? 'right' : 'left',
          baseline: 'top'
        });
        x += column.width;
      });

      y += rowHeight;
    });

    return y + 5;
  };

  const handleGenerarReporte = async () => {
    if (!reporteFechaInicio || !reporteFechaFin || reporteFechaInicio > reporteFechaFin) return;

    setGenerandoReporte(true);
    try {
      const params = { fecha_inicio: reporteFechaInicio, fecha_fin: reporteFechaFin };
      const [resumen, auditoria] = await Promise.all([
        getConsumoResumen(params),
        getConsumoAuditoria(params)
      ]);

      const serviceSummary = buildServiceSummary(resumen);
      const ligas = sortReportRows((auditoria?.desglose_ligas || []).map((liga) => ({
        nombre: liga.liga_nombre,
        ocr_count: liga.ocr_count,
        foto_count: liga.foto_count,
        verificamex_count: liga.verificamex_count,
        costo_total_usd: liga.costo_total_usd,
        costo_total_mxn: liga.costo_total_mxn
      })));
      const equipos = sortReportRows((auditoria?.desglose_equipos || []).map((equipo) => ({
        nombre: equipo.equipo_nombre,
        subtitulo: equipo.liga_nombre,
        ocr_count: equipo.ocr_count,
        foto_count: equipo.foto_count,
        verificamex_count: equipo.verificamex_count,
        costo_total_usd: equipo.costo_total_usd,
        costo_total_mxn: equipo.costo_total_mxn
      })));
      const personas = sortReportRows([
        ...(auditoria?.desglose_jugadores || []).map((item) => ({
          nombre: item.jugador_nombre,
          subtitulo: `${item.equipo_nombre} | ${item.liga_nombre}`,
          tipo: 'Jugador',
          ocr_count: item.ocr_count,
          foto_count: item.foto_count,
          verificamex_count: item.verificamex_count,
          costo_total_usd: item.costo_total_usd,
          costo_total_mxn: item.costo_total_mxn
        })),
        ...(auditoria?.desglose_directivos || []).map((item) => ({
          nombre: item.directivo_nombre,
          subtitulo: `${item.directivo_rol} | ${item.equipo_nombre} | ${item.liga_nombre}`,
          tipo: 'Presidente/Entrenador',
          ocr_count: item.ocr_count,
          foto_count: item.foto_count,
          verificamex_count: item.verificamex_count,
          costo_total_usd: item.costo_total_usd,
          costo_total_mxn: item.costo_total_mxn
        }))
      ]);

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      let y = 18;

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(12, 12, 186, 30, 4, 4, 'F');
      doc.setTextColor('#ffffff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Reporte de consumos', 16, 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Periodo: ${formatDateLabel(reporteFechaInicio)} al ${formatDateLabel(reporteFechaFin)}`, 16, 31);
      y = 52;

      doc.setTextColor('#0f172a');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Resumen general', 16, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      [
        `Consumo total: ${resumen?.total_operaciones ?? 0} operaciones`,
        `Consumo en USD: ${formatCurrency(resumen?.costo_total_usd, 'USD')}`,
        `Consumo en MXN: ${formatCurrency(resumen?.costo_total_mxn, 'MXN')}`
      ].forEach((line) => {
        doc.text(line, 16, y);
        y += 6;
      });

      y = generarSeccionPdf(
        doc,
        'Costo por servicio',
        serviceSummary.map((service) =>
          `${service.tipo}: ${service.cantidad} operaciones | ${formatCurrency(service.costo, service.divisa)} | Proveedor ${service.proveedor}`
        ),
        y + 3,
        '#0b4ea6'
      );

      y = generarTablaPdf(
        doc,
        'Costo por ligas',
        [
          { key: 'nombre', header: 'Liga', width: 62, emphasis: true, fontSize: 8.4 },
          { key: 'ocr', header: 'OCR', width: 14, align: 'right' },
          { key: 'foto', header: 'Foto', width: 14, align: 'right' },
          { key: 'vm', header: 'VM', width: 14, align: 'right' },
          { key: 'usd', header: 'Costo USD', width: 34, align: 'right' },
          { key: 'mxn', header: 'Costo MXN', width: 40, align: 'right' }
        ],
        ligas.map((liga) => ({
          nombre: liga.nombre,
          ocr: liga.ocr_count,
          foto: liga.foto_count,
          vm: liga.verificamex_count,
          usd: formatCurrency(liga.costo_total_usd, 'USD'),
          mxn: formatCurrency(liga.costo_total_mxn, 'MXN')
        })),
        y,
        '#059669'
      );

      y = generarTablaPdf(
        doc,
        'Costo por equipos',
        [
          { key: 'equipo', header: 'Equipo', width: 52, emphasis: true, fontSize: 8.2 },
          { key: 'liga', header: 'Liga', width: 38, fontSize: 8 },
          { key: 'ocr', header: 'OCR', width: 12, align: 'right' },
          { key: 'foto', header: 'Foto', width: 12, align: 'right' },
          { key: 'vm', header: 'VM', width: 12, align: 'right' },
          { key: 'usd', header: 'Costo USD', width: 24, align: 'right' },
          { key: 'mxn', header: 'Costo MXN', width: 28, align: 'right' }
        ],
        equipos.map((equipo) => ({
          equipo: equipo.nombre,
          liga: equipo.subtitulo,
          ocr: equipo.ocr_count,
          foto: equipo.foto_count,
          vm: equipo.verificamex_count,
          usd: formatCurrency(equipo.costo_total_usd, 'USD'),
          mxn: formatCurrency(equipo.costo_total_mxn, 'MXN')
        })),
        y,
        '#d97706'
      );

      y = generarTablaPdf(
        doc,
        'Jugadores y presidente/entrenador',
        [
          { key: 'tipo', header: 'Tipo', width: 26, fontSize: 7.8 },
          { key: 'nombre', header: 'Nombre', width: 38, emphasis: true, fontSize: 8 },
          { key: 'detalle', header: 'Equipo / Liga / Rol', width: 48, fontSize: 7.7 },
          { key: 'ocr', header: 'OCR', width: 12, align: 'right' },
          { key: 'foto', header: 'Foto', width: 12, align: 'right' },
          { key: 'vm', header: 'VM', width: 12, align: 'right' },
          { key: 'usd', header: 'USD', width: 14, align: 'right', fontSize: 7.4 },
          { key: 'mxn', header: 'MXN', width: 16, align: 'right', fontSize: 7.4 }
        ],
        personas.map((persona) => ({
          tipo: persona.tipo,
          nombre: persona.nombre,
          detalle: persona.subtitulo,
          ocr: formatPdfCell(persona.ocr_count, {
            color: Number(persona.ocr_count || 0) >= PDF_SCAN_ALERTS.OCR ? '#dc2626' : undefined,
            fontStyle: Number(persona.ocr_count || 0) >= PDF_SCAN_ALERTS.OCR ? 'bold' : undefined
          }),
          foto: formatPdfCell(persona.foto_count, {
            color: Number(persona.foto_count || 0) >= PDF_SCAN_ALERTS.PHOTO_SCAN ? '#dc2626' : undefined,
            fontStyle: Number(persona.foto_count || 0) >= PDF_SCAN_ALERTS.PHOTO_SCAN ? 'bold' : undefined
          }),
          vm: formatPdfCell(persona.verificamex_count, {
            color: Number(persona.verificamex_count || 0) >= PDF_SCAN_ALERTS.VERIFICAMEX ? '#dc2626' : undefined,
            fontStyle: Number(persona.verificamex_count || 0) >= PDF_SCAN_ALERTS.VERIFICAMEX ? 'bold' : undefined
          }),
          usd: formatCurrency(persona.costo_total_usd, 'USD'),
          mxn: formatCurrency(persona.costo_total_mxn, 'MXN')
        })),
        y,
        '#8b5cf6'
      );

      doc.save(`reporte-consumos-${reporteFechaInicio}-a-${reporteFechaFin}.pdf`);
      setShowReporteModal(false);
    } catch (error) {
      console.error('Error al generar reporte PDF:', error);
      alert('No se pudo generar el reporte PDF. Intente nuevamente.');
    } finally {
      setGenerandoReporte(false);
    }
  };

  // Paleta de colores Premium
  const colorPrimary = COLORS.brandBlueLight;
  const colorSuccess = COLORS.success;
  const colorWarning = COLORS.warning;
  const colorDanger = COLORS.danger;
  const colorInfo = COLORS.violet;

  const getServiceIcon = (tipo) => {
    switch (tipo) {
      case 'OCR':
        return <FaFileAlt />;
      case 'PHOTO_SCAN':
        return <FaUsers />;
      case 'VERIFICAMEX':
        return <FaUserCheck />;
      default:
        return <FaDatabase />;
    }
  };

  const getServiceColor = (tipo) => {
    switch (tipo) {
      case 'OCR':
        return colorInfo;
      case 'PHOTO_SCAN':
        return colorWarning;
      case 'VERIFICAMEX':
        return colorDanger;
      default:
        return colorPrimary;
    }
  };

  const getServiceBg = (tipo) => {
    switch (tipo) {
      case 'OCR':
        return COLORS.violetTranslucent15;
      case 'PHOTO_SCAN':
        return COLORS.warningBgTranslucent;
      case 'VERIFICAMEX':
        return COLORS.dangerBgTranslucent;
      default:
        return COLORS.brandBlueLight16;
    }
  };

  return (
    <div className="fade-in" style={{ padding: '20px', color: COLORS.slate700, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: COLORS.black, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          <FaCoins style={{ color: colorSuccess, filter: `drop-shadow(0 0 10px ${COLORS.successBgTranslucent30})` }} /> Panel de Consumos
        </h1>
        <p style={{ color: COLORS.slate500, fontWeight: '500', fontSize: '15px' }}>
          Monitoreo detallado de escaneos, validación de documentos y costos de API integrados.
        </p>
      </div>

      {/* FILTRO PERIODO COMPARTIDO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.black, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Consumo del Período
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="select-mes-filtro" style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Filtrar por:
          </label>
          <select
            id="select-mes-filtro"
            value={mesSeleccionado}
            onChange={(e) => {
              setMesSeleccionado(parseInt(e.target.value, 10));
              setLedgerPage(1);
            }}
            style={{
              background: COLORS.white,
              border: `1.5px solid ${COLORS.slate300}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: COLORS.slate900,
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            id="select-anio-filtro"
            value={anioSeleccionado}
            onChange={(e) => {
              setAnioSeleccionado(parseInt(e.target.value, 10));
              setLedgerPage(1);
            }}
            style={{
              background: COLORS.white,
              border: `1.5px solid ${COLORS.slate300}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: COLORS.slate900,
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {ANIOS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleRecargar}
            title="Recargar datos del período"
            disabled={loadingConsumo || loadingAuditoria}
            style={{
              background: COLORS.white,
              border: `1.5px solid ${COLORS.slate300}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: COLORS.slate700,
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = colorPrimary; e.currentTarget.style.color = colorPrimary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.slate300; e.currentTarget.style.color = COLORS.slate700; }}
          >
            <FaRedo size={12} style={{ transition: 'transform 0.5s ease', transform: (loadingConsumo || loadingAuditoria) ? 'rotate(360deg)' : 'none' }} /> Recargar
          </button>

          <button
            onClick={handleOpenReporte}
            title="Abrir generador de reporte"
            style={{
              background: COLORS.slate900,
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              color: COLORS.white,
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colorPrimary; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = COLORS.slate900; }}
          >
            <FaDownload size={12} /> Reporte
          </button>
        </div>
      </div>

      {/* KPI ACUMULADOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Operaciones */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Consumos</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingConsumo ? '...' : (consumoResumen?.total_operaciones ?? 0)}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>Operaciones totales</div>
          </div>
        </div>

        {/* Costo Total USD */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Costo USD Acumulado</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingConsumo ? '...' : (consumoResumen?.costo_total_usd ?? 0).toFixed(4)}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>Dólares Americanos (USD)</div>
          </div>
        </div>

        {/* Costo Total MXN */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Costo MXN Acumulado</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingConsumo ? '...' : (consumoResumen?.costo_total_mxn ?? 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>Pesos Mexicanos (MXN)</div>
          </div>
        </div>
      </div>

      {/* DOS COLUMNAS: UNIDADES Y COSTOS POR SERVICIO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Consumo por servicio (unidades) */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Consumos por Servicio (Unidades)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {serviceCards && serviceCards.length > 0 ? (
              serviceCards.map((service, idx) => {
                const icon = getServiceIcon(service.tipo);
                const color = getServiceColor(service.tipo);
                const bg = getServiceBg(service.tipo);
                const count = service.cantidad ?? 0;

                return (
                  <div key={idx} style={{ background: COLORS.slate50, border: `1px solid ${COLORS.slate200}`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{SERVICE_TITLES[service.tipo] || service.tipo}</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>{loadingConsumo ? '...' : count}</div>
                      <div style={{ fontSize: '11px', color: COLORS.slate400 }}>{count === 1 ? 'Unidad' : 'Unidades'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '12px', color: COLORS.slate500, fontStyle: 'italic' }}>Cargando unidades...</div>
            )}
          </div>
        </div>

        {/* Costo por servicio (acumulado) */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Costos por Servicio (Acumulado del Periodo)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {serviceCards && serviceCards.length > 0 ? (
              serviceCards.map((service, idx) => {
                const icon = getServiceIcon(service.tipo);
                const color = getServiceColor(service.tipo);
                const bg = getServiceBg(service.tipo);
                const cost = service.costo ?? 0.0;
                const decimalPlaces = service.divisa === 'USD' ? 4 : 2;

                return (
                  <div key={idx} style={{ background: COLORS.slate50, border: `1px solid ${COLORS.slate200}`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Costo {SERVICE_TITLES[service.tipo] || service.tipo}</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>{loadingConsumo ? '...' : cost.toFixed(decimalPlaces)}</div>
                      <div style={{ fontSize: '11px', color: COLORS.slate400, fontWeight: '700' }}>{service.divisa}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '12px', color: COLORS.slate500, fontStyle: 'italic' }}>Cargando costos...</div>
            )}
          </div>
        </div>
      </div>

      {/* TARIFAS DE SERVICIOS ACTIVO */}
      <div style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', padding: '20px 24px', marginBottom: '32px', boxShadow: 'var(--shadow-sm)' }}>
        <h4 style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Catálogo de Tarifas y Costos Unitarios
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {loadingTarifas ? (
            <div style={{ fontSize: '12px', color: COLORS.slate500, fontStyle: 'italic' }}>Cargando tarifas...</div>
          ) : tarifas && tarifas.length > 0 ? (
            tarifas.map((tar, idx) => (
              <div key={idx} style={{
                background: COLORS.slate50,
                border: `1px solid ${COLORS.slate200}`,
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {tar.TipoConsumo || tar.tipo_consumo}
                    </span>
                    <h5 style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '700', color: COLORS.slate700 }}>
                      Proveedor: <span style={{ color: COLORS.slate900 }}>{getProviderDisplayName(tar.TipoConsumo || tar.tipo_consumo, tar.Proveedor || tar.proveedor)}</span>
                    </h5>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    backgroundColor: (tar.Estatus ?? tar.estatus) ? COLORS.successBgTranslucent : COLORS.dangerBgTranslucent,
                    color: (tar.Estatus ?? tar.estatus) ? COLORS.success : COLORS.danger
                  }}>
                    {(tar.Estatus ?? tar.estatus) ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '11px', color: COLORS.slate500, lineHeight: '1.4' }}>
                  {tar.Descripcion || tar.descripcion || 'Sin descripción disponible.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: `1px solid ${COLORS.slate200}`, paddingTop: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase' }}>Costo Unitario</span>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: COLORS.slate900 }}>
                      {parseFloat(tar.CostoUnitario ?? tar.costo_unitario).toFixed(4)} <span style={{ fontSize: '11px', color: COLORS.slate500, fontWeight: '700' }}>{tar.Divisa || tar.divisa}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(tar)}
                    style={{
                      background: colorPrimary,
                      color: COLORS.white,
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.brandBlueLight80}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colorPrimary}
                  >
                    Editar Tarifa
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '12px', color: COLORS.slate500, fontStyle: 'italic' }}>No hay tarifas registradas.</div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN AUDITORÍAS DETALLADAS (JUGADORES, DIRECTIVOS, EQUIPOS, LIGAS)   */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: COLORS.black, marginBottom: '16px', borderBottom: `2.5px solid ${COLORS.slate200}`, paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Desglose Detallado de Auditoría de Escaneos
        </h2>

        {loadingAuditoria ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader text="Generando auditoría de consumos..." />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* 1. SECCIÓN JUGADORES */}
            <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.slate800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Auditoría de Escaneos por Jugador
                </h4>
                <div style={{ position: 'relative', width: '300px' }}>
                  <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.slate400, fontSize: '13px' }} />
                  <input
                    type="text"
                    placeholder="Buscar por jugador o ejecutor..."
                    value={searchJugador}
                    onChange={(e) => setSearchJugador(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      background: COLORS.slate50,
                      border: `1.5px solid ${COLORS.slate200}`,
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: COLORS.slate900,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${COLORS.slate200}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: COLORS.slate100, borderBottom: `2px solid ${COLORS.slate200}` }}>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px' }}>Ejecutor</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px' }}>Jugador Objetivo</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px' }}>Equipo / Liga</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>OCR</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Foto</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>VerificaMex</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>Costo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoriaData.desglose_jugadores && auditoriaData.desglose_jugadores.length > 0 ? (
                      auditoriaData.desglose_jugadores
                        .filter(j =>
                          j.ejecutor_nombre.toLowerCase().includes(searchJugador.toLowerCase()) ||
                          j.jugador_nombre.toLowerCase().includes(searchJugador.toLowerCase()) ||
                          j.jugador_curp.toLowerCase().includes(searchJugador.toLowerCase()) ||
                          j.equipo_nombre.toLowerCase().includes(searchJugador.toLowerCase())
                        )
                        .map((j, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.slate100}`, transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.slate50} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <td style={{ padding: '12px 16px', fontWeight: '700', color: COLORS.slate950 }}>
                              <div>{j.ejecutor_nombre}</div>
                              <div style={{ fontSize: '10px', color: colorPrimary, fontWeight: '800' }}>{j.ejecutor_rol}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: '700', color: COLORS.slate800 }}>{j.jugador_nombre}</div>
                              <div style={{ fontSize: '11px', color: COLORS.slate500, fontFamily: 'Consolas, monospace' }}>{j.jugador_curp}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: '600', color: COLORS.slate800 }}>{j.equipo_nombre}</div>
                              <div style={{ fontSize: '11px', color: COLORS.slate500 }}>{j.liga_nombre}</div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '800', color: colorInfo }}>{j.ocr_count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '800', color: colorSuccess }}>{j.foto_count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '800', color: colorWarning }}>{j.verificamex_count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800' }}>
                              {j.costo_total_usd > 0 && <div style={{ color: colorSuccess }}>{j.costo_total_usd.toFixed(4)} USD</div>}
                              {j.costo_total_mxn > 0 && <div style={{ color: colorPrimary }}>{j.costo_total_mxn.toFixed(2)} MXN</div>}
                              {j.costo_total_usd === 0 && j.costo_total_mxn === 0 && <span style={{ color: COLORS.slate400 }}>$0.00</span>}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: COLORS.slate500, fontStyle: 'italic' }}>
                          No hay registros de escaneos para este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. SECCIÓN DIRECTIVOS */}
            <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.slate800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Auditoría de Escaneos por Presidente / Entrenador
                </h4>
                <div style={{ position: 'relative', width: '300px' }}>
                  <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.slate400, fontSize: '13px' }} />
                  <input
                    type="text"
                    placeholder="Buscar por directivo o ejecutor..."
                    value={searchDirectivo}
                    onChange={(e) => setSearchDirectivo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      background: COLORS.slate50,
                      border: `1.5px solid ${COLORS.slate200}`,
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: COLORS.slate900,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${COLORS.slate200}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: COLORS.slate100, borderBottom: `2px solid ${COLORS.slate200}` }}>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px' }}>Ejecutor</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px' }}>Directivo Objetivo</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px' }}>Equipo / Liga</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>OCR</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Foto</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>VerificaMex</th>
                      <th style={{ padding: '12px 16px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>Costo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoriaData.desglose_directivos && auditoriaData.desglose_directivos.length > 0 ? (
                      auditoriaData.desglose_directivos
                        .filter(d =>
                          d.ejecutor_nombre.toLowerCase().includes(searchDirectivo.toLowerCase()) ||
                          d.directivo_nombre.toLowerCase().includes(searchDirectivo.toLowerCase()) ||
                          d.directivo_curp.toLowerCase().includes(searchDirectivo.toLowerCase()) ||
                          d.equipo_nombre.toLowerCase().includes(searchDirectivo.toLowerCase())
                        )
                        .map((d, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.slate100}`, transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.slate50} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <td style={{ padding: '12px 16px', fontWeight: '700', color: COLORS.slate950 }}>
                              <div>{d.ejecutor_nombre}</div>
                              <div style={{ fontSize: '10px', color: colorPrimary, fontWeight: '800' }}>{d.ejecutor_rol}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: '700', color: COLORS.slate800 }}>{d.directivo_nombre}</div>
                              <div style={{ fontSize: '11px', color: COLORS.slate500, fontFamily: 'Consolas, monospace' }}>{d.directivo_curp}</div>
                              <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: COLORS.slate100, fontSize: '9px', fontWeight: '800', color: colorPrimary, marginTop: '4px' }}>
                                {d.directivo_rol}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: '600', color: COLORS.slate800 }}>{d.equipo_nombre}</div>
                              <div style={{ fontSize: '11px', color: COLORS.slate500 }}>{d.liga_nombre}</div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '800', color: colorInfo }}>{d.ocr_count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '800', color: colorSuccess }}>{d.foto_count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '800', color: colorWarning }}>{d.verificamex_count}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800' }}>
                              {d.costo_total_usd > 0 && <div style={{ color: colorSuccess }}>{d.costo_total_usd.toFixed(4)} USD</div>}
                              {d.costo_total_mxn > 0 && <div style={{ color: colorPrimary }}>{d.costo_total_mxn.toFixed(2)} MXN</div>}
                              {d.costo_total_usd === 0 && d.costo_total_mxn === 0 && <span style={{ color: COLORS.slate400 }}>$0.00</span>}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: COLORS.slate500, fontStyle: 'italic' }}>
                          No hay registros de escaneos de directivos para este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. DOS COLS: EQUIPOS Y LIGAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>

              {/* SECCIÓN EQUIPOS */}
              <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.slate800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Consumo por Equipo
                  </h4>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.slate400, fontSize: '13px' }} />
                    <input
                      type="text"
                      placeholder="Buscar equipo..."
                      value={searchEquipo}
                      onChange={(e) => setSearchEquipo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 12px 6px 36px',
                        background: COLORS.slate50,
                        border: `1.5px solid ${COLORS.slate200}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: COLORS.slate900,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${COLORS.slate200}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: COLORS.slate100, borderBottom: `2px solid ${COLORS.slate200}` }}>
                        <th style={{ padding: '10px 14px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '10px' }}>Equipo / Liga</th>
                        <th style={{ padding: '10px 14px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '10px', textAlign: 'center' }}>OCR / Foto / VM</th>
                        <th style={{ padding: '10px 14px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '10px', textAlign: 'right' }}>Total Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditoriaData.desglose_equipos && auditoriaData.desglose_equipos.length > 0 ? (
                        auditoriaData.desglose_equipos
                          .filter(e => e.equipo_nombre.toLowerCase().includes(searchEquipo.toLowerCase()))
                          .map((e, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.slate100}`, transition: 'background 0.2s' }} onMouseOver={(el) => el.currentTarget.style.backgroundColor = COLORS.slate50} onMouseOut={(el) => el.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ fontWeight: '700', color: COLORS.slate800 }}>{e.equipo_nombre}</div>
                                <div style={{ fontSize: '11px', color: COLORS.slate500 }}>{e.liga_nombre}</div>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700' }}>
                                <span style={{ color: colorInfo }}>{e.ocr_count}</span>{' / '}
                                <span style={{ color: colorSuccess }}>{e.foto_count}</span>{' / '}
                                <span style={{ color: colorWarning }}>{e.verificamex_count}</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800' }}>
                                {e.costo_total_usd > 0 && <div style={{ color: colorSuccess }}>{e.costo_total_usd.toFixed(4)} USD</div>}
                                {e.costo_total_mxn > 0 && <div style={{ color: colorPrimary }}>{e.costo_total_mxn.toFixed(2)} MXN</div>}
                                {e.costo_total_usd === 0 && e.costo_total_mxn === 0 && <span style={{ color: COLORS.slate400 }}>$0.00</span>}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: COLORS.slate500, fontStyle: 'italic' }}>
                            No hay consumos por equipo en este período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECCIÓN LIGAS */}
              <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.slate800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Consumo por Liga
                  </h4>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.slate400, fontSize: '13px' }} />
                    <input
                      type="text"
                      placeholder="Buscar liga..."
                      value={searchLiga}
                      onChange={(e) => setSearchLiga(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 12px 6px 36px',
                        background: COLORS.slate50,
                        border: `1.5px solid ${COLORS.slate200}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: COLORS.slate900,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${COLORS.slate200}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: COLORS.slate100, borderBottom: `2px solid ${COLORS.slate200}` }}>
                        <th style={{ padding: '10px 14px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '10px' }}>Liga</th>
                        <th style={{ padding: '10px 14px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '10px', textAlign: 'center' }}>OCR / Foto / VM</th>
                        <th style={{ padding: '10px 14px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', fontSize: '10px', textAlign: 'right' }}>Total Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditoriaData.desglose_ligas && auditoriaData.desglose_ligas.length > 0 ? (
                        auditoriaData.desglose_ligas
                          .filter(l => l.liga_nombre.toLowerCase().includes(searchLiga.toLowerCase()))
                          .map((l, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.slate100}`, transition: 'background 0.2s' }} onMouseOver={(el) => el.currentTarget.style.backgroundColor = COLORS.slate50} onMouseOut={(el) => el.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{ padding: '10px 14px', fontWeight: '700', color: COLORS.slate800 }}>{l.liga_nombre}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700' }}>
                                <span style={{ color: colorInfo }}>{l.ocr_count}</span>{' / '}
                                <span style={{ color: colorSuccess }}>{l.foto_count}</span>{' / '}
                                <span style={{ color: colorWarning }}>{l.verificamex_count}</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800' }}>
                                {l.costo_total_usd > 0 && <div style={{ color: colorSuccess }}>{l.costo_total_usd.toFixed(4)} USD</div>}
                                {l.costo_total_mxn > 0 && <div style={{ color: colorPrimary }}>{l.costo_total_mxn.toFixed(2)} MXN</div>}
                                {l.costo_total_usd === 0 && l.costo_total_mxn === 0 && <span style={{ color: COLORS.slate400 }}>$0.00</span>}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: COLORS.slate500, fontStyle: 'italic' }}>
                            No hay consumos por liga en este período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* FILTROS Y LEDGER COMPLETO */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: COLORS.black, marginBottom: '16px', borderBottom: `2.5px solid ${COLORS.slate200}`, paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Bitácora Transaccional y Distribución
        </h2>

        {/* FILTERS BAR FOR LEDGER */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaFilter /> Filtrar Ledger:
          </span>

          <select
            value={filtroTipoConsumo}
            onChange={(e) => { setFiltroTipoConsumo(e.target.value); setLedgerPage(1); }}
            style={{ background: COLORS.white, border: `1px solid ${COLORS.slate300}`, borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', outline: 'none' }}
          >
            <option value="">Operación (Todas)</option>
            <option value="OCR">OCR</option>
            <option value="PHOTO_SCAN">Escaneo Foto</option>
            <option value="VERIFICAMEX">VerificaMex</option>
          </select>

          <select
            value={filtroTipoRegistro}
            onChange={(e) => { setFiltroTipoRegistro(e.target.value); setLedgerPage(1); }}
            style={{ background: COLORS.white, border: `1px solid ${COLORS.slate300}`, borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', outline: 'none' }}
          >
            <option value="">Registro (Todos)</option>
            <option value="PRESIDENTE">Presidente</option>
            <option value="JUGADOR">Jugador</option>
            <option value="ENTRENADOR">Entrenador</option>
            <option value="OTRO">Otro</option>
          </select>

          <select
            value={filtroEsCobrable}
            onChange={(e) => { setFiltroEsCobrable(e.target.value); setLedgerPage(1); }}
            style={{ background: COLORS.white, border: `1px solid ${COLORS.slate300}`, borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', outline: 'none' }}
          >
            <option value="todos">Cobrable (Todos)</option>
            <option value="si">Solo Cobrables</option>
            <option value="no">Solo No Cobrables</option>
          </select>

          <button
            onClick={() => {
              setFiltroTipoConsumo('');
              setFiltroTipoRegistro('');
              setFiltroEsCobrable('todos');
              setLedgerPage(1);
            }}
            style={{
              background: COLORS.slate100,
              border: `1px solid ${COLORS.slate300}`,
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              color: COLORS.slate700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaRedo size={11} /> Restablecer
          </button>
        </div>

        {/* LEDGER DETAIL TABLE */}
        <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)', marginBottom: '30px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Transacciones Ledger de Consumos (BitacoraConsumo)
          </h4>

          {loadingConsumo ? (
            <div style={{ padding: '40px', textAlign: 'center', color: COLORS.slate500, fontWeight: '600' }}>Cargando transacciones de consumo...</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.slate200}` }}>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Request ID</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Fecha</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Usuario / Sesión</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Operación</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Registro</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Estado Técnico</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Resultado</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Cobrable</th>
                      <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800', textAlign: 'right' }}>Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumoLedger.length > 0 ? (
                      consumoLedger.map((row) => {
                        const dateObj = new Date(row.CreadoEn);
                        const formattedDate = dateObj.toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <tr key={row.ConsumoId} style={{ borderBottom: `1px solid ${COLORS.slate100}` }}>
                            <td style={{ padding: '12px 10px', fontWeight: '700', color: COLORS.slate900 }} title={row.RequestId}>
                              {row.RequestId.substring(0, 8)}...
                            </td>
                            <td style={{ padding: '12px 10px', color: COLORS.slate600 }}>{formattedDate}</td>
                            <td style={{ padding: '12px 10px', color: COLORS.slate700 }}>
                              {row.UsuarioId ? `Usuario ID: ${row.UsuarioId}` : `Invitado: ${row.GuestId?.substring(0, 6) || row.SessionId?.substring(0, 6) || 'Anónimo'}...`}
                            </td>
                            <td style={{ padding: '12px 10px', fontWeight: '600', color: colorPrimary }}>{row.TipoConsumo}</td>
                            <td style={{ padding: '12px 10px', color: COLORS.slate700 }}>{row.TipoRegistro}</td>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '800',
                                backgroundColor: row.EstadoTecnico === 'EXITOSO' ? COLORS.successBgTranslucent30 : COLORS.dangerBgTranslucent,
                                color: row.EstadoTecnico === 'EXITOSO' ? colorSuccess : colorDanger
                              }}>
                                {row.EstadoTecnico}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px', color: COLORS.slate500 }} title={row.ResultadoProveedor}>
                              {row.ResultadoProveedor}
                            </td>
                            <td style={{ padding: '12px 10px', fontWeight: '700', color: row.EsCobrable ? colorSuccess : colorDanger }}>
                              {row.EsCobrable ? 'Sí' : 'No'}
                            </td>
                            <td style={{ padding: '12px 10px', fontWeight: '800', color: COLORS.slate900, textAlign: 'right' }}>
                              {parseFloat(row.CostoTotal).toFixed(4)} <span style={{ fontSize: '10px', color: COLORS.slate500 }}>{row.Divisa}</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" style={{ padding: '20px 10px', color: COLORS.slate500, fontStyle: 'italic', textAlign: 'center' }}>No se encontraron transacciones en el Ledger.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION CONTROLS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '600' }}>
                  Mostrando {consumoLedger.length} de {ledgerTotal} transacciones
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setLedgerPage(prev => Math.max(prev - 1, 1))}
                    disabled={ledgerPage === 1}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: `1.5px solid ${COLORS.slate300}`,
                      background: COLORS.white,
                      cursor: ledgerPage === 1 ? 'not-allowed' : 'pointer',
                      color: ledgerPage === 1 ? COLORS.slate400 : COLORS.slate700,
                      fontSize: '12px',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  >
                    Anterior
                  </button>

                  <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: COLORS.slate900 }}>
                    Pág. {ledgerPage}
                  </span>

                  <button
                    onClick={() => setLedgerPage(prev => prev + 1)}
                    disabled={ledgerPage * ledgerSize >= ledgerTotal}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: `1.5px solid ${COLORS.slate300}`,
                      background: COLORS.white,
                      cursor: ledgerPage * ledgerSize >= ledgerTotal ? 'not-allowed' : 'pointer',
                      color: ledgerPage * ledgerSize >= ledgerTotal ? COLORS.slate400 : COLORS.slate700,
                      fontSize: '12px',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* DISTRIBUTION CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          {/* Costo por Proveedor */}
          <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px' }}>
              Costo por Proveedor
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Gastos en USD */}
              {consumoResumen?.costo_por_proveedor_usd && Object.keys(consumoResumen.costo_por_proveedor_usd).length > 0 && (
                <div>
                  <h5 style={{ fontSize: '11px', fontWeight: '800', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Gastos en USD</h5>
                  {Object.entries(consumoResumen.costo_por_proveedor_usd).map(([prov, costo], idx) => {
                    const maxVal = Math.max(...Object.values(consumoResumen.costo_por_proveedor_usd), 1);
                    const porcentaje = (costo / maxVal) * 100;
                    return (
                      <div key={idx} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{prov}</span>
                          <span style={{ fontWeight: '800', color: colorSuccess }}>{parseFloat(costo).toFixed(4)} USD</span>
                        </div>
                        <div style={{ height: '6px', background: COLORS.slate100, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${porcentaje}%`, height: '100%', background: colorSuccess, borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Gastos en MXN */}
              {consumoResumen?.costo_por_proveedor_mxn && Object.keys(consumoResumen.costo_por_proveedor_mxn).length > 0 && (
                <div>
                  <h5 style={{ fontSize: '11px', fontWeight: '800', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px', letterSpacing: '0.5px' }}>Gastos en MXN</h5>
                  {Object.entries(consumoResumen.costo_por_proveedor_mxn).map(([prov, costo], idx) => {
                    const maxVal = Math.max(...Object.values(consumoResumen.costo_por_proveedor_mxn), 1);
                    const porcentaje = (costo / maxVal) * 100;
                    return (
                      <div key={idx} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{prov}</span>
                          <span style={{ fontWeight: '800', color: colorPrimary }}>{parseFloat(costo).toFixed(2)} MXN</span>
                        </div>
                        <div style={{ height: '6px', background: COLORS.slate100, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${porcentaje}%`, height: '100%', background: colorPrimary, borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {(!consumoResumen?.costo_por_proveedor_usd || Object.keys(consumoResumen.costo_por_proveedor_usd).length === 0) &&
                (!consumoResumen?.costo_por_proveedor_mxn || Object.keys(consumoResumen.costo_por_proveedor_mxn).length === 0) && (
                  <div style={{ color: COLORS.slate500, fontStyle: 'italic', fontSize: '13px' }}>No hay registros para este período.</div>
                )}
            </div>
          </div>

          {/* Operaciones por Registro */}
          <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px' }}>
              Operaciones por Tipo Registro
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {consumoResumen?.operaciones_por_registro && Object.keys(consumoResumen.operaciones_por_registro).length > 0 ? (
                Object.entries(consumoResumen.operaciones_por_registro).map(([reg, ops], idx) => {
                  const maxVal = Math.max(...Object.values(consumoResumen.operaciones_por_registro), 1);
                  const porcentaje = (ops / maxVal) * 100;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{reg}</span>
                        <span style={{ fontWeight: '800', color: colorInfo }}>{ops} ops</span>
                      </div>
                      <div style={{ height: '6px', background: COLORS.slate100, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${porcentaje}%`, height: '100%', background: colorInfo, borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: COLORS.slate500, fontStyle: 'italic', fontSize: '13px' }}>No hay registros para este período.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReporteModal && renderModalPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9998,
          padding: '20px'
        }}>
          <div style={{
            background: COLORS.white,
            borderRadius: '20px',
            width: '520px',
            maxWidth: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            fontFamily: "'Outfit', sans-serif"
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: COLORS.slate900 }}>
              Reporte de Consumos
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: COLORS.slate500, lineHeight: '1.5' }}>
              Selecciona la fecha de inicio y la fecha de fin para generar el PDF con consumo total, costos por servicio, ligas, equipos y jugadores/presidente.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={reporteFechaInicio}
                  onChange={(e) => setReporteFechaInicio(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${COLORS.slate200}`,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: COLORS.slate900,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={reporteFechaFin}
                  min={reporteFechaInicio || undefined}
                  onChange={(e) => setReporteFechaFin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${COLORS.slate200}`,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: COLORS.slate900,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {reporteFechaInicio && reporteFechaFin && reporteFechaInicio > reporteFechaFin && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: COLORS.dangerBgLight,
                color: COLORS.dangerDark,
                fontSize: '12px',
                fontWeight: '700'
              }}>
                La fecha de fin debe ser igual o posterior a la fecha de inicio.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowReporteModal(false)}
                disabled={generandoReporte}
                style={{
                  background: COLORS.white,
                  color: COLORS.slate700,
                  border: `1.5px solid ${COLORS.slate200}`,
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerarReporte}
                disabled={!reporteFechaInicio || !reporteFechaFin || reporteFechaInicio > reporteFechaFin || generandoReporte}
                style={{
                  background: (!reporteFechaInicio || !reporteFechaFin || reporteFechaInicio > reporteFechaFin || generandoReporte) ? COLORS.slate300 : colorSuccess,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: (!reporteFechaInicio || !reporteFechaFin || reporteFechaInicio > reporteFechaFin || generandoReporte) ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {generandoReporte ? 'Generando reporte...' : 'Generar reporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TARIFA */}
      {editingTarifa && renderModalPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: COLORS.white,
            borderRadius: '20px',
            width: '420px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            fontFamily: "'Outfit', sans-serif"
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: COLORS.slate900 }}>
              Editar Tarifa de Servicio
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: COLORS.slate500 }}>
              Modifica la tarifa unitaria de cobro para {editingTarifa.TipoConsumo || editingTarifa.tipo_consumo}.
            </p>

            <form onSubmit={handleSaveTarifa} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Costo Unitario */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Costo Unitario
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  required
                  value={costoEdit}
                  onChange={(e) => setCostoEdit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${COLORS.slate200}`,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: COLORS.slate950,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Divisa */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Divisa
                </label>
                <select
                  value={divisaEdit}
                  onChange={(e) => setDivisaEdit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${COLORS.slate200}`,
                    fontSize: '13px',
                    fontWeight: '600',
                    color: COLORS.slate950,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="MXN">Pesos Mexicanos (MXN)</option>
                  <option value="USD">Dólares Americanos (USD)</option>
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Descripción
                </label>
                <textarea
                  rows="3"
                  value={descripcionEdit}
                  onChange={(e) => setDescripcionEdit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${COLORS.slate200}`,
                    fontSize: '12px',
                    fontWeight: '600',
                    color: COLORS.slate950,
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Estatus */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="estatus-tarifa"
                  checked={estatusEdit}
                  onChange={(e) => setEstatusEdit(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="estatus-tarifa" style={{ fontSize: '13px', fontWeight: '600', color: COLORS.slate700, cursor: 'pointer' }}>
                  Tarifa Activa (Habilitar para el cobro)
                </label>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTarifa(null)}
                  disabled={submittingTarifa}
                  style={{
                    background: COLORS.white,
                    color: COLORS.slate700,
                    border: `1.5px solid ${COLORS.slate200}`,
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTarifa}
                  style={{
                    background: colorSuccess,
                    color: COLORS.white,
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {submittingTarifa ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
