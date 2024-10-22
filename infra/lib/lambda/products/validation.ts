import { z } from "zod";

export const ProductSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number(),
  count: z.number(),
});
