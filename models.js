const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

const raceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  app: { type: String, required: true }, // Uber, 99, etc.
  earnings: { type: Number, required: true },
  distance: { type: Number, required: true }, // km
  duration: { type: Number, required: true }, // minutes
  createdAt: { type: Date, default: Date.now }
});

const Race = mongoose.model('Race', raceSchema);

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true }, // Fuel, Maintenance, Tax, Other
  amount: { type: Number, required: true },
  description: { type: String },
  proofUrl: { type: String }, // For future file upload
  createdAt: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = { User, Race, Expense };
