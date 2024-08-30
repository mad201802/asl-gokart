import { LucideIcon } from "lucide-react";
import { Zones } from "./controlling_models/zc";

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

/* Data model for incoming WebSocket message */

export interface IncomingZoneControllerMessage {
  zone: Zones;
  description: string;
  value: number;
}

export interface OutgoingZoneControllerMessage {
  command: string;
  value: number;
}