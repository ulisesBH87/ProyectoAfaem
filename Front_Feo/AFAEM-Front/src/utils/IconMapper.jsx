import * as FaIcons from 'react-icons/fa';
import React from 'react';

export const getIcon = (iconName) => {
  if (!iconName) return <FaIcons.FaCircle style={{ fontSize: '8px' }} />;
  
  // Normalizar íconos: Cambiar fútbol americano por soccer (futbol) globalmente
  let mappedIcon = iconName;
  if (iconName === 'FaFootballBall') mappedIcon = 'FaFutbol';

  const IconComponent = FaIcons[mappedIcon];
  return IconComponent ? <IconComponent /> : <FaIcons.FaQuestion />;
};

// Cambio trivial para actualización de la rama
