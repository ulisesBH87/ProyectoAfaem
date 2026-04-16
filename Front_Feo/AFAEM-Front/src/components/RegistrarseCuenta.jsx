import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRegister } from '../services/api';
import { computePasswordRequirements, validateField } from '../utils/formUtils';
import AuthHeader from './Auth/AuthHeader';
import RegistrationSuccess from './Auth/RegistrationSuccess';

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
		const finalValue = name === 'Correo' ? value.toLowerCase() : value;
		
		setFormData((prev) => {
			const next = {
				...prev,
				[name]: type === 'checkbox' ? checked : finalValue
			};
			
			setErrors((prevErrors) => {
				const updatedErrors = {
					...prevErrors,
					[name]: validateField(name, next[name], next)
				};
				if (name === 'Contrasena') {
					updatedErrors.confirmarContrasena = validateField('confirmarContrasena', next.confirmarContrasena, next);
				}
				return updatedErrors;
			});
			return next;
		});
	};

	// ENVIAR FORMULARIO
	const handleSubmit = async (e) => {
		e.preventDefault();
		setErr(null);
		
		const newErrors = {};
		Object.keys(formData).forEach((field) => {
			if (field !== 'SegundoApellido') {
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
				Correo: formData.Correo.toLowerCase(),
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
				const detail = res.json?.detail || 'Error en el registro, inténtalo de nuevo más tarde.';
				const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
				if (detailStr.toLowerCase().includes('correo')) {
					setErr('El correo electrónico ya está en uso');
				} else {
					setErr(detailStr);
				}
			}
		} catch (error) {
			setErr('Error de red o del servidor.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-page fade-in-up">
			<div className="auth-overlay"></div>
			<div className="auth-content">
				<div className="glass-dark" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', borderRadius: '24px', position: 'relative' }}>
					
					{success ? (
						<RegistrationSuccess />
					) : (
						<div>
							<AuthHeader 
                title="Registro de Usuario" 
                subtitle="Completa el formulario para unirte a la plataforma AFAEM" 
              />

							<form onSubmit={handleSubmit}>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
									
									<div style={{ gridColumn: 'span 1' }}>
										<label className="auth-label">Nombre *</label>
										<input name="Nombre" value={formData.Nombre} onChange={handleChange} className="auth-input" placeholder="Tu nombre" required />
										{errors.Nombre && <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px' }}>{errors.Nombre}</div>}
									</div>

									<div style={{ gridColumn: 'span 1' }}>
										<label className="auth-label">Primer Apellido *</label>
										<input name="PrimerApellido" value={formData.PrimerApellido} onChange={handleChange} className="auth-input" placeholder="Apellido paterno" required />
										{errors.PrimerApellido && <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px' }}>{errors.PrimerApellido}</div>}
									</div>

									<div style={{ gridColumn: 'span 1' }}>
										<label className="auth-label">Segundo Apellido</label>
										<input name="SegundoApellido" value={formData.SegundoApellido} onChange={handleChange} className="auth-input" placeholder="Apellido materno (opcional)" />
									</div>

									<div style={{ gridColumn: 'span 1' }}>
										<label className="auth-label">Correo electrónico *</label>
										<input name="Correo" type="email" value={formData.Correo} onChange={handleChange} className="auth-input" placeholder="ejemplo@correo.com" required />
										{errors.Correo && <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px' }}>{errors.Correo}</div>}
									</div>

									<div style={{ gridColumn: 'span 1' }}>
										<label className="auth-label">Teléfono *</label>
										<input name="NumeroTelefono" value={formData.NumeroTelefono} onChange={handleChange} className="auth-input" placeholder="10 dígitos" required />
										{errors.NumeroTelefono && <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px' }}>{errors.NumeroTelefono}</div>}
									</div>

									<div style={{ gridColumn: 'span 1' }}>
										<label className="auth-label">Contraseña *</label>
										<div style={{ position: 'relative' }}>
											<input type={showPassword ? "text" : "password"} name="Contrasena" value={formData.Contrasena} onChange={handleChange} className="auth-input" placeholder="••••••••" required />
											<button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', zIndex: 10 }}>
												{showPassword ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
											</button>
										</div>
										<div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '10px', overflow: 'hidden' }}>
											<div style={{ height: '100%', width: `${(pwInfo.score / 5) * 100}%`, background: 'var(--primary)', transition: 'width 0.3s' }} />
										</div>
									</div>

									<div style={{ gridColumn: 'span 1' }}>
										<label className="auth-label">Confirmar Contraseña *</label>
										<div style={{ position: 'relative' }}>
											<input type={showConfirmPassword ? "text" : "password"} name="confirmarContrasena" value={formData.confirmarContrasena} onChange={handleChange} className="auth-input" placeholder="••••••••" required />
											<button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', zIndex: 10 }}>
												{showConfirmPassword ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
											</button>
										</div>
										{formData.confirmarContrasena && formData.confirmarContrasena !== formData.Contrasena && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px' }}>Las contraseñas no coinciden</div>}
									</div>

									<div style={{ gridColumn: 'span 2' }}>
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
											{Object.entries(pwInfo.rules).map(([key, met]) => {
												const labels = {
													minLen: '8+ car.',
													hasLower: 'minús.',
													hasUpper: 'mayús.',
													hasDigit: 'número',
													hasSpecial: 'especial'
												};
												return (
													<span key={key} style={{ fontSize: '10px', color: met ? 'var(--secondary)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
														{met ? '✅' : '⬜'} {labels[key]}
													</span>
												);
											})}
										</div>
									</div>

									<div style={{ gridColumn: 'span 2' }}>
										<div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
											<input id="aceptaPoliticas" type="checkbox" name="aceptaPoliticas" checked={formData.aceptaPoliticas} onChange={handleChange} style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary)' }} required />
											<label htmlFor="aceptaPoliticas" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
												He leído y acepto la <Link to="/privacidad" style={{ color: 'white' }}>Política de Privacidad</Link> y los <Link to="/terminos" style={{ color: 'white' }}>Términos y Condiciones</Link>
											</label>
										</div>
									</div>

									{err && <div style={{ gridColumn: 'span 2', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>⚠️ {err}</div>}

									<div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
										<button className="btn-premium" type="submit" disabled={loading} style={{ width: '100%', padding: '16px' }}>
											{loading ? 'Registrando...' : 'Finalizar Registro'}
										</button>
									</div>
								</div>
							</form>

							<div style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
								¿Ya tienes cuenta? <Link to="/ingresar" style={{ color: 'white', fontWeight: '700', textDecoration: 'none' }}>Inicia sesión aquí</Link>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default RegistrarseCuenta;
