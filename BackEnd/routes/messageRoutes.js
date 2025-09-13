import express from "express"; 
import { protectRoute } from "../middleware/auth.js";
import { getUserForSideBar, getMessage, markMessageAsSeen, sendMessage } from "../controller/messageController.js";


const messageRouter = express.Router(); 

messageRouter.get("/users", protectRoute, getUserForSideBar);
messageRouter.get("/:id", protectRoute, getMessage);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen)
messageRouter.post("/send/:id", protectRoute, sendMessage)

export default messageRouter;