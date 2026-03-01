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
      <!DOCTYPE html>
      <html>
      <head>
          <title>The Public Journal | Vault</title>
          <style>
              body { font-family: sans-serif; background: #f8f9fa; padding: 40px 20px; color: #333; }
              .container { max-width: 600px; margin: 0 auto; }
              textarea { width: 100%; height: 100px; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 10px; box-sizing: border-box; }
              select { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; background: white; }
              button { background: #1a1a1a; color: white; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1 style="text-align: center;">Journal Vault</h1>
              <form action="/add-entry" method="POST" style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 40px;">
                  <textarea name="text" placeholder="What's on your mind?" required></textarea>
                  <label style="display: block; margin-bottom: 8px; font-weight: bold;">Select Persona:</label>
                  <select name="persona">
                      <option value="stoic">🏛️ The Stoic</option>
                      <option value="tough-love">🥊 Tough Love</option>
                      <option value="zen">🧘 Zen Master</option>
                      <option value="socratic">🔍 Socratic Inquirer</option>
                      <option value="shadow">🌑 Shadow Worker</option>
                      <option value="offline">🌲 The Offline</option>
                  </select>
                  <button type="submit">Secure Entry & Analyze</button>
              </form>
              <div id="entries">${listItems}</div>
          </div>
      </body>
      </html>
    `);
  } catch (err) {
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
  console.log("Server running on port " + PORT);
});