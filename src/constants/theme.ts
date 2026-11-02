export type Colors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentText: string;
  accentTint: string;
  success: string;
  successText: string;
  successTint: string;
  danger: string;
  warning: string;
  overlay: string;
};

export const darkColors: Colors = {
  bg: '#0B0F14',
  surface: '#141A22',
  surfaceAlt: '#1C242E',
  border: '#27313D',
  text: '#F2F5F8',
  muted: '#8A95A3',
  faint: '#5B6672',
  accent: '#3B82F6',
  accentText: '#FFFFFF',
  accentTint: 'rgba(59,130,246,0.18)',
  success: '#22C55E',
  successText: '#06240F',
  successTint: 'rgba(34,197,94,0.14)',
  danger: '#EF4444',
  warning: '#F59E0B',
  overlay: 'rgba(0,0,0,0.6)',
};

export const lightColors: Colors = {
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF0F4',
  border: '#D8DEE6',
  text: '#0F1720',
  muted: '#5A6573',
  faint: '#929DAA',
  accent: '#2563EB',
  accentText: '#FFFFFF',
  accentTint: 'rgba(37,99,235,0.12)',
  success: '#16A34A',
  successText: '#FFFFFF',
  successTint: 'rgba(22,163,74,0.12)',
  danger: '#DC2626',
  warning: '#D97706',
  overlay: 'rgba(15,23,32,0.45)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const maxContentWidth = 640;
