
import { notificationService } from "./notification-service";

export const cronService = {
  getActiveTasks() {
    return [
      { id: "credit-check", name: "Check Low Credits", schedule: "0 */6 * * *", lastRun: new Date().toISOString(), status: "active" },
      { id: "newsletter", name: "Weekly Newsletter", schedule: "0 9 * * 1", lastRun: new Date().toISOString(), status: "active" }
    ];
  },

  start() {
    console.log("Cron service started");
    // In a real app, we would use node-cron here
    // setInterval(() => notificationService.checkLowCredits(), 6 * 60 * 60 * 1000);
  }
};
