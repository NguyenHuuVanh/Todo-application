import { z } from "zod";

export const todoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional(),
});

export type TodoFormData = z.infer<typeof todoSchema>;

export const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name is too long"),
  color: z.string().max(20, "Color is too long").optional(),
});

export type TagFormData = z.infer<typeof tagSchema>;
