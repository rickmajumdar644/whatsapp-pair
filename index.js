const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

async function startBot() {
    // Fresh session folder check
    const { state, saveCreds } = await useMultiFileAuthState('./dark_session');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // Real browser identity for Indian numbers
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    // AUTO REPLY LOGIC (ABCD Style Bangla)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const lowerText = text.toLowerCase();

        // Automatic Replies
        if (lowerText === 'hi' || lowerText === 'hello') {
            await sock.sendMessage(from, { text: 'Hello! Ami DARKッKILLER Bot. Mr. Rick ekhon busy ache, pore kotha bolbe.' });
        } else if (lowerText === 'ki korcho') {
            await sock.sendMessage(from, { text: 'Ami apnar hoye auto-reply dichhi! Rick bhai ekhon kaj korche.' });
        } else if (lowerText === 'status') {
            await sock.sendMessage(from, { text: 'Bot is Active 24/7 on Render!' });
        }
    });

    // PAIRING ROUTE
    app.get('/pair', async (req, res) => {
        let num = req.query.num;
        if (!num) return res.send("Please provide a number: /pair?num=91XXXXXXXXXX");
        
        try {
            await delay(2000);
            const code = await sock.requestPairingCode(num.replace(/[^0-9]/g, ''));
            res.send("<h1>YOUR PAIRING CODE: " + code + "</h1><p>Open WhatsApp > Linked Devices > Link with Phone Number and enter this code.</p>");
        } catch (err) {
            res.send("Error generating code. Please refresh and try again.");
        }
    });

    app.get('/', (req, res) => res.send("DARKッKILLER Bot is Online and Ready!"));

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') console.log("Bot Connected Successfully!");
    });
}

startBot();
app.listen(port);
