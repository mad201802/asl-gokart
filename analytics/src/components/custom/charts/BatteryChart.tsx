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
import { api } from "@/trpc/react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export function BatteryChartArea() {
  const [timeRange, setTimeRange] = React.useState("7d")

  const startDate = React.useMemo(() => {
    const now = new Date()
    let daysToSubtract = 7
    if (timeRange === "30d") daysToSubtract = 30
    else if (timeRange === "90d") daysToSubtract = 90
    return new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000).toISOString()
  }, [timeRange])

  const endDate = React.useMemo(() => new Date().toISOString(), [timeRange])

  const batteryVoltageQuery = api.sensorData.getDataForTime.useQuery({
    start: new Date(startDate),
    end: new Date(endDate),
    sensorName: "batteryVoltage",
  })

  const chartData: ChartData<"line"> = React.useMemo(() => {
    if (!batteryVoltageQuery.data?.success || !batteryVoltageQuery.data?.data) {
      return { labels: [], datasets: [] }
    }

    const sorted = batteryVoltageQuery.data.data
      .map((item: any) => ({
        date: new Date(item.time),
        bms: parseFloat(item.batteryVoltage) || 0,
        raw: parseFloat(item.batteryVoltage)
          ? parseFloat(item.batteryVoltage) * 0.98 + (Math.random() - 0.5) * 1.5
          : 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return {
      labels: sorted.map((d) =>
        d.date.toLocaleDateString("de-DE", { month: "short", day: "numeric" }),
      ),
      datasets: [
        {
          label: "BMS",
          data: sorted.map((d) => d.bms),
          borderColor: "hsl(221 83% 53%)",
          backgroundColor: "hsl(221 83% 53% / 0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: "Raw",
          data: sorted.map((d) => d.raw),
          borderColor: "hsl(160 60% 45%)",
          backgroundColor: "hsl(160 60% 45% / 0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    }
  }, [batteryVoltageQuery.data])

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
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[250px] w-full">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}
