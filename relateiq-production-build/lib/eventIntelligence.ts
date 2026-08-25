import type { Contact, Event } from "@/context/AppContext";

export type InsightIcon =
  | "trending-up"
  | "trending-down"
  | "award"
  | "dollar-sign"
  | "filter"
  | "users"
  | "zap";

export interface Insight {
  id: string;
  icon: InsightIcon;
  tint: string;
  title: string;
  detail: string;
}

export interface EventMetrics {
  cost: number;
  contacts: number;
  meetings: number;
  proposals: number;
  deals: number;
  revenue: number;
  roi: number;
  netProfit: number;
  revenuePerContact: number;
  costPerContact: number;
}

export function getEventMetrics(
  event: Event,
  contactCount: number,
): EventMetrics {
  const cost = event.cost;
  const revenue = event.revenueGenerated;
  const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
  return {
    cost,
    revenue,
    contacts: contactCount,
    meetings: event.meetingsBooked,
    proposals: event.proposalsSent,
    deals: event.dealsWon,
    roi,
    netProfit: revenue - cost,
    revenuePerContact: contactCount > 0 ? revenue / contactCount : 0,
    costPerContact: contactCount > 0 ? cost / contactCount : 0,
  };
}

function contactCountFor(events: Event[], contacts: Contact[]) {
  const counts = new Map<string, number>();
  for (const c of contacts) {
    if (!c.eventId) continue;
    counts.set(c.eventId, (counts.get(c.eventId) ?? 0) + 1);
  }
  return (id: string) => counts.get(id) ?? 0;
}

/**
 * Cross-event ("portfolio") intelligence. Every insight is derived directly
 * from the user's own event data — nothing is hardcoded or simulated.
 */
export function getPortfolioInsights(
  events: Event[],
  contacts: Contact[],
): Insight[] {
  const insights: Insight[] = [];
  if (events.length === 0) return insights;

  const countFor = contactCountFor(events, contacts);
  const totalCost = events.reduce((s, e) => s + e.cost, 0);
  const totalRevenue = events.reduce((s, e) => s + e.revenueGenerated, 0);
  const totalContacts = events.reduce((s, e) => s + countFor(e.id), 0);
  const totalMeetings = events.reduce((s, e) => s + e.meetingsBooked, 0);
  const totalDeals = events.reduce((s, e) => s + e.dealsWon, 0);

  // 1. Top-performing event type, by average revenue per event.
  const byType = new Map<string, { revenue: number; count: number }>();
  for (const e of events) {
    const t = e.type?.trim() || "Other";
    const cur = byType.get(t) ?? { revenue: 0, count: 0 };
    cur.revenue += e.revenueGenerated;
    cur.count += 1;
    byType.set(t, cur);
  }
  if (byType.size >= 2 && totalRevenue > 0) {
    const ranked = [...byType.entries()]
      .map(([type, v]) => ({
        type,
        avg: v.revenue / v.count,
        count: v.count,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.avg - a.avg);
    const best = ranked[0];
    // Count-weighted baseline: average revenue of every event that is NOT the
    // best type, so the multiplier compares a typical best-type event against a
    // typical event of any other type (not an unweighted mean of type means).
    const otherCount = events.length - best.count;
    const otherAvg = otherCount > 0 ? (totalRevenue - best.revenue) / otherCount : 0;
    if (best.avg > 0 && otherAvg > 0) {
      const mult = best.avg / otherAvg;
      insights.push({
        id: "top-type",
        icon: "trending-up",
        tint: "#10B981",
        title: `${best.type} events are your top performer`,
        detail: `${best.type} events generate ${mult.toFixed(
          1,
        )}x more revenue per event than your other event types. Invest more time here.`,
      });
    } else if (best.avg > 0 && otherCount > 0) {
      insights.push({
        id: "top-type",
        icon: "trending-up",
        tint: "#10B981",
        title: `${best.type} events are your top performer`,
        detail: `${best.type} is the only event type generating revenue so far — averaging $${Math.round(
          best.avg,
        ).toLocaleString()} per event. Focus your time here.`,
      });
    }
  }

  // 2. Best single event by ROI.
  const withRoi = events
    .filter((e) => e.cost > 0)
    .map((e) => ({ e, roi: ((e.revenueGenerated - e.cost) / e.cost) * 100 }))
    .sort((a, b) => b.roi - a.roi);
  if (withRoi.length > 0 && withRoi[0].roi > 0) {
    const top = withRoi[0];
    insights.push({
      id: "best-roi",
      icon: "award",
      tint: "#F59E0B",
      title: `${top.e.name} delivered your best return`,
      detail: `+${Math.round(top.roi).toLocaleString()}% ROI — $${top.e.revenueGenerated.toLocaleString()} from a $${top.e.cost.toLocaleString()} investment.`,
    });
  }

  // 3. Overall investment efficiency.
  if (totalCost > 0 && totalRevenue > 0) {
    const ratio = totalRevenue / totalCost;
    insights.push({
      id: "efficiency",
      icon: "dollar-sign",
      tint: "#4F8EFF",
      title: "Your networking pays off",
      detail: `Every $1 invested in events returns $${ratio.toFixed(
        2,
      )} across your portfolio.`,
    });
  }

  // 4. Conversion funnel.
  if (totalContacts > 0 && totalMeetings > 0) {
    const meetingRate = (totalMeetings / totalContacts) * 100;
    const dealRate = totalMeetings > 0 ? (totalDeals / totalMeetings) * 100 : 0;
    insights.push({
      id: "funnel",
      icon: "filter",
      tint: "#7B5EFF",
      title: "Your conversion funnel",
      detail:
        `You turn ${Math.round(meetingRate)}% of contacts into meetings` +
        (totalDeals > 0
          ? `, and ${Math.round(dealRate)}% of meetings into closed deals.`
          : "."),
    });
  }

  return insights;
}

/**
 * A single insight for one event, comparing it to the rest of the portfolio.
 */
export function getEventInsight(
  event: Event,
  contacts: Contact[],
  allEvents: Event[],
): Insight | null {
  const cc = contacts.filter((c) => c.eventId === event.id).length;
  const m = getEventMetrics(event, cc);
  if (event.cost === 0 && event.revenueGenerated === 0) return null;

  const others = allEvents.filter((e) => e.id !== event.id && e.cost > 0);
  if (others.length > 0 && event.cost > 0) {
    const avgRoi =
      others.reduce(
        (s, e) => s + ((e.revenueGenerated - e.cost) / e.cost) * 100,
        0,
      ) / others.length;
    const diff = m.roi - avgRoi;
    if (Math.abs(diff) >= 10) {
      const better = diff > 0;
      return {
        id: "event-vs-avg",
        icon: better ? "trending-up" : "trending-down",
        tint: better ? "#10B981" : "#FF4757",
        title: better ? "Above your average" : "Below your average",
        detail: `This event's ROI is ${Math.abs(
          Math.round(diff),
        ).toLocaleString()} points ${
          better ? "higher" : "lower"
        } than your average event (${Math.round(avgRoi).toLocaleString()}%).`,
      };
    }
  }

  if (m.revenuePerContact > 0) {
    return {
      id: "rev-per-contact",
      icon: "users",
      tint: "#4F8EFF",
      title: "Revenue per contact",
      detail: `Each of the ${m.contacts} contact${
        m.contacts === 1 ? "" : "s"
      } from this event is worth $${Math.round(
        m.revenuePerContact,
      ).toLocaleString()} on average.`,
    };
  }

  return null;
}
