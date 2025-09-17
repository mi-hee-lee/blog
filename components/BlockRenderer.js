// components/BlockRenderer.js
// Notion 블록 트리를 받아 화면에 렌더링 (2열 컬럼 지원, 이미지 여백 제거/라운드)

import SlideCarousel from './SlideCarousel';
import { useEffect } from 'react';
import { buildProxiedImageUrl } from '../lib/notionImage';

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

  const { width, height } = extractSizeFromUrl(stableUrl || img);

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

function renderChildren(children = [], highlightColor) {
  return <BlockRenderer blocks={children} highlightColor={highlightColor} isNested={true} />;
}

export default function BlockRenderer({ blocks = [], highlightColor = '#00A1F3', isNested = false }) {
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
    }, 100);

    // 윈도우 리사이즈 시에도 높이 재조정
    const handleResize = () => {
      handleCardAlignment();
      adjustColumnHeights();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [blocks]);
  if (!Array.isArray(blocks) || !blocks.length) return null;

  return (
    <div className={`n-content ${!isNested ? 'n-content-root' : ''}`}>
      {blocks.map((b, index) => {
        const t = b.type;

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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
                </Bullet>
              </ul>
            );

          case 'numbered_list_item':
            return (
              <ol key={b.id} className="n-ol">
                <li>
                  <Text rich_text={b.numbered_list_item?.rich_text} />
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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
            return (
              <div key={b.id} className="n-video">
                <video controls>
                  <source src={videoUrl} />
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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

          // ===== 콜아웃 =====
          case 'callout': {
            const icon = b.callout?.icon?.emoji || '💡';

            // rich_text에서 첫 번째 텍스트도 확인 (아이콘이 텍스트로 들어있을 수 있음)
            const firstText = (b.callout?.rich_text?.[0]?.plain_text || '').trim();
            const iconText = icon === '💡' ? firstText : icon;

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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
                </div>
              );
            }

            // #small callout 처리 (이미지 크기 400px 제한)
            if (iconText === '#small' || iconText === '#Small') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#small' && text !== '#Small';
              }) || [];

              return (
                <div key={b.id} className="n-small-image">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
                </div>
              );
            }

            // #medium callout 처리 (이미지 크기 640px 제한)
            if (iconText === '#medium' || iconText === '#Medium') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#medium' && text !== '#Medium';
              }) || [];

              return (
                <div key={b.id} className="n-medium-image">
                  <Text rich_text={filteredText} />
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
                </div>
              );
            }

            // #gradient-bottom callout 처리 (이전 콘텐츠 하단에 그라데이션 오버레이)
            if (iconText === '#gradient-bottom' || iconText === '#Gradient-Bottom') {
              const filteredText = b.callout?.rich_text?.filter(t => {
                const text = (t.plain_text || '').trim();
                return text !== '#gradient-bottom' && text !== '#Gradient-Bottom';
              }) || [];

              return (
                <div key={b.id} className="n-gradient-bottom">
                  <div className="gradient-group">
                    <div className="gradient-color" />
                    <div className="gradient-mask" />
                  </div>
                </div>
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
                </div>
              );
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
                </div>
              </div>
            );
          }

          // ====== ★★ COLUMN SUPPORT ★★ ======
          case 'column_list': {
            // column_list 의 children 들이 각각 "column" 블록
            const cols = (b.children || []).filter((c) => c.type === 'column');
            if (!cols.length) return null;
            return (
              <div key={b.id} className="n-cols" data-cols={cols.length}>
                {cols.map((col) => (
                  <div key={col.id} className="n-col">
                    {col.children?.length ? renderChildren(col.children, highlightColor) : null}
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
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
                </div>
              </div>
            );

          // ===== 동기화 블록 =====
          case 'synced_block': {
            // 원본 블록인 경우 children 렌더링
            if (b.synced_block && !b.synced_block.synced_from) {
              return (
                <div key={b.id} className="n-synced">
                  {b.children?.length ? renderChildren(b.children, highlightColor) : null}
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
        .n-p { font-size: 14px; font-family: "Bricolage Grotesque", Pretendard, sans-serif; color:#e5e5e5; line-height:1.8; margin: 0px 0 20px; }
        .n-p--empty { height: .75rem; }
        .n-p--empty-last { height: 0; }
        .n-h1,.n-h2 { color:#fff; margin: 80px 0 20px; line-height:1.35; }
        .n-h3 { color:#fff; margin: 40px 0 20px; line-height:1.35; }
        .n-h1 { font-size: 32px; font-weight:400; }
        .n-h2 { font-size: 24px; font-weight:400; }
        .n-h3 { font-size: 18px; font-weight:400; }

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

        .n-callout {
          display:flex; gap:12px; align-items:flex-start;
          background: rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.06);
          padding:14px 16px 12px 16px; border-radius: 12px; margin: 16px 0;
        }
        .n-callout:has(strong) {
          align-items: flex-start;
        }
        .n-callout-ico { font-size:18px; line-height:1; }
        .n-callout-body p { margin:0; }

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

        /* Gradient bottom overlay */
        .n-gradient-bottom {
          position: relative;
          height: 240px;
          margin: -240px 0 0;
          width: 100%;
          pointer-events: none;
          z-index: 5;
        }
        .n-gradient-bottom .gradient-group {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 240px;
          backdrop-filter: blur(20px);
        }
        .n-gradient-bottom .gradient-mask {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000000 106.73%);
          border-radius: 4px;
        }
        .n-gradient-bottom .gradient-color {
          position: absolute;
          inset: 0;
          background: #1E1E1E;
          border-radius: 0px;
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
        }
        .n-video video {
          border-radius: 0px;
          width: 100%;
          max-width: 100%;
          height: auto;
          display: block;
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
        }

        /* 2열 */
        .n-cols[data-cols="2"] {
          grid-template-columns: 1fr 1fr;
          align-items: start;
        }

        /* 3열 */
        .n-cols[data-cols="3"] {
          grid-template-columns: 1fr 1fr 1fr;
          align-items: start;
        }

        /* 4열 */
        .n-cols[data-cols="4"] {
          grid-template-columns: 1fr 1fr 1fr 1fr;
          align-items: start;
        }

        /* 5열 이상도 지원 */
        .n-cols[data-cols="5"] {
          grid-template-columns: repeat(5, 1fr);
          align-items: start;
        }
        .n-cols[data-cols="6"] {
          grid-template-columns: repeat(6, 1fr);
          align-items: start;
        }

        /* 모바일에서 1열로 변경 */
        @media (max-width: 600px) {
          .n-cols[data-cols="2"],
          .n-cols[data-cols="3"],
          .n-cols[data-cols="4"],
          .n-cols[data-cols="5"],
          .n-cols[data-cols="6"] {
            grid-template-columns: 1fr;
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
