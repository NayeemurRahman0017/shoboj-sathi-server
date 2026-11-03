import jwt from "jsonwebtoken";
import fs from "fs";

const SECRET = fs
  .readFileSync(new URL("./.env", import.meta.url), "utf8")
  .split("\n")
  .find((line) => line.startsWith("JWT_SECRET="))
  .slice("JWT_SECRET=".length)
  .trim();

const API = "http://localhost:8000";
const userA = jwt.sign({ email: "alice@test.com", name: "Alice" }, SECRET, { expiresIn: "1h" });
const userB = jwt.sign({ email: "bob@test.com", name: "Bob" }, SECRET, { expiresIn: "1h" });

const results = [];
function check(label, actual, expected) {
  const ok = Array.isArray(expected)
    ? expected.includes(actual)
    : actual === expected;
  results.push(`${ok ? "PASS" : "FAIL"} | ${label} | got=${actual} expected=${expected}`);
}

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// 1. Create event with JWT
const pastDate = "2020-01-01";
const futureDate = "2027-05-20";

let r = await call("POST", "/create-event", userA, {
  title: "Test Plantation Drive",
  description: "Plant 100 trees with the community.",
  category: "Plantation",
  image: "",
  location: "Ramna Park, Dhaka",
  date: pastDate,
});
check("create with PAST date rejected", r.status, 400);

r = await call("POST", "/create-event", userA, {
  title: "Test Plantation Drive",
  description: "Plant 100 trees with the community.",
  category: "Plantation",
  image: "",
  location: "Ramna Park, Dhaka",
  date: futureDate,
});
check("create event", r.status, 201);
const eventId = r.data.result?.insertedId;
if (!eventId) {
  console.log(results.join("\n"));
  console.log("FATAL: no event id", JSON.stringify(r.data));
  process.exit(1);
}
results.push(`INFO | eventId=${eventId}`);

// 2. Creator email stored?
r = await call("GET", "/events/mine", userA);
const mine = r.data.events || [];
check("GET /events/mine (creator)", r.status, 200);
check("mine contains created event", mine.some((e) => e._id === eventId), true);
check("creator email stored", mine.find((e) => e._id === eventId)?.userEmail, "alice@test.com");

// 3. Owner-only: userB cannot see it in their list
r = await call("GET", "/events/mine", userB);
check("userB mine does not include event", (r.data.events || []).some((e) => e._id === eventId), false);

// 4. Public list contains it (upcoming)
r = await call("GET", "/events", null);
check("public list contains event", (r.data.events || []).some((e) => e._id === eventId), true);

// 5. Past events excluded from public list
r = await call("GET", "/events", null);
check("no past events in list", (r.data.events || []).every((e) => e.date >= "2026-11-03"), true);

// 6. limit works
r = await call("GET", "/events?limit=1", null);
check("limit=1 returns 1", (r.data.events || []).length, 1);

// 7. Join as userB
r = await call("POST", `/events/${eventId}/join`, userB);
check("join event", r.status, 201);

// duplicate join
r = await call("POST", `/events/${eventId}/join`, userB);
check("duplicate join rejected", r.status, 409);

// 8. Joined list for userB
r = await call("GET", "/events/joined", userB);
check("joined list has event", (r.data.events || []).some((e) => e._id === eventId), true);

// sorted by date
const joinedDates = (r.data.events || []).map((e) => e.date);
check("joined sorted by date", joinedDates.join(",") === [...joinedDates].sort().join(","), true);

// 9. Details page: guest can view, joined flag for userB
r = await call("GET", `/events/${eventId}`, null);
check("guest can view details", r.status, 200);
check("guest joined=false", r.data.event?.joined, false);
check("joinCount=1", r.data.event?.joinCount, 1);

r = await call("GET", `/events/${eventId}`, userB);
check("userB joined=true", r.data.event?.joined, true);

// 10. Update: userB (not owner) rejected
r = await call("PUT", `/events/${eventId}`, userB, {
  title: "Hacked",
  description: "x",
  category: "Plantation",
  image: "",
  location: "x",
  date: futureDate,
});
check("non-owner update forbidden", r.status, 403);

// 11. Update by owner works
r = await call("PUT", `/events/${eventId}`, userA, {
  title: "Test Plantation Drive v2",
  description: "Updated description.",
  category: "Plantation",
  image: "",
  location: "Savar, Dhaka",
  date: "2027-06-15",
});
check("owner update", r.status, 200);

r = await call("GET", "/events/mine", userA);
const updated = (r.data.events || []).find((e) => e._id === eventId);
check("update persisted", updated?.title, "Test Plantation Drive v2");

// 12. Update with past date rejected
r = await call("PUT", `/events/${eventId}`, userA, {
  title: "x",
  description: "x",
  category: "Plantation",
  image: "",
  location: "x",
  date: pastDate,
});
check("update past date rejected", r.status, 400);

// 13. Invalid token rejected
r = await call("GET", "/events/mine", "not-a-real-token");
check("invalid token rejected", r.status, 401);

// 14. Leave event
r = await call("DELETE", `/events/${eventId}/join`, userB);
check("leave event", r.status, 200);
r = await call("GET", "/events/joined", userB);
check("left event gone", (r.data.events || []).some((e) => e._id === eventId), false);

// 15. Delete: non-owner forbidden, owner ok
r = await call("DELETE", `/events/${eventId}`, userB);
check("non-owner delete forbidden", r.status, 403);
r = await call("DELETE", `/events/${eventId}`, userA);
check("owner delete", r.status, 200);
r = await call("GET", `/events/${eventId}`, null);
check("deleted event 404", r.status, 404);

console.log(results.join("\n"));
const failed = results.filter((line) => line.startsWith("FAIL")).length;
console.log(`\n${results.filter((l) => l.startsWith("PASS")).length} passed, ${failed} failed`);
