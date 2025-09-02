// Database Configuration for Server Setup

// Configuration for local server setup
const isDevelopment = import.meta.env.DEV || false;
const isLocalServer = import.meta.env.VITE_LOCAL_SERVER === 'true';

// Local server database configuration
const LOCAL_SERVER_CONFIG = {
  // This will be the owner's server IP address
  serverUrl: import.meta.env.VITE_SERVER_URL || window.location.origin,
  // Database connection through server API
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || '/api',
};

// Create database client based on configuration
export const createDatabaseClient = () => {
  if (isLocalServer) {
    return createServerClient();
  } else {
    return createLocalStorageClient();
  }
};

// Server client for production
const createServerClient = () => {
  const apiUrl = `${LOCAL_SERVER_CONFIG.serverUrl}${LOCAL_SERVER_CONFIG.apiEndpoint}`;
  
  return {
    // Authentication methods
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        try {
          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password })
          });
          
          if (!response.ok) {
            throw new Error('Authentication failed');
          }
          
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      signOut: async () => {
        return { data: null, error: null };
      },
      getUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) return { data: null, error: null };
        
        try {
          const response = await fetch(`${apiUrl}/auth/user`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to get user');
          }
          
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }
    },
    
    // Database operations (using API)
    from: (table: string) => ({
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`${apiUrl}/${table}?${column}=${value}`, {
                headers: { 
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                throw new Error('Failed to fetch data');
              }
              
              const data = await response.json();
              return { data: data[0] || null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
        }),
        order: (column: string, options: any = {}) => ({
          async then(resolve: any) {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`${apiUrl}/${table}?orderBy=${column}&order=${options.ascending ? 'asc' : 'desc'}`, {
                headers: { 
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                throw new Error('Failed to fetch data');
              }
              
              const data = await response.json();
              resolve({ data, error: null });
            } catch (error) {
              resolve({ data: [], error });
            }
          }
        })
      }),
      
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`${apiUrl}/${table}`, {
                method: 'POST',
                headers: { 
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
              });
              
              if (!response.ok) {
                throw new Error('Failed to insert data');
              }
              
              const responseData = await response.json();
              return { data: responseData, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
        })
      }),
      
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          async then(resolve: any) {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`${apiUrl}/${table}/${value}`, {
                method: 'PUT',
                headers: { 
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
              });
              
              if (!response.ok) {
                throw new Error('Failed to update data');
              }
              
              resolve({ data: null, error: null });
            } catch (error) {
              resolve({ data: null, error });
            }
          }
        })
      }),
      
      delete: () => ({
        eq: (column: string, value: any) => ({
          async then(resolve: any) {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`${apiUrl}/${table}/${value}`, {
                method: 'DELETE',
                headers: { 
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                throw new Error('Failed to delete data');
              }
              
              resolve({ data: null, error: null });
            } catch (error) {
              resolve({ data: null, error });
            }
          }
        })
      })
    })
  };
};

// Local storage client (replaces database for now)
const createLocalStorageClient = () => {
  return {
    // Authentication methods
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        // Mock authentication - in real implementation this would connect to server
        return { data: null, error: null };
      },
      signOut: async () => {
        return { data: null, error: null };
      },
      getUser: async () => {
        return { data: null, error: null };
      }
    },
    
    // Database operations (using localStorage)
    from: (table: string) => ({
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            const data = localStorage.getItem(table);
            const items = data ? JSON.parse(data) : [];
            const item = items.find((item: any) => item[column] === value);
            return { data: item || null, error: null };
          }
        }),
        order: (column: string, options: any = {}) => ({
          async then(resolve: any) {
            const data = localStorage.getItem(table);
            const items = data ? JSON.parse(data) : [];
            resolve({ data: items, error: null });
          }
        })
      }),
      
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            const stored = localStorage.getItem(table);
            const items = stored ? JSON.parse(stored) : [];
            const newItem = { ...data, id: Date.now() };
            items.push(newItem);
            localStorage.setItem(table, JSON.stringify(items));
            return { data: newItem, error: null };
          }
        })
      }),
      
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          async then(resolve: any) {
            const stored = localStorage.getItem(table);
            const items = stored ? JSON.parse(stored) : [];
            const updatedItems = items.map((item: any) => 
              item[column] === value ? { ...item, ...data } : item
            );
            localStorage.setItem(table, JSON.stringify(updatedItems));
            resolve({ data: null, error: null });
          }
        })
      }),
      
      delete: () => ({
        eq: (column: string, value: any) => ({
          async then(resolve: any) {
            const stored = localStorage.getItem(table);
            const items = stored ? JSON.parse(stored) : [];
            const filteredItems = items.filter((item: any) => item[column] !== value);
            localStorage.setItem(table, JSON.stringify(filteredItems));
            resolve({ data: null, error: null });
          }
        })
      })
    })
  };
};

// Export the database client
export const database = createDatabaseClient();

// Helper function to check if we're using local server
export const isUsingLocalServer = () => isLocalServer;

// Helper function to get server info
export const getServerInfo = () => ({
  isLocal: isLocalServer,
  serverUrl: LOCAL_SERVER_CONFIG.serverUrl,
  apiEndpoint: LOCAL_SERVER_CONFIG.apiEndpoint,
  isDevelopment,
});

// Connection status checker
export const checkServerConnection = async (): Promise<boolean> => {
  try {
    if (isLocalServer) {
      // Try to connect to the server
      const response = await fetch(`${LOCAL_SERVER_CONFIG.serverUrl}${LOCAL_SERVER_CONFIG.apiEndpoint}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Short timeout to avoid long waits if server is down
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } else {
      // Test localStorage availability
      const testKey = 'connection_test';
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return testValue === 'test';
    }
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
};

// Database health monitoring
export const getDatabaseStatus = async () => {
  try {
    const isConnected = await checkServerConnection();
    const serverType = isLocalServer ? 'PostgreSQL Database' : 'Local Storage System';
    const serverUrl = isLocalServer ? LOCAL_SERVER_CONFIG.serverUrl : 'Browser Local Storage';
    
    return {
      connected: isConnected,
      serverType,
      serverUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      connected: false,
      serverType: isLocalServer ? 'PostgreSQL Database' : 'Local Storage System',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};