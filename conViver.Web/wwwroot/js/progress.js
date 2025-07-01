export function createProgressBar() {
    const container = document.createElement('div');
    container.className = 'cv-progress';
    const bar = document.createElement('div');
    bar.className = 'cv-progress__bar';
    container.appendChild(bar);
    container.style.display = 'none';
    return container;
}

export function showProgress(container, percent) {
    if (!container) return;
    const bar = container.querySelector('.cv-progress__bar');
    if (!bar) return;
    container.style.display = 'block';
    const clamped = Math.max(0, Math.min(100, percent));
    bar.style.width = clamped + '%';
}

export function xhrPost(path, data, onProgress, isFormData = false) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = (window.APP_CONFIG?.API_BASE_URL || '') + path;
        xhr.open('POST', url);
        const token = localStorage.getItem('cv_token') || localStorage.getItem('authToken');
        if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
        if (!isFormData) {
            xhr.setRequestHeader('Content-Type', 'application/json');
        }
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && typeof onProgress === 'function') {
                const percent = (e.loaded / e.total) * 100;
                onProgress(percent);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                let result = null;
                const ct = xhr.getResponseHeader('content-type') || '';
                if (ct.includes('application/json')) {
                    try { result = JSON.parse(xhr.responseText); } catch {}
                }
                resolve(result);
            } else {
                let msg = 'Erro ' + xhr.status;
                try { const obj = JSON.parse(xhr.responseText); if (obj.message) msg = obj.message; } catch {}
                const err = new Error(msg);
                err.status = xhr.status;
                reject(err);
            }
        };
        xhr.onerror = () => {
            const err = new Error('Erro de rede');
            err.status = xhr.status;
            reject(err);
        };
        const payload = isFormData ? data : JSON.stringify(data);
        xhr.send(payload);
    });
}
