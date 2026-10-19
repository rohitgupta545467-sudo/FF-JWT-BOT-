const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const tls = require('tls');
const express = require('express');

// --- Yahan apna NAYA Token daal ---
const BOT_TOKEN = "YAHAN_NAYA_TOKEN_DAAL";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const API_KEY = "2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3";
const HOST = "100067.connect.garena.com";
const PATH = "/api/v2/oauth/guest/token:grant";

// Signature banane ka function
function sign(payload) {
    const hmac = crypto.createHmac('sha256', API_KEY)
                        .update(payload)
                        .digest('base64');
    return hmac + "\n" + payload;
}

// Raw TLS Request (Kyunki Node normal header mein \n allow nahi karta)
function rawPost(headers, body) {
    return new Promise((resolve, reject) => {
        const options = {
            host: HOST,
            port: 443,
            rejectUnauthorized: false // Certificate ignore karna
        };

        const socket = tls.connect(options, () => {
            let req = `POST ${PATH} HTTP/1.1\r\n`;
            for (const [key, value] of Object.entries(headers)) {
                req += `${key}: ${value}\r\n`;
            }
            req += `Content-Length: ${Buffer.byteLength(body)}\r\n`;
            req += `Connection: close\r\n\r\n`;
            req += body;
            
            socket.write(req);
        });

        let responseData = '';
        socket.on('data', (chunk) => {
            responseData += chunk.toString('utf8');
        });

        socket.on('end', () => {
            const parts = responseData.split('\r\n\r\n');
            resolve(parts[1] || ''); // Response body return karo
        });

        socket.on('error', (err) => {
            reject(err);
        });
    });
}

// Bot Commands
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Bhai, apna UID aur Password bhej: `UID:Password` format mein.\nExample: `123456789:Aa1!Bc2@`", { parse_mode: "Markdown" });
});

bot.on('message', async (msg) => {
    if (msg.text === '/start') return;
    
    const text = msg.text.split(":");
    if (text.length !== 2) {
        bot.sendMessage(msg.chat.id, "❌ Format galat hai. Aise bhej: `UID:Password`", { parse_mode: "Markdown" });
        return;
    }

    const uid = text[0].trim();
    const pwd = text[1].trim();

    bot.sendMessage(msg.chat.id, `⏳ Token nikal raha hoon UID: ${uid} ke liye...`);

    try {
        const did = `02-${crypto.randomUUID()}`;
        const bodyObj = {
            "client_id": 100067,
            "client_secret": API_KEY,
            "client_type": 2,
            "device_id": did,
            "password": pwd,
            "response_type": "token",
            "uid": uid
        };
        
        const bodyStr = JSON.stringify(bodyObj);
        const headers = {
            "User-Agent": "GarenaMSDK/4.0.44(25028RN03A ;Android 15;hi;IN;app 1.132.1 2019121229;)",
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Signature ${sign(bodyStr)}`,
            "Host": HOST
        };

        const resp = await rawPost(headers, bodyStr);

        if (resp.includes("access_token")) {
            const data = JSON.parse(resp);
            const jwt_token = data.data.access_token;
            const open_id = data.data.open_id;

            const reply = `✅ **JWT Token Mil Gaya!**\n\n👤 UID: \`${uid}\`\n🆔 Open ID: \`${open_id}\`\n\n🔑 **Access Token (JWT):**\n\`${jwt_token}\``;
            bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
        } else {
            bot.sendMessage(msg.chat.id, `❌ Error aaya:\n\`${resp}\``, { parse_mode: "Markdown" });
        }
    } catch (err) {
        bot.sendMessage(msg.chat.id, `❌ System Error: ${err.message}`);
    }
});

// --- Dummy Web Server (Render ke liye zaroori hai) ---
const app = express();
app.get('/', (req, res) => {
    res.send("FF JWT Bot is Alive!");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

console.log("Bot chalu ho gaya...");
