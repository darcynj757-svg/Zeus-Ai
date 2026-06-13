import { Sandbox } from "e2b";
import { logger } from "./logger";

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const SERVE_PORT = 3000;
const READY_POLL_INTERVAL_MS = 500;
const READY_TIMEOUT_MS = 30_000;

export interface SandboxResult {
  sandboxId: string;
  previewUrl: string;
}

/**
 * Write files to an E2B sandbox and start a static HTTP server.
 * Generated apps are always plain HTML/CSS/JS — no build step needed.
 * Returns the sandbox ID and the preview URL.
 */
export async function deployToSandbox(
  files: Array<{ path: string; content: string }>,
  existingSandboxId?: string | null
): Promise<SandboxResult> {
  if (!process.env.E2B_API_KEY) {
    throw new Error(
      "Добавьте E2B_API_KEY в Secrets (Replit → Tools → Secrets) для деплоя в песочницу"
    );
  }

  // Connect to existing sandbox or create new one
  let sandbox: Sandbox;
  try {
    if (existingSandboxId) {
      try {
        sandbox = await Sandbox.connect(existingSandboxId);
        await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
        logger.info({ sandboxId: existingSandboxId }, "Reconnected to existing sandbox");
      } catch {
        logger.info({ existingSandboxId }, "Existing sandbox gone, creating new one");
        sandbox = await Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });
      }
    } else {
      sandbox = await Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });
    }
  } catch (err) {
    logger.error({ err }, "Failed to create/connect sandbox");
    throw err;
  }

  const sandboxId = sandbox.sandboxId;
  logger.info({ sandboxId }, "Sandbox ready, writing files");

  // Write all files to /home/user/app/
  for (const file of files) {
    const fullPath = `/home/user/app/${file.path}`;
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    if (dir !== "/home/user/app") {
      await sandbox.commands.run(`mkdir -p "${dir}"`, { timeoutMs: 5000 });
    }
    await sandbox.files.write(fullPath, file.content);
  }

  // Always serve as static files — generated apps are plain HTML/CSS/JS.
  // Python's built-in http.server is pre-installed in E2B and starts instantly.
  // Fire-and-forget: shell returns immediately thanks to `&`.
  // timeoutMs:5000 covers the shell startup; .catch() prevents unhandled rejection
  // from crashing the Node process when the internal CommandHandle eventually times out.
  logger.info({ sandboxId }, `Starting static server on port ${SERVE_PORT}`);
  sandbox.commands
    .run(`cd /home/user/app && python3 -m http.server ${SERVE_PORT} > /tmp/server.log 2>&1 &`, {
      timeoutMs: 5000,
    })
    .catch(() => {
      // Expected: shell exits immediately (background &), CommandHandle may
      // still emit a timeout — suppress it so the Node process stays alive.
    });

  // Wait until the port is actually listening before returning the URL.
  // Uses Python (guaranteed to be present) instead of nc/curl to check the port.
  await waitForPort(sandbox, SERVE_PORT, READY_TIMEOUT_MS, READY_POLL_INTERVAL_MS);

  // Use the official SDK method to get the host — never build it manually
  const host = sandbox.getHost(SERVE_PORT);
  const previewUrl = `https://${host}`;

  logger.info({ sandboxId, previewUrl }, "Sandbox deployed");
  return { sandboxId, previewUrl };
}

/**
 * Poll until the given TCP port is listening inside the sandbox, or throw after timeout.
 * Uses Python's socket module — guaranteed available since we use Python for the server.
 */
async function waitForPort(
  sandbox: Sandbox,
  port: number,
  timeoutMs: number,
  intervalMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await sandbox.commands.run(
        `python3 -c "import socket; s=socket.socket(); s.settimeout(1); r=s.connect_ex(('localhost',${port})); s.close(); print('OK' if r==0 else 'WAIT')"`,
        { timeoutMs: 3000 }
      );
      if (result.stdout.trim() === "OK") {
        return;
      }
    } catch {
      // Poll error — keep trying
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Static server on port ${port} did not start within ${timeoutMs / 1000}s`);
}
