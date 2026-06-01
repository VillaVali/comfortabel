export { COOKIE_NAME } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath = "/mijn") => {
  const appId = import.meta.env.VITE_APP_ID || "";
  const oauthPortal = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://manus.im";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(JSON.stringify({ returnPath }));
  const url = new URL(`${oauthPortal}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};
