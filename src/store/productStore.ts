import { create } from 'zustand';
import { ProductManagement, ProductItem } from '../types';

const useProductStore = create<ProductManagement>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      // Always try server API first for VPS deployment
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      const isServerMode = import.meta.env.VITE_LOCAL_SERVER === 'true';
      
      if (isServerMode) {
        try {
          console.log('🏭 Fetching products from PostgreSQL server...');
          const response = await fetch(`${serverUrl}${apiEndpoint}/products`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const serverProducts = await response.json();
            console.log('✅ Loaded products from PostgreSQL server:', serverProducts.length, 'products');
            set({ products: serverProducts, loading: false });
            return;
          } else {
            console.log('❌ Server response not ok:', response.status);
            throw new Error(`Server responded with ${response.status}`);
          }
        } catch (serverError) {
          console.log('⚠️ PostgreSQL server not available, using localStorage fallback');
        }
      } else {
        console.log('🏭 Fetching products from server...');
      }

      // Fallback to localStorage with predefined products
      const stored = localStorage.getItem('products');
      let products = stored ? JSON.parse(stored) : [];
      
      if (products.length === 0) {
        products = await loadPredefinedProducts();
        localStorage.setItem('products', JSON.stringify(products));
      }
      
      console.log('🏭 Loaded products from localStorage:', products.length, 'products');
      set({ products, loading: false });
    } catch (error) {
      console.error('❌ Failed to fetch products:', error);
      set({ error: 'Failed to fetch products', loading: false });
    }
  },

  addProduct: async (product) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🏭 Adding product via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/products`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(product),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const newProduct = await response.json();
          console.log('✅ Product added via server:', newProduct.name, newProduct.code);
          
          const updatedProducts = [...get().products, newProduct];
          set({ products: updatedProducts, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server add failed, using localStorage');
      }

      // Fallback to localStorage
      const newProduct: ProductItem = {
        ...product,
        id: Math.random().toString(36).substring(2, 9),
        code: generateCode(product.type, get().products)
      };

      const updatedProducts = [...get().products, newProduct];
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      set({ products: updatedProducts, loading: false });
    } catch (error) {
      console.error('❌ Failed to add product:', error);
      set({ error: 'Failed to add product', loading: false });
    }
  },

  updateProduct: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🏭 Updating product via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const updatedProduct = await response.json();
          const updatedProducts = get().products.map(product =>
            product.id === id ? updatedProduct : product
          );
          set({ products: updatedProducts, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server update failed, using localStorage');
      }

      // Fallback to localStorage
      const updatedProducts = get().products.map(product =>
        product.id === id ? { ...product, ...updates } : product
      );
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      set({ products: updatedProducts, loading: false });
    } catch (error) {
      console.error('❌ Failed to update product:', error);
      set({ error: 'Failed to update product', loading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      // Try server API first
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
      const token = localStorage.getItem('token');
      
      try {
        console.log('🏭 Deleting product via server...');
        const response = await fetch(`${serverUrl}${apiEndpoint}/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const updatedProducts = get().products.filter(product => product.id !== id);
          set({ products: updatedProducts, loading: false });
          return;
        }
      } catch (serverError) {
        console.log('⚠️ Server delete failed, using localStorage');
      }

      // Fallback to localStorage
      const updatedProducts = get().products.filter(product => product.id !== id);
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      set({ products: updatedProducts, loading: false });
    } catch (error) {
      console.error('❌ Failed to delete product:', error);
      set({ error: 'Failed to delete product', loading: false });
    }
  },

  searchProducts: (query) => {
    const products = get().products;
    if (!query) return products;

    const searchTerm = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.code.toLowerCase().includes(searchTerm) ||
      product.type.toLowerCase().includes(searchTerm)
    );
  }
}));

// Generate product code helper
const generateCode = (type: string, existingProducts: ProductItem[]): string => {
  const prefix = type === 'ice-cream' ? 'IC' : 
                 type === 'drinks' ? 'DR' : 
                 type === 'kitchen' ? 'KT' : 'NK';
  
  const existingCodes = existingProducts
    .filter(p => p.type === type)
    .map(p => p.code)
    .filter(code => code.startsWith(prefix))
    .map(code => parseInt(code.substring(2)) || 0);
  
  const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// Load predefined products for fallback
const loadPredefinedProducts = async (): Promise<ProductItem[]> => {
  const predefinedProducts: ProductItem[] = [
    // Ice Cream Products
    { id: 'ic1', code: 'IC0001', name: 'Wafel Hoorntjes', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 15 },
    { id: 'ic2', code: 'IC0002', name: 'Kinder Hoorntjes', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 12 },
    { id: 'ic3', code: 'IC0003', name: 'Luxe Hoorn nootjes', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 8 },
    { id: 'ic4', code: 'IC0004', name: 'Luxe Hoorn Spikkel', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 10 },
    { id: 'ic5', code: 'IC0005', name: 'Bakje 1 bol', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 25 },
    { id: 'ic6', code: 'IC0006', name: 'Bakje 2 bollen', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 18 },
    { id: 'ic7', code: 'IC0007', name: 'Bakje ¾ Bollen', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 14 },
    { id: 'ic8', code: 'IC0008', name: 'Lepeltjes', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 50 },
    { id: 'ic9', code: 'IC0009', name: '0,5L bak', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 6 },
    { id: 'ic10', code: 'IC0010', name: '1L bak', type: 'ice-cream', category: 'Ice Cream', productionDate: '2025-01-30', quantity: 4 },

    // Drinks Products
    { id: 'dr1', code: 'DR0001', name: 'Oatly Barista Hafer Oat', type: 'drinks', category: 'Milk Alternatives', productionDate: '2025-01-30', quantity: 24 },
    { id: 'dr2', code: 'DR0002', name: 'Alpro Soya', type: 'drinks', category: 'Milk Alternatives', productionDate: '2025-01-30', quantity: 18 },
    { id: 'dr3', code: 'DR0003', name: 'Alpro Barista Almond', type: 'drinks', category: 'Milk Alternatives', productionDate: '2025-01-30', quantity: 15 },
    { id: 'dr4', code: 'DR0004', name: 'Alpro Barista Coconut', type: 'drinks', category: 'Milk Alternatives', productionDate: '2025-01-30', quantity: 12 },
    { id: 'dr5', code: 'DR0005', name: 'Alpro Barista Oat', type: 'drinks', category: 'Milk Alternatives', productionDate: '2025-01-30', quantity: 20 },
    { id: 'dr6', code: 'DR0006', name: '7-up', type: 'drinks', category: 'Soft Drinks', productionDate: '2025-01-30', quantity: 48 },
    { id: 'dr7', code: 'DR0007', name: 'Red Bull', type: 'drinks', category: 'Energy Drinks', productionDate: '2025-01-30', quantity: 36 },
    { id: 'dr8', code: 'DR0008', name: 'Spa Blauw', type: 'drinks', category: 'Water', productionDate: '2025-01-30', quantity: 60 },
    { id: 'dr9', code: 'DR0009', name: 'AH Volle Melk', type: 'drinks', category: 'Dairy', productionDate: '2025-01-30', quantity: 16 },
    { id: 'dr10', code: 'DR0010', name: 'Monin Strawberry', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 8 },
    { id: 'dr11', code: 'DR0011', name: 'Monin Vanilla', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 10 },
    { id: 'dr12', code: 'DR0012', name: 'Monin Caramel', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 7 },
    { id: 'dr13', code: 'DR0013', name: 'Monin Hazelnut', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 6 },
    { id: 'dr14', code: 'DR0014', name: 'Monin White Chocolate', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 5 },
    { id: 'dr15', code: 'DR0015', name: 'Monin Bubblegum', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 4 },
    { id: 'dr16', code: 'DR0016', name: 'Monin Lime', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 3 },
    { id: 'dr17', code: 'DR0017', name: 'Monin Caramel Sugarfree', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 4 },
    { id: 'dr18', code: 'DR0018', name: 'Monin Vanilla Sugarfree', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 3 },
    { id: 'dr19', code: 'DR0019', name: 'Giffard Bl', type: 'drinks', category: 'Syrups', productionDate: '2025-01-30', quantity: 2 },

    // Kitchen Products
    { id: 'kt1', code: 'KT0001', name: 'Spanish 10L', type: 'kitchen', category: 'Ice Cream Base', productionDate: '2025-01-30', quantity: 8 },
    { id: 'kt2', code: 'KT0002', name: 'Pistache 10L', type: 'kitchen', category: 'Ice Cream Base', productionDate: '2025-01-30', quantity: 6 },
    { id: 'kt3', code: 'KT0003', name: 'Strawberry 10L', type: 'kitchen', category: 'Ice Cream Base', productionDate: '2025-01-30', quantity: 7 },
    { id: 'kt4', code: 'KT0004', name: 'Mango 10L', type: 'kitchen', category: 'Ice Cream Base', productionDate: '2025-01-30', quantity: 5 },
    { id: 'kt5', code: 'KT0005', name: 'Slagroom 2x', type: 'kitchen', category: 'Dairy', productionDate: '2025-01-30', quantity: 12 },
    { id: 'kt6', code: 'KT0006', name: 'Nestle Cacao Poeder', type: 'kitchen', category: 'Powder', productionDate: '2025-01-30', quantity: 4 },
    { id: 'kt7', code: 'KT0007', name: 'Callebaut Cacao Korrels', type: 'kitchen', category: 'Toppings', productionDate: '2025-01-30', quantity: 3 },
    { id: 'kt8', code: 'KT0008', name: 'Matcha', type: 'kitchen', category: 'Powder', productionDate: '2025-01-30', quantity: 2 },
    { id: 'kt9', code: 'KT0009', name: 'Finest Call Mango Siroop', type: 'kitchen', category: 'Syrups', productionDate: '2025-01-30', quantity: 6 },
    { id: 'kt10', code: 'KT0010', name: 'Lotus Saus 6 bottles', type: 'kitchen', category: 'Sauces', productionDate: '2025-01-30', quantity: 4 },
    { id: 'kt11', code: 'KT0011', name: 'Lotus Kruimels', type: 'kitchen', category: 'Toppings', productionDate: '2025-01-30', quantity: 8 },
    { id: 'kt12', code: 'KT0012', name: 'Oreo Kruimels', type: 'kitchen', category: 'Toppings', productionDate: '2025-01-30', quantity: 6 },
    { id: 'kt13', code: 'KT0013', name: 'Monin Chocolate saus', type: 'kitchen', category: 'Sauces', productionDate: '2025-01-30', quantity: 5 },

    // Non-Kitchen Products  
    { id: 'nk1', code: 'NK0001', name: 'Kleine Tasjes', type: 'non-kitchen', category: 'Packaging', productionDate: '2025-01-30', quantity: 200 },
    { id: 'nk2', code: 'NK0002', name: 'Grote Tasjes', type: 'non-kitchen', category: 'Packaging', productionDate: '2025-01-30', quantity: 150 },
    { id: 'nk3', code: 'NK0003', name: 'Kassabon Rollen', type: 'non-kitchen', category: 'Office Supplies', productionDate: '2025-01-30', quantity: 20 },
    { id: 'nk4', code: 'NK0004', name: 'Bekerhouders 2', type: 'non-kitchen', category: 'Cup Holders', productionDate: '2025-01-30', quantity: 50 },
    { id: 'nk5', code: 'NK0005', name: 'Bekerhouders 4', type: 'non-kitchen', category: 'Cup Holders', productionDate: '2025-01-30', quantity: 30 },
    { id: 'nk6', code: 'NK0006', name: 'Torkrollen box', type: 'non-kitchen', category: 'Cleaning', productionDate: '2025-01-30', quantity: 12 },
    { id: 'nk7', code: 'NK0007', name: 'Servetten box', type: 'non-kitchen', category: 'Disposables', productionDate: '2025-01-30', quantity: 15 },
    { id: 'nk8', code: 'NK0008', name: 'Rietjes box', type: 'non-kitchen', category: 'Disposables', productionDate: '2025-01-30', quantity: 25 },
    { id: 'nk9', code: 'NK0009', name: 'Milkshake rietjes box', type: 'non-kitchen', category: 'Disposables', productionDate: '2025-01-30', quantity: 10 },
    { id: 'nk10', code: 'NK0010', name: 'Latte Macchiato 12oz', type: 'non-kitchen', category: 'Cups', productionDate: '2025-01-30', quantity: 100 },
    { id: 'nk11', code: 'NK0011', name: 'Cappuccino 8oz', type: 'non-kitchen', category: 'Cups', productionDate: '2025-01-30', quantity: 120 },
    { id: 'nk12', code: 'NK0012', name: 'Flat White 7,5oz', type: 'non-kitchen', category: 'Cups', productionDate: '2025-01-30', quantity: 80 },
    { id: 'nk13', code: 'NK0013', name: 'Espresso 4oz', type: 'non-kitchen', category: 'Cups', productionDate: '2025-01-30', quantity: 150 },
    { id: 'nk14', code: 'NK0014', name: 'Iced Deksel', type: 'non-kitchen', category: 'Lids', productionDate: '2025-01-30', quantity: 200 },
    { id: 'nk15', code: 'NK0015', name: 'Dreft', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 6 },
    { id: 'nk16', code: 'NK0016', name: 'Glorix', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 8 },
    { id: 'nk17', code: 'NK0017', name: 'Super Finn', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 10 },
    { id: 'nk18', code: 'NK0018', name: 'Dubro Ontkalker', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 4 },
    { id: 'nk19', code: 'NK0019', name: 'Andy Allesreiniger', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 5 },
    { id: 'nk20', code: 'NK0020', name: 'Handschoenen S/L/XL', type: 'non-kitchen', category: 'Safety Equipment', productionDate: '2025-01-30', quantity: 30 },
    { id: 'nk21', code: 'NK0021', name: 'Dettol', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 8 },
    { id: 'nk22', code: 'NK0022', name: 'Desinfectie spray', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 12 },
    { id: 'nk23', code: 'NK0023', name: 'Sopdoeken', type: 'non-kitchen', category: 'Cleaning Supplies', productionDate: '2025-01-30', quantity: 20 }
  ];
  
  return predefinedProducts;
};

export default useProductStore;