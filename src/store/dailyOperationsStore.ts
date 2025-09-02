import { create } from 'zustand';
import { DailyOperation } from '../types';

// Start with empty operations - production ready
const mockDailyOperationsData: DailyOperation[] = [];

interface DailyOperationsState {
  operations: DailyOperation[];
  loading: boolean;
  error: string | null;
  fetchOperations: () => Promise<void>;
  addOperation: (operation: Omit<DailyOperation, 'id'>) => Promise<void>;
  filterByDate: (date: string) => DailyOperation[];
}

const useDailyOperationsStore = create<DailyOperationsState>((set, get) => ({
  operations: mockDailyOperationsData,
  loading: false,
  error: null,
  
  fetchOperations: async () => {
    set({ loading: true, error: null });
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ operations: get().operations, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch daily operations', loading: false });
    }
  },
  
  addOperation: async (operation: Omit<DailyOperation, 'id'>) => {
    set({ loading: true, error: null });
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newOperation: DailyOperation = {
        ...operation,
        id: Math.random().toString(36).substring(2, 9),
      };
      
      set(state => ({
        operations: [...state.operations, newOperation],
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to add operation', loading: false });
    }
  },
  
  filterByDate: (date: string) => {
    return get().operations.filter(op => op.date === date);
  },
}));

export default useDailyOperationsStore;