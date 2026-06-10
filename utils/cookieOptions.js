const isProduction = process.env.NODE_ENV === 'production';

const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 24 * 60 * 60 * 1000
};

const clearRefreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax'
};

module.exports = {
    clearRefreshCookieOptions,
    refreshCookieOptions
};
