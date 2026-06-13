import { Sandbox } from "e2b";
import { logger } from "./logger";

// Keep sandboxes alive for 10 minutes
const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;

export interface SandboxResult {
  sandboxId: string;
  previewUrl: string;
}

/**
 * Write files to an E2B sandbox and start a dev server.
 * Returns the sandbox ID and the preview URL.
 */
export async function deployToSandbox(
  files: Array<{ path: string; content: string }>,
  existingSandboxId?: string | null
): Promise<SandboxResult> {
  if (!process.env.E2B_API_KEY) {
    throw new Error("E2B_API_KEY environment variable is required for sandbox deployment");
  }

  let sandbox: Sandbox;

  try {
    if (existingSandboxId) {
      try {
        sandbox = await Sandbox.connect(existingSandboxId);
        await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
        logger.info({ sandboxId: existingSandboxId }, "Reconnected to existing sandbox");
      } catch {
        logger.info({ existingSandboxId }, "Existing sandbox not found, creating new one");
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

  // Write files to /home/user/app/
  for (const file of files) {
    const fullPath = `/home/user/app/${file.path}`;
    // Create parent dirs
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    if (dir !== "/home/user/app") {
      await sandbox.commands.run(`mkdir -p ${dir}`);
    }
    await sandbox.files.write(fullPath, file.content);
  }

  // Check if there's a React app (jsx/tsx files) or plain HTML
  const hasReact = files.some(
    (f) => f.path.endsWith(".jsx") || f.path.endsWith(".tsx") || f.path.endsWith(".ts")
  );
  const hasHtml = files.some((f) => f.path === "index.html");

  let previewUrl: string;

  if (hasReact) {
    // Install dependencies and start dev server
    const hasPackageJson = files.some((f) => f.path === "package.json");
    if (hasPackageJson) {
      logger.info({ sandboxId }, "Installing npm dependencies");
      await sandbox.commands.run("cd /home/user/app && npm install", {
        timeoutMs: 60000,
      });
    }
    // Start vite or react-scripts
    sandbox.commands.run("cd /home/user/app && npx serve . -p 3000 --no-clipboard 2>&1 &");
    await new Promise((r) => setTimeout(r, 2000));
    previewUrl = `https://${sandboxId}-3000.e2b.dev`;
  } else if (hasHtml) {
    // Serve static files with a simple HTTP server
    sandbox.commands.run("cd /home/user/app && npx serve . -p 3000 --no-clipboard 2>&1 &");
    await new Promise((r) => setTimeout(r, 2000));
    previewUrl = `https://${sandboxId}-3000.e2b.dev`;
  } else {
    // Fallback
    sandbox.commands.run("cd /home/user/app && npx serve . -p 3000 --no-clipboard 2>&1 &");
    await new Promise((r) => setTimeout(r, 2000));
    previewUrl = `https://${sandboxId}-3000.e2b.dev`;
  }

  logger.info({ sandboxId, previewUrl }, "Sandbox deployed");
  return { sandboxId, previewUrl };
}
