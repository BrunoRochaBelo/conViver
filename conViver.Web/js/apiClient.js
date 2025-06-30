// Base path for the API. With app.UsePathBase("/api/v1") the
// frontend must explicitly prefix requests with /api/v1.
// const API_BASE = 'http://localhost:5000/api/v1'; // Replaced by config
const API_BASE = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL ? window.APP_CONFIG.API_BASE_URL : '';

import { showSkeleton as displaySkeleton, hideSkeleton } from './skeleton.js';
import { showGlobalFeedback, showInlineSpinner } from './main.js';
import { xhrPost, createProgressBar, showProgress } from './progress.js';

/**
 * Custom error class for API requests.
 * Contains information about the HTTP status and the error message.
 */
class ApiError extends Error {
    constructor(message, status, url = null, requestOptions = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.url = url;
        this.requestOptions = requestOptions; // Could be used for more detailed debugging

        // Adjust prototype chain for ES5 compatibility if needed, not strictly necessary in modern JS
        // Object.setPrototypeOf(this, ApiError.prototype);
    }
}

export function getToken() {
    return localStorage.getItem('cv_token');
}

export function setToken(token) {
    localStorage.setItem('cv_token', token);
}

// Simple ETag cache using both in-memory Map and localStorage
const memoryCache = new Map();

function getCachedEntry(key) {
    if (memoryCache.has(key)) {
        return memoryCache.get(key);
    }
    const raw = localStorage.getItem('cv_cache_' + key);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            memoryCache.set(key, parsed);
            return parsed;
        } catch (e) {
            localStorage.removeItem('cv_cache_' + key);
        }
    }
    return null;
}

function setCachedEntry(key, etag, data) {
    const entry = { etag, data };
    memoryCache.set(key, entry);
    try {
        localStorage.setItem('cv_cache_' + key, JSON.stringify(entry));
    } catch (e) {
        // Ignore quota errors
    }
}

async function request(path, options = {}) {
    const {
        showSkeleton: skeletonTarget,
        params,
        elementToSpin, // For PUT, PATCH, DELETE, or non-FormData POSTs
        progressBarTarget, // HTMLElement where a progress bar should be appended for FormData POSTs
        successMessage, // Optional custom success message
        ...fetchOptions
    } = options || {};

    const method = fetchOptions.method || 'GET';
    let url = `${API_BASE}${path}`;

    if (params && (method === 'GET' || method === 'DELETE')) { // Query params can also be used with DELETE
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') {
                qs.append(k, v);
            }
        }
        const qsStr = qs.toString();
        if (qsStr) {
            url += (url.includes('?') ? '&' : '?') + qsStr;
        }
    }

    let skeletonTimer;
    let skeletonShown = false;
    let removeInlineSpinner = null;
    let progressBar; // Declare progress bar variable
    let cacheKey;
    let cachedEntry;

    if (method === 'GET' && skeletonTarget) {
        skeletonTimer = setTimeout(() => {
            displaySkeleton(skeletonTarget);
            skeletonShown = true;
        }, 350); // Show skeletons only for requests slower than ~350ms
    } else if (elementToSpin && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
        if (!(method === 'POST' && fetchOptions.body instanceof FormData)) { // Don't use inline spinner for FormData POSTs if progress bar is used
            removeInlineSpinner = showInlineSpinner(elementToSpin);
        }
    }

    // Log the request initiation
    console.info(`API Request: ${method} ${url}`);

    const opts = { ...fetchOptions, headers: { ...(fetchOptions.headers || {}) } };
    const token = getToken();
    if (token) {
        opts.headers['Authorization'] = `Bearer ${token}`;
    }

    if (method === 'GET') {
        cacheKey = url;
        cachedEntry = getCachedEntry(cacheKey);
        if (cachedEntry && cachedEntry.etag) {
            opts.headers['If-None-Match'] = cachedEntry.etag;
        }
    }

    // Special handling for FormData vs JSON body
    if (opts.body && !(opts.body instanceof FormData)) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
    } // For FormData, 'Content-Type' is set automatically by the browser with the correct boundary.

    // For logging, create a copy of options and redact sensitive data
    const loggedOptions = { ...opts };
    if (loggedOptions.headers && loggedOptions.headers['Authorization']) {
        loggedOptions.headers = { ...loggedOptions.headers, 'Authorization': 'Bearer [REDACTED]' };
    }
    if (loggedOptions.body instanceof FormData) {
        loggedOptions.bodyDescription = 'FormData object'; // Don't log FormData content
        delete loggedOptions.body;
    } else if (loggedOptions.body) {
        loggedOptions.bodyDescription = `Body of type ${typeof opts.body}, length ${opts.body.length}`;
        delete loggedOptions.body;
    }

    try {
        let resData;
        if (method === 'POST' && opts.body instanceof FormData) {
            // Use xhrPost for FormData to get progress
            if (progressBarTarget) {
                progressBar = createProgressBar();
                progressBarTarget.appendChild(progressBar);
                showProgress(progressBar, 0); // Show it immediately at 0%
            }
            resData = await xhrPost(path, opts.body, (percent) => {
                if (progressBar) {
                    showProgress(progressBar, percent);
                }
                if (elementToSpin && typeof elementToSpin.updateProgress === 'function') { // e.g. a button component that can show %
                    elementToSpin.updateProgress(percent);
                }
            }, true); // true for isFormData

        } else {
            const res = await fetch(url, opts);

            if (res.status === 304 && method === 'GET') {
                // Use cached data on 304
                resData = cachedEntry ? cachedEntry.data : null;
            } else if (!res.ok) {
                let errorMessage = res.statusText || `Request failed with status ${res.status}`;
                try {
                    const errorBody = await res.json();
                    if (errorBody && errorBody.message) {
                        errorMessage = errorBody.message;
                    } else if (errorBody && errorBody.title) { // ASP.NET Core specific problem details
                        errorMessage = errorBody.title;
                    }
                } catch (e) {
                    // Ignore JSON parsing error, use statusText as fallback
                }

                console.error(
                    `API Error: ${method} ${url} responded with ${res.status} ${res.statusText}. Message: "${errorMessage}"`,
                    { url, requestOptions: loggedOptions, status: res.status, responseBodyAttempt: res.bodyUsed ? '[consumed]' : 'available' }
                );
                // For GET requests, just throw the error. The caller will handle UI feedback.
                // For other methods (POST, PUT, DELETE, PATCH), show global feedback.
                if (method !== 'GET') {
                    showGlobalFeedback(errorMessage, 'error');
                }
                throw new ApiError(errorMessage, res.status, url, loggedOptions);
            } else {
                if (res.status === 204) { // No Content
                    resData = null;
                } else {
                    resData = await res.json();
                }
                if (method === 'GET') {
                    const newEtag = res.headers.get('etag');
                    if (newEtag) {
                        setCachedEntry(cacheKey, newEtag, resData);
                    }
                }
            }
        }

        // Handle success feedback (only for non-GET requests or if explicitly requested)
        if (method !== 'GET' || successMessage) {
            if (successMessage) {
                showGlobalFeedback(successMessage, 'success');
            } else {
                // Default success messages for non-GET
                if (method === 'POST') showGlobalFeedback('Item criado com sucesso!', 'success');
                else if (method === 'PUT' || method === 'PATCH') showGlobalFeedback('Alterações salvas com sucesso!', 'success');
                else if (method === 'DELETE') showGlobalFeedback('Item excluído com sucesso!', 'success');
            }
        }
        return resData;

    } catch (error) {
        // The ApiError thrown from res.ok block for non-GET methods would have already shown feedback.
        // This catch block now primarily handles network errors or other unexpected errors,
        // or ApiErrors from GET requests that haven't shown feedback yet.
        if (error instanceof ApiError) {
            if (method === 'GET') { // Only show feedback here for GET errors or if not already shown
                 // No global feedback for GET errors here; let the caller handle it.
            }
            throw error; // Re-throw ApiError instances directly
        } else {
            // Catch network errors or other unexpected errors for all methods
            const displayErrorMessage = error.message || "Ocorreu um erro de rede ou inesperado. Tente novamente.";
            console.error(
                `Network or unexpected error during API Request: ${method} ${url}. Error: ${error.message}`,
                { url, requestOptions: loggedOptions, originalError: error }
            );
            showGlobalFeedback(displayErrorMessage, 'error'); // Show global feedback for these types of errors
            throw new ApiError(displayErrorMessage, null, url, loggedOptions);
        }
    } finally {
        if (skeletonTimer) clearTimeout(skeletonTimer);
        if (skeletonTarget && skeletonShown) hideSkeleton(skeletonTarget);
        if (removeInlineSpinner) removeInlineSpinner();
        if (progressBar) {
            // Optionally hide progress bar on completion or remove it
            // For now, let's remove it after a short delay to show 100%
            setTimeout(() => {
                if (progressBar.parentElement) {
                    progressBar.remove();
                }
            }, 1000); // Keep it for 1 sec after completion/error
        }
    }
}

const apiClient = {
    get: (path, options) => {
        // Original logic to handle opts as params if it's a plain object
        if (options && typeof options === 'object' &&
            !options.method && !options.body && !options.headers &&
            !options.showSkeleton && !options.params &&
            !options.elementToSpin && !options.progressBarTarget && !options.successMessage) {
            return request(path, { params: options, method: 'GET', ...options });
        }
        return request(path, { method: 'GET', ...options });
    },
    post: (path, data, options) => { // data is typically the body
        return request(path, { method: 'POST', body: data, ...options });
    },
    put: (path, data, options) => { // data is typically the body
        return request(path, { method: 'PUT', body: data, ...options });
    },
    patch: (path, data, options) => { // data is typically the body
        return request(path, { method: 'PATCH', body: data, ...options });
    },
    delete: (path, options) => { // No body for delete, options might include params or elementToSpin
        return request(path, { method: 'DELETE', ...options });
    }
};

export default apiClient;
export { ApiError }; // Export ApiError so it can be caught specifically
