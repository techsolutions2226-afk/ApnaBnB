import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

export const useLogin = () => {
  const { setCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await authService.login(email, password);
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      return user;
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};

export const useSignup = () => {
  const { setCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const signup = async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await authService.register(userData);
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      return user;
    } catch (err) {
      const errorMessage = err.message || 'Signup failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { signup, isLoading, error };
};

export const useLogout = () => {
  const { setCurrentUser } = useAuth();

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  return { logout };
};
