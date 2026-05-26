export interface Segment {
    value: number;
    color: string;
}

export const THROTTLE_BOUNDARIES: [number, number] = [0, 100];

export const THROTTLE_SEGMENTS: Segment[] = [
    { value: 0, color: "#339900" },
    { value: 50, color: "#339900" },
    { value: 70, color: "#ffcc00" },
    { value: 100, color: "#cc3300" },
];

export const RPM_SEGMENTS: Segment[] = [
    { value: 0, color: "#339900" },
    { value: 750, color: "#339900" },
    { value: 1000, color: "#ffcc00" },
    { value: 1500, color: "#cc3300" },
];
