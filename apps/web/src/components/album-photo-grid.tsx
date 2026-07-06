"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiPhoto } from "@/lib/api";
import { getApiAssetUrl } from "@/lib/api";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";

type AlbumPhotoGridProps = {
  albumId: string;
  isOwner: boolean;
  currentUserId: string;
  photos: ApiPhoto[];
};

export function AlbumPhotoGrid({
  albumId,
  isOwner,
  currentUserId,
  photos,
}: AlbumPhotoGridProps) {
  const router = useRouter();
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<ApiPhoto | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCount = selectedPhotoIds.size;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visiblePhotos = normalizedSearchQuery
    ? photos.filter((photo) => photoMatchesSearch(photo, normalizedSearchQuery))
    : photos;

  useEffect(() => {
    if (!photos.some((photo) => photo.aiStatus === "PENDING")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [photos, router]);

  useEffect(() => {
    if (!viewerPhoto) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewerPhoto(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewerPhoto]);

  function togglePhoto(photoId: string) {
    setSelectedPhotoIds((current) => {
      const next = new Set(current);

      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }

      return next;
    });
  }

  function cancelDeleteMode() {
    setIsDeleteMode(false);
    setSelectedPhotoIds(new Set());
    setErrorMessage(null);
  }

  function toggleSearch() {
    setIsSearchOpen((current) => {
      if (current) {
        setSearchQuery("");
      }

      return !current;
    });
  }

  async function handleDeleteClick() {
    if (!isDeleteMode) {
      setIsDeleteMode(true);
      setErrorMessage(null);
      return;
    }

    if (selectedCount === 0) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await Promise.all(
        Array.from(selectedPhotoIds).map(async (photoId) => {
          const response = await fetch(
            `${API_BASE_URL}/albums/${albumId}/photos/${photoId}`,
            {
              method: "DELETE",
              credentials: "include",
            },
          );

          if (!response.ok) {
            const errorBody = await response.text();

            throw new Error(errorBody || "사진 삭제에 실패했습니다.");
          }
        }),
      );

      cancelDeleteMode();
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("사진 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">사진</h2>
          <span className="text-sm text-zinc-500">
            {normalizedSearchQuery
              ? `${visiblePhotos.length}/${photos.length}장`
              : `${photos.length}장`}
          </span>
        </div>
        {photos.length > 0 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSearch}
              className={`h-9 rounded-md border px-3 text-sm font-medium ${
                isSearchOpen
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              검색
            </button>
            {isOwner && isDeleteMode ? (
              <button
                type="button"
                onClick={cancelDeleteMode}
                disabled={isDeleting}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 disabled:opacity-60"
              >
                취소
              </button>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting || (isDeleteMode && selectedCount === 0)}
                className="h-9 rounded-md bg-red-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleteMode
                  ? isDeleting
                    ? "삭제 중"
                    : `삭제${selectedCount > 0 ? ` ${selectedCount}` : ""}`
                  : "삭제"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isSearchOpen ? (
        <div className="mt-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="제목 또는 태그로 검색"
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
          />
        </div>
      ) : null}

      {isDeleteMode ? (
        <p className="mt-3 text-sm text-zinc-500">
          삭제할 사진의 우상단 토글을 선택한 뒤 삭제를 다시 누르세요.
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 text-sm font-medium text-red-600">{errorMessage}</p>
      ) : null}

      {photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visiblePhotos.map((photo) => {
            const isSelected = selectedPhotoIds.has(photo.id);

            return (
              <figure
                key={photo.id}
                className={`overflow-hidden rounded-md border bg-zinc-50 ${
                  isSelected ? "border-red-500" : "border-zinc-200"
                }`}
              >
                <div className="relative aspect-square w-full">
                  {isDeleteMode ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getApiAssetUrl(photo.url)}
                        alt={photo.originalName}
                        className="h-full w-full object-cover"
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewerPhoto(photo)}
                      className="block h-full w-full cursor-zoom-in"
                      aria-label={`${photo.originalName} 크게 보기`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getApiAssetUrl(photo.url)}
                        alt={photo.originalName}
                        className="h-full w-full object-cover transition duration-150 hover:scale-[1.02]"
                      />
                    </button>
                  )}
                  {isDeleteMode ? (
                    <label className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/95 shadow-sm">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePhoto(photo.id)}
                        disabled={isDeleting}
                        className="h-4 w-4 accent-red-600"
                        aria-label={`${photo.originalName} 삭제 선택`}
                      />
                    </label>
                  ) : null}
                </div>
                <figcaption className="space-y-2 px-3 py-2 text-xs text-zinc-500">
                  <p className="truncate">{photo.originalName}</p>
                  <PhotoTags photo={photo} />
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : null}

      {photos.length > 0 && visiblePhotos.length === 0 ? (
        <div className="mt-4 rounded-md bg-zinc-50 p-8 text-center">
          <p className="text-sm font-medium text-zinc-800">
            일치하는 사진이 없습니다.
          </p>
        </div>
      ) : (
        photos.length === 0 ? (
          <div className="mt-4 rounded-md bg-zinc-50 p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">
              아직 업로드된 사진이 없습니다.
            </p>
          </div>
        ) : null
      )}

      {viewerPhoto ? (
        <PhotoViewer
          albumId={albumId}
          currentUserId={currentUserId}
          photo={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          onPhotoChange={(photo) => {
            setViewerPhoto(photo);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function PhotoTags({
  photo,
  variant = "light",
}: {
  photo: ApiPhoto;
  variant?: "light" | "dark";
}) {
  if (photo.aiStatus === "PENDING") {
    return (
      <p className={variant === "dark" ? "text-zinc-500" : "text-zinc-400"}>
        태그 생성 중
      </p>
    );
  }

  if (photo.aiStatus === "FAILED") {
    return <p className="font-medium text-red-500">태그 생성 실패</p>;
  }

  const tagNames = getPhotoTagNames(photo);
  const visibleTagNames = tagNames.slice(0, 3);

  if (visibleTagNames.length === 0) {
    return (
      <p className={variant === "dark" ? "text-zinc-500" : "text-zinc-400"}>
        태그 없음
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTagNames.map((tagName) => (
        <span
          key={tagName}
          className={
            variant === "dark"
              ? "rounded-full bg-white/10 px-2 py-0.5 font-medium text-zinc-100"
              : "rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700"
          }
        >
          #{tagName}
        </span>
      ))}
    </div>
  );
}

function PhotoViewer({
  albumId,
  currentUserId,
  photo,
  onClose,
  onPhotoChange,
}: {
  albumId: string;
  currentUserId: string;
  photo: ApiPhoto;
  onClose: () => void;
  onPhotoChange: (photo: ApiPhoto) => void;
}) {
  const [title, setTitle] = useState(photo.title ?? "");
  const [description, setDescription] = useState(photo.description ?? "");
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLikeSaving, setIsLikeSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const uploadedAt = formatUploadedAt(photo.createdAt);
  const displayName = getPhotoDisplayName(photo);
  const likes = photo.likes ?? [];
  const isLikedByMe = likes.some((like) => like.userId === currentUserId);

  async function updatePhotoMetadata() {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/albums/${albumId}/photos/${photo.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            title,
            description,
          }),
        },
      );

      const updatedPhoto = await readPhotoResponse(response);
      onPhotoChange(updatedPhoto);
    } catch (error) {
      console.error(error);
      setErrorMessage("사진 정보를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addTag() {
    const name = tagInput.trim();

    if (!name) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/albums/${albumId}/photos/${photo.id}/tags`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
          }),
        },
      );

      const updatedPhoto = await readPhotoResponse(response);
      setTagInput("");
      onPhotoChange(updatedPhoto);
    } catch (error) {
      console.error(error);
      setErrorMessage("태그를 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTag(photoTagId: string) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/albums/${albumId}/photos/${photo.id}/tags/${photoTagId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const updatedPhoto = await readPhotoResponse(response);
      onPhotoChange(updatedPhoto);
    } catch (error) {
      console.error(error);
      setErrorMessage("태그를 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleLike() {
    setIsLikeSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/albums/${albumId}/photos/${photo.id}/likes`,
        {
          method: isLikedByMe ? "DELETE" : "POST",
          credentials: "include",
        },
      );

      const updatedPhoto = await readPhotoResponse(response);
      onPhotoChange(updatedPhoto);
    } catch (error) {
      console.error(error);
      setErrorMessage("공감을 저장하지 못했습니다.");
    } finally {
      setIsLikeSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 상세 보기"
      className="fixed inset-0 z-50 bg-zinc-950 text-white"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 h-10 rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm"
      >
        닫기
      </button>

      <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1">
        <div className="flex min-h-0 items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getApiAssetUrl(photo.url)}
            alt={displayName}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <aside className="max-h-[42vh] overflow-y-auto border-t border-white/10 bg-zinc-900 p-5 lg:max-h-none lg:border-l lg:border-t-0 lg:p-6">
          <div className="space-y-5">
            <div>
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400">
                이름
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={photo.originalName}
                  className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-white/40"
                />
              </label>

              <label className="block text-xs font-medium text-zinc-400">
                설명
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
              </label>

              <button
                type="button"
                onClick={updatePhotoMetadata}
                disabled={isSaving}
                className="h-9 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                저장
              </button>
            </div>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-zinc-400">올린 사람</dt>
                <dd className="mt-1 text-white">
                  {photo.uploader?.displayName ?? "알 수 없음"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-400">올린 시간</dt>
                <dd className="mt-1 text-white">{uploadedAt}</dd>
              </div>
            </dl>

            <div>
              <button
                type="button"
                onClick={toggleLike}
                disabled={isLikeSaving}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                  isLikedByMe
                    ? "bg-red-500 text-white"
                    : "bg-white text-zinc-950"
                }`}
              >
                <span aria-hidden="true">{isLikedByMe ? "♥" : "♡"}</span>
                <span>{likes.length}</span>
              </button>
              <div className="mt-3">
                <p className="text-xs font-medium text-zinc-400">공감한 사람</p>
                {likes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {likes.map((like) => (
                      <span
                        key={like.id}
                        className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-zinc-100"
                      >
                        {like.user.displayName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">
                    아직 공감이 없습니다.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-400">태그</p>
              <div className="mt-2 space-y-3">
                <EditablePhotoTags
                  photo={photo}
                  disabled={isSaving}
                  onDelete={deleteTag}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addTag();
                      }
                    }}
                    className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-white/40"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={isSaving || !tagInput.trim()}
                    className="h-9 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>

            {errorMessage ? (
              <p className="text-sm font-medium text-red-300">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function EditablePhotoTags({
  photo,
  disabled,
  onDelete,
}: {
  photo: ApiPhoto;
  disabled: boolean;
  onDelete: (photoTagId: string) => void;
}) {
  const tags =
    photo.tags
      ?.map((photoTag) =>
        photoTag.tag?.name
          ? {
              id: photoTag.id,
              name: photoTag.tag.name,
            }
          : null,
      )
      .filter((tag): tag is { id: string; name: string } => Boolean(tag)) ??
    [];

  if (photo.aiStatus === "PENDING") {
    return <p className="text-xs text-zinc-500">태그 생성 중</p>;
  }

  if (tags.length === 0) {
    return <p className="text-xs text-zinc-500">태그 없음</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-2 pr-1 text-xs font-medium text-zinc-100"
        >
          #{tag.name}
          <button
            type="button"
            onClick={() => onDelete(tag.id)}
            disabled={disabled}
            className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${tag.name} 태그 삭제`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

async function readPhotoResponse(response: Response) {
  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(errorBody || "Photo request failed.");
  }

  return (await response.json()) as ApiPhoto;
}

function getPhotoDisplayName(photo: ApiPhoto) {
  return photo.title?.trim() || photo.originalName;
}

function getPhotoTagNames(photo: ApiPhoto) {
  return (
    photo.tags
      ?.map((photoTag) => photoTag.tag?.name)
      .filter((tagName): tagName is string => Boolean(tagName)) ?? []
  );
}

function photoMatchesSearch(photo: ApiPhoto, normalizedSearchQuery: string) {
  const searchableNames = [photo.title, photo.originalName]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  if (searchableNames.some((name) => name.includes(normalizedSearchQuery))) {
    return true;
  }

  return getPhotoTagNames(photo).some((tagName) =>
    tagName.toLowerCase().includes(normalizedSearchQuery),
  );
}

function formatUploadedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
