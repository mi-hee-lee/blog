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
    { top: '2%', left: '10%', width: '22%', aspect: 1.3, radius: '26px', rotate: 0, delay: 0.2 },
    { top: '0%', left: '38%', width: '26%', aspect: 1.1, radius: '32px', rotate: 0, delay: 0.4 },
    { top: '0%', left: '68%', width: '22%', aspect: 1.4, radius: '32px', rotate: 0, delay: 0.6 },
    { top: '36%', left: '8%', width: '24%', aspect: 1.3, radius: '28px', rotate: 0, delay: 0.8 },
    { top: '32%', left: '70%', width: '24%', aspect: 1.3, radius: '24px', rotate: 0, delay: 1.0 },
    { top: '64%', left: '12%', width: '22%', aspect: 1.2, radius: '24px', rotate: 0, delay: 1.2 },
    { top: '60%', left: '42%', width: '22%', aspect: 1.0, radius: '28px', rotate: 0, delay: 1.4 },
    { top: '56%', left: '68%', width: '22%', aspect: 1.2, radius: '24px', rotate: 0, delay: 1.6 }
  ],
  tablet: [
    { top: '4%', left: '12%', width: '28%', aspect: 1.2, radius: '24px', rotate: 0, delay: 0.2 },
    { top: '0%', left: '50%', width: '30%', aspect: 1.1, radius: '28px', rotate: 0, delay: 0.4 },
    { top: '40%', left: '6%', width: '30%', aspect: 1.2, radius: '24px', rotate: 0, delay: 0.6 },
    { top: '36%', left: '60%', width: '28%', aspect: 1.2, radius: '22px', rotate: 0, delay: 0.8 },
    { top: '72%', left: '16%', width: '30%', aspect: 1.1, radius: '24px', rotate: 0, delay: 1.0 },
    { top: '68%', left: '54%', width: '30%', aspect: 1.1, radius: '24px', rotate: 0, delay: 1.2 }
  ],
  mobile: [
    { top: '14%', left: '18%', width: '52%', aspect: 1.2, radius: '20px', rotate: 0, delay: 0.2 },
    { top: '0%', left: '48%', width: '50%', aspect: 1.1, radius: '24px', rotate: 0, delay: 0.4 },
    { top: '46%', left: '6%', width: '56%', aspect: 1.2, radius: '20px', rotate: 0, delay: 0.6 },
    { top: '42%', left: '54%', width: '50%', aspect: 1.2, radius: '20px', rotate: 0, delay: 0.8 },
    { top: '84%', left: '14%', width: '56%', aspect: 1.1, radius: '20px', rotate: 0, delay: 1.0 },
    { top: '80%', left: '54%', width: '50%', aspect: 1.1, radius: '20px', rotate: 0, delay: 1.2 }
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
                  width: layout.width,
                  aspectRatio: layout.aspect || 1.2,
                  borderRadius: layout.radius || '24px',
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
          min-height: 720px;
          display: flex;
          align-items: center;
          justify-content: center;
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
          box-shadow: 0 35px 60px rgba(0, 0, 0, 0.35);
          pointer-events: none;
          z-index: 1;
          animation: showcase-spin var(--showcase-duration, 18s) linear infinite;
          animation-delay: var(--showcase-delay, 0s);
          animation-direction: normal;
          transform-origin: center center;
          transform: rotate(var(--showcase-initial, 0deg));
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
            min-height: 640px;
          }
        }

        @media (max-width: 600px) {
          .showcase {
            padding: 100px 0;
          }
          .showcase__inner {
            min-height: 720px;
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
