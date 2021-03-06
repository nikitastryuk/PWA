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

workbox.precaching.precacheAndRoute([
  {
    "url": "custom-sw.js",
    "revision": "a62d5c780b6f3bf845fb9468f1f1aab7"
  },
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "cd094b8f3dd4242a95f73e6fa7d37d54"
  },
  {
    "url": "manifest.json",
    "revision": "a03dcc57fa73ef4db441cdfc38d9ff96"
  },
  {
    "url": "offline.html",
    "revision": "9cea41d00df2e2de27f62234f5689257"
  },
  {
    "url": "src/css/app.css",
    "revision": "ffed0d57e450481d115a3e1eaccfe002"
  },
  {
    "url": "src/css/feed.css",
    "revision": "74349ec894cd2ce68fed13c59868a84a"
  },
  {
    "url": "src/css/help.css",
    "revision": "81922f16d60bd845fd801a889e6acbd7"
  },
  {
    "url": "src/js/app.js",
    "revision": "6d93e430e709aa31953c86fea45db260"
  },
  {
    "url": "src/js/feed.js",
    "revision": "6588b5f4299269ae2b7efb40b880a106"
  },
  {
    "url": "src/js/fetch.js",
    "revision": "6ffcf8bd6b2ede3aa123ab744224edb6"
  },
  {
    "url": "src/js/idb.js",
    "revision": "931250cb35cf63af930bde1f21a90a8f"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "e68511951f1285c5cbf4aa510e8a2faf"
  },
  {
    "url": "src/js/promise.js",
    "revision": "b824449b966ea6229ca6d31b53abfcc1"
  },
  {
    "url": "src/js/utility.js",
    "revision": "549cf2731bdce307d7dd931e3bca3f93"
  },
  {
    "url": "sw-base.js",
    "revision": "5b6a1a8f8fda58f50c0f07b2ffddb20d"
  },
  {
    "url": "workbox-config.js",
    "revision": "7702e05b39ca92b4446e5bce088c12a1"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/new-main.jpg",
    "revision": "0875b27459c2cd130c544f181783c311"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  }
], {});


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