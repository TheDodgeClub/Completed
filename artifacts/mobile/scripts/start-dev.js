const { spawn } = require("child_process");
const { authtoken } = require("@expo/ngrok");

async function main() {
  if (process.env.NGROK_AUTHTOKEN) {
    try {
      await authtoken(process.env.NGROK_AUTHTOKEN);
      console.log("[start-dev] ngrok auth token configured");
    } catch (e) {
      console.warn("[start-dev] ngrok auth warning:", e.message);
    }
  }

  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
    EXPO_PUBLIC_REPL_ID: process.env.REPL_ID,
  };

  const port = process.env.PORT ?? "18115";
  const child = spawn(
    "pnpm",
    ["exec", "expo", "start", "--tunnel", "--port", port],
    { env, stdio: "inherit" }
  );

  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
