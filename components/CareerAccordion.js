// components/CareerAccordion.js
import { useState } from "react";

/** 줄바꿈 텍스트 → bullets 배열 */
function toBullets(text = "") {
  return String(text)
    .split("\n")
    .map((s) => s.replace(/^\s*-\s?/, "").trim())
    .filter(Boolean);
}

/** 값이 비어있으면 렌더 안 함 */
function Maybe({ value, children }) {
  const v = (value ?? "").toString().trim();
  if (!v) return null;
  return children(v);
}

/** "2025.04 - 2025.05" / "2024.10 - ing" / "2024.10" → 정렬 키(YYYYMM) */
function parsePeriodToKey(period = "") {
  const m = String(period).match(/(\d{4})\.(\d{1,2})/);
  if (!m) return -1;
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  if (!yy || !mm) return -1;
  return yy * 100 + mm;
}

export default function CareerAccordion({ posts = [] }) {
  const [openIndex, setOpenIndex] = useState(-1);
  const toggle = (i) => setOpenIndex((prev) => (prev === i ? -1 : i));

  if (!posts.length) return <div className="empty">경력 데이터가 없어요.</div>;

  const items = [...posts].sort(
    (a, b) =>
      parsePeriodToKey(b?.plain?.Period) - parsePeriodToKey(a?.plain?.Period)
  );

  return (
    <div className="career-accordion">
      {items.map((post, i) => {
        const period = post?.plain?.Period || "";
        const team = post?.plain?.Team || "";
        const role = post?.plain?.Role || "";
        const open = openIndex === i;

        // 프로젝트 p01~p04 → 기간 시작일 기준 최신순
        const projects = [1, 2, 3, 4]
          .map((n) => {
            const t = post?.plain?.[`p0${n}title`];
            const p = post?.plain?.[`p0${n}period`];
            const d = post?.plain?.[`p0${n}details`];
            const bullets = toBullets(d || "");
            if (!(t || p || bullets.length)) return null;
            return { t, p, bullets, __key: parsePeriodToKey(p) };
          })
          .filter(Boolean)
          .sort((a, b) => b.__key - a.__key);

        return (
          <div className="career-item" key={post.slug || i}>
            {/* HEADER (제목 왼쪽 / 기간+화살표 오른쪽) */}
            <button
              className="career-header"
              onClick={() => toggle(i)}
              aria-expanded={open}
            >
              <div className="career-left">
                <h2 className="career-title">{post.title}</h2>
              </div>

              <div className="career-meta">
                <Maybe value={period}>
                  {(v) => <span className="career-period">{v}</span>}
                </Maybe>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`chevron ${open ? "open" : ""}`}
                  aria-hidden="true"
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </div>
            </button>

            {/* PANEL */}
            {open && (
              <div className="career-panel">
                {/* Desc */}
                <Maybe value={post?.plain?.Description}>
                  {(desc) => (
                    <div className="career-desc">
                      <p>{desc}</p>
                    </div>
                  )}
                </Maybe>

                {/* team | role  (Desc 아래) */}
                {(team || role) && (
                  <div className="tr-line" aria-label="team and role">
                    <Maybe value={team}>
                      {(v) => <span className="tr-chip">{v}</span>}
                    </Maybe>
                    <Maybe value={role}>
                      {(v) => <span className="tr-chip">{v}</span>}
                    </Maybe>
                  </div>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                  <div className="career-projects">
                    {projects.map((p, idx) => (
                      <div className="career-project" key={idx}>
                        <div className="project-header">
                          <Maybe value={p.t}>
                            {(v) => <h3 className="project-title">{v}</h3>}
                          </Maybe>
                          <Maybe value={p.p}>
                            {(v) => <span className="project-period">{v}</span>}
                          </Maybe>
                        </div>
                        {p.bullets.length > 0 && (
                          <ul className="project-details">
                            {p.bullets.map((b, bi) => (
                              <li key={bi}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <style jsx>{`
        .empty { color: rgba(255,255,255,.5); }
        .career-accordion { display:flex; flex-direction:column; width:100%; }
        .career-item { display:flex; flex-direction:column; width:100%; }

        /* ===== 모바일(기본) ===== */
        .career-header {
          display: grid;
          grid-template-columns: 1fr;
          row-gap: 12px;
          width: 100%;
          padding: 32px 0;
          background: transparent;
          border: none;
          appearance: none;
          cursor: pointer;
        }
        .career-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          min-width: 0;
        }
        .career-title {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 24px;
          font-weight: 400;
          color: #fff;
          margin: 0;
          text-align: left;
          word-break: keep-all;
        }

        /* period(왼쪽) + arrow(오른쪽) */
        .career-meta {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .career-period {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 24px;
          font-weight: 400;
          color: #fff;
          justify-self: start;
          white-space: nowrap;
        }
        .chevron {
          color: #fff; width: 20px; height: 20px;
          transform: rotate(180deg);
          transition: transform .3s ease;
          justify-self: end;
        }
        .chevron.open { transform: rotate(0deg); }

        /* 펼침 영역 */
        .career-panel { display:flex; flex-direction:column; gap:40px; padding-bottom:80px; }
        .career-desc {
          background: rgba(255,255,255,.04);
          border-radius: 16px;
          padding: 24px;
        }
        .career-desc p { font-family:Pretendard,sans-serif; font-size:16px; line-height:1.5; color:rgba(255,255,255,.6); margin:0; }

        /* team | role (Desc 아래) */
        .tr-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          padding: 0 24px;
        }
        .tr-chip {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 14px;
          color: rgba(255,255,255,.7);
          white-space: nowrap;
        }
        /* 구분자 | 자동 삽입 (마지막 제외) */
        .tr-chip:not(:last-child)::after {
          content: " | ";
          margin: 0 6px 0 10px;
          color: rgba(255,255,255,.3);
        }

        /* 프로젝트 */
        .career-projects { display:flex; flex-direction:column; gap:40px; padding:0 24px; }
        .career-project { display:flex; flex-direction:column; gap:12px; }
        .project-header { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .project-title { font-family:Pretendard,sans-serif; font-size:18px; color:#fff; margin:0; }
        .project-period {
          background: rgba(255,255,255,.06);
          border-radius: 8px;
          padding: 2px 8px;
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 14px; color:#fff;
        }
        .project-details {
          list-style: none; padding-left: 0; margin: 0;
          font-family: Pretendard, sans-serif; font-size:16px; line-height:1.6;
          color: rgba(255,255,255,.8);
        }
        .project-details li { position: relative; padding-left: 14px; margin: 6px 0; }
        .project-details li::before {
          content: "•"; position: absolute; left: 0; top: .25em;
          font-size: 14px; color: rgba(255,255,255,.6); font-weight: 600;
        }

        /* ===== 데스크탑(>=600px) ===== */
        @media (min-width: 600px) {
          .career-header {
            grid-template-columns: 1fr auto;
            align-items: center;
            column-gap: 20px;
            padding: 40px 0;
          }
          .career-title { font-size: 40px; }
          .career-meta { display:flex; align-items:center; gap:16px; width:auto; }
          .career-period { font-size: 40px; }
          .chevron { width: 24px; height: 24px; }

          /* team | role 한 줄 유지 */
          .tr-line { gap: 10px; }
          .tr-chip { font-size: 16px; }
        }
      `}</style>
    </div>
  );
}