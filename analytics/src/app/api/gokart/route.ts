import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { InfluxDBClient } from "@influxdata/influxdb3-client";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string(),
  timestamp: z.string(),
});

const host = process.env.INFLUX_HOST ?? "http://localhost";
const port = process.env.INFLUX_PORT ?? "8181";
const influxUrl = `${host}:${port}`;
const token = process.env.INFLUX_TOKEN;
const database = process.env.INFLUX_DATABASE;

const prisma = new PrismaClient();
const influxDB = new InfluxDBClient({ host: influxUrl, token, database });

export async function POST(request: NextRequest) {
  try {
    const raw: unknown = await request.json();
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing or invalid fields: name, value, unit, timestamp" },
        { status: 400 },
      );
    }

    const { name, value, unit, timestamp } = parsed.data;
    console.log("POST /api/gokart received:", parsed.data);

    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return NextResponse.json(
        { error: `Invalid value: ${String(value)} is not a number` },
        { status: 400 },
      );
    }

    // Write data to Prisma
    const sensorData = await prisma.sensorData.create({
      data: {
        name,
        value: numericValue,
        unit,
        timestamp: new Date(timestamp),
      },
    });

    // Write data to InfluxDB
    const timestampNanos = new Date(timestamp).getTime() * 1000000;
    const line = `sensor_data,name=${name},unit=${unit} ${name}=${numericValue} ${timestampNanos}`;
    console.log("Writing to InfluxDB:", line);
    await influxDB.write(line, database);
    console.log("InfluxDB write successful");

    return NextResponse.json({ success: true, data: sensorData });
  } catch (err) {
    console.error("Error saving sensor data:", err);
    return NextResponse.json(
      { error: "Failed to save sensor data" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const query = `
      SELECT * FROM "sensor_data"
      ORDER BY time DESC
      LIMIT 100
    `;
    const result = influxDB.query(query);

    const resultArray = [];
    for await (const row of result) {
      resultArray.push(row);
    }

    return NextResponse.json({ success: true, data: resultArray });
  } catch (err) {
    console.error("Error fetching sensor data:", err);
    if (err instanceof Error && err.message?.includes("not found")) {
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json(
      { error: "Failed to fetch sensor data" },
      { status: 500 },
    );
  }
}
