const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTemplate(name) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const form = pdfDoc.getForm();

  // Agregar campos de texto requeridos por el form pre-llenado
  const fields = [
    'Apellido Paterno',
    'Apellido Materno',
    'Nombres',
    'CURP o Clave Única de Registro de Población',
    'Fecha de Nacimiento',
    'Correo electrónico',
    'Nombre Completo',
    'Tipo de Sangre',
    'Alergias',
    'Enfermedad o Lesión'
  ];

  fields.forEach((fieldName, index) => {
    try {
      const field = form.createTextField(fieldName);
      field.addToPage(page, { x: 50, y: 700 - (index * 40), width: 300, height: 20 });
    } catch (e) {
      // Ignorar si el campo ya existe
    }
  });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(__dirname, 'Front_Feo', 'AFAEM-Front', 'public', `${name}.pdf`);
  fs.writeFileSync(filePath, pdfBytes);
}

async function main() {
  await createTemplate('template');
  await createTemplate('template_jugador');
}
main().catch(console.error);
