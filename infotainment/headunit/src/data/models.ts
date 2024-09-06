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
}

export interface ValueCardProps {
  label: string;
  value: string | number;
  unit?: string;
}