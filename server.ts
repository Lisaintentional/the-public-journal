import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STARK WHITE CARD ON BLACK - ULTIMATE SIMPLICITY
const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Public Journal</title>
</head>
<body style="margin:0; background-color:#000; display:flex; justify-content:center; align-items:center; height:100vh; width:100vw; overflow:hidden;">
    <div style="background-color:#fff; color:#000; width:90%; max-width:400px; padding:60px 40px; text-align:center; border-radius:2px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); box-sizing:border-box;">
        <div style="font-family:sans-serif; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#a8a29e; margin-bottom:40px;">THE PUBLIC JOURNAL</div>
        ${content}
        <div style="margin-top:50px; font-family:sans-serif; font-size:11px; color:#d6d3d1; letter-spacing:1px; border-top:1px solid #f5f5f4; padding-top:20px;">
            Intentional, Not Chaotic.
        </div>
    </div>
</body>
</html>
`;

// 1. THE LANDING PAGE - Only shows Login
app.get('/', (req, res) => {
    res.send(UI_SHELL(`
        <h1 style="font-family:serif; font-size:28px; font-weight:400; margin-bottom:20px;">Seek Clarity.</h1>
        <p style="font-family:sans-serif; color:#57534e; font-size:16px; line-height:1.6; margin-bottom:40px;">Enter your email to receive an access link.</p>
        <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:18px; border:1px solid #e7e5e4; margin-bottom:20px; box-sizing:border-box;">
            <button type="submit" style="width:100%; padding:18px; background:#000; color:#fff; border:none; font-weight:600; text-transform:uppercase; letter-spacing:2px; cursor:pointer;">Get Access Link</button>
        </form>
    `));
});

// 2. THE LOGIN ACTION
app.post('/login', async (req, res) => {
    const { email } = req.body;
    try {
        const host = req.get('host');
        // We redirect them to /dashboard after they click the email link
        const { error } = await supabase.auth.signInWithOtp({ 
            email, 
            options: { emailRedirectTo: 'https://' + host + '/dashboard' } 
        });
        
        if (error) throw error;
        res.send(UI_SHELL(`<h1>Link Sent.</h1><p>Check <b>${email}</b>. Use the link to enter the sanctuary.</p>`));
    } catch (err: any) {
        res.send(UI_SHELL(`<h1>Notice</h1><p>${err.message}</p>`));
    }
});

// 3. THE DASHBOARD - Only visible after email click
app.get('/dashboard', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return res.redirect('/');
    res.send(UI_SHELL(`<h1>Welcome.</h1><p>You are now inside the sanctuary.</p><a href="/logout" style="color:#a8a29e; text-decoration:none; font-size:12px; border-bottom:1px solid #e7e5e4;">End Session</a>`));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Circuit Breaker Live"));