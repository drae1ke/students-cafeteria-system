const Admin = require('../model/admin');
const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

exports.login = async (req, res) => {
  try {
      const { email, password } = req.body;
      
      if (!email || !password) {
          return res.status(400).json({ 
              message: 'Email and password are required',
              field: !email ? 'email' : 'password'
          });
      }

      const admin = await Admin.findOne({ email });
      if (!admin) {
          return res.status(401).json({ 
              message: 'Invalid credentials',
              field: 'email'
          });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
          return res.status(401).json({ 
              message: 'Invalid credentials',
              field: 'password'
          });
      }

      const accessToken = jwt.sign(
          { 
              UserInfo: {
                  username: admin.email,
                  roles: Object.values(admin.roles).filter(Boolean)
              }
          }, 
          ACCESS_TOKEN_SECRET, 
          { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
          { email: admin.email },
          REFRESH_TOKEN_SECRET,
          { expiresIn: '1d' }
      );

      // Save refresh token to admin document
      admin.refreshToken = refreshToken;
      await admin.save();

      // Set refresh token as httpOnly cookie
      res.cookie('jwt', refreshToken, { 
          httpOnly: true, 
          secure: true, 
          sameSite: 'None', 
          maxAge: 24 * 60 * 60 * 1000 
      });

      // Send access token in JSON response
      res.json({ token: accessToken });
  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
          message: 'Server error during authentication' 
      });
  }
};

exports.signup = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) throw new Error('Admin already exists');

        const admin = new Admin({ email, password });
        await admin.save();

        const token = jwt.sign(
            { 
                UserInfo: {
                    username: admin.email,
                    roles: Object.values(admin.roles).filter(Boolean)
                }
            }, 
            ACCESS_TOKEN_SECRET, 
            { expiresIn: '1h' }
        );
        res.status(201).json({ token });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};