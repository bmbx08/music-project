// Client ID: f2ff519639164451a2d80c6b9ad2ae26
// Client secret: 499b6bfabe374ee19f50a27e34a38438

// let redirect_uri = "https://makeratplay.github.io/SpotifyWebAPI/";
let redirect_uri = "http://127.0.0.1:5500/index.html"; //본인 html 여기에 삽입하기
 

let client_id = ""; 
let client_secret = ""; // In a real app you should not expose your client_secret to the user


const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token";

function onPageLoad(){
    client_id = localStorage.getItem("client_id");
    client_secret = localStorage.getItem("client_secret");
    
    if(window.location.search.length>0){
        handleRedirect(); 
    }
}

function handleRedirect(){ //html 뒤에 query가 붙을 시 다른 페이지로 이동
    let code = getCode(); 
    fetchAccessToken(code);
    window.history.pushState("","", redirect_uri); //url에서 param 제거
}

function getCode(){ //html 뒤에 query 값을 code 변수에 저장
    let code = null;
    const queryString = window.location.search;
    if(queryString.length>0){
        const urlParams = new URLSearchParams(queryString); //url 라이브러리 사용할 수 있게 URL인스턴스로 변경
        code = urlParams.get('code')
    }
    return code;
}

function fetchAccessToken(code){ //받은 code를 이용해서 access token 받기(서버에 post형식으로 신청)
    let body = "grant_type=authorization_code";
    body += "&code=" + code; 
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;
    callAuthorizationApi(body);
}

function callAuthorizationApi(body){ //XMLhttp 형식으로 인코딩해서 token 요구하기
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true); //XMLHttpRequest 라이브러리 함수 사용
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}


function handleAuthorizationResponse(){ //토큰요청 성공(200반응)시 토큰 로컬저장소에 저장
    if ( this.status == 200 ){
        var data = JSON.parse(this.responseText);
        console.log(data);
        var data = JSON.parse(this.responseText);
        if ( data.access_token != undefined ){
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token); //토큰을 로컬저장소에 저장
        }
        if ( data.refresh_token  != undefined ){
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token); //리프레쉬 토큰도 저장
        }
        onPageLoad();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function requestAuthorization(){ //spotify user에게 허가 받기
    client_id = document.getElementById("clientId").value;
    client_secret = document.getElementById("clientSecret").value;
    localStorage.setItem("client_id", client_id);
    localStorage.setItem("client_secret", client_secret); // In a real app you should not expose your client_secret to the user

    let url = AUTHORIZE;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
    window.location.href = url; // 스포티파이 사용자 허가 페이지로 이동, 이후 code를 query로 붙이고 redirect_uri로 재이동
};
