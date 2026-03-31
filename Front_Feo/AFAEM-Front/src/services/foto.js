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

  const response = await fetch("http://127.0.0.1:8000/fotografia", {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensaje || "Error al validar la fotografía");
  }

  return data;
};