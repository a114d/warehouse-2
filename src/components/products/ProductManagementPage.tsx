import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';
import useProductStore from '../../store/productStore';
import useInventoryStore from '../../store/inventoryStore';
import useAuthStore from '../../store/authStore';
import { ProductItem } from '../../types';
import { Navigate } from 'react-router-dom';

const ProductManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const { products, addProduct, updateProduct, deleteProduct, searchProducts, loading, error, fetchProducts } = useProductStore();
  const { fetchItems } = useInventoryStore();
  
  // Only allow admin access to product management
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<ProductItem, 'id' | 'code'>>({
    name: '',
    type: 'ice-cream',
    category: '',
    productionDate: new Date().toISOString().split('T')[0],
    quantity: 0
  });

  // FIXED: Fetch both products and inventory on component mount
  useEffect(() => {
    fetchProducts();
    fetchItems();
  }, [fetchProducts, fetchItems]);

  const filteredProducts = searchProducts(searchTerm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addProduct(formData);
      
      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'ice-cream',
        category: '',
        productionDate: new Date().toISOString().split('T')[0],
        quantity: 0
      });
      
      // Show success message and refresh inventory
      alert('✅ Product added successfully! Check the inventory to see the new item.');
      
      // Force refresh inventory to show new item
      await fetchItems();
    } catch (err) {
      console.error('Failed to add product:', err);
      alert('Failed to add product. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? This will also remove it from inventory.')) {
      try {
        await deleteProduct(id);
        
        // Refresh inventory after deleting product
        await fetchItems();
        
        alert('Product deleted successfully!');
      } catch (err) {
        console.error('Failed to delete product:', err);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleUpdate = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    try {
      await updateProduct(id, {
        name: product.name,
        quantity: product.quantity,
        productionDate: product.productionDate
      });
      
      // Refresh inventory after updating product
      await fetchItems();
      
      setEditingProduct(null);
      alert('Product updated successfully!');
    } catch (err) {
      console.error('Failed to update product:', err);
      alert('Failed to update product. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="mr-3" size={28} />
            Product Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage products and inventory items (Admin Only)</p>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            ✨ Products added here automatically appear in inventory
          </p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus size={16} className="mr-2" />
            Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Products Catalog</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Code
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Quantity
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Production Date
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{product.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct === product.id ? (
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => {
                        const updatedProducts = products.map(p =>
                          p.id === product.id ? { ...p, name: e.target.value } : p
                        );
                        useProductStore.setState({ products: updatedProducts });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 dark:text-gray-300">{product.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.type === 'ice-cream' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    product.type === 'drinks' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' :
                    product.type === 'kitchen' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                  }`}>
                    {product.type === 'ice-cream' ? 'Ice Cream' :
                     product.type === 'drinks' ? 'Drinks' : 
                     product.type === 'kitchen' ? 'Kitchen' : 'Non-Kitchen'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct === product.id ? (
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => {
                        const updatedProducts = products.map(p =>
                          p.id === product.id ? { ...p, quantity: parseInt(e.target.value) || 0 } : p
                        );
                        useProductStore.setState({ products: updatedProducts });
                      }}
                      className="block w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 dark:text-gray-300">{product.quantity}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct === product.id ? (
                    <input
                      type="date"
                      value={product.productionDate}
                      onChange={(e) => {
                        const updatedProducts = products.map(p =>
                          p.id === product.id ? { ...p, productionDate: e.target.value } : p
                        );
                        useProductStore.setState({ products: updatedProducts });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 dark:text-gray-300">{product.productionDate}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingProduct === product.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleUpdate(product.id)}
                        className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        title="Save changes"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingProduct(product.id)}
                        className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        title="Edit product"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <Package size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading products...</h3>
                  <p>Please wait while we load your product catalog.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center mb-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 sm:mx-0 sm:h-10 sm:w-10">
                      <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Add New Product</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Create a new product in the catalog</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Product Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter product name"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Product Type
                      </label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="ice-cream">Ice Cream</option>
                        <option value="drinks">Drinks</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="non-kitchen">Non-Kitchen</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Initial Quantity
                      </label>
                      <input
                        type="number"
                        id="quantity"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label htmlFor="productionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Production Date
                      </label>
                      <input
                        type="date"
                        id="productionDate"
                        value={formData.productionDate}
                        onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> This product will automatically be added to your inventory and will be available for shipping and stock requests.
                      <br />
                      <strong>Access Control:</strong> Only admins can add quantities here. Stock workers should use Supplier Management to receive goods and update quantities.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:w-auto sm:text-sm"
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

export default ProductManagementPage;