const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true";
const JUDGE0_KEY = process.env.JUDGE0_KEY!;

export async function executeCode({ code, language, input }: { code: string, language: string, input?: string }) {
  const langMap: Record<string, number> = {
    python: 71,
    javascript: 63,
    cpp: 54,
    java: 62,
  };
  const language_id = langMap[language];
  if (!language_id) throw new Error("Unsupported language");

  const res = await fetch(JUDGE0_URL, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
      "X-RapidAPI-Key": JUDGE0_KEY ,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    }),
    body: JSON.stringify({
      source_code: code,
      language_id,
      stdin: input || "",
    }),
  });
  if (!res.ok) throw new Error("Execution failed");
  const data = await res.json();
  console.log(data);
  // Normalize output for frontend
  return {
    output: data.stdout || data.stderr || data.compile_output || data.message || "No output",
    ...data
  };
}