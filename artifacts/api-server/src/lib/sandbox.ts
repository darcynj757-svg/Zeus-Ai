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
      await sandbox.commands.run(`mkdir -p "${dir}"`);
    }
    await sandbox.files.write(fullPath, file.content);
  }

  // Always serve as static files — generated apps are plain HTML/CSS/JS.
  // Python's built-in http.server is pre-installed in E2B and starts instantly,
  // avoiding the ~20s npx download delay.
  logger.info({ sandboxId }, `Starting static server on port ${SERVE_PORT}`);
  sandbox.commands.run(
    `cd /home/user/app && python3 -m http.server ${SERVE_PORT} 2>&1 &`
  );

  // Wait until the port is actually listening before returning the URL
  await waitForPort(sandbox, SERVE_PORT, READY_TIMEOUT_MS, READY_POLL_INTERVAL_MS);

  // Use the official SDK method to get the host — never build it manually
  const host = sandbox.getHost(SERVE_PORT);
  const previewUrl = `https://${host}`;

  logger.info({ sandboxId, previewUrl }, "Sandbox deployed");
  return { sandboxId, previewUrl };
}

/**
 * Poll until the given TCP port is listening inside the sandbox,
 * or throw after the timeout.
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
        `nc -z localhost ${port} && echo OK || echo WAIT`,
        { timeoutMs: 2000 }
      );
      if (result.stdout.includes("OK")) {
        return;
      }
    } catch {
      // nc might not be available yet — keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Static server on port ${port} did not start within ${timeoutMs / 1000}s`);
}
