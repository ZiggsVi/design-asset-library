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
export const getCategories = (params) => api.get('/categories', { params });
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
export const batchUploadAssets = (formData) => api.post('/assets/batch', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAssetBatch = (batchId) => api.get(`/assets/batch/${batchId}`);

// Versions
export const uploadVersion = (assetId, formData) => api.post(`/assets/${assetId}/versions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getVersions = (assetId) => api.get(`/assets/${assetId}/versions`);
export const downloadVersion = (assetId, versionId) => api.get(`/assets/${assetId}/versions/${versionId}/download`);

// Projects
export const getProjects = (params) => api.get('/projects', { params });
export const createProject = (data) => api.post('/projects', data);
export const getProject = (id) => api.get(`/projects/${id}`);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Project material links
export const linkMaterial = (projectId, assetId, note) => api.post(`/projects/${projectId}/materials`, { assetId, note });
export const unlinkMaterial = (projectId, linkId) => api.delete(`/projects/${projectId}/materials/${linkId}`);

// Project requirement files
export const uploadReqFile = (projectId, formData) => api.post(`/projects/${projectId}/req-files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteReqFile = (projectId, fileId) => api.delete(`/projects/${projectId}/req-files/${fileId}`);

// Deliverables
export const getDeliverables = (projectId) => api.get(`/projects/${projectId}/deliverables`);
export const createDeliverable = (projectId, formData) => api.post(`/projects/${projectId}/deliverables`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateDeliverable = (id, data) => api.put(`/projects/deliverables/${id}`, data);
export const deleteDeliverable = (id) => api.delete(`/projects/deliverables/${id}`);
export const nextDeliverableVersion = (id, formData) => api.post(`/projects/deliverables/${id}/next-version`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const downloadDeliverableFile = (deliverableId, fileId) => api.get(`/projects/deliverables/${deliverableId}/files/${fileId}/download`);

// Learning resources
export const getLearningResources = (params) => api.get('/learning', { params });
export const uploadLearningResource = (formData) => api.post('/learning', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const createLearningLink = (data) => api.post('/learning/link', data);
export const updateLearningResource = (id, data) => api.put(`/learning/${id}`, data);
export const deleteLearningResource = (id) => api.delete(`/learning/${id}`);
export const downloadLearningFile = (id) => api.get(`/learning/${id}/download`);

export default api;
