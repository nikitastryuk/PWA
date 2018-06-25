var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var url = 'https://pwa-test-3d0de.firebaseio.com/posts.json';

function openCreatePostModal() {
 // createPostArea.style.display = 'block';
 // setTimeout(function() {
  createPostArea.style.transform = 'translateY(0)';
  //},1);
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

function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)';
  ////////createPostArea.style.display = 'none';
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

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
  fetch(url,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: new Date().toISOString,
      title: titleInput.value,
      location: locationInput.value,
      image: ''
    })
  }).then(function(res){
    console.log('Sent data', res);
    updateUI();
  })
}

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




//to know from where will we take data
var networkDataReceived = false;

fetch(url)
  .then(function(res) {
    return res.json();
  })
  .then(function(data) {
    networkDataReceived = true;
    console.log('From web', data);
    var dataArray = [];
    for (var key in data) {
      dataArray.push(data[key]);
    }
    updateUI(dataArray);
  });

//CHANGING TO INDEXEDDB
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

if ('indexedDB' in window) {
  readAllData('posts').then(function(data){
    if(!networkDataReceived) {
      console.log('From cache', data);
      updateUI(data);
    }
  })
}

form.addEventListener('submit', function(event) {
  event.preventDefault();
  if(titleInput.value === '' || location.value === '') {
    alert("Please enter valid data!");
    return;
  }
  closeCreatePostModal();

  if('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(function(sw){
      var post = {
        id: new Date().toISOString(),
        title: titleInput.value,
        location: locationInput.value
      };
      //storing data to sync inside IndexDb sync-posts
      writeData('sync-posts', post).then(function() {
      //register sync task with sw
      return sw.sync.register('sync-new-posts');
      }).then(function(){
        var snackbarContainer = document.querySelector('#confirmation-toast');
        var data = {message: 'Your post was saved for syncing!'};
        snackbarContainer.MaterialSnackbar.showSnackbar(data);
      }).catch(function(err) {
        console.log(err);
      })
    })
  }
  else {
    sendData()
  }

})