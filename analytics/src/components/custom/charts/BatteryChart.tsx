"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/trpc/react";


export const description = "An interactive area chart"

const chartConfig = {
  bms: {
    label: "BMS",
    color: "var(--chart-1)",
  },
  raw: {
    label: "Raw",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function BatteryChartArea() {
  const [timeRange, setTimeRange] = React.useState("7d")
  
  // Calculate start date based on selected time range - memoized to prevent infinite re-renders
  const startDate = React.useMemo(() => {
    const now = new Date()
    let daysToSubtract = 7
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "90d") {
      daysToSubtract = 90
    }
    return new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000).toISOString()
  }, [timeRange])

  // Use a fixed end date to prevent infinite re-renders, but allow manual refresh
  const endDate = React.useMemo(() => new Date().toISOString(), [timeRange])

  const batteryVoltageQuery = api.sensorData.getDataForTime.useQuery({
    start: new Date(startDate),
    end: new Date(endDate),
    sensorName: "batteryVoltage",
  })
6
  // Transform API data to chart format
  const chartData = React.useMemo(() => {
    if (!batteryVoltageQuery.data?.success || !batteryVoltageQuery.data?.data) return []
    
    return batteryVoltageQuery.data.data.map((item: any) => ({
      date: new Date(item.time).toISOString(),
      bms: parseFloat(item.batteryVoltage) || 0, // BMS voltage
      raw: parseFloat(item.batteryVoltage) ? parseFloat(item.batteryVoltage) * 0.98 + (Math.random() - 0.5) * 1.5 : 0, // Simulated raw voltage with slight variation
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date ascending for proper chart display
  }, [batteryVoltageQuery.data])

  // Show loading state while fetching data
  if (batteryVoltageQuery.isLoading) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Battery Voltage</CardTitle>
            <CardDescription>
              Loading battery voltage data...
            </CardDescription>
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

  // Show error state if query failed
  if (batteryVoltageQuery.error) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Battery Voltage</CardTitle>
            <CardDescription>
              Error loading battery voltage data
            </CardDescription>
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
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillBMS" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-bms)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-bms)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillRaw" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-raw)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-raw)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("de-DE", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("de-DE", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="raw"
              type="natural"
              fill="url(#fillRaw)"
              stroke="var(--color-raw)"
              stackId="a"
            />
            <Area
              dataKey="bms"
              type="natural"
              fill="url(#fillBMS)"
              stroke="var(--color-bms)"
              stackId="b"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
