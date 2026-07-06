"use client";

import { useEffect, useState } from "react";
import { AlbumPhotoUploadForm } from "@/components/album-photo-upload-form";

type AlbumPhotoUploadLauncherProps = {
  albumId: string;
};

export function AlbumPhotoUploadLauncher({
  albumId,
}: AlbumPhotoUploadLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="사진 올리기"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-3xl font-light leading-none text-white shadow-lg transition hover:bg-zinc-800"
      >
        +
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="사진 올리기 닫기"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-zinc-950/20"
          />
          <section className="absolute bottom-24 right-6 w-[calc(100vw-3rem)] max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">사진 올리기</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700"
              >
                닫기
              </button>
            </div>
            <AlbumPhotoUploadForm
              albumId={albumId}
              onUploaded={() => setIsOpen(false)}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
