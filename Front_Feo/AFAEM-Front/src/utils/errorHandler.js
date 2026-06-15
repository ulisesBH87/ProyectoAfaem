export const ERROR_DICTIONARY = {
  // === ERRORES DE AUTENTICACIÓN Y SESIÓN ===
  "AUTH_INVALID_CREDENTIALS": "El correo o contraseña son incorrectos. Por favor, inténtalo de nuevo.",
  "AUTH_USER_NOT_FOUND": "El usuario no existe. Revisa tu correo o regístrate.",
  "AUTH_TOKEN_EXPIRED": "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.",
  "AUTH_TOKEN_INVALID": "La sesión es inválida. Inicia sesión nuevamente.",
  "AUTH_PERMISSION_DENIED": "No tienes permiso para realizar esta acción.",

  // === ERRORES DE REGISTRO E INFORMACIÓN (BACKEND) ===
  "USUARIO_NO_ENCONTRADO": "El usuario no existe. Revisa tus datos o regístrate.",
  "CREDENCIALES_INVALIDAS": "El correo o la contraseña son incorrectos. Por favor, inténtalo de nuevo.",
  "CURP_INVALIDA": "La CURP proporcionada no es válida o tiene un formato incorrecto.",
  "USUARIO_YA_EXISTE": "Ya existe un usuario registrado con estos datos.",
  "ERROR_REGISTRO_USUARIO": "Ocurrió un error al intentar registrar al usuario. Inténtalo de nuevo.",
  "CORREO_YA_REGISTRADO": "Este correo electrónico ya se encuentra registrado. Usa otro o inicia sesión.",
  "ERROR_CAMBIO_CONTRASENA": "No se pudo realizar el cambio de contraseña. Por favor, inténtalo de nuevo.",
  "REG_INVALID_DATA": "Los datos enviados son inválidos. Revisa el formulario.",

  // === ERRORES DE AUDITORÍA Y PERSONAS ===
  "ERROR_OBTENER_AUDITORIA": "No se pudieron obtener los registros de auditoría. Intenta de nuevo más tarde.",
  "PERSONA_NO_ENCONTRADA": "No se encontró a la persona solicitada en el sistema.",

  // === ERRORES DE DOCUMENTOS ===
  "ARCHIVOS_INVALIDOS": "Los archivos seleccionados no tienen un formato válido o están dañados.",
  "ERROR_SUBIDA_DOCUMENTO": "Hubo un problema al subir el documento. Por favor, inténtalo de nuevo.",

  // === ERRORES DE PAGOS Y SEGUROS ===
  "PAGO_INVALIDO": "La información del pago no es válida o está incompleta.",
  "CANTIDAD_JUGADORES_INVALIDA": "La cantidad de jugadores no es válida para esta operación.",
  "SEGURO_NO_EXISTE": "El seguro seleccionado no existe o no está disponible.",
  "ORDEN_NO_ENCONTRADA": "No se encontró la orden de pago especificada.",
  "ORDEN_ERROR": "Ocurrió un error al procesar la orden de pago.",
  "COMPROBANTE_ERROR": "Hubo un error al validar el comprobante de pago.",
  "CANTIDAD_SEGUROS_PERSONAS_INVALIDA": "La cantidad de seguros no coincide con el número de personas registradas.",

  // === ERRORES DE EQUIPOS Y JUGADORES (LEGACY/UI) ===
  "TEAM_NOT_FOUND": "El equipo especificado no existe o no se encontró.",
  "TEAM_LIMIT_REACHED": "Has alcanzado el límite de jugadores para este equipo.",
  "PLAYER_NOT_FOUND": "El jugador especificado no existe o no se encontró.",

  // === ERRORES DE REPOSITORIO Y GENERALES ===
  "SYS_INTERNAL_ERROR": "Ha ocurrido un error interno en el servidor. Intenta más tarde.",
  "SYS_VALIDATION_ERROR": "Se ha producido un error validando la información enviada.",
  "SYS_NOT_FOUND": "El recurso que buscas no existe."
};

/**
 * Procesa el objeto de error retornado por Axios y obtiene el mensaje
 * amigable al usuario basándose en el 'code' proporcionado por el backend.
 * 
 * Estructura esperada desde el backend:
 * { "code": "CODIGO_ERROR", "message": "Mensaje para logs", "status_code": 404 }
 * 
 * @param {Object} error - Objeto de error de Axios o Error genérico.
 * @param {String} fallbackMessage - Mensaje genérico en caso de que todo falle.
 * @returns {String} Mensaje de error para mostrar al usuario.
 */
export const getErrorMessage = (error, fallbackMessage = 'Ha ocurrido un error al procesar tu solicitud.') => {
  // Si el servidor responde con 500 (Internal Server Error)
  if (error.response && error.response.status === 500) {
    return "Ocurrió un problema. Por favor, intenta de nuevo más tarde.";
  }

  // Si el servidor responde con 404 (Not Found)
  if (error.response && error.response.status === 404) {
    return "El servicio no está disponible temporalmente. Por favor, intenta de nuevo más tarde.";
  }

  // Si no hay respuesta del servidor (errores de red, cors, timeout) o no hay data
  if (!error.response || !error.response.data) {
    if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
      return "Ocurrió un error. Por favor, revisa tu conexión de internet e inténtalo de nuevo.";
    }
    if (error.message === 'Network Error') {
      return "Error de red. Verifica tu conexión a internet o intenta más tarde.";
    }
    if (error.message && error.message.includes('status code 500')) {
      return "Ocurrió un problema. Por favor, intenta de nuevo más tarde.";
    }
    if (error.message && error.message.includes('status code 404')) {
      return "El servicio no está disponible temporalmente. Por favor, intenta de nuevo más tarde.";
    }
    return error.message || fallbackMessage;
  }

  const { code, message, detail } = error.response.data;

  // Si el backend envía un 'code' y lo tenemos en el diccionario
  if (code && ERROR_DICTIONARY[code]) {
    return ERROR_DICTIONARY[code];
  }

  // Si el backend envía 'code' pero no lo tenemos mapeado, 
  // mostramos el 'code' específico para diagnóstico rápido y el fallback message (que para el usuario usualmente es log).
  // Nota: El requerimiento dice usar 'message' COMO FALLBACK a nivel usuario si no se reconoce el 'code'.
  if (message) {
    return message;
  }

  // Soporte retrocompatible por si algunos endpoints aún usan el esquema viejo de FastAPI 'detail'
  if (detail) {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg || d).join(', ');
  }

  return fallbackMessage;
};

/**
 * Aplica un interceptor a una instancia de Axios para procesar automáticamente
 * los errores mediante getErrorMessage, y mutar el objeto de error para mantener
 * retrocompatibilidad con componentes que leen err.response.data.detail
 */
export const applyErrorInterceptor = (api) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const customMessage = getErrorMessage(error);

      // Sobrescribimos error.message para componentes que hacen `err.message`
      error.message = customMessage;

      // Asegurar que el mensaje esté disponible donde los componentes suelen buscarlo (err.response.data.detail)
      if (!error.response) {
        error.response = { data: {} };
      } else if (!error.response.data) {
        error.response.data = {};
      }

      error.response.data.detail = customMessage;

      return Promise.reject(error);
    }
  );
};
