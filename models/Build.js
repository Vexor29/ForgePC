const mongoose = require('mongoose');

const BuildSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    buildName: {
        type: String,
        required: true,
        default: 'My Custom Build'
    },
    buildData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Build', BuildSchema);
