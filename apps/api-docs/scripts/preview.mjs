import { createServer } from "net";
import { execFileSync } from "child_process";

const PREFERRED_PORT = 8080;

function tryPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await tryPort(startPort + i)) return startPort + i;
  }
  throw new Error(
    `No available port found (tried ${startPort}–${startPort + maxAttempts - 1})`,
  );
}

const port = await findAvailablePort(PREFERRED_PORT);

if (port !== PREFERRED_PORT) {
  console.log(`Port ${PREFERRED_PORT} is in use, using port ${port} instead.`);
}

execFileSync(
  "npx",
  [
    "redocly",
    "preview-docs",
    "../../libs/flowdrop/api/openapi.yaml",
    "--config",
    "../../libs/flowdrop/api/redocly.yaml",
    "--port",
    String(port),
  ],
  { stdio: "inherit" },
);
