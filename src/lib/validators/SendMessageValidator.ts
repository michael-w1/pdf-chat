import z from "zod";

export const SendMessageValidator = z.object({
    fileId: z.string().min(1),
    message: z.string().trim().min(1).max(4000),
});
