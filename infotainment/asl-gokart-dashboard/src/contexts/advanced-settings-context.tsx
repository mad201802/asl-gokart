import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface AdvancedSettingsContextType {
  screenBrightness: number;
  setScreenBrightness: Dispatch<SetStateAction<number>>;
}

// Create context with a default value
const AdvancedSettingsContext = createContext<AdvancedSettingsContextType>({
  screenBrightness: 33, // Default brightness
  setScreenBrightness: () => {}, // Placeholder function
});

interface AdvancedSettingsProviderProps {
  children: ReactNode;
}

const AdvancedSettingsProvider = ({ children }: AdvancedSettingsProviderProps) => {
  const [screenBrightness, setScreenBrightness] = useState(33);

  return (
    <AdvancedSettingsContext.Provider value={{ screenBrightness: screenBrightness, setScreenBrightness: setScreenBrightness }}>
      {children}
    </AdvancedSettingsContext.Provider>
  );
}

export { AdvancedSettingsContext, AdvancedSettingsProvider };