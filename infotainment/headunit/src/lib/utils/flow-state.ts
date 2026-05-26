// Flow state enum for particle effects and motor visualization
export enum FlowState {
    POWER = 'power',
    REGEN = 'regen',
    IDLE = 'idle'
}

// Calculate flow state based on battery current, throttle, and rpm
// Battery current > 0 means power consumption (discharge)
// Battery current < 0 means regeneration (charge)
export const calculateFlowState = (batteryCurrent: number, throttle: number, rpm: number): FlowState => {
    // If battery current magnitude is below threshold, consider idle
    if (Math.abs(batteryCurrent) < 5) {
        return FlowState.IDLE;
    }
    // Positive current = discharging = power mode
    // Negative current = charging = regen mode
    return batteryCurrent > 0 ? FlowState.POWER : FlowState.REGEN;
}
