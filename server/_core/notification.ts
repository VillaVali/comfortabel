/**
 * Owner notification helper — sends a push notification to the Manus project owner.
 * Uses the built-in Forge API (BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY).
 * Returns true on success, false if the upstream service is temporarily unavailable.
 */
export async function notifyOwner(args: { title: string; content: string }): Promise<boolean> {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const appId = process.env.VITE_APP_ID;

  if (!apiUrl || !apiKey || !appId) {
    console.warn("[notifyOwner] Missing env vars — notification skipped.");
    return false;
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        title: args.title,
        content: args.content,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[notifyOwner] Failed to send notification:", e);
    return false;
  }
}
