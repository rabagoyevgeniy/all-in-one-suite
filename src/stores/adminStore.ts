import { create } from 'zustand';

interface AdminState {
  city: 'dubai' | 'baku';
  currency: string;
  setCity: (city: 'dubai' | 'baku') => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  city: 'dubai',
  currency: 'AED',
  setCity: (city) => set({ city, currency: city === 'dubai' ? 'AED' : 'AZN' }),
}));
