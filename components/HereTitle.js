// components/HereTitle.js
export default function HereTitle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start'}}>
      <h1
        style={{
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 400,
          fontSize: '8em',
          lineHeight: '1.2em',
          color: '#fff',
          wordBreak: 'keep-all',
          textAlign: 'left',
          maxWidth: '960px',
          margin: '200px 0 80px'
        }}
      >
        I{" "}
        <span style={pillStyle('#90A3FF')}>Shift</span>{" "}
        how we see problems and{" "}
        <span style={pillStyle('#3BEBFF')}>Scale</span>{" "}
        how we{" "}
        <span
          style={{
            ...pillStyle(),
            background: 'linear-gradient(135deg, #FEED00 0%, #FE91FE 100%)'
          }}
        >
          Solve
        </span>{" "}
        them.
      </h1>
    </div>
  );
}

function pillStyle(bg = '#fff') {
  return {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 32px',
    height: '128px',
    gap: '4px',
    borderRadius: '600px',
    flex: '0 0 auto',
    color: '#000',
    background: bg
  };
}