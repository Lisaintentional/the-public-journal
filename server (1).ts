import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const db = new Database("journal.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    summary TEXT
  );

  CREATE TABLE IF NOT EXISTS unlocked_features (
    id TEXT PRIMARY KEY,
    unlocked BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS unlocked_personas (
    id TEXT PRIMARY KEY
  );
`);

// Seed initial state if empty
const featureCount = db.prepare("SELECT COUNT(*) as count FROM unlocked_features").get() as { count: number };
if (featureCount.count === 0) {
  db.prepare("INSERT INTO unlocked_features (id, unlocked) VALUES (?, ?)").run('lifetime', 0);
}

let stripeClient: Stripe | null = null;

function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables.");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", stripeConfigured: !!process.env.STRIPE_SECRET_KEY });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      const { priceId, email, personaId } = req.body;

      const origin = req.headers.origin || process.env.APP_URL || "http://localhost:3000";
      const getPrice = (id: string) => {
        switch (id) {
          case "lifetime": return 4999;
          case "shadow": return 1499;
          case "offline-journal": return 1999;
          default: return 999;
        }
      };

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "link"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: personaId === "lifetime" ? "Lifetime Privacy Unlock" : `Persona Unlock: ${personaId}`,
                description: personaId === "lifetime" 
                  ? "Unlock Vector Search & Long-term Memory" 
                  : `Unlock the ${personaId} persona for your Privacy Vault.`,
              },
              unit_amount: getPrice(personaId),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: email,
        success_url: `${origin}?success=true&session_id={CHECKOUT_SESSION_ID}&personaId=${personaId}`,
        cancel_url: `${origin}?canceled=true`,
        metadata: {
          personaId,
          email,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Journal API routes
  app.get("/api/journal", (req, res) => {
    try {
      const entries = db.prepare("SELECT * FROM journal_entries ORDER BY timestamp DESC").all();
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/journal", (req, res) => {
    try {
      const { id, text, timestamp, summary } = req.body;
      db.prepare("INSERT INTO journal_entries (id, text, timestamp, summary) VALUES (?, ?, ?, ?)").run(
        id,
        text,
        timestamp,
        summary
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/journal", (req, res) => {
    try {
      db.prepare("DELETE FROM journal_entries").run();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/create-portal-session", async (req, res) => {
    try {
      const stripe = getStripe();
      const { email } = req.body;
      
      // Find or create customer
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId = customers.data[0]?.id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({ email });
        customerId = customer.id;
      }

      const origin = req.headers.origin || process.env.APP_URL || "http://localhost:3000";
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: origin,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unlocked Features API
  app.get("/api/unlocked", (req, res) => {
    try {
      const lifetime = db.prepare("SELECT unlocked FROM unlocked_features WHERE id = 'lifetime'").get() as { unlocked: number };
      const personas = db.prepare("SELECT id FROM unlocked_personas").all() as { id: string }[];
      res.json({
        lifetime: !!lifetime?.unlocked,
        personas: personas.map(p => p.id)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-checkout", async (req, res) => {
    try {
      const stripe = getStripe();
      const { sessionId } = req.body;
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      console.log("Verifying session:", session.id, "Status:", session.payment_status);

      if (session.payment_status === 'paid') {
        const personaId = session.metadata?.personaId;
        console.log("Persona ID from metadata:", personaId);
        
        if (personaId === 'lifetime') {
          db.prepare("UPDATE unlocked_features SET unlocked = 1 WHERE id = 'lifetime'").run();
        } else if (personaId) {
          db.prepare("INSERT OR IGNORE INTO unlocked_personas (id) VALUES (?)").run(personaId);
        }
        res.json({ success: true, personaId });
      } else {
        res.json({ success: false, message: "Payment not completed" });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    // SPA fallback: serve index.html for any unknown routes
    app.get("*", (req, res) => {
      res.sendFile("index.html", { root: "dist" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
