import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const theme = {
    isDarkMode,
    toggleTheme,

    // Backgrounds
    background:       isDarkMode ? '#111827' : '#f9fafb',
    cardBackground:   isDarkMode ? '#1f2937' : '#ffffff',
    headerBackground: isDarkMode ? '#1e3a8a' : '#2563eb',
    modalBackground:  isDarkMode ? '#1f2937' : '#ffffff',
    searchBackground: isDarkMode ? '#1f2937' : '#ffffff',
    categoryCard:     isDarkMode ? '#1f2937' : '#ffffff',

    // Text
    textPrimary:   isDarkMode ? '#f9fafb' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    sectionTitle:  isDarkMode ? '#f3f4f6' : '#1f2937',
    placeholder:   isDarkMode ? '#6b7280' : '#9ca3af',

    // Inputs
    inputBackground: isDarkMode ? '#374151' : '#f9fafb',
    inputBorder:     isDarkMode ? '#4b5563' : '#e5e7eb',
    inputText:       isDarkMode ? '#f9fafb' : '#1f2937',

    // Borders & Dividers
    border:    isDarkMode ? '#374151' : '#e5e7eb',
    divider:   isDarkMode ? '#374151' : '#f3f4f6',

    // Tab Bar
    tabBar:       isDarkMode ? '#1f2937' : '#ffffff',
    tabBarBorder: isDarkMode ? '#374151' : '#e5e7eb',
    activeTab:    isDarkMode ? '#60a5fa' : '#2563eb',
    inactiveTab:  isDarkMode ? '#6b7280' : '#9ca3af',

    // Misc
    badgeBackground: isDarkMode ? '#374151' : '#f3f4f6',
    success: isDarkMode ? '#34d399' : '#10b981',
    danger:  isDarkMode ? '#f87171' : '#ef4444',
    warning: isDarkMode ? '#fbbf24' : '#f59e0b',
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
