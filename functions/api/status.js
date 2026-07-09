const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const normalize = (value) => (value || "").toString().trim().toLowerCase();

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = normalize(url.searchParams.get("email"));
  const applicationId = normalize(url.searchParams.get("applicationId"));

  if (!env.DB) {
    return json({
      ok: false,
      error: "The D1 database binding named DB is not configured yet."
    }, 500);
  }

  if (!email && !applicationId) {
    return json({
      ok: false,
      error: "Enter an email or application ID."
    }, 400);
  }

  const query = applicationId
    ? "SELECT application_id, student_name, city, status, message, updated_at FROM application_status WHERE lower(application_id) = ? LIMIT 1"
    : "SELECT application_id, student_name, city, status, message, updated_at FROM application_status WHERE lower(email) = ? LIMIT 1";

  const lookupValue = applicationId || email;
  const record = await env.DB.prepare(query).bind(lookupValue).first();

  if (!record) {
    return json({
      ok: true,
      found: false,
      status: "Not found",
      message: "No application status was found for those details yet. Check your spelling or try again later."
    });
  }

  return json({
    ok: true,
    found: true,
    application: record
  });
}
