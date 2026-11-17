import { z } from "zod";

export const dashboardOverTimeQuerySchema = z
  .object({
    range: z.enum(["7d", "30d", "12m"]).optional().default("30d"),
  })
  .strict();

export type DashboardOverTimeQuery = z.infer<typeof dashboardOverTimeQuerySchema>;
