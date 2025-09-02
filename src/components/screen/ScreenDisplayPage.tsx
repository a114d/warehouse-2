import React, { useEffect, useState } from 'react';
import { Monitor, Clock, Package, MapPin, User, LogOut } from 'lucide-react';
import useStockRequestStore from '../../store/stockRequestStore';
import useAuthStore from '../../store/authStore';
import { format } from 'date-fns';

const ScreenDisplayPage: React.FC = () => {
  const { requests, fetchRequests } = useStockRequestStore();
  const { logout } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchRequests();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchRequests();
    }, 30000);

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [fetchRequests]);

  // Filter only pending and processing requests, sorted by time (newest first)
  const activeRequests = requests
    .filter(request => request.status === 'pending' || request.status === 'processing')
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'processing':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'NEW REQUEST';
      case 'processing':
        return 'COLLECTING';
      default:
        return status.toUpperCase();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ice-cream':
        return '🍦';
      case 'coffee':
        return '☕';
      case 'kitchen':
        return '🍴';
      case 'non-kitchen':
        return '📦';
      default:
        return '📦';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-gray-700 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-600 rounded-full">
              <Monitor size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Shop Requests Display</h1>
              <p className="text-gray-300">Real-time shop stock requests monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-emerald-400">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-sm text-gray-300">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <LogOut size={20} className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {activeRequests.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl border border-gray-600 p-6 hover:bg-white/15 transition-all duration-300"
              >
                {/* Request Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="text-emerald-400" size={24} />
                    <div>
                      <h3 className="text-xl font-bold text-white">{request.shopName}</h3>
                      <p className="text-sm text-gray-300">Request #{request.id.slice(-6)}</p>
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                    {getStatusText(request.status)}
                  </div>
                </div>

                {/* Request Info */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-300">
                    <Clock size={16} className="mr-2" />
                    <span>Requested: {request.requestDate}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <User size={16} className="mr-2" />
                    <span>By: {request.requestedBy.name}</span>
                  </div>
                  {request.processedBy && (
                    <div className="flex items-center text-sm text-blue-300">
                      <Package size={16} className="mr-2" />
                      <span>Collecting by: {request.processedBy.name}</span>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                    Items Requested ({request.items.length})
                  </h4>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {request.items.map((item, index) => (
                      <div
                        key={index}
                        className="bg-black/30 rounded-lg p-3 border border-gray-700"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getTypeIcon(item.type)}</span>
                            <div>
                              <p className="font-medium text-white">{item.productName}</p>
                              <p className="text-xs text-gray-400">Code: {item.productCode}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-400">
                              {item.quantity}
                            </div>
                            <div className="text-xs text-gray-400 capitalize">
                              {item.type.replace('-', ' ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Status</span>
                    <span className="font-medium">
                      {request.status === 'pending' ? 'Waiting for collection' : 'Being collected'}
                    </span>
                  </div>
                  
                  <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        request.status === 'pending' ? 'w-1/3 bg-yellow-500' : 'w-2/3 bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="p-8 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <Package size={64} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Active Requests</h2>
            <p className="text-gray-400 text-lg">All shop requests have been completed</p>
            <div className="mt-4 text-sm text-gray-500">
              Screen will auto-refresh every 30 seconds
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm border-t border-gray-700 p-4">
        <div className="flex justify-between items-center text-sm text-gray-400">
          <div>
            Invizio WMS - Shop Requests Monitor
          </div>
          <div className="flex items-center space-x-4">
            <span>Active Requests: {activeRequests.length}</span>
            <span>•</span>
            <span>Auto-refresh: 30s</span>
            <span>•</span>
            <span>Last updated: {format(new Date(), 'HH:mm:ss')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenDisplayPage;