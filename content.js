let video = null
let setPropagation = true
let isPlaying = false
let isInPip = false

console.log("content script is running", document.readyState)
initialize()

function initialize(isReset=false) {
    if (isReset)    console.log('Initializing content script..')
    else            console.log('Resetting content script...')

    setPropagation = true
    isPlaying = isReset ? true : false
    isInPip = false

    // youtube page updates the url of video tag
    // so there is no need to fetch and assign again
    if (isReset)    return

    let videoFetcher = setTimeout(function fetch() {
        console.log("fetching the video..")
        video = document.querySelector('video')
        
        if (video == null) {
            videoFetcher = setTimeout(fetch, 300)
            return
        }

        registerVideoEventHandlers(video)
    }, 300)
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
            if (counter >= 20) {
                console.log('Failed to fetch current info')
                reject({error: true})
                return
            }
            console.log('avatar', document.querySelector('yt-img-shadow#avatar.ytd-video-owner-renderer').querySelector('img').src)
            if (document.readyState != 'complete') {
                console.log('document is incomplete, refetching')
                counter++
                timer = setTimeout(check, 500)
                return
            }

            // let nextVideo = document.querySelector('ytd-compact-autoplay-renderer')
            let nextLink = document.querySelector('a[class="ytp-next-button ytp-button"]')
            if (nextLink == null || nextLink.href.length == 0 || nextLink.dataset.tooltipText == undefined) {
                console.log('nextLink is null, refetching')
                counter++
                timer = setTimeout(check, 500)
                return
            }

            let url = window.location.href
            let result = {isPlaying, isInPip}
            // result['title']     = document.querySelector('h1').children[0].innerText
            result['title']     = document.title.substring(0, document.title.length-10)
            result['videoId']   = url.split("&")[0].split("v=")[1]
            result['next']      = nextLink.href
            result['nextTitle'] = nextLink.dataset.tooltipText
            result['loop']      = video.loop
            result['channel']   = document.querySelector('div#upload-info.style-scope').querySelector('a').innerText
            result['avatar']    = document.querySelector('yt-img-shadow#avatar.ytd-video-owner-renderer').querySelector('img').src
            console.log('result before sent:', result)
            resolve(result)
        }, 300)
    })
}

function fetchAvatar() {
    return new Promise((resolve, reject) => {
        let counter = 0
        let timer = setTimeout(function check() {
            if (counter >= 20) {
                console.log('Failed to fetch avatar')
                reject({ error: true })
                return
            }

            let res = document.querySelector('yt-img-shadow#avatar.ytd-video-owner-renderer')
            console.log('fetching avatar..', res.querySelector('img').src)
            if (res == null || res.querySelector('img').src.length == 0) {
                console.log('avatar is null, refetching')
                counter++
                timer = setTimeout(check, 500)
                return
            }

            resolve(res.querySelector('img').src)
        }, 300)
    })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.content == 'reset') {
        console.log('Resetting content script')
        initialize(true)
        sendResponse({success: true})
        return true
    }

    if (request.ask == 'initInfo') {
        console.log('received by content, sender is', sender)
        fetchCurrentInfo().then(res => {
            console.log(res)
            sendResponse(res)
        }, err => {
            sendResponse(err)
        })
        return true
    } else if (request.ask == 'avatar') {
        fetchAvatar().then(res => {
            console.log('avatar fetched!')
            sendResponse(res)
        }, err => {
            sendResponse(err)
        })
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
    } else if (request.control == 'setPip') {
        setPropagation = false
        video.requestPictureInPicture()
    } else if (request.control == 'unsetPip') {
        setPropagation = false
        document.exitPictureInPicture()
    }
})   
