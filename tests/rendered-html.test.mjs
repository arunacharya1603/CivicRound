import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the CivicRound entry experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>CivicRound<\/title>/i);
  assert.match(html, /Who are you today\?/i);
  assert.match(html, /Enter the arena/i);
  assert.match(html, /I am 18 or older/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps routes thin and product code feature-based", async () => {
  const [page, app, room, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/debate/components/civic-round-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/debate/components/debate-room.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<CivicRoundApp \/>/);
  assert.match(app, /ProfileStep/);
  assert.match(app, /RoundStep/);
  assert.match(app, /DeviceStep/);
  assert.match(app, /MatchStep/);
  assert.match(app, /DebateRoom/);
  assert.match(room, /useDebateTimer/);
  assert.match(packageJson, /"@tanstack\/react-query"/);
  assert.match(packageJson, /"@livekit\/components-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
test("defines the production backend contract", async () => {
  const [migration, tokenRoute, matchmaking, liveRoom, envExample] =
    await Promise.all([
      readFile(
        new URL(
          "../supabase/migrations/202607150001_civicround.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../app/api/livekit/token/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../features/matchmaking/services/matchmaking.service.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../features/video/components/livekit-debate-room.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../.env.example", import.meta.url), "utf8"),
    ]);

  assert.match(migration, /create or replace function public\.join_matchmaking/);
  assert.match(migration, /create or replace function public\.mark_debate_room_ready/);
  assert.match(migration, /enable row level security/);
  assert.match(tokenRoute, /Room membership required/);
  assert.match(matchmaking, /get_matchmaking_status/);
  assert.match(matchmaking, /claim_debate_invite/);
  assert.match(liveRoom, /useSynchronizedDebateTimer/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});
