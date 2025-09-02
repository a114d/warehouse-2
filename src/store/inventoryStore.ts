import { create } from 'zustand';
import { InventoryItem, InventoryState } from '../types';

const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      // Always try server API first for VPS deployment
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      
      if (isServerMode) {
        try {
          console.log('📦 Fetching inventory from PostgreSQL server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/inventory`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const serverItems = await response.json();
            console.log('✅ Loaded inventory from PostgreSQL server:', serverItems.length, 'items');
            set({ items: serverItems, loading: false });
            return;
          } else {
            console.log('❌ Server response not ok:', response.status);
            throw new Error(`Server responded with ${response.status}`);
          }
        } catch (serverError) {
          console.log('⚠️ PostgreSQL server not available, using localStorage fallback');
        }
      } else {
        console.log('📦 Fetching inventory from server...');
      }

      // Fallback to localStorage with predefined data
      const stored = localStorage.getItem('inventory');
      let items = stored ? JSON.parse(stored) : [];
      
      if (items.length === 0) {
        items = await loadPredefinedInventory();
        localStorage.setItem('inventory', JSON.stringify(items));
      }
      
      console.log('📦 Loaded inventory from localStorage:', items.length, 'items');
      set({ items, loading: false });
    } catch (error) {
      console.error('❌ Failed to fetch inventory:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch items',
        loading: false 
      });
    }
  },

  getItemById: (id: string) => {
    return get().items.find(item => item.id === id);
  },

  getItemByCode: (code: string) => {
    const items = get().items;
    console.log('🔍 Searching for code:', code);
    
    // Try exact match first
    let item = items.find(item => item.code === code);
    
    if (!item) {
      // Try case-insensitive match
      item = items.find(item => item.code.toLowerCase() === code.toLowerCase());
    }
    
    console.log(item ? '✅ Found item:' : '❌ No item found:', item);
    return item;
  },

  updateItemQuantity: async (id: string, newQuantity: number) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('📦 Updating item quantity via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/inventory/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ quantity: newQuantity }),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const updatedItem = await response.json();
          const updatedItems = get().items.map(item => 
            item.id === id ? updatedItem : item
          );
          set({ items: updatedItems, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server update failed, using localStorage');
      }

      // Fallback to localStorage
      const updatedItems = get().items.map(item => 
        item.id === id 
          ? { ...item, quantity: newQuantity, updatedAt: new Date().toISOString() }
          : item
      );
      localStorage.setItem('inventory', JSON.stringify(updatedItems));
      set({ items: updatedItems, loading: false });
    } catch (error) {
      console.error('❌ Failed to update quantity:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update quantity',
        loading: false 
      });
    }
  },

  addItem: async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('📦 Adding item via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/inventory`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const newItem = await response.json();
          const updatedItems = [...get().items, newItem];
          set({ items: updatedItems, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server add failed, using localStorage');
      }

      // Fallback to localStorage
      const newItem: InventoryItem = {
        ...item,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedItems = [...get().items, newItem];
      localStorage.setItem('inventory', JSON.stringify(updatedItems));
      set({ items: updatedItems, loading: false });
    } catch (error) {
      console.error('❌ Failed to add item:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add item',
        loading: false 
      });
    }
  },

  updateItem: async (id: string, updates: Partial<InventoryItem>) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('📦 Updating item via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/inventory/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const updatedItem = await response.json();
          const updatedItems = get().items.map(item => 
            item.id === id ? updatedItem : item
          );
          set({ items: updatedItems, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server update failed, using localStorage');
      }

      // Fallback to localStorage
      const updatedItems = get().items.map(item => 
        item.id === id 
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      );
      localStorage.setItem('inventory', JSON.stringify(updatedItems));
      set({ items: updatedItems, loading: false });
    } catch (error) {
      console.error('❌ Failed to update item:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update item',
        loading: false 
      });
    }
  },

  deleteItem: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('📦 Deleting item via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/inventory/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const updatedItems = get().items.filter(item => item.id !== id);
          set({ items: updatedItems, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server delete failed, using localStorage');
      }

      // Fallback to localStorage
      const updatedItems = get().items.filter(item => item.id !== id);
      localStorage.setItem('inventory', JSON.stringify(updatedItems));
      set({ items: updatedItems, loading: false });
    } catch (error) {
      console.error('❌ Failed to delete item:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete item',
        loading: false 
      });
    }
  },

  filterItemsByType: (type: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen') => {
    return get().items.filter(item => item.type === type);
  },
}));

// Load predefined inventory for fallback
const loadPredefinedInventory = async (): Promise<InventoryItem[]> => {
  const predefinedItems: InventoryItem[] = [
    // Ice Cream Products
    { id: 'ic1', code: 'IC0001', name: 'Wafel Hoorntjes', type: 'ice-cream', flavor: 'Vanilla', quantity: 15, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic2', code: 'IC0002', name: 'Kinder Hoorntjes', type: 'ice-cream', flavor: 'Chocolate', quantity: 12, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic3', code: 'IC0003', name: 'Luxe Hoorn nootjes', type: 'ice-cream', flavor: 'Hazelnut', quantity: 8, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic4', code: 'IC0004', name: 'Luxe Hoorn Spikkel', type: 'ice-cream', flavor: 'Cookies', quantity: 10, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic5', code: 'IC0005', name: 'Bakje 1 bol', type: 'ice-cream', flavor: 'Mixed', quantity: 25, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic6', code: 'IC0006', name: 'Bakje 2 bollen', type: 'ice-cream', flavor: 'Mixed', quantity: 18, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic7', code: 'IC0007', name: 'Bakje ¾ Bollen', type: 'ice-cream', flavor: 'Mixed', quantity: 14, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic8', code: 'IC0008', name: 'Lepeltjes', type: 'ice-cream', flavor: 'Various', quantity: 50, expiryDate: '2025-12-31', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic9', code: 'IC0009', name: '0,5L bak', type: 'ice-cream', flavor: 'Vanilla', quantity: 6, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'ic10', code: 'IC0010', name: '1L bak', type: 'ice-cream', flavor: 'Chocolate', quantity: 4, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },

    // Drinks Products
    { id: 'dr1', code: 'DR0001', name: 'Oatly Barista Hafer Oat', type: 'drinks', quantity: 24, expiryDate: '2025-08-15', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr2', code: 'DR0002', name: 'Alpro Soya', type: 'drinks', quantity: 18, expiryDate: '2025-07-20', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr3', code: 'DR0003', name: 'Alpro Barista Almond', type: 'drinks', quantity: 15, expiryDate: '2025-07-25', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr4', code: 'DR0004', name: 'Alpro Barista Coconut', type: 'drinks', quantity: 12, expiryDate: '2025-07-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr5', code: 'DR0005', name: 'Alpro Barista Oat', type: 'drinks', quantity: 20, expiryDate: '2025-08-10', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr6', code: 'DR0006', name: '7-up', type: 'drinks', quantity: 48, expiryDate: '2025-12-31', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr7', code: 'DR0007', name: 'Red Bull', type: 'drinks', quantity: 36, expiryDate: '2025-12-31', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr8', code: 'DR0008', name: 'Spa Blauw', type: 'drinks', quantity: 60, expiryDate: '2025-12-31', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr9', code: 'DR0009', name: 'AH Volle Melk', type: 'drinks', quantity: 16, expiryDate: '2025-02-15', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr10', code: 'DR0010', name: 'Monin Strawberry', type: 'drinks', quantity: 8, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr11', code: 'DR0011', name: 'Monin Vanilla', type: 'drinks', quantity: 10, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr12', code: 'DR0012', name: 'Monin Caramel', type: 'drinks', quantity: 7, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr13', code: 'DR0013', name: 'Monin Hazelnut', type: 'drinks', quantity: 6, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr14', code: 'DR0014', name: 'Monin White Chocolate', type: 'drinks', quantity: 5, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr15', code: 'DR0015', name: 'Monin Bubblegum', type: 'drinks', quantity: 4, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr16', code: 'DR0016', name: 'Monin Lime', type: 'drinks', quantity: 3, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr17', code: 'DR0017', name: 'Monin Caramel Sugarfree', type: 'drinks', quantity: 4, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr18', code: 'DR0018', name: 'Monin Vanilla Sugarfree', type: 'drinks', quantity: 3, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'dr19', code: 'DR0019', name: 'Giffard Bl', type: 'drinks', quantity: 2, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },

    // Kitchen Products
    { id: 'kt1', code: 'KT0001', name: 'Spanish 10L', type: 'kitchen', quantity: 8, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt2', code: 'KT0002', name: 'Pistache 10L', type: 'kitchen', quantity: 6, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt3', code: 'KT0003', name: 'Strawberry 10L', type: 'kitchen', quantity: 7, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt4', code: 'KT0004', name: 'Mango 10L', type: 'kitchen', quantity: 5, expiryDate: '2025-06-30', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt5', code: 'KT0005', name: 'Slagroom 2x', type: 'kitchen', quantity: 12, expiryDate: '2025-03-15', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt6', code: 'KT0006', name: 'Nestle Cacao Poeder', type: 'kitchen', quantity: 4, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt7', code: 'KT0007', name: 'Callebaut Cacao Korrels', type: 'kitchen', quantity: 3, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt8', code: 'KT0008', name: 'Matcha', type: 'kitchen', quantity: 2, expiryDate: '2025-12-31', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt9', code: 'KT0009', name: 'Finest Call Mango Siroop', type: 'kitchen', quantity: 6, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt10', code: 'KT0010', name: 'Lotus Saus 6 bottles', type: 'kitchen', quantity: 4, expiryDate: '2025-08-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt11', code: 'KT0011', name: 'Lotus Kruimels', type: 'kitchen', quantity: 8, expiryDate: '2025-12-31', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt12', code: 'KT0012', name: 'Oreo Kruimels', type: 'kitchen', quantity: 6, expiryDate: '2025-12-31', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'kt13', code: 'KT0013', name: 'Monin Chocolate saus', type: 'kitchen', quantity: 5, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },

    // Non-Kitchen Products
    { id: 'nk1', code: 'NK0001', name: 'Kleine Tasjes', type: 'non-kitchen', quantity: 200, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk2', code: 'NK0002', name: 'Grote Tasjes', type: 'non-kitchen', quantity: 150, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk3', code: 'NK0003', name: 'Kassabon Rollen', type: 'non-kitchen', quantity: 20, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk4', code: 'NK0004', name: 'Bekerhouders 2', type: 'non-kitchen', quantity: 50, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk5', code: 'NK0005', name: 'Bekerhouders 4', type: 'non-kitchen', quantity: 30, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk6', code: 'NK0006', name: 'Torkrollen box', type: 'non-kitchen', quantity: 12, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk7', code: 'NK0007', name: 'Servetten box', type: 'non-kitchen', quantity: 15, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk8', code: 'NK0008', name: 'Rietjes box', type: 'non-kitchen', quantity: 25, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk9', code: 'NK0009', name: 'Milkshake rietjes box', type: 'non-kitchen', quantity: 10, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk10', code: 'NK0010', name: 'Latte Macchiato 12oz', type: 'non-kitchen', quantity: 100, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk11', code: 'NK0011', name: 'Cappuccino 8oz', type: 'non-kitchen', quantity: 120, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk12', code: 'NK0012', name: 'Flat White 7,5oz', type: 'non-kitchen', quantity: 80, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk13', code: 'NK0013', name: 'Espresso 4oz', type: 'non-kitchen', quantity: 150, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk14', code: 'NK0014', name: 'Iced Deksel', type: 'non-kitchen', quantity: 200, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk15', code: 'NK0015', name: 'Dreft', type: 'non-kitchen', quantity: 6, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk16', code: 'NK0016', name: 'Glorix', type: 'non-kitchen', quantity: 8, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk17', code: 'NK0017', name: 'Super Finn', type: 'non-kitchen', quantity: 10, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk18', code: 'NK0018', name: 'Dubro Ontkalker', type: 'non-kitchen', quantity: 4, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk19', code: 'NK0019', name: 'Andy Allesreiniger', type: 'non-kitchen', quantity: 5, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk20', code: 'NK0020', name: 'Handschoenen S/L/XL', type: 'non-kitchen', quantity: 30, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk21', code: 'NK0021', name: 'Dettol', type: 'non-kitchen', quantity: 8, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk22', code: 'NK0022', name: 'Desinfectie spray', type: 'non-kitchen', quantity: 12, expiryDate: '2026-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    { id: 'nk23', code: 'NK0023', name: 'Sopdoeken', type: 'non-kitchen', quantity: 20, expiryDate: '2027-01-01', createdAt: '2025-01-01', updatedAt: '2025-01-01' }
  ];
  
  return predefinedItems;
};

export default useInventoryStore;