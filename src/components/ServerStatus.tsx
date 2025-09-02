import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, Server } from 'lucide-react';

interface ServerStatusProps {
  className?: string;
}

const ServerStatus: React.FC<ServerStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      let isConnected = false;
      let serverType = 'Local Storage';
      
      try {
        // First try to check server connection
        try {
          const response = await fetch('/api/health', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // Short timeout to avoid long waits if server is down
            signal: AbortSignal.timeout(2000)
          });
          
          if (response.ok) {
            const data = await response.json();
            isConnected = data.status === 'OK';
            serverType = 'PostgreSQL Database';
          }
        } catch (error) {
          console.log('Server connection check failed, falling back to localStorage');
          // Fallback to localStorage check
          const testKey = 'test_connection';
          localStorage.setItem(testKey, 'test');
          const testValue = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          isConnected = testValue === 'test';
          serverType = 'Local Storage';
        }

        setStatus({
          connected: isConnected,
          serverType: serverType,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setStatus({
          connected: false,
          serverType: serverType,
          error: 'Connection failed',
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    // Check status immediately
    checkStatus();

    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Checking...</span>
      </div>
    );
  }

  const isConnected = status?.connected;
  const isDatabase = status?.serverType === 'PostgreSQL Database';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      {isConnected ? (
        <CheckCircle size={12} className="text-green-500" />
      ) : (
        <AlertCircle size={12} className="text-red-500 animate-pulse" />
      )}

      {/* Server Type Icon */}
      {isDatabase ? (
        <Database size={12} className="text-blue-500" />
      ) : (
        <Server size={12} className="text-amber-500" />
      )}

      {/* Status Text */}
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${
          isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isConnected ? 'System Ready' : 'Connection Error'}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {status?.serverType}
        </span>
      </div>
    </div>
  );
};

export default ServerStatus;