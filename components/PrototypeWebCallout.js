import React from 'react';

function resolveEmbedUrl(url = '') {
  if (!url) return '';

  // Normalize YouTube links
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  // Normalize Vimeo links
  if (url.includes('vimeo.com')) {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
  }

  return url;
}

function PrototypeWebCallout({ id, embeds = [], children }) {
  const primaryEmbed = embeds[0];
  const embedUrl = resolveEmbedUrl(primaryEmbed?.embed?.url || '');
  const captionText = Array.isArray(primaryEmbed?.embed?.caption)
    ? primaryEmbed.embed.caption.map((c) => c?.plain_text || '').join('').trim()
    : '';

  return (
    <section className="prototype-web" id={id}>
      <div className="prototype-web__inner">
        {embedUrl ? (
          <div className="prototype-web__frame">
            <div className="prototype-web__frame-layer">
              <iframe
                src={embedUrl}
                title={captionText || 'prototype-web-embed'}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {children ? <div className="prototype-web__extra">{children}</div> : null}
      </div>

      <style jsx>{`
        .prototype-web {
          width: 100%;
          padding: 160px 0;
          display: flex;
          justify-content: center;
        }

        .prototype-web__inner {
          width: 100%;
          max-width: 1440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        .prototype-web__frame {
          position: relative;
          width: 100%;
          max-width: 1440px;
          padding-top: calc((1280 / 1440) * 100%);
          animation: prototype-web-width 18s ease-in-out infinite;
          transition: max-width 0.6s ease-in-out;
          margin: 0 auto;
          overflow: visible;
        }

        .prototype-web__frame-layer {
          position: absolute;
          top: 0;
          left: 50%;
          width: calc(100% / 0.75);
          height: calc(100% / 0.75);
          transform: translateX(-50%) scale(0.75);
          transform-origin: top center;
          border-radius: 0;
          background: #000;
          box-shadow: 0 35px 60px rgba(0, 0, 0, 0.35);
          overflow: hidden;
        }

        .prototype-web__frame-layer iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .prototype-web__extra {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .prototype-web__extra :global(.prototype-web__text) {
          margin: 0;
          max-width: 880px;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(229, 229, 229, 0.88);
          text-align: center;
        }

        @keyframes prototype-web-width {
          0% { max-width: 1440px; }
          20% { max-width: 1440px; }
          35% { max-width: 800px; }
          50% { max-width: 400px; }
          65% { max-width: 800px; }
          80% { max-width: 1440px; }
          100% { max-width: 1440px; }
        }

        @media (max-width: 960px) {
          .prototype-web {
            padding: 120px 0;
          }
          .prototype-web__frame {
            animation-duration: 16s;
          }
        }

        @media (max-width: 600px) {
          .prototype-web {
            padding: 100px 0;
          }
          .prototype-web__frame {
            animation-duration: 14s;
          }
        }
      `}</style>
    </section>
  );
}

export default PrototypeWebCallout;
