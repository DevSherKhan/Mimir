import { z } from "zod";

export const startDeviceLoginDtoSchema = z.object({
  client: z.string().trim().min(1).max(80).optional(),
  installId: z.string().regex(/^install_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
});

export const completeDeviceLoginDtoSchema = z.object({
  deviceCode: z.string().min(1),
});

export const approveDeviceLoginDtoSchema = z.object({
  code: z.string().min(1),
});

export type StartDeviceLoginDto = z.infer<typeof startDeviceLoginDtoSchema>;
export type CompleteDeviceLoginDto = z.infer<typeof completeDeviceLoginDtoSchema>;
export type ApproveDeviceLoginDto = z.infer<typeof approveDeviceLoginDtoSchema>;
