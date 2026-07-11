const db = require("../db/connect");

/**
 * Auto-assignment logic: finds the best available delivery agent for an order.
 *
 * Strategy (documented, not hidden):
 * 1. PRIMARY: an "available" agent whose home zone matches the order's pickup zone.
 *    This is our proxy for "nearest agent" — in the absence of live GPS tracking,
 *    zone membership is the most reliable locality signal we have, since zones
 *    are drawn along real geographic/pincode boundaries.
 * 2. FALLBACK: if no agent in that zone is available, fall back to any available
 *    agent platform-wide (better to deliver late than not assign at all), and
 *    flag it so the admin dashboard can surface an "out of zone" warning.
 * 3. If truly no agent is available anywhere, return null — the order stays
 *    unassigned and the admin must intervene or wait for an agent to free up.
 */
function findBestAgent(pickupZoneId) {
  // Try same-zone available agent first
  const sameZoneAgent = db
    .prepare(
      `SELECT a.id, a.user_id, a.zone_id, u.name, u.email
       FROM agents a
       JOIN users u ON u.id = a.user_id
       WHERE a.zone_id = ? AND a.availability = 'available'
       ORDER BY a.id ASC
       LIMIT 1`
    )
    .get(pickupZoneId);

  if (sameZoneAgent) {
    return { agent: sameZoneAgent, matchType: "same_zone" };
  }

  // Fallback: any available agent, any zone
  const anyAgent = db
    .prepare(
      `SELECT a.id, a.user_id, a.zone_id, u.name, u.email
       FROM agents a
       JOIN users u ON u.id = a.user_id
       WHERE a.availability = 'available'
       ORDER BY a.id ASC
       LIMIT 1`
    )
    .get();

  if (anyAgent) {
    return { agent: anyAgent, matchType: "out_of_zone_fallback" };
  }

  // No agent available anywhere
  return { agent: null, matchType: "none_available" };
}

/**
 * Assigns an agent to an order: runs findBestAgent, updates the order,
 * marks the agent as 'busy', and returns the result for the caller to
 * log in order_status_history and trigger notifications.
 */
function autoAssignAgent(orderId, pickupZoneId) {
  const { agent, matchType } = findBestAgent(pickupZoneId);

  if (!agent) {
    return { success: false, matchType, agent: null };
  }

  db.prepare(`UPDATE orders SET assigned_agent_id = ? WHERE id = ?`).run(
    agent.id,
    orderId
  );
  db.prepare(`UPDATE agents SET availability = 'busy' WHERE id = ?`).run(
    agent.id
  );

  return { success: true, matchType, agent };
}

/**
 * Frees up an agent (call this when an order reaches a terminal state:
 * Delivered or Failed) so they become eligible for auto-assignment again.
 */
function releaseAgent(agentId) {
  db.prepare(`UPDATE agents SET availability = 'available' WHERE id = ?`).run(
    agentId
  );
}

module.exports = { findBestAgent, autoAssignAgent, releaseAgent };