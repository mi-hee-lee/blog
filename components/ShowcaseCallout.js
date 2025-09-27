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
    { top: '14%', left: '25%' },
    { top: '10%', left: '50%' },
    { top: '16%', left: '74%' },
    { top: '44%', left: '18%' },
    { top: '45%', left: '82%' },
    { top: '78%', left: '30%' },
    { top: '76%', left: '56%' },
    { top: '72%', left: '82%' }
  ],
  tablet: [
    { top: '18%', left: '30%' },
    { top: '12%', left: '58%' },
    { top: '22%', left: '82%' },
    { top: '48%', left: '18%' },
    { top: '52%', left: '78%' },
    { top: '84%', left: '32%' },
    { top: '82%', left: '60%' }
  ],
  mobile: [
    { top: '24%', left: '34%' },
    { top: '18%', left: '70%' },
    { top: '38%', left: '88%' },
    { top: '58%', left: '20%' },
    { top: '68%', left: '70%' },
    { top: '92%', left: '40%' }
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
        <div className={`showcase__ring showcase__ring--${viewport}`}>
          {normalizedImages.map((img, idx) => {
            const layout = layouts[idx % layouts.length];
            if (!layout || !img.url) return null;
            return (
              <div
                key={img.id}
                className="showcase__slot"
                style={{
                  '--slot-top': layout.top,
                  '--slot-left': layout.left
                }}
              >
                <figure className="showcase__image">
                  <img src={img.url} alt="" loading="lazy" />
                  {img.caption ? <figcaption>{img.caption}</figcaption> : null}
                </figure>
              </div>
            );
          })}
        </div>

        <div className="showcase__inner">
          <div className="showcase__text">
            {sections.title && <h2 className="showcase__title">{sections.title}</h2>}
            {sections.subtitle && <p className="showcase__subtitle">{sections.subtitle}</p>}
            {sections.descHeading && <p className="showcase__desc">{sections.descHeading}</p>}
            {sections.descDetail && <p className="showcase__detail">{sections.descDetail}</p>}
            {children}
          </div>
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
          min-height: 760px;
          --showcase-img-width: 220px;
        }

        .showcase__ring {
          position: absolute;
          inset: 0;
          margin: 0 auto;
          width: clamp(360px, 70vw, 720px);
          height: clamp(360px, 70vw, 720px);
          animation: showcase-orbit 28s linear infinite;
          transform-origin: center;
          z-index: 1;
        }

        .showcase__ring--tablet {
          width: clamp(320px, 78vw, 640px);
          height: clamp(320px, 78vw, 640px);
        }

        .showcase__ring--mobile {
          width: clamp(280px, 84vw, 520px);
          height: clamp(280px, 84vw, 520px);
        }

        .showcase__slot {
          position: absolute;
          top: var(--slot-top);
          left: var(--slot-left);
          transform: translate(-50%, -50%);
          width: var(--showcase-img-width);
        }

        .showcase__image {
          width: 100%;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 35px 60px rgba(0, 0, 0, 0.35);
          pointer-events: none;
          animation: showcase-counter 28s linear infinite;
          transform-origin: center;
        }

        .showcase__slot img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
        }

        .showcase__slot figcaption {
          display: none;
        }

        .showcase__inner {
          position: relative;
          width: 100%;
          min-height: 760px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
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

        @keyframes showcase-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes showcase-counter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @media (max-width: 960px) {
          .showcase {
            padding: 120px 0;
          }
          .showcase__inner {
            min-height: 680px;
          }
          .showcase__stage {
            --showcase-img-width: 190px;
          }
        }

        @media (max-width: 600px) {
          .showcase {
            padding: 100px 0;
          }
          .showcase__inner {
            min-height: 700px;
          }
          .showcase__text {
            max-width: 90%;
          }
          .showcase__stage {
            --showcase-img-width: 150px;
          }
        }
      `}</style>
    </section>
  );
}

export default ShowcaseCallout;
