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
  return (
    <figure className="n-figure">
      <div className="n-imgWrap">
        <img src={img} alt={caption || ''} loading="lazy" />
      </div>
      {caption && <figcaption className="n-cap">{caption}</figcaption>}
    </figure>
  );
}

function Bullet({ children }) {
  return <li>{children}</li>;
}

function renderChildren(children = []) {
  return <BlockRenderer blocks={children} />;
}

export default function BlockRenderer({ blocks = [] }) {
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
                  {b.children?.length ? renderChildren(b.children) : null}
                </Bullet>
              </ul>
            );

          case 'numbered_list_item':
            return (
              <ol key={b.id} className="n-ol">
                <li>
                  <Text rich_text={b.numbered_list_item?.rich_text} />
                  {b.children?.length ? renderChildren(b.children) : null}
                </li>
              </ol>
            );

          // ===== 이미지 =====
          case 'image':
            return <FigureImage key={b.id} block={b} />;

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
            return (
              <div key={b.id} className="n-callout">
                <span className="n-callout-ico" aria-hidden>{icon}</span>
                <div className="n-callout-body">
                  <Text rich_text={b.callout?.rich_text} />
                  {b.children?.length ? renderChildren(b.children) : null}
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
              <div key={b.id} className="n-cols">
                {cols.map((col) => (
                  <div key={col.id} className="n-col">
                    {col.children?.length ? renderChildren(col.children) : null}
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
                  {b.children?.length ? renderChildren(b.children) : null}
                </div>
              </div>
            );

          default:
            return null;
        }
      })}

      {/* 스타일 */}
      <style jsx global>{`
        /* 본문 공통 */
        .n-content { margin: 32px 0 120px; }
        .n-p { font-family: Pretendard, sans-serif; color:#e5e5e5; line-height:1.8; margin: 12px 0; }
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

        /* ==== 이미지(썸네일) : 여백 제거 + 라운드 + 확대 hover ==== */
        .n-figure { margin: 18px 0; }
        .n-figure .n-imgWrap {
          border-radius: 12px;
          overflow: hidden;              /* radius가 확실히 적용되도록 */
          background: #111;              /* 로딩 중 배경 */
        }
        .n-figure img {
          display:block;
          width:100%;
          height:auto;
          transform: scale(1);           /* 기본 */
          transition: transform .5s ease;
          object-fit: cover;
        }
        .n-figure:hover img {
          transform: scale(1.05);        /* 썸네일 안에서 확대 */
        }
        .n-figure .n-cap {
          font-size: 12px; color:#9aa0a6; margin-top: 6px;
          text-align: center;
        }

        /* ==== 2열 컬럼: 데스크톱 두 칸, 모바일 한 칸 ==== */
        .n-cols {
          display: grid;
          gap: 16px;
          margin: 16px 0;
        }
        @media (min-width: 860px) {
          .n-cols {
            grid-template-columns: 1fr 1fr; /* 2열 */
            align-items: start;
          }
        }
        .n-col > .n-figure:first-child,
        .n-col > .n-p:first-child,
        .n-col > .n-h2:first-child,
        .n-col > .n-h3:first-child { margin-top: 0; }
      `}</style>
    </div>
  );
}