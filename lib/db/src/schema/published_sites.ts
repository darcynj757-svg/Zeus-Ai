import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const publishedSitesTable = pgTable("published_sites", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  slug: text("slug").notNull().unique(),
  filesJson: text("files_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPublishedSiteSchema = createInsertSchema(publishedSitesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPublishedSite = z.infer<typeof insertPublishedSiteSchema>;
export type PublishedSite = typeof publishedSitesTable.$inferSelect;
