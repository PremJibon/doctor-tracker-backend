import { z } from "zod";

export const dashboardOverTimeQuerySchema = z
  .object({
    range: z.enum(["7d", "30d", "12m"]).optional().default("30d"),
  })
  .strict();

export type DashboardOverTimeQuery = z.infer<typeof dashboardOverTimeQuerySchema>;

export const recentAdmissionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).default(8),
  })
  .strict();

export type RecentAdmissionsQuery = z.infer<typeof recentAdmissionsQuerySchema>;
