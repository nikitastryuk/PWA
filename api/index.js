const express = require('express');
const app = express();
const cors = require('cors');
const admin = require('firebase-admin');
const webpush = require('web-push');
const serviceAccount = require("./pwa-adminsdk.json");
const bodyParser = require('body-parser');

const port = 3000;

app.use(cors());
app.use(bodyParser.json({
    limit: '100mb'
}));

(() => {
    app.listen(port);
    console.log(`App started on port ${port}`);
})();

var firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pwa-test-3d0de.firebaseio.com"
});

app.post('/storePost', (request, response) => {
    admin.database().ref('posts').push({
        id: request.body.id,
        title: request.body.title,
        location: request.body.location,
        image: request.body.image
    })
        .then(function () {
            webpush.setVapidDetails('mailto:nikitastryuk@gmail.com', 'BK4TPpskF6UQs7HfYPnEsLyaI3bb8j6isH2QUj69BjzzwVs_F9EcKwpYFMtgM3WhNN9YzXBcL1PCBaCNVnGNYx8', 'BUQq7l6sR783EenYC-90-tqILoGVmvxWnJuAOOQEPC0');
            return admin.database().ref('subscriptions').once('value');
        }).
        then(function (subscriptions) {
            subscriptions.forEach(function (sub) {
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
})