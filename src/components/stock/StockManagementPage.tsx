import React, { useEffect, useState } from 'react';
import { Boxes, Search, CheckCircle, XCircle, Download, Printer, Truck, Bell } from 'lucide-react';
import useStockRequestStore from '../../store/stockRequestStore';
import useShipmentRequestStore from '../../store/shipmentRequestStore';
import useShipmentStore from '../../store/shipmentStore';
import useInventoryStore from '../../store/inventoryStore';
import useDailyOperationsStore from '../../store/dailyOperationsStore';
import useAuthStore from '../../store/authStore';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const StockManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const { requests: stockRequests, updateRequestStatus, fetchRequests: fetchStockRequests } = useStockRequestStore();
  const { requests: shipmentRequests, updateRequestStatus: updateShipmentStatus, fetchRequests: fetchShipmentRequests } = useShipmentRequestStore();
  const { addShipment } = useShipmentStore();
  const { items, updateItemQuantity, fetchItems } = useInventoryStore();
  const { addOperation } = useDailyOperationsStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'shipment'>('stock');
  
  useEffect(() => {
    fetchStockRequests();
    fetchShipmentRequests();
    fetchItems();
  }, [fetchStockRequests, fetchShipmentRequests, fetchItems]);
  
  const pendingStockRequests = stockRequests.filter(request => 
    request.status === 'pending' &&
    (searchTerm === '' || 
      request.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.items.some(item => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  const pendingShipmentRequests = shipmentRequests.filter(request => 
    request.status === 'pending' &&
    (searchTerm === '' || 
      request.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  
  const generateApprovalPDF = (request: any, type: 'stock' | 'shipment') => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text(`${type === 'stock' ? 'Stock' : 'Shipment'} Request Approval`, 14, 22);
    
    // Add request details
    doc.setFontSize(12);
    doc.text(`Request ID: ${request.id}`, 14, 35);
    
    if (type === 'stock') {
      doc.text(`Shop: ${request.shopName}`, 14, 45);
      doc.text(`Requested by: ${request.requestedBy.name}`, 14, 55);
      doc.text(`Request Date: ${request.requestDate}`, 14, 65);
    } else {
      doc.text(`Item: ${request.itemName}`, 14, 45);
      doc.text(`Destination: ${request.destination}`, 14, 55);
      doc.text(`Quantity: ${request.quantity}`, 14, 65);
      doc.text(`Requested by: ${request.requestedBy.name}`, 14, 75);
      doc.text(`Request Date: ${request.requestDate}`, 14, 85);
    }
    
    doc.text(`Approved by: ${user?.name}`, 14, type === 'stock' ? 75 : 95);
    doc.text(`Approval Date: ${format(new Date(), 'yyyy-MM-dd')}`, 14, type === 'stock' ? 85 : 105);
    
    if (type === 'stock') {
      // Add items table for stock requests
      const tableColumn = ["Product Code", "Product Name", "Quantity", "Type"];
      const tableRows = request.items.map((item: any) => [
        item.productCode,
        item.productName,
        item.quantity.toString(),
        item.type
      ]);
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 95,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 66, 155] }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 95;
      doc.text('This document serves as official approval for the stock request.', 14, finalY + 20);
      doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, finalY + 30);
    } else {
      // Add shipment details
      doc.text('This document serves as official approval for the shipment request.', 14, 120);
      doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 130);
    }
    
    // Save the PDF
    doc.save(`${type}-approval-${request.id}.pdf`);
  };
  
  const handleProcessStockRequest = async (requestId: string, approve: boolean) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const request = stockRequests.find(r => r.id === requestId);
      if (!request) return;
      
      if (approve) {
        // Check inventory availability using product codes
        const canFulfill = request.items.every(item => {
          const inventoryItem = items.find(i => i.code === item.productCode);
          return inventoryItem && inventoryItem.quantity >= item.quantity;
        });
        
        if (!canFulfill) {
          alert('Insufficient inventory for one or more items');
          setLoading(false);
          return;
        }
        
        // Update inventory and create operations
        for (const item of request.items) {
          const inventoryItem = items.find(i => i.code === item.productCode);
          if (!inventoryItem) continue;
          
          // Update inventory quantity
          await updateItemQuantity(inventoryItem.id, inventoryItem.quantity - item.quantity);
          
          // Record operation
          await addOperation({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            itemType: inventoryItem.type,
            quantity: item.quantity,
            direction: 'out',
            date: format(new Date(), 'yyyy-MM-dd'),
            adminId: user.id,
            adminName: user.name,
            notes: `Stock request for ${request.shopName}`,
          });
        }
        
        // Update request status
        await updateRequestStatus(requestId, 'completed', {
          id: user.id,
          name: user.name,
        });
        
        // Generate approval PDF
        generateApprovalPDF(request, 'stock');
        
        alert('Stock request approved successfully!');
      } else {
        // Cancel request
        await updateRequestStatus(requestId, 'cancelled', {
          id: user.id,
          name: user.name,
        });
        
        alert('Stock request cancelled.');
      }
    } catch (error) {
      console.error('Failed to process stock request:', error);
      alert('Failed to process stock request');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessShipmentRequest = async (requestId: string, approve: boolean) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const request = shipmentRequests.find(r => r.id === requestId);
      if (!request) return;
      
      if (approve) {
        // Check inventory availability
        const inventoryItem = items.find(i => i.id === request.itemId);
        if (!inventoryItem || inventoryItem.quantity < request.quantity) {
          alert('Insufficient inventory for this shipment');
          setLoading(false);
          return;
        }
        
        // Update inventory quantity
        await updateItemQuantity(inventoryItem.id, inventoryItem.quantity - request.quantity);
        
        // Create shipment record
        await addShipment({
          itemId: request.itemId,
          itemName: request.itemName,
          itemType: request.itemType,
          flavor: request.flavor,
          quantity: request.quantity,
          destination: request.destination,
          shipmentDate: format(new Date(), 'yyyy-MM-dd'),
          adminId: user.id,
          adminName: user.name,
        });
        
        // Record operation
        await addOperation({
          itemId: request.itemId,
          itemName: request.itemName,
          itemType: request.itemType,
          quantity: request.quantity,
          direction: 'out',
          date: format(new Date(), 'yyyy-MM-dd'),
          adminId: user.id,
          adminName: user.name,
          notes: `Shipment to ${request.destination}`,
        });
        
        // Update request status
        await updateShipmentStatus(requestId, 'approved', {
          id: user.id,
          name: user.name,
        });
        
        // Generate approval PDF
        generateApprovalPDF(request, 'shipment');
        
        alert('Shipment request approved successfully!');
      } else {
        // Cancel request
        await updateShipmentStatus(requestId, 'cancelled', {
          id: user.id,
          name: user.name,
        });
        
        alert('Shipment request cancelled.');
      }
    } catch (error) {
      console.error('Failed to process shipment request:', error);
      alert('Failed to process shipment request');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Boxes className="mr-2" />
          Stock Management - Request Approval
          {(pendingStockRequests.length > 0 || pendingShipmentRequests.length > 0) && (
            <span className="ml-2 flex items-center">
              <Bell className="text-red-500 animate-pulse\" size={20} />
              <span className="ml-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {pendingStockRequests.length + pendingShipmentRequests.length}
              </span>
            </span>
          )}
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full sm:w-auto"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      {/* Notification Banner */}
      {(pendingStockRequests.length > 0 || pendingShipmentRequests.length > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <Bell className="text-yellow-400 mr-2" size={20} />
            <p className="text-yellow-700 dark:text-yellow-300">
              You have {pendingStockRequests.length + pendingShipmentRequests.length} pending request(s) that need approval.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('stock')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'stock'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Stock Requests ({pendingStockRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('shipment')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'shipment'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Shipment Requests ({pendingShipmentRequests.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'stock' ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pending Stock Requests</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Review and approve or cancel stock requests from shops</p>
              
              <div className="space-y-6">
                {pendingStockRequests.length > 0 ? (
                  pendingStockRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {request.shopName}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Request ID: {request.id}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Requested by {request.requestedBy.name} on {request.requestDate}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleProcessStockRequest(request.id, true)}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Approve & Print PDF
                          </button>
                          <button
                            onClick={() => handleProcessStockRequest(request.id, false)}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <XCircle size={16} className="mr-2" />
                            Cancel Request
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Requested Items:</h5>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                            <thead className="bg-gray-100 dark:bg-gray-600">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Product Code
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Product Name
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Requested Qty
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Available Qty
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                              {request.items.map((item, index) => {
                                const inventoryItem = items.find(i => i.code === item.productCode);
                                const isAvailable = inventoryItem && inventoryItem.quantity >= item.quantity;
                                
                                return (
                                  <tr key={index}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                      {item.productCode}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                      {item.productName}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                      {item.quantity}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                      {inventoryItem ? inventoryItem.quantity : 0}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        isAvailable
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                      }`}>
                                        {isAvailable ? 'Available' : 'Insufficient Stock'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Boxes size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pending stock requests</h3>
                    <p>All stock requests have been processed or there are no new requests to review.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pending Shipment Requests</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Review and approve or cancel shipment requests from workers</p>
              
              <div className="space-y-6">
                {pendingShipmentRequests.length > 0 ? (
                  pendingShipmentRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                            <Truck className="mr-2" size={20} />
                            Shipment to {request.destination}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Request ID: {request.id}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Requested by {request.requestedBy.name} on {request.requestDate}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleProcessShipmentRequest(request.id, true)}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Approve & Print PDF
                          </button>
                          <button
                            onClick={() => handleProcessShipmentRequest(request.id, false)}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <XCircle size={16} className="mr-2" />
                            Cancel Request
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Shipment Details:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</p>
                            <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">
                              {request.itemName}
                              {request.flavor && <span className="text-gray-500"> ({request.flavor})</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</p>
                            <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{request.quantity}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Available</p>
                            <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">
                              {items.find(i => i.id === request.itemId)?.quantity || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              (items.find(i => i.id === request.itemId)?.quantity || 0) >= request.quantity
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {(items.find(i => i.id === request.itemId)?.quantity || 0) >= request.quantity ? 'Available' : 'Insufficient Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Truck size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pending shipment requests</h3>
                    <p>All shipment requests have been processed or there are no new requests to review.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockManagementPage;