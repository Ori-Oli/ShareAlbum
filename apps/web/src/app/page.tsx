import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { createAlbum, getAlbums, getCurrentUser } from "@/lib/api";
import { AlbumCreateLauncher } from "@/components/album-create-launcher";
import { AlbumList } from "@/components/album-list";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

async function createAlbumAction(formData: FormData) {
  "use server";

  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return;
  }

  await createAlbum(
    {
      title,
      description: description || undefined,
    },
    session.token,
  );

  revalidatePath("/");
}

export default async function Home() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const albums = await getAlbums(session.token);
  const currentUser = await getCurrentUser(session.token);

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">Share Album</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              내 앨범
            </h1>
          </div>
          <LogoutButton />
        </header>

        <section className="flex-1 py-6">
          <AlbumList
            albums={albums}
            currentUserId={currentUser?.user?.id ?? ""}
          />
          <AlbumCreateLauncher createAlbumAction={createAlbumAction} />
        </section>
      </div>
    </main>
  );
}
