import TabsSelector from "@/components/shared/tabs-selector";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/stores/useStore";
import { tabsSelectorStates } from "@/data/controlling_models/drivetrain";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { HeaderBar } from "@/components/shared/header-bar";
import ResetDailyDistanceDialog from "@/components/shared/reset-daily-distance-dialog";
import React, { useEffect } from "react";
import { IncomingPacket, RegisterPacket } from "@/data/zonecontrollers/packets";
import { ThrottleCommands } from "@/data/zonecontrollers/zonecontrollers";

interface Segment {
  value: number;
  color: string;
}

function interpolateColor(
  value: number,
  minValue: number,
  maxValue: number,
  segments: Segment[]
): string {
  // Ensure the value is within the specified range
  value = Math.max(minValue, Math.min(value, maxValue));

  // Sort segments by value in ascending order
  segments.sort((a, b) => a.value - b.value);

  // Find the segment that contains the given value
  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i];
    const nextSegment = segments[i + 1];

    if (value >= currentSegment.value && value < nextSegment.value) {
      // Interpolate color between the two segments
      const ratio =
        (value - currentSegment.value) /
        (nextSegment.value - currentSegment.value);
      const interpolatedColor = interpolateColorBetween(
        currentSegment.color,
        nextSegment.color,
        ratio
      );
      return interpolatedColor;
    }
  }

  // If the value is outside the specified segments, return the color of the last segment
  return segments[segments.length - 1].color;
}

function interpolateColorBetween(
  startColor: string,
  endColor: string,
  ratio: number
): string {
  const hex = (c: number) => {
    const hexValue = Math.round(c).toString(16);
    return hexValue.length === 1 ? "0" + hexValue : hexValue;
  };

  // Parse colors to RGB
  const start = startColor.match(/\w\w/g)?.map((x) => parseInt(x, 16)) || [
    0, 0, 0,
  ];
  const end = endColor.match(/\w\w/g)?.map((x) => parseInt(x, 16)) || [0, 0, 0];

  // Interpolate RGB values
  const interpolatedColor = start.map((startValue, index) => {
    const endValue = end[index];
    const interpolatedValue = startValue + ratio * (endValue - startValue);
    // Ensure the interpolated value stays within the valid range (0 to 255)
    return Math.min(255, Math.max(0, interpolatedValue));
  });

  // Convert back to hex
  return (
    "#" +
    hex(interpolatedColor[0]) +
    hex(interpolatedColor[1]) +
    hex(interpolatedColor[2])
  );
}

const DriveNormalPage = () => {

  const { gear, throttle, rpm, speed, rpmBoundaries, batteryPercentage } = useStore()
  const { setRpm, setThrottle } = useStore();


  useEffect(() => {
    window.websocket.onThrottleMessage((incomingPacket: string) => {
      console.log("Received incoming throttle message in drive-normal.tsx");
      const parsed: IncomingPacket = JSON.parse(incomingPacket);
      switch(parsed.valueType) {
        case ThrottleCommands.GET_THROTTLE:
            setThrottle(parsed.value);
            break;
        case ThrottleCommands.GET_RPM:
            setRpm(parsed.value);
            break;
        default:
            console.error("Invalid valueType received in throttle message!");
      }
    });

    // Cleanup listener on component unmount
    return () => {
      window.websocket.onThrottleMessage(() => {});
    };
}, []);

  const throttleBoundaries = [0, 100];
  const throttleSegments: Segment[] = [
    { value: 0, color: "#339900" },
    { value: 50, color: "#339900" },
    { value: 70, color: "#ffcc00" },
    { value: 100, color: "#cc3300" },
  ];

  // TODO: Convert colors to tailwind-css colors
  // TODO: Transfer color scaling boundaries to individual states (or only max. value) and multiply times 0.75 or 0.5 for the scale.
  const rpmSegments: Segment[] = [
    { value: 0, color: "#339900" },
    { value: 5000, color: "#339900" },
    { value: 7500, color: "#ffcc00" },
    { value: 10000, color: "#cc3300" },
  ];

  return (
    <div className="w-full flex flex-col">
      
      <HeaderBar />

      <div className="flex flex-col items-center justify-center gap-y-2 pt-10">
        <div className="grid grid-cols-3 w-full">
          <div className="flex flex-col items-center justify-center">
            <div className="w-[200px]">
              <CircularProgressbarWithChildren
                value={throttle*100}
                circleRatio={0.75}
                styles={buildStyles({
                  pathColor: interpolateColor(
                    throttle*100,
                    throttleBoundaries[0],
                    throttleBoundaries[1],
                    throttleSegments
                  ),
                  rotation: 1 / 2 + 1 / 8,
                  strokeLinecap: "butt",
                  trailColor: "#eee",
                })}
              >
                <p className="font-semibold text-4xl">{throttle*100}%</p>
                <p>Throttle</p>
              </CircularProgressbarWithChildren>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex flex-row items-center gap-x-4">
              <TabsSelector 
                label="" 
                options={tabsSelectorStates().gears}
                defaultValue={gear}  
                value={gear}
                readOnly={true}
                  />
            </div>
            <p className="font-semibold text-9xl">{speed}</p>
            <p className="font">km/h</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="w-[200px]">
              <CircularProgressbarWithChildren
                value={rpm}
                circleRatio={0.75}
                minValue={0}
                maxValue={10000}
                styles={buildStyles({
                  pathColor: interpolateColor(
                    rpm,
                    rpmBoundaries[0],
                    rpmBoundaries[1],
                    rpmSegments
                  ),
                  rotation: 1 / 2 + 1 / 8,
                  strokeLinecap: "butt",
                  trailColor: "#eee",
                })}
              >
                <p className="font-semibold text-4xl">{rpm}</p>
                <p>RPM</p>
              </CircularProgressbarWithChildren>
            </div>
          </div>
        </div>
        <div>
          <ResetDailyDistanceDialog />
        </div>
        <div className="w-full flex flex-col items-center justify-center pt-4">
          <p>Battery</p>
          <Progress className="w-[30%] h-[10px]" value={batteryPercentage*100} />
            <p>{(batteryPercentage*100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};

export default DriveNormalPage;
