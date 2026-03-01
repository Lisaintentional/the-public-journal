import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// --- 1. THE ENGINE (Initialization) ---
const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_ANON_KEY || ''
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2023-10-16' as any 
});

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. THE DASHBOARD ---
app.get('/', async (req: Request, res: Response) => {
  try {
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });

    const listItems = entries?.map((e: any) => `
      <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e1e4e8;">
        <div style="color: #666; font-size: 0.8rem;">${new Date(e.created_at).toLocaleString()}</div>
        <div style="font-size: 1.1rem; margin: 10px 0;">${e.text}</div>
        ${e.summary ? `<div style="background: #f0f7ff; padding: 10px; border-radius: 8px; border-left: 4px solid #007bff; color: #0056b3;"><strong>AI Persona:</strong> ${e.summary}</div>` : ''}
      </div>
    `).join('') || '<p>No entries yet.</p>';

    res.send(`
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #f8f9fa;">
          <h1>Journal Vault</h1>
          <form action="/add-entry" method="POST" style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <textarea name="text" style="width: 100%; height: 100px; margin-bottom: 10px;" placeholder="Write here..." required></textarea>
            <select name="persona" style="width: 100%; padding: 10px; margin-bottom: 10px;">
              <option value="stoic">Stoic Philosopher</option>
              <option value="cyberpunk">Cyberpunk Rebel</option>
              <option value="zen">Zen Master</option>
            </select>
            <button type="submit" style="width: 100%; padding: 10px; background: #1a1a1a; color: white; border: none; border-radius: 8px; cursor: pointer;">Secure Entry</button>
          </form>
          <div id="list">${listItems}</div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Database Error");
  }
});

// --- 3. THE ADD ENTRY ROUTE ---
app.post('/add-entry', async (req: Request, res: Response) => {
  const { text, persona } = req.body;
  let aiSummary = "";

  let systemPrompt = "You are a Stoic Philosopher. Summarize this deeply.";
  if (persona === 'cyberpunk') systemPrompt = "You are a gritty Cyberpunk hacker. Use tech slang.";
  if (persona === 'zen') systemPrompt = "You are a Zen Master. Respond with a short koan.";

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
      model: "gpt-3.5-turbo",
    });
    aiSummary = completion.choices[0].message.content || "";
  } catch (e) {
    console.log("AI failed");
  }

  await supabase.from('journal_entries').insert([{ text, summary: aiSummary }]);
  res.redirect('/');
});

app.listen(PORT, () => console.log(\`Server Live on \${PORT}\`));