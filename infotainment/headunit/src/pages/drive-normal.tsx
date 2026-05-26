import TabsSelector from "@/components/shared/tabs-selector";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
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
import { Lightbulb, OctagonAlert, Spotlight, SquareArrowLeft, SquareArrowRight, TriangleAlert } from "lucide-react";
import log from "@/lib/logger";
import { Segment, THROTTLE_BOUNDARIES, THROTTLE_SEGMENTS, RPM_SEGMENTS } from "@/data/gauge-config";

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

  const { gear, rawThrottle, throttle, showRawThrottle, rpm, speed, rpmBoundaries, batteryPercentage, turnSignalRight, turnSignalLeft, hazardLights, headlights, highBeams, setRpm, setRawThrottle, setThrottle, setGear, setTurnSignalRight, setTurnSignalLeft, setHazardLights, setHeadlights, setHighBeams } = useStore(
    useShallow((state) => ({
      gear: state.gear,
      rawThrottle: state.rawThrottle,
      throttle: state.throttle,
      showRawThrottle: state.showRawThrottle,
      rpm: state.rpm,
      speed: state.speed,
      rpmBoundaries: state.rpmBoundaries,
      batteryPercentage: state.batteryPercentage,
      turnSignalRight: state.turnSignalRight,
      turnSignalLeft: state.turnSignalLeft,
      hazardLights: state.hazardLights,
      headlights: state.headlights,
      highBeams: state.highBeams,
      setRpm: state.setRpm,
      setRawThrottle: state.setRawThrottle,
      setThrottle: state.setThrottle,
      setGear: state.setGear,
      setTurnSignalRight: state.setTurnSignalRight,
      setTurnSignalLeft: state.setTurnSignalLeft,
      setHazardLights: state.setHazardLights,
      setHeadlights: state.setHeadlights,
      setHighBeams: state.setHighBeams,
    }))
  );

  useEffect(() => {
    const cleanupThrottle = window.websocket.onThrottleMessage((incomingPacket: string) => {
      log.debug("Received incoming throttle message in drive-normal.tsx");
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
            log.error("Invalid command (data type) received in throttle message!");
      }
    });

    // Using sero for lights messages instead of WebSocket
    const cleanupLights = window.sero.onLightsMessage((incomingPacket: string) => {
      log.debug("Received incoming lights message in drive-normal.tsx");
      const parsed: IncomingPacket = JSON.parse(incomingPacket);
      switch(parsed.command) {
        case LightsCommands.GET_TURN_SIGNAL_LIGHTS:
            setTurnSignalLeft(parsed.value[0]);
            setHazardLights(parsed.value[0] === 1 && parsed.value[1] === 1);
            setTurnSignalRight(parsed.value[1]);
            break;
        case LightsCommands.GET_HEADLIGHTS:
            setHeadlights([parsed.value[0] === 1, parsed.value[1] === 1]);
            break;
        case LightsCommands.GET_HIGH_BEAMS:
            setHighBeams([parsed.value[0] === 1, parsed.value[1] === 1]);
            break;
        default:
            log.error("Invalid command (data type) received in lights message!");
      }
    });

    return () => {
      cleanupThrottle();
      cleanupLights();
    };
}, []);

  // TODO: Convert colors to tailwind-css colors
  // TODO: Transfer color scaling boundaries to individual states (or only max. value) and multiply times 0.75 or 0.5 for the scale.

  return (
    <div className="w-full flex flex-col">
      
      <HeaderBar />

      <div className="flex flex-col items-center justify-center gap-y-2 pt-10">
        <div className="flex flex-row items-center justify-center gap-x-2">
          { (hazardLights && turnSignalLeft && turnSignalRight) ?
            <TriangleAlert size={36} className="text-green-400" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_HAZARD_LIGHTS)} />
            :
            <TriangleAlert size={36} className="text-gray-700" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_HAZARD_LIGHTS)} />
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
                    THROTTLE_BOUNDARIES[0],
                    THROTTLE_BOUNDARIES[1],
                    THROTTLE_SEGMENTS
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
                <SquareArrowLeft size={36} className="text-green-400" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_LEFT)} />
                :
                <SquareArrowLeft size={36} className="text-gray-700" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_LEFT)} />
              }
              <TabsSelector 
                label="" 
                options={tabsSelectorStates().gears}
                defaultValue={gear}  
                value={gear}
                readOnly={true}
                  />
              { (turnSignalRight) ?
                <SquareArrowRight size={36} className="text-green-400" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_RIGHT)} />
                :
                <SquareArrowRight size={36} className="text-gray-700" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_TURN_SIGNAL_RIGHT)} />
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
                    RPM_SEGMENTS
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

                {(headlights[0] || headlights[1]) ?
                  <Lightbulb size={36} className="text-green-600" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_HEADLIGHTS)} />
                  :
                  <Lightbulb size={36} className="text-gray-700" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_HEADLIGHTS)} />
                }
                {(highBeams[0] || highBeams[1]) ?
                  <Spotlight size={36} className="text-blue-600" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_HIGH_BEAMS)} />
                  :
                  <Spotlight size={36} className="text-gray-700" onClick={() => window.sero.sendLightsCommand(LightsCommands.SET_TOGGLE_HIGH_BEAMS)} />
                }
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
