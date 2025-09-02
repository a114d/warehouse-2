import { create } from 'zustand';
import { UserManagement, User } from '../types';

const useUserManagementStore = create<UserManagement>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      // Always try server API first for VPS deployment
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      if (isServerMode) {
        try {
          console.log('👥 Fetching users from PostgreSQL server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/users`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const serverUsers = await response.json();
            console.log('✅ Loaded users from PostgreSQL server:', serverUsers.length, 'users');
            set({ users: serverUsers, loading: false });
            return;
          } else {
            console.log('❌ Server response not ok:', response.status);
            throw new Error(`Server responded with ${response.status}`);
          }
        } catch (serverError) {
          console.log('⚠️ PostgreSQL server not available, using localStorage fallback');
        }
      }

      // Fallback to localStorage for development or when server unavailable
      const stored = localStorage.getItem('users');
      let users = stored ? JSON.parse(stored) : [];
      
      // Add default users if none exist
      if (users.length === 0) {
        users = [
          {
            id: 'admin-1',
            username: 'admin',
            name: 'System Administrator',
            role: 'admin',
            password: 'admin123'
          },
          {
            id: 'stock-1',
            username: 'stock',
            name: 'Stock Worker',
            role: 'stock-worker',
            password: 'stock123'
          },
          {
            id: 'store-1',
            username: 'store',
            name: 'Store Worker',
            role: 'store-worker',
            password: 'store123',
            shopId: 'shop-1',
            shopName: 'Main Shop'
          },
          {
            id: 'screen-1',
            username: 'screen',
            name: 'Display Screen',
            role: 'screen',
            password: 'screen123'
          }
        ];
        localStorage.setItem('users', JSON.stringify(users));
      }
      
      console.log('👥 Loaded users from localStorage:', users.length, 'users');
      set({ users, loading: false });
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      set({ error: 'Failed to fetch users', loading: false });
    }
  },

  addUser: async (userData) => {
    set({ loading: true, error: null });
    try {
      console.log('👥 Adding new user:', userData.username);
      
      // Check if we're in server mode (VPS deployment)
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      // Try server API first (for VPS deployment)
      if (isServerMode) {
        try {
          console.log('👥 Adding user via server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/users`, {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData),
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ User added via server:', result.user.username);
            
            // Add to local users list
            const updatedUsers = [...get().users, result.user];
            set({ users: updatedUsers, loading: false });
            
            // Also store in localStorage for authentication
            const storedUsers = localStorage.getItem('users');
            const localUsers = storedUsers ? JSON.parse(storedUsers) : [];
            const userWithPassword = { ...result.user, password: userData.password };
            const updatedLocalUsers = [...localUsers, userWithPassword];
            localStorage.setItem('users', JSON.stringify(updatedLocalUsers));
            
            return;
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add user via server');
          }
        } catch (serverError) {
          console.log('⚠️ Server add failed, using localStorage');
        }
      }
      
      // Fallback to localStorage
      const currentUsers = get().users;
      
      // Check if username already exists
      const existingUser = currentUsers.find(u => u.username === userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }
      
      // Create new user with password included for authentication
      const newUser: User = {
        id: Math.random().toString(36).substring(2, 9),
        username: userData.username,
        name: userData.name,
        role: userData.role,
        password: userData.password, // Store password for local authentication
        shopId: userData.shopId,
        shopName: userData.shopName,
      };

      const updatedUsers = [...currentUsers, newUser];
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      set({ users: updatedUsers, loading: false });
      
      console.log('✅ User added successfully:', newUser.username);
    } catch (error) {
      console.error('❌ Failed to add user:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add user', loading: false });
      throw error;
    }
  },

  deleteUser: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Check if we're in server mode (VPS deployment)
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      // Try server API first (for VPS deployment)
      if (isServerMode) {
        try {
          console.log('👥 Deleting user via server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/users/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            const updatedUsers = get().users.filter(user => user.id !== id);
            set({ users: updatedUsers, loading: false });
            
            // Also remove from localStorage
            const storedUsers = localStorage.getItem('users');
            if (storedUsers) {
              const localUsers = JSON.parse(storedUsers);
              const updatedLocalUsers = localUsers.filter((user: any) => user.id !== id);
              localStorage.setItem('users', JSON.stringify(updatedLocalUsers));
            }
            return;
          }
        } catch (serverError) {
          console.log('⚠️ Server delete failed, using localStorage');
        }
      }
      
      // Fallback to localStorage
      const updatedUsers = get().users.filter(user => user.id !== id);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      set({ users: updatedUsers, loading: false });
      
      console.log('✅ User deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete user:', error);
      set({ error: 'Failed to delete user', loading: false });
    }
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    set({ loading: true, error: null });
    try {
      // Check if we're in server mode (VPS deployment)
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      // Try server API first (for VPS deployment)
      if (isServerMode) {
        try {
          console.log('👥 Updating user via server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/users/${id}`, {
            method: 'PUT',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates),
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            const updatedUser = await response.json();
            const updatedUsers = get().users.map(user =>
              user.id === id ? updatedUser : user
            );
            set({ users: updatedUsers, loading: false });
            
            // Also update localStorage
            const storedUsers = localStorage.getItem('users');
            if (storedUsers) {
              const localUsers = JSON.parse(storedUsers);
              const updatedLocalUsers = localUsers.map((user: any) =>
                user.id === id ? { ...user, ...updates } : user
              );
              localStorage.setItem('users', JSON.stringify(updatedLocalUsers));
            }
            return;
          }
        } catch (serverError) {
          console.log('⚠️ Server update failed, using localStorage');
        }
      }
      
      // Fallback to localStorage
      const updatedUsers = get().users.map(user =>
        user.id === id ? { ...user, ...updates } : user
      );
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      set({ users: updatedUsers, loading: false });
      
      console.log('✅ User updated successfully');
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      set({ error: 'Failed to update user', loading: false });
    }
  },
}));

export default useUserManagementStore;