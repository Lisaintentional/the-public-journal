import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- THE BRANDED UI: Inline-Style Injection ---
const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Public Journal</title>
</head>
<body style="margin:0; padding:0; background-color:#000000; display:flex; justify-content:center; align-items:center; min-height:100vh; font-family:sans-serif;">
    
    <div style="display:block !important; background-color:#ffffff !important; color:#000000 !important; width:90%; max-width:400px; padding:60px 40px; text-align:center; border-radius:2px; box-shadow: 0 40px 100px rgba(0,0,0,0.5); box-sizing:border-box;">
        
        <div style="font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#a8a29e; margin-bottom:40px;">The Public Journal</div>
        
        ${content}
        
        <div style="margin-top:50px; font-size:11px; color:#d6d3d1; letter-spacing:1px; border-top:1px solid #f5f5f4; padding-top:20px;">
            Intentional, Not Chaotic.
        </div>
    </div>
</body>
</html>
`;

app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return res.send(UI_SHELL(`
            <h1 style="font-family:serif; font-size:28px; font-weight:400; margin-bottom:20px; color:#000000;">Seek Clarity.</h1>
            <p style="color:#57534e; font-size:16px; line-height:1.6; margin-bottom:40px;">Your private space for reflection. Enter your email to begin.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:18px; border:1px solid #e7e5e4; background:#ffffff; color:#000000; font-size:16px; margin-bottom:20px; box-sizing:border-box;">
                <button type="submit" style="width:100%; padding:18px; background:#000000; color:#ffffff; border:none; font-weight:600; text-transform:uppercase; letter-spacing:2px; cursor:pointer;">Unlock Vault</button>
            </form>
        `));
    }

    res.send(UI_SHELL(`
        <h1 style="font-family:serif; font-size:28px; font-weight:400; margin-bottom:20px; color:#000000;">Access Granted.</h1>
        <p style="color:#57534e; font-size:16px; line-height:1.6; margin-bottom:40px;">Your sanctuary is ready.</p>
        <a href="/logout" style="color:#a8a29e; text-decoration:none; font-size:12px; border-bottom:1px solid #e7e5e4;">End Session</a>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: 'https://' + req.get('host') } 
    });

    res.send(UI_SHELL(`
        <h1 style="font-family:serif; font-size:28px; font-weight:400; margin-bottom:20px; color:#000000;">Check Email.</h1>
        <p style="color:#57534e; font-size:16px; line-height:1.6; margin-bottom:40px;">A secure link has been sent to <b>${email}</b>.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Vault Protocol active on " + PORT));