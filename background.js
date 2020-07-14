'use strict';

let refresh = false
console.log("background is running")
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  console.log(changeInfo, tab)
  // if (changeInfo.status == 'loading') {
  //   if (changeInfo.url != undefined && changeInfo.url.match('*://*youtube.com/watch*')) {
  //     let newItem = {
  //       tabId: 
  //       url: sender.url
  //     }
  //   } else {

  //   }
  // }
  // alert('updated from contentscript');
  // console.log('youtube', changeInfo)
})
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.media == 'register') {
    console.log('registering a media')
    let newItem = {
      tabId: sender.tab.id,
      favIconUrl: sender.tab.favIconUrl,
      url: sender.url
    }
    if (refresh) {
      chrome.storage.sync.clear(() => {
        console.log('storage is cleared')
        chrome.storage.sync.get(['media'], data => {
          console.log(data)
          let mediaItems = data.media || {}
          mediaItems[sender.tab.id] = newItem
          // mediaItems.push(newItem)
          chrome.storage.sync.set({
            media: mediaItems,
            action: 'add',
            item: sender.tab.id
          }, () => { sendResponse(Object.assign({}, newItem)) })
        })
      })
      
    } else {
      chrome.storage.sync.get(['media'], data => {
        let mediaItems = data.media || {}
        mediaItems[sender.tab.id] = newItem
        chrome.storage.sync.set({
          media: mediaItems,
          action: 'add',
          item: sender.tab.id
        }, () => { sendResponse(Object.assign({}, newItem)) })
      })
    }
  }
  // TODO
  if (request.media == 'unregister') {
    console.log('unregistering media ', sender.tab.id)
    chrome.storage.sync.get(['media'], data => {
      let mediaItems = data.media
      delete mediaItems[sender.tab.id]
      chrome.storage.sync.set({
        media: mediaItems,
        action: 'remove',
        item: sender.tab.id
      }, () => { sendResponse({ done: true }) })
    })
  }
  return true
})
