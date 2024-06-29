import { LucideIcon } from "lucide-react";

export interface NavBarItemData {
  Icon: LucideIcon;
  label: string;
}

export interface LabeledSwitchProps {
  id: string;
  label: string;
  defaultValue: boolean;
}

export interface TabsSelectorProps {
  label: string;
  options: TabsSelectorOption[];
  defaultValue: string;
}

export interface TabsSelectorOption {
  value: string;
  label: string;
}
