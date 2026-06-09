import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { LoaderProvider } from './contexts/LoaderContext';
import { RBACProvider } from './contexts/RBACContext';

ReactDOM.createRoot(document.getElementById('root')).render(

  <LoaderProvider>
    <RBACProvider>
      <App />
    </RBACProvider>
  </LoaderProvider>

)