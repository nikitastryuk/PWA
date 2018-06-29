importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.3.1/workbox-sw.js");
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

//Strats
//cacheFirst - cache than network if we don't find it there
//staleWhileRevalidate - cache and network with update to have last v
//cacheOnly
//networkFirst - and cache if it fails

workbox.precaching.suppressWarnings();
workbox.routing.registerRoute(
    //Auto regist a fetch listener matches regExp
    /.*(?:googleapis|gstatic)\.com.*$/,
    //cache than network request strategy with cache update
    workbox.strategies.staleWhileRevalidate({
        cacheName: "google-fonts",
        //can be found in IndexedDb expiration storage
        cacheExpiration: {
            maxEntries: 3,
            //every 60s*60h*d*m = every month
            maxAgeSeconds: 60 * 60 * 24 * 30
        }
    })
)

workbox.routing.registerRoute(
    "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
    workbox.strategies.staleWhileRevalidate({
        cacheName: "material-css"
    })
)
workbox.routing.registerRoute(
    /.*(?:firebasestorage\.googleapis)\.com.*$/,
    workbox.strategies.staleWhileRevalidate({
        cacheName: "post-images"
    })
)

var url = 'https://pwa-test-3d0de.firebaseio.com/posts.json';
workbox.routing.registerRoute(
    url,
    function (args) {
        return fetch(args.event.request)
            .then(function (res) {
                var clonedRes = res.clone();
                clearAllData('posts')
                    .then(function () {
                        return clonedRes.json()
                    })
                    .then(function (data) {
                        for (var key in data) {
                            writeData('posts', data[key])
                        }
                    })
                return res;
            })
    }
)

workbox.routing.registerRoute(
    function(routeData) {
        //only for html
        return (routeData.event.request.headers.get('accept').includes('text/html'))
    },
    function (args) {
        return caches.match(args.event.request)
        .then(function (response) {
          if (response) {
            return response;
          } else {
            return fetch(args.event.request)
              .then(function (res) {
                return caches.open('dynamic')
                  .then(function (cache) {
                    cache.put(args.event.request.url, res.clone());
                    return res;
                  })
              })
              .catch(function (err) {
                return caches.match('/offline.html')
                  .then(function (res) {
                    return res;
                  });
              });
          }
        })
    }
)

workbox.precaching.precacheAndRoute([], {});


//Listening sync event
self.addEventListener('sync', function (event) {
    console.log('[Service Worker] Background syncing', event);
    if (event.tag === 'sync-new-posts') {
      console.log('[Service Worker] Syncing new Posts');
      event.waitUntil(
      readAllData('sync-posts')
        .then(function(data) {
          for (var dt of data) {
            var postData = new FormData();
            postData.append('id', dt.id);
            postData.append('title', dt.title);
            postData.append('location', dt.location);
            postData.append('rawLocationLat', dt.rawLocation.lat);
            postData.append('rawLocationLng', dt.rawLocation.lng);
            postData.append('file', dt.picture, dt.id);

            fetch('https://us-central1-pwagram-99adf.cloudfunctions.net/storePostData', {
              method: 'POST',
              body: postData
            })
              .then(function(res) {
                console.log('Sent data', res);
                if (res.ok) {
                  res.json()
                    .then(function(resData) {
                      deleteItemFromData('sync-posts', resData.id);
                    });
                }
              })
              .catch(function(err) {
                console.log('Error while sending data', err);
              });
          }

        })
    );
    }
  });
  
  
  self.addEventListener('notificationclick', function (event) {
    var notification = event.notification;
    var action = event.action;
    console.log('Notification: ' + notification);
    if (action === 'confirm') {
      notification.close();
    } else {
      event.waitUntil(
        clients.matchAll().then(function (clis) {
          var client = clis.find(function (c) {
            return c.visibilityStat = 'visible';
          })
          if (client != undefined) {
            client.navigate(notification.data.url);
            client.focus();
          } else {
            clients.openWindow(notification.data.url);
          }
          notification.close();
        })
      )
  
    }
  })
  
  self.addEventListener('notificationclose', function (event) {
    console.log('Notification was closed', event);
  })
  
  self.addEventListener('push', function (event) {
    console.log("Push notification recieved", event);
    var data = {
      title: 'New!',
      content: 'Something!',
      openUrl: '/'
    };
    if (event.data) {
      data = JSON.parse(event.data.text());
    }
    var options = {
      body: data.content,
      icon: '/src/images/icons/app-icon-96x96.png',
      badge: '/src/images/icons/app-icon-96x96.png',
      data: {
        url: data.openUrl
      }
    }
  
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  })