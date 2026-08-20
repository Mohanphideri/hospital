import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService, refreshAccessToken } from '../services/index.js';
import { getToken, setToken as setStoredToken, clearToken } from '../services/tokenStore.js';
import { initSocket, disconnectSocket } from '../utils/socket.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  
  
  
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      
      localStorage.removeItem('user');
      return null;
    }
  });

  
  
  
  
  
  const [token, setToken] = useState(() => getToken());
  const [loading, setLoading] = useState(false);

  
  
  
  
  
  
  const [initializing, setInitializing] = useState(true);

  const login = useCallback((newToken, userData) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    
    
    
    authService.logout().catch(() => {
      
      
      
    });
    clearToken();
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
    disconnectSocket();
  }, []);

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  useEffect(() => {
    let cancelled = false;

    refreshAccessToken()
      .then((newToken) => {
        if (cancelled) return null;
        return authService.getMe().then((response) => {
          if (cancelled) return;
          const { role, user: staffUser, patient } = response.data;
          const restoredUser =
            role === 'patient'
              ? { _id: patient._id, phone: patient.phone, name: patient.name, role: 'patient' }
              : staffUser;

          setToken(newToken);
          setUser(restoredUser);
          localStorage.setItem('user', JSON.stringify(restoredUser));
          
          
          
          
          initSocket(newToken);
        });
      })
      .catch(() => {
        if (cancelled) return;
        
        
        clearToken();
        setToken(null);
        setUser(null);
        localStorage.removeItem('user');
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
    
    
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, login, logout, loading, setLoading, initializing }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
