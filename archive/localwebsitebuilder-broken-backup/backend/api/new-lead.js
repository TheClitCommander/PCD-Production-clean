// backend/api/new-lead.js
const express = require("express");
const { saveLeadToDB, saveAppointmentToDB } = require("../services/db.js");
const fs = require("fs");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    console.log("New lead received from Squarespace:", payload);
    
    // Log the raw payload for debugging
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - Squarespace webhook received: ${JSON.stringify(payload)}\n`);
    
    // Validate that we have a proper Squarespace payload
    if (!payload || (!payload.data && !payload.formId)) {
      console.error("Invalid Squarespace payload format");
      return res.status(400).json({ error: "Invalid payload format" });
    }
    
    // Save the lead to the database
    const leadId = await saveLeadToDB(payload);
    
    // Check if this is an appointment booking with date/time
    const formData = payload.data || {};
    if (formData.appointment_date || formData.appointment_time) {
      await saveAppointmentToDB(leadId, {
        appointment_date: formData.appointment_date || "",
        appointment_time: formData.appointment_time || "",
        notes: formData.message || "",
      });
      
      console.log("Appointment booking saved successfully");
    }
    
    // Send a success response
    res.status(200).json({ 
      received: true, 
      message: "Lead processed successfully",
      leadId
    });
  } catch (error) {
    console.error("Error processing Squarespace lead:", error);
    fs.appendFileSync("webhook.log", `${new Date().toISOString()} - ERROR processing Squarespace lead: ${error.message}\n`);
    res.status(500).json({ error: "Failed to process lead" });
  }
});

module.exports = router;
