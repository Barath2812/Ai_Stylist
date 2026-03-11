const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    profile: {
        faceShape: String,
        skinTone: String,
        preferredColors: [String],
        favoriteOccasions: [String]
    },
    analyses: [{
        date: { type: Date, default: Date.now },
        imagePath: String,
        faceShape: String,
        skinTone: String,
        colors: [String],
        occasion: String,
        products: mongoose.Schema.Types.Mixed
    }],
    outfits: [{
        id: String,
        name: String,
        items: [String],
        totalPrice: Number,
        occasion: String,
        createdAt: { type: Date, default: Date.now }
    }],
    styleProfile: {
        physical: {
            faceShape: mongoose.Schema.Types.Mixed,
            skinTone: mongoose.Schema.Types.Mixed,
            facialSymmetry: Number,
            hair: mongoose.Schema.Types.Mixed,
            eyes: mongoose.Schema.Types.Mixed
        },
        bodyType: mongoose.Schema.Types.Mixed,
        stylePersonality: mongoose.Schema.Types.Mixed,
        colorPalette: mongoose.Schema.Types.Mixed,
        recommendations: mongoose.Schema.Types.Mixed,
        occasion: String,
        analyzedAt: Date,
        photoUrl: String
    },
    savedColors: [String],
    savedProducts: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
