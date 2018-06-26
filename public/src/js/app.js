
var deferredPrompt;
var enableNotificationButtons = document.querySelectorAll('.enable-notifications');
if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(function () {
      console.log('Service worker registered!');
    })
    .catch(function(err) {
      console.log(err);
    });
}

//Add PWA banner
window.addEventListener('beforeinstallprompt', function(event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  if('serviceWorker' in navigator) {
    //Options
    var options = {
      body: 'You were subscribed to our Notification server',
      icon: 'src/images/icons/app-icon-96x96.png',
      image: 'src/images/sf-boat.jpg',
      lang: 'en-Us', //BCP 47
      //dir: 'lrt',
      vibrate: [100, 50, 200], //vibr/pause/vibr
      badge: '/src/images/icons/app-icon-96x96.png',
      ////
      tag: 'confirm-notification', //replaces other with same tag,
      renotify: true, //new one will vibrate and notify even with same tag if false just replace
      actions: [
        {
        action: 'confirm',
        title: 'Ok',
        icon: 'src/images/icons/app-icon-96x96.png'
      },
      {
        action: 'cancel',
        title: 'Cancel',
        icon: 'src/images/icons/app-icon-96x96.png'
      }
    ]
    };
    //our active sw
    navigator.serviceWorker.ready.then(function(swreg) {
      //sw interface for notifications (same but with sw)
      swreg.showNotification('Successfully subscribed', options);
    })
  }
  //Device sysyem notification
/*   var options = {
    body: 'You were subscribed to our Notification server'
  };
  new Notification('Successfully subscribed'. options); */
}

function configurePushSub() {
  if(!('serviceWorker' in navigator)) {
    return;
  }
  var reg;
  //getting current sw
  navigator.serviceWorker.ready.then(function(swreg) {
  //saving reg
  reg = swreg;
  //does this sw hadling through this browser have an existing subscription for this device
   return swreg.pushManager.getSubscription();
  })
  .then(function(sub){
    if(sub === null) {
      var vapidPublickKey = 'BKzlZdhQpRvmupWySitnCzCVm1CcPqDEaoIQAYne-g0AGCTx_721j4MQQBbPfaxYzJLEB5H29IyQgO-1x09aqis';
      var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublickKey);
      //Create sub for the given browser on this device
      return reg.pushManager.subscribe({
        //configuration to sub
        userVisibleOnly: true,
        //identify server as only valid source sending new msgs
        applicationServerKey: convertedVapidPublicKey
      });
    }
    else {
      //We have a sub
      console.log('Already subscribed');
    }
  }).then(function(newSub){
    return fetch('https://pwa-test-3d0de.firebaseio.com/subscriptions.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newSub)
    }).then(function(res){
      if(res.ok) {
      displayConfirmNotification();
      }
    })
  }).catch(function(err){
    console.log(err);
  }) 

}

function askForNotificationPermission() {
  //you are giving permission for push and notif
  Notification.requestPermission(function(result){
    if(result !== 'granted') {
      console.log('No notification permission granted!');
    }
    else {
      //Hide btn
      configurePushSub();
      //displayConfirmNotification();
    }
  });
}

if( 'Notification' in window && 'serviceWorker' in navigator) {
  for (var i=0; i<enableNotificationButtons.length; i++) {
    enableNotificationButtons[i].style.display = 'inline-block';
    enableNotificationButtons[i].addEventListener('click', askForNotificationPermission);
  }
}
