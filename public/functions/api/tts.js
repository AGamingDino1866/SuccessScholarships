const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

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

const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AI) {
    return json({ ok: false, error: "Read-aloud is not configured yet. Add an AI binding named 'AI' in Cloudflare Pages -> Settings -> Functions -> Bindings." }, 500);
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

  let response;
  try {
    response = await env.AI.run("@cf/myshell-ai/melotts", {
      prompt: text,
      lang: env.WORKERS_AI_TTS_LANG || "en"
    });
  } catch (e) {
    console.error("Workers AI TTS error:", e.message);
    return json({ ok: false, error: `Workers AI error: ${e.message}` }, 502);
  }

  if (!response || !response.audio) {
    return json({ ok: false, error: "Workers AI returned no audio." }, 502);
  }

  const audioBytes = base64ToBytes(response.audio);

  return new Response(audioBytes, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store"
    }
  });
}
