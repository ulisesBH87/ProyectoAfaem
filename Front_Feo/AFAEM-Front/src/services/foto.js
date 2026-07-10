// SERVICIO DE VALIDACIÓN DE FOTOGRAFÍA PARA DOCUMENTOS DE IDENTIDAD
import { API_BASE } from '../config/config';
import { getErrorMessage } from '../utils/errorHandler';

export const validarFotografia = async (archivo, tipo_registro = "JUGADOR", opciones = {}) => {
  const tiposPermitidos = [
    "image/jpg",
    "image/jpeg",
    "image/png"
  ];

  if (!tiposPermitidos.includes(archivo.type)) {
    throw new Error("Solo se permiten fotografías en formato JPG, JPEG o PNG.");
  }

  const formData = new FormData();
  formData.append("file", archivo);

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const queryParams = new URLSearchParams({ tipo_registro });
  if (opciones.equipo_id) queryParams.append("equipo_id", opciones.equipo_id);
  if (opciones.liga_id) queryParams.append("liga_id", opciones.liga_id);
  if (opciones.target_persona_id) queryParams.append("target_persona_id", opciones.target_persona_id);
  if (opciones.target_nombre) queryParams.append("target_nombre", opciones.target_nombre);
  if (opciones.target_curp) queryParams.append("target_curp", opciones.target_curp);
  if (opciones.slot_id) queryParams.append("slot_id", opciones.slot_id);
  if (opciones.borrador_id) queryParams.append("borrador_id", opciones.borrador_id);

  try {
    const response = await fetch(`${API_BASE}/fotografia/?${queryParams.toString()}`, {
      method: "POST",
      headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      // Creamos un objeto de error compatible con getErrorMessage
      const mockError = new Error();
      mockError.response = { data, status: response.status };
      throw new Error(getErrorMessage(mockError));
    }

    return data;
  } catch (err) {
    // Si ya es un error con mensaje amigable (ej. de getErrorMessage) lo relanzamos
    // verificando que no sea un error técnico de parseo JSON o similar
    if (err.message && !err.message.includes("Unexpected token") && !err.message.includes("json")) {
      throw err;
    }

    // Si es un error de red o fetch falló (cors, dns, etc)
    throw new Error("No se pudo conectar con el servidor de validación.");
  }
};