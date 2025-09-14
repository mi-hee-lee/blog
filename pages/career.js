// pages/career.js
import Head from 'next/head';
import CareerList from '../components/CareerList';
import { getPostsGrouped } from '../lib/notion';
import FullBleedDivider from '../components/FullBleedDivider';

export async function getStaticProps() {
  const revalidate = Number(process.env.REVALIDATE_SECONDS || 60);
  try {
    const grouped = await getPostsGrouped();
    const careerGroup = grouped.find((g) => g.section === 'career');
    return {
      props: {
        posts: careerGroup?.posts ?? [],
      },
      revalidate,
    };
  } catch (e) {
    return { props: { posts: [] }, revalidate };
  }
}

export default function CareerPage({ posts }) {
  return (
    <>
      <Head>
        <title>Career | Designer Mihee</title>
        <meta name="description" content="Career" />
      </Head>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
        {posts?.length ? (
          <CareerList posts={posts} />
        ) : (
          <div style={{ color: '#999', marginTop: 24 }}>
            경력 데이터가 없어요.
          </div>
        )}
      </main>
    </>
  );
}