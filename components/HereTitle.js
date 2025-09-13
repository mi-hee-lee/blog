// components/HereTitle.js
export default function HereTitle() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-start'}}>
        <h1 className="hero-title">
          I{" "}
          <span className="pill pill-shift">Shift</span>{" "}
          how we see problems and{" "}
          <span className="pill pill-scale">Scale</span>{" "}
          how we{" "}
          <span className="pill pill-solve">Solve</span>{" "}
          them.
        </h1>
      </div>

      <style jsx>{`
        .hero-title {
          font-family: "Bricolage Grotesque", sans-serif;
          font-weight: 400;
          font-size: 6em;
          line-height: 1.2em;
          color: #fff;
          word-break: keep-all;
          text-align: left;
          max-width: 960px;
          margin: 80px 0 80px;
        }

        .pill {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          padding: 16px 24px;
          height: 128px;
          gap: 4px;
          border-radius: 600px;
          flex: 0 0 auto;
          color: #000;
        }

        .pill-shift { background: #90A3FF; }
        .pill-scale { background: #3BEBFF; }
        .pill-solve { background: linear-gradient(135deg, #FEED00 0%, #FE91FE 100%); }

        @media (max-width: 600px) {
          .hero-title {
            font-size: 5em;
            margin: 120px 0 60px;
          }
          .pill {
            padding: 8px 20px;
            height: 96px;
          }
        }
      `}</style>
    </>
  );
}