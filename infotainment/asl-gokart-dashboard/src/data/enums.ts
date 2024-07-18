import { TabsSelectorOption } from "@/components/shared/tabs-selector";


//TODO Refactor into motorSlice or a extra motor model ?

export enum Gears {
    p = "p",
    d = "d",
    n = "n",
    r = "r"
}

export enum DriveModes {
    comfort = "comfort",
    eco = "eco",
    sport = "sport"
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
    ];
    return {
        gears: gears,
        driveModes: driveModes
    }
}