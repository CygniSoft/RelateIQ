import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMeetingInviteIcs,
  escapeIcsText,
  foldIcsLine,
  formatIcsUtc,
  parseFutureIsoDate,
} from "../src/lib/meetingInviteIcs";
import { classifyMeetingInviteState } from "../src/lib/meetingInviteState";

test("classifies durable invitation delivery states fail-closed", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  assert.equal(classifyMeetingInviteState("sent", null, now), "sent");
  assert.equal(classifyMeetingInviteState("sending", null, now), "unknown");
  assert.equal(classifyMeetingInviteState("pending", null, now), "unknown");
  assert.equal(
    classifyMeetingInviteState("claimed", new Date("2030-01-01T00:01:00Z"), now),
    "busy",
  );
  assert.equal(
    classifyMeetingInviteState("claimed", new Date("2029-12-31T23:59:00Z"), now),
    "reclaim",
  );
  assert.equal(classifyMeetingInviteState("failed", null, now), "reclaim");
  assert.equal(classifyMeetingInviteState("unexpected", null, now), "unknown");
});

test("parses only valid, future ISO timestamps", () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  assert.equal(parseFutureIsoDate(future)?.toISOString(), future);
  assert.equal(parseFutureIsoDate("2025-02-29T12:00:00Z"), null);
  assert.equal(parseFutureIsoDate("2020-01-01T12:00:00Z"), null);
  assert.equal(parseFutureIsoDate("2099-01-01T24:00:00Z"), null);
  assert.equal(parseFutureIsoDate("2099-01-01T12:00:00+24:00"), null);
});

test("escapes ICS text and formats UTC timestamps", () => {
  assert.equal(escapeIcsText("one\\two;three,four\r\nfive"), "one\\\\two\\;three\\,four\\nfive");
  assert.equal(
    formatIcsUtc(new Date("2030-01-02T03:04:05.678Z")),
    "20300102T030405Z",
  );
});

test("builds a standards-shaped, CRLF-only request with folded UTF-8 lines", () => {
  const uid = "123e4567-e89b-12d3-a456-426614174000";
  const invite = buildMeetingInviteIcs({
    uid,
    to: "guest@example.com",
    organizerName: "Ada Lovelace",
    organizerEmail: "ada@example.com",
    title: `Planning; review, notes\\follow-up\n${"🗓️".repeat(40)}`,
    startDate: new Date("2030-01-02T03:04:05Z"),
    endDate: new Date("2030-01-02T04:04:05Z"),
    location: "Room; A, North",
    description: "Bring\\notes\r\nDiscuss, options;",
    reminderMinutes: 15,
  });

  assert.match(invite, /^BEGIN:VCALENDAR\r\n/);
  assert.match(invite, /\r\nMETHOD:REQUEST\r\n/);
  assert.match(invite, /\r\nUID:123e4567-e89b-12d3-a456-426614174000@connectiq\r\n/);
  assert.match(invite, /\r\nDTSTART:20300102T030405Z\r\n/);
  assert.match(invite, /\r\nDTEND:20300102T040405Z\r\n/);
  assert.match(invite, /ORGANIZER;CN="Ada Lovelace":mailto:ada@example\.com/);
  assert.match(invite, /ATTENDEE;RSVP=TRUE:mailto:guest@example\.com/);
  assert.match(invite, /\r\nBEGIN:VALARM\r\nTRIGGER:-PT15M\r\n/);
  assert.match(invite, /SUMMARY:Planning\\; review\\, notes\\\\follow-up\\n/);
  assert.match(invite, /LOCATION:Room\\; A\\, North/);
  assert.match(invite, /DESCRIPTION:Bring\\\\notes\\nDiscuss\\, options\\;/);
  assert.equal(/(^|[^\r])\n|\r(?!\n)/.test(invite), false);

  for (const line of invite.split("\r\n").filter(Boolean)) {
    assert.ok(Buffer.byteLength(line, "utf8") <= 75, `unfolded line: ${line}`);
  }
});

test("folds UTF-8 content at 75 octets with continuation whitespace", () => {
  const folded = foldIcsLine(`SUMMARY:${"é".repeat(80)}`);
  const lines = folded.split("\r\n");
  assert.ok(lines.length > 1);
  assert.ok(lines.slice(1).every((line) => line.startsWith(" ")));
  assert.ok(lines.every((line) => Buffer.byteLength(line, "utf8") <= 75));
});