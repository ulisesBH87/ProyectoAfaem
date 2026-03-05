import React, { useState, useRef, useEffect } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';

function SeleccionarFotografia() {

  // Estado para almacenar el archivo seleccionado
  //const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  //Visualización de la selección del archivo
  const[vistaPrevia, setVistaPrevia] = useState(null);

  // Estados para el modal de mensajes
  //const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState(false);
  
  //Esrados para arrastar documentos
  const[arrastrando, setArrastrando] = useState(false);

  //Estados para los avisos
  const [modalVisible, setModalVisible] = useState(false);
  const [mensajeModal, setMensajeModal] = useState('');
  
  const inputRef = useRef(null); // Referencia para el input de archivo

  //Funciones para ver el modal
  const mostrarModal = (mensaje) => {
    setMensajeModal(mensaje);
    setModalVisible(true);
  };
  
  /*====
  FUNCION PARA LIMPIAR CUANDO EL COMPONENTE SE DESTRUYA O CAMBIE DE ARCHIVO
  ===*/
  useEffect(() => {
    return () => {
      // Limpiar la URL de la vista
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }
    };
  }, [vistaPrevia]);


  /*====
  FUNCION PARA LIMPIAR LA INTERFAZ SI HAY UN ERROR
  ===*/
  const LimpiarInterfaz = () => {
    
    if(vistaPrevia) {
      URL.revokeObjectURL(vistaPrevia);
    }

    // Limpiar estados
    setVistaPrevia(null);
    
    // Limpiar el input de archivo
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /*====
  FUNCION PARA ENVIAR EL ARCHIVO AL SERVIDOR Y VALIDARLO
  ===*/
  const EnviarArchivo = async (archivo) => {
    if (!archivo) return;
    
    // Mostrar mensaje de procesamiento
    setProcesando(true);
    mostrarModal();
    //setMensaje('');

    // Aquí puedes agregar la lógica para enviar el archivo al servidor, por ejemplo, usando fetch o axios
    const formData = new FormData();
    formData.append('file', archivo);


    // Enviar el archivo al backend para validación  
    try{
      
      const response = await fetch("http://127.0.0.1:8000/validar/fotografia", {
        method: "POST",
        body: formData
      });

      // Verificar si la respuesta es exitosa
      const data = await response.json();

      if (response.ok) {

        console.log("Respuesta completa:", data);

        if (data.valido && data.imagen) {
          
          mostrarModal(data.mensaje);
          //setMensaje(data.mensaje);
          
          //Mostrar imagen que viene del backend
          setVistaPrevia(
            `data:${data.tipo_imagen};base64,${data.imagen}`
          );

        } else {
          mostrarModal(data.mensaje);
          //setMensaje(data.mensaje);
          LimpiarInterfaz(); // Limpiar la interfaz en caso de error
        }
      } else {
        mostrarModal("Error al validar el archivo. Por favor, inténtalo de nuevo.");
        //setMensaje("Error al validar el archivo. Por favor, inténtalo de nuevo.");
        LimpiarInterfaz(); // Limpiar la interfaz en caso de error
      }


    } catch (error) {
      console.error(error);
      mostrarModal("Solo se permiten archivos JPG, JPEG, PNG y PDF.");
      //setMensaje("Error al enviar el archivo. Por favor, inténtalo de nuevo.");
      LimpiarInterfaz(); // Limpiar la interfaz en caso de error
    } finally {
      setProcesando(false);
    }

  };

  
  const procesarArchivo = (Archivo) => {

    const TipoPermitido = [
      'image/jpg',
      'image/jpeg', 
      'image/png', 
      'application/pdf',
    ];

    if (!TipoPermitido.includes(Archivo.type)) {
      mostrarModal("Solo se permiten archivos JPG, JPEG, PNG y PDF.");
      //setMensaje("Solo se permiten archivos JPG, JPEG, PNG y PDF.");
      LimpiarInterfaz();
      return;
    }

    if (Archivo.type.startsWith('image/')) {
      const imagenURL = URL.createObjectURL(Archivo);
      setVistaPrevia(imagenURL);
    } else {
      setVistaPrevia(null);
    }

    EnviarArchivo(Archivo);
  };

  /*====
   Funcionoes para arrastrar archivos
    ===*/

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setArrastrando(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);

    const archivo = e.dataTransfer.files[0];
    if (!archivo) return;

    procesarArchivo(archivo);
  };


  /*====
  FUNCION PARA ENVIAR EL ARCHIVO AL SERVIDOR Y VALIDARLO
  ===*/
  const handleFileChange = (event) => {
    const Archivo = event.target.files[0]; // Obtiene el archivo seleccionado
    
    if (!Archivo) return; // Si no se seleccionó ningún archivo, salir de la función{

    //Constable para los tipos de archivos permitidos
    const TipoPermitido = [
      'image/jpg',
      'image/jpeg', 
      'image/png', 
      'application/pdf',
    ];

    // Verificar si el tipo de archivo es permitido
    if (!TipoPermitido.includes(Archivo.type)) {
      LimpiarInterfaz(); // Limpiar la interfaz
      mostrarModal("Solo se permiten archivos JPG, JPEG, PNG y PDF.");
      //setMensaje("Solo se permiten archivos JPG, JPEG, PNG y PDF.");
      //event.target.value = ""; // Reiniciar el input de archivo
      return;
    }

    // Crear una URL para la vista previa de la imagen
    if(Archivo.type.startsWith('image/')) {
      const imagenURL = URL.createObjectURL(Archivo);
      setVistaPrevia(imagenURL);
    } else {
      setVistaPrevia(null); // No mostrar vista previa para archivos PDF
    }
    
    EnviarArchivo(Archivo); // Enviar el archivo al servidor para validación
    
  };

  /*====
  FUNCION PARA DESCARGAR IMAGEN EN RESOLUCION MEDIA (CREDENCIAL)
  ====*/
  const descargarCredencial = () => {
    if (!vistaPrevia) {
      mostrarModal("No hay imagen para descargar.");
      return;
    }

    const img = new Image();
    img.src = vistaPrevia;

    img.onload = () => {
      // Tamaño ideal tipo credencial (pueden cambiarse)
      const ancho = 400;
      const alto = 500;

      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;

      const ctx = canvas.getContext("2d");

      // Fondo blanco (por si la imagen tiene transparencia)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ancho, alto);

      // Ajustar imagen proporcionalmente
      ctx.drawImage(img, 0, 0, ancho, alto);

      // Convertir a JPG calidad media
      const imagenFinal = canvas.toDataURL("image/jpeg", 0.8);

      // Crear enlace de descarga
      const link = document.createElement("a");
      link.href = imagenFinal;
      link.download = "credencial.jpg";
      link.click();
    };
  };
  
  return (
    <div>
      <h2>Detector de Rostros</h2>
      
      <div>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: arrastrando ? '2px dashed #007bff' : '2px dashed #ccc',
            padding: '30px',
            textAlign: 'center',
            borderRadius: '10px',
            backgroundColor: arrastrando ? '#f0f8ff' : '#fafafa',
            transition: '0.3s'
          }}
        >
          <p>Arrastra tu archivo aquí o haz clic para seleccionar</p>

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            ref={inputRef}
            disabled={procesando}
            style={{ marginTop: '10px' }}
          />
        </div>
        {/*
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileChange}
          ref={inputRef}
          disabled={procesando}
        />
        */}

        {/*
              width: '400px',
              height: '500px',
              border: '1px solid #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '10px',
              marginLeft: '100px' */}

        {procesando && <p>Procesando archivo...</p>}
        
        {vistaPrevia && (

          <div
            style={{
              width: '400px',
              aspectRatio: '4 / 5',
              border: '1px solid #ccc',
              borderRadius: '8px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '10px',
              marginLeft: '100px',
              overflow: 'hidden',
              backgroundColor: '#fff'
            }}
          >
            <img
              src={vistaPrevia}
              alt="Fotografía seleccionada"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>
          
        )}
        <div style={{ marginTop: "15px", marginLeft: "100px" }}>
            <button
              className="btn btn-success"
              onClick={descargarCredencial}
              disabled={procesando}
            >
              Descargar imagen para credencial
            </button>
          </div>
        
        {/* 
        {mensaje && (
          <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc' }}>
            <p>{mensaje}</p>
            <button onClick={() => setMensaje('')}>Cerrar</button>
          </div>
        )}
        */}
        
        <AvisoModal
          mostrar={modalVisible}
          onCerrar={() => setModalVisible(false)}
          titulo="Aviso"
          mensaje={mensajeModal}
        />
      </div>
    </div>
  );
}

export default SeleccionarFotografia;


import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

// Modal para los avisos de la fotografia
function AvisoModal({ mostrar, onCerrar, titulo, mensaje }) {
  return (
    <Modal show={mostrar} onHide={onCerrar} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{mensaje}</Modal.Body>
      <Modal.Footer>
        <Button onClick={onCerrar}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
