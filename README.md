# Karmo Workout

A Next.js app that uses the Google Gemini API.

## Prerequisites

- **Node.js 18.18 or later** (Node 20+ recommended).

  Check whether it's already installed:
  ```
  node -v
  npm -v
  ```
  If those commands aren't found, install Node.js:

  - **Windows / macOS:** download the **LTS** installer from https://nodejs.org, run it (keep "Add to PATH" checked), then **close and reopen your terminal** before checking `node -v` again.
  - **macOS/Linux (optional, via nvm):**
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    nvm install --lts
    nvm use --lts
    ```
    (`nvm` is a Unix-only tool — it does not work in Windows PowerShell/CMD.)

- A **Gemini API key** — get one at https://aistudio.google.com/apikey

## Setup

1. **Clone the repo** and enter the project folder:
   ```bash
   git clone <repo-url>
   cd karmo_workout
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Add your Gemini API key.** Copy the example env file and fill in your key:

   - macOS/Linux:
     ```bash
     cp .env.local.example .env.local
     ```
   - Windows (PowerShell):
     ```powershell
     copy .env.local.example .env.local
     ```

   Then open `.env.local` in a text editor and set:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   `.env.local` is gitignored — never commit it.

## Run the app

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Other commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (hot reload) |
| `npm run build` | Build the app for production |
| `npm start` | Run the production build (run `npm run build` first) |
| `npm run lint` | Run ESLint |

## iOS / Android app

A native React Native (Expo) rewrite of this app lives in [`mobile/`](./mobile/README.md).
It reuses this project's API routes as its backend, so keep this server running
while developing the mobile app.
