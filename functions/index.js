var functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({ origin: true });
var webpush = require('web-push');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
var admin = require("firebase-admin");

var serviceAccount = require("./pwa-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pwa-test-3d0de.firebaseio.com"
});

exports.storePostData = functions.https.onRequest(function (request, response) {
    cors(request, response, function () {
        admin.database().ref('posts').push({
            id: request.body.id,
            title: request.body.title,
            location: request.body.location,
            image: request.body.image
        })
            .then(function () {
                webpush.setVapidDetails('mailto:nikitastryuk@gmail.com', 'BKzlZdhQpRvmupWySitnCzCVm1CcPqDEaoIQAYne-g0AGCTx_721j4MQQBbPfaxYzJLEB5H29IyQgO-1x09aqis', 'e8MhMAvdbna-npg4QLAaFWNNSSp-PbUDcSpOeAqi_9k');
                return admin.database.ref('sbuscriptions').once('value');
            }).
            then(function (sbuscriptions) {
                sbuscriptions.forEach(function (sub) {
                    //sub - endpoint and keys
                    var pushConfig = {
                        endpoint: sub.val().endpoint,
                        keys: {
                            auth: sub.val().keys.auth,
                            p256dh: sub.val().keys.p256dh
                        }
                    }
                    webpush.sendNotification(pushConfig, JSON.stringify(
                        {
                            title: 'New Post',
                            content: 'New post added!',
                            openUrl: '/help'
                        }))
                        .catch(function (err) {
                            console.log(err);
                        })
                });
                response.status(201).json({ message: 'Data stored', id: request.body.id });
            })
            .catch(function (err) {
                console.log(err);
                response.status(500).json({ error: err });
            });
    });
});