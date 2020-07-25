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
  chrome.storage.sync.get(['media'], data => {
    let mediaItems = data.media || {}
    if (mediaItems != undefined && mediaItems[tabId] != undefined) {
      console.log('deleting ' + tabId)
      delete mediaItems[tabId]
      chrome.storage.sync.set({
        media: mediaItems,
        action: {
          operation: 'delete',
          item: tabId
        }
      }, function() {console.log("deletion done!")})
    }
  })
})

// let watchList = []
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // console.log(tabId, changeInfo)
  if (changeInfo.status == 'loading') {
    if (changeInfo.url != undefined && changeInfo.url.match('youtube.com/watch.')) {
      chrome.storage.sync.get(['media'], data => {
        let mediaItems = data.media || {}

        // 1. not in store, create
        if (mediaItems[tabId] == undefined) {
          console.log('case1: creating!')
          mediaItems[tabId] = {
            tabId: tabId,
            windowId: tab.windowId,
            favIconUrl: tab.favIconUrl,
            history: [],
            url: tab.url,
            isActive: true
          }
          chrome.tabs.executeScript(tabId, {file: 'content.js'}, response => {
            chrome.storage.sync.set({
              media: mediaItems,
              action: {
                operation: 'create',
                item: tabId
              }
            })
          })
          
        // 2. in store, reset; // send message to tabId
        } else {
          console.log('case2: resetting!')
          let oldItem = mediaItems[tabId]
          let newItem = {
            tabId: tabId,
            windowId: tab.windowId,
            favIconUrl: tab.favIconUrl,
            history: oldItem.history,
            url: tab.url,
            isActive: true
          }
          newItem.history.push(oldItem.url)
          mediaItems[tabId] = newItem

          chrome.tabs.sendMessage(tabId, {content: 'reset'}, response => {
            // reset error, content script doesn't exist
            if (response == undefined) {
              console.log('case2.1: recreating')
              chrome.tabs.executeScript(tabId, {file: 'content.js'}, response => {
                chrome.storage.sync.set({
                  media: mediaItems,
                  action: {
                    operation: 'recreate',
                    item: tabId
                  }
                })
              })
            } else {
              console.log('case2.2: reconnecting')
              chrome.storage.sync.set({
                media: mediaItems,
                action: {
                  operation: 'reset',
                  item: tabId
                }
              })  
            }
          })
        }
      })
    } else {
      chrome.storage.sync.get(['media'], data => {
        let mediaItems = data.media || {}
        // 3. update status of the mediaItem
        if (mediaItems != undefined && mediaItems[tabId] != undefined) {
          mediaItems[tabId]['isActive'] = false
          // todo: history
          console.log('case3: turnning inactive')
          chrome.storage.sync.set({
            media: mediaItems,
            action: {
              operation: 'freeze',
              item: tabId
            }
          })
        }
        // 4. nothing match, do nothing
      })
    }
  }
})

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
