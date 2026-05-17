import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface MapStop {
  name: string;
  latitude: number;
  longitude: number;
}

interface Props {
  busLocation?: { lat: number; lng: number };
  stops?: MapStop[];
  visitedStopIndices?: number[];   // indices of already-visited stops
  studentStopIndex?: number;
  busSpeed?: number;               // m/s
  mode?: 'driver' | 'student';
  onEtaUpdate?: (eta: number | null, dist: number | null, spd: number | null) => void;
}

export default function OpenStreetMap({
  busLocation = { lat: 16.65, lng: 74.27 },
  stops = [],
  visitedStopIndices = [],
  studentStopIndex,
  busSpeed = 0,
  mode = 'student',
  onEtaUpdate,
}: Props) {
  const webViewRef = useRef<WebView>(null);

  /* Inject updates without re-rendering the WebView */
  useEffect(() => {
    if (!webViewRef.current) return;
    const spd = (busSpeed || 0) * 3.6;
    const vis = (visitedStopIndices || []).join(',');
    webViewRef.current.injectJavaScript(
      `if(window.RN_update)window.RN_update(${busLocation.lat},${busLocation.lng},${spd},[${vis}]);true;`
    );
  }, [busLocation, busSpeed, visitedStopIndices]);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'eta' && onEtaUpdate) onEtaUpdate(d.eta, d.dist, d.spd);
    } catch (_) {}
  };

  const vs = stops.filter(s => s.latitude && s.longitude);
  const cLat = vs[0]?.latitude  ?? busLocation.lat;
  const cLng = vs[0]?.longitude ?? busLocation.lng;
  const sSt  = studentStopIndex !== undefined ? (vs[studentStopIndex] ?? null) : null;

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{height:100vh;width:100vw;background:#0f172a}
@keyframes pulseBlue{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.7)}70%{box-shadow:0 0 0 10px rgba(59,130,246,0)}}
@keyframes pulseAmber{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.7)}70%{box-shadow:0 0 0 10px rgba(245,158,11,0)}}
.lp-wrap{background:#1e293b!important;color:#f1f5f9!important;border:1px solid #334155!important;border-radius:10px!important}
.leaflet-popup-tip{background:#1e293b!important}
</style></head><body>
<div id="map"></div>
<script>
var STOPS=${JSON.stringify(vs)};
var STUDENT_IDX=${sSt ? (studentStopIndex ?? -1) : -1};
var STUDENT_STOP=${JSON.stringify(sSt)};
var MODE='${mode}';
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${cLat},${cLng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

/* ── Helpers ─────────────────────────────────────────── */
function hvs(a,b,c,d){
  var R=6371,dL=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180;
  var x=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dl/2)*Math.sin(dl/2);
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function brg(a,b,c,d){
  var y=Math.sin((d-b)*Math.PI/180)*Math.cos(c*Math.PI/180);
  var x=Math.cos(a*Math.PI/180)*Math.sin(c*Math.PI/180)-Math.sin(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.cos((d-b)*Math.PI/180);
  return((Math.atan2(y,x)*180/Math.PI)+360)%360;
}

/* ── Bus marker ──────────────────────────────────────── */
function makeBusIcon(deg){
  return L.divIcon({
    html:'<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 0 5px rgba(59,130,246,.35),0 4px 14px rgba(0,0,0,.5);position:relative">'
      +'🚌'
      +'<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%) rotate('+deg+'deg);transform-origin:center 16px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #93c5fd"></div>'
      +'</div>',
    className:'',iconSize:[44,44],iconAnchor:[22,22],popupAnchor:[0,-25]
  });
}
var currentBearing=0;
var busMarker=L.marker([${busLocation.lat},${busLocation.lng}],{icon:makeBusIcon(0),zIndexOffset:1000}).addTo(map);

/* ── Stop markers ────────────────────────────────────── */
function makeStopIcon(i,visited,isNext,isStudent){
  var sz,bg,border,content,extra='';
  if(visited){sz=30;bg='#22c55e';border='#86efac';content='✓';extra='opacity:.9'}
  else if(isNext){sz=36;bg='#3b82f6';border='#93c5fd';content='▶';extra='animation:pulseBlue 1.5s infinite'}
  else if(isStudent){sz=34;bg='#f59e0b';border='#fcd34d';content='📍';extra='animation:pulseAmber 2s infinite'}
  else{sz=28;bg=(i===0)?'#4ade80':(i===STOPS.length-1)?'#f87171':'#475569';border='rgba(255,255,255,.4)';content=String(i+1)}
  return L.divIcon({
    html:'<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+bg+';border:2px solid '+border+';display:flex;align-items:center;justify-content:center;font-size:'+(sz*.38)+'px;font-weight:800;color:#fff;'+extra+';box-shadow:0 2px 8px rgba(0,0,0,.5)">'+content+'</div>',
    className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],popupAnchor:[0,-sz/2]
  });
}
var stopMarkers=[];
STOPS.forEach(function(s,i){
  var isS=i===STUDENT_IDX;
  var isFirst=i===0,isLast=i===STOPS.length-1;
  var popup='<b style="font-size:13px">'+s.name+'</b>'
    +(isS?'<br><span style="color:#f59e0b;font-size:11px">📍 Your Stop</span>':'')
    +(isFirst&&!isS?'<br><span style="color:#4ade80;font-size:11px">🟢 Start</span>':'')
    +(isLast&&!isS?'<br><span style="color:#f87171;font-size:11px">🔴 End</span>':'');
  var m=L.marker([s.latitude,s.longitude],{icon:makeStopIcon(i,false,false,isS)});
  m.bindPopup('<div style="background:#1e293b;color:#f1f5f9;padding:6px;border-radius:6px">'+popup+'</div>',{className:'custom-popup'});
  m.addTo(map);
  stopMarkers.push(m);
});

/* ── OSRM route ──────────────────────────────────────── */
if(STOPS.length>=2){
  var coords=STOPS.map(function(s){return s.longitude+','+s.latitude;}).join(';');
  fetch('https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=full&geometries=geojson')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.routes||!d.routes[0])return;
      var g=d.routes[0].geometry;
      L.geoJSON(g,{style:{color:'#bfdbfe',weight:16,opacity:.12,lineJoin:'round',lineCap:'round'}}).addTo(map);
      L.geoJSON(g,{style:{color:'#fff',weight:10,opacity:.2,lineJoin:'round',lineCap:'round'}}).addTo(map);
      var rl=L.geoJSON(g,{style:{color:'#2563eb',weight:6,opacity:1,lineJoin:'round',lineCap:'round'}}).addTo(map);
      var b=rl.getBounds();
      if(b.isValid())map.fitBounds(b,{padding:[55,55],maxZoom:16});
    })
    .catch(function(){
      var ll=STOPS.map(function(s){return[s.latitude,s.longitude];});
      L.polyline(ll,{color:'#2563eb',weight:6,opacity:.85,dashArray:'10 5'}).addTo(map);
      if(ll.length>1)map.fitBounds(ll,{padding:[55,55]});
    });
}

/* ── Smooth animation ────────────────────────────────── */
var prevLL=null,animReq=null,currentSpd=0;
function animateTo(from,to,dur){
  if(animReq){cancelAnimationFrame(animReq);animReq=null;}
  var t0=Date.now();
  function step(){
    var t=Math.min((Date.now()-t0)/dur,1);
    var e=t<.5?2*t*t:-1+(4-2*t)*t;
    busMarker.setLatLng([from[0]+(to[0]-from[0])*e,from[1]+(to[1]-from[1])*e]);
    if(t<1)animReq=requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Update stop marker icons ────────────────────────── */
function refreshStops(visited){
  var nextIdx=visited.length>0?Math.max.apply(null,visited)+1:0;
  stopMarkers.forEach(function(m,i){
    m.setIcon(makeStopIcon(i,visited.indexOf(i)!==-1,i===nextIdx,i===STUDENT_IDX));
  });
}

/* ── Main update function (called by React Native) ───── */
window.RN_update=function(lat,lng,spdKmh,visited){
  var to=[lat,lng];
  var from=prevLL||to;
  // Calculate bearing from movement
  if(prevLL&&(Math.abs(lat-prevLL[0])>0.00005||Math.abs(lng-prevLL[1])>0.00005)){
    currentBearing=brg(prevLL[0],prevLL[1],lat,lng);
    busMarker.setIcon(makeBusIcon(currentBearing));
  }
  animateTo(from,to,3000);
  prevLL=to;
  if(spdKmh!==undefined)currentSpd=spdKmh;
  if(visited)refreshStops(visited);
  if(MODE==='student')map.panTo(to,{animate:true,duration:.8});

  // ETA to student stop
  if(STUDENT_STOP&&window.ReactNativeWebView){
    var d=hvs(lat,lng,STUDENT_STOP.latitude,STUDENT_STOP.longitude)*1.35;
    var s=currentSpd>3?currentSpd:25;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'eta',eta:Math.max(1,Math.ceil(d/s*60)),dist:d.toFixed(2),spd:s.toFixed(1)}));
  }
};
</script></body></html>`;

  return (
    <View style={s.c}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={s.m}
        scrollEnabled={false}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const s = StyleSheet.create({ c: { flex: 1, backgroundColor: '#0f172a' }, m: { flex: 1 } });
