import { DriveModeContext } from "@/contexts/drive-mode-context";
import { Label } from "@/components/ui/label";
import { useContext } from "react";

const DriveModeIndicator = () => {

    const { driveMode } = useContext(DriveModeContext);
    
    const styleClasses: { [key: string]: string } = {
        eco: 'border-green-500 bg-green-500',
        comfort: 'border-blue-500 bg-blue-500',
        sport: 'border-orange-500 bg-orange-500',
        default: 'border-gray-500 bg-gray-500',
    };

    let driveModeChar = driveMode.charAt(0).toUpperCase();

    return (
        <div className="flex flex-row items-center justify-between px-2 py-1">
            <Label className={`w-8 text-base font-black border-solid border-2 rounded-lg text-center ${styleClasses[driveMode] || styleClasses.default}`}>
                {driveModeChar}
            </Label>
        </div>
    );
}

export default DriveModeIndicator;