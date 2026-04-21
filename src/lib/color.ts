export function oklchToHex(L: number, C: number, H: number, alpha = 1): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (x: number): number => {
    if (!Number.isFinite(x) || x <= 0) return 0;
    if (x >= 1) return 1;
    return x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
  };

  const r = Math.round(toSrgb(lr) * 255);
  const g = Math.round(toSrgb(lg) * 255);
  const b2 = Math.round(toSrgb(lb) * 255);

  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const core = `#${hex(r)}${hex(g)}${hex(b2)}`;
  if (alpha >= 1) return core;
  const a255 = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return `${core}${hex(a255)}`;
}

export function parseOklchToHex(css: string): string {
  const m = css.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i,
  );
  if (!m) throw new Error(`Not an oklch() string: ${css}`);
  return oklchToHex(
    parseFloat(m[1]),
    parseFloat(m[2]),
    parseFloat(m[3]),
    m[4] ? parseFloat(m[4]) : 1,
  );
}
