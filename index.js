const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DARKッKILLER PAIRING</title>
        <style>
            body { background: #000; color: #00d2ff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .container { background: #0a0a0a; padding: 40px; border-radius: 15px; text-align: center; border: 1px solid #1a1a1a; width: 340px; box-shadow: 0 10px 30px rgba(0,210,255,0.1); }
            h2 { color: #fff; margin-bottom: 25px; letter-spacing: 1px; }
            input { width: 100%; padding: 15px; margin-bottom: 20px; background: #111; border: 1px solid #333; color: #fff; border-radius: 8px; text-align: center; font-size: 16px; outline: none; }
            button { width: 100%; padding: 15px; background: #00d2ff; border: none; color: #000; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 14px; }
            #display { margin-top: 25px; font-size: 28px; font-weight: bold; color: #00ff88; letter-spacing: 4px; }
            .footer { margin-top: 20px; font-size: 10px; color: #444; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>DARKッKILLER</h2>
            <p style="color: #666; font-size: 12px; margin-bottom: 15px;">Input Number with Country Code (e.g., 91XXXXXXXXXX)</p>
            <input type="number" id="phone" placeholder="91XXXXXXXXXX">
            <button onclick="fetchCode()">GET PAIRING CODE</button>
            <div id="display"></div>
            <div class="footer">Created by Mr. Rick</div>
        </div>
        <script>
            async function fetchCode() {
                const num = document.getElementById('phone').value;
                const output = document.getElementById('display');
                if(!num) return alert("Please enter your mobile number!");
                output.innerText = "WAITING...";
                try {
                    const response = await fetch('/get-pair?number=' + num);
                    const data = await response.json();
                    output.innerText = data.code || "RETRY";
                } catch (e) {
                    output.innerText = "ERROR";
                }
            }
        </script>
    </body>
    </html>
    `);
});

app.get('/get-pair', async (req, res) => {
    let phoneNumber = req.query.number.replace(/[^0-9]/g, '');
    const { state, saveCreds } = await useMultiFileAuthState('./auth_session');

    try {
        const client = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["Chrome (Linux)", "Google Chrome", "110.0.5481.177"],
        });

        if (!client.authState.creds.registered) {
            await delay(3000);
            const pairCode = await client.requestPairingCode(phoneNumber);
            if (!res.headersSent) res.json({ code: pairCode });
        }

        client.ev.on('creds.update', saveCreds);

        client.ev.on("connection.update", async (update) => {
            const { connection } = update;
            if (connection === "open") {
                await delay(7000);
                const rawCreds = fs.readFileSync('./auth_session/creds.json');
                const sessionID = Buffer.from(rawCreds).toString('base64');
                
                const sessionMsg = "DARK-KILLER-SESSION-ID:" + sessionID;
                await client.sendMessage(client.user.id, { text: sessionMsg });
                console.log("Session ID sent to your WhatsApp number.");
            }
        });

    } catch (err) {
        if (!res.headersSent) res.json({ error: "Try Again Later" });
    }
});

app.listen(port);
