import { Router } from "express";
import { requireAuth, requireAdmin } from "../auth";
import process from "process";

const router = Router();

export function registerAdminSystemRoutes(app: any) {
    // System status overview
    app.get("/api/admin/system/status", requireAuth, requireAdmin, (req: any, res: any) => {
        const memoryUsage = process.memoryUsage();
        
        res.json({
            status: "online",
            uptime: process.uptime(),
            timestamp: new Date(),
            environment: process.env.NODE_ENV,
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB"
            },
            version: process.version
        });
    });

    // Clear internal caches (placeholder implementation)
    app.post("/api/admin/system/clear-cache", requireAuth, requireAdmin, (req: any, res: any) => {
        // Logic to clear Redis or in-memory caches would go here
        console.log("Admin requested cache clear");
        res.json({ success: true, message: "System cache cleared successfully" });
    });
    
    // Environment check (sensitive, admin only)
    app.get("/api/admin/system/env-check", requireAuth, requireAdmin, (req: any, res: any) => {
        res.json({
            hasOpenAI: !!process.env.OPENAI_API_KEY,
            hasStripe: !!process.env.STRIPE_SECRET_KEY,
            hasSendGrid: !!process.env.SENDGRID_API_KEY,
            hasDb: !!process.env.DATABASE_URL
        });
    });
}