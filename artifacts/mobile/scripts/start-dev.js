const { spawn } = require("child_process");
const { authtoken } = require("@expo/ngrok");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function configureNgrok(retries = 5, delayMs = 8000) {
  if (!process.env.NGROK_AUTHTOKEN) return;
  for (let i = 1; i <= retries; i++) {
    try {
      await authtoken(process.env.NGROK_AUTHTOKEN);
      console.log("[start-dev] ngrok auth token configured");
      return;
    } catch (e) {
      console.warn(`[start-dev] ngrok auth attempt ${i}/${retries} failed:`, e.message);
      if (i < retries) {
        console.log(`[start-dev] Waiting ${delayMs / 1000}s before retry...`);
        await sleep(delayMs);
      }
    }
  }
  console.warn("[start-dev] ngrok auth could not be configured — trying anyway");
}

async function startExpo(env, port, retries = 5, delayMs = 15000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[start-dev] Starting Expo tunnel (attempt ${attempt}/${retries})...`);
    const exitCode = await new Promise((resolve) => {
      const child = spawn(
        "pnpm",
        ["exec", "expo", "start", "--tunnel", "--port", port],
        { env, stdio: "inherit" }
      );
      child.on("exit", (code) => resolve(code ?? 0));
    });

    if (exitCode === 0) return;

    if (attempt < retries) {
      console.log(`[start-dev] Expo exited (${exitCode}). Waiting ${delayMs / 1000}s before retry...`);
      await sleep(delayMs);
    } else {
      console.error(`[start-dev] Expo failed after ${retries} attempts.`);
      process.exit(exitCode);
    }
  }
}

async function main() {
  await configureNgrok();

  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
    EXPO_PUBLIC_REPL_ID: process.env.REPL_ID,
  };

  const port = process.env.PORT ?? "18115";
  await startExpo(env, port);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
