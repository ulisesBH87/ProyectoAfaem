// SE REALIZA LA LÓGICA PREVIDA DE DEFAULT_API_BASE POR LA CONFIGURACIÓN CENTRALIZADA
import { API_BASE, API_CANDIDATES } from './config/config';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithTimeout(url, opts = {}, ms = 5000, retries = 1) {
	let attempt = 0;
	const baseDelay = 500;
	while (true) {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), ms);
		try {
			const res = await fetch(url, { ...opts, signal: controller.signal });
			clearTimeout(id);
			if (!res.ok && attempt < retries) {
				attempt++;
				await sleep(baseDelay * Math.pow(2, attempt - 1));
				continue;
			}
			return res;
		} catch (err) {
			clearTimeout(id);
			if (attempt < retries) {
				attempt++;
				await sleep(baseDelay * Math.pow(2, attempt - 1));
				continue;
			}
			throw err;
		}
	}
}

// postJSON USA API_BASE (PRIMARIO) POR COMPATIBILIDAD
export async function postJSON(path, payload = {}, opts = {}) {
	const url = (path.startsWith('http') ? path : `${API_BASE}${path}`);
	const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
	const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(payload) }, opts.timeout || 7000, opts.retries || 1);
	let json = null;
	try { json = await res.json(); } catch (e) { /* NO JSON */ }
	return { ok: res.ok, status: res.status, json, res };
}

// SUBIDA CON PROGRESO: buildCandidates usa API_CANDIDATES Y VARIANTES /api y /uploads
export function uploadFile(path, file, onProgress = () => {}, extraFields = {}) {
	// CONSTRUIR LISTA DE URL's CANDIDATAS USANDO API_CANDIDATES (SI HAY) Y ALGUNAS VARIANTES
	const buildCandidates = () => {
		const p = path.startsWith('/') ? path : `/${path}`;
		const baseCandidates = (Array.isArray(API_CANDIDATES) && API_CANDIDATES.length) ? API_CANDIDATES.slice() : [API_BASE || ''];
		const extras = [];
		for (const b of baseCandidates) {
			if (!b) continue;
			extras.push(`${b}${p}`);
			extras.push(`${b}/api${p}`);
			extras.push(`${b}/uploads${p}`);
		}
		return Array.from(new Set(extras.filter(Boolean)));
	};

	const candidates = buildCandidates();
	return new Promise((resolve, reject) => {
		let attempt = 0;
		const tryNext = () => {
			if (attempt >= candidates.length) {
				reject(new Error(`Upload failed. Tried: ${candidates.join(', ')}`));
				return;
			}
			const url = candidates[attempt++];
			const xhr = new XMLHttpRequest();
			const fd = new FormData();
			fd.append('file', file);
			Object.entries(extraFields).forEach(([k, v]) => fd.append(k, v));
			xhr.open('POST', url, true);
			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
			};
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status >= 200 && xhr.status < 300) {
						try { resolve(JSON.parse(xhr.responseText)); } catch (err) { resolve({ raw: xhr.responseText }); }
					} else {
						console.warn(`Upload attempt to ${url} failed with status ${xhr.status}`);
						if (attempt < candidates.length) tryNext();
						else reject(new Error(`Upload failed ${xhr.status}: ${xhr.responseText || ''} (tried: ${candidates.join(', ')})`));
					}
				}
			};
			xhr.onerror = () => {
				console.warn(`Network error uploading to ${url}`);
				if (attempt < candidates.length) tryNext();
				else reject(new Error(`Network error during upload to ${url} (tried: ${candidates.join(', ')})`));
			};
			xhr.send(fd);
		};
		tryNext();
	});
}

// UTILIDADES ESPECÍFICAS 
export async function validateUnique(payload) { return postJSON('/validate-unique/', payload, { timeout: 5000, retries: 1 }); }
export async function sendVerificationAPI(email, code) { return postJSON('/send-verification/', { email, code }, { timeout: 5000, retries: 1 }); }

// NUEVO EXPORT ESPERADO POR Login.jsx

export async function login(credentials = {}) {
	const loginPayload = {
		email: credentials.Correo || credentials.email,
		password: credentials.Contrasena || credentials.password
	};
	return postJSON('/auth/iniciar-sesion', loginPayload, { timeout: 7000, retries: 2 });
}

// REGISTRO DE USUARIO

export async function apiRegister(data) {
	return postJSON('/auth/registro', data);
}
