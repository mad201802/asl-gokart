import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useStore } from '@/stores/useStore';
import { DriveModes, Gears } from '@/data/controlling_models/drivetrain';


/**
 * This component listens for motor data events from the backend
 * and updates the Zustand store with the new data.
 * @returns 
 */
function MotorDataListener() {
  const { setGear, setDriveMode, setThrottle, setRpm, setSpeed } = useStore();

  useEffect(() => {
    const unlisten = listen('motor_data', (event) => {
      const { gear, driveMode, throttle, rpm, speed } = event.payload as {
        gear: Gears;
        driveMode: DriveModes;
        throttle: number;
        rpm: number;
        speed: number;
      };
      console.log('Received motor data from backend:', gear, driveMode, throttle, rpm, speed);

      // Update Zustand store with the new data
      setGear(gear);
      setDriveMode(driveMode);
      setThrottle(throttle);
      setRpm(rpm);
      setSpeed(speed);
    });

    // Clean up the listener when the component unmounts
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setGear, setDriveMode, setThrottle, setRpm, setSpeed]);

  return null;
}

export default MotorDataListener;
