import { Segment } from "@/data/gauge-config";

export const BATTERY_MIN_VOLTAGE = 51.2;
export const BATTERY_MAX_VOLTAGE = 67.2;

export const SOC_BOUNDARIES: [number, number] = [0, 100];

export const HEATMAP_MIN_TEMP = 12.5;
export const HEATMAP_MAX_TEMP = 40;

export const SOC_SEGMENTS: Segment[] = [
    { value: 0,   color: "#f87171" }, // red-400
    { value: 20,  color: "#facc15" }, // yellow-400
    { value: 50,  color: "#4ade80" }, // green-400
    { value: 100, color: "#4ade80" }, // green-400
];
