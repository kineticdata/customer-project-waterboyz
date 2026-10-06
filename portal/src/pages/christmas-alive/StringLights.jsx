import { useEffect, useMemo, useRef, useState } from 'react';
import t from 'prop-types';

// Lit-bulb tones. The brand reds and greens are too dark to read as light, so
// these are the same hues warmed and brightened, the way a real incandescent
// strand looks at night. Order is deliberately not a strict cycle.
const BULBS = ['#e5533f', '#f2c14e', '#7cc46b', '#fff4d6', '#f2c14e', '#e5533f', '#fff4d6', '#7cc46b'];

const SPAN = 132; // px between hooks
const BULBS_PER_SPAN = 3;
const HEIGHT = 50;

/** Deterministic wobble so the strand looks hand-hung but never jitters. */
const wobble = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x); // 0..1
};

/** Point and slope on a quadratic bezier. */
const onCurve = (p0, c, p1, tt) => {
  const mt = 1 - tt;
  return {
    x: mt * mt * p0.x + 2 * mt * tt * c.x + tt * tt * p1.x,
    y: mt * mt * p0.y + 2 * mt * tt * c.y + tt * tt * p1.y,
    dx: 2 * mt * (c.x - p0.x) + 2 * tt * (p1.x - c.x),
    dy: 2 * mt * (c.y - p0.y) + 2 * tt * (p1.y - c.y),
  };
};

const buildStrand = width => {
  const spans = Math.max(1, Math.ceil(width / SPAN));
  const step = width / spans;
  const hooks = Array.from({ length: spans + 1 }, (_, i) => ({
    x: i * step,
    y: 4 + wobble(i, 1) * 4,
  }));

  let path = `M ${hooks[0].x} ${hooks[0].y}`;
  const bulbs = [];
  for (let i = 0; i < spans; i += 1) {
    const p0 = hooks[i];
    const p1 = hooks[i + 1];
    const sag = 12 + wobble(i, 2) * 8;
    const c = { x: (p0.x + p1.x) / 2, y: Math.max(p0.y, p1.y) + sag };
    path += ` Q ${c.x} ${c.y} ${p1.x} ${p1.y}`;

    for (let b = 0; b < BULBS_PER_SPAN; b += 1) {
      const tt = (b + 0.5) / BULBS_PER_SPAN + (wobble(i * 7 + b, 3) - 0.5) * 0.08;
      const pt = onCurve(p0, c, p1, tt);
      const n = bulbs.length;
      bulbs.push({
        x: pt.x,
        y: pt.y,
        // Hang straight down, tipped a little by the wire's slope.
        angle: Math.max(-18, Math.min(18, (Math.atan2(pt.dy, pt.dx) * 180) / Math.PI * 0.6)),
        color: BULBS[n % BULBS.length],
        delay: ((n * 0.61) % 4.8).toFixed(2),
      });
    }
  }
  return { path, bulbs };
};

/**
 * Hand-strung string lights -- the Christmas Alive brand motif ("warm,
 * hand-strung, never perfectly straight").
 *
 * Draws at the container's real pixel width rather than scaling a fixed
 * drawing, so bulbs stay the same size on a phone and a wide monitor. The
 * twinkle lives in christmas-alive.css and is skipped for reduced motion.
 * Purely decorative: hidden from assistive technology.
 *
 * `drawWidth` skips measuring and draws at that width, scaled to fill the
 * container. Use it where the container has no size until it is shown --
 * e.g. a print-only header, which is display:none on screen.
 */
export const StringLights = ({ className, drawWidth }) => {
  const ref = useRef(null);
  const [measured, setMeasured] = useState(0);
  const width = drawWidth || measured;

  useEffect(() => {
    if (drawWidth) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setMeasured(Math.round(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawWidth]);

  const strand = useMemo(() => (width ? buildStrand(width) : null), [width]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {strand && (
        <svg
          className="ca-lights"
          width={drawWidth ? '100%' : width}
          height={drawWidth ? undefined : HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          preserveAspectRatio="xMidYMin meet"
          focusable="false"
        >
          <path className="ca-wire" d={strand.path} />
          {strand.bulbs.map((b, i) => (
            <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.angle})`}>
              <rect className="ca-cap" x="-3" y="0" width="6" height="5.5" rx="1.2" />
              <ellipse
                className="ca-bulb"
                cx="0"
                cy="12.5"
                rx="5.4"
                ry="8"
                fill={b.color}
                style={{ '--glow': b.color, animationDelay: `-${b.delay}s` }}
              />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
};

StringLights.propTypes = { className: t.string, drawWidth: t.number };
