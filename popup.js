'use strict';

const app = document.querySelector('#app')
const listMount = document.querySelector('#listMount')
const contentTemplate = document.querySelector('template#content')
const cardTemplate = document.querySelector('template#card')
const controlTemplate = document.querySelector('template#control')
const excludeKeys = ['action']
const defaultPicPath = 'images/logo48.png'
// when opening the popup
chrome.storage.sync.get(null, store => {
  // TODO: show default page
  showCards(store)
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.log('store change', changes)
  for (let key in changes) {
    if (excludeKeys.includes(key))
      continue
    
    if (changes[key].newValue == undefined) {
      // remove
      let card = document.getElementById(changes[key].oldValue.tabId)
      if (card != null)
        card.remove()
    } else if (changes[key].oldValue == undefined) {
      // create
      addCard(changes[key].newValue)
    } else {
      // update
      updateCard(changes[key].newValue)
    }
  }
})

// TODO: loading animation
function setLoading(isLoading) {
  if (isLoading) {
  } else {
  }
}

// multiple contents
function showCards(data) {
  console.log('card data', data)

  for (let key in data) {
    if (excludeKeys.includes(key))
      continue;

    addCard(data[key])
  }
}

function addCard(currItem) {
  console.log('adding a card...')
  
  let hook = setTimeout(function ask() {
    // since this is async, the order may not be precise
    chrome.tabs.sendMessage(currItem.tabId, {ask: 'initInfo'}, response => {
      console.log(currItem.tabId, response)
      if (response == undefined || Object.keys(response).length == 0) {
        hook = setTimeout(ask, 500)
        return
      }

      let cardClone = cardTemplate.content.cloneNode(true)
      cardClone.firstElementChild.id = currItem.tabId
      cardClone.querySelector("[name='title']").innerText = response.title
      cardClone.querySelector("[name='channel']").innerText = response.channel
      cardClone.querySelector("[name='cancel']").onclick = onCancelClick(currItem.tabId, cardClone.firstElementChild)
      // cardClone.querySelector('img').src = `https://img.youtube.com/vi/${response.videoId}/default.jpg`
      // cardClone.firstElementChild.firstElementChild.onclick = cardClickHandler()
      
      let avatarElm = cardClone.querySelector("[name='avatar']")
      if (response.avatar.length == 0) {
        avatarElm.src = defaultPicPath
        avatarFetcher(currItem.tabId, avatarElm)
      } else {
        avatarElm.src = response.avatar
      }

      // init control
      const controlMount = cardClone.querySelector('[name=controlMount]')
      const controlClone = initControl(currItem.windowId, currItem.tabId, response, cardClone.firstElementChild)
      controlMount.appendChild(controlClone)
      listMount.appendChild(cardClone)
    })
  }, 300)
}

function updateCard(currItem) {
  console.log('updating a card...')
  let card = document.getElementById(currItem.tabId)
  if (card == null) {
    console.log('card is null', currItem)
    return
  }
  let hook = setTimeout(function ask() {
    chrome.tabs.sendMessage(currItem.tabId, {ask: 'initInfo'}, response => {
      console.log(currItem.tabId, response)
      if (response == undefined || Object.keys(response).length == 0 || response.next == currItem.url) {
        hook = setTimeout(ask, 700)
        return
      }
      console.log("success, keep going", card)
      card.querySelector("[name='title']").innerText = response.title
      card.querySelector("[name='channel']").innerText = response.channel
      let avatarElm = card.querySelector("[name='avatar']")
      if (response.avatar.length == 0) {
        avatarElm.src = defaultPicPath
        avatarFetcher(currItem.tabId, avatarElm)
      } else {
        avatarElm.src = response.avatar
      }
      console.log("updating control bar")
      // update control bar
      let controlMount = card.querySelector('[name=controlMount]')
      let newControl = initControl(currItem.windowId, currItem.tabId, response, card)
      controlMount.firstElementChild.remove()
      controlMount.appendChild(newControl)
    })
  })
}

function initControl(windowId, tabId, info, self) {
  let controlClone = controlTemplate.content.cloneNode(true)
  const gotoBtn = controlClone.querySelector("button[name='goto']")
  const pipBtn  = controlClone.querySelector("button[name='pip']")
  const prevBtn = controlClone.querySelector("button[name='prev']")
  const playBtn = controlClone.querySelector("button[name='play']")
  const nextBtn = controlClone.querySelector("button[name='next']")
  const repeatBtn = controlClone.querySelector("button[name='repeat']")
  
  playBtn.onclick   = onPlayClick(tabId, playBtn, info.isPlaying)
  gotoBtn.onclick   = onGotoClick(windowId, tabId)
  pipBtn.onclick    = onPipClick(tabId, pipBtn, info.isInPip)
  // problem here: need to update new currItem to prev button
  prevBtn.onclick   = onPrevClick(tabId)
  // nextBtn.onclick   = onNextClick(windowId, tabId, info.next, self)
  nextBtn.onclick   = onNextClick(tabId, info.next)
  repeatBtn.onclick = onRepeatClick(tabId, repeatBtn, info.loop)

  nextBtn.title = info.nextTitle

  return controlClone
}

function onCancelClick(tabId, self) {
  return function() {
    chrome.tabs.remove(tabId, () => { self.remove() })
  }
}

/////////////////
// control bar //
/////////////////

function onGotoClick(windowId, tabId) {
  return function(event) {
    chrome.windows.getCurrent(curr => {
      if (curr.id == windowId) {
        chrome.tabs.update(tabId, {active: true})
      } else {
        chrome.windows.update(windowId, {focused: true}, () => {
          chrome.tabs.update(tabId, {active: true})
        })
      }
    })
  }
}

function onPipClick(tabId, btn, setPip) {
  if (setPip)
    btn.classList.toggle('active')
  
  return function(event) {
    btn.classList.toggle('active')
    if (btn.classList.contains('active')) {
      chrome.tabs.sendMessage(tabId, {control: 'setPip'})
    } else {
      chrome.tabs.sendMessage(tabId, {control: 'unsetPip'})
    }
  }
}

function onRepeatClick(tabId, btn, setRepeat) {
  if (setRepeat)
    btn.classList.toggle('active')

  return function(event) {
    btn.classList.toggle('active')
    if (btn.classList.contains('active')) {
      chrome.tabs.sendMessage(tabId, {control: 'setRepeat'})
    } else {
      chrome.tabs.sendMessage(tabId, {control: 'unsetRepeat'})
    }
  }
}

function onPlayClick(tabId, btn, isPlaying) {
  let icon = btn.querySelector('i')
  // set initial status
  if (isPlaying) {
    icon.classList.toggle('fa-pause')
    icon.classList.toggle('fa-play')
  }

  return function(event) {
    if (icon.classList.contains('fa-play')) {
      chrome.tabs.sendMessage(tabId, {control: 'play'}, response => {
        if (response && response.success) {
          icon.classList.toggle('fa-pause')
          icon.classList.toggle('fa-play')
        }
      })
    } else {
      icon.classList.toggle('fa-pause')
      icon.classList.toggle('fa-play')
      chrome.tabs.sendMessage(tabId, {control: 'pause'})
    }
  }
}

function avatarFetcher(tabId, self) {
  console.log('in avatar fetcher')
  let count = 0
  let hook = setTimeout(function fetch() {
    chrome.tabs.sendMessage(tabId, {ask: 'avatar'}, response => {
      console.log('avatar response', counter, response)
      if (count == 3) {
        console.log('failed to fetch avatar')
        return
      }
        
      if (response.error) {
        count++
        hook = setTimeout(fetch, 3000)
        return
      }
      self.src = response
    })
  }, 500)
}

function onNextClick(tabId, url) {
  return function() {
    console.log('next button clicked!')
    chrome.tabs.update(tabId, {url})
  }
}

function onPrevClick(tabId) {
  return function () {
    console.log('prev button clicked!')
    chrome.tabs.goBack(tabId)
  }
}

// message handler
// todo: match corresponding item
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const card = document.getElementById(sender.tab.id)
  if (card == null)
    return

  if (request.videoEvent == 'playing' || request.videoEvent == 'pause') {
    const icon = card.querySelector("button[name='play']>i")
    icon.classList.toggle('fa-pause')
    icon.classList.toggle('fa-play')
  }
  if (request.videoEvent == 'enterpip' || request.videoEvent == 'leavepip') {
    card.querySelector("button[name='pip']").classList.toggle('active')
  }
})

/*
// chapter in the video
<div class="ytp-chapter-container" style="max-width: 216px;">
  <button class="ytp-chapter-title ytp-button ytp-chapter-container-disabled" title="查看章節" aria-label="查看章節" disabled="">
    <span class="ytp-chapter-title-prefix" aria-hidden="true">•</span>
    <div class="ytp-chapter-title-content">
      A Place In Heaven (Album: Illusions)
    </div>
    <div class="ytp-chapter-title-chevron">
      <svg height="100%" viewBox="0 0 24 24" width="100%">
        <path d="M9.71 18.71l-1.42-1.42 5.3-5.29-5.3-5.29 1.42-1.42 6.7 6.71z" fill="#fff"></path>
      </svg>
    </div>
  </button>
</div>
*/