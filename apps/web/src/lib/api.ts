const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";
const SESSION_COOKIE_NAME = "share_album_session";

export type ApiUser = {
  id: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
};

export type ApiCurrentUserResponse = {
  user: {
    id: string;
  } | null;
};

export type ApiGroup = {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  ownerId: string;
  albums?: Array<{
    id: string;
    title: string;
    description?: string | null;
  }>;
  members?: Array<{
    id: string;
    role: "OWNER" | "MEMBER";
    user: ApiUser;
  }>;
};

export type ApiAlbum = {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  ownerId: string;
  groupId?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: ApiUser;
  group?: ApiGroup | null;
  photos?: ApiPhoto[];
};

export type ApiPhoto = {
  id: string;
  albumId: string;
  uploaderId: string;
  url: string;
  originalName: string;
  title?: string | null;
  description?: string | null;
  mimeType: string;
  size: number;
  aiStatus: "PENDING" | "READY" | "FAILED";
  aiError?: string | null;
  createdAt: string;
  uploader?: ApiUser;
  tags?: Array<{
    id: string;
    photoId: string;
    tagId: string;
    source: "AI" | "USER";
    createdBy?: string | null;
    createdAt: string;
    tag: {
      id: string;
      name: string;
      createdAt: string;
    };
  }>;
  likes?: Array<{
    id: string;
    photoId: string;
    userId: string;
    createdAt: string;
    user: ApiUser;
  }>;
};

export type ApiAlbumInvite = {
  albumId: string;
  groupId: string;
  inviteCode: string;
  invitePath: string;
};

export type ApiJoinInviteResult = {
  groupId: string;
  albumId: string | null;
  alreadyOwner: boolean;
};

type FetchApiOptions = {
  method?: "DELETE" | "GET" | "PATCH" | "POST";
  body?: unknown;
  sessionToken?: string;
};

async function fetchApi<T>(
  path: string,
  options: FetchApiOptions = {},
): Promise<T | null> {
  const headers = new Headers();

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.sessionToken) {
    headers.set(
      "Cookie",
      `${SESSION_COOKIE_NAME}=${options.sessionToken}`,
    );
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getAlbums(sessionToken: string) {
  return (
    (await fetchApi<ApiAlbum[]>("/albums", {
      sessionToken,
    })) ?? []
  );
}

export async function getCurrentUser(sessionToken: string) {
  return fetchApi<ApiCurrentUserResponse>("/auth/me", {
    sessionToken,
  });
}

export async function getAlbum(albumId: string, sessionToken: string) {
  return fetchApi<ApiAlbum>(`/albums/${albumId}`, {
    sessionToken,
  });
}

export async function createAlbum(
  album: {
    title: string;
    description?: string;
  },
  sessionToken: string,
) {
  return fetchApi<ApiAlbum>("/albums", {
    method: "POST",
    body: album,
    sessionToken,
  });
}

export async function createAlbumInvite(albumId: string, sessionToken: string) {
  return fetchApi<ApiAlbumInvite>(`/albums/${albumId}/invite`, {
    method: "POST",
    sessionToken,
  });
}

export async function getInvite(inviteCode: string) {
  return fetchApi<ApiGroup>(`/groups/invite/${inviteCode}`);
}

export async function joinInvite(inviteCode: string, sessionToken: string) {
  return fetchApi<ApiJoinInviteResult>(`/groups/invite/${inviteCode}/join`, {
    method: "POST",
    sessionToken,
  });
}

export async function uploadAlbumPhoto(
  albumId: string,
  photo: File,
  sessionToken: string,
) {
  const formData = new FormData();
  formData.set("photo", photo);

  try {
    const response = await fetch(`${API_BASE_URL}/albums/${albumId}/photos`, {
      method: "POST",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
      },
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();

      throw new Error(
        `Failed to upload album photo. Status: ${response.status}. Response: ${errorBody}`,
      );
    }

    return (await response.json()) as ApiPhoto;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteAlbumPhoto(
  albumId: string,
  photoId: string,
  sessionToken: string,
) {
  return fetchApi<{ deleted: boolean }>(`/albums/${albumId}/photos/${photoId}`, {
    method: "DELETE",
    sessionToken,
  });
}

export async function deleteAlbum(albumId: string, sessionToken: string) {
  return fetchApi<{ deleted: boolean }>(`/albums/${albumId}`, {
    method: "DELETE",
    sessionToken,
  });
}

export function getApiAssetUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL.replace(/\/api$/, "")}${path}`;
}
