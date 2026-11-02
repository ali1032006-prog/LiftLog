import { dateLocale, t } from '@/i18n';

export function formatDuration(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return t('{h}h {m}m', { h, m });
  if (m > 0) return t('{m}m', { m });
  return t('{s}s', { s });
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('just now');
  if (min < 60) return t('{n}m ago', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('{n}h ago', { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t('{n}d ago', { n: d });
  const date = new Date(iso);
  return date.toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric', year: d > 300 ? 'numeric' : undefined });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(dateLocale(), {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
