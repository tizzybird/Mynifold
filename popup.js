'use strict';

const app = document.querySelector('#app')
const contentTemplate = document.querySelector('template#content')
const cardTemplate = document.querySelector('template#card')
const controlTemplate = document.querySelector('template#control')
// when opening the popup
chrome.storage.sync.get(['media'], function(data) {
  if (data.media == undefined) {
    return
  }
  let keys = Object.keys(data.media)
  console.log(data)
  // if (keys.length == 1)
  //   showContent(data.media[keys[0]])
  // else
    showCards(data.media, keys)
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.action == 'add') {
    console.log('add', changes.item)
    // showCards(changes.media, keys)
  }
  if (changes.action == 'remove') {
    console.log('remove', changes.item)
  }
})

// single content
function showContent(item) {
  console.log('showing content')
  const clone = contentTemplate.content.cloneNode(true)
  const playBtn = clone.querySelector("button[name='mid']")
  const gotoBtn = clone.querySelector("button[name='goto']")
  const pipBtn  = clone.querySelector("button[name='pip']")
  const repeatBtn = clone.querySelector("button[name='repeat']")
  gotoBtn.onclick   = onGotoClick(item.tabId)
  pipBtn.onclick    = onPipClick(item.tabId, pipBtn)
  repeatBtn.onclick = onRepeatClick(item.tabId, repeatBtn)
  chrome.tabs.sendMessage(item.tabId, {askInitInfo: true}, response => {
    clone.querySelector('h3').innerText = response.title
    clone.querySelector('p').innerText = response.channel
    clone.querySelector('img').src = `https://img.youtube.com/vi/${response.videoId}/mqdefault.jpg`
    playBtn.onclick = onPlayClick(item.tabId, playBtn, response.isPlaying)
    app.appendChild(clone)
  })
  
  // remove original cards
  // let newDiv = document.createElement('div')
  // newDiv.id = 'list'
  // app.replaceChild(document.querySelector('#list'), newDiv)
}

// multiple contents
function showCards(data, keys) {
  const listMount = document.querySelector('#listMount')
  console.log('card data', data)
  
  for (let key of keys) {
    const currItem = data[key]
    chrome.tabs.sendMessage(currItem.tabId, {askInitInfo: true}, response => {
      let cardClone = cardTemplate.content.cloneNode(true)
      
      // init info
      cardClone.firstElementChild.id = key
      cardClone.querySelector("[name='title']").innerText = response.title
      cardClone.querySelector("[name='channel']").innerText = response.channel
      // cardClone.querySelector('img').src = `https://img.youtube.com/vi/${response.videoId}/default.jpg`
      // cardClone.firstElementChild.firstElementChild.onclick = cardClickHandler()
      
      // init control
      const controlMount = cardClone.querySelector('[name=controlMount]')
      const controlClone = initControl(currItem.tabId, response.isPlaying, response.next)
      controlMount.appendChild(controlClone)
      listMount.appendChild(cardClone)
    })
  }
}

function initControl(tabId, isPlaying, url) {
  let controlClone = controlTemplate.content.cloneNode(true)
  const gotoBtn = controlClone.querySelector("button[name='goto']")
  const pipBtn  = controlClone.querySelector("button[name='pip']")
  const playBtn = controlClone.querySelector("button[name='play']")
  const nextBtn = controlClone.querySelector("button[name='next']")
  const repeatBtn = controlClone.querySelector("button[name='repeat']")
  
  playBtn.onclick = onPlayClick(tabId, playBtn, isPlaying)
  gotoBtn.onclick   = onGotoClick(tabId)
  pipBtn.onclick    = onPipClick(tabId, pipBtn)
  nextBtn.onclick   = onNextClick(tabId, url, nextBtn)
  repeatBtn.onclick = onRepeatClick(tabId, repeatBtn)

  return controlClone
}

/////////////////
// control bar //
/////////////////

function onGotoClick(tabId) {
  return function(event) {
    chrome.tabs.update(tabId, {active: true})
  }
}

function onPipClick(tabId, btn, setPip) {
  // let icon = btn.querySelector('i')
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

function onPlayClick(tabId, btn, isPlaying) {
  let icon = btn.querySelector('i')
  // set initial status
  if (isPlaying) {
    icon.classList.toggle('fa-pause')
    icon.classList.toggle('fa-play')
  }

  return function(event) {
    // icon.classList.toggle('fa-pause')
    // icon.classList.toggle('fa-play')
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

function onNextClick(tabId, url, btn) {
  // todo: bound hover effect
  return function() {
    // todo: update
    chrome.tabs.update(tabId, {url})
  }
}

function onRepeatClick(tabId, btn) {
  let setRepeat = false
  return function(event) {
    console.log('loop is', setRepeat)
    if (setRepeat) {
      btn.classList.remove('active')
      chrome.tabs.sendMessage(tabId, {control: 'unsetRepeat'})
    } else {
      btn.classList.add('active')
      chrome.tabs.sendMessage(tabId, {control: 'setRepeat'})
    }
    setRepeat = !setRepeat
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
