export async function generateResponse(message: string): Promise<string> {
  const userMsg = (message ?? "").trim();
  if (!userMsg) return "Please enter a message about animals or species.";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that ONLY answers questions about animals and species (habitat, diet, conservation status, taxonomy, behavior, etc.). If a question is unrelated, politely say you only handle animal/species topics.",
          },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstream error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const content =
      json?.choices?.[0]?.message?.content ??
      "I couldn't find an answer. Try rephrasing your question about animals or species.";
    return String(content);
  } catch {
    return "Sorry—I'm having trouble reaching the species knowledge service right now. Please try again in a moment.";
  }
}
