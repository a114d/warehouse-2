// API Client for Server Communication
const API_BASE_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '/api';

const apiUrl = `${API_BASE_URL}${API_ENDPOINT}`;

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API Client class
export class ApiClient {
  // Authentication
  static async login(username: string, password: string) {
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }
      
      const data = await response.json();
      
      // Store token and user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async getUser() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { data: null, error: null };
      
      const response = await fetch(`${apiUrl}/auth/user`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user');
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Inventory
  static async getInventory(type?: string) {
    try {
      const url = type ? `${apiUrl}/inventory?type=${type}` : `${apiUrl}/inventory`;
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Get inventory error:', error);
      throw error;
    }
  }

  static async addInventoryItem(item: any) {
    try {
      const response = await fetch(`${apiUrl}/inventory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(item)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add inventory item');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Add inventory item error:', error);
      throw error;
    }
  }

  static async updateInventoryItem(id: string, updates: any) {
    try {
      const response = await fetch(`${apiUrl}/inventory/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update inventory item');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Update inventory item error:', error);
      throw error;
    }
  }

  // Products
  static async getProducts(type?: string) {
    try {
      const url = type ? `${apiUrl}/products?type=${type}` : `${apiUrl}/products`;
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Get products error:', error);
      throw error;
    }
  }

  static async addProduct(product: any) {
    try {
      const response = await fetch(`${apiUrl}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(product)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add product');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Add product error:', error);
      throw error;
    }
  }

  // Users
  static async getUsers() {
    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Get users error:', error);
      throw error;
    }
  }

  static async addUser(user: any) {
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(user)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Add user error:', error);
      throw error;
    }
  }

  // Shops
  static async getShops() {
    try {
      const response = await fetch(`${apiUrl}/shops`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch shops');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Get shops error:', error);
      throw error;
    }
  }

  static async addShop(shop: any) {
    try {
      const response = await fetch(`${apiUrl}/shops`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(shop)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add shop');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Add shop error:', error);
      throw error;
    }
  }

  // Suppliers
  static async getSuppliers() {
    try {
      const response = await fetch(`${apiUrl}/suppliers`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Get suppliers error:', error);
      throw error;
    }
  }

  static async addSupplier(supplier: any) {
    try {
      const response = await fetch(`${apiUrl}/suppliers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(supplier)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add supplier');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Add supplier error:', error);
      throw error;
    }
  }

  static async addSupplierDelivery(delivery: any) {
    try {
      const response = await fetch(`${apiUrl}/suppliers/deliveries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(delivery)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record delivery');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Add supplier delivery error:', error);
      throw error;
    }
  }

  // Stock Requests
  static async getStockRequests() {
    try {
      const response = await fetch(`${apiUrl}/stock-requests`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock requests');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Get stock requests error:', error);
      throw error;
    }
  }

  static async addStockRequest(request: any) {
    try {
      const response = await fetch(`${apiUrl}/stock-requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add stock request');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API: Add stock request error:', error);
      throw error;
    }
  }

  // Health check
  static async checkHealth() {
    try {
      const response = await fetch(`${apiUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default ApiClient;