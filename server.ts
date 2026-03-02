import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Render must have a numeric port to pass the health check
const PORT = Number(process.env.PORT) || 10000;

// Initialize Supabase - wrapped in a check to prevent startup crashes
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STARK WHITE CARD ON BLACK - The most aggressive CSS possible to stop the "Black Screen"
const UI = (body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Public Journal</title>
</head>
<body style="margin:0; padding:0; background-color:#000000 !important; display:flex; justify-content:center; align-items:center; min-height:100vh; width:100vw;">
    <div style="display:block !important; visibility:visible !important; background-color:#ffffff !important; color:#000000 !important; width:90%; max-width:400px; padding:60px 40px; text-align:center; border-radius:2px; box-shadow: 0 40px 100px rgba(0,0,0,1); box-sizing:border-box;">
        <div style="font-family:sans-serif; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#a8a29e; margin-bottom:40px;">THE PUBLIC JOURNAL</div>
        ${body}
        <div style="margin-top:50px; font-family:sans-serif; font-size:11px; color:#d6d3d1; letter-spacing:1px; border-top:1px solid #f5f5f4; padding-top:20px;">
            Intentional, Not Chaotic.
        </div>
    </div>
</body>
</html>`;

// 1. THE LANDING PAGE - Completely static (No Supabase call here to avoid the black hang)
app.get('/', (req, res) => {
    res.send(UI(`
        <h1 style="font-family:serif; font-size:28px; font-weight:400; margin-bottom:20px; color:#000;">Seek Clarity.</h1>
        <p style="font-family:sans-serif; color:#57534e; font-size:16px; line-height:1.6; margin-bottom:40px;">Your private sanctuary for reflection. Enter your email to begin.</p>
        <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:18px; border:1px solid #e7e5e4; margin-bottom:20px; box-sizing:border-box; border-radius:0;">
            <button type="submit" style="width:100%; padding:18px; background:#000; color:#fff; border:none; font-weight:600; text-transform:uppercase; letter-spacing:2px; cursor:pointer; border-radius:0;">Request Access</button>
        </form>
    `));
});

// 2. THE LOGIN ACTION - Only talks to Supabase when button is clicked
app.post('/login', async (req, res) => {
    const { email } = req.body;
    if (!supabase) return res.send(UI(`<h1>Configuration Error</h1><p>Supabase keys are missing in Render settings.</p>`));

    try {
        const { error } = await supabase.auth.signInWithOtp({ 
            email, 
            options: { emailRedirectTo: 'https://' + req.get('host') + '/dashboard' } 
        });
        
        if (error) throw error;
        res.send(UI(`<h1>Link Dispatched.</h1><p>Check <b>${email}</b>. Use the link to enter the sanctuary.</p>`));
    } catch (err: any) {
        // This will display the "Rate Limit" error inside the WHITE CARD
        res.send(UI(`<h1>Notice</h1><p style="color:#b91c1c;">${err.message}</p><p>Please wait a while before requesting another link.</p><a href="/" style="color:#000;">Back to Home</a>`));
    }
});

app.get('/dashboard', (req, res) => {
    res.send(UI(`<h1>Welcome Home.</h1><p>Your vault is ready.</p><a href="/" style="color:#a8a29e; text-decoration:none; font-size:12px; border-bottom:1px solid #eee;">End Session</a>`));
});

app.listen(PORT, '0.0.0.0', () => console.log("Stable Server Live"));