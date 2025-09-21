import { useMemo } from 'react';
import { buildProxiedImageUrl } from '../lib/notionImage';

function SlideRotation({ id, images = [], text = [], children }) {
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
  const single = items.length === 1;
  const slotSeconds = 4.8;
  const totalDuration = Math.max(slotSeconds * items.length, slotSeconds * 2);

  return (
    <div className={`rot-stage${single ? ' rot-stage--single' : ''}`}>
      <div className="rot-stage__viewport">
        {items.map((img, index) => {
          const style = single
            ? undefined
            : {
                animationDelay: `${index * slotSeconds}s`,
                animationDuration: `${totalDuration}s`
              };
          return (
            <figure
              key={img.id}
              className="rot-item"
              data-single={single ? 'true' : undefined}
              style={style}
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
          align-items: center;
          gap: 24px;
        }
        .rot-stage__viewport {
          position: relative;
          width: clamp(240px, 72vw, 460px);
          height: clamp(240px, 72vw, 460px);
        }
        .rot-item {
          margin: 0;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.94) rotate(-4deg);
          opacity: 0;
          animation-name: rot-seq;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
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
          width: clamp(200px, 65vw, 440px);
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
          text-align: center;
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
          display: inline-flex;
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

        @keyframes rot-seq {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9) rotate(-6deg);
          }
          8% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(-1deg);
          }
          40% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(3deg);
          }
          52% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.92) rotate(6deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.92) rotate(6deg);
          }
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
