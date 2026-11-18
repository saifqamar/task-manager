import { z } from 'zod';

export const weatherQuerySchema = z.object({
  city: z
    .string({ error: 'City is required' })
    .trim()
    .min(1, 'City is required')
    .max(100, 'City must be at most 100 characters'),
});

export const weatherSchema = z.object({
  city: z.string(),
  country: z.string().nullable(),
  temperature: z.number(),
  feelsLike: z.number(),
  description: z.string(),
  icon: z.string(),
  humidity: z.number(),
  windSpeed: z.number(),
  fetchedAt: z.iso.datetime(),
});

export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
export type Weather = z.infer<typeof weatherSchema>;
