// app/api/[[...slugs]]/route.ts
import { Elysia, t } from 'elysia';
import { PrismaClient } from '@prisma/client'
import { InfluxDBClient, Point } from '@influxdata/influxdb3-client';

const host = process.env.INFLUX_HOST || 'http://localhost';
const port = process.env.INFLUX_PORT || '8181';
const influxUrl = `${host}:${port}`;
const token = process.env.INFLUX_TOKEN;
const database = process.env.INFLUX_DATABASE;

const prisma = new PrismaClient()
const influxDB = new InfluxDBClient({ host: influxUrl, token, database});


const app = new Elysia({ prefix: '/api' })
    .get('/', () => 'hello Next')
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    })
    .post('/gokart', async ({ body, error }) => {
        try {
            // Write data to Prisma
            const sensorData = await prisma.sensorData.create({
                data: {
                name: body.name,
                value: body.value,
                unit: body.unit,
                timestamp: new Date(body.timestamp)
                }
            })
            
            // Write data to InfluxDB
            const timestampNanos = new Date(body.timestamp).getTime() * 1000000; // Convert to nanoseconds
            const line = `sensor_data,name=${body.name},unit=${body.unit} ${body.name}=${body.value} ${timestampNanos}`;
            await influxDB.write(line);
            
            
            return {
                success: true,
                data: sensorData
            }
        }
        catch (err) {
            console.error('Error saving sensor data:', err);
            return error(500, 'Failed to save sensor data')
        }
    }, {
        body: t.Object({
            name: t.String(),
            value: t.Number(),
            unit: t.String(),
            timestamp: t.String()
        })
    })
    .get('/gokart', async ({ error }) => {
        try {
            // Fetch data from InfluxDB
            const query = `
                SELECT * FROM "sensor_data"
                ORDER BY time DESC
                LIMIT 100
            `
            const result = await influxDB.query(query);
            
            // Resolve the AsyncGenerator to an array
            const resultArray = [];
            for await (const row of result) {
                console.log(row);
                resultArray.push(row);
            }
            return {
                success: true,
                data: resultArray
            }
        } catch (err) {
            console.error('Error fetching sensor data:', err);
            // If table doesn't exist yet, return empty array
            if (err instanceof Error && err.message && err.message.includes('not found')) {
                return {
                    success: true,
                    data: []
                }
            }
            return error(500, 'Failed to fetch sensor data')
        }
    })
    .onStop(() => {
        influxDB.close();
    })

export const GET = app.handle 
export const POST = app.handle 