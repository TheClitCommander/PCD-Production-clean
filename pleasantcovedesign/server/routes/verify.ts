import { Router } from "express";
import { reverifyLead } from "../services/lead-service";
const router = Router();

// POST /api/leads/verify/:id
router.post("/:id", async (req, res) => {
  try {
    const lead = await reverifyLead(req.params.id);
    res.json(lead);
  } catch (error) {
    console.error('Failed to verify lead:', error);
    res.status(500).json({ error: 'Failed to verify lead' });
  }
});

export default router;

