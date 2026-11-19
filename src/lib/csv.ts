/** Quotes every cell and defuses spreadsheet formulas (=, +, -, @) that a name could smuggle in. */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    let s = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(s)) {
      s = `'${s}`;
    }
    return `"${s.replace(/"/g, '""')}"`;
  };
  // BOM so Excel opens UTF-8 names (Hindi, accents) correctly.
  return `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
