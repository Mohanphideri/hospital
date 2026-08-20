import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRE = process.env.ACCESS_TOKEN_EXPIRE || '15m';

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
      mustResetPassword: user.mustResetPassword,
      
      
      
      department: user.department,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRE }
  );
};

export const generateToken = generateAccessToken;
