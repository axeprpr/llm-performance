const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export function countTokensByRule(text: string): number {
  const specialApostropheWords = ["'cause", "'em", "'kay", "'nother", "'round", "'scuse", "'sup", "'til"];
  const oneTokenWords = ["don't", "can't", "won't"];
  const twoTokenWords = [
    "I'm", "we're", "you're", "they're", "I've", "we've", "you've", "they've",
    "I'd", "we'd", "you'd", "he'd", "she'd", "they'd", "I'll", "we'll", "you'll", "he'll", "she'll", "they'll",
    "isn't", "aren't", "wasn't", "weren't", "doesn't", "didn't", "hasn't", "haven't", "shouldn't", "wouldn't", "couldn't",
    "it's", "he's", "she's", "that's", "there's", "who's"
  ];
  let tokens: string[] = [];
  let s = text;
  specialApostropheWords.forEach(w => {
    s = s.replace(new RegExp(w.replace("'", "\\'"), 'gi'), m => { tokens.push(m); return ' '.repeat(m.length); });
  });
  oneTokenWords.forEach(w => {
    s = s.replace(new RegExp(w.replace("'", "\\'"), 'gi'), m => { tokens.push(m); return ' '.repeat(m.length); });
  });
  twoTokenWords.forEach(w => {
    s = s.replace(new RegExp(w.replace("'", "\\'"), 'gi'), m => {
      const parts = m.split(/'/); tokens.push(parts[0]); tokens.push("'" + parts[1]); return ' '.repeat(m.length);
    });
  });
  const enPunct = /[,.!?;:'"()\[\]{}]/;
  const cnPunct = /[，。！？；：''""（）【】｛｝]/;
  const isSep = (ch: string) => ch === ' ' || enPunct.test(ch) || cnPunct.test(ch) || ch === '\n' || ch === '\t' || ch === '\r';
  const isDig = (ch: string) => /[0-9]/.test(ch);
  let buf = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (isSep(ch)) {
      if (buf.length > 0) { tokens.push(buf); buf = ''; }
      if (ch !== ' ' && ch !== '\t' && ch !== '\r') tokens.push(ch);
      i++; continue;
    }
    if (isDig(ch)) {
      if (buf.length > 0) { tokens.push(buf); buf = ''; }
      tokens.push(ch); i++; continue;
    }
    buf += ch; i++;
  }
  if (buf.length > 0) tokens.push(buf);
  return tokens.filter(t => t && t.length > 0).length;
}

export function generateSystemPrompt(): string {
  return 'You are a assistant.';
}

export function generateUserPrompt(length: number): string {
  const fixedPrompt = '\nRepeat the above content one hundred times.';
  const fixedLen = countTokensByRule(fixedPrompt);
  const needLen = length - fixedLen;
  let prompt = '';
  for (let i = 0; i < needLen; i++) {
    if (i > 0) prompt += ' ';
    prompt += words[Math.floor(Math.random() * words.length)];
  }
  return prompt + fixedPrompt;
}

/**
 * Normalize a user-entered URL to a full /v1/chat/completions endpoint.
 * Accepts:
 *   - https://api.example.com
 *   - https://api.example.com/v1
 *   - https://api.example.com/v1/chat/completions
 *   - https://api.example.com:8080
 */
export function normalizeChatUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  if (url.endsWith('/completions')) {
    // e.g. /v1/completions -> /v1/chat/completions
    return url.replace(/\/completions$/, '/chat/completions');
  }
  if (url.endsWith('/v1')) return url + '/chat/completions';
  // No known suffix — assume it's a base URL
  return url + '/v1/chat/completions';
}

/**
 * Derive /v1/models URL from a user-entered URL.
 */
export function normalizeModelsUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  // Strip known suffixes to get base
  for (const suffix of ['/chat/completions', '/completions']) {
    if (url.endsWith(suffix)) {
      url = url.slice(0, -suffix.length);
      break;
    }
  }
  if (url.endsWith('/v1')) return url + '/models';
  return url + '/v1/models';
}

export interface TestRowData {
  inputLength: number;
  prefillTime: string;
  prefillSpeed: string;
  outputLength: number;
  outputTime: string;
  outputSpeed: string;
  systemPrompt: string;
  systemPromptLength: number;
  userPrompt: string;
  userPromptLength: number;
  output: string;
  error: boolean;
  errorMessage?: string;
}

export interface TestConfig {
  requestUrl: string;
  modelName: string;
  apiKey: string;
  minInput: number;
  maxInput: number;
  step: number;
  maxOutput: number;
  structureLength: number;
}

export async function runSingleTest(
  config: TestConfig,
  inputLength: number,
  signal: AbortSignal
): Promise<TestRowData> {
  const systemPrompt = generateSystemPrompt();
  const sysLen = countTokensByRule(systemPrompt);
  const userLen = inputLength - sysLen - config.structureLength;
  const userPrompt = generateUserPrompt(userLen);

  let serverCompletionTokens = 0;
  let streamTokens = 0;
  let output = '';
  let firstTokenTime: number | undefined;
  let outputFinishTime: number | undefined;

  try {
    const targetUrl = normalizeChatUrl(config.requestUrl);
    const upstreamHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) upstreamHeaders['Authorization'] = `Bearer ${config.apiKey}`;

    const requestBody = {
      model: config.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: config.maxOutput,
      temperature: 1,
      top_p: 0.1,
      stream: true
    };

    const requestTime = performance.now();

    // Use server-side proxy to avoid CORS
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        headers: upstreamHeaders,
        body: requestBody,
      }),
      signal
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errBody}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let responseTime: number;

    while (true) {
      const { done, value } = await reader.read();
      responseTime = performance.now();
      if (done) {
        if (!outputFinishTime) outputFinishTime = responseTime;
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data:')) continue;
        const data = line.substring(5).trim();
        if (data === '[DONE]') { outputFinishTime = responseTime; break; }
        try {
          const json = JSON.parse(data);
          if (json.choices?.[0]?.delta?.content) {
            output += json.choices[0].delta.content;
            streamTokens++;
            if (!firstTokenTime) firstTokenTime = responseTime;
          }
          if (json.usage?.completion_tokens) {
            serverCompletionTokens = json.usage.completion_tokens;
          }
        } catch { /* skip parse errors */ }
      }
    }

    const prefillTime = (firstTokenTime ?? requestTime) - requestTime;
    const outputTime = (outputFinishTime ?? requestTime) - (firstTokenTime ?? requestTime);
    const outLen = serverCompletionTokens > 0 ? serverCompletionTokens : (streamTokens > 0 ? streamTokens : countTokensByRule(output));
    const prefillSpeed = prefillTime > 0 ? (inputLength / (prefillTime / 1000)).toFixed(2) : 'N/A';
    const outputSpeed = outputTime > 0 ? (outLen / (outputTime / 1000)).toFixed(2) : 'N/A';

    return {
      inputLength,
      prefillTime: prefillTime.toFixed(2),
      prefillSpeed,
      outputLength: outLen,
      outputTime: outputTime.toFixed(2),
      outputSpeed,
      systemPrompt,
      systemPromptLength: sysLen,
      userPrompt,
      userPromptLength: userLen,
      output,
      error: false,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    return {
      inputLength,
      prefillTime: '0',
      prefillSpeed: '0',
      outputLength: 0,
      outputTime: '0',
      outputSpeed: '0',
      systemPrompt,
      systemPromptLength: sysLen,
      userPrompt,
      userPromptLength: userLen,
      output: '',
      error: true,
      errorMessage: (error as Error).message,
    };
  }
}

export async function warmUp(config: TestConfig): Promise<void> {
  try {
    const targetUrl = normalizeChatUrl(config.requestUrl);
    const upstreamHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) upstreamHeaders['Authorization'] = `Bearer ${config.apiKey}`;

    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        headers: upstreamHeaders,
        body: {
          model: config.modelName,
          messages: [
            { role: 'system', content: generateSystemPrompt() },
            { role: 'user', content: generateUserPrompt(10) }
          ],
          max_tokens: 3,
          temperature: 0.1,
          top_p: 0.1,
          stream: true
        },
      }),
    });
    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
  } catch { /* ignore */ }
}
