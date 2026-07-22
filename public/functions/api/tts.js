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
const DEFAULT_VOICE = "en-US-AriaNeural"; // warm, natural Microsoft neural feminine voice

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

// Microsoft Edge's "Read Aloud" speech endpoint - the same free neural voices Edge browser
// uses, reachable over a WebSocket handshake. Unofficial (not a published API), but widely
// relied upon and has no usage cost or account requirement.
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const EDGE_TTS_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

const uuidNoDashes = () => crypto.randomUUID().replace(/-/g, "");

const edgeTimestamp = () => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
};

const escapeSsml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const synthesizeWithEdgeTts = (text, voice) => new Promise((resolve, reject) => {
  const connectionId = uuidNoDashes();
  const wsUrl = `${EDGE_TTS_URL}&ConnectionId=${connectionId}`;

  const timeoutId = setTimeout(() => {
    reject(new Error("Edge TTS timed out"));
  }, 15000);

  fetch(wsUrl, {
    headers: {
      "Upgrade": "websocket",
      "Pragma": "no-cache",
      "Cache-Control": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"
    }
  }).then((resp) => {
    const ws = resp.webSocket;
    if (!ws) {
      clearTimeout(timeoutId);
      reject(new Error("Edge TTS did not accept the WebSocket upgrade"));
      return;
    }

    ws.accept();
    const audioChunks = [];

    ws.addEventListener("message", (event) => {
      const data = event.data;
      if (typeof data === "string") {
        if (data.includes("Path:turn.end")) {
          clearTimeout(timeoutId);
          ws.close();
          resolve(audioChunks);
        }
        return;
      }
      // Binary frame: first 2 bytes (big-endian) give the header text's length;
      // everything after that header is raw audio for this chunk.
      const buffer = new Uint8Array(data);
      const headerLength = (buffer[0] << 8) | buffer[1];
      audioChunks.push(buffer.slice(2 + headerLength));
    });

    ws.addEventListener("close", () => {
      clearTimeout(timeoutId);
      resolve(audioChunks);
    });

    ws.addEventListener("error", () => {
      clearTimeout(timeoutId);
      reject(new Error("Edge TTS WebSocket error"));
    });

    const requestId = uuidNoDashes();
    const timestamp = edgeTimestamp();

    const configMessage = `X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
            outputFormat: "audio-24khz-48kbitrate-mono-mp3"
          }
        }
      }
    })}`;

    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeSsml(text)}</prosody></voice></speak>`;
    const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`;

    ws.send(configMessage);
    ws.send(ssmlMessage);
  }).catch((err) => {
    clearTimeout(timeoutId);
    reject(err);
  });
});

export async function onRequestPost(context) {
  const { request, env } = context;

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

  const voice = env.EDGE_TTS_VOICE || DEFAULT_VOICE;

  let audioChunks;
  try {
    audioChunks = await synthesizeWithEdgeTts(text, voice);
  } catch (e) {
    console.error("Edge TTS error:", e.message);
    return json({ ok: false, error: `Edge TTS error: ${e.message}` }, 502);
  }

  const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (totalLength === 0) {
    return json({ ok: false, error: "Edge TTS returned no audio." }, 502);
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return new Response(merged, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store"
    }
  });
}
