import axios from 'axios';

// 1. Creamos la instancia
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
});

// 2. Configuramos el interceptor para el token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Exportamos UNA SOLA VEZ
export default api;
