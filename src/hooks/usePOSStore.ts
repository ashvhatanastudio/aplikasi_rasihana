import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit: string;
}

interface POSState {
  cart: CartItem[];
  customerId: string | null;
  discount: number; // nominal
  isTaxEnabled: boolean;
  notes: string;
  estimatedCompletedAt: string;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  setCustomer: (id: string | null) => void;
  setDiscount: (amount: number) => void;
  setNotes: (notes: string) => void;
  setEstimatedCompletedAt: (date: string) => void;
  toggleTax: () => void;
  clearCart: () => void;
}

export const usePOSStore = create<POSState>((set) => ({
  cart: [],
  customerId: null,
  discount: 0,
  isTaxEnabled: false,
  notes: '',
  estimatedCompletedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Default 2 days
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((i) => i.id === item.id);
      if (existing) {
        return {
          cart: state.cart.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty + item.qty } : i
          ),
        };
      }
      return { cart: [...state.cart, item] };
    }),
  removeFromCart: (id) =>
    set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),
  updateQty: (id, qty) =>
    set((state) => ({
      cart: state.cart.map((i) => (i.id === id ? { ...i, qty } : i)),
    })),
  setCustomer: (id) => set({ customerId: id }),
  setDiscount: (amount) => set({ discount: amount }),
  setNotes: (notes) => set({ notes }),
  setEstimatedCompletedAt: (date) => set({ estimatedCompletedAt: date }),
  toggleTax: () => set((state) => ({ isTaxEnabled: !state.isTaxEnabled })),
  clearCart: () => set({ 
    cart: [], 
    customerId: null, 
    discount: 0, 
    isTaxEnabled: false,
    notes: '',
    estimatedCompletedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  }),
}));
