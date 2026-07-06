const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";

export type LoginProvider = "kakao" | "naver";

export function getProviderLoginUrl(provider: LoginProvider, nextPath?: string) {
  const url = new URL(`${API_BASE_URL}/auth/${provider}/login`);

  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}
