// backend/services/db.js
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("fs");
const path = require("path");

let db;

async function getDB() {
  if (!db) {
    // Ensure the database file exists and is writable
    const dbPath = path.resolve("./websitewizard.db");
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    
    // Create necessary tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        phone TEXT,
        source TEXT DEFAULT 'form',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        raw TEXT
      )
    `);
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        appointment_type TEXT,
        appointment_date TEXT,
        appointment_time TEXT,
        datetime TEXT,
        timezone TEXT,
        notes TEXT,
        external_id TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id)
      )
    `);
    
    // Log successful database initialization
    console.log("Database initialized successfully");
  }
  return db;
}

async function saveLeadToDB(payload) {
  try {
    const db = await getDB();
    
    // Log the incoming payload to a file for debugging
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - New lead: ${JSON.stringify(payload)}\n`);
    
    // Handle different formats - Squarespace format has data inside a data property
    const leadData = payload.data || payload;
    
    // Extract basic lead information
    const name = leadData.name || leadData.business_name || `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim();
    const email = leadData.email || '';
    const phone = leadData.phone || '';
    const source = payload.formId ? 'squarespace' : 'direct';
    
    // Insert the lead into the database
    const result = await db.run(
      `INSERT INTO leads (name, email, phone, source, raw) VALUES (?, ?, ?, ?, ?)`,
      name, email, phone, source, JSON.stringify(payload)
    );
    
    console.log(`Lead saved with ID: ${result.lastID}`);
    return result.lastID;
  } catch (error) {
    console.error("Error saving lead to database:", error);
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - ERROR saving lead: ${error.message}\n`);
    throw error;
  }
}

async function saveAppointmentToDB(leadId, appointmentData) {
  try {
    const db = await getDB();
    
    // Log the incoming appointment data
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - New appointment: ${JSON.stringify(appointmentData)}\n`);
    
    // Extract appointment information
    const appointmentType = appointmentData.appointmentType || '';
    const datetime = appointmentData.datetime || '';
    const timezone = appointmentData.timezone || 'America/New_York';
    const notes = appointmentData.notes || '';
    const externalId = appointmentData.appointmentID?.toString() || '';
    
    // For Squarespace format, which might have separate date and time fields
    const appointmentDate = appointmentData.appointment_date || '';
    const appointmentTime = appointmentData.appointment_time || '';
    
    const result = await db.run(
      `INSERT INTO appointments (
        lead_id, appointment_type, appointment_date, appointment_time, 
        datetime, timezone, notes, external_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      leadId, appointmentType, appointmentDate, appointmentTime, 
      datetime, timezone, notes, externalId
    );
    
    console.log(`Appointment saved with ID: ${result.lastID}`);
    return result.lastID;
  } catch (error) {
    console.error("Error saving appointment to database:", error);
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - ERROR saving appointment: ${error.message}\n`);
    throw error;
  }
}

// Export the functions
module.exports = {
  getDB,
  saveLeadToDB,
  saveAppointmentToDB
};
