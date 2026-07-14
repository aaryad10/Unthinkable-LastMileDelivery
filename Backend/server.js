require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/admin", adminRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Last-Mile Delivery Tracker API" });
});

app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});