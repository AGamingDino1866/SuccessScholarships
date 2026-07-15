const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const ipUsage = new Map();
const IP_DAILY_LIMIT = 150;

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
const getClientIp = (request) => request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
const reserveIpMessage = (request) => {
  const ip = getClientIp(request);
  const key = `${todayKey()}:${ip}`;
  const current = ipUsage.get(key) || 0;
  if (current >= IP_DAILY_LIMIT) return false;
  ipUsage.set(key, current + 1);

  if (ipUsage.size > 2000) {
    for (const storedKey of ipUsage.keys()) {
      if (!storedKey.startsWith(`${todayKey()}:`)) ipUsage.delete(storedKey);
    }
  }

  return true;
};

const siteContext = `Success Club 2026 scholarship portal context:
- Purpose: help underprivileged students continue their education through a merit-based scholarship effort aligned with SDG 4 Quality Education.
- Audience: students and families preparing scholarship applications in Karachi, Lahore, Islamabad, or nearby areas.
- Home page: introduces the program and its mission.
- My Applications page: students sign in with Google, fill the built-in application form, and submit details including student name, city, grade, school, guardian contact, financial need, and academic goals.
- Ask AI page: helps students write clearer application answers.
- Eligibility page: summarizes the scholarship eligibility framework. The assessment is need-based and uses six weighted indicators: household monthly income 40%, household size and income per family member 15%, educational financial burden 15%, household vulnerability 15%, employment stability of guardians 10%, and academic commitment 5%. Income priorities are: below PKR 45,000 highest priority; PKR 45,001-60,000 high priority; PKR 60,001-80,000 moderate priority; PKR 80,001-100,000 limited consideration; above PKR 100,000 generally not eligible except exceptional hardship. Vulnerability can include orphaned students, single-parent or female-headed households, disabled earning members, chronic illness, refugees or internally displaced households, or families affected by natural disasters. Educational burden includes tuition, admission, exam, transport, books, stationery, uniforms, internet, number of enrolled children, and dropout risk. Academic commitment includes regular attendance, satisfactory performance, and teacher/institution recommendation. Suggested documentation includes CNIC or B-Form, FRC, income certificate or salary slip, utility bill, admission letter or fee challan, attendance record, teacher recommendation, disability certificate if applicable, death certificate for orphan applicants, and social welfare registration such as BISP or Zakat where available. Students should submit the website application first, then email applicable documents as PDF attachments to successscholarships2026@gmail.com with their application ID in the email subject.
- Status page: students check application progress with their application ID.
- Contact page: official help email is successscholarships2026@gmail.com.
- Admin page: hidden page for the scholarship team to review applications and update statuses.
- AI Scholar cannot see submitted applications, cannot check live status, cannot approve/reject students, and cannot change admin records.`;

const systemPrompt = `You are AI Scholar for the Success Club 2026 scholarship portal.
Use only the website context below, the recent conversation, and the student's latest question.
${siteContext}

Conversation memory rules:
- Use the recent chat history to understand follow-up questions, pronouns, drafts, and what the student already asked.
- Do not claim memory outside the provided recent chat history.
- If the student asks to continue or revise something, use the most relevant previous message from the recent chat.

Scope rules:
- Answer only questions related to Success Club 2026, scholarship applications, education goals, financial-need wording, application preparation, status wording, documents, contacting the program, or using this website.
- If a question is unrelated, politely refuse in one short sentence and redirect the student to ask about the scholarship application or website.
- Do not give unrelated study tips, random facts, general life advice, entertainment, coding help, medical/legal/financial advice, or anything outside this portal.
- Do not promise approval, invent official decisions, claim to check live records, or ask for passwords, ID numbers, bank details, or sensitive documents.
- Keep answers warm, concise, practical, and student-friendly.
- If official help is needed, tell them to contact successscholarships2026@gmail.com.`;

const cleanHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-12)
    .map((item) => {
      const role = item?.role === "assistant" || item?.role === "ai" ? "assistant" : item?.role === "user" ? "user" : null;
      const content = String(item?.content || item?.text || "").trim().slice(0, 1200);
      return role && content ? { role, content } : null;
    })
    .filter(Boolean);
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GROQ_API_KEY) {
    return json({ ok: false, error: "AI Scholar is not configured yet. Add GROQ_API_KEY in Cloudflare Pages environment variables." }, 500);
  }

  if (!request.headers.get("x-firebase-token")) {
    return json({ ok: false, error: "Please sign in with Google before using AI Scholar." }, 401);
  }

  if (!reserveIpMessage(request)) {
    return json({ ok: false, error: "Too many AI Scholar messages from this network today. Please try again tomorrow." }, 429);
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

  const history = cleanHistory(body.history).filter((item, index, list) => index < list.length - 1 || item.content !== message);

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
        ...history,
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
