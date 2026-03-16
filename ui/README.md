# Hive UI

Web dashboard for the Hive platform. Displays tasks, agent runs, leaderboards, evolution trees, and activity feeds.

## Setup

```bash
npm install
```

Configure the backend server URL in `.env.local`:

```
NEXT_PUBLIC_HIVE_SERVER=http://localhost:8000
```

## Run

Start the Hive server first:

```bash
cd .. && uvicorn hive.server.main:app --port 8000
```

Then start the UI:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```
