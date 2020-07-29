'use strict';
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
  let key = 'item-' + tabId
  if (changeInfo.status == 'loading' && changeInfo.url != undefined) {
    if (changeInfo.url.match('youtube.com/watch.')) {
      chrome.storage.sync.get(null, store => {
        // 1. not in store, create
        console.log(store, ' key is', key)
        if (store[key] == undefined) {
          console.log('case1: creating!')
          chrome.storage.sync.set(
            {
              [key]: {
                tabId: tabId,
                windowId: tab.windowId,
                // favIconUrl: tab.favIconUrl,
                // history: [],
                url: tab.url,
                isActive: true
              }
            }, function() {
              chrome.storage.sync.get(key, k => {console.log(k)})
              if(chrome.runtime.lastError){
                console.log('not Saved', chrome.runtime.lastError)
              }  
              chrome.tabs.executeScript(tabId, {file: 'content.js'})
            }
          )
        // 2. in store, reset; // send message to tabId
        } else {
          console.log('case2: resetting!')
          let updatedItem = {
            tabId: tabId,
            windowId: tab.windowId,
            // favIconUrl: tab.favIconUrl,
            // history: item.history,
            url: tab.url,
            isActive: true
          }
          chrome.tabs.sendMessage(tabId, {content: 'reset'}, response => {
            // reset error, content script doesn't exist
            if (response == undefined) {
              console.log('case2.1: recreating')
              chrome.tabs.executeScript(tabId, {file: 'content.js'}, response => {
                chrome.storage.sync.set({
                  [key]: updatedItem
                  // action: {
                  //   operation: 'recreate',
                  //   item: key
                  // }
                })
              })
            } else {
              console.log('case2.2: reconnecting')
              chrome.storage.sync.set({
                [key]: updatedItem
                // action: {
                //   operation: 'reconnect',
                //   item: key
                // }
              })
            }
          })
        }
      })
    } else {
      console.log('case3: updating', changeInfo)
      chrome.storage.sync.remove(key)
      // chrome.storage.sync.get(['media'], data => {
      //   let mediaItems = data.media || {}
      //   // 3. update status of the mediaItem
      //   if (mediaItems != undefined && mediaItems[tabId] != undefined) {
      //     mediaItems[tabId]['isActive'] = false
      //     // todo: history
      //     chrome.storage.sync.set({
      //       media: mediaItems,
      //       action: {
      //         operation: 'freeze',
      //         item: tabId
      //       }
      //     })
      //   }
      //   // 4. nothing match, do nothing
      // })
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