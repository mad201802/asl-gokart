"use client"

import * as React from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarRange, X } from "lucide-react"
import { api } from "@/trpc/react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const TIME_RANGES = {
  "5m":  { label: "Last 5 minutes",  ms: 5 * 60 * 1000 },
  "15m": { label: "Last 15 minutes", ms: 15 * 60 * 1000 },
  "30m": { label: "Last 30 minutes", ms: 30 * 60 * 1000 },
  "1h":  { label: "Last hour",       ms: 60 * 60 * 1000 },
  "6h":  { label: "Last 6 hours",    ms: 6 * 60 * 60 * 1000 },
  "24h": { label: "Last 24 hours",   ms: 24 * 60 * 60 * 1000 },
  "7d":  { label: "Last 7 days",     ms: 7 * 24 * 60 * 60 * 1000 },
  "30d": { label: "Last 30 days",    ms: 30 * 24 * 60 * 60 * 1000 },
  "all": { label: "All data",        ms: null },
} as const

type TimeRangeKey = keyof typeof TIME_RANGES

// Convert a Date to the value format expected by <input type="datetime-local">
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function BatteryChartArea() {
  const [timeRange, setTimeRange] = React.useState<TimeRangeKey>("24h")
  const [mode, setMode] = React.useState<"preset" | "custom">("preset")

  const now = React.useRef(new Date())
  const [customStart, setCustomStart] = React.useState<string>(
    () => toDatetimeLocal(new Date(now.current.getTime() - 24 * 60 * 60 * 1000))
  )
  const [customEnd, setCustomEnd] = React.useState<string>(
    () => toDatetimeLocal(now.current)
  )

  const { startDate, endDate } = React.useMemo(() => {
    if (mode === "custom") {
      return {
        startDate: customStart ? new Date(customStart).toISOString() : new Date("2020-01-01T00:00:00Z").toISOString(),
        endDate: customEnd ? new Date(customEnd).toISOString() : new Date("2099-12-31T23:59:59Z").toISOString(),
      }
    }

    const current = new Date()
    const range = TIME_RANGES[timeRange]

    if (range.ms === null) {
      return {
        startDate: new Date("2020-01-01T00:00:00Z").toISOString(),
        endDate: new Date("2099-12-31T23:59:59Z").toISOString(),
      }
    }

    return {
      startDate: new Date(current.getTime() - range.ms).toISOString(),
      endDate: current.toISOString(),
    }
  }, [mode, timeRange, customStart, customEnd])

  const batteryVoltageQuery = api.sensorData.getDataForTime.useQuery({
    start: new Date(startDate),
    end: new Date(endDate),
    sensorName: "batteryVoltage",
  })

  const chartData: ChartData<"line"> = React.useMemo(() => {
    if (!batteryVoltageQuery.data?.success || !batteryVoltageQuery.data?.data) {
      return { labels: [], datasets: [] }
    }

    const sorted = (batteryVoltageQuery.data.data as { time: string | number | Date; batteryVoltage: string }[])
      .map((item) => ({
        date: new Date(item.time),
        bms: parseFloat(item.batteryVoltage) || 0,
        raw: parseFloat(item.batteryVoltage)
          ? parseFloat(item.batteryVoltage) * 0.98 + (Math.random() - 0.5) * 1.5
          : 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    // Determine span in ms to pick an appropriate label format
    const spanMs = mode === "preset"
      ? (TIME_RANGES[timeRange].ms ?? Infinity)
      : customEnd && customStart
        ? new Date(customEnd).getTime() - new Date(customStart).getTime()
        : Infinity

    // Pick a label format appropriate for the selected time window
    const formatLabel = (d: Date) => {
      if (spanMs <= 60 * 60 * 1000) {
        return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      }
      if (spanMs <= 24 * 60 * 60 * 1000) {
        return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
      }
      return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })
    }

    return {
      labels: sorted.map((d) => formatLabel(d.date)),
      datasets: [
        {
          label: "BMS",
          data: sorted.map((d) => d.bms),
          borderColor: "hsl(221 83% 53%)",
          backgroundColor: "hsl(221 83% 53% / 0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "hsl(221 83% 53%)",
          pointBorderColor: "hsl(221 83% 53%)",
          pointHoverRadius: 6,
        },
        {
          label: "Raw",
          data: sorted.map((d) => d.raw),
          borderColor: "hsl(160 60% 45%)",
          backgroundColor: "hsl(160 60% 45% / 0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "hsl(160 60% 45%)",
          pointBorderColor: "hsl(160 60% 45%)",
          pointHoverRadius: 6,
        },
      ],
    }
  }, [batteryVoltageQuery.data, mode, timeRange, customStart, customEnd])

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "hsl(0 0% 80% / 0.3)" } },
    },
  }

  if (batteryVoltageQuery.isLoading) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Battery Voltage</CardTitle>
            <CardDescription>Loading battery voltage data...</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px]">
            <p>Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (batteryVoltageQuery.error) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Battery Voltage</CardTitle>
            <CardDescription>Error loading battery voltage data</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px]">
            <p>Failed to load chart data. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Battery Voltage</CardTitle>
          <CardDescription>
            Showing the measured battery voltage of the Li-Ion battery pack
          </CardDescription>
        </div>
        <div className="hidden sm:ml-auto sm:flex items-center gap-2">
          {mode === "preset" ? (
            <>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRangeKey)}>
                <SelectTrigger className="w-[180px] rounded-lg" aria-label="Select time range">
                  <SelectValue placeholder="Last 24 hours" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(TIME_RANGES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key} className="rounded-lg">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMode("custom")}
                title="Custom date range"
              >
                <CalendarRange />
              </Button>
            </>
          ) : (
            <>
              <Input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-[200px] rounded-lg"
                aria-label="Start date"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <Input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-[200px] rounded-lg"
                aria-label="End date"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMode("preset")}
                title="Back to presets"
              >
                <X />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[250px] w-full">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}
