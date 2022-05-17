import CryptoJS from "../../crypto-js/crypto-js";
export async function getAIResponses(prompt) {
  const data = {
    prompt: prompt,
    temperature: 0.5,
    max_tokens: 64,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  };

  const unlock = "password1";
  var bytes = CryptoJS.AES.decrypt(
    "U2FsdGVkX18hVge2LxQU7NxW1STzROuXpvtlQxDiU4Xm5p7RpeBcyZcIlGnRPAxekzx5ed33dL8qJEtVYAzEHR+yT8SEg/AF8XzOUEE6IEo=",
    unlock
  );
  var magic = bytes.toString(CryptoJS.enc.Utf8);

  const res = await fetch(
    "https://api.openai.com/v1/engines/text-curie-001/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${magic}`,
      },
      body: JSON.stringify(data),
    }
  );
  const AI = await res.json();
  return AI.choices[0].text;
}
