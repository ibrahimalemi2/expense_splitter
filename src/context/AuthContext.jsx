import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { fallbackStorage } from '../services/fallbackStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      let data = await api.getUsers();
      if (!data || !Array.isArray(data) || data.length === 0) {
        data = fallbackStorage.getUsers();
      }
      setUsers(data);
      return data;
    } catch (err) {
      console.error('Failed to load users, using fallback storage', err);
      const fallback = fallbackStorage.getUsers();
      setUsers(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      const loadedUsers = await fetchUsers();
      
      // Check saved user in localStorage
      const savedUserId = localStorage.getItem('mess_user_id');
      if (savedUserId && loadedUsers.length > 0) {
        const found = loadedUsers.find(u => String(u.id) === String(savedUserId));
        if (found) {
          setCurrentUser(found);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (userId, pin) => {
    const res = await api.login(userId, pin);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem('mess_user_id', String(res.user.id));
      await fetchUsers(); // Refresh statuses
      return res.user;
    }
    throw new Error('Login failed');
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mess_user_id');
  };

  const refreshUsers = async () => {
    const updated = await fetchUsers();
    if (currentUser) {
      const freshUser = updated.find(u => u.id === currentUser.id);
      if (freshUser) {
        setCurrentUser(freshUser);
      }
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        isAdmin,
        login,
        logout,
        refreshUsers,
        setCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
