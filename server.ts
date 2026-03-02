import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. THE SHARED STYLES (Vault Entrance) ---
const UI_SHELL = (content: string, userEmail?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        :root {
            --bg: #030508;
            --glass: rgba(15, 23, 42, 0.8);
            --border: rgba(34, 211, 238, 0.2);
            --accent: #22d3ee;
            --accent-glow: rgba(34, 211, 238, 0.3);
            --text-main: #ffffff;
            --text-dim: #64748b;
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: var(--bg);
            background-image: 
                radial-gradient(circle at 50% 0%, #164e63 0%, transparent 50%),
                radial-gradient(circle at 0% 100%, #0c4a6e 0%, transparent 50%);
            background-attachment: fixed;
            color: var(--text-main);
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .vault-container { width: 100%; max-width: 400px; padding: 20px; text-align: center; }
        .protocol-nav {
            position: absolute; top: 0; width: 100%; padding: 20px;
            display: flex; justify-content: space-between;
            font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; color: var(--text-dim);
        }
        .hero-card {
            background: var(--glass);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 32px;
            padding: 40px 24px;
            margin-bottom: 30px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            text-align: left;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            aspect-ratio: 0.85 / 1;
        }
        .badge {
            background: rgba(34, 211, 238, 0.15);
            color: var(--accent);
            font-size: 0.6rem; font-weight: 900;
            padding: 6px 14px; border-radius: 100px;
            display: inline-block; margin-bottom: 15px;
            letter-spacing: 0.1em; border: 1px solid var(--border);
        }
        h1 { font-size: 3rem; margin: 0; line-height: 0.95; font-weight: 800; }
        .subtext { color: var(--text-dim); font-size: 1rem; line-height: 1.6; margin: 25px 0; }
        input[type="email"] {
            width: 100%; padding: 18px; background: rgba(0,0,0,0.5);
            border: 1px solid var(--border); border-radius: 16px;
            color: white; font-size: 1.1rem; margin-bottom: 16px; outline: none;
        }
        input:focus { border-color: var(--accent); box-shadow: 0 0 15px var(--accent-glow); }
        .btn-access {
            width: 100%; padding: 18px; background: white; color: black;
            border: none; border-radius: 16px; font-weight: 800;
            font-size: 1rem; cursor: pointer; transition: 0.3s;
        }
        .btn-access:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.1); }
    </style>
</head>
<body>
    <div class="protocol-nav">
        <span>&#8592;</span>
        <span>SECURITY PROTOCOL</span>
        <span></span>
    </div>
    <div class="vault-container">
        ${content}
    </div>
</body>
</html>
`;

// --- 2. MAIN ROUTE ---
app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        return res.send(UI_SHELL(`
            <div class="hero-card">
                <div class="badge">ENCRYPTED ENVIRONMENT</div>
                <h1>The<br>Privacy<br>Vault</h1>
            </div>
            <p class="subtext">Your healing journey is yours alone. Enter your credentials to initiate the protocol.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email Address" required>
                <button class="btn-access">Request Access</button>
            </form>
            <div style="margin-top: 30px; color: var(--text-dim); font-size: 0.6rem; letter-spacing: 0.1em;">
                SCROLL TO VERIFY<br>&#8964;
            </div>
        `));
    }

    // After Login: Dashboard content
    res.send(UI_SHELL(`
        <div class="hero-card" style="aspect-ratio: auto; min-height: 150px; justify-content: center;">
            <div class="badge">SESSION ACTIVE</div>
            <h1 style="font-size: 1.5rem;">Access Granted.</h1>
            <p style="font-size: 0.8rem; color: var(--accent);">Vault: Secure</p>
        </div>
        `, user.email));
});

// --- 3. AUTH & SERVER START ---
app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://' + req.get('host') } });
    res.send(UI_SHELL(`
        <div class="hero-card" style="aspect-ratio: auto; min-height: 200px; justify-content: center;">
            <div class="badge">DISPATCHED</div>
            <h1 style="font-size: 1.8rem;">Check Email.</h1>
        </div>
        <p class="subtext">A secure link has been sent to your terminal. Verify to continue.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Vault Protocol active on " + PORT));