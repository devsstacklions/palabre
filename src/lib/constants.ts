import { VerificationStatus } from '../types';

export const PAYS = [
  'Sénégal',
  "Côte d'Ivoire",
  'Cameroun',
  'Mali',
  'Bénin',
  'Togo',
  'Burkina Faso',
  'Guinée',
] as const;

export const SERVICES = [
  'Wave',
  'Orange Money',
  'MTN MoMo',
  'Free Money',
  'Moov Money',
  'SMS',
  'USSD',
  'Hébergement',
] as const;

export const TECHNOLOGIES = [
  'Node.js',
  'PHP',
  'Python',
  'Java',
  'JavaScript',
  'TypeScript',
  'Go',
  'Flutter',
] as const;

export const CERTIFICATION_THRESHOLD = 3;

export const VERIFICATION_STATUS_CONFIG: Record<
  VerificationStatus,
  {
    label: string;
    description: string;
    badgeClass: string;
    icon: string;
  }
> = {
  ok: {
    label: 'Certifiée par la communauté',
    description: `Validée par au moins ${CERTIFICATION_THRESHOLD} développeurs dans un contexte précis sans contestation active.`,
    badgeClass: 'bg-palabre-okBg text-palabre-ok border-emerald-200',
    icon: 'CheckCircle2',
  },
  re: {
    label: 'À revérifier',
    description: 'Dernière confirmation ancienne (> 90 jours) ou contexte susceptible d’avoir évolué.',
    badgeClass: 'bg-palabre-reBg text-palabre-re border-amber-200',
    icon: 'Clock',
  },
  fl: {
    label: 'Contestée',
    description: 'Un ou plusieurs contributeurs ont signalé un échec ou un blocage nécessitant réexamen.',
    badgeClass: 'bg-palabre-flBg text-palabre-fl border-red-200',
    icon: 'AlertTriangle',
  },
  new: {
    label: 'En attente de validation',
    description: 'Fiche récemment publiée, en attente de confirmations communautaires dans différents contextes.',
    badgeClass: 'bg-palabre-newBg text-palabre-new border-blue-200',
    icon: 'Sparkles',
  },
};

export const REPORT_REASONS = [
  { value: 'misleading', label: 'Information trompeuse ou inexacte' },
  { value: 'version_incompatibility', label: 'Incompatibilité de version ou d’API' },
  { value: 'obsolete', label: 'Solution obsolète / Ne fonctionne plus' },
  { value: 'security_risk', label: 'Code dangereux ou faille de sécurité' },
  { value: 'other', label: 'Autre problème' },
] as const;

export const CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'php',
  'go',
  'java',
  'dart',
  'bash',
  'sql',
  'json',
  'html',
  'css',
] as const;

