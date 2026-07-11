const emailScriptUrl = "https://script.google.com/macros/s/AKfycbz6PcwaGjC1cmeRIKgra5bJL-2k3ZH-8Ing_fWBwbDEjcNgRS_x0vIBdDKKpZuD9HUt/exec";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

export async function onRequestPost(context) {
  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ ok: false, error: "Invalid email request." }, 400);
  }

  if (!payload.email || !payload.application_id) {
    return json({ ok: false, error: "Missing applicant email or application ID." }, 400);
  }

  try {
    const response = await fetch(emailScriptUrl, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok || data.ok === false) {
      return json({ ok: false, error: data.error || `Email script failed with status ${response.status}.` }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error.message || "Email could not be sent." }, 502);
  }
}
