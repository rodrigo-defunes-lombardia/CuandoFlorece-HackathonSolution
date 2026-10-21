/** Marca: flor de seis pétalos (SVG propio). El color llega por CSS: `--c`. */
export function Flor({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-16 -16 32 32" aria-hidden="true" focusable="false">
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx="0" cy="-8" rx="4.6" ry="8" transform={`rotate(${a})`} fill="var(--c, currentColor)" opacity=".92" />
      ))}
      <circle r="3.6" fill="var(--centro, #2B2333)" />
    </svg>
  )
}

export const florHtml = (size: number) =>
  `<svg width="${size}" height="${size}" viewBox="-16 -16 32 32" aria-hidden="true" focusable="false">` +
  [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-8" rx="4.6" ry="8" transform="rotate(${a})" fill="var(--c)" opacity=".92"/>`).join('') +
  `<circle r="3.6" fill="#2B2333"/></svg>`
