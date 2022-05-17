import { OPEN_AI_KEY } from "./hiddenVars";
export async function getAIResponses(prompt) {
  const data = {
    prompt: prompt,
    temperature: 0.5,
    max_tokens: 64,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  };

  const res = await fetch(
    "https://api.openai.com/v1/engines/text-curie-001/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPEN_AI_KEY}`,
      },
      body: JSON.stringify(data),
    }
  );

  const AI = await res.json();

  return AI.choices[0].text;
}
