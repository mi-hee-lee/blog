import { useEffect, useMemo, useState } from 'react';
import { buildProxiedImageUrl } from '../lib/notionImage';

function parseSections(richText = []) {
  const joined = richText
    .map((segment) => (segment?.plain_text || '').replace(/\r/g, ''))
    .join('\n');

  const lines = joined.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  const state = { title: [], desc: [] };
  let current = null;

  const pushContent = (bucket, raw) => {
    if (!raw) return;
    const matches = [...raw.matchAll(/\{([^}]+)\}/g)].map((m) => m[1].trim()).filter(Boolean);
    const parenMatches = [...raw.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim()).filter(Boolean);
    const collected = [...matches, ...parenMatches];
    if (collected.length) {
      bucket.push(...collected);
      return;
    }
    bucket.push(raw.replace(/^#?[A-Za-z]+/, '').trim());
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('#title')) {
      current = 'title';
      const rest = line.slice(6).trim();
      pushContent(state.title, rest);
      continue;
    }
    if (lower.startsWith('#desc')) {
      current = 'desc';
      const rest = line.slice(5).trim();
      pushContent(state.desc, rest);
      continue;
    }
    if (!current) continue;
    pushContent(state[current], line);
  }

  return {
    title: state.title.join(' ').trim(),
    desc: state.desc.join(' ').trim()
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
            {sections.desc && <p className="showcase__desc">{sections.desc}</p>}
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
          width: min(1240px, 100%);
          min-height: 1000px;
          --showcase-img-width: 300px;
        }

        .showcase__ring {
          position: absolute;
          inset: 0;
          margin: 0 auto;
          width: clamp(520px, 80vw, 980px);
          height: clamp(520px, 80vw, 980px);
          animation: showcase-orbit 28s linear infinite;
          transform-origin: center;
          z-index: 1;
        }

        .showcase__ring--tablet {
          width: clamp(420px, 88vw, 820px);
          height: clamp(420px, 88vw, 820px);
        }

        .showcase__ring--mobile {
          width: clamp(360px, 96vw, 680px);
          height: clamp(360px, 96vw, 680px);
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
          min-height: 1000px;
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
          font-size: 20px;
          line-height: 1.5;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .showcase__desc {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.7);
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
            min-height: 860px;
          }
          .showcase__stage {
            --showcase-img-width: 240px;
          }
        }

        @media (max-width: 600px) {
          .showcase {
            padding: 100px 0;
          }
          .showcase__inner {
            min-height: 780px;
          }
          .showcase__text {
            max-width: 90%;
          }
          .showcase__stage {
            --showcase-img-width: 180px;
          }
        }
      `}</style>
    </section>
  );
}

export default ShowcaseCallout;
