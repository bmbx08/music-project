/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code with PKCE oAuth2 flow to authenticate 
 * against the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

const clientId = 'f2ff519639164451a2d80c6b9ad2ae26'; // your clientId
const redirectUrl = 'http://127.0.0.1:5501/index.html';        // your redirect URL - must be localhost URL and/or HTTPS

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'user-read-private user-read-email';

let recommendsList=[];
let recentAlbumsList=[];
let albumNum=7;
//let recommendsNum=7;


// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
  get access_token() { return localStorage.getItem('access_token') || null; },
  get refresh_token() { return localStorage.getItem('refresh_token') || null; },
  get expires_in() { return localStorage.getItem('refresh_in') || null },
  get expires() { return localStorage.getItem('expires') || null },

  save: function (response) {
    const { access_token, refresh_token, expires_in } = response;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('expires_in', expires_in);

    const now = new Date();
    const expiry = new Date(now.getTime() + (expires_in * 1000));
    localStorage.setItem('expires', expiry);
  }
};

const args = new URLSearchParams(window.location.search);
const code = args.get('code');

if (code) {
  const token = await getToken(code);
  currentToken.save(token);

  const url = new URL(window.location.href);
  url.searchParams.delete("code");

  const updatedUrl = url.search ? url.href : url.href.replace('?', '');
  window.history.replaceState({}, document.title, updatedUrl);
}

if (currentToken.access_token) {
  const userData = await getUserData();
  renderTemplate("main", "logged-in-template", userData);
  renderTemplate("oauth", "oauth-template", currentToken);
}

if (!currentToken.access_token) {
  renderTemplate("main", "login");
}

async function redirectToSpotifyAuthorize() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const randomString = randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");

  const code_verifier = randomString;
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);

  const code_challenge_base64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  window.localStorage.setItem('code_verifier', code_verifier);

  const authUrl = new URL(authorizationEndpoint)
  const params = {
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: code_challenge_base64,
    redirect_uri: redirectUrl,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

// 스포티파이 API 호출
async function getToken(code) {
  const code_verifier = localStorage.getItem('code_verifier');

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: code_verifier,
    }),
  });

  return await response.json();
}

async function refreshToken() {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token
    }),
  });

  return await response.json();
}

async function getUserData() {
  const response = await fetch("https://api.spotify.com/v1/me", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + currentToken.access_token },
  });
  let userData= await response.json();
  console.log("userdata",userData);
  return userData;
}

// Click handlers
async function loginWithSpotifyClick() {
  await redirectToSpotifyAuthorize();
}

async function logoutClick() {
  localStorage.clear();
  window.location.href = redirectUrl;
}

async function refreshTokenClick() {
  const token = await refreshToken();
  currentToken.save(token);
  renderTemplate("oauth", "oauth-template", currentToken);
}




// HTML Template Rendering with basic data binding - demoware only.
//renderTemplate("main", "logged-in-template", userData);
function renderTemplate(targetId, templateId, data = null) {
  const template = document.getElementById(templateId);
  const clone = template.content.cloneNode(true);
  console.log(clone);

  const elements = clone.querySelectorAll("*");
  elements.forEach(ele => {
    const bindingAttrs = [...ele.attributes].filter(a => a.name.startsWith("data-bind"));

    bindingAttrs.forEach(attr => {
      const target = attr.name.replace(/data-bind-/, "").replace(/data-bind/, "");
      const targetType = target.startsWith("onclick") ? "HANDLER" : "PROPERTY";
      const targetProp = target === "" ? "innerHTML" : target;

      const prefix = targetType === "PROPERTY" ? "data." : "";
      const expression = prefix + attr.value.replace(/;\n\r\n/g, "");

      // Maybe use a framework with more validation here
      try {
        ele[targetProp] = targetType === "PROPERTY" ? eval(expression) : () => { eval(expression) };
        ele.removeAttribute(attr.name);
      } catch (ex) {
        console.error(`Error binding ${expression} to ${targetProp}`, ex);
      }
    });
  });

  const target = document.getElementById(targetId);
  target.innerHTML = "";
  target.appendChild(clone);
}


//자료 불러올 때 이 함수 사용하기
const getGenres= async ()=> {
  const response = await fetch("https://api.spotify.com/v1/recommendations/available-genre-seeds", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + currentToken.access_token },
  });
  let genres= await response.json();
  console.log("genres", genres);
  return genres;
}

const getRecommendations= async (genre,limit)=> {
  const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_genres=${genre}&limit=${limit}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + currentToken.access_token },
  });
  let recommends= await response.json();
  recommendsList = recommends.tracks;
  console.log("Recommendations",recommends);
  console.log("RecommendsList",recommendsList);
  renderRecommends();
}

const renderRecommends=()=>{
  const recommendsHTML = recommendsList.map(
    (track) =>
      `
      <div  class="music-container-main border">
        <img class="album-img-size" src=${track.album.images[0].url}>
        <div class="music-container-title container hide-overflow fs-5">
          ${track.name}
        </div>
        <div class="music-container-artist container hide-overflow fs-6">
          ${track.artists[0].name}
        </div>
      </div>
      `


  ).join('');

  console.log("recommendsHTML",recommendsHTML);
  document.getElementById("print-recommends").innerHTML = recommendsHTML;
}

const getRecentAlbums= async (limit)=> {
  const response = await fetch(`https://api.spotify.com/v1/browse/new-releases?limit=${limit}&offset=0`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + currentToken.access_token },
  });
  const albumsData = await response.json();
  recentAlbumsList = albumsData.albums.items
  console.log("Recent Albums",recentAlbumsList);
  renderRecentAlbums();
}

const renderRecentAlbums=()=>{
  const recentAlbumsHTML = recentAlbumsList.map(
    (album) =>
      `
      <div  class="music-container-main border">
        <img class="album-img-size" src=${album.images[0].url}>
        <div class="music-container-title container hide-overflow fs-5">
          ${album.name}
        </div>
        <div class="music-container-artist container hide-overflow fs-6">
          ${album.artists[0].name}
        </div>
      </div>
      `
  ).join('');
  console.log("HTML: ",recentAlbumsHTML)
  document.getElementById("print-recent-albums").innerHTML = recentAlbumsHTML;
}

const getMoreAlbums = () => {
  albumNum+=14;
  getRecentAlbums(albumNum);
}

const renderMain = () => {
  getRecommendations("k-pop",14);
  getRecentAlbums(7);
}

renderMain();