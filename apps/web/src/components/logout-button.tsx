"use client";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800"
      onClick={() => {
        window.location.href = `${API_BASE_URL}/auth/logout`;
      }}
    >
      로그아웃
    </button>
  );
}
