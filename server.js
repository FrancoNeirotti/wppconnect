const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let sock = null;
let qrCodeBase64 = null;
let connectionStatus = 'disconnected';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./tokens');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['WPPConnect', 'Chrome', '1.0.0'],
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeBase64 = await qrcode.toDataURL(qr);
      console.log('QR Code updated - scan at /qrcode');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

      console.log('Connection closed. Reconnecting:', shouldReconnect);
      connectionStatus = 'disconnected';

      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log('Logged out. Delete tokens folder and restart to re-link.');
      }
    } else if (connection === 'open') {
      console.log('Connected to WhatsApp!');
      connectionStatus = 'CONNECTED';
      qrCodeBase64 = null;
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();

// QR Code page - scan this from your phone
app.get('/qrcode', (req, res) => {
  if (connectionStatus === 'CONNECTED') {
    return res.send(`
      <html><body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#fff;margin:0">
        <div style="text-align:center;font-family:sans-serif">
          <h2 style="color:green">✅ WhatsApp Connected!</h2>
          <p>Your session is active.</p>
        </div>
      </body></html>
    `);
  }

  if (!qrCodeBase64) {
    return res.send(`
      <html><head><meta http-equiv="refresh" content="3"></head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#fff;margin:0">
        <div style="text-align:center;font-family:sans-serif">
          <h2>Generating QR Code...</h2>
          <p>This page will refresh automatically.</p>
        </div>
      </body></html>
    `);
  }

  res.send(`
    <html>
      <head><meta http-equiv="refresh" content="20"></head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#fff;margin:0">
        <div style="text-align:center;font-family:sans-serif">
          <h2>Scan this QR with WhatsApp</h2>
          <img src="${qrCodeBase64}" style="width:300px;height:300px"/>
          <p style="color:#888">Page refreshes automatically every 20s</p>
        </div>
      </body>
    </html>
  `);
});

// GET /getconnectionstatus
app.get('/getconnectionstatus', (req, res) => {
  res.json({
    status: connectionStatus === 'CONNECTED',
    message: connectionStatus,
  });
});

// POST /sendmessage  body: { telnumber, message }
app.post('/sendmessage', async (req, res) => {
  const { telnumber, message } = req.body;

  if (!sock || connectionStatus !== 'CONNECTED') {
    return res.json({ status: false, message: 'WhatsApp not connected' });
  }

  try {
    const jid = telnumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text: message });
    res.json({ status: true, message: 'Message sent successfully' });
  } catch (err) {
    res.json({ status: false, message: err.message });
  }
});

const port = process.env.PORT || 3000;
const server = app.listen(port);
console.log('Server started on port', server.address().port);
