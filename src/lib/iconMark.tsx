/** The HelloQR mark as Satori JSX, full-bleed so it also works as a maskable app icon. */
export function IconMark({ size }: { size: number }) {
  const u = size / 28;
  // The glyph sits in the middle 60% so Android's circular mask never clips it.
  const inset = size * 0.2;
  const scale = (size - inset * 2) / (14 * u);
  const sq = (x: number, y: number, s: number) => (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: inset + (x - 7) * u * scale,
        top: inset + (y - 7) * u * scale,
        width: s * u * scale,
        height: s * u * scale,
        borderRadius: s * u * scale * 0.22,
        background: "#fafafa",
      }}
    />
  );
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size, background: "#09090b" }}>
      {sq(7, 7, 5.5)}
      {sq(15.5, 7, 5.5)}
      {sq(7, 15.5, 5.5)}
      {sq(15.5, 15.5, 2.5)}
      {sq(18.5, 18.5, 2.5)}
    </div>
  );
}
