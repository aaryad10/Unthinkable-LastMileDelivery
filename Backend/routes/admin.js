const express = require("express");
const db = require("../db/connect");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

// GET /admin/customers - list all customers (for "create order on behalf of" picker)
router.get("/customers", (req, res) => {
  const customers = db.prepare("SELECT id, name, email, phone FROM users WHERE role = 'customer' ORDER BY name").all();
  res.json({ customers });
});

// ---------- ZONES ----------

// GET /admin/zones - list all zones with their pincodes
router.get("/zones", (req, res) => {
  const zones = db.prepare("SELECT * FROM zones ORDER BY name").all();
  const areas = db.prepare("SELECT * FROM zone_areas").all();
  const zonesWithAreas = zones.map((z) => ({
    ...z,
    pincodes: areas.filter((a) => a.zone_id === z.id).map((a) => a.pincode),
  }));
  res.json({ zones: zonesWithAreas });
});

// POST /admin/zones - create a new zone with initial pincodes
router.post("/zones", (req, res) => {
  const { name, pincodes } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const existing = db.prepare("SELECT id FROM zones WHERE name = ?").get(name);
  if (existing) return res.status(409).json({ error: "A zone with this name already exists" });

  const result = db.prepare("INSERT INTO zones (name) VALUES (?)").run(name);
  const zoneId = result.lastInsertRowid;

  if (Array.isArray(pincodes)) {
    const insertArea = db.prepare("INSERT INTO zone_areas (zone_id, pincode) VALUES (?, ?)");
    for (const pin of pincodes) {
      try {
        insertArea.run(zoneId, pin);
      } catch (e) {
        // pincode already mapped to another zone - skip silently, report at end
      }
    }
  }

  const zone = db.prepare("SELECT * FROM zones WHERE id = ?").get(zoneId);
  res.status(201).json({ zone });
});

// POST /admin/zones/:id/areas - assign an additional pincode to an existing zone
router.post("/zones/:id/areas", (req, res) => {
  const { pincode } = req.body;
  if (!pincode) return res.status(400).json({ error: "pincode is required" });

  const zone = db.prepare("SELECT * FROM zones WHERE id = ?").get(req.params.id);
  if (!zone) return res.status(404).json({ error: "Zone not found" });

  const existingArea = db.prepare("SELECT * FROM zone_areas WHERE pincode = ?").get(pincode);
  if (existingArea) {
    return res.status(409).json({ error: "This pincode is already mapped to a zone" });
  }

  db.prepare("INSERT INTO zone_areas (zone_id, pincode) VALUES (?, ?)").run(zone.id, pincode);
  res.status(201).json({ message: `Pincode ${pincode} mapped to zone ${zone.name}` });
});

// ---------- RATE CARDS ----------

// GET /admin/rate-cards - current rate card + COD surcharge config
router.get("/rate-cards", (req, res) => {
  const rateCards = db.prepare("SELECT * FROM rate_cards").all();
  const codSurcharge = db.prepare("SELECT * FROM cod_surcharge").all();
  res.json({ rateCards, codSurcharge });
});

// PUT /admin/rate-cards - update a specific rate (route_type + order_type -> new rate)
router.put("/rate-cards", (req, res) => {
  const { routeType, orderType, ratePerKg } = req.body;
  if (!routeType || !orderType || ratePerKg === undefined) {
    return res.status(400).json({ error: "routeType, orderType, and ratePerKg are required" });
  }

  const result = db
    .prepare("UPDATE rate_cards SET rate_per_kg = ? WHERE route_type = ? AND order_type = ?")
    .run(ratePerKg, routeType, orderType);

  if (result.changes === 0) {
    return res.status(404).json({ error: "No matching rate card entry found" });
  }

  res.json({ message: "Rate card updated", routeType, orderType, ratePerKg });
});

// PUT /admin/cod-surcharge - update COD surcharge for an order type
router.put("/cod-surcharge", (req, res) => {
  const { orderType, surcharge } = req.body;
  if (!orderType || surcharge === undefined) {
    return res.status(400).json({ error: "orderType and surcharge are required" });
  }

  const result = db
    .prepare("UPDATE cod_surcharge SET surcharge = ? WHERE order_type = ?")
    .run(surcharge, orderType);

  if (result.changes === 0) {
    return res.status(404).json({ error: "No matching COD surcharge entry found" });
  }

  res.json({ message: "COD surcharge updated", orderType, surcharge });
});

// ---------- AGENTS ----------

// GET /admin/agents - list all agents with their zone + availability
router.get("/agents", (req, res) => {
  const agents = db
    .prepare(`
      SELECT a.id, a.availability, a.zone_id, z.name as zone_name,
             u.id as user_id, u.name, u.email, u.phone
      FROM agents a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN zones z ON z.id = a.zone_id
      ORDER BY u.name
    `)
    .all();
  res.json({ agents });
});

// PATCH /admin/agents/:id - update agent zone or availability
router.patch("/agents/:id", (req, res) => {
  const { zoneId, availability } = req.body;
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  if (zoneId !== undefined) {
    db.prepare("UPDATE agents SET zone_id = ? WHERE id = ?").run(zoneId, agent.id);
  }
  if (availability !== undefined) {
    if (!["available", "busy", "offline"].includes(availability)) {
      return res.status(400).json({ error: "availability must be available, busy, or offline" });
    }
    db.prepare("UPDATE agents SET availability = ? WHERE id = ?").run(availability, agent.id);
  }

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(agent.id);
  res.json({ agent: updated });
});

module.exports = router;