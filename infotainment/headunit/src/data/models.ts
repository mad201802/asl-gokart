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