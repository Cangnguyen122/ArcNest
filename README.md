# ArcNest

Web3 community chat with wallet login, Arc access passes, realtime rooms, and Discord-style servers.

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
