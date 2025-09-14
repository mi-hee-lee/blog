// components/CareerList.js
import React from "react";
import FullBleedDivider from "./FullBleedDivider";

function toBullets(text = "") {
  return String(text)
    .split("\n")
    .map((s) => s.replace(/^\s*-\s?/, "").trim())
    .filter(Boolean);
}

function Maybe({ value, children }) {
  const v = (value ?? "").toString().trim();
  if (!v) return null;
  return children(v);
}

function parsePeriodToKey(period = "") {
  const m = String(period).match(/(\d{4})\.(\d{1,2})/);
  if (!m) return -1;
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  if (!yy || !mm) return -1;
  return yy * 100 + mm;
}

export default function CareerList({ posts = [] }) {
  if (!posts.length) return <div className="empty">경력 데이터가 없어요.</div>;

  const items = [...posts].sort(
    (a, b) => parsePeriodToKey(b?.plain?.Period) - parsePeriodToKey(a?.plain?.Period)
  );

  return (
    <div className="career-list">
      {items.map((post, i) => {
        const period = post?.plain?.Period || "";

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
          <React.Fragment key={post.slug || i}>
            <article className="career-item">
              <div className="career-header">
                {/* 왼쪽: title / team / role */}
                <div className="career-left">
                  <h2 className="career-title">{post.title}</h2>
                  <Maybe value={post?.plain?.Team}>
                    {(team) => <p className="career-team">{team}</p>}
                  </Maybe>
                  <Maybe value={post?.plain?.Role}>
                    {(role) => <p className="career-role">{role}</p>}
                  </Maybe>
                </div>

                {/* 오른쪽: period */}
                <Maybe value={period}>
                  {(v) => <span className="career-period">{v}</span>}
                </Maybe>
              </div>

              <Maybe value={post?.plain?.Description}>
                {(desc) => (
                  <div className="career-desc">
                    <p>{desc}</p>
                  </div>
                )}
              </Maybe>

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
            </article>

            {i < items.length - 1 && <FullBleedDivider top={20} bottom={20} />}
          </React.Fragment>
        );
      })}

      <style jsx>{`
        .empty {
          color: rgba(255, 255, 255, 0.5);
        }
        .career-list {
          display: flex;
          flex-direction: column;
          width: 100%;
          padding: 80px 0 0 0;
        }
        .career-item {
          display: flex;
          flex-direction: column;
          width: 100%;
          padding: 40px 0;
        }

        .career-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }
        .career-left {
          display: flex;
          flex: 1;
          align-items: center;
          gap: 12px; /* title, team, role 간격 */
          min-width: 0;
        }
        .career-title {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          margin: 0;
          word-break: keep-all;
        }
        .career-team,
        .career-role {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          white-space: nowrap;
        }
        .career-period {
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          white-space: nowrap;
          flex: 0 0 auto;
        }

        .career-desc {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          padding: 16px;
          margin-top: 20px;
        }
        .career-desc p {
          font-family: Pretendard, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .career-projects {
          display: flex;
          flex-direction: column;
          gap: 40px;
          margin: 20px 0;
        }
        .career-project {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .project-header {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .project-title {
          font-family: Pretendard, sans-serif;
          font-size: 14px;
          color: #fff;
          margin: 0;
        }
        .project-period {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 13px;
          color: #fff;
        }
        .project-details {
          list-style: none;
          padding-left: 0;
          margin: 0;
          font-family: Pretendard, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
        }
        .project-details li {
          position: relative;
          padding-left: 16px;
          margin-bottom: 4px;
        }
        .project-details li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          line-height: 1.6;
        }

        /* 모바일: title/team/role 세로 쌓기 */
        @media (max-width: 600px) {
          .career-list {
            padding: 80px 16px 0 16px;
          }
          .career-item {
            margin: 16px 0;
            }
          .career-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .career-title {
            font-size: 18px;
          }
          .career-period {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}