// showGlobalFeedback removed to reduce toast noise
// Base path for the API. With app.UsePathBase("/api/v1") the
// frontend must explicitly prefix requests with /api/v1.
// const API_BASE = 'http://localhost:5000/api/v1'; // Replaced by config
const API_BASE = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL ? window.APP_CONFIG.API_BASE_URL : '';

// Loading overlay and automatic toast messages removed

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

async function request(path, options = {}) {
    const method = options.method || 'GET';
    const url = `${API_BASE}${path}`;

    // Log the request initiation
    console.info(`API Request: ${method} ${url}`);

    const opts = { ...options, headers: { ...(options.headers || {}) } };
    const token = getToken();
    if (token) {
        opts.headers['Authorization'] = `Bearer ${token}`;
    }
    if (opts.body && typeof opts.body !== 'string') {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
    }

    // For logging, create a copy of options and redact sensitive data
    const loggedOptions = { ...opts };
    if (loggedOptions.headers && loggedOptions.headers['Authorization']) {
        loggedOptions.headers = { ...loggedOptions.headers, 'Authorization': 'Bearer [REDACTED]' };
    }
    if (loggedOptions.body) { // Avoid logging potentially large or sensitive request bodies
        loggedOptions.bodyDescription = `Body of type ${typeof opts.body}, length ${opts.body.length}`;
        delete loggedOptions.body;
    }


    try {
        const res = await fetch(url, opts);

        if (!res.ok) {
            let errorMessage = res.statusText;
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
            throw new ApiError(errorMessage, res.status, url, loggedOptions);
        }

        if (res.status === 204) { // No Content
            return null;
        }
        return res.json();

    } catch (error) {
        if (error instanceof ApiError) {
            // Re-throw ApiError instances directly
            throw error;
        } else {
            // Catch network errors or other unexpected errors during fetch
            console.error(
                `Network or unexpected error during API Request: ${method} ${url}. Error: ${error.message}`,
                { url, requestOptions: loggedOptions, originalError: error }
            );
            throw new ApiError(`Network request failed for ${method} ${url}. ${error.message}`, null, url, loggedOptions);
        }
    } finally {
        // no overlay to hide
    }
}

const apiClient = {
    get: (path) => request(path), // Changed 'url' to 'path' for consistency
    post: (path, data) => request(path, { method: 'POST', body: data }),
    put: (path, data) => request(path, { method: 'PUT', body: data }),
    delete: (path) => request(path, { method: 'DELETE' })
};

export default apiClient;
export { ApiError }; // Export ApiError so it can be caught specifically
