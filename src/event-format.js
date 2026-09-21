export function textDeltaFromEvent(event) {
  if (
    event?.type === "message_update" &&
    event.assistantMessageEvent?.type === "text_delta"
  ) {
    return event.assistantMessageEvent.delta ?? "";
  }
  return "";
}

export function reasoningDeltaFromEvent(event, enabled = false) {
  if (
    enabled &&
    event?.type === "message_update" &&
    event.assistantMessageEvent?.type === "thinking_delta"
  ) {
    return event.assistantMessageEvent.delta ?? "";
  }
  return "";
}

export function progressDeltaFromEvent(event, enabled = true) {
  if (!enabled) return "";

  if (event?.type === "agent_start") return "\n\n⏳ Pi is working...\n";
  if (event?.type === "tool_execution_start") {
    return `\n\n🔧 Running tool: ${event.toolName ?? "unknown"}...\n`;
  }
  if (event?.type === "tool_execution_end") {
    const name = event.toolName ?? "tool";
    return event.isError ? `\n⚠️ ${name} finished with an error.\n` : `\n✅ ${name} finished.\n`;
  }
  if (event?.type === "compaction_start") return "\n\n🧹 Compacting context...\n";
  if (event?.type === "auto_retry_start") return "\n\n🔁 Retrying request...\n";

  return "";
}
