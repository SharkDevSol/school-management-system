// LanguageSelectionContext.jsx - Context for managing selected languages across tasks
import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageSelectionContext = createContext();

// Available languages (excluding English which is always required)
export const AVAILABLE_LANGUAGES = [
  { code: 'om', name: 'Afaan Oromoo', nativeName: 'Afaan Oromoo' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

export const LanguageSelectionProvider = ({ children }) => {
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load selected languages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedFormLanguages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedLanguages(parsed);
      } catch (e) {
        console.error('Error parsing stored languages:', e);
        setSelectedLanguages([]);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever selectedLanguages changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('selectedFormLanguages', JSON.stringify(selectedLanguages));
    }
  }, [selectedLanguages, isLoaded]);

  const toggleLanguage = (langCode) => {
    setSelectedLanguages(prev => {
      if (prev.includes(langCode)) {
        return prev.filter(code => code !== langCode);
      } else {
        return [...prev, langCode];
      }
    });
  };

  const addLanguage = (langCode) => {
    if (!selectedLanguages.includes(langCode)) {
      setSelectedLanguages(prev => [...prev, langCode]);
    }
  };

  const removeLanguage = (langCode) => {
    setSelectedLanguages(prev => prev.filter(code => code !== langCode));
  };

  const clearLanguages = () => {
    setSelectedLanguages([]);
  };

  const getLanguageName = (code) => {
    const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
    return lang ? lang.name : code;
  };

  const getLanguageNativeName = (code) => {
    const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
    return lang ? lang.nativeName : code;
  };

  const value = {
    selectedLanguages,
    setSelectedLanguages,
    toggleLanguage,
    addLanguage,
    removeLanguage,
    clearLanguages,
    getLanguageName,
    getLanguageNativeName,
    availableLanguages: AVAILABLE_LANGUAGES,
    isLoaded
  };

  return (
    <LanguageSelectionContext.Provider value={value}>
      {children}
    </LanguageSelectionContext.Provider>
  );
};

export const useLanguageSelection = () => {
  const context = useContext(LanguageSelectionContext);
  if (!context) {
    throw new Error('useLanguageSelection must be used within a LanguageSelectionProvider');
  }
  return context;
};

export default LanguageSelectionContext;
