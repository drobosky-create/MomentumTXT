import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { schedulerService } from "./services/scheduler";

const app = express();

// Webhook routes need raw body - must come before express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: any, res) => {
    try {
      const { stripeService } = await import("./services/stripe");
      const signature = req.headers["stripe-signature"];

      if (!signature) {
        return res.status(400).json({ message: "Missing stripe-signature header" });
      }

      await stripeService.handleWebhook(req.body, signature);

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ message: error.message });
    }
  }
);

// Apply JSON parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Log method/path/status/duration only. Do NOT log response bodies —
  // they contain PII (phone numbers, emails) and secrets (Stripe clientSecret).
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log server-side; never re-throw (that becomes an uncaughtException and
    // kills the process). If the response already started, defer to Express.
    console.error(err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(status).json({ message });
  });

  // Start the scheduler service for automated tasks
  schedulerService.start();

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // reusePort is a Linux-only socket option; it throws ENOTSUP on Windows/macOS.
  const listenOptions: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
