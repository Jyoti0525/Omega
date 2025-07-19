import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set auth token in API headers
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user profile
      getCurrentUser();
    } else {
      delete api.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  }, [token]);

  // Get current user profile
  const getCurrentUser = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        setUser(response.data.data.user);
      }
    } catch (error) {
      console.error('Get current user error:', error);
      // If token is invalid, clear it silently (don't show toast)
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
      }
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (emailOrMobile, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', {
        emailOrMobile,
        password
      });

      if (response.data.success) {
        const { user: userData, token: userToken } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
        
        toast.success('Login successful!');
        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/signup', userData);

      if (response.data.success) {
        const { user: newUser, token: userToken } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(newUser);
        
        toast.success('Account created successfully!');
        return { success: true };
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message = error.response?.data?.message || 'Signup failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API to update user status
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
      toast.success('Logged out successfully');
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      
      if (response.data.success) {
        setUser(response.data.data.user);
        toast.success('Profile updated successfully!');
        return { success: true };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!(user && token);
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const contextValue = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated,
    getAuthHeaders,
    getCurrentUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};