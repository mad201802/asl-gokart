"use client"

import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const chartData: ChartData<"bar"> = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "Charging Cycles",
      data: [186, 305, 237, 73, 209, 214],
      backgroundColor: "hsl(221 83% 53% / 0.8)",
      borderRadius: 8,
    },
  ],
}

const options: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: "index", intersect: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: "hsl(0 0% 80% / 0.3)" } },
  },
}

export function ChargingCyclesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Charging Cycles</CardTitle>
        <CardDescription>January - June 2025</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total monthly charging cycles for the last 6 months
        </div>
      </CardFooter>
    </Card>
  )
}
