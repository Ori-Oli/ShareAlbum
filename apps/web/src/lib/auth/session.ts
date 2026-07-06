import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "share_album_session";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);

  if (!session?.value) {
    return null;
  }

  return {
    token: session.value,
  };
}
