const fs = require('fs');
const path = require('path');

const REQUIRED_ENV = [
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'DATABASE_URI',
    'SESSION_SECRET'
];

const OPTIONAL_GROUPS = {
    'M-Pesa STK push': [
        'MPESA_CONSUMER_KEY',
        'MPESA_CONSUMER_SECRET',
        'MPESA_SHORTCODE',
        'MPESA_PASSKEY'
    ],
    'Cloudinary menu image uploads': [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET'
    ],
    'Email password reset': [
        'EMAIL_USER',
        'EMAIL_PASS',
        'EMAIL_HOST',
        'EMAIL_PORT'
    ]
};

const getDuplicateEnvKeys = () => {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return [];

    const seen = new Set();
    const duplicates = new Set();

    fs.readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .forEach((line) => {
            const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
            if (!match) return;

            const key = match[1];
            if (seen.has(key)) duplicates.add(key);
            seen.add(key);
        });

    return [...duplicates];
};

const validateEnv = () => {
    const missingRequired = REQUIRED_ENV.filter((key) => !process.env[key]);
    if (missingRequired.length) {
        throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
    }

    Object.entries(OPTIONAL_GROUPS).forEach(([feature, keys]) => {
        const missing = keys.filter((key) => !process.env[key]);
        if (missing.length && missing.length !== keys.length) {
            console.warn(`${feature} is partially configured. Missing: ${missing.join(', ')}`);
        }
    });

    const duplicateKeys = getDuplicateEnvKeys();
    if (duplicateKeys.length) {
        console.warn(`Duplicate keys found in .env; the last value usually wins: ${duplicateKeys.join(', ')}`);
    }

    const callbackUrl = process.env.MPESA_CALLBACK_URL || process.env.CALLBACK_URL;
    if (callbackUrl && /localhost|127\.0\.0\.1/.test(callbackUrl)) {
        console.warn('M-Pesa callbacks require a public HTTPS URL. Localhost callback URLs will not work with Safaricom.');
    }
};

module.exports = {
    validateEnv
};
