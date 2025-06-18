const apiClient = {
    get: (url) => fetch(url).then(r => r.json()),
};
export default apiClient;
