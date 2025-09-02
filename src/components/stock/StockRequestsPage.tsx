import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import useStockRequestStore from '../../store/stockRequestStore';
import useProductStore from '../../store/productStore';
import useShopManagementStore from '../../store/shopManagementStore';
import useAuthStore from '../../store/authStore';
import { StockRequestItem } from '../../types';

const StockRequestsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { requests, loading, addRequest, fetchRequests } = useStockRequestStore();
  const { products, fetchProducts } = useProductStore();
  const { shops, fetchShops } = useShopManagementStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedItems, setSelectedItems] = useState<StockRequestItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchRequests(),
          fetchProducts(),
          fetchShops()
        ]);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please refresh the page.');
      }
    };
    
    loadData();
  }, [fetchRequests, fetchProducts, fetchShops]);

  // Auto-select shop for store workers
  useEffect(() => {
    if (user?.role === 'store-worker' && user?.shopId && user?.shopName) {
      setSelectedShop(user.shopId);
    }
  }, [user]);
  
  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      request.shopName.toLowerCase().includes(searchLower) ||
      request.items.some(item => 
        item.productName.toLowerCase().includes(searchLower) ||
        item.productCode.toLowerCase().includes(searchLower)
      )
    );
  });
  
  const handleAddItem = () => {
    if (products.length === 0) {
      alert('No products available. Please ask an admin to add products first.');
      return;
    }
    
    setSelectedItems([
      ...selectedItems,
      {
        productId: '',
        productName: '',
        productCode: '',
        quantity: 1,
        type: 'ice-cream',
      },
    ]);
  };
  
  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };
  
  const handleItemChange = (index: number, field: keyof StockRequestItem, value: any) => {
    const updatedItems = [...selectedItems];
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          type: product.type,
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }
    setSelectedItems(updatedItems);
  };
  
  const validateForm = () => {
    if (!selectedShop) {
      return 'Please select a shop';
    }
    
    if (selectedItems.length === 0) {
      return 'Please add at least one item';
    }
    
    // Check if all items have required fields
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      if (!item.productId || !item.productName || !item.productCode) {
        return `Please select a product for item ${i + 1}`;
      }
      if (item.quantity <= 0) {
        return `Please enter a valid quantity for item ${i + 1}`;
      }
    }
    
    return null;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Clear previous errors
    setError(null);
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSubmitLoading(true);
    try {
      const selectedShopData = shops.find(shop => shop.id === selectedShop);
      if (!selectedShopData) {
        throw new Error('Selected shop not found');
      }

      await addRequest({
        shopId: selectedShop,
        shopName: selectedShopData.name,
        items: selectedItems,
        requestedBy: {
          id: user.id,
          name: user.name,
        },
      });
      
      // Reset form
      setIsModalOpen(false);
      if (user.role !== 'store-worker') {
        setSelectedShop('');
      }
      setSelectedItems([]);
      setError(null);
      
      alert('Stock request submitted successfully! Waiting for admin approval.');
    } catch (error) {
      console.error('Failed to submit request:', error);
      setError('Failed to submit stock request. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    if (user?.role !== 'store-worker') {
      setSelectedShop('');
    }
    setSelectedItems([]);
    setError(null);
  };

  // Get available shops based on user role
  const getAvailableShops = () => {
    if (user?.role === 'store-worker') {
      // Store workers can only see their assigned shop
      return shops.filter(shop => shop.id === user.shopId);
    }
    // Admins can see all shops
    return shops;
  };

  const availableShops = getAvailableShops();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <ClipboardList className="mr-3" size={28} />
            Stock Requests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === 'store-worker' 
              ? `Request stock items from the warehouse for ${user.shopName}`
              : 'Request stock items from the warehouse for shops'
            }
          </p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus size={16} className="mr-2" />
            New Request
          </button>
        </div>
      </div>

      {/* Data Loading Status */}
      {loading && requests.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
            <p className="text-blue-700 dark:text-blue-300">Loading data...</p>
          </div>
        </div>
      )}

      {/* System Status */}
      {products.length === 0 && !loading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-400 mr-2 mt-0.5" size={20} />
            <div>
              <p className="text-yellow-700 dark:text-yellow-300 font-medium">No Products Available</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
                Please ask an admin to add products in Product Management before creating stock requests.
              </p>
            </div>
          </div>
        </div>
      )}

      {availableShops.length === 0 && !loading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-400 mr-2 mt-0.5" size={20} />
            <div>
              <p className="text-yellow-700 dark:text-yellow-300 font-medium">No Shop Assignment</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
                {user?.role === 'store-worker' 
                  ? 'You are not assigned to any shop. Please contact an admin to assign you to a shop.'
                  : 'No shops are available. Please add shops in Shop Management first.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Stock Request History</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View all your stock requests and their current status
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Shop
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Requested By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.requestDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{request.shopName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-300">
                        {request.items.map((item, index) => (
                          <div key={index} className="mb-1">
                            {item.quantity}x {item.productName} ({item.productCode})
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        request.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        request.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        request.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.requestedBy.name}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <ClipboardList size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No stock requests found</h3>
                    <p>Create your first stock request to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center mb-6">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 sm:mx-0 sm:h-10 sm:w-10">
                      <ClipboardList className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        Create New Stock Request
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user?.role === 'store-worker' 
                          ? `Request items from the warehouse for ${user.shopName}`
                          : 'Request items from the warehouse for a shop'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                      <div className="flex items-start">
                        <XCircle className="text-red-500 mr-2 mt-0.5" size={16} />
                        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* System Status Warnings */}
                  {products.length === 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="text-yellow-500 mr-2 mt-0.5" size={16} />
                        <div>
                          <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">No Products Available</p>
                          <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                            Please ask an admin to add products first in Product Management.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {availableShops.length === 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="text-yellow-500 mr-2 mt-0.5" size={16} />
                        <div>
                          <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">No Shop Available</p>
                          <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                            {user?.role === 'store-worker' 
                              ? 'You are not assigned to any shop. Please contact an admin.'
                              : 'Please ask an admin to add shops first in Shop Management.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Shop Selection */}
                    <div className="md:col-span-2">
                      <label htmlFor="shop" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Shop <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="shop"
                        value={selectedShop}
                        onChange={(e) => setSelectedShop(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                        disabled={availableShops.length === 0 || (user?.role === 'store-worker' && availableShops.length === 1)}
                      >
                        <option value="">Select a shop</option>
                        {availableShops.map(shop => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name} ({shop.location})
                          </option>
                        ))}
                      </select>
                      {user?.role === 'store-worker' && availableShops.length === 1 && (
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                          Automatically selected your assigned shop
                        </p>
                      )}
                    </div>

                    {/* Items Section */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Items <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          disabled={products.length === 0}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} className="mr-2" />
                          Add Item
                        </button>
                      </div>

                      {selectedItems.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                          <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">No items added yet</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">Click "Add Item" to start building your request</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {selectedItems.map((item, index) => (
                            <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Item #{index + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Remove item"
                                >
                                  <XCircle size={16} />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Product <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={item.productId}
                                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                    className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  >
                                    <option value="">Select a product</option>
                                    <optgroup label="Ice Cream">
                                      {products.filter(p => p.type === 'ice-cream').map(product => (
                                        <option key={product.id} value={product.id}>
                                          {product.name} ({product.code})
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Drinks">
                                      {products.filter(p => p.type === 'drinks').map(product => (
                                        <option key={product.id} value={product.id}>
                                          {product.name} ({product.code})
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Kitchen">
                                      {products.filter(p => p.type === 'kitchen').map(product => (
                                        <option key={product.id} value={product.id}>
                                          {product.name} ({product.code})
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Non-Kitchen">
                                      {products.filter(p => p.type === 'non-kitchen').map(product => (
                                        <option key={product.id} value={product.id}>
                                          {product.name} ({product.code})
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Quantity <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                    min="1"
                                    className="block w-full px-3 py-2 text-sm border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  />
                                </div>
                              </div>

                              {item.productCode && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    <strong>Selected:</strong> {item.productName} (Code: {item.productCode})
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {selectedItems.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Request Summary</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} • 
                        Total quantity: {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitLoading || selectedItems.length === 0 || !selectedShop || availableShops.length === 0 || products.length === 0}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetModal}
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

export default StockRequestsPage;