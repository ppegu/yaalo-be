import { createHash } from "crypto";
import { Router } from "express";

const router = Router();

router.get("/register-client", (req, res) => {
  const clientIp = req.ip || "unknown";
  const hash = createHash("sha256").update(clientIp).digest("hex");
});

export default router;
