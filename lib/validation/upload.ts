import { z } from "zod";

const maxFileSizeMb = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 20);
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

export const uploadSchema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, "Select at least one PDF file.")
    .refine(
      (files) => files.every((file) => file.type === "application/pdf"),
      "Only PDF files are allowed.",
    )
    .refine(
      (files) => files.every((file) => file.size <= maxFileSizeBytes),
      `Each PDF must be smaller than ${maxFileSizeMb}MB.`,
    ),
});

export type UploadFormValues = z.infer<typeof uploadSchema>;
