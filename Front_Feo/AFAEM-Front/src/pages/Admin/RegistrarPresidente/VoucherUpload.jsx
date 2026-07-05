import React, { useState } from 'react';
import { FaUpload } from 'react-icons/fa';
import { C } from './constants';
import COLORS from '../../../styles/colors';

/**
 * VoucherUpload
 * Zona de arrastrar/soltar para el comprobante de pago (opcional).
 */
export default function VoucherUpload({ voucher, onFileChange }) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid, textTransform: 'uppercase', marginBottom: 14 }}>
        Comprobante de Pago <span style={{ opacity: 0.5 }}>(Opcional)</span>
      </div>

      <div
        onClick={() => document.getElementById('voucher-inp').click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) onFileChange(file);
        }}
        style={{
          width: '100%', height: 110,
          border: isDragging
            ? `2px solid ${C.focusBorder || COLORS.primary}`
            : `2px dashed ${voucher ? COLORS.greenBgTranslucent30 : C.inputBorder}`,
          borderRadius: 14, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: isDragging
            ? 'rgba(26, 59, 92, 0.08)'
            : (voucher ? COLORS.greenBgTranslucent03 : 'transparent'),
          transition: 'all .2s',
        }}
      >
        <div style={{ pointerEvents: isDragging ? 'none' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <FaUpload style={{ fontSize: 22, color: voucher ? C.green : C.textDim, marginBottom: 8 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, textAlign: 'center' }}>
            {voucher ? voucher.name : 'Arrastra o haz clic para subir el Voucher'}
          </span>
          <span style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>PDF, JPG o PNG</span>
        </div>
      </div>

      <input
        type="file" id="voucher-inp" style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => onFileChange(e.target.files[0])}
      />
    </div>
  );
}
