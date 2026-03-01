import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to your Supabase Project
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. HOME PAGE: Fetch entries from Supabase and show them
app.get('/', async (req: Request, res: Response) => {
  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('created_at', { ascending: false });

  const entriesHtml = entries?.map(e => `
    <li style="padding: 15px; border-bottom: 1px solid #eee; background: white; margin-bottom: 10px; border-radius: 5px;">
      ${e.text} <br> <small style="color: #888;">${new Date(e.created_at).toLocaleString()}</small>
    </li>`).join('') || '<li>No entries yet.</li>';
  
  res.send(`
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; background-color: #f0f2f5;">
        <h1 style="text-align: center;">The Public Journal (Supabase Edition)</h1>
        <form action="/add-entry" method="POST" style="display: flex; gap: 10px; margin-bottom: 30px;">
          <input type="text" name="entry" placeholder="Write something..." required style="flex-grow: 1; padding: 10px;">
          <button type="submit" style="padding: 10px; background: #333; color: white; border: none; cursor: pointer;">Post</button>
        </form>
        <ul style="list-style: none; padding: 0;">${entriesHtml}</ul>
      </body>
    </html>
  `);
});

// 2. ADD ENTRY: Save new entry to Supabase
app.post('/add-entry', async (req: Request, res: Response) => {
  const newText = req.body.entry;
  if (newText) {
    await supabase.from('journal_entries').insert([{ text: newText }]);
  }
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`ZEN MASTER: Connected to Supabase. Live on port ${PORT}`);
});

