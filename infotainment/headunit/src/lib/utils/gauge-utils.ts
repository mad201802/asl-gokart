import { Segment } from "@/data/gauge-config";

function interpolateColorBetween(
    startColor: string,
    endColor: string,
    ratio: number
): string {
    const hex = (c: number) => {
        const hexValue = Math.round(c).toString(16);
        return hexValue.length === 1 ? "0" + hexValue : hexValue;
    };

    const start = startColor.match(/\w\w/g)?.map((x) => parseInt(x, 16)) || [0, 0, 0];
    const end = endColor.match(/\w\w/g)?.map((x) => parseInt(x, 16)) || [0, 0, 0];

    const interpolatedColor = start.map((startValue, index) => {
        const endValue = end[index];
        const interpolatedValue = startValue + ratio * (endValue - startValue);
        return Math.min(255, Math.max(0, interpolatedValue));
    });

    return (
        "#" +
        hex(interpolatedColor[0]) +
        hex(interpolatedColor[1]) +
        hex(interpolatedColor[2])
    );
}

export function interpolateColor(
    value: number,
    minValue: number,
    maxValue: number,
    segments: Segment[]
): string {
    value = Math.max(minValue, Math.min(value, maxValue));

    segments.sort((a, b) => a.value - b.value);

    for (let i = 0; i < segments.length - 1; i++) {
        const currentSegment = segments[i];
        const nextSegment = segments[i + 1];

        if (value >= currentSegment.value && value < nextSegment.value) {
            const ratio =
                (value - currentSegment.value) /
                (nextSegment.value - currentSegment.value);
            return interpolateColorBetween(
                currentSegment.color,
                nextSegment.color,
                ratio
            );
        }
    }

    return segments[segments.length - 1].color;
}
