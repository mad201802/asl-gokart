import { useEffect } from "react";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";

export function useConnectionData() {
    const {
        analyticsEnabled,
        analyticsBackendUrl,
        setAnalyticsConnected,
        setGokartLanConnected,
    } = useStore(
        useShallow((state) => ({
            analyticsEnabled: state.analyticsEnabled,
            analyticsBackendUrl: state.analyticsBackendUrl,
            setAnalyticsConnected: state.setAnalyticsConnected,
            setGokartLanConnected: state.setGokartLanConnected,
        }))
    );

    useEffect(() => {
        const checkConnections = async () => {
            try {
                const networkInterface = await window.hardware.getNetworkInterface();
                setGokartLanConnected(networkInterface !== null);
            } catch (e) {
                setGokartLanConnected(false);
            }

            if (analyticsEnabled && analyticsBackendUrl) {
                try {
                    const isConnected = await window.app.checkAnalyticsConnection(analyticsBackendUrl);
                    setAnalyticsConnected(isConnected);
                } catch (e) {
                    setAnalyticsConnected(false);
                }
            } else {
                setAnalyticsConnected(false);
            }
        };

        // Initial check
        checkConnections();

        // Polling interval
        const interval = setInterval(checkConnections, 5000);

        return () => clearInterval(interval);
    }, [analyticsEnabled, analyticsBackendUrl, setAnalyticsConnected, setGokartLanConnected]);
}
