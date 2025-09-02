import { create } from 'zustand';
import { StockRequest } from '../types';
import { format } from 'date-fns';

// Start with empty requests - production ready
const mockStockRequests: StockRequest[] = [];

interface StockRequestStore {
  requests: StockRequest[];
  loading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  addRequest: (request: Omit<StockRequest, 'id' | 'status' | 'requestDate'>) => Promise<void>;
  updateRequestStatus: (
    id: string,
    status: StockRequest['status'],
    processedBy: { id: string; name: string }
  ) => Promise<void>;
  getRequestsByShop: (shopId: string) => StockRequest[];
  getRequestsByStatus: (status: StockRequest['status']) => StockRequest[];
}

const useStockRequestStore = create<StockRequestStore>((set, get) => ({
  requests: mockStockRequests,
  loading: false,
  error: null,

  fetchRequests: async () => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ requests: get().requests, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch stock requests', loading: false });
    }
  },

  addRequest: async (request) => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRequest: StockRequest = {
        ...request,
        id: Math.random().toString(36).substring(2, 9),
        status: 'pending',
        requestDate: format(new Date(), 'yyyy-MM-dd'),
      };

      set(state => ({
        requests: [...state.requests, newRequest],
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to add stock request', loading: false });
    }
  },

  updateRequestStatus: async (id, status, processedBy) => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      set(state => ({
        requests: state.requests.map(request =>
          request.id === id
            ? {
                ...request,
                status,
                processedBy,
                processedAt: format(new Date(), 'yyyy-MM-dd'),
              }
            : request
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update request status', loading: false });
    }
  },

  getRequestsByShop: (shopId) => {
    return get().requests.filter(request => request.shopId === shopId);
  },

  getRequestsByStatus: (status) => {
    return get().requests.filter(request => request.status === status);
  },
}));

export default useStockRequestStore;