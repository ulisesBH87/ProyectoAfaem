// VALIDACIONES REUTILIZABLES PARA FORMULARIOS

export function computePasswordRequirements(pw) {
	const value = pw || '';
	const rules = {
		minLen: value.length >= 6,
		hasLower: /[a-z]/.test(value),
		hasUpper: /[A-Z]/.test(value),
		hasDigit: /\d/.test(value),
		hasSpecial: /[^A-Za-z0-9]/.test(value),
	};
	const score = Object.values(rules).reduce((s, v) => s + (v ? 1 : 0), 0);
	return { rules, score };
}

export function validateField(name, value, formData = {}) {
	if (name === 'Contrasena') {
		const pw = value || '';
		if (!pw) return 'La contraseña es obligatoria';
		if (pw.length < 6) return 'Debe tener mínimo 6 caracteres';
		if (!/[a-z]/.test(pw)) return 'Debe tener al menos una minúscula';
		if (!/[A-Z]/.test(pw)) return 'Debe tener al menos una mayúscula';
		if (!/\d/.test(pw)) return 'Debe tener al menos un número';
		if (!/[^A-Za-z0-9]/.test(pw)) return 'Debe tener al menos un símbolo';
		return '';
	}
	if (name === 'confirmarContrasena') {
		if (!value) return 'Confirma la contraseña';
		if (value !== formData.Contrasena) return 'Las contraseñas no coinciden';
		return '';
	}
	if (name === 'Correo') {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!String(value || '').trim()) return 'El correo es obligatorio';
		if (!emailRegex.test(value)) return 'Formato de correo inválido (ejemplo: nombre@dominio.com)';
		return '';
	}
	if (name === 'NumeroTelefono') {
		const phoneRegex = /^\d{10}$/;
		if (!String(value || '').trim()) return 'El teléfono es obligatorio';
		if (!phoneRegex.test(value)) return 'El teléfono debe tener exactamente 10 dígitos (solo números)';
		return '';
	}
	return '';
}
export async function checkDuplicates(API_BASE, data) {
	// MISMO COMPORTAMIENTO, RECIBE API_BASE Y DATA...
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

		const res = await fetch(`${API_BASE}/validate-unique/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

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

		return out;
	} catch (err) {
		console.error('Error comprobando duplicados:', err);
		return { networkError: true };
	}
}

export async function sendVerification(API_BASE, email, code) {
	try {
		await fetch(`${API_BASE}/send-verification/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, code }),
		});
		return true;
	} catch (err) {
		console.error('Error en sendVerification:', err);
		throw err;
	}
}

export async function uploadFile(API_BASE, file) {
	const allowedTypes = ['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
	const allowedExtensions = ['.pdf','.png','.jpg','.jpeg','.xlsx'];
	const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
	if (!allowedExtensions.includes(ext) || !allowedTypes.includes(file.type)) {
		const e = new Error('Tipo de archivo no permitido');
		e.code = 'INVALID_FILE';
		throw e;
	}
	const fd = new FormData();
	fd.append('file', file);
	const res = await fetch(`${API_BASE}/upload/`, { method: 'POST', body: fd });
	if (!res.ok) throw new Error('ERROR AL SUBIR EL ARCHIVO AL BACKEND');
	const data = await res.json();
	return data;
}
