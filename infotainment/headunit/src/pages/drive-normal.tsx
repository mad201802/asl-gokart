import TabsSelector from "@/components/shared/tabs-selector";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/stores/useStore";
import { Gears, tabsSelectorStates } from "@/data/controlling_models/drivetrain";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { HeaderBar } from "@/components/shared/header-bar";
import ResetDailyDistanceDialog from "@/components/shared/reset-daily-distance-dialog";
import React, { useEffect } from "react";
import { IncomingPacket, OutgoingPacket, RegisterPacket } from "@/data/zonecontrollers/packets";
import { ButtonsCommands, LightsCommands, ThrottleCommands, Zones } from "@/data/zonecontrollers/zonecontrollers";
import { OctagonAlert, SquareArrowLeft, SquareArrowRight, TriangleAlert } from "lucide-react";

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

  const { gear, rawThrottle, throttle, showRawThrottle, rpm, speed, rpmBoundaries, batteryPercentage, turnSignalRight, turnSignalLeft, hazardLights } = useStore()
  const { setRpm, setRawThrottle, setThrottle, setGear, setTurnSignalRight, setTurnSignalLeft, setHazardLights } = useStore();

  useEffect(() => {
    window.websocket.onThrottleMessage((incomingPacket: string) => {
      console.log("Received incoming throttle message in drive-normal.tsx");
      const parsed: IncomingPacket = JSON.parse(incomingPacket);
      switch(parsed.command) {
        case ThrottleCommands.GET_THROTTLE:
            setRawThrottle(parsed.value[0]);
            setThrottle(parsed.value[1]);
            break;
        case ThrottleCommands.GET_RPM:
            setRpm(parsed.value);
            break;
        case ThrottleCommands.GET_REVERSE:
            setGear(parsed.value === 1 ? Gears.r : Gears.d);
            break;
        default:
            console.error("Invalid command (data type) received in throttle message!");
      }
    });

    // Using SOMEIP for lights messages instead of WebSocket
    window.someip.onLightsMessage((incomingPacket: string) => {
      console.log("Received incoming SOMEIP lights message in drive-normal.tsx");
      const parsed: IncomingPacket = JSON.parse(incomingPacket);
      console.log(`Parsed lights message: ${JSON.stringify(parsed)}`);
      switch(parsed.command) {
        case LightsCommands.GET_TURN_SIGNAL_LIGHTS:
            setTurnSignalLeft(parsed.value[0]);
            setHazardLights(parsed.value[1]);
            setTurnSignalRight(parsed.value[2]);
            break;
        default:
            console.error("Invalid command (data type) received in lights message!");
      }
    });

    // Cleanup listeners on component unmount
    return () => {
      window.websocket.onThrottleMessage(() => {});
      window.someip.onLightsMessage(() => {});
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
    { value: 750, color: "#339900" },
    { value: 1000, color: "#ffcc00" },
    { value: 1500, color: "#cc3300" },
  ];

  return (
    <div className="w-full flex flex-col">
      
      <HeaderBar />

      <div className="flex flex-col items-center justify-center gap-y-2 pt-10">
        <div className="flex flex-row items-center justify-center gap-x-2">
          { (hazardLights && turnSignalLeft && turnSignalRight) ?
            <TriangleAlert size={36} className="text-green-400" onClick={() => window.someip.sendLightsCommand(LightsCommands.SET_TOGGLE_HAZARD_LIGHTS)} />
            :
            <TriangleAlert size={36} className="text-gray-700" onClick={() => window.someip.sendLightsCommand(LightsCommands.SET_TOGGLE_HAZARD_LIGHTS)} />
          }
        </div>
        <div className="grid grid-cols-3 w-full">
          <div className="flex flex-col items-center justify-center">
            <div className="w-[200px]">
              <CircularProgressbarWithChildren
                value={((showRawThrottle ? rawThrottle : throttle)*100)}
                circleRatio={0.75}
                styles={buildStyles({
                  pathColor: interpolateColor(
                    ((showRawThrottle ? rawThrottle : throttle)*100),
                    throttleBoundaries[0],
                    throttleBoundaries[1],
                    throttleSegments
                  ),
                  rotation: 1 / 2 + 1 / 8,
                  strokeLinecap: "butt",
                  trailColor: "#eee",
                })}
              >
                <p className="font-semibold text-4xl">{((showRawThrottle ? rawThrottle : throttle)*100).toFixed(0)}%</p>
                <p>Throttle</p>
              </CircularProgressbarWithChildren>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex flex-row items-center gap-x-4">
              { (turnSignalLeft) ?
                <SquareArrowLeft size={36} className="text-green-400" onClick={() => window.someip.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_LEFT)} />
                :
                <SquareArrowLeft size={36} className="text-gray-700" onClick={() => window.someip.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_LEFT)} />
              }
              <TabsSelector 
                label="" 
                options={tabsSelectorStates().gears}
                defaultValue={gear}  
                value={gear}
                readOnly={true}
                  />
              { (turnSignalRight) ?
                <SquareArrowRight size={36} className="text-green-400" onClick={() => window.someip.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_RIGHT)} />
                :
                <SquareArrowRight size={36} className="text-gray-700" onClick={() => window.someip.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_RIGHT)} />
              }
            </div>
            <p className="font-semibold text-9xl">{speed.toFixed(0)}</p>
            <p className="font">km/h</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="w-[200px]">
              <CircularProgressbarWithChildren
                value={rpm}
                circleRatio={0.75}
                minValue={rpmBoundaries[0]}
                maxValue={rpmBoundaries[1]}
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
        <div className="grid grid-cols-3 w-full">
          <div className="flex flex-row items-start gap-x-6 justify-evenly">
                {/* Use color text-red-500 if critical or text-orange-400 if warning */}

                {/* <OctagonAlert size={36} className="text-orange-400" /> */}
                <OctagonAlert size={36} className="text-gray-700" />
                {/* <OctagonAlert size={36} className="text-red-500" /> */}
                <OctagonAlert size={36} className="text-gray-700" />
                {/* <OctagonAlert size={36} className="text-red-500" /> */}
                <OctagonAlert size={36} className="text-gray-700" />

          </div>
          <div className="flex flex-row justify-evenly">
            <ResetDailyDistanceDialog />
          </div>
          <div className="flex flex-row items-end gap-x-6 justify-evenly">
                {/* <OctagonAlert size={36} className="text-orange-400" /> */}
                <OctagonAlert size={36} className="text-gray-700" />
                {/* <OctagonAlert size={36} className="text-green-500" /> */}
                <OctagonAlert size={36} className="text-gray-700" />
                {/* <OctagonAlert size={36} className="text-blue-500" /> */}
                <OctagonAlert size={36} className="text-gray-700" />
          </div>
        </div>
        <div className="w-full flex flex-col items-center justify-center pt-4">
          <p>Battery</p>
          <Progress className="rounded-md w-[30%] h-[40px]" value={batteryPercentage*100} />
            <p>{(batteryPercentage*100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};

export default DriveNormalPage;
