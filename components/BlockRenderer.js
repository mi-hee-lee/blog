// components/BlockRenderer.js
// Notion 블록 트리를 받아 화면에 렌더링 (2열 컬럼 지원, 이미지 여백 제거/라운드)

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

  const { width, height } = extractSizeFromUrl(img);

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
          src={img}
          alt={caption || ''}
          loading="lazy"
          style={{
            width: '100%',
            height: 'auto',
            ...(width && { maxWidth: `${width}px` })
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
  return <BlockRenderer blocks={children} highlightColor={highlightColor} />;
}

export default function BlockRenderer({ blocks = [], highlightColor = '#00A1F3' }) {
  if (!Array.isArray(blocks) || !blocks.length) return null;

  return (
    <div className="n-content">
      {blocks.map((b) => {
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
            if (empty) return <p key={b.id} className="n-p n-p--empty" />;
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
                <video controls style={{ width: '100%', maxWidth: '100%' }}>
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
        /* 콘텐츠 복사 방지 */
        .n-content {
          margin: 120px 0 120px;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        .n-as-is-card .n-content,
        .n-to-be-card .n-content,
        .n-col .n-content { margin: 0; }
        .n-p { font-family: "Bricolage Grotesque", Pretendard, sans-serif; color:#e5e5e5; line-height:1.8; margin: 12px 0; }
        .n-p--empty { height: .75rem; }
        .n-h1,.n-h2,.n-h3 { color:#fff; margin: 36px 0 16px; line-height:1.35; }
        .n-h1 { font-size: 32px; font-weight:600; }
        .n-h2 { font-size: 24px; font-weight:600; }
        .n-h3 { font-size: 20px; font-weight:600; }

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
          padding:14px 16px; border-radius: 12px; margin: 16px 0;
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
          padding: 12px 20px;
          gap: 8px;
          min-height: 120px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          text-align: center;
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
          margin: 0 0 6px;
        }

        .n-to-be-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 12px 20px;
          gap: 8px;
          
          min-height: 120px;
          background: var(--highlight-color, #00A1F3);
          border: 1px solid rgba(0, 161, 243, 0.2);
          border-radius: 12px;
          text-align: center;
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
          margin: 0 0 6px;
        }

        /* Small image 제한 */
        .n-small-image .n-figure {
          max-width: 640px;
          margin: 0px auto;
        }
        .n-small-image .n-imgWrap {
          max-width: 640px;
        }
        .n-small-image img {
          max-width: 640p !important;
          width: 100%;
          height: auto;
        }

        /* ==== 이미지(썸네일) : 여백 제거 + 라운드 + 확대 hover ==== */
        .n-figure { margin: 18px 0; }
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
          border-radius: 12px;
          overflow: hidden;
          background: #111;
        }
        .n-video video {
          border-radius: 12px;
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
        .n-figure img {
          display:block;
          width:100%;
          height:auto;
          object-fit: cover;
        }
        .n-figure .n-cap {
          font-size: 12px; color:#9aa0a6; margin-top: 6px;
          text-align: center;
        }

        /* ==== 동적 컬럼: 데스크톱에서 실제 컬럼 수, 모바일 한 칸 ==== */
        .n-cols {
          display: grid;
          gap: 16px;
          margin: 0;
        }
        @media (min-width: 960px) {
          .n-cols[data-cols="2"] {
            grid-template-columns: 1fr 1fr;
            align-items: start;
          }
          .n-cols[data-cols="3"] {
            grid-template-columns: 1fr 1fr 1fr;
            align-items: start;
          }
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
        }
        .n-col {
          width: 100%;
        }
        .n-col > .n-figure:first-child,
        .n-col > .n-p:first-child,
        .n-col > .n-h2:first-child,
        .n-col > .n-h3:first-child { margin-top: 0; }
      `}</style>
    </div>
  );
}