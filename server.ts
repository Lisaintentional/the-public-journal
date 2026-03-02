import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Force the port to 10000 or the environment port to satisfy Render's health check
const PORT = Number(process.env.PORT) || 10000;

// Initialize Supabase only if keys exist to prevent startup crashes
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UI = (body: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Public Journal</title>
</head>
<body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; min-height:100vh;">
    <div style="background:#fff; color:#000; width:90%; max-width:400px; padding:60px 40px; text-align:center; border-radius:2px; box-shadow: 0 40px 100px rgba(0,0,0,0.8);">
        <div style="font-family:sans-serif; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#a8a29e; margin-bottom:40px;">THE PUBLIC JOURNAL</div>
        ${body}
        <div style="margin-top:50px; font-family:sans-serif; font-size:11px; color:#d6d3d1; border-top:1px solid #f5f5f4; padding-top:20px;">Intentional, Not Chaotic.</div>
    </div>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(UI(`
        <h1 style="font-family:serif; font-size:28px; font-weight:400; margin-bottom:20px;">Seek Clarity.</h1>
        <p style="color:#57534e; margin-bottom:40px;">Your private sanctuary for reflection. Please enter your email.</p>
        <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:18px; border:1px solid #e7e5e4; margin-bottom:20px; box-sizing:border-box;">
            <button type="submit" style="width:100%; padding:18px; background:#000; color:#fff; border:none; font-weight:600; text-transform:uppercase; letter-spacing:2px; cursor:pointer;">Request Access</button>
        </form>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    if (!supabase) return res.send(UI(`<h1>Setup Required</h1><p>Supabase keys are missing in Render Environment Variables.</p>`));

    try {
        const { error } = await supabase.auth.signInWithOtp({ 
            email, 
            options: { emailRedirectTo: 'https://' + req.get('host') + '/dashboard' } 
        });
        if (error) throw error;
        res.send(UI(`<h1>Link Sent</h1><p>Check <b>${email}</b>. (Rate limits may apply).</p>`));
    } catch (err: any) {
        res.send(UI(`<h1>Notice</h1><p style="color:red;">${err.message}</p><a href="/">Back</a>`));
    }
});

app.get('/dashboard', (req, res) => {
    res.send(UI(`<h1>Sanctuary.</h1><p>Welcome to your intentional space.</p><a href="/" style="color:#a8a29e; text-decoration:none; font-size:12px;">End Session</a>`));
});

// Use 0.0.0.0 to make the server accessible to Render's network
app.listen(PORT, '0.0.0.0', () => console.log("Server stable on port " + PORT));