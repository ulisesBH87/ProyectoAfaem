import { FaUpload } from 'react-icons/fa';
import { C } from './constants';
import COLORS from '../../../styles/colors';

/**
 * VoucherUpload
 * Zona de arrastrar/soltar para el comprobante de pago (opcional).
 */
export default function VoucherUpload({ voucher, onFileChange }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid, textTransform: 'uppercase', marginBottom: 14 }}>
        Comprobante de Pago <span style={{ opacity: 0.5 }}>(Opcional)</span>
      </div>

      <div
        onClick={() => document.getElementById('voucher-inp').click()}
        style={{
          width: '100%', height: 110,
          border: `2px dashed ${voucher ? COLORS.greenBgTranslucent30 : C.inputBorder}`,
          borderRadius: 14, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: voucher ? COLORS.greenBgTranslucent03 : 'transparent',
          transition: 'all .2s',
        }}
      >
        <FaUpload style={{ fontSize: 22, color: voucher ? C.green : C.textDim, marginBottom: 8 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, textAlign: 'center' }}>
          {voucher ? voucher.name : 'Subir Voucher'}
        </span>
        <span style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>PDF, JPG o PNG</span>
      </div>

      <input
        type="file" id="voucher-inp" style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => onFileChange(e.target.files[0])}
      />
    </div>
  );
}
