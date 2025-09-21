import { useEffect, useMemo, useState } from 'react';
import { buildProxiedImageUrl } from '../lib/notionImage';

function SlideRotation({ id, images = [], text = [], children }) {
  const [viewport, setViewport] = useState('desktop');

  useEffect(() => {
    const compute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
      if (w < 960) return 'mobile';
      if (w < 1280) return 'tablet';
      return 'desktop';
    };
    const update = () => setViewport(compute());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const normalizedImages = useMemo(() => {
    return images.map((block, index) => {
      const src = block?.image?.file?.url || block?.image?.external?.url || '';
      const caption = (block?.image?.caption || []).map(c => c.plain_text).join('');
      const { finalUrl } = buildProxiedImageUrl(src, block?.id);
      return {
        id: block?.id || `${id}-image-${index}`,
        url: finalUrl || src,
        alt: caption || `slide-${index + 1}`,
        caption
      };
    });
  }, [images, id]);

  const items = normalizedImages.length ? normalizedImages : [{ id: `${id}-placeholder`, url: '', alt: '' }];

  const layoutPresets = useMemo(() => ({
    desktop: {
      height: '620px',
      items: [
        { top: '0.014%', bottom: '8.016%', left: '20.156%', right: '45.298%', rotate: 0, delay: 0.5 },
        { top: '0%', bottom: '56.818%', left: '79.652%', right: '3.075%', rotate: 5, reverse: true, delay: 0.8 },
        { top: '18.864%', bottom: '35.378%', left: '0%', right: '77.121%', rotate: -5, delay: 1.2 },
        { top: '0%', bottom: '56.818%', left: '59.297%', right: '23.43%', rotate: 3, delay: 0.3 },
        { top: '49.844%', bottom: '-6.965%', left: '59.321%', right: '17.801%', rotate: -3, reverse: true, delay: 0.7 },
        { top: '49.844%', bottom: '-6.965%', left: '85.234%', right: '-8.113%', rotate: 4, delay: 1.5 }
      ]
    },
    tablet: {
      height: '640px',
      items: [
        { top: '12.929%', bottom: '5.32%', left: '34.205%', right: '31.25%', rotate: 2, delay: 0.5 },
        { top: '12.917%', bottom: '48.699%', left: '87.5%', right: '-10.53%', rotate: 5, reverse: true, delay: 0.8 },
        { top: '22.913%', bottom: '22.856%', left: '0%', right: '77.121%', rotate: -5, delay: 1.2 },
        { top: '12.917%', bottom: '48.699%', left: '71.818%', right: '10.909%', rotate: 3, delay: 0.3 },
        { top: '71.296%', bottom: '-22.071%', left: '64.697%', right: '12.424%', rotate: -3, reverse: true, delay: 0.7 },
        { top: '71.296%', bottom: '-22.071%', left: '90.625%', right: '-13.504%', rotate: 4, delay: 1.5 }
      ]
    },
    mobile: {
      height: '680px',
      items: [
        { top: '12.929%', bottom: '5.32%', left: '34.205%', right: '31.25%', rotate: 2, delay: 0.5 },
        { top: '12.917%', bottom: '48.7%', left: '63.415%', right: '-30.82%', rotate: 5, reverse: true, delay: 0.8 },
        { top: '-29.414%', bottom: '-29.312%', left: '0%', right: '77.121%', rotate: -5, delay: 1.2 },
        { top: '12.917%', bottom: '48.7%', left: '71.818%', right: '10.909%', rotate: 3, delay: 0.3 },
        { top: '94.309%', bottom: '-45.083%', left: '64.697%', right: '12.425%', rotate: -3, reverse: true, delay: 0.7 },
        { top: '94.309%', bottom: '-45.083%', left: '90.625%', right: '-13.504%', rotate: 4, delay: 1.5 }
      ]
    }
  }), []);

  const preset = layoutPresets[viewport] || layoutPresets.desktop;
  const single = items.length === 1;

  return (
    <div className={`rot-stage${single ? ' rot-stage--single' : ''}`}>
      <div className="rot-stage__viewport" style={{ height: preset.height }}>
        {items.map((img, index) => {
          const fallback = {
            top: '10%',
            left: `${10 + index * 12}%`,
            right: `${40 - index * 6}%`,
            bottom: '20%',
            rotate: index % 2 === 0 ? -4 : 3,
            delay: 0.3 * index
          };

          const layout = preset.items[index] || fallback;

          return (
            <figure
              key={img.id}
              className="rot-item"
              data-single={single ? 'true' : undefined}
              style={{
                '--rot-top': layout.top,
                '--rot-left': layout.left,
                '--rot-right': layout.right,
                '--rot-bottom': layout.bottom,
                '--rot-initial': `${layout.rotate || 0}deg`,
                '--rot-duration': `${layout.duration || 15}s`,
                '--rot-direction': layout.reverse ? 'reverse' : 'normal',
                '--rot-delay': `${layout.delay || 0}s`
              }}
            >
              {img.url ? <img src={img.url} alt={img.alt} loading="lazy" /> : null}
              {img.caption ? <figcaption>{img.caption}</figcaption> : null}
            </figure>
          );
        })}
      </div>

      {(text?.length || children) && (
        <div className="rot-stage__content">
          {text?.length ? (
            <p className="rot-stage__text">
              {text.map((t, i) => (
                <span key={`${id}-text-${i}`}>{t.plain_text || ''}</span>
              ))}
            </p>
          ) : null}
          {children}
        </div>
      )}

      <style jsx>{`
        .rot-stage {
          margin: 48px auto;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 24px;
          width: 100%;
          max-width: 960px;
        }
        .rot-stage__viewport {
          position: relative;
          width: 100%;
          max-width: 960px;
        }
        .rot-item {
          margin: 0;
          position: absolute;
          top: var(--rot-top, auto);
          left: var(--rot-left, auto);
          right: var(--rot-right, auto);
          bottom: var(--rot-bottom, auto);
          transform-origin: center center;
          transform: rotate(var(--rot-initial, 0deg));
          animation-name: rot-spin;
          animation-duration: var(--rot-duration, 18s);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-direction: var(--rot-direction, normal);
          animation-delay: var(--rot-delay, 0s);
          opacity: 1;
        }
        .rot-item[data-single='true'] {
          position: relative;
          top: auto;
          left: auto;
          transform: none;
          opacity: 1;
          animation: none;
        }
        .rot-item img {
          width: 100%;
          height: auto;
          display: block;
          height: auto;
          border-radius: 20px;
          box-shadow: 0 34px 68px rgba(0, 0, 0, 0.32);
        }
        .rot-item figcaption {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.4;
          color: rgba(229, 229, 229, 0.75);
          text-align: center;
        }
        .rot-stage__content {
          text-align: left;
          max-width: clamp(240px, 80vw, 520px);
          color: rgba(229, 229, 229, 0.92);
          font-size: 14px;
          line-height: 1.7;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .rot-stage__text {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .rot-stage--single .rot-stage__viewport {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rot-stage--single .rot-item {
          position: relative;
          transform: none;
        }

        @keyframes rot-spin {
          from { transform: rotate(var(--rot-initial, 0deg)); }
          to { transform: rotate(calc(var(--rot-initial, 0deg) + 360deg)); }
        }

        @media (max-width: 600px) {
          .rot-stage {
            margin: 32px auto;
            gap: 20px;
          }
          .rot-stage__content {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}

export default SlideRotation;
