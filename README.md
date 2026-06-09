# ArcNest

Web3 community chat with wallet login, Arc access passes, realtime rooms, and Discord-style servers.

## Realtime Deployment Notes

Vercel Functions cannot run as a WebSocket server. In production, this app does not connect to the internal `/api/socket/io` Socket.IO endpoint unless it is explicitly enabled. This prevents Socket.IO handshake requests from returning noisy `400 Bad Request` errors on Vercel.

Supported deployment modes:

- Local/custom Node server: run `npm run dev` or `npm start`; the internal Socket.IO endpoint can be used.
- Vercel without a realtime server: leave `NEXT_PUBLIC_SOCKET_URL` empty. Chat falls back to message polling so the UI still works.
- Vercel with realtime: deploy the included Socket.IO service on a separate long-lived Node/container host, set `SOCKET_SERVER_URL` so the message APIs publish to it, and set `NEXT_PUBLIC_SOCKET_URL` so browsers connect to it. Set `NEXT_PUBLIC_SOCKET_PATH` only if the external server does not use `/socket.io`.

Only set `NEXT_PUBLIC_ENABLE_INTERNAL_SOCKET=true` in production when the deployment platform actually supports long-lived Socket.IO connections.

### Running The Separate Socket Server

Run the Next app and socket server as two processes:

```bash
npm run socket:dev
npm run dev
```

Use the same `SOCKET_TOKEN_SECRET` in both processes. For local development with the separate socket server:

```env
SOCKET_TOKEN_SECRET=replace-with-one-shared-secret
SOCKET_SERVER_SECRET=replace-with-one-publish-secret
SOCKET_SERVER_URL=http://localhost:3001
SOCKET_PORT=3001
SOCKET_CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

On Vercel, set `SOCKET_SERVER_URL` and `SOCKET_SERVER_SECRET` as server-side env vars so message APIs can publish realtime events. Set `NEXT_PUBLIC_SOCKET_URL` to the public URL of the socket server so browsers connect there directly.

In production, `SOCKET_CORS_ORIGIN` must be the exact public Next.js origin, for example `https://your-app.vercel.app`. Do not leave the socket server open to every origin.

## Engineering Working Rules

### 1. Think Before Coding

- Do not assume. Do not hide confusion. Surface tradeoffs.
- Before implementing, state assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them instead of silently picking one.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop, name what is confusing, and ask.

### 2. Simplicity First

- Write the minimum code that solves the problem.
- Do not add speculative features.
- Do not add abstractions for single-use code.
- Do not add flexibility or configurability that was not requested.
- Do not add error handling for impossible scenarios.
- If 200 lines can be 50, rewrite it.
- Ask: would a senior engineer say this is overcomplicated? If yes, simplify.

### 3. Surgical Changes

- Touch only what is required.
- Clean up only your own mess.
- Do not improve adjacent code, comments, or formatting unless needed.
- Do not refactor things that are not broken.
- Match the existing style, even if you would normally do it differently.
- If unrelated dead code is found, mention it instead of deleting it.
- Remove imports, variables, or functions made unused by your own changes.
- Every changed line should trace directly to the current request.

### 4. Goal-Driven Execution

- Define success criteria before implementation.
- Convert tasks into verifiable goals.
- For validation work, write or run checks for invalid inputs and make them pass.
- For bug fixes, reproduce the bug or identify the failing path, then verify the fix.
- For refactors, ensure relevant checks pass before and after.
- For multi-step tasks, state a brief plan with a verification check for each step.
- Strong success criteria allow independent progress. Weak criteria require clarification.
