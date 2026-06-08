import { useState } from 'react';
import Swal from 'sweetalert2';
import { validarFotografia } from '../services/foto';
import { C } from '../pages/Admin/RegistrarPresidente/constants';

/**
 * useFotografia
 * Encapsula la validación automática de fotografía y el bypass manual.
 * Elimina la duplicación del bloque "cargar foto forzada" que existía
 * en dos ramas (else + catch) del componente original.
 */
export function useFotografia({ setDocuments, setPreviews }) {
  const [fotoError, setFotoError] = useState(null);
  const [fotoFallida, setFotoFallida] = useState(false);
  const [fotoArchivo, setFotoArchivo] = useState(null);

  // ── Helper interno: carga la foto sin validar (reutilizado en else+catch) ─
  const _cargarFotoForzada = (archivo) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, fotografia: reader.result }));
    };
    reader.readAsDataURL(archivo);
    setDocuments(prev => ({ ...prev, fotografia: archivo }));
    setFotoFallida(false);
    setFotoError(null);
    setFotoArchivo(null);
    Swal.fire({ title: 'Fotografía cargada', icon: 'success', timer: 1500, showConfirmButton: false });
  };

  // ── Helper: pregunta al usuario si quiere cargar igualmente ──────────────
  const _confirmarCargaForzada = async (archivo, mensaje) => {
    const result = await Swal.fire({
      title: 'Error en fotografía',
      text: `${mensaje} ¿Deseas cargarla de todos modos?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cargar igualmente',
      cancelButtonText: 'No, intentar de nuevo',
    });
    if (result.isConfirmed) _cargarFotoForzada(archivo);
  };

  // ── Procesar con validación automática ───────────────────────────────────
  const procesarFoto = async (archivo) => {
    Swal.fire({
      title: 'Validando fotografía…',
      html: 'Verificando calidad y rostros. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const data = await validarFotografia(archivo);

      if (data.valido) {
        // Convertir base64 → File
        const imagenProcesada = `data:${data.tipo_imagen};base64,${data.imagen}`;
        const byteCharacters = atob(data.imagen);
        const byteArray = new Uint8Array([...byteCharacters].map(c => c.charCodeAt(0)));
        const archivoValidado = new File([byteArray], 'foto_validada.jpg', { type: data.tipo_imagen });

        setDocuments(prev => ({ ...prev, fotografia: archivoValidado }));
        setPreviews(prev => ({ ...prev, fotografia: imagenProcesada }));
        setFotoFallida(false);
        setFotoError(null);
        setFotoArchivo(null);
        Swal.fire({ title: '¡Fotografía aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
      } else {
        setFotoError(data.mensaje);
        setFotoFallida(true);
        setFotoArchivo(archivo);
        await _confirmarCargaForzada(archivo, data.mensaje);
      }
    } catch (err) {
      const msg = err.message || 'No se pudo procesar la fotografía.';
      setFotoError(msg);
      setFotoFallida(true);
      setFotoArchivo(archivo);
      await _confirmarCargaForzada(archivo, msg);
    }
  };

  // ── Bypass manual (botón "Omitir validación") ────────────────────────────
  const forzarFoto = () => {
    if (!fotoArchivo) return;
    setDocuments(prev => ({ ...prev, fotografia: fotoArchivo }));
    setFotoFallida(false);
    setFotoError(null);
    Swal.fire({
      title: 'Fotografía cargada',
      text: 'Se omitió la validación automática.',
      icon: 'warning',
      confirmButtonColor: C.amberDark,
    });
  };

  return { procesarFoto, forzarFoto, fotoError, fotoFallida, fotoArchivo };
}
