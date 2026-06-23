import { FaUser, FaMoneyBillWave, FaFolderOpen } from 'react-icons/fa';
import COLORS from '../../../styles/colors';

// ─── Paleta de colores ────────────────────────────────────────────────────────
export const C = {
  bg: COLORS.white,
  surface: COLORS.slate900,
  card: COLORS.slate900,
  cardBorder: COLORS.slateLightTranslucent,
  amber: COLORS.warning,
  amberDark: COLORS.warningDark,
  amberLight: COLORS.warningLight,
  orange: COLORS.orangeAccent,
  rose: COLORS.dangerLight,
  green: COLORS.greenAccent,
  greenDim: COLORS.greenBgTranslucent,
  text: COLORS.slate50,
  textMid: COLORS.slate200,
  textArrow: COLORS.slate900,
  textDim: COLORS.slate300,
  inputBg: COLORS.darkBlueBg,
  inputBorder: COLORS.slateMediumTranslucent,
  focusBorder: COLORS.secondaryLight,
};

// ─── Estilos de campo reutilizables ──────────────────────────────────────────
export const fieldStyles = {
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: C.textMid,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    display: 'block',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    borderRadius: 10,
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    color: C.text,
    outline: 'none',
    fontSize: 14,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    borderRadius: 10,
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    color: C.text,
    outline: 'none',
    fontSize: 14,
    cursor: 'pointer',
  },
};

// ─── Pasos del wizard ─────────────────────────────────────────────────────────
export const PASOS = [
  { id: 1, label: 'Documentos', icon: <FaFolderOpen />, desc: 'Expediente personal' },
  { id: 2, label: 'Cuenta', icon: <FaUser />, desc: 'Credenciales de acceso' },
  { id: 3, label: 'Cuotas', icon: <FaMoneyBillWave />, desc: 'Seguros y pago' },
  { id: 4, label: 'Afiliación', icon: <FaFolderOpen />, desc: 'Formato de Afiliación' },
];

// ─── Documentos requeridos ────────────────────────────────────────────────────
export const REQUISITOS = [
  { documento: 'actaNacimiento', nombre: 'Acta de Nacimiento', icon: '📜', ocr: true },
  { documento: 'identificacion', nombre: 'Identificación Oficial', icon: '🪪', ocr: true },
  { documento: 'fotografia', nombre: 'Fotografía', icon: '📸' },
  { documento: 'formatoAfiliacion', nombre: 'Formato de Afiliación', icon: '📝', hasDownload: true },
];

// ─── Catálogo de roles / tipo de afiliación ───────────────────────────────────
export const CATALOGO_ROLES = [
  { valor: 'TIPO G', etiqueta: 'TIPO G' },
  { valor: 'SIN SEGURO', etiqueta: 'SIN SEGURO' },
];

// ─── Ligas por defecto (fallback cuando el API no responde) ──────────────────
export const CATALOGO_LIGAS_DEFAULT = [
  { valor: 'LIGA AFAEM NORTE', etiqueta: 'AFAEM Norte' },
  { valor: 'LIGA AFAEM SUR', etiqueta: 'AFAEM Sur' },
  { valor: 'VARONIL PRIMERA', etiqueta: 'Varonil Primera Plus' },
  { valor: 'FEMENIL ELITE', etiqueta: 'Femenil Elite' },
  { valor: 'OTRA', etiqueta: 'Otra Liga' },
];

// ─── Países con código telefónico ────────────────────────────────────────────
export const PAISES = [
  { codigo: '+52', etiqueta: 'México +52', emoji: '🇲🇽' },
  { codigo: '+1', etiqueta: 'EE.UU./Canadá +1', emoji: '🇺🇸' },
  { codigo: '+34', etiqueta: 'España +34', emoji: '🇪🇸' },
  { codigo: '+54', etiqueta: 'Argentina +54', emoji: '🇦🇷' },
  { codigo: '+55', etiqueta: 'Brasil +55', emoji: '🇧🇷' },
  { codigo: '+56', etiqueta: 'Chile +56', emoji: '🇨🇱' },
  { codigo: '+57', etiqueta: 'Colombia +57', emoji: '🇨🇴' },
  { codigo: '+506', etiqueta: 'Costa Rica +506', emoji: '🇨🇷' },
  { codigo: '+593', etiqueta: 'Ecuador +593', emoji: '🇪🇨' },
  { codigo: '+503', etiqueta: 'El Salvador +503', emoji: '🇸🇻' },
  { codigo: '+502', etiqueta: 'Guatemala +502', emoji: '🇬🇹' },
  { codigo: '+504', etiqueta: 'Honduras +504', emoji: '🇭🇳' },
  { codigo: '+505', etiqueta: 'Nicaragua +505', emoji: '🇳🇮' },
  { codigo: '+507', etiqueta: 'Panamá +507', emoji: '🇵🇦' },
  { codigo: '+595', etiqueta: 'Paraguay +595', emoji: '🇵🇾' },
  { codigo: '+51', etiqueta: 'Perú +51', emoji: '🇵🇪' },
  { codigo: '+598', etiqueta: 'Uruguay +598', emoji: '🇺🇾' },
  { codigo: '+58', etiqueta: 'Venezuela +58', emoji: '🇻🇪' },
];

// ─── Utilidades de contraseña ─────────────────────────────────────────────────
export function calcStrength(pw) {
  const rules = {
    minLen: (pw || '').length >= 6,
    hasLower: /[a-z]/.test(pw),
    hasUpper: /[A-Z]/.test(pw),
    hasDigit: /\d/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };
  return { rules, score: Object.values(rules).filter(Boolean).length };
}

// ─── Utilidades de fecha ──────────────────────────────────────────────────────
export const toYYYYMMDD = (s) => {
  if (!s) return '';
  const p = s.split('/');
  return p.length !== 3 ? s : `${p[2]}-${p[1]}-${p[0]}`;
};

export const toDDMMYYYY = (s) => {
  if (!s) return '';
  const p = s.split('-');
  return p.length !== 3 ? s : `${p[2]}/${p[1]}/${p[0]}`;
};
