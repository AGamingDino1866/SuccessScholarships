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

    // Trim and validate text
    const trimmedText = text.trim();
    if (!trimmedText) {
      return new Response(JSON.stringify({ ok: false, error: 'Empty text' }), { status: 400 });
    }

    // Use MyMemory API for free translation (no auth required)
    // For production with higher accuracy, consider Google Translate API (requires key)
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmedText)}&langpair=en|${targetLang}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`MyMemory API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ ok: false, error: `API error: ${response.status}` }),
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log(`Translation response status: ${data.responseStatus}`);

    // MyMemory returns status 200 for success
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      return new Response(
        JSON.stringify({
          ok: true,
          translatedText: data.responseData.translatedText,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('MyMemory response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Translation failed',
          status: data.responseStatus,
          details: data.responseData?.exception,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
