import { create } from 'zustand';
import { SupplierManagement, Supplier, SupplierDelivery } from '../types';

const useSupplierStore = create<SupplierManagement>((set, get) => ({
  suppliers: [],
  deliveries: [],
  loading: false,
  error: null,

  fetchSuppliers: async () => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🏭 Fetching suppliers from server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/suppliers`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const serverSuppliers = await response.json();
          console.log('✅ Loaded suppliers from server:', serverSuppliers.length, 'suppliers');
          set({ suppliers: serverSuppliers, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server not available, using localStorage');
      }

      // Fallback to localStorage - start with empty suppliers
      const stored = localStorage.getItem('suppliers');
      const suppliers = stored ? JSON.parse(stored) : [];
      
      console.log('🏭 Loaded suppliers from localStorage:', suppliers.length, 'suppliers');
      set({ suppliers, loading: false });
    } catch (error) {
      console.error('❌ Failed to fetch suppliers:', error);
      set({ error: 'Failed to fetch suppliers', loading: false });
    }
  },

  fetchDeliveries: async () => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🚚 Fetching deliveries from server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/suppliers/deliveries`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const serverDeliveries = await response.json();
          console.log('✅ Loaded deliveries from server:', serverDeliveries.length, 'deliveries');
          set({ deliveries: serverDeliveries, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server not available, using localStorage');
      }

      // Fallback to localStorage - start with empty deliveries
      const stored = localStorage.getItem('deliveries');
      const deliveries = stored ? JSON.parse(stored) : [];
      
      console.log('🚚 Loaded deliveries from localStorage:', deliveries.length, 'deliveries');
      set({ deliveries, loading: false });
    } catch (error) {
      console.error('❌ Failed to fetch deliveries:', error);
      set({ error: 'Failed to fetch deliveries', loading: false });
    }
  },

  addSupplier: async (supplier) => {
    set({ loading: true, error: null });
    try {
      console.log('🏭 Adding supplier:', supplier.name);
      
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🏭 Adding supplier via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/suppliers`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(supplier),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const newSupplier = await response.json();
          console.log('✅ Supplier added via server:', newSupplier.name);
          
          const updatedSuppliers = [...get().suppliers, newSupplier];
          set({ suppliers: updatedSuppliers, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server add failed, using localStorage');
      }
      
      // Fallback to localStorage
      const newSupplier: Supplier = {
        ...supplier,
        id: Math.random().toString(36).substring(2, 9),
      };

      const updatedSuppliers = [...get().suppliers, newSupplier];
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      set({ suppliers: updatedSuppliers, loading: false });
      
      console.log('✅ Supplier added successfully:', newSupplier.name);
    } catch (error) {
      console.error('❌ Failed to add supplier:', error);
      set({ error: 'Failed to add supplier', loading: false });
      throw error;
    }
  },

  updateSupplier: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🏭 Updating supplier via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/suppliers/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const updatedSupplier = await response.json();
          const updatedSuppliers = get().suppliers.map(supplier =>
            supplier.id === id ? updatedSupplier : supplier
          );
          set({ suppliers: updatedSuppliers, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server update failed, using localStorage');
      }

      // Fallback to localStorage
      const updatedSuppliers = get().suppliers.map(supplier =>
        supplier.id === id ? { ...supplier, ...updates } : supplier
      );
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      set({ suppliers: updatedSuppliers, loading: false });
      
      console.log('✅ Supplier updated successfully');
    } catch (error) {
      console.error('❌ Failed to update supplier:', error);
      set({ error: 'Failed to update supplier', loading: false });
    }
  },

  deleteSupplier: async (id) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🏭 Deleting supplier via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/suppliers/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const updatedSuppliers = get().suppliers.filter(supplier => supplier.id !== id);
          set({ suppliers: updatedSuppliers, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server delete failed, using localStorage');
      }

      // Fallback to localStorage
      const updatedSuppliers = get().suppliers.filter(supplier => supplier.id !== id);
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      set({ suppliers: updatedSuppliers, loading: false });
      
      console.log('✅ Supplier deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete supplier:', error);
      set({ error: 'Failed to delete supplier', loading: false });
    }
  },

  addDelivery: async (delivery) => {
    set({ loading: true, error: null });
    try {
      console.log('🚚 Recording delivery from:', delivery.supplierName);
      
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🚚 Adding delivery via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/suppliers/deliveries`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(delivery),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const newDelivery = await response.json();
          console.log('✅ Delivery recorded via server');
          
          const updatedDeliveries = [...get().deliveries, newDelivery];
          set({ deliveries: updatedDeliveries, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server add failed, using localStorage');
      }
      
      // Fallback to localStorage
      const newDelivery: SupplierDelivery = {
        ...delivery,
        id: Math.random().toString(36).substring(2, 9),
      };

      const updatedDeliveries = [...get().deliveries, newDelivery];
      localStorage.setItem('deliveries', JSON.stringify(updatedDeliveries));
      set({ deliveries: updatedDeliveries, loading: false });
      
      console.log('✅ Delivery recorded successfully');
    } catch (error) {
      console.error('❌ Failed to add delivery:', error);
      set({ error: 'Failed to add delivery', loading: false });
      throw error;
    }
  },

  searchSuppliers: (query) => {
    const suppliers = get().suppliers;
    if (!query) return suppliers;

    const searchTerm = query.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm) ||
      supplier.contactPerson.toLowerCase().includes(searchTerm) ||
      supplier.category.toLowerCase().includes(searchTerm) ||
      supplier.email.toLowerCase().includes(searchTerm)
    );
  },

  searchDeliveries: (query) => {
    const deliveries = get().deliveries;
    if (!query) return deliveries;

    const searchTerm = query.toLowerCase();
    return deliveries.filter(delivery =>
      delivery.supplierName.toLowerCase().includes(searchTerm) ||
      delivery.receivedBy.name.toLowerCase().includes(searchTerm)
    );
  }
}));

export default useSupplierStore;