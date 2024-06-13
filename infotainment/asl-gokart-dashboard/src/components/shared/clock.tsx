import { useEffect, useState } from "react";

const DigitalClock = () => {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    // Update the time every second
    const intervalId = setInterval(() => {
      const currentDate = new Date();
      setTime(
        currentDate.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          second: undefined,
        })
      );
    }, 1000);

    // Clean up the interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures the effect runs only once on mount

  return <p className="font-bold">{time}</p>;
};

export default DigitalClock;
