//Vars
var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var videoPlayer = document.querySelector('#player');
var canvasElement = document.querySelector('#canvas');
var captureButton = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var locationBtn = document.querySelector('#location-btn');
var locationLoader = document.querySelector('#location-loader');
var fetchedLocation = {
  lat: 0,
  lng: 0
};
var picture = null;

//Db 
var url = 'https://pwa-test-3d0de.firebaseio.com/posts.json';
//to know from where will we take data(cache or network)
var networkDataReceived = false;

//Format to match folder create restrictions
function setDateId() {
  return new Date().toISOString().replace(/\W/g, '');
}

//Polly for browser that not support getUserMedia
function initializeMedia() {
  //if no mediaDevices create own one
  if (!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {};
  }

  //if no getUserMedia - taking deprecated implementations
  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      //if no - can't be used at all
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented!'));
      }

      return new Promise(function (resolve, reject) {
        //calling with correct context(navigator)
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }

  //Getting the video stream (video element)
  navigator.mediaDevices.getUserMedia({
      video: true
    })
    .then(function (stream) {
      //setting the stream
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch(function (err) {
      imagePickerArea.style.display = 'block';
    });
}

function initializeLocation() {
  if (!('geolocation' in navigator)) {
    locationBtn.style.display = 'none';
  }
}

//Open modal wtih animation, initMedia, banner
function openCreatePostModal() {
  setTimeout(function () {
    createPostArea.style.transform = 'translateY(0)';
  }, 1000)
  initializeMedia();
  initializeLocation();
  //Add to home screen banner shows after clicking add post modal
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choiceResult) {
      console.log(choiceResult.outcome);
      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled installation');
      } else {
        console.log('User added to home screen');
      }
    });

    deferredPrompt = null;
  }

  //Get rid of sw (cache is also gone)
  // if('serviceWorker' in navigator) {
  //   navigator.serviceWorker.getRegistrations().then(function(registration){
  //     for(var i=0; i<registration.length; i++) {
  //       registrations[i].unregister();
  //     }
  //   })
  // }
}

//Close modal with animation and disabling elements
function closeCreatePostModal() {
  imagePickerArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasElement.style.display = 'none';
  locationBtn.style.display = 'inline';
  locationLoader.style.display = 'none';
  captureButton.style.display = 'inline';
  //stop using media stream not to waiste resources
  if (videoPlayer.srcObject) {
    videoPlayer.srcObject.getVideoTracks().forEach(function (track) {
      track.stop();
    })
    //wrapping to setTimeout to animate out and not wait till stream stops
    setTimeout(function () {
      createPostArea.style.transform = 'translateY(100vh)';
    }, 1000)
  }
}


  //Prevent dublicates
  function clearCards() {
    while (sharedMomentsArea.hasChildNodes()) {
      sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
    }
  }

  function createCard(data) {
    var cardWrapper = document.createElement('div');
    cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
    var cardTitle = document.createElement('div');
    cardTitle.className = 'mdl-card__title';
    cardTitle.style.backgroundImage = 'url(' + data.image + ')';
    cardTitle.style.backgroundSize = 'cover';
    cardTitle.style.height = '180px';
    cardWrapper.appendChild(cardTitle);
    var cardTitleTextElement = document.createElement('h2');
    cardTitleTextElement.style.color = 'white';
    cardTitleTextElement.className = 'mdl-card__title-text';
    cardTitleTextElement.textContent = data.title;
    cardTitle.appendChild(cardTitleTextElement);
    var cardSupportingText = document.createElement('div');
    cardSupportingText.className = 'mdl-card__supporting-text';
    cardSupportingText.textContent = data.location;
    cardSupportingText.style.textAlign = 'center';
    // var cardSaveButton = document.createElement('button');
    // cardSaveButton.textContent = 'Save';
    // cardSaveButton.addEventListener('click', onSaveButtonClicked);
    // cardSupportingText.appendChild(cardSaveButton);
    cardWrapper.appendChild(cardSupportingText);
    componentHandler.upgradeElement(cardWrapper);
    sharedMomentsArea.appendChild(cardWrapper);
  }


  function sendData() {
    var id = setDateId();
    var postData = new FormData();
    postData.append('id', id);
    postData.append('title', titleInput.value);
    postData.append('location', locationInput.value);
    postData.append('file', picture, id + '.png');
    postData.append('rawLocationLat', fetchedLocation.lat);
    postData.append('rawLocationLng', fetchedLocation.lng);
    fetch('http://127.0.0.1:3000/storePost', {
        method: 'POST',
        body: postData
      })
      .then(function (res) {
        console.log('Sent data', res);
        updateUI();
      })
  }

  //Redraw new cards
  function updateUI(data) {
    clearCards();
    for (var i = 0; i < data.length; i++) {
      createCard(data[i]);
    }
  }


  //Cache on demand
  // function onSaveButtonClicked(event) {
  //   if ('caches' in window) {
  //     caches.open('user-requested').then(function(cache) {
  //       cache.add('https://httpbin.org/get');
  //       cache.add('src/images/sf-boat.jpg');
  //     })
  //   }
  // }




  fetch(url)
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      networkDataReceived = true;
      console.log('From web', data);
      var dataArray = [];
      for (var key in data) {
        dataArray.push(data[key]);
      }
      updateUI(dataArray);
    });

  if ('indexedDB' in window) {
    readAllData('posts').then(function (data) {
      if (!networkDataReceived) {
        console.log('From cache', data);
        updateUI(data);
      }
    })
  }


  //CHANGED TO INDEXEDDB(Cache version)
  // if ('caches' in window) {
  //   caches.match(url)
  //     .then(function(response) {
  //       if (response) {
  //         return response.json();
  //       }
  //     })
  //     .then(function(data) {
  //       console.log('From cache', data);
  //       if (!networkDataReceived) {
  //         var dataArray = [];
  //         for (var key in data) {
  //           dataArray.push(data[key]);
  //         }
  //         updateUI(dataArray)
  //       }
  //     });
  // }


  //Event listeners
  shareImageButton.addEventListener('click', openCreatePostModal);

  locationBtn.addEventListener('click', function (event) {
    if (!('geolocation' in navigator)) {
      return;
    }
    var isAllertAppeared = false;
    locationBtn.style.display = 'none';
    locationLoader.style.display = 'block';
    //Asking for permission
    navigator.geolocation.getCurrentPosition(function (position) {
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';
      fetchedLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      locationInput.value = 'Somewhere';
      document.querySelector('#manual-location').classList.add('is-focused');
    }, function (err) {
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';
      if (!isAllertAppeared) {
        isAllertAppeared = true;
        alert("Couldn't fetch location");
      }
      fetchedLocation = {
        lat: 0,
        lng: 0
      };
      console.log(err);
    }, {
      //how long we can try to get a location
      timeout: 7000
    });
  });

  closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

  captureButton.addEventListener('click', function (event) {
    canvasElement.style.display = 'block';
    videoPlayer.style.display = 'none';
    captureButton.style.display = 'none';
    var context = canvasElement.getContext('2d');
    context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width));
    videoPlayer.srcObject.getVideoTracks().forEach(function (track) {
      track.stop();
    });
    picture = dataURItoBlob(canvasElement.toDataURL());
  });

  imagePicker.addEventListener('change', function (event) {
    picture = event.target.files[0];
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (titleInput.value === '' || location.value === '') {
      alert("Please enter valid data!");
      return;
    }
    closeCreatePostModal();

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(function (sw) {
        var post = {
          id: setDateId(),
          title: titleInput.value,
          location: locationInput.value,
          picture: picture,
          rawLocation: fetchedLocation
        };
        //storing data to sync inside IndexDb sync-posts
        writeData('sync-posts', post).then(function () {
          //register sync task with sw
          return sw.sync.register('sync-new-posts');
        }).then(function () {
          //3rd party lib for notification
          var snackbarContainer = document.querySelector('#confirmation-toast');
          var data = {
            message: 'Your post was saved for syncing!'
          };
          snackbarContainer.MaterialSnackbar.showSnackbar(data);
        }).catch(function (err) {
          console.log(err);
        })
      })
    } else {
      sendData();
    }
  })