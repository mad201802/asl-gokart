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
        }),
    // BROKEN: Date format is somehow wrong and causing the return of wrong data
    getDataForTime: publicProcedure
        .input(z.object({
            start: z.date(),
            end: z.date(),
            sensorName: z.string().optional(),
            limit: z.number().optional().default(10000), // Add a reasonable default limit
        }))
        .query(async ({ input }) => {   
            try {
                let query = `
                    SELECT * FROM "sensor_data"
                    WHERE time >= '${input.start.toISOString()}' AND time <= '${input.end.toISOString()}'
                    ORDER BY time DESC
                    LIMIT ${input.limit}
                `;

                if(input.sensorName) {
                    query = `
                        SELECT * FROM "sensor_data"
                        WHERE name = '${input.sensorName}' AND time >= '${input.start.toISOString()}' AND time <= '${input.end.toISOString()}'
                        ORDER BY time DESC
                        LIMIT ${input.limit}
                    `;
                }

                console.log(`Executing query: ${query}`);
                
                const result = await influxDB.query(query);
                const resultArray = [];

                // Process all available data
                let rowCount = 0;
                for await (const row of result) {
                    resultArray.push(row);
                    rowCount++;
                    
                    // Log progress every 253 records to track batches
                    if (rowCount % 253 === 0) {
                        console.log(`Processed ${rowCount} records so far...`);
                    }
                }

                console.log(`Successfully fetched ${resultArray.length} records for sensor: ${input.sensorName || 'all'} from ${input.start} to ${input.end}`);

                return {
                    success: true,
                    data: resultArray,
                    totalRecords: resultArray.length,
                };
            } catch (error) {
                console.error("Error fetching sensor data for time range:", error);
                throw new Error('Failed to fetch sensor data for the specified time range');
            }
        }),
})