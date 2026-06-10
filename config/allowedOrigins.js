const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const port = process.env.PORT || 3500;

const allowedOrigins = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    'http://localhost:3500',
    'http://localhost:3501',
    'http://127.0.0.1:3500',
    'http://127.0.0.1:3501',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://studentscafe.onrender.com',
    ...configuredOrigins
];

module.exports = [...new Set(allowedOrigins)];
