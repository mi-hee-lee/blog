// components/BlockRenderer.js
// Notion 블록 트리를 받아 화면에 렌더링 (2열 컬럼 지원, 이미지 여백 제거/라운드)

import SlideCarousel from './SlideCarousel';
import FullBleedDivider from './FullBleedDivider';
import ShowcaseCallout from './ShowcaseCallout';
import PrototypeDesktopFix from './PrototypeDesktopFix';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildProxiedImageUrl, buildProxiedFileUrl } from '../lib/notionImage';

function rtToHtml(rich = []) {
  // 아주 심플한 rich_text -> HTML 변환 (bold/italic/code 링크 정도만)
  return rich
    .map((t, i) => {
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function Text({ rich_text = [] }) {
  return <span dangerouslySetInnerHTML={{ __html: rtToHtml(rich_text) }} />;
}

function FigureImage({ block }) {
  const img =
    block?.image?.file?.url ||
    block?.image?.external?.url ||
    '';

  const caption = (block?.image?.caption || [])
    .map((c) => c.plain_text)
    .join('');

  if (!img) return null;

  // URL에서 width/height 파라미터 추출
  const extractSizeFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const width = urlObj.searchParams.get('width');
      const height = urlObj.searchParams.get('height');
      return {
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null
      };
    } catch {
      return { width: null, height: null };
    }
  };

  const { stableUrl, finalUrl } = buildProxiedImageUrl(img, block?.id);
  const fallbackUrl = stableUrl || img;

  const { width, height } = extractSizeFromUrl(stableUrl || img);

  const handleImageError = (event) => {
    const target = event.currentTarget;
    if (target.dataset.fallbackTried !== '1' && fallbackUrl) {
      target.dataset.fallbackTried = '1';
      target.src = fallbackUrl;
      return;
    }
    if (target.dataset.originalTried !== '1' && img) {
      target.dataset.originalTried = '1';
      target.src = img;
    }
  };

  return (
    <figure className="n-figure">
      <div
        className="n-imgWrap"
        style={{
          maxWidth: width ? `${width}px` : '100%',
          ...(height && { aspectRatio: width && height ? `${width}/${height}` : 'auto' })
        }}
      >
        <img
          src={finalUrl}
          alt={caption || ''}
          loading="lazy"
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onError={handleImageError}
          style={{
            width: '100%',
            height: 'auto',
            ...(width && { maxWidth: `${width}px` }),
            pointerEvents: 'none'
          }}
        />
      </div>
      {caption && <figcaption className="n-cap">{caption}</figcaption>}
    </figure>
  );
}

function Bullet({ children }) {
  return <li>{children}</li>;
}

function renderChildren(children = [], highlightColor, scrollRevealEnabled) {
  return (
    <BlockRenderer
      blocks={children}
      highlightColor={highlightColor}
      isNested={true}
      scrollRevealEnabled={scrollRevealEnabled}
    />
  );
}

function cloneRichTextWithContent(rt, content) {
  if (!rt) return null;
  const clone = { ...rt, plain_text: content };
  if (rt.text && typeof rt.text === 'object') {
    clone.text = { ...rt.text, content };
  }
  return clone;
}

function splitCircleCalloutRichText(richText = []) {
  if (!Array.isArray(richText) || !richText.length) {
    return { title: [], body: [] };
  }

  const [first, ...rest] = richText;
  const firstText = first?.plain_text || '';
  const newlineIndex = firstText.indexOf('\n');

  if (newlineIndex !== -1) {
    const titleContent = firstText.slice(0, newlineIndex).trim();
    const bodyContent = firstText.slice(newlineIndex + 1).trim();
    const titlePart = titleContent ? cloneRichTextWithContent(first, titleContent) : null;
    const bodyParts = [];

    if (bodyContent) {
      const bodyClone = cloneRichTextWithContent(first, bodyContent);
      if (bodyClone) bodyParts.push(bodyClone);
    }

    return {
      title: titlePart ? [titlePart] : [],
      body: [...bodyParts, ...rest]
    };
  }

  return {
    title: [first],
    body: rest
  };
}

function getBlockPlainText(block) {
  if (!block || !block.type) return '';
  const payload = block[block.type];
  if (!payload || typeof payload !== 'object') return '';

  const collect = [];
  if (Array.isArray(payload.rich_text)) collect.push(...payload.rich_text);
  if (Array.isArray(payload.title)) collect.push(...payload.title);
  if (Array.isArray(payload.caption)) collect.push(...payload.caption);

  return collect.map((segment) => segment?.plain_text || '').join('');
}

function ScrollReveal({ children, shareId, syncWithId }) {
  const ref = useRef(null);
  const revealedRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  const reveal = useCallback((reason = 'manual') => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setIsVisible(true);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ScrollReveal] reveal (${reason})`, ref.current);
    }
    if (shareId && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`scrollreveal:${shareId}`));
    }
  }, [shareId]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    if (typeof window === 'undefined') {
      reveal('ssr');
      return undefined;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      reveal('prefers-reduced-motion');
      return undefined;
    }

    const supportsIO = 'IntersectionObserver' in window;

    if (supportsIO) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal('observer');
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.2,
          rootMargin: '0px 0px -10%'
        }
      );

      observer.observe(element);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ScrollReveal] observe', element);
      }

      return () => observer.disconnect();
    }

    const handleVisibility = () => {
      if (revealedRef.current) return;
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const inView = rect.top <= viewportHeight * 0.9 && rect.bottom >= viewportHeight * -0.1;
      if (inView) {
        reveal('fallback');
      }
    };

    const scheduleCheck = () => {
      if (revealed) return;
      window.requestAnimationFrame(handleVisibility);
    };

    handleVisibility();
    window.addEventListener('scroll', scheduleCheck, { passive: true });
    window.addEventListener('resize', scheduleCheck, { passive: true });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[ScrollReveal] fallback-listeners', element);
    }

    return () => {
      window.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
    };
  }, [reveal]);

  useEffect(() => {
    if (!syncWithId || typeof window === 'undefined') return undefined;

    const handleSync = () => {
      reveal(`sync:${syncWithId}`);
    };

    window.addEventListener(`scrollreveal:${syncWithId}`, handleSync);
    return () => {
      window.removeEventListener(`scrollreveal:${syncWithId}`, handleSync);
    };
  }, [syncWithId, reveal]);

  return (
    <div
      ref={ref}
      className="scroll-transition-fade"
      data-scroll-reveal-id={shareId}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0px)' : 'translateY(40px)',
        transition: 'transform 1s ease-in-out, opacity 0.8s ease-in-out'
      }}
    >
      {children}
    </div>
  );
}

export default function BlockRenderer({
  blocks = [],
  highlightColor = '#00A1F3',
  isNested = false,
  scrollRevealEnabled = true
}) {
  const usedAnchorIds = new Set();

  const makeAnchorId = (raw, fallback) => {
    const base = String(raw || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const candidateBase = base || (fallback
      ? String(fallback)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      : '');

    if (!candidateBase) return null;

    let candidate = candidateBase;
    if (!/^[a-z]/.test(candidate)) {
      candidate = `section-${candidate}`;
    }

    let finalId = candidate;
    let counter = 1;
    while (usedAnchorIds.has(finalId)) {
      finalId = `${candidate}-${counter}`;
      counter += 1;
    }
    usedAnchorIds.add(finalId);
    return finalId;
  };

  let globalCss = '';
  let skipUntil = 0;

  if (!isNested && Array.isArray(blocks) && blocks.length) {
    const collectedStyles = [];
    const allowedLanguages = new Set(['', 'css', 'scss', 'less', 'plain text', 'plain_text', 'plaintext']);

    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (block?.type !== 'code') break;

      const language = (block.code?.language || '').toLowerCase();
      if (!allowedLanguages.has(language)) break;

      const codeText = (block.code?.rich_text || [])
        .map((t) => t.plain_text || '')
        .join('');

      if (codeText.trim()) {
        collectedStyles.push(codeText);
      }

      skipUntil = i + 1;
    }

    if (collectedStyles.length) {
      globalCss = collectedStyles.join('\n');
    } else {
      skipUntil = 0;
    }
  }
  useEffect(() => {
    // As-Is, To-Be 카드의 strong 요소 체크 및 클래스 추가
    const handleCardAlignment = () => {
      const asIsCards = document.querySelectorAll('.n-as-is-card');
      const toBeCards = document.querySelectorAll('.n-to-be-card');

      console.log('Found as-is cards:', asIsCards.length);
      console.log('Found to-be cards:', toBeCards.length);

      asIsCards.forEach(card => {
        const hasStrong = card.querySelector('strong');
        console.log('As-Is card has strong:', !!hasStrong);
        if (hasStrong) {
          card.classList.add('has-strong');
          card.style.setProperty('justify-content', 'flex-start', 'important');
          console.log('Added has-strong to as-is card');
        }
      });

      toBeCards.forEach(card => {
        const hasStrong = card.querySelector('strong');
        console.log('To-Be card has strong:', !!hasStrong);
        if (hasStrong) {
          card.classList.add('has-strong');
          card.style.setProperty('justify-content', 'flex-start', 'important');
          console.log('Added has-strong to to-be card');
        }
      });
    };

    const markCircleCardColumns = () => {
      const columnContainers = document.querySelectorAll('.n-cols');
      columnContainers.forEach(container => {
        if (container.querySelector('.n-circle-card')) {
          container.classList.add('has-circle-cards');
        } else {
          container.classList.remove('has-circle-cards');
        }
      });
    };

    // 이미지 로드 대기 및 콜럼 높이 맞춤 함수
    const adjustColumnHeights = async () => {
      const columnContainers = document.querySelectorAll('.n-cols');

      for (const container of columnContainers) {
        const columns = container.querySelectorAll('.n-col');
        if (columns.length > 1) {
          // 모든 이미지가 로드될 때까지 대기
          const allImages = container.querySelectorAll('.n-figure img');
          const imageLoadPromises = Array.from(allImages).map(img => {
            if (img.complete) {
              return Promise.resolve();
            }
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          });

          await Promise.all(imageLoadPromises);

          // 콜아웃 높이 맞춤
          columns.forEach(col => {
            const callouts = col.querySelectorAll('.n-as-is-card, .n-to-be-card, .n-callout, .n-step-arrow');
            callouts.forEach(callout => {
              callout.style.height = 'auto';
            });
          });

          let maxCalloutHeight = 0;
          columns.forEach(col => {
            const callouts = col.querySelectorAll('.n-as-is-card, .n-to-be-card, .n-callout, .n-step-arrow');
            callouts.forEach(callout => {
              maxCalloutHeight = Math.max(maxCalloutHeight, callout.offsetHeight);
            });
          });

          if (maxCalloutHeight > 0) {
            columns.forEach(col => {
              const callouts = col.querySelectorAll('.n-as-is-card, .n-to-be-card, .n-callout, .n-step-arrow');
              callouts.forEach(callout => {
                callout.style.height = maxCalloutHeight + 'px';
                // has-strong 클래스가 있는 카드는 상단 정렬 유지
                if (!callout.classList.contains('has-strong')) {
                  callout.style.justifyContent = 'center';
                }
              });
            });
          }

          // 이미지 높이 맞춤 (로드 완료 후)
          columns.forEach(col => {
            const images = col.querySelectorAll('.n-figure img');
            images.forEach(img => {
              img.style.height = 'auto';
              img.style.width = 'auto';
              img.style.maxWidth = '100%';
            });
          });

          let maxImageHeight = 0;
          columns.forEach(col => {
            const images = col.querySelectorAll('.n-figure img');
            images.forEach(img => {
              maxImageHeight = Math.max(maxImageHeight, img.offsetHeight);
            });
          });

          if (maxImageHeight > 0) {
            columns.forEach(col => {
              const images = col.querySelectorAll('.n-figure img');
              images.forEach(img => {
                // 원본 비율 계산
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                // 높이를 기준으로 너비 계산
                const newWidth = maxImageHeight * aspectRatio;

                img.style.height = maxImageHeight + 'px';
                img.style.width = newWidth + 'px';
                img.style.maxWidth = 'none';
                img.style.objectFit = 'contain';
              });
            });
          }
        }
      }
    };

    // 컴포넌트 마운트 후 높이 조정 및 카드 정렬 처리
    const timer = setTimeout(() => {
      handleCardAlignment();
      adjustColumnHeights();
      markCircleCardColumns();
    }, 100);

    // 윈도우 리사이즈 시에도 높이 재조정
    const handleResize = () => {
      handleCardAlignment();
      adjustColumnHeights();
      markCircleCardColumns();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [blocks]);


  const hasRenderableBlocks = Array.isArray(blocks) && blocks.length > skipUntil;

  if (!hasRenderableBlocks) {
    return globalCss ? <style dangerouslySetInnerHTML={{ __html: globalCss }} /> : null;
  }

  let lastRevealId = null;

  return (
    <div className={`n-content ${!isNested ? 'n-content-root' : ''}`}>
      {globalCss ? <style dangerouslySetInnerHTML={{ __html: globalCss }} /> : null}
      {blocks.map((b, index) => {
        if (index < skipUntil) return null;
        let syncWithPrevious = false;
        const t = b.type;

        const rendered = (() => {
          switch (t) {
          // ===== 헤딩/문단 =====
          case 'heading_1':
            return (
              <h1 key={b.id} className="n-h1">
                <Text rich_text={b.heading_1?.rich_text} />
              </h1>
            );

          case 'heading_2':
            return (
              <h2 key={b.id} className="n-h2">
                <Text rich_text={b.heading_2?.rich_text} />
              </h2>
            );

          case 'heading_3':
            return (
              <h3 key={b.id} className="n-h3">
                <Text rich_text={b.heading_3?.rich_text} />
              </h3>
            );

          case 'paragraph': {
            const empty = !(b.paragraph?.rich_text?.length);
            const isLast = index === blocks.length - 1;
            if (empty) return <p key={b.id} className={`n-p n-p--empty ${isLast ? 'n-p--empty-last' : ''}`} />;
            return (
              <p key={b.id} className="n-p">
                <Text rich_text={b.paragraph?.rich_text} />
              </p>
            );
          }

          // ===== 리스트 =====
          case 'bulleted_list_item':
            return (
              <ul key={b.id} className="n-ul">
                <Bullet>
                  <Text rich_text={b.bulleted_list_item?.rich_text} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </Bullet>
              </ul>
            );

          case 'numbered_list_item':
            return (
              <ol key={b.id} className="n-ol">
                <li>
                  <Text rich_text={b.numbered_list_item?.rich_text} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </li>
              </ol>
            );

          // ===== 이미지 =====
          case 'image':
            return <FigureImage key={b.id} block={b} />;

          // ===== 비디오 =====
          case 'video': {
            const videoUrl =
              b.video?.file?.url ||
              b.video?.external?.url ||
              '';

            if (!videoUrl) return null;

            // YouTube URL 처리
            if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
              let embedUrl = videoUrl;
              if (videoUrl.includes('watch?v=')) {
                const videoId = videoUrl.split('watch?v=')[1]?.split('&')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              } else if (videoUrl.includes('youtu.be/')) {
                const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              }

              return (
                <div key={b.id} className="n-embed">
                  <iframe
                    src={embedUrl}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              );
            }

            // 기타 비디오 (HTML5 video 태그)
            const { finalUrl: proxiedUrl, stableUrl: notionStableUrl } = buildProxiedFileUrl(videoUrl, b.id);
            const resolvedVideoUrl = proxiedUrl || notionStableUrl || videoUrl;

            const guessMimeType = () => {
              const mimeFromNotion = b.video?.file?.mime_type;
              if (mimeFromNotion) return mimeFromNotion;
              try {
                const urlObj = new URL(videoUrl);
                const pathname = urlObj.pathname || '';
                const ext = pathname.split('.').pop()?.toLowerCase();
                if (!ext) return undefined;
                if (ext === 'mp4') return 'video/mp4';
                if (ext === 'webm') return 'video/webm';
                if (ext === 'ogg' || ext === 'ogv') return 'video/ogg';
              } catch (_) {
                const ext = videoUrl.split('?')[0]?.split('.').pop()?.toLowerCase();
                if (ext === 'mp4') return 'video/mp4';
                if (ext === 'webm') return 'video/webm';
                if (ext === 'ogg' || ext === 'ogv') return 'video/ogg';
              }
              return undefined;
            };

            const mimeType = guessMimeType();

            return (
              <div key={b.id} className="n-video">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  autoPlay
                  muted
                  loop
                >
                  <source src={resolvedVideoUrl} {...(mimeType ? { type: mimeType } : {})} />
                  {resolvedVideoUrl !== videoUrl ? (
                    <source src={videoUrl} {...(mimeType ? { type: mimeType } : {})} />
                  ) : null}
                  Your browser does not support the video tag.
                </video>
              </div>
            );
          }

          // ===== 임베드 (동영상 등) =====
          case 'embed': {
            const url = b.embed?.url;
            if (!url) return null;

            // YouTube 임베드 최적화
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              let embedUrl = url;
              if (url.includes('watch?v=')) {
                const videoId = url.split('watch?v=')[1]?.split('&')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              } else if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              }

              return (
                <div key={b.id} className="n-embed">
                  <iframe
                    src={embedUrl}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              );
            }

            // Vimeo 임베드 최적화
            if (url.includes('vimeo.com')) {
              let embedUrl = url;
              const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
              if (vimeoMatch) {
                embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
              }

              return (
                <div key={b.id} className="n-embed">
                  <iframe
                    src={embedUrl}
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              );
            }

            // 기타 임베드
            return (
              <div key={b.id} className="n-embed">
                <iframe
                  src={url}
                  frameBorder="0"
                  loading="lazy"
                />
              </div>
            );
          }

          // ===== 북마크 =====
          case 'bookmark': {
            const url = b.bookmark?.url;
            if (!url) return null;

            // YouTube 북마크 처리
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              let embedUrl = url;
              if (url.includes('watch?v=')) {
                const videoId = url.split('watch?v=')[1]?.split('&')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              } else if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              }

              return (
                <div key={b.id} className="n-embed">
                  <iframe
                    src={embedUrl}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              );
            }

            // Vimeo 북마크 처리
            if (url.includes('vimeo.com')) {
              let embedUrl = url;
              const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
              if (vimeoMatch) {
                embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
              }

              return (
                <div key={b.id} className="n-embed">
                  <iframe
                    src={embedUrl}
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              );
            }

            // 기타 북마크는 링크로 표시
            const title = b.bookmark?.caption?.[0]?.plain_text || url;
            return (
              <div key={b.id} className="n-bookmark">
                <a href={url} target="_blank" rel="noreferrer">
                  {title}
                </a>
              </div>
            );
          }

          // ===== 토글 =====
          case 'toggle': {
            const toggleId = `toggle-${b.id}`;
            return (
              <details key={b.id} className="n-toggle">
                <summary className="n-toggle-summary">
                  <Text rich_text={b.toggle?.rich_text} />
                </summary>
                <div className="n-toggle-content">
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              </details>
            );
          }

          // ===== 구분선/인용 =====
          case 'divider':
            return <hr key={b.id} className="n-hr" />;

          case 'quote':
            return (
              <blockquote key={b.id} className="n-quote">
                <Text rich_text={b.quote?.rich_text} />
              </blockquote>
            );

          case 'code': {
            const codeText = (b.code?.rich_text || []).map((t) => t.plain_text || '').join('');
            const language = (b.code?.language || '').trim();
            return (
              <div key={b.id} className="n-code" {...(language ? { 'data-lang': language } : {})}>
                <pre>
                  <code>{codeText}</code>
                </pre>
              </div>
            );
          }

          // ===== 콜아웃 =====
          case 'callout': {
            const icon = b.callout?.icon?.emoji || '💡';

            // rich_text에서 첫 번째 텍스트도 확인 (아이콘이 텍스트로 들어있을 수 있음)
            const firstText = (b.callout?.rich_text?.[0]?.plain_text || '').trim();
            const iconText = icon === '💡' ? firstText : icon;
            const iconTextLower = (iconText || '').trim().toLowerCase();

            // 반응형 조건부 렌더링: #desktop, #mobile 아이콘 처리
            if (iconText === '#Desktop' || iconText === '#desktop') {
              // #Desktop 텍스트 제거
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#Desktop' && text !== '#desktop';
              }) || [];

              return (
                <div key={b.id} className="n-desktop-only">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            if (iconText === '#Mobile' || iconText === '#mobile') {
              // #Mobile 텍스트 제거
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#Mobile' && text !== '#mobile';
              }) || [];

              return (
                <div key={b.id} className="n-mobile-only">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #As-Is callout 처리
            if (iconText === '#As-Is' || iconText === '#as-is') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#As-Is' && text !== '#as-is';
              }) || [];

              return (
                <div key={b.id} className="n-as-is-card">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #To-Be callout 처리 (overview highlight 색상 사용)
            if (iconText === '#To-Be' || iconText === '#to-be') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#To-Be' && text !== '#to-be';
              }) || [];

              return (
                <div key={b.id} className="n-to-be-card" style={{ '--highlight-color': highlightColor }}>
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #small callout 처리 (이미지 크기 400px 제한)
            if (iconText === '#small' || iconText === '#Small') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#small' && text !== '#Small';
              }) || [];
              const anchorSource = filteredText.map((t) => t.plain_text || '').join(' ').trim();
              const anchorId = anchorSource ? makeAnchorId(anchorSource, b.id) : null;

              return (
                <div key={b.id} id={anchorId || undefined} className="n-small-image">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #medium callout 처리 (이미지 크기 640px 제한)
            if (iconText === '#medium' || iconText === '#Medium') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#medium' && text !== '#Medium';
              }) || [];
              const anchorSource = filteredText.map((t) => t.plain_text || '').join(' ').trim();
              const anchorId = anchorSource ? makeAnchorId(anchorSource, b.id) : null;

              return (
                <div key={b.id} id={anchorId || undefined} className="n-medium-image">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #scrollAnchor callout 처리 (화면에 노출되지 않는 앵커)
            if (iconTextLower === '#scrollanchor') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#scrollAnchor' && text !== '#scrollanchor';
              }) || [];
              const anchorSource = filteredText.map((t) => t.plain_text || '').join(' ').trim();
              const anchorId = makeAnchorId(anchorSource, b.id);

              return (
                <div key={b.id} className="n-scroll-anchor">
                  <div
                    id={anchorId || undefined}
                    className="n-scroll-anchor__marker"
                    aria-hidden="true"
                  />
                  {filteredText.length ? (
                    <div className="n-scroll-anchor__label">
                      <Text rich_text={filteredText} />
                    </div>
                  ) : null}
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #gradient-bottom-md callout 처리 (이전 콘텐츠 하단에 그라데이션 오버레이 - 중간 크기)
            if (iconText === '#gradient-bottom-md' || iconText === '#Gradient-Bottom-Md') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#gradient-bottom-md' && text !== '#Gradient-Bottom-Md';
              }) || [];

              syncWithPrevious = true;
              return (
                <div key={b.id} className="n-gradient-bottom-md">
                </div>
              );
            }

            // #gradient-bottom-sm callout 처리 (이전 콘텐츠 하단에 그라데이션 오버레이 - 작은 크기)
            if (iconText === '#gradient-bottom-sm' || iconText === '#Gradient-Bottom-Sm') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#gradient-bottom-sm' && text !== '#Gradient-Bottom-Sm';
              }) || [];

              syncWithPrevious = true;
              return (
                <div key={b.id} className="n-gradient-bottom-sm">
                </div>
              );
            }

            // #gradient-bottom-md-full callout 처리 (이전 콘텐츠 하단에 그라데이션 오버레이 - 중간 크기, 전체 너비)
            if (iconText === '#gradient-bottom-md-full' || iconText === '#Gradient-Bottom-Md-Full') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#gradient-bottom-md-full' && text !== '#Gradient-Bottom-Md-Full';
              }) || [];

              syncWithPrevious = true;
              return (
                <div key={b.id} className="n-gradient-bottom-md-full">
                </div>
              );
            }

            // #gradient-bottom-sm-full callout 처리 (이전 콘텐츠 하단에 그라데이션 오버레이 - 작은 크기, 전체 너비)
            if (iconText === '#gradient-bottom-sm-full' || iconText === '#Gradient-Bottom-Sm-Full') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#gradient-bottom-sm-full' && text !== '#Gradient-Bottom-Sm-Full';
              }) || [];

              syncWithPrevious = true;
              return (
                <div key={b.id} className="n-gradient-bottom-sm-full">
                </div>
              );
            }

            if (iconTextLower === '#prototypedesktopfix') {
              const filteredText = (b.callout?.rich_text || []).filter((segment) => {
                const text = (segment?.plain_text || '').trim().toLowerCase();
                return text !== '#prototypedesktopfix';
              });

              const embedBlocks = (b.children || []).filter(child => child.type === 'embed');
              const remainingChildren = (b.children || []).filter(child => child.type !== 'embed');

              const hasExtraContent = filteredText.length || remainingChildren.length;

              return (
                <PrototypeDesktopFix key={b.id} id={b.id} embeds={embedBlocks}>
                  {hasExtraContent ? (
                    <>
                      {filteredText.length ? (
                        <p className="prototype-callout__text">
                          <Text rich_text={filteredText} />
                        </p>
                      ) : null}
                      {remainingChildren.length ? renderChildren(remainingChildren, highlightColor, scrollRevealEnabled) : null}
                    </>
                  ) : null}
                </PrototypeDesktopFix>
              );
            }

            if (iconTextLower === '#prototypedesktop') {
              const filteredText = (b.callout?.rich_text || []).filter((segment) => {
                const text = (segment?.plain_text || '').trim().toLowerCase();
                return text !== '#prototypedesktop';
              });

              return (
                <div key={b.id} className="n-callout">
                  <span className="n-callout-ico" aria-hidden>{icon}</span>
                  <div className="n-callout-body">
                    <Text rich_text={filteredText} />
                    {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                  </div>
                </div>
              );
            }

            if (iconText === '#Showcase' || iconText === '#showcase') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#Showcase' && text !== '#showcase';
              }) || [];

              const images = (b.children || []).filter(child => child.type === 'image');
              const nonImageChildren = (b.children || []).filter(child => child.type !== 'image');

              const showcaseLines = [];
              const remainingChildren = [];
              let pendingMarker = null;

              nonImageChildren.forEach(child => {
                const rawText = getBlockPlainText(child);
                const text = (rawText || '').trim();

                if (!text) {
                  remainingChildren.push(child);
                  pendingMarker = null;
                  return;
                }

                const markerMatch = text.match(/^#(title|desc)/i);
                if (markerMatch) {
                  showcaseLines.push(text);
                  pendingMarker = markerMatch[1];
                  return;
                }

                if (pendingMarker && /^\s*[({]/.test(text)) {
                  showcaseLines.push(text);
                  return;
                }

                pendingMarker = null;
                remainingChildren.push(child);
              });

              const combinedRichText = [
                ...filteredText,
                ...showcaseLines.map(line => ({ plain_text: line }))
              ];

              return (
                <ShowcaseCallout
                  key={b.id}
                  id={b.id}
                  richText={combinedRichText}
                  images={images}
                >
                  {remainingChildren.length ? renderChildren(remainingChildren, highlightColor, scrollRevealEnabled) : null}
                </ShowcaseCallout>
              );
            }

            // #slide callout 처리 (이미지 캐러셀)
            if (iconText === '#slide' || iconText === '#Slide') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#slide' && text !== '#Slide';
              }) || [];

              // children에서 이미지들 추출
              const images = (b.children || []).filter(child => child.type === 'image');

              return (
                <SlideCarousel
                  key={b.id}
                  id={b.id}
                  text={filteredText}
                  images={images}
                />
              );
            }

            // #stepArrow callout 처리 (단계 화살표)
            if (iconText === '#stepArrow' || iconText === '#StepArrow') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#stepArrow' && text !== '#StepArrow';
              }) || [];

              return (
                <div key={b.id} className="n-step-arrow">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                  <svg width="20" height="40" viewBox="0 0 20 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="step-arrow-svg">
                    <path d="M2 30L10 38L18 30" stroke={highlightColor || '#00A1F3'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path opacity="0.5" d="M2 16L10 24L18 16" stroke={highlightColor || '#00A1F3'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path opacity="0.2" d="M2 2L10 10L18 2" stroke={highlightColor || '#00A1F3'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              );
            }

            // #fullbleed callout 처리 (전체 화면 너비 이미지)
            if (iconText === '#fullbleed' || iconText === '#Fullbleed') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#fullbleed' && text !== '#Fullbleed';
              }) || [];

              return (
                <div key={b.id} className="n-fullbleed">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #headline-text-lg callout 처리 (대형 헤드라인 텍스트)
            if (iconText === '#headline-text-lg' || iconText === '#Headline-Text-Lg') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#headline-text-lg' && text !== '#Headline-Text-Lg';
              }) || [];

              return (
                <div key={b.id} className="n-headline-text-lg">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #FullBleedDivider callout 처리 (전체 폭 구분선 컴포넌트 렌더)
            if (iconText === '#FullBleedDivider' || iconText === '#fullbleeddivider') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#FullBleedDivider' && text !== '#fullbleeddivider';
              }) || [];

              const configString = filteredText
                .map(t => (t.plain_text || '').trim())
                .join(' ');

              const dividerProps = {};

              configString
                .split(/\s+/)
                .filter(Boolean)
                .forEach(token => {
                  const [rawKey, rawValue] = token.split('=');
                  if (!rawKey || !rawValue) return;

                  const key = rawKey.trim();
                  const value = rawValue.trim();

                  if (key === 'color') {
                    dividerProps.color = value;
                    return;
                  }

                  if (['top', 'bottom', 'height'].includes(key)) {
                    const parsed = parseInt(value, 10);
                    if (!Number.isNaN(parsed)) {
                      dividerProps[key] = parsed;
                    }
                  }
                });

              return <FullBleedDivider key={b.id} {...dividerProps} />;
            }

            // #margin-bottom-120 callout 처리 (하단 여백 120px)
            if (iconText === '#margin-bottom-120' || iconText === '#Margin-Bottom-120') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#margin-bottom-120' && text !== '#Margin-Bottom-120';
              }) || [];

              return (
                <div key={b.id} className="n-margin-bottom-120">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }

            // #linkBlock callout 처리 (DownloadBlock 스타일의 링크 블록)
            if (iconText === '#linkBlock' || iconText === '#LinkBlock') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#linkBlock' && text !== '#LinkBlock';
              }) || [];

              // 첫 번째 링크 찾기
              const linkItem = filteredText.find(t => t.href);
              const linkUrl = linkItem?.href || '#';
              const linkText = linkItem?.plain_text || 'Link';

              return (
                <div key={b.id} className="n-link-block">
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="link-block-item">
                    <div className="left">
                      <p className="title">{linkText}</p>
                    </div>
                    <div className="icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        width="24"
                        height="24"
                        fill="#fff"
                      >
                        <path d="M4 0V2H16.59L0 18.59L1.41 20L18 3.41V16H20V0H4Z" />
                      </svg>
                    </div>
                  </a>
                </div>
              );
            }

            // 일반 콜아웃
            return (
              <div key={b.id} className="n-callout">
                <span className="n-callout-ico" aria-hidden>{icon}</span>
                <div className="n-callout-body">
                  <Text rich_text={b.callout?.rich_text} />
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              </div>
            );
          }

          // ====== ★★ COLUMN SUPPORT ★★ ======
          case 'column_list': {
            // column_list 의 children 들이 각각 "column" 블록
            const cols = (b.children || []).filter((c) => c.type === 'column');
            if (!cols.length) return null;

            const columnMeta = cols.map((col) => {
              const rawChildren = Array.isArray(col.children) ? col.children : [];
              let weight = 1;
              let filteredChildren = rawChildren;

              if (rawChildren.length) {
                const directiveBlock = rawChildren[0];
                const directiveText = (getBlockPlainText(directiveBlock) || '').trim();
                const match = directiveText.match(/^#col-(\d+(?:\.\d+)?)$/i);

                if (match) {
                  const parsed = parseFloat(match[1]);
                  weight = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                  filteredChildren = rawChildren.slice(1);
                }
              }

              return {
                id: col.id,
                weight,
                children: filteredChildren
              };
            });

            const hasWeightedCols = columnMeta.some((meta) => meta.weight !== 1);
            const gridTemplateColumns = hasWeightedCols
              ? columnMeta.map((meta) => `${meta.weight}fr`).join(' ')
              : undefined;

            return (
              <div
                key={b.id}
                className="n-cols"
                data-cols={columnMeta.length}
                data-has-custom-grid={hasWeightedCols ? '1' : undefined}
                style={gridTemplateColumns ? { '--n-cols-template': gridTemplateColumns } : undefined}
              >
                {columnMeta.map((meta) => (
                  <div key={meta.id} className="n-col" data-col-weight={meta.weight}>
                    {meta.children?.length ? renderChildren(meta.children, highlightColor, scrollRevealEnabled) : null}
                  </div>
                ))}
              </div>
            );
          }

          // 혹시 column 단독이 루트에 올라왔을 때(예외)도 처리
          case 'column':
            return (
              <div key={b.id} className="n-cols">
                <div className="n-col">
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              </div>
            );

          // ===== 동기화 블록 =====
          case 'synced_block': {
            // 원본 블록인 경우 children 렌더링
            if (b.synced_block && !b.synced_block.synced_from) {
              return (
                <div key={b.id} className="n-synced">
                  {b.children?.length ? renderChildren(b.children, highlightColor, scrollRevealEnabled) : null}
                </div>
              );
            }
            // 참조 블록인 경우 - API 제약으로 내용 없음
            return (
              <div key={b.id} className="n-synced-ref">
                <p>🔗 동기화된 콘텐츠 (원본 블록 참조)</p>
              </div>
            );
          }

          default:
            return null;
          }
        })();

        if (!rendered) return null;

        const scrollId = b.id || `idx-${index}`;

        if (!scrollRevealEnabled) {
          if (!syncWithPrevious) {
            lastRevealId = scrollId;
          }
          return rendered;
        }

        const syncTargetId = syncWithPrevious && lastRevealId ? lastRevealId : undefined;
        const node = (
          <ScrollReveal
            key={scrollId}
            shareId={scrollId}
            syncWithId={syncTargetId}
          >
            {rendered}
          </ScrollReveal>
        );

        if (!syncWithPrevious) {
          lastRevealId = scrollId;
        }

        return node;
      })}

      {/* 스타일 */}
      <style jsx global>{`
        
        .n-content {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        .n-content-root {
          margin: 120px 0 0px;
        }
        .n-p { font-size: 14px; font-family: "Bricolage Grotesque", Pretendard, sans-serif; color:#e5e5e5; line-height:1.8; margin: 0px 0 12px; }
        .n-p--empty { height: .75rem; }
        .n-p--empty-last { height: 0; }
        .n-h1,.n-h2 { color:#fff; margin: 80px 0 20px; line-height:1.35; }
        .n-h3 { color:#fff; margin: 40px 0 20px; line-height:1.35; }
        .n-h1 { font-size: 32px; font-weight:600; }
        .n-h2 { font-size: 24px; font-weight:600; }
        .n-h3 { font-size: 18px; font-weight:600; }

        .n-ul, .n-ol { margin: 8px 0 16px 20px; color:#cfcfcf; }
        .n-ul li { list-style: disc; margin: 6px 0; }
        .n-ol li { list-style: decimal; margin: 6px 0; }

        .n-hr { border: 0; border-top:1px solid rgba(255,255,255,.08); margin: 32px 0; }
        .n-quote {
          margin: 16px 0; padding: 12px 16px;
          border-left: 3px solid rgba(255,255,255,.18);
          color:#cfcfcf; font-style: italic;
          background: rgba(255,255,255,.03); border-radius: 8px;
        }

        .n-code {
          position: relative;
          margin: 24px 0;
          padding: 20px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          overflow: hidden;
        }
        .n-code[data-lang]::before {
          content: attr(data-lang);
          position: absolute;
          top: 12px;
          right: 16px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }
        .n-code pre {
          margin: 0;
          font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          line-height: 1.75;
          color: #f3f4f6;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-x: auto;
        }
        .n-code code {
          font-family: inherit;
          font-size: inherit;
        }

        .n-callout {
          display:flex; gap:12px; align-items:flex-start;
          background: rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.06);
          padding:16px 20px 16px 20px; border-radius: 12px; margin: 16px 0;
        }
        .n-callout:has(strong) {
          align-items: flex-start;
        }
        .n-callout-ico { font-size:20px; line-height:1; }
        .n-callout-body p { font-size:14px; line-height:1.6; color:#e5e5e5; margin: 4px 0; }

        /* 반응형 조건부 렌더링 */
        .n-desktop-only { display: block; }
        .n-mobile-only { display: none; }

        @media (max-width: 600px) {
          .n-desktop-only { display: none; }
          .n-mobile-only { display: block; }
        }

        /* As-Is / To-Be 카드 스타일 */
        .n-as-is-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          gap: 8px;
          min-height: 144px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          text-align: center;
        }
        .n-as-is-card.has-strong {
          justify-content: flex-start !important;
        }
        .n-as-is-card p {
          font-family: 'Pretendard', sans-serif;
          font-weight: 400;
          font-size: 12px;
          line-height: 150%;
          color: #F9FBFB;
          margin: 0;
        }
          .n-as-is-card p strong {
          font-family: 'Pretendard', sans-serif;
          font-weight: 600;
          font-size: 12px;
          line-height: 150%;
          color: #F9FBFB;
          margin-bottom: 6px;
          display: block;
        }

        .n-to-be-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          gap: 8px;

          min-height: 144px;
          background: var(--highlight-color, #00A1F3);
          border: 1px solid rgba(0, 161, 243, 0.2);
          border-radius: 12px;
          text-align: center;
        }
        .n-to-be-card.has-strong {
          justify-content: flex-start !important;
        }
        .n-to-be-card p {
          font-family: 'Pretendard', sans-serif;
          font-weight: 400;
          font-size: 12px;
          line-height: 150%;
          color: #Ffffff;
          margin: 0;
        }
        .n-to-be-card p strong {
          font-family: 'Pretendard', sans-serif;
          font-weight: 600;
          font-size: 12px;
          line-height: 150%;
          color: #Ffffff;
          margin-bottom: 6px;
          display: block;
        }

        /* Step Arrow 스타일 */
        .n-step-arrow {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 32px 0;
          padding: 0;
        }

        .step-arrow-svg {
          margin-top: 16px;
          flex-shrink: 0;
        }

        /* Fullbleed 스타일 */
        .n-fullbleed {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          margin-top: 32px;
        }

        .n-fullbleed .n-figure,
        .n-fullbleed .n-imgWrap,
        .n-fullbleed img,
        .n-fullbleed .n-video,
        .n-fullbleed video {
          max-width: 100vw !important;
          width: 100vw !important;
          margin: 0 !important;
          border-radius: 0 !important;
        }

        .n-fullbleed .n-figure img,
        .n-fullbleed img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
        }

        /* Margin Bottom 120px 스타일 */
        .n-margin-bottom-120 {
          margin-bottom: 120px;
        }

        /* Link Block 스타일 (DownloadBlock과 동일) */
        .n-link-block {
          margin: 24px 0;
        }

        .link-block-item {
          -webkit-text-size-adjust: 100%;
          -webkit-tap-highlight-color: transparent;
          -webkit-font-smoothing: antialiased;
          font-synthesis: none;

          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 12px;
          position: relative;

          width: 100%;
          padding: 32px 40px 28px;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          border-radius: 16px;

          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
        }

        .link-block-item:hover {
          background: rgba(144, 163, 255, 0.2);
          border: 0px solid rgba(144, 163, 255, 0.5);
          transform: translateY(-2px);
        }

        .link-block-item .left {
          flex: 1;
          display: grid;
          gap: 4px;
        }

        .link-block-item .title {
          font-family: var(--default-font-family, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .link-block-item .icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 600px) {
          .link-block-item {
            padding: 24px 20px;
          }
          .link-block-item .title {
            font-size: 16px;
          }
        }

        /* Small image 제한 */
        .n-small-image .n-figure {
          max-width: 400px;
          margin: 0px auto;
        }
        .n-small-image .n-imgWrap {
          max-width: 400px;
        }
        .n-small-image img {
          max-width: 400px !important;
          width: 100%;
          height: auto;
        }

        /* Medium image 제한 */
        .n-medium-image .n-figure {
          max-width: 640px;
          margin: 0px auto;
        }
        .n-medium-image .n-imgWrap {
          max-width: 640px;
        }
        .n-medium-image img {
          max-width: 640px !important;
          width: 100%;
          height: auto;
        }

        .n-scroll-anchor {
          position: relative;
          display: block;
        }
        .n-scroll-anchor__marker {
          position: relative;
          display: block;
          width: 100%;
          height: 0;
          margin: 0;
          padding: 0;
          scroll-margin-top: 120px;
          pointer-events: none;
        }
        .n-scroll-anchor__label {
          margin: 0 0 12px 0;
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
        }

        /* Gradient bottom overlay - medium size (400px) */
        .n-gradient-bottom-md {
          position: relative;
          height: 400px;
          margin: -400px 0 0;
          width: 100%;
          pointer-events: none;
          z-index: 5;
          background: linear-gradient(180deg, rgba(30, 30, 30, 0) 0%, #26282C 90%);
          overflow: hidden;
        }
        .n-gradient-bottom-md::before {
          content: '';
          position: absolute;
          inset: 0;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          pointer-events: none;
        }
        /* Gradient bottom overlay - small size (200px) */
        .n-gradient-bottom-sm {
          position: relative;
          height: 200px;
          margin: -200px 0 0;
          width: 100%;
          pointer-events: none;
          z-index: 5;
          background: linear-gradient(180deg, rgba(30, 30, 30, 0) 0%, #26282C 90%);
          overflow: hidden;
        }
        .n-gradient-bottom-sm::before {
          content: '';
          position: absolute;
          inset: 0;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          pointer-events: none;
        }

        /* Gradient bottom overlay - medium size full width (400px) */
        .n-gradient-bottom-md-full {
          position: relative;
          height: 400px;
          margin: -400px 0 0;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          pointer-events: none;
          z-index: 5;
          background: linear-gradient(180deg, rgba(30, 30, 30, 0) 0%, #26282C 90%);
          overflow: hidden;
        }
        .n-gradient-bottom-md-full::before {
          content: '';
          position: absolute;
          inset: 0;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          pointer-events: none;
        }

        /* Gradient bottom overlay - small size full width (200px) */
        .n-gradient-bottom-sm-full {
          position: relative;
          height: 200px;
          margin: -200px 0 0;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          pointer-events: none;
          z-index: 5;
          background: linear-gradient(180deg, rgba(30, 30, 30, 0) 0%, #26282C 90%);
          overflow: hidden;
        }
        .n-gradient-bottom-sm-full::before {
          content: '';
          position: absolute;
          inset: 0;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 90%);
          pointer-events: none;
        }

        .n-headline-text-lg {
          font-weight: 200;
          font-size: 80px;
          line-height: 140%;
          color: #FFFFFF;
          margin: 40px 0;
        }

        @media (max-width: 600px) {
          .n-headline-text-lg {
            font-size: 48px;
            line-height: 130%;
          }
        }

        /* Circle cards (border & fill variants) */
        .n-circle-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0;
          gap: 20px;
          width: 280px;
          height: 280px;
          border-radius: 2000px;
          margin: 0 auto;
          color: var(--circle-color, #E60012);
          text-align: center;
          flex: none;
          flex-shrink: 0;
        }
          
        .n-circle-card--border {
          border: 2px solid var(--circle-color, #E60012);
          background: transparent;
        }

        .n-circle-card--fill {
          background: var(--circle-color, rgba(230, 0, 18, 0.8));
          color: #FFFFFF;
          gap: 16px;
          position: relative;
        }

        .n-circle-card.has-strong {
          justify-content: flex-start !important;
        }
        .n-circle-card p {
          font-weight: 400;
          font-size: 14px;
          line-height: 150%;
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;

        }
          .n-circle-card p strong {
          font-weight: 600;
          font-size: 16px;
          line-height: 150%;
          margin-bottom: 6px;
          display: block;
        }

        .n-cols.has-circle-cards {
          gap: 0;
          justify-items: center;
          justify-content: center;
          max-width: 760px;
          width: 100%;
          margin: 0 auto;
        }
        .n-cols.has-circle-cards .n-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .n-cols.has-circle-cards .n-circle-card {
          margin: 0 -64px;
        }
        @media (max-width: 600px) {
          .n-cols.has-circle-cards {
            gap: 16px;
          }
          .n-cols.has-circle-cards .n-col {
            justify-content: center;
          }
          .n-cols.has-circle-cards .n-circle-card {
            margin: 0 auto;
          }
          .n-cols[data-cols="2"] .n-circle-card,
          .n-cols[data-cols="3"] .n-circle-card {
            padding: 12px;
            gap: 12px;
          }
          .n-cols[data-cols="2"] .n-circle-card {
            width: min(220px, calc((100vw - 48px) / 2));
            height: min(220px, calc((100vw - 48px) / 2));
          }
          .n-cols[data-cols="3"] .n-circle-card {
            width: min(200px, calc((100vw - 72px) / 3));
            height: min(200px, calc((100vw - 72px) / 3));
          }
          .n-cols[data-cols="2"] .n-circle-card p,
          .n-cols[data-cols="3"] .n-circle-card p {
            font-size: 12px;
          }
          .n-cols[data-cols="2"] .n-circle-card p strong,
          .n-cols[data-cols="3"] .n-circle-card p strong {
            font-size: 13px;
          }
        }


        /* ==== 이미지(썸네일) : 여백 제거 + 라운드 + 확대 hover ==== */
        .n-figure { margin: 0; }
        .n-figure .n-imgWrap {
          border-radius: 0px;
          overflow: hidden;              /* radius가 확실히 적용되도록 */
          
        }

        /* ==== 임베드 (동영상 등) ==== */
        .n-embed {
          margin: 24px 0;
          position: relative;
          width: 100%;
          height: 0;
          padding-bottom: 56.25%; /* 16:9 비율 */
          border-radius: 12px;
          overflow: hidden;
          background: #111;
        }
        .n-embed iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* ==== 비디오 (HTML5) ==== */
        .n-video {
          margin: 24px 0;
          border-radius: 0px;
          overflow: hidden;
          background: #111;
          position: relative;
        }
        .n-video video {
          border-radius: 0px;
          width: 100%;
          max-width: 100%;
          height: auto;
          display: block;
        }
        .n-video::after {
          content: '';
          position: absolute;
          inset: 0;
          border: 2px solid #26282C;
          border-radius: inherit;
          pointer-events: none;
          box-sizing: border-box;
        }

        /* ==== 동기화 블록 ==== */
        .n-synced {
          margin: 16px 0;
        }
        .n-synced-ref {
          margin: 16px 0;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.6);
          font-style: italic;
        }
        .n-synced-ref p {
          margin: 0;
          font-size: 14px;
        }

        /* ==== 북마크 ==== */
        .n-bookmark {
          margin: 16px 0;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .n-bookmark a {
          color: #a5b4fc;
          text-decoration: none;
          font-size: 14px;
        }
        .n-bookmark a:hover {
          text-decoration: underline;
        }

        /* ==== 토글 ==== */
        .n-toggle {
          margin: 12px 0;
          border: none;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
        }
        .n-toggle-summary {
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          color: #e5e5e5;
          list-style: none;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          transition: background 0.2s ease;
          position: relative;
        }
        .n-toggle-summary:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .n-toggle-summary::-webkit-details-marker {
          display: none;
        }
        .n-toggle-summary::before {
          content: "";
          position: absolute;
          left: 12px;
          transform: translateX(-100%);
          transition: transform 0.2s ease;
          width: 10px;
          height: 16px;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='16' viewBox='0 0 10 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.5 1L8.5 8L1.5 15' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
        }
        .n-toggle[open] .n-toggle-summary::before {
          transform: translateX(-100%) rotate(90deg);
        }
        .n-toggle-content {
          padding: 12px;
        }
        .n-toggle-content .n-content {
          margin: 0;
        }
        .n-figure img {
          display:block;
          width:100%;
          height:auto;
          object-fit: cover;
        }
        .n-figure .n-cap {
          font-size: 14px;
          color:#9aa0a6;
          margin-top: 12px;
          line-height: 1.5;
          text-align: center;
        }

        /* ==== 동적 컬럼: 화면 크기에 따른 반응형 ==== */
        .n-cols {
          display: grid;
          gap: 16px;
          margin: 0;
          grid-template-columns: var(--n-cols-template, 1fr);
        }

        .n-cols[data-has-custom-grid="1"] {
          grid-template-columns: var(--n-cols-template, 1fr) !important;
        }

        /* 2열 */
        .n-cols[data-cols="2"] {
          --n-cols-template: 1fr 1fr;
          align-items: start;
        }

        /* 3열 */
        .n-cols[data-cols="3"] {
          --n-cols-template: 1fr 1fr 1fr;
          align-items: start;
        }

        /* 4열 */
        .n-cols[data-cols="4"] {
          --n-cols-template: 1fr 1fr 1fr 1fr;
          align-items: start;
        }

        /* 5열 이상도 지원 */
        .n-cols[data-cols="5"] {
          --n-cols-template: repeat(5, 1fr);
          align-items: start;
        }
        .n-cols[data-cols="6"] {
          --n-cols-template: repeat(6, 1fr);
          align-items: start;
        }

        /* 모바일에서 1열로 변경 */
        @media (max-width: 600px) {
          .n-cols[data-cols="4"],
          .n-cols[data-cols="5"],
          .n-cols[data-cols="6"] {
            --n-cols-template: 1fr;
          }
        }
        .n-col {
          width: 100%;
        }
        .n-col > .n-figure:first-child,
        .n-col > .n-p:first-child,
        .n-col > .n-h2:first-child,
        .n-col > .n-h3:first-child { margin-top: 0; }

        /* ==== 비디오에도 이미지와 동일한 스타일 적용 ==== */
        div.n-small-image div.n-video {
          max-width: 400px !important;
          margin: 0px auto !important;
          width: 100% !important;
        }
        div.n-small-image div.n-video video {
          max-width: 400px !important;
          width: 100% !important;
          height: auto !important;
          box-sizing: border-box !important;
        }

        div.n-medium-image div.n-video {
          max-width: 640px !important;
          margin: 0px auto !important;
          width: 100% !important;
        }
        div.n-medium-image div.n-video video {
          max-width: 640px !important;
          width: 100% !important;
          height: auto !important;
          box-sizing: border-box !important;
        }

        /* 모바일에서 비디오 최적화 */
        @media (max-width: 600px) {
          .n-video {
            margin: 16px 0;
          }
          .n-video video {
            width: 100% !important;
            height: auto !important;
          }
        }

        .scroll-transition-fade {
          will-change: transform, opacity;
        }
        /* ==== Slide Carousel ==== */
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
        .carousel-btn svg {
          width: 16px;
          height: 14px;
        }
        .carousel-prev {
          left: 12px;
        }
        .carousel-next {
          right: 12px;
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
    </div>
  );
}
