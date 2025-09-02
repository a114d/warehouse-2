export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'stock-worker' | 'store-worker' | 'screen';
  shopId?: string; // Optional shop assignment for store workers
  shopName?: string; // Shop name for display
  password?: string; // Optional for display, required for authentication
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface InventoryItem {
  id: string;
  name: string;
  code: string;
  type: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
  flavor?: string;
  quantity: number;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  recentlyAdded?: Array<InventoryItem & { addedAt: string }>;
  fetchItems: () => Promise<void>;
  getItemById: (id: string) => InventoryItem | undefined;
  getItemByCode: (code: string) => InventoryItem | undefined;
  updateItemQuantity: (id: string, newQuantity: number) => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  filterItemsByType: (type: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen') => InventoryItem[];
}

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  type: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
  category?: string;
  productionDate: string;
  quantity: number;
}

export interface ProductManagement {
  products: ProductItem[];
  loading: boolean;
  error: string | null;
  fetchProducts?: () => Promise<void>;
  addProduct: (product: Omit<ProductItem, 'id' | 'code'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<ProductItem>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => ProductItem[];
}

export interface StockRequest {
  id: string;
  shopId: string;
  shopName: string;
  items: StockRequestItem[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requestDate: string;
  requestedBy: {
    id: string;
    name: string;
  };
  processedBy?: {
    id: string;
    name: string;
  };
  processedAt?: string;
  notes?: string;
}

export interface StockRequestItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  type: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
}

export interface ShipmentRequest {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
  flavor?: string;
  quantity: number;
  destination: string;
  requestDate: string;
  requestedBy: {
    id: string;
    name: string;
  };
  status: 'pending' | 'approved' | 'cancelled' | 'shipped';
  processedBy?: {
    id: string;
    name: string;
  };
  processedAt?: string;
  notes?: string;
}

export interface ShipmentRecord {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
  flavor?: string;
  quantity: number;
  destination: string;
  shipmentDate: string;
  adminId: string;
  adminName: string;
}

export interface ShopReceivedRecord {
  id: string;
  shopId: string;
  shopName: string;
  itemId: string;
  itemName: string;
  itemType: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
  flavor?: string;
  quantity: number;
  receivedDate: string;
}

export interface DailyOperation {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
  quantity: number;
  direction: 'in' | 'out';
  date: string;
  adminId: string;
  adminName: string;
  notes?: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface UserManagement {
  users: User[];
  loading: boolean;
  error: string | null;
  addUser: (user: { username: string; name: string; password: string; role: 'admin' | 'stock-worker' | 'store-worker' | 'screen'; shopId?: string; shopName?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: string;
}

export interface SupplierDelivery {
  id: string;
  supplierId: string;
  supplierName: string;
  items: SupplierDeliveryItem[];
  deliveryDate: string;
  receivedBy: {
    id: string;
    name: string;
  };
  totalAmount?: number;
  notes?: string;
  status: 'received' | 'processed';
}

export interface SupplierDeliveryItem {
  id: string;
  code: string;
  quantity: number;
  expiryDate?: string | undefined;
}

export interface SupplierManagement {
  suppliers: Supplier[];
  deliveries: SupplierDelivery[];
  loading: boolean;
  error: string | null;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addDelivery: (delivery: Omit<SupplierDelivery, 'id'>) => Promise<void>;
  searchSuppliers: (query: string) => Supplier[];
  searchDeliveries: (query: string) => SupplierDelivery[];
  fetchSuppliers: () => Promise<void>;
  fetchDeliveries: () => Promise<void>;
}