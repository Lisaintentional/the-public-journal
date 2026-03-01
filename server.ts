import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. INITIALIZATION ---
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. THE DASHBOARD ---
app.get('/', async (req: Request, res: Response) => {
  try {
    const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });

    const listItems = entries?.map((e: any) => `
      <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e1e4e8;">
        <div style="color: #888; font-size: 0.8rem;">${new Date(e.created_at).toLocaleString()}</div>
        <div style="font-size: 1.1rem; margin: 10px 0;">${e.text}</div>
        ${e.summary ? `<div style="background: #f0f7ff; padding: 12px; border-radius: 8px; border-left: 4px solid #007bff; color: #0056b3; font-style: italic;"><strong>AI Persona:</strong> ${e.summary}</div>` : ''}
      </div>
    `).join('') || '<p>The vault is empty.</p>';

    res.send(`
     res.send(`
  <!DOCTYPE html>
  <html>
  <head>
      <title>The Public Journal | Lifetime Access</title>
      <style>
          body { font-family: -apple-system, sans-serif; background: #0f172a; padding: 40px 20px; color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; }
          .badge { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; display: inline-block; }
          .card { background: #1e293b; padding: 25px; border-radius: 15px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); margin-bottom: 30px; }
          textarea { width: 100%; height: 120px; padding: 15px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; margin-bottom: 15px; box-sizing: border-box; }
          select { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; margin-bottom: 20px; }
          .btn-primary { background: #3b82f6; color: white; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; transition: 0.2s; }
          .btn-outline { background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 10px; border-radius: 8px; cursor: pointer; width: 100%; margin-bottom: 20px; }
          .entry { background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #334155; }
          .ai-box { background: #0f172a; padding: 12px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 15px; color: #38bdf8; font-style: italic; }
      </style>
  </head>
  <body>
      <div class="container">
          <div style="text-align: center; margin-bottom: 40px;">
              <span class="badge">Verified System</span>
              <h1 style="margin: 0; font-size: 2rem;">Lifetime Access Vault</h1>
              <p style="color: #94a3b8;">Your private reflections, AI-enhanced.</p>
          </div>

          <button class="btn-outline" onclick="checkout()">💳 Manage Lifetime Subscription</button>

          <div class="card">
              <form action="/add-entry" method="POST">
                  <label style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Current Thought Stream:</label>
                  <textarea name="text" placeholder="Type your reflection..." required></textarea>
                  
                  <label style="display: block; margin-bottom: 8px; font-size: 0.9rem;">Apply AI Persona:</label>
                  <select name="persona">
                      <option value="stoic">🏛️ The Stoic</option>
                      <option value="tough-love">🥊 Tough Love</option>
                      <option value="zen">🧘 Zen Master</option>
                      <option value="socratic">🔍 Socratic Inquirer</option>
                      <option value="shadow">🌑 Shadow Worker</option>
                      <option value="offline">🌲 The Offline</option>
                  </select>
                  
                  <button type="submit" class="btn-primary">Secure Entry & Process</button>
              </form>
          </div>

          <div id="entries">${listItems}</div>
      </div>

      <script>
          async function checkout() {
              const res = await fetch('/api/create-checkout-session', { method: 'POST' });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
          }
      </script>
  </body>
  </html>
`);
    res.status(500).send("Server Error");
  }
});

// --- 3. THE ADD ENTRY ROUTE ---
app.post('/add-entry', async (req: Request, res: Response) => {
  const { text, persona } = req.body;
  let aiSummary = "";
  let systemPrompt = "You are a thoughtful assistant.";

  if (persona === 'stoic') systemPrompt = "You are a Stoic Philosopher. Provide a deep reflection.";
  if (persona === 'tough-love') systemPrompt = "You are a Tough Love Coach. Be blunt and direct.";
  if (persona === 'zen') systemPrompt = "You are a Zen Master. Respond with a short koan.";
  if (persona === 'socratic') systemPrompt = "You are a Socratic Inquirer. Respond with a piercing question.";
  if (persona === 'shadow') systemPrompt = "You are a Shadow Worker. Reveal hidden psychological motives.";
  if (persona === 'offline') systemPrompt = "You are The Offline Guide. Encourage digital detox.";

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
      model: "gpt-3.5-turbo",
    });
    aiSummary = completion.choices[0].message.content || "";
  } catch (e) {
    console.log("AI Failed");
  }

  await supabase.from('journal_entries').insert([{ text, summary: aiSummary }]);
  res.redirect('/');
});

// --- 4. START ---
app.listen(PORT, () => {
 app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'The Public Journal: Lifetime Access' },
          unit_amount: 9900, // $99.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: req.headers.origin + '/?success=true',
      cancel_url: req.headers.origin + '/?canceled=true',
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});