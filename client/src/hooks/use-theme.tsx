import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./use-auth";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "newsPlatform-theme",
  ...props
}: ThemeProviderProps) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Apply theme based on user authentication status
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    // Only apply dark mode if user is logged in AND theme preference is dark
    // Otherwise, apply light mode
    if (user && theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
  }, [theme, user]);

  // Always save theme preference, so it persists across logins
  useEffect(() => {
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const toggleTheme = () => {
    // Only allow toggling if user is logged in
    if (user) {
      setTheme(theme === "light" ? "dark" : "light");
    }
  };

  const value = {
    // For the theme value exposed to components, respect the user's login status
    theme: user && theme === "dark" ? "dark" : ("light" as Theme),
    setTheme: (newTheme: Theme) => {
      // Only allow setting theme if user is logged in
      if (user) {
        setTheme(newTheme);
      }
    },
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
