export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-item">miihee.kr@gmail.com</div>
        <div className="footer-item">010.4529.8186</div>
        <a href="https://www.linkedin.com/in/mihee-l-911491260/" className="footer-link">
          Linkedin
        </a>
      </div>
      <style jsx> {`
    .footer {
      width: 100vw;
      margin-left: calc(50% - 50vw);
      color: #fff;
      border-top: 1px solid rgba(255,255,255,0.2);
      display: flex;
      justify-content: flex-start;
    }

    .footer-inner {
      max-width: 960px !important;
      padding: 64px 0px 120px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 0 auto;
      width:100%;
    }
    .footer-item {
      font-size: 28px;
      font-weight: 500;
      line-height: 1.6;
    }

    .footer-link {
      text-decoration: underline;
      transition: opacity 0.2s ease;
      font-size: 28px;
      font-weight: 500;
      line-height: 1.6;
    }

    .footer-link:hover {
      opacity: 0.8;
    }
    @media (max-width: 600px) {
    .footer-inner {
    padding: 64px 16px 120px;
    }
    }

    `}</style>
    </footer>
    
  );
}

