import React, { useEffect, useMemo, useRef, useState } from 'react';

const TICK_DURATION = 1000;
const PAUSE_DURATION = 2200;

function sanitizeItems(rawItems = []) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .filter(Boolean)
    .map((item, index) => ({
      id: item.id || `circle-item-${index}`,
      type: item.type === 'image' ? 'image' : 'text',
      image: item.image || null,
      title: item.title || '',
      desc: item.desc || ''
    }));
}

function duplicateToMinimum(items = [], minimum = 3) {
  if (!items.length) return [];
  const extended = [...items];
  let pointer = 0;
  while (extended.length < minimum) {
    const source = items[pointer % items.length];
    extended.push({ ...source, id: `${source.id}-dup-${pointer}` });
    pointer += 1;
  }
  return extended;
}

function useRotatorQueue(items = []) {
  const [head, setHead] = useState(0);
  const length = items.length;

  const slots = useMemo(() => {
    return [0, 1, 2].map((offset) => items[(head + offset) % length]);
  }, [head, items, length]);

  const nextSlots = useMemo(() => {
    return [1, 2, 3].map((offset) => items[(head + offset) % length]);
  }, [head, items, length]);

  const advance = () => {
    setHead((prev) => (prev + 1) % length);
  };

  return { slots, nextSlots, advance, length };
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function CircleFace({ item }) {
  if (!item) return null;
  if (item.type === 'image' && item.image) {
    const { url, caption, alt } = item.image;
    return (
      <div className="circle-face circle-face--image">
        <img src={url} alt={alt || caption || ''} loading="lazy" />
      </div>
    );
  }

  return (
    <div className="circle-face circle-face--text">
      {item.title ? <strong>{item.title}</strong> : null}
      {item.desc ? <p>{item.desc}</p> : null}
    </div>
  );
}

function CircleRotator({ items = [], highlightColor = '#4A7BFF', duration = TICK_DURATION, pause = PAUSE_DURATION }) {
  const preparedItems = useMemo(() => duplicateToMinimum(sanitizeItems(items), 3), [items]);
  const reduceMotion = prefersReducedMotion();
  const { slots, nextSlots, advance, length } = useRotatorQueue(preparedItems);

  const [isFlipping, setIsFlipping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const tickTimer = useRef(null);
  const flipTimer = useRef(null);

  useEffect(() => {
    if (!length) return undefined;

    const startLoop = () => {
      setIsFlipping(true);
      flipTimer.current = setTimeout(() => {
        advance();
        setIsFlipping(false);
        tickTimer.current = setTimeout(startLoop, pause);
      }, duration);
    };

    tickTimer.current = setTimeout(() => {
      setHasStarted(true);
      if (!reduceMotion) {
        startLoop();
      }
    }, pause);

    return () => {
      if (tickTimer.current) clearTimeout(tickTimer.current);
      if (flipTimer.current) clearTimeout(flipTimer.current);
    };
  }, [advance, duration, pause, reduceMotion, length]);

  if (!length) return null;

  const renderSlot = (slotIndex) => {
    const current = slots[slotIndex];
    const next = nextSlots[slotIndex];
    const type = current?.type || 'text';

    if (reduceMotion) {
      const fallback = current || next;
      return (
        <div key={slotIndex} className="circle-slot" data-slot={slotIndex}>
          <CircleFace item={fallback} />
        </div>
      );
    }

    return (
      <div key={slotIndex} className="circle-slot" data-slot={slotIndex}>
        <div
          className={`circle-item circle-item--${type} ${hasStarted ? 'is-ready' : ''} ${isFlipping ? 'is-animating' : ''}`}
          style={{ '--slot-index': slotIndex }}
        >
          <div className="circle-face-wrapper circle-face-wrapper--front">
            <CircleFace item={current} />
          </div>
          <div className="circle-face-wrapper circle-face-wrapper--back">
            <CircleFace item={next} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      className={`circle-rotator ${reduceMotion ? 'reduce-motion' : ''}`}
      style={{
        '--circle-size': 'clamp(220px, 36vw, 360px)',
        '--gap': 'clamp(24px, 8vw, 64px)',
        '--duration': `${duration}ms`,
        '--pause': `${pause}ms`,
        '--easing': 'cubic-bezier(0.4, 0, 0.2, 1)',
        '--accent': highlightColor
      }}
    >
      {renderSlot(0)}
      {renderSlot(1)}
      {renderSlot(2)}

      <style jsx>{`
        .circle-rotator {
          width: 100%;
          padding: 140px 0;
          display: flex;
          justify-content: center;
          gap: var(--gap);
          perspective: 1000px;
        }

        .circle-slot {
          width: var(--circle-size);
          height: var(--circle-size);
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
        }

        .circle-item {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transform: rotateY(0deg);
          transition:
            transform var(--duration) var(--easing);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .circle-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: transparent;
          border-radius: 9999px;
          z-index: 0;
        }

        .circle-item--text::before {
          background: var(--accent);
        }

        .circle-item.is-ready {
          opacity: 1;
        }

        .circle-item.is-animating {
          transform: rotateY(180deg);
        }

        .circle-face-wrapper {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          backface-visibility: hidden;
          overflow: hidden;
        }

        .circle-face-wrapper--back {
          transform: rotateY(180deg);
        }

        .circle-face {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #ffffff;
          text-align: center;
          padding: 0 clamp(12px, 2vw, 24px);
        }

        .circle-face--image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .circle-face--text strong {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .circle-face--text p {
          margin: 0;
          font-size: 18px;
          line-height: 1.55;
          white-space: pre-line;
        }

        .reduce-motion .circle-item {
          transform: none !important;
          transition: opacity 240ms ease;
        }

        .reduce-motion .circle-item.is-animating {
          opacity: 0;
        }

        @media (max-width: 960px) {
          .circle-rotator {
            padding: 120px 0;
          }
        }

        @media (max-width: 600px) {
          .circle-rotator {
            padding: 100px 0;
            --circle-size: clamp(180px, 60vw, 240px);
            --gap: clamp(18px, 6vw, 36px);
          }
          .circle-face--text p {
            font-size: 16px;
          }
        }
      `}</style>
    </section>
  );
}

export default CircleRotator;
