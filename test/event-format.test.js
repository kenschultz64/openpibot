import assert from "node:assert/strict";
import test from "node:test";

import {
  progressDeltaFromEvent,
  reasoningDeltaFromEvent,
  textDeltaFromEvent,
} from "../src/event-format.js";

const update = (type, delta) => ({
  type: "message_update",
  assistantMessageEvent: { type, delta },
});

test("text deltas remain normal assistant content", () => {
  assert.equal(textDeltaFromEvent(update("text_delta", "answer")), "answer");
  assert.equal(textDeltaFromEvent(update("thinking_delta", "private")), "");
});

test("reasoning is hidden unless the operator opts in", () => {
  const event = update("thinking_delta", "reasoning");
  assert.equal(reasoningDeltaFromEvent(event), "");
  assert.equal(reasoningDeltaFromEvent(event, true), "reasoning");
});

test("tool progress exposes no arguments or output", () => {
  const event = {
    type: "tool_execution_start",
    toolName: "bash",
    args: { command: "cat /secret" },
    output: "secret-value",
  };
  const progress = progressDeltaFromEvent(event, true);
  assert.match(progress, /bash/);
  assert.doesNotMatch(progress, /cat \/secret|secret-value/);
  assert.equal(progressDeltaFromEvent(event, false), "");
});
