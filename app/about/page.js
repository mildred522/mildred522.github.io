import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>欢迎来到我的博客</h1>
      <ul>
        <li><Link href="/posts/first-post">第一篇文章</Link></li>
        <li><Link href="/posts/first-post">第二篇文章</Link></li>
        <li><Link href="/posts/first-post">第三篇文章</Link></li>
        <li><Link href="/posts/first-post">第四篇文章</Link></li>
        <li><Link href="/posts/first-post">第五篇文章</Link></li>
        <li><Link href="/posts/first-post">第六篇文章</Link></li>
        <li><Link href="/posts/first-post">第七篇文章</Link></li>
        <li><Link href="/posts/first-post">第八篇文章</Link></li>
        <li><Link href="/posts/first-post">第九篇文章</Link></li>
        {/* 可以继续添加更多的文章链接 */}
      </ul>
    </div>
  );
}