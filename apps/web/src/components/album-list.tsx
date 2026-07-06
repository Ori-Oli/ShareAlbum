"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiAlbum } from "@/lib/api";
import { getApiAssetUrl } from "@/lib/api";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";

type AlbumListProps = {
  albums: ApiAlbum[];
  currentUserId: string;
};

export function AlbumList({ albums, currentUserId }: AlbumListProps) {
  const router = useRouter();
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownerAlbums = albums.filter((album) => album.ownerId === currentUserId);
  const selectedCount = selectedAlbumIds.size;

  function toggleAlbum(albumId: string) {
    setSelectedAlbumIds((current) => {
      const next = new Set(current);

      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }

      return next;
    });
  }

  function cancelDeleteMode() {
    setIsDeleteMode(false);
    setSelectedAlbumIds(new Set());
    setErrorMessage(null);
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
        Array.from(selectedAlbumIds).map(async (albumId) => {
          const response = await fetch(`${API_BASE_URL}/albums/${albumId}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (!response.ok) {
            const errorBody = await response.text();

            throw new Error(errorBody || "앨범 삭제에 실패했습니다.");
          }
        }),
      );

      cancelDeleteMode();
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("앨범 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">최근 앨범</h2>
          <span className="text-sm text-zinc-500">{albums.length}개</span>
        </div>
        {ownerAlbums.length > 0 ? (
          <div className="flex items-center gap-2">
            {isDeleteMode ? (
              <button
                type="button"
                onClick={cancelDeleteMode}
                disabled={isDeleting}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 disabled:opacity-60"
              >
                취소
              </button>
            ) : null}
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
          </div>
        ) : null}
      </div>

      {isDeleteMode ? (
        <p className="mb-3 text-sm text-zinc-500">
          삭제할 앨범의 우상단 토글을 선택한 뒤 삭제를 다시 누르세요.
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mb-3 text-sm font-medium text-red-600">{errorMessage}</p>
      ) : null}

      {albums.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-zinc-800">
            아직 앨범이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {albums.map((album) => {
            const isOwner = album.ownerId === currentUserId;
            const isSelected = selectedAlbumIds.has(album.id);
            const cardContent = (
              <>
                <div className="relative">
                  <AlbumPreview photos={album.photos ?? []} />
                  {isDeleteMode && isOwner ? (
                    <label className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/95 shadow-sm">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAlbum(album.id)}
                        disabled={isDeleting}
                        className="h-4 w-4 accent-red-600"
                        aria-label={`${album.title} 삭제 선택`}
                      />
                    </label>
                  ) : null}
                </div>
                <div className="mt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">
                        {album.title}
                      </h3>
                      {album.description ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          {album.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatDate(album.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-zinc-600">
                    <span>{album.owner?.displayName ?? "사용자"}</span>
                    {album.group ? <span>{album.group.name}</span> : null}
                  </div>
                </div>
              </>
            );

            if (isDeleteMode) {
              return (
                <div
                  key={album.id}
                  className={`group rounded-md border bg-white p-3 pb-5 shadow-sm ${
                    isSelected ? "border-red-500" : "border-zinc-200"
                  } ${isOwner ? "" : "opacity-70"}`}
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="group rounded-md border border-zinc-200 bg-white p-3 pb-5 shadow-sm transition hover:border-zinc-400"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

type AlbumPreviewProps = {
  photos: Array<{
    id: string;
    url: string;
    originalName: string;
  }>;
};

function AlbumPreview({ photos }: AlbumPreviewProps) {
  const previewPhotos = photos.slice(0, 3);

  if (previewPhotos.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-zinc-100">
        <span className="text-sm font-medium text-zinc-500">
          사진이 없습니다
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-zinc-100">
      {previewPhotos
        .slice()
        .reverse()
        .map((photo, reverseIndex) => {
          const index = previewPhotos.length - 1 - reverseIndex;

          return (
            <PhotoCard
              key={photo.id}
              photo={photo}
              className={getPreviewPhotoLayout(index)}
            />
          );
        })}
    </div>
  );
}

function PhotoCard({
  photo,
  className,
}: {
  photo: AlbumPreviewProps["photos"][number];
  className: string;
}) {
  return (
    <div
      className={`absolute aspect-square rounded-sm bg-white p-2 shadow-lg transition duration-150 group-hover:-translate-y-1 ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-sm bg-zinc-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getApiAssetUrl(photo.url)}
          alt={photo.originalName}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function getPreviewPhotoLayout(index: number) {
  const layouts = [
    "left-1/2 top-[14%] z-30 w-[72%] -translate-x-1/2 rotate-3",
    "left-[14%] top-[18%] z-20 w-[66%] -rotate-12 opacity-95",
    "right-[11%] top-[21%] z-10 w-[62%] rotate-12 opacity-90",
  ];

  return layouts[index] ?? layouts[layouts.length - 1];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
