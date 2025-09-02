import React, { useEffect, useState } from 'react';
import { Factory, Plus, Search, Truck, Package, Calendar, User, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useSupplierStore from '../../store/supplierStore';
import useDailyOperationsStore from '../../store/dailyOperationsStore';
import useAuthStore from '../../store/authStore';
import useInventoryStore from '../../store/inventoryStore';
import useProductStore from '../../store/productStore';
import { SupplierDeliveryItem } from '../../types';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SupplierPage: React.FC = () => {
  const { user } = useAuthStore();
  const { suppliers, deliveries, loading, error, addSupplier, addDelivery, searchSuppliers, searchDeliveries, fetchSuppliers, fetchDeliveries } = useSupplierStore();
  const { addOperation } = useDailyOperationsStore();
  const { items: inventoryItems, addItem: addInventoryItem, updateItemQuantity, fetchItems } = useInventoryStore();
  const { products, fetchProducts } = useProductStore();
  
  useEffect(() => {
    fetchItems();
    fetchProducts();
  }, [fetchItems, fetchProducts]);
  
  const [activeTab, setActiveTab] = useState<'suppliers' | 'deliveries' | 'receive'>('deliveries');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  
  // Supplier form data
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    category: ''
  });
  
  // Delivery form data
  const [deliveryFormData, setDeliveryFormData] = useState({
    supplierId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as SupplierDeliveryItem[]
  });
  
  const [codeValidation, setCodeValidation] = useState<{ [key: string]: { isValid: boolean; itemName?: string; currentQuantity?: number; message: string } }>({});
  
  useEffect(() => {
    fetchSuppliers();
    fetchDeliveries();
  }, [fetchSuppliers, fetchDeliveries]);
  
  const filteredSuppliers = searchSuppliers(searchTerm);
  const filteredDeliveries = searchDeliveries(searchTerm);
  
  // Prepare chart data
  const supplierCategoryData = suppliers.reduce((acc, supplier) => {
    const existing = acc.find(item => item.name === supplier.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: supplier.category, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);
  
  const deliveryTrendData = deliveries.reduce((acc, delivery) => {
    const month = format(new Date(delivery.deliveryDate), 'MMM yyyy');
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.deliveries += 1;
      existing.amount += delivery.totalAmount || 0;
    } else {
      acc.push({ 
        month, 
        deliveries: 1, 
        amount: delivery.totalAmount || 0 
      });
    }
    return acc;
  }, [] as { month: string; deliveries: number; amount: number }[]);
  
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addSupplier(supplierFormData);
      setIsSupplierModalOpen(false);
      setSupplierFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        category: ''
      });
      alert('Supplier added successfully!');
    } catch (err) {
      console.error('Failed to add supplier:', err);
      alert('Failed to add supplier. Please try again.');
    }
  };
  
  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate all items have codes
    const invalidItems = deliveryFormData.items.filter(item => !item.code || item.code.trim() === '');
    if (invalidItems.length > 0) {
      alert('Please enter product codes for all items before submitting.');
      return;
    }
    
    try {
      const supplier = suppliers.find(s => s.id === deliveryFormData.supplierId);
      if (!supplier) return;
      
      const delivery = {
        supplierId: deliveryFormData.supplierId,
        supplierName: supplier.name,
        items: deliveryFormData.items,
        deliveryDate: deliveryFormData.deliveryDate,
        receivedBy: {
          id: user.id,
          name: user.name
        },
        notes: deliveryFormData.notes,
        status: 'received' as const
      };
      
      await addDelivery(delivery);
      
      // Process each received item
      for (const item of deliveryFormData.items) {
        const productCode = item.code?.toUpperCase();
        if (!productCode) continue;
        
        // Try server API first for inventory update
        const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
        const apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
        const token = localStorage.getItem('token');
        
        try {
          console.log(`📦 Processing delivery item: ${productCode} (${item.quantity} units)`);
          
          // Check if item exists in inventory by code
          const existingInventoryItem = inventoryItems.find(invItem => 
            invItem.code.toUpperCase() === productCode
          );
          
          if (existingInventoryItem) {
            // Item exists - update quantity via server
            const newQuantity = existingInventoryItem.quantity + item.quantity;
            
            try {
              const response = await fetch(`${serverUrl}${apiEndpoint}/inventory/${existingInventoryItem.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity: newQuantity }),
                signal: AbortSignal.timeout(10000)
              });
              
              if (response.ok) {
                console.log(`✅ Server: Updated ${productCode}: ${existingInventoryItem.quantity} + ${item.quantity} = ${newQuantity}`);
              } else {
                throw new Error('Server update failed');
              }
            } catch (serverError) {
              console.log('⚠️ Server update failed, using local update');
              await updateItemQuantity(existingInventoryItem.id, newQuantity);
            }
          } else {
            // Item doesn't exist - check if it's a valid product code
            const existingProduct = products.find(p => p.code.toUpperCase() === productCode);
            
            if (existingProduct) {
              // Product exists but not in inventory - add to inventory via server
              const newInventoryItem = {
                name: existingProduct.name,
                code: existingProduct.code,
                type: existingProduct.type,
                flavor: existingProduct.type === 'ice-cream' ? 'Default' : undefined,
                quantity: item.quantity,
                expiryDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              };
              
              try {
                const response = await fetch(`${serverUrl}${apiEndpoint}/inventory`, {
                  method: 'POST',
                  headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(newInventoryItem),
                  signal: AbortSignal.timeout(10000)
                });
                
                if (response.ok) {
                  console.log(`✅ Server: Added new inventory item ${productCode}: ${item.quantity} units`);
                } else {
                  throw new Error('Server add failed');
                }
              } catch (serverError) {
                console.log('⚠️ Server add failed, using local add');
                await addInventoryItem(newInventoryItem);
              }
            } else {
              // Invalid code - this should not happen due to validation, but handle gracefully
              console.warn(`⚠️ Skipping invalid code: ${productCode}`);
              continue;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to process item ${productCode}:`, error);
          continue;
        }
        
        // Record operation in daily operations
        await addOperation({
          itemId: existingInventoryItem?.id || `new-${productCode}`,
          itemName: existingInventoryItem?.name || products.find(p => p.code.toUpperCase() === productCode)?.name || productCode,
          itemType: existingInventoryItem?.type || determineProductType(productCode),
          quantity: item.quantity,
          direction: 'in',
          date: deliveryFormData.deliveryDate,
          adminId: user.id,
          adminName: user.name,
          notes: `Supplier delivery from ${supplier.name} (Code: ${productCode})`
        });
      }
      
      // Refresh inventory and products to show updates
      await fetchItems();
      await fetchProducts();
      
      setIsReceiveModalOpen(false);
      setDeliveryFormData({
        supplierId: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
      });
      setCodeValidation({});
      
      alert('✅ Delivery recorded successfully! Inventory has been updated with received items.');
    } catch (err) {
      console.error('Failed to record delivery:', err);
      alert('❌ Failed to record delivery. Please try again.');
    }
  };
  
  // Helper function to determine product type from code
  const determineProductType = (code: string): 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen' => {
    const prefix = code.substring(0, 2).toUpperCase();
    switch (prefix) {
      case 'IC': return 'ice-cream';
      case 'DR': return 'drinks';
      case 'KT': return 'kitchen';
      case 'NK': return 'non-kitchen';
      default: return 'kitchen'; // Default to kitchen for unknown codes
    }
  };
  
  // Validate item code when entered
  const validateProductCode = (code: string, itemId: string) => {
    if (!code || code.trim() === '') {
      setCodeValidation(prev => ({ ...prev, [itemId]: { isValid: false, message: 'Please enter a valid product code' } }));
      return;
    }
    
    const upperCode = code.toUpperCase();
    
    // Check if item exists in inventory
    const existingInventoryItem = inventoryItems.find(item => 
      item.code.toUpperCase() === upperCode
    );
    
    if (existingInventoryItem) {
      setCodeValidation(prev => ({ 
        ...prev, 
        [itemId]: {
          isValid: true,
          itemName: existingInventoryItem.name,
          currentQuantity: existingInventoryItem.quantity,
          message: `✅ Found in inventory: ${existingInventoryItem.name} (Current: ${existingInventoryItem.quantity})`
        } 
      }));
    } else {
      // Check if it's a valid product code
      const existingProduct = products.find(p => p.code.toUpperCase() === upperCode);
      
      if (existingProduct) {
        setCodeValidation(prev => ({ 
          ...prev, 
          [itemId]: {
            isValid: true,
            currentQuantity: 0,
            itemName: existingProduct.name,
            message: `🔵 Product exists: ${existingProduct.name} (Will add to inventory)`
          } 
        }));
      } else {
        setCodeValidation(prev => ({ 
          ...prev, 
          [itemId]: {
            isValid: false,
            message: `❌ Invalid code: ${upperCode}. Please enter a valid product code (IC0001, DR0001, KT0001, NK0001)`
          } 
        }));
      }
    }
  };
  
  const addDeliveryItem = () => {
    const newItemId = Math.random().toString(36).substring(2, 9);
    setDeliveryFormData({
      ...deliveryFormData,
      items: [
        ...deliveryFormData.items,
        {
          id: newItemId,
          code: '',
          quantity: 1,
          expiryDate: undefined
        }
      ]
    });
  };
  
  const updateDeliveryItem = (index: number, field: keyof SupplierDeliveryItem, value: any) => {
    const updatedItems = [...deliveryFormData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Validate product code when it changes
    if (field === 'code') {
      validateProductCode(value, updatedItems[index].id);
    }
    
    setDeliveryFormData({ ...deliveryFormData, items: updatedItems });
  };
  
  const removeDeliveryItem = (index: number) => {
    setDeliveryFormData({
      ...deliveryFormData,
      items: deliveryFormData.items.filter((_, i) => i !== index)
    });
  };

  // Check user role for access control
  const canReceiveGoods = user?.role === 'admin' || user?.role === 'stock-worker';
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
          <Factory className="mr-2" />
          Supplier Management
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus size={16} className="mr-2" />
              Add Supplier
            </button>
          )}
          {canReceiveGoods && (
            <button
              onClick={() => setIsReceiveModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Truck size={16} className="mr-2" />
              Receive Goods
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Analytics Charts */}
      {suppliers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Suppliers by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supplierCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {supplierCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} suppliers`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {deliveries.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Delivery Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="deliveries" name="Deliveries" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'deliveries'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Recent Deliveries ({deliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'suppliers'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'deliveries' ? (
            deliveries.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Delivery Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Items
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Received By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDeliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar size={16} className="text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">{delivery.deliveryDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{delivery.supplierName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-300">
                          {delivery.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="truncate">
                              {item.quantity} {item.unit} {item.name}
                            </div>
                          ))}
                          {delivery.items.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              +{delivery.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DollarSign size={16} className="text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {delivery.totalAmount ? `$${delivery.totalAmount.toFixed(2)}` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User size={16} className="text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">{delivery.receivedBy.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          delivery.status === 'processed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {delivery.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Truck size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No deliveries recorded</h3>
                <p>Start by receiving goods from suppliers to track deliveries.</p>
              </div>
            )
          ) : (
            suppliers.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Supplier Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact Person
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Phone
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{supplier.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {supplier.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{supplier.contactPerson}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{supplier.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-300">{supplier.email}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Factory size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No suppliers added</h3>
                <p>Add suppliers to start managing your supply chain.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSupplierSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Add New Supplier</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Supplier Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={supplierFormData.name}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Category
                      </label>
                      <input
                        type="text"
                        id="category"
                        value={supplierFormData.category}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, category: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., Dairy Products, Coffee Supplies"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        id="contactPerson"
                        value={supplierFormData.contactPerson}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={supplierFormData.phone}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={supplierFormData.email}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Address
                      </label>
                      <textarea
                        id="address"
                        value={supplierFormData.address}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {loading ? 'Adding...' : 'Add Supplier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Receive Goods Modal */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleReceiveSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Receive Goods from Supplier</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Supplier
                      </label>
                      <select
                        id="supplier"
                        value={deliveryFormData.supplierId}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, supplierId: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      >
                        <option value="">Select a supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} - {supplier.category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Delivery Date
                      </label>
                      <input
                        type="date"
                        id="deliveryDate"
                        value={deliveryFormData.deliveryDate}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveryDate: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-900 dark:text-white">Items Received</h4>
                      <button
                        type="button"
                        onClick={addDeliveryItem}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus size={16} className="mr-2" />
                        Add Item
                      </button>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {deliveryFormData.items.map((item, index) => (
                        <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Product Code <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={item.code}
                                onChange={(e) => updateDeliveryItem(index, 'code', e.target.value.toUpperCase())}
                                className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="IC0001, DR0001, KT0001, NK0001"
                                required
                              />
                              {codeValidation[item.id] && (
                                <div className={`mt-1 text-xs ${codeValidation[item.id].isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {codeValidation[item.id].message}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateDeliveryItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                min="0"
                                step="1"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Expiry Date (Optional)</label>
                              <input
                                type="date"
                                value={item.expiryDate || ''}
                                onChange={(e) => updateDeliveryItem(index, 'expiryDate', e.target.value)}
                                className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeDeliveryItem(index)}
                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                Remove
                              </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      value={deliveryFormData.notes}
                      onChange={(e) => setDeliveryFormData({ ...deliveryFormData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Additional notes about the delivery..."
                    />
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Items to Receive:</strong> {deliveryFormData.items.length} items
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Enter valid product codes only (IC0001, DR0001, KT0001, NK0001). Invalid codes will show error message.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading || deliveryFormData.items.length === 0 || !deliveryFormData.supplierId || deliveryFormData.items.some(item => !item.code || !codeValidation[item.id]?.isValid)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Recording...' : 'Record Delivery'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReceiveModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPage;