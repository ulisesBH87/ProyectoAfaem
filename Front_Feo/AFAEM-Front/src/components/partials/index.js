/**
 * ÍNDICE CENTRALIZADO DE VISTAS PARCIALES
 * 
 * Importa desde aquí todos los componentes parciales reutilizables:
 * 
 * import { 
 *   BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion, AreaTexto,
 *   Tarjeta, Insignia, Alerta, Modal, Cargador, 
 *   TablaSimple, Paginacion, MigasDePan, ConsejoFlotante
 * } from '@/components/partials';
 */

// BOTONES
export { default as BotonPrimario } from './Buttons/PrimaryButton';
export { default as BotonSecundario } from './Buttons/SecondaryButton';

// ENTRADAS
export { default as EntradaFormulario } from './Inputs/EntradaFormulario';
export { default as EntradaSeleccion } from './Inputs/EntradaSeleccion';

// FORMULARIOS
export { default as AreaTexto } from './Forms/AreaTexto';
export { default as Modal } from './Forms/Modal';
export { default as Cargador } from './Forms/Spinner';

// TARJETAS
export { default as Tarjeta } from './Cards/Tarjeta';
export { default as Insignia } from './Cards/Insignia';

// ALERTAS
export { default as Alerta } from './Alerts/Alerta';

// TABLAS
export { default as TablaSimple } from './Tables/SimpleTable';

// NAVEGACIÓN
export { default as Paginacion } from './Navigation/Paginacion';
export { default as MigasDePan } from './Navigation/MigasDePan';

// UTILIDADES
export { default as ConsejoFlotante } from './Utils/ConsejoFlotante';

