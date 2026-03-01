import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DASHBOARD ROUTE ---
app.get('/', async (req: Request, res: Response) => {
  // 1. Check if user is logged in (Supabase looks for a session)
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return res.send(`
      <body style="font-family:sans-serif; background:#0f172a; color:white; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
        <div style="background:#1e293b; padding:40px; border-radius:15px; border:1px solid #334155; width:350px;">
          <h1 style="text-align:center;">The Public Journal</h1>
          <p style="text-align:center; color:#94a3b8;">Sign in to access your private vault.</p>
          <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Your email" required style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; background:#0f172a; color:white; border:1px solid #334155;">
            <button style="width:100%; padding:12px; background:#3b82f6; border:none; color:white; border-radius:8px; font-weight:bold; cursor:pointer;">Send Magic Link</button>
          </form>
        </div>
      </body>
    `);
  }

  // 2. Fetch User Data (Notes + Pro Status)
  const { data: entries } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  
  const isPro = profile?.is_pro || req.query.success === 'true';

  const listItems = entries?.map((e: any) => `
    <div style="background:#1e293b; padding:20px; border-radius:12px; border:1px solid #334155; margin-bottom:15px;">
      <div style="color:#94a3b8; font-size:0.75rem;">${new Date(e.created_at).toLocaleString()}</div>
      <div style="margin:10px 0; color:#f8fafc;">${e.text}</div>
      ${e.summary ? `<div style="background:#0f172a; padding:12px; border-radius:8px; border-left:4px solid #3b82f6; color:#38bdf8;"><strong>AI:</strong> ${e.summary}</div>` : ''}
    </div>`).join('') || '<p style="text-align:center; color:#64748b;">Your vault is empty.</p>';

  res.send(`
    <!DOCTYPE html>
    <html style="scroll-behavior:smooth;">
    <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:20px; margin:0;">
      <div style="max-width:600px; margin:0 auto; padding-top:20px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:30px;">
            <small style="color:#94a3b8;">${user.email}</small>
            <a href="/logout" style="color:#ef4444; text-decoration:none; font-size:0.8rem;">Logout</a>
        </div>

        ${!isPro ? `
        <div style="background:rgba(16, 185, 129, 0.1); border:1px solid #10b981; padding:20px; border-radius:15px; margin-bottom:30px;">
            <h4 style="margin:0 0 10px 0; color:#10b981;">Unlock Pro Personas</h4>
            <button onclick="buy('lifetime')" style="width:100%; padding:10px; background:#10b981; border:none; color:white; border-radius:8px; cursor:pointer; font-weight:bold;">Get Lifetime Access ($49.99)</button>
        </div>` : '<div style="text-align:center; color:#10b981; margin-bottom:20px;">✨ Pro Member</div>'}

        <div style="background:#1e293b; padding:25px; border-radius:15px; border:1px solid #334155; margin-bottom:30px;">
            <form action="/add-entry" method="POST">
                <textarea name="text" placeholder="What's on your mind?" required style="width:100%; height:100px; padding:12px; border-radius:8px; background:#0f172a; color:white; border:1px solid #334155; box-sizing:border-box;"></textarea>
                <select name="persona" style="width:100%; padding:12px; border-radius:8px; background:#0f172a; color:white; border:1px solid #334155; margin:15px 0;">
                    <option value="stoic">🏛️ Stoic (Free)</option>
                    <option value="tough-love" ${!isPro ? 'disabled' : ''}>🥊 Tough Love ${!isPro ? '🔒' : ''}</option>
                    <option value="zen" ${!isPro ? 'disabled' : ''}>🧘 Zen ${!isPro ? '🔒' : ''}</option>
                    <option value="shadow" ${!isPro ? 'disabled' : ''}>🌑 Shadow ${!isPro ? '🔒' : ''}</option>
                </select>
                <button type="submit" style="width:100%; padding:14px; background:#3b82f6; border:none; color:white; border-radius:8px; cursor:pointer; font-weight:bold;">Secure Entry</button>
            <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  // This script detects the login from the email link and refreshes the page
  const supabase = supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
  
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      // Once signed in via the link, refresh to show the vault!
      window.location.href = '/';
    }
  });
</script>
  `);
});

// --- ROUTES ---
app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://' + req.get('host') } });
    res.send("<body style='background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding-top:100px;'><h2>Check your email! ✉️</h2><p>Click the link in your inbox to sign in.</p></body>");
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.post('/add-entry', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { text, persona } = req.body;
    if (!session) return res.redirect('/');

    let prompt = "Summarize this.";
    if (persona === 'stoic') prompt = "You are a Stoic Philosopher. Deep summary.";
    if (persona === 'tough-love') prompt = "You are a Tough Love Coach. Be blunt.";
    
    const aiRes = await openai.chat.completions.create({
        messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
        model: "gpt-3.5-turbo",
    });

    await supabase.from('journal_entries').insert([{ 
        text, 
        summary: aiRes.choices[0].message.content, 
        user_id: session.user.id 
    }]);
    res.redirect('/');
});

app.post('/add-entry', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { text, persona } = req.body;
    
    if (!session) return res.redirect('/');

    // 1. Define the variable OUTSIDE the try block so it's visible everywhere
    let aiSummary = "";

    let prompt = "Summarize this.";
    if (persona === 'stoic') prompt = "You are a Stoic Philosopher. Deep summary.";
    if (persona === 'tough-love') prompt = "You are a Tough Love Coach. Be blunt.";
    if (persona === 'zen') prompt = "You are a Zen Master. Short koan.";
    if (persona === 'socratic') prompt = "You are a Socratic Inquirer. Ask a question.";
    if (persona === 'shadow') prompt = "You are a Shadow Worker. Reveal motives.";
    if (persona === 'offline') prompt = "You are Offline. Focus on now.";

    try {
        const aiRes = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
            model: "gpt-3.5-turbo",
        });
        // 2. Assign the result to our variable
        aiSummary = aiRes.choices[0].message.content || "";
    } catch (err) { 
        console.log("AI failed, saving text only."); 
    }

    // 3. Now the database save can see aiSummary perfectly!
    await supabase.from('journal_entries').insert([{ 
        text, 
        summary: aiSummary, 
        user_id: session.user.id 
    }]);

    res.redirect('/');
});
    res.redirect('/');
});
app.listen(PORT, () => console.log("Vault Live with Auth"));