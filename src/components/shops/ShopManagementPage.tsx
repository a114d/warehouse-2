import React, { useState } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';
import useShopManagementStore from '../../store/shopManagementStore';
import { Shop } from '../../types';

const ShopManagementPage: React.FC = () => {
  const { shops, addShop, updateShop, deleteShop, searchShops, loading, error } = useShopManagementStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingShop, setEditingShop] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Shop, 'id'>>({
    name: '',
    location: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  const filteredShops = searchShops(searchTerm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addShop(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        location: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: ''
      });
    } catch (err) {
      console.error('Failed to add shop:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this shop?')) {
      try {
        await deleteShop(id);
      } catch (err) {
        console.error('Failed to delete shop:', err);
      }
    }
  };

  const handleUpdate = async (id: string) => {
    const shop = shops.find(s => s.id === id);
    if (!shop) return;

    try {
      await updateShop(id, {
        name: shop.name,
        location: shop.location,
        contactPerson: shop.contactPerson,
        phone: shop.phone,
        email: shop.email,
        address: shop.address
      });
      setEditingShop(null);
    } catch (err) {
      console.error('Failed to update shop:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center">
          <MapPin className="mr-2" />
          Shop Management
        </h2>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search shops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus size={16} className="mr-2" />
            Add New Shop
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shop Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Person
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredShops.map((shop) => (
              <tr key={shop.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingShop === shop.id ? (
                    <input
                      type="text"
                      value={shop.name}
                      onChange={(e) => {
                        const updatedShops = shops.map(s =>
                          s.id === shop.id ? { ...s, name: e.target.value } : s
                        );
                        useShopManagementStore.setState({ shops: updatedShops });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingShop === shop.id ? (
                    <input
                      type="text"
                      value={shop.location}
                      onChange={(e) => {
                        const updatedShops = shops.map(s =>
                          s.id === shop.id ? { ...s, location: e.target.value } : s
                        );
                        useShopManagementStore.setState({ shops: updatedShops });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">{shop.location}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingShop === shop.id ? (
                    <input
                      type="text"
                      value={shop.contactPerson}
                      onChange={(e) => {
                        const updatedShops = shops.map(s =>
                          s.id === shop.id ? { ...s, contactPerson: e.target.value } : s
                        );
                        useShopManagementStore.setState({ shops: updatedShops });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">{shop.contactPerson}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingShop === shop.id ? (
                    <input
                      type="text"
                      value={shop.phone}
                      onChange={(e) => {
                        const updatedShops = shops.map(s =>
                          s.id === shop.id ? { ...s, phone: e.target.value } : s
                        );
                        useShopManagementStore.setState({ shops: updatedShops });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">{shop.phone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingShop === shop.id ? (
                    <input
                      type="email"
                      value={shop.email}
                      onChange={(e) => {
                        const updatedShops = shops.map(s =>
                          s.id === shop.id ? { ...s, email: e.target.value } : s
                        );
                        useShopManagementStore.setState({ shops: updatedShops });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">{shop.email}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingShop === shop.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleUpdate(shop.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => setEditingShop(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingShop(shop.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(shop.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Shop Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Shop Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {loading ? 'Adding...' : 'Add Shop'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
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

export default ShopManagementPage;