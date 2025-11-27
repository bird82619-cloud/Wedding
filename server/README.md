# Server proxy for Wedding app

This small Express app provides a secure server-side proxy for calling Google Generative API.

Usage

1. Set environment variable `GENAI_API_KEY` in your server environment.
2. Install dependencies and start the server:

```bash
cd server
npm install
npm start
```

3. Deploy this server to a platform like Vercel (Serverless functions), Heroku, Cloud Run, or similar.

Security notes

- Do NOT put API keys in client-side code or in git history. Use environment variables on the server.
- Apply rate-limiting and authentication if the endpoint will be publicly accessible.
