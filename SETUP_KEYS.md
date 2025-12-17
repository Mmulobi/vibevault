# API Key Setup

To enable the AI features (Toxicity Detection and Matching), you need to configure your environment variables.

1.  Create a file named `.env.local` in the `vibevault` folder (same level as `package.json`).
2.  Add the following lines to it:

```bash
# Hugging Face Token (Required for Toxicity Check)
# Get one for free at https://huggingface.co/settings/tokens
HF_TOKEN=hf_your_token_here

# xAI Grok API Key (Optional, for smarter matching)
# Get one at https://console.x.ai/
GROK_API_KEY=xai_your_key_here
```

3.  Restart your server (`npm run dev`) for the changes to take effect.
