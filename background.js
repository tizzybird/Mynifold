'use strict';

chrome.storage.sync.clear()
console.log("background is running")

// TODO: fetch static tabs and add them into store

// chrome.tabs.onAttached.addListener(function(tabId, detachInfo) {
//   console.log("attach", detachInfo)
// })

// chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
//   console.log("detach", detachInfo)
// })

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  console.log("closing", tabId, removeInfo)
  const key = `${tabId}`
  chrome.storage.sync.remove(key)
})

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // console.log(tabId, changeInfo, tab)
  if (changeInfo.status == 'complete') {
    const key = `${tabId}`
    if (tab.url.match('youtube.com/watch.')) {
      chrome.tabs.sendMessage(tabId, {content: 'reset'}, response => {
        // if there is no content script running
        let updatedItem = {
          tabId: tabId,
          windowId: tab.windowId,
          favIconUrl: tab.favIconUrl,
          // history: item.history,
          url: tab.url
          // isActive: true
        }
        if (response == undefined) {
          console.log('case1: creating')
          chrome.tabs.executeScript(tabId, {file: 'content.js'}, response => {
            chrome.storage.sync.set({
              [key]: updatedItem
            })
          })
        } else {
          console.log('case2: reconnecting')
          chrome.storage.sync.set({
            [key]: updatedItem
          })
        }
      })
    // leaving from youtube
    } else {
      // TODO: put into history
      chrome.storage.sync.get(key, data => {
        if (data[key] != undefined) {
          console.log('case3: removing from store', data, changeInfo, tab)
          chrome.storage.sync.remove(key)  
        }
      })
    }
  }
})

/*
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.content == 'back') {
    console.log('going to prev url')
    chrome.storage.sync.get(['media'], data => {
      let mediaItems = data.media || {}
      mediaItems[request.tabId].history.pop() // current
      let prevUrl = mediaItems[request.tabId].history.pop() // prev, would be pushed again by update

      chrome.storage.sync.set({
        media: mediaItems,
        action: {
          operation: 'back',
          item: request.tabId
        }
      }, function() {
        sendResponse({success: true})
        chrome.tabs.update(request.tabId, {url: prevUrl})
      })
    })
    return true
  }
})
*/