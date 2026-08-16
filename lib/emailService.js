const EMAIL_API_URL = "https://eapi.ziggymc.me/v1/";

function buildEmailUrl(params) {
  const url = new URL(EMAIL_API_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

export async function sendVerificationEmail({
  to,
  subject,
  name,
  code,
  website,
  type,
  avatarUrl,
}) {
  const key = process.env.EMAIL_KEY;
  if (!key) {
    throw new Error("EMAIL_KEY is required for sending auth emails.");
  }

  const url = buildEmailUrl({
    to,
    subject,
    name,
    code,
    website,
    type,
    expiresIn: "10 minutes",
    avatarUrl,
  });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + key,
    },
  });

  if (!res.ok) {
    throw new Error(`Email API failed with status ${res.status}`);
  }
}
