require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const verifyJWT = require('./middleware/verifyJWT');
const cookieParser = require('cookie-parser');
const credentials = require('./middleware/credentials');
const flashMiddleware = require('./middleware/flash');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const PORT = process.env.PORT || 3500;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
connectDB();

// custom middleware logger
app.use(logger);
flashMiddleware(app);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json 
app.use(express.json());

//middleware for cookies
app.use(cookieParser());

//serve static files
app.use('/', express.static(path.join(__dirname, '/public')));

// routes that don't need protection
app.use('/', require('./routes/root'));
app.use('/register', require('./routes/register'));
app.use('/auth', require('./routes/auth'));
app.use('/refresh', require('./routes/refresh'));
app.use('/logout', require('./routes/logout'));
app.use('/admin', require('./routes/admin'));



// Password reset routes (adding this line)
app.use('/', require('./routes/password'));

// Apply verifyJWT middleware BEFORE protected routes
app.use(verifyJWT);

// Protected routes that need authentication
app.use('/profile', require('./routes/profile'));
app.use('/employees', require('./routes/api/employees'));
app.use('/users', require('./routes/api/users'));
app.use('/mpesa', require('./routes/mpesa'));
app.use('/orders', require('./routes/api/orders'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/', require('./routes/api/menuroute'))


app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.render('404');
    } else if (req.accepts('json')) {
        res.json({ "error": "404 Not Found" });
    } else {
        res.type('txt').send("404 Not Found");
    }
});

app.use(errorHandler);

mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});