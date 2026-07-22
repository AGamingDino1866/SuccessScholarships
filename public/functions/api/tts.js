const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah - natural feminine voice, usable on free tier without adding to "My Voices"
const MAX_CHARS = 4000;
const IP_DAILY_CHAR_LIMIT = 20000;
const unlimitedAiEmail = "sahulatfamilypk@gmail.com";

const ipUsage = new Map();

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
const getClientIp = (request) => request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
const getTokenEmail = (request) => {
  const token = request.headers.get("x-firebase-token") || "";
  const payload = token.split(".")[1];
  if (!payload) return "";
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return String(JSON.parse(atob(base64)).email || "").trim().toLowerCase();
  } catch {
    return "";
  }
};

const reserveChars = (request, chars) => {
  if (getTokenEmail(request) === unlimitedAiEmail) return true;

  const key = `${todayKey()}:${getClientIp(request)}`;
  const used = ipUsage.get(key) || 0;
  if (used + chars > IP_DAILY_CHAR_LIMIT) return false;
  ipUsage.set(key, used + chars);

  if (ipUsage.size > 2000) {
    for (const storedKey of ipUsage.keys()) {
      if (!storedKey.startsWith(`${todayKey()}:`)) ipUsage.delete(storedKey);
    }
  }

  return true;
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ELEVENLABS_API_KEY) {
    return json({ ok: false, error: "Read-aloud is not configured yet. Add ELEVENLABS_API_KEY in Cloudflare Pages environment variables." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const raw = String(body.text || "").trim();
  if (!raw) return json({ ok: false, error: "No text to read." }, 400);

  const text = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS).replace(/\s+\S*$/, "") : raw;

  if (!reserveChars(request, text.length)) {
    return json({ ok: false, error: "Read-aloud limit reached for today. Please try again tomorrow." }, 429);
  }

  const voiceId = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "audio/mpeg",
      "xi-api-key": env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text,
      model_id: env.ELEVENLABS_MODEL || "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });

  if (!elevenResponse.ok) {
    const errText = await elevenResponse.text().catch(() => "");
    console.error("ElevenLabs error:", elevenResponse.status, errText);
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail?.message || parsed.detail?.status || parsed.detail || errText;
    } catch {
      // errText wasn't JSON, use as-is
    }
    return json({ ok: false, error: `ElevenLabs ${elevenResponse.status}: ${String(detail).slice(0, 300)}` }, 502);
  }

  return new Response(elevenResponse.body, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store"
    }
  });
}
