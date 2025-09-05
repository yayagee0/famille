// Neo theme utilities and state management
import { browser } from '$app/environment';

// Theme types
export type Theme = 'default' | 'neo' | 'system';

// Theme state store (using vanilla JavaScript for simplicity)
class ThemeStore {
  private _theme: Theme = 'default';
  private _listeners: ((theme: Theme) => void)[] = [];

  constructor() {
    if (browser) {
      this.loadTheme();
    }
  }

  get theme(): Theme {
    return this._theme;
  }

  set theme(newTheme: Theme) {
    this._theme = newTheme;
    this.applyTheme();
    this.saveTheme();
    this._listeners.forEach(listener => listener(newTheme));
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this._listeners.push(listener);
    listener(this._theme);
    
    return () => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
  }

  private loadTheme() {
    if (!browser) return;

    const stored = localStorage.getItem('famille-theme') as Theme;
    if (stored && ['default', 'neo', 'system'].includes(stored)) {
      this._theme = stored;
    } else {
      this._theme = 'default';
    }
    
    this.applyTheme();
  }

  private saveTheme() {
    if (!browser) return;
    localStorage.setItem('famille-theme', this._theme);
  }

  private applyTheme() {
    if (!browser) return;

    const html = document.documentElement;
    
    // Remove all theme classes
    html.classList.remove('neo');
    
    // Apply theme-specific classes
    if (this._theme === 'neo') {
      html.classList.add('neo');
    } else if (this._theme === 'system') {
      // For system theme, check user's preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        html.classList.add('neo'); // Use neo for dark system preference
      }
    }
  }

  toggleTheme() {
    const themes: Theme[] = ['default', 'neo'];
    const currentIndex = themes.indexOf(this._theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.theme = themes[nextIndex];
  }
}

// Global theme store instance
export const themeStore = new ThemeStore();

// Convenience functions
export function getCurrentTheme(): Theme {
  return themeStore.theme;
}

export function setTheme(theme: Theme) {
  themeStore.theme = theme;
}

export function toggleTheme() {
  themeStore.toggleTheme();
}

export function subscribeToTheme(listener: (theme: Theme) => void): () => void {
  return themeStore.subscribe(listener);
}

// Helper to check if current theme is neo
export function isNeoTheme(): boolean {
  return themeStore.theme === 'neo';
}

// CSS class helper for conditional Neo styling
export function getThemeClasses(neoClasses: string, defaultClasses: string = ''): string {
  return isNeoTheme() ? neoClasses : defaultClasses;
}

// Initialize theme on module load
if (browser) {
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (themeStore.theme === 'system') {
      themeStore.theme = 'system'; // Trigger re-application
    }
  });
}