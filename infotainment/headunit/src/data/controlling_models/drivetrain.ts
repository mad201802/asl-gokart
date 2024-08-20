import { TabsSelectorOption } from "@/components/shared/tabs-selector";
// import { useStore } from "@/stores/useStore";

// const { adminMode } = useStore();


export enum Gears {
    p = "p",
    d = "d",
    n = "n",
    r = "r"
}

export enum DriveModes {
    comfort = "comfort",
    eco = "eco",
    sport = "sport",
    ludicrous = "ludicrous"
}

export const tabsSelectorStates = (): { gears: TabsSelectorOption[], driveModes: TabsSelectorOption[] } => {
    const gears: TabsSelectorOption[] = [
        {value: Gears.p, label: "P"},
        {value: Gears.d, label: "D"}, 
        {value: Gears.n, label: "N"},
        {value: Gears.r, label: "R"}
    ];
    const driveModes: TabsSelectorOption[] = [
        {value: DriveModes.eco, label: "Eco"},
        {value: DriveModes.comfort, label: "Comfort"}, 
        {value: DriveModes.sport, label: "Sport"},
        {value: DriveModes.ludicrous, label: "Ludicrous", disabled: false}
        // TODO: Toggle disabled based on adminMode (requires useStore() which is not available here)
        // {value: DriveModes.ludicrous, label: "Ludicrous", disabled: !adminMode}
    ];
    return {
        gears: gears,
        driveModes: driveModes
    }
}