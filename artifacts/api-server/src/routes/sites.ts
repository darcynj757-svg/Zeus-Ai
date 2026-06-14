import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, publishedSitesTable } from "@workspace/db";

const router = Router();

function getContentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return "text/plain; charset=utf-8";
}

async function serveFile(
  slug: string,
  filePath: string,
  res: import("express").Response,
): Promise<void> {
  const [site] = await db
    .select()
    .from(publishedSitesTable)
    .where(eq(publishedSitesTable.slug, slug));

  if (!site) {
    res
      .status(404)
      .type("text/html")
      .send(
        "<h1>404 — Site not found</h1><p>This site has not been published or the slug is incorrect.</p>",
      );
    return;
  }

  const files = JSON.parse(site.filesJson) as { path: string; content: string }[];
  const file = files.find((f) => f.path === filePath);

  if (file) {
    res.setHeader("Content-Type", getContentType(filePath));
    res.send(file.content);
    return;
  }

  // SPA fallback → index.html
  const index = files.find((f) => f.path === "index.html");
  if (index) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(index.content);
  } else {
    res.status(404).send("File not found");
  }
}

// GET /:slug → serve index.html
router.get("/:slug", async (req, res): Promise<void> => {
  await serveFile(req.params.slug, "index.html", res);
});

// GET /:slug/path/to/file → serve specific file (Express 5 named wildcard)
router.get("/:slug/*filePath", async (req, res): Promise<void> => {
  const filePath = (req.params as Record<string, string>).filePath || "index.html";
  await serveFile(req.params.slug, filePath, res);
});

export default router;
