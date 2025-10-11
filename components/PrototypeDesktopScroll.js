import React, { useEffect, useRef } from 'react';

function resolveEmbedUrl(url = '') {
  if (!url) return '';

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

  if (url.includes('vimeo.com')) {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
  }

  return url;
}

function PrototypeDesktopScroll({ id, embeds = [], children }) {
  const primaryEmbed = embeds[0];
  const embedUrl = resolveEmbedUrl(primaryEmbed?.embed?.url || '');
  const captionText = Array.isArray(primaryEmbed?.embed?.caption)
    ? primaryEmbed.embed.caption.map((c) => c?.plain_text || '').join('').trim()
    : '';

  const rootRef = useRef(null);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);
  const observerRef = useRef(null);
  const iframeLoadedRef = useRef(false);
  const revealWrapperRef = useRef(null);
  const transitionCompletedRef = useRef(false);
  const isInViewRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const element = rootRef.current;
    if (!element) return undefined;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const resetScroll = () => {
      clearTimer();
      const iframeEl = iframeRef.current;
      if (!iframeEl) return;
      try {
        const iframeWindow = iframeEl.contentWindow;
        if (iframeWindow) {
          iframeWindow.scrollTo({ top: 0, behavior: 'auto' });
        }
      } catch {
        // ignore cross-origin failures
      }
    };

    const performScroll = () => {
      const iframeEl = iframeRef.current;
      if (!iframeEl) return;

      const attemptScroll = () => {
        try {
          const iframeWindow = iframeEl.contentWindow;
          if (iframeWindow && iframeLoadedRef.current) {
            iframeWindow.scrollTo({ top: 500, behavior: 'smooth' });
            return true;
          }
        } catch {
          // Cross-origin, cannot auto-scroll
        }
        return false;
      };

      attemptScroll();
    };

    const scheduleScroll = () => {
      clearTimer();
      timerRef.current = window.setTimeout(performScroll, 2000);
    };

    const revealWrapper = element.closest('.scroll-transition-fade');
    if (revealWrapper) {
      revealWrapperRef.current = revealWrapper;
    }

    const iframeEl = iframeRef.current;
    const handleIframeLoad = () => {
      iframeLoadedRef.current = true;
      if (isInViewRef.current) {
        scheduleScroll();
      }
    };

    if (iframeEl) {
      iframeEl.addEventListener('load', handleIframeLoad);
    }

    const handleIntersect = (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== element) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          isInViewRef.current = true;
          if (transitionCompletedRef.current || !revealWrapper) {
            scheduleScroll();
          }
        } else {
          isInViewRef.current = false;
          resetScroll();
        }
      });
    };

    const handleTransitionEnd = (event) => {
      if (!revealWrapper) return;
      if (event.target !== revealWrapper) return;
      if (event.propertyName !== 'transform' && event.propertyName !== 'opacity') return;
      transitionCompletedRef.current = true;
      if (isInViewRef.current) {
        scheduleScroll();
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      threshold: [0.1, 0.5, 1]
    });
    observerRef.current.observe(element);
    if (revealWrapper) {
      revealWrapper.addEventListener('transitionend', handleTransitionEnd);
    }

    return () => {
      clearTimer();
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (revealWrapper) {
        revealWrapper.removeEventListener('transitionend', handleTransitionEnd);
      }
      if (iframeEl) {
        iframeEl.removeEventListener('load', handleIframeLoad);
      }
      transitionCompletedRef.current = false;
      isInViewRef.current = false;
      resetScroll();
    };
  }, []);

  return (
    <section className="prototype-desktop prototype-desktop--scroll" id={id} ref={rootRef}>
      <div className="prototype-desktop__inner">
        {embedUrl ? (
          <div className="prototype-desktop__frame">
            <div className="prototype-desktop__frame-layer">
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title={captionText || 'prototype-desktop-scroll-embed'}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                scrolling="no"
              />
            </div>
          </div>
        ) : null}

        {children ? <div className="prototype-desktop__extra">{children}</div> : null}
      </div>

      <style jsx>{`
        .prototype-desktop {
          width: 100%;
          padding: 160px 0;
          display: flex;
          justify-content: center;
        }

        .prototype-desktop__inner {
          width: 100%;
          max-width: 1440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        .prototype-desktop__frame {
          position: relative;
          width: 100%;
          max-width: 1440px;
          padding-top: calc((1280 / 1440) * 100%);
          margin: 0 auto;
          overflow: visible;
        }

        .prototype-desktop__frame-layer {
          position: absolute;
          top: 0;
          left: 50%;
          width: calc(100% / 0.75);
          height: calc(100% / 0.75);
          transform: translateX(-50%) scale(0.75);
          transform-origin: top center;
          border-radius: 0;
          overflow: hidden;
          max-height: 960px;
        }

        .prototype-desktop__frame-layer iframe {
          width: 100%;
          height: 100%;
          border: none;
          pointer-events: auto;
          overflow: hidden;
        }

        .prototype-desktop__extra {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .prototype-desktop__extra :global(.prototype-callout__text) {
          margin: 0;
          max-width: 880px;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(229, 229, 229, 0.88);
          text-align: center;
        }

        @media (max-width: 960px) {
          .prototype-desktop {
            padding: 120px 0;
          }
        }

        @media (max-width: 600px) {
          .prototype-desktop {
            padding: 100px 0;
          }
        }
      `}</style>
    </section>
  );
}

export default PrototypeDesktopScroll;
