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

function PrototypeBreakpointCallout({ id, embeds = [], children }) {
  const primaryEmbed = embeds[0];
  const embedUrl = resolveEmbedUrl(primaryEmbed?.embed?.url || '');
  const captionText = Array.isArray(primaryEmbed?.embed?.caption)
    ? primaryEmbed.embed.caption.map((c) => c?.plain_text || '').join('').trim()
    : '';

  return (
    <section className="prototype-breakpoint" id={id}>
      <div className="prototype-breakpoint__inner">
        {embedUrl ? (
          <div className="prototype-breakpoint__frame">
            <div className="prototype-breakpoint__frame-layer">
              <iframe
                src={embedUrl}
                title={captionText || 'prototype-breakpoint-embed'}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {children ? <div className="prototype-breakpoint__extra">{children}</div> : null}
      </div>

      <style jsx>{`
        .prototype-breakpoint {
          width: 100%;
          padding: 160px 0;
          display: flex;
          justify-content: center;
        }

        .prototype-breakpoint__inner {
          width: 100%;
          max-width: 1440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        .prototype-breakpoint__frame {
          position: relative;
          width: 100%;
          max-width: 1440px;
          padding-top: calc((1280 / 1440) * 100%);
          animation: prototype-web-width 10s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transition: max-width 0.6s ease-in-out;
          margin: 0 auto;
          overflow: visible;
        }

        .prototype-breakpoint__frame-layer {
          position: absolute;
          top: 0;
          left: 50%;
          width: calc(100% / 0.75);
          height: calc(100% / 0.75);
          transform: translateX(-50%) scale(0.75);
          transform-origin: top center;
          border-radius: 0;
          overflow: hidden;
        }

        .prototype-breakpoint__frame-layer iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .prototype-breakpoint__extra {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .prototype-breakpoint__extra :global(.prototype-callout__text) {
          margin: 0;
          max-width: 880px;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(229, 229, 229, 0.88);
          text-align: center;
        }

        @keyframes prototype-web-width {
          0%,
          12% { max-width: 1440px; }
          25% { max-width: 1100px; }
          38% { max-width: 800px; }
          48% { max-width: 560px; }
          52% { max-width: 400px; }
          62% { max-width: 560px; }
          72% { max-width: 800px; }
          85% { max-width: 1100px; }
          100% { max-width: 1440px; }
        }

        @media (max-width: 960px) {
          .prototype-breakpoint {
            padding: 120px 0;
          }
          .prototype-breakpoint__frame {
            animation-duration: 10s;
          }
        }

        @media (max-width: 600px) {
          .prototype-breakpoint {
            padding: 100px 0;
          }
          .prototype-breakpoint__frame {
            animation-duration: 10s;
          }
        }
      `}</style>
    </section>
  );
}

export default PrototypeBreakpointCallout;
