import TemperatureScale from "./temperature-scale";

interface TemperatureBoxProps {
    maxTemp: number;
    minTemp: number;
    currentTemp: number;
}

const TemperatureBox = ({ currentTemp, minTemp, maxTemp }: TemperatureBoxProps) => {
    return (
        <div className="flex flex-row items-center justify-center">
            <div className="flex flex-col w-1/2 items-center justify-center p-1 border-2 border-black overflow-hidden">
                <p>Battery</p>
                {/* <Progress value={50} /> */}
                <TemperatureScale currentTemp={currentTemp} minTemp={minTemp} maxTemp={maxTemp} />
            </div>
        </div>

    );
}

export default TemperatureBox;