import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import { API_BASE } from '../../config/config';
import { hashPassword } from '../../utils/hash'; 

function computePasswordRequirements(pw) {
	const rules = {
		minLen: (pw || '').length >= 6,
		hasLower: /[a-z]/.test(pw),
		hasUpper: /[A-Z]/.test(pw),
		hasDigit: /\d/.test(pw),
		hasSpecial: /[^A-Za-z0-9]/.test(pw),
	};
	const score = Object.values(rules).reduce((s, v) => s + (v ? 1 : 0), 0);
	return { rules, score }; // 0-5
}

function Registrarse() {
	const _navigate = useNavigate();
	// ESTADO: SOLO CAMPOS DE PRESIDENTE DE EQUIPO
	const [formData, setFormData] = useState({
		tipoSolicitud: '',
		dependencia: '',
		otraDependencia: '',
		Nombre: '',
		PrimerApellido: '',
		SegundoApellido: '',
		Correo: '',
		Telefono: '',
		Contrasena: '',
		ConfirmarContrasena: '',
		CURP: '',
		RFC: '',
		SexoId: '',
		FechaNacimiento: '',
		aceptaPoliticas: false,
	});

	const [errors, setErrors] = useState({
		tipoSolicitud: '',
		dependencia: '',
		otraDependencia: '',
		Nombre: '',
		PrimerApellido: '',
		SegundoApellido: '',
		Correo: '',
		Telefono: '',
		Contrasena: '',
		ConfirmarContrasena: '',
		CURP: '',
		RFC: '',
		SexoId: '',
		FechaNacimiento: '',
		aceptaPoliticas: '',
	});

	const [jsonResult, setJsonResult] = useState(null);
	const [sending, setSending] = useState(false);

	// VERIFICACIÓN
	const [verificationSent, setVerificationSent] = useState(false);
	const [verificationCode, setVerificationCode] = useState('');
	const [codigoUsuario, setCodigoUsuario] = useState('');
	const [verified, setVerified] = useState(false);
	const [resendCount, setResendCount] = useState(0);
	const MAX_RESEND = 3;

	// COOLDOWN PARA REENVÍO 
	const [resendCooldown, setResendCooldown] = useState(0);
	const cooldownSeconds = 45;

	// VISIBILIDAD DE CONTRASEÑA
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// INDICADOR DE FUERZA DE CONTRASEÑA
	const [pwInfo, setPwInfo] = useState({ rules: {}, score: 0 });

	// ESTADO PARA SABER SI EL BACKEND RESPONDE
	const [apiReachable, setApiReachable] = useState(true);

	const cardRef = useRef(null);
	const debounceRef = useRef(null);
	const formDataRef = useRef(formData);
	useEffect(() => { formDataRef.current = formData; }, [formData]);

	// VALIDACIONES MÍNIMOS
	const validateField = (name, value) => {
		if (name === 'tipoSolicitud') {
			if (!value) return 'Selecciona el tipo de afiliación';
			return '';
		}
		if (name === 'dependencia') {
			if (!value) return 'Selecciona la dependencia';
			return '';
		}
		if (name === 'otraDependencia') {
			if (formData.dependencia === 'otro' && !value.trim()) return 'Especifica la dependencia';
			return '';
		}
		if (['Nombre', 'PrimerApellido', 'SegundoApellido'].includes(name)) {
			if (!String(value || '').trim()) return `El ${name.toUpperCase()} es obligatorio`;
			return '';
		}
		if (name === 'Correo') {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!String(value || '').trim()) return 'El correo es obligatorio';
			if (!emailRegex.test(value)) return 'Formato de correo inválido (ejemplo: nombre@dominio.com)';
			return '';
		}
		if (name === 'Telefono') {
			const phoneRegex = /^\d{10}$/;
			if (!String(value || '').trim()) return 'El teléfono es obligatorio';
			if (!phoneRegex.test(value)) return 'El teléfono debe tener exactamente 10 dígitos (solo números)';
			return '';
		}
		if (name === 'aceptaPoliticas') {
			if (!value) return 'Debes aceptar las políticas y aviso de privacidad';
			return '';
		}
		if (name === 'CURP') {
			if (!String(value || '').trim()) return 'El CURP es obligatorio';
			if (String(value).length !== 18) return 'El CURP debe tener 18 caracteres';
			return '';
		}
		if (name === 'RFC') {
			if (!String(value || '').trim()) return 'El RFC es obligatorio';
			const rfcLen = String(value).length;
			if (rfcLen < 12 || rfcLen > 13) return 'El RFC debe tener 12 o 13 caracteres';
			return '';
		}
		if (name === 'SexoId') {
			if (!value) return 'Selecciona tu sexo';
			return '';
		}
		if (name === 'FechaNacimiento') {
			if (!String(value || '').trim()) return 'La fecha de nacimiento es obligatoria';
			return '';
		}
		return '';
	};

	// MANEJO DE CAMBIOS CON DEBOUNCE PARA DUPLICADOS
	const handleChange = (e) => {
		const { name, value } = e.target;
		const next = { ...formDataRef.current, [name]: value };
		setFormData((prev) => ({ ...prev, [name]: value }));

		// VALIDACIÓN INMEDIATA
		const err = validateField(name, value);
		setErrors((prev) => ({ ...prev, [name]: err }));

		// REVALIDAR CONFIRMACIÓN SI CAMBIA LA CONTRASEÑA
		if (name === 'Contrasena' && formDataRef.current?.ConfirmarContrasena) {
			const errConfirm = validateField('ConfirmarContrasena', formDataRef.current.ConfirmarContrasena || '');
			setErrors((prev) => ({ ...prev, ConfirmarContrasena: errConfirm }));
		}

		// DEBOUNCE DUPLICADOS PARA CORREO Y TELÉFONO
		const watchFields = ['Correo', 'Telefono'];
		if (watchFields.includes(name)) {
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(async () => {
				const result = await checkDuplicates(next);
				if (!result || result.networkError) return;
				setErrors((prev) => {
					const copy = { ...prev };
					copy.Correo = result.correo ? 'Este correo ya está en uso' : (copy.Correo === 'Este correo ya está en uso' ? '' : copy.Correo);
					copy.Telefono = result.telefono ? 'Este teléfono ya está en uso' : (copy.Telefono === 'Este teléfono ya está en uso' ? '' : copy.Telefono);
					return copy;
				});
			}, 600);
		}
	};

	useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

	// CHECK DUPLICADOS
	const checkDuplicates = async (data) => {
		try {
			const normalize = (s) => String(s || '').trim();
			const email = (normalize(data.Correo) || '').toLowerCase();
			let phone = String(data.Telefono || '').replace(/\D/g, '');
			if (phone.length > 10) phone = phone.slice(-10);

			const payload = {
				Nombre: normalize(data.Nombre),
				PrimerApellido: normalize(data.PrimerApellido),
				SegundoApellido: normalize(data.SegundoApellido),
				Correo: email,
				Telefono: phone,
				tipoSolicitud: data.tipoSolicitud || 'certificacion_entrenador',
			};

			const res = await fetchWithTimeout(`${API_BASE}/validate-unique/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			}, 5000);

			let json = null;
			try { json = await res.json(); } catch {
				if (!res.ok) return { networkError: true };
				return { correo: false, telefono: false };
			}

			const out = { correo: false, telefono: false };
			if (!res.ok) {
				const txt = JSON.stringify(json).toLowerCase();
				if (txt.includes('email') || txt.includes('correo')) out.correo = true;
				if (txt.includes('phone') || txt.includes('telefono')) out.telefono = true;
			}
			// HEURÍSTICAS (IGUAL QUE ANTES)
			if (json?.correo === true || json?.email === true || json?.email_in_use === true) out.correo = true;
			if (json?.telefono === true || json?.phone === true || json?.phone_in_use === true) out.telefono = true;
			if (Array.isArray(json?.duplicates)) {
				for (const f of json.duplicates) {
					const key = String(f).toLowerCase();
					if (key.includes('correo') || key.includes('email')) out.correo = true;
					if (key.includes('telefono') || key.includes('phone')) out.telefono = true;
				}
			}
			if (json && typeof json === 'object') {
				for (const v of Object.values(json)) {
					const sval = String(v || '').toLowerCase();
					if (sval.includes('correo') || sval.includes('email') || sval.includes('ya está en uso') || sval.includes('already in use')) {
						if (sval.includes('telefono') || sval.includes('phone')) out.telefono = true;
						else out.correo = true;
					}
				}
			}
			// SI TODO OK
			if (!apiReachable) return { networkError: true };
			return out;
		} catch (err) {
			console.error('Error comprobando duplicados:', err);
			return { networkError: true };
		}
	};

	// ENVÍO VERIFICACIÓN
	const sendVerification = async (email, code) => {
		try {
			setSending(true);
			await fetch(`${API_BASE}/send-verification/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code }),
			});
			setSending(false);
			return true;
		} catch (err) {
			setSending(false);
			console.error('Error enviando verificación:', err);
			return false;
		}
	};

	const validateUniqueField = async (fieldName, value) => {
		const data = { ...formDataRef.current, [fieldName]: value };
		const res = await checkDuplicates(data);
		if (!res) return 'network';
		if (res.networkError) return 'network';
		return fieldName === 'Correo' ? !!res.correo : !!res.telefono;
	};

	const handleBlurUnique = async (fieldName) => {
		const value = formDataRef.current[fieldName] || '';
		if (!String(value).trim()) return;
		if (!apiReachable) {
			alert('No se puede verificar duplicados porque el backend no responde. Revisa la conexión o la URL de API.');
			return;
		}
		const result = await validateUniqueField(fieldName, value);
		if (result === 'network') {
			console.warn('No fue posible verificar duplicados (problema de red).');
			alert('No fue posible verificar duplicados (problema de red).');
			return;
		}
		setErrors((prev) => {
			const copy = { ...prev };
			if (fieldName === 'Correo') {
				copy.Correo = result ? 'Este correo ya está en uso' : (copy.Correo === 'Este correo ya está en uso' ? '' : copy.Correo);
			}
			if (fieldName === 'Telefono') {
				copy.Telefono = result ? 'Este teléfono ya está en uso' : (copy.Telefono === 'Este teléfono ya está en uso' ? '' : copy.Telefono);
			}
			return copy;
		});
	};

	const _checkAndMarkDuplicates = async (data) => {
		if (!apiReachable) return { status: 'error', reason: 'network' };
		const res = await checkDuplicates(data);
		if (!res) return { status: 'error', reason: 'network' };
		if (res.networkError) return { status: 'error', reason: 'network' };
		const dupErrors = {};
		const fields = [];
		if (res.correo) { dupErrors.Correo = 'Este correo ya está en uso'; fields.push('correo'); }
		if (res.telefono) { dupErrors.Telefono = 'Este teléfono ya está en uso'; fields.push('telefono'); }
		if (fields.length) { setErrors((prev) => ({ ...prev, ...dupErrors })); return { status: 'dup', fields }; }
		return { status: 'ok' };
	};

	// CONFIRMAR CÓDIGO DEL USUARIO
	const handleConfirmCode = (e) => {
		e.preventDefault();
		if (codigoUsuario.trim() === verificationCode) {
			setVerified(true);
			alert('Correo verificado. Ahora presiona "GENERAR JSON Y ENVIAR" para completar el registro.');
		} else alert('Código incorrecto. Verifica el correo e inténtalo de nuevo.');
	};

	const handleResend = async () => {
		if (resendCount >= MAX_RESEND) {
			alert('Has alcanzado el límite de reenvíos. Intenta más tarde.');
			return;
		}
		const code = String(Math.floor(100000 + Math.random() * 900000));
		setVerificationCode(code);
		const ok = await sendVerification(formData.Correo, code);
		if (ok) {
			setResendCount(resendCount + 1);
			setResendCooldown(cooldownSeconds);
			alert('Código reenviado.');
		} else {
			alert('No se pudo reenviar el código. Intenta más tarde.');
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		// VALIDACIONES BÁSICAS
		const newErrors = {
			tipoSolicitud: validateField('tipoSolicitud', formData.tipoSolicitud),
			dependencia: validateField('dependencia', formData.dependencia),
			otraDependencia: validateField('otraDependencia', formData.otraDependencia),
			Nombre: validateField('Nombre', formData.Nombre),
			PrimerApellido: validateField('PrimerApellido', formData.PrimerApellido),
			SegundoApellido: validateField('SegundoApellido', formData.SegundoApellido),
			Correo: validateField('Correo', formData.Correo),
			Telefono: validateField('Telefono', formData.Telefono),
			Contrasena: validateField('Contrasena', formData.Contrasena),
			ConfirmarContrasena: validateField('ConfirmarContrasena', formData.ConfirmarContrasena),
			aceptaPoliticas: validateField('aceptaPoliticas', formData.aceptaPoliticas),
		};
		setErrors(newErrors);
		if (Object.values(newErrors).some(Boolean)) { alert('Por favor, rellena todos los campos'); return; }

		// SI YA ESTÁ VERIFICADO, HASHEAR Y GENERAR JSON
		if (verified) {
			try {
				setSending(true);
				const hashed = await hashPassword(formData.Contrasena || '');
				const final = {
					...formData,
					Contrasena: hashed,
					fecha: new Date().toISOString(),
					estado: 'pendiente',
				};
				setJsonResult(final);
				console.log('JSON Generado (con hash):', final);
				alert('¡JSON GENERADO CORRECTAMENTE!');
			} catch (err) {
				console.error('Error hasheando la contraseña:', err);
				alert('Error procesando la contraseña. Intenta de nuevo.');
			} finally {
				setSending(false);
			}
			return;
		}

		// SI NO ESTÁ VERIFICADO, MANDAR CÓDIGO SI NO SE HA ENVIADO
		if (!verificationSent) {
			const code = String(Math.floor(100000 + Math.random() * 900000));
			setVerificationCode(code);
			const ok = await sendVerification(formData.Correo, code);
			if (ok) { setVerificationSent(true); setResendCount(0); setResendCooldown(cooldownSeconds); alert('Código enviado.'); } else alert('No se pudo enviar el código. Intenta más tarde.');
		}
	};

	// COMRPOBAR DISPONIBILIDAD DEL BACKEND 
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				await fetchWithTimeout(`${API_BASE}/docs`, {}, 3000);
				if (mounted) setApiReachable(true);
			} catch (err) {
				console.warn('Backend no alcanzable en API_BASE:', API_BASE, err);
				if (mounted) setApiReachable(false);
			}
		})();
		return () => { mounted = false; };
	}, []);

	// HELPER PARA FETCH CON TIMEOUT
	const fetchWithTimeout = async (url, opts = {}, ms = 5000) => {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), ms);
		try {
			const res = await fetch(url, { ...opts, signal: controller.signal });
			clearTimeout(id);
			return res;
		} catch (err) {
			clearTimeout(id);
			throw err;
		}
	};

	// AJUSTAR LOGOS
	useEffect(() => {
		return () => {};
	}, []);

	// ACTUALIZAR INDICADOR DE FUERZA CADA VEZ QUE CAMBIE LA CONTRASEÑA
	useEffect(() => {
		setPwInfo(computePasswordRequirements(formData.Contrasena));
	}, [formData.Contrasena]);

	// CONTADOR DE COOLDOWN PARA REENVÍO
	useEffect(() => {
		if (!resendCooldown) return;
		const id = setInterval(() => {
			setResendCooldown((s) => {
				if (s <= 1) { clearInterval(id); return 0; }
				return s - 1;
			});
		}, 1000);
		return () => clearInterval(id);
	}, [resendCooldown]);

	return (
		<div className="register">
			<style>{`
				html, body, #root { 
					margin: 0; 
					min-height: 100vh; 
					background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
				}
				
				.register { 
					display: flex; 
					justify-content: center; 
					align-items: flex-start;
					padding: 32px 16px; 
					box-sizing: border-box; 
					min-height: 100vh;
				}
				
				.form-container {
					width: 100%;
					max-width: 960px;
				}
				
				.card { 
					position: relative; 
					overflow: visible; 
					width: 100%; 
					background: white; 
					border-radius: 14px; 
					padding: 48px 32px;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
					border: none;
				}
				
				/* LOGOS: ENCABEZADO */
				.card-logos {
					text-align: center;
					margin-bottom: 32px;
					display: flex;
					justify-content: center;
					align-items: center;
					gap: 24px;
					flex-wrap: wrap;
				}
				
				.left-logo {
					height: 60px;
					max-width: 160px;
					object-fit: contain;
				}
				
				.right-logos {
					display: flex;
					gap: 20px;
					align-items: center;
				}
				
				.right-logos img {
					height: 50px;
					max-width: 120px;
					object-fit: contain;
				}
				
				.card h2 {
					text-align: center;
					font-size: 28px;
					font-weight: 700;
					color: #0b4ea6;
					margin-bottom: 32px;
					letter-spacing: 0.5px;
				}
				
				.form-grid {
					display: grid;
					grid-template-columns: repeat(12, 1fr);
					gap: 16px;
				}
				
				.form-field.col-span-4 {
					grid-column: span 12;
				}
				
				.form-field.col-span-3 {
					grid-column: span 9;
				}
				
				.form-field.col-span-2 {
					grid-column: span 6;
				}
				
				.form-field.col-span-1 {
					grid-column: span 3;
				}
				
				.form-label {
					font-size: 13px;
					font-weight: 700;
					color: #2c3e50;
					margin-bottom: 8px;
					display: block;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				
				.form-input {
					width: 100%;
					padding: 12px 14px;
					border-radius: 8px;
					height: 42px;
					border: 2px solid #e0e6ed;
					box-sizing: border-box;
					font-size: 14px;
					background: #f8fafb;
					transition: all 0.3s ease;
					font-family: inherit;
				}
				
				.form-input:focus {
					outline: none;
					border-color: #0b4ea6;
					background-color: #ffffff;
					box-shadow: 0 0 0 4px rgba(11, 78, 166, 0.12);
				}
				
				.form-input::placeholder {
					color: #cbd5e0;
				}
				
				.form-input:disabled {
					background-color: #f0f2f5;
					color: #aaa;
					cursor: not-allowed;
				}
				
				.btn-primary {
					display: inline-block;
					width: 100%;
					max-width: 100%;
					padding: 12px 24px;
					font-weight: 700;
					background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
					color: white;
					border-radius: 8px;
					border: none;
					cursor: pointer;
					font-size: 15px;
					transition: all 0.3s ease;
					box-shadow: 0 4px 15px rgba(11, 78, 166, 0.25);
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				
				.btn-primary:hover:not(:disabled) {
					transform: translateY(-2px);
					box-shadow: 0 8px 25px rgba(11, 78, 166, 0.35);
				}
				
				.btn-primary:active:not(:disabled) {
					transform: translateY(0);
				}
				
				.btn-primary:disabled {
					opacity: 0.65;
					cursor: not-allowed;
				}
				
				.form-error {
					color: #d32f2f;
					font-size: 12px;
					margin-top: 6px;
					display: block;
					font-weight: 500;
				}
				
				.pw-bar {
					height: 6px;
					background: #e0e6ed;
					border-radius: 6px;
					overflow: hidden;
					margin-top: 8px;
				}
				
				.pw-bar-inner {
					height: 100%;
					transition: width 0.25s ease;
					background: linear-gradient(90deg, #d32f2f, #ffc107, #28a745);
				}
				
				.validation-list {
					display: flex;
					gap: 12px;
					margin-top: 10px;
					flex-wrap: wrap;
				}
				
				.validation-item {
					font-size: 12px;
					color: #666;
					display: flex;
					align-items: center;
					gap: 4px;
				}
				
				.verification-section {
					margin-top: 24px;
					padding: 24px;
					background: #f8fafb;
					border-radius: 12px;
					border: 2px solid #e0e6ed;
				}
				
				.json-result {
					margin-top: 32px;
					padding: 24px;
					background: linear-gradient(135deg, #f0f4f8 0%, #fafbfc 100%);
					border: 2px solid #e0e6ed;
					border-radius: 12px;
					color: #2c3e50;
				}
				
				.json-result h3 {
					margin-top: 0;
					color: #0b4ea6;
					font-size: 16px;
					margin-bottom: 16px;
				}
				
				.json-result pre {
					white-space: pre-wrap;
					word-wrap: break-word;
					background: white;
					padding: 16px;
					border-radius: 8px;
					border: 1px solid #e0e6ed;
					overflow-x: auto;
					font-size: 12px;
					color: #2c3e50;
					margin: 0;
				}
				
				@media (max-width: 1024px) {
					.form-field.col-span-3 {
						grid-column: span 12;
					}
					
					.form-field.col-span-2 {
						grid-column: span 12;
					}
					
					.form-field.col-span-1 {
						grid-column: span 6;
					}
				}
				
				@media (max-width: 768px) {
					.card {
						padding: 32px 20px;
					}
					
					.card-logos {
						gap: 16px;
						margin-bottom: 24px;
					}
					
					.left-logo {
						height: 50px;
					}
					
					.right-logos img {
						height: 40px;
					}
					
					.card h2 {
						font-size: 22px;
						margin-bottom: 24px;
					}
					
					.form-field.col-span-1 {
						grid-column: span 12;
					}
					
					.form-grid {
						gap: 12px;
					}
				}
			`}</style>

			<div className="form-container">
				<div ref={cardRef} className="card">
					<div className="card-logos" aria-hidden="true">
						<img src={AfaemLogo} alt="AFAEM" className="left-logo" />
						<div className="right-logos" aria-hidden="true">
							<img src={FmfLogo} alt="FMF" />
							<img src={AmateurLogo} alt="Sector Amateur" />
						</div>
					</div>

					<h2>Registrarse — Presidente de Equipo</h2>

					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							{/* TIPO DE AFILIACIÓN */}
							<div className="form-field col-span-4">
								<label className="form-label" htmlFor="tipoSolicitud">
									Tipo de afiliación <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<select
									id="tipoSolicitud"
									name="tipoSolicitud"
									value={formData.tipoSolicitud || ''}
									onChange={handleChange}
									className="form-input"
									style={{ border: errors.tipoSolicitud ? '2px solid #d32f2f' : undefined }}
								>
									<option value="" disabled>Selecciona una opción...</option>
									<option value="certificacion_entrenador">Certificación de Presidente de Equipo</option>
									<option value="jugador_adulto">Registro jugador adulto</option>
									<option value="jugador_menor">Registro jugador menor</option>
								</select>
								{errors.tipoSolicitud && <span className="form-error">{errors.tipoSolicitud}</span>}
							</div>

							{/* DEPENDENCIA */}
							<div className="form-field col-span-4">
								<label className="form-label" htmlFor="dependencia">
									Dependencia <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<select
									id="dependencia"
									name="dependencia"
									value={formData.dependencia || ''}
									onChange={handleChange}
									className="form-input"
									style={{ border: errors.dependencia ? '2px solid #d32f2f' : undefined }}
								>
									<option value="" disabled>Selecciona una opción...</option>
									<option value="equipo">Equipo</option>
									<option value="liga">Liga</option>
									<option value="club">Club</option>
									<option value="institucion">Institución</option>
									<option value="otro">Otro</option>
								</select>
								{errors.dependencia && <span className="form-error">{errors.dependencia}</span>}
								{formData.dependencia === 'otro' && (
									<>
										<input
											type="text"
											name="otraDependencia"
											value={formData.otraDependencia}
											onChange={handleChange}
											className="form-input"
											placeholder="Especifica la dependencia"
											style={{ marginTop: 10, border: errors.otraDependencia ? '2px solid #d32f2f' : undefined }}
										/>
										{errors.otraDependencia && <span className="form-error">{errors.otraDependencia}</span>}
									</>
								)}
							</div>

							{/* NOMBRE Y APELLIDOS */}
							<div className="form-field col-span-2">
								<label className="form-label" htmlFor="Nombre">Nombre <span style={{color:'#d32f2f'}}>*</span></label>
								<input 
									id="Nombre"
									type="text" 
									name="Nombre" 
									value={formData.Nombre} 
									onChange={handleChange} 
									className="form-input" 
									style={{ border: errors.Nombre ? '2px solid #d32f2f' : undefined }} 
										placeholder="Tu nombre"
								/>
								{errors.Nombre && <span className="form-error">{errors.Nombre}</span>}
							</div>

							<div className="form-field col-span-1">
								<label className="form-label" htmlFor="PrimerApellido">Primer apellido <span style={{color:'#d32f2f'}}>*</span></label>
								<input 
									id="PrimerApellido"
									type="text" 
									name="PrimerApellido" 
									value={formData.PrimerApellido} 
									onChange={handleChange} 
									className="form-input" 
									style={{ border: errors.PrimerApellido ? '2px solid #d32f2f' : undefined }}
									placeholder="Apellido 1"
								/>
								{errors.PrimerApellido && <span className="form-error">{errors.PrimerApellido}</span>}
							</div>

							<div className="form-field col-span-1">
								<label className="form-label" htmlFor="SegundoApellido">Segundo apellido <span style={{color:'#d32f2f'}}>*</span></label>
								<input 
									id="SegundoApellido"
									type="text" 
									name="SegundoApellido" 
									value={formData.SegundoApellido} 
									onChange={handleChange} 
									className="form-input" 
									style={{ border: errors.SegundoApellido ? '2px solid #d32f2f' : undefined }}
									placeholder="Apellido 2"
								/>
								{errors.SegundoApellido && <span className="form-error">{errors.SegundoApellido}</span>}
							</div>

							{/* DATOS DE CONTACTO */}
							<div className="form-field col-span-3">
								<label className="form-label" htmlFor="Correo">Correo electrónico <span style={{color:'#d32f2f'}}>*</span></label>
								<input 
									id="Correo"
									type="email" 
									name="Correo" 
									value={formData.Correo} 
									onChange={handleChange} 
									onBlur={() => handleBlurUnique('Correo')} 
									className="form-input" 
									style={{ border: errors.Correo ? '2px solid #d32f2f' : undefined }}
									placeholder="ejemplo@correo.com"
								/>
								{errors.Correo && <span className="form-error">{errors.Correo}</span>}
							</div>

							<div className="form-field col-span-1">
								<label className="form-label" htmlFor="Telefono">Teléfono (10 dígitos) <span style={{color:'#d32f2f'}}>*</span></label>
								<input 
									id="Telefono"
									type="tel" 
									name="Telefono" 
									value={formData.Telefono} 
									onChange={handleChange} 
									onBlur={() => handleBlurUnique('Telefono')} 
									className="form-input" 
									maxLength={10} 
									placeholder="5512345678"
									style={{ border: errors.Telefono ? '2px solid #d32f2f' : undefined }} 
								/>
								{errors.Telefono && <span className="form-error">{errors.Telefono}</span>}
							</div>

							{/* CONTRASEÑA */}
							<div className="form-field col-span-2">
								<label className="form-label" htmlFor="Contrasena">
									Contraseña <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
									<input 
										id="Contrasena"
										type={showPassword ? "text" : "password"} 
										name="Contrasena" 
										value={formData.Contrasena} 
										onChange={handleChange} 
										className="form-input" 
										style={{ 
											width: '100%', 
											paddingRight: 40, 
											border: errors.Contrasena ? '2px solid #d32f2f' : undefined, 
											boxSizing: 'border-box' 
										}}
										placeholder="••••••••"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
										style={{
											position: 'absolute',
											right: 12,
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											color: '#718096',
											fontSize: 18,
											padding: '8px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											transition: 'color 0.3s ease'
										}}
										onMouseEnter={(e) => e.target.style.color = '#0b4ea6'}
										onMouseLeave={(e) => e.target.style.color = '#718096'}
									>
										{showPassword ? '👁️' : '👁️‍🗨️'}
									</button>
								</div>
								{errors.Contrasena && <span className="form-error">{errors.Contrasena}</span>}
								
								<div style={{ marginTop: 12 }}>
									<div className="pw-bar">
										<div className="pw-bar-inner" style={{ width: `${(pwInfo.score/5)*100}%` }} />
									</div>
									<div className="validation-list">
										<div className="validation-item">
											<span>{pwInfo.rules.minLen ? '✅' : '❌'}</span>
											<span>6+ caracteres</span>
										</div>
										<div className="validation-item">
											<span>{pwInfo.rules.hasLower ? '✅' : '❌'}</span>
											<span>minúscula</span>
										</div>
										<div className="validation-item">
											<span>{pwInfo.rules.hasUpper ? '✅' : '❌'}</span>
											<span>mayúscula</span>
										</div>
										<div className="validation-item">
											<span>{pwInfo.rules.hasDigit ? '✅' : '❌'}</span>
											<span>número</span>
										</div>
										<div className="validation-item">
											<span>{pwInfo.rules.hasSpecial ? '✅' : '❌'}</span>
											<span>especial</span>
										</div>
									</div>
								</div>
							</div>

							{/* CONFIRMAR CONTRASEÑA */}
							<div className="form-field col-span-2">
								<label className="form-label" htmlFor="ConfirmarContrasena">
									Confirmar contraseña <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
									<input 
										id="ConfirmarContrasena"
										type={showConfirmPassword ? "text" : "password"} 
										name="ConfirmarContrasena" 
										value={formData.ConfirmarContrasena} 
										onChange={handleChange} 
										className="form-input" 
										style={{ 
											width: '100%', 
											paddingRight: 40, 
											border: errors.ConfirmarContrasena ? '2px solid #d32f2f' : undefined, 
											boxSizing: 'border-box' 
										}}
										placeholder="••••••••"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
										style={{
											position: 'absolute',
											right: 12,
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											color: '#718096',
											fontSize: 18,
											padding: '8px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											transition: 'color 0.3s ease'
										}}
										onMouseEnter={(e) => e.target.style.color = '#0b4ea6'}
										onMouseLeave={(e) => e.target.style.color = '#718096'}
									>
										{showConfirmPassword ? '👁️' : '👁️‍🗨️'}
									</button>
								</div>
								{errors.ConfirmarContrasena && <span className="form-error">{errors.ConfirmarContrasena}</span>}
							</div>

							{/* DATOS ADICIONALES: CURP, RFC, SEXO, FECHA DE NACIMIENTO */}
							<div className="form-field col-span-2">
								<label className="form-label" htmlFor="CURP">
									CURP (18 caracteres) <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<input 
									id="CURP"
									type="text" 
									name="CURP" 
									value={formData.CURP} 
									onChange={handleChange} 
									className="form-input" 
									maxLength={18}
									placeholder="ABCD123456HDFRTI09"
									style={{ border: errors.CURP ? '2px solid #d32f2f' : undefined }} 
								/>
								{errors.CURP && <span className="form-error">{errors.CURP}</span>}
							</div>

							<div className="form-field col-span-2">
								<label className="form-label" htmlFor="RFC">
									RFC (12-13 caracteres) <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<input 
									id="RFC"
									type="text" 
									name="RFC" 
									value={formData.RFC} 
									onChange={handleChange} 
									className="form-input" 
									maxLength={13}
									placeholder="ABCD123456DF9"
									style={{ border: errors.RFC ? '2px solid #d32f2f' : undefined }} 
								/>
								{errors.RFC && <span className="form-error">{errors.RFC}</span>}
							</div>

							<div className="form-field col-span-2">
								<label className="form-label" htmlFor="SexoId">
									Sexo <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<select 
									id="SexoId"
									name="SexoId" 
									value={formData.SexoId} 
									onChange={handleChange} 
									className="form-input" 
									style={{ border: errors.SexoId ? '2px solid #d32f2f' : undefined }}
								>
									<option value="">Selecciona tu sexo...</option>
									<option value="1">Masculino</option>
									<option value="2">Femenino</option>
									<option value="3">No binario</option>
								</select>
								{errors.SexoId && <span className="form-error">{errors.SexoId}</span>}
							</div>

							<div className="form-field col-span-2">
								<label className="form-label" htmlFor="FechaNacimiento">
									Fecha de nacimiento <span style={{color:'#d32f2f'}}>*</span>
								</label>
								<input 
									id="FechaNacimiento"
									type="date" 
									name="FechaNacimiento" 
									value={formData.FechaNacimiento} 
									onChange={handleChange} 
									className="form-input" 
									style={{ border: errors.FechaNacimiento ? '2px solid #d32f2f' : undefined }} 
								/>
								{errors.FechaNacimiento && <span className="form-error">{errors.FechaNacimiento}</span>}
							</div>

							{/* POLÍTICAS Y BOTÓN */}
							<div className="form-field col-span-4">
								<label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
									<input
										type="checkbox"
										name="aceptaPoliticas"
										checked={formData.aceptaPoliticas}
										onChange={handleChange}
										style={{ width: '18px', height: '18px', cursor: 'pointer' }}
									/>
									Acepto los términos y condiciones <span style={{color:'#d32f2f'}}>*</span>
								</label>
								{errors.aceptaPoliticas && <span className="form-error">{errors.aceptaPoliticas}</span>}
							</div>

							<div className="form-field col-span-4" style={{ marginTop: 8 }}>
								<button 
									type="submit" 
									className="btn-primary" 
									disabled={sending || Object.values(errors).some(Boolean)}
								>
									{sending ? '⏳ Procesando...' : '✨ GENERAR JSON Y ENVIAR'}
								</button>
							</div>

							<div className="form-field col-span-4" style={{ textAlign: 'center', marginTop: 8 }}>
								<p style={{ margin: 0, fontSize: '14px' }}>
									¿Ya tienes cuenta? <Link to="/ingresar" style={{ color: '#0b4ea6', fontWeight: 700, textDecoration: 'none' }}>Inicia sesión</Link>
								</p>
							</div>

							{/* SECCIÓN DE VERIFICACIÓN */}
							{verificationSent && !verified && (
								<div className="form-field col-span-4">
									<div className="verification-section">
										<h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0b4ea6' }}>
											Verificación de correo
										</h3>
										<label className="form-label" htmlFor="codigoUsuario">
											Código de verificación
										</label>
										<input 
											id="codigoUsuario"
											type="text" 
											value={codigoUsuario} 
											onChange={(e) => setCodigoUsuario(e.target.value)} 
											className="form-input" 
											placeholder="Ingresa el código de 6 dígitos"
											maxLength={6}
										/>
										<div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
											<button 
												onClick={handleConfirmCode} 
												className="btn-primary" 
												type="button" 
												disabled={sending}
												style={{ flex: 1 }}
											>
												Verificar
											</button>
											<button 
												onClick={handleResend} 
												className="btn-primary" 
												type="button" 
												disabled={sending || resendCooldown > 0}
												style={{ 
													flex: 1, 
													background: resendCooldown > 0 ? '#ccc' : 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
													opacity: resendCooldown > 0 ? 0.65 : 1
												}}
											>
												{resendCooldown > 0 ? `${resendCooldown}s` : `Reenviar (${resendCount}/${MAX_RESEND})`}
											</button>
										</div>
									</div>
								</div>
							)}
						</div>
					</form>
				</div>

				{jsonResult && (
					<div className="json-result">
						<h3>✅ JSON GENERADO CORRECTAMENTE</h3>
						<pre>{JSON.stringify(jsonResult, null, 2)}</pre>
					</div>
				)}
			</div>
		</div>
	);
}

export default Registrarse;
