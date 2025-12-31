const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// FRONTEND: Website UI
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DARKッKILLER PAIRING</title>
        <style>
            body { background: #050505; color: #00d2ff; font-family: 'Arial', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .container { background: #111; padding: 40px; border-radius: 20px; text-align: center; border: 1px solid #222; width: 350px; box-shadow: 0 0 30px rgba(0,210,255,0.1); }
            h2 { letter-spacing: 2px; margin-bottom: 20px; color: #fff; }
            input { width: 100%; padding: 15px; margin-bottom: 20px; background: #1a1a1a; border: 1px solid #333; color: #fff; border-radius: 10px; text-align: center; font-size: 16px; }
            button { width: 100%; padding: 15px; background: #00d2ff; border: none; color: #000; font-weight: bold; border-radius: 10px; cursor: pointer; transition: 0.3s; }
            button:hover { background: #008cba; transform: scale(1.02); }
            #display { margin-top: 30px; font-size: 26px; font-weight: bold; color: #00ff88; letter-spacing: 5px; }
            .footer { margin-top: 20px; font-size: 11px; color: #555; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>DARKッKILLER</h2>
            <p style="color: #888; font-size: 13px;">Enter phone number with country code</p>
            <input type="number" id="phone" placeholder="e.g. 88017XXXXXXXX">
            <button onclick="fetchCode()">GENERATE PAIR CODE</button>
            <div id="display"></div>
            <div class="footer">Owner: Mr. Rick</div>
        </div>
        <script>
            async function fetchCode() {
                const num = document.getElementById('phone').value;
                const output = document.getElementById('display');
                if(!num) return alert("Enter number!");
                output.innerText = "WAIT...";
                try {
                    const response = await fetch('/get-pair?number=' + num);
                    const data = await response.json();
                    output.innerText = data.code || "ERROR";
                } catch (e) {
                    output.innerText = "FAILED";
                }
            }
        </script>
    </body>
    </html>
    `);
});

// BACKEND: Logic
app.get('/get-pair', async (req, res) => {
    let phoneNumber = req.query.number;
    const { state, saveCreds } = await useMultiFileAuthState('./auth_session');

    try {
        const client = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS("Desktop"),
        });

        if (!client.authState.creds.registered) {
            await delay(2000);
            const pairCode = await client.requestPairingCode(phoneNumber);
            if (!res.headersSent) res.json({ code: pairCode });
        }

        client.ev.on('creds.update', saveCreds);

        client.ev.on("connection.update", async (update) => {
            const { connection } = update;
            if (connection === "open") {
                await delay(5000);
                const rawCreds = fs.readFileSync('./auth_session/creds.json');
                const sessionID = Buffer.from(rawCreds).toString('base64');
                
                // Send Session ID to your own WhatsApp
                const message = "DARK-KILLER-SESSION-ID:" + sessionID;
                await client.sendMessage(client.user.id, { text: message });
                console.log("Session ID sent successfully!");
            }
        });

    } catch (err) {
        if (!res.headersSent) res.json({ error: "Service Error" });
    }
});

app.listen(port);
