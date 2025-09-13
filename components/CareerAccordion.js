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
  const m = String(period).match(/(\d{4})\.(\d{1,2})/); // 첫 YYYY.MM
  if (!m) return -1;
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  if (!yy || !mm) return -1;
  return yy * 100 + mm; // 2024.10 → 202410
}

export default function CareerAccordion({ posts = [] }) {
  const [openIndex, setOpenIndex] = useState(-1);
  const toggle = (i) => setOpenIndex((prev) => (prev === i ? -1 : i));

  if (!posts.length) return <div className="empty">경력 데이터가 없어요.</div>;

  // 상위 경력 카드: Period 시작일 기준 "최신순(내림차순)"
  const items = [...posts].sort(
    (a, b) =>
      parsePeriodToKey(b?.plain?.Period) - parsePeriodToKey(a?.plain?.Period)
  );

  return (
    <div className="career-accordion">
      {items.map((post, i) => {
        const period = post?.plain?.Period || "";
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
            {/* HEADER */}
            <button
              className="career-header"
              onClick={() => toggle(i)}
              aria-expanded={open}
            >
              {/* 제목 */}
              <h2 className="career-title">{post.title}</h2>

              {/* 메타줄: 모바일(기본)은 period 왼쪽/arrow 오른쪽, 데스크탑은 묶어서 우측 */}
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
                {/* Description */}
                <Maybe value={post?.plain?.Description}>
                  {(desc) => (
                    <div className="career-desc">
                      <p>{desc}</p>
                    </div>
                  )}
                </Maybe>

                {/* Role */}
                <Maybe value={post?.plain?.Role}>
                  {(role) => <p className="career-role">{role}</p>}
                </Maybe>

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

      {/* CSS */}
      <style jsx>{`
        .empty {
          color: rgba(255, 255, 255, 0.5);
        }
        .career-accordion {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .career-item {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        /* ===== 모바일(기본) — 두 줄 레이아웃 ===== */
        .career-header {
          display: flex;
          flex-direction: column; /* 제목 1줄, 메타 1줄 */
          align-items: stretch;
          gap: 12px;
          width: 100%;
          padding: 32px 0;
          background: transparent;
          border: none;
          appearance: none;
          cursor: pointer;
        }
        .career-title {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 24px;
          font-weight: 500;
          color: #fff;
          margin: 0;
          text-align: left;
        }

        /* period(왼쪽) + arrow(오른쪽) */
        .career-meta {
          display: grid;
          grid-template-columns: 1fr auto; /* 왼쪽 1fr, 오른쪽 auto */
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .career-period {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 24px;
          font-weight: 500;
          color: #fff;
          justify-self: start; /* 왼쪽 정렬 보장 */
          white-space: nowrap;
        }
        .chevron {
          color: #fff;
          width: 20px;
          height: 20px;
          transform: rotate(180deg);
          transition: transform 0.3s ease;
          justify-self: end; /* 오른쪽 끝 */
        }
        .chevron.open { transform: rotate(0deg); }

        /* ===== 펼침 영역 ===== */
        .career-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeSlide 0.3s ease;
          padding-bottom: 80px;
        }
        .career-desc {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          padding: 24px;
        }
        .career-desc p {
          font-family: Pretendard, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }
        .career-role {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 18px;
          color: rgba(255, 255, 255, 0.6);
          margin: 20px 24px 20px 24px;
        }
        .career-projects {
          display: flex;
          flex-direction: column;
          gap: 40px;
          padding: 0 24px;
        }
        .career-project { display: flex; flex-direction: column; gap: 12px; }
        .project-header { display: flex; align-items: center; gap: 12px; }
        .project-title { font-family: Pretendard, sans-serif; font-size: 18px; color: #fff; margin: 0; }
        .project-period {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 2px 8px;
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 14px;
          color: #fff;
        }
        .project-details {
          list-style: none;
          padding-left: 0;
          margin: 0;
          font-family: Pretendard, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
        }
        .project-details li {
          position: relative;
          padding-left: 16px;
          margin-bottom: 8px;
        }
        .project-details li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 18px;
          line-height: 1.6;
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ===== 데스크탑(>=720px) — 한 줄 레이아웃, 우측 정렬 ===== */
        @media (min-width: 720px) {
          .career-header {
            flex-direction: row;
            align-items: center;
            gap: 20px;
            padding: 40px 0;
          }
          .career-title {
            font-size: 40px;
            flex: 1;               /* 왼쪽 공간 채움 */
          }
          .career-meta {
            display: flex;         /* period+arrow 묶음 */
            align-items: center;
            gap: 16px;
            width: auto;
          }
          .career-period { font-size: 40px; }
          .chevron { width: 24px; height: 24px; }
        }
      `}</style>
    </div>
  );
}