const db = require("../db/connect");

/**
 * Detects which zone a pincode belongs to.
 * Returns the zone row (id, name) or null if the pincode isn't mapped to any zone.
 */
function detectZone(pincode) {
  const row = db
    .prepare(
      `SELECT z.id, z.name
       FROM zone_areas za
       JOIN zones z ON z.id = za.zone_id
       WHERE za.pincode = ?`
    )
    .get(pincode);
  return row || null;
}

/**
 * Volumetric weight formula (industry standard, as specified in the brief):
 * (Length x Breadth x Height in cm) / 5000
 */
function calculateVolumetricWeight(lengthCm, widthCm, heightCm) {
  return (lengthCm * widthCm * heightCm) / 5000;
}

/**
 * Core rate calculation engine.
 * Given package + route details, returns a full breakdown of the charge —
 * never a hardcoded number. Every rate is read live from the rate_cards /
 * cod_surcharge tables, so admin changes take effect immediately with no code change.
 *
 * @param {Object} params
 * @param {number} params.lengthCm
 * @param {number} params.widthCm
 * @param {number} params.heightCm
 * @param {number} params.actualWeightKg
 * @param {string} params.pickupPincode
 * @param {string} params.dropPincode
 * @param {'B2B'|'B2C'} params.orderType
 * @param {'Prepaid'|'COD'} params.paymentType
 */
function calculateCharge({
  lengthCm,
  widthCm,
  heightCm,
  actualWeightKg,
  pickupPincode,
  dropPincode,
  orderType,
  paymentType,
}) {
  // 1. Zone detection
  const pickupZone = detectZone(pickupPincode);
  const dropZone = detectZone(dropPincode);

  if (!pickupZone || !dropZone) {
    const error = new Error(
      `Unable to detect zone for ${!pickupZone ? "pickup" : "drop"} pincode. ` +
        `Admin must map this pincode to a zone first.`
    );
    error.code = "ZONE_NOT_FOUND";
    throw error;
  }

  const routeType = pickupZone.id === dropZone.id ? "intra_zone" : "inter_zone";

  // 2. Volumetric weight + chargeable weight (higher of actual vs volumetric)
  const volumetricWeightKg = calculateVolumetricWeight(lengthCm, widthCm, heightCm);
  const chargeableWeightKg = Math.max(actualWeightKg, volumetricWeightKg);

  // 3. Rate card lookup (admin-configurable, live from DB)
  const rateRow = db
    .prepare(
      `SELECT rate_per_kg FROM rate_cards WHERE route_type = ? AND order_type = ?`
    )
    .get(routeType, orderType);

  if (!rateRow) {
    const error = new Error(
      `No rate card configured for route_type=${routeType}, order_type=${orderType}. ` +
        `Admin must configure this rate card first.`
    );
    error.code = "RATE_CARD_NOT_FOUND";
    throw error;
  }

  // 4. COD surcharge (admin-configurable, live from DB)
  let codSurcharge = 0;
  if (paymentType === "COD") {
    const codRow = db
      .prepare(`SELECT surcharge FROM cod_surcharge WHERE order_type = ?`)
      .get(orderType);
    codSurcharge = codRow ? codRow.surcharge : 0;
  }

  // 5. Final charge
  const baseCharge = chargeableWeightKg * rateRow.rate_per_kg;
  const totalCharge = Math.round((baseCharge + codSurcharge) * 100) / 100;

  return {
    pickupZone,
    dropZone,
    routeType,
    volumetricWeightKg: Math.round(volumetricWeightKg * 100) / 100,
    chargeableWeightKg: Math.round(chargeableWeightKg * 100) / 100,
    ratePerKg: rateRow.rate_per_kg,
    baseCharge: Math.round(baseCharge * 100) / 100,
    codSurcharge,
    totalCharge,
  };
}

module.exports = { detectZone, calculateVolumetricWeight, calculateCharge };