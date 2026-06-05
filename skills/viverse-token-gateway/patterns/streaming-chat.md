# Pattern: Streaming Chat (SSE) via Viverse Morph

Full implementation for streaming AI responses in VIVERSE apps. Streaming is delivered via **Viverse Morph** — an internal SSE relay — not directly to Token Gateway.

## When to Use

- Typewriter-style NPC dialogue (text appears word by word)
- Long AI responses where perceived latency matters
- Real-time narration or commentary

## Why Morph, Not Token Gateway Directly

Token Gateway `/v1/chat/stream` is an internal endpoint. Published apps reach streaming through **Viverse Morph**, which:
- Holds an internal `vvai_` service token
- Accepts the same `AccessToken` + `X-App-Id` headers from the client
- Pipes OpenRouter SSE back to the browser as a standard `text/event-stream`

```
App ──► SG (auth) ──► Viverse Morph ──► Token Gateway ──► OpenRouter
                          (SSE relay)        (internal vvai_)
```

---

## Implementation

```javascript
// token-gateway-stream.js
const VERSION_NAME = 'token-gateway-stream@1.0.0';

const MORPH_STREAM_URL = import.meta.env.VITE_MORPH_STREAM_URL
  || 'https://morph.viverse.com/api/chat/stream';
const APP_ID = import.meta.env.VITE_VIVERSE_CLIENT_ID;

export class TokenGatewayStreamService {
  constructor({ getAccessToken }) {
    this._getAccessToken = getAccessToken;
    console.log(`[${VERSION_NAME}] initialized`);
  }

  /**
   * Stream a chat completion via Viverse Morph SSE relay.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} options
   * @param {string} [options.model]
   * @param {number} [options.temperature]
   * @param {number} [options.max_tokens]
   * @param {function(string): void} options.onChunk  - Called for each text delta
   * @param {function(): void} [options.onDone]       - Called when stream ends
   * @param {AbortSignal} [options.signal]            - Optional cancellation
   * @returns {Promise<string>}                       - Full assembled text
   */
  async stream(messages, { model, temperature = 0.7, max_tokens = 1024, onChunk, onDone, signal } = {}) {
    const accessToken = await this._getAccessToken();
    if (!accessToken) throw new Error('[TokenGateway] No accessToken — run viverse-auth first');

    const body = { messages, temperature, max_tokens, stream: true };
    if (model) body.model = model;

    const response = await fetch(MORPH_STREAM_URL, {
      method: 'POST',
      headers: {
        'AccessToken': accessToken,     // exact casing
        'X-App-Id': APP_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      await this._handleError(response);
      return '';
    }

    return this._readSSEStream(response.body, onChunk, onDone);
  }

  /** Read and parse SSE stream from response body */
  async _readSSEStream(body, onChunk, onDone) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // keep incomplete last line in buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            onDone?.();
            return fullText;
          }
          try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk?.(delta);
            }
          } catch {
            // Malformed chunk — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onDone?.();
    return fullText;
  }

  async _handleError(response) {
    switch (response.status) {
      case 401:
        throw new Error('[TokenGateway] Unauthorized — re-run checkAuth()');
      case 403:
        throw new Error('[TokenGateway] App not registered or quota exhausted');
      case 429: {
        const retryAfter = response.headers.get('Retry-After') || '5';
        throw new Error(`[TokenGateway] Rate limited — retry after ${retryAfter}s`);
      }
      case 503:
        throw new Error('[TokenGateway] Stream relay unavailable — try again');
      default:
        throw new Error(`[TokenGateway] Stream error ${response.status}`);
    }
  }
}
```

---

## Usage — React (Typewriter UI)

```javascript
// useStreamingChat.js
import { useState, useRef, useCallback } from 'react';
import { TokenGatewayStreamService } from './token-gateway-stream';

export function useStreamingChat({ auth }) {
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const serviceRef = useRef(null);

  if (!serviceRef.current) {
    serviceRef.current = new TokenGatewayStreamService({
      getAccessToken: () => auth?.access_token,
    });
  }

  const send = useCallback(async (messages, options = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOutput('');
    setStreaming(true);

    try {
      await serviceRef.current.stream(messages, {
        ...options,
        onChunk: (delta) => setOutput(prev => prev + delta),
        onDone: () => setStreaming(false),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[StreamingChat]', err);
      }
      setStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { output, streaming, send, cancel };
}
```

---

## Usage — Vanilla JS (PlayCanvas / Three.js)

```javascript
import { TokenGatewayStreamService } from './token-gateway-stream';

const streamService = new TokenGatewayStreamService({
  getAccessToken: () => window.__viverseAuth?.access_token,
});

// NPC streaming dialogue — update a text entity on each chunk
async function streamNPCResponse(npcEntity, playerInput) {
  let fullText = '';

  await streamService.stream(
    [
      { role: 'system', content: 'You are a medieval bard. Speak in verse.' },
      { role: 'user', content: playerInput },
    ],
    {
      model: 'openai/gpt-4o-mini',
      max_tokens: 256,
      onChunk: (delta) => {
        fullText += delta;
        npcEntity.element.text = fullText;  // PlayCanvas text component
      },
      onDone: () => {
        npcEntity.fire('dialogueComplete', fullText);
      },
    }
  );
}
```

---

## SSE Event Format

Each event from the stream:

```
data: {"choices":[{"delta":{"content":"Hello"},"index":0}],"id":"chatcmpl-..."}

data: {"choices":[{"delta":{"content":" world"},"index":0}],...}

data: [DONE]
```

Key rules:
- Lines not starting with `data: ` are ignored (keep-alive, comments)
- `[DONE]` signals end of stream — stop reading
- `delta.content` may be empty for role/tool chunks — skip if null/empty

## Cancellation

Pass an `AbortSignal` from `AbortController` to cancel mid-stream. The `fetch` will throw `AbortError` — treat this as a clean exit, not an error.

```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);  // 10s timeout

await streamService.stream(messages, { signal: controller.signal, onChunk });
```
