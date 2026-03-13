import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AfaemLogo from '../assets/afaem-logo@4x.png';
import AmateurLogo from '../assets/amateur-logo.png';
import FmfLogo from '../assets/fmf-logo.png';
import { API_BASE } from '../config/config';
import { apiRegister } from '../api';
import { computePasswordRequirements, validateField } from '../formUtils';

function RegistrarseCuenta() {
	const navigate = useNavigate();
	
	// ESTADO DEL FORMULARIO
	const [formData, setFormData] = useState({
		Nombre: '',
		PrimerApellido: '',
		SegundoApellido: '',
		Correo: '',
		NumeroTelefono: '',
		Contrasena: '',
		confirmarContrasena: '',
		aceptaPoliticas: false,
	});
	
	// ESTADO DE VISIBILIDAD DE CONTRASEÑA
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	
	// ESTADO DE ERRORES Y MENSAJES
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [err, setErr] = useState(null);
	const [pwInfo, setPwInfo] = useState({ rules: { minLen: false, hasLower: false, hasUpper: false, hasDigit: false, hasSpecial: false }, score: 0 });
	


	// ACTUALIZAR VALIDACIÓN DE CONTRASEÑA EN TIEMPO REAL
	useEffect(() => {
		setPwInfo(computePasswordRequirements(formData.Contrasena));
	}, [formData.Contrasena]);

	// MANEJAR CAMBIOS EN INPUTS
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value
		}));
		
		// VALIDAR CAMPO EN TIEMPO REAL 
		if (name !== 'Contrasena') {
			setErrors((prev) => ({ ...prev, [name]: validateField(name, value, formData) }));
		}
	};

	// ENVIAR FORMULARIO
	const handleSubmit = async (e) => {
		e.preventDefault();
		setErr(null);
		
		// VALIDAR TODOS LOS CAMPOS
		const newErrors = {};
		Object.keys(formData).forEach((field) => {
			if (field !== 'SegundoApellido') { // SEGUNDO APELLIDO ES OPCIONAL, ROL FIJO
				newErrors[field] = validateField(field, formData[field], formData);
			}
		});
		
		setErrors(newErrors);
		if (Object.values(newErrors).some(Boolean)) return;

		setLoading(true);
		try {
			const payload = {
				Nombre: formData.Nombre,
				PrimerApellido: formData.PrimerApellido,
				SegundoApellido: formData.SegundoApellido,
				Correo: formData.Correo,
				Contrasena: formData.Contrasena,
				NumeroTelefono: formData.NumeroTelefono,
				Rol: 'responsable'
			};
			const res = await apiRegister(payload);
			if (res.ok) {
				setSuccess(true);
				setTimeout(() => navigate('/ingresar'), 2500);
			} else {
				// MANEJAR ERROR DE CORREO DUPLICADO
				const detail = res.json?.detail || 'Error en el registro.';
				const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
				if (detailStr.toLowerCase().includes('correo')) {
					setErr('El correo electrónico ya está en uso');
				} else {
					setErr(detailStr);
				}
			}
		} catch (error) {
			setErr('Error de red o del servidor.');
			console.error('Registro error:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="signup">
			<style>{`
				.signup { display:flex; justify-content:center; padding:12px; box-sizing:border-box; background: linear-gradient(180deg, #3d79ff 0%, #1e5be6 100%); min-height: 100vh; }
				.card {
					position:relative;
					overflow:visible;
					width:100%;
					max-width:920px;
					background:transparent;
					border-radius:14px;
					padding:40px;
					padding-bottom:0;
					box-shadow: none;
					position: relative;
					z-index: 100;
				}
				.card-body {
					position: relative;
					z-index: 101;
					background: #fff;
					border-radius: 14px;
					padding: 40px;
					box-shadow: 0 18px 50px rgba(11,78,166,0.08);
				}
				.card-logos{ position:absolute; top:28px; left:28px; right:28px; display:flex; justify-content:space-between; align-items:center; pointer-events:none; user-select:none; z-index:10003; }
				.left-logo{ height:72px; max-width:180px; object-fit:contain; opacity:0.95; } 
				.right-logos{ display:flex; gap:16px; align-items:center; pointer-events:none; }
				.right-logos img { height:56px; max-height:64px; object-fit:contain; opacity:0.95; } 
				.form-grid{ display:grid; grid-template-columns:repeat(12,1fr); gap:12px 16px; }
				.form-field{ grid-column: span 6; }
				.form-field.full{ grid-column: span 12; }
				.form-field.col-span-3{ grid-column: span 9; }
				.form-label{ font-size:12px; margin-bottom:8px; font-weight:700; color:#0b2546; text-transform:uppercase; letter-spacing:0.5px; }
				.form-input, .form-select{ width:100%; padding:10px 12px; border-radius:8px; height:40px; border:1px solid #d6e6ff; box-sizing:border-box; font-size:14px; transition: all 0.2s; }
				.form-input:focus, .form-select:focus{ outline:none; border-color:#2b7be6; box-shadow: 0 0 0 3px rgba(43,123,230,0.1); }
				.form-input.is-invalid, .form-select.is-invalid { border-color:#c62828; }
				.password-wrapper{ position: relative; display: flex; align-items: center; }
				.password-input{ padding-right: 40px; }
				.password-toggle{ position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: #5b6b87; font-size: 18px; padding: 4px 8px; display: flex; align-items: center; justify-content: center; }
				.password-toggle:hover{ color: #2b7be6; }
				.form-error{ color:#c62828; font-size:12px; margin-top:6px; display:block; animation: fadeIn 0.3s; }
				.alert{ padding: 14px 16px; border-radius: 8px; font-size: 14px; margin-top: 16px; animation: fadeIn 0.3s; }
				.alert-danger{ background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
				.alert-success{ background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
				.password-strength{ margin-top: 12px; }
				.strength-bar{ height: 6px; background: #e6eefc; border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
				.strength-bar-fill{ height: 100%; background: linear-gradient(90deg, #1e5be6, #3d79ff); transition: width 0.3s; }
				.strength-items{ display: flex; flex-wrap: wrap; gap: 8px; }
				.strength-item{ font-size: 12px; color: #5b6b87; }
				.strength-item.met{ color: #2e7d32; }
				.btn-primary{ display:block; width:100%; padding:12px 16px; font-weight:700; background:linear-gradient(180deg,#3d79ff,#1e5be6); color:#fff; border-radius:10px; border:none; cursor:pointer; font-size:15px; margin-top:20px; transition: all 0.2s; }
				.btn-primary:hover:not(:disabled){ transform: translateY(-2px); box-shadow: 0 8px 20px rgba(61, 121, 255, 0.3); }
				.btn-primary:disabled{ opacity: 0.7; cursor: not-allowed; }
				.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid #3d79ff; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 8px; vertical-align: middle; }
				@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
				@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
				.checkbox-wrapper{ display: flex; align-items: flex-start; gap: 10px; margin-top: 16px; }
				.checkbox-input{ width: 18px; height: 18px; cursor: pointer; accent-color: #3d79ff; margin-top: 2px; }
				.checkbox-label{ font-size: 13px; color: #5b6b87; line-height: 1.5; }
				.checkbox-label a{ color: #2b7be6; text-decoration: none; font-weight: 600; }
				.checkbox-label a:hover{ text-decoration: underline; }
				.success-card{ background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 40px; border-radius: 12px; text-align: center; animation: slideUp 0.5s ease-out; }
				@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
				.success-icon{ font-size: 64px; margin-bottom: 16px; animation: scaleIn 0.5s ease-out; }
				@keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
				.success-title{ font-size: 24px; font-weight: 700; color: #2e7d32; margin-bottom: 8px; }
				.success-subtitle{ font-size: 14px; color: #558b2f; margin-bottom: 24px; }
				.btn-login{ display: inline-block; padding: 12px 32px; background: #2e7d32; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s; }
				.btn-login:hover{ background: #1b5e20; transform: translateY(-2px); }
				.text-center-link{ text-align: center; margin-top: 24px; font-size: 14px; color: #5b6b87; }
				.text-center-link a{ color: #2b7be6; text-decoration: none; font-weight: 600; }
				.text-center-link a:hover{ text-decoration: underline; }
				@media (max-width:900px){ 
					.card-logos{ display:none !important; }
					.form-field, .form-field.full{ grid-column: span 12; }
					.card { padding: 24px; }
					.white-bg-card { display: none; }
					.card-body { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
				}
			`}</style>
			
			<div className="container position-relative" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
				{/* LOGOS */}
				<div className="d-none d-md-flex justify-content-between align-items-center position-absolute w-100" style={{ top: '0px', left: 0, right: 0, pointerEvents: 'none', zIndex: 10 }}>
					<img src={AfaemLogo} alt="AFAEM" style={{ height: 72, maxWidth: 180, objectFit: 'contain', opacity: 0.95 }} />
					<div className="d-flex gap-4 align-items-center">
						<img src={AmateurLogo} alt="Amateur" style={{ height: 56, maxWidth: 120, objectFit: 'contain', opacity: 0.95 }} />
						<img src={FmfLogo} alt="FMF" style={{ height: 56, maxWidth: 120, objectFit: 'contain', opacity: 0.95 }} />
					</div>
				</div>
				
				{/* CARD PRINCIPAL */}
				<div className="card mx-auto" style={{ maxWidth: 720, marginTop: '30px' }}>
					{success ? (
						// PANTALLA DE ÉXITO
						<div className="success-card">
							<div className="success-icon">✅</div>
							<h2 className="success-title">Registro exitoso</h2>
							<p className="success-subtitle">Puedes iniciar sesión con tu cuenta</p>
							<button 
								onClick={() => navigate('/ingresar')}
								className="btn-login"
							>
								Ir al inicio de sesión
							</button>
						</div>
					) : (
						// FORMULARIO DE REGISTRO
						<div className="card-body">
							<h2 className="text-center mb-3" style={{ fontWeight: 700, fontSize: 28, color: '#0b2546' }}>
								REGISTRO DE USUARIO
							</h2>
							<p className="text-center mb-4" style={{ fontSize: 14, color: '#5b6b87' }}>
								Completa el formulario para crear tu cuenta en AFAEM
							</p>
							
							<form onSubmit={handleSubmit}>
								<div className="form-grid">
									{/* NOMBRE */}
									<div className="form-field">
										<label className="form-label" htmlFor="nombreInput">Nombre *</label>
										<input 
											id="nombreInput" 
											name="Nombre" 
											value={formData.Nombre} 
											onChange={handleChange} 
											className={`form-input${errors.Nombre ? ' is-invalid' : ''}`}
											placeholder="Tu nombre"
											aria-required="true" 
											aria-invalid={!!errors.Nombre} 
										/>
										{errors.Nombre && <div className="form-error">{errors.Nombre}</div>}
									</div>
									
									{/* PRIMER APELLIDO */}
									<div className="form-field">
										<label className="form-label" htmlFor="primerApellidoInput">Primer Apellido *</label>
										<input 
											id="primerApellidoInput" 
											name="PrimerApellido" 
											value={formData.PrimerApellido} 
											onChange={handleChange} 
											className={`form-input${errors.PrimerApellido ? ' is-invalid' : ''}`}
											placeholder="Tu primer apellido"
											aria-required="true" 
											aria-invalid={!!errors.PrimerApellido} 
										/>
										{errors.PrimerApellido && <div className="form-error">{errors.PrimerApellido}</div>}
									</div>
									
									{/* SEGUNDO APELLIDO */}
									<div className="form-field">
										<label className="form-label" htmlFor="segundoApellidoInput">Segundo Apellido</label>
										<input 
											id="segundoApellidoInput" 
											name="SegundoApellido" 
											value={formData.SegundoApellido} 
											onChange={handleChange} 
											className="form-input"
											placeholder="Tu segundo apellido (opcional)"
										/>
									</div>
									
									{/* CORREO */}
									<div className="form-field">
										<label className="form-label" htmlFor="correoInput">Correo *</label>
										<input 
											id="correoInput" 
											name="Correo" 
											type="email"
											value={formData.Correo} 
											onChange={handleChange} 
											className={`form-input${errors.Correo ? ' is-invalid' : ''}`}
											placeholder="tu.correo@ejemplo.com"
											aria-required="true" 
											aria-invalid={!!errors.Correo} 
											autoComplete="email" 
										/>
										{errors.Correo && <div className="form-error">{errors.Correo}</div>}
									</div>
									
									{/* TELÉFONO */}
									<div className="form-field">
										<label className="form-label" htmlFor="telefonoInput">Teléfono *</label>
										<input 
											id="telefonoInput" 
											name="NumeroTelefono" 
											value={formData.NumeroTelefono} 
											onChange={handleChange} 
											className={`form-input${errors.NumeroTelefono ? ' is-invalid' : ''}`}
											placeholder="1234567890"
											aria-required="true" 
											aria-invalid={!!errors.NumeroTelefono} 
											autoComplete="tel" 
										/>
										{errors.NumeroTelefono && <div className="form-error">{errors.NumeroTelefono}</div>}
									</div>
									
									{/* CONTRASEÑA */}
									<div className="form-field full">
										<label className="form-label" htmlFor="contrasenaInput">Contraseña *</label>
										<div className="password-wrapper">
											<input 
												id="contrasenaInput" 
												type={showPassword ? "text" : "password"}
												name="Contrasena" 
												value={formData.Contrasena} 
												onChange={handleChange} 
												className={`form-input password-input${errors.Contrasena ? ' is-invalid' : ''}`}
												placeholder="Crea una contraseña segura"
												aria-required="true" 
												aria-invalid={!!errors.Contrasena}
												autoComplete="new-password" 
											/>
											<button
												type="button"
												className="password-toggle"
												onClick={() => setShowPassword(!showPassword)}
												aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
											>
												{showPassword ? '👁️‍🗨️' : '👁️'}
											</button>
										</div>
										{errors.Contrasena && <div className="form-error">{errors.Contrasena}</div>}
										
										{/* INDICADOR DE FORTALEZA */}
										<div className="password-strength">
											<div className="strength-bar">
												<div 
													className="strength-bar-fill" 
													style={{ width: `${(pwInfo.score / 5) * 100}%` }}
												/>
											</div>
											<div className="strength-items">
												<span className={`strength-item ${pwInfo.rules.minLen ? 'met' : ''}`}>
													{pwInfo.rules.minLen ? '✅' : '⬜'} 6+ caracteres
												</span>
												<span className={`strength-item ${pwInfo.rules.hasLower ? 'met' : ''}`}>
													{pwInfo.rules.hasLower ? '✅' : '⬜'} minúscula
												</span>
												<span className={`strength-item ${pwInfo.rules.hasUpper ? 'met' : ''}`}>
													{pwInfo.rules.hasUpper ? '✅' : '⬜'} mayúscula
												</span>
												<span className={`strength-item ${pwInfo.rules.hasDigit ? 'met' : ''}`}>
													{pwInfo.rules.hasDigit ? '✅' : '⬜'} número
												</span>
												<span className={`strength-item ${pwInfo.rules.hasSpecial ? 'met' : ''}`}>
													{pwInfo.rules.hasSpecial ? '✅' : '⬜'} símbolo
												</span>
											</div>
										</div>
									</div>
									
									{/* CONFIRMAR CONTRASEÑA */}
									<div className="form-field full">
										<label className="form-label" htmlFor="confirmarContrasenaInput">Confirmar Contraseña *</label>
										<div className="password-wrapper">
											<input 
												id="confirmarContrasenaInput" 
												type={showConfirmPassword ? "text" : "password"}
												name="confirmarContrasena" 
												value={formData.confirmarContrasena} 
												onChange={handleChange} 
												className={`form-input password-input${errors.confirmarContrasena ? ' is-invalid' : ''}`}
												placeholder="Confirma tu contraseña"
												aria-required="true" 
												aria-invalid={!!errors.confirmarContrasena}
												autoComplete="new-password" 
											/>
											<button
												type="button"
												className="password-toggle"
												onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
											>
												{showConfirmPassword ? '👁️‍🗨️' : '👁️'}
											</button>
										</div>
										{errors.confirmarContrasena && <div className="form-error">{errors.confirmarContrasena}</div>}
									</div>
									
									{/* POLÍTICAS */}
									<div className="form-field full">
										<div className="checkbox-wrapper">
											<input
												id="aceptaPoliticas"
												type="checkbox"
												name="aceptaPoliticas"
												checked={formData.aceptaPoliticas}
												onChange={handleChange}
												className="checkbox-input"
												aria-required="true"
											/>
											<label htmlFor="aceptaPoliticas" className="checkbox-label">
												He leído y acepto la 
												<a href="/privacidad" target="_blank" rel="noopener noreferrer"> Política de Privacidad</a>,
												<a href="/terminos" target="_blank" rel="noopener noreferrer"> Términos y Condiciones</a>
												{' '}y la
												<a href="/responsabilidad" target="_blank" rel="noopener noreferrer"> Responsabilidad Limitada de AFAEM</a>
											</label>
										</div>
										{errors.aceptaPoliticas && <div className="form-error" style={{ marginTop: '8px' }}>{errors.aceptaPoliticas}</div>}
									</div>
									
									{/* ERRORES */}
									{err && (
										<div className="form-field full">
											<div className="alert alert-danger">
												⚠️ {err}
											</div>
										</div>
									)}
									
									{/* BOTÓN ENVÍO */}
									<div className="form-field full">
										<button 
											className="btn-primary" 
											type="submit" 
											disabled={loading}
										>
											{loading && <span className="spinner" />}
											{loading ? 'Registrando...' : 'Regístrate'}
										</button>
									</div>
								</div>
							</form>
							
							{/* ENLACE A LOGIN */}
							<div className="text-center-link">
								¿Ya tienes cuenta? <Link to="/ingresar">Inicia sesión aquí</Link>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default RegistrarseCuenta;
