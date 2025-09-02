import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { Lock, User, Moon, Sun } from 'lucide-react';

interface LoginFormData {
  username: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const navigate = useNavigate();
  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await login(data.username, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen-safe flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 sm:px-6 lg:px-8 transition-colors safe-all">
      {/* Dark Mode Toggle - Top Right */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-6 right-6 mobile-button-secondary rounded-full shadow-lg hover:shadow-xl z-10 safe-top safe-right"
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDarkMode ? (
          <Sun className="h-6 w-6 text-yellow-500" />
        ) : (
          <Moon className="h-6 w-6 text-gray-600" />
        )}
      </button>

      <div className="max-w-md w-full mobile-card rounded-xl shadow-xl animate-fade-in">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 mb-6">
            <Lock className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="mobile-text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Invizio WMS
          </h2>
          <p className="mobile-text-sm text-gray-600 dark:text-gray-400 mb-8">
            Dolcetto Warehouse Management System
          </p>
        </div>
        
        <form className="touch-spacing" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in">
              <p className="text-red-700 dark:text-red-400 mobile-text-sm">{error}</p>
            </div>
          )}
          
          <div>
            <label htmlFor="username" className="block mobile-text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...register('username', { 
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters'
                  }
                })}
                className="mobile-input w-full pl-10 pr-3"
                placeholder="Enter your username"
              />
            </div>
            {errors.username && (
              <p className="mt-1 mobile-text-sm text-red-600 dark:text-red-400">{errors.username.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block mobile-text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
                className="mobile-input w-full pl-10 pr-3"
                placeholder="Enter your password"
              />
            </div>
            {errors.password && (
              <p className="mt-1 mobile-text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="mobile-button-primary w-full justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
        
        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="mobile-text-xs text-gray-500 dark:text-gray-400">
            © 2025 DigiProTech. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;