import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// --- 1. THE ENGINE ---
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
      <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e1e4e8; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="color: #666; font-size: 0.8rem;">${new Date(e.created_at).toLocaleString()}</div>
        <div style="font-size: 1.1rem; margin: 10px 0; color: #333;">${e.text}</div>
        ${e.summary ? `<div style="background: #f0f7ff; padding: 12px; border-radius: 8px; border-left: 4px solid #007bff; color: #0056b3; font-style: italic;"><strong>AI Persona:</strong> ${e.summary}</div>` : ''}
      </div>
    `).join('') || '<p style="text-align: center; color: #888;">The vault is empty.</p>';

    res.send(`
      <select name="persona">
    <option value="stoic">🏛️ The Stoic</option>
    <option value="tough-love">🥊 Tough Love</option>
    <option value="zen">🧘 Zen Master</option>
    <option value="socratic">🔍 Socratic Inquirer</option>
    <option value="shadow">🌑 Shadow Worker</option>
    <option value="offline">🌲 The Offline</option>
</select>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Database Error");
  }
});

// --- 3. THE ADD ENTRY ROUTE ---
app.post(app.post('/add-entry', async (req: Request, res: Response) => {
  const { text, persona } = req.body;
  let aiSummary = "";
  let systemPrompt = "";

  // Map the choice to the specific "Brain"
  switch(persona) {
    case 'stoic': 
      systemPrompt = "You are a Stoic Philosopher. Provide a deep, grounded reflection."; break;
    case 'tough-love': 
      systemPrompt = "You are a Tough Love Coach. Be blunt, direct, and call out excuses."; break;
    case 'zen': 
      systemPrompt = "You are a Zen Master. Respond with a peaceful, minimal koan."; break;
    case 'socratic': 
      systemPrompt = "You are a Socratic Inquirer. Respond only with a piercing question."; break;
    case 'shadow': 
      systemPrompt = "You are a Shadow Worker. Reveal the hidden psychological motive here."; break;
    case 'offline': 
      systemPrompt = "You are The Offline Guide. Encourage digital detox and physical presence."; break;
    default: 
      systemPrompt = "Summarize this journal entry.";
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
      model: "gpt-3.5-turbo",
    });
    aiSummary = completion.choices[0].message.content || "";
  } catch (e) {
    console.log("AI connection failed.");
  }

  await supabase.from('journal_entries').insert([{ text, summary: aiSummary }]);
  res.redirect('/');
});) => {
  const { text, persona } = req.body;
  let aiSummary = "";

  let systemPrompt = "You are a Stoic Philosopher. Summarize this journal entry in one deep, reflective sentence.";
  if (persona === 'cyberpunk') systemPrompt = "You are a gritty Cyberpunk hacker. Summarize this using slang and high-tech cynicism.";
  if (persona === 'zen') systemPrompt = "You are a Zen Master. Respond with a short, peaceful koan or reflection.";

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
      model: "gpt-3.5-turbo",
    });
    aiSummary = completion.choices[0].message.content || "";
  } catch (e) {
    console.log("AI connection failed.");
  }

  await supabase.from('journal_entries').insert([{ text, summary: aiSummary }]);
  res.redirect('/');
});

// --- 4. START ---
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});