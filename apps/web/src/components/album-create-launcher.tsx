"use client";

import { useEffect, useRef, useState } from "react";

type AlbumCreateLauncherProps = {
  createAlbumAction: (formData: FormData) => Promise<void>;
};

export function AlbumCreateLauncher({
  createAlbumAction,
}: AlbumCreateLauncherProps) {
  const formRef = useRef<HTMLFormElement>(null);
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

  async function handleCreateAlbum(formData: FormData) {
    await createAlbumAction(formData);
    formRef.current?.reset();
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="앨범 생성"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-3xl font-light leading-none text-white shadow-lg transition hover:bg-zinc-800"
      >
        +
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="앨범 생성 닫기"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-zinc-950/20"
          />
          <section className="absolute bottom-24 right-6 w-[calc(100vw-3rem)] max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">앨범 생성</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700"
              >
                닫기
              </button>
            </div>

            <form ref={formRef} action={handleCreateAlbum} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  앨범 이름
                </span>
                <input
                  name="title"
                  required
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
                  placeholder="예: 제주 가족 여행"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">설명</span>
                <textarea
                  name="description"
                  className="mt-2 min-h-24 w-full resize-none rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-zinc-900"
                  placeholder="앨범 목적이나 공유 대상을 적어두세요."
                />
              </label>
              <button
                type="submit"
                className="h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white"
              >
                새 앨범 만들기
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
