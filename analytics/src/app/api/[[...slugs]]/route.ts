// app/api/[[...slugs]]/route.ts
// NOTE: /api/gokart and /api/gokart/generate are handled by dedicated
// Next.js route handlers in src/app/api/gokart/ to avoid Elysia
// misrouting POST→GET behind reverse proxies.
import { Elysia, t } from 'elysia';

const app = new Elysia({ prefix: '/api' })
    .get('/', () => 'hello Next')
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    })

export const GET = app.handle 
export const POST = app.handle 