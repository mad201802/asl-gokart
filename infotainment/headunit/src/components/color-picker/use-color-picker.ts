import { useState, useCallback } from 'react';
import { ColorResult } from 'react-color';

export const useColorPicker = (initialColor: string = '#00f9ff') => {
  const [color, setColor] = useState<string>(initialColor);

  const handleColorChange = useCallback((colorResult: ColorResult) => {
    setColor(colorResult.hex);
  }, []);

  return {
    color,
    handleColorChange,
  };
};
