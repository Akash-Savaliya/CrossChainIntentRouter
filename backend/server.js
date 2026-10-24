const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB successfully!"))
    .catch((err) => console.error("MongoDB connection error:", err));

    const intentSchema = new mongoose.Schema({
        user: String,
        sourceChainId: String,
        destinationChainId: String,
        inputToken: String,
        inputAmount: String,
        outputToken: String,
        outputAmount: String,
        recipient: String,
        nonce: String,
        deadline: Number,
        signature: String,
        intentIdHash: String,
        status: { type: String, default: "pending" }
    });

const Intent = mongoose.model('Intent', intentSchema);

app.get('/', (req, res) => {
    res.json({ message: "Cross-Chain Intent Protocol Backend is running & secure!" });
});

app.post('/api/intents', async (req, res) => {
    try {
        const { user, sourceChainId, destinationChainId, inputToken, inputAmount, outputToken, outputAmount, recipient, nonce, deadline, signature } = req.body;

        const domain = {
            name: 'IntentRegistry',
            version: '1',
            chainId: BigInt(sourceChainId),
            verifyingContract: process.env.INTENT_REGISTRY_ADDRESS
        };
        
        const types = {
            Intent: [
                { name: 'user', type: 'address' },
                { name: 'inputToken', type: 'address' },
                { name: 'inputAmount', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'outputToken', type: 'address' },
                { name: 'outputAmount', type: 'uint256' },
                { name: 'destinationChainId', type: 'uint256' },
                { name: 'recipient', type: 'address' }
            ]
        };
        const value = {
            user,
            inputToken,
            inputAmount,
            deadline,
            nonce,
            outputToken,
            outputAmount,
            destinationChainId,
            recipient
        };

        let recoveredAddress;
        try {
            recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
        } catch (error) {
            return res.status(400).json({ success: false, message: 'Invalid cryptographic signature!' });
        }

        if (recoveredAddress.toLowerCase() !== user.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Invalid cryptographic signature!' });
        }

        const intentHash = ethers.keccak256(ethers.toUtf8Bytes(nonce + user + recipient));

        const newIntent = new Intent({
            ...req.body,
            intentIdHash: intentHash
        });

        await newIntent.save();

        console.log('Verified & Saved New Intent:', newIntent._id);
        res.status(201).json({ success: true, message: 'Intent verified and stored successfully!', intentId: newIntent._id, intentIdHash: intentHash });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/intents', async (req, res) => {
    try {
        const intents = await Intent.find({ status: "pending" });
        res.json({ success: true, intents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch('/api/intents/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedIntent = await Intent.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedIntent) {
            return res.status(404).json({ success: false, message: "Intent not found!" });
        }

        console.log(`Intent ${req.params.id} status updated to: ${status}`);
        res.json({ success: true, message: "Intent status updated successfully!", updatedIntent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});