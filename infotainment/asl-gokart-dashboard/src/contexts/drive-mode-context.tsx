import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface DriveModeContextType {
  driveMode: string;
  setDriveMode: Dispatch<SetStateAction<string>>;
}

// Create context with a default value
const DriveModeContext = createContext<DriveModeContextType>({
  driveMode: 'eco', // Default drive mode
  setDriveMode: () => {}, // Placeholder function
});

interface DriveModeProviderProps {
  children: ReactNode;
}

const DriveModeProvider = ({ children }: DriveModeProviderProps) => {
  const [driveMode, setDriveMode] = useState('eco');

  return (
    <DriveModeContext.Provider value={{ driveMode, setDriveMode }}>
      {children}
    </DriveModeContext.Provider>
  );
}

export { DriveModeContext, DriveModeProvider };