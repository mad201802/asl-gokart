import React, { useEffect, useRef, useState } from 'react';
import h337, { HeatmapConfiguration, DataPoint } from '@mars3d/heatmap.js';

interface HeatmapComponentProps {
    data: DataPoint[];
    width: number;
    height: number;
    max: number;
    min: number;
}

const HeatmapComponent: React.FC<HeatmapComponentProps> = ({ data, width, height, max, min }) => {
    const heatmapContainerRef = useRef<HTMLDivElement>(null);
    const [heatmapInstance, setHeatmapInstance] = useState<any>(null);

    useEffect(() => {
        if (heatmapContainerRef.current) {
            // Create the heatmap configuration
            const config: HeatmapConfiguration = {
                container: heatmapContainerRef.current,
                minOpacity: 0.3,
                maxOpacity: 0.8,
                radius: 150,
                blur: 0.9,
                useLocalExtrema: false,
                gradient: {
                    0: 'blue',
                    1: 'red',
                },
            };

            // Initialize the heatmap instance
            const instance = h337.create(config);
            setHeatmapInstance(instance);
        }

        return () => {
            // Cleanup heatmap instance on component unmount
            setHeatmapInstance(null);
        };
    }, []);

    useEffect(() => {
        if (heatmapInstance) {
            // Set the new data for the heatmap
            heatmapInstance.setData({
                max,
                min,
                data,
            });
        }
    }, [data, max, min, heatmapInstance]);

    return (

        // <div ref={heatmapContainerRef} className='bg-[url(assets/BatteryBackgroundImg.png)] bg-no-repeat bg-contain bg-center' style={{ width, height, position: 'relative' }} />
        <div ref={heatmapContainerRef} style={{ width, height, position: 'relative' }} />
    );
};

export default HeatmapComponent;
