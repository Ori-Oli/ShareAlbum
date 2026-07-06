"use client";

import { useMemo, useState } from "react";
import type { ApiGroup, ApiUser } from "@/lib/api";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";

type AlbumGroupPanelProps = {
  albumId: string;
  appOrigin: string;
  group?: ApiGroup | null;
  owner?: ApiUser;
};

type InviteResponse = {
  invitePath: string;
};

export function AlbumGroupPanel({
  albumId,
  appOrigin,
  group,
  owner,
}: AlbumGroupPanelProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invitePath, setInvitePath] = useState(
    group?.inviteCode ? `/invite/${group.inviteCode}` : "",
  );
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const members = useMemo(() => {
    if (group?.members && group.members.length > 0) {
      return group.members;
    }

    if (!owner) {
      return [];
    }

    return [
      {
        id: owner.id,
        role: "OWNER" as const,
        user: owner,
      },
    ];
  }, [group?.members, owner]);

  const inviteUrl = invitePath ? `${appOrigin}${invitePath}` : "";

  async function toggleInvite() {
    const nextIsOpen = !isInviteOpen;
    setIsInviteOpen(nextIsOpen);
    setCopyStatus("idle");
    setErrorMessage(null);

    if (!nextIsOpen || invitePath || isCreatingInvite) {
      return;
    }

    setIsCreatingInvite(true);

    try {
      const response = await fetch(`${API_BASE_URL}/albums/${albumId}/invite`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(errorBody || "초대 링크 생성에 실패했습니다.");
      }

      const result = (await response.json()) as InviteResponse;
      setInvitePath(result.invitePath);
    } catch (error) {
      console.error(error);
      setErrorMessage("초대 링크를 만들지 못했습니다.");
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function copyInviteUrl() {
    if (!invitePath) {
      return;
    }

    await navigator.clipboard.writeText(
      inviteUrl || `${window.location.origin}${invitePath}`,
    );
    setCopyStatus("copied");
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">그룹원</h2>
          <p className="mt-1 text-sm text-zinc-500">{members.length}명</p>
        </div>
        <button
          type="button"
          onClick={toggleInvite}
          aria-expanded={isInviteOpen}
          aria-label="그룹원 초대 링크 열기"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-xl font-light leading-none text-white"
        >
          +
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {member.user.displayName}
                </p>
                {member.user.email ? (
                  <p className="truncate text-xs text-zinc-500">
                    {member.user.email}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs font-medium text-zinc-500">
                {member.role === "OWNER" ? "소유자" : "멤버"}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-500">
            아직 그룹원이 없습니다.
          </p>
        )}
      </div>

      {isInviteOpen ? (
        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-medium text-zinc-900">초대 링크</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            이 링크를 받은 사람은 앨범을 보고 사진을 올릴 수 있습니다.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={
                isCreatingInvite
                  ? "초대 링크 생성 중"
                  : inviteUrl || "초대 링크를 만들지 못했습니다"
              }
              className="h-10 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700"
            />
            <button
              type="button"
              onClick={copyInviteUrl}
              disabled={!invitePath || isCreatingInvite}
              className="h-10 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copyStatus === "copied" ? "복사됨" : "복사"}
            </button>
          </div>
          {errorMessage ? (
            <p className="mt-2 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
