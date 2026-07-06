import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getCurrentUser, getInvite, joinInvite } from "@/lib/api";

export const dynamic = "force-dynamic";

type InvitePageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

async function joinInviteAction(formData: FormData) {
  "use server";

  const session = await getCurrentSession();
  const inviteCode = String(formData.get("inviteCode") ?? "");

  if (!inviteCode) {
    redirect("/");
  }

  if (!session) {
    redirect(`/login?next=/invite/${inviteCode}`);
  }

  const result = await joinInvite(inviteCode, session.token);

  if (result?.albumId) {
    redirect(`/albums/${result.albumId}`);
  }

  redirect("/");
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { inviteCode } = await params;
  const session = await getCurrentSession();
  const invite = await getInvite(inviteCode);

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7f2] px-5 text-zinc-950">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">초대를 찾을 수 없습니다.</h1>
          <Link
            href="/"
            className="mt-5 inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
          >
            내 앨범으로
          </Link>
        </div>
      </main>
    );
  }

  const album = invite.albums?.[0];

  if (session && album) {
    const currentUser = await getCurrentUser(session.token);

    if (currentUser?.user?.id === invite.ownerId) {
      redirect(`/albums/${album.id}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f2] px-5 text-zinc-950">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6">
        <p className="text-sm font-medium text-zinc-500">Share Album 초대</p>
        <h1 className="mt-2 text-2xl font-semibold">
          {album?.title ?? invite.name}
        </h1>
        {album?.description ?? invite.description ? (
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {album?.description ?? invite.description}
          </p>
        ) : null}

        {session ? (
          <form action={joinInviteAction} className="mt-6">
            <input type="hidden" name="inviteCode" value={inviteCode} />
            <button className="h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white">
              참여하고 앨범 보기
            </button>
          </form>
        ) : (
          <Link
            href={`/login?next=/invite/${inviteCode}`}
            className="mt-6 flex h-11 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white"
          >
            로그인하고 참여하기
          </Link>
        )}
      </div>
    </main>
  );
}
