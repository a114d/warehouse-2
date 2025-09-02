import { create } from 'zustand';
import { ShipmentRequest } from '../types';
import { format } from 'date-fns';

// Start with empty requests - production ready
const mockShipmentRequests: ShipmentRequest[] = [];

interface ShipmentRequestStore {
  requests: ShipmentRequest[];
  loading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  addRequest: (request: Omit<ShipmentRequest, 'id' | 'status' | 'requestDate'>) => Promise<void>;
  updateRequestStatus: (
    id: string,
    status: ShipmentRequest['status'],
    processedBy?: { id: string; name: string }
  ) => Promise<void>;
  getRequestsByStatus: (status: ShipmentRequest['status']) => ShipmentRequest[];
}

const useShipmentRequestStore = create<ShipmentRequestStore>((set, get) => ({
  requests: mockShipmentRequests,
  loading: false,
  error: null,

  fetchRequests: async () => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ requests: get().requests, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch shipment requests', loading: false });
    }
  },

  addRequest: async (request) => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRequest: ShipmentRequest = {
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
      set({ error: 'Failed to add shipment request', loading: false });
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

  getRequestsByStatus: (status) => {
    return get().requests.filter(request => request.status === status);
  },
}));

export default useShipmentRequestStore;