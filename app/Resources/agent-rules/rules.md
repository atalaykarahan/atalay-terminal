# Token use in multi-agent work
Cost comes from re-reading a long context on every model call, not from output. Keep calls few and contexts short without dropping checks.
- No progress or waiting messages. Wait inside one time-limited shell command (build, test, lock). Wake only on finish, error, stall (timeout or exit code) or user input.
- Reports name the result, the failed check and the evidence path. "Tests green" alone is not enough.
- Long output stays in a file; the chat gets a summary and the path.
- Start a new session or thread for a new job or an independent acceptance stage, not mid-debugging. Hand over with a note: goal, out of scope, branch and commit, decisions with reasons (including rejected approaches), open acceptance gates, last evidence and its commit, next step, sources. A new agent reads the note first.
- Acceptance rounds review only the diff and new evidence since the last acceptance.
- Coordinators watch for turn end, failure, error and stall only, not progress lines.
- Do not lower model effort to save tokens before cutting idle wake-ups and context size.
