import { NextResponse } from "next/server";
import { InfluxDBClient } from "@influxdata/influxdb3-client";

const host = process.env.INFLUX_HOST ?? "http://localhost";
const port = process.env.INFLUX_PORT ?? "8181";
const influxUrl = `${host}:${port}`;
const token = process.env.INFLUX_TOKEN;
const database = process.env.INFLUX_DATABASE;

const influxDB = new InfluxDBClient({ host: influxUrl, token, database });

export async function POST() {
  try {
    const now = new Date();
    const points = [];
    for (let i = 0; i < 250; i++) {
      const randomValue = (Math.random() * (67.2 - 51.2) + 51.2).toFixed(2);
      const timestamp = new Date(
        now.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
      );
      const timestampNanos = timestamp.getTime() * 1000000;
      const line = `sensor_data,name=batteryVoltage,unit=V batteryVoltage=${randomValue} ${timestampNanos}`;
      points.push(line);
    }
    await influxDB.write(points.join("\n"), database);
    console.log("Generated 250 random sensor data entries for batteryVoltage");

    return NextResponse.json({
      success: true,
      message: "Generated 250 entries",
    });
  } catch (err) {
    console.error("Error generating sensor data:", err);
    return NextResponse.json(
      { error: "Failed to generate sensor data" },
      { status: 500 },
    );
  }
}
