// backend/src/routes/strategies.ts
import { Router } from "express";

const router = Router();

// Tes routes ici
router.get("/", (req, res) => {
  res.json({ message: "Strategies route OK" });
});

export default router;