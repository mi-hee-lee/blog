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
      height: '520px',
      items: [
        { top: '2%', left: '22%', width: '36%', rotate: -2, duration: 18 },
        { top: '4%', left: '80%', width: '18%', rotate: 5, duration: 22, reverse: true },
        { top: '28%', left: '10%', width: '22%', rotate: -5, duration: 20 },
        { top: '4%', left: '60%', width: '20%', rotate: 3, duration: 16 },
        { top: '60%', left: '64%', width: '26%', rotate: -3, duration: 19, reverse: true },
        { top: '68%', left: '88%', width: '24%', rotate: 4, duration: 23 }
      ]
    },
    tablet: {
      height: '520px',
      items: [
        { top: '16%', left: '36%', width: '34%', rotate: -2, duration: 18 },
        { top: '18%', left: '82%', width: '20%', rotate: 5, duration: 22, reverse: true },
        { top: '32%', left: '10%', width: '26%', rotate: -5, duration: 20 },
        { top: '18%', left: '66%', width: '22%', rotate: 3, duration: 16 },
        { top: '72%', left: '70%', width: '28%', rotate: -3, duration: 19, reverse: true },
        { top: '74%', left: '94%', width: '24%', rotate: 4, duration: 23 }
      ]
    },
    mobile: {
      height: '560px',
      items: [
        { top: '24%', left: '48%', width: '48%', rotate: -2, duration: 18 },
        { top: '18%', left: '82%', width: '32%', rotate: 5, duration: 22, reverse: true },
        { top: '12%', left: '12%', width: '34%', rotate: -5, duration: 20 },
        { top: '48%', left: '76%', width: '28%', rotate: 3, duration: 16 },
        { top: '72%', left: '64%', width: '40%', rotate: -3, duration: 19, reverse: true },
        { top: '82%', left: '92%', width: '32%', rotate: 4, duration: 23 }
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
            top: '50%',
            left: `${50 + (index - (items.length - 1) / 2) * 12}%`,
            width: '40%',
            rotate: index % 2 === 0 ? -4 : 3,
            duration: 20 + index * 2
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
                '--rot-width': layout.width,
                '--rot-initial': `${layout.rotate || 0}deg`,
                '--rot-duration': `${layout.duration || 18}s`,
                '--rot-direction': layout.reverse ? 'reverse' : 'normal'
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
          width: min(680px, 90vw);
        }
        .rot-item {
          margin: 0;
          position: absolute;
          top: var(--rot-top, 50%);
          left: var(--rot-left, 50%);
          transform: translate(-50%, -50%) rotate(var(--rot-initial, 0deg));
          animation-name: rot-spin;
          animation-duration: var(--rot-duration, 18s);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-direction: var(--rot-direction, normal);
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
          width: var(--rot-width, clamp(200px, 60vw, 440px));
          height: auto;
          display: block;
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
          from { transform: translate(-50%, -50%) rotate(var(--rot-initial, 0deg)); }
          to { transform: translate(-50%, -50%) rotate(calc(var(--rot-initial, 0deg) + 360deg)); }
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
