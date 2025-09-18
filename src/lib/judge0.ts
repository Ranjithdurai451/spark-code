const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions";

export interface Judge0ExecuteParams {
  code: string;
  languageId: number;
  stdin?: string;
}

export async function executeOnJudge0({
  code,
  languageId,
  stdin = "",
}: Judge0ExecuteParams) {
  const apiKey = process.env.JUDGE0_API_KEY;
  if (!apiKey) {
    throw new Error("JUDGE0_API_KEY is not set in environment");
  }

  const response = await fetch(`${JUDGE0_URL}?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Judge0 API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
