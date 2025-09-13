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
        {/* 라인 오버레이 */}
        <div className="gnb-line" aria-hidden />

        <div className="inner">
          <Link href="/" className="brand">Designer Mihee</Link>

          <nav className="nav desktop">
            <a href="/#career" className="link">Career</a>
            <a href="/#archive" className="link">Project Archive</a>
          </nav>

          <button className="hamburger" onClick={() => setOpen(v => !v)} aria-label="menu">☰</button>
        </div>

        {open && (
          <nav className="nav mobile">
            <a href="/#career" className="link" onClick={() => setOpen(false)}>Career</a>
            <a href="/#archive" className="link" onClick={() => setOpen(false)}>Project Archive</a>
            <NavLink href="/about" label="About" exact />
          </nav>
        )}
      </header>

      <style jsx>{`
      .gnb {
          position: fixed;
          top: 0;
          left: 0; right: 0;
          z-index: 1000;
          backdrop-filter: blur(6px);
          background: rgba(30,30,30,.6);
          border-bottom: #ffffff10 solid 1px;
        }

        .gnb-line {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255,255,255,0.08);
          pointer-events: none;
          z-index: -1;
        }

        .inner {
          height: 80px;
          max-width: 960px;
          margin: 0 auto;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 20px;
          font-weight: 400; 
        }

        .brand { 
          letter-spacing: .02em; 
          color: #fff; 
          text-decoration: none; }

        .nav { display: flex; gap: 16px; align-items: center; }

        .link {
          color: #e5e7eb; text-decoration: none;
          padding: 8px 10px; border-radius: 10px;
          transition: background .15s ease, color .15s ease;
        }
        .link:hover { background: rgba(255,255,255,0.06); color: #fff; }

        .active { color: #fff; background: rgba(255,255,255,0.1); }

        .hamburger { 
          display: none; 
          background: transparent; 
          color: #fff; 
          border: 0; 
          font-size: 32px; 
          line-height: 1; 
          padding: 8px; 
          border-radius: 8px;
          }

        .mobile {
          display: none;
          flex-direction: column;
          padding: 8px 16px 16px;
          gap: 8px;
          background: rgba(30,30,30,0.6);
          backdrop-filter: blur(6px);
        }

        @media (max-width: 600px) {
          .desktop { display: none; }
          .hamburger { display: block; }
          .mobile { display: flex; }
          .inner {
            padding: 0 16px;
          }
        }

      `}</style>
    </>
  );
}