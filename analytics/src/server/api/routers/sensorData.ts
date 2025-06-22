import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { InfluxDBClient } from "@influxdata/influxdb3-client";

const host = process.env.INFLUX_HOST || "http://localhost";
const port = process.env.INFLUX_PORT || "8181";
const influxUrl = `${host}:${port}`;
const token = process.env.INFLUX_TOKEN;
const database = process.env.INFLUX_DATABASE;

const influxDB = new InfluxDBClient({ host: influxUrl, token, database });

export const sensorRouter = createTRPCRouter({
    getLatestData: publicProcedure
        .input(z.object({
            limit: z.number().default(100),
            sensorName: z.string().optional(),
        }))
        .query(async ({ input }) => {
            try {
                let query = `
                    SELECT * FROM "sensor_data"
                    ORDER BY time DESC
                    LIMIT ${input.limit}
                `;
                
                if(input.sensorName) {
                    query = `
                        SELECT * FROM "sensor_data"
                        WHERE name = '${input.sensorName}'
                        ORDER BY time DESC
                        LIMIT ${input.limit}
                    `
                }

                const result = await influxDB.query(query);
                const resultArray = [];

                for await (const row of result) {
                    resultArray.push(row);
                }

                return {
                    success: true,
                    data: resultArray,
                };
            } catch (error) {
                console.error("Error fetching sensor data:", error);
                if (error instanceof Error && error.message.includes('not found')) {
                return { success: true, data: [] };
                }
                throw new Error('Failed to fetch sensor data');               
            }
        })
})