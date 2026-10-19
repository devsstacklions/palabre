export type VerificationStatus = 'ok' | 're' | 'fl' | 'new';
export type FicheStatus = 'draft' | 'pending' | 'published' | 'archived' | 'hidden';
export type ReportReason = 'misleading' | 'version_incompatibility' | 'obsolete' | 'security_risk' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'rejected';
export type UserRoleType = 'admin' | 'moderator' | 'contributor' | 'user';
export type NotificationType = 'confirmation' | 'report' | 'variant' | 'moderation' | 'system';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  country?: string | null;
  bio?: string | null;
  tech_stack: string[];
  is_public: boolean;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: UserRoleType;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  created_at: string;
}

export interface Fiche {
  id: string;
  title: string;
  short_description: string;
  problem: string;
  prerequisites?: string | null;
  steps: string[];
  code_snippet?: string | null;
  language: string;
  country: string;
  operator_service: string;
  api_version?: string | null;
  frequent_errors?: string | null;
  known_limits?: string | null;
  status: FicheStatus;
  verification_status: VerificationStatus;
  author_id: string;
  category_id?: string | null;
  confirmations_count: number;
  last_validated_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  author?: Profile | null;
  category?: Category | null;
  variants_count?: number;
  is_favorite?: boolean;
}

export interface FicheConfirmation {
  id: string;
  fiche_id: string;
  user_id: string;
  country: string;
  operator_service: string;
  tested_version?: string | null;
  test_context?: string | null;
  comment?: string | null;
  is_working: boolean;
  created_at: string;
  user?: Profile | null;
}

export interface FicheVariant {
  id: string;
  fiche_id: string;
  author_id: string;
  title: string;
  country: string;
  operator_service: string;
  differences: string;
  code_snippet?: string | null;
  created_at: string;
  author?: Profile | null;
}

export interface FicheReport {
  id: string;
  fiche_id: string;
  user_id: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  moderation_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  fiche?: {
    id: string;
    title: string;
    status: FicheStatus;
    author_id: string;
  } | null;
  reporter?: Profile | null;
}

export interface Favorite {
  id: string;
  fiche_id: string;
  user_id: string;
  created_at: string;
  fiche?: Fiche | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  fiche_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SearchFilters {
  query?: string;
  country?: string;
  operator?: string;
  technology?: string;
  status?: string;
  category?: string;
  sortBy?: 'recent' | 'confirmations' | 'relevance';
}

