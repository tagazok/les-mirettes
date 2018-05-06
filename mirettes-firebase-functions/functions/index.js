'use strict';

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

const admin = require('firebase-admin');
const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');

admin.initializeApp(functions.config().firebase);
const db = admin.database();

const GOOGLE_EMAIL = functions.config().google.email;
const GOOGLE_PASSWORD = functions.config().google.password;
// Configure the email transport using the default SMTP transport and a GMail account.
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.
// const gmailEmail = functions.config().gmail.email;
// const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GOOGLE_EMAIL,
    pass: GOOGLE_PASSWORD,
  },
});

const statusArray = {
  "PENDING": "En attente",
  "ACCEPTED": "Accepté",
  "PAID": "Payé",
  "REFUSED": "Refusé",
  "CANCELED": "Annulé"
};

exports.createProfile = functions.auth.user().onCreate( event => {
  return admin.database().ref(`/users/${event.data.uid}`).set({
    email: event.data.email,
    displayName: event.data.displayName,
    photoURL: event.data.photoURL,
    creationTime: event.data.metadata.creationTime
  });
});

function setStatus(snapshot, status) {
  console.log("*** setStatus ***");
  return snapshot.ref.child('status').set(status);
}

function duplicateRequest(requestId, val) {
  console.log("*** duplicateRequest ***");
  return admin.database().ref(`/requests/${requestId}`).set(val);
}

function addLog(requestId, val, message) {
  console.log("*** addLog ***");
  const log = {
    date: Date(),
    user: val.member.displayName,
    message: message
  };
  return admin.database().ref(`/requests/${requestId}/logs`).push(log);
  // return snapshot.ref.child('logs').push(log);
}

function SendEmailToAdmin(val) {
  const mailOptions = {
    from: '"Les Mirettes" <noreply@firebase.com>',
    to: "patrick.souterre@gmail.com",
  };

  mailOptions.subject = 'Demande de réservation Les Mirettes';
  mailOptions.html = `
  <p>${val.member.displayName} a fait une demande de réservation</p>
  <p></p>
  <p>Récapitulatif :</p>
  <p>Du ${val.startDate} au ${val.endDate} (${val.nbNights} nuits)</p>
  <p>Pour <b>${val.nbPersons} personnes</b></p>
  <p>TOTAL : <b>${val.totalPrice} euro</b></p>

  <p>Pour voir la liste des demandes de réservation, cliquez <a href="https://tagazok.github.io/les-mirettes/#/dashboard/requests" target="_blank">ici</a></p>
  <p></p>
  `
  return mailTransport.sendMail(mailOptions)
}

function sendEmail(val) {
  const mailOptions = {
    from: '"Les Mirettes" <noreply@firebase.com>',
    to: val.member.email,
  };

  // Building Email message.
  mailOptions.subject = 'Demande de réservation Les Mirettes';
  mailOptions.html = `
  <p>Bonjour ${val.member.displayName},</p>
  <p>Votre demande de réservation a bien été reçue et est en attente de confirmation.</p>
  <p>Récapitulatif :</p>
  <p>Du ${val.startDate} au ${val.endDate} (${val.nbNights} nuits)</p>
  <p>Pour <b>${val.nbPersons} personnes</b></p>
  <p>TOTAL : <b>${val.totalPrice} euro</b></p>
  <p>Vous pouvez accéder à la liste de vos demandes de réservation en cliquant <a href="https://tagazok.github.io/les-mirettes/#/dashboard/my-requests" target="_blank">ici</a></p>
  <p></p>
  <p>A bientôt :)</p>
  `

  return mailTransport.sendMail(mailOptions)
    .then(() => console.log(`New subscription confirmation email sent`))
    .catch((error) => console.error('There was an error while sending the email:', error));
}

function addToSheet(val) {
  const data = {
    spreadsheetId: CONFIG_SHEET_ID,
    range: 'A:G',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[val.member.displayName,
              val.startDate,
              val.endDate,
              val.nbNights,
              val.nbPersons,
              val.totalPrice,
              val.status]],
    }
  };
  return new Promise((resolve, reject) => {
    return getAuthorizedClient().then((client) => {
      const sheets = google.sheets('v4');
      const request = data;
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

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addToCalendar(val) {
  console.log("*** addToCalendar ***");
  return new Promise((resolve, reject) => {
    return getAuthorizedClient().then((client) => {
      const calendar = google.calendar("v3");
      const startDate = new Date(val.startDate);
      const endDate = addDays(new Date(val.endDate), 1);
      console.log(`${val.startDate} - startDate : ${startDate} => ${startDate.getFullYear()}-${getTwoDigitsDate(startDate.getMonth() + 1)}-${getTwoDigitsDate(startDate.getDate())}`);
      console.log(`${val.endDate} - endDate : ${endDate} => ${endDate.getFullYear()}-${getTwoDigitsDate(endDate.getMonth() + 1)}-${getTwoDigitsDate(endDate.getDate())}`);
      var event = {
        "summary": `(en attente) ${val.member.displayName}`,
        "description": `${val.nbPersons} personnes - ${val.member.displayName}`,
        "start": {
          "date": `${val.startDate}`,
          "timeZone": "Europe/Paris",
        },
        "end": {
          "date": `${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDate.getDate()}`,
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
          return reject(err);
        }
        console.log(`event.data: ${JSON.stringify(event.data)}`);
        return resolve(event.data);
        // console.log("Event created: %s", event.htmlLink);
      });
    });
  });
}

function getTwoDigitsDate(number) {
  if (number >= 10) return number;
  return "0" + number;
}


// When new request is created
/*
New request scenario :
  1/ Set default status
  2/ Add to calendar
  3/ Add log
  4/ Duplicate request
  5/ Send email
  6/ Send email to admin (TODO)
  7/ Add to sheet
*/
exports.newRequest = functions.database.ref("{users}/{userId}/requests/{requestId}").onCreate(event => {
  const snapshot = event.data;
  const val = snapshot.val();
  const status = "PENDING";
  val.status = status;
  const requestId = event.params.requestId;

  return setStatus(snapshot, status)
  .then(() => {
    console.log("*** setStatus DONE ***");
    return addToCalendar(val);
  })
  .then(cal => {
    console.log("*** addToCalendar DONE ***");
    console.log(`calEvent: ${JSON.stringify(cal)}`);
    val.event = cal || "";
    return snapshot.ref.child('event').set(val.event);
  })
  .then(() => {
    console.log("*** setEvent DONE ***");
    return duplicateRequest(requestId, val);
  })
  .then(() => {
    console.log("*** duplicateRequest DONE ***");
    return addLog(requestId, val, "Requête créée");
  })
  .then(() => {
    console.log("*** addLog DONE ***");
    return sendEmail(val)
  })
  .then(() => {
    console.log("*** sendEmail DONE ***");
    return addToSheet(val)
  })
  .then(() => {
    console.log("*** addToSheet DONE ***");
    SendEmailToAdmin(val);
  })
  .then(() => {
    console.log("*** sendEmailToAdmin DONE ***");
  });
});

// When status changes
/*
Status change scenario
  - Duplicate new status
  - Write log
  - Update calendar
  - Send email notification
  - Update sheet (?)
*/

exports.deleteRequest = functions.database.ref("/requests/{requestId}").onDelete(event => {
  const snapshot = event.data;
  const val = snapshot.val();

  const requestId = event.params.requestId;
  const request = event.data.previous.val();
  console.log("Old request : ");
  console.log(request);
  
  return admin.database().ref(`/users/${request.member.uid}/requests/${requestId}`).remove()
  .then(() => {
    return removeEventInCalendar(request.event.id);
  });
});

// Status changes : Add log
exports.writeLog = functions.database.ref("/requests/{requestId}/status").onUpdate(event => {
  console.log("### status update triggered");
  const snapshot = event.data;
  const val = snapshot.val();
  const requestId = event.params.requestId;

  
  return event.data.ref.parent.once('value')
    .then(request => {
      return Promise.all([
        request,
        duplicateStatus(request.val(), requestId, val)
      ]);
    })
    .then(data => {
      console.log("*** Duplicate status DONE ***");
      let request = data[0];
      return Promise.all([
        request,
        updateStatusLog(request, val)
      ]);
    })
    .then(data => {
      console.log("*** Update Status DONE ***");
      let request = data[0];
      return Promise.all([
        request,
        sendEmailStatusChanged(request.val(), val)
      ]);
    })
    .then(data => {
      console.log("*** Send email DONE ***");
      let request = data[0];
      if (val === "REFUSED" || val === "CANCELED") {
        return Promise.all([
          request,
          removeEventInCalendar(request.val().event.id)
        ]);
      } else {
        return Promise.all([
          request,
          updateCalendar(val, request.val().event)
        ]);
      }
    }).then((data) => {
      console.log("*** Update calendar DONE ***");
      console.log(data[0]);
    });
});

function updateStatusLog(request, status) {
  const log = {
    date: Date(),
    user: '',
    message: `Status mis à jour: ${statusArray[status]}`
  };
  return request.ref.child('logs').push(log);
}

function duplicateStatus(request, requestId, status) {
  return admin.database().ref(`/users/${request.member.uid}/requests/${requestId}/status`).set(status);
}

function removeEventInCalendar(eventId) {
  console.log("Remove event id : " + eventId);
  return new Promise((resolve, reject) => {
    return getAuthorizedClient().then((client) => {
      const calendar = google.calendar("v3");

      return calendar.events.delete({
        auth: client,
        calendarId: "primary",
        eventId: eventId
      }, function(err, event) {
        if (err) {
          console.log("There wan an error deleting the event : " + err);
          return reject(err);
        }
        console.log(event);
        return resolve();
      });
    });
  });
}

function updateCalendar(val, evt) {
    return new Promise((resolve, reject) => {
    return getAuthorizedClient().then((client) => {
      const calendar = google.calendar("v3");
      const user = evt.description.split('-')[1];

      return calendar.events.patch({
        auth: client,
        calendarId: "primary",
        eventId: evt.id,
        resource: {
          summary: `(${statusArray[val]})${user}`
        }
      }, function(err, event) {
        if (err) {
          console.log("Error updating event" + err);
          return reject(err);
        }
        console.log("Event updated");
        return resolve(event.data);
      });
    });
  });
}

function getEmailTemplate(request, status) {
  let tpl = `
    <p>Bonjour ${request.member.displayName}</p>
  `;

  switch (status) {
    case 'REFUSED':
      tpl += `
        <p>Votre demande de réservation a été refusée.</p>
        <p>Veuillez contacter Patrick pour plus d'informations.</p>
      `
    break;
    case 'PAID':
      tpl += `
      <p>Nous avons bien reçu votre paiement. Votre réservation est confirmée.</p>
      <p>Récapitulatif :</p>
      <p>Du ${request.startDate} au ${request.endDate} (${request.nbNights} nuits)</p>
      <p>Pour <b>${request.nbPersons} personnes</b></p>
      <p>TOTAL : <b>${request.totalPrice} euro</b></p>
      <p></p>
      <p>Bonnes vacances :)</p>
      `
    break;
    case 'ACCEPTED':
      tpl += `
      <p>Votre réservation a été acceptée et est en attente de paiement.</p>
      <div>
      IBAN : FR76 1870 7000 8008 0195 0725 393 <br />
      BIC : CCBPFRPPVER
      </div>
      <p>Récapitulatif :</p>
      <p>Du ${request.startDate} au ${request.endDate} (${request.nbNights} nuits)</p>
      <p>Pour <b>${request.nbPersons} personnes</b></p>
      <p>TOTAL : <b>${request.totalPrice} euro</b></p>
      `
    break;
    case 'CANCELED':
      tpl += `
        <p>Votre demande de réservation a été annulée.</p>
      `
    break;
  }

  tpl += `
    <p>Vous pouvez accéder à la liste de vos demandes de réservation en cliquant <a href="https://tagazok.github.io/les-mirettes/#/dashboard/my-requests">ici</a></p>
    <p></p>
    <p>A bientôt</p>
  `;

  return tpl
}

function sendEmailStatusChanged(request, status) {
  console.log("*** sendEmail Status changed***");
  console.log(status);
  const mailOptions = {
    from:'"Les Mirettes" <noreply@firebase.com>',
    to: request.member.email,
  };

  // Building Email message.
  mailOptions.subject = 'Demande de réservation Les Mirettes';
  mailOptions.html = getEmailTemplate(request, status);

  return mailTransport.sendMail(mailOptions);
    // .then(() => console.log(`New subscription confirmation email sent`))
    // .catch((error) => console.error('There was an error while sending the email:', error));
}

// Status changes : Update status on /{users}/{userId}/requests/{requestId}
// exports.updateStatus = functions.database.ref("/requests/{requestId}/status").onUpdate(event => {
//   const log = {
//     date: Date(),
//     user: '',
//     message: `Status mis à jour: ${event.data.val()}`
//   };
//   return event.data.ref.parent.child('member').once('value').then((snapshot) => {
//     console.log(`status changes user id : ${snapshot.val().uid}`);
//     const userId = snapshot.val().uid;
//     return admin.database().ref(`/users/${userId}/requests/${event.params.requestId}/status`).set(event.data.val());
//   });
// });

// // Status changes : Update calendar
// exports.updateStatus = functions.database.ref("/requests/{requestId}/status").onUpdate(event => {
  
//   return new Promise((resolve, reject) => {
//     return getAuthorizedClient().then((client) => {
//       const calendar = google.calendar("v3");

//       return calendar.events.update({
//         auth: client,
//         calendarId: "primary",
//         eventId: ""
//       }, function(err, event) {
//         if (err) {
//           console.log("Error updating event" + err);
//           return
//         }
//         console.log("Event updated");
//       })

//       return calendar.events.insert({
//         auth: client,
//         calendarId: "primary",
//         resource: event,
//       }, function(err, event) {
//         if (err) {
//           console.log("There was an error contacting the Calendar service: " + err);
//           return;
//         }
//         console.log("Event created: %s", event.htmlLink);
//       });
//     });
//   });
// });


// --------------------------------------------------------------------------------------
// Sample trigger function that copies new Firebase data to a Google Sheet



// TODO: Use firebase functions:config:set to configure your googleapi object:
// googleapi.client_id = Google API client ID,
// googleapi.client_secret = client secret, and
// googleapi.sheet_id = Google Sheet id (long string in middle of sheet URL)
const CONFIG_CLIENT_ID = functions.config().googleapi.client_id;
const CONFIG_CLIENT_SECRET = functions.config().googleapi.client_secret;
const CONFIG_SHEET_ID = functions.config().googleapi.sheet_id;

// TODO: Use firebase functions:config:set to configure your watchedpaths object:
// watchedpaths.data_path = Firebase path for data to be synced to Google Sheet
// const CONFIG_DATA_PATH = functions.config().watchedpaths.data_path;

// The OAuth Callback Redirect.
const FUNCTIONS_REDIRECT = 'https://us-central1-lesmirettesvb.cloudfunctions.net/oauthcallback';

// setup for authGoogleAPI
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/calendar'];
const functionsOauthClient = new OAuth2Client(CONFIG_CLIENT_ID, CONFIG_CLIENT_SECRET,
  FUNCTIONS_REDIRECT);

// OAuth token cached locally.
let oauthTokens = null;

// visit the URL for this Function to request tokens
// exports.authgoogleapi = functions.https.onRequest((req, res) => {
//   res.set('Cache-Control', 'private, max-age=0, s-maxage=0');
//   res.redirect(functionsOauthClient.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES,
//     prompt: 'consent',
//   }));
// });

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
// exports.testsheetwrite = functions.https.onRequest((req, res) => {
//   const random1 = Math.floor(Math.random() * 100);
//   const random2 = Math.floor(Math.random() * 100);
//   const random3 = Math.floor(Math.random() * 100);
//   const ID = new Date().getUTCMilliseconds();
//   return db.ref(`${CONFIG_DATA_PATH}/${ID}`).set({
//     firstColumn: random1,
//     secondColumn: random2,
//     thirdColumn: random3,
//   }).then(() => res.status(200).send(
//     `Wrote ${random1}, ${random2}, ${random3} to DB, trigger should now update Sheet.`));
// });