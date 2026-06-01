import { ColorResult, HSLColor, RGBColor } from 'react-color';

export interface HSVColor {
  a?: number;
  h: number;
  s: number;
  v: number;
}

export interface ColorPickerProps {
  color?: string | HSLColor | RGBColor | HSVColor;
  onChange?: (color: ColorResult) => void;
  label?: string;
  className?: string;
}
