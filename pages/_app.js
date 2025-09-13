// pages/_app.js
import '../styles/globals.css';
import GNB from '../components/GNB';
import Footer from '../components/Footer';
import Head from 'next/head';
import { Bricolage_Grotesque } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-bricolage",
});

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* ✅ 모바일 폭 제대로 쓰기 */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={bricolage.variable}>
        <GNB />
        {/* ✅ 본문은 항상 .page 안에서 폭 관리 */}
        <div className="page">
          <Component {...pageProps} />
        </div>
        <Footer />
      </main>
    </>
  );
}