// backend/api/appointment-webhook.js
const express = require("express");
const { saveLeadToDB, saveAppointmentToDB } = require("../services/db.js");
const fs = require("fs");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    console.log("New appointment received from Acuity:", payload);
    
    // Log the raw payload for debugging
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - Acuity webhook received: ${JSON.stringify(payload)}\n`);
    
    // Validate that we have required fields
    if (!payload || !payload.email) {
      console.error("Invalid Acuity payload format");
      return res.status(400).json({ error: "Invalid payload format" });
    }
    
    // Create a lead record first with the customer information
    const leadData = {
      firstName: payload.firstName || "",
      lastName: payload.lastName || "",
      email: payload.email || "",
      phone: payload.phone || "",
      source: "acuity"
    };
    
    // Save the lead to the database
    const leadId = await saveLeadToDB(leadData);
    
    // Now save the appointment details
    const appointmentData = {
      appointmentType: payload.appointmentType || "",
      datetime: payload.datetime || "",
      timezone: payload.timezone || "America/New_York",
      notes: payload.notes || "",
      appointmentID: payload.appointmentID || payload.calendarID || null,
    };
    
    await saveAppointmentToDB(leadId, appointmentData);
    
    console.log("Appointment processed successfully");
    
    // Send a success response
    res.status(200).json({ 
      received: true, 
      message: "Appointment processed successfully",
      leadId
    });
  } catch (error) {
    console.error("Error processing Acuity appointment:", error);
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - ERROR processing Acuity appointment: ${error.message}\n`);
    res.status(500).json({ error: "Failed to process appointment" });
  }
});

module.exports = router;
