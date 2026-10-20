import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L’adresse e-mail est obligatoire')
    .email('Adresse e-mail invalide'),
  password: z
    .string()
    .min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Le nom d’utilisateur doit comporter au moins 3 caractères')
      .max(30, 'Le nom d’utilisateur ne peut pas dépasser 30 caractères')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Caractères alphanumériques, tirets et underscores uniquement'),
    displayName: z
      .string()
      .min(2, 'Le nom d’affichage doit comporter au moins 2 caractères'),
    email: z
      .string()
      .min(1, 'L’adresse e-mail est obligatoire')
      .email('Adresse e-mail invalide'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit comporter au moins 8 caractères'),
    confirmPassword: z
      .string()
      .min(1, 'Veuillez confirmer votre mot de passe'),
    country: z
      .string()
      .optional()
      .default(''),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, 'Vous devez accepter les conditions d’utilisation'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L’adresse e-mail est obligatoire')
    .email('Adresse e-mail invalide'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Le mot de passe doit comporter au moins 8 caractères'),
    confirmPassword: z
      .string()
      .min(1, 'Veuillez confirmer votre mot de passe'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Le nom d’affichage doit comporter au moins 2 caractères'),
  country: z.string().optional().default(''),
  bio: z.string().max(300, 'La présentation ne peut pas dépasser 300 caractères').optional().default(''),
  techStack: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

