import { z } from 'zod';

export const questionFormSchema = z.object({
  title: z
    .string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(160, 'Le titre ne peut pas dépasser 160 caractères'),
  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères pour bien exposer le problème'),
  technology: z
    .string()
    .min(1, 'Veuillez préciser la technologie principale (ex: React, Node.js, Flutter)'),
  language: z.string().optional().nullable(),
  framework: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
  expected_result: z.string().optional().nullable(),
  tools_version: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  code_snippet: z.string().optional().nullable(),
  code_language: z.string().default('plaintext'),
  attachments: z.array(z.string().url('URL de capture invalide')).default([]),
  status: z.enum(['draft', 'open']).default('open'),
});

export type QuestionFormData = z.infer<typeof questionFormSchema>;

export const answerFormSchema = z.object({
  content: z
    .string()
    .min(5, 'Votre réponse doit comporter au moins 5 caractères')
    .max(10000, 'La réponse ne peut pas dépasser 10 000 caractères'),
  code_snippet: z.string().optional().nullable(),
  code_language: z.string().default('plaintext'),
});

export type AnswerFormData = z.infer<typeof answerFormSchema>;

export const questionReportSchema = z.object({
  reason: z.enum(['spam', 'inappropriate', 'security_risk', 'wrong_category', 'other'], {
    required_error: 'Veuillez sélectionner un motif de signalement',
  }),
  description: z
    .string()
    .min(5, 'Veuillez fournir une explication détaillée (au moins 5 caractères)'),
});

export type QuestionReportFormData = z.infer<typeof questionReportSchema>;
