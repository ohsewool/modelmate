// Semantic UI token reference for future ModelMate frontend work.
// This file is intentionally non-invasive; existing components do not import it yet.

export const colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceMuted: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0891b2',
  aiAccent: '#7c3aed',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
}

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
}

export const typography = {
  pageTitle: { fontSize: 28, fontWeight: 850 },
  sectionTitle: { fontSize: 20, fontWeight: 800 },
  cardTitle: { fontSize: 15, fontWeight: 800 },
  body: { fontSize: 14, fontWeight: 400 },
  caption: { fontSize: 12, fontWeight: 600 },
  metric: { fontSize: 28, fontWeight: 850 },
  badge: { fontSize: 12, fontWeight: 750 },
}

export const motion = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '250ms ease',
}

export const statusTone = {
  loading: 'info',
  empty: 'neutral',
  queued: 'info',
  running: 'info',
  succeeded: 'success',
  failed: 'danger',
  canceled: 'neutral',
  needs_review: 'warning',
  unauthorized: 'warning',
  disabled: 'warning',
  deleted: 'danger',
  archived: 'neutral',
  export_failed: 'danger',
  token_revoked: 'warning',
  usage_limited: 'warning',
}
