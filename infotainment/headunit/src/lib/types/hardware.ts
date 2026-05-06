import { z } from "zod";

export enum NetworkInterfaceType {
    Wired = "wired",
    Wireless = "wireless",
};

export enum NetworkInterfaceFamily {
    IPv4 = "IPv4",
    IPv6 = "IPv6",
};

export type NetworkInterface = {
    name: string;
    type: NetworkInterfaceType;
    family: NetworkInterfaceFamily;
    mac: string;
    address: string;
    netmask: string;
    internal: boolean;
};

const NetworkInterfaceInfoSchema = z.object({
    address: z.string(),
    netmask: z.string(),
    family: z.enum(["IPv4", "IPv6"]),
    mac: z.string(),
    internal: z.boolean(),
    cidr: z.string().nullable().optional(),
    scopeid: z.number().optional(),
});

const RawNetworkInterfacesSchema = z.record(z.string(), z.array(NetworkInterfaceInfoSchema));

const wirelessPattern = /^(wlan|wlp|wl|wifi)/i;

export function parseNetworkInterfaces(raw: unknown): NetworkInterface[] {
    const parsed = RawNetworkInterfacesSchema.parse(raw);
    const result: NetworkInterface[] = [];
    for (const [name, infos] of Object.entries(parsed)) {
        for (const info of infos) {
            result.push({
                name,
                type: wirelessPattern.test(name) ? NetworkInterfaceType.Wireless : NetworkInterfaceType.Wired,
                family: info.family === "IPv4" ? NetworkInterfaceFamily.IPv4 : NetworkInterfaceFamily.IPv6,
                mac: info.mac,
                address: info.address,
                netmask: info.netmask,
                internal: info.internal,
            });
        }
    }
    return result;
}