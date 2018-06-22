importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v4';
//After user visited page
var CACHE_DYNAMIC_NAME = 'dynamic-v4';
var STATIC_FILES = [
  //have to cache requests(/ is separate request)
  '/',
  '/offline.html',
  '/index.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  //Pollys only need for old browsers
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing Service Worker ...', event);
  //Won't finish installation event before it's done 
  event.waitUntil(
    //Giving name to overall cache storage(caches)
    caches.open(CACHE_STATIC_NAME)
    //getting the cache that was opened
    .then(function (cache) {
      console.log('[Service Worker] Precaching App Shell');
      //Core page with all scripts/styles/fonts (req will be performed automaticly and stored with responds)
      cache.addAll(
        STATIC_FILES
      );
    })
  )
});

self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating Service Worker ....', event);
  //Won't finish activation before we done
  event.waitUntil(
    //getting all our subcaches
    caches.keys()
    .then(function (keyList) {
      return Promise.all(keyList.map(function (key) {
        if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
          console.log('[Service Worker] Removing old cache.', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});


// function trimCache(cacheName, maxItems) {
//    caches.open(cacheName).then(function(cache) {
//     return cache.keys().then(function(keys) {
//       if(keys.length > maxItems) {
//         cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
//       }
//     })
//    })
// }

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
    console.log('matched ', string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

//CACHE AND NETWORK
self.addEventListener('fetch', function (event) {
  //Specifying a route for strategy(CACHE AND NETWORK, feed.js rest)
  var url = 'https://pwa-test-3d0de.firebaseio.com/posts';
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(

      //STORING IN CACHE(OLD VERSION)
      // caches.open(CACHE_DYNAMIC_NAME)
      //   //performing a network request and storing the data
      //   .then(function (cache) {
      //     return fetch(event.request)
      //       .then(function (res) {
      //         // trimCache(CACHE_DYNAMIC_NAME, 3);
      //         cache.put(event.request, res.clone());
      //         return res;
      //       });
      //   })

      //STORING IN INDEXDB(NEW VERSION)
      fetch(event.request)
      .then(function (res) {
        var clonedRes = res.clone();
        clearAllData('posts')
        .then(function(){
          return clonedRes.json()
        })
        .then(function (data) {
          for (var key in data) {
            // dbPromise.then(function (db) {
            //   //Specify trans for store
            //   var tx = db.transaction('posts', 'readwrite');
            //   //Open IndexDb store
            //   var store = tx.objectStore('posts');
            //   store.put(data[key]);
            //   //Needs to be returned(trans was completed)
            //   return tx.copmlete;
            // })
            
            writeData('posts', data[key]) 
            //JUST TESTING DELETE METHOD
            // .then(function(){
            //   deleteItemFromData('posts', key)
            // })
          }
        })
        return res;
      })
    );
    //for all STATIC_FILES routes taking from cache
    //checking if one of STATIC_FILES is part of req url
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(
      caches.match(event.request)
    );
    //for all others
  } else {
    event.respondWith(
      caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response;
          //if no data - performing a request and storing
        } else {
          return fetch(event.request)
            .then(function (res) {
              return caches.open(CACHE_DYNAMIC_NAME)
                .then(function (cache) {
                  // trimCache(CACHE_DYNAMIC_NAME, 3);
                  cache.put(event.request.url, res.clone());
                  return res;
                })
            })
            //if nothing from network and cache returning offline.html (for text/html only cause we don't want show it for css etc)
            .catch(function (err) {
              return caches.open(CACHE_STATIC_NAME)
                .then(function (cache) {

                  if (event.request.headers.get('accept').includes('text/html')) {
                    return cache.match('/offline.html');
                  }
                });
            });
        }
      })
    );
  }
});


//NETWORK WITH CACHE FALLBACK STRATEGY (NOT BEST SOLUTION DUE TO TIMEOUT PROBLEM)
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function (res) {
//         return caches.open(CACHE_DYNAMIC_NAME)
//           .then(function (cache) {
//             cache.put(event.request.url, res.clone());
//             return res;
//           })
//       })
//       .catch(function (err) {
//         return caches.match(event.request)
//       })
//   );
// });

//CACHE WITH NETWORK FALLBACK STRATEGY
// self.addEventListener('fetch', function (event) {
//   //console.log('[Service Worker] Fetching something ....', event);
//   event.respondWith(
//     //Check if request matches subcache in cache storage(e.req are our keys(always))
//     caches.match(event.request)
//       //continue
//       .then(function (response) {
//         //returning from cache (not making a request)
//         if (response) {
//           return response;
//         } else {
//           //continue with network request
//           return fetch(event.request)
//             .then(function (res) {
//               //We know it's not matches our storage, so we can cache it also(need to return back to html file)
//               return caches.open(CACHE_DYNAMIC_NAME)
//                 //getting the cache that was opened
//                 .then(function (cache) {
//                   //putting a new resource(put just stores data not making a req like add )
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//             })
//             .catch(function (err) {
//               return caches.open(CACHE_STATIC_NAME).then(function(cache) {
//                 return cache.match('/offline.html');
//               })
//             });
//         }
//       })
//   );
// });

//CACHE ONLY STRATEGY
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     caches.match(event.request)
//   );
// });

//NETWORK ONLY STRATEGY
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });