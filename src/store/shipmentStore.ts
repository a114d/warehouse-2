import { create } from 'zustand';
import { ShipmentRecord } from '../types';

// Start with empty shipments - production ready
const mockShipmentData: ShipmentRecord[] = [];

interface ShipmentState {
  shipments: ShipmentRecord[];
  loading: boolean;
  error: string | null;
  fetchShipments: () => Promise<void>;
  addShipment: (shipment: Omit<ShipmentRecord, 'id'>) => Promise<void>;
}

const useShipmentStore = create<ShipmentState>((set, get) => ({
  shipments: mockShipmentData,
  loading: false,
  error: null,
  
  fetchShipments: async () => {
    set({ loading: true, error: null });
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ shipments: get().shipments, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch shipments', loading: false });
    }
  },
  
  addShipment: async (shipment: Omit<ShipmentRecord, 'id'>) => {
    set({ loading: true, error: null });
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newShipment: ShipmentRecord = {
        ...shipment,
        id: Math.random().toString(36).substring(2, 9),
      };
      
      set(state => ({
        shipments: [...state.shipments, newShipment],
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to add shipment', loading: false });
    }
  },
}));

export default useShipmentStore;