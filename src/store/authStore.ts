import { create } from 'zustand';
import { AuthState } from '../types';

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: async (username: string, password: string) => {
    try {
      console.log('🔐 Starting login process for:', username);
      
      // Check if we're in server mode (VPS deployment)
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      
      console.log('🌐 Server mode:', isServerMode);
      console.log('🔗 Server URL:', serverUrl);
      
      // Try server authentication first (for VPS deployment)
      if (isServerMode) {
        try {
          console.log('🔐 Attempting server authentication...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Server authentication successful:', data.user.name);
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            set({ 
              user: data.user, 
              token: data.token, 
              isAuthenticated: true 
            });
            return;
          } else {
            const errorData = await response.json();
            console.log('❌ Server authentication failed:', errorData.error);
            throw new Error(errorData.error || 'Server authentication failed');
          }
        } catch (serverError) {
          console.log('⚠️ Server not available, using local authentication');
          // Continue to local authentication below
        }
      }
      
      // Local authentication for development and fallback
      console.log('🔄 Using local authentication...');
      
      // Get stored users (created through user management)
      const storedUsers = localStorage.getItem('users');
      let availableUsers = storedUsers ? JSON.parse(storedUsers) : [];
      
      // Add default users if no stored users exist
      const defaultUsers = [
        {
          id: 'admin-1',
          username: 'admin',
          name: 'System Administrator',
          role: 'admin' as const,
          password: 'admin123',
        },
        {
          id: 'stock-1',
          username: 'stock',
          name: 'Stock Worker',
          role: 'stock-worker' as const,
          password: 'stock123',
        },
        {
          id: 'store-1',
          username: 'store',
          name: 'Store Worker',
          role: 'store-worker' as const,
          password: 'store123',
          shopId: 'shop-1',
          shopName: 'Main Shop'
        },
        {
          id: 'screen-1',
          username: 'screen',
          name: 'Display Screen',
          role: 'screen' as const,
          password: 'screen123',
        }
      ];
      
      // Merge default users with stored users (stored users take precedence)
      const mergedUsers = [...defaultUsers];
      availableUsers.forEach((storedUser: any) => {
        const existingIndex = mergedUsers.findIndex(u => u.username === storedUser.username);
        if (existingIndex >= 0) {
          // Replace default with stored user
          mergedUsers[existingIndex] = storedUser;
        } else {
          // Add new stored user
          mergedUsers.push(storedUser);
        }
      });
      
      console.log('👥 Available users:', mergedUsers.map(u => u.username));

      const user = mergedUsers.find(u => u.username === username && u.password === password);
      
      if (user) {
        const token = `local-${Date.now()}`;
        const userForStorage = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          shopId: user.shopId,
          shopName: user.shopName
        };
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userForStorage));
        
        console.log('✅ Local authentication successful:', user.name);
        set({ user: userForStorage, token, isAuthenticated: true });
        return;
      }
      
      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

// Initialize user from localStorage if available
const storedUser = localStorage.getItem('user');
if (storedUser) {
  try {
    const user = JSON.parse(storedUser);
    useAuthStore.setState({ user });
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    localStorage.removeItem('user');
  }
}

export default useAuthStore;