// app/api/[[...slugs]]/route.ts
import { Elysia, t } from 'elysia';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()


const app = new Elysia({ prefix: '/api' })
    .get('/', () => 'hello Next')
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    })
    .post('/gokart', async ({ body }) => {
        try {
            const sensorData = await prisma.sensorData.create({
                data: {
                name: body.name,
                value: body.value,
                unit: body.unit,
                timestamp: new Date(body.timestamp)
                }
            })    
            
            return {
                success: true,
                data: sensorData
            }
        }
        catch (error) {
            return {
                success: false,
                error: 'Failed to save sensor data'
            }
        }
    }, {
        body: t.Object({
            name: t.String(),
            value: t.Number(),
            unit: t.String(),
            timestamp: t.String()
        })
    })

export const GET = app.handle 
export const POST = app.handle 