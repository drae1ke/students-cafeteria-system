const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../model/User');
const sendEmail = require('../utils/email');

// Forgot Password - Generate and send reset token
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate reset token - this is the plain text version
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Store the hashed version in the database
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    
    // Save to database before sending email
    await user.save();
    
    // Log tokens for debugging (remove in production)
    console.log('Plain token for URL:', resetToken);
    console.log('Hashed token stored in DB:', user.passwordResetToken);

    // Create reset URL with the PLAIN TEXT token (not the hashed one)
    const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    
    // Create email content
    const message = `
      You are receiving this email because you (or someone else) requested a password reset.
      Please click on the link below to reset your password. This link is valid for 1 hour.
      
      ${resetURL}
      
      If you didn't request this, please ignore this email and your password will remain unchanged.
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You are receiving this email because you (or someone else) requested a password reset.</p>
        <p>Please click on the button below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetURL}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p><a href="${resetURL}">${resetURL}</a></p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `;

    // Send email
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message,
      html
    });

    res.status(200).json({ message: 'Reset token sent to email' });
  } catch (err) {
    console.error('Error sending reset email:', err);
    res.status(500).json({ message: 'Error sending password reset email. Please try again later.' });
  }
};

// Reset Password - Process the reset token and update password
const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    console.log('Reset token received:', token);
    
    // Hash the received token to compare with stored hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    console.log('Hashed token for DB lookup:', hashedToken);

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    console.log('Found user:', user ? 'Yes' : 'No');
    if (user) {
      console.log('Token expiry time:', new Date(user.passwordResetExpires).toISOString());
      console.log('Current time:', new Date().toISOString());
    }

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // Use same salt rounds as registration
    
    // Update user password with the hashed version
    user.password = hashedPassword;
    
    // Clear the reset token fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save();
    console.log('Password updated successfully');

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Error resetting password. Please try again.' });
  }
};

// Render reset password page
const getResetPage = (req, res) => {
  res.render('reset-password', {
    token: req.params.token
  });
};

module.exports = {
  forgotPassword,
  resetPassword,
  getResetPage
};