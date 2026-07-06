import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getAlbum, getCurrentUser } from "@/lib/api";
import { AlbumGroupPanel } from "@/components/album-group-panel";
import { AlbumPhotoGrid } from "@/components/album-photo-grid";
import { AlbumPhotoUploadLauncher } from "@/components/album-photo-upload-launcher";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

type AlbumPageProps = {
  params: Promise<{
    albumId: string;
  }>;
};

export default async function AlbumPage({ params }: AlbumPageProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const { albumId } = await params;
  const requestHeaders = await headers();
  const album = await getAlbum(albumId, session.token);
  const currentUser = await getCurrentUser(session.token);

  if (!album) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7f2] px-5 text-zinc-950">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">앨범을 찾을 수 없습니다.</h1>
          <Link
            href="/"
            className="mt-5 inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
          >
            목록으로
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = currentUser?.user?.id === album.ownerId;
  const appOrigin = getAppOrigin(requestHeaders);

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                aria-label="내 앨범으로 돌아가기"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-lg leading-none text-zinc-800"
              >
                ←
              </Link>
              <Link href="/" className="text-sm font-medium text-zinc-500">
                내 앨범
              </Link>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              {album.title}
            </h1>
            {album.description ? (
              <p className="mt-2 text-sm text-zinc-500">{album.description}</p>
            ) : null}
          </div>
          <LogoutButton />
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <AlbumPhotoGrid
              albumId={album.id}
              isOwner={isOwner}
              currentUserId={currentUser?.user?.id ?? ""}
              photos={album.photos ?? []}
            />
            <AlbumPhotoUploadLauncher albumId={album.id} />
          </div>

          <aside className="space-y-5">
            <AlbumGroupPanel
              albumId={album.id}
              appOrigin={appOrigin}
              group={album.group}
              owner={album.owner}
            />

            <section className="rounded-lg border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold">앨범 정보</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">소유자</dt>
                  <dd className="font-medium">
                    {album.owner?.displayName ?? "사용자"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">그룹</dt>
                  <dd className="font-medium">
                    {album.group?.name ?? "연결 없음"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">수정일</dt>
                  <dd className="font-medium">{formatDate(album.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function getAppOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return host ? `${protocol}://${host}` : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
