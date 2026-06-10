require('dotenv').config();
const db = require("../models");

async function syncDb() {
  try {
    console.log("Starting DB sync...");
    await db.sequelize.sync({ alter: true });
    console.log("DB sync complete!");
  } catch (err) {
    console.error("DB sync failed:", err);
  } finally {
    process.exit();
  }
}

syncDb();
