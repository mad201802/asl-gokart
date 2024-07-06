// ProgressComponent.jsx
import * as  Progress from '@radix-ui/react-progress';
import './styles.css'; // Import the CSS file

interface TemperatureScaleProps {
    currentTemp: number;
    minTemp: number;
    maxTemp: number;
}



const TemperatureScale = ({ currentTemp, minTemp, maxTemp }: TemperatureScaleProps) => {
    const clampedTemp = Math.max(minTemp, Math.min(currentTemp, maxTemp));
    const range = maxTemp - minTemp;
    const percentage = ((clampedTemp - minTemp) / range) * 100;


  return (
    <Progress.Root className='temperature-scale-root'>
                <div className='temperature-scale-inner'>

        <div style={{ marginLeft: `${percentage}%` }} className='temperature-indicator-container'>

            <div
                className='temperature-scale-indicator'
            />
            <div 
                className='gradient'
            />
        </div>
        </div>


    </Progress.Root>
  );
};

export default TemperatureScale;
