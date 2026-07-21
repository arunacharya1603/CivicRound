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

test("server-renders the CivicRound landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>CivicRound<\/title>/i);
  assert.match(html, /Take a side/i);
  assert.match(html, /Win the argument/i);
  assert.match(html, /Enter the arena/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps routes thin and product code feature-based", async () => {
  const [page, arenaPage, landing, app, room, modeStep, guestAuth, packageJson] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/arena/page.tsx", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../features/marketing/components/landing-page.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../features/debate/components/civic-round-app.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../features/debate/components/debate-room.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../features/modes/components/mode-step.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../features/auth/services/guest-auth.service.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
    ]);

  assert.match(page, /<LandingPage \/>/);
  assert.match(arenaPage, /<CivicRoundApp \/>/);
  assert.match(landing, /Take a side/);
  assert.match(landing, /href="[/]arena"/);
  assert.match(app, /ProfileStep/);
  assert.match(app, /ModeStep/);
  assert.match(app, /AccountStep/);
  assert.match(app, /RoundStep/);
  assert.match(app, /DeviceStep/);
  assert.match(app, /MatchStep/);
  assert.match(app, /DebateRoom/);
  assert.match(room, /useDebateTimer/);
  assert.match(modeStep, /Casual Fight/);
  assert.match(modeStep, /Ranked Fight/);
  assert.match(modeStep, /Challenge a Friend/);
  assert.match(modeStep, /AI Practice/);
  assert.match(app, /readGuestIdentity/);
  assert.match(guestAuth, /sessionStorage/);
  assert.doesNotMatch(guestAuth, /localStorage\.setItem/);
  assert.match(packageJson, /"@tanstack\/react-query"/);
  assert.match(packageJson, /"@livekit\/components-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
test("defines the production backend contract", async () => {
  const [migration, productModes, tokenRoute, matchmaking, liveRoom, envExample] =
    await Promise.all([
      readFile(
        new URL(
          "../supabase/migrations/202607150001_civicround.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../supabase/migrations/202607210001_product_modes.sql",
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
  assert.match(productModes, /create table if not exists public\.competitor_profiles/);
  assert.match(productModes, /create or replace function public\.join_mode_matchmaking/);
  assert.match(productModes, /create or replace function public\.submit_match_appeal/);
  assert.match(productModes, /create or replace function public\.create_ai_practice_room/);
  assert.match(productModes, /Ranked play requires a persistent account/);
  assert.match(tokenRoute, /Room membership required/);
  assert.match(matchmaking, /get_matchmaking_status/);
  assert.match(matchmaking, /claim_debate_invite/);
  assert.match(matchmaking, /window[.]location[.]pathname/);
  assert.match(liveRoom, /useSynchronizedDebateTimer/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});

test("uses one canonical topic source throughout the live flow", async () => {
  const [app, topicsService, matchStep, matchmaking] = await Promise.all([
    readFile(
      new URL("../features/debate/components/civic-round-app.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../features/debate/services/topics.service.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../features/matchmaking/components/match-step.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/matchmaking/services/matchmaking.service.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(topicsService, /[.]from[(]"debate_topics"[)]/);
  assert.match(topicsService, /[.]eq[(]"is_active", true[)]/);
  assert.match(app, /queryFn: listDebateTopics/);
  assert.match(app, /topics={topics}/);
  assert.match(app, /topic={topic}/);
  assert.doesNotMatch(matchStep, /getDebateTopic/);
  assert.doesNotMatch(matchmaking, /DEBATE_TOPICS/);
  assert.match(matchmaking, /TOPIC_ID_PATTERN/);
  assert.match(matchStep, /getCurrentDebateMatch/);
  assert.match(matchStep, /activeRef/);
});

test("protects the manager-facing debate flow", async () => {
  const [roundStep, matchStep, deviceStep, phases, liveRoom, baseMigration, reliabilityMigration] =
    await Promise.all([
      readFile(new URL("../features/debate/components/round-step.tsx", import.meta.url), "utf8"),
      readFile(new URL("../features/matchmaking/components/match-step.tsx", import.meta.url), "utf8"),
      readFile(new URL("../features/device/components/device-step.tsx", import.meta.url), "utf8"),
      readFile(new URL("../features/debate/lib/debate-phases.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../features/video/components/livekit-debate-room.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../supabase/migrations/202607150001_civicround.sql", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../supabase/migrations/202607180001_matchmaking_reliability.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.doesNotMatch(roundStep, /line-clamp-[12]/);
  assert.match(roundStep, /overflow-wrap:anywhere/);
  assert.match(deviceStep, />Find Match</);
  assert.match(matchStep, /autoStartRef/);
  assert.match(matchStep, /onMatched\(match\)/);
  assert.doesNotMatch(matchStep, /Enter live room/);
  assert.match(phases, /speaker-one-closing/);
  assert.doesNotMatch(phases, /speaker-one-response/);
  assert.match(liveRoom, /adaptiveStream: true/);
  assert.match(liveRoom, /dynacast: true/);
  assert.match(liveRoom, /ConnectionState.Reconnecting/);
  assert.doesNotMatch(liveRoom, /truncate font-display/);
  assert.match(baseMigration, /pg_advisory_xact_lock/);
  assert.match(reliabilityMigration, /started_at = now\(\) \+ interval '3 seconds'/);
});


test("protects browser-audit regressions", async () => {
  const [roundStep, deviceStep, app, resultsStep, liveRoom] = await Promise.all([
    readFile(new URL("../features/debate/components/round-step.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/device/components/device-step.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/debate/components/civic-round-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/debate/components/results-step.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../features/video/components/livekit-debate-room.tsx", import.meta.url),
      "utf8",
    ),
    ]);

  assert.match(roundStep, /min-h-\[8\.5rem\]/);
  assert.doesNotMatch(deviceStep, /Run check/);
  assert.match(deviceStep, /useSyncExternalStore/);
  assert.match(deviceStep, /cameraEnabled: media\.cameraEnabled/);
  assert.match(deviceStep, /microphoneEnabled: media\.microphoneEnabled/);
  assert.match(deviceStep, /aria-pressed=\{media\.cameraEnabled\}/);
  assert.match(deviceStep, /aria-pressed=\{media\.microphoneEnabled\}/);

  assert.match(app, /mediaPreferences=\{mediaPreferences\}/);
  assert.match(app, /outcome=\{roomOutcome\}/);
  assert.match(resultsStep, /Round ended early/);
  assert.match(resultsStep, /No result/);
  assert.match(resultsStep, /"Support" : "Against"/);
  assert.match(resultsStep, /aria-pressed=\{selected\}/);

  assert.match(liveRoom, /mediaPreferences\.cameraEnabled/);
  assert.match(liveRoom, /mediaPreferences\.microphoneEnabled/);
  assert.match(liveRoom, /onLeave\("cancelled"\)/);
  assert.match(liveRoom, /civic-participant-tile/);
  assert.match(liveRoom, /aria-label="Report opponent"/);
  assert.match(liveRoom, /aria-pressed=\{isMicrophoneEnabled\}/);
  assert.match(liveRoom, /aria-pressed=\{isCameraEnabled\}/);
  assert.doesNotMatch(liveRoom, /prevCanSpeakRef/);
});


test("reconciles simultaneous matchmaking and LiveKit metadata", async () => {
  const [matchmaking, reconciliationMigration, globalCss] = await Promise.all([
    readFile(
      new URL(
        "../features/matchmaking/services/matchmaking.service.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../supabase/migrations/202607190001_matchmaking_poll_reconciliation.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(matchmaking, /pollCount % 4 === 0/);
  assert.match(matchmaking, /join_matchmaking/);
  assert.match(reconciliationMigration, /create or replace function public\.get_matchmaking_status/);
  assert.match(reconciliationMigration, /pg_advisory_xact_lock/);
  assert.match(reconciliationMigration, /for update skip locked/);
  assert.match(globalCss, /civic-participant-tile \.lk-participant-metadata/);
  assert.match(globalCss, /display: none !important/);
});
