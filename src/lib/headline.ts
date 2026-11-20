// Headlines are often a list ("Software Engineer · AI & Emerging Tech · Community Builder"); line
// breaks read best between the items, not inside one ("AI & Emerging / Tech").

const SEPARATOR = /(\s+[·|•]\s+)/;

/** The headline's items with the separator that followed each one ("" after the last). */
export function headlineSegments(text: string): { text: string; sep: string }[] {
  const pieces = text.trim().split(SEPARATOR);
  const out: { text: string; sep: string }[] = [];
  for (let i = 0; i < pieces.length; i += 2) {
    if (pieces[i]) {
      out.push({ text: pieces[i], sep: pieces[i + 1] ?? "" });
    }
  }
  return out;
}

/**
 * Splits a list-style headline into exactly `lines` lines, breaking only between items and dropping
 * the separator at each break. Picks the most even split whose lines all fit; null when the text has
 * no separators or no split fits, so the caller falls back to word wrapping.
 */
export function wrapAtSeparators(text: string, lines: number, maxWidth: number, measure: (s: string) => number): string[] | null {
  const segs = headlineSegments(text);
  if (segs.length < 2 || lines < 2 || lines > segs.length || segs.length > 12) {
    return null;
  }
  const join = (from: number, to: number) =>
    segs
      .slice(from, to)
      .map((s, i, all) => (i < all.length - 1 ? s.text + s.sep : s.text))
      .join("");

  let best: string[] | null = null;
  let bestWidest = Infinity;
  // Break positions are indices 1..n-1; try every combination of (lines - 1) of them.
  const walk = (start: number, left: number, acc: string[]) => {
    if (left === 1) {
      const result = [...acc, join(start, segs.length)];
      const widest = Math.max(...result.map(measure));
      // On a tie, later candidates have a longer first line, which reads better than a short one.
      if (widest <= maxWidth && widest <= bestWidest) {
        best = result;
        bestWidest = widest;
      }
      return;
    }
    for (let end = start + 1; end <= segs.length - (left - 1); end++) {
      walk(end, left - 1, [...acc, join(start, end)]);
    }
  };
  walk(0, lines, []);
  return best;
}
