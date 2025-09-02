import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Edit2, Save, X, Shield, User, Briefcase, MapPin, Monitor } from 'lucide-react';
import useUserManagementStore from '../../store/userManagementStore';
import useShopManagementStore from '../../store/shopManagementStore';
import useAuthStore from '../../store/authStore';
import { Navigate } from 'react-router-dom';

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { users, addUser, deleteUser, updateUser, loading, error } = useUserManagementStore();
  const { shops, fetchShops } = useShopManagementStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    role: 'store-worker' as 'admin' | 'stock-worker' | 'store-worker' | 'screen',
    shopId: '',
    shopName: '',
  });

  // Only allow admin access
  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('👤 Creating user:', formData.username, 'with role:', formData.role);
      const userData = {
        username: formData.username,
        name: formData.name,
        password: formData.password,
        role: formData.role,
        ...(formData.role === 'store-worker' && formData.shopId ? {
          shopId: formData.shopId,
          shopName: formData.shopName
        } : {})
      };

      await addUser(userData);
      console.log('✅ User created successfully!');
      alert(`✅ User "${userData.name}" created successfully! They can now login with username: ${userData.username} and the password you set.`);
      setIsModalOpen(false);
      setFormData({
        username: '',
        name: '',
        password: '',
        role: 'store-worker',
        shopId: '',
        shopName: '',
      });
    } catch (err) {
      console.error('Failed to add user:', err);
      alert('❌ Failed to add user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
      } catch (err) {
        console.error('Failed to delete user:', err);
      }
    }
  };

  const handleUpdate = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    try {
      await updateUser(id, {
        name: user.name,
        role: user.role,
        shopId: user.shopId,
        shopName: user.shopName,
      });
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleShopChange = (shopId: string) => {
    const selectedShop = shops.find(shop => shop.id === shopId);
    setFormData({
      ...formData,
      shopId,
      shopName: selectedShop ? selectedShop.name : '',
    });
  };

  const handleEditShopChange = (userId: string, shopId: string) => {
    const selectedShop = shops.find(shop => shop.id === shopId);
    const updatedUsers = users.map(u =>
      u.id === userId ? { 
        ...u, 
        shopId: shopId || undefined,
        shopName: selectedShop ? selectedShop.name : undefined
      } : u
    );
    useUserManagementStore.setState({ users: updatedUsers });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield size={16} className="text-purple-600" />;
      case 'stock-worker':
        return <Briefcase size={16} className="text-blue-600" />;
      case 'store-worker':
        return <User size={16} className="text-green-600" />;
      case 'screen':
        return <Monitor size={16} className="text-orange-600" />;
      default:
        return <User size={16} className="text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'stock-worker':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'store-worker':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'screen':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatRoleName = (role: string) => {
    if (role === 'screen') return 'Screen Display';
    return role.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatUserDisplayName = (user: any) => {
    if (user.role === 'store-worker' && user.shopName) {
      return `${formatRoleName(user.role)}: ${user.shopName}`;
    }
    return formatRoleName(user.role);
  };

  // Group users by role for better organization
  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, typeof users>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="mr-3" size={28} />
            User Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and their shop assignments</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
        >
          <UserPlus size={16} className="mr-2" />
          Add New User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Role Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Shield className="mr-2 text-purple-600" size={20} />
            <h3 className="font-semibold text-purple-900 dark:text-purple-300">Admin</h3>
          </div>
          <p className="text-sm text-purple-700 dark:text-purple-400">Full system access, user management, approvals</p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Briefcase className="mr-2 text-blue-600" size={20} />
            <h3 className="font-semibold text-blue-900 dark:text-blue-300">Stock Worker</h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-400">Inventory, supplier management, shipping</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <User className="mr-2 text-green-600" size={20} />
            <h3 className="font-semibold text-green-900 dark:text-green-300">Store Worker</h3>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">Inventory viewing, stock requests (assigned to specific shops)</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Monitor className="mr-2 text-orange-600" size={20} />
            <h3 className="font-semibold text-orange-900 dark:text-orange-300">Screen Display</h3>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-400">External screen display for shop requests monitoring</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">System Users</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total: {users.length} users ({groupedUsers['store-worker']?.length || 0} store workers assigned to shops)
          </p>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Username
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role & Assignment
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Shop Assignment
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => {
                        const updatedUsers = users.map(u =>
                          u.id === user.id ? { ...u, name: e.target.value } : u
                        );
                        useUserManagementStore.setState({ users: updatedUsers });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <User size={20} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-300">{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'admin' | 'stock-worker' | 'store-worker' | 'screen';
                        const updatedUsers = users.map(u =>
                          u.id === user.id ? { 
                            ...u, 
                            role: newRole,
                            // Clear shop assignment if not store worker
                            ...(newRole !== 'store-worker' ? { shopId: undefined, shopName: undefined } : {})
                          } : u
                        );
                        useUserManagementStore.setState({ users: updatedUsers });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="store-worker">Store Worker</option>
                      <option value="stock-worker">Stock Worker</option>
                      <option value="admin">Admin</option>
                      <option value="screen">Screen Display</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{formatUserDisplayName(user)}</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.role === 'store-worker' ? (
                    editingUser === user.id ? (
                      <select
                        value={user.shopId || ''}
                        onChange={(e) => handleEditShopChange(user.id, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">No shop assigned</option>
                        {shops.map(shop => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name} ({shop.location})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center">
                        {user.shopName ? (
                          <>
                            <MapPin size={16} className="text-green-500 mr-2" />
                            <span className="text-sm text-gray-900 dark:text-gray-300">{user.shopName}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400 italic">No shop assigned</span>
                        )}
                      </div>
                    )
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingUser === user.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleUpdate(user.id)}
                        className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        title="Save changes"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingUser(user.id)}
                        className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        title="Edit user"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete user"
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

      {/* Add User Modal */}
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
                      <UserPlus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Add New User</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Create a new user account with appropriate access level</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter username"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter password"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Role
                      </label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => {
                          const newRole = e.target.value as 'admin' | 'stock-worker' | 'store-worker' | 'screen';
                          setFormData({ 
                            ...formData, 
                            role: newRole,
                            // Clear shop assignment if not store worker
                            ...(newRole !== 'store-worker' ? { shopId: '', shopName: '' } : {})
                          });
                        }}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="store-worker">Store Worker</option>
                        <option value="stock-worker">Stock Worker</option>
                        <option value="admin">Admin</option>
                        <option value="screen">Screen Display</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formData.role === 'admin' && 'Full system access and user management'}
                        {formData.role === 'stock-worker' && 'Inventory, supplier management, and shipping'}
                        {formData.role === 'store-worker' && 'Inventory viewing and stock requests (requires shop assignment)'}
                        {formData.role === 'screen' && 'External screen display for monitoring shop requests'}
                      </p>
                    </div>

                    {formData.role === 'store-worker' && (
                      <div>
                        <label htmlFor="shop" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Shop Assignment <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="shop"
                          value={formData.shopId}
                          onChange={(e) => handleShopChange(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        >
                          <option value="">Select a shop</option>
                          {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>
                              {shop.name} ({shop.location})
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Store workers must be assigned to a specific shop location
                        </p>
                        {shops.length === 0 && (
                          <p className="mt-1 text-xs text-red-500">
                            No shops available. Please add shops first in Shop Management.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading || (formData.role === 'store-worker' && !formData.shopId)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add User'}
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

export default UserManagementPage;