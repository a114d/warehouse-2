import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useInventoryStore from '../../store/inventoryStore';
import useDailyOperationsStore from '../../store/dailyOperationsStore';
import useAuthStore from '../../store/authStore';

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, getItemById, updateItemQuantity, loading } = useInventoryStore();
  const { operations, addOperation } = useDailyOperationsStore();
  const { user } = useAuthStore();
  
  const [quantity, setQuantity] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  const item = getItemById(id || '');
  
  // Check if user can edit quantities (only admin and stock-worker)
  const canEditQuantity = user?.role === 'admin' || user?.role === 'stock-worker';
  
  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
    }
  }, [item]);
  
  if (!item) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium">Item not found</h3>
          <button
            onClick={() => navigate('/inventory')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }
  
  // Filter operations for this item
  const itemOperations = operations.filter(op => op.itemId === item.id);
  
  // Prepare chart data
  const chartData = itemOperations.map(op => ({
    date: op.date,
    quantity: op.quantity,
    direction: op.direction,
  }));
  
  const handleSave = async () => {
    if (!user || !canEditQuantity) return;
    
    setSaveLoading(true);
    try {
      const diff = quantity - item.quantity;
      
      if (diff !== 0) {
        await updateItemQuantity(item.id, quantity);
        
        // Record the operation
        await addOperation({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          quantity: Math.abs(diff),
          direction: diff > 0 ? 'in' : 'out',
          date: new Date().toISOString().split('T')[0],
          adminId: user.id,
          adminName: user.name,
          notes: `Manual adjustment by ${user.name}`,
        });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setSaveLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/inventory/${item.type}`)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to {item.type === 'ice-cream' ? 'Ice Cream' : item.type === 'coffee' ? 'Coffee' : 'Kitchen'} Inventory
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Item Details
          </h3>
        </div>
        
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.code}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{item.type}</dd>
              </div>
              {item.flavor && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Flavor</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.flavor}</dd>
                </div>
              )}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Expiry Date</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.expiryDate}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{item.updatedAt}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {isEditing && canEditQuantity ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        className="block w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                      />
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={handleSave}
                          disabled={saveLoading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {saveLoading ? 'Saving...' : (
                            <>
                              <Save size={16} className="mr-1" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setQuantity(item.quantity);
                            setIsEditing(false);
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">{item.quantity}</span>
                      {canEditQuantity ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                        >
                          Edit
                        </button>
                      ) : (
                        <div className="ml-4 flex items-center text-gray-500 dark:text-gray-400">
                          <Lock size={16} className="mr-2" />
                          <span className="text-sm">
                            {user?.role === 'store-worker' 
                              ? 'Store workers cannot adjust quantities' 
                              : user?.role === 'stock-worker'
                              ? 'Use Supplier Management to receive goods and update quantities'
                              : 'View only'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Quantity History</h4>
            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="quantity" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">No history data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Recent Operations
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Direction
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Admin
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {itemOperations.length > 0 ? (
                itemOperations.map((op) => (
                  <tr key={op.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {op.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        op.direction === 'in' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {op.direction === 'in' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {op.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {op.adminName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {op.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No operations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;