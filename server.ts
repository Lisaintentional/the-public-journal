import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Supabase with a check
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Public Journal</title>
</head>
<body style="margin:0; background-color:#000; display:flex; justify-content:center; align-items:center; min-height:100vh; font-family:sans-serif;">
    <div style="background:#fff; color:#000; width:90%; max-width:400px; padding:60px 40px; text-align:center; border-radius:2px; box-shadow: 0 40px 100px rgba(0,0,0,0.5);">
        <div style="font-size:10px; letter-spacing:4px; color:#a8a29e; margin-bottom:40px;">THE PUBLIC JOURNAL</div>
        ${content}
        <div style="margin-top:50px; font-size:11px; color:#d6d3d1; border-top:1px solid #f5f5f4; padding-top:20px;">Intentional, Not Chaotic.</div>
    </div>
</body>
</html>
`;

app.get('/', async (req, res) => {
    try {
        // Add a timeout so the page doesn't stay black forever
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
        
        const sessionPromise = supabase.auth.getSession();
        const response: any = await Promise.race([sessionPromise, timeout]).catch(() => ({ data: { session: null } }));

        const session = response?.data?.session;

        if (!session) {
            return res.send(UI_SHELL(`
                <h1 style="font-family:serif; font-size:28px; margin-bottom:20px;">Seek Clarity.</h1>
                <p style="color:#57534e; margin-bottom:40px;">Your private sanctuary. Enter your email to begin.</p>
                <form action="/login" method="POST">
                    <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:18px; border:1px solid #e7e5e4; margin-bottom:20px;">
                    <button type="submit" style="width:100%; padding:18px; background:#000; color:#fff; border:none; font-weight:600; cursor:pointer;">Unlock Vault</button>
                </form>
            `));
        }

        res.send(UI_SHELL(`<h1>Access Granted.</h1><p>Your sanctuary is ready.</p><a href="/logout">End Session</a>`));
    } catch (e) {
        // If everything fails, still show the login card instead of a black screen
        res.send(UI_SHELL(`<h1>System Recovery</h1><p>Connection delayed. Please refresh the page.</p>`));
    }
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase.auth.signInWithOtp({ 
            email, 
            options: { emailRedirectTo: 'https://' + req.get('host') } 
        });
        
        if (error) throw error;

        res.send(UI_SHELL(`<h1>Dispatched.</h1><p>A magic link has been sent to <b>${email}</b>.</p>`));
    } catch (error: any) {
        res.send(UI_SHELL(`<h1>Error</h1><p>${error.message || 'Failed to send email. Check your Supabase keys.'}</p>`));
    }
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Vault Recovery Mode Active"));