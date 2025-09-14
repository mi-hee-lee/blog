// components/SlideCarousel.js
import { useEffect, useRef } from 'react';

function Text({ rich_text = [] }) {
  function rtToHtml(rich = []) {
    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    return rich
      .map((t) => {
        const text = t.plain_text || '';
        const ann = t.annotations || {};
        let out = escapeHtml(text);
        if (ann.code) out = `<code>${out}</code>`;
        if (ann.bold) out = `<strong>${out}</strong>`;
        if (ann.italic) out = `<em>${out}</em>`;
        if (ann.underline) out = `<u>${out}</u>`;
        if (ann.strikethrough) out = `<s>${out}</s>`;
        if (t.href) out = `<a href="${t.href}" target="_blank" rel="noreferrer">${out}</a>`;
        return out;
      })
      .join('');
  }

  return <span dangerouslySetInnerHTML={{ __html: rtToHtml(rich_text) }} />;
}

export default function SlideCarousel({ id, text, images }) {
  const carouselRef = useRef(null);
  const trackRef = useRef(null);
  const currentSlideRef = useRef(0);

  useEffect(() => {
    if (!carouselRef.current || !trackRef.current || images.length <= 1) return;

    const carousel = carouselRef.current;
    const track = trackRef.current;
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    const dots = carousel.querySelectorAll('.carousel-dot');

    if (!track) {
      console.error('Carousel track not found');
      return;
    }

    const updateSlide = (index) => {
      if (index < 0 || index >= images.length) return;

      currentSlideRef.current = index;
      const translateX = -index * 100;

      // Apply transform with fallback
      if (track) {
        track.style.transform = `translateX(${translateX}%)`;
      }

      // Update active dot
      dots.forEach((dot, i) => {
        if (dot && dot.classList) {
          dot.classList.toggle('active', i === index);
        }
      });
    };

    const goToNext = () => {
      const nextIndex = (currentSlideRef.current + 1) % images.length;
      updateSlide(nextIndex);
    };

    const goToPrev = () => {
      const prevIndex = (currentSlideRef.current - 1 + images.length) % images.length;
      updateSlide(prevIndex);
    };

    // Create event handler refs to properly remove them
    const prevHandler = () => goToPrev();
    const nextHandler = () => goToNext();
    const dotHandlers = [];

    // Event listeners
    if (prevBtn) {
      prevBtn.addEventListener('click', prevHandler);
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', nextHandler);
    }

    dots.forEach((dot, index) => {
      const handler = () => updateSlide(index);
      dotHandlers.push(handler);
      if (dot) {
        dot.addEventListener('click', handler);
      }
    });

    // Initialize first dot as active
    updateSlide(0);

    // Auto-play (optional) - only if multiple images
    let autoPlay;
    if (images.length > 1) {
      autoPlay = setInterval(goToNext, 5000);
    }

    // Cleanup
    return () => {
      if (prevBtn) {
        prevBtn.removeEventListener('click', prevHandler);
      }
      if (nextBtn) {
        nextBtn.removeEventListener('click', nextHandler);
      }
      dots.forEach((dot, index) => {
        if (dot && dotHandlers[index]) {
          dot.removeEventListener('click', dotHandlers[index]);
        }
      });
      if (autoPlay) {
        clearInterval(autoPlay);
      }
    };
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="n-callout">
        <span className="n-callout-ico" aria-hidden>🖼️</span>
        <div className="n-callout-body">
          <Text rich_text={text} />
          <p>이미지를 추가해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="n-slide-carousel">
        <Text rich_text={text} />
        <div className="carousel-container" ref={carouselRef}>
          <div className="carousel-track" ref={trackRef}>
            {images.map((img, index) => {
              const imgUrl = img?.image?.file?.url || img?.image?.external?.url || '';
              const caption = (img?.image?.caption || []).map(c => c.plain_text).join('');
              return (
                <div key={img.id || index} className="carousel-slide">
                  <img src={imgUrl} alt={caption || `Slide ${index + 1}`} />
                  {caption && <div className="carousel-caption">{caption}</div>}
                </div>
              );
            })}
          </div>
          {images.length > 1 && (
            <>
              <button className="carousel-btn carousel-prev" aria-label="Previous slide">
                <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.25 7.27441L16.25 7.27441" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.2998 13.2988L1.2498 7.27476L7.2998 1.24976" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="carousel-btn carousel-next" aria-label="Next slide">
                <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.75 7.72559L0.75 7.72559" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.7002 1.70124L15.7502 7.72524L9.7002 13.7502" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="carousel-dots">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className="carousel-dot"
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        .n-slide-carousel {
          margin: 24px 0;
        }
        .carousel-container {
          position: relative;
          border-radius: 0;
          overflow: hidden;
          background: transparent;
          border: none;
        }
        .carousel-track {
          display: flex;
          transition: transform 0.3s ease;
        }
        .carousel-slide {
          flex-shrink: 0;
          width: 100%;
          position: relative;
        }
        .carousel-slide img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 0;
        }
        .carousel-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: white;
          padding: 20px 16px 16px;
          font-size: 10px;
          text-align: center;
        }
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 2;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .carousel-btn:hover {
          background: rgba(0, 0, 0, 0.8);
        }
        .carousel-prev {
          left: 16px;
        }
        .carousel-next {
          right: 16px;
        }
        .carousel-dots {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 12px;
          z-index: 2;
        }
        .carousel-dot {
          width: 8px;
          height: 8px;
          min-width: 8px;
          min-height: 8px;
          max-width: 10px;
          max-height: 10px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          padding: 0;
        }
        .carousel-dot:hover {
          background: rgba(255, 255, 255, 0.6);
        }
        .carousel-dot.active {
          background: rgba(255, 255, 255, 0.9);
          transform: scale(1.1);
        }
      `}</style>
    </>
  );
}