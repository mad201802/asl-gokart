import React from 'react';
import { CustomPicker, InjectedColorProps, ColorChangeHandler, ColorResult } from 'react-color';
import { Hue } from 'react-color/lib/components/common';
import { cn } from '@/lib/utils';
import { ColorPickerProps } from './color-picker.types';

interface HSVColor {
  h: number;
  s: number;
  v: number;
  a?: number;
}

interface CustomInjectedProps extends InjectedColorProps {
  hsv?: HSVColor;
}

// Custom pointer for the Hue slider
const HuePointer = () => (
  <div className="h-6 w-6 -ml-3 rounded-full border-2 border-primary bg-background shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
);

const ColorPickerBase: React.FC<CustomInjectedProps & ColorPickerProps> = ({ 
  hex, 
  hsl, 
  hsv, 
  onChange, 
  label, 
  className 
}) => {
  const handleChange: ColorChangeHandler = (color, event) => {
    if (onChange) {
      onChange(color as any);
    }
  };

  return (
    <div className={cn("w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg border border-border flex flex-col gap-6", className)}>
      {label && <h3 className="text-xl font-medium text-foreground tracking-tight">{label}</h3>}
      

      <div className="flex flex-col gap-4">
        <div className="relative h-6 w-full rounded-full overflow-hidden border border-border/50 shadow-inner">
          <Hue
            {...({ hsl } as any)}
            onChange={handleChange}
            pointer={HuePointer}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 p-3 rounded-2xl bg-secondary/30 border border-border/50">
         <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full border-2 border-border shadow-sm transition-colors duration-200" 
              style={{ backgroundColor: hex }}
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color Hex</span>
              <span className="text-base font-mono font-semibold text-foreground">{hex?.toUpperCase()}</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export const ColorPicker = CustomPicker(ColorPickerBase);
