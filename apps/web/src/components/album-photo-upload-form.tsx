"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";

type AlbumPhotoUploadFormProps = {
  albumId: string;
  onUploaded?: () => void;
};

export function AlbumPhotoUploadForm({
  albumId,
  onUploaded,
}: AlbumPhotoUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const files = Array.from(fileInputRef.current?.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.set("photo", file);

        const response = await fetch(
          `${API_BASE_URL}/albums/${albumId}/photos`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          },
        );

        if (!response.ok) {
          const errorBody = await response.text();

          throw new Error(errorBody || "사진 업로드에 실패했습니다.");
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
      onUploaded?.();
    } catch (error) {
      console.error(error);
      setErrorMessage("사진 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex min-h-44 flex-col items-center justify-center rounded-md bg-zinc-50 px-4 text-center"
    >
      <p className="text-sm font-medium text-zinc-800">
        사진 파일을 여기에 끌어오거나 선택하세요.
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        JPG, PNG, HEIC 파일 업로드 영역입니다.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        name="photos"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        disabled={isUploading}
        className="mt-5 w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
      />
      {errorMessage ? (
        <p className="mt-3 text-sm font-medium text-red-600">{errorMessage}</p>
      ) : null}
      <button
        type="submit"
        disabled={isUploading}
        className="mt-4 h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "업로드 중" : "사진 추가"}
      </button>
    </form>
  );
}
