(()=>{var On={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Ji={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Wd=0,Rh=1,Xd=2;var fo=1,qd=2,dr=3,ji=0,yn=1,Ke=2,Bn=0,fr=1,$e=2,Ch=3,Ph=4,Yd=5;var vs=100,Zd=101,Kd=102,$d=103,Jd=104,jd=200,Qd=201,tf=202,ef=203,Ih=204,Lh=205,nf=206,sf=207,rf=208,of=209,af=210,lf=211,cf=212,hf=213,uf=214,Na=0,Ua=1,Fa=2,Qs=3,Oa=4,Ba=5,za=6,ka=7,Dh=0,df=1,ff=2,ei=0,po=1,mo=2,go=3,_o=4,xo=5,yo=6,Ms=7;var Nh=300,Qi=301,Ss=302,ml=303,gl=304,vo=306,Ha=1e3,fi=1001,Va=1002,Ye=1003,pf=1004;var Mo=1005;var tn=1006,_l=1007;var ts=1008;var En=1009,Uh=1010,Fh=1011,pr=1012,xl=1013,ni=1014,ii=1015,nn=1016,yl=1017,vl=1018,mr=1020,Oh=35902,Bh=35899,zh=1021,kh=1022,zn=1023,pi=1026,es=1027,Hh=1028,Ml=1029,ns=1030,Sl=1031;var bl=1033,So=33776,bo=33777,Eo=33778,To=33779,El=35840,Tl=35841,wl=35842,Al=35843,Rl=36196,Cl=37492,Pl=37496,Il=37488,Ll=37489,wo=37490,Dl=37491,Nl=37808,Ul=37809,Fl=37810,Ol=37811,Bl=37812,zl=37813,kl=37814,Hl=37815,Vl=37816,Gl=37817,Wl=37818,Xl=37819,ql=37820,Yl=37821,Zl=36492,Kl=36494,$l=36495,Jl=36283,jl=36284,Ao=36285,Ql=36286;var Xr=2300,Ga=2301,La=2302,xh=2303,yh=2400,vh=2401,Mh=2402;var mf=3200;var tc=0,gf=1,Ci="",ze="srgb",qr="srgb-linear",Yr="linear",ie="srgb";var Da=7680;var _f=519,xf=512,yf=513,vf=514,ec=515,Mf=516,Sf=517,nc=518,bf=519,Vh=35044,is=35048;var Gh="300 es",Jn=2e3,tr=2001;function bm(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Em(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Zr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Ef(){let i=Zr("canvas");return i.style.display="block",i}var dd={},er=null;function Kr(...i){let t="THREE."+i.shift();er?er("log",t,...i):console.log(t,...i)}function Tf(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ct(...i){i=Tf(i);let t="THREE."+i.shift();if(er)er("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function It(...i){i=Tf(i);let t="THREE."+i.shift();if(er)er("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function fs(...i){let t=i.join(" ");t in dd||(dd[t]=!0,Ct(...i))}function wf(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var Af={[Na]:Ua,[Fa]:za,[Oa]:ka,[Qs]:Ba,[Ua]:Na,[za]:Fa,[ka]:Oa,[Ba]:Qs},jn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},an=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],fd=1234567,Js=Math.PI/180,nr=180/Math.PI;function bi(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(an[i&255]+an[i>>8&255]+an[i>>16&255]+an[i>>24&255]+"-"+an[t&255]+an[t>>8&255]+"-"+an[t>>16&15|64]+an[t>>24&255]+"-"+an[e&63|128]+an[e>>8&255]+"-"+an[e>>16&255]+an[e>>24&255]+an[n&255]+an[n>>8&255]+an[n>>16&255]+an[n>>24&255]).toLowerCase()}function kt(i,t,e){return Math.max(t,Math.min(e,i))}function Wh(i,t){return(i%t+t)%t}function Tm(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function wm(i,t,e){return i!==t?(e-i)/(t-i):0}function Wr(i,t,e){return(1-e)*i+e*t}function Am(i,t,e,n){return Wr(i,t,1-Math.exp(-e*n))}function Rm(i,t=1){return t-Math.abs(Wh(i,t*2)-t)}function Cm(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function Pm(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function Im(i,t){return i+Math.floor(Math.random()*(t-i+1))}function Lm(i,t){return i+Math.random()*(t-i)}function Dm(i){return i*(.5-Math.random())}function Nm(i){i!==void 0&&(fd=i);let t=fd+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Um(i){return i*Js}function Fm(i){return i*nr}function Om(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function Bm(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function zm(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function km(i,t,e,n,s){let r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+n)/2),h=o((t+n)/2),d=r((t-n)/2),u=o((t-n)/2),p=r((n-t)/2),m=o((n-t)/2);switch(s){case"XYX":i.set(a*h,l*d,l*u,a*c);break;case"YZY":i.set(l*u,a*h,l*d,a*c);break;case"ZXZ":i.set(l*d,l*u,a*h,a*c);break;case"XZX":i.set(a*h,l*m,l*p,a*c);break;case"YXY":i.set(l*p,a*h,l*m,a*c);break;case"ZYZ":i.set(l*m,l*p,a*h,a*c);break;default:Ct("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function $n(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ue(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var gr={DEG2RAD:Js,RAD2DEG:nr,generateUUID:bi,clamp:kt,euclideanModulo:Wh,mapLinear:Tm,inverseLerp:wm,lerp:Wr,damp:Am,pingpong:Rm,smoothstep:Cm,smootherstep:Pm,randInt:Im,randFloat:Lm,randFloatSpread:Dm,seededRandom:Nm,degToRad:Um,radToDeg:Fm,isPowerOfTwo:Om,ceilPowerOfTwo:Bm,floorPowerOfTwo:zm,setQuaternionFromProperEuler:km,normalize:ue,denormalize:$n},Kh=class Kh{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=kt(this.x,t.x,e.x),this.y=kt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=kt(this.x,t,e),this.y=kt(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(kt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(kt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Kh.prototype.isVector2=!0;var ct=Kh,Ze=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],d=n[s+3],u=r[o+0],p=r[o+1],m=r[o+2],v=r[o+3];if(d!==v||l!==u||c!==p||h!==m){let g=l*u+c*p+h*m+d*v;g<0&&(u=-u,p=-p,m=-m,v=-v,g=-g);let f=1-a;if(g<.9995){let S=Math.acos(g),R=Math.sin(S);f=Math.sin(f*S)/R,a=Math.sin(a*S)/R,l=l*f+u*a,c=c*f+p*a,h=h*f+m*a,d=d*f+v*a}else{l=l*f+u*a,c=c*f+p*a,h=h*f+m*a,d=d*f+v*a;let S=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=S,c*=S,h*=S,d*=S}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],d=r[o],u=r[o+1],p=r[o+2],m=r[o+3];return t[e]=a*m+h*d+l*p-c*u,t[e+1]=l*m+h*u+c*d-a*p,t[e+2]=c*m+h*p+a*u-l*d,t[e+3]=h*m-a*d-l*u-c*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),d=a(r/2),u=l(n/2),p=l(s/2),m=l(r/2);switch(o){case"XYZ":this._x=u*h*d+c*p*m,this._y=c*p*d-u*h*m,this._z=c*h*m+u*p*d,this._w=c*h*d-u*p*m;break;case"YXZ":this._x=u*h*d+c*p*m,this._y=c*p*d-u*h*m,this._z=c*h*m-u*p*d,this._w=c*h*d+u*p*m;break;case"ZXY":this._x=u*h*d-c*p*m,this._y=c*p*d+u*h*m,this._z=c*h*m+u*p*d,this._w=c*h*d-u*p*m;break;case"ZYX":this._x=u*h*d-c*p*m,this._y=c*p*d+u*h*m,this._z=c*h*m-u*p*d,this._w=c*h*d+u*p*m;break;case"YZX":this._x=u*h*d+c*p*m,this._y=c*p*d+u*h*m,this._z=c*h*m-u*p*d,this._w=c*h*d-u*p*m;break;case"XZY":this._x=u*h*d-c*p*m,this._y=c*p*d-u*h*m,this._z=c*h*m+u*p*d,this._w=c*h*d+u*p*m;break;default:Ct("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){let p=.5/Math.sqrt(u+1);this._w=.25/p,this._x=(h-l)*p,this._y=(r-c)*p,this._z=(o-s)*p}else if(n>a&&n>d){let p=2*Math.sqrt(1+n-a-d);this._w=(h-l)/p,this._x=.25*p,this._y=(s+o)/p,this._z=(r+c)/p}else if(a>d){let p=2*Math.sqrt(1+a-n-d);this._w=(r-c)/p,this._x=(s+o)/p,this._y=.25*p,this._z=(l+h)/p}else{let p=2*Math.sqrt(1+d-n-a);this._w=(o-s)/p,this._x=(r+c)/p,this._y=(l+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(kt(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},$h=class $h{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(pd.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(pd.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),d=2*(r*n-o*e);return this.x=e+l*c+o*d-a*h,this.y=n+l*h+a*c-r*d,this.z=s+l*d+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=kt(this.x,t.x,e.x),this.y=kt(this.y,t.y,e.y),this.z=kt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=kt(this.x,t,e),this.y=kt(this.y,t,e),this.z=kt(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(kt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Zc.copy(this).projectOnVector(t),this.sub(Zc)}reflect(t){return this.sub(Zc.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(kt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};$h.prototype.isVector3=!0;var A=$h,Zc=new A,pd=new Ze,Jh=class Jh{constructor(t,e,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],p=n[5],m=n[8],v=s[0],g=s[3],f=s[6],S=s[1],R=s[4],y=s[7],E=s[2],b=s[5],C=s[8];return r[0]=o*v+a*S+l*E,r[3]=o*g+a*R+l*b,r[6]=o*f+a*y+l*C,r[1]=c*v+h*S+d*E,r[4]=c*g+h*R+d*b,r[7]=c*f+h*y+d*C,r[2]=u*v+p*S+m*E,r[5]=u*g+p*R+m*b,r[8]=u*f+p*y+m*C,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=h*o-a*c,u=a*l-h*r,p=c*r-o*l,m=e*d+n*u+s*p;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let v=1/m;return t[0]=d*v,t[1]=(s*c-h*n)*v,t[2]=(a*n-s*o)*v,t[3]=u*v,t[4]=(h*e-s*l)*v,t[5]=(s*r-a*e)*v,t[6]=p*v,t[7]=(n*l-c*e)*v,t[8]=(o*e-n*r)*v,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return fs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Kc.makeScale(t,e)),this}rotate(t){return fs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Kc.makeRotation(-t)),this}translate(t,e){return fs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Kc.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};Jh.prototype.isMatrix3=!0;var Dt=Jh,Kc=new Dt,md=new Dt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),gd=new Dt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Hm(){let i={enabled:!0,workingColorSpace:qr,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ie&&(s.r=Ei(s.r),s.g=Ei(s.g),s.b=Ei(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ie&&(s.r=js(s.r),s.g=js(s.g),s.b=js(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Ci?Yr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return fs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return fs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[qr]:{primaries:t,whitePoint:n,transfer:Yr,toXYZ:md,fromXYZ:gd,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:ze},outputColorSpaceConfig:{drawingBufferColorSpace:ze}},[ze]:{primaries:t,whitePoint:n,transfer:ie,toXYZ:md,fromXYZ:gd,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:ze}}}),i}var Vt=Hm();function Ei(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function js(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Ns,Wa=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Ns===void 0&&(Ns=Zr("canvas")),Ns.width=t.width,Ns.height=t.height;let s=Ns.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Ns}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Zr("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ei(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ei(e[n]/255)*255):e[n]=Ei(e[n]);return{data:e,width:t.width,height:t.height}}else return Ct("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Vm=0,ir=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Vm++}),this.uuid=bi(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push($c(s[o].image)):r.push($c(s[o]))}else r=$c(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function $c(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Wa.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ct("Texture: Unable to serialize Texture."),{})}var Gm=0,Jc=new A,_n=class i extends jn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=fi,s=fi,r=tn,o=ts,a=zn,l=En,c=i.DEFAULT_ANISOTROPY,h=Ci){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Gm++}),this.uuid=bi(),this.name="",this.source=new ir(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ct(0,0),this.repeat=new ct(1,1),this.center=new ct(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Dt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Jc).x}get height(){return this.source.getSize(Jc).y}get depth(){return this.source.getSize(Jc).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Ct(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ct(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Nh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Ha:t.x=t.x-Math.floor(t.x);break;case fi:t.x=t.x<0?0:1;break;case Va:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Ha:t.y=t.y-Math.floor(t.y);break;case fi:t.y=t.y<0?0:1;break;case Va:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};_n.DEFAULT_IMAGE=null;_n.DEFAULT_MAPPING=Nh;_n.DEFAULT_ANISOTROPY=1;var jh=class jh{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],p=l[5],m=l[9],v=l[2],g=l[6],f=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-v)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+v)<.1&&Math.abs(m+g)<.1&&Math.abs(c+p+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let R=(c+1)/2,y=(p+1)/2,E=(f+1)/2,b=(h+u)/4,C=(d+v)/4,x=(m+g)/4;return R>y&&R>E?R<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(R),s=b/n,r=C/n):y>E?y<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(y),n=b/s,r=x/s):E<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(E),n=C/r,s=x/r),this.set(n,s,r,e),this}let S=Math.sqrt((g-m)*(g-m)+(d-v)*(d-v)+(u-h)*(u-h));return Math.abs(S)<.001&&(S=1),this.x=(g-m)/S,this.y=(d-v)/S,this.z=(u-h)/S,this.w=Math.acos((c+p+f-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=kt(this.x,t.x,e.x),this.y=kt(this.y,t.y,e.y),this.z=kt(this.z,t.z,e.z),this.w=kt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=kt(this.x,t,e),this.y=kt(this.y,t,e),this.z=kt(this.z,t,e),this.w=kt(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(kt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};jh.prototype.isVector4=!0;var Ee=jh,Xa=class extends jn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:tn,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new Ee(0,0,t,e),this.scissorTest=!1,this.viewport=new Ee(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new _n(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:tn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new ir(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ue=class extends Xa{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},$r=class extends _n{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ye,this.minFilter=Ye,this.wrapR=fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var qa=class extends _n{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ye,this.minFilter=Ye,this.wrapR=fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var pl=class pl{constructor(t,e,n,s,r,o,a,l,c,h,d,u,p,m,v,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,d,u,p,m,v,g)}set(t,e,n,s,r,o,a,l,c,h,d,u,p,m,v,g){let f=this.elements;return f[0]=t,f[4]=e,f[8]=n,f[12]=s,f[1]=r,f[5]=o,f[9]=a,f[13]=l,f[2]=c,f[6]=h,f[10]=d,f[14]=u,f[3]=p,f[7]=m,f[11]=v,f[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new pl().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/Us.setFromMatrixColumn(t,0).length(),r=1/Us.setFromMatrixColumn(t,1).length(),o=1/Us.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){let u=o*h,p=o*d,m=a*h,v=a*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=p+m*c,e[5]=u-v*c,e[9]=-a*l,e[2]=v-u*c,e[6]=m+p*c,e[10]=o*l}else if(t.order==="YXZ"){let u=l*h,p=l*d,m=c*h,v=c*d;e[0]=u+v*a,e[4]=m*a-p,e[8]=o*c,e[1]=o*d,e[5]=o*h,e[9]=-a,e[2]=p*a-m,e[6]=v+u*a,e[10]=o*l}else if(t.order==="ZXY"){let u=l*h,p=l*d,m=c*h,v=c*d;e[0]=u-v*a,e[4]=-o*d,e[8]=m+p*a,e[1]=p+m*a,e[5]=o*h,e[9]=v-u*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let u=o*h,p=o*d,m=a*h,v=a*d;e[0]=l*h,e[4]=m*c-p,e[8]=u*c+v,e[1]=l*d,e[5]=v*c+u,e[9]=p*c-m,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let u=o*l,p=o*c,m=a*l,v=a*c;e[0]=l*h,e[4]=v-u*d,e[8]=m*d+p,e[1]=d,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=p*d+m,e[10]=u-v*d}else if(t.order==="XZY"){let u=o*l,p=o*c,m=a*l,v=a*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+v,e[5]=o*h,e[9]=p*d-m,e[2]=m*d-p,e[6]=a*h,e[10]=v*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Wm,t,Xm)}lookAt(t,e,n){let s=this.elements;return wn.subVectors(t,e),wn.lengthSq()===0&&(wn.z=1),wn.normalize(),zi.crossVectors(n,wn),zi.lengthSq()===0&&(Math.abs(n.z)===1?wn.x+=1e-4:wn.z+=1e-4,wn.normalize(),zi.crossVectors(n,wn)),zi.normalize(),ia.crossVectors(wn,zi),s[0]=zi.x,s[4]=ia.x,s[8]=wn.x,s[1]=zi.y,s[5]=ia.y,s[9]=wn.y,s[2]=zi.z,s[6]=ia.z,s[10]=wn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],p=n[13],m=n[2],v=n[6],g=n[10],f=n[14],S=n[3],R=n[7],y=n[11],E=n[15],b=s[0],C=s[4],x=s[8],T=s[12],P=s[1],L=s[5],F=s[9],B=s[13],I=s[2],z=s[6],W=s[10],q=s[14],et=s[3],X=s[7],J=s[11],tt=s[15];return r[0]=o*b+a*P+l*I+c*et,r[4]=o*C+a*L+l*z+c*X,r[8]=o*x+a*F+l*W+c*J,r[12]=o*T+a*B+l*q+c*tt,r[1]=h*b+d*P+u*I+p*et,r[5]=h*C+d*L+u*z+p*X,r[9]=h*x+d*F+u*W+p*J,r[13]=h*T+d*B+u*q+p*tt,r[2]=m*b+v*P+g*I+f*et,r[6]=m*C+v*L+g*z+f*X,r[10]=m*x+v*F+g*W+f*J,r[14]=m*T+v*B+g*q+f*tt,r[3]=S*b+R*P+y*I+E*et,r[7]=S*C+R*L+y*z+E*X,r[11]=S*x+R*F+y*W+E*J,r[15]=S*T+R*B+y*q+E*tt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],p=t[14],m=t[3],v=t[7],g=t[11],f=t[15],S=l*p-c*u,R=a*p-c*d,y=a*u-l*d,E=o*p-c*h,b=o*u-l*h,C=o*d-a*h;return e*(v*S-g*R+f*y)-n*(m*S-g*E+f*b)+s*(m*R-v*E+f*C)-r*(m*y-v*b+g*C)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],p=t[11],m=t[12],v=t[13],g=t[14],f=t[15],S=e*a-n*o,R=e*l-s*o,y=e*c-r*o,E=n*l-s*a,b=n*c-r*a,C=s*c-r*l,x=h*v-d*m,T=h*g-u*m,P=h*f-p*m,L=d*g-u*v,F=d*f-p*v,B=u*f-p*g,I=S*B-R*F+y*L+E*P-b*T+C*x;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let z=1/I;return t[0]=(a*B-l*F+c*L)*z,t[1]=(s*F-n*B-r*L)*z,t[2]=(v*C-g*b+f*E)*z,t[3]=(u*b-d*C-p*E)*z,t[4]=(l*P-o*B-c*T)*z,t[5]=(e*B-s*P+r*T)*z,t[6]=(g*y-m*C-f*R)*z,t[7]=(h*C-u*y+p*R)*z,t[8]=(o*F-a*P+c*x)*z,t[9]=(n*P-e*F-r*x)*z,t[10]=(m*b-v*y+f*S)*z,t[11]=(d*y-h*b-p*S)*z,t[12]=(a*T-o*L-l*x)*z,t[13]=(e*L-n*T+s*x)*z,t[14]=(v*R-m*E-g*S)*z,t[15]=(h*E-d*R+u*S)*z,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,d=a+a,u=r*c,p=r*h,m=r*d,v=o*h,g=o*d,f=a*d,S=l*c,R=l*h,y=l*d,E=n.x,b=n.y,C=n.z;return s[0]=(1-(v+f))*E,s[1]=(p+y)*E,s[2]=(m-R)*E,s[3]=0,s[4]=(p-y)*b,s[5]=(1-(u+f))*b,s[6]=(g+S)*b,s[7]=0,s[8]=(m+R)*C,s[9]=(g-S)*C,s[10]=(1-(u+v))*C,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=Us.set(s[0],s[1],s[2]).length(),a=Us.set(s[4],s[5],s[6]).length(),l=Us.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Yn.copy(this);let c=1/o,h=1/a,d=1/l;return Yn.elements[0]*=c,Yn.elements[1]*=c,Yn.elements[2]*=c,Yn.elements[4]*=h,Yn.elements[5]*=h,Yn.elements[6]*=h,Yn.elements[8]*=d,Yn.elements[9]*=d,Yn.elements[10]*=d,e.setFromRotationMatrix(Yn),n.x=o,n.y=a,n.z=l,this}makePerspective(t,e,n,s,r,o,a=Jn,l=!1){let c=this.elements,h=2*r/(e-t),d=2*r/(n-s),u=(e+t)/(e-t),p=(n+s)/(n-s),m,v;if(l)m=r/(o-r),v=o*r/(o-r);else if(a===Jn)m=-(o+r)/(o-r),v=-2*o*r/(o-r);else if(a===tr)m=-o/(o-r),v=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=Jn,l=!1){let c=this.elements,h=2/(e-t),d=2/(n-s),u=-(e+t)/(e-t),p=-(n+s)/(n-s),m,v;if(l)m=1/(o-r),v=o/(o-r);else if(a===Jn)m=-2/(o-r),v=-(o+r)/(o-r);else if(a===tr)m=-1/(o-r),v=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=m,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};pl.prototype.isMatrix4=!0;var Jt=pl,Us=new A,Yn=new Jt,Wm=new A(0,0,0),Xm=new A(1,1,1),zi=new A,ia=new A,wn=new A,_d=new Jt,xd=new Ze,Ti=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],p=s[10];switch(e){case"XYZ":this._y=Math.asin(kt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-kt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(kt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-kt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(kt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-kt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,p),this._y=0);break;default:Ct("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return _d.makeRotationFromQuaternion(t),this.setFromRotationMatrix(_d,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return xd.setFromEuler(this),this.setFromQuaternion(xd,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Ti.DEFAULT_ORDER="XYZ";var sr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},qm=0,yd=new A,Fs=new Ze,xi=new Jt,sa=new A,Fr=new A,Ym=new A,Zm=new Ze,vd=new A(1,0,0),Md=new A(0,1,0),Sd=new A(0,0,1),bd={type:"added"},Km={type:"removed"},Os={type:"childadded",child:null},jc={type:"childremoved",child:null},Fe=class i extends jn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:qm++}),this.uuid=bi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new A,e=new Ti,n=new Ze,s=new A(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Jt},normalMatrix:{value:new Dt}}),this.matrix=new Jt,this.matrixWorld=new Jt,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new sr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Fs.setFromAxisAngle(t,e),this.quaternion.multiply(Fs),this}rotateOnWorldAxis(t,e){return Fs.setFromAxisAngle(t,e),this.quaternion.premultiply(Fs),this}rotateX(t){return this.rotateOnAxis(vd,t)}rotateY(t){return this.rotateOnAxis(Md,t)}rotateZ(t){return this.rotateOnAxis(Sd,t)}translateOnAxis(t,e){return yd.copy(t).applyQuaternion(this.quaternion),this.position.add(yd.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(vd,t)}translateY(t){return this.translateOnAxis(Md,t)}translateZ(t){return this.translateOnAxis(Sd,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(xi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?sa.copy(t):sa.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Fr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?xi.lookAt(Fr,sa,this.up):xi.lookAt(sa,Fr,this.up),this.quaternion.setFromRotationMatrix(xi),s&&(xi.extractRotation(s.matrixWorld),Fs.setFromRotationMatrix(xi),this.quaternion.premultiply(Fs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(It("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(bd),Os.child=t,this.dispatchEvent(Os),Os.child=null):It("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Km),jc.child=t,this.dispatchEvent(jc),jc.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),xi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),xi.multiply(t.parent.matrixWorld)),t.applyMatrix4(xi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(bd),Os.child=t,this.dispatchEvent(Os),Os.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fr,t,Ym),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fr,Zm,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];r(t.shapes,d)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),d=o(t.shapes),u=o(t.skeletons),p=o(t.animations),m=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),p.length>0&&(n.animations=p),m.length>0&&(n.nodes=m)}return n.object=s,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Fe.DEFAULT_UP=new A(0,1,0);Fe.DEFAULT_MATRIX_AUTO_UPDATE=!0;Fe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var ke=class extends Fe{constructor(){super(),this.isGroup=!0,this.type="Group"}},$m={type:"move"},rr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ke,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ke,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new A,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new A),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ke,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new A,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new A,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let v of t.hand.values()){let g=e.getJointPose(v,n),f=this._getHandJoint(c,v);g!==null&&(f.matrix.fromArray(g.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=g.radius),f.visible=g!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),p=.02,m=.005;c.inputState.pinching&&u>p+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=p-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent($m)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new ke;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Rf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ki={h:0,s:0,l:0},ra={h:0,s:0,l:0};function Qc(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var yt=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=ze){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Vt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Vt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Vt.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Vt.workingColorSpace){if(t=Wh(t,1),e=kt(e,0,1),n=kt(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=Qc(o,r,t+1/3),this.g=Qc(o,r,t),this.b=Qc(o,r,t-1/3)}return Vt.colorSpaceToWorking(this,s),this}setStyle(t,e=ze){function n(r){r!==void 0&&parseFloat(r)<1&&Ct("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Ct("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Ct("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=ze){let n=Rf[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Ct("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ei(t.r),this.g=Ei(t.g),this.b=Ei(t.b),this}copyLinearToSRGB(t){return this.r=js(t.r),this.g=js(t.g),this.b=js(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=ze){return Vt.workingToColorSpace(ln.copy(this),t),Math.round(kt(ln.r*255,0,255))*65536+Math.round(kt(ln.g*255,0,255))*256+Math.round(kt(ln.b*255,0,255))}getHexString(t=ze){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Vt.workingColorSpace){Vt.workingToColorSpace(ln.copy(this),e);let n=ln.r,s=ln.g,r=ln.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let d=o-a;switch(c=h<=.5?d/(o+a):d/(2-o-a),o){case n:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-n)/d+2;break;case r:l=(n-s)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Vt.workingColorSpace){return Vt.workingToColorSpace(ln.copy(this),e),t.r=ln.r,t.g=ln.g,t.b=ln.b,t}getStyle(t=ze){Vt.workingToColorSpace(ln.copy(this),t);let e=ln.r,n=ln.g,s=ln.b;return t!==ze?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(ki),this.setHSL(ki.h+t,ki.s+e,ki.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(ki),t.getHSL(ra);let n=Wr(ki.h,ra.h,e),s=Wr(ki.s,ra.s,e),r=Wr(ki.l,ra.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},ln=new yt;yt.NAMES=Rf;var ps=class extends Fe{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ti,this.environmentIntensity=1,this.environmentRotation=new Ti,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Zn=new A,yi=new A,th=new A,vi=new A,Bs=new A,zs=new A,Ed=new A,eh=new A,nh=new A,ih=new A,sh=new Ee,rh=new Ee,oh=new Ee,di=class i{constructor(t=new A,e=new A,n=new A){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),Zn.subVectors(t,e),s.cross(Zn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){Zn.subVectors(s,e),yi.subVectors(n,e),th.subVectors(t,e);let o=Zn.dot(Zn),a=Zn.dot(yi),l=Zn.dot(th),c=yi.dot(yi),h=yi.dot(th),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;let u=1/d,p=(c*l-a*h)*u,m=(o*h-a*l)*u;return r.set(1-p-m,m,p)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,vi)===null?!1:vi.x>=0&&vi.y>=0&&vi.x+vi.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,vi)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,vi.x),l.addScaledVector(o,vi.y),l.addScaledVector(a,vi.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return sh.setScalar(0),rh.setScalar(0),oh.setScalar(0),sh.fromBufferAttribute(t,e),rh.fromBufferAttribute(t,n),oh.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(sh,r.x),o.addScaledVector(rh,r.y),o.addScaledVector(oh,r.z),o}static isFrontFacing(t,e,n,s){return Zn.subVectors(n,e),yi.subVectors(t,e),Zn.cross(yi).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Zn.subVectors(this.c,this.b),yi.subVectors(this.a,this.b),Zn.cross(yi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,o,a;Bs.subVectors(s,n),zs.subVectors(r,n),eh.subVectors(t,n);let l=Bs.dot(eh),c=zs.dot(eh);if(l<=0&&c<=0)return e.copy(n);nh.subVectors(t,s);let h=Bs.dot(nh),d=zs.dot(nh);if(h>=0&&d<=h)return e.copy(s);let u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(Bs,o);ih.subVectors(t,r);let p=Bs.dot(ih),m=zs.dot(ih);if(m>=0&&p<=m)return e.copy(r);let v=p*c-l*m;if(v<=0&&c>=0&&m<=0)return a=c/(c-m),e.copy(n).addScaledVector(zs,a);let g=h*m-p*d;if(g<=0&&d-h>=0&&p-m>=0)return Ed.subVectors(r,s),a=(d-h)/(d-h+(p-m)),e.copy(s).addScaledVector(Ed,a);let f=1/(g+v+u);return o=v*f,a=u*f,e.copy(n).addScaledVector(Bs,o).addScaledVector(zs,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Wi=class{constructor(t=new A(1/0,1/0,1/0),e=new A(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Kn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Kn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=Kn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Kn):Kn.fromBufferAttribute(r,o),Kn.applyMatrix4(t.matrixWorld),this.expandByPoint(Kn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),oa.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),oa.copy(n.boundingBox)),oa.applyMatrix4(t.matrixWorld),this.union(oa)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Kn),Kn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Or),aa.subVectors(this.max,Or),ks.subVectors(t.a,Or),Hs.subVectors(t.b,Or),Vs.subVectors(t.c,Or),Hi.subVectors(Hs,ks),Vi.subVectors(Vs,Hs),cs.subVectors(ks,Vs);let e=[0,-Hi.z,Hi.y,0,-Vi.z,Vi.y,0,-cs.z,cs.y,Hi.z,0,-Hi.x,Vi.z,0,-Vi.x,cs.z,0,-cs.x,-Hi.y,Hi.x,0,-Vi.y,Vi.x,0,-cs.y,cs.x,0];return!ah(e,ks,Hs,Vs,aa)||(e=[1,0,0,0,1,0,0,0,1],!ah(e,ks,Hs,Vs,aa))?!1:(la.crossVectors(Hi,Vi),e=[la.x,la.y,la.z],ah(e,ks,Hs,Vs,aa))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Kn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Kn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Mi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Mi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Mi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Mi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Mi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Mi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Mi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Mi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Mi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Mi=[new A,new A,new A,new A,new A,new A,new A,new A],Kn=new A,oa=new Wi,ks=new A,Hs=new A,Vs=new A,Hi=new A,Vi=new A,cs=new A,Or=new A,aa=new A,la=new A,hs=new A;function ah(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){hs.fromArray(i,r);let a=s.x*Math.abs(hs.x)+s.y*Math.abs(hs.y)+s.z*Math.abs(hs.z),l=t.dot(hs),c=e.dot(hs),h=n.dot(hs);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Ne=new A,ca=new ct,Jm=0,jt=class extends jn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Jm++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Vh,this.updateRanges=[],this.gpuType=ii,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)ca.fromBufferAttribute(this,e),ca.applyMatrix3(t),this.setXY(e,ca.x,ca.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Ne.fromBufferAttribute(this,e),Ne.applyMatrix3(t),this.setXYZ(e,Ne.x,Ne.y,Ne.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Ne.fromBufferAttribute(this,e),Ne.applyMatrix4(t),this.setXYZ(e,Ne.x,Ne.y,Ne.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ne.fromBufferAttribute(this,e),Ne.applyNormalMatrix(t),this.setXYZ(e,Ne.x,Ne.y,Ne.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ne.fromBufferAttribute(this,e),Ne.transformDirection(t),this.setXYZ(e,Ne.x,Ne.y,Ne.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=$n(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ue(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=$n(e,this.array)),e}setX(t,e){return this.normalized&&(e=ue(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=$n(e,this.array)),e}setY(t,e){return this.normalized&&(e=ue(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=$n(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ue(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=$n(e,this.array)),e}setW(t,e){return this.normalized&&(e=ue(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=ue(e,this.array),n=ue(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=ue(e,this.array),n=ue(n,this.array),s=ue(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=ue(e,this.array),n=ue(n,this.array),s=ue(s,this.array),r=ue(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var Jr=class extends jt{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var jr=class extends jt{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var Qt=class extends jt{constructor(t,e,n){super(new Float32Array(t),e,n)}},jm=new Wi,Br=new A,lh=new A,Xi=class{constructor(t=new A,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):jm.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Br.subVectors(t,this.center);let e=Br.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Br,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(lh.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Br.copy(t.center).add(lh)),this.expandByPoint(Br.copy(t.center).sub(lh))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Qm=0,Un=new Jt,ch=new Fe,Gs=new A,An=new Wi,zr=new Wi,qe=new A,se=class i extends jn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Qm++}),this.uuid=bi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(bm(t)?jr:Jr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Dt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Un.makeRotationFromQuaternion(t),this.applyMatrix4(Un),this}rotateX(t){return Un.makeRotationX(t),this.applyMatrix4(Un),this}rotateY(t){return Un.makeRotationY(t),this.applyMatrix4(Un),this}rotateZ(t){return Un.makeRotationZ(t),this.applyMatrix4(Un),this}translate(t,e,n){return Un.makeTranslation(t,e,n),this.applyMatrix4(Un),this}scale(t,e,n){return Un.makeScale(t,e,n),this.applyMatrix4(Un),this}lookAt(t){return ch.lookAt(t),ch.updateMatrix(),this.applyMatrix4(ch.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Gs).negate(),this.translate(Gs.x,Gs.y,Gs.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Qt(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Ct("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Wi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){It("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new A(-1/0,-1/0,-1/0),new A(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];An.setFromBufferAttribute(r),this.morphTargetsRelative?(qe.addVectors(this.boundingBox.min,An.min),this.boundingBox.expandByPoint(qe),qe.addVectors(this.boundingBox.max,An.max),this.boundingBox.expandByPoint(qe)):(this.boundingBox.expandByPoint(An.min),this.boundingBox.expandByPoint(An.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&It('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Xi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){It("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new A,1/0);return}if(t){let n=this.boundingSphere.center;if(An.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];zr.setFromBufferAttribute(a),this.morphTargetsRelative?(qe.addVectors(An.min,zr.min),An.expandByPoint(qe),qe.addVectors(An.max,zr.max),An.expandByPoint(qe)):(An.expandByPoint(zr.min),An.expandByPoint(zr.max))}An.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)qe.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(qe));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)qe.fromBufferAttribute(a,c),l&&(Gs.fromBufferAttribute(t,c),qe.add(Gs)),s=Math.max(s,n.distanceToSquared(qe))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&It('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){It("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new jt(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let x=0;x<n.count;x++)a[x]=new A,l[x]=new A;let c=new A,h=new A,d=new A,u=new ct,p=new ct,m=new ct,v=new A,g=new A;function f(x,T,P){c.fromBufferAttribute(n,x),h.fromBufferAttribute(n,T),d.fromBufferAttribute(n,P),u.fromBufferAttribute(r,x),p.fromBufferAttribute(r,T),m.fromBufferAttribute(r,P),h.sub(c),d.sub(c),p.sub(u),m.sub(u);let L=1/(p.x*m.y-m.x*p.y);isFinite(L)&&(v.copy(h).multiplyScalar(m.y).addScaledVector(d,-p.y).multiplyScalar(L),g.copy(d).multiplyScalar(p.x).addScaledVector(h,-m.x).multiplyScalar(L),a[x].add(v),a[T].add(v),a[P].add(v),l[x].add(g),l[T].add(g),l[P].add(g))}let S=this.groups;S.length===0&&(S=[{start:0,count:t.count}]);for(let x=0,T=S.length;x<T;++x){let P=S[x],L=P.start,F=P.count;for(let B=L,I=L+F;B<I;B+=3)f(t.getX(B+0),t.getX(B+1),t.getX(B+2))}let R=new A,y=new A,E=new A,b=new A;function C(x){E.fromBufferAttribute(s,x),b.copy(E);let T=a[x];R.copy(T),R.sub(E.multiplyScalar(E.dot(T))).normalize(),y.crossVectors(b,T);let L=y.dot(l[x])<0?-1:1;o.setXYZW(x,R.x,R.y,R.z,L)}for(let x=0,T=S.length;x<T;++x){let P=S[x],L=P.start,F=P.count;for(let B=L,I=L+F;B<I;B+=3)C(t.getX(B+0)),C(t.getX(B+1)),C(t.getX(B+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new jt(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,p=n.count;u<p;u++)n.setXYZ(u,0,0,0);let s=new A,r=new A,o=new A,a=new A,l=new A,c=new A,h=new A,d=new A;if(t)for(let u=0,p=t.count;u<p;u+=3){let m=t.getX(u+0),v=t.getX(u+1),g=t.getX(u+2);s.fromBufferAttribute(e,m),r.fromBufferAttribute(e,v),o.fromBufferAttribute(e,g),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),a.fromBufferAttribute(n,m),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,g),a.add(h),l.add(h),c.add(h),n.setXYZ(m,a.x,a.y,a.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let u=0,p=e.count;u<p;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),o.fromBufferAttribute(e,u+2),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)qe.fromBufferAttribute(t,e),qe.normalize(),t.setXYZ(e,qe.x,qe.y,qe.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h),p=0,m=0;for(let v=0,g=l.length;v<g;v++){a.isInterleavedBufferAttribute?p=l[v]*a.data.stride+a.offset:p=l[v]*h;for(let f=0;f<h;f++)u[m++]=c[p++]}return new jt(u,h,d)}if(this.index===null)return Ct("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=t(l,n);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,d=c.length;h<d;h++){let u=c[h],p=t(u,n);l.push(p)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){let p=c[d];h.push(p.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],d=r[c];for(let u=0,p=d.length;u<p;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},Qr=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=Vh,this.updateRanges=[],this.version=0,this.uuid=bi()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[n+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=bi()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=bi()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},mn=new A,or=class i{constructor(t,e,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)mn.fromBufferAttribute(this,e),mn.applyMatrix4(t),this.setXYZ(e,mn.x,mn.y,mn.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)mn.fromBufferAttribute(this,e),mn.applyNormalMatrix(t),this.setXYZ(e,mn.x,mn.y,mn.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)mn.fromBufferAttribute(this,e),mn.transformDirection(t),this.setXYZ(e,mn.x,mn.y,mn.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=$n(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ue(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=ue(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=ue(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=ue(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=ue(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=$n(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=$n(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=$n(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=$n(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=ue(e,this.array),n=ue(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=ue(e,this.array),n=ue(n,this.array),s=ue(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=ue(e,this.array),n=ue(n,this.array),s=ue(s,this.array),r=ue(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){Kr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new jt(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new i(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){Kr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},hh=new A,tg=new A,eg=new Dt,gn=class{constructor(t=new A(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=hh.subVectors(n,e).cross(tg.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(hh),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||eg.getNormalMatrix(t),s=this.coplanarPoint(hh).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},ng=0,Qn=class extends jn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ng++}),this.uuid=bi(),this.name="",this.type="Material",this.blending=fr,this.side=ji,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ih,this.blendDst=Lh,this.blendEquation=vs,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new yt(0,0,0),this.blendAlpha=0,this.depthFunc=Qs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=_f,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Da,this.stencilZFail=Da,this.stencilZPass=Da,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Ct(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ct(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new yt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new gn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ct().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ct().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Rn=class extends Qn{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new yt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Ws,kr=new A,Xs=new A,qs=new A,Ys=new ct,Hr=new ct,Cf=new Jt,ha=new A,Vr=new A,ua=new A,Td=new ct,uh=new ct,wd=new ct,Fn=class extends Fe{constructor(t=new Rn){if(super(),this.isSprite=!0,this.type="Sprite",Ws===void 0){Ws=new se;let e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Qr(e,5);Ws.setIndex([0,1,2,0,2,3]),Ws.setAttribute("position",new or(n,3,0,!1)),Ws.setAttribute("uv",new or(n,2,3,!1))}this.geometry=Ws,this.material=t,this.center=new ct(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&It('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Xs.setFromMatrixScale(this.matrixWorld),Cf.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),qs.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Xs.multiplyScalar(-qs.z);let n=this.material.rotation,s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));let o=this.center;da(ha.set(-.5,-.5,0),qs,o,Xs,s,r),da(Vr.set(.5,-.5,0),qs,o,Xs,s,r),da(ua.set(.5,.5,0),qs,o,Xs,s,r),Td.set(0,0),uh.set(1,0),wd.set(1,1);let a=t.ray.intersectTriangle(ha,Vr,ua,!1,kr);if(a===null&&(da(Vr.set(-.5,.5,0),qs,o,Xs,s,r),uh.set(0,1),a=t.ray.intersectTriangle(ha,ua,Vr,!1,kr),a===null))return;let l=t.ray.origin.distanceTo(kr);l<t.near||l>t.far||e.push({distance:l,point:kr.clone(),uv:di.getInterpolation(kr,ha,Vr,ua,Td,uh,wd,new ct),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function da(i,t,e,n,s,r){Ys.subVectors(i,e).addScalar(.5).multiply(n),s!==void 0?(Hr.x=r*Ys.x-s*Ys.y,Hr.y=s*Ys.x+r*Ys.y):Hr.copy(Ys),i.copy(t),i.x+=Hr.x,i.y+=Hr.y,i.applyMatrix4(Cf)}var Si=new A,dh=new A,fa=new A,pa=new A,wi=class{constructor(t=new A,e=new A(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Si)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Si.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Si.copy(this.origin).addScaledVector(this.direction,e),Si.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){dh.copy(t).add(e).multiplyScalar(.5),fa.copy(e).sub(t).normalize(),pa.copy(this.origin).sub(dh);let r=t.distanceTo(e)*.5,o=-this.direction.dot(fa),a=pa.dot(this.direction),l=-pa.dot(fa),c=pa.lengthSq(),h=Math.abs(1-o*o),d,u,p,m;if(h>0)if(d=o*l-a,u=o*a-l,m=r*h,d>=0)if(u>=-m)if(u<=m){let v=1/h;d*=v,u*=v,p=d*(d+o*u+2*a)+u*(o*d+u+2*l)+c}else u=r,d=Math.max(0,-(o*u+a)),p=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(o*u+a)),p=-d*d+u*(u+2*l)+c;else u<=-m?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-l),r),p=-d*d+u*(u+2*l)+c):u<=m?(d=0,u=Math.min(Math.max(-r,-l),r),p=u*(u+2*l)+c):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-l),r),p=-d*d+u*(u+2*l)+c);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),p=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(dh).addScaledVector(fa,u),p}intersectSphere(t,e){if(t.radius<0)return null;Si.subVectors(t.center,this.origin);let n=Si.dot(this.direction),s=Si.dot(Si)-n*n,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Si)!==null}intersectTriangle(t,e,n,s,r){let o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,d=t.x-o.x,u=t.y-o.y,p=t.z-o.z,m=e.x-o.x,v=e.y-o.y,g=e.z-o.z,f=n.x-o.x,S=n.y-o.y,R=n.z-o.z,y=Math.abs(l),E=Math.abs(c),b=Math.abs(h),C,x,T,P,L,F,B,I,z,W,q,et;if(y>=E&&y>=b?(T=l,F=d,z=m,et=f,l>=0?(C=c,x=h,P=u,L=p,B=v,I=g,W=S,q=R):(C=h,x=c,P=p,L=u,B=g,I=v,W=R,q=S)):E>=b?(T=c,F=u,z=v,et=S,c>=0?(C=h,x=l,P=p,L=d,B=g,I=m,W=R,q=f):(C=l,x=h,P=d,L=p,B=m,I=g,W=f,q=R)):(T=h,F=p,z=g,et=R,h>=0?(C=l,x=c,P=d,L=u,B=m,I=v,W=f,q=S):(C=c,x=l,P=u,L=d,B=v,I=m,W=S,q=f)),T===0)return null;let X=C/T,J=x/T,tt=1/T,Tt=P-X*F,St=L-J*F,ae=B-X*z,Zt=I-J*z,re=W-X*et,Z=q-J*et,Q=re*Zt-Z*ae,xt=Tt*Z-St*re,Nt=ae*St-Zt*Tt;if(s){if(Q<0||xt<0||Nt<0)return null}else if((Q<0||xt<0||Nt<0)&&(Q>0||xt>0||Nt>0))return null;let gt=Q+xt+Nt;if(gt===0)return null;let Ht=tt*(Q*F+xt*z+Nt*et);return(gt>0?Ht<0:Ht>0)?null:this.at(Ht/gt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},en=class extends Qn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new yt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ti,this.combine=Dh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Ad=new Jt,us=new wi,ma=new Xi,Rd=new A,ga=new A,_a=new A,xa=new A,fh=new A,ya=new A,Cd=new A,va=new A,te=class extends Fe{constructor(t=new se,e=new en){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){ya.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],d=r[l];h!==0&&(fh.fromBufferAttribute(d,t),o?ya.addScaledVector(fh,h):ya.addScaledVector(fh.sub(e),h))}e.add(ya)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ma.copy(n.boundingSphere),ma.applyMatrix4(r),us.copy(t.ray).recast(t.near),!(ma.containsPoint(us.origin)===!1&&(us.intersectSphere(ma,Rd)===null||us.origin.distanceToSquared(Rd)>(t.far-t.near)**2))&&(Ad.copy(r).invert(),us.copy(t.ray).applyMatrix4(Ad),!(n.boundingBox!==null&&us.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,us)))}_computeIntersections(t,e,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,p=r.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,v=u.length;m<v;m++){let g=u[m],f=o[g.materialIndex],S=Math.max(g.start,p.start),R=Math.min(a.count,Math.min(g.start+g.count,p.start+p.count));for(let y=S,E=R;y<E;y+=3){let b=a.getX(y),C=a.getX(y+1),x=a.getX(y+2);s=Ma(this,f,t,n,c,h,d,b,C,x),s&&(s.faceIndex=Math.floor(y/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let m=Math.max(0,p.start),v=Math.min(a.count,p.start+p.count);for(let g=m,f=v;g<f;g+=3){let S=a.getX(g),R=a.getX(g+1),y=a.getX(g+2);s=Ma(this,o,t,n,c,h,d,S,R,y),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let m=0,v=u.length;m<v;m++){let g=u[m],f=o[g.materialIndex],S=Math.max(g.start,p.start),R=Math.min(l.count,Math.min(g.start+g.count,p.start+p.count));for(let y=S,E=R;y<E;y+=3){let b=y,C=y+1,x=y+2;s=Ma(this,f,t,n,c,h,d,b,C,x),s&&(s.faceIndex=Math.floor(y/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let m=Math.max(0,p.start),v=Math.min(l.count,p.start+p.count);for(let g=m,f=v;g<f;g+=3){let S=g,R=g+1,y=g+2;s=Ma(this,o,t,n,c,h,d,S,R,y),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}}};function ig(i,t,e,n,s,r,o,a){let l;if(t.side===yn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===ji,a),l===null)return null;va.copy(a),va.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(va);return c<e.near||c>e.far?null:{distance:c,point:va.clone(),object:i}}function Ma(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,ga),i.getVertexPosition(l,_a),i.getVertexPosition(c,xa);let h=ig(i,t,e,n,ga,_a,xa,Cd);if(h){let d=new A;di.getBarycoord(Cd,ga,_a,xa,d),s&&(h.uv=di.getInterpolatedAttribute(s,a,l,c,d,new ct)),r&&(h.uv1=di.getInterpolatedAttribute(r,a,l,c,d,new ct)),o&&(h.normal=di.getInterpolatedAttribute(o,a,l,c,d,new A),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new A,materialIndex:0};di.getNormal(ga,_a,xa,u.normal),h.face=u,h.barycoord=d}return h}var Ya=class extends _n{constructor(t=null,e=1,n=1,s,r,o,a,l,c=Ye,h=Ye,d,u){super(null,o,a,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var ds=new Xi,sg=new ct(.5,.5),Sa=new A,ar=class{constructor(t=new gn,e=new gn,n=new gn,s=new gn,r=new gn,o=new gn){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Jn,n=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],p=r[7],m=r[8],v=r[9],g=r[10],f=r[11],S=r[12],R=r[13],y=r[14],E=r[15];if(s[0].setComponents(c-o,p-h,f-m,E-S).normalize(),s[1].setComponents(c+o,p+h,f+m,E+S).normalize(),s[2].setComponents(c+a,p+d,f+v,E+R).normalize(),s[3].setComponents(c-a,p-d,f-v,E-R).normalize(),n)s[4].setComponents(l,u,g,y).normalize(),s[5].setComponents(c-l,p-u,f-g,E-y).normalize();else if(s[4].setComponents(c-l,p-u,f-g,E-y).normalize(),e===Jn)s[5].setComponents(c+l,p+u,f+g,E+y).normalize();else if(e===tr)s[5].setComponents(l,u,g,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ds.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),ds.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ds)}intersectsSprite(t){ds.center.set(0,0,0);let e=sg.distanceTo(t.center);return ds.radius=.7071067811865476+e,ds.applyMatrix4(t.matrixWorld),this.intersectsSphere(ds)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(Sa.x=s.normal.x>0?t.max.x:t.min.x,Sa.y=s.normal.y>0?t.max.y:t.min.y,Sa.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Sa)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ms=class extends Qn{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new yt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},Za=new A,Ka=new A,Pd=new Jt,Gr=new wi,ba=new Xi,ph=new A,Id=new A,$a=class extends Fe{constructor(t=new se,e=new ms){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)Za.fromBufferAttribute(e,s-1),Ka.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=Za.distanceTo(Ka);t.setAttribute("lineDistance",new Qt(n,1))}else Ct("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ba.copy(n.boundingSphere),ba.applyMatrix4(s),ba.radius+=r,t.ray.intersectsSphere(ba)===!1)return;Pd.copy(s).invert(),Gr.copy(t.ray).applyMatrix4(Pd);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let p=Math.max(0,o.start),m=Math.min(h.count,o.start+o.count);for(let v=p,g=m-1;v<g;v+=c){let f=h.getX(v),S=h.getX(v+1),R=Ea(this,t,Gr,l,f,S,v);R&&e.push(R)}if(this.isLineLoop){let v=h.getX(m-1),g=h.getX(p),f=Ea(this,t,Gr,l,v,g,m-1);f&&e.push(f)}}else{let p=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let v=p,g=m-1;v<g;v+=c){let f=Ea(this,t,Gr,l,v,v+1,v);f&&e.push(f)}if(this.isLineLoop){let v=Ea(this,t,Gr,l,m-1,p,m-1);v&&e.push(v)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Ea(i,t,e,n,s,r,o){let a=i.geometry.attributes.position;if(Za.fromBufferAttribute(a,s),Ka.fromBufferAttribute(a,r),e.distanceSqToSegment(Za,Ka,ph,Id)>n)return;ph.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(ph);if(!(c<t.near||c>t.far))return{distance:c,point:Id.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}var Ld=new A,Dd=new A,Ai=class extends $a{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)Ld.fromBufferAttribute(e,s),Dd.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+Ld.distanceTo(Dd);t.setAttribute("lineDistance",new Qt(n,1))}else Ct("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Ja=class extends Qn{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new yt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Nd=new Jt,Sh=new wi,Ta=new Xi,wa=new A,gs=class extends Fe{constructor(t=new se,e=new Ja){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ta.copy(n.boundingSphere),Ta.applyMatrix4(s),Ta.radius+=r,t.ray.intersectsSphere(Ta)===!1)return;Nd.copy(s).invert(),Sh.copy(t.ray).applyMatrix4(Nd);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,d=n.attributes.position;if(c!==null){let u=Math.max(0,o.start),p=Math.min(c.count,o.start+o.count);for(let m=u,v=p;m<v;m++){let g=c.getX(m);wa.fromBufferAttribute(d,g),Ud(wa,g,l,s,t,e,this)}}else{let u=Math.max(0,o.start),p=Math.min(d.count,o.start+o.count);for(let m=u,v=p;m<v;m++)wa.fromBufferAttribute(d,m),Ud(wa,m,l,s,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Ud(i,t,e,n,s,r,o){let a=Sh.distanceSqToPoint(i);if(a<e){let l=new A;Sh.closestPointToPoint(i,l),l.applyMatrix4(n);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var to=class extends _n{constructor(t=[],e=Qi,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Ri=class extends _n{constructor(t,e,n,s,r,o,a,l,c){super(t,e,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var qi=class extends _n{constructor(t,e,n=ni,s,r,o,a=Ye,l=Ye,c,h=pi,d=1){if(h!==pi&&h!==es)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:d};super(u,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new ir(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},ja=class extends qi{constructor(t,e=ni,n=Qi,s,r,o=Ye,a=Ye,l,c=pi){let h={width:t,height:t,depth:1},d=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},eo=class extends _n{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},xn=class i extends se{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],d=[],u=0,p=0;m("z","y","x",-1,-1,n,e,t,o,r,0),m("z","y","x",1,-1,n,e,-t,o,r,1),m("x","z","y",1,1,t,n,e,s,o,2),m("x","z","y",1,-1,t,n,-e,s,o,3),m("x","y","z",1,-1,t,e,n,s,r,4),m("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Qt(c,3)),this.setAttribute("normal",new Qt(h,3)),this.setAttribute("uv",new Qt(d,2));function m(v,g,f,S,R,y,E,b,C,x,T){let P=y/C,L=E/x,F=y/2,B=E/2,I=b/2,z=C+1,W=x+1,q=0,et=0,X=new A;for(let J=0;J<W;J++){let tt=J*L-B;for(let Tt=0;Tt<z;Tt++){let St=Tt*P-F;X[v]=St*S,X[g]=tt*R,X[f]=I,c.push(X.x,X.y,X.z),X[v]=0,X[g]=0,X[f]=b>0?1:-1,h.push(X.x,X.y,X.z),d.push(Tt/C),d.push(1-J/x),q+=1}}for(let J=0;J<x;J++)for(let tt=0;tt<C;tt++){let Tt=u+tt+z*J,St=u+tt+z*(J+1),ae=u+(tt+1)+z*(J+1),Zt=u+(tt+1)+z*J;l.push(Tt,St,Zt),l.push(St,ae,Zt),et+=6}a.addGroup(p,et,T),p+=et,u+=q}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var ti=class i extends se{constructor(t=1,e=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],d=[],u=[],p=[],m=0,v=[],g=n/2,f=0;S(),o===!1&&(t>0&&R(!0),e>0&&R(!1)),this.setIndex(h),this.setAttribute("position",new Qt(d,3)),this.setAttribute("normal",new Qt(u,3)),this.setAttribute("uv",new Qt(p,2));function S(){let y=new A,E=new A,b=0,C=(e-t)/n;for(let x=0;x<=r;x++){let T=[],P=x/r,L=P*(e-t)+t;for(let F=0;F<=s;F++){let B=F/s,I=B*l+a,z=Math.sin(I),W=Math.cos(I);E.x=L*z,E.y=-P*n+g,E.z=L*W,d.push(E.x,E.y,E.z),y.set(z,C,W).normalize(),u.push(y.x,y.y,y.z),p.push(B,1-P),T.push(m++)}v.push(T)}for(let x=0;x<s;x++)for(let T=0;T<r;T++){let P=v[T][x],L=v[T+1][x],F=v[T+1][x+1],B=v[T][x+1];(t>0||T!==0)&&(h.push(P,L,B),b+=3),(e>0||T!==r-1)&&(h.push(L,F,B),b+=3)}c.addGroup(f,b,0),f+=b}function R(y){let E=m,b=new ct,C=new A,x=0,T=y===!0?t:e,P=y===!0?1:-1;for(let F=1;F<=s;F++)d.push(0,g*P,0),u.push(0,P,0),p.push(.5,.5),m++;let L=m;for(let F=0;F<=s;F++){let I=F/s*l+a,z=Math.cos(I),W=Math.sin(I);C.x=T*W,C.y=g*P,C.z=T*z,d.push(C.x,C.y,C.z),u.push(0,P,0),b.x=z*.5+.5,b.y=W*.5*P+.5,p.push(b.x,b.y),m++}for(let F=0;F<s;F++){let B=E+F,I=L+F;y===!0?h.push(I,I+1,B):h.push(I+1,I,B),x+=3}c.addGroup(f,x,y===!0?1:2),f+=x}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var Qa=class i extends se{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};let r=[],o=[];a(s),c(n),h(),this.setAttribute("position",new Qt(r,3)),this.setAttribute("normal",new Qt(r.slice(),3)),this.setAttribute("uv",new Qt(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(S){let R=new A,y=new A,E=new A;for(let b=0;b<e.length;b+=3)p(e[b+0],R),p(e[b+1],y),p(e[b+2],E),l(R,y,E,S)}function l(S,R,y,E){let b=E+1,C=[];for(let x=0;x<=b;x++){C[x]=[];let T=S.clone().lerp(y,x/b),P=R.clone().lerp(y,x/b),L=b-x;for(let F=0;F<=L;F++)F===0&&x===b?C[x][F]=T:C[x][F]=T.clone().lerp(P,F/L)}for(let x=0;x<b;x++)for(let T=0;T<2*(b-x)-1;T++){let P=Math.floor(T/2);T%2===0?(u(C[x][P+1]),u(C[x+1][P]),u(C[x][P])):(u(C[x][P+1]),u(C[x+1][P+1]),u(C[x+1][P]))}}function c(S){let R=new A;for(let y=0;y<r.length;y+=3)R.x=r[y+0],R.y=r[y+1],R.z=r[y+2],R.normalize().multiplyScalar(S),r[y+0]=R.x,r[y+1]=R.y,r[y+2]=R.z}function h(){let S=new A;for(let R=0;R<r.length;R+=3){S.x=r[R+0],S.y=r[R+1],S.z=r[R+2];let y=g(S)/2/Math.PI+.5,E=f(S)/Math.PI+.5;o.push(y,1-E)}m(),d()}function d(){for(let S=0;S<o.length;S+=6){let R=o[S+0],y=o[S+2],E=o[S+4],b=Math.max(R,y,E),C=Math.min(R,y,E);b>.9&&C<.1&&(R<.2&&(o[S+0]+=1),y<.2&&(o[S+2]+=1),E<.2&&(o[S+4]+=1))}}function u(S){r.push(S.x,S.y,S.z)}function p(S,R){let y=S*3;R.x=t[y+0],R.y=t[y+1],R.z=t[y+2]}function m(){let S=new A,R=new A,y=new A,E=new A,b=new ct,C=new ct,x=new ct;for(let T=0,P=0;T<r.length;T+=9,P+=6){S.set(r[T+0],r[T+1],r[T+2]),R.set(r[T+3],r[T+4],r[T+5]),y.set(r[T+6],r[T+7],r[T+8]),b.set(o[P+0],o[P+1]),C.set(o[P+2],o[P+3]),x.set(o[P+4],o[P+5]),E.copy(S).add(R).add(y).divideScalar(3);let L=g(E);v(b,P+0,S,L),v(C,P+2,R,L),v(x,P+4,y,L)}}function v(S,R,y,E){E<0&&S.x===1&&(o[R]=S.x-1),y.x===0&&y.z===0&&(o[R]=E/2/Math.PI+.5)}function g(S){return Math.atan2(S.z,-S.x)}function f(S){return Math.atan2(-S.y,Math.sqrt(S.x*S.x+S.z*S.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.vertices,t.indices,t.radius,t.detail)}};var Aa=new A,Ra=new A,mh=new A,Ca=new di,_s=class extends se{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let s=Math.pow(10,4),r=Math.cos(Js*e),o=t.getIndex(),a=t.getAttribute("position"),l=o?o.count:a.count,c=[0,0,0],h=["a","b","c"],d=new Array(3),u={},p=[];for(let m=0;m<l;m+=3){o?(c[0]=o.getX(m),c[1]=o.getX(m+1),c[2]=o.getX(m+2)):(c[0]=m,c[1]=m+1,c[2]=m+2);let{a:v,b:g,c:f}=Ca;if(v.fromBufferAttribute(a,c[0]),g.fromBufferAttribute(a,c[1]),f.fromBufferAttribute(a,c[2]),Ca.getNormal(mh),d[0]=`${Math.round(v.x*s)},${Math.round(v.y*s)},${Math.round(v.z*s)}`,d[1]=`${Math.round(g.x*s)},${Math.round(g.y*s)},${Math.round(g.z*s)}`,d[2]=`${Math.round(f.x*s)},${Math.round(f.y*s)},${Math.round(f.z*s)}`,!(d[0]===d[1]||d[1]===d[2]||d[2]===d[0]))for(let S=0;S<3;S++){let R=(S+1)%3,y=d[S],E=d[R],b=Ca[h[S]],C=Ca[h[R]],x=`${y}_${E}`,T=`${E}_${y}`;T in u&&u[T]?(mh.dot(u[T].normal)<=r&&(p.push(b.x,b.y,b.z),p.push(C.x,C.y,C.z)),u[T]=null):x in u||(u[x]={index0:c[S],index1:c[R],normal:mh.clone()})}}for(let m in u)if(u[m]){let{index0:v,index1:g}=u[m];Aa.fromBufferAttribute(a,v),Ra.fromBufferAttribute(a,g),p.push(Aa.x,Aa.y,Aa.z),p.push(Ra.x,Ra.y,Ra.z)}this.setAttribute("position",new Qt(p,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}};var no=class i extends Qa{constructor(t=1,e=0){let n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new i(t.radius,t.detail)}},xs=class i extends se{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,d=t/a,u=e/l,p=[],m=[],v=[],g=[];for(let f=0;f<h;f++){let S=f*u-o;for(let R=0;R<c;R++){let y=R*d-r;m.push(y,-S,0),v.push(0,0,1),g.push(R/a),g.push(1-f/l)}}for(let f=0;f<l;f++)for(let S=0;S<a;S++){let R=S+c*f,y=S+c*(f+1),E=S+1+c*(f+1),b=S+1+c*f;p.push(R,y,b),p.push(y,E,b)}this.setIndex(p),this.setAttribute("position",new Qt(m,3)),this.setAttribute("normal",new Qt(v,3)),this.setAttribute("uv",new Qt(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var io=class i extends se{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],d=new A,u=new A,p=[],m=[],v=[],g=[];for(let f=0;f<=n;f++){let S=[],R=f/n,y=o+R*a,E=t*Math.cos(y),b=Math.sqrt(t*t-E*E),C=0;f===0&&o===0?C=.5/e:f===n&&l===Math.PI&&(C=-.5/e);for(let x=0;x<=e;x++){let T=x/e,P=s+T*r;d.x=-b*Math.cos(P),d.y=E,d.z=b*Math.sin(P),m.push(d.x,d.y,d.z),u.copy(d).normalize(),v.push(u.x,u.y,u.z),g.push(T+C,1-R),S.push(c++)}h.push(S)}for(let f=0;f<n;f++)for(let S=0;S<e;S++){let R=h[f][S+1],y=h[f][S],E=h[f+1][S],b=h[f+1][S+1];(f!==0||o>0)&&p.push(R,y,b),(f!==n-1||l<Math.PI)&&p.push(y,E,b)}this.setIndex(p),this.setAttribute("position",new Qt(m,3)),this.setAttribute("normal",new Qt(v,3)),this.setAttribute("uv",new Qt(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var ys=class i extends se{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],h=[],d=[],u=new A,p=new A,m=new A;for(let v=0;v<=n;v++){let g=o+v/n*a;for(let f=0;f<=s;f++){let S=f/s*r;p.x=(t+e*Math.cos(g))*Math.cos(S),p.y=(t+e*Math.cos(g))*Math.sin(S),p.z=e*Math.sin(g),c.push(p.x,p.y,p.z),u.x=t*Math.cos(S),u.y=t*Math.sin(S),m.subVectors(p,u).normalize(),h.push(m.x,m.y,m.z),d.push(f/s),d.push(v/n)}}for(let v=1;v<=n;v++)for(let g=1;g<=s;g++){let f=(s+1)*v+g-1,S=(s+1)*(v-1)+g-1,R=(s+1)*(v-1)+g,y=(s+1)*v+g;l.push(f,S,y),l.push(S,R,y)}this.setIndex(l),this.setAttribute("position",new Qt(c,3)),this.setAttribute("normal",new Qt(h,3)),this.setAttribute("uv",new Qt(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};function bs(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(Fd(s))s.isRenderTargetTexture?(Ct("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(Fd(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function cn(i){let t={};for(let e=0;e<i.length;e++){let n=bs(i[e]);for(let s in n)t[s]=n[s]}return t}function Fd(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function rg(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Xh(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Vt.workingColorSpace}var Pi={clone:bs,merge:cn},og=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ag=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,de=class extends Qn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=og,this.fragmentShader=ag,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=bs(t.uniforms),this.uniformsGroups=rg(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new yt().setHex(s.value);break;case"v2":this.uniforms[n].value=new ct().fromArray(s.value);break;case"v3":this.uniforms[n].value=new A().fromArray(s.value);break;case"v4":this.uniforms[n].value=new Ee().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Dt().fromArray(s.value);break;case"m4":this.uniforms[n].value=new Jt().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},lr=class extends de{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Cn=class extends Qn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new yt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new yt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=tc,this.normalScale=new ct(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ti,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},cr=class extends Cn{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ct(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return kt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new yt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new yt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new yt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var tl=class extends Qn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=mf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},el=class extends Qn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Zs(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function gh(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var Yi=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let o;e:{i:if(!(t<s)){for(let a=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=e[++n],t<s)break t}o=e.length;break e}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}o=n,n=0;break e}break n}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},nl=class extends Yi{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:yh,endingEnd:yh}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case vh:r=t,a=2*e-n;break;case Mh:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case vh:o=t,l=2*n-e;break;case Mh:o=1,l=n+s[1]-s[0];break;default:o=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,p=this._weightNext,m=(n-e)/(s-e),v=m*m,g=v*m,f=-u*g+2*u*v-u*m,S=(1+u)*g+(-1.5-2*u)*v+(-.5+u)*m+1,R=(-1-p)*g+(1.5+p)*v+.5*m,y=p*g-p*v;for(let E=0;E!==a;++E)r[E]=f*o[h+E]+S*o[c+E]+R*o[l+E]+y*o[d+E];return r}},il=class extends Yi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(n-e)/(s-e),d=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*d+o[l+u]*h;return r}},sl=class extends Yi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},rl=class extends Yi{interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,d=this.outTangents;if(!h||!d){let m=(n-e)/(s-e),v=1-m;for(let g=0;g!==a;++g)r[g]=o[c+g]*v+o[l+g]*m;return r}let u=a*2,p=t-1;for(let m=0;m!==a;++m){let v=o[c+m],g=o[l+m],f=p*u+m*2,S=d[f],R=d[f+1],y=t*u+m*2,E=h[y],b=h[y+1],C=cg(n,e,S,E,s);r[m]=Pf(C,v,R,b,g)}return r}};function Pf(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function lg(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function cg(i,t,e,n,s){let r=(i-t)/(s-t);for(let o=0;o<8;o++){let a=Pf(r,t,e,n,s)-i;if(Math.abs(a)<1e-10)break;let l=lg(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}var Pn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Zs(e,this.TimeBufferType),this.values=Zs(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Zs(t.times,Array),values:Zs(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),gh(t.settings)&&(n.settings={inTangents:Zs(t.settings.inTangents,Array),outTangents:Zs(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new sl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new il(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new nl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new rl(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Xr:e=this.InterpolantFactoryMethodDiscrete;break;case Ga:e=this.InterpolantFactoryMethodLinear;break;case La:e=this.InterpolantFactoryMethodSmooth;break;case xh:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ct("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Xr;case this.InterpolantFactoryMethodLinear:return Ga;case this.InterpolantFactoryMethodSmooth:return La;case this.InterpolantFactoryMethodBezier:return xh}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;gh(this.settings)&&(Od(this.settings.inTangents,t),Od(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(It("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(It("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){It("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){It("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(s!==void 0&&Em(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){It("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===La,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(s)l=!0;else{let d=a*n,u=d-n,p=d+n;for(let m=0;m!==n;++m){let v=e[d+m];if(v!==e[u+m]||v!==e[p+m]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let d=a*n,u=o*n;for(let p=0;p!==n;++p)e[u+p]=e[d+p]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,gh(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Od(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}Pn.prototype.ValueTypeName="";Pn.prototype.TimeBufferType=Float32Array;Pn.prototype.ValueBufferType=Float32Array;Pn.prototype.DefaultInterpolation=Ga;var Zi=class extends Pn{constructor(t,e,n){super(t,e,n)}};Zi.prototype.ValueTypeName="bool";Zi.prototype.ValueBufferType=Array;Zi.prototype.DefaultInterpolation=Xr;Zi.prototype.InterpolantFactoryMethodLinear=void 0;Zi.prototype.InterpolantFactoryMethodSmooth=void 0;var ol=class extends Pn{constructor(t,e,n,s){super(t,e,n,s)}};ol.prototype.ValueTypeName="color";var al=class extends Pn{constructor(t,e,n,s){super(t,e,n,s)}};al.prototype.ValueTypeName="number";var ll=class extends Yi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-e)/(s-e),c=t*a;for(let h=c+a;c!==h;c+=4)Ze.slerpFlat(r,0,o,c-a,o,c,l);return r}},so=class extends Pn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new ll(this.times,this.values,this.getValueSize(),t)}};so.prototype.ValueTypeName="quaternion";so.prototype.InterpolantFactoryMethodSmooth=void 0;var Ki=class extends Pn{constructor(t,e,n){super(t,e,n)}};Ki.prototype.ValueTypeName="string";Ki.prototype.ValueBufferType=Array;Ki.prototype.DefaultInterpolation=Xr;Ki.prototype.InterpolantFactoryMethodLinear=void 0;Ki.prototype.InterpolantFactoryMethodSmooth=void 0;var cl=class extends Pn{constructor(t,e,n,s){super(t,e,n,s)}};cl.prototype.ValueTypeName="vector";var hl=class{constructor(t,e,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){let p=c[d],m=c[d+1];if(p.global&&(p.lastIndex=0),p.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},If=new hl,ul=class{constructor(t){this.manager=t!==void 0?t:If,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};ul.DEFAULT_MATERIAL_NAME="__DEFAULT";var hr=class extends Fe{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new yt(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var _h=new Jt,Bd=new A,zd=new A,ro=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ct(512,512),this.mapType=En,this.map=null,this.mapPass=null,this.matrix=new Jt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ar,this._frameExtents=new ct(1,1),this._viewportCount=1,this._viewports=[new Ee(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Bd.setFromMatrixPosition(t.matrixWorld),e.position.copy(Bd),zd.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(zd),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){_h.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(_h,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===tr||t.reversedDepth?e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),e.multiply(_h)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Pa=new A,Ia=new Ze,ui=new A,oo=class extends Fe{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Jt,this.projectionMatrix=new Jt,this.projectionMatrixInverse=new Jt,this.coordinateSystem=Jn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Pa,Ia,ui),ui.x===1&&ui.y===1&&ui.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Pa,Ia,ui.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(Pa,Ia,ui),ui.x===1&&ui.y===1&&ui.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Pa,Ia,ui.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Gi=new A,kd=new ct,Hd=new ct,Qe=class extends oo{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=nr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Js*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return nr*2*Math.atan(Math.tan(Js*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Gi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Gi.x,Gi.y).multiplyScalar(-t/Gi.z),Gi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Gi.x,Gi.y).multiplyScalar(-t/Gi.z)}getViewSize(t,e){return this.getViewBounds(t,kd,Hd),e.subVectors(Hd,kd)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Js*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var bh=class extends ro{constructor(){super(new Qe(90,1,.5,500)),this.isPointLightShadow=!0}},ao=class extends hr{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new bh}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},$i=class extends oo{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Eh=class extends ro{constructor(){super(new $i(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ur=class extends hr{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Fe.DEFAULT_UP),this.updateMatrix(),this.target=new Fe,this.shadow=new Eh}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},lo=class extends hr{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Ks=-90,$s=1,dl=class extends Fe{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Qe(Ks,$s,t,e);s.layers=this.layers,this.add(s);let r=new Qe(Ks,$s,t,e);r.layers=this.layers,this.add(r);let o=new Qe(Ks,$s,t,e);o.layers=this.layers,this.add(o);let a=new Qe(Ks,$s,t,e);a.layers=this.layers,this.add(a);let l=new Qe(Ks,$s,t,e);l.layers=this.layers,this.add(l);let c=new Qe(Ks,$s,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Jn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===tr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),m=t.xr.enabled;t.xr.enabled=!1;let v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;t.isWebGLRenderer===!0?g=t.state.buffers.depth.getReversed():g=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=v,t.setRenderTarget(n,5,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(d,u,p),t.xr.enabled=m,n.texture.needsPMREMUpdate=!0}},fl=class extends Qe{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},co=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=hg.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function hg(){this._document.hidden===!1&&this.reset()}var qh="\\[\\]\\.:\\/",ug=new RegExp("["+qh+"]","g"),Yh="[^"+qh+"]",dg="[^"+qh.replace("\\.","")+"]",fg=/((?:WC+[\/:])*)/.source.replace("WC",Yh),pg=/(WCOD+)?/.source.replace("WCOD",dg),mg=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Yh),gg=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Yh),_g=new RegExp("^"+fg+pg+mg+gg+"$"),xg=["material","materials","bones","map"],Th=class{constructor(t,e,n){let s=n||Me.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},Me=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(ug,"")}static parseTrackName(t){let e=_g.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);xg.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=n(a.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Ct("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){It("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){It("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){It("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){It("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){It("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){It("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){It("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[s];if(o===void 0){let c=e.nodeName;It("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){It("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){It("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Me.Composite=Th;Me.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Me.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Me.prototype.GetterByBindingType=[Me.prototype._getValue_direct,Me.prototype._getValue_array,Me.prototype._getValue_arrayElement,Me.prototype._getValue_toArray];Me.prototype.SetterByBindingTypeAndVersioning=[[Me.prototype._setValue_direct,Me.prototype._setValue_direct_setNeedsUpdate,Me.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Me.prototype._setValue_array,Me.prototype._setValue_array_setNeedsUpdate,Me.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Me.prototype._setValue_arrayElement,Me.prototype._setValue_arrayElement_setNeedsUpdate,Me.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Me.prototype._setValue_fromArray,Me.prototype._setValue_fromArray_setNeedsUpdate,Me.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var GM=new Float32Array(1);var Vd=new Jt,ho=class{constructor(t,e,n=0,s=1/0){this.ray=new wi(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new sr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):It("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Vd.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Vd),this}intersectObject(t,e=!0,n=[]){return wh(t,this,n,e),n.sort(Gd),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)wh(t[s],this,n,e);return n.sort(Gd),n}};function Gd(i,t){return i.distance-t.distance}function wh(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let o=0,a=r.length;o<a;o++)wh(r[o],t,e,!0)}}var mi=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=kt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(kt(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Qh=class Qh{constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};Qh.prototype.isMatrix2=!0;var Ah=Qh;var uo=class extends jn{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function Zh(i,t,e,n){let s=yg(n);switch(e){case zh:return i*t;case Hh:return i*t/s.components*s.byteLength;case Ml:return i*t/s.components*s.byteLength;case ns:return i*t*2/s.components*s.byteLength;case Sl:return i*t*2/s.components*s.byteLength;case kh:return i*t*3/s.components*s.byteLength;case zn:return i*t*4/s.components*s.byteLength;case bl:return i*t*4/s.components*s.byteLength;case So:case bo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Eo:case To:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Tl:case Al:return Math.max(i,16)*Math.max(t,8)/4;case El:case wl:return Math.max(i,8)*Math.max(t,8)/2;case Rl:case Cl:case Il:case Ll:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Pl:case wo:case Dl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Nl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Ul:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Fl:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Ol:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Bl:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case zl:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case kl:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Hl:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Vl:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Gl:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Wl:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Xl:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case ql:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Yl:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Zl:case Kl:case $l:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Jl:case jl:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Ao:case Ql:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function yg(i){switch(i){case En:case Uh:return{byteLength:1,components:1};case pr:case Fh:case nn:return{byteLength:2,components:1};case yl:case vl:return{byteLength:2,components:4};case ni:case xl:case ii:return{byteLength:4,components:1};case Oh:case Bh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Ct("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function Qf(){let i=null,t=!1,e=null,n=null;function s(r,o){n=i.requestAnimationFrame(s),e(r,o)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function Tg(i){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,d=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),a.onUploadCallback();let p;if(c instanceof Float32Array)p=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=i.SHORT;else if(c instanceof Uint32Array)p=i.UNSIGNED_INT;else if(c instanceof Int32Array)p=i.INT;else if(c instanceof Int8Array)p=i.BYTE;else if(c instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){let h=l.array,d=l.updateRanges;if(i.bindBuffer(c,a),d.length===0)i.bufferSubData(c,0,h);else{d.sort((p,m)=>p.start-m.start);let u=0;for(let p=1;p<d.length;p++){let m=d[u],v=d[p];v.start<=m.start+m.count+1?m.count=Math.max(m.count,v.start+v.count-m.start):(++u,d[u]=v)}d.length=u+1;for(let p=0,m=d.length;p<m;p++){let v=d[p];i.bufferSubData(c,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var wg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Ag=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Rg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Cg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Ig=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Lg=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Dg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Ng=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Ug=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Fg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Og=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Bg=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,zg=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,kg=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Hg=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Vg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Gg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Wg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Xg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,qg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Yg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Zg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Kg=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,$g=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Jg=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,jg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Qg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,t0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,e0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,n0="gl_FragColor = linearToOutputTexel( gl_FragColor );",i0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,s0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,r0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,o0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,a0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,l0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,c0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,h0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,u0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,d0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,f0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,p0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,m0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,g0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,_0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,x0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,y0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,v0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,M0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,S0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,b0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,E0=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,T0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,w0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,A0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,R0=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,C0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,P0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,I0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,L0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,D0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,N0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,U0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,F0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,O0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,B0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,z0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,k0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,H0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,V0=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,G0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,W0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,X0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,q0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Y0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Z0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,K0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,$0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,J0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,j0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Q0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,t_=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,e_=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,n_=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,i_=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,s_=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,r_=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,o_=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,a_=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,l_=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,c_=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,h_=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,u_=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,d_=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,f_=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,p_=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,m_=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,g_=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,__=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,x_=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,y_=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,v_=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,M_=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,S_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,b_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,E_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,T_=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,w_=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,A_=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,R_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,C_=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,P_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,I_=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,L_=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,D_=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,N_=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,U_=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,F_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,O_=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,B_=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,z_=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,k_=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,H_=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,V_=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,G_=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,W_=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,X_=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,q_=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Y_=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Z_=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,K_=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$_=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,J_=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,j_=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Q_=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,tx=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,ex=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,nx=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ix=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sx=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,rx=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,zt={alphahash_fragment:wg,alphahash_pars_fragment:Ag,alphamap_fragment:Rg,alphamap_pars_fragment:Cg,alphatest_fragment:Pg,alphatest_pars_fragment:Ig,aomap_fragment:Lg,aomap_pars_fragment:Dg,batching_pars_vertex:Ng,batching_vertex:Ug,begin_vertex:Fg,beginnormal_vertex:Og,bsdfs:Bg,iridescence_fragment:zg,bumpmap_pars_fragment:kg,clipping_planes_fragment:Hg,clipping_planes_pars_fragment:Vg,clipping_planes_pars_vertex:Gg,clipping_planes_vertex:Wg,color_fragment:Xg,color_pars_fragment:qg,color_pars_vertex:Yg,color_vertex:Zg,common:Kg,cube_uv_reflection_fragment:$g,defaultnormal_vertex:Jg,displacementmap_pars_vertex:jg,displacementmap_vertex:Qg,emissivemap_fragment:t0,emissivemap_pars_fragment:e0,colorspace_fragment:n0,colorspace_pars_fragment:i0,envmap_fragment:s0,envmap_common_pars_fragment:r0,envmap_pars_fragment:o0,envmap_pars_vertex:a0,envmap_physical_pars_fragment:x0,envmap_vertex:l0,fog_vertex:c0,fog_pars_vertex:h0,fog_fragment:u0,fog_pars_fragment:d0,gradientmap_pars_fragment:f0,lightmap_pars_fragment:p0,lights_lambert_fragment:m0,lights_lambert_pars_fragment:g0,lights_pars_begin:_0,lights_toon_fragment:y0,lights_toon_pars_fragment:v0,lights_phong_fragment:M0,lights_phong_pars_fragment:S0,lights_physical_fragment:b0,lights_physical_pars_fragment:E0,lights_fragment_begin:T0,lights_fragment_maps:w0,lights_fragment_end:A0,lightprobes_pars_fragment:R0,logdepthbuf_fragment:C0,logdepthbuf_pars_fragment:P0,logdepthbuf_pars_vertex:I0,logdepthbuf_vertex:L0,map_fragment:D0,map_pars_fragment:N0,map_particle_fragment:U0,map_particle_pars_fragment:F0,metalnessmap_fragment:O0,metalnessmap_pars_fragment:B0,morphinstance_vertex:z0,morphcolor_vertex:k0,morphnormal_vertex:H0,morphtarget_pars_vertex:V0,morphtarget_vertex:G0,normal_fragment_begin:W0,normal_fragment_maps:X0,normal_pars_fragment:q0,normal_pars_vertex:Y0,normal_vertex:Z0,normalmap_pars_fragment:K0,clearcoat_normal_fragment_begin:$0,clearcoat_normal_fragment_maps:J0,clearcoat_pars_fragment:j0,iridescence_pars_fragment:Q0,opaque_fragment:t_,packing:e_,premultiplied_alpha_fragment:n_,project_vertex:i_,dithering_fragment:s_,dithering_pars_fragment:r_,roughnessmap_fragment:o_,roughnessmap_pars_fragment:a_,shadowmap_pars_fragment:l_,shadowmap_pars_vertex:c_,shadowmap_vertex:h_,shadowmask_pars_fragment:u_,skinbase_vertex:d_,skinning_pars_vertex:f_,skinning_vertex:p_,skinnormal_vertex:m_,specularmap_fragment:g_,specularmap_pars_fragment:__,tonemapping_fragment:x_,tonemapping_pars_fragment:y_,transmission_fragment:v_,transmission_pars_fragment:M_,uv_pars_fragment:S_,uv_pars_vertex:b_,uv_vertex:E_,worldpos_vertex:T_,background_vert:w_,background_frag:A_,backgroundCube_vert:R_,backgroundCube_frag:C_,cube_vert:P_,cube_frag:I_,depth_vert:L_,depth_frag:D_,distance_vert:N_,distance_frag:U_,equirect_vert:F_,equirect_frag:O_,linedashed_vert:B_,linedashed_frag:z_,meshbasic_vert:k_,meshbasic_frag:H_,meshlambert_vert:V_,meshlambert_frag:G_,meshmatcap_vert:W_,meshmatcap_frag:X_,meshnormal_vert:q_,meshnormal_frag:Y_,meshphong_vert:Z_,meshphong_frag:K_,meshphysical_vert:$_,meshphysical_frag:J_,meshtoon_vert:j_,meshtoon_frag:Q_,points_vert:tx,points_frag:ex,shadow_vert:nx,shadow_frag:ix,sprite_vert:sx,sprite_frag:rx},ut={common:{diffuse:{value:new yt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Dt},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Dt}},envmap:{envMap:{value:null},envMapRotation:{value:new Dt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Dt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Dt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Dt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Dt},normalScale:{value:new ct(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Dt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Dt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Dt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Dt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new yt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new A},probesMax:{value:new A},probesResolution:{value:new A}},points:{diffuse:{value:new yt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0},uvTransform:{value:new Dt}},sprite:{diffuse:{value:new yt(16777215)},opacity:{value:1},center:{value:new ct(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Dt},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0}}},_i={basic:{uniforms:cn([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.fog]),vertexShader:zt.meshbasic_vert,fragmentShader:zt.meshbasic_frag},lambert:{uniforms:cn([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,ut.lights,{emissive:{value:new yt(0)},envMapIntensity:{value:1}}]),vertexShader:zt.meshlambert_vert,fragmentShader:zt.meshlambert_frag},phong:{uniforms:cn([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,ut.lights,{emissive:{value:new yt(0)},specular:{value:new yt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:zt.meshphong_vert,fragmentShader:zt.meshphong_frag},standard:{uniforms:cn([ut.common,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.roughnessmap,ut.metalnessmap,ut.fog,ut.lights,{emissive:{value:new yt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:zt.meshphysical_vert,fragmentShader:zt.meshphysical_frag},toon:{uniforms:cn([ut.common,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.gradientmap,ut.fog,ut.lights,{emissive:{value:new yt(0)}}]),vertexShader:zt.meshtoon_vert,fragmentShader:zt.meshtoon_frag},matcap:{uniforms:cn([ut.common,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,{matcap:{value:null}}]),vertexShader:zt.meshmatcap_vert,fragmentShader:zt.meshmatcap_frag},points:{uniforms:cn([ut.points,ut.fog]),vertexShader:zt.points_vert,fragmentShader:zt.points_frag},dashed:{uniforms:cn([ut.common,ut.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:zt.linedashed_vert,fragmentShader:zt.linedashed_frag},depth:{uniforms:cn([ut.common,ut.displacementmap]),vertexShader:zt.depth_vert,fragmentShader:zt.depth_frag},normal:{uniforms:cn([ut.common,ut.bumpmap,ut.normalmap,ut.displacementmap,{opacity:{value:1}}]),vertexShader:zt.meshnormal_vert,fragmentShader:zt.meshnormal_frag},sprite:{uniforms:cn([ut.sprite,ut.fog]),vertexShader:zt.sprite_vert,fragmentShader:zt.sprite_frag},background:{uniforms:{uvTransform:{value:new Dt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:zt.background_vert,fragmentShader:zt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Dt}},vertexShader:zt.backgroundCube_vert,fragmentShader:zt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:zt.cube_vert,fragmentShader:zt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:zt.equirect_vert,fragmentShader:zt.equirect_frag},distance:{uniforms:cn([ut.common,ut.displacementmap,{referencePosition:{value:new A},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:zt.distance_vert,fragmentShader:zt.distance_frag},shadow:{uniforms:cn([ut.lights,ut.fog,{color:{value:new yt(0)},opacity:{value:1}}]),vertexShader:zt.shadow_vert,fragmentShader:zt.shadow_frag}};_i.physical={uniforms:cn([_i.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Dt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Dt},clearcoatNormalScale:{value:new ct(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Dt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Dt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Dt},sheen:{value:0},sheenColor:{value:new yt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Dt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Dt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Dt},transmissionSamplerSize:{value:new ct},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Dt},attenuationDistance:{value:0},attenuationColor:{value:new yt(0)},specularColor:{value:new yt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Dt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Dt},anisotropyVector:{value:new ct},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Dt}}]),vertexShader:zt.meshphysical_vert,fragmentShader:zt.meshphysical_frag};var ic={r:0,b:0,g:0},ox=new Jt,tp=new Dt;tp.set(-1,0,0,0,1,0,0,0,1);function ax(i,t,e,n,s,r){let o=new yt(0),a=s===!0?0:1,l,c,h=null,d=0,u=null;function p(S){let R=S.isScene===!0?S.background:null;if(R&&R.isTexture){let y=S.backgroundBlurriness>0;R=t.get(R,y)}return R}function m(S){let R=!1,y=p(S);y===null?g(o,a):y&&y.isColor&&(g(y,1),R=!0);let E=i.xr.getEnvironmentBlendMode();E==="additive"?e.buffers.color.setClear(0,0,0,1,r):E==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||R)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function v(S,R){let y=p(R);y&&(y.isCubeTexture||y.mapping===vo)?(c===void 0&&(c=new te(new xn(1,1,1),new de({name:"BackgroundCubeMaterial",uniforms:bs(_i.backgroundCube.uniforms),vertexShader:_i.backgroundCube.vertexShader,fragmentShader:_i.backgroundCube.fragmentShader,side:yn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(E,b,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=y,c.material.uniforms.backgroundBlurriness.value=R.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(ox.makeRotationFromEuler(R.backgroundRotation)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(tp),c.material.toneMapped=Vt.getTransfer(y.colorSpace)!==ie,(h!==y||d!==y.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=y,d=y.version,u=i.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new te(new xs(2,2),new de({name:"BackgroundMaterial",uniforms:bs(_i.background.uniforms),vertexShader:_i.background.vertexShader,fragmentShader:_i.background.fragmentShader,side:ji,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,l.material.toneMapped=Vt.getTransfer(y.colorSpace)!==ie,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||d!==y.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=y,d=y.version,u=i.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null))}function g(S,R){S.getRGB(ic,Xh(i)),e.buffers.color.setClear(ic.r,ic.g,ic.b,R,r)}function f(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(S,R=1){o.set(S),a=R,g(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(S){a=S,g(o,a)},render:m,addToRenderList:v,dispose:f}}function lx(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,o=!1;function a(L,F,B,I,z){let W=!1,q=d(L,I,B,F);r!==q&&(r=q,c(r.object)),W=p(L,I,B,z),W&&m(L,I,B,z),z!==null&&t.update(z,i.ELEMENT_ARRAY_BUFFER),(W||o)&&(o=!1,y(L,F,B,I),z!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(z).buffer))}function l(){return i.createVertexArray()}function c(L){return i.bindVertexArray(L)}function h(L){return i.deleteVertexArray(L)}function d(L,F,B,I){let z=I.wireframe===!0,W=n[F.id];W===void 0&&(W={},n[F.id]=W);let q=L.isInstancedMesh===!0?L.id:0,et=W[q];et===void 0&&(et={},W[q]=et);let X=et[B.id];X===void 0&&(X={},et[B.id]=X);let J=X[z];return J===void 0&&(J=u(l()),X[z]=J),J}function u(L){let F=[],B=[],I=[];for(let z=0;z<e;z++)F[z]=0,B[z]=0,I[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:B,attributeDivisors:I,object:L,attributes:{},index:null}}function p(L,F,B,I){let z=r.attributes,W=F.attributes,q=0,et=B.getAttributes();for(let X in et)if(et[X].location>=0){let tt=z[X],Tt=W[X];if(Tt===void 0&&(X==="instanceMatrix"&&L.instanceMatrix&&(Tt=L.instanceMatrix),X==="instanceColor"&&L.instanceColor&&(Tt=L.instanceColor)),tt===void 0||tt.attribute!==Tt||Tt&&tt.data!==Tt.data)return!0;q++}return r.attributesNum!==q||r.index!==I}function m(L,F,B,I){let z={},W=F.attributes,q=0,et=B.getAttributes();for(let X in et)if(et[X].location>=0){let tt=W[X];tt===void 0&&(X==="instanceMatrix"&&L.instanceMatrix&&(tt=L.instanceMatrix),X==="instanceColor"&&L.instanceColor&&(tt=L.instanceColor));let Tt={};Tt.attribute=tt,tt&&tt.data&&(Tt.data=tt.data),z[X]=Tt,q++}r.attributes=z,r.attributesNum=q,r.index=I}function v(){let L=r.newAttributes;for(let F=0,B=L.length;F<B;F++)L[F]=0}function g(L){f(L,0)}function f(L,F){let B=r.newAttributes,I=r.enabledAttributes,z=r.attributeDivisors;B[L]=1,I[L]===0&&(i.enableVertexAttribArray(L),I[L]=1),z[L]!==F&&(i.vertexAttribDivisor(L,F),z[L]=F)}function S(){let L=r.newAttributes,F=r.enabledAttributes;for(let B=0,I=F.length;B<I;B++)F[B]!==L[B]&&(i.disableVertexAttribArray(B),F[B]=0)}function R(L,F,B,I,z,W,q){q===!0?i.vertexAttribIPointer(L,F,B,z,W):i.vertexAttribPointer(L,F,B,I,z,W)}function y(L,F,B,I){v();let z=I.attributes,W=B.getAttributes(),q=F.defaultAttributeValues;for(let et in W){let X=W[et];if(X.location>=0){let J=z[et];if(J===void 0&&(et==="instanceMatrix"&&L.instanceMatrix&&(J=L.instanceMatrix),et==="instanceColor"&&L.instanceColor&&(J=L.instanceColor)),J!==void 0){let tt=J.normalized,Tt=J.itemSize,St=t.get(J);if(St===void 0)continue;let ae=St.buffer,Zt=St.type,re=St.bytesPerElement,Z=Zt===i.INT||Zt===i.UNSIGNED_INT||J.gpuType===xl;if(J.isInterleavedBufferAttribute){let Q=J.data,xt=Q.stride,Nt=J.offset;if(Q.isInstancedInterleavedBuffer){for(let gt=0;gt<X.locationSize;gt++)f(X.location+gt,Q.meshPerAttribute);L.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let gt=0;gt<X.locationSize;gt++)g(X.location+gt);i.bindBuffer(i.ARRAY_BUFFER,ae);for(let gt=0;gt<X.locationSize;gt++)R(X.location+gt,Tt/X.locationSize,Zt,tt,xt*re,(Nt+Tt/X.locationSize*gt)*re,Z)}else{if(J.isInstancedBufferAttribute){for(let Q=0;Q<X.locationSize;Q++)f(X.location+Q,J.meshPerAttribute);L.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let Q=0;Q<X.locationSize;Q++)g(X.location+Q);i.bindBuffer(i.ARRAY_BUFFER,ae);for(let Q=0;Q<X.locationSize;Q++)R(X.location+Q,Tt/X.locationSize,Zt,tt,Tt*re,Tt/X.locationSize*Q*re,Z)}}else if(q!==void 0){let tt=q[et];if(tt!==void 0)switch(tt.length){case 2:i.vertexAttrib2fv(X.location,tt);break;case 3:i.vertexAttrib3fv(X.location,tt);break;case 4:i.vertexAttrib4fv(X.location,tt);break;default:i.vertexAttrib1fv(X.location,tt)}}}}S()}function E(){T();for(let L in n){let F=n[L];for(let B in F){let I=F[B];for(let z in I){let W=I[z];for(let q in W)h(W[q].object),delete W[q];delete I[z]}}delete n[L]}}function b(L){if(n[L.id]===void 0)return;let F=n[L.id];for(let B in F){let I=F[B];for(let z in I){let W=I[z];for(let q in W)h(W[q].object),delete W[q];delete I[z]}}delete n[L.id]}function C(L){for(let F in n){let B=n[F];for(let I in B){let z=B[I];if(z[L.id]===void 0)continue;let W=z[L.id];for(let q in W)h(W[q].object),delete W[q];delete z[L.id]}}}function x(L){for(let F in n){let B=n[F],I=L.isInstancedMesh===!0?L.id:0,z=B[I];if(z!==void 0){for(let W in z){let q=z[W];for(let et in q)h(q[et].object),delete q[et];delete z[W]}delete B[I],Object.keys(B).length===0&&delete n[F]}}}function T(){P(),o=!0,r!==s&&(r=s,c(r.object))}function P(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:T,resetDefaultState:P,dispose:E,releaseStatesOfGeometry:b,releaseStatesOfObject:x,releaseStatesOfProgram:C,initAttributes:v,enableAttribute:g,disableUnusedAttributes:S}}function cx(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let p=0;p<h;p++)u+=c[p];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function hx(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let C=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(C){return!(C!==zn&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){let x=C===nn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==En&&C!==ii&&!x&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(C){if(C==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Ct("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let d=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&Ct("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),S=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),R=i.getParameter(i.MAX_VARYING_VECTORS),y=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),E=i.getParameter(i.MAX_SAMPLES),b=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:p,maxVertexTextures:m,maxTextureSize:v,maxCubemapSize:g,maxAttributes:f,maxVertexUniforms:S,maxVaryings:R,maxFragmentUniforms:y,maxSamples:E,samples:b}}function ux(i){let t=this,e=null,n=0,s=!1,r=!1,o=new gn,a=new Dt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let p=d.length!==0||u||n!==0||s;return s=u,n=d.length,p},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,p){let m=d.clippingPlanes,v=d.clipIntersection,g=d.clipShadows,f=i.get(d);if(!s||m===null||m.length===0||r&&!g)r?h(null):c();else{let S=r?0:n,R=S*4,y=f.clippingState||null;l.value=y,y=h(m,u,R,p);for(let E=0;E!==R;++E)y[E]=e[E];f.clippingState=y,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,p,m){let v=d!==null?d.length:0,g=null;if(v!==0){if(g=l.value,m!==!0||g===null){let f=p+v*4,S=u.matrixWorldInverse;a.getNormalMatrix(S),(g===null||g.length<f)&&(g=new Float32Array(f));for(let R=0,y=p;R!==v;++R,y+=4)o.copy(d[R]).applyMatrix4(S,a),o.normal.toArray(g,y),g[y+3]=o.constant}l.value=g,l.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,g}}var xr=4,dx=6,fx=20,px=256,Ro=new $i,Lf=new yt,tu=null,eu=0,nu=0,iu=!1,mx=new A,Es=new A,vr=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:o=256,position:a=mx}=r;tu=this._renderer.getRenderTarget(),eu=this._renderer.getActiveCubeFace(),nu=this._renderer.getActiveMipmapLevel(),iu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Uf(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Nf(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(tu,eu,nu),this._renderer.xr.enabled=iu,t.scissorTest=!1,_r(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Qi||t.mapping===Ss?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),tu=this._renderer.getRenderTarget(),eu=this._renderer.getActiveCubeFace(),nu=this._renderer.getActiveMipmapLevel(),iu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:tn,minFilter:tn,generateMipmaps:!1,type:nn,format:zn,colorSpace:qr,depthBuffer:!1},s=Df(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Df(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=gx(r)),this._blurMaterial=xx(r,t,e),this._ggxMaterial=_x(r,t,e)}return s}_compileMaterial(t){let e=new te(new se,t);this._renderer.compile(e,Ro)}_sceneToCubeUV(t,e,n,s,r){let l=new Qe(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,p=d.toneMapping;d.getClearColor(Lf),d.toneMapping=ei,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new te(new xn,new en({name:"PMREM.Background",side:yn,depthWrite:!1,depthTest:!1})));let v=this._backgroundBox,g=v.material,f=!1,S=t.background;S?S.isColor&&(g.color.copy(S),t.background=null,f=!0):(g.color.copy(Lf),f=!0);for(let R=0;R<6;R++){let y=R%3;y===0?(l.up.set(0,c[R],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[R],r.y,r.z)):y===1?(l.up.set(0,0,c[R]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[R],r.z)):(l.up.set(0,c[R],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[R]));let E=this._cubeSize;_r(s,y*E,R>2?E:0,E,E),d.setRenderTarget(s),f&&d.render(v,l),d.render(t,l)}d.toneMapping=p,d.autoClear=u,t.background=S}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===Qi||t.mapping===Ss;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Uf()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Nf());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;_r(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,Ro)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=c*1.25,p=d*u,{_lodMax:m}=this,v=this._sizeLods[n],g=3*v*(n>m-xr?n-m+xr:0),f=4*(this._cubeSize-v);l.envMap.value=t.texture,l.roughness.value=p,l.mipInt.value=m-e,_r(r,g,f,3*v,2*v),s.setRenderTarget(r),s.render(a,Ro),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=m-n,_r(t,g,f,3*v,2*v),s.setRenderTarget(t),s.render(a,Ro)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,o=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,o),this._blurPass(r,t,n,n,o)}_blurPass(t,e,n,s,r){let o=this._renderer,a=this._blurMaterial,l=this._lodMeshes[s];l.material=a;let c=a.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],d=3*h*(s>this._lodMax-xr?s-this._lodMax+xr:0),u=4*(this._cubeSize-h);_r(e,d,u,3*h,2*h),o.setRenderTarget(e),o.render(l,Ro)}};function gx(i){let t=[],e=[],n=i,s=i-xr+1+dx;for(let r=0;r<s;r++){let o=Math.pow(2,n);t.push(o);let a=1/(o-2),l=-a,c=1+a,h=[l,l,c,l,c,c,l,l,c,c,l,c],d=6,u=6,p=3,m=new Float32Array(p*u*d),v=new Float32Array(p*u*d);for(let f=0;f<d;f++){let S=f%3*2/3-1,R=f>2?0:-1,y=[S,R,0,S+2/3,R,0,S+2/3,R+1,0,S,R,0,S+2/3,R+1,0,S,R+1,0];m.set(y,p*u*f);for(let E=0;E<u;E++){let b=h[E*2]*2-1,C=h[E*2+1]*2-1;f===0?Es.set(1,C,b):f===1?Es.set(-b,1,-C):f===2?Es.set(-b,C,1):f===3?Es.set(-1,C,-b):f===4?Es.set(-b,-1,C):Es.set(b,C,-1),Es.toArray(v,(f*u+E)*p)}}let g=new se;g.setAttribute("position",new jt(m,p)),g.setAttribute("outputDirection",new jt(v,p)),e.push(new te(g,null)),n>xr&&n--}return{lodMeshes:e,sizeLods:t}}function Df(i,t,e){let n=new Ue(i,t,e);return n.texture.mapping=vo,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function _r(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function _x(i,t,e){return new de({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:px,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:ac(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Bn,depthTest:!1,depthWrite:!1})}function xx(i,t,e){return new de({name:"SphericalGaussianBlur",defines:{SAMPLES:fx,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:ac(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:Bn,depthTest:!1,depthWrite:!1})}function Nf(){return new de({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ac(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Bn,depthTest:!1,depthWrite:!1})}function Uf(){return new de({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ac(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Bn,depthTest:!1,depthWrite:!1})}function ac(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var rc=class extends Ue{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new to(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new xn(5,5,5),r=new de({name:"CubemapFromEquirect",uniforms:bs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:yn,blending:Bn});r.uniforms.tEquirect.value=e;let o=new te(s,r),a=e.minFilter;return e.minFilter===ts&&(e.minFilter=tn),new dl(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}};function yx(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,p=!1){return u==null?null:p?o(u):r(u)}function r(u){if(u&&u.isTexture){let p=u.mapping;if(p===ml||p===gl)if(t.has(u)){let m=t.get(u).texture;return a(m,u.mapping)}else{let m=u.image;if(m&&m.height>0){let v=new rc(m.height);return v.fromEquirectangularTexture(i,u),t.set(u,v),u.addEventListener("dispose",c),a(v.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){let p=u.mapping,m=p===ml||p===gl,v=p===Qi||p===Ss;if(m||v){let g=e.get(u),f=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==f)return n===null&&(n=new vr(i)),g=m?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),g.texture;if(g!==void 0)return g.texture;{let S=u.image;return m&&S&&S.height>0||v&&S&&l(S)?(n===null&&(n=new vr(i)),g=m?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function a(u,p){return p===ml?u.mapping=Qi:p===gl&&(u.mapping=Ss),u}function l(u){let p=0,m=6;for(let v=0;v<m;v++)u[v]!==void 0&&p++;return p===m}function c(u){let p=u.target;p.removeEventListener("dispose",c);let m=t.get(p);m!==void 0&&(t.delete(p),m.dispose())}function h(u){let p=u.target;p.removeEventListener("dispose",h);let m=e.get(p);m!==void 0&&(e.delete(p),m.dispose())}function d(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function vx(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&fs("WebGLRenderer: "+n+" extension not supported."),s}}}function Mx(i,t,e,n){let s={},r=new WeakMap;function o(d){let u=d.target;u.index!==null&&t.remove(u.index);for(let m in u.attributes)t.remove(u.attributes[m]);u.removeEventListener("dispose",o),delete s[u.id];let p=r.get(u);p&&(t.remove(p),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,e.memory.geometries++),u}function l(d){let u=d.attributes;for(let p in u)t.update(u[p],i.ARRAY_BUFFER)}function c(d){let u=[],p=d.index,m=d.attributes.position,v=0;if(m===void 0)return;if(p!==null){let S=p.array;v=p.version;for(let R=0,y=S.length;R<y;R+=3){let E=S[R+0],b=S[R+1],C=S[R+2];u.push(E,b,b,C,C,E)}}else{let S=m.array;v=m.version;for(let R=0,y=S.length/3-1;R<y;R+=3){let E=R+0,b=R+1,C=R+2;u.push(E,b,b,C,C,E)}}let g=new(m.count>=65535?jr:Jr)(u,1);g.version=v;let f=r.get(d);f&&t.remove(f),r.set(d,g)}function h(d){let u=r.get(d);if(u){let p=d.index;p!==null&&u.version<p.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function Sx(i,t,e){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*o),e.update(u,n,1)}function c(d,u,p){p!==0&&(i.drawElementsInstanced(n,u,r,d*o,p),e.update(u,n,p))}function h(d,u,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,p);let v=0;for(let g=0;g<p;g++)v+=u[g];e.update(v,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function bx(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:It("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function Ex(i,t,e){let n=new WeakMap,s=new Ee;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==d){let T=function(){C.dispose(),n.delete(a),a.removeEventListener("dispose",T)};u!==void 0&&u.texture.dispose();let p=a.morphAttributes.position!==void 0,m=a.morphAttributes.normal!==void 0,v=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],f=a.morphAttributes.normal||[],S=a.morphAttributes.color||[],R=0;p===!0&&(R=1),m===!0&&(R=2),v===!0&&(R=3);let y=a.attributes.position.count*R,E=1;y>t.maxTextureSize&&(E=Math.ceil(y/t.maxTextureSize),y=t.maxTextureSize);let b=new Float32Array(y*E*4*d),C=new $r(b,y,E,d);C.type=ii,C.needsUpdate=!0;let x=R*4;for(let P=0;P<d;P++){let L=g[P],F=f[P],B=S[P],I=y*E*4*P;for(let z=0;z<L.count;z++){let W=z*x;p===!0&&(s.fromBufferAttribute(L,z),b[I+W+0]=s.x,b[I+W+1]=s.y,b[I+W+2]=s.z,b[I+W+3]=0),m===!0&&(s.fromBufferAttribute(F,z),b[I+W+4]=s.x,b[I+W+5]=s.y,b[I+W+6]=s.z,b[I+W+7]=0),v===!0&&(s.fromBufferAttribute(B,z),b[I+W+8]=s.x,b[I+W+9]=s.y,b[I+W+10]=s.z,b[I+W+11]=B.itemSize===4?s.w:1)}}u={count:d,texture:C,size:new ct(y,E)},n.set(a,u),a.addEventListener("dispose",T)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let p=0;for(let v=0;v<c.length;v++)p+=c[v];let m=a.morphTargetsRelative?1:1-p;l.getUniforms().setValue(i,"morphTargetBaseInfluence",m),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function Tx(i,t,e,n,s){let r=new WeakMap;function o(c){let h=s.render.frame,d=c.geometry,u=t.get(c,d);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let p=c.skeleton;r.get(p)!==h&&(p.update(),r.set(p,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var wx={[po]:"LINEAR_TONE_MAPPING",[mo]:"REINHARD_TONE_MAPPING",[go]:"CINEON_TONE_MAPPING",[_o]:"ACES_FILMIC_TONE_MAPPING",[yo]:"AGX_TONE_MAPPING",[Ms]:"NEUTRAL_TONE_MAPPING",[xo]:"CUSTOM_TONE_MAPPING"};function Ax(i,t,e,n,s,r){let o=new Ue(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,l=null,c=new se;c.setAttribute("position",new Qt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Qt([0,2,0,0,2,0],2));let h=new lr({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new te(c,h),u=new $i(-1,1,1,-1,0,1),p=null,m=null,v=!1,g,f=null,S=[],R=!1;this.setSize=function(y,E){o.setSize(y,E),a!==null&&a.setSize(y,E),l!==null&&l.setSize(y,E);for(let b=0;b<S.length;b++){let C=S[b];C.setSize&&C.setSize(y,E)}},this.setEffects=function(y){S=y,R=S.length>0&&S[0].isRenderPass===!0;let E=o.width,b=o.height;S.length>0&&a===null&&(a=new Ue(E,b,{type:nn,depthBuffer:!1,stencilBuffer:!1}),l=new Ue(E,b,{type:nn,depthBuffer:!1,stencilBuffer:!1}));for(let C=0;C<S.length;C++){let x=S[C];x.setSize&&x.setSize(E,b)}},this.begin=function(y,E){if(v||y.toneMapping===ei&&S.length===0)return!1;if(f=E,E!==null){let b=E.width,C=E.height;(o.width!==b||o.height!==C)&&this.setSize(b,C)}return R===!1&&y.setRenderTarget(o),g=y.toneMapping,y.toneMapping=ei,!0},this.hasRenderPass=function(){return R},this.end=function(y,E){y.toneMapping=g,v=!0;let b=o,C=a;for(let x=0;x<S.length;x++){let T=S[x];T.enabled!==!1&&(T.render(y,C,b,E),T.needsSwap!==!1&&(b=C,C=C===a?l:a))}if(p!==y.outputColorSpace||m!==y.toneMapping){p=y.outputColorSpace,m=y.toneMapping,h.defines={},Vt.getTransfer(p)===ie&&(h.defines.SRGB_TRANSFER="");let x=wx[m];x&&(h.defines[x]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=b.texture,y.setRenderTarget(f),y.render(d,u),f=null,v=!1},this.isCompositing=function(){return v},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var ep=new _n,ou=new qi(1,1),np=new $r,ip=new qa,sp=new to,Ff=[],Of=[],Bf=new Float32Array(16),zf=new Float32Array(9),kf=new Float32Array(4);function Mr(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Ff[s];if(r===void 0&&(r=new Float32Array(s),Ff[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function He(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ve(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function lc(i,t){let e=Of[t];e===void 0&&(e=new Int32Array(t),Of[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function Rx(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function Cx(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;i.uniform2fv(this.addr,t),Ve(e,t)}}function Px(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(He(e,t))return;i.uniform3fv(this.addr,t),Ve(e,t)}}function Ix(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;i.uniform4fv(this.addr,t),Ve(e,t)}}function Lx(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(He(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ve(e,t)}else{if(He(e,n))return;kf.set(n),i.uniformMatrix2fv(this.addr,!1,kf),Ve(e,n)}}function Dx(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(He(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ve(e,t)}else{if(He(e,n))return;zf.set(n),i.uniformMatrix3fv(this.addr,!1,zf),Ve(e,n)}}function Nx(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(He(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ve(e,t)}else{if(He(e,n))return;Bf.set(n),i.uniformMatrix4fv(this.addr,!1,Bf),Ve(e,n)}}function Ux(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function Fx(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;i.uniform2iv(this.addr,t),Ve(e,t)}}function Ox(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(He(e,t))return;i.uniform3iv(this.addr,t),Ve(e,t)}}function Bx(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;i.uniform4iv(this.addr,t),Ve(e,t)}}function zx(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function kx(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;i.uniform2uiv(this.addr,t),Ve(e,t)}}function Hx(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(He(e,t))return;i.uniform3uiv(this.addr,t),Ve(e,t)}}function Vx(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;i.uniform4uiv(this.addr,t),Ve(e,t)}}function Gx(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ou.compareFunction=e.isReversedDepthBuffer()?nc:ec,r=ou):r=ep,e.setTexture2D(t||r,s)}function Wx(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||ip,s)}function Xx(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||sp,s)}function qx(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||np,s)}function Yx(i){switch(i){case 5126:return Rx;case 35664:return Cx;case 35665:return Px;case 35666:return Ix;case 35674:return Lx;case 35675:return Dx;case 35676:return Nx;case 5124:case 35670:return Ux;case 35667:case 35671:return Fx;case 35668:case 35672:return Ox;case 35669:case 35673:return Bx;case 5125:return zx;case 36294:return kx;case 36295:return Hx;case 36296:return Vx;case 35678:case 36198:case 36298:case 36306:case 35682:return Gx;case 35679:case 36299:case 36307:return Wx;case 35680:case 36300:case 36308:case 36293:return Xx;case 36289:case 36303:case 36311:case 36292:return qx}}function Zx(i,t){i.uniform1fv(this.addr,t)}function Kx(i,t){let e=Mr(t,this.size,2);i.uniform2fv(this.addr,e)}function $x(i,t){let e=Mr(t,this.size,3);i.uniform3fv(this.addr,e)}function Jx(i,t){let e=Mr(t,this.size,4);i.uniform4fv(this.addr,e)}function jx(i,t){let e=Mr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function Qx(i,t){let e=Mr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function ty(i,t){let e=Mr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function ey(i,t){i.uniform1iv(this.addr,t)}function ny(i,t){i.uniform2iv(this.addr,t)}function iy(i,t){i.uniform3iv(this.addr,t)}function sy(i,t){i.uniform4iv(this.addr,t)}function ry(i,t){i.uniform1uiv(this.addr,t)}function oy(i,t){i.uniform2uiv(this.addr,t)}function ay(i,t){i.uniform3uiv(this.addr,t)}function ly(i,t){i.uniform4uiv(this.addr,t)}function cy(i,t,e){let n=this.cache,s=t.length,r=lc(e,s);He(n,r)||(i.uniform1iv(this.addr,r),Ve(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=ou:o=ep;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function hy(i,t,e){let n=this.cache,s=t.length,r=lc(e,s);He(n,r)||(i.uniform1iv(this.addr,r),Ve(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||ip,r[o])}function uy(i,t,e){let n=this.cache,s=t.length,r=lc(e,s);He(n,r)||(i.uniform1iv(this.addr,r),Ve(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||sp,r[o])}function dy(i,t,e){let n=this.cache,s=t.length,r=lc(e,s);He(n,r)||(i.uniform1iv(this.addr,r),Ve(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||np,r[o])}function fy(i){switch(i){case 5126:return Zx;case 35664:return Kx;case 35665:return $x;case 35666:return Jx;case 35674:return jx;case 35675:return Qx;case 35676:return ty;case 5124:case 35670:return ey;case 35667:case 35671:return ny;case 35668:case 35672:return iy;case 35669:case 35673:return sy;case 5125:return ry;case 36294:return oy;case 36295:return ay;case 36296:return ly;case 35678:case 36198:case 36298:case 36306:case 35682:return cy;case 35679:case 36299:case 36307:return hy;case 35680:case 36300:case 36308:case 36293:return uy;case 36289:case 36303:case 36311:case 36292:return dy}}var au=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Yx(e.type)}},lu=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=fy(e.type)}},cu=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],n)}}},su=/(\w+)(\])?(\[|\.)?/g;function Hf(i,t){i.seq.push(t),i.map[t.id]=t}function py(i,t,e){let n=i.name,s=n.length;for(su.lastIndex=0;;){let r=su.exec(n),o=su.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Hf(e,c===void 0?new au(a,i,t):new lu(a,i,t));break}else{let d=e.map[a];d===void 0&&(d=new cu(a),Hf(e,d)),e=d}}}var yr=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);py(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&n.push(o)}return n}};function Vf(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var my=37297,gy=0;function _y(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}var Gf=new Dt;function xy(i){Vt._getMatrix(Gf,Vt.workingColorSpace,i);let t=`mat3( ${Gf.elements.map(e=>e.toFixed(4))} )`;switch(Vt.getTransfer(i)){case Yr:return[t,"LinearTransferOETF"];case ie:return[t,"sRGBTransferOETF"];default:return Ct("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function Wf(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+_y(i.getShaderSource(t),a)}else return r}function yy(i,t){let e=xy(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var vy={[po]:"Linear",[mo]:"Reinhard",[go]:"Cineon",[_o]:"ACESFilmic",[yo]:"AgX",[Ms]:"Neutral",[xo]:"Custom"};function My(i,t){let e=vy[t];return e===void 0?(Ct("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var sc=new A;function Sy(){Vt.getLuminanceCoefficients(sc);let i=sc.x.toFixed(4),t=sc.y.toFixed(4),e=sc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function by(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Po).join(`
`)}function Ey(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Ty(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function Po(i){return i!==""}function Xf(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function qf(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var wy=/^[ \t]*#include +<([\w\d./]+)>/gm;function hu(i){return i.replace(wy,Ry)}var Ay=new Map;function Ry(i,t){let e=zt[t];if(e===void 0){let n=Ay.get(t);if(n!==void 0)e=zt[n],Ct('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return hu(e)}var Cy=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Yf(i){return i.replace(Cy,Py)}function Py(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Zf(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var Iy={[fo]:"SHADOWMAP_TYPE_PCF",[dr]:"SHADOWMAP_TYPE_VSM"};function Ly(i){return Iy[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Dy={[Qi]:"ENVMAP_TYPE_CUBE",[Ss]:"ENVMAP_TYPE_CUBE",[vo]:"ENVMAP_TYPE_CUBE_UV"};function Ny(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Dy[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var Uy={[Ss]:"ENVMAP_MODE_REFRACTION"};function Fy(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Uy[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Oy={[Dh]:"ENVMAP_BLENDING_MULTIPLY",[df]:"ENVMAP_BLENDING_MIX",[ff]:"ENVMAP_BLENDING_ADD"};function By(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Oy[i.combine]||"ENVMAP_BLENDING_NONE"}function zy(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function ky(i,t,e,n){let s=i.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=Ly(e),c=Ny(e),h=Fy(e),d=By(e),u=zy(e),p=by(e),m=Ey(r),v=s.createProgram(),g,f,S=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(Po).join(`
`),g.length>0&&(g+=`
`),f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(Po).join(`
`),f.length>0&&(f+=`
`)):(g=[Zf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Po).join(`
`),f=[Zf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==ei?"#define TONE_MAPPING":"",e.toneMapping!==ei?zt.tonemapping_pars_fragment:"",e.toneMapping!==ei?My("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",zt.colorspace_pars_fragment,yy("linearToOutputTexel",e.outputColorSpace),Sy(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Po).join(`
`)),o=hu(o),o=Xf(o,e),o=qf(o,e),a=hu(a),a=Xf(a,e),a=qf(a,e),o=Yf(o),a=Yf(a),e.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,g=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,f=["#define varying in",e.glslVersion===Gh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Gh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);let R=S+g+o,y=S+f+a,E=Vf(s,s.VERTEX_SHADER,R),b=Vf(s,s.FRAGMENT_SHADER,y);s.attachShader(v,E),s.attachShader(v,b),e.index0AttributeName!==void 0?s.bindAttribLocation(v,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(v,0,"position"),s.linkProgram(v);function C(L){if(i.debug.checkShaderErrors){let F=s.getProgramInfoLog(v)||"",B=s.getShaderInfoLog(E)||"",I=s.getShaderInfoLog(b)||"",z=F.trim(),W=B.trim(),q=I.trim(),et=!0,X=!0;if(s.getProgramParameter(v,s.LINK_STATUS)===!1)if(et=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,v,E,b);else{let J=Wf(s,E,"vertex"),tt=Wf(s,b,"fragment");It("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(v,s.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+z+`
`+J+`
`+tt)}else z!==""?Ct("WebGLProgram: Program Info Log:",z):(W===""||q==="")&&(X=!1);X&&(L.diagnostics={runnable:et,programLog:z,vertexShader:{log:W,prefix:g},fragmentShader:{log:q,prefix:f}})}s.deleteShader(E),s.deleteShader(b),x=new yr(s,v),T=Ty(s,v)}let x;this.getUniforms=function(){return x===void 0&&C(this),x};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let P=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=s.getProgramParameter(v,my)),P},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=gy++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=E,this.fragmentShader=b,this}var Hy=0,uu=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new du(t),e.set(t,n)),n}},du=class{constructor(t){this.id=Hy++,this.code=t,this.usedTimes=0}};function Vy(i){return i===ns||i===wo||i===Ao}function Gy(i,t,e,n,s,r){let o=new sr,a=new uu,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(x){return l.add(x),x===0?"uv":`uv${x}`}function v(x,T,P,L,F,B){let I=L.fog,z=F.geometry,W=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?L.environment:null,q=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,et=t.get(x.envMap||W,q),X=et&&et.mapping===vo?et.image.height:null,J=p[x.type];x.precision!==null&&(u=n.getMaxPrecision(x.precision),u!==x.precision&&Ct("WebGLProgram.getParameters:",x.precision,"not supported, using",u,"instead."));let tt=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,Tt=tt!==void 0?tt.length:0,St=0;z.morphAttributes.position!==void 0&&(St=1),z.morphAttributes.normal!==void 0&&(St=2),z.morphAttributes.color!==void 0&&(St=3);let ae,Zt,re,Z;if(J){let _e=_i[J];ae=_e.vertexShader,Zt=_e.fragmentShader}else{ae=x.vertexShader,Zt=x.fragmentShader;let _e=a.getVertexShaderStage(x),le=a.getFragmentShaderStage(x);a.update(x,_e,le),re=_e.id,Z=le.id}let Q=i.getRenderTarget(),xt=i.state.buffers.depth.getReversed(),Nt=F.isInstancedMesh===!0,gt=F.isBatchedMesh===!0,Ht=!!x.map,Be=!!x.matcap,Gt=!!et,ne=!!x.aoMap,ge=!!x.lightMap,Xt=!!x.bumpMap&&x.wireframe===!1,be=!!x.normalMap,Xe=!!x.displacementMap,bn=!!x.emissiveMap,we=!!x.metalnessMap,Le=!!x.roughnessMap,U=x.anisotropy>0,rn=x.clearcoat>0,he=x.dispersion>0,w=x.retroreflectivity>0,_=x.iridescence>0,O=x.sheen>0,V=x.transmission>0,Y=U&&!!x.anisotropyMap,it=rn&&!!x.clearcoatMap,st=rn&&!!x.clearcoatNormalMap,K=rn&&!!x.clearcoatRoughnessMap,j=_&&!!x.iridescenceMap,rt=_&&!!x.iridescenceThicknessMap,wt=O&&!!x.sheenColorMap,ht=O&&!!x.sheenRoughnessMap,ot=!!x.specularMap,At=!!x.specularColorMap,Pt=!!x.specularIntensityMap,Ut=V&&!!x.transmissionMap,N=V&&!!x.thicknessMap,at=!!x.gradientMap,$=!!x.alphaMap,lt=x.alphaTest>0,pt=!!x.alphaHash,nt=!!x.extensions,Rt=ei;x.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(Rt=i.toneMapping);let bt={shaderID:J,shaderType:x.type,shaderName:x.name,vertexShader:ae,fragmentShader:Zt,defines:x.defines,customVertexShaderID:re,customFragmentShaderID:Z,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:u,batching:gt,batchingColor:gt&&F._colorsTexture!==null,instancing:Nt,instancingColor:Nt&&F.instanceColor!==null,instancingMorph:Nt&&F.morphTexture!==null,outputColorSpace:Q===null?i.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:Vt.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:Ht,matcap:Be,envMap:Gt,envMapMode:Gt&&et.mapping,envMapCubeUVHeight:X,aoMap:ne,lightMap:ge,bumpMap:Xt,normalMap:be,displacementMap:Xe,emissiveMap:bn,normalMapObjectSpace:be&&x.normalMapType===gf,normalMapTangentSpace:be&&x.normalMapType===tc,packedNormalMap:be&&x.normalMapType===tc&&Vy(x.normalMap.format),metalnessMap:we,roughnessMap:Le,anisotropy:U,anisotropyMap:Y,clearcoat:rn,clearcoatMap:it,clearcoatNormalMap:st,clearcoatRoughnessMap:K,dispersion:he,retroreflection:w,iridescence:_,iridescenceMap:j,iridescenceThicknessMap:rt,sheen:O,sheenColorMap:wt,sheenRoughnessMap:ht,specularMap:ot,specularColorMap:At,specularIntensityMap:Pt,transmission:V,transmissionMap:Ut,thicknessMap:N,gradientMap:at,opaque:x.transparent===!1&&x.blending===fr&&x.alphaToCoverage===!1,alphaMap:$,alphaTest:lt,alphaHash:pt,combine:x.combine,mapUv:Ht&&m(x.map.channel),aoMapUv:ne&&m(x.aoMap.channel),lightMapUv:ge&&m(x.lightMap.channel),bumpMapUv:Xt&&m(x.bumpMap.channel),normalMapUv:be&&m(x.normalMap.channel),displacementMapUv:Xe&&m(x.displacementMap.channel),emissiveMapUv:bn&&m(x.emissiveMap.channel),metalnessMapUv:we&&m(x.metalnessMap.channel),roughnessMapUv:Le&&m(x.roughnessMap.channel),anisotropyMapUv:Y&&m(x.anisotropyMap.channel),clearcoatMapUv:it&&m(x.clearcoatMap.channel),clearcoatNormalMapUv:st&&m(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:K&&m(x.clearcoatRoughnessMap.channel),iridescenceMapUv:j&&m(x.iridescenceMap.channel),iridescenceThicknessMapUv:rt&&m(x.iridescenceThicknessMap.channel),sheenColorMapUv:wt&&m(x.sheenColorMap.channel),sheenRoughnessMapUv:ht&&m(x.sheenRoughnessMap.channel),specularMapUv:ot&&m(x.specularMap.channel),specularColorMapUv:At&&m(x.specularColorMap.channel),specularIntensityMapUv:Pt&&m(x.specularIntensityMap.channel),transmissionMapUv:Ut&&m(x.transmissionMap.channel),thicknessMapUv:N&&m(x.thicknessMap.channel),alphaMapUv:$&&m(x.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(be||U),vertexNormals:!!z.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!z.attributes.uv&&(Ht||$),fog:!!I,useFog:x.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||z.attributes.normal===void 0&&be===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:xt,skinning:F.isSkinnedMesh===!0,hasPositionAttribute:z.attributes.position!==void 0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:Tt,morphTextureStride:St,numSunLights:T.sun.length,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numSunLightShadows:T.sunShadowMap.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:Rt,decodeVideoTexture:Ht&&x.map.isVideoTexture===!0&&Vt.getTransfer(x.map.colorSpace)===ie,decodeVideoTextureEmissive:bn&&x.emissiveMap.isVideoTexture===!0&&Vt.getTransfer(x.emissiveMap.colorSpace)===ie,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===Ke,flipSided:x.side===yn,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:nt&&x.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(nt&&x.extensions.multiDraw===!0||gt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return bt.vertexUv1s=l.has(1),bt.vertexUv2s=l.has(2),bt.vertexUv3s=l.has(3),l.clear(),bt}function g(x){let T=[];if(x.shaderID?T.push(x.shaderID):(T.push(x.customVertexShaderID),T.push(x.customFragmentShaderID)),x.defines!==void 0)for(let P in x.defines)T.push(P),T.push(x.defines[P]);return x.isRawShaderMaterial===!1&&(f(T,x),S(T,x),T.push(i.outputColorSpace)),T.push(x.customProgramCacheKey),T.join()}function f(x,T){x.push(T.precision),x.push(T.outputColorSpace),x.push(T.envMapMode),x.push(T.envMapCubeUVHeight),x.push(T.mapUv),x.push(T.alphaMapUv),x.push(T.lightMapUv),x.push(T.aoMapUv),x.push(T.bumpMapUv),x.push(T.normalMapUv),x.push(T.displacementMapUv),x.push(T.emissiveMapUv),x.push(T.metalnessMapUv),x.push(T.roughnessMapUv),x.push(T.anisotropyMapUv),x.push(T.clearcoatMapUv),x.push(T.clearcoatNormalMapUv),x.push(T.clearcoatRoughnessMapUv),x.push(T.iridescenceMapUv),x.push(T.iridescenceThicknessMapUv),x.push(T.sheenColorMapUv),x.push(T.sheenRoughnessMapUv),x.push(T.specularMapUv),x.push(T.specularColorMapUv),x.push(T.specularIntensityMapUv),x.push(T.transmissionMapUv),x.push(T.thicknessMapUv),x.push(T.combine),x.push(T.fogExp2),x.push(T.sizeAttenuation),x.push(T.morphTargetsCount),x.push(T.morphAttributeCount),x.push(T.numSunLights),x.push(T.numDirLights),x.push(T.numPointLights),x.push(T.numSpotLights),x.push(T.numSpotLightMaps),x.push(T.numHemiLights),x.push(T.numRectAreaLights),x.push(T.numSunLightShadows),x.push(T.numDirLightShadows),x.push(T.numPointLightShadows),x.push(T.numSpotLightShadows),x.push(T.numSpotLightShadowsWithMaps),x.push(T.numLightProbes),x.push(T.shadowMapType),x.push(T.toneMapping),x.push(T.numClippingPlanes),x.push(T.numClipIntersection),x.push(T.depthPacking)}function S(x,T){o.disableAll(),T.instancing&&o.enable(0),T.instancingColor&&o.enable(1),T.instancingMorph&&o.enable(2),T.matcap&&o.enable(3),T.envMap&&o.enable(4),T.normalMapObjectSpace&&o.enable(5),T.normalMapTangentSpace&&o.enable(6),T.clearcoat&&o.enable(7),T.iridescence&&o.enable(8),T.alphaTest&&o.enable(9),T.vertexColors&&o.enable(10),T.vertexAlphas&&o.enable(11),T.vertexUv1s&&o.enable(12),T.vertexUv2s&&o.enable(13),T.vertexUv3s&&o.enable(14),T.vertexTangents&&o.enable(15),T.anisotropy&&o.enable(16),T.alphaHash&&o.enable(17),T.batching&&o.enable(18),T.dispersion&&o.enable(19),T.retroreflection&&o.enable(24),T.batchingColor&&o.enable(20),T.gradientMap&&o.enable(21),T.packedNormalMap&&o.enable(22),T.vertexNormals&&o.enable(23),x.push(o.mask),o.disableAll(),T.fog&&o.enable(0),T.useFog&&o.enable(1),T.flatShading&&o.enable(2),T.logarithmicDepthBuffer&&o.enable(3),T.reversedDepthBuffer&&o.enable(4),T.skinning&&o.enable(5),T.morphTargets&&o.enable(6),T.morphNormals&&o.enable(7),T.morphColors&&o.enable(8),T.premultipliedAlpha&&o.enable(9),T.shadowMapEnabled&&o.enable(10),T.doubleSided&&o.enable(11),T.flipSided&&o.enable(12),T.useDepthPacking&&o.enable(13),T.dithering&&o.enable(14),T.transmission&&o.enable(15),T.sheen&&o.enable(16),T.opaque&&o.enable(17),T.pointsUvs&&o.enable(18),T.decodeVideoTexture&&o.enable(19),T.decodeVideoTextureEmissive&&o.enable(20),T.alphaToCoverage&&o.enable(21),T.numLightProbeGrids>0&&o.enable(22),T.hasPositionAttribute&&o.enable(23),x.push(o.mask)}function R(x){let T=p[x.type],P;if(T){let L=_i[T];P=Pi.clone(L.uniforms)}else P=x.uniforms;return P}function y(x,T){let P=h.get(T);return P!==void 0?++P.usedTimes:(P=new ky(i,T,x,s),c.push(P),h.set(T,P)),P}function E(x){if(--x.usedTimes===0){let T=c.indexOf(x);c[T]=c[c.length-1],c.pop(),h.delete(x.cacheKey),x.destroy()}}function b(x){a.remove(x)}function C(){a.dispose()}return{getParameters:v,getProgramCacheKey:g,getUniforms:R,acquireProgram:y,releaseProgram:E,releaseShaderCache:b,programs:c,dispose:C}}function Wy(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Xy(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function Kf(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function $f(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(u){let p=0;return u.isInstancedMesh&&(p+=2),u.isSkinnedMesh&&(p+=1),p}function a(u,p,m,v,g,f){let S=i[t];return S===void 0?(S={id:u.id,object:u,geometry:p,material:m,materialVariant:o(u),groupOrder:v,renderOrder:u.renderOrder,z:g,group:f},i[t]=S):(S.id=u.id,S.object=u,S.geometry=p,S.material=m,S.materialVariant=o(u),S.groupOrder=v,S.renderOrder=u.renderOrder,S.z=g,S.group=f),t++,S}function l(u,p,m,v,g,f,S){S.reversedDepth===!0&&(g=-g);let R=a(u,p,m,v,g,f);m.transmission>0?n.push(R):m.transparent===!0?s.push(R):e.push(R)}function c(u,p,m,v,g,f){let S=a(u,p,m,v,g,f);m.transmission>0?n.unshift(S):m.transparent===!0?s.unshift(S):e.unshift(S)}function h(u,p){e.length>1&&e.sort(u||Xy),n.length>1&&n.sort(p||Kf),s.length>1&&s.sort(p||Kf)}function d(){for(let u=t,p=i.length;u<p;u++){let m=i[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function qy(){let i=new WeakMap;function t(n,s){let r=i.get(n),o;return r===void 0?(o=new $f,i.set(n,[o])):s>=r.length?(o=new $f,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function Yy(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new A,color:new yt};break;case"SpotLight":e={position:new A,direction:new A,color:new yt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new A,color:new yt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new A,skyColor:new yt,groundColor:new yt};break;case"RectAreaLight":e={color:new yt,position:new A,halfWidth:new A,halfHeight:new A};break}return i[t.id]=e,e}}}function Zy(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var Ky=0;function $y(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Jy(i){let t=new Yy,e=Zy(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new A);let s=new A,r=new Jt,o=new Jt;function a(c){let h=0,d=0,u=0;for(let F=0;F<9;F++)n.probe[F].set(0,0,0);let p=0,m=0,v=0,g=0,f=0,S=0,R=0,y=0,E=0,b=0,C=0,x=0,T=0,P=0;c.sort($y);for(let F=0,B=c.length;F<B;F++){let I=c[F],z=I.color,W=I.intensity,q=I.distance,et=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===ns?et=I.shadow.map.texture:et=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=z.r*W,d+=z.g*W,u+=z.b*W;else if(I.isLightProbe){for(let X=0;X<9;X++)n.probe[X].addScaledVector(I.sh.coefficients[X],W);P++}else if(I.isSunLight){let X=t.get(I);if(X.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize.copy(J.mapSize).multiply(J.getFrameExtents()),n.sunShadow[m]=tt,n.sunShadowMap[m]=et;let Tt=J.getViewportCount();for(let St=0;St<Tt;St++)n.sunShadowMatrix[v+St]=J.getMatrix(St),n.sunShadowCascade[v+St]=J._cascadeData[St];v+=Tt,m++}n.sun[p]=X,p++}else if(I.isDirectionalLight){let X=t.get(I);if(X.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize=J.mapSize,n.directionalShadow[g]=tt,n.directionalShadowMap[g]=et,n.directionalShadowMatrix[g]=I.shadow.matrix,E++}n.directional[g]=X,g++}else if(I.isSpotLight){let X=t.get(I);X.position.setFromMatrixPosition(I.matrixWorld),X.color.copy(z).multiplyScalar(W),X.distance=q,X.coneCos=Math.cos(I.angle),X.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),X.decay=I.decay,n.spot[S]=X;let J=I.shadow;if(I.map&&(n.spotLightMap[x]=I.map,x++,J.updateMatrices(I),I.castShadow&&T++),n.spotLightMatrix[S]=J.matrix,I.castShadow){let tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize=J.mapSize,n.spotShadow[S]=tt,n.spotShadowMap[S]=et,C++}S++}else if(I.isRectAreaLight){let X=t.get(I);X.color.copy(z).multiplyScalar(W),X.halfWidth.set(I.width*.5,0,0),X.halfHeight.set(0,I.height*.5,0),n.rectArea[R]=X,R++}else if(I.isPointLight){let X=t.get(I);if(X.color.copy(I.color).multiplyScalar(I.intensity),X.distance=I.distance,X.decay=I.decay,I.castShadow){let J=I.shadow,tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize=J.mapSize,tt.shadowCameraNear=J.camera.near,tt.shadowCameraFar=J.camera.far,n.pointShadow[f]=tt,n.pointShadowMap[f]=et,n.pointShadowMatrix[f]=I.shadow.matrix,b++}n.point[f]=X,f++}else if(I.isHemisphereLight){let X=t.get(I);X.skyColor.copy(I.color).multiplyScalar(W),X.groundColor.copy(I.groundColor).multiplyScalar(W),n.hemi[y]=X,y++}}R>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ut.LTC_FLOAT_1,n.rectAreaLTC2=ut.LTC_FLOAT_2):(n.rectAreaLTC1=ut.LTC_HALF_1,n.rectAreaLTC2=ut.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let L=n.hash;(L.sunLength!==p||L.directionalLength!==g||L.pointLength!==f||L.spotLength!==S||L.rectAreaLength!==R||L.hemiLength!==y||L.numSunShadows!==m||L.numDirectionalShadows!==E||L.numPointShadows!==b||L.numSpotShadows!==C||L.numSpotMaps!==x||L.numLightProbes!==P)&&(n.sun.length=p,n.directional.length=g,n.spot.length=S,n.rectArea.length=R,n.point.length=f,n.hemi.length=y,n.sunShadow.length=m,n.sunShadowMap.length=m,n.sunShadowMatrix.length=v,n.sunShadowCascade.length=v,n.directionalShadow.length=E,n.directionalShadowMap.length=E,n.directionalShadowMatrix.length=E,n.pointShadow.length=b,n.pointShadowMap.length=b,n.pointShadowMatrix.length=b,n.spotShadow.length=C,n.spotShadowMap.length=C,n.spotLightMatrix.length=C+x-T,n.spotLightMap.length=x,n.numSpotLightShadowsWithMaps=T,n.numLightProbes=P,L.sunLength=p,L.directionalLength=g,L.pointLength=f,L.spotLength=S,L.rectAreaLength=R,L.hemiLength=y,L.numSunShadows=m,L.numDirectionalShadows=E,L.numPointShadows=b,L.numSpotShadows=C,L.numSpotMaps=x,L.numLightProbes=P,n.version=Ky++)}function l(c,h){let d=0,u=0,p=0,m=0,v=0,g=0,f=h.matrixWorldInverse;for(let S=0,R=c.length;S<R;S++){let y=c[S];if(y.isSunLight){let E=n.sun[d];E.direction.setFromMatrixPosition(y.matrixWorld),E.direction.transformDirection(f),d++}else if(y.isDirectionalLight){let E=n.directional[u];E.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(f),u++}else if(y.isSpotLight){let E=n.spot[m];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(f),E.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(f),m++}else if(y.isRectAreaLight){let E=n.rectArea[v];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(f),o.identity(),r.copy(y.matrixWorld),r.premultiply(f),o.extractRotation(r),E.halfWidth.set(y.width*.5,0,0),E.halfHeight.set(0,y.height*.5,0),E.halfWidth.applyMatrix4(o),E.halfHeight.applyMatrix4(o),v++}else if(y.isPointLight){let E=n.point[p];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(f),p++}else if(y.isHemisphereLight){let E=n.hemi[g];E.direction.setFromMatrixPosition(y.matrixWorld),E.direction.transformDirection(f),g++}}}return{setup:a,setupView:l,state:n}}function Jf(i){let t=new Jy(i),e=[],n=[],s=[];function r(u){d.camera=u,e.length=0,n.length=0,s.length=0}function o(u){e.push(u)}function a(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let d={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function jy(i){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new Jf(i),t.set(s,[a])):r>=o.length?(a=new Jf(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}var Qy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,tv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,ev=[new A(1,0,0),new A(-1,0,0),new A(0,1,0),new A(0,-1,0),new A(0,0,1),new A(0,0,-1)],nv=[new A(0,-1,0),new A(0,-1,0),new A(0,0,1),new A(0,0,-1),new A(0,-1,0),new A(0,-1,0)],jf=new Jt,Co=new A,ru=new A;function iv(i,t,e){let n=new ar,s=new ct,r=new ct,o=new Ee,a=new tl,l=new el,c={},h=e.maxTextureSize,d={[ji]:yn,[yn]:ji,[Ke]:Ke},u=new de({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ct},radius:{value:4}},vertexShader:Qy,fragmentShader:tv}),p=u.clone();p.defines.HORIZONTAL_PASS=1;let m=new se;m.setAttribute("position",new jt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let v=new te(m,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=fo;let f=this.type;this.render=function(b,C,x){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||b.length===0)return;this.type===qd&&(Ct("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=fo);let T=i.getRenderTarget(),P=i.getActiveCubeFace(),L=i.getActiveMipmapLevel(),F=i.state;F.setBlending(Bn),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);let B=f!==this.type;B&&C.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(z=>z.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,z=b.length;I<z;I++){let W=b[I],q=W.shadow;if(q===void 0){Ct("WebGLShadowMap:",W,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;s.copy(q.mapSize);let et=q.getFrameExtents();s.multiply(et),r.copy(q.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/et.x),s.x=r.x*et.x,q.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/et.y),s.y=r.y*et.y,q.mapSize.y=r.y));let X=i.state.buffers.depth.getReversed();if(q.camera._reversedDepth=X,q.map===null||B===!0){if(q.map!==null&&(q.map.depthTexture!==null&&(q.map.depthTexture.dispose(),q.map.depthTexture=null),q.map.dispose()),this.type===dr){if(W.isPointLight){Ct("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}q.map=new Ue(s.x,s.y,{format:ns,type:nn,minFilter:tn,magFilter:tn,generateMipmaps:!1}),q.map.texture.name=W.name+".shadowMap",q.map.depthTexture=new qi(s.x,s.y,ii),q.map.depthTexture.name=W.name+".shadowMapDepth",q.map.depthTexture.format=pi,q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=Ye,q.map.depthTexture.magFilter=Ye}else W.isPointLight?(q.map=new rc(s.x),q.map.depthTexture=new ja(s.x,ni)):(q.map=new Ue(s.x,s.y),q.map.depthTexture=new qi(s.x,s.y,ni)),q.map.depthTexture.name=W.name+".shadowMap",q.map.depthTexture.format=pi,this.type===fo?(q.map.depthTexture.compareFunction=X?nc:ec,q.map.depthTexture.minFilter=tn,q.map.depthTexture.magFilter=tn):(q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=Ye,q.map.depthTexture.magFilter=Ye);q.camera.updateProjectionMatrix()}q.map.isWebGLCubeRenderTarget!==!0&&(q.map.width!==s.x||q.map.height!==s.y)&&q.map.setSize(s.x,s.y);let J=q.map.isWebGLCubeRenderTarget?6:q.getViewportCount();W.isPointLight!==!0&&q.updateMatrices(W,x);for(let tt=0;tt<J;tt++){let Tt=q.getCamera(tt);if(W.isPointLight){let St=q.camera,ae=q.matrix,Zt=W.distance||St.far;Zt!==St.far&&(St.far=Zt,St.updateProjectionMatrix()),Co.setFromMatrixPosition(W.matrixWorld),St.position.copy(Co),ru.copy(St.position),ru.add(ev[tt]),St.up.copy(nv[tt]),St.lookAt(ru),St.updateMatrixWorld(),ae.makeTranslation(-Co.x,-Co.y,-Co.z),jf.multiplyMatrices(St.projectionMatrix,St.matrixWorldInverse),q._frustum.setFromProjectionMatrix(jf,St.coordinateSystem,St.reversedDepth)}if(q.map.isWebGLCubeRenderTarget)i.setRenderTarget(q.map,tt),i.clear();else{tt===0&&(i.setRenderTarget(q.map),i.clear());let St=q.getViewport(tt);o.set(r.x*St.x,r.y*St.y,r.x*St.z,r.y*St.w),F.viewport(o)}n=q.getFrustum(tt),y(C,x,Tt,W,this.type)}q.isPointLightShadow!==!0&&this.type===dr&&S(q,x),q.needsUpdate=!1}f=this.type,g.needsUpdate=!1,i.setRenderTarget(T,P,L)};function S(b,C){let x=t.update(v);u.defines.VSM_SAMPLES!==b.blurSamples&&(u.defines.VSM_SAMPLES=b.blurSamples,p.defines.VSM_SAMPLES=b.blurSamples,u.needsUpdate=!0,p.needsUpdate=!0),b.mapPass===null?b.mapPass=new Ue(s.x,s.y,{format:ns,type:nn}):(b.mapPass.width!==b.map.width||b.mapPass.height!==b.map.height)&&b.mapPass.setSize(b.map.width,b.map.height),u.uniforms.shadow_pass.value=b.map.depthTexture,u.uniforms.resolution.value.set(b.map.width,b.map.height),u.uniforms.radius.value=b.radius,i.setRenderTarget(b.mapPass),i.clear(),i.renderBufferDirect(C,null,x,u,v,null),p.uniforms.shadow_pass.value=b.mapPass.texture,p.uniforms.resolution.value.set(b.map.width,b.map.height),p.uniforms.radius.value=b.radius,i.setRenderTarget(b.map),i.clear(),i.renderBufferDirect(C,null,x,p,v,null)}function R(b,C,x,T){let P=null,L=x.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(L!==void 0)P=L;else if(P=x.isPointLight===!0?l:a,i.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let F=P.uuid,B=C.uuid,I=c[F];I===void 0&&(I={},c[F]=I);let z=I[B];z===void 0&&(z=P.clone(),I[B]=z,C.addEventListener("dispose",E)),P=z}if(P.visible=C.visible,P.wireframe=C.wireframe,T===dr?P.side=C.shadowSide!==null?C.shadowSide:C.side:P.side=C.shadowSide!==null?C.shadowSide:d[C.side],P.alphaMap=C.alphaMap,P.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,P.map=C.map,P.clipShadows=C.clipShadows,P.clippingPlanes=C.clippingPlanes,P.clipIntersection=C.clipIntersection,P.displacementMap=C.displacementMap,P.displacementScale=C.displacementScale,P.displacementBias=C.displacementBias,P.wireframeLinewidth=C.wireframeLinewidth,P.linewidth=C.linewidth,x.isPointLight===!0&&P.isMeshDistanceMaterial===!0){let F=i.properties.get(P);F.light=x}return P}function y(b,C,x,T,P){if(b.visible===!1)return;if(b.layers.test(C.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&P===dr)&&(!b.frustumCulled||b.intersectsFrustum(n))){b.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,b.matrixWorld);let B=t.update(b),I=b.material;if(Array.isArray(I)){let z=B.groups;for(let W=0,q=z.length;W<q;W++){let et=z[W],X=I[et.materialIndex];if(X&&X.visible){let J=R(b,X,T,P);b.onBeforeShadow(i,b,C,x,B,J,et),i.renderBufferDirect(x,null,B,J,b,et),b.onAfterShadow(i,b,C,x,B,J,et)}}}else if(I.visible){let z=R(b,I,T,P);b.onBeforeShadow(i,b,C,x,B,z,null),i.renderBufferDirect(x,null,B,z,b,null),b.onAfterShadow(i,b,C,x,B,z,null)}}let F=b.children;for(let B=0,I=F.length;B<I;B++)y(F[B],C,x,T,P)}function E(b){b.target.removeEventListener("dispose",E);for(let x in c){let T=c[x],P=b.target.uuid;P in T&&(T[P].dispose(),delete T[P])}}}function sv(i,t){function e(){let N=!1,at=new Ee,$=null,lt=new Ee(0,0,0,0);return{setMask:function(pt){$!==pt&&!N&&(i.colorMask(pt,pt,pt,pt),$=pt)},setLocked:function(pt){N=pt},setClear:function(pt,nt,Rt,bt,_e){_e===!0&&(pt*=bt,nt*=bt,Rt*=bt),at.set(pt,nt,Rt,bt),lt.equals(at)===!1&&(i.clearColor(pt,nt,Rt,bt),lt.copy(at))},reset:function(){N=!1,$=null,lt.set(-1,0,0,0)}}}function n(){let N=!1,at=!1,$=null,lt=null,pt=null;return{setReversed:function(nt){if(at!==nt){let Rt=t.get("EXT_clip_control");nt?Rt.clipControlEXT(Rt.LOWER_LEFT_EXT,Rt.ZERO_TO_ONE_EXT):Rt.clipControlEXT(Rt.LOWER_LEFT_EXT,Rt.NEGATIVE_ONE_TO_ONE_EXT),at=nt;let bt=pt;pt=null,this.setClear(bt)}},getReversed:function(){return at},setTest:function(nt){nt?Q(i.DEPTH_TEST):xt(i.DEPTH_TEST)},setMask:function(nt){$!==nt&&!N&&(i.depthMask(nt),$=nt)},setFunc:function(nt){if(at&&(nt=Af[nt]),lt!==nt){switch(nt){case Na:i.depthFunc(i.NEVER);break;case Ua:i.depthFunc(i.ALWAYS);break;case Fa:i.depthFunc(i.LESS);break;case Qs:i.depthFunc(i.LEQUAL);break;case Oa:i.depthFunc(i.EQUAL);break;case Ba:i.depthFunc(i.GEQUAL);break;case za:i.depthFunc(i.GREATER);break;case ka:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}lt=nt}},setLocked:function(nt){N=nt},setClear:function(nt){pt!==nt&&(pt=nt,at&&(nt=1-nt),i.clearDepth(nt))},reset:function(){N=!1,$=null,lt=null,pt=null,at=!1}}}function s(){let N=!1,at=null,$=null,lt=null,pt=null,nt=null,Rt=null,bt=null,_e=null;return{setTest:function(le){N||(le?Q(i.STENCIL_TEST):xt(i.STENCIL_TEST))},setMask:function(le){at!==le&&!N&&(i.stencilMask(le),at=le)},setFunc:function(le,qn,ci){($!==le||lt!==qn||pt!==ci)&&(i.stencilFunc(le,qn,ci),$=le,lt=qn,pt=ci)},setOp:function(le,qn,ci){(nt!==le||Rt!==qn||bt!==ci)&&(i.stencilOp(le,qn,ci),nt=le,Rt=qn,bt=ci)},setLocked:function(le){N=le},setClear:function(le){_e!==le&&(i.clearStencil(le),_e=le)},reset:function(){N=!1,at=null,$=null,lt=null,pt=null,nt=null,Rt=null,bt=null,_e=null}}}let r=new e,o=new n,a=new s,l=new WeakMap,c=new WeakMap,h={},d={},u={},p=new WeakMap,m=[],v=null,g=!1,f=null,S=null,R=null,y=null,E=null,b=null,C=null,x=new yt(0,0,0),T=0,P=!1,L=null,F=null,B=null,I=null,z=null,W=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),q=!1,et=0,X=i.getParameter(i.VERSION);X.indexOf("WebGL")!==-1?(et=parseFloat(/^WebGL (\d)/.exec(X)[1]),q=et>=1):X.indexOf("OpenGL ES")!==-1&&(et=parseFloat(/^OpenGL ES (\d)/.exec(X)[1]),q=et>=2);let J=null,tt={},Tt=i.getParameter(i.SCISSOR_BOX),St=i.getParameter(i.VIEWPORT),ae=new Ee().fromArray(Tt),Zt=new Ee().fromArray(St);function re(N,at,$,lt){let pt=new Uint8Array(4),nt=i.createTexture();i.bindTexture(N,nt),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Rt=0;Rt<$;Rt++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(at,0,i.RGBA,1,1,lt,0,i.RGBA,i.UNSIGNED_BYTE,pt):i.texImage2D(at+Rt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,pt);return nt}let Z={};Z[i.TEXTURE_2D]=re(i.TEXTURE_2D,i.TEXTURE_2D,1),Z[i.TEXTURE_CUBE_MAP]=re(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Z[i.TEXTURE_2D_ARRAY]=re(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Z[i.TEXTURE_3D]=re(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Q(i.DEPTH_TEST),o.setFunc(Qs),Xt(!1),be(Rh),Q(i.CULL_FACE),ne(Bn);function Q(N){h[N]!==!0&&(i.enable(N),h[N]=!0)}function xt(N){h[N]!==!1&&(i.disable(N),h[N]=!1)}function Nt(N,at){return u[N]!==at?(i.bindFramebuffer(N,at),u[N]=at,N===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=at),N===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=at),!0):!1}function gt(N,at){let $=m,lt=!1;if(N){$=p.get(at),$===void 0&&($=[],p.set(at,$));let pt=N.textures;if($.length!==pt.length||$[0]!==i.COLOR_ATTACHMENT0){for(let nt=0,Rt=pt.length;nt<Rt;nt++)$[nt]=i.COLOR_ATTACHMENT0+nt;$.length=pt.length,lt=!0}}else $[0]!==i.BACK&&($[0]=i.BACK,lt=!0);lt&&i.drawBuffers($)}function Ht(N){return v!==N?(i.useProgram(N),v=N,!0):!1}let Be={[vs]:i.FUNC_ADD,[Zd]:i.FUNC_SUBTRACT,[Kd]:i.FUNC_REVERSE_SUBTRACT};Be[$d]=i.MIN,Be[Jd]=i.MAX;let Gt={[jd]:i.ZERO,[Qd]:i.ONE,[tf]:i.SRC_COLOR,[Ih]:i.SRC_ALPHA,[af]:i.SRC_ALPHA_SATURATE,[rf]:i.DST_COLOR,[nf]:i.DST_ALPHA,[ef]:i.ONE_MINUS_SRC_COLOR,[Lh]:i.ONE_MINUS_SRC_ALPHA,[of]:i.ONE_MINUS_DST_COLOR,[sf]:i.ONE_MINUS_DST_ALPHA,[lf]:i.CONSTANT_COLOR,[cf]:i.ONE_MINUS_CONSTANT_COLOR,[hf]:i.CONSTANT_ALPHA,[uf]:i.ONE_MINUS_CONSTANT_ALPHA};function ne(N,at,$,lt,pt,nt,Rt,bt,_e,le){if(N===Bn){g===!0&&(xt(i.BLEND),g=!1);return}if(g===!1&&(Q(i.BLEND),g=!0),N!==Yd){if(N!==f||le!==P){if((S!==vs||E!==vs)&&(i.blendEquation(i.FUNC_ADD),S=vs,E=vs),le)switch(N){case fr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case $e:i.blendFunc(i.ONE,i.ONE);break;case Ch:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Ph:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:It("WebGLState: Invalid blending: ",N);break}else switch(N){case fr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case $e:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Ch:It("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Ph:It("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:It("WebGLState: Invalid blending: ",N);break}R=null,y=null,b=null,C=null,x.set(0,0,0),T=0,f=N,P=le}return}pt=pt||at,nt=nt||$,Rt=Rt||lt,(at!==S||pt!==E)&&(i.blendEquationSeparate(Be[at],Be[pt]),S=at,E=pt),($!==R||lt!==y||nt!==b||Rt!==C)&&(i.blendFuncSeparate(Gt[$],Gt[lt],Gt[nt],Gt[Rt]),R=$,y=lt,b=nt,C=Rt),(bt.equals(x)===!1||_e!==T)&&(i.blendColor(bt.r,bt.g,bt.b,_e),x.copy(bt),T=_e),f=N,P=!1}function ge(N,at){N.side===Ke?xt(i.CULL_FACE):Q(i.CULL_FACE);let $=N.side===yn;at&&($=!$),Xt($),N.blending===fr&&N.transparent===!1?ne(Bn):ne(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let lt=N.stencilWrite;a.setTest(lt),lt&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),bn(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?Q(i.SAMPLE_ALPHA_TO_COVERAGE):xt(i.SAMPLE_ALPHA_TO_COVERAGE)}function Xt(N){L!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),L=N)}function be(N){N!==Wd?(Q(i.CULL_FACE),N!==F&&(N===Rh?i.cullFace(i.BACK):N===Xd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):xt(i.CULL_FACE),F=N}function Xe(N){N!==B&&(q&&i.lineWidth(N),B=N)}function bn(N,at,$){N?(Q(i.POLYGON_OFFSET_FILL),(I!==at||z!==$)&&(I=at,z=$,o.getReversed()&&(at=-at),i.polygonOffset(at,$))):xt(i.POLYGON_OFFSET_FILL)}function we(N){N?Q(i.SCISSOR_TEST):xt(i.SCISSOR_TEST)}function Le(N){N===void 0&&(N=i.TEXTURE0+W-1),J!==N&&(i.activeTexture(N),J=N)}function U(N,at,$){$===void 0&&(J===null?$=i.TEXTURE0+W-1:$=J);let lt=tt[$];lt===void 0&&(lt={type:void 0,texture:void 0},tt[$]=lt),(lt.type!==N||lt.texture!==at)&&(J!==$&&(i.activeTexture($),J=$),i.bindTexture(N,at||Z[N]),lt.type=N,lt.texture=at)}function rn(){let N=tt[J];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function he(){try{i.compressedTexImage2D(...arguments)}catch(N){It("WebGLState:",N)}}function w(){try{i.compressedTexImage3D(...arguments)}catch(N){It("WebGLState:",N)}}function _(){try{i.texSubImage2D(...arguments)}catch(N){It("WebGLState:",N)}}function O(){try{i.texSubImage3D(...arguments)}catch(N){It("WebGLState:",N)}}function V(){try{i.compressedTexSubImage2D(...arguments)}catch(N){It("WebGLState:",N)}}function Y(){try{i.compressedTexSubImage3D(...arguments)}catch(N){It("WebGLState:",N)}}function it(){try{i.texStorage2D(...arguments)}catch(N){It("WebGLState:",N)}}function st(){try{i.texStorage3D(...arguments)}catch(N){It("WebGLState:",N)}}function K(){try{i.texImage2D(...arguments)}catch(N){It("WebGLState:",N)}}function j(){try{i.texImage3D(...arguments)}catch(N){It("WebGLState:",N)}}function rt(N){return d[N]!==void 0?d[N]:i.getParameter(N)}function wt(N,at){d[N]!==at&&(i.pixelStorei(N,at),d[N]=at)}function ht(N){ae.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),ae.copy(N))}function ot(N){Zt.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),Zt.copy(N))}function At(N,at){let $=c.get(at);$===void 0&&($=new WeakMap,c.set(at,$));let lt=$.get(N);lt===void 0&&(lt=i.getUniformBlockIndex(at,N.name),$.set(N,lt))}function Pt(N,at){let lt=c.get(at).get(N);l.get(at)!==lt&&(i.uniformBlockBinding(at,lt,N.__bindingPointIndex),l.set(at,lt))}function Ut(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},J=null,tt={},u={},p=new WeakMap,m=[],v=null,g=!1,f=null,S=null,R=null,y=null,E=null,b=null,C=null,x=new yt(0,0,0),T=0,P=!1,L=null,F=null,B=null,I=null,z=null,ae.set(0,0,i.canvas.width,i.canvas.height),Zt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:Q,disable:xt,bindFramebuffer:Nt,drawBuffers:gt,useProgram:Ht,setBlending:ne,setMaterial:ge,setFlipSided:Xt,setCullFace:be,setLineWidth:Xe,setPolygonOffset:bn,setScissorTest:we,activeTexture:Le,bindTexture:U,unbindTexture:rn,compressedTexImage2D:he,compressedTexImage3D:w,texImage2D:K,texImage3D:j,pixelStorei:wt,getParameter:rt,updateUBOMapping:At,uniformBlockBinding:Pt,texStorage2D:it,texStorage3D:st,texSubImage2D:_,texSubImage3D:O,compressedTexSubImage2D:V,compressedTexSubImage3D:Y,scissor:ht,viewport:ot,reset:Ut}}function rv(i,t,e,n,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ct,h=new WeakMap,d=new Set,u,p=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(w,_){return m?new OffscreenCanvas(w,_):Zr("canvas")}function g(w,_,O){let V=1,Y=he(w);if((Y.width>O||Y.height>O)&&(V=O/Math.max(Y.width,Y.height)),V<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){let it=Math.floor(V*Y.width),st=Math.floor(V*Y.height);u===void 0&&(u=v(it,st));let K=_?v(it,st):u;return K.width=it,K.height=st,K.getContext("2d").drawImage(w,0,0,it,st),Ct("WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+it+"x"+st+")."),K}else return"data"in w&&Ct("WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),w;return w}function f(w){return w.generateMipmaps}function S(w){i.generateMipmap(w)}function R(w){return w.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?i.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function y(w,_,O,V,Y,it=!1){if(w!==null){if(i[w]!==void 0)return i[w];Ct("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let st;V&&(st=t.get("EXT_texture_norm16"),st||Ct("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let K=_;if(_===i.RED&&(O===i.FLOAT&&(K=i.R32F),O===i.HALF_FLOAT&&(K=i.R16F),O===i.UNSIGNED_BYTE&&(K=i.R8),O===i.UNSIGNED_SHORT&&st&&(K=st.R16_EXT),O===i.SHORT&&st&&(K=st.R16_SNORM_EXT)),_===i.RED_INTEGER&&(O===i.UNSIGNED_BYTE&&(K=i.R8UI),O===i.UNSIGNED_SHORT&&(K=i.R16UI),O===i.UNSIGNED_INT&&(K=i.R32UI),O===i.BYTE&&(K=i.R8I),O===i.SHORT&&(K=i.R16I),O===i.INT&&(K=i.R32I)),_===i.RG&&(O===i.FLOAT&&(K=i.RG32F),O===i.HALF_FLOAT&&(K=i.RG16F),O===i.UNSIGNED_BYTE&&(K=i.RG8),O===i.UNSIGNED_SHORT&&st&&(K=st.RG16_EXT),O===i.SHORT&&st&&(K=st.RG16_SNORM_EXT)),_===i.RG_INTEGER&&(O===i.UNSIGNED_BYTE&&(K=i.RG8UI),O===i.UNSIGNED_SHORT&&(K=i.RG16UI),O===i.UNSIGNED_INT&&(K=i.RG32UI),O===i.BYTE&&(K=i.RG8I),O===i.SHORT&&(K=i.RG16I),O===i.INT&&(K=i.RG32I)),_===i.RGB_INTEGER&&(O===i.UNSIGNED_BYTE&&(K=i.RGB8UI),O===i.UNSIGNED_SHORT&&(K=i.RGB16UI),O===i.UNSIGNED_INT&&(K=i.RGB32UI),O===i.BYTE&&(K=i.RGB8I),O===i.SHORT&&(K=i.RGB16I),O===i.INT&&(K=i.RGB32I)),_===i.RGBA_INTEGER&&(O===i.UNSIGNED_BYTE&&(K=i.RGBA8UI),O===i.UNSIGNED_SHORT&&(K=i.RGBA16UI),O===i.UNSIGNED_INT&&(K=i.RGBA32UI),O===i.BYTE&&(K=i.RGBA8I),O===i.SHORT&&(K=i.RGBA16I),O===i.INT&&(K=i.RGBA32I)),_===i.RGB&&(O===i.UNSIGNED_SHORT&&st&&(K=st.RGB16_EXT),O===i.SHORT&&st&&(K=st.RGB16_SNORM_EXT),O===i.UNSIGNED_INT_5_9_9_9_REV&&(K=i.RGB9_E5),O===i.UNSIGNED_INT_10F_11F_11F_REV&&(K=i.R11F_G11F_B10F)),_===i.RGBA){let j=it?Yr:Vt.getTransfer(Y);O===i.FLOAT&&(K=i.RGBA32F),O===i.HALF_FLOAT&&(K=i.RGBA16F),O===i.UNSIGNED_BYTE&&(K=j===ie?i.SRGB8_ALPHA8:i.RGBA8),O===i.UNSIGNED_SHORT&&st&&(K=st.RGBA16_EXT),O===i.SHORT&&st&&(K=st.RGBA16_SNORM_EXT),O===i.UNSIGNED_SHORT_4_4_4_4&&(K=i.RGBA4),O===i.UNSIGNED_SHORT_5_5_5_1&&(K=i.RGB5_A1)}return(K===i.R16F||K===i.R32F||K===i.RG16F||K===i.RG32F||K===i.RGBA16F||K===i.RGBA32F)&&t.get("EXT_color_buffer_float"),K}function E(w,_){let O;return w?_===null||_===ni||_===mr?O=i.DEPTH24_STENCIL8:_===ii?O=i.DEPTH32F_STENCIL8:_===pr&&(O=i.DEPTH24_STENCIL8,Ct("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===ni||_===mr?O=i.DEPTH_COMPONENT24:_===ii?O=i.DEPTH_COMPONENT32F:_===pr&&(O=i.DEPTH_COMPONENT16),O}function b(w,_){return f(w)===!0||w.isFramebufferTexture&&w.minFilter!==Ye&&w.minFilter!==tn?Math.log2(Math.max(_.width,_.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?_.mipmaps.length:1}function C(w){let _=w.target;_.removeEventListener("dispose",C),T(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&d.delete(_)}function x(w){let _=w.target;_.removeEventListener("dispose",x),L(_)}function T(w){let _=n.get(w);if(_.__webglInit===void 0)return;let O=w.source,V=p.get(O);if(V){let Y=V[_.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&P(w),Object.keys(V).length===0&&p.delete(O)}n.remove(w)}function P(w){let _=n.get(w);i.deleteTexture(_.__webglTexture);let O=w.source,V=p.get(O);delete V[_.__cacheKey],o.memory.textures--}function L(w){let _=n.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),n.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let V=0;V<6;V++){if(Array.isArray(_.__webglFramebuffer[V]))for(let Y=0;Y<_.__webglFramebuffer[V].length;Y++)i.deleteFramebuffer(_.__webglFramebuffer[V][Y]);else i.deleteFramebuffer(_.__webglFramebuffer[V]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[V])}else{if(Array.isArray(_.__webglFramebuffer))for(let V=0;V<_.__webglFramebuffer.length;V++)i.deleteFramebuffer(_.__webglFramebuffer[V]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let V=0;V<_.__webglColorRenderbuffer.length;V++)_.__webglColorRenderbuffer[V]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[V]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let O=w.textures;for(let V=0,Y=O.length;V<Y;V++){let it=n.get(O[V]);it.__webglTexture&&(i.deleteTexture(it.__webglTexture),o.memory.textures--),n.remove(O[V])}n.remove(w)}let F=0;function B(){F=0}function I(){return F}function z(w){F=w}function W(){let w=F;return w>=s.maxTextures&&Ct("WebGLTextures: Trying to use "+(w+1)+" texture units while this GPU supports only "+s.maxTextures),F+=1,w}function q(w){let _=[];return _.push(w.wrapS),_.push(w.wrapT),_.push(w.wrapR||0),_.push(w.magFilter),_.push(w.minFilter),_.push(w.anisotropy),_.push(w.internalFormat),_.push(w.format),_.push(w.type),_.push(w.generateMipmaps),_.push(w.premultiplyAlpha),_.push(w.flipY),_.push(w.unpackAlignment),_.push(w.colorSpace),_.join()}function et(w,_){let O=n.get(w);if(w.isVideoTexture&&U(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&O.__version!==w.version){let V=w.image;if(V===null)Ct("WebGLRenderer: Texture marked for update but no image data found.");else if(V.complete===!1)Ct("WebGLRenderer: Texture marked for update but image is incomplete");else{xt(O,w,_);return}}else w.isExternalTexture&&(O.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,O.__webglTexture,i.TEXTURE0+_)}function X(w,_){let O=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&O.__version!==w.version){xt(O,w,_);return}else w.isExternalTexture&&(O.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,O.__webglTexture,i.TEXTURE0+_)}function J(w,_){let O=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&O.__version!==w.version){xt(O,w,_);return}e.bindTexture(i.TEXTURE_3D,O.__webglTexture,i.TEXTURE0+_)}function tt(w,_){let O=n.get(w);if(w.isCubeDepthTexture!==!0&&w.version>0&&O.__version!==w.version){Nt(O,w,_);return}e.bindTexture(i.TEXTURE_CUBE_MAP,O.__webglTexture,i.TEXTURE0+_)}let Tt={[Ha]:i.REPEAT,[fi]:i.CLAMP_TO_EDGE,[Va]:i.MIRRORED_REPEAT},St={[Ye]:i.NEAREST,[pf]:i.NEAREST_MIPMAP_NEAREST,[Mo]:i.NEAREST_MIPMAP_LINEAR,[tn]:i.LINEAR,[_l]:i.LINEAR_MIPMAP_NEAREST,[ts]:i.LINEAR_MIPMAP_LINEAR},ae={[xf]:i.NEVER,[bf]:i.ALWAYS,[yf]:i.LESS,[ec]:i.LEQUAL,[vf]:i.EQUAL,[nc]:i.GEQUAL,[Mf]:i.GREATER,[Sf]:i.NOTEQUAL};function Zt(w,_){if(_.type===ii&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===tn||_.magFilter===_l||_.magFilter===Mo||_.magFilter===ts||_.minFilter===tn||_.minFilter===_l||_.minFilter===Mo||_.minFilter===ts)&&Ct("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(w,i.TEXTURE_WRAP_S,Tt[_.wrapS]),i.texParameteri(w,i.TEXTURE_WRAP_T,Tt[_.wrapT]),(w===i.TEXTURE_3D||w===i.TEXTURE_2D_ARRAY)&&i.texParameteri(w,i.TEXTURE_WRAP_R,Tt[_.wrapR]),i.texParameteri(w,i.TEXTURE_MAG_FILTER,St[_.magFilter]),i.texParameteri(w,i.TEXTURE_MIN_FILTER,St[_.minFilter]),_.compareFunction&&(i.texParameteri(w,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(w,i.TEXTURE_COMPARE_FUNC,ae[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Ye||_.minFilter!==Mo&&_.minFilter!==ts||_.type===ii&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let O=t.get("EXT_texture_filter_anisotropic");i.texParameterf(w,O.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function re(w,_){let O=!1;w.__webglInit===void 0&&(w.__webglInit=!0,_.addEventListener("dispose",C));let V=_.source,Y=p.get(V);Y===void 0&&(Y={},p.set(V,Y));let it=q(_);if(it!==w.__cacheKey){Y[it]===void 0&&(Y[it]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,O=!0),Y[it].usedTimes++;let st=Y[w.__cacheKey];st!==void 0&&(Y[w.__cacheKey].usedTimes--,st.usedTimes===0&&P(_)),w.__cacheKey=it,w.__webglTexture=Y[it].texture}return O}function Z(w,_,O){return Math.floor(Math.floor(w/O)/_)}function Q(w,_,O,V){let it=w.updateRanges;if(it.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,O,V,_.data);else{it.sort((wt,ht)=>wt.start-ht.start);let st=0;for(let wt=1;wt<it.length;wt++){let ht=it[st],ot=it[wt],At=ht.start+ht.count,Pt=Z(ot.start,_.width,4),Ut=Z(ht.start,_.width,4);ot.start<=At+1&&Pt===Ut&&Z(ot.start+ot.count-1,_.width,4)===Pt?ht.count=Math.max(ht.count,ot.start+ot.count-ht.start):(++st,it[st]=ot)}it.length=st+1;let K=e.getParameter(i.UNPACK_ROW_LENGTH),j=e.getParameter(i.UNPACK_SKIP_PIXELS),rt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let wt=0,ht=it.length;wt<ht;wt++){let ot=it[wt],At=Math.floor(ot.start/4),Pt=Math.ceil(ot.count/4),Ut=At%_.width,N=Math.floor(At/_.width),at=Pt,$=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,Ut),e.pixelStorei(i.UNPACK_SKIP_ROWS,N),e.texSubImage2D(i.TEXTURE_2D,0,Ut,N,at,$,O,V,_.data)}w.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,K),e.pixelStorei(i.UNPACK_SKIP_PIXELS,j),e.pixelStorei(i.UNPACK_SKIP_ROWS,rt)}}function xt(w,_,O){let V=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(V=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(V=i.TEXTURE_3D);let Y=re(w,_),it=_.source;e.bindTexture(V,w.__webglTexture,i.TEXTURE0+O);let st=n.get(it);if(it.version!==st.__version||Y===!0){if(e.activeTexture(i.TEXTURE0+O),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let $=Vt.getPrimaries(Vt.workingColorSpace),lt=_.colorSpace===Ci?null:Vt.getPrimaries(_.colorSpace),pt=_.colorSpace===Ci||$===lt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,pt)}e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment);let j=g(_.image,!1,s.maxTextureSize);j=rn(_,j);let rt=r.convert(_.format,_.colorSpace),wt=r.convert(_.type),ht=y(_.internalFormat,rt,wt,_.normalized,_.colorSpace,_.isVideoTexture);Zt(V,_);let ot,At=_.mipmaps,Pt=_.isVideoTexture!==!0,Ut=st.__version===void 0||Y===!0,N=it.dataReady,at=b(_,j);if(_.isDepthTexture)ht=E(_.format===es,_.type),Ut&&(Pt?e.texStorage2D(i.TEXTURE_2D,1,ht,j.width,j.height):e.texImage2D(i.TEXTURE_2D,0,ht,j.width,j.height,0,rt,wt,null));else if(_.isDataTexture)if(At.length>0){Pt&&Ut&&e.texStorage2D(i.TEXTURE_2D,at,ht,At[0].width,At[0].height);for(let $=0,lt=At.length;$<lt;$++)ot=At[$],Pt?N&&e.texSubImage2D(i.TEXTURE_2D,$,0,0,ot.width,ot.height,rt,wt,ot.data):e.texImage2D(i.TEXTURE_2D,$,ht,ot.width,ot.height,0,rt,wt,ot.data);_.generateMipmaps=!1}else Pt?(Ut&&e.texStorage2D(i.TEXTURE_2D,at,ht,j.width,j.height),N&&Q(_,j,rt,wt)):e.texImage2D(i.TEXTURE_2D,0,ht,j.width,j.height,0,rt,wt,j.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Pt&&Ut&&e.texStorage3D(i.TEXTURE_2D_ARRAY,at,ht,At[0].width,At[0].height,j.depth);for(let $=0,lt=At.length;$<lt;$++)if(ot=At[$],_.format!==zn)if(rt!==null)if(Pt){if(N)if(_.layerUpdates.size>0){let pt=Zh(ot.width,ot.height,_.format,_.type);for(let nt of _.layerUpdates){let Rt=ot.data.subarray(nt*pt/ot.data.BYTES_PER_ELEMENT,(nt+1)*pt/ot.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,nt,ot.width,ot.height,1,rt,Rt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,0,ot.width,ot.height,j.depth,rt,ot.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,$,ht,ot.width,ot.height,j.depth,0,ot.data,0,0);else Ct("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Pt?N&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,0,ot.width,ot.height,j.depth,rt,wt,ot.data):e.texImage3D(i.TEXTURE_2D_ARRAY,$,ht,ot.width,ot.height,j.depth,0,rt,wt,ot.data);_.layerUpdates.size>0&&_.clearLayerUpdates()}else{Pt&&Ut&&e.texStorage2D(i.TEXTURE_2D,at,ht,At[0].width,At[0].height);for(let $=0,lt=At.length;$<lt;$++)ot=At[$],_.format!==zn?rt!==null?Pt?N&&e.compressedTexSubImage2D(i.TEXTURE_2D,$,0,0,ot.width,ot.height,rt,ot.data):e.compressedTexImage2D(i.TEXTURE_2D,$,ht,ot.width,ot.height,0,ot.data):Ct("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Pt?N&&e.texSubImage2D(i.TEXTURE_2D,$,0,0,ot.width,ot.height,rt,wt,ot.data):e.texImage2D(i.TEXTURE_2D,$,ht,ot.width,ot.height,0,rt,wt,ot.data)}else if(_.isDataArrayTexture)if(Pt){if(Ut&&e.texStorage3D(i.TEXTURE_2D_ARRAY,at,ht,j.width,j.height,j.depth),N)if(_.layerUpdates.size>0){let $=Zh(j.width,j.height,_.format,_.type);for(let lt of _.layerUpdates){let pt=j.data.subarray(lt*$/j.data.BYTES_PER_ELEMENT,(lt+1)*$/j.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,lt,j.width,j.height,1,rt,wt,pt)}_.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,j.width,j.height,j.depth,rt,wt,j.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,ht,j.width,j.height,j.depth,0,rt,wt,j.data);else if(_.isData3DTexture)Pt?(Ut&&e.texStorage3D(i.TEXTURE_3D,at,ht,j.width,j.height,j.depth),N&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,j.width,j.height,j.depth,rt,wt,j.data)):e.texImage3D(i.TEXTURE_3D,0,ht,j.width,j.height,j.depth,0,rt,wt,j.data);else if(_.isFramebufferTexture){if(Ut)if(Pt)e.texStorage2D(i.TEXTURE_2D,at,ht,j.width,j.height);else{let $=j.width,lt=j.height;for(let pt=0;pt<at;pt++)e.texImage2D(i.TEXTURE_2D,pt,ht,$,lt,0,rt,wt,null),$>>=1,lt>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in i){let $=i.canvas;if($.hasAttribute("layoutsubtree")||$.setAttribute("layoutsubtree","true"),j.parentNode!==$){$.appendChild(j),d.add(_),$.onpaint=lt=>{let pt=lt.changedElements;for(let nt of d)pt.includes(nt.image)&&(nt.needsUpdate=!0)},$.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,j);else{let pt=i.RGBA,nt=i.RGBA,Rt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,pt,nt,Rt,j)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(At.length>0){if(Pt&&Ut){let $=he(At[0]);e.texStorage2D(i.TEXTURE_2D,at,ht,$.width,$.height)}for(let $=0,lt=At.length;$<lt;$++)ot=At[$],Pt?N&&e.texSubImage2D(i.TEXTURE_2D,$,0,0,rt,wt,ot):e.texImage2D(i.TEXTURE_2D,$,ht,rt,wt,ot);_.generateMipmaps=!1}else if(Pt){if(Ut){let $=he(j);e.texStorage2D(i.TEXTURE_2D,at,ht,$.width,$.height)}N&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,rt,wt,j)}else e.texImage2D(i.TEXTURE_2D,0,ht,rt,wt,j);f(_)&&S(V),st.__version=it.version,_.onUpdate&&_.onUpdate(_)}w.__version=_.version}function Nt(w,_,O){if(_.image.length!==6)return;let V=re(w,_),Y=_.source;e.bindTexture(i.TEXTURE_CUBE_MAP,w.__webglTexture,i.TEXTURE0+O);let it=n.get(Y);if(Y.version!==it.__version||V===!0){e.activeTexture(i.TEXTURE0+O);let st=Vt.getPrimaries(Vt.workingColorSpace),K=_.colorSpace===Ci?null:Vt.getPrimaries(_.colorSpace),j=_.colorSpace===Ci||st===K?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,j);let rt=_.isCompressedTexture||_.image[0].isCompressedTexture,wt=_.image[0]&&_.image[0].isDataTexture,ht=[];for(let nt=0;nt<6;nt++)!rt&&!wt?ht[nt]=g(_.image[nt],!0,s.maxCubemapSize):ht[nt]=wt?_.image[nt].image:_.image[nt],ht[nt]=rn(_,ht[nt]);let ot=ht[0],At=r.convert(_.format,_.colorSpace),Pt=r.convert(_.type),Ut=y(_.internalFormat,At,Pt,_.normalized,_.colorSpace),N=_.isVideoTexture!==!0,at=it.__version===void 0||V===!0,$=Y.dataReady,lt=b(_,ot);Zt(i.TEXTURE_CUBE_MAP,_);let pt;if(rt){N&&at&&e.texStorage2D(i.TEXTURE_CUBE_MAP,lt,Ut,ot.width,ot.height);for(let nt=0;nt<6;nt++){pt=ht[nt].mipmaps;for(let Rt=0;Rt<pt.length;Rt++){let bt=pt[Rt];_.format!==zn?At!==null?N?$&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt,0,0,bt.width,bt.height,At,bt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt,Ut,bt.width,bt.height,0,bt.data):Ct("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?$&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt,0,0,bt.width,bt.height,At,Pt,bt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt,Ut,bt.width,bt.height,0,At,Pt,bt.data)}}}else{if(pt=_.mipmaps,N&&at){pt.length>0&&lt++;let nt=he(ht[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,lt,Ut,nt.width,nt.height)}for(let nt=0;nt<6;nt++)if(wt){N?$&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,ht[nt].width,ht[nt].height,At,Pt,ht[nt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,Ut,ht[nt].width,ht[nt].height,0,At,Pt,ht[nt].data);for(let Rt=0;Rt<pt.length;Rt++){let _e=pt[Rt].image[nt].image;N?$&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt+1,0,0,_e.width,_e.height,At,Pt,_e.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt+1,Ut,_e.width,_e.height,0,At,Pt,_e.data)}}else{N?$&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,At,Pt,ht[nt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,Ut,At,Pt,ht[nt]);for(let Rt=0;Rt<pt.length;Rt++){let bt=pt[Rt];N?$&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt+1,0,0,At,Pt,bt.image[nt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Rt+1,Ut,At,Pt,bt.image[nt])}}}f(_)&&S(i.TEXTURE_CUBE_MAP),it.__version=Y.version,_.onUpdate&&_.onUpdate(_)}w.__version=_.version}function gt(w,_,O,V,Y,it){let st=r.convert(O.format,O.colorSpace),K=r.convert(O.type),j=y(O.internalFormat,st,K,O.normalized,O.colorSpace),rt=n.get(_),wt=n.get(O);if(wt.__renderTarget=_,!rt.__hasExternalTextures){let ht=Math.max(1,_.width>>it),ot=Math.max(1,_.height>>it);Y===i.TEXTURE_3D||Y===i.TEXTURE_2D_ARRAY?e.texImage3D(Y,it,j,ht,ot,_.depth,0,st,K,null):e.texImage2D(Y,it,j,ht,ot,0,st,K,null)}e.bindFramebuffer(i.FRAMEBUFFER,w),Le(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,V,Y,wt.__webglTexture,0,we(_)):(Y===i.TEXTURE_2D||Y>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,V,Y,wt.__webglTexture,it),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Ht(w,_,O){if(i.bindRenderbuffer(i.RENDERBUFFER,w),_.depthBuffer){let V=_.depthTexture,Y=V&&V.isDepthTexture?V.type:null,it=E(_.stencilBuffer,Y),st=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Le(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,we(_),it,_.width,_.height):O?i.renderbufferStorageMultisample(i.RENDERBUFFER,we(_),it,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,it,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,st,i.RENDERBUFFER,w)}else{let V=_.textures;for(let Y=0;Y<V.length;Y++){let it=V[Y],st=r.convert(it.format,it.colorSpace),K=r.convert(it.type),j=y(it.internalFormat,st,K,it.normalized,it.colorSpace);Le(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,we(_),j,_.width,_.height):O?i.renderbufferStorageMultisample(i.RENDERBUFFER,we(_),j,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,j,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Be(w,_,O){let V=_.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,w),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Y=n.get(_.depthTexture);if(Y.__renderTarget=_,(!Y.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),V){if(Y.__webglInit===void 0&&(Y.__webglInit=!0,_.depthTexture.addEventListener("dispose",C)),Y.__webglTexture===void 0){Y.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),Zt(i.TEXTURE_CUBE_MAP,_.depthTexture);let rt=r.convert(_.depthTexture.format),wt=r.convert(_.depthTexture.type),ht;_.depthTexture.format===pi?ht=i.DEPTH_COMPONENT24:_.depthTexture.format===es&&(ht=i.DEPTH24_STENCIL8);for(let ot=0;ot<6;ot++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0,ht,_.width,_.height,0,rt,wt,null)}}else et(_.depthTexture,0);let it=Y.__webglTexture,st=we(_),K=V?i.TEXTURE_CUBE_MAP_POSITIVE_X+O:i.TEXTURE_2D,j=_.depthTexture.format===es?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===pi)Le(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,j,K,it,0,st):i.framebufferTexture2D(i.FRAMEBUFFER,j,K,it,0);else if(_.depthTexture.format===es)Le(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,j,K,it,0,st):i.framebufferTexture2D(i.FRAMEBUFFER,j,K,it,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Gt(w){let _=n.get(w),O=w.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==w.depthTexture){let V=w.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),V){let Y=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,V.removeEventListener("dispose",Y)};V.addEventListener("dispose",Y),_.__depthDisposeCallback=Y}_.__boundDepthTexture=V}if(w.depthTexture&&!_.__autoAllocateDepthBuffer)if(O)for(let V=0;V<6;V++)Be(_.__webglFramebuffer[V],w,V);else{let V=w.texture.mipmaps;V&&V.length>0?Be(_.__webglFramebuffer[0],w,0):Be(_.__webglFramebuffer,w,0)}else if(O){_.__webglDepthbuffer=[];for(let V=0;V<6;V++)if(e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[V]),_.__webglDepthbuffer[V]===void 0)_.__webglDepthbuffer[V]=i.createRenderbuffer(),Ht(_.__webglDepthbuffer[V],w,!1);else{let Y=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,it=_.__webglDepthbuffer[V];i.bindRenderbuffer(i.RENDERBUFFER,it),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,it)}}else{let V=w.texture.mipmaps;if(V&&V.length>0?e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),Ht(_.__webglDepthbuffer,w,!1);else{let Y=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,it=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,it),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,it)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function ne(w,_,O){let V=n.get(w);_!==void 0&&gt(V.__webglFramebuffer,w,w.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),O!==void 0&&Gt(w)}function ge(w){let _=w.texture,O=n.get(w),V=n.get(_);w.addEventListener("dispose",x);let Y=w.textures,it=w.isWebGLCubeRenderTarget===!0,st=Y.length>1;if(st||(V.__webglTexture===void 0&&(V.__webglTexture=i.createTexture()),V.__version=_.version,o.memory.textures++),it){O.__webglFramebuffer=[];for(let K=0;K<6;K++)if(_.mipmaps&&_.mipmaps.length>0){O.__webglFramebuffer[K]=[];for(let j=0;j<_.mipmaps.length;j++)O.__webglFramebuffer[K][j]=i.createFramebuffer()}else O.__webglFramebuffer[K]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){O.__webglFramebuffer=[];for(let K=0;K<_.mipmaps.length;K++)O.__webglFramebuffer[K]=i.createFramebuffer()}else O.__webglFramebuffer=i.createFramebuffer();if(st)for(let K=0,j=Y.length;K<j;K++){let rt=n.get(Y[K]);rt.__webglTexture===void 0&&(rt.__webglTexture=i.createTexture(),o.memory.textures++)}if(w.samples>0&&Le(w)===!1){O.__webglMultisampledFramebuffer=i.createFramebuffer(),O.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,O.__webglMultisampledFramebuffer);for(let K=0;K<Y.length;K++){let j=Y[K];O.__webglColorRenderbuffer[K]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,O.__webglColorRenderbuffer[K]);let rt=r.convert(j.format,j.colorSpace),wt=r.convert(j.type),ht=y(j.internalFormat,rt,wt,j.normalized,j.colorSpace,w.isXRRenderTarget===!0),ot=we(w);i.renderbufferStorageMultisample(i.RENDERBUFFER,ot,ht,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+K,i.RENDERBUFFER,O.__webglColorRenderbuffer[K])}i.bindRenderbuffer(i.RENDERBUFFER,null),w.depthBuffer&&(O.__webglDepthRenderbuffer=i.createRenderbuffer(),Ht(O.__webglDepthRenderbuffer,w,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(it){e.bindTexture(i.TEXTURE_CUBE_MAP,V.__webglTexture),Zt(i.TEXTURE_CUBE_MAP,_);for(let K=0;K<6;K++)if(_.mipmaps&&_.mipmaps.length>0)for(let j=0;j<_.mipmaps.length;j++)gt(O.__webglFramebuffer[K][j],w,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+K,j);else gt(O.__webglFramebuffer[K],w,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0);f(_)&&S(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(st){for(let K=0,j=Y.length;K<j;K++){let rt=Y[K],wt=n.get(rt),ht=i.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(ht=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ht,wt.__webglTexture),Zt(ht,rt),gt(O.__webglFramebuffer,w,rt,i.COLOR_ATTACHMENT0+K,ht,0),f(rt)&&S(ht)}e.unbindTexture()}else{let K=i.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(K=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(K,V.__webglTexture),Zt(K,_),_.mipmaps&&_.mipmaps.length>0)for(let j=0;j<_.mipmaps.length;j++)gt(O.__webglFramebuffer[j],w,_,i.COLOR_ATTACHMENT0,K,j);else gt(O.__webglFramebuffer,w,_,i.COLOR_ATTACHMENT0,K,0);f(_)&&S(K),e.unbindTexture()}w.depthBuffer&&Gt(w)}function Xt(w){let _=w.textures;for(let O=0,V=_.length;O<V;O++){let Y=_[O];if(f(Y)){let it=R(w),st=n.get(Y).__webglTexture;e.bindTexture(it,st),S(it),e.unbindTexture()}}}let be=[],Xe=[];function bn(w){if(w.samples>0){if(Le(w)===!1){let _=w.textures,O=w.width,V=w.height,Y=i.COLOR_BUFFER_BIT,it=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,st=n.get(w),K=_.length>1;if(K)for(let rt=0;rt<_.length;rt++)e.bindFramebuffer(i.FRAMEBUFFER,st.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,st.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,st.__webglMultisampledFramebuffer);let j=w.texture.mipmaps;j&&j.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglFramebuffer);for(let rt=0;rt<_.length;rt++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(Y|=i.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(Y|=i.STENCIL_BUFFER_BIT)),K){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,st.__webglColorRenderbuffer[rt]);let wt=n.get(_[rt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,wt,0)}i.blitFramebuffer(0,0,O,V,0,0,O,V,Y,i.NEAREST),l===!0&&(be.length=0,Xe.length=0,be.push(i.COLOR_ATTACHMENT0+rt),w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&(be.push(it),Xe.push(it),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Xe)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,be))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),K)for(let rt=0;rt<_.length;rt++){e.bindFramebuffer(i.FRAMEBUFFER,st.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.RENDERBUFFER,st.__webglColorRenderbuffer[rt]);let wt=n.get(_[rt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,st.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.TEXTURE_2D,wt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&l){let _=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function we(w){return Math.min(s.maxSamples,w.samples)}function Le(w){let _=n.get(w);return w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function U(w){let _=o.render.frame;h.get(w)!==_&&(h.set(w,_),w.update())}function rn(w,_){let O=w.colorSpace,V=w.format,Y=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||O!==qr&&O!==Ci&&(Vt.getTransfer(O)===ie?(V!==zn||Y!==En)&&Ct("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):It("WebGLTextures: Unsupported texture color space:",O)),_}function he(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(c.width=w.naturalWidth||w.width,c.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(c.width=w.displayWidth,c.height=w.displayHeight):(c.width=w.width,c.height=w.height),c}this.allocateTextureUnit=W,this.resetTextureUnits=B,this.getTextureUnits=I,this.setTextureUnits=z,this.setTexture2D=et,this.setTexture2DArray=X,this.setTexture3D=J,this.setTextureCube=tt,this.rebindTextures=ne,this.setupRenderTarget=ge,this.updateRenderTargetMipmap=Xt,this.updateMultisampleRenderTarget=bn,this.setupDepthRenderbuffer=Gt,this.setupFrameBufferTexture=gt,this.useMultisampledRTT=Le,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function ov(i,t){function e(n,s=Ci){let r,o=Vt.getTransfer(s);if(n===En)return i.UNSIGNED_BYTE;if(n===yl)return i.UNSIGNED_SHORT_4_4_4_4;if(n===vl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Oh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Bh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Uh)return i.BYTE;if(n===Fh)return i.SHORT;if(n===pr)return i.UNSIGNED_SHORT;if(n===xl)return i.INT;if(n===ni)return i.UNSIGNED_INT;if(n===ii)return i.FLOAT;if(n===nn)return i.HALF_FLOAT;if(n===zh)return i.ALPHA;if(n===kh)return i.RGB;if(n===zn)return i.RGBA;if(n===pi)return i.DEPTH_COMPONENT;if(n===es)return i.DEPTH_STENCIL;if(n===Hh)return i.RED;if(n===Ml)return i.RED_INTEGER;if(n===ns)return i.RG;if(n===Sl)return i.RG_INTEGER;if(n===bl)return i.RGBA_INTEGER;if(n===So||n===bo||n===Eo||n===To)if(o===ie)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===So)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===bo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Eo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===To)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===So)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===bo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Eo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===To)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===El||n===Tl||n===wl||n===Al)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===El)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Tl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===wl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Al)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Rl||n===Cl||n===Pl||n===Il||n===Ll||n===wo||n===Dl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Rl||n===Cl)return o===ie?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Pl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Il)return r.COMPRESSED_R11_EAC;if(n===Ll)return r.COMPRESSED_SIGNED_R11_EAC;if(n===wo)return r.COMPRESSED_RG11_EAC;if(n===Dl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Nl||n===Ul||n===Fl||n===Ol||n===Bl||n===zl||n===kl||n===Hl||n===Vl||n===Gl||n===Wl||n===Xl||n===ql||n===Yl)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Nl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ul)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Fl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Ol)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Bl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===zl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===kl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Hl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Vl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Gl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Wl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Xl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===ql)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Yl)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Zl||n===Kl||n===$l)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Zl)return o===ie?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Kl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===$l)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Jl||n===jl||n===Ao||n===Ql)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Jl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===jl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Ao)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Ql)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===mr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var av=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,lv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,fu=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new eo(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new de({vertexShader:av,fragmentShader:lv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new te(new xs(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},pu=class extends jn{constructor(t,e){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,p=null,m=null,v=typeof XRWebGLBinding<"u",g=new fu,f={},S=e.getContextAttributes(),R=null,y=null,E=[],b=[],C=new ct,x=null,T=null,P=new Qe;P.viewport=new Ee;let L=new Qe;L.viewport=new Ee;let F=[P,L],B=new fl,I=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let Q=E[Z];return Q===void 0&&(Q=new rr,E[Z]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(Z){let Q=E[Z];return Q===void 0&&(Q=new rr,E[Z]=Q),Q.getGripSpace()},this.getHand=function(Z){let Q=E[Z];return Q===void 0&&(Q=new rr,E[Z]=Q),Q.getHandSpace()};function W(Z){let Q=b.indexOf(Z.inputSource);if(Q===-1)return;let xt=E[Q];xt!==void 0&&(xt.update(Z.inputSource,Z.frame,c||o),xt.dispatchEvent({type:Z.type,data:Z.inputSource}))}function q(){s.removeEventListener("select",W),s.removeEventListener("selectstart",W),s.removeEventListener("selectend",W),s.removeEventListener("squeeze",W),s.removeEventListener("squeezestart",W),s.removeEventListener("squeezeend",W),s.removeEventListener("end",q),s.removeEventListener("inputsourceschange",et);for(let Z=0;Z<E.length;Z++){let Q=b[Z];Q!==null&&(b[Z]=null,E[Z].disconnect(Q))}I=null,z=null,g.reset();for(let Z in f)delete f[Z];if(t.setRenderTarget(R),p=null,u=null,d=null,s=null,y=null,re.stop(),n.isPresenting=!1,t.setPixelRatio(x),t.setSize(C.width,C.height,!1),T!==null){let Z=T.camera;Z.fov=T.fov,Z.zoom=T.zoom,Z.updateProjectionMatrix(),T=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){r=Z,n.isPresenting===!0&&Ct("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){a=Z,n.isPresenting===!0&&Ct("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Z){c=Z},this.getBaseLayer=function(){return u!==null?u:p},this.getBinding=function(){return d===null&&v&&(d=new XRWebGLBinding(s,e)),d},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(Z){if(s=Z,s!==null){if(R=t.getRenderTarget(),s.addEventListener("select",W),s.addEventListener("selectstart",W),s.addEventListener("selectend",W),s.addEventListener("squeeze",W),s.addEventListener("squeezestart",W),s.addEventListener("squeezeend",W),s.addEventListener("end",q),s.addEventListener("inputsourceschange",et),S.xrCompatible!==!0&&await e.makeXRCompatible(),x=t.getPixelRatio(),t.getSize(C),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let xt=null,Nt=null,gt=null;S.depth&&(gt=S.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,xt=S.stencil?es:pi,Nt=S.stencil?mr:ni);let Ht={colorFormat:e.RGBA8,depthFormat:gt,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Ht),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),y=new Ue(u.textureWidth,u.textureHeight,{format:zn,type:En,depthTexture:new qi(u.textureWidth,u.textureHeight,Nt,void 0,void 0,void 0,void 0,void 0,void 0,xt),stencilBuffer:S.stencil,colorSpace:t.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let xt={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,e,xt),s.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),y=new Ue(p.framebufferWidth,p.framebufferHeight,{format:zn,type:En,colorSpace:t.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),re.setContext(s),re.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function et(Z){for(let Q=0;Q<Z.removed.length;Q++){let xt=Z.removed[Q],Nt=b.indexOf(xt);Nt>=0&&(b[Nt]=null,E[Nt].disconnect(xt))}for(let Q=0;Q<Z.added.length;Q++){let xt=Z.added[Q],Nt=b.indexOf(xt);if(Nt===-1){for(let Ht=0;Ht<E.length;Ht++)if(Ht>=b.length){b.push(xt),Nt=Ht;break}else if(b[Ht]===null){b[Ht]=xt,Nt=Ht;break}if(Nt===-1)break}let gt=E[Nt];gt&&gt.connect(xt)}}let X=new A,J=new A;function tt(Z,Q,xt){X.setFromMatrixPosition(Q.matrixWorld),J.setFromMatrixPosition(xt.matrixWorld);let Nt=X.distanceTo(J),gt=Q.projectionMatrix.elements,Ht=xt.projectionMatrix.elements,Be=gt[14]/(gt[10]-1),Gt=gt[14]/(gt[10]+1),ne=(gt[9]+1)/gt[5],ge=(gt[9]-1)/gt[5],Xt=(gt[8]-1)/gt[0],be=(Ht[8]+1)/Ht[0],Xe=Be*Xt,bn=Be*be,we=Nt/(-Xt+be),Le=we*-Xt;if(Q.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(Le),Z.translateZ(we),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),gt[10]===-1)Z.projectionMatrix.copy(Q.projectionMatrix),Z.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{let U=Be+we,rn=Gt+we,he=Xe-Le,w=bn+(Nt-Le),_=ne*Gt/rn*U,O=ge*Gt/rn*U;Z.projectionMatrix.makePerspective(he,w,_,O,U,rn),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function Tt(Z,Q){Q===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(Q.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(s===null)return;let Q=Z.near,xt=Z.far;g.texture!==null&&(g.depthNear>0&&(Q=g.depthNear),g.depthFar>0&&(xt=g.depthFar)),B.near=L.near=P.near=Q,B.far=L.far=P.far=xt,(I!==B.near||z!==B.far)&&(s.updateRenderState({depthNear:B.near,depthFar:B.far}),I=B.near,z=B.far),B.layers.mask=Z.layers.mask|6,P.layers.mask=B.layers.mask&-5,L.layers.mask=B.layers.mask&-3;let Nt=Z.parent,gt=B.cameras;Tt(B,Nt);for(let Ht=0;Ht<gt.length;Ht++)Tt(gt[Ht],Nt);gt.length===2?tt(B,P,L):B.projectionMatrix.copy(P.projectionMatrix),T===null&&Z.isPerspectiveCamera&&(T={camera:Z,fov:Z.fov,zoom:Z.zoom}),St(Z,B,Nt)};function St(Z,Q,xt){xt===null?Z.matrix.copy(Q.matrixWorld):(Z.matrix.copy(xt.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(Q.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(Q.projectionMatrix),Z.projectionMatrixInverse.copy(Q.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=nr*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(u===null&&p===null))return l},this.setFoveation=function(Z){l=Z,u!==null&&(u.fixedFoveation=Z),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=Z)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(B)},this.getCameraTexture=function(Z){return f[Z]};let ae=null;function Zt(Z,Q){if(h=Q.getViewerPose(c||o),m=Q,h!==null){let xt=h.views;p!==null&&(t.setRenderTargetFramebuffer(y,p.framebuffer),t.setRenderTarget(y));let Nt=!1;xt.length!==B.cameras.length&&(B.cameras.length=0,Nt=!0);for(let Gt=0;Gt<xt.length;Gt++){let ne=xt[Gt],ge=null;if(p!==null)ge=p.getViewport(ne);else{let be=d.getViewSubImage(u,ne);ge=be.viewport,Gt===0&&(t.setRenderTargetTextures(y,be.colorTexture,be.depthStencilTexture),t.setRenderTarget(y))}let Xt=F[Gt];Xt===void 0&&(Xt=new Qe,Xt.layers.enable(Gt),Xt.viewport=new Ee,F[Gt]=Xt),Xt.matrix.fromArray(ne.transform.matrix),Xt.matrix.decompose(Xt.position,Xt.quaternion,Xt.scale),Xt.projectionMatrix.fromArray(ne.projectionMatrix),Xt.projectionMatrixInverse.copy(Xt.projectionMatrix).invert(),Xt.viewport.set(ge.x,ge.y,ge.width,ge.height),Gt===0&&(B.matrix.copy(Xt.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),Nt===!0&&B.cameras.push(Xt)}let gt=s.enabledFeatures;if(gt&&gt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&v){d=n.getBinding();let Gt=d.getDepthInformation(xt[0]);Gt&&Gt.isValid&&Gt.texture&&g.init(Gt,s.renderState)}if(gt&&gt.includes("camera-access")&&v){t.state.unbindTexture(),d=n.getBinding();for(let Gt=0;Gt<xt.length;Gt++){let ne=xt[Gt].camera;if(ne){let ge=f[ne];ge||(ge=new eo,f[ne]=ge);let Xt=d.getCameraImage(ne);ge.sourceTexture=Xt}}}}for(let xt=0;xt<E.length;xt++){let Nt=b[xt],gt=E[xt];Nt!==null&&gt!==void 0&&gt.update(Nt,Q,c||o)}ae&&ae(Z,Q),Q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Q}),m=null}let re=new Qf;re.setAnimationLoop(Zt),this.setAnimationLoop=function(Z){ae=Z},this.dispose=function(){}}},cv=new Jt,rp=new Dt;rp.set(-1,0,0,0,1,0,0,0,1);function hv(i,t){function e(g,f){g.matrixAutoUpdate===!0&&g.updateMatrix(),f.value.copy(g.matrix)}function n(g,f){f.color.getRGB(g.fogColor.value,Xh(i)),f.isFog?(g.fogNear.value=f.near,g.fogFar.value=f.far):f.isFogExp2&&(g.fogDensity.value=f.density)}function s(g,f,S,R,y){f.isNodeMaterial?f.uniformsNeedUpdate=!1:f.isMeshBasicMaterial?r(g,f):f.isMeshLambertMaterial?(r(g,f),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)):f.isMeshToonMaterial?(r(g,f),d(g,f)):f.isMeshPhongMaterial?(r(g,f),h(g,f),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)):f.isMeshStandardMaterial?(r(g,f),u(g,f),f.isMeshPhysicalMaterial&&p(g,f,y)):f.isMeshMatcapMaterial?(r(g,f),m(g,f)):f.isMeshDepthMaterial?r(g,f):f.isMeshDistanceMaterial?(r(g,f),v(g,f)):f.isMeshNormalMaterial?r(g,f):f.isLineBasicMaterial?(o(g,f),f.isLineDashedMaterial&&a(g,f)):f.isPointsMaterial?l(g,f,S,R):f.isSpriteMaterial?c(g,f):f.isShadowMaterial?(g.color.value.copy(f.color),g.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(g,f){g.opacity.value=f.opacity,f.color&&g.diffuse.value.copy(f.color),f.emissive&&g.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(g.map.value=f.map,e(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,e(f.alphaMap,g.alphaMapTransform)),f.bumpMap&&(g.bumpMap.value=f.bumpMap,e(f.bumpMap,g.bumpMapTransform),g.bumpScale.value=f.bumpScale,f.side===yn&&(g.bumpScale.value*=-1)),f.normalMap&&(g.normalMap.value=f.normalMap,e(f.normalMap,g.normalMapTransform),g.normalScale.value.copy(f.normalScale),f.side===yn&&g.normalScale.value.negate()),f.displacementMap&&(g.displacementMap.value=f.displacementMap,e(f.displacementMap,g.displacementMapTransform),g.displacementScale.value=f.displacementScale,g.displacementBias.value=f.displacementBias),f.emissiveMap&&(g.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,g.emissiveMapTransform)),f.specularMap&&(g.specularMap.value=f.specularMap,e(f.specularMap,g.specularMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest);let S=t.get(f),R=S.envMap,y=S.envMapRotation;R&&(g.envMap.value=R,g.envMapRotation.value.setFromMatrix4(cv.makeRotationFromEuler(y)).transpose(),R.isCubeTexture&&R.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(rp),g.reflectivity.value=f.reflectivity,g.ior.value=f.ior,g.refractionRatio.value=f.refractionRatio),f.lightMap&&(g.lightMap.value=f.lightMap,g.lightMapIntensity.value=f.lightMapIntensity,e(f.lightMap,g.lightMapTransform)),f.aoMap&&(g.aoMap.value=f.aoMap,g.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,g.aoMapTransform))}function o(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,f.map&&(g.map.value=f.map,e(f.map,g.mapTransform))}function a(g,f){g.dashSize.value=f.dashSize,g.totalSize.value=f.dashSize+f.gapSize,g.scale.value=f.scale}function l(g,f,S,R){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.size.value=f.size*S,g.scale.value=R*.5,f.map&&(g.map.value=f.map,e(f.map,g.uvTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,e(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function c(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.rotation.value=f.rotation,f.map&&(g.map.value=f.map,e(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,e(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function h(g,f){g.specular.value.copy(f.specular),g.shininess.value=Math.max(f.shininess,1e-4)}function d(g,f){f.gradientMap&&(g.gradientMap.value=f.gradientMap)}function u(g,f){g.metalness.value=f.metalness,f.metalnessMap&&(g.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,g.metalnessMapTransform)),g.roughness.value=f.roughness,f.roughnessMap&&(g.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,g.roughnessMapTransform)),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)}function p(g,f,S){g.ior.value=f.ior,f.sheen>0&&(g.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),g.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(g.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,g.sheenColorMapTransform)),f.sheenRoughnessMap&&(g.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,g.sheenRoughnessMapTransform))),f.clearcoat>0&&(g.clearcoat.value=f.clearcoat,g.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(g.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,g.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(g.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===yn&&g.clearcoatNormalScale.value.negate())),f.dispersion>0&&(g.dispersion.value=f.dispersion),f.retroreflectivity>0&&(g.retroreflectivity.value=f.retroreflectivity),f.iridescence>0&&(g.iridescence.value=f.iridescence,g.iridescenceIOR.value=f.iridescenceIOR,g.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(g.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,g.iridescenceMapTransform)),f.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),f.transmission>0&&(g.transmission.value=f.transmission,g.transmissionSamplerMap.value=S.texture,g.transmissionSamplerSize.value.set(S.width,S.height),f.transmissionMap&&(g.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,g.transmissionMapTransform)),g.thickness.value=f.thickness,f.thicknessMap&&(g.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=f.attenuationDistance,g.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(g.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(g.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=f.specularIntensity,g.specularColor.value.copy(f.specularColor),f.specularColorMap&&(g.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,g.specularColorMapTransform)),f.specularIntensityMap&&(g.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,f){f.matcap&&(g.matcap.value=f.matcap)}function v(g,f){let S=t.get(f).light;g.referencePosition.value.setFromMatrixPosition(S.matrixWorld),g.nearDistance.value=S.shadow.camera.near,g.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function uv(i,t,e,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,E){let b=E.program;n.uniformBlockBinding(y,b)}function c(y,E){let b=s[y.id];b===void 0&&(g(y),b=h(y),s[y.id]=b,y.addEventListener("dispose",S));let C=E.program;n.updateUBOMapping(y,C);let x=t.render.frame;r[y.id]!==x&&(u(y),r[y.id]=x)}function h(y){let E=d();y.__bindingPointIndex=E;let b=i.createBuffer(),C=y.__size,x=y.usage;return i.bindBuffer(i.UNIFORM_BUFFER,b),i.bufferData(i.UNIFORM_BUFFER,C,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,E,b),b}function d(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return It("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){let E=s[y.id],b=y.uniforms,C=y.__cache;i.bindBuffer(i.UNIFORM_BUFFER,E);for(let x=0,T=b.length;x<T;x++){let P=b[x];if(Array.isArray(P))for(let L=0,F=P.length;L<F;L++)p(P[L],x,L,C);else p(P,x,0,C)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(y,E,b,C){if(v(y,E,b,C)===!0){let x=y.__offset,T=y.value;if(Array.isArray(T)){let P=0;for(let L=0;L<T.length;L++){let F=T[L],B=f(F);m(F,y.__data,P),typeof F!="number"&&typeof F!="boolean"&&!F.isMatrix3&&!ArrayBuffer.isView(F)&&(P+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(T,y.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,y.__data)}}function m(y,E,b){typeof y=="number"||typeof y=="boolean"?E[0]=y:y.isMatrix3?(E[0]=y.elements[0],E[1]=y.elements[1],E[2]=y.elements[2],E[3]=0,E[4]=y.elements[3],E[5]=y.elements[4],E[6]=y.elements[5],E[7]=0,E[8]=y.elements[6],E[9]=y.elements[7],E[10]=y.elements[8],E[11]=0):ArrayBuffer.isView(y)?E.set(new y.constructor(y.buffer,y.byteOffset,E.length)):y.toArray(E,b)}function v(y,E,b,C){let x=y.value,T=E+"_"+b;if(C[T]===void 0)return typeof x=="number"||typeof x=="boolean"?C[T]=x:ArrayBuffer.isView(x)?C[T]=x.slice():C[T]=x.clone(),!0;{let P=C[T];if(typeof x=="number"||typeof x=="boolean"){if(P!==x)return C[T]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(P.equals(x)===!1)return P.copy(x),!0}}return!1}function g(y){let E=y.uniforms,b=0,C=16;for(let T=0,P=E.length;T<P;T++){let L=Array.isArray(E[T])?E[T]:[E[T]];for(let F=0,B=L.length;F<B;F++){let I=L[F],z=Array.isArray(I.value)?I.value:[I.value];for(let W=0,q=z.length;W<q;W++){let et=z[W],X=f(et),J=b%C,tt=J%X.boundary,Tt=J+tt;b+=tt,Tt!==0&&C-Tt<X.storage&&(b+=C-Tt),I.__data=new Float32Array(X.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=b,b+=X.storage}}}let x=b%C;return x>0&&(b+=C-x),y.__size=b,y.__cache={},this}function f(y){let E={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(E.boundary=4,E.storage=4):y.isVector2?(E.boundary=8,E.storage=8):y.isVector3||y.isColor?(E.boundary=16,E.storage=12):y.isVector4?(E.boundary=16,E.storage=16):y.isMatrix3?(E.boundary=48,E.storage=48):y.isMatrix4?(E.boundary=64,E.storage=64):y.isTexture?Ct("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(y)?(E.boundary=16,E.storage=y.byteLength):Ct("WebGLRenderer: Unsupported uniform value type.",y),E}function S(y){let E=y.target;E.removeEventListener("dispose",S);let b=o.indexOf(E.__bindingPointIndex);o.splice(b,1),i.deleteBuffer(s[E.id]),delete s[E.id],delete r[E.id]}function R(){for(let y in s)i.deleteBuffer(s[y]);o=[],s={},r={}}return{bind:l,update:c,dispose:R}}var dv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),gi=null;function fv(){return gi===null&&(gi=new Ya(dv,16,16,ns,nn),gi.name="DFG_LUT",gi.minFilter=tn,gi.magFilter=tn,gi.wrapS=fi,gi.wrapT=fi,gi.generateMipmaps=!1,gi.needsUpdate=!0),gi}var oc=class{constructor(t={}){let{canvas:e=Ef(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:p=En}=t;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=o;let v=p,g=new Set([bl,Sl,Ml]),f=new Set([En,ni,pr,mr,yl,vl]),S=new Uint32Array(4),R=new Int32Array(4),y=new A,E=null,b=null,C=[],x=[],T=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ei,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,L=!1,F=null,B=null,I=null,z=null;this._outputColorSpace=ze;let W=0,q=0,et=null,X=-1,J=null,tt=new Ee,Tt=new Ee,St=null,ae=new yt(0),Zt=0,re=e.width,Z=e.height,Q=1,xt=null,Nt=null,gt=new Ee(0,0,re,Z),Ht=new Ee(0,0,re,Z),Be=!1,Gt=new ar,ne=!1,ge=!1,Xt=new Jt,be=new A,Xe=new Ee,bn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},we=!1;function Le(){return et===null?Q:1}let U=n;function rn(M,D){return e.getContext(M,D)}let he,w,_,O,V,Y,it,st,K,j,rt,wt,ht,ot,At,Pt,Ut,N,at,$,lt,pt,nt;try{let M={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",_e,!1),e.addEventListener("webglcontextrestored",le,!1),e.addEventListener("webglcontextcreationerror",qn,!1),U===null){let D="webgl2";if(U=rn(D,M),U===null)throw rn(D)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Rt()}catch(M){throw e.removeEventListener("webglcontextlost",_e,!1),e.removeEventListener("webglcontextrestored",le,!1),e.removeEventListener("webglcontextcreationerror",qn,!1),It("WebGLRenderer: "+M.message),M}function Rt(){he=new vx(U),he.init(),lt=new ov(U,he),w=new hx(U,he,t,lt),_=new sv(U,he),w.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),B=U.createFramebuffer(),I=U.createFramebuffer(),z=U.createFramebuffer(),O=new bx(U),V=new Wy,Y=new rv(U,he,_,V,w,lt,O),it=new yx(P),st=new Tg(U),pt=new lx(U,st),K=new Mx(U,st,O,pt),j=new Tx(U,K,st,pt,O),N=new Ex(U,w,Y),At=new ux(V),rt=new Gy(P,it,he,w,pt,At),wt=new hv(P,V),ht=new qy,ot=new jy(he),Ut=new ax(P,it,_,j,m,l),Pt=new iv(P,j,w),nt=new uv(U,O,w,_),at=new cx(U,he,O),$=new Sx(U,he,O),O.programs=rt.programs,P.capabilities=w,P.extensions=he,P.properties=V,P.renderLists=ht,P.shadowMap=Pt,P.state=_,P.info=O}v!==En&&(T=new Ax(v,e.width,e.height,a,s,r));let bt=new pu(P,U);this.xr=bt,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){let M=he.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){let M=he.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return Q},this.setPixelRatio=function(M){M!==void 0&&(Q=M,this.setSize(re,Z,!1))},this.getSize=function(M){return M.set(re,Z)},this.setSize=function(M,D,G=!0){if(bt.isPresenting){Ct("WebGLRenderer: Can't change size while VR device is presenting.");return}re=M,Z=D,e.width=Math.floor(M*Q),e.height=Math.floor(D*Q),G===!0&&(e.style.width=M+"px",e.style.height=D+"px"),T!==null&&T.setSize(e.width,e.height),this.setViewport(0,0,M,D)},this.getDrawingBufferSize=function(M){return M.set(re*Q,Z*Q).floor()},this.setDrawingBufferSize=function(M,D,G){re=M,Z=D,Q=G,e.width=Math.floor(M*G),e.height=Math.floor(D*G),this.setViewport(0,0,M,D)},this.setEffects=function(M){if(v===En){It("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(M){for(let D=0;D<M.length;D++)if(M[D].isOutputPass===!0){Ct("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}T.setEffects(M||[])},this.getCurrentViewport=function(M){return M.copy(tt)},this.getViewport=function(M){return M.copy(gt)},this.setViewport=function(M,D,G,k){M.isVector4?gt.set(M.x,M.y,M.z,M.w):gt.set(M,D,G,k),_.viewport(tt.copy(gt).multiplyScalar(Q).round())},this.getScissor=function(M){return M.copy(Ht)},this.setScissor=function(M,D,G,k){M.isVector4?Ht.set(M.x,M.y,M.z,M.w):Ht.set(M,D,G,k),_.scissor(Tt.copy(Ht).multiplyScalar(Q).round())},this.getScissorTest=function(){return Be},this.setScissorTest=function(M){_.setScissorTest(Be=M)},this.setOpaqueSort=function(M){xt=M},this.setTransparentSort=function(M){Nt=M},this.getClearColor=function(M){return M.copy(Ut.getClearColor())},this.setClearColor=function(){Ut.setClearColor(...arguments)},this.getClearAlpha=function(){return Ut.getClearAlpha()},this.setClearAlpha=function(){Ut.setClearAlpha(...arguments)},this.clear=function(M=!0,D=!0,G=!0){let k=0;if(M){let H=!1;if(et!==null){let ft=et.texture.format;H=g.has(ft)}if(H){let ft=et.texture.type,_t=f.has(ft),dt=Ut.getClearColor(),vt=Ut.getClearAlpha(),Et=dt.r,Bt=dt.g,Wt=dt.b;_t?(S[0]=Et,S[1]=Bt,S[2]=Wt,S[3]=vt,U.clearBufferuiv(U.COLOR,0,S)):(R[0]=Et,R[1]=Bt,R[2]=Wt,R[3]=vt,U.clearBufferiv(U.COLOR,0,R))}else k|=U.COLOR_BUFFER_BIT}D&&(k|=U.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),G&&(k|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k!==0&&U.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(M){M.setRenderer(this),F=M},this.dispose=function(){e.removeEventListener("webglcontextlost",_e,!1),e.removeEventListener("webglcontextrestored",le,!1),e.removeEventListener("webglcontextcreationerror",qn,!1),Ut.dispose(),ht.dispose(),ot.dispose(),V.dispose(),it.dispose(),j.dispose(),pt.dispose(),nt.dispose(),rt.dispose(),bt.dispose(),bt.removeEventListener("sessionstart",id),bt.removeEventListener("sessionend",sd),ls.stop()};function _e(M){M.preventDefault(),Kr("WebGLRenderer: Context Lost."),L=!0}function le(){Kr("WebGLRenderer: Context Restored."),L=!1;let M=O.autoReset,D=Pt.enabled,G=Pt.autoUpdate,k=Pt.needsUpdate,H=Pt.type;Rt(),O.autoReset=M,Pt.enabled=D,Pt.autoUpdate=G,Pt.needsUpdate=k,Pt.type=H}function qn(M){It("WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function ci(M){let D=M.target;D.removeEventListener("dispose",ci),gm(D)}function gm(M){_m(M),V.remove(M)}function _m(M){let D=V.get(M).programs;D!==void 0&&(D.forEach(function(G){rt.releaseProgram(G)}),M.isShaderMaterial&&rt.releaseShaderCache(M))}this.renderBufferDirect=function(M,D,G,k,H,ft){D===null&&(D=bn);let _t=H.isMesh&&H.matrixWorld.determinantAffine()<0,dt=vm(M,D,G,k,H);_.setMaterial(k,_t);let vt=G.index,Et=1;if(k.wireframe===!0){if(vt=K.getWireframeAttribute(G),vt===void 0)return;Et=2}let Bt=G.drawRange,Wt=G.attributes.position,Mt=Bt.start*Et,ce=(Bt.start+Bt.count)*Et;ft!==null&&(Mt=Math.max(Mt,ft.start*Et),ce=Math.min(ce,(ft.start+ft.count)*Et)),vt!==null?(Mt=Math.max(Mt,0),ce=Math.min(ce,vt.count)):Wt!=null&&(Mt=Math.max(Mt,0),ce=Math.min(ce,Wt.count));let De=ce-Mt;if(De<0||De===1/0)return;pt.setup(H,k,dt,G,vt);let ve,me=at;if(vt!==null&&(ve=st.get(vt),me=$,me.setIndex(ve)),H.isMesh)k.wireframe===!0?(_.setLineWidth(k.wireframeLinewidth*Le()),me.setMode(U.LINES)):me.setMode(U.TRIANGLES);else if(H.isLine){let on=k.linewidth;on===void 0&&(on=1),_.setLineWidth(on*Le()),H.isLineSegments?me.setMode(U.LINES):H.isLineLoop?me.setMode(U.LINE_LOOP):me.setMode(U.LINE_STRIP)}else H.isPoints?me.setMode(U.POINTS):H.isSprite&&me.setMode(U.TRIANGLES);if(H.isBatchedMesh)if(he.get("WEBGL_multi_draw"))me.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let on=H._multiDrawStarts,mt=H._multiDrawCounts,pn=H._multiDrawCount,$t=vt?st.get(vt).bytesPerElement:1,Nn=V.get(k).currentProgram.getUniforms();for(let hi=0;hi<pn;hi++)Nn.setValue(U,"_gl_DrawID",hi),me.render(on[hi]/$t,mt[hi])}else if(H.isInstancedMesh)me.renderInstances(Mt,De,H.count);else if(G.isInstancedBufferGeometry){let on=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,mt=Math.min(G.instanceCount,on);me.renderInstances(Mt,De,mt)}else me.render(Mt,De)};function nd(M,D,G,k){F!==null&&M.isNodeMaterial&&F.setObject(k,M),ne===!0&&At.setState(M,G,!1),M.transparent===!0&&M.side===Ke&&M.forceSinglePass===!1?(M.side=yn,M.needsUpdate=!0,na(M,D,k),M.side=ji,M.needsUpdate=!0,na(M,D,k),M.side=Ke):na(M,D,k)}this.compile=function(M,D,G=null){G===null&&(G=M),F!==null&&F.renderStart(M,D,G),b=ot.get(G),b.init(D),x.push(b),G.traverseVisible(function(H){H.isLight&&H.layers.test(D.layers)&&(b.pushLight(H),H.castShadow&&b.pushShadow(H))}),M!==G&&M.traverseVisible(function(H){H.isLight&&H.layers.test(D.layers)&&(b.pushLight(H),H.castShadow&&b.pushShadow(H))}),b.setupLights(),F!==null&&F.updateLights(b.state.lightsArray),ge=this.localClippingEnabled,ne=At.init(this.clippingPlanes,ge),ne===!0&&At.setGlobalState(this.clippingPlanes,D),F!==null&&Pt.render(b.state.shadowsArray,G,D);let k=new Set;return M.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let ft=H.material;if(ft)if(Array.isArray(ft))for(let _t=0;_t<ft.length;_t++){let dt=ft[_t];nd(dt,G,D,H),k.add(dt)}else nd(ft,G,D,H),k.add(ft)}),b=x.pop(),F!==null&&F.renderEnd(),k},this.compileAsync=function(M,D,G=null){let k=this.compile(M,D,G);return new Promise(H=>{function ft(){if(k.forEach(function(_t){let vt=V.get(_t).currentProgram;(vt===void 0||vt.isReady())&&k.delete(_t)}),k.size===0){H(M);return}setTimeout(ft,10)}he.get("KHR_parallel_shader_compile")!==null?ft():setTimeout(ft,10)})};let qc=null;function xm(M){qc&&qc(M)}function id(){ls.stop()}function sd(){ls.start()}let ls=new Qf;ls.setAnimationLoop(xm),typeof self<"u"&&ls.setContext(self),this.setAnimationLoop=function(M){qc=M,bt.setAnimationLoop(M),M===null?ls.stop():ls.start()},bt.addEventListener("sessionstart",id),bt.addEventListener("sessionend",sd),this.render=function(M,D){if(D!==void 0&&D.isCamera!==!0){It("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;F!==null&&F.renderStart(M,D);let G=bt.enabled===!0&&bt.isPresenting===!0,k=T!==null&&(et===null||G)&&T.begin(P,et);if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),bt.enabled===!0&&bt.isPresenting===!0&&(T===null||T.isCompositing()===!1)&&(bt.cameraAutoUpdate===!0&&bt.updateCamera(D),D=bt.getCamera()),M.isScene===!0&&M.onBeforeRender(P,M,D,et),b=ot.get(M,x.length),b.init(D),b.state.textureUnits=Y.getTextureUnits(),x.push(b),Xt.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),Gt.setFromProjectionMatrix(Xt,Jn,D.reversedDepth),ge=this.localClippingEnabled,ne=At.init(this.clippingPlanes,ge),E=ht.get(M,C.length),E.init(),C.push(E),bt.enabled===!0&&bt.isPresenting===!0){let _t=P.xr.getDepthSensingMesh();_t!==null&&Yc(_t,D,-1/0,P.sortObjects)}Yc(M,D,0,P.sortObjects),E.finish(),F!==null&&F.updateLights(b.state.lightsArray),P.sortObjects===!0&&E.sort(xt,Nt),we=bt.enabled===!1||bt.isPresenting===!1||bt.hasDepthSensing()===!1,we&&Ut.addToRenderList(E,M),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),ne===!0&&At.beginShadows();let H=b.state.shadowsArray;if(Pt.render(H,M,D),ne===!0&&At.endShadows(),(k&&T.hasRenderPass())===!1){let _t=E.opaque,dt=E.transmissive;if(b.setupLights(),D.isArrayCamera){let vt=D.cameras;if(dt.length>0)for(let Et=0,Bt=vt.length;Et<Bt;Et++){let Wt=vt[Et];od(_t,dt,M,Wt)}we&&Ut.render(M);for(let Et=0,Bt=vt.length;Et<Bt;Et++){let Wt=vt[Et];rd(E,M,Wt,Wt.viewport)}}else dt.length>0&&od(_t,dt,M,D),we&&Ut.render(M),rd(E,M,D)}et!==null&&q===0&&(Y.updateMultisampleRenderTarget(et),Y.updateRenderTargetMipmap(et)),k&&T.end(P),M.isScene===!0&&M.onAfterRender(P,M,D),pt.resetDefaultState(),X=-1,J=null,x.pop(),x.length>0?(b=x[x.length-1],Y.setTextureUnits(b.state.textureUnits),ne===!0&&At.setGlobalState(P.clippingPlanes,b.state.camera)):b=null,C.pop(),C.length>0?E=C[C.length-1]:E=null,F!==null&&F.renderEnd()};function Yc(M,D,G,k){if(M.visible===!1)return;if(M.layers.test(D.layers)){if(M.isGroup)G=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(D);else if(M.isLightProbeGrid)b.pushLightProbeGrid(M);else if(M.isLight)b.pushLight(M),M.castShadow&&b.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||M.intersectsFrustum(Gt)){k&&Xe.setFromMatrixPosition(M.matrixWorld).applyMatrix4(Xt);let _t=j.update(M),dt=M.material;dt.visible&&E.push(M,_t,dt,G,Xe.z,null,D)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||M.intersectsFrustum(Gt))){let _t=j.update(M),dt=M.material;if(k&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Xe.copy(M.boundingSphere.center)):(_t.boundingSphere===null&&_t.computeBoundingSphere(),Xe.copy(_t.boundingSphere.center)),Xe.applyMatrix4(M.matrixWorld).applyMatrix4(Xt)),Array.isArray(dt)){let vt=_t.groups;for(let Et=0,Bt=vt.length;Et<Bt;Et++){let Wt=vt[Et],Mt=dt[Wt.materialIndex];Mt&&Mt.visible&&E.push(M,_t,Mt,G,Xe.z,Wt,D)}}else dt.visible&&E.push(M,_t,dt,G,Xe.z,null,D)}}let ft=M.children;for(let _t=0,dt=ft.length;_t<dt;_t++)Yc(ft[_t],D,G,k)}function rd(M,D,G,k){let{opaque:H,transmissive:ft,transparent:_t}=M;b.setupLightsView(G),ne===!0&&At.setGlobalState(P.clippingPlanes,G),k&&_.viewport(tt.copy(k)),H.length>0&&ea(H,D,G),ft.length>0&&ea(ft,D,G),_t.length>0&&ea(_t,D,G),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function od(M,D,G,k){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;if(b.state.transmissionRenderTarget[k.id]===void 0){let Mt=he.has("EXT_color_buffer_half_float")||he.has("EXT_color_buffer_float");b.state.transmissionRenderTarget[k.id]=new Ue(1,1,{generateMipmaps:!0,type:Mt?nn:En,minFilter:ts,samples:Math.max(4,w.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Vt.workingColorSpace})}let ft=b.state.transmissionRenderTarget[k.id],_t=k.viewport||tt;ft.setSize(_t.z*P.transmissionResolutionScale,_t.w*P.transmissionResolutionScale);let dt=P.getRenderTarget(),vt=P.getActiveCubeFace(),Et=P.getActiveMipmapLevel();P.setRenderTarget(ft),P.getClearColor(ae),Zt=P.getClearAlpha(),Zt<1&&P.setClearColor(16777215,.5),P.clear(),we&&Ut.render(G);let Bt=P.toneMapping;P.toneMapping=ei;let Wt=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),b.setupLightsView(k),ne===!0&&At.setGlobalState(P.clippingPlanes,k),ea(M,G,k),Y.updateMultisampleRenderTarget(ft),Y.updateRenderTargetMipmap(ft),he.has("WEBGL_multisampled_render_to_texture")===!1){let Mt=!1;for(let ce=0,De=D.length;ce<De;ce++){let ve=D[ce],{object:me,geometry:on,material:mt,group:pn}=ve;if(mt.side===Ke&&me.layers.test(k.layers)){let $t=mt.side;mt.side=yn,mt.needsUpdate=!0,ad(me,G,k,on,mt,pn),mt.side=$t,mt.needsUpdate=!0,Mt=!0}}Mt===!0&&(Y.updateMultisampleRenderTarget(ft),Y.updateRenderTargetMipmap(ft))}P.setRenderTarget(dt,vt,Et),P.setClearColor(ae,Zt),Wt!==void 0&&(k.viewport=Wt),P.toneMapping=Bt}function ea(M,D,G){let k=D.isScene===!0?D.overrideMaterial:null;for(let H=0,ft=M.length;H<ft;H++){let _t=M[H],{object:dt,geometry:vt,group:Et}=_t,Bt=_t.material;Bt.allowOverride===!0&&k!==null&&(Bt=k),dt.layers.test(G.layers)&&ad(dt,D,G,vt,Bt,Et)}}function ad(M,D,G,k,H,ft){F!==null&&H.isNodeMaterial&&F.setObject(M,H),M.onBeforeRender(P,D,G,k,H,ft),M.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),H.onBeforeRender(P,D,G,k,M,ft),H.transparent===!0&&H.side===Ke&&H.forceSinglePass===!1?(H.side=yn,H.needsUpdate=!0,P.renderBufferDirect(G,D,k,H,M,ft),H.side=ji,H.needsUpdate=!0,P.renderBufferDirect(G,D,k,H,M,ft),H.side=Ke):P.renderBufferDirect(G,D,k,H,M,ft),M.onAfterRender(P,D,G,k,H,ft)}function na(M,D,G){D.isScene!==!0&&(D=bn);let k=V.get(M),H=b.state.lights,ft=b.state.shadowsArray,_t=H.state.version,dt=rt.getParameters(M,H.state,ft,D,G,b.state.lightProbeGridArray),vt=rt.getProgramCacheKey(dt),Et=k.programs;k.environment=M.isMeshStandardMaterial||M.isMeshLambertMaterial||M.isMeshPhongMaterial?D.environment:null,k.fog=D.fog;let Bt=M.isMeshStandardMaterial||M.isMeshLambertMaterial&&!M.envMap||M.isMeshPhongMaterial&&!M.envMap;k.envMap=it.get(M.envMap||k.environment,Bt),k.envMapRotation=k.environment!==null&&M.envMap===null?D.environmentRotation:M.envMapRotation,Et===void 0&&(M.addEventListener("dispose",ci),Et=new Map,k.programs=Et);let Wt=Et.get(vt);if(Wt!==void 0){if(k.currentProgram===Wt&&k.lightsStateVersion===_t)return cd(M,dt),Wt}else dt.uniforms=rt.getUniforms(M),F!==null&&M.isNodeMaterial&&F.build(M,G,dt),M.onBeforeCompile(dt,P),Wt=rt.acquireProgram(dt,vt),Et.set(vt,Wt),k.uniforms=dt.uniforms;let Mt=k.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Mt.clippingPlanes=At.uniform),cd(M,dt),k.needsLights=Sm(M),k.lightsStateVersion=_t,k.needsLights&&(Mt.ambientLightColor.value=H.state.ambient,Mt.lightProbe.value=H.state.probe,Mt.sunLights.value=H.state.sun,Mt.sunLightShadows.value=H.state.sunShadow,Mt.directionalLights.value=H.state.directional,Mt.directionalLightShadows.value=H.state.directionalShadow,Mt.spotLights.value=H.state.spot,Mt.spotLightShadows.value=H.state.spotShadow,Mt.rectAreaLights.value=H.state.rectArea,Mt.ltc_1.value=H.state.rectAreaLTC1,Mt.ltc_2.value=H.state.rectAreaLTC2,Mt.pointLights.value=H.state.point,Mt.pointLightShadows.value=H.state.pointShadow,Mt.hemisphereLights.value=H.state.hemi,Mt.sunShadowMatrix.value=H.state.sunShadowMatrix,Mt.sunShadowCascade.value=H.state.sunShadowCascade,Mt.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Mt.spotLightMatrix.value=H.state.spotLightMatrix,Mt.spotLightMap.value=H.state.spotLightMap,Mt.pointShadowMatrix.value=H.state.pointShadowMatrix),k.lightProbeGrid=b.state.lightProbeGridArray.length>0,k.currentProgram=Wt,k.uniformsList=null,Wt}function ld(M){if(M.uniformsList===null){let D=M.currentProgram.getUniforms();M.uniformsList=yr.seqWithValue(D.seq,M.uniforms)}return M.uniformsList}function cd(M,D){let G=V.get(M);G.outputColorSpace=D.outputColorSpace,G.batching=D.batching,G.batchingColor=D.batchingColor,G.instancing=D.instancing,G.instancingColor=D.instancingColor,G.instancingMorph=D.instancingMorph,G.skinning=D.skinning,G.morphTargets=D.morphTargets,G.morphNormals=D.morphNormals,G.morphColors=D.morphColors,G.morphTargetsCount=D.morphTargetsCount,G.numClippingPlanes=D.numClippingPlanes,G.numIntersection=D.numClipIntersection,G.vertexAlphas=D.vertexAlphas,G.vertexTangents=D.vertexTangents,G.toneMapping=D.toneMapping}function ym(M,D){if(M.length===0)return null;if(M.length===1)return M[0].texture!==null?M[0]:null;y.setFromMatrixPosition(D.matrixWorld);for(let G=0,k=M.length;G<k;G++){let H=M[G];if(H.texture!==null&&H.boundingBox.containsPoint(y))return H}return null}function vm(M,D,G,k,H){D.isScene!==!0&&(D=bn),Y.resetTextureUnits();let ft=D.fog,_t=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?D.environment:null,dt=et===null?P.outputColorSpace:et.isXRRenderTarget===!0?et.texture.colorSpace:Vt.workingColorSpace,vt=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,Et=it.get(k.envMap||_t,vt),Bt=k.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Wt=!!G.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Mt=!!G.morphAttributes.position,ce=!!G.morphAttributes.normal,De=!!G.morphAttributes.color,ve=ei;k.toneMapped&&(et===null||et.isXRRenderTarget===!0)&&(ve=P.toneMapping);let me=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,on=me!==void 0?me.length:0,mt=V.get(k),pn=b.state.lights;if(ne===!0&&(ge===!0||M!==J)){let xe=M===J&&k.id===X;At.setState(k,M,xe)}let $t=!1;k.version===mt.__version?(mt.needsLights&&mt.lightsStateVersion!==pn.state.version||mt.outputColorSpace!==dt||H.isBatchedMesh&&mt.batching===!1||!H.isBatchedMesh&&mt.batching===!0||H.isBatchedMesh&&mt.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&mt.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&mt.instancing===!1||!H.isInstancedMesh&&mt.instancing===!0||H.isSkinnedMesh&&mt.skinning===!1||!H.isSkinnedMesh&&mt.skinning===!0||H.isInstancedMesh&&mt.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&mt.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&mt.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&mt.instancingMorph===!1&&H.morphTexture!==null||mt.envMap!==Et||k.fog===!0&&mt.fog!==ft||mt.numClippingPlanes!==void 0&&(mt.numClippingPlanes!==At.numPlanes||mt.numIntersection!==At.numIntersection)||mt.vertexAlphas!==Bt||mt.vertexTangents!==Wt||mt.morphTargets!==Mt||mt.morphNormals!==ce||mt.morphColors!==De||mt.toneMapping!==ve||mt.morphTargetsCount!==on||!!mt.lightProbeGrid!=b.state.lightProbeGridArray.length>0)&&($t=!0):($t=!0,mt.__version=k.version);let Nn=mt.currentProgram;$t===!0&&(Nn=na(k,D,H),F&&k.isNodeMaterial&&F.onUpdateProgram(k,Nn,mt));let hi=!1,Fi=!1,Ls=!1,pe=Nn.getUniforms(),Pe=mt.uniforms;if(_.useProgram(Nn.program)&&(hi=!0,Fi=!0,Ls=!0),k.id!==X&&(X=k.id,Fi=!0),mt.needsLights){let xe=ym(b.state.lightProbeGridArray,H);mt.lightProbeGrid!==xe&&(mt.lightProbeGrid=xe,Fi=!0)}if(hi||J!==M){_.buffers.depth.getReversed()&&M.reversedDepth!==!0&&(M._reversedDepth=!0,M.updateProjectionMatrix()),pe.setValue(U,"projectionMatrix",M.projectionMatrix),pe.setValue(U,"viewMatrix",M.matrixWorldInverse);let Bi=pe.map.cameraPosition;Bi!==void 0&&Bi.setValue(U,be.setFromMatrixPosition(M.matrixWorld)),w.logarithmicDepthBuffer&&pe.setValue(U,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&pe.setValue(U,"isOrthographic",M.isOrthographicCamera===!0),J!==M&&(J=M,Fi=!0,Ls=!0)}if(mt.needsLights&&(pn.state.sunShadowMap.length>0&&pe.setValue(U,"sunShadowMap",pn.state.sunShadowMap,Y),pn.state.directionalShadowMap.length>0&&pe.setValue(U,"directionalShadowMap",pn.state.directionalShadowMap,Y),pn.state.spotShadowMap.length>0&&pe.setValue(U,"spotShadowMap",pn.state.spotShadowMap,Y),pn.state.pointShadowMap.length>0&&pe.setValue(U,"pointShadowMap",pn.state.pointShadowMap,Y)),H.isSkinnedMesh){pe.setOptional(U,H,"bindMatrix"),pe.setOptional(U,H,"bindMatrixInverse");let xe=H.skeleton;xe&&(xe.boneTexture===null&&xe.computeBoneTexture(),pe.setValue(U,"boneTexture",xe.boneTexture,Y))}H.isBatchedMesh&&(pe.setOptional(U,H,"batchingTexture"),pe.setValue(U,"batchingTexture",H._matricesTexture,Y),pe.setOptional(U,H,"batchingIdTexture"),pe.setValue(U,"batchingIdTexture",H._indirectTexture,Y),pe.setOptional(U,H,"batchingColorTexture"),H._colorsTexture!==null&&pe.setValue(U,"batchingColorTexture",H._colorsTexture,Y));let Oi=G.morphAttributes;if((Oi.position!==void 0||Oi.normal!==void 0||Oi.color!==void 0)&&N.update(H,G,Nn),(Fi||mt.receiveShadow!==H.receiveShadow)&&(mt.receiveShadow=H.receiveShadow,pe.setValue(U,"receiveShadow",H.receiveShadow)),(k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial)&&k.envMap===null&&D.environment!==null&&(Pe.envMapIntensity.value=D.environmentIntensity),Pe.dfgLUT!==void 0&&(Pe.dfgLUT.value=fv()),Fi){if(pe.setValue(U,"toneMappingExposure",P.toneMappingExposure),mt.needsLights&&Mm(Pe,Ls),ft&&k.fog===!0&&wt.refreshFogUniforms(Pe,ft),wt.refreshMaterialUniforms(Pe,k,Q,Z,b.state.transmissionRenderTarget[M.id]),mt.needsLights&&mt.lightProbeGrid){let xe=mt.lightProbeGrid;Pe.probesSH.value=xe.texture,Pe.probesMin.value.copy(xe.boundingBox.min),Pe.probesMax.value.copy(xe.boundingBox.max),Pe.probesResolution.value.copy(xe.resolution)}yr.upload(U,ld(mt),Pe,Y)}if(k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(yr.upload(U,ld(mt),Pe,Y),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&pe.setValue(U,"center",H.center),pe.setValue(U,"modelViewMatrix",H.modelViewMatrix),pe.setValue(U,"normalMatrix",H.normalMatrix),pe.setValue(U,"modelMatrix",H.matrixWorld),k.uniformsGroups!==void 0){let xe=k.uniformsGroups;for(let Bi=0,Ds=xe.length;Bi<Ds;Bi++){let ud=xe[Bi];nt.update(ud,Nn),nt.bind(ud,Nn)}}return Nn}function Mm(M,D){M.ambientLightColor.needsUpdate=D,M.lightProbe.needsUpdate=D,M.sunLights.needsUpdate=D,M.sunLightShadows.needsUpdate=D,M.directionalLights.needsUpdate=D,M.directionalLightShadows.needsUpdate=D,M.pointLights.needsUpdate=D,M.pointLightShadows.needsUpdate=D,M.spotLights.needsUpdate=D,M.spotLightShadows.needsUpdate=D,M.rectAreaLights.needsUpdate=D,M.hemisphereLights.needsUpdate=D}function Sm(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return W},this.getActiveMipmapLevel=function(){return q},this.getRenderTarget=function(){return et},this.setRenderTargetTextures=function(M,D,G){let k=V.get(M);k.__autoAllocateDepthBuffer=M.resolveDepthBuffer===!1,k.__autoAllocateDepthBuffer===!1&&(k.__useRenderToTexture=!1),V.get(M.texture).__webglTexture=D,V.get(M.depthTexture).__webglTexture=k.__autoAllocateDepthBuffer?void 0:G,k.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(M,D){let G=V.get(M);G.__webglFramebuffer=D,G.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(M,D=0,G=0){et=M,W=D,q=G;let k=null,H=!1,ft=!1;if(M){let dt=V.get(M);if(dt.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(U.FRAMEBUFFER,dt.__webglFramebuffer),tt.copy(M.viewport),Tt.copy(M.scissor),St=M.scissorTest,_.viewport(tt),_.scissor(Tt),_.setScissorTest(St),X=-1;return}else if(dt.__webglFramebuffer===void 0)Y.setupRenderTarget(M);else if(dt.__hasExternalTextures)Y.rebindTextures(M,V.get(M.texture).__webglTexture,V.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){let Bt=M.depthTexture;if(dt.__boundDepthTexture!==Bt){if(Bt!==null&&V.has(Bt)&&(M.width!==Bt.image.width||M.height!==Bt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Y.setupDepthRenderbuffer(M)}}let vt=M.texture;(vt.isData3DTexture||vt.isDataArrayTexture||vt.isCompressedArrayTexture)&&(ft=!0);let Et=V.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Et[D])?k=Et[D][G]:k=Et[D],H=!0):M.samples>0&&Y.useMultisampledRTT(M)===!1?k=V.get(M).__webglMultisampledFramebuffer:Array.isArray(Et)?k=Et[G]:k=Et,tt.copy(M.viewport),Tt.copy(M.scissor),St=M.scissorTest}else tt.copy(gt).multiplyScalar(Q).floor(),Tt.copy(Ht).multiplyScalar(Q).floor(),St=Be;if(G!==0&&(k=B),_.bindFramebuffer(U.FRAMEBUFFER,k)&&_.drawBuffers(M,k),_.viewport(tt),_.scissor(Tt),_.setScissorTest(St),H){let dt=V.get(M.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+D,dt.__webglTexture,G)}else if(ft){let dt=D;for(let vt=0;vt<M.textures.length;vt++){let Et=V.get(M.textures[vt]);U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0+vt,Et.__webglTexture,G,dt)}}else if(M!==null&&G!==0){let dt=V.get(M.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,dt.__webglTexture,G)}X=-1};function hd(M){let D=V.get(M);return(D.__readFormat!==M.format||D.__readType!==M.type)&&(D.__readFormat=M.format,D.__readType=M.type,D.__formatReadable=w.textureFormatReadable(M.format),D.__typeReadable=w.textureTypeReadable(M.type)),D}this.readRenderTargetPixels=function(M,D,G,k,H,ft,_t,dt=0){if(!(M&&M.isWebGLRenderTarget)){It("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let vt=V.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&_t!==void 0&&(vt=vt[_t]),vt){_.bindFramebuffer(U.FRAMEBUFFER,vt);try{let Et=M.textures[dt],Bt=Et.format,Wt=Et.type;M.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+dt);let Mt=hd(Et);if(Mt.__formatReadable===!1){It("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Mt.__typeReadable===!1){It("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=M.width-k&&G>=0&&G<=M.height-H&&U.readPixels(D,G,k,H,lt.convert(Bt),lt.convert(Wt),ft)}finally{let Et=et!==null?V.get(et).__webglFramebuffer:null;_.bindFramebuffer(U.FRAMEBUFFER,Et)}}},this.readRenderTargetPixelsAsync=async function(M,D,G,k,H,ft,_t,dt=0){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let vt=V.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&_t!==void 0&&(vt=vt[_t]),vt)if(D>=0&&D<=M.width-k&&G>=0&&G<=M.height-H){_.bindFramebuffer(U.FRAMEBUFFER,vt);let Et=M.textures[dt],Bt=Et.format,Wt=Et.type;M.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+dt);let Mt=hd(Et);if(Mt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Mt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ce=U.createBuffer();U.bindBuffer(U.PIXEL_PACK_BUFFER,ce),U.bufferData(U.PIXEL_PACK_BUFFER,ft.byteLength,U.STREAM_READ),U.readPixels(D,G,k,H,lt.convert(Bt),lt.convert(Wt),0),U.bindBuffer(U.PIXEL_PACK_BUFFER,null);let De=et!==null?V.get(et).__webglFramebuffer:null;_.bindFramebuffer(U.FRAMEBUFFER,De);let ve=U.fenceSync(U.SYNC_GPU_COMMANDS_COMPLETE,0);return U.flush(),await wf(U,ve,4),U.bindBuffer(U.PIXEL_PACK_BUFFER,ce),U.getBufferSubData(U.PIXEL_PACK_BUFFER,0,ft),U.bindBuffer(U.PIXEL_PACK_BUFFER,null),U.deleteBuffer(ce),U.deleteSync(ve),ft}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(M,D=null,G=0){let k=Math.pow(2,-G),H=Math.floor(M.image.width*k),ft=Math.floor(M.image.height*k),_t=D!==null?D.x:0,dt=D!==null?D.y:0;Y.setTexture2D(M,0),U.copyTexSubImage2D(U.TEXTURE_2D,G,0,0,_t,dt,H,ft),_.unbindTexture()},this.copyTextureToTexture=function(M,D,G=null,k=null,H=0,ft=0){let _t,dt,vt,Et,Bt,Wt,Mt,ce,De,ve=M.isCompressedTexture?M.mipmaps[ft]:M.image;if(G!==null)_t=G.max.x-G.min.x,dt=G.max.y-G.min.y,vt=G.isBox3?G.max.z-G.min.z:1,Et=G.min.x,Bt=G.min.y,Wt=G.isBox3?G.min.z:0;else{let Pe=Math.pow(2,-H);_t=Math.floor(ve.width*Pe),dt=Math.floor(ve.height*Pe),M.isDataArrayTexture?vt=ve.depth:M.isData3DTexture?vt=Math.floor(ve.depth*Pe):vt=1,Et=0,Bt=0,Wt=0}k!==null?(Mt=k.x,ce=k.y,De=k.z):(Mt=0,ce=0,De=0);let me=lt.convert(D.format),on=lt.convert(D.type),mt;D.isData3DTexture?(Y.setTexture3D(D,0),mt=U.TEXTURE_3D):D.isDataArrayTexture||D.isCompressedArrayTexture?(Y.setTexture2DArray(D,0),mt=U.TEXTURE_2D_ARRAY):(Y.setTexture2D(D,0),mt=U.TEXTURE_2D),_.activeTexture(U.TEXTURE0),_.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,D.flipY),_.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),_.pixelStorei(U.UNPACK_ALIGNMENT,D.unpackAlignment);let pn=_.getParameter(U.UNPACK_ROW_LENGTH),$t=_.getParameter(U.UNPACK_IMAGE_HEIGHT),Nn=_.getParameter(U.UNPACK_SKIP_PIXELS),hi=_.getParameter(U.UNPACK_SKIP_ROWS),Fi=_.getParameter(U.UNPACK_SKIP_IMAGES);_.pixelStorei(U.UNPACK_ROW_LENGTH,ve.width),_.pixelStorei(U.UNPACK_IMAGE_HEIGHT,ve.height),_.pixelStorei(U.UNPACK_SKIP_PIXELS,Et),_.pixelStorei(U.UNPACK_SKIP_ROWS,Bt),_.pixelStorei(U.UNPACK_SKIP_IMAGES,Wt);let Ls=M.isDataArrayTexture||M.isData3DTexture,pe=D.isDataArrayTexture||D.isData3DTexture;if(M.isDepthTexture){let Pe=V.get(M),Oi=V.get(D),xe=V.get(Pe.__renderTarget),Bi=V.get(Oi.__renderTarget);_.bindFramebuffer(U.READ_FRAMEBUFFER,xe.__webglFramebuffer),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,Bi.__webglFramebuffer);for(let Ds=0;Ds<vt;Ds++)Ls&&(U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,V.get(M).__webglTexture,H,Wt+Ds),U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,V.get(D).__webglTexture,ft,De+Ds)),U.blitFramebuffer(Et,Bt,_t,dt,Mt,ce,_t,dt,U.DEPTH_BUFFER_BIT,U.NEAREST);_.bindFramebuffer(U.READ_FRAMEBUFFER,null),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else if(H!==0||M.isRenderTargetTexture||V.has(M)){let Pe=V.get(M),Oi=V.get(D);_.bindFramebuffer(U.READ_FRAMEBUFFER,I),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,z);for(let xe=0;xe<vt;xe++)Ls?U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Pe.__webglTexture,H,Wt+xe):U.framebufferTexture2D(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Pe.__webglTexture,H),pe?U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Oi.__webglTexture,ft,De+xe):U.framebufferTexture2D(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Oi.__webglTexture,ft),H!==0?U.blitFramebuffer(Et,Bt,_t,dt,Mt,ce,_t,dt,U.COLOR_BUFFER_BIT,U.NEAREST):pe?U.copyTexSubImage3D(mt,ft,Mt,ce,De+xe,Et,Bt,_t,dt):U.copyTexSubImage2D(mt,ft,Mt,ce,Et,Bt,_t,dt);_.bindFramebuffer(U.READ_FRAMEBUFFER,null),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else pe?M.isDataTexture||M.isData3DTexture?U.texSubImage3D(mt,ft,Mt,ce,De,_t,dt,vt,me,on,ve.data):D.isCompressedArrayTexture?U.compressedTexSubImage3D(mt,ft,Mt,ce,De,_t,dt,vt,me,ve.data):U.texSubImage3D(mt,ft,Mt,ce,De,_t,dt,vt,me,on,ve):M.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,ft,Mt,ce,_t,dt,me,on,ve.data):M.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,ft,Mt,ce,ve.width,ve.height,me,ve.data):U.texSubImage2D(U.TEXTURE_2D,ft,Mt,ce,_t,dt,me,on,ve);_.pixelStorei(U.UNPACK_ROW_LENGTH,pn),_.pixelStorei(U.UNPACK_IMAGE_HEIGHT,$t),_.pixelStorei(U.UNPACK_SKIP_PIXELS,Nn),_.pixelStorei(U.UNPACK_SKIP_ROWS,hi),_.pixelStorei(U.UNPACK_SKIP_IMAGES,Fi),ft===0&&D.generateMipmaps&&U.generateMipmap(mt),_.unbindTexture()},this.initRenderTarget=function(M){V.get(M).__webglFramebuffer===void 0&&Y.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?Y.setTextureCube(M,0):M.isData3DTexture?Y.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?Y.setTexture2DArray(M,0):Y.setTexture2D(M,0),_.unbindTexture()},this.resetState=function(){W=0,q=0,et=null,_.reset(),pt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Jn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Vt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Vt._getUnpackColorSpace()}};var op={type:"change"},gu={type:"start"},lp={type:"end"},cc=new wi,ap=new gn,pv=Math.cos(70*gr.DEG2RAD),Ge=new A,Tn=2*Math.PI,fe={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},mu=1e-6,hc=class extends uo{constructor(t,e=null){super(t,e),this.state=fe.NONE,this.target=new A,this.cursor=new A,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:On.ROTATE,MIDDLE:On.DOLLY,RIGHT:On.PAN},this.touches={ONE:Ji.ROTATE,TWO:Ji.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new A,this._lastQuaternion=new Ze,this._lastTargetPosition=new A,this._quat=new Ze().setFromUnitVectors(t.up,new A(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new mi,this._sphericalDelta=new mi,this._scale=1,this._panOffset=new A,this._rotateStart=new ct,this._rotateEnd=new ct,this._rotateDelta=new ct,this._panStart=new ct,this._panEnd=new ct,this._panDelta=new ct,this._dollyStart=new ct,this._dollyEnd=new ct,this._dollyDelta=new ct,this._dollyDirection=new A,this._mouse=new ct,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=gv.bind(this),this._onPointerDown=mv.bind(this),this._onPointerUp=_v.bind(this),this._onContextMenu=Ev.bind(this),this._onMouseWheel=vv.bind(this),this._onKeyDown=Mv.bind(this),this._onTouchStart=Sv.bind(this),this._onTouchMove=bv.bind(this),this._onMouseDown=xv.bind(this),this._onMouseMove=yv.bind(this),this._interceptControlDown=Tv.bind(this),this._interceptControlUp=wv.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=fe.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let t=this.domElement.getRootNode();t.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),t.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(op),this.update(),this.state=fe.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;Ge.copy(e).sub(this.target),Ge.applyQuaternion(this._quat),this._spherical.setFromVector3(Ge),this.autoRotate&&this.state===fe.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=Tn:n>Math.PI&&(n-=Tn),s<-Math.PI?s+=Tn:s>Math.PI&&(s-=Tn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Ge.setFromSpherical(this._spherical),Ge.applyQuaternion(this._quatInverse),e.copy(this.target).add(Ge),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=Ge.length();o=this._clampDistance(a*this._scale);let l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let a=new A(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new A(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Ge.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(cc.origin.copy(this.object.position),cc.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(cc.direction))<pv?this.object.lookAt(this.target):(ap.setFromNormalAndCoplanarPoint(this.object.up,this.target),cc.intersectPlane(ap,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>mu||8*(1-this._lastQuaternion.dot(this.object.quaternion))>mu||this._lastTargetPosition.distanceToSquared(this.target)>mu?(this.dispatchEvent(op),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Tn/60*this.autoRotateSpeed*t:Tn/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Ge.setFromMatrixColumn(e,0),Ge.multiplyScalar(-t),this._panOffset.add(Ge)}_panUp(t,e){this.screenSpacePanning===!0?Ge.setFromMatrixColumn(e,1):(Ge.setFromMatrixColumn(e,0),Ge.crossVectors(this.object.up,Ge)),Ge.multiplyScalar(t),this._panOffset.add(Ge)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Ge.copy(s).sub(this.target);let r=Ge.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Tn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Tn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Tn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Tn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Tn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Tn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Tn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Tn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new ct,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function mv(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function gv(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function _v(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(lp),this.state=fe.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function xv(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case On.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=fe.DOLLY;break;case On.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=fe.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=fe.ROTATE}break;case On.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=fe.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=fe.PAN}break;default:this.state=fe.NONE}this.state!==fe.NONE&&this.dispatchEvent(gu)}function yv(i){switch(this.state){case fe.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case fe.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case fe.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function vv(i){this.enabled===!1||this.enableZoom===!1||this.state!==fe.NONE||(i.preventDefault(),this.dispatchEvent(gu),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(lp))}function Mv(i){this.enabled!==!1&&this._handleKeyDown(i)}function Sv(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Ji.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=fe.TOUCH_ROTATE;break;case Ji.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=fe.TOUCH_PAN;break;default:this.state=fe.NONE}break;case 2:switch(this.touches.TWO){case Ji.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=fe.TOUCH_DOLLY_PAN;break;case Ji.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=fe.TOUCH_DOLLY_ROTATE;break;default:this.state=fe.NONE}break;default:this.state=fe.NONE}this.state!==fe.NONE&&this.dispatchEvent(gu)}function bv(i){switch(this._trackPointer(i),this.state){case fe.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case fe.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case fe.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case fe.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=fe.NONE}}function Ev(i){this.enabled!==!1&&i.preventDefault()}function Tv(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function wv(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var si=class extends Fe{constructor(t=document.createElement("div")){super(),this.isCSS2DObject=!0,this.element=t,this.element.style.position="absolute",this.element.style.userSelect="none",this.element.setAttribute("draggable",!1),this.center=new ct(.5,.5),this.rotation2D=0,this.addEventListener("removed",function(){this.traverse(function(e){e.element&&e.element instanceof e.element.ownerDocument.defaultView.Element&&e.element.parentNode!==null&&e.element.remove()})})}copy(t,e){return super.copy(t,e),this.element=t.element.cloneNode(!0),this.center=t.center,this.rotation2D=t.rotation2D,this}},Sr=new A,cp=new Jt,hp=new Jt,up=new A,dp=new A,uc=class{constructor(t={}){let e=this,n,s,r,o,a={objects:new WeakMap},l=t.element!==void 0?t.element:document.createElement("div");l.style.overflow="hidden",this.domElement=l,this.sortObjects=!0,this.getSize=function(){return{width:n,height:s}},this.render=function(m,v){m.matrixWorldAutoUpdate===!0&&m.updateMatrixWorld(),v.parent===null&&v.matrixWorldAutoUpdate===!0&&v.updateMatrixWorld(),cp.copy(v.matrixWorldInverse),hp.multiplyMatrices(v.projectionMatrix,cp),h(m,m,v),this.sortObjects&&p(m)},this.setSize=function(m,v){n=m,s=v,r=n/2,o=s/2,l.style.width=m+"px",l.style.height=v+"px"};function c(m){m.isCSS2DObject&&(m.element.style.display="none");for(let v=0,g=m.children.length;v<g;v++)c(m.children[v])}function h(m,v,g){if(m.visible===!1){c(m);return}if(m.isCSS2DObject){Sr.setFromMatrixPosition(m.matrixWorld),Sr.applyMatrix4(hp);let f=Sr.z>=-1&&Sr.z<=1&&m.layers.test(g.layers)===!0,S=m.element;if(S.style.display=f===!0?"":"none",f===!0){m.onBeforeRender(e,v,g);let y=100*m.center.x,E=100*m.center.y;S.style.transformOrigin=`${y}% ${E}%`;let b=-m.rotation2D,C=Sr.x*r+r,x=-Sr.y*o+o;S.style.transform=`translate(${-y}%, ${-E}%) translate(${C}px, ${x}px) rotate(${b}rad)`,S.parentNode!==l&&l.appendChild(S),m.onAfterRender(e,v,g)}let R={distanceToCameraSquared:d(g,m)};a.objects.set(m,R)}for(let f=0,S=m.children.length;f<S;f++)h(m.children[f],v,g)}function d(m,v){return up.setFromMatrixPosition(m.matrixWorld),dp.setFromMatrixPosition(v.matrixWorld),up.distanceToSquared(dp)}function u(m){let v=[];return m.traverseVisible(function(g){g.isCSS2DObject&&v.push(g)}),v}function p(m){let v=u(m).sort(function(f,S){if(f.renderOrder!==S.renderOrder)return S.renderOrder-f.renderOrder;let R=a.objects.get(f).distanceToCameraSquared,y=a.objects.get(S).distanceToCameraSquared;return R-y}),g=v.length;for(let f=0,S=v.length;f<S;f++)v[f].element.style.zIndex=g-f}}};var br={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var In=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},Av=new $i(-1,1,1,-1,0,1),_u=class extends se{constructor(){super(),this.setAttribute("position",new Qt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Qt([0,2,0,0,2,0],2))}},Rv=new _u,ss=class{constructor(t){this._mesh=new te(Rv,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,Av)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var dc=class extends In{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof de?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=Pi.clone(t.uniforms),this.material=new de({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new ss(this.material)}render(t,e,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Io=class extends In{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,n){let s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}},fc=class extends In{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var pc=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let n=t.getSize(new ct);this._width=n.width,this._height=n.height,e=new Ue(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:nn}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new dc(br),this.copyPass.material.blending=Bn,this.timer=new co}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),n=!1;for(let s=0,r=this.passes.length;s<r;s++){let o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,n),o.needsSwap){if(n){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Io!==void 0&&(o instanceof Io?n=!0:o instanceof fc&&(n=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new ct);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Lo={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var mc=class extends In{constructor(){super(),this.isOutputPass=!0,this.uniforms=Pi.clone(Lo.uniforms),this.material=new lr({name:Lo.name,uniforms:this.uniforms,vertexShader:Lo.vertexShader,fragmentShader:Lo.fragmentShader}),this._fsQuad=new ss(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},Vt.getTransfer(this._outputColorSpace)===ie&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===po?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===mo?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===go?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===_o?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===yo?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Ms?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===xo&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var gc=class extends In{constructor(t,e,n=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new yt}render(t,e,n){let s=t.autoClear;t.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=s}};var fp={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new yt(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var Er=class i extends In{constructor(t,e=1,n,s){super(),this.strength=e,this.radius=n,this.threshold=s,this.resolution=t!==void 0?new ct(t.x,t.y):new ct(256,256),this.clearColor=new yt(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Ue(r,o,{type:nn,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let d=new Ue(r,o,{type:nn,depthBuffer:!1});d.texture.name="UnrealBloomPass.h"+h,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);let u=new Ue(r,o,{type:nn,depthBuffer:!1});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),o=Math.round(o/2)}let a=fp;this.highPassUniforms=Pi.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new de({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new ct(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new A(1,1,1),new A(1,1,1),new A(1,1,1),new A(1,1,1),new A(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Pi.clone(br.uniforms),this.blendMaterial=new de({uniforms:this.copyUniforms,vertexShader:br.vertexShader,fragmentShader:br.fragmentShader,premultipliedAlpha:!0,blending:$e,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new yt,this._oldClearAlpha=1,this._basic=new en,this._fsQuad=new ss(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new ct(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(t,e,n,s,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let e=[],n=t/3;for(let o=0;o<t;o++)e.push(.39894*Math.exp(-.5*o*o/(n*n))/n);let s=[],r=[];for(let o=1;o<t;o+=2){let a=e[o],l=o+1<t?e[o+1]:0,c=a+l;s.push((o*a+(o+1)*l)/c),r.push(c)}return new de({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new ct(.5,.5)},direction:{value:new ct(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(t){return new de({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Er.BlurDirectionX=new ct(1,0);Er.BlurDirectionY=new ct(0,1);var Ft=Math.PI*2,hn=(i,t,e)=>Math.max(t,Math.min(e,i)),Do=(i,t,e)=>i+(t-i)*e,No=i=>i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2,rs=i=>1-Math.pow(1-i,3),vn=(i,t)=>1-Math.exp(-i*t);function xu(i){return()=>{i=i+1831565813|0;let t=Math.imul(i^i>>>15,1|i);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function ri(i,t,e){let n=document.createElement(i);return t&&(n.className=t),e!=null&&(n.innerHTML=e),n}function kn(i,t){t=String(t??""),i&&i.textContent!==t&&(i.textContent=t)}var yu={transparent:!0,depthWrite:!1,blending:$e,premultipliedAlpha:!0},wr=class{constructor(t,e){this.cap=t,this.n=0,this.pos=new Float32Array(t*3),this.col=new Float32Array(t*3),this.size=new Float32Array(t);let n=new se;n.setAttribute("position",new jt(this.pos,3).setUsage(is)),n.setAttribute("rgb",new jt(this.col,3).setUsage(is)),n.setAttribute("size",new jt(this.size,1).setUsage(is)),n.setDrawRange(0,0),this.material=new de({...yu,uniforms:{map:{value:e},focal:{value:600}},vertexShader:`
        attribute vec3 rgb;
        attribute float size;
        uniform float focal;
        varying vec3 vC;
        void main() {
          vC = rgb;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * focal / max(1.0, -mv.z), 0.0, 220.0);
          gl_Position = projectionMatrix * mv;
        }`,fragmentShader:`
        uniform sampler2D map;
        varying vec3 vC;
        void main() {
          float a = texture2D(map, gl_PointCoord).a;
          gl_FragColor = vec4(vC * a, a);
        }`}),this.points=new gs(n,this.material),this.points.frustumCulled=!1}begin(){this.n=0}add(t,e,n,s){if(this.n>=this.cap||n<=.002||s<=0)return;let r=this.n++;this.pos[r*3]=t.x,this.pos[r*3+1]=t.y,this.pos[r*3+2]=t.z,this.col[r*3]=e.r*n,this.col[r*3+1]=e.g*n,this.col[r*3+2]=e.b*n,this.size[r]=s}end(){let t=this.points.geometry;t.setDrawRange(0,this.n);for(let e of["position","rgb","size"]){let n=t.attributes[e];n.clearUpdateRanges(),n.addUpdateRange(0,this.n*n.itemSize),n.needsUpdate=!0}}},xc=class{constructor(t){this.cap=t,this.n=0,this.pos=new Float32Array(t*3),this.col=new Float32Array(t*4),this.dist=new Float32Array(t);let e=new se;e.setAttribute("position",new jt(this.pos,3).setUsage(is)),e.setAttribute("rgba",new jt(this.col,4).setUsage(is)),e.setAttribute("dist",new jt(this.dist,1).setUsage(is)),e.setDrawRange(0,0),this.material=new de({...yu,uniforms:{time:{value:0}},vertexShader:`
        attribute vec4 rgba;
        attribute float dist;
        varying vec4 vC;
        varying float vD;
        void main() {
          vC = rgba;
          vD = dist;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,fragmentShader:`
        uniform float time;
        varying vec4 vC;
        varying float vD;
        void main() {
          if (vD >= 0.0 && fract((vD - time * 34.0) / 15.0) > 0.5) discard;
          gl_FragColor = vec4(vC.rgb * vC.a, vC.a);
        }`}),this.lines=new Ai(e,this.material),this.lines.frustumCulled=!1}begin(){this.n=0}vert(t,e,n,s){let r=this.n++;this.pos[r*3]=t.x,this.pos[r*3+1]=t.y,this.pos[r*3+2]=t.z,this.col[r*4]=e.r,this.col[r*4+1]=e.g,this.col[r*4+2]=e.b,this.col[r*4+3]=n,this.dist[r]=s}path(t,e,n,s){if(this.n+(t.length-1)*2>this.cap)return;let r=0,o=typeof n=="function"?n:()=>n;for(let a=0;a<t.length-1;a++){let l=t[a],c=t[a+1],h=l.distanceTo(c);this.vert(l,e,o(a/(t.length-1)),s?r:-1),this.vert(c,e,o((a+1)/(t.length-1)),s?r+h:-1),r+=h}}circle(t,e,n,s,r,o,a=48){if(!(this.n+a*2>this.cap||o<=.002))for(let l=0;l<a;l++){let c=l/a*Ft,h=(l+1)/a*Ft;_c.copy(t).addScaledVector(n,Math.cos(c)*e).addScaledVector(s,Math.sin(c)*e),this.vert(_c,r,o,-1),_c.copy(t).addScaledVector(n,Math.cos(h)*e).addScaledVector(s,Math.sin(h)*e),this.vert(_c,r,o,-1)}}end(){let t=this.lines.geometry;t.setDrawRange(0,this.n);for(let e of["position","rgba","dist"]){let n=t.attributes[e];n.clearUpdateRanges(),n.addUpdateRange(0,this.n*n.itemSize),n.needsUpdate=!0}}},_c=new A,Tr=96,yc=(()=>{let i=1/Math.cos(Math.PI/Tr),t=new Float32Array((Tr+1)*6),e=new Float32Array((Tr+1)*2),n=[];for(let r=0;r<=Tr;r++){let o=r/Tr*Ft,a=Math.cos(o),l=Math.sin(o);t.set([a,l,0,a*i,l*i,0],r*6),e[r*2+1]=1,r<Tr&&n.push(r*2,r*2+1,r*2+2,r*2+1,r*2+3,r*2+2)}let s=new se;return s.setAttribute("position",new jt(t,3)),s.setAttribute("edge",new jt(e,1)),s.setIndex(n),s})();function vc(i={}){return new de({...yu,side:Ke,uniforms:{color:{value:new yt(i.color??16777215)},opacity:{value:i.opacity??1},scale:{value:1},rIn:{value:.9},rOut:{value:1},glow:{value:i.glow??0},head:{value:-100},tail:{value:1.4},tailFloor:{value:i.floor??.14},dashes:{value:i.dashes??0},dashSpeed:{value:i.dashSpeed??0},time:{value:0}},vertexShader:`
      uniform float scale, rIn, rOut;
      attribute float edge;
      varying vec2 vP;
      void main() {
        // vP in world units on the ring's plane; the mesh is scaled by scale, the band's outer radius.
        float inner = max(rIn - (scale - rOut), 0.0);
        vP = position.xy * mix(inner, scale, edge);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(vP / scale, 0.0, 1.0);
      }`,fragmentShader:`
      uniform vec3 color;
      uniform float opacity, rIn, rOut, glow, head, tail, tailFloor, dashes, dashSpeed, time;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float aa = fwidth(r) * 1.25;
        float m = smoothstep(rIn - aa, rIn + aa, r) * (1.0 - smoothstep(rOut - aa, rOut + aa, r));
        if (glow > 0.0) {
          float mid = 0.5 * (rIn + rOut), hw = 0.5 * (rOut - rIn);
          m = max(m, exp(-max(abs(r - mid) - hw, 0.0) / glow) * 0.32);
        }
        float ang = atan(vP.y, vP.x);
        float k = 1.0;
        if (head > -50.0) {
          float d = mod(head - ang, 6.2831853);
          k = mix(tailFloor, 1.0, exp(-d / tail));
        }
        if (dashes > 0.0) k *= step(fract(ang / 6.2831853 * dashes - time * dashSpeed), 0.5);
        float a = m * k * opacity;
        if (a < 0.002) discard;
        gl_FragColor = vec4(color * a, a);
      }`})}function Mc(i,t,e,n=6){let s=t+e+n;i.scale.setScalar(s);let r=i.material.uniforms;r.scale.value=s,r.rIn.value=t-e/2,r.rOut.value=t+e/2}var oi={size:256,hex:82};function Uo(i,t,e,n){i.beginPath();for(let s=0;s<6;s++){let r=-Math.PI/2+s*Math.PI/3,o=t+Math.cos(r)*n,a=e+Math.sin(r)*n;s?i.lineTo(o,a):i.moveTo(o,a)}i.closePath()}function vu(i){let t=new Ri(i);return t.colorSpace=ze,t.anisotropy=4,t}var Sc=class{constructor(){this.canvas=document.createElement("canvas"),this.canvas.width=this.canvas.height=oi.size,this.x=this.canvas.getContext("2d"),this.texture=vu(this.canvas),this.key=""}draw(t,e,n){let s=t.STATUS[e.status]||t.STATUS.busy,r=e.ctxMax?Math.min(1,e.ctx/e.ctxMax):0,o=t.clipT(e.name,11),a=e.status==="waiting"?"! "+s.label:s.label,l=[o,a,s.color,r.toFixed(3),n].join("|");if(l===this.key)return;this.key=l;let c=this.x,h=oi.size/2,d=oi.hex;c.clearRect(0,0,oi.size,oi.size),c.lineWidth=8,c.strokeStyle="rgba(255,255,255,0.08)",c.beginPath(),c.arc(h,h,d+25,0,Ft),c.stroke(),r>0&&(c.strokeStyle=t.ctxColor(r),c.beginPath(),c.arc(h,h,d+25,-Math.PI/2,-Math.PI/2+r*Ft),c.stroke()),Uo(c,h,h,d),c.fillStyle="rgba(18,10,4,0.96)",c.fill(),c.lineWidth=7,c.strokeStyle=s.color,c.stroke(),Uo(c,h,h,d*.74),c.lineWidth=3.5,c.strokeStyle=t.hexA(n,.6),c.stroke(),c.textAlign="center",c.textBaseline="middle";let u=31;for(c.font=`700 ${u}px ${t.FONT}`;u>16&&c.measureText(o).width>d*1.62;)c.font=`700 ${--u}px ${t.FONT}`;c.fillStyle="#fff8f0",c.fillText(o,h,h-d*.13);let p=21;for(c.font=`${p}px ${t.FONT}`;p>12&&c.measureText(a).width>d*1.62;)c.font=`${--p}px ${t.FONT}`;c.fillStyle=s.color,c.fillText(a,h,h+d*.31),this.texture.needsUpdate=!0}dispose(){this.texture.dispose()}};function pp(){let i=document.createElement("canvas");i.width=i.height=oi.size;let t=i.getContext("2d"),e=oi.size/2;t.strokeStyle="#fff",t.shadowColor="#fff",t.lineWidth=10;for(let n of[34,18,8])t.shadowBlur=n,Uo(t,e,e,oi.hex),t.stroke();return vu(i)}function mp(){let i=t=>{let e=document.createElement("canvas");e.width=e.height=128;let n=e.getContext("2d"),s=64,r=40;return Uo(n,s,s,r),n.fillStyle=t?"rgba(12,7,26,0.95)":"rgba(12,8,6,0.9)",n.fill(),n.lineWidth=6,n.strokeStyle=t?"#9d6bff":"#5c4d40",n.stroke(),t?(Uo(n,s,s,r*.55),n.fillStyle="rgba(157,107,255,0.55)",n.fill()):(n.fillStyle="#3dffa8",n.font='700 40px "SF Mono", Menlo, monospace',n.textAlign="center",n.textBaseline="middle",n.fillText("\u2713",s,s+2)),vu(e)};return{running:i(!0),done:i(!1)}}var Ar=512,ye=Ar/2,Oe=118,un=Oe/55;function bc(i=Ar){let t=document.createElement("canvas");return t.width=t.height=i,t}function Ec(i){let t=new Ri(i);return t.colorSpace=ze,t.anisotropy=4,t}function gp(i,t,e){let n=Ar/Oe*e,s=new ke,r=(b,C={})=>{let x=new Fn(new Rn({map:b,transparent:!0,depthWrite:!1,...C}));return x.scale.setScalar(n),s.add(x),x},o=new Fn(new Rn({map:t,color:new yt(16285704).multiplyScalar(1.3),transparent:!0,depthWrite:!1,blending:$e,opacity:.45}));o.scale.setScalar(e*3.4),s.add(o);let a=bc(256),l=a.getContext("2d");l.fillStyle="#0d0805",l.beginPath(),l.arc(128,128,(Oe+12*un)/Ar*256,0,Ft),l.fill();let c=r(Ec(a),{transparent:!1,depthWrite:!0,alphaTest:.5}),h=bc(),d=h.getContext("2d");d.lineWidth=2.4;for(let b=0;b<90;b++){let C=b/90*Ft,x=b%5===0;d.strokeStyle=x?"rgba(255,176,87,0.6)":"rgba(255,176,87,0.25)",d.beginPath(),d.moveTo(ye+Math.cos(C)*(Oe+13*un),ye+Math.sin(C)*(Oe+13*un)),d.lineTo(ye+Math.cos(C)*(Oe+(x?21:16)*un),ye+Math.sin(C)*(Oe+(x?21:16)*un)),d.stroke()}let u=r(Ec(h),{blending:$e}),p=bc(),m=p.getContext("2d");m.strokeStyle="rgba(157,107,255,0.7)",m.lineWidth=2.8;for(let b=0;b<3;b++)m.beginPath(),m.arc(ye,ye,Oe+27*un,b*Ft/3,b*Ft/3+.9),m.stroke();let v=r(Ec(p),{blending:$e}),g=bc(),f=g.getContext("2d"),S=Ec(g);r(S);let R=(b,C,x,T,P,L=-Math.PI/2)=>{f.lineWidth=P,f.strokeStyle=T,f.beginPath(),f.arc(ye,ye,b,0,Ft),f.stroke(),C>0&&(f.strokeStyle=x,f.beginPath(),f.arc(ye,ye,b,L,L+Math.min(1,C)*Ft),f.stroke())},y="";function E(b,C,x){let T=[b.tools,x.toFixed(1),b.okRate.toFixed(3),b.cacheHit.toFixed(2),i.CATS.map(B=>C[B]||0)].join("|");if(T===y)return;y=T,f.clearRect(0,0,Ar,Ar);let P=f.createRadialGradient(ye,ye,0,ye,ye,Oe-16*un);P.addColorStop(0,"rgba(248,128,8,0.2)"),P.addColorStop(1,"rgba(248,128,8,0)"),f.fillStyle=P,f.beginPath(),f.arc(ye,ye,Oe-16*un,0,Ft),f.fill();let L=i.CATS.reduce((B,I)=>B+(C[I]||0),0);if(f.lineWidth=6*un,L){let B=-Math.PI/2;for(let I of i.CATS){let z=C[I]||0;if(!z)continue;let W=B+z/L*Ft;f.strokeStyle=i.CAT[I].color,f.beginPath(),f.arc(ye,ye,Oe+4*un,B+.012,Math.max(B+.013,W-.012)),f.stroke(),B=W}}else R(Oe+4*un,0,"#000","rgba(255,255,255,0.06)",6*un);R(Oe-6*un,b.okRate,"#3dffa8","rgba(255,77,77,0.55)",3*un),R(Oe-13*un,b.cacheHit,"#f88008","rgba(255,255,255,0.08)",3*un);let F=Math.round(Oe*.13);f.textAlign="center",f.textBaseline="alphabetic",f.fillStyle="rgba(245,235,224,0.62)",f.font=`${F}px ${i.FONT}`,f.fillText(`${b.tools} calls today`,ye,ye-Oe*.36),f.fillStyle="#fff8f0",f.font=`700 ${Math.round(Oe*.42)}px ${i.FONT}`,f.fillText(x.toFixed(1),ye,ye+Oe*.1),f.fillStyle="rgba(255,176,87,0.92)",f.font=`${F}px ${i.FONT}`,f.fillText("TOOLS / MIN",ye,ye+Oe*.3),f.fillStyle="rgba(245,235,224,0.62)",f.fillText(`ok ${(b.okRate*100).toFixed(1)}% \xB7 cache ${(b.cacheHit*100).toFixed(0)}%`,ye,ye+Oe*.48),S.needsUpdate=!0}return{group:s,occluder:c,draw:E,update(b,C){u.material.rotation=-b/14e3,v.material.rotation=b/6e3,o.material.opacity=.14+.08*(.5+.5*Math.sin(b/700))+.12*C}}}function xp(i,t=!1){let e=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),s=new Set(Object.keys(i[0].morphAttributes)),r={},o={},a=i[0].morphTargetsRelative,l=new se,c=0;for(let h=0;h<i.length;++h){let d=i[h],u=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let p in d.attributes){if(!n.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+p+'" attribute exists among all geometries, or in none of them.'),null;r[p]===void 0&&(r[p]=[]),r[p].push(d.attributes[p]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let p in d.morphAttributes){if(!s.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[p]===void 0&&(o[p]=[]),o[p].push(d.morphAttributes[p])}if(t){let p;if(e)p=d.index.count;else if(d.attributes.position!==void 0)p=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,p,h),c+=p}}if(e){let h=0,d=[];for(let u=0;u<i.length;++u){let p=i[u].index;for(let m=0;m<p.count;++m)d.push(p.getX(m)+h);h+=i[u].attributes.position.count}l.setIndex(d)}for(let h in r){let d=_p(r[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,d)}for(let h in o){let d=o[h][0].length;if(d!==0){l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let u=0;u<d;++u){let p=[];for(let v=0;v<o[h].length;++v)p.push(o[h][v][u]);let m=_p(p);if(!m)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(m)}}}return l}function _p(i){let t,e,n,s=-1,r=0;for(let c=0;c<i.length;++c){let h=i[c];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(s===-1&&(s=h.gpuType),s!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*e}let o=new t(r),a=new jt(o,e,n),l=0;for(let c=0;c<i.length;++c){let h=i[c];if(h.isInterleavedBufferAttribute){let d=l/e;for(let u=0,p=h.count;u<p;u++)for(let m=0;m<e;m++){let v=h.getComponent(u,m);a.setComponent(u+d,m,v)}}else o.set(h.array,l);l+=h.count*e}return s!==void 0&&(a.gpuType=s),a}function yp(i,t=Math.PI/3){let e=i.index?i.toNonIndexed():i,n=e.attributes.position,s=n.count,r;if(n.isBufferAttribute===!0&&n.itemSize===3&&n.normalized===!1)r=n.array;else{r=new Float64Array(s*3);for(let y=0;y<s;y++)r[3*y+0]=n.getX(y),r[3*y+1]=n.getY(y),r[3*y+2]=n.getZ(y)}let o=Math.cos(t),a=(1+1e-10)*100,l=s/3,c=new Float64Array(l*3);for(let y=0;y<l;y++){let E=9*y,b=r[E+0],C=r[E+1],x=r[E+2],T=r[E+3],P=r[E+4],L=r[E+5],F=r[E+6],B=r[E+7],I=r[E+8],z=F-T,W=B-P,q=I-L,et=b-T,X=C-P,J=x-L,tt=W*J-q*X,Tt=q*et-z*J,St=z*X-W*et,ae=1/(Math.sqrt(tt*tt+Tt*Tt+St*St)||1);c[3*y+0]=tt*ae,c[3*y+1]=Tt*ae,c[3*y+2]=St*ae}let h=new Int32Array(s),d=new Float64Array(s*3),u=1;for(;u<s*2;)u<<=1;let p=u-1,m=new Int32Array(u),v=0;for(let y=0;y<s;y++){let E=3*y,b=Math.trunc(r[E+0]*a),C=Math.trunc(r[E+1]*a),x=Math.trunc(r[E+2]*a),T=(Math.imul(b,73856093)^Math.imul(C,19349663)^Math.imul(x,83492791))&p;for(;;){let P=m[T];if(P===0){let F=3*v;d[F+0]=b,d[F+1]=C,d[F+2]=x,m[T]=v+1,h[y]=v++;break}let L=3*(P-1);if(d[L+0]===b&&d[L+1]===C&&d[L+2]===x){h[y]=P-1;break}T=T+1&p}}let g=new Int32Array(v+1);for(let y=0;y<s;y++)g[h[y]+1]++;for(let y=0;y<v;y++)g[y+1]+=g[y];let f=new Int32Array(s),S=g.slice(0,v);for(let y=0;y<l;y++){let E=3*y;f[S[h[E+0]]++]=y,f[S[h[E+1]]++]=y,f[S[h[E+2]]++]=y}let R=new Float32Array(s*3);for(let y=0;y<l;y++){let E=3*y,b=c[E+0],C=c[E+1],x=c[E+2];for(let T=0;T<3;T++){let P=E+T,L=h[P],F=0,B=0,I=0;for(let W=g[L],q=g[L+1];W<q;W++){let et=3*f[W],X=c[et+0],J=c[et+1],tt=c[et+2];b*X+C*J+x*tt>o&&(F+=X,B+=J,I+=tt)}let z=1/(Math.sqrt(F*F+B*B+I*I)||1);R[3*P+0]=F*z,R[3*P+1]=B*z,R[3*P+2]=I*z}}return e.setAttribute("normal",new jt(R,3,!1)),e}var Tc=null;function Cv(){if(Tc)return Tc;let i=new ti(13,15.5,3,6);return Tc={base:i,baseEdges:new _s(i),core:new no(6.5,0),ring:new ys(11.5,.8,6,48),ring2:new ys(15,.35,4,64),spire:new ti(.45,.8,9,6),tip:new io(.75,8,6)},Tc}function Mp(i){let t=Cv(),e=new ke,n=new Cn({color:3813418,metalness:.72,roughness:.36,flatShading:!0,emissive:i,emissiveIntensity:.05});e.add(new te(t.base,n)),e.add(new Ai(t.baseEdges,new ms({color:i.clone().multiplyScalar(1.4),transparent:!0,opacity:.55})));let s=new Cn({color:788486,emissive:i,emissiveIntensity:.9,metalness:.2,roughness:.3,flatShading:!0}),r=new te(t.core,s);r.position.y=11,e.add(r);let o=new te(t.ring,new en({color:i.clone().multiplyScalar(1.3),transparent:!0,opacity:.85}));o.position.y=11,e.add(o);let a=new te(t.ring2,new en({color:i.clone(),transparent:!0,opacity:.35}));a.position.y=11,a.rotation.x=Math.PI/2,e.add(a);let l=new en({color:i.clone().multiplyScalar(2)});for(let c=0;c<3;c++){let h=c/3*Math.PI*2+Math.PI/6,d=new te(t.spire,n);d.position.set(Math.cos(h)*10.5,5.5,Math.sin(h)*10.5),e.add(d);let u=new te(t.tip,l);u.position.set(Math.cos(h)*10.5,10.4,Math.sin(h)*10.5),e.add(u)}return{group:e,core:r,coreMat:s,ring:o,ring2:a}}function Sp(){let i=new ke,t=new Cn({color:1456762,metalness:.15,roughness:.55,emissive:662080,emissiveIntensity:1}),e=new Cn({color:861008,metalness:.15,roughness:.6}),n=new en({color:16773320}),s=new en({color:16777215}),r=[],o=(h,d,u,p,m,v,g,f)=>{let S=new xn(d,u,p);r.push(S);let R=new te(S,m);return R.position.set(v,g,f),h.add(R),R},a=34,l=16;o(i,l-1.6,a-4,l-1.6,t,0,-2,0);for(let[h,d]of[[-1,-1],[1,-1],[-1,1],[1,1]])o(i,2,a,2,e,h*(l/2-1),0,d*(l/2-1));o(i,l+1,1.6,l+1,e,0,-a/2-.8,0),o(i,l,2.6,l,e,0,a/2-2.3,0),o(i,l+.6,1.2,l+.6,t,0,a/2-.4,0),o(i,l-3,1.4,l-3,t,0,a/2+.9,0);let c=o(i,2,2.6,2,s,0,a/2+3,0);o(i,2.8,.6,2.8,e,0,a/2+4.6,0);for(let h=0;h<4;h++){let d=new ke;d.rotation.y=h*Math.PI/2,i.add(d);let u=l/2-.72;o(d,.5,a-6,.4,e,0,-2.5,u+.1);for(let p of[-1,1]){let m=p*3.4;for(let[v,g]of[[-1.15,0],[1.15,0],[-1.15,-2],[1.15,-2]])o(d,1.9,1.6,.3,n,m+v,a/2-6+g,u);for(let v of[4,-3.5,-11])o(d,4.8,6,.5,e,m,v-2,u)}}return{group:i,blue:t,lamp:c,own:[t,e,n,s,...r]}}var bp=29.5;function Mu(i,t=()=>!0,e=!0){let n=i[0].pts.length,s=[],r=(a,l)=>[a.pts[l%n][0],a.pts[l%n][1],a.z];for(let a=0;a<i.length-1;a++)for(let l=0;l<n;l++){if(!t(a,l))continue;let c=r(i[a],l),h=r(i[a],l+1),d=r(i[a+1],l+1),u=r(i[a+1],l);s.push(...c,...u,...h,...h,...u,...d)}for(let a of e?[i[0],i[i.length-1]]:[]){let l=a.pts.reduce((c,h)=>c+h[1],0)/n;for(let c=0;c<n;c++)s.push(0,l,a.z,...r(a,c),...r(a,c+1))}let o=new se;return o.setAttribute("position",new Qt(s,3)),yp(o,.6)}function Hn(i,t,e,n,s,r,o){let a=[[.45*t,e-.04],[.8*t,n],[.97*t,s],[t,r],[.93*t,o+.55],[.7*t,o]];return{z:i,pts:[[0,e],...a,[0,o],...[...a].reverse().map(([l,c])=>[-l,c])]}}var wc=(i,t,e,n,s)=>({z:i,pts:[[-t,n],[-e,s-.35],[-e*.6,s],[e*.6,s],[e,s-.35],[t,n]]});function Su(i,t,e,n){let s=new te(new ti(e,e,i.distanceTo(t),6),n);return s.position.copy(i).add(t).multiplyScalar(.5),s.quaternion.setFromUnitVectors(new A(0,1,0),t.clone().sub(i).normalize()),s}var Ii=(i,t,e)=>new A(i,t,e),Ac=null;function Pv(){if(Ac)return Ac;let i=Mu([Hn(14.2,2.4,1.65,1.75,1.7,1.45,1.05),Hn(13.6,4.1,2,2.2,2.1,1.7,.9),Hn(12.4,5.3,2.4,2.75,2.6,2,.8),Hn(10.5,6,2.75,3.4,3.2,2.25,.72),Hn(8.4,6.3,2.95,3.95,3.7,2.45,.7),Hn(5.6,6.05,3.3,3.55,3.35,2.35,.65),Hn(1,5.95,3.4,3.5,3.3,2.25,.62),Hn(-4,6.2,3.5,3.65,3.45,2.35,.62),Hn(-8.4,6.6,3.6,4.05,3.8,2.55,.68),Hn(-11.6,6.35,3.55,3.75,3.55,2.5,.85),Hn(-13.6,5.95,3.35,3.4,3.25,2.35,1.1),Hn(-14.2,5.7,3.2,3.25,3.1,2.3,1.2)]),t=[wc(5.8,4.1,3.5,3.3,3.42),wc(1.6,4.35,3.3,3.35,5.85),wc(-2.6,4.45,3.35,3.45,5.95),wc(-9.6,4.7,2.9,3.6,3.68)],e=(u,p)=>p!==5&&(u===0||u===1&&(p===0||p===4)||u===2&&p>=1&&p<=3),n=Mu(t,e,!1),s=Mu(t,(u,p)=>p!==5&&!e(u,p),!1),r=new ti(1.85,1.85,1.3,24);r.rotateZ(Math.PI/2);let o=new ti(1.22,1.22,1.36,18);o.rotateZ(Math.PI/2);let a=[];for(let u=0;u<5;u++){let p=new xn(1.42,.24,2.25);p.rotateX(u/5*Math.PI),a.push(p)}let l=new ti(.32,.32,1.46,10);l.rotateZ(Math.PI/2),a.push(l);let c=xp(a.map(u=>u.index?u.toNonIndexed():u)),h=new ti(.65,.85,1.2,12);h.rotateX(Math.PI/2);let d=new ys(1.9,.26,8,28);return d.rotateX(Math.PI/2),Ac={body:i,bodyEdges:new _s(i,32),glass:n,roof:s,roofEdges:new _s(s,25),tire:r,rim:o,spokes:c,nozzle:h,fan:d,wing:new xn(9.8,.28,2.3),fin:new xn(.28,1.6,2),vent:new xn(.2,.32,1.5),mirror:new xn(.9,.45,.6),intake:new xn(4,.3,.2),taillight:new xn(10.6,.22,.2)},Ac}var vp=null;function Iv(i){return vp||(vp={trim:new Cn({color:723983,metalness:.4,roughness:.5,envMap:i,envMapIntensity:.5}),rubber:new Cn({color:657932,metalness:0,roughness:.9}),rim:new Cn({color:1382429,metalness:.8,roughness:.35,envMap:i,envMapIntensity:.8}),spokes:new Cn({color:12634322,metalness:1,roughness:.2,envMap:i}),head:new en({color:15136511}),tail:new en({color:16720440})})}function Ep(){let i=new ps;i.background=new yt(460810);let t=(e,n,s,r,o,a,l)=>{let c=new te(new xs(e,n),new en({color:new yt(s).multiplyScalar(r),side:Ke}));c.position.set(o,a,l),c.lookAt(0,0,0),i.add(c)};return t(14,6,16777215,2,0,10,0),t(26,.9,16777215,3,0,6,11),t(26,.9,16777215,3,0,6,-11),t(9,6,16752714,2,-13,1,0),t(9,6,8364031,1.3,13,1,0),i}function Tp(i,t){let e=Pv(),n=Iv(t),s=new ke,r=new cr({color:1777446,metalness:.55,roughness:.36,clearcoat:1,clearcoatRoughness:.24,envMap:t,emissive:i,emissiveIntensity:.02,side:Ke}),o=new cr({color:5914128,metalness:1,roughness:.08,envMap:t,envMapIntensity:1.2,emissive:13208104,emissiveIntensity:.1,side:Ke}),a=new ms({color:i.clone().multiplyScalar(1.2),transparent:!0,opacity:.26}),l=new en({color:i.clone().multiplyScalar(1.4),transparent:!0,opacity:.85}),c=(d,u,p,m,v)=>{let g=new te(d,u);return g.position.set(p,m,v),s.add(g),g};s.add(new te(e.body,r),new Ai(e.bodyEdges,a),new te(e.glass,o),new te(e.roof,r),new Ai(e.roofEdges,a));for(let d of[-1,1])s.add(Su(Ii(d*4.1,3.3,5.8),Ii(d*3.3,5.5,1.6),.17,n.trim),Su(Ii(d*4.4,3.4,-.6),Ii(d*3.33,5.55,-.6),.15,n.trim)),c(e.mirror,r,d*4.85,3.85,4.3),s.add(Su(Ii(d*2.6,1.92,13.95),Ii(d*4.95,2.56,12.55),.13,n.head));c(e.intake,n.trim,0,1.35,14.22),c(e.taillight,n.tail,0,2.95,-14.25);for(let[d,u]of[[5.75,8.4],[6.05,-8.4]])for(let p of[-1,1])c(e.tire,n.rubber,p*d,1.85,u),c(e.rim,n.rim,p*d,1.85,u),c(e.spokes,n.spokes,p*d,1.85,u);c(e.wing,n.trim,0,5,-12.7).rotation.x=-.1;for(let d of[-1,1])c(e.fin,n.trim,d*3.3,4.2,-12.5);let h=[];for(let d of[-1,1]){c(e.nozzle,n.trim,d*2.7,2.15,-14.5),h.push({at:Ii(d*2.7,2.15,-15.5),main:!0});for(let[u,p,m]of[[6.02,2.3,4],[6.27,2.37,-4.6]])c(e.vent,n.trim,d*u,p,m),h.push({at:Ii(d*(u+.5),p-.25,m),main:!1})}return c(e.fan,l,0,.5,-1),h.push({at:Ii(0,-.8,-1),main:!1,fan:!0}),{group:s,metal:r,glassMat:o,own:[r,o,a,l],jets:h.map(d=>d.at),jetKinds:h}}var Lv={transparent:!0,depthWrite:!1,blending:$e,premultipliedAlpha:!0};function Dv(i,t,e,n){let s=xu(n),r=new Float32Array(i*3),o=new Float32Array(i*3),a=new Float32Array(i),l=new Float32Array(i);for(let u=0;u<i;u++){let p=s()*Ft,m=s()*2-1,v=Math.sqrt(1-m*m),g=t+s()*(e-t);r.set([Math.cos(p)*v*g,m*g,Math.sin(p)*v*g],u*3);let f=s(),S=f<.14?[1,.72,.45]:f<.28?[.62,.78,1]:[1,.95,.88],R=.3+Math.pow(s(),3)*1.4;o.set([S[0]*R,S[1]*R,S[2]*R],u*3),a[u]=.8+Math.pow(s(),5)*2.2,l[u]=s()*Ft}let c=new se;c.setAttribute("position",new jt(r,3)),c.setAttribute("rgb",new jt(o,3)),c.setAttribute("size",new jt(a,1)),c.setAttribute("phase",new jt(l,1));let h=new de({...Lv,uniforms:{time:{value:0},dpr:{value:1}},vertexShader:`
      attribute vec3 rgb;
      attribute float size;
      attribute float phase;
      uniform float time, dpr;
      varying vec3 vC;
      void main() {
        vC = rgb * (0.72 + 0.28 * sin(time * 1.6 + phase * 9.0));
        gl_PointSize = size * dpr;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,fragmentShader:`
      varying vec3 vC;
      void main() {
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vC * a, a);
      }`}),d=new gs(c,h);return d.frustumCulled=!1,d}function wp(i){let t=new ke,e=Dv(3200,3e3,4600,7);t.add(e);let n=new wr(700,i),s=xu(29),r=new yt,o=new A;for(let a=0;a<700;a++){let l=80+Math.pow(s(),.7)*900,c=s()*Ft;o.set(Math.cos(c)*l,(s()-.5)*(60+l*.6),Math.sin(c)*l),r.setHSL(.08+s()*.05,.5,.7+s()*.25),n.add(o,r,.12+s()*.3,1+s()*1.8)}return n.end(),t.add(n.points),{group:t,update(a,l,c){e.material.uniforms.time.value=a/1e3,e.material.uniforms.dpr.value=c,n.points.rotation.y+=l*.006}}}function Ap(){let i=document.createElement("canvas");i.width=i.height=128;let t=i.getContext("2d"),e=128,n=t.createRadialGradient(e/2,e/2,0,e/2,e/2,e/2);n.addColorStop(0,"rgba(255,255,255,1)"),n.addColorStop(.16,"rgba(255,255,255,0.72)"),n.addColorStop(.42,"rgba(255,255,255,0.16)"),n.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=n,t.fillRect(0,0,e,e);let s=new Ri(i);return s.colorSpace=ze,s}var Ot=window.RADAR,{CAT:os,CATS:Dr,STATUS:qo}=Ot,qt={CORE_R:60,HEX:34,ATOM_R:150,ATOM_STEP:15,TILT:1.2,STATION_R:390,PARK_HEX_PX:27,PARK_CAR_PX:86,POLAR:1.08},Rp=oi.size/oi.hex*qt.HEX,Go=13,Du=new A(0,1,0),Xu=new A(1,0,0),qu=new A(0,0,1),Vc=new yt(1,1,1),Yp=new yt("#9d6bff"),Ce={a:new A,b:new A,c:new A,d:new A,p:new A,m:new Jt},fn=i=>new yt(i),Ae=document.getElementById("space"),Jo=Ap(),Nv=pp(),bu=mp(),Is=new oc({antialias:!1,powerPreference:"high-performance"});Is.toneMapping=Ms;Is.toneMappingExposure=1.05;Ae.appendChild(Is.domElement);var jo=new uc;jo.sortObjects=!1;jo.domElement.className="labels";Ae.appendChild(jo.domElement);var oe=new ps;oe.background=new yt(197121);var ee=new Qe(40,1,2,12e3);oe.add(new lo(9074534,.75));oe.add(new ao(16752714,4.2,0,0));var Zp=new ur(8364031,1.2);Zp.position.set(-400,500,-600);oe.add(Zp);var Kp=new ur(16769728,.55);Kp.position.set(300,600,500);oe.add(Kp);var $p=wp(Jo);oe.add($p.group);var Yu=gp(Ot,Jo,qt.CORE_R);oe.add(Yu.group);var dn=new wr(8e3,Jo),Mn=new xc(4e4);oe.add(Mn.lines,dn.points);var Yt=new hc(ee,Ae);Yt.enableDamping=!0;Yt.dampingFactor=.08;Yt.rotateSpeed=.55;Yt.zoomSpeed=1.1;Yt.panSpeed=.9;Yt.screenSpacePanning=!0;Yt.zoomToCursor=!0;Yt.minDistance=110;Yt.maxDistance=2600;Yt.minPolarAngle=.06;Yt.maxPolarAngle=Math.PI-.06;Yt.mouseButtons={LEFT:On.ROTATE,MIDDLE:On.DOLLY,RIGHT:On.PAN};var Nr=new pc(Is);Nr.addPass(new gc(oe,ee));var Uv=new Er(new ct(512,512),.62,.45,.6);Nr.addPass(Uv);Nr.addPass(new mc);var Cs={front:{fps:60,dpr:2},behind:{fps:20,dpr:1.25},saver:{fps:30,dpr:1.5}},Sn={visible:!0,focused:!0,saver:!1,until:0};function Jp(){let i=Sn.focused?Cs.front.dpr:Cs.behind.dpr;return Math.min(i,Sn.saver?Cs.saver.dpr:i,window.devicePixelRatio||1)}var Cp=0;function jp(){clearTimeout(Cp),Ie.w&&(Jp()<Ie.dpr?Cp=setTimeout(Nu,1500):Nu())}var Ie={w:0,h:0,dpr:1},Lt={right:new A,up:new A,fwd:new A,dist:1,focal:1,fit:800},Uc=!1;function Nu(){let i=Math.max(200,Ae.clientWidth),t=Math.max(160,Ae.clientHeight),e=Jp();i===Ie.w&&t===Ie.h&&e===Ie.dpr||(Ie.w=i,Ie.h=t,Ie.dpr=e,Is.setPixelRatio(e),Is.setSize(i,t,!1),Nr.setPixelRatio(Ie.dpr),Nr.setSize(i,t),jo.setSize(i,t),ee.aspect=i/t,ee.updateProjectionMatrix(),Lt.fit=Fv(),Uc||(Uc=!0,Bv()))}new ResizeObserver(Nu).observe(Ae);function Fv(){let i=gr.degToRad(ee.fov/2),t=Math.atan(Math.tan(i)*ee.aspect),e=(qt.STATION_R+30)/(Math.tan(t)*.74),n=(qt.ATOM_R+3*qt.ATOM_STEP+qt.HEX+30)/(Math.tan(i)*.86);return hn(Math.max(e,n),320,2200)}var Uu=(i,t=qt.POLAR,e=0)=>new A().setFromSphericalCoords(i,t,e),ai={until:0,amp:0,ms:1,off:new A};function Ov(i,t){ai.amp=i,ai.ms=t,ai.until=performance.now()+t}var Je=null;function Zu(i,t,e){Je={t0:performance.now(),ms:e,fromT:Yt.target.clone(),toT:i.clone(),fromP:ee.position.clone(),toP:t.clone()},as()}function Qo(){Zu(new A,Uu(Lt.fit),1100)}function Bv(){ee.position.copy(Uu(Lt.fit*2.4,.5,-.9)),Yt.target.set(0,0,0),Yt.update(),Zu(new A,Uu(Lt.fit),2600)}Yt.addEventListener("start",()=>{Je=null,Ot.hideTip()});Yt.addEventListener("change",()=>Xn());var Fo=new mi,Rc=new mi,Pp=new mi;function zv(i){if(!Je)return;let t=hn((i-Je.t0)/Je.ms,0,1),e=No(t);Yt.target.lerpVectors(Je.fromT,Je.toT,e),Fo.setFromVector3(Ce.a.copy(Je.fromP).sub(Je.fromT)),Rc.setFromVector3(Ce.b.copy(Je.toP).sub(Je.toT));let n=Rc.theta-Fo.theta;n>Math.PI&&(n-=Ft),n<-Math.PI&&(n+=Ft),Pp.set(Do(Fo.radius,Rc.radius,e),Do(Fo.phi,Rc.phi,e),Fo.theta+n*e),ee.position.setFromSpherical(Pp).add(Yt.target),t>=1&&(Je=null)}function kv(){ee.updateMatrixWorld();let i=ee.matrixWorld.elements;Lt.right.set(i[0],i[1],i[2]).normalize(),Lt.up.set(i[4],i[5],i[6]).normalize(),Lt.fwd.set(-i[8],-i[9],-i[10]).normalize(),Lt.dist=ee.position.distanceTo(Yt.target),Lt.focal=Ie.h/2/Math.tan(gr.degToRad(ee.fov/2))}function Hv(){let i=Yt.target,t=700,e=i.length();e<=t||(Ce.a.copy(i).multiplyScalar(t/e).sub(i),i.add(Ce.a),ee.position.add(Ce.a))}var Cc=new A;function Fu(i,t){return Cc.copy(i).project(ee),t.x=(Cc.x*.5+.5)*Ie.w,t.y=(-Cc.y*.5+.5)*Ie.h,t.z=Cc.z,t}function Vv(i){let t=Ce.d.copy(i).sub(ee.position).dot(Lt.fwd);return t>1?Lt.focal/t:0}var Oo=(()=>{let i=new A().setFromSphericalCoords(1,qt.POLAR,0).negate(),t=new A().crossVectors(i,Du).normalize(),e=new A().crossVectors(t,i).normalize();return{fwd:i,right:t,up:e}})();function Gv(i,t){let e=Ce.a.copy(Oo.right).multiplyScalar(Math.cos(i)).addScaledVector(Oo.up,Math.sin(i)),n=Ce.b.copy(Oo.right).multiplyScalar(-Math.sin(i)).addScaledVector(Oo.up,Math.cos(i));n.multiplyScalar(Math.cos(qt.TILT)).addScaledVector(Oo.fwd,Math.sin(qt.TILT)).normalize();let s=Ce.c.crossVectors(e,n).normalize();return Ce.m.makeBasis(e,n,s),t.setFromRotationMatrix(Ce.m)}function Qp(i){let t=hn(1-62/(Ie.w/2),.7,.92),e=[.58,.22,-.14,-.48];if(i<8)return{x:(i%2?1:-1)*t,y:e[i>>1]};let n=i-8,s=[-.3,.3,0,-.6,.6];return{x:s[n%s.length],y:n<s.length?.8:-.62}}var Eu=new A;function tm(i,t){let e=Qp(i),n=hn(Lt.dist*.5,50,900);return Eu.set(e.x,e.y,.5).unproject(ee).sub(ee.position).normalize(),t.copy(ee.position).addScaledVector(Eu,n),n*Eu.dot(Lt.fwd)/Lt.focal}var ws=[],Ip=new A,Tu={x:0,y:0,z:0},wu={x:0,y:0,z:0};function Wv(i){let t=-ee.position.dot(Lt.fwd);return Ip.copy(i).sub(ee.position).dot(Lt.fwd)<=t||t<=1?!1:(Fu(i,Tu),Fu(Ip.set(0,0,0),wu),Math.hypot(Tu.x-wu.x,Tu.y-wu.y)<qt.CORE_R*1.1*Lt.focal/t)}var Se=new Map,Lp=i=>i==="idle"||i==="waiting"?"park":"orbit",Dp=i=>fn(qo[i]?.color||qo.busy.color),Np=new ho,Up=new ct,Pc=new A;function Ou(i){return Up.set(i.x/Ie.w*2-1,-(i.y/Ie.h)*2+1),Np.setFromCamera(Up,ee),Np.ray}var Bu=class{constructor(t,e,n){this.sid=t.id,this.owner=this,this.s=t,this.ci=Ot.colorIndex(t.id),this.hueCss=Ot.sessColor(t.id),this.hue=fn(this.hueCss),this.status=t.status,this.color=Dp(t.status),this.icon=new Sc,this.icon.draw(Ot,t,this.hueCss),this.sprite=new Fn(new Rn({map:this.icon.texture,transparent:!0,depthWrite:!1})),this.sprite.scale.setScalar(Rp),this.sprite.renderOrder=3,this.glowSprite=new Fn(new Rn({map:Nv,color:this.color.clone(),transparent:!0,depthWrite:!1,blending:$e})),this.glowSprite.scale.setScalar(Rp),this.glowSprite.renderOrder=2,this.halo=new te(yc,vc({glow:1.2,dashes:16,dashSpeed:.3})),this.halo.renderOrder=2,this.root=new ke,this.root.add(this.glowSprite,this.halo,this.sprite),this.root.visible=!1,oe.add(this.root),this.orbitRing=new te(yc,vc({glow:2.2,floor:.38})),oe.add(this.orbitRing),this.orbitAlpha=0,this.quat=new Ze,this.pos=new A,this.prev=new A,this.vel=new A,this.homePos=new A,this.dragTarget=new A,this.dragOff=new A,this.dragPlane=new gn,this.theta=(this.ci*2.39996+.6)%Ft,this.r=this.rTarget=qt.ATOM_R,this.phi=this.phiTarget=0,this.fresh=!0,this.scale=.04,this.homeScale=1,this.homeKind=Lp(t.status),this.slot=-1,this.mode="fly",this.fly={from:new A,fromScale:.04,t0:e+n,dur:1500},this.warp=!0,this.kick=0,this.drones=new Map,this.dying=0,this.lastUsageFx=0,this.makeLabels()}makeLabels(){this.label=ri("div","sl"),this.label.dataset.sid=this.sid,this.labelObj=new si(this.label),this.labelObj.center.set(.5,0),this.labelObj.visible=!1,oe.add(this.labelObj),this.fts=ri("div","fts"),this.ftObj=new si(this.fts),this.ftObj.center.set(.5,1),this.ftObj.visible=!1,oe.add(this.ftObj)}setSession(t,e){this.s=t,t.status!==this.status&&(this.status=t.status,this.color.copy(Dp(t.status)));let n=Lp(t.status);n!==this.homeKind&&(this.homeKind=n,this.mode!=="drag"&&!this.dying&&this.startFly(e)),this.syncDrones(t.agents||[],e),this.refreshLabel()}startFly(t){this.mode="fly",this.fly.from.copy(this.pos),this.fly.fromScale=this.scale,this.fly.t0=t,this.fly.dur=1400,this.warp=!1}syncDrones(t,e){let n=new Set;t.forEach((s,r)=>{let o=this.drones.get(s.id);o||(o=new zu(this,s,e),this.drones.set(s.id,o)),o.ag=s,o.idx=r,o.count=t.length,o.dying=0,n.add(s.id)});for(let[s,r]of this.drones)!n.has(s)&&!r.dying&&(r.dying=e)}home(t,e){return this.homeKind==="park"&&this.slot>=0?(this.homeScale=qt.PARK_HEX_PX/qt.HEX*tm(this.slot,t),t.addScaledVector(Lt.up,Math.sin(e/760+this.ci*1.7)*1.2*this.homeScale)):(this.homeScale=1,t.set(Math.cos(this.theta)*this.r,Math.sin(this.theta)*this.r,0).applyQuaternion(this.quat))}beginDrag(t){this.mode="drag",this.warp=!1,this.dragPlane.setFromNormalAndCoplanarPoint(Lt.fwd,this.pos),this.dragOff.set(0,0,0),Ou(t).intersectPlane(this.dragPlane,Pc)&&this.dragOff.copy(this.pos).sub(Pc),this.dragTarget.copy(this.pos),Ae.classList.add("dragging")}dragTo(t){Ou(t).intersectPlane(this.dragPlane,Pc)&&this.dragTarget.copy(Pc).add(this.dragOff)}endDrag(){this.mode="spring",this.vel.clampLength(0,1400),Ae.classList.remove("dragging")}update(t,e){this.r+=(this.rTarget-this.r)*vn(1.6,t),this.phi+=(this.phiTarget-this.phi)*vn(1.4,t),Gv(this.phi,this.quat),this.kick=Math.max(0,this.kick-t*1.6);let n=this.status==="ended",s=.42*Math.sqrt(qt.ATOM_R/this.r)*(n?.3:1)*(1+this.kick*1.2);this.theta=(this.theta+s*t)%Ft;let r=this.home(this.homePos,e);if(this.prev.copy(this.pos),this.dying){let o=hn((e-this.dying)/700,0,1);if(this.scale=this.dieScale*(1-rs(o)),o>=1)return!1}else if(this.mode==="drag")this.pos.lerp(this.dragTarget,vn(18,t));else if(this.mode==="spring"){let a=1.36*Math.sqrt(34);Ce.d.copy(r).sub(this.pos).multiplyScalar(34).addScaledVector(this.vel,-a),this.vel.addScaledVector(Ce.d,t),this.pos.addScaledVector(this.vel,t),this.scale+=(this.homeScale-this.scale)*vn(5,t),this.pos.distanceTo(r)<.4*this.homeScale&&this.vel.length()<4&&(this.mode="locked")}else if(this.mode==="fly"){let o=hn((e-this.fly.t0)/this.fly.dur,0,1),a=No(o);this.pos.lerpVectors(this.fly.from,r,this.warp?rs(o):a),this.scale=Do(this.fly.fromScale,this.homeScale,this.warp?rs(o):a),o>=1&&(this.mode="locked",this.warp=!1)}else this.pos.copy(r),this.scale=this.homeScale;t>0&&this.mode!=="spring"&&this.vel.lerp(Ce.d.copy(this.pos).sub(this.prev).divideScalar(t),vn(12,t)),this.root.visible=!(this.mode==="fly"&&e<this.fly.t0),this.root.position.copy(this.pos),this.root.scale.setScalar(Math.max(.001,this.scale)),this.updateLook(e),this.updateOrbitRing(t);for(let[o,a]of this.drones)a.update(t,e)===!1&&this.drones.delete(o);return!0}updateLook(t){let e=this.status,n=.1;e==="busy"?n=.6+.2*Math.sin(t/280):e==="waiting"?n=.45+.55*(.5+.5*Math.sin(t/160)):e==="idle"&&(n=.45),n+=this.kick*.6+(Te&&Te.kind==="session"&&Te.owner===this?.4:0),this.glowSprite.material.color.copy(this.color).multiplyScalar(1.7*n),this.sprite.material.opacity=e==="ended"?.5:1;let s=this.halo.material.uniforms,r=e==="busy";this.halo.quaternion.copy(ee.quaternion),Mc(this.halo,qt.HEX*(r?1.62:1.8),r?1.1:1.3),s.color.value.copy(this.color).multiplyScalar(1.4),s.time.value=t/1e3,s.dashes.value=r?16:0,s.opacity.value=r?.5:e==="idle"?.2+.3*(.5+.5*Math.sin(t/900)):e==="waiting"?.65:0}updateOrbitRing(t){let e=this.homeKind==="orbit"&&!this.dying?this.status==="ended"?.18:.55:0;if(this.orbitAlpha+=(e-this.orbitAlpha)*vn(3,t),this.orbitRing.visible=this.orbitAlpha>.01,!this.orbitRing.visible)return;this.orbitRing.quaternion.copy(this.quat),Mc(this.orbitRing,this.r,.9,12);let n=this.orbitRing.material.uniforms;n.color.value.copy(this.hue),n.opacity.value=this.orbitAlpha,n.head.value=this.theta,n.tail.value=1.7}placeLabel(){let t=this.root.visible&&!this.dying&&this.homeKind!=="park"&&!Wv(this.pos);if(this.labelObj.visible=this.ftObj.visible=t,!t)return;let e=qt.HEX*this.scale;this.labelObj.position.copy(this.pos).addScaledVector(Lt.up,-e*1.28),this.ftObj.position.copy(this.pos).addScaledVector(Lt.up,e*1.32)}refreshLabel(){let t=this.s;this.icon.draw(Ot,t,this.hueCss),this.label.classList.toggle("ended",t.status==="ended"),kn(this.label,Ot.clipT(t.title||t.lastPrompt||t.cwd||"",32))}die(t){this.dying=t,this.dieScale=this.scale,je(this.pos,this.color,26,90);for(let e of this.drones.values())e.dying=e.dying||t}dispose(){oe.remove(this.root,this.orbitRing,this.labelObj,this.ftObj);for(let t of this.drones.values())t.dispose();this.icon.dispose(),this.sprite.material.dispose(),this.glowSprite.material.dispose(),this.halo.material.dispose(),this.orbitRing.material.dispose()}},zu=class{constructor(t,e,n){this.owner=t,this.ag=e,this.born=n,this.dying=0,this.idx=0,this.count=1,this.running=null,this.pos=t.pos.clone(),this.sprite=new Fn(new Rn({map:bu.running,transparent:!0,depthWrite:!1})),this.sprite.scale.setScalar(128/40*Go),this.sprite.renderOrder=3,this.spin=new te(yc,vc({glow:.8,dashes:1,dashSpeed:.55})),Mc(this.spin,Go*1.38,1.3,4),this.spin.renderOrder=2,this.root=new ke,this.root.add(this.spin,this.sprite),oe.add(this.root),this.labelEl=ri("div","dl"),this.labelObj=new si(this.labelEl),this.labelObj.center.set(.5,0),oe.add(this.labelObj)}update(t,e){let n=this.owner,s=n.scale,r=this.count>7?this.idx%2*14:0,o=this.idx/Math.max(1,this.count)*Ft+e/9e3,a=(qt.HEX+46+r)*s,l=(qt.HEX+24+r*.6)*s;this.pos.copy(n.pos).addScaledVector(Lt.right,Math.cos(o)*a).addScaledVector(Lt.up,Math.sin(o)*l).addScaledVector(Lt.fwd,Math.sin(o)*16*s);let c=rs(hn((e-this.born)/500,0,1));if(this.dying){let m=hn((e-this.dying)/600,0,1);if(c*=1-m,m>=1)return this.dispose(),!1}let h=!!this.ag.running;h!==this.running&&(this.running=h,this.sprite.material.map=h?bu.running:bu.done),this.root.visible=n.root.visible,this.root.position.copy(this.pos),this.root.scale.setScalar(Math.max(.001,s*c)),this.sprite.material.opacity=h?1:.7,this.spin.quaternion.copy(ee.quaternion);let d=this.spin.material.uniforms;d.color.value.copy(Yp).multiplyScalar(1.6),d.opacity.value=h?.85:0,d.time.value=e/1e3;let u=Te&&Te.kind==="drone"&&Te.drone===this,p=this.root.visible&&!this.dying&&u;return this.labelObj.visible=p,p&&(kn(this.labelEl,Ot.clipT(this.ag.desc||this.ag.type||"subagent",18)),this.labelObj.position.copy(this.pos).addScaledVector(Lt.up,-Go*1.2*s)),!0}dispose(){oe.remove(this.root,this.labelObj),this.sprite.material.dispose(),this.spin.material.dispose()}},Au=!1,ku={pos:new A,scale:1};function Xv(i,t){let e=new Set,n=[...i.sessions].sort((r,o)=>Ot.colorIndex(r.id)-Ot.colorIndex(o.id)),s=0;for(let r of n){let o=Se.get(r.id);o||(o=new Bu(r,t,Au?0:s),s+=160,Se.set(r.id,o),Au&&Dn(ku,"#f88008",70,1200,0,!0)),o.setSession(r,t),e.add(r.id)}Au=!0;for(let r of Se.values())!e.has(r.sid)&&!r.dying&&r.die(t);em(),Ku()}function em(){let i=[...Se.values()].filter(e=>!e.dying&&e.homeKind==="orbit").sort((e,n)=>(e.status==="ended")-(n.status==="ended")||e.ci-n.ci),t=i.length;i.forEach((e,n)=>{e.phiTarget=n*Math.PI/Math.max(1,t),e.rTarget=qt.ATOM_R+n*qt.ATOM_STEP,e.fresh&&(e.phi=e.phiTarget,e.r=e.rTarget)});for(let e of Se.values())e.fresh=!1}var qv=[6,7,4,5,2,3,0,1,13,14,15,16,17],Rr=new Map,Ic=i=>i.sid?"s:"+i.sid:"c:"+i.id;function Ku(){for(let r=0;r<ws.length;r++){let o=ws[r];o&&(o.dying||o.homeKind!=="park")&&(ws[r]=null)}let i=new Set([...Se.values(),...We.values()].filter(r=>!r.dying).map(Ic));for(let r of Rr.keys())i.has(r)||Rr.delete(r);let t=new Set(Rr.values());for(let r of[...Se.values(),...We.values()])(r.homeKind!=="park"||r.dying)&&(r.slot=-1);let e=[...Se.values()].filter(r=>!r.dying&&r.homeKind==="park").sort((r,o)=>(r.status==="waiting"?0:1)-(o.status==="waiting"?0:1)||(r.s.statusSince||0)-(o.s.statusSince||0)),n=[...We.values()].filter(r=>!r.dying&&r.homeKind==="park").sort((r,o)=>r.parkedAt-o.parkedAt),s=(r,o)=>{let a=Rr.get(Ic(r));if(a!==void 0&&!ws[a])return a;let l=h=>!ws[h]&&!t.has(h),c=o.find(l);if(c!==void 0)return c;for(let h=0;;h++)if(l(h))return h};for(let[r,o]of[[e,[]],[n,qv]])for(let a of r)a.slot>=0&&ws[a.slot]===a||(a.slot=s(a,o),ws[a.slot]=a,Rr.has(Ic(a))||(Rr.set(Ic(a),a.slot),t.add(a.slot)))}var Ui={};Dr.forEach((i,t)=>{let e=fn(os[i].color),n=Mp(e),s=-Math.PI/2+t/Dr.length*Ft;n.group.position.set(Math.cos(s)*qt.STATION_R,0,Math.sin(s)*qt.STATION_R),n.group.rotation.y=-s,oe.add(n.group);let r=new Fn(new Rn({map:Jo,color:e.clone().multiplyScalar(1.4),transparent:!0,opacity:.3,depthWrite:!1,blending:$e}));r.scale.setScalar(50),r.position.y=11,n.group.add(r);let o=ri("div","stl",'<div class="h"><b></b><span class="n"></span><span class="live"></span></div><div class="l"></div>');o.style.setProperty("--c",os[i].color),o.querySelector("b").textContent=os[i].station;let a=new si(o);a.center.set(.5,0),oe.add(a),Ui[i]={c:i,i:t,col:e,m:n,halo:r,pos:n.group.position.clone().setY(11),hitAt:0,last:"",live:0,el:o,obj:a,scale:1}});function Yv(i,t){for(let e of Dr){let n=Ui[e],s=Math.max(0,1-(t-n.hitAt)/700),r=n.live?.5+.5*Math.sin(t/160):0;n.m.coreMat.emissiveIntensity=.75+s*3.2+r*1.2,n.m.core.rotation.y+=i*(.6+s*4),n.m.core.position.y=11+Math.sin(t/900+n.i)*1.3,n.m.ring.rotation.y+=i*(.5+(n.live?1.6:0)),n.m.ring.rotation.x=1.15+.25*Math.sin(t/2100+n.i),n.m.ring2.rotation.z+=i*.22,n.halo.material.opacity=.2+s*.8+r*.3,n.halo.scale.setScalar(50+s*30),n.obj.position.copy(n.pos).addScaledVector(Lt.up,-26)}}function Zv(i){for(let t of Dr){let e=Ui[t];e.live=i.pendingByCat?.[t]||0,kn(e.el.querySelector(".n"),String(i.byCat?.[t]??0)),kn(e.el.querySelector(".live"),e.live?`\u25CF ${e.live} live`:""),kn(e.el.querySelector(".l"),Ot.clipT(e.last||i.lastByCat?.[t]?.l||"",26))}}var Wn={R:305,Y:18,LIFT:12,SIZE:1.7},Yo=fn("#8fd3ff"),nm=fn("#ffa040"),We=new Map,Kv=1400,Ru=null;function $v(){if(!Ru){let i=new vr(Is);Ru=i.fromScene(Ep(),.02).texture,i.dispose()}return Ru}var Jv=0,Lc=new Map;function jv(i){let t=new Set,e=performance.now(),n=new Set((i||[]).map(s=>s.id));for(let[s,r]of Lc)(r<e||!n.has(s))&&Lc.delete(s);for(let s of i||[]){if(Lc.has(s.id))continue;t.add(s.id);let r=We.get(s.id);(!r||r.dying)&&(r&&sm(r),r=eM(s),We.set(s.id,r)),r.t=s;let o=s.running?"lane":"park";o!==r.homeKind&&(r.homeKind&&(r.fly={t0:e,from:r.pos.clone(),fromQ:r.m.group.quaternion.clone(),fromScale:r.base}),o==="lane"?(r.theta=tM(),r.speed=r.lift=0):r.parkedAt=e,r.homeKind=o),kn(r.el.querySelector("b"),s.running?Ot.clipT(s.cmd||"running",30):s.dir||"terminal"),kn(r.el.querySelector("span"),s.left?`left running \xB7 ${s.dir}`:s.running?`${s.dir}${s.cpu>=1?` \xB7 ${Math.round(s.cpu)}% cpu`:""}`:"idle shell"),r.el.classList.toggle("left",!!s.left),r.el.classList.toggle("idle",!s.running),r.el.classList.toggle("parked",o==="park")}for(let s of We.values())!t.has(s.id)&&!s.dying&&im(s,e);Ku(),Te?.kind==="ship"&&Xc(),as()}function im(i,t){i.dying=t,je(i.pos,Yo,44,260),je(i.pos,fn("#ffb057"),30,170),je(i.pos,Vc,18,110),Dn({pos:i.pos.clone(),scale:i.size/Wn.SIZE},"#8fd3ff",70,650),Xn()}function Qv(i){Lc.set(i,performance.now()+3e4);let t=We.get(i);t&&!t.dying&&im(t,performance.now())}function tM(){let i=[...We.values()].filter(n=>!n.dying&&n.homeKind==="lane").map(n=>(n.theta%Ft+Ft)%Ft).sort((n,s)=>n-s);if(!i.length)return Ft*.12;let t=0,e=0;return i.forEach((n,s)=>{let r=s+1<i.length?i[s+1]:i[0]+Ft;r-n>t&&(t=r-n,e=n+t/2)}),e}function eM(i){let t=i.left?nm:Yo,e=Tp(t,$v());e.group.scale.setScalar(.01),oe.add(e.group);let n=new Rn({map:Jo,color:t.clone().multiplyScalar(1.6),transparent:!0,opacity:0,depthWrite:!1,blending:$e}),s=e.jetKinds.map(l=>{let c=new Fn(n);return c.position.copy(l.at),c.userData.main=l.main,c.userData.fan=!!l.fan,e.group.add(c),c}),r={material:n,flames:s},o=ri("div","shl","<b></b><span></span>"),a=new si(o);return a.center.set(.5,0),oe.add(a),{id:i.id,t:i,m:e,flame:r,el:o,obj:a,homeKind:null,slot:-1,fly:null,parkedAt:0,theta:0,speed:0,lift:0,base:Wn.SIZE,grow:.01,size:.01,pos:new A,dying:0,i:Jv++}}function sm(i){oe.remove(i.m.group,i.obj),i.obj.element.remove();for(let t of i.m.own)t.dispose();i.flame.material.dispose(),We.delete(i.id),Te?.ship===i&&ta(null)}var Fp=new A,nM=new A,Op=new A,As=new A,Fc=new Ze,Bp=new Ze,iM=new Ze,sM=new Jt;function rM(i,t,e){if(i.homeKind==="park"&&i.slot>=0){let o=tm(i.slot,As);As.addScaledVector(Lt.up,Math.sin(e/900+i.i*1.7)*2*o);let a=Qp(i.slot).x>0?-1:1;return Fc.copy(ee.quaternion).multiply(Bp.setFromAxisAngle(Xu,.24)).multiply(iM.setFromAxisAngle(Du,a*(1.05+.08*Math.sin(e/2600+i.i)))),qt.PARK_CAR_PX/bp*o}let n=i.t.running,s=n?.09+Math.min(1,(i.t.cpu||0)/60)*.16:0;i.speed+=(s-i.speed)*vn(1.2,t),i.theta+=i.speed*t,i.lift+=((n?Wn.LIFT:0)-i.lift)*vn(1.5,t);let r=Math.sin(e/900+i.i*1.7)*1.4;return As.set(Math.cos(i.theta)*Wn.R,Wn.Y+i.lift+r,Math.sin(i.theta)*Wn.R),Fp.set(-Math.sin(i.theta),0,Math.cos(i.theta)),Fc.setFromRotationMatrix(sM.lookAt(nM.copy(As).add(Fp),As,Du)).multiply(Bp.setFromAxisAngle(qu,-.35*Math.min(1,i.speed/.12))),Wn.SIZE}function oM(i,t){for(let e of[...We.values()]){let n=e.t.running&&!e.dying;if(!e.dying){let r=rM(e,i,t);if(e.fly){let o=hn((t-e.fly.t0)/Kv,0,1),a=No(o);e.pos.lerpVectors(e.fly.from,As,a),e.m.group.quaternion.slerpQuaternions(e.fly.fromQ,Fc,a),e.base=Do(e.fly.fromScale,r,a),o>=1&&(e.fly=null)}else e.pos.copy(As),e.m.group.quaternion.copy(Fc),e.base=r}e.grow+=((e.dying?0:1)-e.grow)*vn(e.dying?24:3.5,i),e.size=Math.max(.01,e.base*e.grow),e.m.group.position.copy(e.pos),e.m.group.scale.setScalar(e.size);let s=e.fly&&!e.dying?.6:n?.55+.2*Math.sin(t/80+e.i)+Math.min(.3,(e.t.cpu||0)/200):.04;e.flame.material.opacity+=(s-e.flame.material.opacity)*vn(6,i);for(let r of e.flame.flames){let[o,a]=r.userData.main?[4,7]:r.userData.fan?[3,5]:[1,1.4];r.scale.setScalar(o+s*a)}e.m.glassMat.emissiveIntensity=n?.16:.06,e.obj.visible=!e.dying,e.obj.position.copy(e.pos).addScaledVector(Lt.up,-10.6*e.size),e.dying&&e.grow<.02&&sm(e)}}var Zo=i=>!i.dying&&i.homeKind==="lane";function aM(){let i=!1;for(let t of We.values())i||(i=Zo(t));if(i){Mn.circle(Ce.p.set(0,Wn.Y,0),Wn.R,Xu,qu,Yo,.09,128);for(let t of We.values()){if(!Zo(t)||t.fly||!t.t.running)continue;let e=.006+t.speed*.05;for(let n=1;n<=14;n++){let s=t.theta-n*e;Op.set(Math.cos(s)*Wn.R,t.pos.y,Math.sin(s)*Wn.R),dn.add(Op,Yo,.45*(1-n/15)*t.flame.material.opacity,5.5*(1-n/18))}}}}var li=new Map,Pr=fn("#ff3b1f"),Oc=fn("#ffb057"),Hu=qt.STATION_R*1.12,lM=2600,zp=8e3,kp=new A,Dc=new Map;function cM(i){let t=new Set,e=performance.now();for(let[n,s]of Dc)e>s&&Dc.delete(n);for(let n of i||[]){let s=`${n.pid}:${n.started}`;if(t.add(s),Dc.has(s))continue;let r=li.get(s);if(!r){let o=Sp();o.group.scale.setScalar(.01),oe.add(o.group);let a=ri("div","mtl","<b></b><span></span>"),l=new si(a);l.center.set(.5,1.6),oe.add(l);let c=new A().setFromSphericalCoords(Hu*3.2,.9+Math.random()*.6,Math.random()*Ft),h=Array.from({length:24},()=>new A);r={k:s,r:n,model:o,el:a,obj:l,theta:Math.random()*Ft,tilt:.35+Math.random()*.3,spin:Math.random()*Ft,pos:c.clone(),grow:0,dying:0,enter:{t0:e,from:c},trail:h,trailN:0,trailAt:0},li.set(s,r),Sn.visible&&!document.hidden?Ju(r):zc=r}r.r=n,kn(r.el.querySelector("b"),`\u26A0 ${n.name}`),kn(r.el.querySelector("span"),`${Math.round(n.cpu)}% cpu`)}for(let n of li.values())t.has(n.k)||n.dying||(n.dying=e,je(n.pos,Pr,40,220),je(n.pos,Oc,24,140),je(n.pos,fn("#6f9cff"),18,160));Te?.kind==="box"&&Xc(),as()}function hM(i){let t=performance.now();for(let e of li.values())e.dying||e.r.pid!==i||(Dc.set(e.k,t+15e3),e.dying=t,je(e.pos,Pr,90,320),je(e.pos,Oc,60,220),je(e.pos,fn("#6f9cff"),36,260),je(e.pos,Vc,30,140),Dn({pos:e.pos.clone(),scale:1.6},"#ff5a3c",140,700),Dn({pos:e.pos.clone(),scale:1.6},"#ffffff",90,420),Ov(14,520));Xn(1500)}function uM(i,t,e){let n=Math.sin(t)*Hu;return e.set(Math.cos(t)*Hu,n*Math.sin(i.tilt),n*Math.cos(i.tilt))}function dM(i){oe.remove(i.model.group,i.obj),i.el.remove();for(let t of i.model.own)t.dispose();li.delete(i.k),Te?.b===i&&ta(null)}function fM(i,t){for(let e of[...li.values()]){if(e.grow+=((e.dying?0:1)-e.grow)*vn(e.dying?10:2,i),e.dying&&e.grow<.03){dM(e);continue}let n=Math.min(1,e.r.cpu/100);if(e.theta+=(.05+n*.07)*i,uM(e,e.theta,e.pos),e.enter){let o=hn((t-e.enter.t0)/lM,0,1);o>=1?e.enter=null:e.pos.lerpVectors(e.enter.from,e.pos,rs(o))}if(t-e.trailAt>90){e.trailAt=t;let o=e.trail.pop();e.trail.unshift(o.copy(e.pos)),e.trailN=Math.min(e.trail.length,e.trailN+1)}let s=e.model.group;s.position.copy(e.pos),s.rotation.x+=i*(.9+n),s.rotation.y+=i*.45,s.rotation.z+=i*(.55+n*.6),s.scale.setScalar(Math.max(.01,e.grow*1.4));let r=.75+.25*Math.sin(t/55+e.spin)*Math.sin(t/23+e.spin*2);e.model.blue.emissive.setRGB(.05+.2*n*r,.14,.55),e.model.lamp.visible=Math.sin(t/260+e.spin)>-.3,e.obj.visible=!e.dying,e.obj.position.copy(e.pos)}}function pM(i){for(let t of li.values()){let e=Math.min(1.5,t.r.cpu/100)*t.grow,n=.85+.15*Math.sin(i/45+t.spin);dn.add(t.pos,Pr,1.2*e*n,44+14*e);for(let s=0;s<7;s++){let r=i/140+s*.9+t.spin,o=9+4*Math.sin(i/90+s);kp.set(Math.cos(r)*o,Math.sin(r*1.3)*o,Math.sin(r)*o).add(t.pos),dn.add(kp,s%2?Oc:Pr,1.1*e*(.6+.4*Math.sin(i/37+s*2)),11+5*e)}for(let s=0;s<t.trailN;s++){let r=(s+1)/(t.trail.length+1);dn.add(t.trail[s],s<5?Oc:Pr,1.3*(1-r)*e,(16+10*e)*(1-r*.75))}}}var mM=i=>`<div class="h" style="color:#ff5a3c">\u26A0 ${Ot.esc(i.name)} \xB7 ${Math.round(i.cpu)}% cpu</div><div class="r">${Ot.esc(Ot.clipT(i.cmd,70))}</div><div class="d">burning a core with nobody to see it \xB7 click to end it</div>`,Bc={IDLE_MS:3e5,SHOT_MS:9e3,SHOT_JITTER:4e3},Ko=performance.now(),Kt=null,Gc=(()=>{try{return localStorage.getItem("cinematic")!=="off"}catch{return!0}})(),Wc=ri("div","cine-tag","\u25C9 cinematic \xB7 move the mouse to take over");Ae.parentElement.appendChild(Wc);var Cu=new A,Cr=new A,Bo=new A;function $u(i){Ko=performance.now(),Kt&&(Kt.alarm&&i&&i.type==="pointermove"||(Kt=null,Wc.classList.remove("on"),Qo()))}for(let i of["pointerdown","pointermove","wheel","keydown"])addEventListener(i,$u,{passive:!0,capture:!0});function gM(i){let t=performance.now()-i*1e3;t>Ko&&(Ko=t),Kt&&!Kt.alarm&&i<3&&$u()}function rm(i){Gc=i;try{localStorage.setItem("cinematic",i?"on":"off")}catch{}let t=document.querySelector('#viewctl [data-v="cine"]');t&&(t.classList.toggle("off",!i),t.title=i?"Cinematic camera when you are away (5 min): on \xB7 click to turn off":"Cinematic camera: off \xB7 click to turn on"),!i&&Kt&&$u()}var zc=null;function Ju(i){if(zc=null,Re||!Uc||i.dying)return;let t=performance.now();Kt={kind:"box",key:i.k,b:i,style:"chase",t0:t,until:t+zp,ang:Math.random()*Ft,prev:null,alarm:!0},Je=null,Ot.hideTip(),Xn(zp)}function _M(){let i=[{kind:"core",key:"core"}];for(let t of Se.values())!t.dying&&t.root.visible&&t.homeKind==="orbit"&&i.push({kind:"session",key:t.sid,n:t});for(let t of We.values())Zo(t)&&!t.fly&&i.push({kind:"car",key:t.id,s:t});for(let t of li.values())t.dying||i.push({kind:"box",key:t.k,b:t});return i}function Vu(i){let t=_M(),e=t.filter(r=>r.key!==Kt?.key),n=e.filter(r=>r.kind!=="core"),s=n.length&&Math.random()<.8?n[Math.floor(Math.random()*n.length)]:e[Math.floor(Math.random()*e.length)]||t[0];return{...s,style:s.kind==="core"||Math.random()<.4?"orbit":"chase",t0:i,until:i+Bc.SHOT_MS+Math.random()*Bc.SHOT_JITTER,ang:Math.random()*Ft,prev:null}}function Pu(i){return i.kind==="core"?Ce.p.set(0,0,0):i.kind==="session"?Se.get(i.key)===i.n&&!i.n.dying?i.n.pos:null:i.kind==="box"?li.get(i.key)===i.b&&!i.b.dying?i.b.pos:null:We.get(i.key)===i.s&&Zo(i.s)?i.s.pos:null}function om(){return!Gc||Re||!Uc?!1:(Kt=Vu(performance.now()),Je=null,Ot.hideTip(),Wc.classList.add("on"),!0)}function xM(i,t){if(!Kt){t-Ko>Bc.IDLE_MS&&!Sn.saver&&om();return}if(t>Kt.until||Kt.alarm&&!Pu(Kt)){if(Kt.alarm&&(t-Ko<Bc.IDLE_MS||Sn.saver)){Kt=null,Qo();return}Kt=Vu(t)}let e=Pu(Kt);if(!e&&(Kt=Vu(t),e=Pu(Kt),!e))return;let n=Kt.kind==="core"?620:Kt.kind==="car"?260:Kt.kind==="box"?220:360;Kt.style==="chase"?(Kt.prev&&Cr.subVectors(e,Kt.prev),(!Kt.prev||Cr.lengthSq()<1e-6)&&Cr.set(-e.z,0,e.x),Cr.y=0,Cr.normalize(),Bo.set(e.x,0,e.z),Bo.lengthSq()<1&&Bo.set(1,0,0),Bo.normalize(),Cu.copy(e).addScaledVector(Cr,-n*.75).addScaledVector(Bo,n*.5).add(Ce.b.set(0,n*.4,0)),Kt.prev=(Kt.prev||new A).copy(e)):(Kt.ang+=i*.12,Cu.set(e.x+Math.cos(Kt.ang)*n,e.y+n*.42,e.z+Math.sin(Kt.ang)*n)),Yt.target.lerp(e,vn(3,i)),ee.position.lerp(Cu,vn(1.1,i)),Xn(600)}var am=ri("div","corel"),ju=new si(am);ju.center.set(.5,0);oe.add(ju);var Gu=0,Hp=.2,Ir=[],Ps=[],Lr=[],kc=new Map,yM=i=>{let t=Se.get(i.s);if(!t||t.dying)return null;let e=i.a&&t.drones.get(i.a);return e&&!e.dying?e:t},Vo=i=>!i||i.dying||i.owner&&i.owner.dying,vM=i=>i.owner?i.owner.scale:i.scale||1;function je(i,t,e,n=70){let s=performance.now(),r=t.isColor?t.clone():fn(t);for(let o=0;o<e;o++){let a=new A(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(n*(.3+Math.random()));Ps.push({p:i.clone(),v:a,t0:s,life:380+Math.random()*480,col:r})}Ps.length>1500&&Ps.splice(0,Ps.length-1500)}function Dn(i,t,e,n,s=0,r=!0){Lr.push({node:i,col:fn(t),maxR:e,life:n,t0:performance.now()+s,face:r}),Lr.length>160&&Lr.shift()}function zo(i,t,e,n,s){let r=i.fts;for(;r.childElementCount>=3;)r.firstElementChild.remove();let o=ri("div","ft"+(s?" b":""));o.textContent=t,o.style.color=e,o.style.animationDuration=n+"ms",r.appendChild(o),setTimeout(()=>o.remove(),n)}function Vp(i){let t=Ot.clipT(i.l||"",34);switch(i.c){case"web":return(i.n==="WebSearch"?"\u2315 ":"\u2193 ")+t;case"edit":return"\u270E "+t;case"read":return"\u25A4 "+t;case"bash":return"$ "+t;case"agent":return"\u25C6 "+t;case"plan":return i.n+(t?" "+t:"");default:return t||i.n}}function Gp(i,t){let e=ri("div","bl");e.textContent=i,e.style.color=t;let n=new si(e);return n.center.set(0,1),oe.add(n),{e,obj:n}}function lm(i,t){let e=`${i.s}|${i.a||""}|${i.c}`,n=kc.get(e)||{t:0,n:0};n.t=Math.max(n.t,t),n.n++,kc.set(e,n)}function MM(i){let t=performance.now(),e=yM(i);switch(i.k){case"tool":{lm(i,t);let n=Ui[i.c];if(!e||!n)break;let s=Ir.filter(r=>r.label).length<6;Ir.push({a:e,b:n,col:fn(os[i.c].color),t0:t,dur:1100+Math.random()*450,size:4.4,dir:1,text:Vp(i),label:s?Gp(Vp(i),os[i.c].color):null}),e.owner.kick=Math.min(1.5,e.owner.kick+.6),(i.n==="Agent"||i.n==="Task")&&(Dn(e,os.agent.color,70,1400),zo(e.owner,`\u25C6 spawn \xB7 ${Ot.clipT(i.l,40)}`,os.agent.color,3400,!0));break}case"result":{let n=Ui[i.c];if(!e||!n)break;Ir.push({a:n,b:e,col:fn(i.ok?"#3dffa8":"#ff4d4d"),t0:t,dur:780+Math.random()*300,size:3.2,dir:-1,ok:i.ok,label:i.ok?null:Gp("\u2717 failed","#ff4d4d")});break}case"prompt":if(!e)break;Dn(e,"#fff0e0",110,1700),Dn(e,"#f88008",80,1400,200),je(e.pos,"#fff0e0",18),zo(e.owner,`\u203A ${Ot.clipT(i.l,70)}`,"#ffffff",5600,!0);break;case"say":e&&zo(e.owner,`\u201C${Ot.clipT(i.l,60)}\u201D`,"#d9c3a8",3800);break;case"think":e&&Dn(e,"#9d6bff",34,900);break;case"usage":if(!e||t-e.owner.lastUsageFx<700)break;e.owner.lastUsageFx=t,zo(e.owner,`+${Ot.fmtTok(i.out)} out \xB7 ${Ot.fmtUsd(i.c)}`,"#ffb057",2200);break;case"sys":if(!e)break;zo(e.owner,`${i.err?"\u26A0 ":""}${Ot.clipT(i.l,48)}`,i.err?"#ff4d4d":"#ffd23f",4400,!0),i.err&&je(e.pos,"#ff4d4d",16);break}}var Gn=new A,sn=new A;function Qu(i,t,e){let n=i.distanceTo(t);return e.addVectors(i,t).multiplyScalar(.5*.8),e.y+=14+n*.2,e}function Di(i,t,e,n,s){let r=1-n;return s.set(r*r*i.x+2*r*n*t.x+n*n*e.x,r*r*i.y+2*r*n*t.y+n*n*e.y,r*r*i.z+2*r*n*t.z+n*n*e.z)}function SM(i){for(let t=Ir.length-1;t>=0;t--){let e=Ir[t],n=(i-e.t0)/e.dur;if(Vo(e.a)||Vo(e.b)||n>=1){n>=1&&!Vo(e.a)&&!Vo(e.b)&&AM(e,i),e.label&&oe.remove(e.label.obj),Ir.splice(t,1);continue}if(n<0)continue;let s=e.a.pos,r=e.b.pos;Qu(s,r,Gn);let o=No(n);for(let a=12;a>=1;a--){let l=o-a*.016;l>0&&dn.add(Di(s,Gn,r,l,sn),e.col,(1-a/13)*1.2,e.size*(1-a/16))}Di(s,Gn,r,o,sn),dn.add(sn,e.col,1.6,e.size*2.6),dn.add(sn,Vc,2.6,e.size*.85),e.label&&(e.label.obj.position.copy(sn),e.label.e.style.opacity=Math.min(1,Math.sin(n*Math.PI)*1.5).toFixed(2))}}var $o=new Map,Wo=fn("#ff3b1f"),Wu=fn("#ff922b"),Rs=24;function bM(){let i=new Float32Array((Rs+1)*2*3),t=new Float32Array((Rs+1)*2*2),e=[];for(let o=0;o<=Rs;o++){let a=o/Rs;if(t[o*4]=a,t[o*4+1]=0,t[o*4+2]=a,t[o*4+3]=1,o<Rs){let l=o*2,c=l+1,h=l+2,d=l+3;e.push(l,c,h,c,d,h)}}let n=new se;n.setAttribute("position",new jt(i,3)),n.setAttribute("uv",new jt(t,2)),n.setIndex(e);let s=new de({uniforms:{uTime:{value:0},uColorA:{value:Wo},uColorB:{value:Wu}},vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      void main() {
        float edge = sin(vUv.y * 3.14159265);
        float ends = sin(vUv.x * 3.14159265);
        float pulse1 = 0.5 + 0.5 * sin(vUv.x * 18.0 - uTime * 7.0);
        float pulse2 = 0.5 + 0.5 * sin(vUv.x * 18.0 + uTime * 7.0);
        float energy = max(pulse1, pulse2);
        vec3 col = mix(uColorA, uColorB, energy);
        float alpha = edge * ends * (0.28 + 0.55 * energy);
        gl_FragColor = vec4(col, alpha);
      }
    `,transparent:!0,depthWrite:!1,blending:$e,side:Ke}),r=new te(n,s);return r.frustumCulled=!1,oe.add(r),r}function EM(i){let t=$o.get(i);t&&(t.mesh&&(oe.remove(t.mesh),t.mesh.geometry.dispose(),t.mesh.material.dispose()),$o.delete(i))}function Wp(i){let t=Se.get(i);if(t&&!t.dying&&t.root.visible)return t;let e=We.get(i);return e&&!e.dying?e:null}function TM(i){if(!i)return;let t=i.file||(Array.isArray(i.sessions)?[...i.sessions].sort().join("|"):"default");if(!(i.active!==!1&&i.event!=="COLLISION_RESOLVED"&&Array.isArray(i.sessions)&&i.sessions.length>=2)){EM(t),Xn();return}let n=$o.get(t);if(n)n.sessions=i.sessions;else{n={key:t,file:i.file||"",sessions:i.sessions,t0:performance.now(),mesh:bM()},$o.set(t,n);for(let s of i.sessions){let r=Se.get(s);r&&!r.dying&&(je(r.pos,Wo,22,95),Dn(r,"#ff4d4d",48,900))}}Xn(2500)}var Iu=new A,Li=new A;function cm(i,t,e=performance.now(),n=null){let s=typeof i=="string"?Wp(i):i,r=typeof t=="string"?Wp(t):t;if(!s||!r)return!1;let o=s.pos,a=r.pos;Qu(o,a,Gn);let l=.5+.5*Math.sin(e/140),c=l>.5?Wu:Wo;if(n&&n.mesh){n.mesh.material.uniforms.uTime.value=e/1e3;let m=n.mesh.geometry.getAttribute("position"),v=m.array,g=5.5+2.5*l;for(let f=0;f<=Rs;f++){let S=f/Rs;Di(o,Gn,a,S,sn),Di(o,Gn,a,Math.min(1,S+.02),Iu),Iu.sub(sn),Li.crossVectors(Iu,Lt.dir).normalize(),Li.lengthSq()<.001&&Li.copy(Lt.right);let R=g*Math.sin(S*Math.PI),y=f*6;v[y]=sn.x-Li.x*R,v[y+1]=sn.y-Li.y*R,v[y+2]=sn.z-Li.z*R,v[y+3]=sn.x+Li.x*R,v[y+4]=sn.y+Li.y*R,v[y+5]=sn.z+Li.z*R}m.needsUpdate=!0}for(let m=0;m<=16;m++)Di(o,Gn,a,m/16,Vn[m]);Mn.path(Vn,Wo,m=>(.55+.35*l)*Math.sin(m*Math.PI),!0);let h=(s.scale?qt.HEX*1.45*s.scale:24)*(.95+.1*l),d=(r.scale?qt.HEX*1.45*r.scale:24)*(.95+.1*l);Mn.circle(o,h,Lt.right,Lt.up,c,.78,48),Mn.circle(a,d,Lt.right,Lt.up,c,.78,48);let u=e%900/900,p=1-u;for(let m=6;m>=0;m--){let v=Math.max(0,u-m*.022),g=Math.min(1,p+m*.022),f=1-m/7;dn.add(Di(o,Gn,a,v,sn),Wu,f*1.6,5.2*f),dn.add(Di(o,Gn,a,g,sn),Wo,f*1.6,5.2*f)}return Di(o,Gn,a,.5,sn),dn.add(sn,Vc,1.4+l,6.5),!0}function wM(i){for(let[t,e]of $o){let[n,s]=e.sessions||[];!n||!s||!cm(n,s,i,e)?e.mesh&&(e.mesh.visible=!1):e.mesh&&(e.mesh.visible=!0)}}function AM(i,t){i.dir>0?(i.b.hitAt=t,i.text&&(i.b.last=i.text.replace(/^[⌕↓✎▤$◆]\s/,"")),je(i.b.pos,i.col,12,60),kn(i.b.el.querySelector(".l"),Ot.clipT(i.b.last,26))):(Dn(i.b,i.col,i.ok===!1?40:16,650),i.ok===!1&&je(i.b.pos,"#ff4d4d",12))}function RM(i,t){for(let e=Ps.length-1;e>=0;e--){let n=Ps[e],s=(t-n.t0)/n.life;if(s>=1){Ps.splice(e,1);continue}n.p.addScaledVector(n.v,i),n.v.multiplyScalar(Math.pow(.04,i)),dn.add(n.p,n.col,(1-s)*1.8,2.4)}}function CM(i){for(let t=Lr.length-1;t>=0;t--){let e=Lr[t],n=(i-e.t0)/e.life;if(n<0)continue;if(n>=1||e.node!==ku&&Vo(e.node)){Lr.splice(t,1);continue}let r=((e.node===ku?qt.CORE_R:e.node.owner===e.node?qt.HEX:Go)+rs(n)*e.maxR)*vM(e.node),o=.85*(1-n),[a,l]=e.face?[Lt.right,Lt.up]:[Xu,qu];Mn.circle(e.node.pos,r,a,l,e.col,o,56),Mn.circle(e.node.pos,r*.985,a,l,e.col,o*.6,56)}}function PM(i){for(let t of Se.values())if(!(t.dying||!t.root.visible)){if(t.status==="busy"){let e=qt.HEX*1.62*t.scale;for(let n=0;n<3;n++){let s=i/520+n*Ft/3;Ce.p.copy(t.pos).addScaledVector(Lt.right,Math.cos(s)*e).addScaledVector(Lt.up,Math.sin(s)*e),dn.add(Ce.p,t.color,1.5,5*t.scale)}}else if(t.homeKind==="park"){let e=t.status==="waiting"?1300:2200,n=t.status==="waiting"?3:2;for(let s=0;s<n;s++){let r=(i+s*e/n+t.ci*300)%e/e,o=qt.HEX*(1.3+rs(r)*(t.status==="waiting"?1.6:1.1))*t.scale;Mn.circle(t.pos,o,Lt.right,Lt.up,t.color,(1-r)*(t.status==="waiting"?.95:.55),56)}}}}var Vn=Array.from({length:17},()=>new A);function IM(i){for(let[t,e]of kc){let n=i-e.t;if(n>6e5){kc.delete(t);continue}let[s,r,o]=t.split("|"),a=Se.get(s),l=Ui[o];if(!a||a.dying||!l||!a.root.visible)continue;let c=r&&a.drones.get(r)||a,h=n<25e3;Qu(c.pos,l.pos,Gn);for(let u=0;u<=16;u++)Di(c.pos,Gn,l.pos,u/16,Vn[u]);let d=h?.42:.05+.16*(1-n/6e5);Mn.path(Vn,l.col,u=>d*Math.min(1,u*6,(1-u)*6+.25),h)}}function LM(){for(let i of Se.values())if(!(i.dying||!i.root.visible)){for(let t of i.drones.values())t.dying||(Vn[0].copy(i.pos),Vn[1].copy(t.pos),Mn.path([Vn[0],Vn[1]],Yp,t.ag.running?.45:.12,!!t.ag.running));(i.mode==="drag"||i.mode==="spring")&&(Vn[0].copy(i.pos),Vn[1].copy(i.homePos),Mn.path([Vn[0],Vn[1]],i.color,.4,!0),Mn.circle(i.homePos,qt.HEX*.5*i.homeScale,Lt.right,Lt.up,i.color,.45,32))}}var Te=null,Re=null,Ln=null,ko={x:0,y:0,z:0};function td(i,t,e){let n=e&&e.closest&&e.closest(".sl");if(n){let a=Se.get(n.dataset.sid);if(a&&!a.dying)return{kind:"session",owner:a}}let s=null,r=1,o=(a,l,c,h=1)=>{if(Fu(l,ko),ko.z>1||ko.z<-1)return;let d=Math.max(9,c*Vv(l)+3),u=Math.hypot(ko.x-i,ko.y-t)/d*h;u<r&&(r=u,s=a)};for(let a of Se.values())if(!(a.dying||!a.root.visible)){o({kind:"session",owner:a},a.pos,qt.HEX*a.scale);for(let l of a.drones.values())l.dying||o({kind:"drone",owner:a,drone:l},l.pos,Go*1.2*a.scale,.7)}for(let a of Dr)o({kind:"station",cat:a},Ui[a].pos,20,1.2);for(let a of We.values())a.dying||o({kind:"ship",ship:a},a.pos,12*a.size,.9);for(let a of li.values())a.dying||o({kind:"box",b:a},a.pos,22,.8);return s}function ta(i){Te=i,Ae.style.cursor=i?i.kind==="session"?"grab":"pointer":"",Xc()}function Xc(){if(!Te||!Ln||Re)return Ot.hideTip();Te.kind==="session"?Ot.showTip(Ot.sessionTip(Te.owner.s),Ln.x,Ln.y):Te.kind==="drone"?Ot.showTip(Ot.agentTip(Te.drone.ag,Te.owner.s),Ln.x,Ln.y):Te.kind==="ship"?Ot.showTip(Ot.terminalTip(Te.ship.t),Ln.x,Ln.y):Te.kind==="box"?Ot.showTip(mM(Te.b.r),Ln.x,Ln.y):Ot.showTip(Ot.stationTip(Te.cat),Ln.x,Ln.y)}function ed(i){let t=Ae.getBoundingClientRect();return{x:i.clientX-t.left,y:i.clientY-t.top}}Ae.addEventListener("pointerdown",i=>{if(i.button!==0||i.altKey)return;let t=ed(i),e=td(t.x,t.y,i.target);e&&(i.stopPropagation(),i.preventDefault(),Ae.setPointerCapture(i.pointerId),Re={h:e,id:i.pointerId,x:t.x,y:t.y,moved:!1},Je=null,Ot.hideTip(),Xn())},!0);Ae.addEventListener("pointermove",i=>{let t=ed(i);if(Ln=t,Xn(600),Re&&i.pointerId===Re.id){i.stopPropagation(),!Re.moved&&Math.hypot(t.x-Re.x,t.y-Re.y)>4&&(Re.moved=!0,Re.h.kind==="session"&&Re.h.owner.beginDrag(t)),Re.moved&&Re.h.kind==="session"&&Re.h.owner.mode==="drag"&&Re.h.owner.dragTo(t);return}i.buttons||ta(td(t.x,t.y,i.target))},!0);function hm(i,t){if(!Re||i.pointerId!==Re.id)return;i.stopPropagation();let{h:e,moved:n}=Re;Re=null,e.kind==="session"&&e.owner.mode==="drag"&&e.owner.endDrag(),!(n||t)&&(e.kind==="session"||e.kind==="drone"?(Dn(e.drone||e.owner,"#ffffff",36,600),Ot.focusSession(e.owner.sid)):e.kind==="station"?Ui[e.cat].hitAt=performance.now():e.kind==="ship"?(je(e.ship.pos,e.ship.t.left?nm:Yo,12,55),e.ship.t.left?window.Danger?.openLeft?.(e.ship.t):Ot.openTerminal(e.ship.id)):e.kind==="box"&&(je(e.b.pos,Pr,14,60),window.Danger?.open(e.b.r.pid)))}Ae.addEventListener("pointerup",i=>hm(i,!1),!0);Ae.addEventListener("pointercancel",i=>hm(i,!0),!0);Ae.addEventListener("pointerleave",()=>{Ln=null,Re||ta(null)});Ae.addEventListener("dblclick",i=>{let t=ed(i);td(t.x,t.y,i.target)||Qo()});var um=0;Ae.addEventListener("wheel",()=>Xn(),{passive:!0,capture:!0});Ae.addEventListener("gesturestart",i=>{i.preventDefault(),Xn(),um=ee.position.distanceTo(Yt.target),Je=null});Ae.addEventListener("gesturechange",i=>{i.preventDefault();let t=hn(um/i.scale,Yt.minDistance,Yt.maxDistance);ee.position.sub(Yt.target).setLength(t).add(Yt.target)});Ae.addEventListener("gestureend",i=>i.preventDefault());var Ni=document.getElementById("minimap"),DM=Ni.getContext("2d"),Ur={w:0,h:0};new ResizeObserver(([i])=>{Ur.w=i.contentRect.width,Ur.h=i.contentRect.height}).observe(Ni);var dm=()=>(Math.min(Ur.w,Ur.h)*.5-5)/(qt.STATION_R+24),Lu=new A,Ho=new A;function NM(i,t,e){let n=Ou({x:(i+1)/2*Ie.w,y:(1-t)/2*Ie.h}),s=n.direction.y<-.02?-n.origin.y/n.direction.y:3e3;return e.copy(n.origin).addScaledVector(n.direction,Math.min(s,3e3)),e.y=0,e}function UM(){let i=Ur.w,t=Ur.h,e=Ie.dpr;if(!i||!t)return;Ni.width!==Math.round(i*e)&&(Ni.width=Math.round(i*e),Ni.height=Math.round(t*e));let n=DM,s=dm(),r=i/2,o=t/2;n.setTransform(e,0,0,e,0,0),n.clearRect(0,0,i,t),n.lineWidth=1;for(let h of Se.values())if(!(h.dying||h.homeKind!=="orbit")){n.strokeStyle=Ot.hexA(h.hueCss,.35),n.beginPath();for(let d=0;d<=40;d++){let u=d/40*Ft;Ho.set(Math.cos(u)*h.r,Math.sin(u)*h.r,0).applyQuaternion(h.quat),d?n.lineTo(r+Ho.x*s,o+Ho.z*s):n.moveTo(r+Ho.x*s,o+Ho.z*s)}n.stroke()}for(let h of Dr){let d=Ui[h].pos;n.fillStyle=os[h].color,n.fillRect(r+d.x*s-2,o+d.z*s-2,4,4)}let a=[...We.values()].filter(Zo);if(a.length){n.strokeStyle="rgba(143, 211, 255, 0.22)",n.beginPath(),n.arc(r,o,Wn.R*s,0,Ft),n.stroke();for(let h of a){let d=r+h.pos.x*s,u=o+h.pos.z*s,p=-Math.sin(h.theta),m=Math.cos(h.theta);n.fillStyle=h.t.running?"#8fd3ff":"rgba(143, 211, 255, 0.45)",n.beginPath(),n.moveTo(d+p*4,u+m*4),n.lineTo(d-p*3-m*2.6,u-m*3+p*2.6),n.lineTo(d-p*3+m*2.6,u-m*3-p*2.6),n.closePath(),n.fill()}}n.fillStyle="#f88008",n.beginPath(),n.arc(r,o,3.2,0,Ft),n.fill();for(let h of Se.values())h.dying||h.homeKind!=="orbit"||!h.root.visible||(n.fillStyle=qo[h.status]?.color||"#f88008",n.beginPath(),n.arc(r+h.pos.x*s,o+h.pos.z*s,h.mode==="drag"?3.4:2.4,0,Ft),n.fill());n.strokeStyle="rgba(255,176,87,0.85)",n.beginPath(),[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([h,d],u)=>{NM(h,d,Lu);let p=hn(r+Lu.x*s,-4,i+4),m=hn(o+Lu.z*s,-4,t+4);u?n.lineTo(p,m):n.moveTo(p,m)}),n.closePath(),n.stroke();let l=[...Se.values()].filter(h=>!h.dying&&h.homeKind==="park"),c=We.size-a.length-[...We.values()].filter(h=>h.dying).length;l.length+c&&(n.font=`8px ${Ot.FONT}`,n.fillStyle=l.some(h=>h.status==="waiting")?"#ff2e63":"#00e5ff",n.fillText(`${l.length+c} parked`,4,t-4))}function fm(i){Xn();let t=Ni.getBoundingClientRect(),e=dm(),n=(i.clientX-t.left-t.width/2)/e,s=(i.clientY-t.top-t.height/2)/e,r=Math.hypot(n,s),o=r>700?700/r:1;Ce.a.set(n*o,0,s*o).sub(Yt.target),Yt.target.add(Ce.a),ee.position.add(Ce.a),Je=null}Ni.addEventListener("pointerdown",i=>{Ni.setPointerCapture(i.pointerId),fm(i)});Ni.addEventListener("pointermove",i=>{i.buttons&&fm(i)});for(let i of document.querySelectorAll("#viewctl button"))i.addEventListener("click",()=>{if(i.dataset.v==="reset")return Qo();if(i.dataset.v==="cine")return rm(!Gc);let t=ee.position.clone().sub(Yt.target);t.setLength(hn(t.length()*(i.dataset.v==="in"?.7:1.4),Yt.minDistance,Yt.maxDistance)),Zu(Yt.target,Yt.target.clone().add(t),420)});var Xo=null,Xp=0;function FM(i){Xo=i,Xv(i,performance.now()),Zv(i),pm(),Te&&Xc()}function OM(i,t){let e=Se.get(i);if(e)if(t==="waiting")for(let n=0;n<3;n++)Dn(e,qo.waiting.color,90,1400,n*260);else t==="idle"&&Dn(e,qo.idle.color,80,1500)}function BM(i){let t=performance.now(),e=Date.now();for(let n of i)n.k==="tool"&&e-n.t<6e5&&lm(n,t-(e-n.t))}function pm(){let i=Xo?.totals;i&&(Yu.draw(i,Xo.byCat||{},Gu),kn(am,Xo.sessions.length?"":"no Claude Code session in the last 30 min"))}var Hc=0,Nc=performance.now(),qp=0;function Xn(i=1500){Sn.until=performance.now()+i,as()}function as(){Hc||!Sn.visible||document.hidden||(Nc=performance.now(),Hc=requestAnimationFrame(mm))}function zM(i){if(Re||Je)return Cs.front.fps;let t=Sn.focused||i<Sn.until?Cs.front.fps:Cs.behind.fps;return Sn.saver?Math.min(t,Cs.saver.fps):t}document.addEventListener("visibilitychange",as);function mm(i){if(Hc=0,!Sn.visible||document.hidden||(Hc=requestAnimationFrame(mm),i-Nc<1e3/zM(i)-2))return;let t=Math.min(.05,Math.max(0,(i-Nc)/1e3));if(Nc=i,!Ie.w)return;if(ee.position.sub(ai.off),ai.off.set(0,0,0),zv(i),xM(t,i),Yt.update(),Hv(),i<ai.until){let s=(ai.until-i)/ai.ms;ai.off.set(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(2*ai.amp*s),ee.position.add(ai.off)}kv(),Ae.classList.toggle("far",Lt.dist>Lt.fit*1.5),dn.material.uniforms.focal.value=Lt.focal*Ie.dpr,Mn.material.uniforms.time.value=i/1e3;let e=Xo?.totals;e&&(Gu+=(e.toolsPerMin-Gu)*vn(3,t),Hp=hn(e.toolsPerMin/18,0,1)),$p.update(i,t,Ie.dpr),Yu.update(i,Hp);for(let[s,r]of Se)r.update(t,i)===!1&&(r.dispose(),Se.delete(s),Te?.owner===r&&ta(null),em(),Ku());Yv(t,i),oM(t,i),fM(t,i),ju.position.set(0,0,0).addScaledVector(Lt.up,-qt.CORE_R*1.7),dn.begin(),Mn.begin(),IM(i),LM(),SM(i),wM(i),CM(i),PM(i),RM(t,i),aM(),pM(i),dn.end(),Mn.end();let n=i-Xp>250;n&&(Xp=i);for(let s of Se.values())s.placeLabel(),n&&!s.dying&&s.refreshLabel();n&&pm(),Nr.render(),jo.render(oe,ee),i-qp>120&&(qp=i,UM())}as();function kM(i,t){Sn.visible=i,Sn.focused=t,i&&zc&&Ju(zc),jp(),as()}function HM(i){Sn.saver=!!i,Sn.saver&&Kt&&!Kt.alarm&&(Kt=null,Wc.classList.remove("on"),Qo()),jp(),as()}function VM(i){let t=[...li.values()].find(e=>!e.dying&&e.r.pid===i);t&&Ju(t)}rm(Gc);window.Orbit={state:FM,event:MM,status:OM,collision:TM,drawShieldPulse:cm,seed:BM,activity:kM,power:HM,terminals:jv,terminalGone:Qv,cinematic:om,idle:gM,runaways:cM,focusRunaway:VM,blowUp:hM};for(let[i,t]of Ot.MAPQ.splice(0))window.Orbit[i](...t);})();
