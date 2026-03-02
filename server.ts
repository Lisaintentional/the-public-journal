import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UI = (body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>The Public Journal</title>
</head>
<body style="margin:0; background-color:#000 !important; display:flex; justify-content:center; align-items:center; min-height:100vh; width:100vw;">
    <div style="background-color:#fff !important; color:#000 !important; width:90%; max-width:400px; padding:60px 40px; text-align:center; border-radius:2px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); display:block !important;">
        <div style="font-family:sans-serif; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#a8a29e; margin-bottom:40px;">THE PUBLIC JOURNAL</div>
        ${body}
        <div style="margin-top:50px; font-family:sans-serif; font-size:11px; color:#d6d3d1; letter-spacing:1px; border-top:1px solid #f5f5f4; padding-top:20px;">Intentional, Not Chaotic.</div>
    </div>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(UI(`
        <h1 style="font-family:serif; font-size:28px; font-weight:400; margin-bottom:20px;">Seek Clarity.</h1>
        <p style="color:#57534e; margin-bottom:40px;">Email limits reached. Please wait 1 hour or use the bypass below to view the design.</p>
        <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:18px; border:1px solid #e7e5e4; margin-bottom:20px; box-sizing:border-box;">
            <button type="submit" style="width:100%; padding:18px; background:#000; color:#fff; border:none; font-weight:600; text-transform:uppercase; letter-spacing:2px; cursor:pointer;">Request Access</button>
        </form>
        <div style="margin-top:20px;">
            <a href="/dashboard" style="color:#a8a29e; font-size:12px; text-decoration:none; border-bottom:1px solid #eee;">Bypass to Preview Design →</a>
        </div>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase.auth.signInWithOtp({ 
            email, 
            options: { emailRedirectTo: 'https://' + req.get('host') + '/dashboard' } 
        });
        if (error) throw error;
        res.send(UI(`<h1>Check Email</h1><p>Link dispatched to ${email}</p>`));
    } catch (err: any) {
        // This will now display the "Rate Limit" error inside the white card
        res.send(UI(`<h1>Notice</h1><p style="color:red;">${err.message}</p><p>Supabase limits free accounts to 3 emails per hour. Try again shortly.</p><a href="/">Back</a>`));
    }
});

app.get('/dashboard', (req, res) => {
    res.send(UI(`
        <h1>Sanctuary.</h1>
        <p>This is your intentional space. This card is visible because the "Circuit Breaker" is working.</p>
        <a href="/" style="color:#a8a29e; text-decoration:none; font-size:12px;">Back to Entrance</a>
    `));
});

app.listen(PORT, '0.0.0.0', () => console.log("Bypass Mode Active"));