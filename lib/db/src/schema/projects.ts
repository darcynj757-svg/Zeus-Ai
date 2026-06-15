import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const PROJECT_TYPES = ["landing", "app", "shop", "card", "portfolio"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const VISUAL_STYLES = ["minimal", "bold", "glass", "dark", "playful", "elegant"] as const;
export type VisualStyle = (typeof VISUAL_STYLES)[number];

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectType: text("project_type").notNull().default("landing"),
  style: text("style"),
  sandboxId: text("sandbox_id"),
  previewUrl: text("preview_url"),
  zeusContext: text("zeus_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
