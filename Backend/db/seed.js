const bcrypt = require("bcryptjs");
const db = require("./connect");

console.log("Seeding database...");

// Clear existing data (safe for repeated seeding during development)
db.exec(`
  DELETE FROM order_status_history;
  DELETE FROM orders;
  DELETE FROM agents;
  DELETE FROM cod_surcharge;
  DELETE FROM rate_cards;
  DELETE FROM zone_areas;
  DELETE FROM zones;
  DELETE FROM users;
`);

// ---------- 1. ZONES ----------
const insertZone = db.prepare("INSERT INTO zones (name) VALUES (?)");
const zones = {
  1: insertZone.run("Shivajinagar-Ghole Road & Aundh").lastInsertRowid,
  2: insertZone.run("Dhole Patil Road & Nagar Road-Vadgaonsheri").lastInsertRowid,
  3: insertZone.run("Kothrud-Bawdhan & Warje-Karvenagar").lastInsertRowid,
  4: insertZone.run("Sinhagad Road & Dhankawadi-Sahakarnagar").lastInsertRowid,
  5: insertZone.run("Hadapsar & Kondhwa-Yewalewadi").lastInsertRowid,
};

// ---------- 2. ZONE AREAS (pincodes) ----------
const insertArea = db.prepare("INSERT INTO zone_areas (zone_id, pincode) VALUES (?, ?)");
insertArea.run(zones[1], "411005"); // Shivajinagar
insertArea.run(zones[1], "411007"); // Aundh
insertArea.run(zones[2], "411001"); // Pune GO/Camp
insertArea.run(zones[2], "411014"); // Yerawada
insertArea.run(zones[3], "411038"); // Kothrud
insertArea.run(zones[3], "411052"); // Warje
insertArea.run(zones[4], "411043"); // Sinhagad Road
insertArea.run(zones[4], "411046"); // Katraj
insertArea.run(zones[5], "411028"); // Hadapsar
insertArea.run(zones[5], "411048"); // Kondhwa

// ---------- 3. RATE CARDS ----------
const insertRate = db.prepare(
  "INSERT INTO rate_cards (route_type, order_type, rate_per_kg) VALUES (?, ?, ?)"
);
insertRate.run("intra_zone", "B2B", 12);
insertRate.run("intra_zone", "B2C", 15);
insertRate.run("inter_zone", "B2B", 24);
insertRate.run("inter_zone", "B2C", 30);

const insertCOD = db.prepare("INSERT INTO cod_surcharge (order_type, surcharge) VALUES (?, ?)");
insertCOD.run("B2B", 25);
insertCOD.run("B2C", 15);

// ---------- 4. USERS ----------
const insertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, phone, role)
  VALUES (?, ?, ?, ?, ?)
`);

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

const adminId = insertUser.run(
  "Control Center",
  "admin@gmail.com",
  hash("Admin@123"),
  "+91 98220 10001",
  "admin"
).lastInsertRowid;

const customerId = insertUser.run(
  "Aarya Deshpande",
  "customer@gmail.com",
  hash("Customer@123"),
  "+91 98220 20001",
  "customer"
).lastInsertRowid;

const agentUserDefs = [
  { name: "Rohan Kulkarni", email: "agent1@gmail.com", pw: "Agent1", phone: "+91 98220 30001", zone: 1 },
  { name: "Priya Joshi", email: "agent2@gmail.com", pw: "Agent2", phone: "+91 98220 30002", zone: 2 },
  { name: "Amit Deshmukh", email: "agent3@gmail.com", pw: "Agent3", phone: "+91 98220 30003", zone: 3 },
  { name: "Sneha Patil", email: "agent4@gmail.com", pw: "Agent4", phone: "+91 98220 30004", zone: 4 },
  { name: "Vikram Rao", email: "agent5@gmail.com", pw: "Agent5", phone: "+91 98220 30005", zone: 5 },
];

const insertAgent = db.prepare(`
  INSERT INTO agents (user_id, zone_id, availability) VALUES (?, ?, ?)
`);

const agentIds = {};
agentUserDefs.forEach((a) => {
  const userId = insertUser.run(a.name, a.email, hash(a.pw), a.phone, "agent").lastInsertRowid;
  const agentId = insertAgent.run(userId, zones[a.zone], "available").lastInsertRowid;
  agentIds[a.zone] = { agentId, userId, name: a.name };
});

// ---------- 5. RATE CALCULATION ENGINE (mirrors backend service, used to seed correct charges) ----------
function calculateCharge({ length, width, height, actualWeight, orderType, paymentType, routeType }) {
  const volumetricWeight = (length * width * height) / 5000;
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);
  const rateRow = db
    .prepare("SELECT rate_per_kg FROM rate_cards WHERE route_type = ? AND order_type = ?")
    .get(routeType, orderType);
  const codRow = db.prepare("SELECT surcharge FROM cod_surcharge WHERE order_type = ?").get(orderType);
  const surcharge = paymentType === "COD" ? codRow.surcharge : 0;
  const charge = Math.round((chargeableWeight * rateRow.rate_per_kg + surcharge) * 100) / 100;
  return { volumetricWeight, chargeableWeight, charge };
}

// ---------- 6. SAMPLE ORDERS ----------
const insertOrder = db.prepare(`
  INSERT INTO orders (
    order_code, customer_id, created_by_id,
    pickup_address, pickup_pincode, drop_address, drop_pincode,
    pickup_zone_id, drop_zone_id,
    length_cm, width_cm, height_cm, actual_weight_kg,
    volumetric_weight_kg, chargeable_weight_kg,
    order_type, payment_type, charge, status, assigned_agent_id, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertHistory = db.prepare(`
  INSERT INTO order_status_history (order_id, status, notes, actor_user_id, actor_label, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);

function daysAgo(n, hour = "10:00:00") {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10) + " " + hour;
}

const sampleOrders = [
  {
    code: "LMD-100001",
    pickup: { addr: "FC Road, Shivajinagar, Pune", pin: "411005", zone: 1 },
    drop: { addr: "Aundh Road, near ITI Chowk, Pune", pin: "411007", zone: 1 },
    dims: [30, 20, 15], weight: 3.2,
    orderType: "B2C", paymentType: "Prepaid",
    status: "Delivered",
    agentZone: 1,
    createdDaysAgo: 4,
    history: [
      { status: "Picked Up", offset: 4, notes: "Package picked up from FC Road warehouse." },
      { status: "In Transit", offset: 3, notes: "In transit to Aundh delivery hub." },
      { status: "Out for Delivery", offset: 3, notes: "Out for delivery with agent Rohan Kulkarni." },
      { status: "Delivered", offset: 3, notes: "Delivered and signed by recipient." },
    ],
  },
  {
    code: "LMD-100002",
    pickup: { addr: "Ghole Road, Shivajinagar, Pune", pin: "411005", zone: 1 },
    drop: { addr: "Paud Road, Kothrud, Pune", pin: "411038", zone: 3 },
    dims: [45, 35, 30], weight: 6.5,
    orderType: "B2C", paymentType: "COD",
    status: "In Transit",
    agentZone: 1,
    createdDaysAgo: 2,
    history: [
      { status: "Picked Up", offset: 2, notes: "Picked up from Ghole Road pickup point." },
      { status: "In Transit", offset: 1, notes: "Dispatched towards Kothrud, inter-zone route." },
    ],
  },
  {
    code: "LMD-100003",
    pickup: { addr: "Magarpatta City, Hadapsar, Pune", pin: "411028", zone: 5 },
    drop: { addr: "Amanora Park Town, Hadapsar, Pune", pin: "411028", zone: 5 },
    dims: [80, 60, 50], weight: 24.0,
    orderType: "B2B", paymentType: "Prepaid",
    status: "Picked Up",
    agentZone: 5,
    createdDaysAgo: 1,
    history: [
      { status: "Picked Up", offset: 1, notes: "Bulk shipment collected from Magarpatta warehouse." },
    ],
  },
  {
    code: "LMD-100004",
    pickup: { addr: "Sinhagad Road, near Vadgaon, Pune", pin: "411043", zone: 4 },
    drop: { addr: "Katraj-Kondhwa Road, Pune", pin: "411046", zone: 4 },
    dims: [20, 15, 10], weight: 1.1,
    orderType: "B2C", paymentType: "COD",
    status: "Failed",
    agentZone: 4,
    createdDaysAgo: 3,
    history: [
      { status: "Picked Up", offset: 3, notes: "Package collected." },
      { status: "Out for Delivery", offset: 2, notes: "Out for delivery." },
      { status: "Failed", offset: 2, notes: "Customer unreachable, delivery attempt failed." },
    ],
  },
  {
    code: "LMD-100005",
    pickup: { addr: "Nagar Road, Vadgaonsheri, Pune", pin: "411014", zone: 2 },
    drop: { addr: "Dhankawadi, near Bharati Vidyapeeth, Pune", pin: "411043", zone: 4 },
    dims: [100, 70, 60], weight: 35.0,
    orderType: "B2B", paymentType: "Prepaid",
    status: "Delivered",
    agentZone: 2,
    createdDaysAgo: 5,
    history: [
      { status: "Picked Up", offset: 5, notes: "Bulk shipment collected from Vadgaonsheri hub." },
      { status: "In Transit", offset: 4, notes: "In transit, inter-zone to Dhankawadi." },
      { status: "Out for Delivery", offset: 4, notes: "Out for delivery with agent Priya Joshi." },
      { status: "Delivered", offset: 4, notes: "Delivered and acknowledged by site manager." },
    ],
  },
];

sampleOrders.forEach((o) => {
  const routeType = o.pickup.zone === o.drop.zone ? "intra_zone" : "inter_zone";
  const { volumetricWeight, chargeableWeight, charge } = calculateCharge({
    length: o.dims[0], width: o.dims[1], height: o.dims[2],
    actualWeight: o.weight, orderType: o.orderType, paymentType: o.paymentType, routeType,
  });

  const agent = agentIds[o.agentZone];
  const createdAt = daysAgo(o.createdDaysAgo, "09:00:00");

  const orderId = insertOrder.run(
    o.code, customerId, customerId,
    o.pickup.addr, o.pickup.pin, o.drop.addr, o.drop.pin,
    zones[o.pickup.zone], zones[o.drop.zone],
    o.dims[0], o.dims[1], o.dims[2], o.weight,
    volumetricWeight, chargeableWeight,
    o.orderType, o.paymentType, charge, o.status, agent.agentId, createdAt
  ).lastInsertRowid;

  o.history.forEach((h) => {
    const isSystemEvent = h.status === "Picked Up" && h.offset === o.createdDaysAgo;
    insertHistory.run(
      orderId,
      h.status,
      h.notes,
      isSystemEvent ? null : agent.userId,
      isSystemEvent ? "System: Order Created" : `Agent: ${agent.name}`,
      daysAgo(h.offset, "11:00:00")
    );
  });

  console.log(`  ${o.code}: ${routeType}, chargeable ${chargeableWeight}kg, charge Rs.${charge}, status ${o.status}`);
});

console.log("Seeding complete.");
console.log("\nLogin credentials:");
console.log("  Admin:    admin@gmail.com / Admin@123");
console.log("  Customer: customer@gmail.com / Customer@123");
console.log("  Agents:   agent1@gmail.com / Agent1  (through agent5 / Agent5)");