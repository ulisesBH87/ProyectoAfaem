import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * COMPONENTE DE REDIRECCIÓN PARA PRESIDENTE
 * Redirige automáticamente al listado de equipos ya que la vista de "Inicio" ha sido simplificada.
 */
export default function PresidenteEquipo() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/presidente-equipo/equipos', { replace: true });
  }, [navigate]);

  return null;
}
