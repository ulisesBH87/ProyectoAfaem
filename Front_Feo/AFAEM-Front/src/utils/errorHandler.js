export const ERROR_DICTIONARY = {
  // === ERRORES DE AUTENTICACIÓN Y SESIÓN ===
  "AUTH_INVALID_CREDENTIALS": "El correo o contraseña son incorrectos. Por favor, inténtalo de nuevo.",
  "AUTH_USER_NOT_FOUND": "El usuario no existe. Revisa tu correo o regístrate.",
  "AUTH_TOKEN_EXPIRED": "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.",
  "AUTH_TOKEN_INVALID": "La sesión es inválida. Inicia sesión nuevamente.",
  "AUTH_PERMISSION_DENIED": "No tienes permiso para realizar esta acción.",
  
  // === ERRORES DE REGISTRO E INFORMACIÓN ===
  "REG_DUPLICATE_EMAIL": "Este correo ya está registrado. Usa otro o inicia sesión.",
  "REG_DUPLICATE_CURP": "La CURP proporcionada ya está registrada en el sistema.",
  "REG_INVALID_DATA": "Los datos enviados son inválidos. Revisa el formulario.",
  
  // === ERRORES DE EQUIPOS Y JUGADORES ===
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
  // Si no hay respuesta del servidor (errores de red, cors, timeout)
  if (!error.response || !error.response.data) {
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
