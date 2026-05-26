import { useStore } from "@/stores/useStore";
import { sendThrottleLimit, sendPedalMultiplier, sendPipeThroughRawThrottle } from "./throttle-commands";

export function initHardwareCommandSubscriber() {
    return useStore.subscribe((state, prevState) => {
        if (state.speedLimit !== prevState.speedLimit) {
            sendThrottleLimit(state.speedLimit, state.wheelCircumference);
        }
        if (state.pedalMultiplier !== prevState.pedalMultiplier) {
            sendPedalMultiplier(state.pedalMultiplier);
        }
        if (state.pipeThroughRawThrottle !== prevState.pipeThroughRawThrottle) {
            sendPipeThroughRawThrottle(state.pipeThroughRawThrottle);
        }
    });
}
