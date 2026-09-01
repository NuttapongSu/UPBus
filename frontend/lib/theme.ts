// Single source of truth for brand/line colors — also imported by tailwind.config.ts
// so Tailwind utility classes (bg-brand-green, border-brand-purple, ...) and inline
// styles (chart colors, alpha-suffixed hex like `${COLORS.purple}22`) never drift apart.
export const COLORS = {
  green: '#2ecc71',
  blue: '#3498db',
  red: '#e74c3c',
  orange: '#f39c12',
  purple: '#9b59b6',
  purpleDark: '#8e44ad',
} as const;

export const LINE_COLORS: Record<string, string> = {
  Green: COLORS.green,
  Blue: COLORS.blue,
  Red: COLORS.red,
  Purple: COLORS.purple,
};
