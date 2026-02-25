var de=Object.defineProperty;var C=(t,n)=>de(t,"name",{value:n,configurable:!0});import{aJ as _t,aK as Dt,_ as c,g as fe,s as he,t as me,q as ke,a as ye,b as ge,c as ut,d as pt,aO as ve,aP as pe,aQ as Te,e as xe,S as be,aR as we,aS as U,l as at,aT as _e,aU as Ht,aV as Bt,aW as De,aX as Se,aY as Me,aZ as Ce,a_ as Ee,a$ as Ie,b0 as Ye,b1 as Gt,b2 as jt,b3 as Xt,b4 as Ut,b5 as qt,b6 as $e,k as Ae,j as Fe,z as Le,u as We}from"./theme.DgmE8eFx.js";import"./framework.BnOgjZe9.js";var Jt={exports:{}};(function(t,n){(function(r,i){t.exports=i()})(_t,function(){var r="day";return function(i,a,k){var y=C(function(L){return L.add(4-L.isoWeekday(),r)},"a"),_=a.prototype;_.isoWeekYear=function(){return y(this).year()},_.isoWeek=function(L){if(!this.$utils().u(L))return this.add(7*(L-this.isoWeek()),r);var b,W,z,N,R=y(this),E=(b=this.isoWeekYear(),W=this.$u,z=(W?k.utc:k)().year(b).startOf("year"),N=4-z.isoWeekday(),z.isoWeekday()>4&&(N+=7),z.add(N,r));return R.diff(E,"week")+1},_.isoWeekday=function(L){return this.$utils().u(L)?this.day()||7:this.day(this.day()%7?L:L-7)};var O=_.startOf;_.startOf=function(L,b){var W=this.$utils(),z=!!W.u(b)||b;return W.p(L)==="isoweek"?z?this.date(this.date()-(this.isoWeekday()-1)).startOf("day"):this.date(this.date()-1-(this.isoWeekday()-1)+7).endOf("day"):O.bind(this)(L,b)}}})})(Jt);var Oe=Jt.exports;const Pe=Dt(Oe);var te={exports:{}};(function(t,n){(function(r,i){t.exports=i()})(_t,function(){var r={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},i=/(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g,a=/\d/,k=/\d\d/,y=/\d\d?/,_=/\d*[^-_:/,()\s\d]+/,O={},L=C(function(D){return(D=+D)+(D>68?1900:2e3)},"a"),b=C(function(D){return function(S){this[D]=+S}},"f"),W=[/[+-]\d\d:?(\d\d)?|Z/,function(D){(this.zone||(this.zone={})).offset=function(S){if(!S||S==="Z")return 0;var P=S.match(/([+-]|\d\d)/g),A=60*P[1]+(+P[2]||0);return A===0?0:P[0]==="+"?-A:A}(D)}],z=C(function(D){var S=O[D];return S&&(S.indexOf?S:S.s.concat(S.f))},"u"),N=C(function(D,S){var P,A=O.meridiem;if(A){for(var H=1;H<=24;H+=1)if(D.indexOf(A(H,0,S))>-1){P=H>12;break}}else P=D===(S?"pm":"PM");return P},"d"),R={A:[_,function(D){this.afternoon=N(D,!1)}],a:[_,function(D){this.afternoon=N(D,!0)}],Q:[a,function(D){this.month=3*(D-1)+1}],S:[a,function(D){this.milliseconds=100*+D}],SS:[k,function(D){this.milliseconds=10*+D}],SSS:[/\d{3}/,function(D){this.milliseconds=+D}],s:[y,b("seconds")],ss:[y,b("seconds")],m:[y,b("minutes")],mm:[y,b("minutes")],H:[y,b("hours")],h:[y,b("hours")],HH:[y,b("hours")],hh:[y,b("hours")],D:[y,b("day")],DD:[k,b("day")],Do:[_,function(D){var S=O.ordinal,P=D.match(/\d+/);if(this.day=P[0],S)for(var A=1;A<=31;A+=1)S(A).replace(/\[|\]/g,"")===D&&(this.day=A)}],w:[y,b("week")],ww:[k,b("week")],M:[y,b("month")],MM:[k,b("month")],MMM:[_,function(D){var S=z("months"),P=(z("monthsShort")||S.map(function(A){return A.slice(0,3)})).indexOf(D)+1;if(P<1)throw new Error;this.month=P%12||P}],MMMM:[_,function(D){var S=z("months").indexOf(D)+1;if(S<1)throw new Error;this.month=S%12||S}],Y:[/[+-]?\d+/,b("year")],YY:[k,function(D){this.year=L(D)}],YYYY:[/\d{4}/,b("year")],Z:W,ZZ:W};function E(D){var S,P;S=D,P=O&&O.formats;for(var A=(D=S.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g,function(p,v,g){var f=g&&g.toUpperCase();return v||P[g]||r[g]||P[f].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,function(o,l,h){return l||h.slice(1)})})).match(i),H=A.length,j=0;j<H;j+=1){var I=A[j],T=R[I],d=T&&T[0],u=T&&T[1];A[j]=u?{regex:d,parser:u}:I.replace(/^\[|\]$/g,"")}return function(p){for(var v={},g=0,f=0;g<H;g+=1){var o=A[g];if(typeof o=="string")f+=o.length;else{var l=o.regex,h=o.parser,m=p.slice(f),x=l.exec(m)[0];h.call(v,x),p=p.replace(x,"")}}return function(s){var V=s.afternoon;if(V!==void 0){var e=s.hours;V?e<12&&(s.hours+=12):e===12&&(s.hours=0),delete s.afternoon}}(v),v}}return C(E,"l"),function(D,S,P){P.p.customParseFormat=!0,D&&D.parseTwoDigitYear&&(L=D.parseTwoDigitYear);var A=S.prototype,H=A.parse;A.parse=function(j){var I=j.date,T=j.utc,d=j.args;this.$u=T;var u=d[1];if(typeof u=="string"){var p=d[2]===!0,v=d[3]===!0,g=p||v,f=d[2];v&&(f=d[2]),O=this.$locale(),!p&&f&&(O=P.Ls[f]),this.$d=function(m,x,s,V){try{if(["x","X"].indexOf(x)>-1)return new Date((x==="X"?1e3:1)*m);var e=E(x)(m),w=e.year,F=e.month,$=e.day,Y=e.hours,X=e.minutes,M=e.seconds,K=e.milliseconds,it=e.zone,ct=e.week,ht=new Date,mt=$||(w||F?1:ht.getDate()),lt=w||ht.getFullYear(),B=0;w&&!F||(B=F>0?F-1:ht.getMonth());var Q,q=Y||0,nt=X||0,J=M||0,rt=K||0;return it?new Date(Date.UTC(lt,B,mt,q,nt,J,rt+60*it.offset*1e3)):s?new Date(Date.UTC(lt,B,mt,q,nt,J,rt)):(Q=new Date(lt,B,mt,q,nt,J,rt),ct&&(Q=V(Q).week(ct).toDate()),Q)}catch{return new Date("")}}(I,u,T,P),this.init(),f&&f!==!0&&(this.$L=this.locale(f).$L),g&&I!=this.format(u)&&(this.$d=new Date("")),O={}}else if(u instanceof Array)for(var o=u.length,l=1;l<=o;l+=1){d[1]=u[l-1];var h=P.apply(this,d);if(h.isValid()){this.$d=h.$d,this.$L=h.$L,this.init();break}l===o&&(this.$d=new Date(""))}else H.call(this,j)}}})})(te);var Ve=te.exports;const ze=Dt(Ve);var ee={exports:{}};(function(t,n){(function(r,i){t.exports=i()})(_t,function(){return function(r,i){var a=i.prototype,k=a.format;a.format=function(y){var _=this,O=this.$locale();if(!this.isValid())return k.bind(this)(y);var L=this.$utils(),b=(y||"YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,function(W){switch(W){case"Q":return Math.ceil((_.$M+1)/3);case"Do":return O.ordinal(_.$D);case"gggg":return _.weekYear();case"GGGG":return _.isoWeekYear();case"wo":return O.ordinal(_.week(),"W");case"w":case"ww":return L.s(_.week(),W==="w"?1:2,"0");case"W":case"WW":return L.s(_.isoWeek(),W==="W"?1:2,"0");case"k":case"kk":return L.s(String(_.$H===0?24:_.$H),W==="k"?1:2,"0");case"X":return Math.floor(_.$d.getTime()/1e3);case"x":return _.$d.getTime();case"z":return"["+_.offsetName()+"]";case"zzz":return"["+_.offsetName("long")+"]";default:return W}});return k.bind(this)(b)}}})})(ee);var Ne=ee.exports;const Re=Dt(Ne);var se={exports:{}};(function(t,n){(function(r,i){t.exports=i()})(_t,function(){var r,i,a=1e3,k=6e4,y=36e5,_=864e5,O=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,L=31536e6,b=2628e6,W=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/,z={years:L,months:b,days:_,hours:y,minutes:k,seconds:a,milliseconds:1,weeks:6048e5},N=C(function(I){return I instanceof H},"c"),R=C(function(I,T,d){return new H(I,d,T.$l)},"f"),E=C(function(I){return i.p(I)+"s"},"m"),D=C(function(I){return I<0},"l"),S=C(function(I){return D(I)?Math.ceil(I):Math.floor(I)},"$"),P=C(function(I){return Math.abs(I)},"y"),A=C(function(I,T){return I?D(I)?{negative:!0,format:""+P(I)+T}:{negative:!1,format:""+I+T}:{negative:!1,format:""}},"v"),H=function(){function I(d,u,p){var v=this;if(this.$d={},this.$l=p,d===void 0&&(this.$ms=0,this.parseFromMilliseconds()),u)return R(d*z[E(u)],this);if(typeof d=="number")return this.$ms=d,this.parseFromMilliseconds(),this;if(typeof d=="object")return Object.keys(d).forEach(function(o){v.$d[E(o)]=d[o]}),this.calMilliseconds(),this;if(typeof d=="string"){var g=d.match(W);if(g){var f=g.slice(2).map(function(o){return o!=null?Number(o):0});return this.$d.years=f[0],this.$d.months=f[1],this.$d.weeks=f[2],this.$d.days=f[3],this.$d.hours=f[4],this.$d.minutes=f[5],this.$d.seconds=f[6],this.calMilliseconds(),this}}return this}C(I,"l");var T=I.prototype;return T.calMilliseconds=function(){var d=this;this.$ms=Object.keys(this.$d).reduce(function(u,p){return u+(d.$d[p]||0)*z[p]},0)},T.parseFromMilliseconds=function(){var d=this.$ms;this.$d.years=S(d/L),d%=L,this.$d.months=S(d/b),d%=b,this.$d.days=S(d/_),d%=_,this.$d.hours=S(d/y),d%=y,this.$d.minutes=S(d/k),d%=k,this.$d.seconds=S(d/a),d%=a,this.$d.milliseconds=d},T.toISOString=function(){var d=A(this.$d.years,"Y"),u=A(this.$d.months,"M"),p=+this.$d.days||0;this.$d.weeks&&(p+=7*this.$d.weeks);var v=A(p,"D"),g=A(this.$d.hours,"H"),f=A(this.$d.minutes,"M"),o=this.$d.seconds||0;this.$d.milliseconds&&(o+=this.$d.milliseconds/1e3,o=Math.round(1e3*o)/1e3);var l=A(o,"S"),h=d.negative||u.negative||v.negative||g.negative||f.negative||l.negative,m=g.format||f.format||l.format?"T":"",x=(h?"-":"")+"P"+d.format+u.format+v.format+m+g.format+f.format+l.format;return x==="P"||x==="-P"?"P0D":x},T.toJSON=function(){return this.toISOString()},T.format=function(d){var u=d||"YYYY-MM-DDTHH:mm:ss",p={Y:this.$d.years,YY:i.s(this.$d.years,2,"0"),YYYY:i.s(this.$d.years,4,"0"),M:this.$d.months,MM:i.s(this.$d.months,2,"0"),D:this.$d.days,DD:i.s(this.$d.days,2,"0"),H:this.$d.hours,HH:i.s(this.$d.hours,2,"0"),m:this.$d.minutes,mm:i.s(this.$d.minutes,2,"0"),s:this.$d.seconds,ss:i.s(this.$d.seconds,2,"0"),SSS:i.s(this.$d.milliseconds,3,"0")};return u.replace(O,function(v,g){return g||String(p[v])})},T.as=function(d){return this.$ms/z[E(d)]},T.get=function(d){var u=this.$ms,p=E(d);return p==="milliseconds"?u%=1e3:u=p==="weeks"?S(u/z[p]):this.$d[p],u||0},T.add=function(d,u,p){var v;return v=u?d*z[E(u)]:N(d)?d.$ms:R(d,this).$ms,R(this.$ms+v*(p?-1:1),this)},T.subtract=function(d,u){return this.add(d,u,!0)},T.locale=function(d){var u=this.clone();return u.$l=d,u},T.clone=function(){return R(this.$ms,this)},T.humanize=function(d){return r().add(this.$ms,"ms").locale(this.$l).fromNow(!d)},T.valueOf=function(){return this.asMilliseconds()},T.milliseconds=function(){return this.get("milliseconds")},T.asMilliseconds=function(){return this.as("milliseconds")},T.seconds=function(){return this.get("seconds")},T.asSeconds=function(){return this.as("seconds")},T.minutes=function(){return this.get("minutes")},T.asMinutes=function(){return this.as("minutes")},T.hours=function(){return this.get("hours")},T.asHours=function(){return this.as("hours")},T.days=function(){return this.get("days")},T.asDays=function(){return this.as("days")},T.weeks=function(){return this.get("weeks")},T.asWeeks=function(){return this.as("weeks")},T.months=function(){return this.get("months")},T.asMonths=function(){return this.as("months")},T.years=function(){return this.get("years")},T.asYears=function(){return this.as("years")},I}(),j=C(function(I,T,d){return I.add(T.years()*d,"y").add(T.months()*d,"M").add(T.days()*d,"d").add(T.hours()*d,"h").add(T.minutes()*d,"m").add(T.seconds()*d,"s").add(T.milliseconds()*d,"ms")},"p");return function(I,T,d){r=d,i=d().$utils(),d.duration=function(v,g){var f=d.locale();return R(v,{$l:f},g)},d.isDuration=N;var u=T.prototype.add,p=T.prototype.subtract;T.prototype.add=function(v,g){return N(v)?j(this,v,1):u.bind(this)(v,g)},T.prototype.subtract=function(v,g){return N(v)?j(this,v,-1):p.bind(this)(v,g)}}})})(se);var He=se.exports;const Be=Dt(He);var Ct=function(){var t=c(function(f,o,l,h){for(l=l||{},h=f.length;h--;l[f[h]]=o);return l},"o"),n=[6,8,10,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,33,35,36,38,40],r=[1,26],i=[1,27],a=[1,28],k=[1,29],y=[1,30],_=[1,31],O=[1,32],L=[1,33],b=[1,34],W=[1,9],z=[1,10],N=[1,11],R=[1,12],E=[1,13],D=[1,14],S=[1,15],P=[1,16],A=[1,19],H=[1,20],j=[1,21],I=[1,22],T=[1,23],d=[1,25],u=[1,35],p={trace:c(C(function(){},"trace"),"trace"),yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,weekend:19,weekend_friday:20,weekend_saturday:21,dateFormat:22,inclusiveEndDates:23,topAxis:24,axisFormat:25,tickInterval:26,excludes:27,includes:28,todayMarker:29,title:30,acc_title:31,acc_title_value:32,acc_descr:33,acc_descr_value:34,acc_descr_multiline_value:35,section:36,clickStatement:37,taskTxt:38,taskData:39,click:40,callbackname:41,callbackargs:42,href:43,clickStatementDebug:44,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",20:"weekend_friday",21:"weekend_saturday",22:"dateFormat",23:"inclusiveEndDates",24:"topAxis",25:"axisFormat",26:"tickInterval",27:"excludes",28:"includes",29:"todayMarker",30:"title",31:"acc_title",32:"acc_title_value",33:"acc_descr",34:"acc_descr_value",35:"acc_descr_multiline_value",36:"section",38:"taskTxt",39:"taskData",40:"click",41:"callbackname",42:"callbackargs",43:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[19,1],[19,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[37,2],[37,3],[37,3],[37,4],[37,3],[37,4],[37,2],[44,2],[44,3],[44,3],[44,4],[44,3],[44,4],[44,2]],performAction:c(C(function(o,l,h,m,x,s,V){var e=s.length-1;switch(x){case 1:return s[e-1];case 2:this.$=[];break;case 3:s[e-1].push(s[e]),this.$=s[e-1];break;case 4:case 5:this.$=s[e];break;case 6:case 7:this.$=[];break;case 8:m.setWeekday("monday");break;case 9:m.setWeekday("tuesday");break;case 10:m.setWeekday("wednesday");break;case 11:m.setWeekday("thursday");break;case 12:m.setWeekday("friday");break;case 13:m.setWeekday("saturday");break;case 14:m.setWeekday("sunday");break;case 15:m.setWeekend("friday");break;case 16:m.setWeekend("saturday");break;case 17:m.setDateFormat(s[e].substr(11)),this.$=s[e].substr(11);break;case 18:m.enableInclusiveEndDates(),this.$=s[e].substr(18);break;case 19:m.TopAxis(),this.$=s[e].substr(8);break;case 20:m.setAxisFormat(s[e].substr(11)),this.$=s[e].substr(11);break;case 21:m.setTickInterval(s[e].substr(13)),this.$=s[e].substr(13);break;case 22:m.setExcludes(s[e].substr(9)),this.$=s[e].substr(9);break;case 23:m.setIncludes(s[e].substr(9)),this.$=s[e].substr(9);break;case 24:m.setTodayMarker(s[e].substr(12)),this.$=s[e].substr(12);break;case 27:m.setDiagramTitle(s[e].substr(6)),this.$=s[e].substr(6);break;case 28:this.$=s[e].trim(),m.setAccTitle(this.$);break;case 29:case 30:this.$=s[e].trim(),m.setAccDescription(this.$);break;case 31:m.addSection(s[e].substr(8)),this.$=s[e].substr(8);break;case 33:m.addTask(s[e-1],s[e]),this.$="task";break;case 34:this.$=s[e-1],m.setClickEvent(s[e-1],s[e],null);break;case 35:this.$=s[e-2],m.setClickEvent(s[e-2],s[e-1],s[e]);break;case 36:this.$=s[e-2],m.setClickEvent(s[e-2],s[e-1],null),m.setLink(s[e-2],s[e]);break;case 37:this.$=s[e-3],m.setClickEvent(s[e-3],s[e-2],s[e-1]),m.setLink(s[e-3],s[e]);break;case 38:this.$=s[e-2],m.setClickEvent(s[e-2],s[e],null),m.setLink(s[e-2],s[e-1]);break;case 39:this.$=s[e-3],m.setClickEvent(s[e-3],s[e-1],s[e]),m.setLink(s[e-3],s[e-2]);break;case 40:this.$=s[e-1],m.setLink(s[e-1],s[e]);break;case 41:case 47:this.$=s[e-1]+" "+s[e];break;case 42:case 43:case 45:this.$=s[e-2]+" "+s[e-1]+" "+s[e];break;case 44:case 46:this.$=s[e-3]+" "+s[e-2]+" "+s[e-1]+" "+s[e];break}},"anonymous"),"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},t(n,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:r,13:i,14:a,15:k,16:y,17:_,18:O,19:18,20:L,21:b,22:W,23:z,24:N,25:R,26:E,27:D,28:S,29:P,30:A,31:H,33:j,35:I,36:T,37:24,38:d,40:u},t(n,[2,7],{1:[2,1]}),t(n,[2,3]),{9:36,11:17,12:r,13:i,14:a,15:k,16:y,17:_,18:O,19:18,20:L,21:b,22:W,23:z,24:N,25:R,26:E,27:D,28:S,29:P,30:A,31:H,33:j,35:I,36:T,37:24,38:d,40:u},t(n,[2,5]),t(n,[2,6]),t(n,[2,17]),t(n,[2,18]),t(n,[2,19]),t(n,[2,20]),t(n,[2,21]),t(n,[2,22]),t(n,[2,23]),t(n,[2,24]),t(n,[2,25]),t(n,[2,26]),t(n,[2,27]),{32:[1,37]},{34:[1,38]},t(n,[2,30]),t(n,[2,31]),t(n,[2,32]),{39:[1,39]},t(n,[2,8]),t(n,[2,9]),t(n,[2,10]),t(n,[2,11]),t(n,[2,12]),t(n,[2,13]),t(n,[2,14]),t(n,[2,15]),t(n,[2,16]),{41:[1,40],43:[1,41]},t(n,[2,4]),t(n,[2,28]),t(n,[2,29]),t(n,[2,33]),t(n,[2,34],{42:[1,42],43:[1,43]}),t(n,[2,40],{41:[1,44]}),t(n,[2,35],{43:[1,45]}),t(n,[2,36]),t(n,[2,38],{42:[1,46]}),t(n,[2,37]),t(n,[2,39])],defaultActions:{},parseError:c(C(function(o,l){if(l.recoverable)this.trace(o);else{var h=new Error(o);throw h.hash=l,h}},"parseError"),"parseError"),parse:c(C(function(o){var l=this,h=[0],m=[],x=[null],s=[],V=this.table,e="",w=0,F=0,$=2,Y=1,X=s.slice.call(arguments,1),M=Object.create(this.lexer),K={yy:{}};for(var it in this.yy)Object.prototype.hasOwnProperty.call(this.yy,it)&&(K.yy[it]=this.yy[it]);M.setInput(o,K.yy),K.yy.lexer=M,K.yy.parser=this,typeof M.yylloc>"u"&&(M.yylloc={});var ct=M.yylloc;s.push(ct);var ht=M.options&&M.options.ranges;typeof K.yy.parseError=="function"?this.parseError=K.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function mt(Z){h.length=h.length-2*Z,x.length=x.length-Z,s.length=s.length-Z}C(mt,"popStack"),c(mt,"popStack");function lt(){var Z;return Z=m.pop()||M.lex()||Y,typeof Z!="number"&&(Z instanceof Array&&(m=Z,Z=m.pop()),Z=l.symbols_[Z]||Z),Z}C(lt,"lex"),c(lt,"lex");for(var B,Q,q,nt,J={},rt,tt,Rt,vt;;){if(Q=h[h.length-1],this.defaultActions[Q]?q=this.defaultActions[Q]:((B===null||typeof B>"u")&&(B=lt()),q=V[Q]&&V[Q][B]),typeof q>"u"||!q.length||!q[0]){var St="";vt=[];for(rt in V[Q])this.terminals_[rt]&&rt>$&&vt.push("'"+this.terminals_[rt]+"'");M.showPosition?St="Parse error on line "+(w+1)+`:
`+M.showPosition()+`
Expecting `+vt.join(", ")+", got '"+(this.terminals_[B]||B)+"'":St="Parse error on line "+(w+1)+": Unexpected "+(B==Y?"end of input":"'"+(this.terminals_[B]||B)+"'"),this.parseError(St,{text:M.match,token:this.terminals_[B]||B,line:M.yylineno,loc:ct,expected:vt})}if(q[0]instanceof Array&&q.length>1)throw new Error("Parse Error: multiple actions possible at state: "+Q+", token: "+B);switch(q[0]){case 1:h.push(B),x.push(M.yytext),s.push(M.yylloc),h.push(q[1]),B=null,F=M.yyleng,e=M.yytext,w=M.yylineno,ct=M.yylloc;break;case 2:if(tt=this.productions_[q[1]][1],J.$=x[x.length-tt],J._$={first_line:s[s.length-(tt||1)].first_line,last_line:s[s.length-1].last_line,first_column:s[s.length-(tt||1)].first_column,last_column:s[s.length-1].last_column},ht&&(J._$.range=[s[s.length-(tt||1)].range[0],s[s.length-1].range[1]]),nt=this.performAction.apply(J,[e,F,w,K.yy,q[1],x,s].concat(X)),typeof nt<"u")return nt;tt&&(h=h.slice(0,-1*tt*2),x=x.slice(0,-1*tt),s=s.slice(0,-1*tt)),h.push(this.productions_[q[1]][0]),x.push(J.$),s.push(J._$),Rt=V[h[h.length-2]][h[h.length-1]],h.push(Rt);break;case 3:return!0}}return!0},"parse"),"parse")},v=function(){var f={EOF:1,parseError:c(C(function(l,h){if(this.yy.parser)this.yy.parser.parseError(l,h);else throw new Error(l)},"parseError"),"parseError"),setInput:c(function(o,l){return this.yy=l||this.yy||{},this._input=o,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:c(function(){var o=this._input[0];this.yytext+=o,this.yyleng++,this.offset++,this.match+=o,this.matched+=o;var l=o.match(/(?:\r\n?|\n).*/g);return l?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),o},"input"),unput:c(function(o){var l=o.length,h=o.split(/(?:\r\n?|\n)/g);this._input=o+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-l),this.offset-=l;var m=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),h.length-1&&(this.yylineno-=h.length-1);var x=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:h?(h.length===m.length?this.yylloc.first_column:0)+m[m.length-h.length].length-h[0].length:this.yylloc.first_column-l},this.options.ranges&&(this.yylloc.range=[x[0],x[0]+this.yyleng-l]),this.yyleng=this.yytext.length,this},"unput"),more:c(function(){return this._more=!0,this},"more"),reject:c(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:c(function(o){this.unput(this.match.slice(o))},"less"),pastInput:c(function(){var o=this.matched.substr(0,this.matched.length-this.match.length);return(o.length>20?"...":"")+o.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:c(function(){var o=this.match;return o.length<20&&(o+=this._input.substr(0,20-o.length)),(o.substr(0,20)+(o.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:c(function(){var o=this.pastInput(),l=new Array(o.length+1).join("-");return o+this.upcomingInput()+`
`+l+"^"},"showPosition"),test_match:c(function(o,l){var h,m,x;if(this.options.backtrack_lexer&&(x={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(x.yylloc.range=this.yylloc.range.slice(0))),m=o[0].match(/(?:\r\n?|\n).*/g),m&&(this.yylineno+=m.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:m?m[m.length-1].length-m[m.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+o[0].length},this.yytext+=o[0],this.match+=o[0],this.matches=o,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(o[0].length),this.matched+=o[0],h=this.performAction.call(this,this.yy,this,l,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),h)return h;if(this._backtrack){for(var s in x)this[s]=x[s];return!1}return!1},"test_match"),next:c(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var o,l,h,m;this._more||(this.yytext="",this.match="");for(var x=this._currentRules(),s=0;s<x.length;s++)if(h=this._input.match(this.rules[x[s]]),h&&(!l||h[0].length>l[0].length)){if(l=h,m=s,this.options.backtrack_lexer){if(o=this.test_match(h,x[s]),o!==!1)return o;if(this._backtrack){l=!1;continue}else return!1}else if(!this.options.flex)break}return l?(o=this.test_match(l,x[m]),o!==!1?o:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:c(C(function(){var l=this.next();return l||this.lex()},"lex"),"lex"),begin:c(C(function(l){this.conditionStack.push(l)},"begin"),"begin"),popState:c(C(function(){var l=this.conditionStack.length-1;return l>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),"popState"),_currentRules:c(C(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),"_currentRules"),topState:c(C(function(l){return l=this.conditionStack.length-1-Math.abs(l||0),l>=0?this.conditionStack[l]:"INITIAL"},"topState"),"topState"),pushState:c(C(function(l){this.begin(l)},"pushState"),"pushState"),stateStackSize:c(C(function(){return this.conditionStack.length},"stateStackSize"),"stateStackSize"),options:{"case-insensitive":!0},performAction:c(C(function(l,h,m,x){switch(m){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),31;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),33;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 43;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 41;case 21:this.popState();break;case 22:return 42;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 40;case 26:return 4;case 27:return 22;case 28:return 23;case 29:return 24;case 30:return 25;case 31:return 26;case 32:return 28;case 33:return 27;case 34:return 29;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return 20;case 43:return 21;case 44:return"date";case 45:return 30;case 46:return"accDescription";case 47:return 36;case 48:return 38;case 49:return 39;case 50:return":";case 51:return 6;case 52:return"INVALID"}},"anonymous"),"anonymous"),rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:weekend\s+friday\b)/i,/^(?:weekend\s+saturday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],inclusive:!0}}};return f}();p.lexer=v;function g(){this.yy={}}return C(g,"Parser"),c(g,"Parser"),g.prototype=p,p.Parser=g,new g}();Ct.parser=Ct;var Ge=Ct;U.extend(Pe);U.extend(ze);U.extend(Re);var Zt={friday:5,saturday:6},et="",$t="",At=void 0,Ft="",kt=[],yt=[],Lt=new Map,Wt=[],bt=[],ft="",Ot="",ie=["active","done","crit","milestone","vert"],Pt=[],gt=!1,Vt=!1,zt="sunday",wt="saturday",Et=0,je=c(function(){Wt=[],bt=[],ft="",Pt=[],Tt=0,Yt=void 0,xt=void 0,G=[],et="",$t="",Ot="",At=void 0,Ft="",kt=[],yt=[],gt=!1,Vt=!1,Et=0,Lt=new Map,Le(),zt="sunday",wt="saturday"},"clear"),Xe=c(function(t){$t=t},"setAxisFormat"),Ue=c(function(){return $t},"getAxisFormat"),qe=c(function(t){At=t},"setTickInterval"),Ze=c(function(){return At},"getTickInterval"),Qe=c(function(t){Ft=t},"setTodayMarker"),Ke=c(function(){return Ft},"getTodayMarker"),Je=c(function(t){et=t},"setDateFormat"),ts=c(function(){gt=!0},"enableInclusiveEndDates"),es=c(function(){return gt},"endDatesAreInclusive"),ss=c(function(){Vt=!0},"enableTopAxis"),is=c(function(){return Vt},"topAxisEnabled"),rs=c(function(t){Ot=t},"setDisplayMode"),ns=c(function(){return Ot},"getDisplayMode"),as=c(function(){return et},"getDateFormat"),os=c(function(t){kt=t.toLowerCase().split(/[\s,]+/)},"setIncludes"),cs=c(function(){return kt},"getIncludes"),ls=c(function(t){yt=t.toLowerCase().split(/[\s,]+/)},"setExcludes"),us=c(function(){return yt},"getExcludes"),ds=c(function(){return Lt},"getLinks"),fs=c(function(t){ft=t,Wt.push(t)},"addSection"),hs=c(function(){return Wt},"getSections"),ms=c(function(){let t=Qt();const n=10;let r=0;for(;!t&&r<n;)t=Qt(),r++;return bt=G,bt},"getTasks"),re=c(function(t,n,r,i){const a=t.format(n.trim()),k=t.format("YYYY-MM-DD");return i.includes(a)||i.includes(k)?!1:r.includes("weekends")&&(t.isoWeekday()===Zt[wt]||t.isoWeekday()===Zt[wt]+1)||r.includes(t.format("dddd").toLowerCase())?!0:r.includes(a)||r.includes(k)},"isInvalidDate"),ks=c(function(t){zt=t},"setWeekday"),ys=c(function(){return zt},"getWeekday"),gs=c(function(t){wt=t},"setWeekend"),ne=c(function(t,n,r,i){if(!r.length||t.manualEndTime)return;let a;t.startTime instanceof Date?a=U(t.startTime):a=U(t.startTime,n,!0),a=a.add(1,"d");let k;t.endTime instanceof Date?k=U(t.endTime):k=U(t.endTime,n,!0);const[y,_]=vs(a,k,n,r,i);t.endTime=y.toDate(),t.renderEndTime=_},"checkTaskDates"),vs=c(function(t,n,r,i,a){let k=!1,y=null;for(;t<=n;)k||(y=n.toDate()),k=re(t,r,i,a),k&&(n=n.add(1,"d")),t=t.add(1,"d");return[n,y]},"fixTaskDates"),It=c(function(t,n,r){if(r=r.trim(),c(_=>{const O=_.trim();return O==="x"||O==="X"},"isTimestampFormat")(n)&&/^\d+$/.test(r))return new Date(Number(r));const k=/^after\s+(?<ids>[\d\w- ]+)/.exec(r);if(k!==null){let _=null;for(const L of k.groups.ids.split(" ")){let b=ot(L);b!==void 0&&(!_||b.endTime>_.endTime)&&(_=b)}if(_)return _.endTime;const O=new Date;return O.setHours(0,0,0,0),O}let y=U(r,n.trim(),!0);if(y.isValid())return y.toDate();{at.debug("Invalid date:"+r),at.debug("With date format:"+n.trim());const _=new Date(r);if(_===void 0||isNaN(_.getTime())||_.getFullYear()<-1e4||_.getFullYear()>1e4)throw new Error("Invalid date:"+r);return _}},"getStartDate"),ae=c(function(t){const n=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return n!==null?[Number.parseFloat(n[1]),n[2]]:[NaN,"ms"]},"parseDuration"),oe=c(function(t,n,r,i=!1){r=r.trim();const k=/^until\s+(?<ids>[\d\w- ]+)/.exec(r);if(k!==null){let b=null;for(const z of k.groups.ids.split(" ")){let N=ot(z);N!==void 0&&(!b||N.startTime<b.startTime)&&(b=N)}if(b)return b.startTime;const W=new Date;return W.setHours(0,0,0,0),W}let y=U(r,n.trim(),!0);if(y.isValid())return i&&(y=y.add(1,"d")),y.toDate();let _=U(t);const[O,L]=ae(r);if(!Number.isNaN(O)){const b=_.add(O,L);b.isValid()&&(_=b)}return _.toDate()},"getEndDate"),Tt=0,dt=c(function(t){return t===void 0?(Tt=Tt+1,"task"+Tt):t},"parseId"),ps=c(function(t,n){let r;n.substr(0,1)===":"?r=n.substr(1,n.length):r=n;const i=r.split(","),a={};Nt(i,a,ie);for(let y=0;y<i.length;y++)i[y]=i[y].trim();let k="";switch(i.length){case 1:a.id=dt(),a.startTime=t.endTime,k=i[0];break;case 2:a.id=dt(),a.startTime=It(void 0,et,i[0]),k=i[1];break;case 3:a.id=dt(i[0]),a.startTime=It(void 0,et,i[1]),k=i[2];break}return k&&(a.endTime=oe(a.startTime,et,k,gt),a.manualEndTime=U(k,"YYYY-MM-DD",!0).isValid(),ne(a,et,yt,kt)),a},"compileData"),Ts=c(function(t,n){let r;n.substr(0,1)===":"?r=n.substr(1,n.length):r=n;const i=r.split(","),a={};Nt(i,a,ie);for(let k=0;k<i.length;k++)i[k]=i[k].trim();switch(i.length){case 1:a.id=dt(),a.startTime={type:"prevTaskEnd",id:t},a.endTime={data:i[0]};break;case 2:a.id=dt(),a.startTime={type:"getStartDate",startData:i[0]},a.endTime={data:i[1]};break;case 3:a.id=dt(i[0]),a.startTime={type:"getStartDate",startData:i[1]},a.endTime={data:i[2]};break}return a},"parseData"),Yt,xt,G=[],ce={},xs=c(function(t,n){const r={section:ft,type:ft,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:n},task:t,classes:[]},i=Ts(xt,n);r.raw.startTime=i.startTime,r.raw.endTime=i.endTime,r.id=i.id,r.prevTaskId=xt,r.active=i.active,r.done=i.done,r.crit=i.crit,r.milestone=i.milestone,r.vert=i.vert,r.order=Et,Et++;const a=G.push(r);xt=r.id,ce[r.id]=a-1},"addTask"),ot=c(function(t){const n=ce[t];return G[n]},"findTaskById"),bs=c(function(t,n){const r={section:ft,type:ft,description:t,task:t,classes:[]},i=ps(Yt,n);r.startTime=i.startTime,r.endTime=i.endTime,r.id=i.id,r.active=i.active,r.done=i.done,r.crit=i.crit,r.milestone=i.milestone,r.vert=i.vert,Yt=r,bt.push(r)},"addTaskOrg"),Qt=c(function(){const t=c(function(r){const i=G[r];let a="";switch(G[r].raw.startTime.type){case"prevTaskEnd":{const k=ot(i.prevTaskId);i.startTime=k.endTime;break}case"getStartDate":a=It(void 0,et,G[r].raw.startTime.startData),a&&(G[r].startTime=a);break}return G[r].startTime&&(G[r].endTime=oe(G[r].startTime,et,G[r].raw.endTime.data,gt),G[r].endTime&&(G[r].processed=!0,G[r].manualEndTime=U(G[r].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),ne(G[r],et,yt,kt))),G[r].processed},"compileTask");let n=!0;for(const[r,i]of G.entries())t(r),n=n&&i.processed;return n},"compileTasks"),ws=c(function(t,n){let r=n;ut().securityLevel!=="loose"&&(r=Fe(n)),t.split(",").forEach(function(i){ot(i)!==void 0&&(ue(i,()=>{window.open(r,"_self")}),Lt.set(i,r))}),le(t,"clickable")},"setLink"),le=c(function(t,n){t.split(",").forEach(function(r){let i=ot(r);i!==void 0&&i.classes.push(n)})},"setClass"),_s=c(function(t,n,r){if(ut().securityLevel!=="loose"||n===void 0)return;let i=[];if(typeof r=="string"){i=r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let k=0;k<i.length;k++){let y=i[k].trim();y.startsWith('"')&&y.endsWith('"')&&(y=y.substr(1,y.length-2)),i[k]=y}}i.length===0&&i.push(t),ot(t)!==void 0&&ue(t,()=>{We.runFunc(n,...i)})},"setClickFun"),ue=c(function(t,n){Pt.push(function(){const r=document.querySelector(`[id="${t}"]`);r!==null&&r.addEventListener("click",function(){n()})},function(){const r=document.querySelector(`[id="${t}-text"]`);r!==null&&r.addEventListener("click",function(){n()})})},"pushFun"),Ds=c(function(t,n,r){t.split(",").forEach(function(i){_s(i,n,r)}),le(t,"clickable")},"setClickEvent"),Ss=c(function(t){Pt.forEach(function(n){n(t)})},"bindFunctions"),Ms={getConfig:c(()=>ut().gantt,"getConfig"),clear:je,setDateFormat:Je,getDateFormat:as,enableInclusiveEndDates:ts,endDatesAreInclusive:es,enableTopAxis:ss,topAxisEnabled:is,setAxisFormat:Xe,getAxisFormat:Ue,setTickInterval:qe,getTickInterval:Ze,setTodayMarker:Qe,getTodayMarker:Ke,setAccTitle:ge,getAccTitle:ye,setDiagramTitle:ke,getDiagramTitle:me,setDisplayMode:rs,getDisplayMode:ns,setAccDescription:he,getAccDescription:fe,addSection:fs,getSections:hs,getTasks:ms,addTask:xs,findTaskById:ot,addTaskOrg:bs,setIncludes:os,getIncludes:cs,setExcludes:ls,getExcludes:us,setClickEvent:Ds,setLink:ws,getLinks:ds,bindFunctions:Ss,parseDuration:ae,isInvalidDate:re,setWeekday:ks,getWeekday:ys,setWeekend:gs};function Nt(t,n,r){let i=!0;for(;i;)i=!1,r.forEach(function(a){const k="^\\s*"+a+"\\s*$",y=new RegExp(k);t[0].match(y)&&(n[a]=!0,t.shift(1),i=!0)})}C(Nt,"getTaskTags");c(Nt,"getTaskTags");U.extend(Be);var Cs=c(function(){at.debug("Something is calling, setConf, remove the call")},"setConf"),Kt={monday:Ye,tuesday:Ie,wednesday:Ee,thursday:Ce,friday:Me,saturday:Se,sunday:De},Es=c((t,n)=>{let r=[...t].map(()=>-1/0),i=[...t].sort((k,y)=>k.startTime-y.startTime||k.order-y.order),a=0;for(const k of i)for(let y=0;y<r.length;y++)if(k.startTime>=r[y]){r[y]=k.endTime,k.order=y+n,y>a&&(a=y);break}return a},"getMaxIntersections"),st,Mt=1e4,Is=c(function(t,n,r,i){const a=ut().gantt,k=ut().securityLevel;let y;k==="sandbox"&&(y=pt("#i"+n));const _=k==="sandbox"?pt(y.nodes()[0].contentDocument.body):pt("body"),O=k==="sandbox"?y.nodes()[0].contentDocument:document,L=O.getElementById(n);st=L.parentElement.offsetWidth,st===void 0&&(st=1200),a.useWidth!==void 0&&(st=a.useWidth);const b=i.db.getTasks();let W=[];for(const u of b)W.push(u.type);W=d(W);const z={};let N=2*a.topPadding;if(i.db.getDisplayMode()==="compact"||a.displayMode==="compact"){const u={};for(const v of b)u[v.section]===void 0?u[v.section]=[v]:u[v.section].push(v);let p=0;for(const v of Object.keys(u)){const g=Es(u[v],p)+1;p+=g,N+=g*(a.barHeight+a.barGap),z[v]=g}}else{N+=b.length*(a.barHeight+a.barGap);for(const u of W)z[u]=b.filter(p=>p.type===u).length}L.setAttribute("viewBox","0 0 "+st+" "+N);const R=_.select(`[id="${n}"]`),E=ve().domain([pe(b,function(u){return u.startTime}),Te(b,function(u){return u.endTime})]).rangeRound([0,st-a.leftPadding-a.rightPadding]);function D(u,p){const v=u.startTime,g=p.startTime;let f=0;return v>g?f=1:v<g&&(f=-1),f}C(D,"taskCompare"),c(D,"taskCompare"),b.sort(D),S(b,st,N),xe(R,N,st,a.useMaxWidth),R.append("text").text(i.db.getDiagramTitle()).attr("x",st/2).attr("y",a.titleTopMargin).attr("class","titleText");function S(u,p,v){const g=a.barHeight,f=g+a.barGap,o=a.topPadding,l=a.leftPadding,h=be().domain([0,W.length]).range(["#00B9FA","#F95002"]).interpolate(we);A(f,o,l,p,v,u,i.db.getExcludes(),i.db.getIncludes()),j(l,o,p,v),P(u,f,o,l,g,h,p),I(f,o),T(l,o,p,v)}C(S,"makeGantt"),c(S,"makeGantt");function P(u,p,v,g,f,o,l){u.sort((e,w)=>e.vert===w.vert?0:e.vert?1:-1);const m=[...new Set(u.map(e=>e.order))].map(e=>u.find(w=>w.order===e));R.append("g").selectAll("rect").data(m).enter().append("rect").attr("x",0).attr("y",function(e,w){return w=e.order,w*p+v-2}).attr("width",function(){return l-a.rightPadding/2}).attr("height",p).attr("class",function(e){for(const[w,F]of W.entries())if(e.type===F)return"section section"+w%a.numberSectionStyles;return"section section0"}).enter();const x=R.append("g").selectAll("rect").data(u).enter(),s=i.db.getLinks();if(x.append("rect").attr("id",function(e){return e.id}).attr("rx",3).attr("ry",3).attr("x",function(e){return e.milestone?E(e.startTime)+g+.5*(E(e.endTime)-E(e.startTime))-.5*f:E(e.startTime)+g}).attr("y",function(e,w){return w=e.order,e.vert?a.gridLineStartPadding:w*p+v}).attr("width",function(e){return e.milestone?f:e.vert?.08*f:E(e.renderEndTime||e.endTime)-E(e.startTime)}).attr("height",function(e){return e.vert?b.length*(a.barHeight+a.barGap)+a.barHeight*2:f}).attr("transform-origin",function(e,w){return w=e.order,(E(e.startTime)+g+.5*(E(e.endTime)-E(e.startTime))).toString()+"px "+(w*p+v+.5*f).toString()+"px"}).attr("class",function(e){const w="task";let F="";e.classes.length>0&&(F=e.classes.join(" "));let $=0;for(const[X,M]of W.entries())e.type===M&&($=X%a.numberSectionStyles);let Y="";return e.active?e.crit?Y+=" activeCrit":Y=" active":e.done?e.crit?Y=" doneCrit":Y=" done":e.crit&&(Y+=" crit"),Y.length===0&&(Y=" task"),e.milestone&&(Y=" milestone "+Y),e.vert&&(Y=" vert "+Y),Y+=$,Y+=" "+F,w+Y}),x.append("text").attr("id",function(e){return e.id+"-text"}).text(function(e){return e.task}).attr("font-size",a.fontSize).attr("x",function(e){let w=E(e.startTime),F=E(e.renderEndTime||e.endTime);if(e.milestone&&(w+=.5*(E(e.endTime)-E(e.startTime))-.5*f,F=w+f),e.vert)return E(e.startTime)+g;const $=this.getBBox().width;return $>F-w?F+$+1.5*a.leftPadding>l?w+g-5:F+g+5:(F-w)/2+w+g}).attr("y",function(e,w){return e.vert?a.gridLineStartPadding+b.length*(a.barHeight+a.barGap)+60:(w=e.order,w*p+a.barHeight/2+(a.fontSize/2-2)+v)}).attr("text-height",f).attr("class",function(e){const w=E(e.startTime);let F=E(e.endTime);e.milestone&&(F=w+f);const $=this.getBBox().width;let Y="";e.classes.length>0&&(Y=e.classes.join(" "));let X=0;for(const[K,it]of W.entries())e.type===it&&(X=K%a.numberSectionStyles);let M="";return e.active&&(e.crit?M="activeCritText"+X:M="activeText"+X),e.done?e.crit?M=M+" doneCritText"+X:M=M+" doneText"+X:e.crit&&(M=M+" critText"+X),e.milestone&&(M+=" milestoneText"),e.vert&&(M+=" vertText"),$>F-w?F+$+1.5*a.leftPadding>l?Y+" taskTextOutsideLeft taskTextOutside"+X+" "+M:Y+" taskTextOutsideRight taskTextOutside"+X+" "+M+" width-"+$:Y+" taskText taskText"+X+" "+M+" width-"+$}),ut().securityLevel==="sandbox"){let e;e=pt("#i"+n);const w=e.nodes()[0].contentDocument;x.filter(function(F){return s.has(F.id)}).each(function(F){var $=w.querySelector("#"+F.id),Y=w.querySelector("#"+F.id+"-text");const X=$.parentNode;var M=w.createElement("a");M.setAttribute("xlink:href",s.get(F.id)),M.setAttribute("target","_top"),X.appendChild(M),M.appendChild($),M.appendChild(Y)})}}C(P,"drawRects"),c(P,"drawRects");function A(u,p,v,g,f,o,l,h){if(l.length===0&&h.length===0)return;let m,x;for(const{startTime:$,endTime:Y}of o)(m===void 0||$<m)&&(m=$),(x===void 0||Y>x)&&(x=Y);if(!m||!x)return;if(U(x).diff(U(m),"year")>5){at.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}const s=i.db.getDateFormat(),V=[];let e=null,w=U(m);for(;w.valueOf()<=x;)i.db.isInvalidDate(w,s,l,h)?e?e.end=w:e={start:w,end:w}:e&&(V.push(e),e=null),w=w.add(1,"d");R.append("g").selectAll("rect").data(V).enter().append("rect").attr("id",$=>"exclude-"+$.start.format("YYYY-MM-DD")).attr("x",$=>E($.start.startOf("day"))+v).attr("y",a.gridLineStartPadding).attr("width",$=>E($.end.endOf("day"))-E($.start.startOf("day"))).attr("height",f-p-a.gridLineStartPadding).attr("transform-origin",function($,Y){return(E($.start)+v+.5*(E($.end)-E($.start))).toString()+"px "+(Y*u+.5*f).toString()+"px"}).attr("class","exclude-range")}C(A,"drawExcludeDays"),c(A,"drawExcludeDays");function H(u,p,v,g){if(v<=0||u>p)return 1/0;const f=p-u,o=U.duration({[g??"day"]:v}).asMilliseconds();return o<=0?1/0:Math.ceil(f/o)}C(H,"getEstimatedTickCount"),c(H,"getEstimatedTickCount");function j(u,p,v,g){const f=i.db.getDateFormat(),o=i.db.getAxisFormat();let l;o?l=o:f==="D"?l="%d":l=a.axisFormat??"%Y-%m-%d";let h=_e(E).tickSize(-g+p+a.gridLineStartPadding).tickFormat(Ht(l));const x=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(i.db.getTickInterval()||a.tickInterval);if(x!==null){const s=parseInt(x[1],10);if(isNaN(s)||s<=0)at.warn(`Invalid tick interval value: "${x[1]}". Skipping custom tick interval.`);else{const V=x[2],e=i.db.getWeekday()||a.weekday,w=E.domain(),F=w[0],$=w[1],Y=H(F,$,s,V);if(Y>Mt)at.warn(`The tick interval "${s}${V}" would generate ${Y} ticks, which exceeds the maximum allowed (${Mt}). This may indicate an invalid date or time range. Skipping custom tick interval.`);else switch(V){case"millisecond":h.ticks(qt.every(s));break;case"second":h.ticks(Ut.every(s));break;case"minute":h.ticks(Xt.every(s));break;case"hour":h.ticks(jt.every(s));break;case"day":h.ticks(Gt.every(s));break;case"week":h.ticks(Kt[e].every(s));break;case"month":h.ticks(Bt.every(s));break}}}if(R.append("g").attr("class","grid").attr("transform","translate("+u+", "+(g-50)+")").call(h).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),i.db.topAxisEnabled()||a.topAxis){let s=$e(E).tickSize(-g+p+a.gridLineStartPadding).tickFormat(Ht(l));if(x!==null){const V=parseInt(x[1],10);if(isNaN(V)||V<=0)at.warn(`Invalid tick interval value: "${x[1]}". Skipping custom tick interval.`);else{const e=x[2],w=i.db.getWeekday()||a.weekday,F=E.domain(),$=F[0],Y=F[1];if(H($,Y,V,e)<=Mt)switch(e){case"millisecond":s.ticks(qt.every(V));break;case"second":s.ticks(Ut.every(V));break;case"minute":s.ticks(Xt.every(V));break;case"hour":s.ticks(jt.every(V));break;case"day":s.ticks(Gt.every(V));break;case"week":s.ticks(Kt[w].every(V));break;case"month":s.ticks(Bt.every(V));break}}}R.append("g").attr("class","grid").attr("transform","translate("+u+", "+p+")").call(s).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}C(j,"makeGrid"),c(j,"makeGrid");function I(u,p){let v=0;const g=Object.keys(z).map(f=>[f,z[f]]);R.append("g").selectAll("text").data(g).enter().append(function(f){const o=f[0].split(Ae.lineBreakRegex),l=-(o.length-1)/2,h=O.createElementNS("http://www.w3.org/2000/svg","text");h.setAttribute("dy",l+"em");for(const[m,x]of o.entries()){const s=O.createElementNS("http://www.w3.org/2000/svg","tspan");s.setAttribute("alignment-baseline","central"),s.setAttribute("x","10"),m>0&&s.setAttribute("dy","1em"),s.textContent=x,h.appendChild(s)}return h}).attr("x",10).attr("y",function(f,o){if(o>0)for(let l=0;l<o;l++)return v+=g[o-1][1],f[1]*u/2+v*u+p;else return f[1]*u/2+p}).attr("font-size",a.sectionFontSize).attr("class",function(f){for(const[o,l]of W.entries())if(f[0]===l)return"sectionTitle sectionTitle"+o%a.numberSectionStyles;return"sectionTitle"})}C(I,"vertLabels"),c(I,"vertLabels");function T(u,p,v,g){const f=i.db.getTodayMarker();if(f==="off")return;const o=R.append("g").attr("class","today"),l=new Date,h=o.append("line");h.attr("x1",E(l)+u).attr("x2",E(l)+u).attr("y1",a.titleTopMargin).attr("y2",g-a.titleTopMargin).attr("class","today"),f!==""&&h.attr("style",f.replace(/,/g,";"))}C(T,"drawToday"),c(T,"drawToday");function d(u){const p={},v=[];for(let g=0,f=u.length;g<f;++g)Object.prototype.hasOwnProperty.call(p,u[g])||(p[u[g]]=!0,v.push(u[g]));return v}C(d,"checkUnique"),c(d,"checkUnique")},"draw"),Ys={setConf:Cs,draw:Is},$s=c(t=>`
  .mermaid-main-font {
        font-family: ${t.fontFamily};
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: ${t.fontFamily};
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .vert {
    stroke: ${t.vertLineColor};
  }

  .vertText {
    font-size: 15px;
    text-anchor: middle;
    fill: ${t.vertLineColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: ${t.fontFamily};
  }
`,"getStyles"),As=$s,Os={parser:Ge,db:Ms,renderer:Ys,styles:As};export{Os as diagram};
