const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const CONFIG = {
    message: process.env.WHATSAPP_MESSAGE || "Default message here...",
    delayBetweenMessages: 15000 // 15 seconds
};

// Path to files
const numbersFilePath = path.join(__dirname, 'numbers.txt');
const errorsFilePath = path.join(__dirname, 'errors.txt');

// Error logger
function logError(error) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(errorsFilePath, `[${timestamp}] ${error}\n`, 'utf8');
}

// Validate WhatsApp ID format
function validateWhatsAppID(number) {
    try {
        // Remove all non-digit characters
        let cleaned = number.replace(/\D/g, '');

        // Convert UK numbers to international format
        if (cleaned.startsWith('07') && cleaned.length === 11) {
            cleaned = `44${cleaned.slice(1)}`; // Convert 07... to 447...
        } else if (cleaned.startsWith('44')) {
            // Already in international format
        } else {
            throw new Error(`Invalid UK number format: ${number}`);
        }

        // WhatsApp requires numbers without + prefix
        return `${cleaned}@c.us`;
    } catch (error) {
        logError(error.message);
        return null;
    }
}

// Read and validate numbers
function readNumbersFromFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.split('\n')
            .map(n => n.trim())
            .filter(n => n.length > 0)
            .map(validateWhatsAppID)
            .filter(n => n !== null);
    } catch (error) {
        logError(`File read error: ${error.message}`);
        return [];
    }
}

wppconnect.create().then(client => {
    console.log('WhatsApp client initialized');

    const numbers = readNumbersFromFile(numbersFilePath);
    if (numbers.length === 0) {
        logError('No valid numbers found');
        client.close();
        return;
    }

    async function safeGetChat(phoneNumber) {
        try {
            return await client.getChatById(phoneNumber);
        } catch (error) {
            if (!error.message.includes('not found')) {
                logError(`Chat error for ${phoneNumber}: ${error.message}`);
            }
            return null;
        }
    }

    async function sendMessages() {
        for (const number of numbers) {
            try {
                console.log(`Processing ${number}`);
                const chat = await safeGetChat(number);

                if (!chat) {
                    console.log(`New chat detected, sending message to ${number}`);
                    await client.sendText(number, CONFIG.message);
                    console.log(`Message sent successfully`);
                } else if (chat.messages.length === 0) {
                    console.log(`Blank chat found, sending message to ${number}`);
                    await client.sendText(number, CONFIG.message);
                } else {
                    console.log(`Existing chat found, skipping ${number}`);
                }

                await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenMessages));
            } catch (error) {
                logError(`Failed to process ${number}: ${error.message}`);
            }
        }
        client.close();
    }

    sendMessages();
}).catch(error => {
    logError(`Initialization failed: ${error.message}`);
});
