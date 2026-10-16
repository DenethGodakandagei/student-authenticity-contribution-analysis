import { useMemo } from 'react';

export const MEMBER_COLORS = [
  { text: 'text-[#34C759]', bg: 'bg-emerald-500/10', border: 'border-[#34C759]/20', bar: 'bg-[#34C759]', dot: 'bg-emerald-400', badge: 'bg-[#34C759]/8 text-[#34C759] border border-[#34C759]/20' },
  { text: 'text-[#2D6606]', bg: 'bg-sky-500/10', border: 'border-[#A3E635]/20', bar: 'bg-[#A3E635]', dot: 'bg-sky-400', badge: 'bg-[#A3E635]/15 text-[#2D6606] border border-[#A3E635]/20' },
  { text: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/30', bar: 'bg-[#AF52DE]', dot: 'bg-purple-400', badge: 'bg-purple-950/80 text-purple-300 border border-purple-500/30' },
  { text: 'text-[#FF9500]', bg: 'bg-amber-500/10', border: 'border-[#FF9500]/20', bar: 'bg-[#FF9500]', dot: 'bg-amber-400', badge: 'bg-[#FF9500]/8/80 text-[#FF9500] border border-[#FF9500]/20' },
  { text: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/30', bar: 'bg-[#EC4899]', dot: 'bg-pink-400', badge: 'bg-pink-950/80 text-pink-300 border border-pink-500/30' },
  { text: 'text-[#5856D6]', bg: 'bg-indigo-500/10', border: 'border-[#5856D6]/20', bar: 'bg-[#6366F1]', dot: 'bg-indigo-400', badge: 'bg-[#5856D6]/8/80 text-[#5856D6] border border-[#5856D6]/20' }
];

export function computeLcsDiff(oldLines: string[], newLines: string[]) {
  const dp: number[][] = Array(oldLines.length + 1)
    .fill(0)
    .map(() => Array(newLines.length + 1).fill(0));

  for (let i = 0; i < oldLines.length; i++) {
    for (let j = 0; j < newLines.length; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diff: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({ type: 'unchanged', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', text: newLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      diff.unshift({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }

  return diff;
}
