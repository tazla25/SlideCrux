export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResult<T = any> {
  data: T;
  usage: OpenRouterUsage;
}

/**
 * Call OpenRouter's chat completion API with structured JSON output.
 * Returns both the parsed data and token usage for cost logging.
 * Includes 45s timeout and 1 retry on 5xx errors.
 */
export async function callOpenRouter(
  prompt: string,
  jsonSchema: object
): Promise<OpenRouterResult> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable");
  }

  const systemContent = `You are an expert presentation designer. Parse the transcript and structure it into a compelling slide presentation.
You must return a JSON object that strictly adheres to this JSON Schema:
${JSON.stringify(jsonSchema, null, 2)}
Ensure that you return ONLY a valid JSON object. Do not include markdown code block formatting (e.g., do not wrap the JSON in \`\`\`json ... \`\`\`).`;

  const modelName = "nvidia/nemotron-3-ultra-550b-a55b:free";
  const isFreeModel = modelName.endsWith(":free");

  const requestBody = JSON.stringify({
    model: modelName,
    messages: [
      {
        role: "system",
        content: systemContent
      },
      { role: "user", content: prompt }
    ],
    ...(isFreeModel ? {} : {
      response_format: {
        type: "json_object"
      }
    })
  });

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://slidecrux.com",
    "X-Title": "SlideCrux"
  };

  let lastError: Error | null = null;
  const MAX_RETRIES = 2; // 1 initial + 1 retry

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on 5xx errors (server-side)
      if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
        lastError = new Error(`OpenRouter returned ${response.status}, retrying...`);
        // Brief backoff before retry
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`OpenRouter API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
        throw new Error("OpenRouter API returned an empty or invalid response structure");
      }

      // Extract usage metadata
      const usage: OpenRouterUsage = {
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        total_tokens: data.usage?.total_tokens ?? 0,
      };

      let content = data.choices[0].message.content.trim();
      // Strip markdown code block wrappers if the model includes them
      if (content.startsWith("```")) {
        content = content.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      content = content.trim();

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        throw new Error(`Failed to parse OpenRouter response as JSON: ${(err as Error).message}. Content was: ${content.substring(0, 500)}`);
      }

      return { data: parsed, usage };

    } catch (err: any) {
      // Handle AbortError from timeout
      if (err.name === "AbortError") {
        lastError = new Error("OpenRouter API request timed out after 45 seconds");
      } else {
        lastError = err;
      }

      // Only retry on timeout or if we haven't exceeded retries
      if (attempt < MAX_RETRIES - 1 && (err.name === "AbortError" || err.message?.includes("5"))) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }
  }

  throw lastError || new Error("OpenRouter API call failed after retries");
}
