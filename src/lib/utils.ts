import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 円単位の数値を「1,234万円」形式に整形。
 * - null / undefined / 非有限値 は "—" を返す
 * - 1億以上 → "X.XX億円"
 * - 1万以上 → "X,XXX万円"
 * - それ以下 → "X,XXX円"
 * - マイナスは符号保持
 */
export function formatJpy(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value === 0) return "0円";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 100_000_000) {
    return `${sign}${(abs / 100_000_000).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}億円`;
  }
  if (abs >= 10_000) {
    return `${sign}${Math.round(abs / 10_000).toLocaleString("ja-JP")}万円`;
  }
  return `${sign}${Math.round(abs).toLocaleString("ja-JP")}円`;
}
