import { LucideIcon } from "lucide-react";

export interface NavBarItemData {
  Icon: LucideIcon;
  label: string;
  linkTo: string;
}

export interface LabeledSwitchProps {
  id: string;
  label: string;
  defaultValue: boolean;
  onChange?: (value: boolean) => void;
}

export interface ValueCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

export interface BatteryIndicatorProps {
  batteryLevel: number;
}

export type ButtonMappings = Map<string, [(number | boolean), (string | undefined)][]>

// example ButtonMappings:
// {
//   "peter": [
//     [true, "turnSignalLeft"],
//     [false, "turnSignalRight"],
//     [true, "hazardLights"]
//   ],
//   "peter": [
//   ],
//   "robin": [
//     [128, "brigthness"],
//     [255, undefined]
//   ]
// }