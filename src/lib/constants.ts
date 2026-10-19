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
    label: 'Confirmée (contexte défini)',
    description: 'Validée récemment par plusieurs développeurs dans un contexte précis.',
    badgeClass: 'bg-palabre-okBg text-palabre-ok border-emerald-200',
    icon: 'CheckCircle2',
  },
  re: {
    label: 'À revérifier',
    description: 'Ancienne vérification ou contexte susceptible d’avoir évolué.',
    badgeClass: 'bg-palabre-reBg text-palabre-re border-amber-200',
    icon: 'Clock',
  },
  fl: {
    label: 'Signalée',
    description: 'Un contributeur a observé un comportement différent ou un blocage.',
    badgeClass: 'bg-palabre-flBg text-palabre-fl border-red-200',
    icon: 'AlertTriangle',
  },
  new: {
    label: 'Récente, peu vérifiée',
    description: 'Publiée récemment, nécessite des tests dans votre environnement.',
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

