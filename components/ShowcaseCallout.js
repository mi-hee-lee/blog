import { useEffect, useMemo, useState } from 'react';
import { buildProxiedImageUrl } from '../lib/notionImage';

function parseSections(richText = []) {
  const plain = richText.map((t) => t.plain_text || '').join(' ').trim();
  if (!plain) {
    return { title: '', subtitle: '', descHeading: '', descDetail: '' };
  }

  const lower = plain.toLowerCase();

  const getSection = (marker, nextMarker) => {
    const markerLower = marker.toLowerCase();
    const start = lower.indexOf(markerLower);
    if (start === -1) return '';
    const from = start + markerLower.length;
    let end = plain.length;
    if (nextMarker) {
      const nextLower = nextMarker.toLowerCase();
      const nextIdx = lower.indexOf(nextLower, from);
      if (nextIdx !== -1) end = nextIdx;
    }
    return plain.slice(from, end).trim();
  };

  const titleRaw = getSection('#Title', '#Desc');
  const descRaw = getSection('#Desc');

  const extract = (raw = '') => {
    const braces = [];
    const text = raw.replace(/\{([^}]+)\}/g, (_, inner) => {
      braces.push(inner.trim());
      return ' ';
    });
    return { text: text.trim(), braces };
  };

  const titleParts = extract(titleRaw);
  const descParts = extract(descRaw);

  return {
    title: titleParts.text,
    subtitle: titleParts.braces[0] || '',
    descHeading: descParts.text,
    descDetail: descParts.braces[0] || ''
  };
}

function useViewport() {
  const [viewport, setViewport] = useState('desktop');

  useEffect(() => {
    const compute = () => {
      if (typeof window === 'undefined') return 'desktop';
      const width = window.innerWidth;
      if (width < 760) return 'mobile';
      if (width < 1280) return 'tablet';
      return 'desktop';
    };

    const update = () => setViewport(compute());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewport;
}

const IMAGE_LAYOUTS = {
  desktop: [
    { top: '0.5%', left: '18%', right: '48%', bottom: '12%', rotate: -2, delay: 0.0 },
    { top: '2%', left: '76%', right: '4%', bottom: '50%', rotate: 5, delay: 0.4 },
    { top: '22%', left: '2%', right: '74%', bottom: '36%', rotate: -5, delay: 0.8 },
    { top: '0%', left: '56%', right: '24%', bottom: '50%', rotate: 3, delay: 1.2 },
    { top: '48%', left: '56%', right: '18%', bottom: '-6%', rotate: -4, delay: 1.6 },
    { top: '50%', left: '82%', right: '-6%', bottom: '-6%', rotate: 6, delay: 2.0 }
  ],
  tablet: [
    { top: '10%', left: '32%', right: '32%', bottom: '14%', rotate: 2, delay: 0.0 },
    { top: '12%', left: '80%', right: '-8%', bottom: '46%', rotate: 5, delay: 0.4 },
    { top: '24%', left: '0%', right: '74%', bottom: '24%', rotate: -5, delay: 0.8 },
    { top: '12%', left: '68%', right: '10%', bottom: '48%', rotate: 3, delay: 1.2 },
    { top: '64%', left: '64%', right: '14%', bottom: '-18%', rotate: -3, delay: 1.6 },
    { top: '66%', left: '90%', right: '-12%', bottom: '-18%', rotate: 4, delay: 2.0 }
  ],
  mobile: [
    { top: '16%', left: '32%', right: '30%', bottom: '20%', rotate: 2, delay: 0.0 },
    { top: '8%', left: '72%', right: '-18%', bottom: '42%', rotate: 6, delay: 0.4 },
    { top: '-20%', left: '0%', right: '76%', bottom: '40%', rotate: -6, delay: 0.8 },
    { top: '36%', left: '70%', right: '6%', bottom: '40%', rotate: 4, delay: 1.2 },
    { top: '82%', left: '60%', right: '12%', bottom: '-30%', rotate: -4, delay: 1.6 },
    { top: '78%', left: '88%', right: '-20%', bottom: '-28%', rotate: 5, delay: 2.0 }
  ]
};

function ShowcaseCallout({ id, richText = [], images = [], children }) {
  const viewport = useViewport();
  const sections = useMemo(() => parseSections(richText), [richText]);

  const normalizedImages = useMemo(() => {
    return images.map((block, index) => {
      const src = block?.image?.file?.url || block?.image?.external?.url || '';
      const caption = (block?.image?.caption || []).map((c) => c.plain_text).join('');
      const { finalUrl } = buildProxiedImageUrl(src, block?.id);
      return {
        id: block?.id || `${id}-img-${index}`,
        url: finalUrl || src,
        alt: caption || `showcase-${index + 1}`,
        caption
      };
    });
  }, [images, id]);

  const layouts = IMAGE_LAYOUTS[viewport] || IMAGE_LAYOUTS.desktop;

  return (
    <section className="showcase">
      <div className="showcase__stage">
        <div className="showcase__inner">
          <div className="showcase__text">
            {sections.title && <h2 className="showcase__title">{sections.title}</h2>}
            {sections.subtitle && <p className="showcase__subtitle">{sections.subtitle}</p>}
            {sections.descHeading && <p className="showcase__desc">{sections.descHeading}</p>}
            {sections.descDetail && <p className="showcase__detail">{sections.descDetail}</p>}
            {children}
          </div>

          {normalizedImages.map((img, idx) => {
            const layout = layouts[idx % layouts.length];
            if (!layout || !img.url) return null;
            return (
              <figure
                key={img.id}
                className="showcase__image"
                style={{
                  top: layout.top,
                  left: layout.left,
                  right: layout.right,
                  bottom: layout.bottom,
                  '--showcase-initial': `${layout.rotate || 0}deg`,
                  '--showcase-delay': `${layout.delay || 0}s`,
                  '--showcase-duration': `${layout.duration || 15}s`
                }}
                aria-hidden="true"
              >
                <img src={img.url} alt="" loading="lazy" />
                {img.caption ? <figcaption>{img.caption}</figcaption> : null}
              </figure>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .showcase {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 160px 0;
        }

        .showcase__stage {
          position: relative;
          width: min(960px, 100%);
        }

        .showcase__inner {
          position: relative;
          width: 100%;
          min-height: 540px;
        }

        .showcase__text {
          position: relative;
          z-index: 2;
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .showcase__title {
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .showcase__subtitle {
          margin: 0;
          font-size: clamp(16px, 3vw, 22px);
          color: rgba(255, 255, 255, 0.8);
          letter-spacing: 0.02em;
        }

        .showcase__desc {
          margin: 12px 0 0;
          font-size: 15px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.78);
        }

        .showcase__detail {
          margin: 0;
          font-size: 14px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.68);
        }

        .showcase__image {
          position: absolute;
          overflow: hidden;
          border-radius: 20px;
          box-shadow: 0 35px 60px rgba(0, 0, 0, 0.35);
          pointer-events: none;
          z-index: 1;
          animation: showcase-spin var(--showcase-duration, 18s) linear infinite;
          animation-delay: var(--showcase-delay, 0s);
        }

        .showcase__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .showcase__image figcaption {
          display: none;
        }

        @keyframes showcase-spin {
          from { transform: rotate(var(--showcase-initial, 0deg)); }
          to { transform: rotate(calc(var(--showcase-initial, 0deg) + 360deg)); }
        }

        @media (max-width: 960px) {
          .showcase {
            padding: 120px 0;
          }
          .showcase__inner {
            min-height: 560px;
          }
        }

        @media (max-width: 600px) {
          .showcase {
            padding: 100px 0;
          }
          .showcase__inner {
            min-height: 620px;
          }
          .showcase__text {
            max-width: 90%;
          }
        }
      `}</style>
    </section>
  );
}

export default ShowcaseCallout;
