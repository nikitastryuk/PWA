const express = require('express');
const app = express();
const cors = require('cors');
const admin = require('firebase-admin');
const webpush = require('web-push');
const serviceAccount = require("./pwa-adminsdk.json");
const bodyParser = require('body-parser');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pwa-test-3d0de.firebaseio.com",
  storageBucket: "pwa-test-3d0de.appspot.com"
});

var bucket = admin.storage().bucket();

const port = 3000;

app.use(cors());
app.use(bodyParser.json({
  limit: '100mb'
}));

(() => {
  app.listen(port);
  console.log(`App started on port ${port}`);
})();



app.post('/storePost', (request, response) => {
  var uuid = uuidv4();
  var formData = new formidable.IncomingForm({
    uploadDir: './tmp'
  });

  formData.parse(request, function (formDataParseError, fields, files) {
    if (!formDataParseError) {
      if (files.file) {
        fs.rename(files.file.path, path.join(__dirname, 'tmp', files.file.name), function (renameError) {
          if (!renameError) {
            console.log(files.file.path);
            bucket.upload(path.join(__dirname, 'tmp', files.file.name), {
              uploadType: 'media',
              metadata: {
                metadata: {
                  contentType: files.file.type,
                  firebaseStorageDownloadTokens: uuid
                }
              }
            }, function (uploadError, file) {
              if (!uploadError) {

                admin.database().ref('posts').push({
                    id: fields.id,
                    title: fields.title,
                    location: fields.location,
                    image: 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid
                  })
                  .then(function () {
                    webpush.setVapidDetails('mailto:nikitastryuk@gmail.com', 'BK4TPpskF6UQs7HfYPnEsLyaI3bb8j6isH2QUj69BjzzwVs_F9EcKwpYFMtgM3WhNN9YzXBcL1PCBaCNVnGNYx8', 'BUQq7l6sR783EenYC-90-tqILoGVmvxWnJuAOOQEPC0');
                    return admin.database().ref('subscriptions').once('value');
                  })
                  .then(function (subscriptions) {
                    subscriptions.forEach(function (sub) {
                      if(sub) {
                      var pushConfig = {
                        endpoint: sub.val().endpoint,
                        keys: {
                          auth: sub.val().keys.auth,
                          p256dh: sub.val().keys.p256dh
                        }
                      };
                      webpush.sendNotification(pushConfig, JSON.stringify({
                          title: 'New Post',
                          content: 'New Post added!',
                          openUrl: '/help'
                        }))
                        .catch(function (sendPushError) {
                          console.log(sendPushError);
                        })
                      }
                    });
                    response.status(201).json({
                      message: 'Data stored',
                      id: fields.id
                    });
                  })
                  .catch(function (databasePushError) {
                    console.log('databasePushError');
                    console.log(databasePushError);
                    response.status(500).json({
                      error: databasePushError
                    });
                  });
              } else {
                console.log('uploadError');
                console.log(uploadError);
                response.status(500).json({
                  error: uploadError
                });
              }
            });
          } else {
            console.log('renameError');
            console.log(renameError);
            response.status(500).json({
              error: renameError
            });
          }
        });
      } else {
        console.log('formDataParseError');
        response.status(500).json({
          error: formDataParseError
        });
      }
    }
  });
})
