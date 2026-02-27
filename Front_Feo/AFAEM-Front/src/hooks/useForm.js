// HOOK PERSONALIZADO PARA MANEJAR FORMULARIOS CON VALIDACIÓN
import { useState } from 'react';

export function useForm(initialState, validate) {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value, formData) }));
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    handleChange
  };
}
