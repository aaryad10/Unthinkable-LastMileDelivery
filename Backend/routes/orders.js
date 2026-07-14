const express = require("express");
const db = require("../db/connect");
const { requireAuth, requireRole } = require("../middleware/auth");
const { calculateCharge, detectZone } = require("../services/rateEngine");
const { autoAssignAgent, releaseAgent, findBestAgent } = require("../services/assignmentEngine");
const { sendStatusEmail } = require("../services/emailService");

const router = express.Router();

function generateOrderCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `LMD-${n}`;
}

/**
 * POST /orders/quote
 * Calculates the charge WITHOUT creating an order. This powers
 * "the charge is shown before the customer confirms" from the brief.
 */
router.post("/quote", requireAuth, (req, res) => {
  const { lengthCm, widthCm, heightCm, actualWeightKg, pickupPincode, dropPincode, orderType, paymentType } = req.body;

  if (!lengthCm || !widthCm || !heightCm || !actualWeightKg || !pickupPincode || !dropPincode || !orderType || !paymentType) {
    return res.status(400).json({ error: "Missing required fields for charge calculation" });
  }

  try {
    const quote = calculateCharge({
      lengthCm: Number(lengthCm), widthCm: Number(widthCm), heightCm: Number(heightCm),
      actualWeightKg: Number(actualWeightKg), pickupPincode, dropPincode, orderType, paymentType,
    });
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message, code: err.code });
  }
});

/**
 * POST /orders
 * Creates a confirmed order. Customers create for themselves;
 * admins can create on behalf of any customer (per brief).
 */
router.post("/", requireAuth, requireRole("customer", "admin"), (req, res) => {
  const {
    customerId, // only used if req.user is admin creating on behalf of a customer
    pickupAddress, pickupPincode, dropAddress, dropPincode,
    lengthCm, widthCm, heightCm, actualWeightKg,
    orderType, paymentType,
  } = req.body;

  if (!pickupAddress || !pickupPincode || !dropAddress || !dropPincode ||
      !lengthCm || !widthCm || !heightCm || !actualWeightKg || !orderType || !paymentType) {
    return res.status(400).json({ error: "Missing required order fields" });
  }

  const finalCustomerId = req.user.role === "admin" && customerId ? customerId : req.user.id;

  let quote;
  try {
    quote = calculateCharge({
      lengthCm: Number(lengthCm), widthCm: Number(widthCm), heightCm: Number(heightCm),
      actualWeightKg: Number(actualWeightKg), pickupPincode, dropPincode, orderType, paymentType,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message, code: err.code });
  }

  const orderCode = generateOrderCode();

  const result = db.prepare(`
    INSERT INTO orders (
      order_code, customer_id, created_by_id,
      pickup_address, pickup_pincode, drop_address, drop_pincode,
      pickup_zone_id, drop_zone_id,
      length_cm, width_cm, height_cm, actual_weight_kg,
      volumetric_weight_kg, chargeable_weight_kg,
      order_type, payment_type, charge, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Created')
  `).run(
    orderCode, finalCustomerId, req.user.id,
    pickupAddress, pickupPincode, dropAddress, dropPincode,
    quote.pickupZone.id, quote.dropZone.id,
    lengthCm, widthCm, heightCm, actualWeightKg,
    quote.volumetricWeightKg, quote.chargeableWeightKg,
    orderType, paymentType, quote.totalCharge
  );

  const orderId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO order_status_history (order_id, status, notes, actor_user_id, actor_label)
    VALUES (?, 'Created', 'Order created and awaiting pickup assignment.', ?, ?)
  `).run(orderId, req.user.id, `${req.user.role === "admin" ? "Admin" : "Customer"}: ${req.user.name}`);

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  res.status(201).json({ order, quote });
});

/**
 * GET /orders
 * Role-scoped list: customer sees own orders, agent sees assigned orders,
 * admin sees everything with optional filters (status, zone, agent).
 */
router.get("/", requireAuth, (req, res) => {
  const { status, zoneId, agentId } = req.query;

  let query = `
    SELECT o.*, pz.name as pickup_zone_name, dz.name as drop_zone_name,
           u.name as customer_name, a.id as agent_row_id, au.name as agent_name
    FROM orders o
    LEFT JOIN zones pz ON pz.id = o.pickup_zone_id
    LEFT JOIN zones dz ON dz.id = o.drop_zone_id
    LEFT JOIN users u ON u.id = o.customer_id
    LEFT JOIN agents a ON a.id = o.assigned_agent_id
    LEFT JOIN users au ON au.id = a.user_id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === "customer") {
    query += " AND o.customer_id = ?";
    params.push(req.user.id);
  } else if (req.user.role === "agent") {
    const agentRow = db.prepare("SELECT id FROM agents WHERE user_id = ?").get(req.user.id);
    query += " AND o.assigned_agent_id = ?";
    params.push(agentRow ? agentRow.id : -1);
  }
  // admin: no restriction, sees all

  if (status) {
    query += " AND o.status = ?";
    params.push(status);
  }
  if (zoneId) {
    query += " AND o.pickup_zone_id = ?";
    params.push(zoneId);
  }
  if (agentId) {
    query += " AND o.assigned_agent_id = ?";
    params.push(agentId);
  }

  query += " ORDER BY o.created_at DESC";

  const orders = db.prepare(query).all(...params);
  res.json({ orders });
});

/**
 * GET /orders/:id
 * Full order detail + immutable status history timeline.
 */
router.get("/:id", requireAuth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  // Access control: customers can only see their own orders
  if (req.user.role === "customer" && order.customer_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user.role === "agent") {
    const agentRow = db.prepare("SELECT id FROM agents WHERE user_id = ?").get(req.user.id);
    if (!agentRow || order.assigned_agent_id !== agentRow.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const timeline = db
    .prepare("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY timestamp ASC, id ASC")
    .all(order.id);

  res.json({ order, timeline });
});

/**
 * PATCH /orders/:id/assign
 * Admin manually assigns an agent, OR triggers auto-assignment (nearest available).
 * Body: { agentId } for manual, or { auto: true } for auto-assignment.
 */
router.patch("/:id/assign", requireAuth, requireRole("admin"), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { agentId, auto } = req.body;

  if (auto) {
    const result = autoAssignAgent(order.id, order.pickup_zone_id);
    if (!result.success) {
      return res.status(409).json({ error: "No available agents to assign", matchType: result.matchType });
    }
    db.prepare(`
      INSERT INTO order_status_history (order_id, status, notes, actor_user_id, actor_label)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      order.id, order.status,
      `Auto-assigned to ${result.agent.name} (${result.matchType === "same_zone" ? "same zone" : "out-of-zone fallback"}).`,
      req.user.id, `Admin: ${req.user.name}`
    );
    return res.json({ agent: result.agent, matchType: result.matchType });
  }

  if (!agentId) return res.status(400).json({ error: "Provide agentId for manual assignment, or auto: true" });

  const agentRow = db.prepare("SELECT a.*, u.name FROM agents a JOIN users u ON u.id = a.user_id WHERE a.id = ?").get(agentId);
  if (!agentRow) return res.status(404).json({ error: "Agent not found" });

  db.prepare("UPDATE orders SET assigned_agent_id = ? WHERE id = ?").run(agentId, order.id);
  db.prepare("UPDATE agents SET availability = 'busy' WHERE id = ?").run(agentId);
  db.prepare(`
    INSERT INTO order_status_history (order_id, status, notes, actor_user_id, actor_label)
    VALUES (?, ?, ?, ?, ?)
  `).run(order.id, order.status, `Manually assigned to ${agentRow.name} by admin.`, req.user.id, `Admin: ${req.user.name}`);

  res.json({ agent: agentRow });
});

/**
 * PATCH /orders/:id/status
 * Agent updates their assigned order's status, OR admin overrides any order.
 * Every call: appends to immutable history, sends customer email, and
 * releases the agent back to 'available' if the order reaches a terminal state.
 */
router.patch("/:id/status", requireAuth, requireRole("agent", "admin"), async (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ["Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user.role === "agent") {
    const agentRow = db.prepare("SELECT id FROM agents WHERE user_id = ?").get(req.user.id);
    if (!agentRow || order.assigned_agent_id !== agentRow.id) {
      return res.status(403).json({ error: "You are not assigned to this order" });
    }
  }

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, order.id);

  const actorLabel = req.user.role === "admin" ? `Admin: ${req.user.name} (override)` : `Agent: ${req.user.name}`;
  db.prepare(`
    INSERT INTO order_status_history (order_id, status, notes, actor_user_id, actor_label)
    VALUES (?, ?, ?, ?, ?)
  `).run(order.id, status, notes || null, req.user.id, actorLabel);

  // Release agent back to available pool on terminal states
  if ((status === "Delivered" || status === "Failed") && order.assigned_agent_id) {
    releaseAgent(order.assigned_agent_id);
  }

  // Email the customer on every status change
  const customer = db.prepare("SELECT name, email FROM users WHERE id = ?").get(order.customer_id);
  await sendStatusEmail({
    toEmail: customer.email, toName: customer.name,
    orderCode: order.order_code, status, notes,
  });

  const updatedOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
  res.json({ order: updatedOrder });
});

/**
 * POST /orders/:id/reschedule
 * Customer reschedules a Failed delivery for a new date.
 * Reassigns an agent for the new attempt (per brief: "agent is reassigned
 * for the rescheduled attempt").
 */
router.post("/:id/reschedule", requireAuth, requireRole("customer"), async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: "date is required" });

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.customer_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (order.status !== "Failed") {
    return res.status(400).json({ error: "Only Failed orders can be rescheduled" });
  }

  db.prepare("UPDATE orders SET status = 'Picked Up', scheduled_date = ? WHERE id = ?").run(date, order.id);

  db.prepare(`
    INSERT INTO order_status_history (order_id, status, notes, actor_user_id, actor_label)
    VALUES (?, 'Picked Up', ?, ?, ?)
  `).run(order.id, `Delivery rescheduled for ${date}.`, req.user.id, `Customer: ${req.user.name}`);

  // Reassign an agent for the rescheduled attempt
  const assignResult = autoAssignAgent(order.id, order.pickup_zone_id);

  const customer = db.prepare("SELECT name, email FROM users WHERE id = ?").get(order.customer_id);
  await sendStatusEmail({
    toEmail: customer.email, toName: customer.name,
    orderCode: order.order_code, status: "Picked Up",
    notes: `Rescheduled for ${date}.`,
  });

  const updatedOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
  res.json({ order: updatedOrder, reassignedAgent: assignResult.agent });
});

module.exports = router;