import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to false for development
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log the request for debugging
    console.log('API Request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Log the error for debugging
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      response: error.response,
      request: error.request
    });

    // Handle different types of errors
    if (!error.response && !error.request) {
      // Something happened in setting up the request
      toast.error('Request setup error. Please try again.');
      return Promise.reject(error);
    }

    if (!error.response) {
      // Network error - no response received
      toast.error('Cannot connect to server. Please check if the backend is running on http://localhost:8000');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle specific error codes
    switch (status) {
      case 401:
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        // Only show toast if user is on a protected page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
        break;
        
      case 403:
        toast.error('Access denied. You don\'t have permission for this action.');
        break;
        
      case 404:
        // Don't show 404 errors for auth profile checks
        if (!error.config.url.includes('/auth/profile')) {
          toast.error(data?.message || 'Resource not found.');
        }
        break;
        
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
        
      case 500:
        toast.error('Server error. Please try again later.');
        break;
        
      default:
        // Show the error message from the server, but not for auth profile checks
        if (!error.config.url.includes('/auth/profile')) {
          toast.error(data?.message || `Request failed with status ${status}`);
        }
        break;
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // Test connection - Updated to use /api/test
  testConnection: () => api.get('/test'),
  
  // Auth APIs
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),

  // User APIs
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getUserContacts: () => api.get('/users/contacts'),
  searchUsers: (query) => api.get('/users/search', { params: { query } }),

  // Chat APIs
  createPrivateChat: (receiverId) => api.post('/chat/private', { receiverId }),
  sendMessage: (messageData) => api.post('/chat/message', messageData),
  getUserChats: () => api.get('/chat/user-chats'),
  getChatMessages: (chatId, params) => api.get(`/chat/${chatId}/messages`, { params }),
  markMessagesAsRead: (chatId) => api.put(`/chat/${chatId}/mark-read`),
  deleteMessage: (messageId) => api.delete(`/chat/message/${messageId}`),

  // Upload APIs
  uploadImage: (formData) => api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadVideo: (formData) => api.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadDocument: (formData) => api.post('/upload/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (cloudinaryId) => api.delete(`/upload/${cloudinaryId}`),

  // Health check
  healthCheck: () => api.get('/health')
};

// File upload helper with progress
export const uploadFileWithProgress = (file, type, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const uploadEndpoint = type === 'image' ? '/upload/image' : 
                        type === 'video' ? '/upload/video' : 
                        '/upload/document';

  return api.post(uploadEndpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    }
  });
};

// Utility functions
export const utils = {
  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get file type from mime type
  getFileType: (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  },

  // Validate file type and size
  validateFile: (file, maxSize = 50) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      return { valid: false, error: `File size must be less than ${maxSize}MB` };
    }

    return { valid: true };
  },

  // Create file preview URL
  createFilePreview: (file) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  },

  // Clean up file preview URL
  revokeFilePreview: (url) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
};

export default api;