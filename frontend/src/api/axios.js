import axios from 'axios';

const api = axios.create({
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api'
        : 'https://ai-stylist-6l22.onrender.com/api',
});


api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
