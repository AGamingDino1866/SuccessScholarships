export async function onRequest(context) {
  const { request } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { text, targetLang } = await request.json();

    if (!text || !targetLang) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing text or targetLang' }), { status: 400 });
    }

    // Use MyMemory API for free translation (no auth required)
    // For production with higher accuracy, consider Google Translate API (requires key)
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Translation API error' }), { status: 500 });
    }

    const data = await response.json();

    if (data.responseStatus === 200) {
      return new Response(
        JSON.stringify({
          ok: true,
          translatedText: data.responseData.translatedText,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: 'Translation failed', status: data.responseStatus }),
        { status: 500 }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500 }
    );
  }
}
