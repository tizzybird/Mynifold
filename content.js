let video = null
let setPropagation = true
let isPlaying = false
let isInPip = false

console.log("content script is running", document.readyState)
initialize()
// document.addEventListener('readystatechange', (event) => {
//     console.log(document.readyState, event)
//     // log.textContent = log.textContent + `readystate: ${document.readyState}\n`;
// });

function initialize(isReset=false) {
    console.log('initializing content script..')
    // video = null
    setPropagation = true
    isPlaying = isReset ? true : false
    isInPip = false

    if (!isReset) {
        let videoFetcher = setTimeout(function fetch() {
            console.log("fetching the video..")
            video = document.querySelector('video')
            
            if (video == null)
                videoFetcher = setTimeout(fetch, 300)

            registerVideoEventHandlers(video)
        }, 300)
    }
}

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
            if (counter == 20) {
                console.log('in reject')
                reject({error: true})
            }
            // console.log('avatar', document.querySelector('yt-img-shadow#avatar.ytd-video-owner-renderer').querySelector('img').src)
            if (document.readyState != 'complete') {
                counter++
                timer = setTimeout(check, 500)
            }

            // let res =  document.querySelector('yt-img-shadow#avatar.ytd-video-owner-renderer')
            // if (res == undefined || res.querySelector('img').src.length == 0) {
            //     counter++
            //     timer = setTimeout(check, 500)
            // }

            let url = window.location.href
            let result = {isPlaying, isInPip}
            result['title']     = document.querySelector('h1').children[0].innerText
            result['channel']   = document.querySelector('div#upload-info.style-scope').querySelector('a').innerText
            result['videoId']   = url.split("&")[0].split("v=")[1]
            result['next']      = document.querySelector('ytd-compact-autoplay-renderer').querySelector('#thumbnail').href
            result['nextTitle'] = document.querySelector('ytd-compact-autoplay-renderer').querySelector('#video-title').innerText
            result['loop']      = video.loop
            result['avatar']    = document.querySelector('yt-img-shadow#avatar.ytd-video-owner-renderer').querySelector('img').src
            console.log(result)
            resolve(result)
        }, 500)
    })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.content == 'reset') {
        console.log('resetting content script')
        initialize(true)
        sendResponse({success: true})
        return true
    }
    
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
        console.log('received by content, sender is', sender)
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
