---
name: OpenAI vision via Replit AI Integrations
description: How the api-server calls OpenAI (incl. vision) without a user-supplied API key, and the body-limit gotcha for image payloads.
---

# OpenAI / vision in api-server

The api-server uses the **Replit AI Integrations proxy** for OpenAI, not a user API key.
- Pre-configured SDK client comes from `lib/integrations-openai-ai-server` (`import { openai } from "@workspace/integrations-openai-ai-server"`).
- Env vars `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY` are provisioned by `setupReplitAIIntegrations` (one-time, may require phone verification). Usage is billed to the user's Replit credits.
- See `.local/skills/ai-integrations-openai/SKILL.md` for setup and model names. Vision works via `chat.completions.create` with a `image_url` content part whose `url` is a base64 data URL.

**Why:** avoids asking the user for an OpenAI key and keeps billing inside Replit.

**Gotcha — body limit:** base64 images blow past Express's default 100kb `express.json()` limit. The api-server raises it to `15mb` in `app.ts`. Any new image-upload route relies on this; don't lower it.

**How to apply:** for any new AI feature in api-server, reuse the `openai` client from that lib rather than instantiating a new OpenAI SDK with a key.
