
const session = require('express-session');
const flash = require('connect-flash');

const flashMiddleware = (app) => {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  // Flash middleware
  app.use(flash());

  // Make flash messages available to all views
  app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
  });
};

module.exports = flashMiddleware;