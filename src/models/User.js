// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    default: null,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.provider;
    },
  },
  provider: {
    type: String,
    enum: ['manual', 'google', 'github'],
    default: 'manual',
  },
  providerId: String,
  image: String,
  // New field to track username changes
  hasChangedUsername: {
    type: Boolean,
    default: false,
  },
  usernameChangedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);