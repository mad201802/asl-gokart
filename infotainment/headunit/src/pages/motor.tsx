import React, { useRef, useState, useEffect } from "react";

// Import image file from /images folder
import motorDark from "../../images/motor_dark.png";
import motorLight from "../../images/motor_light.png";

// Import particle effect components
import EnergyFlowCanvas from "@/components/shared/EnergyFlowCanvas";
import ParticleToggle from "@/components/shared/ParticleToggle";

const MotorPage = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const leftMotorRef = useRef<HTMLImageElement>(null);
    const rightMotorRef = useRef<HTMLImageElement>(null);

    const [isDarkMode, setIsDarkMode] = useState(
        document.documentElement.classList.contains("dark")
    );

    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [motorPositions, setMotorPositions] = useState({
        left: { x: 0, y: 0 },
        right: { x: 0, y: 0 },
    });

    // Listen for theme changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains("dark"));
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    // Update positions on resize
    useEffect(() => {
        const updatePositions = () => {
            if (!containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            setContainerSize({
                width: containerRect.width,
                height: containerRect.height,
            });

            if (leftMotorRef.current && rightMotorRef.current) {
                const leftRect = leftMotorRef.current.getBoundingClientRect();
                const rightRect = rightMotorRef.current.getBoundingClientRect();

                // Only update if images have loaded (have non-zero dimensions)
                if (leftRect.width > 0 && rightRect.width > 0) {
                    // Get center positions relative to container
                    setMotorPositions({
                        left: {
                            x: leftRect.left - containerRect.left + leftRect.width / 2,
                            y: leftRect.top - containerRect.top + leftRect.height / 2,
                        },
                        right: {
                            x: rightRect.left - containerRect.left + rightRect.width / 2,
                            y: rightRect.top - containerRect.top + rightRect.height / 2,
                        },
                    });
                }
            }
        };

        updatePositions();

        // Listen for image load events to recalculate positions
        const leftImg = leftMotorRef.current;
        const rightImg = rightMotorRef.current;
        
        const handleImageLoad = () => {
            // Use requestAnimationFrame to ensure layout is complete
            requestAnimationFrame(updatePositions);
        };

        leftImg?.addEventListener("load", handleImageLoad);
        rightImg?.addEventListener("load", handleImageLoad);

        // Use ResizeObserver for responsive updates
        const resizeObserver = new ResizeObserver(updatePositions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener("resize", updatePositions);
        return () => {
            leftImg?.removeEventListener("load", handleImageLoad);
            rightImg?.removeEventListener("load", handleImageLoad);
            resizeObserver.disconnect();
            window.removeEventListener("resize", updatePositions);
        };
    }, []);

    const motor = isDarkMode ? motorDark : motorLight;

    return (
        <div ref={containerRef} className="relative h-full w-full">
            {/* Particle effect canvas layer */}
            {containerSize.width > 0 && motorPositions.left.x > 0 && motorPositions.right.x > 0 && (
                <EnergyFlowCanvas
                    leftMotorPosition={motorPositions.left}
                    rightMotorPosition={motorPositions.right}
                    containerWidth={containerSize.width}
                    containerHeight={containerSize.height}
                />
            )}

            {/* Motor images layer */}
            <div className="flex items-center justify-center h-full w-full gap-36 relative">
                <img
                    ref={leftMotorRef}
                    src={motor}
                    alt="Left Motor"
                    className="max-h-[50%] w-auto object-contain"
                />
                <img
                    ref={rightMotorRef}
                    src={motor}
                    alt="Right Motor"
                    className="max-h-[50%] w-auto object-contain"
                />
            </div>

            {/* Settings toggle in top-right corner */}
            <div className="absolute top-4 right-4 z-20">
                <ParticleToggle />
            </div>
        </div>
    );
};

export default MotorPage;