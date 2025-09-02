import { create } from 'zustand';
import { Shop } from '../types';

interface ShopManagementStore {
  shops: Shop[];
  loading: boolean;
  error: string | null;
  addShop: (shop: Omit<Shop, 'id'>) => Promise<void>;
  updateShop: (id: string, updates: Partial<Shop>) => Promise<void>;
  deleteShop: (id: string) => Promise<void>;
  searchShops: (query: string) => Shop[];
  fetchShops: () => Promise<void>;
}

const useShopManagementStore = create<ShopManagementStore>((set, get) => ({
  shops: [],
  loading: false,
  error: null,

  fetchShops: async () => {
    set({ loading: true, error: null });
    try {
      // Always try server API first for VPS deployment
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      if (isServerMode) {
        try {
          console.log('🏪 Fetching shops from PostgreSQL server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/shops`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const serverShops = await response.json();
            console.log('✅ Loaded shops from PostgreSQL server:', serverShops.length, 'shops');
            set({ shops: serverShops, loading: false });
            return;
          } else {
            console.log('❌ Server response not ok:', response.status);
            throw new Error(`Server responded with ${response.status}`);
          }
        } catch (serverError) {
          console.log('⚠️ PostgreSQL server not available, using localStorage fallback');
        }
      }

      // Fallback to localStorage - start with empty shops
      const stored = localStorage.getItem('shops');
      const shops = stored ? JSON.parse(stored) : [];
      console.log('🏪 Loaded shops from localStorage:', shops.length, 'shops');
      set({ shops, loading: false });
    } catch (error) {
      console.error('❌ Failed to fetch shops:', error);
      set({ error: 'Failed to fetch shops', loading: false });
    }
  },

  addShop: async (shop) => {
    set({ loading: true, error: null });
    try {
      console.log('🏪 Adding shop:', shop.name);
      
      // Check if we're in server mode (VPS deployment)
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      // Try server API first (for VPS deployment)
      if (isServerMode) {
        try {
          console.log('🏪 Adding shop via server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/shops`, {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(shop),
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            const newShop = await response.json();
            console.log('✅ Shop added via server:', newShop.name);
            
            const updatedShops = [...get().shops, newShop];
            set({ shops: updatedShops, loading: false });
            return;
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add shop via server');
          }
        } catch (serverError) {
          console.log('⚠️ Server add failed, using localStorage');
        }
      }

      // Fallback to localStorage
      const newShop: Shop = {
        ...shop,
        id: Math.random().toString(36).substring(2, 9),
      };

      const updatedShops = [...get().shops, newShop];
      localStorage.setItem('shops', JSON.stringify(updatedShops));
      set({ shops: updatedShops, loading: false });
      
      console.log('✅ Shop added successfully:', newShop.name);
    } catch (error) {
      console.error('❌ Failed to add shop:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add shop', loading: false });
      throw error;
    }
  },

  updateShop: async (id, updates) => {
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
          console.log('🏪 Updating shop via server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/shops/${id}`, {
            method: 'PUT',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates),
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            const updatedShop = await response.json();
            const updatedShops = get().shops.map(shop =>
              shop.id === id ? updatedShop : shop
            );
            set({ shops: updatedShops, loading: false });
            return;
          }
        } catch (serverError) {
          console.log('⚠️ Server update failed, using localStorage');
        }
      }

      // Fallback to localStorage
      const updatedShops = get().shops.map(shop =>
        shop.id === id ? { ...shop, ...updates } : shop
      );
      localStorage.setItem('shops', JSON.stringify(updatedShops));
      set({ shops: updatedShops, loading: false });
      
      console.log('✅ Shop updated successfully');
    } catch (error) {
      console.error('❌ Failed to update shop:', error);
      set({ error: 'Failed to update shop', loading: false });
    }
  },

  deleteShop: async (id) => {
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
          console.log('🏪 Deleting shop via server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/shops/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            const updatedShops = get().shops.filter(shop => shop.id !== id);
            set({ shops: updatedShops, loading: false });
            return;
          }
        } catch (serverError) {
          console.log('⚠️ Server delete failed, using localStorage');
        }
      }

      // Fallback to localStorage
      const updatedShops = get().shops.filter(shop => shop.id !== id);
      localStorage.setItem('shops', JSON.stringify(updatedShops));
      set({ shops: updatedShops, loading: false });
      
      console.log('✅ Shop deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete shop:', error);
      set({ error: 'Failed to delete shop', loading: false });
    }
  },

  searchShops: (query) => {
    const shops = get().shops;
    if (!query) return shops;

    const searchTerm = query.toLowerCase();
    return shops.filter(shop =>
      shop.name.toLowerCase().includes(searchTerm) ||
      shop.location.toLowerCase().includes(searchTerm) ||
      shop.contactPerson.toLowerCase().includes(searchTerm) ||
      shop.email.toLowerCase().includes(searchTerm)
    );
  }
}));

export default useShopManagementStore;