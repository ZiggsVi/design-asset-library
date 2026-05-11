import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (username, password) => api.post('/auth/login', { username, password });
export const getMe = () => api.get('/auth/me');
export const register = (data) => api.post('/auth/register', data);
export const getUsers = () => api.get('/auth/users');
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/auth/users/${id}`);

// Categories
export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// Assets
export const getAssets = (params) => api.get('/assets', { params });
export const getAsset = (id) => api.get(`/assets/${id}`);
export const createAsset = (formData) => api.post('/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);
export const downloadAsset = (id) => api.get(`/assets/${id}/download`);

// Versions
export const uploadVersion = (assetId, formData) => api.post(`/assets/${assetId}/versions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getVersions = (assetId) => api.get(`/assets/${assetId}/versions`);
export const downloadVersion = (assetId, versionId) => api.get(`/assets/${assetId}/versions/${versionId}/download`);

export default api;
