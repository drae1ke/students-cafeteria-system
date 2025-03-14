const Admin = require('../model/admin');
const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET } = process.env;

exports.login = async (req, res) => {
  try {
      const { email, password } = req.body;
      
      if (!email || !password) {
          return res.status(400).json({ message: 'Email and password are required' });
      }

      const admin = await Admin.findOne({ email });
      if (!admin) {
          return res.status(401).json({ message: 'Invalid credentials' });

      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
          return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: admin._id }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.json({ token });
  } catch (error) {
      res.status(500).json({ message: 'Server error during authentication' });
  }
};

exports.signup = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) throw new Error('Admin already exists');

        const admin = new Admin({ email, password });
        await admin.save();

        const token = jwt.sign({ id: admin._id }, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};