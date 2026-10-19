import { z } from 'zod';

export const confirmationSchema = z.object({
  country: z.string().min(1, 'Veuillez préciser le pays'),
  operator_service: z.string().min(1, 'Veuillez préciser le service ou opérateur'),
  tested_version: z.string().optional().default(''),
  test_context: z.string().optional().default(''),
  comment: z.string().max(500, 'Le commentaire ne peut pas dépasser 500 caractères').optional().default(''),
  is_working: z.boolean().default(true),
});

export const reportSchema = z.object({
  reason: z.enum(['misleading', 'version_incompatibility', 'obsolete', 'security_risk', 'other'], {
    errorMap: () => ({ message: 'Veuillez sélectionner un motif valide' }),
  }),
  description: z
    .string()
    .min(10, 'Veuillez expliquer ce que vous avez observé (au moins 10 caractères)')
    .max(1000, 'La description ne peut pas dépasser 1000 caractères'),
});

export const variantSchema = z.object({
  title: z
    .string()
    .min(5, 'Le titre de la variante doit comporter au moins 5 caractères'),
  country: z.string().min(1, 'Sélectionnez le pays concerné'),
  operator_service: z.string().min(1, 'Sélectionnez l’opérateur ou le service'),
  differences: z
    .string()
    .min(10, 'Expliquez les différences et adaptations requises'),
  code_snippet: z.string().optional().default(''),
});

export type ConfirmationFormData = z.infer<typeof confirmationSchema>;
export type ReportFormData = z.infer<typeof reportSchema>;
export type VariantFormData = z.infer<typeof variantSchema>;

