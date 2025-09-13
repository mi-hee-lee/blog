// components/GNB.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function GNB() {
  const { pathname } = useRouter();
  const [open, setOpen] = useState(false);

  const NavLink = ({ href, label, exact }) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link href={href} className={`link ${active ? 'active' : ''}`} onClick={() => setOpen(false)}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <header className="gnb">
        {/* 전체폭 라인: border를 header 자체에 둔다 */}
        <div className="inner">
          <Link href="/" className="brand">Designer Mihee</Link>

          {/* Desktop */}
          <nav className="nav desktop">
            <a href="/#career" className="link">Career</a>
            <a href="/#archive" className="link">Project Archive</a>
          </nav>

          {/* Mobile */}
          <button className="hamburger" onClick={() => setOpen(v => !v)} aria-label="menu">
            ☰
          </button>
        </div>

        {open && (
          <nav className="nav mobile">
            <a href="/#career" className="link" onClick={() => setOpen(false)}>Career</a>
            <a href="/#archive" className="link" onClick={() => setOpen(false)}>Project Archive</a>
          </nav>
        )}
      </header>

      {/* 헤더 높이만큼 상단 패딩(고정 헤더가 콘텐츠를 가리지 않게) */}
      <div style={{ height: 64 }} />

      <style jsx>{`
        .gnb {
          position: sticky;
          top: 0;
          z-index: 50;

          width: 100vw;
          margin-left: calc(50% - 50vw);

          backdrop-filter: blur(6px);
          background: rgba(30,30,30,0.6);

          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .inner {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          
          max-width: 960px;
          margin: 0 auto;
        }

        .brand {
          font-weight: 600;
          letter-spacing: .02em;
          color: #fff;
          text-decoration: none;
        }

        .nav {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .link {
          color: #e5e7eb;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 10px;
          border-radius: 10px;
          transition: background .15s ease, color .15s ease;
        }
        .link:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .active { color: #fff; background: rgba(255,255,255,0.1); }

        .hamburger {
          display: none;
          background: transparent;
          color: #fff;
          border: 0;
          font-size: 22px;
          line-height: 1;
          padding: 8px;
          border-radius: 8px;
        }

        /* Mobile dropdown */
        .mobile {
          display: none;
          flex-direction: column;
          padding: 8px 16px 16px;
          gap: 8px;

          /* dropdown도 header 배경과 자연스럽게 */
          background: rgba(30,30,30,0.6);
          backdrop-filter: blur(6px);
        }

        @media (max-width: 600px) {
          .desktop { display: none; }
          .hamburger { display: block; }
          .mobile { display: flex; }
        }
      `}</style>
    </>
  );
}