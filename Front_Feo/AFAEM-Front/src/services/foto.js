import { API_BASE } from '../config/config';
import { getErrorMessage } from '../utils/errorHandler';

export const validarFotografia = async (archivo) => {
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

  try {
    const response = await fetch(`${API_BASE}/fotografia`, {
      method: "POST",
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