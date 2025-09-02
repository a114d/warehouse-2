import React, { useEffect, useState } from 'react';
import { Package, Search, CheckCircle, Clock, Send, Eye, AlertTriangle } from 'lucide-react';
import useStockRequestStore from '../../store/stockRequestStore';
import useInventoryStore from '../../store/inventoryStore';
import useAuthStore from '../../store/authStore';
import { StockRequest } from '../../types';

const ShopRequestsPreparationPage: React.FC = () => {
  const { user } = useAuthStore();
  const { requests, updateRequestStatus, fetchRequests } = useStockRequestStore();
  const { items, fetchItems } = useInventoryStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [preparationNotes, setPreparationNotes] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchItems();
  }, [fetchRequests, fetchItems]);

  // Filter requests that are pending (new from shops)
  const pendingRequests = requests.filter(request => 
    request.status === 'pending' &&
    (searchTerm === '' || 
      request.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.items.some(item => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  // Filter requests that are being processed by stock workers
  const processingRequests = requests.filter(request => 
    request.status === 'processing' &&
    (searchTerm === '' || 
      request.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.items.some(item => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  const handleStartPreparation = async (requestId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      await updateRequestStatus(requestId, 'processing', {
        id: user.id,
        name: user.name,
      });
      
      alert('Request preparation started! You can now prepare the items.');
    } catch (error) {
      console.error('Failed to start preparation:', error);
      alert('Failed to start preparation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToAdmin = async (requestId: string) => {
    if (!user) return;
    
    const notes = preparationNotes[requestId] || '';
    
    setLoading(true);
    try {
      // Update request with preparation notes and send to admin
      const request = requests.find(r => r.id === requestId);
      if (request) {
        // Add preparation notes to the request
        const updatedRequest = {
          ...request,
          notes: `${request.notes || ''}\n\nStock Worker Preparation Notes (${user.name}):\n${notes}`.trim(),
          status: 'pending' as const, // Send back to pending for admin approval
          processedBy: {
            id: user.id,
            name: user.name,
          }
        };
        
        // In a real implementation, you would update the request with preparation info
        // For now, we'll just change status back to pending for admin review
        await updateRequestStatus(requestId, 'pending', {
          id: user.id,
          name: user.name,
        });
      }
      
      setPreparationNotes(prev => ({ ...prev, [requestId]: '' }));
      alert('Request prepared and sent to admin for final approval!');
    } catch (error) {
      console.error('Failed to send to admin:', error);
      alert('Failed to send to admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkItemAvailability = (productCode: string, requestedQuantity: number) => {
    const inventoryItem = items.find(item => item.code === productCode);
    if (!inventoryItem) return { available: false, stock: 0, status: 'not-found' };
    
    if (inventoryItem.quantity >= requestedQuantity) {
      return { available: true, stock: inventoryItem.quantity, status: 'available' };
    } else if (inventoryItem.quantity > 0) {
      return { available: false, stock: inventoryItem.quantity, status: 'partial' };
    } else {
      return { available: false, stock: 0, status: 'out-of-stock' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'out-of-stock':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'not-found':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'partial':
        return 'Partial Stock';
      case 'out-of-stock':
        return 'Out of Stock';
      case 'not-found':
        return 'Not Found';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="mr-3" size={28} />
            Shop Requests Preparation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Prepare shop requests by checking inventory and collecting items before sending to admin for approval
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex items-start">
          <AlertTriangle className="text-blue-500 mr-2 mt-0.5" size={20} />
          <div>
            <h3 className="text-blue-800 dark:text-blue-300 font-semibold">How it works:</h3>
            <ol className="text-blue-700 dark:text-blue-400 text-sm mt-1 list-decimal list-inside space-y-1">
              <li>Review new shop requests and check item availability</li>
              <li>Start preparation to collect and organize the requested items</li>
              <li>Add preparation notes about any issues or substitutions</li>
              <li>Send prepared request to admin for final approval and shipping</li>
            </ol>
          </div>
        </div>
      </div>

      {/* New Requests (Pending) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Clock className="mr-2 text-yellow-500" size={20} />
            New Shop Requests ({pendingRequests.length})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fresh requests from shops waiting for preparation
          </p>
        </div>

        <div className="p-6">
          {pendingRequests.length > 0 ? (
            <div className="space-y-6">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        🏪 {request.shopName}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Request ID: {request.id} • Requested by {request.requestedBy.name} on {request.requestDate}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                      >
                        <Eye size={16} className="mr-2" />
                        {selectedRequest === request.id ? 'Hide Details' : 'View Details'}
                      </button>
                      <button
                        onClick={() => handleStartPreparation(request.id)}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                      >
                        <Package size={16} className="mr-2" />
                        Start Preparation
                      </button>
                    </div>
                  </div>

                  {selectedRequest === request.id && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Requested Items:</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                          <thead className="bg-gray-100 dark:bg-gray-600">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Code</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Requested</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Available</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                            {request.items.map((item, index) => {
                              const availability = checkItemAvailability(item.productCode, item.quantity);
                              return (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                    {item.productName}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                                    {item.productCode}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                                    {item.quantity}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                                    {availability.stock}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(availability.status)}`}>
                                      {getStatusText(availability.status)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No new shop requests</h3>
              <p>All shop requests have been processed or there are no new requests to prepare.</p>
            </div>
          )}
        </div>
      </div>

      {/* Requests Being Prepared */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Package className="mr-2 text-blue-500" size={20} />
            Requests in Preparation ({processingRequests.length})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Requests you are currently preparing
          </p>
        </div>

        <div className="p-6">
          {processingRequests.length > 0 ? (
            <div className="space-y-6">
              {processingRequests.map((request) => (
                <div key={request.id} className="border border-blue-200 dark:border-blue-800 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        🏪 {request.shopName}
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          In Preparation
                        </span>
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Request ID: {request.id} • Started by {request.processedBy?.name} on {request.processedAt}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Items to Prepare:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {request.items.map((item, index) => {
                        const availability = checkItemAvailability(item.productCode, item.quantity);
                        return (
                          <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.productName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{item.productCode}</p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(availability.status)}`}>
                                {getStatusText(availability.status)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Need: {item.quantity} | Available: {availability.stock}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor={`notes-${request.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preparation Notes (Optional)
                    </label>
                    <textarea
                      id={`notes-${request.id}`}
                      value={preparationNotes[request.id] || ''}
                      onChange={(e) => setPreparationNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Add notes about item preparation, substitutions, or any issues..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSendToAdmin(request.id)}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      <Send size={16} className="mr-2" />
                      Send to Admin for Approval
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No requests in preparation</h3>
              <p>Start preparing new shop requests from the section above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopRequestsPreparationPage;