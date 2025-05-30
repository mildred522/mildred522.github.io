import Image from "next/image";
import React from 'react';
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {/* 背景视频 */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      >
        <source src="/backvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="text-lg text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-10">
            这是{"MILDRED"}的博客。
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-background text-foreground gap-2 hover:bg-[#ffffff] dark:hover:bg-[#ffffff] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://github.com/mildred522"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/picgithub.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            访问github主页
          </a>
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-background text-foreground gap-2 hover:bg-[#ffffff] dark:hover:bg-[#ffffff] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://ycna8o9c6bcq.feishu.cn/wiki/VKP3w7uTJij2vfk16MBcAeLJnpc?from=from_copylink"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/picfeishu.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            查看飞书文档
          </a>
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-background text-foreground gap-2 hover:bg-[#ffffff] dark:hover:bg-[#ffffff] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://effneu-trinity.github.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            浏览博客文章（导向Trinity）
          </a>
           <div>
      {/* 使用 Link 组件创建一个到 About 页面的链接 */}
      <Link 
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-background text-foreground gap-2 hover:bg-[#ffffff] dark:hover:bg-[#ffffff] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
      href="/about"
      target="_blank"
      rel="noopener noreferrer">
        浏览博客文章
      </Link>
    </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}