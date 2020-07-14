console.log("content script is running", document.readyState)

let video = null
let setPropagation = true
let isPlaying = false
let isInPip = false
let info = null
document.addEventListener('readystatechange', event => {
    if (document.readyState == 'complete') {
        video = document.querySelector('video')
        registerVideoEventHandlers(video)
        console.log('registering from content')
        chrome.runtime.sendMessage({ media: 'register'}, response => {
            info = response
        })    
    }
})

// window.addEventListener('load', event => {
//     video = document.querySelector('video')
//     registerVideoEventHandlers(video)
//     console.log('registering from content')
//     chrome.runtime.sendMessage({ media: 'register'}, response => {
//         info = response
//     })
// })

window.addEventListener('beforeunload', event => {
    chrome.runtime.sendMessage({ media: 'unregister'}, response => {
        console.log('content script is closed')
    })
})

function registerVideoEventHandlers(video) {
    video.addEventListener('playing', event => {
        console.log('playing')
        isPlaying = true
        if (setPropagation) chrome.runtime.sendMessage({videoEvent: 'playing'})
        else setPropagation = true
    })
    video.addEventListener('pause', event => {
        console.log('pause')
        isPlaying = false
        if (setPropagation) chrome.runtime.sendMessage({videoEvent: 'pause'})
        else setPropagation = true
    })
    video.addEventListener('enterpictureinpicture', () => {
        console.log('inpip')
        isInPip = true
        if (setPropagation) chrome.runtime.sendMessage({videoEvent: 'enterpip'})
        else setPropagation = true
    });
    video.addEventListener('leavepictureinpicture', () => {
        console.log('outpip')
        isInPip = false
        if (setPropagation) chrome.runtime.sendMessage({videoEvent: 'leavepip'})
        else setPropagation = true
    });
}

function fetchCurrentInfo() {
    return new Promise((resolve, reject) => {
        let counter = 0
        let timer = setTimeout(function check() {
            console.log(document.readyState, counter)
            if (counter == 10)
                reject({error: true})
            if (document.readyState == 'loading') {
                counter++
                timer = setTimeout(check, 300)
            }
        }, 300)
        
        let url = info == null ? window.location.href : info.url
        let result = {isPlaying, isInPip}
        result['title']     = document.querySelector('h1').children[0].innerText
        result['channel']   = document.querySelector('#channel-name').querySelector('a').innerText
        result['videoId']   = url.split("&")[0].split("v=")[1]
        result['next']      = document.querySelector('ytd-compact-autoplay-renderer')
                                .querySelector('#thumbnail').href
        console.log(result)
        resolve(result)
    })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.control == 'play') {
        setPropagation = false
        video.play().then(result => {
            sendResponse({success: true})
        }).catch(err => {
            sendResponse({error: true})
        })
        return true
    } else if (request.control == 'pause') {
        setPropagation = false
        video.pause()
    } else if (request.control == 'setRepeat') {
        video.loop = true
    } else if (request.control == 'unsetRepeat') {
        video.loop = false
    } else if (request.askInitInfo) {
        console.log('receive')
        fetchCurrentInfo().then(res => {
            console.log(res)
            sendResponse(res)
        }, err => {
            sendResponse(err)
        })
        return true
    } else if (request.control == 'setPip') {
        setPropagation = false
        video.requestPictureInPicture()
        // video.requestPictureInPicture().catch(error => {
        //     sendResponse({error: true})
        // })
        // return true
    } else if (request.control == 'unsetPip') {
        setPropagation = false
        document.exitPictureInPicture()
        // document.exitPictureInPicture().catch(error => {
        //     sendResponse({error: true})
        // })
        // return true
    }
})
