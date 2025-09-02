import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: localStorage.getItem('darkMode') === 'true',
  
  toggleDarkMode: () => {
    const newDarkMode = !get().isDarkMode;
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    set({ isDarkMode: newDarkMode });
  },
}));

// Initialize dark mode on app start
const isDarkMode = localStorage.getItem('darkMode') === 'true';
if (isDarkMode) {
  document.documentElement.classList.add('dark');
}

export default useThemeStore;