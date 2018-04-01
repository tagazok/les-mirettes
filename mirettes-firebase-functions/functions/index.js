'use strict';

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

const admin = require('firebase-admin');
const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');


// Configure the email transport using the default SMTP transport and a GMail account.
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.
// const gmailEmail = functions.config().gmail.email;
// const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mirettes.vb@gmail.com',
    pass: 'GartIadrifwuDy4',
  },
});

exports.createProfile = functions.auth.user().onCreate( event => {
  return admin.database().ref(`/users/${event.data.uid}`).set({
    email: event.data.email,
    displayName: event.data.displayName,
    photoURL: event.data.photoURL,
    creationTime: event.data.metadata.creationTime
  });
});

exports.copyRequest = functions.database.ref("{users}/{userId}/requests/{requestId}").onCreate(event => {
  const snapshot = event.data;
  const val = snapshot.val();
  console.log(event.params);
  const rid = event.params.requestId;
  
  return admin.database().ref(`/requests/${rid}`).set(val);
});

exports.writeFirstLog = functions.database.ref("requests/{requestId}").onCreate(event => {
  const snapshot = event.data;
  const val = snapshot.val();
  const log = {
    date: Date(),
    user: val.member.displayName,
    message: "Requète créée"
  };
  return snapshot.ref.child('logs').push(log);
});

exports.writeLog = functions.database.ref("/requests/{requestId}/status").onUpdate(event => {
  const log = {
    date: Date(),
    user: '',
    message: `Status mis à jour: ${event.data.val()}`
  };
  return event.data.ref.parent.child('logs').push(log);
  // return snapshot.ref.child('logs').push(log);
});

// exports.updateStatus = functions.database.ref("/requests/{requestId}/status").onUpdate(event => {
//   const log = {
//     date: Date(),
//     user: '',
//     message: `Status mis à jour: ${event.data.val()}`
//   };
//   return event.data.ref.parent.child('logs').push(log);
// });

exports.setDefaultStatus = functions.database.ref("{users}/{userId}/requests/requests/{requestId}").onCreate(event => {
  const snapshot = event.data;
  const val = snapshot.val();
  console.log(snapshot);
  console.log(val);
  return snapshot.ref.child('status').set('pending');
});

exports.sendPendingEmail = functions.database.ref("{users}/{userId}/requests/{requestId}").onCreate(event => {
    const snapshot = event.data;
    const val = snapshot.val();
    console.log(snapshot);
    console.log(val);

    const mailOptions = {
      from: '"Les Mirettes" <noreply@firebase.com>',
      to: val.member.email,
    };
  
    // Building Email message.
    mailOptions.subject = 'Demande de réservation Les Mirettes';
    // mailOptions.text = 'Thanks you for subscribing to our newsletter. You will receive our next weekly newsletter.';
    mailOptions.html = `
    <p>Bonjour ${val.member.displayName}</p>
    <p>Nous avons bien reçu votre demande de réservation</p>
    <p>Récapitulatif :</p>
    <p>Du ${val.startDate} au ${val.endDate} (${val.nbNights} nuits)</p>
    <p>Pour <b>${val.nbPersons} personnes</b></p>
    <p>TOTAL : <b>${val.totalPrice} euro</b></p>
    <p></p>
    <p>A bientôt :)</p>
    `
  
    return mailTransport.sendMail(mailOptions)
      .then(() => console.log(`New subscription confirmation email sent:`))
      .catch((error) => console.error('There was an error while sending the email:', error));
})


// --------------------------------------------------------------------------------------
// Sample trigger function that copies new Firebase data to a Google Sheet


admin.initializeApp(functions.config().firebase);
const db = admin.database();

// TODO: Use firebase functions:config:set to configure your googleapi object:
// googleapi.client_id = Google API client ID,
// googleapi.client_secret = client secret, and
// googleapi.sheet_id = Google Sheet id (long string in middle of sheet URL)
const CONFIG_CLIENT_ID = functions.config().googleapi.client_id;
const CONFIG_CLIENT_SECRET = functions.config().googleapi.client_secret;
const CONFIG_SHEET_ID = functions.config().googleapi.sheet_id;

// TODO: Use firebase functions:config:set to configure your watchedpaths object:
// watchedpaths.data_path = Firebase path for data to be synced to Google Sheet
const CONFIG_DATA_PATH = functions.config().watchedpaths.data_path;

// The OAuth Callback Redirect.
// const FUNCTIONS_REDIRECT = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/oauthcallback`;
const FUNCTIONS_REDIRECT = 'https://us-central1-lesmirettesvb.cloudfunctions.net/oauthcallback';

// setup for authGoogleAPI
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/calendar'];
const functionsOauthClient = new OAuth2Client(CONFIG_CLIENT_ID, CONFIG_CLIENT_SECRET,
  FUNCTIONS_REDIRECT);

// OAuth token cached locally.
let oauthTokens = null;

// visit the URL for this Function to request tokens
exports.authgoogleapi = functions.https.onRequest((req, res) => {
  res.set('Cache-Control', 'private, max-age=0, s-maxage=0');
  res.redirect(functionsOauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  }));
});

// setup for OauthCallback
const DB_TOKEN_PATH = '/api_tokens';

// after you grant access, you will be redirected to the URL for this Function
// this Function stores the tokens to your Firebase database
exports.oauthcallback = functions.https.onRequest((req, res) => {
  res.set('Cache-Control', 'private, max-age=0, s-maxage=0');
  const code = req.query.code;
  functionsOauthClient.getToken(code, (err, tokens) => {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (err) {
      return res.status(400).send(err);
    }
    return db.ref(DB_TOKEN_PATH).set(tokens)
        .then(() => {
          return res.status(200).send('App successfully configured with new Credentials. '
            + 'You can now close this page.');
        });
  });
});

// trigger function to write to Sheet when new data comes in on CONFIG_DATA_PATH
exports.appendrecordtospreadsheet = functions.database.ref('{users}/{userId}/requests/{ITEM}').onCreate(
  (event) => {
    const newRecord = event.data.current.val();
    return appendPromise({
      spreadsheetId: CONFIG_SHEET_ID,
      range: 'A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[newRecord.member.displayName,
                newRecord.startDate,
                newRecord.endDate,
                newRecord.nbNights,
                newRecord.nbPersons,
                newRecord.totalPrice,
                newRecord.status]],
      },
    });
  }
);

// accepts an append request, returns a Promise to append it, enriching it with auth
function appendPromise(requestWithoutAuth) {
  return new Promise((resolve, reject) => {
    return getAuthorizedClient().then((client) => {
      const sheets = google.sheets('v4');
      const request = requestWithoutAuth;
      request.auth = client;
      return sheets.spreadsheets.values.append(request, (err, response) => {
        if (err) {
          console.log(`The API returned an error: ${err}`);
          return reject(err);
        }
        return resolve(response);
      });
    });
  });
}

exports.appendrecordtocalendar = functions.database.ref('{users}/{userId}/requests/{ITEM}').onCreate(
  (event) => {
    const newRecord = event.data.current.val();
    return appendPromiseCalendar(newRecord);
  }
);

function getTwoDigitsDate(number) {
  if (number >= 10) return number;
  return "0" + number;
}

// accepts an append request, returns a Promise to append it, enriching it with auth
function appendPromiseCalendar(data) {
  return new Promise((resolve, reject) => {
    return getAuthorizedClient().then((client) => {
      const calendar = google.calendar("v3");
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      console.log(`startDate : ${startDate} => ${startDate.getFullYear()}-${getTwoDigitsDate(startDate.getMonth() + 1)}-${getTwoDigitsDate(startDate.getDate())}`);
      console.log(`endDate : ${endDate} => ${endDate.getFullYear()}-${getTwoDigitsDate(endDate.getMonth() + 1)}-${getTwoDigitsDate(endDate.getDate())}`);
      var event = {
        "summary": `(en attente) ${data.member.displayName}`,
        "description": `${data.nbPersons} personnes`,
        "start": {
          "date": `${startDate.getFullYear()}-${getTwoDigitsDate(startDate.getMonth() + 1)}-${getTwoDigitsDate(startDate.getDate())}`,
          "timeZone": "Europe/Paris",
        },
        "end": {
          "date": `${endDate.getFullYear()}-${getTwoDigitsDate(endDate.getMonth() + 1)}-${getTwoDigitsDate(endDate.getDate())}`,
          "timeZone": "Europe/Paris",
        }
      };

      return calendar.events.insert({
        auth: client,
        calendarId: "primary",
        resource: event,
      }, function(err, event) {
        if (err) {
          console.log("There was an error contacting the Calendar service: " + err);
          return;
        }
        console.log("Event created: %s", event.htmlLink);
      });
    });
  });
}


// checks if oauthTokens have been loaded into memory, and if not, retrieves them
function getAuthorizedClient() {
  if (oauthTokens) {
    return Promise.resolve(functionsOauthClient);
  }
  return db.ref(DB_TOKEN_PATH).once('value').then((snapshot) => {
    oauthTokens = snapshot.val();
    functionsOauthClient.setCredentials(oauthTokens);
    return functionsOauthClient;
  });
}

// HTTPS function to write new data to CONFIG_DATA_PATH, for testing
exports.testsheetwrite = functions.https.onRequest((req, res) => {
  const random1 = Math.floor(Math.random() * 100);
  const random2 = Math.floor(Math.random() * 100);
  const random3 = Math.floor(Math.random() * 100);
  const ID = new Date().getUTCMilliseconds();
  return db.ref(`${CONFIG_DATA_PATH}/${ID}`).set({
    firstColumn: random1,
    secondColumn: random2,
    thirdColumn: random3,
  }).then(() => res.status(200).send(
    `Wrote ${random1}, ${random2}, ${random3} to DB, trigger should now update Sheet.`));
});