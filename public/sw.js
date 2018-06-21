
var CACHE_STATIC_NAME = 'static-v4';
//After user visited page
var CACHE_DYNAMIC_NAME = 'dynamic-v2';

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing Service Worker ...', event);
  //Won't finish installation event before it's done 
  event.waitUntil(
    //Giving name to overall cache storage(caches)
    caches.open(CACHE_STATIC_NAME)
       //getting the cache that was opened
      .then(function (cache) {
        console.log('[Service Worker] Precaching App Shell');
        //Core page with all scripts/styles/fonts
        cache.addAll([
          //have to cache requests(/ is separate request)
          '/',
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
        ]);
      })
  )
});

self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating Service Worker ....', event);
  event.waitUntil(
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

self.addEventListener('fetch', function (event) {
  //console.log('[Service Worker] Fetching something ....', event);
  event.respondWith(
    //Check if request matches subcache in cache storage(e.req are our keys(always))
    caches.match(event.request)
      //continue
      .then(function (response) {
        //returning from cache (not making a request)
        if (response) {
          return response;
        } else {
          //continue with network request
          return fetch(event.request)
            .then(function (res) {
              //We know it's not matches our storage, so we can cache it also(need to return back to html file)
              return caches.open(CACHE_DYNAMIC_NAME)
                //getting the cache that was opened
                .then(function (cache) {
                  //putting a new resource(put just stores data not making a req like add )
                  cache.put(event.request.url, res.clone());
                  return res;
                })
            })
            .catch(function (err) {

            });
        }
      })
  );
});