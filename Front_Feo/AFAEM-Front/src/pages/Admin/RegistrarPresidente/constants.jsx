import { FaUser, FaMoneyBillWave, FaFolderOpen } from 'react-icons/fa';

// ─── Paleta de colores ────────────────────────────────────────────────────────
export const C = {
  bg: '#FFFFFF',
  surface: '#181c27',
  card: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.07)',
  amber: '#f59e0b',
  amberDark: '#d97706',
  amberLight: '#fbbf24',
  orange: '#fb923c',
  rose: '#f87171',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.15)',
  text: 'rgba(255,255,255,0.87)',
  textMid: 'rgba(255,255,255,0.5)',
  textDim: 'rgba(255,255,255,0.28)',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.1)',
  focusBorder: '#f59e0b',
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
    background: 'rgba(15,17,23,0.95)',
    border: `1px solid ${C.inputBorder}`,
    color: C.text,
    outline: 'none',
    fontSize: 14,
    cursor: 'pointer',
  },
};

// ─── Pasos del wizard ─────────────────────────────────────────────────────────
export const PASOS = [
  { id: 1, label: 'Cuenta', icon: <FaUser />, desc: 'Credenciales de acceso' },
  { id: 2, label: 'Cuotas', icon: <FaMoneyBillWave />, desc: 'Seguros y pago' },
  { id: 3, label: 'Documentos', icon: <FaFolderOpen />, desc: 'Expediente' },
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
