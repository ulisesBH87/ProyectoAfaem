import { useCallback, useEffect, useMemo, useState } from 'react';
import teamsService from '../services/teams';

export const DEFAULT_JUGADOR_DRAFT = {
  nombreJugador: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  curp: '',
  genero: '1',
  fechaNacimiento: '',
  lugarNacimiento: 'MEXICO',
  correo: '',
  telefono: '',
  posicion: '',
  numCamiseta: '',
  esForaneo: false,
  nacionalidadJugador: 'MEXICANA',
  paisResidencia: 'MEXICO',
  haVividoExtranjero: false,
  dondeVividoExtranjero: '',
  nacionalidadPadre: 'MEXICANA',
  nacionalidadMadre: 'MEXICANA',
  registroAsociacionExtranjera: 'NO',
  nacAbueloPaterno: 'MEXICANA',
  nacAbuelaPaterna: 'MEXICANA',
  nacAbueloMaterno: 'MEXICANA',
  nacAbuelaMaterna: 'MEXICANA',
  juegoClubExtranjero: 'NO',
  nui: ''
};

const REQUIRED_DRAFT_FIELDS = [
  'nombreJugador',
  'apellidoPaterno',
  'apellidoMaterno',
  'curp',
  'fechaNacimiento',
  'lugarNacimiento',
  'genero',
  'correo',
  'telefono',
  'numCamiseta',
  'posicion',
  'nui'
];

const FORANEO_REQUIRED_FIELDS = [
  'nacionalidadJugador',
  'paisResidencia',
  'nacionalidadPadre',
  'nacionalidadMadre',
  'registroAsociacionExtranjera',
  'nacAbueloPaterno',
  'nacAbuelaPaterna',
  'nacAbueloMaterno',
  'nacAbuelaMaterna',
  'juegoClubExtranjero'
];

const normalizeText = (value) => String(value ?? '').trim();

export const createEmptyJugadorDraft = (overrides = {}) => ({
  ...DEFAULT_JUGADOR_DRAFT,
  ...overrides
});

export const inferGeneroFromCurp = (curp, fallback = '1') => {
  const normalizedCurp = normalizeText(curp).toUpperCase();
  if (normalizedCurp.length < 11) return fallback;
  const generoChar = normalizedCurp.charAt(10);
  if (generoChar === 'M') return '2';
  if (generoChar === 'H') return '1';
  return fallback;
};

export const isJugadorMenorDeEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return false;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return false;

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const monthDiff = hoy.getMonth() - nacimiento.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }

  return edad < 18;
};

export const mapAvailableSlotsResponse = (slotsResponse) => ({
  ...slotsResponse,
  hay_slots: (slotsResponse?.jugadores_restantes ?? 0) > 0,
  slots_disponibles: slotsResponse?.jugadores_restantes ?? 0,
  seguros_disponibles: (slotsResponse?.seguros || [])
    .filter((seguro) => seguro.disponibles > 0)
    .map((seguro) => ({
      SeguroId: seguro.seguro_id,
      Cantidad: seguro.disponibles
    })),
  rawSlots: slotsResponse?.slots || []
});

export const resolveDraftFromSlot = (slot) => {
  if (!slot?.datos_borrador) return createEmptyJugadorDraft();
  return createEmptyJugadorDraft(slot.datos_borrador);
};

export const findDraftSlot = ({ slots = [], selectedSlotId = null, selectedSeguroId = '' }) => {
  if (selectedSlotId != null) {
    return slots.find((slot) => String(slot.slot_id) === String(selectedSlotId)) || null;
  }

  if (selectedSeguroId) {
    return slots.find(
      (slot) => String(slot.seguro_id) === String(selectedSeguroId) && !slot.completo
    ) || null;
  }

  return slots.find((slot) => !slot.completo) || slots[0] || null;
};

const hasMeaningfulDraftValue = (draft = {}) => {
  const merged = createEmptyJugadorDraft(draft);

  return Object.keys(merged).some((key) => {
    const currentValue = merged[key];
    const defaultValue = DEFAULT_JUGADOR_DRAFT[key];

    if (typeof currentValue === 'boolean' || typeof defaultValue === 'boolean') {
      return Boolean(currentValue) !== Boolean(defaultValue);
    }

    return normalizeText(currentValue) !== normalizeText(defaultValue);
  });
};

export const isJugadorDraftComplete = (draft = {}) => {
  const currentDraft = createEmptyJugadorDraft(draft);

  const hasRequiredFields = REQUIRED_DRAFT_FIELDS.every(
    (field) => normalizeText(currentDraft[field]) !== ''
  );

  if (!hasRequiredFields) return false;
  if (normalizeText(currentDraft.curp).length !== 18) return false;

  if (!currentDraft.esForaneo) return true;

  const hasForaneoFields = FORANEO_REQUIRED_FIELDS.every(
    (field) => normalizeText(currentDraft[field]) !== ''
  );

  if (!hasForaneoFields) return false;
  if (currentDraft.haVividoExtranjero && normalizeText(currentDraft.dondeVividoExtranjero) === '') {
    return false;
  }

  return true;
};

export const getJugadorDraftStatus = (draft = {}) => {
  if (isJugadorDraftComplete(draft)) return 'COMPLETO';
  if (hasMeaningfulDraftValue(draft)) return 'EN_CAPTURA';
  return 'VACIO';
};

export function useEquipoTemporalPlayerDraft({
  rawSlots = [],
  selectedSlotId = null,
  selectedSeguroId = ''
}) {
  const [slots, setSlots] = useState(rawSlots || []);

  useEffect(() => {
    setSlots(rawSlots || []);
  }, [rawSlots]);

  const currentSlot = useMemo(
    () => findDraftSlot({ slots, selectedSlotId, selectedSeguroId }),
    [slots, selectedSlotId, selectedSeguroId]
  );

  const [draftData, setDraftDataState] = useState(() => resolveDraftFromSlot(currentSlot));

  useEffect(() => {
    setDraftDataState(resolveDraftFromSlot(currentSlot));
  }, [currentSlot?.slot_id, currentSlot?.datos_borrador]);

  const syncSlotDraft = useCallback((slotId, nextDraft) => {
    setSlots((previousSlots) => previousSlots.map((slot) => (
      String(slot.slot_id) === String(slotId)
        ? { ...slot, datos_borrador: nextDraft }
        : slot
    )));
  }, []);

  const setDraftData = useCallback((nextDraftOrUpdater) => {
    setDraftDataState((previousDraft) => {
      const nextDraft = typeof nextDraftOrUpdater === 'function'
        ? nextDraftOrUpdater(previousDraft)
        : nextDraftOrUpdater;

      if (currentSlot?.slot_id) {
        syncSlotDraft(currentSlot.slot_id, nextDraft);
      }

      return nextDraft;
    });
  }, [currentSlot?.slot_id, syncSlotDraft]);

  const saveDraft = useCallback(async (nextDraft = draftData) => {
    if (!currentSlot?.slot_id) return null;

    try {
      return await teamsService.saveJugadorDraft(currentSlot.slot_id, nextDraft);
    } catch (error) {
      console.warn('No se pudo guardar el borrador en la BD:', error);
      return null;
    }
  }, [currentSlot?.slot_id, draftData]);

  const slotStatuses = useMemo(() => slots.map((slot) => ({
    ...slot,
    estado: getJugadorDraftStatus(slot.datos_borrador || {})
  })), [slots]);

  const currentStatus = useMemo(
    () => getJugadorDraftStatus(draftData),
    [draftData]
  );

  const allSlotsComplete = useMemo(
    () => slotStatuses.length > 0 && slotStatuses.every((slot) => slot.estado === 'COMPLETO'),
    [slotStatuses]
  );

  return {
    slots,
    setSlots,
    currentSlot,
    draftData,
    setDraftData,
    saveDraft,
    currentStatus,
    slotStatuses,
    allSlotsComplete
  };
}
