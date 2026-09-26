import { useEffect, useRef, useState } from "react";

import { motionTokens, useMotion } from "../../theme";

// Tweens a number from its previous value to the new one (400 ms,
// decelerating) when data changes — the balance "counts" to the new
// period instead of swapping. One short tween of one text node, never a
// loop; reduced motion swaps immediately.
export function useCountUp(target: number, duration = 400): number {
  const { reduced } = useMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (reduced || from === target) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const start = Date.now();
    const [x1, y1, x2, y2] = motionTokens.easing.decelerate;
    const ease = cubicBezier(x1, y1, x2, y2);
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const current = from + (target - from) * ease(t);
      setValue(t < 1 ? current : target);
      fromRef.current = t < 1 ? current : target;
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, reduced]);

  return value;
}

// Standard cubic-bezier timing function (same curves as the motion tokens).
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let index = 0; index < 6; index++) {
      const error = sampleX(t) - x;
      const slope = slopeX(t);
      if (Math.abs(error) < 1e-4 || slope === 0) break;
      t -= error / slope;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}
