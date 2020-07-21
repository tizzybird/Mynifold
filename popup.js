'use strict';

const app = document.querySelector('#app')
const contentTemplate = document.querySelector('template#content')
const cardTemplate = document.querySelector('template#card')
const controlTemplate = document.querySelector('template#control')
// when opening the popup
chrome.storage.sync.get(['media'], function(data) {
  // TODO: show default page
  if (data.media == undefined)
    return
    
  showCards(data.media)
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.log(changes, changes.action.newValue.operation)
  if (changes.action.newValue.operation == 'create') {
    // const listMount = document.querySelector('#listMount')
    // while (listMount.firstElementChild)
    //   listMount.removeChild(listMount.firstElementChild)
    // showCards(changes.media.newValue)
    addCard(changes.media.newValue[changes.action.newValue.item])
  }
})

// TODO: loading animation
function setLoading(isLoading) {
  const listMount = document.querySelector('#listMount')
  if (isLoading) {
  } else {
  }
}

// DEPRECATED: single content
function showContent(item) {
  console.log('showing content')
  const clone = contentTemplate.content.cloneNode(true)
  const playBtn = clone.querySelector("button[name='mid']")
  const gotoBtn = clone.querySelector("button[name='goto']")
  const pipBtn  = clone.querySelector("button[name='pip']")
  const repeatBtn = clone.querySelector("button[name='repeat']")
  gotoBtn.onclick   = onGotoClick(item.windowId, item.tabId)
  chrome.tabs.sendMessage(item.tabId, {askInitInfo: true}, response => {
    console.log(response)
    clone.querySelector('h3').innerText = response.title
    clone.querySelector('p').innerText = response.channel
    clone.querySelector('img').src = `https://img.youtube.com/vi/${response.videoId}/mqdefault.jpg`
    playBtn.onclick   = onPlayClick(item.tabId, playBtn, response.isPlaying)
    pipBtn.onclick    = onPipClick(item.tabId, pipBtn, response.isInPip)
    repeatBtn.onclick = onRepeatClick(item.tabId, repeatBtn, response.loop)
    app.appendChild(clone)
  })
  
  // remove original cards
  // let newDiv = document.createElement('div')
  // newDiv.id = 'list'
  // app.replaceChild(document.querySelector('#list'), newDiv)
}

function addCard(currItem) {
  const listMount = document.querySelector('#listMount')
  let hook = setTimeout(function ask() {
    // since this is async, the order may not be precise
    chrome.tabs.sendMessage(currItem.tabId, {askInitInfo: true}, response => {
      console.log(currItem.tabId, response)
      if (response == undefined || Object.keys(response).length == 0) {
        hook = setTimeout(ask, 700)
        return
      }
        
      let cardClone = cardTemplate.content.cloneNode(true)
      
      // init info
      cardClone.firstElementChild.id = currItem.tabId
      cardClone.querySelector("[name='title']").innerText = response.title
      cardClone.querySelector("[name='channel']").innerText = response.channel
      cardClone.querySelector("[name='avatar'").src = response.avatar
      cardClone.querySelector("[name='cancel']").onclick = onCancelClick(currItem.tabId, cardClone.firstElementChild)
      // cardClone.querySelector('img').src = `https://img.youtube.com/vi/${response.videoId}/default.jpg`
      // cardClone.firstElementChild.firstElementChild.onclick = cardClickHandler()
      
      // init control
      const controlMount = cardClone.querySelector('[name=controlMount]')
      const controlClone = initControl(currItem.windowId, currItem.tabId, response, cardClone.firstElementChild)
      controlMount.appendChild(controlClone)
      listMount.appendChild(cardClone)
    })
  }, 300)
}

// multiple contents
function showCards(data) {
  const keys = Object.keys(data)
  console.log('card data', data)

  for (let key of keys) {
    const currItem = data[key]
    if (currItem.isActive)
      addCard(currItem)
  }
}

function initControl(windowId, tabId, info, self) {
  let controlClone = controlTemplate.content.cloneNode(true)
  const gotoBtn = controlClone.querySelector("button[name='goto']")
  const pipBtn  = controlClone.querySelector("button[name='pip']")
  const playBtn = controlClone.querySelector("button[name='play']")
  const nextBtn = controlClone.querySelector("button[name='next']")
  const repeatBtn = controlClone.querySelector("button[name='repeat']")
  
  playBtn.onclick   = onPlayClick(tabId, playBtn, info.isPlaying)
  gotoBtn.onclick   = onGotoClick(windowId, tabId)
  pipBtn.onclick    = onPipClick(tabId, pipBtn, info.isInPip)
  nextBtn.onclick   = onNextClick(tabId, info.next, self)
  repeatBtn.onclick = onRepeatClick(tabId, repeatBtn, info.loop)

  nextBtn.title = info.nextTitle

  return controlClone
}

function onCancelClick(tabId, self) {
  return function() {
    chrome.tabs.remove(tabId, function() {
      self.remove()
    })
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

function onNextClick(tabId, url, self) {
  return function() {
    chrome.tabs.update(tabId, {url}, function() {
      console.log('clicked!')
      let hook = setTimeout(function ask() {
        chrome.tabs.sendMessage(tabId, {askInitInfo: true}, response => {
          console.log('next response back!', response)
          if (response == undefined || response.next == url || Object.keys(response).length == 0) {
            hook = setTimeout(ask, 1000)
            return
          }
          // update info
          self.querySelector("[name='title']").innerText = response.title
          self.querySelector("[name='channel']").innerText = response.channel
          self.querySelector("[name='avatar'").src = response.avatar
          
          // update control
          let controlMount = self.querySelector('[name=controlMount]')
          controlMount.firstElementChild.remove()
          
          let newControl = initControl(tabId, response, self)
          controlMount.appendChild(newControl)
        })
      }, 700)
    })
  }
}

// message handler
// todo: match corrresponding item
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const card = document.getElementById(sender.tab.id)
  
  if (request.videoEvent == 'playing' || request.videoEvent == 'pause') {
    const icon = card.querySelector("button[name='play']>i")
    icon.classList.toggle('fa-pause')
    icon.classList.toggle('fa-play')
  }
  if (request.videoEvent == 'enterpip' || request.videoEvent == 'leavepip') {
    card.querySelector("button[name='pip']").classList.toggle('active')
  }
})
