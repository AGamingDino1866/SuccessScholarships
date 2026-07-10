const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const siteContext = `Success Club 2026 scholarship portal context:
- Purpose: help underprivileged students continue their education through a merit-based scholarship effort aligned with SDG 4 Quality Education.
- Audience: students and families preparing scholarship applications in Karachi, Lahore, Islamabad, or nearby areas.
- Home page: introduces the program and its mission.
- My Applications page: students sign in with Google, fill the built-in application form, and submit details including student name, city, grade, school, guardian contact, financial need, and academic goals.
- Status page: students check application progress with their application ID.
- Resources page: gives preparation guidance for scholarship applications.
- Ask AI page: helps students write clearer application answers.
- Contact page: official help email is successscholarships2026@gmail.com.
- Admin page: hidden page for the scholarship team to review applications and update statuses.
- AI Scholar cannot see submitted applications, cannot check live status, cannot approve/reject students, and cannot change admin records.`;

const systemPrompt = `You are AI Scholar for the Success Club 2026 scholarship portal.
Use only the website context below and the student's question.
${siteContext}

Scope rules:
- Answer only questions related to Success Club 2026, scholarship applications, education goals, financial-need wording, application preparation, status wording, documents, contacting the program, or using this website.
- If a question is unrelated, politely refuse in one short sentence and redirect the student to ask about the scholarship application or website.
- Do not give unrelated study tips, random facts, general life advice, entertainment, coding help, medical/legal/financial advice, or anything outside this portal.
- Do not promise approval, invent official decisions, claim to check live records, or ask for passwords, ID numbers, bank details, or sensitive documents.
- Keep answers warm, concise, practical, and student-friendly.
- If official help is needed, tell them to contact successscholarships2026@gmail.com.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GROQ_API_KEY) {
    return json({ ok: false, error: "AI Scholar is not configured yet. Add GROQ_API_KEY in Cloudflare Pages environment variables." }, 500);
  }

  if (!request.headers.get("x-firebase-token")) {
    return json({ ok: false, error: "Please sign in with Google before using AI Scholar." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Send a valid question." }, 400);
  }

  const message = String(body.message || "").trim();
  if (!message) return json({ ok: false, error: "Ask a question first." }, 400);
  if (message.length > 1200) return json({ ok: false, error: "Please keep questions under 1200 characters." }, 400);

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.2,
      max_completion_tokens: 450
    })
  });

  const payload = await groqResponse.json().catch(() => ({}));
  if (!groqResponse.ok) {
    return json({ ok: false, error: payload.error?.message || "Groq could not answer right now." }, 502);
  }

  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) return json({ ok: false, error: "AI Scholar returned an empty answer." }, 502);

  return json({ ok: true, answer });
}
