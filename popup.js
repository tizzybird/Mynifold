'use strict';

const app = document.querySelector('#app')
const contentTemplate = document.querySelector('template#content')
const cardTemplate = document.querySelector('template#card')
const controlTemplate = document.querySelector('template#control')
// when opening the popup
chrome.storage.sync.get(['media'], function(data) {
  if (data.media == undefined)
    return

  // let keys = Object.keys(data.media)
  // console.log(data)
  showCards(data.media)
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.log(changes)
  // if (changes.action == 'add') {
  //   console.log('add', changes.item)
  //   // showCards(changes.media)
  // }
  // if (changes.action == 'remove') {
  //   console.log('remove', changes.item)
  // }
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

// multiple contents
function showCards(data) {
  const keys = Object.keys(data)
  const listMount = document.querySelector('#listMount')
  console.log('card data', data)
  // keys.sort((a, b) => a - b)
  for (let key of keys) {
    const currItem = data[key]
    if (!currItem.isActive)
      continue

    // since this is async, the order may not be precise
    chrome.tabs.sendMessage(currItem.tabId, {askInitInfo: true}, response => {
      let cardClone = cardTemplate.content.cloneNode(true)
      
      // init info
      cardClone.firstElementChild.id = key
      cardClone.querySelector("[name='title']").innerText = response.title
      cardClone.querySelector("[name='channel']").innerText = response.channel
      cardClone.querySelector("[name='avatar'").src = response.avatar
      // cardClone.querySelector('img').src = `https://img.youtube.com/vi/${response.videoId}/default.jpg`
      // cardClone.firstElementChild.firstElementChild.onclick = cardClickHandler()
      
      // init control
      const controlMount = cardClone.querySelector('[name=controlMount]')
      const controlClone = initControl(currItem.tabId, response)
      controlMount.appendChild(controlClone)
      listMount.appendChild(cardClone)
    })
  }
}

function initControl(tabId, info) {
  let controlClone = controlTemplate.content.cloneNode(true)
  const gotoBtn = controlClone.querySelector("button[name='goto']")
  const pipBtn  = controlClone.querySelector("button[name='pip']")
  const playBtn = controlClone.querySelector("button[name='play']")
  const nextBtn = controlClone.querySelector("button[name='next']")
  const repeatBtn = controlClone.querySelector("button[name='repeat']")
  
  playBtn.onclick = onPlayClick(tabId, playBtn, info.isPlaying)
  gotoBtn.onclick   = onGotoClick(tabId)
  pipBtn.onclick    = onPipClick(tabId, pipBtn, info.isInPip)
  nextBtn.onclick   = onNextClick(tabId, nextBtn, info.next)
  repeatBtn.onclick = onRepeatClick(tabId, repeatBtn, info.loop)

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

function onRepeatClick(tabId, btn, setRepeat) {
  if (setRepeat)
    btn.classList.toggle('active')

  return function(event) {
    btn.classList.toggle('active')
    if (btn.classList.contains('active')) {
      // btn.classList.remove('active')
      chrome.tabs.sendMessage(tabId, {control: 'setRepeat'})
      // chrome.tabs.sendMessage(tabId, {control: 'unsetRepeat'})
    } else {
      // btn.classList.add('active')
      // chrome.tabs.sendMessage(tabId, {control: 'setRepeat'})
      chrome.tabs.sendMessage(tabId, {control: 'unsetRepeat'})
    }
    // setRepeat = !setRepeat
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

function onNextClick(tabId, btn, url) {
  // todo: bound hover effect
  return function() {
    // todo: update
    chrome.tabs.update(tabId, {url})
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
