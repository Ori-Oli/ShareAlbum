import Link from "next/link";
import { redirect } from "next/navigation";
import { getProviderLoginUrl } from "@/lib/auth/providers";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentSession();
  const { next } = await searchParams;
  const nextPath = isSafeRedirectPath(next) ? next : undefined;

  if (session) {
    redirect(nextPath ?? "/");
  }

  return (
    <main className="grid min-h-screen bg-[#f6f7f2] text-zinc-950 lg:grid-cols-[1fr_440px]">
      <section className="flex min-h-[42vh] flex-col justify-between bg-zinc-950 p-8 text-white lg:min-h-screen lg:p-12">
        <Link href="/" className="text-sm font-semibold">
          Share Album
        </Link>
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
            공유 앨범을 만들고 초대 링크로 사진을 함께 모으세요.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-300">
            카카오 또는 네이버로 로그인한 뒤 앨범을 만들고, 구성원에게
            링크를 공유해 사진 업로드와 AI 태그 정리를 함께 진행합니다.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-xl font-semibold">로그인</h2>
          <p className="mt-2 text-sm text-zinc-500">
            사용할 계정을 선택하세요.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href={getProviderLoginUrl("kakao", nextPath)}
              className="flex h-12 items-center justify-center rounded-md bg-[#FEE500] text-sm font-semibold text-zinc-950"
            >
              카카오로 계속하기
            </Link>
            <Link
              href={getProviderLoginUrl("naver", nextPath)}
              className="flex h-12 items-center justify-center rounded-md bg-[#03C75A] text-sm font-semibold text-white"
            >
              네이버로 계속하기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function isSafeRedirectPath(value: string | undefined) {
  return Boolean(value?.startsWith("/") && !value.startsWith("//"));
}
