import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- THE BRANDED UI: High-Contrast Sanctuary ---
const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
            background: #000000; /* Absolute black for zero distraction */
            color: #1c1917;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
            overflow: hidden;
        }
        .card {
            background: #ffffff; 
            padding: 60px 45px; 
            border-radius: 2px; /* Sharp, deliberate edges */
            width: 90%; max-width: 420px; 
            text-align: center;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
            animation: emerge 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes emerge {
            from { opacity: 0; transform: scale(0.98) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .brand-logo {
            font-size: 0.65rem;
            letter-spacing: 0.4em;
            text-transform: uppercase;
            color: #d6d3d1;
            margin-bottom: 50px;
            font-weight: 600;
        }
        h1 { 
            font-family: "Georgia", serif; /* Elegant serif for the "Journal" feel */
            font-size: 2.2rem; 
            font-weight: 400; 
            margin: 0 0 24px 0; 
            color: #000; 
            letter-spacing: -0.01em; 
        }
        p { color: #57534e; margin-bottom: 40px; line-height: 1.8; font-size: 1.05rem; font-weight: 300; }
        .input-group { margin-bottom: 20px; text-align: left; }
        input {
            width: 100%; padding: 18px; 
            border: 1px solid #e7e5e4;
            background: #fff; color: #000; font-size: 1rem;
            outline: none; transition: all 0.2s;
            border-radius: 0; /* Removing rounded corners for intention */
        }
        input:focus { border-color: #000; background: #fafaf9; }
        button {
            width: 100%; padding: 20px; background: #000; color: #fff;
            border: none; font-weight: 600; cursor: pointer;
            letter-spacing: 0.1em; text-transform: uppercase; font-size: 0.8rem;
            transition: background 0.3s;
        }
        button:hover { background: #262626; }
        .brand-footer {
            margin-top: 60px; font-size: 0.7rem; color: #a8a29e;
            letter-spacing: 0.1em;
            border-top: 1px solid #f5f5f4;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="brand-logo">The Public Journal</div>
        ${content}
        <div class="brand-footer">Intentional, Not Chaotic.</div>
    </div>
</body>
</html>
`;

app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return res.send(UI_SHELL(`
            <h1>Begin Reflection.</h1>
            <p>A minimalist sanctuary for clarity. Step away from the chaos.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Enter your email" required>
                <div style="height: 15px;"></div>
                <button type="submit">Unlock Vault</button>
            </form>
        `));
    }

    res.send(UI_SHELL(`
        <h1>Access Granted.</h1>
        <p>Your sanctuary is ready for your thoughts.</p>
        <div style="margin-top: 20px;">
            <a href="/logout" style="color: #a8a29e; text-decoration: none; font-size: 0.75rem; border-bottom: 1px solid #e7e5e4; padding-bottom: 2px;">End Session</a>
        </div>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    const { error } = await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: 'https://' + req.get('host') } 
    });

    if (error) return res.send(UI_SHELL(`<h1>Notice</h1><p>${error.message}</p>`));

    res.send(UI_SHELL(`
        <h1>Handshake Initiated.</h1>
        <p>A magic link has been dispatched to <b>${email}</b>. Use it to enter the vault.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Intentional Sanctuary live on " + PORT));