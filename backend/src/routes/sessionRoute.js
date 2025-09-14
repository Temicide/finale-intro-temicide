import express from "express";
import { 
  createSession, 
  listSessions, 
  getSession, 
  addMessage,
  getMealPlanSuggestions 
} from "../controllers/sessionCotroller.js";

const router = express.Router();

router.post("/", createSession);
router.get("/", listSessions);
router.get("/:id", getSession);
router.post("/:id/messages", addMessage);
router.get("/:id/meal-suggestions", getMealPlanSuggestions);

export default router;
