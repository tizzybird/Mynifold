'use strict';
console.log("background is running")

// chrome.tabs.onAttached.addListener(function(tabId, detachInfo) {
//   console.log("attach", detachInfo)
// })

// chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
//   console.log("detach", detachInfo)
// })

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  console.log("closing", tabId, removeInfo)
  chrome.storage.sync.get(['media'], data => {
    let mediaItems = data.media || {}
    if (mediaItems != undefined && mediaItems[tabId] != undefined) {
      console.log('deleting ' + tabId)
      delete mediaItems[tabId]
      chrome.storage.sync.set({
        media: mediaItems,
        action: 'delete',
        item: tabId
      }, function() {console.log("deletion done!")})
    }
  })
})

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == 'loading') {
    if (changeInfo.url != undefined && changeInfo.url.match('youtube.com/watch.')) {
      chrome.storage.sync.get(['media'], data => {
        let mediaItems = data.media || {}
        // 1. not in store, create
        if (mediaItems[tabId] == undefined) {
          chrome.tabs.executeScript(tabId, {file: 'content.js'})
        // 2. in store, reset; // send message to tabId
        } else {
          console.log('reset!')
          chrome.tabs.sendMessage(tabId, {content: 'reset'})
        }
        console.log('add favIcon', tab)
        mediaItems[tabId] = {
          tabId: tabId,
          windowId: tab.windowId,
          favIconUrl: tab.favIconUrl,
          url: tab.url,
          isActive: true
        }
        // update to the data store
        chrome.storage.sync.set({
          media: mediaItems,
          action: 'add',
          item: tabId
        })
      })
    } else {
      chrome.storage.sync.get(['media'], data => {
        let mediaItems = data.media || {}
        // 3. update status of the mediaItem
        if (mediaItems != undefined && mediaItems[tabId] != undefined) {
          mediaItems[tabId]['isActive'] = false
          chrome.storage.sync.set({
            media: mediaItems,
            action: 'freeze',
            item: tabId
          })
        }
        // 4. nothing match, do nothing
      })
    }
  }
})
