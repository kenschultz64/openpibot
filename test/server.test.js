import assert from "node:assert/strict";
import { once } from "node:events";
import net from "node:net";
import { spawn } from "node:child_process";
import test, { after, before } from "node:test";

let child;
let baseUrl;

async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["src/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      PI_BRIDGE_API_KEY: "integration-test-key",
      PI_WORKSPACE: process.cwd(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const timeout = setTimeout(() => child.kill("SIGKILL"), 10_000);
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  while (!output.includes("Pi OpenWebUI bridge listening")) {
    if (child.exitCode !== null) throw new Error(`PiBot exited during startup:\n${output}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  clearTimeout(timeout);
});

after(async () => {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await once(child, "exit");
});

test("unauthenticated requests are rejected", async () => {
  const response = await fetch(`${baseUrl}/v1/models`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: { message: "Unauthorized" } });
});

test("authenticated model discovery returns the Pi bridge model", async () => {
  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: { authorization: "Bearer integration-test-key" },
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.object, "list");
  assert.equal(payload.data[0].id, "pi-agent");
});

test("an empty chat request is rejected before opening an agent session", async () => {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      authorization: "Bearer integration-test-key",
      "content-type": "application/json",
    },
    body: JSON.stringify({ messages: [] }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: { message: "No prompt provided" } });
});

test("an empty webhook is rejected before opening an agent session", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: {
      authorization: "Bearer integration-test-key",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: { message: "No message provided" } });
});
