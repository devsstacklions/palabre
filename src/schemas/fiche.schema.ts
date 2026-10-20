import { z } from 'zod';

export const ficheFormSchema = z.object({
  title: z
    .string()
    .min(5, 'Le titre doit comporter au moins 5 caractères')
    .max(150, 'Le titre ne peut pas dépasser 150 caractères'),
  problem: z
    .string()
    .min(10, 'La description du problème doit comporter au moins 10 caractères'),
  country: z
    .string()
    .min(1, 'Veuillez sélectionner un pays concerné'),
  operator_service: z
    .string()
    .min(1, 'Veuillez sélectionner un opérateur ou service'),
  language: z
    .string()
    .min(1, 'Veuillez sélectionner un langage ou une technologie'),
  api_version: z
    .string()
    .optional()
    .default(''),
  prerequisites: z
    .string()
    .optional()
    .default(''),
  steps: z
    .string()
    .min(5, 'Indiquez au moins une étape de résolution (une par ligne)'),
  code_snippet: z
    .string()
    .optional()
    .default(''),
  frequent_errors: z
    .string()
    .optional()
    .default(''),
  known_limits: z
    .string()
    .optional()
    .default(''),
  status: z
    .enum(['draft', 'published'])
    .default('published'),
});

export type FicheFormData = z.infer<typeof ficheFormSchema>;

