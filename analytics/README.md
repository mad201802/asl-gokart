# asl-gokart/analytics

This is the analytics dashboard for the `asl-gokart` project, built with the [T3 Stack](https://create.t3.gg/).

## Setting Up the Dev Environment

To set up the development environment, follow these steps:

1. Clone the repo
2. Install the dependencies using `npm install`
3. Create a `.env` file in the root directory and set the required environment variables. You can use the `.env.example` file as a reference.
4. Initialize the database by running `npx prisma db push` to create the tables.
5. Setup influxDB v3 Core as a Docker container by running the following command:
   ```bash
   docker compoe up -d
   ```
6. Enter the InfluxDB container:
   ```bash
   docker exec -it influxdb3-core bash
   ```
7. Create an admin token:
   ```bash
    influxdb3 create token --admin
   ```
   Note the token down and set it in your `.env` file as `INFLUX_TOKEN`.
8. Set the bash environment variable `INFLUXDB3_AUTH_TOKEN` to the token you just created:
   ```bash
    export INFLUXDB3_AUTH_TOKEN=<your-token>
   ```
9. Create a new database called `asl-gokart`:
   ```bash
    influxdb3 create database asl-gokart
   ```
10. Open up a terminal in the root directory of this project again.
11.  Run the development server with `npm run dev`
12. (TODO: Add script to seed the database with initial data)

## 🎨 Color Palette (WIP)

| Zweck                               | Farbe     | Bemerkung                                            |
| ----------------------------------- | --------- | ---------------------------------------------------- |
| Haupt-Akzent (z. B. Buttons, Links) | `#42aaff` | Helle, auffällige Variante von `#039ede`, freundlich |
| Sekundärer Akzent                   | `#88cfff` | Weicher Kontrast für dezente Hervorhebungen          |
| Warnung/Fehlerhinweis               | `#ff5555` | Klare, moderne Rot-Variante                          |
| Erfolg/Bestätigung                  | `#29d697` | Frisches, tech-orientiertes Grün                     |
| Neutral (z. B. Info)                | `#b0bec5` | Dezentes Grau-Blau für zurückhaltende Textelemente   |

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
