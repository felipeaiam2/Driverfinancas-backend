const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { User, Race, Expense } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://192.168.10.106:5173'],
    credentials: true
}));
app.use(helmet());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB conectado com sucesso!'))
    .catch(err => console.error('Erro ao conectar no MongoDB:', err));

// Middleware for Auth
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Routes - Auth
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    console.log(`Register attempt for: ${email}`);
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Routes - Races
app.post('/api/races', protect, async (req, res) => {
    try {
        const race = await Race.create({ ...req.body, user: req.user._id });
        res.status(201).json(race);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/races', protect, async (req, res) => {
    try {
        const races = await Race.find({ user: req.user._id }).sort({ date: -1 });
        res.json(races);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Routes - Expenses
app.post('/api/expenses', protect, async (req, res) => {
    try {
        const expense = await Expense.create({ ...req.body, user: req.user._id });
        res.status(201).json(expense);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/expenses', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user._id }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Routes - Dashboard Stats
app.get('/api/dashboard', protect, async (req, res) => {
    try {
        const races = await Race.find({ user: req.user._id });
        const expenses = await Expense.find({ user: req.user._id });

        const totalEarnings = races.reduce((acc, item) => acc + item.earnings, 0);
        const totalExpenses = expenses.reduce((acc, item) => acc + item.amount, 0);
        const netProfit = totalEarnings - totalExpenses;
        const totalDistance = races.reduce((acc, item) => acc + item.distance, 0);

        // Group by Month (Simple implementation for MVP)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyEarnings = races
            .filter(r => new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear)
            .reduce((acc, r) => acc + r.earnings, 0);

        const monthlyExpenses = expenses
            .filter(e => new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear)
            .reduce((acc, e) => acc + e.amount, 0);

        res.json({
            totalEarnings,
            totalExpenses,
            netProfit,
            totalDistance,
            monthlyEarnings,
            monthlyExpenses
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} - accessible on all interfaces`);
});