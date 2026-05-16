const express = require('express');
const app = express();
const wppconnect = require('../../');
var Instancia;
var qrCodeBase64 = null; // stores the latest QR code

app.use(express.json()); //parser utizado para requisições via post,....parser used for requests via post,
app.use(express.urlencoded({ extended: true }));

app.get('/qrcode', function (req, res) {
  if (!qrCodeBase64) {
    return res.send('<h2>QR code not available yet. Wait a few seconds and refresh.</h2>');
  }
  res.send(`
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#fff;margin:0">
        <div style="text-align:center">
          <h2 style="font-family:sans-serif">Scan this QR with WhatsApp</h2>
          <img src="${qrCodeBase64}" style="width:300px;height:300px"/>
          <p style="font-family:sans-serif;color:#888">Refresh the page if it expires</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/getconnectionstatus', async function (req, res) {
  console.log('Solicitou status de conexao');
  console.log('Requested connection status');

  var mensagemretorno = ''; //mensagem de retorno da requisição ... request return message
  var sucesso = false; //Se houve sucesso na requisição ... If the request was successful
  var return_object;

  const executa = async () => {
    if (typeof Instancia === 'object') {
      // Validando se a lib está iniciada .... Validating if lib is started
      mensagemretorno = await Instancia.getConnectionState(); // validadado o estado da conexão com o whats
      //whats connection status validated
      sucesso = true;
    } else {
      mensagemretorno =
        'A instancia não foi inicializada - The instance was not initialized';
    }
    return_object = {
      status: sucesso,
      message: mensagemretorno,
    };
    res.send(return_object);
  };
  executa();
});

app.post('/sendmessage', async function (req, res) {
  console.log('Solicitou envio de mensagem VIA POST');
  console.log('Requested sending VIA POST message');

  //parametros vindos na requisição ... parameters coming in the request
  var telnumber = req.body.telnumber;
  var mensagemparaenvio = req.body.message;
  //***********/

  var mensagemretorno = ''; //mensagem de retorno da requisição ... request return message
  var sucesso = false; //Se houve sucesso na requisição ... If the request was successful
  var return_object;

  const executa = async () => {
    if (typeof Instancia === 'object') {
      // Validando se a lib está iniciada .... Validating if lib is started
      status = await Instancia.getConnectionState(); // validadado o estado da conexão com o whats
      //whats connection status validated
      if (status === 'CONNECTED') {
        let numeroexiste = await Instancia.checkNumberStatus(
          telnumber + '@c.us'
        ); //Validando se o número existe ... Validating if the number exists
        if (numeroexiste.canReceiveMessage === true) {
          await Instancia.sendText(
            numeroexiste.id._serialized,
            mensagemparaenvio
          )
            .then((result) => {
              console.log('Result: ', result); //return object success
              sucesso = true;
              mensagemretorno = result.id;
            })
            .catch((erro) => {
              console.error('Error when sending: ', erro); //return object error
            });
        } else {
          mensagemretorno =
            'O numero não está disponível ou está bloqueado - The number is not available or is blocked.';
        }
      } else {
        mensagemretorno =
          'Valide sua conexao com a internet ou QRCODE - Validate your internet connection or QRCODE';
      }
    } else {
      mensagemretorno =
        'A instancia não foi inicializada - The instance was not initialized';
    }
    return_object = {
      status: sucesso,
      message: mensagemretorno,
    };
    res.send(return_object);
  };
  executa();
});

app.post('/sendpixmessage', async function (req, res) {
  console.log('Solicitou envio de mensagem VIA POST');
  console.log('Requested sending VIA POST message');

  //parametros vindos na requisição ... parameters coming in the request
  var telnumber = req.body.telnumber;
  var params = req.body.params;
  var options = req.body.options;
  //***********/

  var mensagemretorno = ''; //mensagem de retorno da requisição ... request return message
  var sucesso = false; //Se houve sucesso na requisição ... If the request was successful
  var return_object;

  const executa = async () => {
    if (typeof Instancia === 'object') {
      // Validando se a lib está iniciada .... Validating if lib is started
      status = await Instancia.getConnectionState(); // validadado o estado da conexão com o whats
      //whats connection status validated
      if (status === 'CONNECTED') {
        let numeroexiste = await Instancia.checkNumberStatus(
          telnumber + '@c.us'
        ); //Validando se o número existe ... Validating if the number exists
        if (numeroexiste.canReceiveMessage === true) {
          await Instancia.sendPix(numeroexiste.id._serialized, params, options)
            .then((result) => {
              console.log('Result: ', result); //return object success
              sucesso = true;
              mensagemretorno = result.id;
            })
            .catch((erro) => {
              console.error('Error when sending: ', erro); //return object error
            });
        } else {
          mensagemretorno =
            'O numero não está disponível ou está bloqueado - The number is not available or is blocked.';
        }
      } else {
        mensagemretorno =
          'Valide sua conexao com a internet ou QRCODE - Validate your internet connection or QRCODE';
      }
    } else {
      mensagemretorno =
        'A instancia não foi inicializada - The instance was not initialized';
    }
    return_object = {
      status: sucesso,
      message: mensagemretorno,
    };
    res.send(return_object);
  };
  executa();
});

startWPP(); //chama a função para inicializar a lib...... call function to initialize the lib

async function startWPP() {
  await wppconnect
    .create({
      session: 'teste',
      catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
        qrCodeBase64 = base64Qr;
        console.log('QR Code updated, scan at /qrcode');
      },
      statusFind: (statusSession, session) => {
        console.log('Status Session: ', statusSession); //return isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled || disconnectedMobile || deleteToken
        //Create session wss return "serverClose" case server for close
        console.log('Session name: ', session);
      },
      headless: true, // Headless chrome
      devtools: false, // Open devtools by default
      useChrome: false, // Use Chromium (required for Linux/Render)
      debug: false, // Opens a debug session
      logQR: true, // Logs QR automatically in terminal
      browserWS: '', // If u want to use browserWSEndpoint
      browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ], // Parameters to be added into the chrome browser instance
      puppeteerOptions: {}, // Will be passed to puppeteer.launch
      disableWelcome: false, // Option to disable the welcoming message which appears in the beginning
      updatesLog: true, // Logs info updates automatically in terminal
      autoClose: 60000, // Automatically closes the wppconnect only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
      tokenStore: 'file', // Define how work with tokens, that can be a custom interface
      folderNameToken: './tokens', //folder name when saving tokens
    })
    .then((client) => {
      start(client);
    })
    .catch((erro) => console.log(erro));
}

async function start(client) {
  Instancia = client; //Será utilizado nas requisições REST ..... It will be used in REST requests

  client.onMessage(async (message) => {});
  client.onAck((ack) => {});
  client.onStateChange(async (state) => {});
}

const porta = process.env.PORT || '3000';
var server = app.listen(porta);
console.log('Servidor iniciado na porta %s', server.address().port);
