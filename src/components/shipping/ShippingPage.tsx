import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Truck, Plus, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import useShipmentStore from '../../store/shipmentStore';
import useShipmentRequestStore from '../../store/shipmentRequestStore';
import useInventoryStore from '../../store/inventoryStore';
import useShopManagementStore from '../../store/shopManagementStore';
import useAuthStore from '../../store/authStore';
import { InventoryItem } from '../../types';

const ShippingPage: React.FC = () => {
  const { shipments, fetchShipments, loading } = useShipmentStore();
  const { requests, addRequest, fetchRequests } = useShipmentRequestStore();
  const { items, fetchItems } = useInventoryStore();
  const { shops, fetchShops } = useShopManagementStore();
  const { user } = useAuthStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [destination, setDestination] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  useEffect(() => {
    fetchShipments();
    fetchItems();
    fetchShops();
    fetchRequests();
  }, [fetchShipments, fetchItems, fetchShops, fetchRequests]);
  
  // Prepare chart data
  const chartData = shipments.reduce((acc, shipment) => {
    const existing = acc.find(item => item.destination === shipment.destination);
    if (existing) {
      existing.quantity += shipment.quantity;
    } else {
      acc.push({ 
        destination: shipment.destination, 
        quantity: shipment.quantity 
      });
    }
    return acc;
  }, [] as { destination: string; quantity: number }[]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    const selectedItemObj = items.find(item => item.id === selectedItem) as InventoryItem;
    
    if (!selectedItemObj) {
      setError('Please select an item');
      return;
    }
    
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    
    if (quantity > selectedItemObj.quantity) {
      setError(`Not enough inventory. Available: ${selectedItemObj.quantity}`);
      return;
    }
    
    if (!destination) {
      setError('Please select a destination');
      return;
    }
    
    setError(null);
    setSubmitLoading(true);
    
    try {
      // Add shipment request instead of direct shipment
      await addRequest({
        itemId: selectedItemObj.id,
        itemName: selectedItemObj.name,
        itemType: selectedItemObj.type,
        flavor: selectedItemObj.flavor,
        quantity,
        destination,
        requestedBy: {
          id: user.id,
          name: user.name,
        },
      });
      
      // Reset form and close modal
      setSelectedItem('');
      setQuantity(1);
      setDestination('');
      setIsModalOpen(false);
      
      // Show success message
      alert('Shipment request submitted successfully! Waiting for admin approval.');
    } catch (error) {
      console.error('Failed to submit shipment request:', error);
      setError('Failed to submit shipment request. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="mr-1" />;
      case 'approved':
        return <CheckCircle size={16} className="mr-1" />;
      case 'cancelled':
        return <XCircle size={16} className="mr-1" />;
      case 'shipped':
        return <Truck size={16} className="mr-1" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shipping Management</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus size={16} className="mr-2" />
          Request Shipment
        </button>
      </div>

      {/* Shipment Requests Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Shipment Requests</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Request Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Destination
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
              {requests.length > 0 ? (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.requestDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.itemName}
                      </div>
                      {request.flavor && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{request.flavor}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.requestedBy.name}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No shipment requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Completed Shipments by Destination</h3>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="destination" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" name="Quantity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No completed shipments yet
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Completed Shipments</h3>
          <div className="overflow-y-auto max-h-64">
            {shipments.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {shipments.slice(0, 5).map((shipment) => (
                  <li key={shipment.id} className="py-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Truck size={20} className="text-indigo-500" />
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {shipment.itemName} {shipment.flavor ? `(${shipment.flavor})` : ''}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {shipment.quantity} units to {shipment.destination} on {shipment.shipmentDate}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No completed shipments found
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Completed Shipment History
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
                  Item
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Destination
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Admin
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {shipments.length > 0 ? (
                shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {shipment.shipmentDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {shipment.itemName}
                      </div>
                      {shipment.flavor && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{shipment.flavor}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {shipment.itemType === 'non-kitchen' ? 'Non-Kitchen' : 
                       shipment.itemType === 'ice-cream' ? 'Ice Cream' :
                       shipment.itemType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {shipment.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {shipment.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {shipment.adminName}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No completed shipments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* New Shipment Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        Request New Shipment
                      </h3>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Note:</strong> Shipment requests require approval from stock management before processing.
                      </p>
                    </div>
                    
                    {error && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded">
                        {error}
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="mt-4">
                      <div className="mb-4">
                        <label htmlFor="item" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Item
                        </label>
                        <select
                          id="item"
                          value={selectedItem}
                          onChange={(e) => setSelectedItem(e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        >
                          <option value="">Select an item</option>
                          <optgroup label="Ice Cream">
                            {items
                              .filter(item => item.type === 'ice-cream' && item.quantity > 0)
                              .map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} {item.flavor ? `(${item.flavor})` : ''} - {item.quantity} available
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Drinks">
                            {items
                              .filter(item => item.type === 'drinks' && item.quantity > 0)
                              .map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} - {item.quantity} available
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Kitchen">
                            {items
                              .filter(item => item.type === 'kitchen' && item.quantity > 0)
                              .map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} - {item.quantity} available
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Non-Kitchen">
                            {items
                              .filter(item => item.type === 'non-kitchen' && item.quantity > 0)
                              .map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} - {item.quantity} available
                                </option>
                              ))}
                          </optgroup>
                        </select>
                        {items.filter(item => item.quantity > 0).length === 0 && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No items available in inventory. Please add items first.
                          </p>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Quantity
                        </label>
                        <input
                          type="number"
                          id="quantity"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                          min="1"
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="destination" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Destination
                        </label>
                        <select
                          id="destination"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        >
                          <option value="">Select a destination</option>
                          {shops.map(shop => (
                            <option key={shop.id} value={shop.name}>
                              {shop.name} ({shop.location})
                            </option>
                          ))}
                        </select>
                        {shops.length === 0 && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No shops available. Please ask an admin to add shops first.
                          </p>
                        )}
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={submitLoading || items.filter(item => item.quantity > 0).length === 0 || shops.length === 0}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                          {submitLoading ? 'Submitting...' : 'Submit Request'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingPage;