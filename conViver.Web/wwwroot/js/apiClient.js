// Base path for the API. When the backend uses app.UsePathBase("/api/v1")
// the frontend should include this prefix in each request instead of
// relying on the client to append it.
const API_BASE = '';

export function getToken() {
    return localStorage.getItem('cv_token');
}

export function setToken(token) {
    localStorage.setItem('cv_token', token);
}

async function request(path, options = {}) {
    const opts = { ...options, headers: { ...(options.headers || {}) } };
    const token = getToken();
    if (token) {
        opts.headers['Authorization'] = `Bearer ${token}`;
    }
    if (opts.body && typeof opts.body !== 'string') {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) throw new Error('API request failed');
    if (res.status === 204) return null;
    return res.json();
}

const apiClient = {
    get: (url) => request(url),
    post: (url, data) => request(url, { method: 'POST', body: data }),
    put: (url, data) => request(url, { method: 'PUT', body: data }),
    delete: (url) => request(url, { method: 'DELETE' })
};

export default apiClient;
