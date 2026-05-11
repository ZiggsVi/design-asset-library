import { createContext, useContext, useState, useEffect } from 'react';
import { theme } from 'antd';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme-dark') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('theme-dark', darkMode);
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(prev => !prev);

  const themeConfig = {
    algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
    },
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
