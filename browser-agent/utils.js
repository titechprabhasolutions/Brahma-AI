export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const normalizeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

export const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value);
  return text.trim() ? text : fallback;
};

export const slugify = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const withinAllowlist = (url, allowlist = []) => {
  if (!allowlist.length) return true;
  try {
    const { hostname } = new URL(url);
    return allowlist.some((entry) => hostname.endsWith(entry));
  } catch {
    return false;
  }
};
