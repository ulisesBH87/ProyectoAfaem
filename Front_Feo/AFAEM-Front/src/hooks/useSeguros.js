import { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../config/config';
import { C } from '../pages/Admin/RegistrarPresidente/constants';

/**
 * useSeguros
 * Carga el catálogo de seguros y ligas desde el API, mantiene el estado
 * de asignación y calcula totales derivados.
 */
export function useSeguros() {
  const [seguros, setSeguros] = useState([]);
  const [asignacion, setAsignacion] = useState({});
  const [cargandoSeguros, setCargandoSeguros] = useState(false);
  const [ligasCatalogo, setLigasCatalogo] = useState([]);

  // ── Segmentar seguros por tipo ───────────────────────────────────────────
  const segurosPresidente = useMemo(
    () => seguros.filter(s => ['TIPO G', 'TIPO J'].includes(s.nombre.toUpperCase().trim())),
    [seguros]
  );

  const segurosJugadores = useMemo(
    () => seguros.filter(s => !['TIPO G', 'TIPO J'].includes(s.nombre.toUpperCase().trim())),
    [seguros]
  );

  // ── Totales derivados ────────────────────────────────────────────────────
  const totalAsignados = useMemo(
    () => segurosJugadores.reduce((acc, seg) => acc + Number(asignacion[seg.id] || 0), 0),
    [asignacion, segurosJugadores]
  );

  const totalPagar = useMemo(
    () => seguros.reduce((a, s) => a + Number(asignacion[s.id] || 0) * s.precio, 0),
    [seguros, asignacion]
  );

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    // Seguros
    (async () => {
      setCargandoSeguros(true);
      try {
        const res = await fetch(`${API_BASE}/ordenes-pago/seguros`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.data || data.seguros || data.results || [];
        const mapped = arr.map((s, i) => ({
          id: String(s.id || s.SeguroId || i + 1),
          nombre: s.nombre || s.Nombre || s.name || 'Seguro',
          precio: Number(s.costo || s.Costo || s.precio || s.Precio || 0),
        }));
        setSeguros(mapped);
        // Inicializar asignación: TIPO J = 1, resto = 0
        const init = {};
        mapped.forEach(s => {
          init[s.id] = s.nombre.toUpperCase().trim() === 'TIPO J' ? 1 : 0;
        });
        setAsignacion(init);
      } catch {
        setSeguros([]);
      } finally {
        setCargandoSeguros(false);
      }
    })();

    // Ligas
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/equipo-temporal/catalogos-registro`);
        if (res.ok) {
          const data = await res.json();
          if (data.ligas) setLigasCatalogo(data.ligas);
        }
      } catch { /* silencioso */ }
    })();
  }, []);

  return {
    seguros,
    segurosPresidente,
    segurosJugadores,
    asignacion,
    setAsignacion,
    cargandoSeguros,
    ligasCatalogo,
    totalAsignados,
    totalPagar,
  };
}
