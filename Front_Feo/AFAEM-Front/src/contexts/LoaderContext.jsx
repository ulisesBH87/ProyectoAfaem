import React, { createContext, useContext, useState } from 'react';
import GlobalLoader from '../components/partials/Utils/GlobalLoader';

const LoaderContext = createContext();

export const useLoader = () => useContext(LoaderContext);

export const LoaderProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Cargando...");

  const showLoader = (msg = "Cargando...") => {
    setMessage(msg);
    setIsLoading(true);
  };

  const hideLoader = () => {
    setIsLoading(false);
  };

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader }}>
      {children}
      <GlobalLoader isLoading={isLoading} message={message} />
    </LoaderContext.Provider>
  );
};
