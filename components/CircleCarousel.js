import React, { useMemo } from 'react';

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];
  const filtered = items.filter(Boolean);
  if (!filtered.length) return [];
  if (filtered.length >= 3) return filtered.slice(0, 3);

  const filled = [...filtered];
  let pointer = 0;
  while (filled.length < 3 && filtered.length) {
    filled.push({ ...filtered[pointer % filtered.length], id: `${filtered[pointer % filtered.length].id}-dup-${pointer}` });
    pointer += 1;
  }
  return filled.slice(0, 3);
}

function CircleCarousel({ items = [], highlightColor = '#4A7BFF' }) {
  const displayItems = useMemo(() => normalizeItems(items), [items]);

  if (!displayItems.length) return null;

  return (
    <section className="circle-carousel" style={{ '--circle-accent': highlightColor }}>
      <div className="circle-carousel__track">
        {displayItems.map((item, idx) => {
          const baseClass = `circle-carousel__item circle-carousel__item--${item.type}`;
          const delayStyle = { '--item-index': idx };

          if (item.type === 'image' && item.image) {
            const { url, caption, alt } = item.image;
            return (
              <div key={item.id || idx} className={baseClass} style={delayStyle}>
                <div className="circle-carousel__image">
                  <img src={url} alt={alt || caption || ''} loading="lazy" />
                </div>
              </div>
            );
          }

          return (
            <div key={item.id || idx} className={baseClass} style={delayStyle}>
              <div className="circle-carousel__text">
                {item.title ? <strong>{item.title}</strong> : null}
                {item.desc ? <p>{item.desc}</p> : null}
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
          position: relative;
          width: min(980px, 92vw);
          height: var(--circle-size, clamp(220px, 38vw, 360px));
        }

        .circle-carousel__item {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--circle-size, clamp(220px, 38vw, 360px));
          height: var(--circle-size, clamp(220px, 38vw, 360px));
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: var(--circle-accent, #4A7BFF);
          color: #ffffff;
          text-align: center;
          padding: clamp(24px, 5vw, 48px);
          box-shadow: 0 35px 60px rgba(0, 0, 0, 0.28);
          transform-origin: center;
          transform: translate(-50%, -50%) translateX(260%) scale(0.82);
          animation: circle-carousel-loop 9s cubic-bezier(0.65, 0, 0.35, 1) infinite;
          animation-delay: calc(var(--item-index) * 3s);
          backface-visibility: hidden;
        }

        .circle-carousel__item--image {
          background: transparent;
          padding: 0;
          box-shadow: none;
        }

        .circle-carousel__item--text {
          background: var(--circle-accent, #4A7BFF);
        }

        .circle-carousel__item--text::before {
          content: '';
          position: absolute;
          inset: clamp(12px, 2.5vw, 22px);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
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
          backface-visibility: hidden;
        }

        .circle-carousel__text {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
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

        @keyframes circle-carousel-loop {
          0%,
          10% {
            transform: translate(-50%, -50%) translateX(260%) scale(0.8) rotateY(0deg);
            opacity: 0;
            z-index: 1;
          }
          18% {
            transform: translate(-50%, -50%) translateX(140%) scale(0.88) rotateY(0deg);
            opacity: 0.75;
            z-index: 2;
          }
          30%,
          38% {
            transform: translate(-50%, -50%) translateX(0%) scale(1) rotateY(0deg);
            opacity: 1;
            z-index: 3;
          }
          44% {
            transform: translate(-50%, -50%) translateX(0%) scale(1) rotateY(180deg);
          }
          50% {
            transform: translate(-50%, -50%) translateX(0%) scale(1) rotateY(360deg);
          }
          55% {
            transform: translate(-50%, -50%) translateX(0%) scale(1) rotateY(360deg);
            opacity: 1;
            z-index: 3;
          }
          62% {
            transform: translate(-50%, -50%) translateX(-140%) scale(0.9) rotateY(360deg);
            opacity: 0.75;
            z-index: 2;
          }
          70%,
          75% {
            transform: translate(-50%, -50%) translateX(-260%) scale(0.78) rotateY(360deg);
            opacity: 0;
            z-index: 1;
          }
          90%,
          100% {
            transform: translate(-50%, -50%) translateX(260%) scale(0.8) rotateY(360deg);
            opacity: 0;
            z-index: 1;
          }
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
