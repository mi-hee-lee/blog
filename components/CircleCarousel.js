import React, { useMemo, useState, useEffect, useRef } from 'react';

function extendItems(items = []) {
  if (!Array.isArray(items)) return [];
  const cleaned = items.filter(Boolean);
  if (!cleaned.length) return [];
  if (cleaned.length >= 3) return cleaned;

  const duplicated = [...cleaned];
  let cursor = 0;
  while (duplicated.length < 3 && cleaned.length) {
    const source = cleaned[cursor % cleaned.length];
    duplicated.push({ ...source, id: `${source.id || source.order}-clone-${cursor}` });
    cursor += 1;
  }
  return duplicated;
}

function CircleCarousel({ items = [], highlightColor = '#4A7BFF' }) {
  const loopItems = useMemo(() => extendItems(items), [items]);
  const loopLength = loopItems.length;
  const [baseIndex, setBaseIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const timerRef = useRef(null);
  const flipTimerRef = useRef(null);

  useEffect(() => {
    if (!loopLength) return () => {};

    const flipDuration = 900;
    const pauseDuration = 500;

    const scheduleFlip = () => {
      setIsFlipping(true);
      flipTimerRef.current = setTimeout(() => {
        setBaseIndex((prev) => (prev + 1) % loopLength);
        setIsFlipping(false);
        timerRef.current = setTimeout(scheduleFlip, pauseDuration);
      }, flipDuration);
    };

    timerRef.current = setTimeout(scheduleFlip, pauseDuration + 700);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    };
  }, [loopLength]);

  if (!loopLength) return null;

  const getItem = (offset = 0) => loopItems[(baseIndex + offset) % loopLength];
  const getNextItem = (offset = 0) => loopItems[(baseIndex + offset + 1) % loopLength];

  const renderFace = (item) => {
    if (!item) return null;
    if (item.type === 'image' && item.image) {
      const { url, alt, caption } = item.image;
      return (
        <div className="circle-carousel__image">
          <img src={url} alt={alt || caption || ''} loading="lazy" />
        </div>
      );
    }

    return (
      <div className="circle-carousel__text">
        {item.title ? <strong>{item.title}</strong> : null}
        {item.desc ? <p>{item.desc}</p> : null}
      </div>
    );
  };

  return (
    <section className="circle-carousel" style={{ '--circle-accent': highlightColor }}>
      <div className="circle-carousel__track">
        {[0, 1, 2].map((slot) => {
          const current = getItem(slot);
          const next = getNextItem(slot);
          const typeClass = `circle-carousel__item circle-carousel__item--${current?.type || 'text'}`;

          return (
            <div
              key={slot}
              className="circle-carousel__item-wrapper"
              data-slot={slot}
            >
              <div className={`${typeClass} ${isFlipping ? 'is-flipping' : ''}`}>
                <div className="circle-carousel__face circle-carousel__face--front">
                  {renderFace(current)}
                </div>
                <div className="circle-carousel__face circle-carousel__face--back">
                  {renderFace(next)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .circle-carousel {
          width: 100%;
          padding: 140px 0;
          display: flex;
          justify-content: center;
        }

        .circle-carousel__track {
          display: flex;
          gap: clamp(24px, 8vw, 64px);
          align-items: center;
        }

        .circle-carousel__item-wrapper {
          position: relative;
          width: var(--circle-size, clamp(220px, 36vw, 360px));
          height: var(--circle-size, clamp(220px, 36vw, 360px));
          perspective: 1400px;
        }

        .circle-carousel__item {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform-style: preserve-3d;
          transition: transform 0.9s cubic-bezier(0.55, 0.06, 0.46, 1.3);
          transform: rotateY(0deg);
        }

        .circle-carousel__item.is-flipping {
          transform: rotateY(180deg);
        }

        .circle-carousel__face {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          backface-visibility: hidden;
          background: transparent;
        }

        .circle-carousel__item--text .circle-carousel__face {
          background: var(--circle-accent, #4A7BFF);
          color: #fff;
        }

        .circle-carousel__item--text .circle-carousel__face::after {
          content: '';
          position: absolute;
          inset: clamp(14px, 3vw, 26px);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
        }

        .circle-carousel__face--back {
          transform: rotateY(180deg);
        }

        .circle-carousel__image,
        .circle-carousel__image img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }

        .circle-carousel__image img {
          object-fit: cover;
          display: block;
        }

        .circle-carousel__text {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 0 clamp(8px, 2vw, 20px);
        }

        .circle-carousel__text strong {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .circle-carousel__text p {
          margin: 0;
          font-size: 18px;
          line-height: 1.55;
          font-weight: 400;
          white-space: pre-line;
        }

        @media (max-width: 960px) {
          .circle-carousel {
            padding: 120px 0;
          }
          .circle-carousel__text p {
            font-size: 17px;
          }
        }

        @media (max-width: 600px) {
          .circle-carousel {
            padding: 100px 0;
          }
          .circle-carousel__text p {
            font-size: 16px;
          }
        }
      `}</style>
    </section>
  );
}

export default CircleCarousel;
