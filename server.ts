import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Render requires the port to be a number. 
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_ANON_KEY || ''
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UI = (body: string) => `
<!DOCTYPE html>
<html>
<body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;">
    <div style="background:#fff; color:#000; width:90%; max-width:400px; padding:50px; text-align:center; border-radius:2px;">
        <div style="font-family:sans-serif; font-size:10px; letter-spacing:3px; color:#888; margin-bottom:30px;">THE PUBLIC JOURNAL</div>
        ${body}
        <div style="margin-top:40px; font-family:sans-serif; font-size:10px; color:#ccc;">Intentional, Not Chaotic.</div>
    </div>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(UI(`
        <h1 style="font-family:serif; font-size:24px;">Seek Clarity.</h1>
        <p style="font-family:sans-serif; color:#666;">Enter your email to test the connection.</p>
        <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required style="width:100%; padding:10px; margin-bottom:10px;">
            <button type="submit" style="width:100%; padding:10px; background:#000; color:#fff; border:none; cursor:pointer;">Send Link</button>
        </form>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase.auth.signInWithOtp({ 
            email, 
            options: { emailRedirectTo: 'https://' + req.get('host') } 
        });
        if (error) throw error;
        res.send(UI(`<h1>Check Email</h1><p>Sent to ${email}</p>`));
    } catch (err: any) {
        res.send(UI(`<h1>Error</h1><p>${err.message}</p>`));
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server started on ${PORT}`));