import { z } from "zod";

export const ProductSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.string(),
  count: z.string(),
});
