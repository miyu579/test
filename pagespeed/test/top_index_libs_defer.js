/*! 
 * lazysizes - v5.1.0
 * Copyright (c) 2015 Alexander Farkas
 * Released under the MIT license
 * https://github.com/aFarkas/lazysizes
*/
!function(a,b){var c=b(a,a.document);a.lazySizes=c,"object"==typeof module&&module.exports&&(module.exports=c)}("undefined"!=typeof window?window:{},function(a,b){"use strict";var c,d;if(function(){var b,c={lazyClass:"lazyload",loadedClass:"lazyloaded",loadingClass:"lazyloading",preloadClass:"lazypreload",errorClass:"lazyerror",autosizesClass:"lazyautosizes",srcAttr:"data-src",srcsetAttr:"data-srcset",sizesAttr:"data-sizes",minSize:40,customMedia:{},init:!0,expFactor:1.5,hFac:.8,loadMode:2,loadHidden:false,ricTimeout:0,throttleDelay:125};d=a.lazySizesConfig||a.lazysizesConfig||{};for(b in c)b in d||(d[b]=c[b])}(),!b||!b.getElementsByClassName)return{init:function(){},cfg:d,noSupport:!0};var e=b.documentElement,f=a.Date,g=a.HTMLPictureElement,h="addEventListener",i="getAttribute",j=a[h],k=a.setTimeout,l=a.requestAnimationFrame||k,m=a.requestIdleCallback,n=/^picture$/i,o=["load","error","lazyincluded","_lazyloaded"],p={},q=Array.prototype.forEach,r=function(a,b){return p[b]||(p[b]=new RegExp("(\\s|^)"+b+"(\\s|$)")),p[b].test(a[i]("class")||"")&&p[b]},s=function(a,b){r(a,b)||a.setAttribute("class",(a[i]("class")||"").trim()+" "+b)},t=function(a,b){var c;(c=r(a,b))&&a.setAttribute("class",(a[i]("class")||"").replace(c," "))},u=function(a,b,c){var d=c?h:"removeEventListener";c&&u(a,b),o.forEach(function(c){a[d](c,b)})},v=function(a,d,e,f,g){var h=b.createEvent("Event");return e||(e={}),e.instance=c,h.initEvent(d,!f,!g),h.detail=e,a.dispatchEvent(h),h},w=function(b,c){var e;!g&&(e=a.picturefill||d.pf)?(c&&c.src&&!b[i]("srcset")&&b.setAttribute("srcset",c.src),e({reevaluate:!0,elements:[b]})):c&&c.src&&(b.src=c.src)},x=function(a,b){return(getComputedStyle(a,null)||{})[b]},y=function(a,b,c){for(c=c||a.offsetWidth;c<d.minSize&&b&&!a._lazysizesWidth;)c=b.offsetWidth,b=b.parentNode;return c},z=function(){var a,c,d=[],e=[],f=d,g=function(){var b=f;for(f=d.length?e:d,a=!0,c=!1;b.length;)b.shift()();a=!1},h=function(d,e){a&&!e?d.apply(this,arguments):(f.push(d),c||(c=!0,(b.hidden?k:l)(g)))};return h._lsFlush=g,h}(),A=function(a,b){return b?function(){z(a)}:function(){var b=this,c=arguments;z(function(){a.apply(b,c)})}},B=function(a){var b,c=0,e=d.throttleDelay,g=d.ricTimeout,h=function(){b=!1,c=f.now(),a()},i=m&&g>49?function(){m(h,{timeout:g}),g!==d.ricTimeout&&(g=d.ricTimeout)}:A(function(){k(h)},!0);return function(a){var d;(a=!0===a)&&(g=33),b||(b=!0,d=e-(f.now()-c),d<0&&(d=0),a||d<9?i():k(i,d))}},C=function(a){var b,c,d=99,e=function(){b=null,a()},g=function(){var a=f.now()-c;a<d?k(g,d-a):(m||e)(e)};return function(){c=f.now(),b||(b=k(g,d))}},D=function(){var g,l,m,o,p,y,D,F,G,H,I,J,K=/^img$/i,L=/^iframe$/i,M="onscroll"in a&&!/(gle|ing)bot/.test(navigator.userAgent),N=0,O=0,P=0,Q=-1,R=function(a){P--,(!a||P<0||!a.target)&&(P=0)},S=function(a){return null==J&&(J="hidden"==x(b.body,"visibility")),J||"hidden"!=x(a.parentNode,"visibility")&&"hidden"!=x(a,"visibility")},T=function(a,c){var d,f=a,g=S(a);for(F-=c,I+=c,G-=c,H+=c;g&&(f=f.offsetParent)&&f!=b.body&&f!=e;)(g=(x(f,"opacity")||1)>0)&&"visible"!=x(f,"overflow")&&(d=f.getBoundingClientRect(),g=H>d.left&&G<d.right&&I>d.top-1&&F<d.bottom+1);return g},U=function(){var a,f,h,j,k,m,n,p,q,r,s,t,u=c.elements;if((o=d.loadMode)&&P<8&&(a=u.length)){for(f=0,Q++;f<a;f++)if(u[f]&&!u[f]._lazyRace)if(!M||c.prematureUnveil&&c.prematureUnveil(u[f]))aa(u[f]);else if((p=u[f][i]("data-expand"))&&(m=1*p)||(m=O),r||(r=!d.expand||d.expand<1?e.clientHeight>500&&e.clientWidth>500?500:370:d.expand,c._defEx=r,s=r*d.expFactor,t=d.hFac,J=null,O<s&&P<1&&Q>2&&o>2&&!b.hidden?(O=s,Q=0):O=o>1&&Q>1&&P<6?r:N),q!==m&&(y=innerWidth+m*t,D=innerHeight+m,n=-1*m,q=m),h=u[f].getBoundingClientRect(),(I=h.bottom)>=n&&(F=h.top)<=D&&(H=h.right)>=n*t&&(G=h.left)<=y&&(I||H||G||F)&&(d.loadHidden||S(u[f]))&&(l&&P<3&&!p&&(o<3||Q<4)||T(u[f],m))){if(aa(u[f]),k=!0,P>9)break}else!k&&l&&!j&&P<4&&Q<4&&o>2&&(g[0]||d.preloadAfterLoad)&&(g[0]||!p&&(I||H||G||F||"auto"!=u[f][i](d.sizesAttr)))&&(j=g[0]||u[f]);j&&!k&&aa(j)}},V=B(U),W=function(a){var b=a.target;if(b._lazyCache)return void delete b._lazyCache;R(a),s(b,d.loadedClass),t(b,d.loadingClass),u(b,Y),v(b,"lazyloaded")},X=A(W),Y=function(a){X({target:a.target})},Z=function(a,b){try{a.contentWindow.location.replace(b)}catch(c){a.src=b}},$=function(a){var b,c=a[i](d.srcsetAttr);(b=d.customMedia[a[i]("data-media")||a[i]("media")])&&a.setAttribute("media",b),c&&a.setAttribute("srcset",c)},_=A(function(a,b,c,e,f){var g,h,j,l,o,p;(o=v(a,"lazybeforeunveil",b)).defaultPrevented||(e&&(c?s(a,d.autosizesClass):a.setAttribute("sizes",e)),h=a[i](d.srcsetAttr),g=a[i](d.srcAttr),f&&(j=a.parentNode,l=j&&n.test(j.nodeName||"")),p=b.firesLoad||"src"in a&&(h||g||l),o={target:a},s(a,d.loadingClass),p&&(clearTimeout(m),m=k(R,2500),u(a,Y,!0)),l&&q.call(j.getElementsByTagName("source"),$),h?a.setAttribute("srcset",h):g&&!l&&(L.test(a.nodeName)?Z(a,g):a.src=g),f&&(h||l)&&w(a,{src:g})),a._lazyRace&&delete a._lazyRace,t(a,d.lazyClass),z(function(){var b=a.complete&&a.naturalWidth>1;p&&!b||(b&&s(a,"ls-is-cached"),W(o),a._lazyCache=!0,k(function(){"_lazyCache"in a&&delete a._lazyCache},9)),"lazy"==a.loading&&P--},!0)}),aa=function(a){if(!a._lazyRace){var b,c=K.test(a.nodeName),e=c&&(a[i](d.sizesAttr)||a[i]("sizes")),f="auto"==e;(!f&&l||!c||!a[i]("src")&&!a.srcset||a.complete||r(a,d.errorClass)||!r(a,d.lazyClass))&&(b=v(a,"lazyunveilread").detail,f&&E.updateElem(a,!0,a.offsetWidth),a._lazyRace=!0,P++,_(a,b,f,e,c))}},ba=C(function(){d.loadMode=3,V()}),ca=function(){3==d.loadMode&&(d.loadMode=2),ba()},da=function(){if(!l){if(f.now()-p<999)return void k(da,999);l=!0,d.loadMode=3,V(),j("scroll",ca,!0)}};return{_:function(){p=f.now(),c.elements=b.getElementsByClassName(d.lazyClass),g=b.getElementsByClassName(d.lazyClass+" "+d.preloadClass),j("scroll",V,!0),j("resize",V,!0),a.MutationObserver?new MutationObserver(V).observe(e,{childList:!0,subtree:!0,attributes:!0}):(e[h]("DOMNodeInserted",V,!0),e[h]("DOMAttrModified",V,!0),setInterval(V,999)),j("hashchange",V,!0),["focus","mouseover","click","load","transitionend","animationend"].forEach(function(a){b[h](a,V,!0)}),/d$|^c/.test(b.readyState)?da():(j("load",da),b[h]("DOMContentLoaded",V),k(da,2e4)),c.elements.length?(U(),z._lsFlush()):V()},checkElems:V,unveil:aa,_aLSL:ca}}(),E=function(){var a,c=A(function(a,b,c,d){var e,f,g;if(a._lazysizesWidth=d,d+="px",a.setAttribute("sizes",d),n.test(b.nodeName||""))for(e=b.getElementsByTagName("source"),f=0,g=e.length;f<g;f++)e[f].setAttribute("sizes",d);c.detail.dataAttr||w(a,c.detail)}),e=function(a,b,d){var e,f=a.parentNode;f&&(d=y(a,f,d),e=v(a,"lazybeforesizes",{width:d,dataAttr:!!b}),e.defaultPrevented||(d=e.detail.width)&&d!==a._lazysizesWidth&&c(a,f,e,d))},f=function(){var b,c=a.length;if(c)for(b=0;b<c;b++)e(a[b])},g=C(f);return{_:function(){a=b.getElementsByClassName(d.autosizesClass),j("resize",g)},checkElems:g,updateElem:e}}(),F=function(){!F.i&&b.getElementsByClassName&&(F.i=!0,E._(),D._())};return k(function(){d.init&&F()}),c={cfg:d,autoSizer:E,loader:D,init:F,uP:w,aC:s,rC:t,hC:r,fire:v,gW:y,rAF:z}});

/**
 * dFlick ver.2
 * Android 4.1-/iPhone5 ios7-
 * /
/**
 * Originally: Swiper 3.4.1 http://www.idangero.us/swiper/
 * Copyright 2016, Vladimir Kharlampidi
 * Licensed under MIT
 * thanks!
 */
(function($, window, undefined){
'use strict';

//汎用関数群
var strUA = navigator.userAgent.toLowerCase();
var dfCom = {
	//ベンダープリフィクス
	VENDOR_PREFIX: (function(){
		var div = document.createElement('div'),
			prefixes = ['O', 'Moz', 'webkit'];
		if('transform' in div.style){
			return '';
		}else{
			var n = prefixes.length;
			while(n--){
				if ((prefixes[n] + 'Transform') in div.style){
					return '-' + prefixes[n].toLowerCase() + '-';
				}
			}
		}
		return '';
	}()),
	/**
	 * transitionスタイルの設定
	 * 引数：対象要素[Element], 設定するプロパティ値[String](省略した場合はスタイルを解除する)
	 */
	setTransition: function(el, propaty){
		var elStyle = el.style;
		elStyle.webkitTransition = elStyle.MozTransition = elStyle.transition = propaty || '';
	},
	/**
	 * transformスタイルの設定
	 * 引数：対象要素[Element], 設定するプロパティ値[String]
	 */
	setTransform: function(el, propaty){ 
		var elStyle = el.style;
		elStyle.webkitTransform = elStyle.MozTransform = elStyle.transform = propaty;
	},
	/**
	 * translateのX座標の設定
	 * 引数：対象要素[Element], 設定するX座標[String||Number]
	 */
	setTranslate3dX: function(el, x){
		this.setTransform(el, 'translate3d('+ x +'px,0,0)');
	},
	/**
	 * translateのXY座標の取得
	 * 引数：対象要素[Element]
	 * 戻り値：XY座標[Object]({x:X座標,y:Y座標})
	 */
	getTranslate: function (el) {
		var matrix, curTransform, curStyle, transformMatrix, res;

		curStyle = window.getComputedStyle(el, null);
		if (window.WebKitCSSMatrix) {
			curTransform = curStyle.transform || curStyle.webkitTransform;
			if (curTransform.split(',').length > 6) {
				curTransform = curTransform.split(', ').map(function(a){
					return a.replace(',','.');
				}).join(', ');
			}
			transformMatrix = new window.WebKitCSSMatrix(curTransform === 'none' ? '' : curTransform);
		}else{
			transformMatrix = curStyle.MozTransform || curStyle.OTransform || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
			matrix = transformMatrix.toString().split(',');
		}
		if(window.WebKitCSSMatrix){
			res = { x: transformMatrix.m41 || 0, y: transformMatrix.m42 || 0 };
		}else{
			res = { x: parseFloat(matrix[4]) || 0, y: parseFloat(matrix[5]) || 0 };
		}
		return res;
	},
	/**
	 * 要素の絶対座標を取得
	 * 引数：対象要素[Element]
	 * 戻り値：XY座標[Object]({top:上辺,left:左辺,right:右辺,bottom:下辺})
	 */
	getRect: function(el){
		var rect = el.getBoundingClientRect(),
			t = rect.top + window.pageYOffset,
			l = rect.left + window.pageXOffset,
			r = l + rect.width,
			b = t + rect.height;
		return {top: t, left: l, right: r, bottom: b};
	},
	/**
	 * 指定のセレクターに合致する要素か確認
	 * 引数：対象要素[Element], CSSセレクタ[String], 親要素[Element=document]
	 * 戻り値：合否[Boolean](true:合/false:否)
	 */
	is: function(el, selector, parentEl){ 
		if (el.matches) return el.matches(selector);
		if(el.webkitMatchesSelector) return el.webkitMatchesSelector(selector);
		if (el.mozMatchesSelector) return el.mozMatchesSelector(selector);
		if (el.oMatchesSelector) return el.oMatchesSelector(selector);
		
		var elList = (parentEl || document).querySelectorAll(selector),
			n = elList.length;
		while(n-- && elList[n] !== el){}
		return n > -1;
	},
	/**
	 * 要素のクラスの有無を切り替える  ※一部の標ブラでclassList.toggleの動作に不具合有り
	 * 引数：対象要素[Element], クラス名[String], スイッチ値[boolean](true:追加/false削除)
	 * 戻り値：スイッチ値[Boolean]
	 */
	toggleClass: function(el, cName, flg){
		if(flg){ el.classList.add(cName) }
		else{ el.classList.remove(cName) }
		return flg;
	}
};


/**
 *
 * Flick
 *
 */
var $win = $(window),
	SWIPE_RATIO = 0.4, //スワイプ判定量
	SWIPE_SLOPE = 60, //移動方向の傾き;
	//タッチイベント用
	isScroll,
	touchEndTimer,
	formElements = ['input', 'select', 'textarea', 'button', 'video'],
	isTouchEvent,
	//iOS
	IOS = /iphone|ipad/.test(strUA),
	//SC-02E(sブラ)
	OLD_HS = /^(?!.*chrome).*(?=sc-02e).+$/.test(strUA);

function dFlick(setting){
	if(!(this instanceof dFlick)) return new dFlick(setting);
	
	this.name = setting.name || setting.container;
	this.container = document.getElementById(setting.container); //ID指定限定

	// 特設タブ
	this.spTab = setting.specialTab || null;
	
	//タブ・矢印・スライドの取得
	var currentIndex = setting.defaultIndex | 0;
	this.length = 0;
	
	this._tab = new dfTab(this.container, this.name, currentIndex, (typeof setting.fixedHed === 'boolean' ? setting.fixedHed: true), this.spTab);
	this._arrow = new dfArrow(this._tab.hed, this.name);
	this._slide = new dfSlide(this, this.container, this.name, currentIndex);
	
	if(this._tab.length !== this.length) throw '「'+ setting.container +'」内のタブとスライドの個数が異なるようですよ！@dFlick';
	
	//タッチスワイプ処理関連
	this._pos = {
		start: {x: 0, y: 0},
		end: {x: 0, y: 0},
		distance: {x: 0, y:0}
	};
	this._startTime;
	this._isTouched = false;
	this._isMoved = false;
	this._isReached = false;
	this._direction = null;
	this._win = {width: 0, height: 0};
	this._breakPoint;
	
	this._scrollEventOff = false;
	//スクロール位置保存の有無
	this._memoryPos = typeof setting.memoryPos === 'boolean' ? setting.memoryPos : true;
	//最初・最終スライドへ到達した際に、親エリアへ受け渡すか
	this._transferParent = typeof setting.transferParent === 'boolean' ? setting.transferParent: false;
	//タブの表示位置をずらすか
	this._offsetTab = (setting.offsetTab |0) || 0;
	//表示位置変更可否
	this._allowMovePos = typeof setting.allowMovePos === 'boolean' ? setting.allowMovePos: true;
	//コールバック関数
	this.changeBefore = typeof setting.changeBefore === 'function' ? setting.changeBefore :function(){};
	this.changeAfter = typeof setting.changeAfter === 'function' ? setting.changeAfter :function(){};
	this.clickChangeAfter = typeof setting.clickChangeAfter === 'function' ? setting.clickChangeAfter :function(){};
	this.flickChangeAfter = typeof setting.flickChangeAfter === 'function' ? setting.flickChangeAfter :function(){};
	this.scrolled = typeof setting.scrolled === 'function' ? setting.scrolled :function(){};

	//フリック可能か
	this._FLICKABLE = typeof setting.flick === 'boolean' ? setting.flick: true;
	
	//イベントセット
	if(this._FLICKABLE){
		//タッチ・マウスイベント
		$(this.container).on({
			'touchstart': $.proxy(this._onTouchStart, this),
			'touchmove': $.proxy(this._onTouchMove, this),
			'touchend touchcancel': $.proxy(this._onTouchEnd, this)
		});
	}
	//タブクリック
	$(this._tab.tab).on('click', $.proxy(this._onTabClick, this));
	$win.on({
		'resize': $.proxy(this._onResize, this),
		'scroll load': $.proxy(this._onScroll, this)
	});
	this._updateBreakPoint();
	
	if(typeof setting.initAfter === 'function') setting.initAfter(currentIndex, this.currentSlide());
}

dFlick.prototype = {
/*-- 閾値の更新 --*/
_updateBreakPoint: function(){
	var w = this._win.width = $win.width();
	this._win.height = $win.height();
	this._breakPoint = w * SWIPE_RATIO;
},
/*-- リサイズ時の初期化処理 --*/
_onResize: function(){
	var self = this,
		resizeFnc = function(){
			if(self._win.width == $win.width()) return;
			self._updateBreakPoint();
			self._tab.init();
			self._onScroll();
			//タッチ動作リセット
			self._arrow.hide();
			self._lock(false);
		};
	if(IOS){
		setTimeout(resizeFnc, 100);
	}else{
		resizeFnc();
	}
},
/*-- タブクリック --*/
_onTabClick: function(e){
	if(this._FLICKABLE && this._tab.isMoving()) return;
	var target = e.target, index;
	while(target && !target.dataset.dfIndex){target = target.parentElement;}
	if(!target) return;
	index = target.dataset.dfIndex | 0;
	if(index !== this.currentIndex()){
		if(this[index].id === this.spTab) {
			var res = this.changeSpecialTab(index);
		} else {
			var res = this.moveSlide(index);
		}
		this.clickChangeAfter(res.index, res.slide, res.preIndex, res.preSlide);
	}else{
		if(this._allowMovePos) this.scrollTo();
	}
	e.preventDefault();
	e.stopPropagation();
	return;
},
/*-- タッチスタート --*/
_onTouchStart: function(e){
	if (e.originalEvent) e = e.originalEvent;
	isTouchEvent = e.type === 'touchstart';
	if (!isTouchEvent && 'which' in e && e.which === 3) return; //マウス右クリックイベント

	if(e.stopTransfer) return;
	//タブエリアタッチ
	if(this._tab.contains(e.target)){
		e.stopTransfer = true;
		return;
	}
	if(!this._transferParent) e.stopTransfer = true;
	if(this._isTouched) return;
	this._isTouched = true;

	//開始位置
	this._pos.start.x = isTouchEvent ? e.targetTouches[0].pageX : e.pageX;
	this._pos.start.y = isTouchEvent ? e.targetTouches[0].pageY : e.pageY;
	this._startTime =  Date.now();
	this._pos.distance.x = this._pos.distance.y = 0;
	
	this._isMoved = this._isReached = this._isClick = false;
	isScroll = this._direction = null;
},
/*-- タッチムーブ --*/
_onTouchMove: function(e){
	if(touchEndTimer) this._clearTouchEndTimer();
	if(e.originalEvent) e = e.originalEvent;
	if(isTouchEvent && e.type === 'mousemove') return;

	//2点でタッチ
	if(e.touches && e.touches.length > 1) return;
	
	this._pos.end.x = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
	this._pos.end.y = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;

	this._pos.distance.x = this._pos.end.x - this._pos.start.x;
	this._pos.distance.y = this._pos.end.y - this._pos.start.y;

	if(!this._isTouched) return;
	//スクロール判定(初回のみ)
	if(isScroll === null){
		var angle = Math.atan2(Math.abs(this._pos.distance.y), Math.abs(this._pos.distance.x)) * 180 / Math.PI;
		isScroll = (90 - angle) < SWIPE_SLOPE;
	}
	if(isScroll){
		this._isTouched = false;
		if(!touchEndTimer) this._setTouchEndTimer(e, 200);
		return;
	}
	e.preventDefault();

	//初回のMove処理
	if(!this._isMoved){
		this._lock(true);//クリックロック
		this._tab.touchStart();
		if(~formElements.indexOf(document.activeElement.tagName.toLowerCase())) document.activeElement.blur();
	}
	this._isMoved = true;
	var diffX = -(this._pos.distance.x);
	this._direction = !(diffX < 0) - !(diffX > 0);

	//親エリアへの伝達
	if(this._transferParent){
		if(this._direction < 0 && !this._slide.hasPrev() || this._direction > 0 && !this._slide.hasNext()){
			return;
		}
	}
	e.stopPropagation();//伝播阻止

	this._tab.touchMove(this._direction, diffX / this._win.width);
	this._isReached = this._breakPoint < Math.abs(this._pos.distance.x);
	
	//arrow
	if(this._isReached){ this._arrow.show(this._direction); }
	else{ this._arrow.hide(); }
},
/*-- タッチエンド --*/
_onTouchEnd: function(e){
	if(touchEndTimer) this._clearTouchEndTimer();
	if (e.originalEvent) e = e.originalEvent;
	
	if(!this._isTouched) return;
	//クリックイベント
	if(this._isTouched && !this._isMoved){
		if(~formElements.indexOf(e.target.tagName.toLowerCase())){
			e.target.focus();
		}else if(~formElements.indexOf(document.activeElement.tagName.toLowerCase())){
			document.activeElement.blur();
		}
	}
	
	var endTime = Date.now(),
		timeDiff = endTime - this._startTime,
		isFlicked = !(!this._isTouched || !this._isMoved || this._direction === null || this._pos.distance.x === 0),
		newIndex = this.currentIndex();
	//フリック判定
	this._isTouched = this._isMoved = false;
	if(isFlicked) isFlicked = this._isReached || (timeDiff < 300 && Math.abs(this._pos.distance.x) > 50);
	
	if(isFlicked){
		if(this._transferParent){
			if(this._direction < 0 && this._slide.hasPrev()){
				newIndex = this._slide.prevIndex();
			}else if(this._direction > 0 && this._slide.hasNext()){
				newIndex = this._slide.nextIndex();
			}
		}else{
			if(this._direction < 0){
				newIndex = this._slide.prevIndex();
			}else if(this._direction > 0){
				newIndex = this._slide.nextIndex();
			}
			e.stopPropagation();
		}
		if(newIndex !== this._slide.current().index){
			if(this[newIndex].id === this.spTab) {
				this._tab.touchEnd(this.currentIndex());

				var res = this.changeSpecialTab(newIndex);
			} else {
				var res = this.moveSlide(newIndex);
			}
			this.flickChangeAfter(res.index, res.slide, res.preIndex, res.preSlide);
		}
	}else{
		this._tab.touchEnd(newIndex);
	}
	this._arrow.hide();
	this._lock(false);
},
/*-- タッチエンドが発火しない端末用 --*/
//touchmoveをpreventDefaultせずに抜けた場合に、touchendが発火しない標ブラがある
_setTouchEndTimer: function(e, duration){
	var self = this;
	touchEndTimer = setTimeout(function(){
		$(self.container).trigger('touchend');
	}, duration);
},
_clearTouchEndTimer: function(){
	clearTimeout(touchEndTimer);
	touchEndTimer = null;
},
/*-- スクロール --*/
_onScroll: function(){
	var winPos = window.pageYOffset,
		endPos = dfCom.getRect(this.container).bottom - this._offsetTab;
	
	//タブの固定
	this._tab.fix(this._offsetTab);
	this._tab.hide(winPos > endPos);
	
	if(this._scrollEventOff) return;
	this.scrolled(winPos, this._win.height, this._slide.current().element);
},
/*-- クリックロック --*/
_lock: function(flg){
	return dfCom.toggleClass(this.container, 'df_wrp-lock', flg);
},
/*----------- global method -------------*/
/*-- スライド変更 --*/
moveSlide: function(newIndex, option){
	newIndex = newIndex |0;
	if(!this._slide.has(newIndex)){
		console.log(newIndex + '番のスライドはありません。');
		return null;
	}
	
	//スクロール位置の保存
	var winPos = window.pageYOffset,
		tabH = this._tab.getHeight(),
		endPos = this._slide.getRect().bottom - this._offsetTab,
		resetPos = winPos + tabH;
	if(!this._memoryPos || (endPos - resetPos) < 100){
		this._slide.setPos(this._tab.getRect().top - this._offsetTab);
	}else{
		this._slide.setPos(winPos);
	}
	
	//切り替え中はスクロールのコールバックイベントオフ
	this._scrollEventOff = true;
	var preIndex = this.currentIndex(),
		preSlide = this.currentSlide();
	
	this.changeBefore(newIndex, this[newIndex], preIndex, preSlide);
	this._tab.change(newIndex, !this._FLICKABLE);
	var newSlide = this._slide.change(newIndex);
	
	if(!option) option = {scrollOff: false};
	if(this._allowMovePos && !option.scrollOff) this.scrollTo(option.pos, option.speed);
	
	var self = this;
	setTimeout(function(){
		if(self) self._scrollEventOff = false;
	}, 0);
	
	this.changeAfter(newIndex, newSlide, preIndex, preSlide);
	
	return {index:newIndex, slide:newSlide, preIndex:preIndex, preSlide:preSlide};
},
/*-- 1番目に追加される特設タブ（別ページ遷移系） --*/
changeSpecialTab: function(newIndex){
	var preIndex = this.currentIndex(),
		preSlide = this.currentSlide();
	this.changeBefore(newIndex, this[newIndex], preIndex, preSlide);

	return {index:newIndex, slide:this[newIndex], preIndex:preIndex, preSlide:preSlide};
},
/*-- スクロール --*/
scrollTo: function(pos, duration){
	if(pos === undefined || pos === null){
		var hedPos = this._tab.getRect().top - this._offsetTab,
			slidePos = this._slide.getPos();
		pos = slidePos < hedPos ? hedPos: slidePos;
	}else{
		pos = pos|0;
	}
	if(!duration){
		window.scroll(0, pos);
		return;
	}
	duration = duration | 0;
	$('html,body').stop().animate({scrollTop: pos}, duration);
},
/*-- タブの座標取得 --*/
getTabPos: function(){
	return this._tab.getRect().top;
},
/*-- スライドの検索 --*/
findSlide: function(selector){
	var res = this._slide.find(selector);
	return (res ? res.element: null);
},
/*-- インデックスの取得 --*/
findIndex: function(selector){
	var res = this._slide.find(selector);
	return (res ? res.index: null);
},
/*-- 現在のスライド --*/
currentSlide: function(){
	return this._slide.current().element;
},
/*-- 現在のインデックス --*/
currentIndex: function(){
	return this._slide.current().index;
},
/*-- 次へ --*/
moveNext: function(){
	this.moveSlide(this._slide.nextIndex());
},
/*-- 前へ --*/
movePrev: function(){
	this.moveSlide(this._slide.prevIndex());
},
splice: [].splice //ArrayLike化用
};//dFlick.prototype


/*
 * Tab
 *
 */
function dfTab(parentEl, name, current, fixFlg, spTab){
	this.name = name + '_tab';
	
	this.hed = parentEl.querySelector('.df_hed');
	this.fixHed = this.hed.querySelector('.df_hed-inner');
	this.$mask = $(this.fixHed.querySelector('.df_tab-mask'));
	this.tab = this.fixHed.querySelector('.df_tab');
	this.pointer = new dfPointer(this.fixHed);
	this.navArrow = this.hed.querySelector('.df_navArrow-wrp') ? new dfNavArrow(this.hed) : null;

	this.shiftW = 0;
	this.maxScroll = 0;
	this.strPos = 0;
	this.isFix = false;
	this.isHide = false;
	this.currentIndex = current |0;
	this.spTab = spTab;
	this.tabWidth = 0;
	this.spSizeWidth = 743;
	
	//タブ
	this.items = $(this.tab).children('.df_tab-item').toArray()
	var n = this.length = this.items.length;
	while(n--){ this.items[n].dataset.dfIndex = n; }
	
	//タブエリアを固定・非表示にしない
	if(!fixFlg){
		this.fix = function(){return false};
		this.hide = function(){return false};
	}
	
	this.init();

	//タブ矢印表示
	if(this.navArrow){
		this.showNavArrow();
		$(this.$mask).on({
			'scroll': $.proxy(this.showNavArrow, this)
		});
	}
}
dfTab.prototype = {
//ウィンドウ幅に基づく設定
init: function(){
	var winW = window.innerWidth;
	// 見切れとして+0.3タブ分表示されるようにする（360以下：5.3、360～560：6.3、560以上：各タブ幅80基準として極端に広くなりすぎない幅+見切れ）
	if(360 > winW) {
		var baseRate= 10 * 5.3;
	} else if(winW >= 360 && 560 > winW) {
		var baseRate= 10 * 6.3;
	} else {
		var baseRate = 10 * (~~(winW / 80) + 0.3);
	}
	this.tabWidth = winW * 10 / baseRate;
	$('.genrTab_inner').css('width', this.tabWidth +'px');

	var tabWrpW = this.tab.scrollWidth;
	var complementaryWidth = this.hed.clientWidth - this.fixHed.clientWidth; //PC時の左右の余白分

	this.maxScroll = tabWrpW - this.hed.clientWidth + complementaryWidth;
	this.shiftW = this.maxScroll / (this.length - 1) ;
	if(OLD_HS) this.fixHed.style.width = winW + 'px';
	if(this.navArrow){this.showNavArrow();}
	this.change(this.currentIndex, true);
},
showNavArrow: function(){
	this.navArrow.maxScroll = this.maxScroll;
	this.navArrow.show(this.$mask[0].scrollLeft);
},
//タッチ開始
touchStart: function(){
	this.pointer.init();
	this.$mask[0].scrollLeft = this.strPos = this.shiftW * this.currentIndex;
},
//タッチ移動
touchMove: function(direction, rate){
	var newIndex = this.currentIndex + direction,
		scrollLeft = this.$mask[0].scrollLeft;
	
	if(newIndex < 0 || newIndex >= this.length) newIndex = this.currentIndex;

	if((scrollLeft !== 0 || direction > 0) && (scrollLeft !== this.maxScroll || direction < 0)){
		this.$mask[0].scrollLeft = this.strPos + (this.shiftW * rate);
	}
	this.pointer.move(this.items[newIndex].offsetWidth, rate);
},
//タッチ終了
touchEnd: function(index){
	this.change(index);
},
//変更
change: function(newIndex, effectOff){

	var tab = this.items[newIndex],
		duration = effectOff ? 0 : 200;

	this.pointer.change(tab.offsetLeft, tab.offsetWidth, effectOff);
	
	//スクロールアニメーション
	if(this.shiftW > 0){
		if(newIndex <= 2 || this.spTab && newIndex === 1){// 左から3つ目までのタブはフォーカス時、左端になるようにしている
			this.$mask.stop().animate({'scrollLeft': 0}, duration);
		}else{
			this.$mask.stop().animate({'scrollLeft': this.shiftW * newIndex}, duration);
		}
	}

	this.items.forEach(function(el, index){
		dfCom.toggleClass(el, 'df_isCurrent_tab', index === newIndex);
	});
	this.currentIndex = newIndex;
},
//状態の確認
isMoving: function(){
	return Math.abs(this.items[this.currentIndex].offsetLeft - this.pointer.getTranslate()) > 2;
},
//固定
fix: function(offset){
	this.isFix = (this.hed.getBoundingClientRect().top - offset) < 0;
	if(IOS) dfCom.toggleClass(this.fixHed, 'df_hed-ios', !this.isFix);
	return dfCom.toggleClass(this.hed, 'df_isFix_tab', this.isFix);
},
//非表示
hide: function(flg){
	return dfCom.toggleClass(this.hed, 'df_isHide_tab', this.isHide = flg);
},
//絶対位置
getRect: function(){
	return dfCom.getRect(this.hed);
},
//高さまたは再描画
getHeight: function(){
	return this.hed.offsetHeight;
},
//子孫要素か
contains: function(el){
	return this.hed.contains(el);
}
};//dfTab.prototype


/*
 * Pointer
 *
 */
function dfPointer(parentEl){
	this.el = parentEl.querySelector('.df_pointer');
	this.strPos = 0;
	this.strWidth = 0;
}
dfPointer.prototype = {
//初期化
init: function(){
	dfCom.setTransition(this.el, '');
	this.strPos = this.getTranslate();
	this.strWidth = this.el.offsetWidth;
},
//移動
move: function(tabW, rate){
	var moveW = this.strPos + ((rate > 0 ? this.strWidth : tabW) * rate),
		newW = this.strWidth + ((tabW - this.strWidth) * Math.abs(rate));
	this.set(moveW, newW);
},
//切り替え
change: function(pos, tabW, effectOff){
	var duration = effectOff ? '0s': '0.2s',
		propaty = dfCom.VENDOR_PREFIX + 'transform '+ duration +' ease-out, width '+ duration +' ease-out';
	dfCom.setTransition(this.el, propaty);
	this.set(pos, tabW);
},
//現在の位置
getTranslate: function(){
	return dfCom.getTranslate(this.el).x;
},
//位置と幅の指定
set: function(p, w){
	dfCom.setTranslate3dX(this.el, p);
	this.el.style.width = w + 'px';
}
};//dfPointer.prototype


/*
 * Arrow
 *
 */
function dfArrow(parentEL, name){
	this.name = name + '_arrow';
	this.el = parentEL.querySelector('.df_arrow');
	this.isShowing = false;
}
dfArrow.prototype = {
//表示
show: function(direction){
	dfCom.toggleClass(this.el, 'df_isPreve_arrow', direction < 0);
	dfCom.toggleClass(this.el, 'df_isNext_arrow', direction > 0);
	this.isShowing = true;
},
//非表示
hide: function(){
	this.el.classList.remove('df_isPreve_arrow');
	this.el.classList.remove('df_isNext_arrow');
	this.isShowing = false;
}
};//dfArrow.prototype


/*
 * navArrow
 *
 */
 function dfNavArrow(parentEL){
	this.$mask = $(parentEL.querySelector('.df_tab-mask'));
	this.tab = parentEL.querySelector('.df_tab-item');
	this.leftArrow = parentEL.querySelector('.df_navArrow-left');
	this.rightArrow = parentEL.querySelector('.df_navArrow-right');
	this.posX = this.$mask[0].scrollLeft; //タブのX軸位置
	this.tabW = this.tab.offsetWidth; //タブ1つ分の横幅
	this.maxScroll = 0; //最大スクロール量
	this.time = 400; //効果時間

	$(this.leftArrow).on({'click': $.proxy(this.moveLeft, this)});
	$(this.rightArrow).on({'click': $.proxy(this.moveRight, this)});
}
dfNavArrow.prototype = {
//表示
show: function(scrollLeft){
	dfCom.toggleClass(this.leftArrow, 'is_show', 5 < scrollLeft);
	dfCom.toggleClass(this.rightArrow, 'is_show', scrollLeft < this.maxScroll-5);
	this.posX = scrollLeft;
},
//左端へ移動
moveLeft: function(){
	this.$mask.stop().animate({'scrollLeft': this.posX -= this.tabW}, this.time);
},
//右端へ移動
moveRight: function(){
	this.$mask.stop().animate({'scrollLeft': this.posX += this.tabW}, this.time);
}
};//dfNavArrow.prototype


/*
 * Slide
 * 
 */
function dfSlide(_dFlick, parentEl, name, currentIndex){
	this.name = name + '_slide';
	this.data = _dFlick;
	this.mask = parentEl.querySelector('.df_slide-mask');
	this.currentIndex = currentIndex | 0;
	this.pos = [];

	//各スライドオブジェクトの取得
	var $slides = $(this.mask).children('.df_slide-item'),
		len = $slides.length;
	for(var i = 0; i < len; i++){
		$slides[i].dataset.dfIndex = i;
		this.push($slides[i]);
	}
	this.change(this.currentIndex);
}
dfSlide.prototype = {
//スライド配列の追加
push: function(item){
	var n = this.data.length;
	this.data[n] = item;
	return this.data.length = ++n;
},
//順次処理 return false で中断するよ
forEach: function(callback){
	for(var i = 0, len = this.data.length; i < len; i++){
		if(callback(this.data[i], i) === false) break;
	}
},
//有効なインデックスか
has: function(index){
	return (index >= 0) && (index < this.data.length);
},
//前にスライドが存在するか
hasPrev: function(){
	return this.currentIndex > 0;
},
//次にスライドが存在するか
hasNext: function(){
	return this.currentIndex < (this.data.length - 1);
},
//前のインデックス
prevIndex: function(){
	if(!this.hasPrev()) return this.data.length - 1;
	return this.currentIndex - 1;
},
//次のインデックス
nextIndex: function(){
	if(!this.hasNext()) return 0;
	return this.currentIndex + 1;
},
//現在のスライド
current: function(){
	return {element: this.data[this.currentIndex], index: this.currentIndex};
},
//スライドの検索
find: function(selector){
	var res, found = false, self = this;
	this.forEach(function(el, index){
		if(found = dfCom.is(el, selector, self.mask)){
			res = {element: el, index: index};
			return false;
		}
	});
	if(!found) console.log('スライド「'+ selector + '」はありません。');
	return res;
},
//スライドの変更
change: function(newIndex){
	var prevSlide = this.data[this.currentIndex],
		nextSlide = this.data[newIndex],
		prevHeight = prevSlide.offsetHeight,
		nextHeight = nextSlide.offsetHeight;
	
	this.mask.style.minHeight = (prevHeight > nextHeight ? nextHeight : prevHeight) + 'px';
	
	//クラスの付け替え
	this.forEach(function(slide, index){
		var flg = index === newIndex;
		dfCom.toggleClass(slide, 'df_isCurrent_slide', flg);
		dfCom.toggleClass(slide, 'df_isInactive_slide', !flg);
	});
	
	this.mask.style.minHeight = '';
	this.currentIndex = newIndex;

	return this.data[this.currentIndex];
},
//スクロール位置の保存
setPos: function(pos){
	this.pos[this.currentIndex] = pos|0;
},
//スクロール位置の取得
getPos: function(){
	var res = this.pos[this.currentIndex];
	return res === undefined ? null: res;
},
//絶対位置の取得
getRect: function(){
	return dfCom.getRect(this.mask);
}
};//dfSlide.prototype

window.dFlick = dFlick;

}(jQuery, this));

/**
 * Swiper 4.5.0
 * Most modern mobile touch slider and framework with hardware accelerated transitions
 * http://www.idangero.us/swiper/
 *
 * Copyright 2014-2019 Vladimir Kharlampidi
 *
 * Released under the MIT License
 *
 * Released on: February 22, 2019
 */
(function(global,factory){typeof exports==="object"&&typeof module!=="undefined"?module.exports=factory():typeof define==="function"&&define.amd?define(factory):(global=global||self,global.Swiper=factory())})(this,function(){var doc=typeof document==="undefined"?{body:{},addEventListener:function addEventListener(){},removeEventListener:function removeEventListener(){},activeElement:{blur:function blur(){},nodeName:""},querySelector:function querySelector(){return null},querySelectorAll:function querySelectorAll(){return[]},
getElementById:function getElementById(){return null},createEvent:function createEvent(){return{initEvent:function initEvent(){}}},createElement:function createElement(){return{children:[],childNodes:[],style:{},setAttribute:function setAttribute(){},getElementsByTagName:function getElementsByTagName(){return[]}}},location:{hash:""}}:document;var win=typeof window==="undefined"?{document:doc,navigator:{userAgent:""},location:{},history:{},CustomEvent:function CustomEvent(){return this},addEventListener:function addEventListener(){},
removeEventListener:function removeEventListener(){},getComputedStyle:function getComputedStyle(){return{getPropertyValue:function getPropertyValue(){return""}}},Image:function Image(){},Date:function Date(){},screen:{},setTimeout:function setTimeout(){},clearTimeout:function clearTimeout(){}}:window;var Dom7=function Dom7(arr){var self=this;for(var i=0;i<arr.length;i+=1)self[i]=arr[i];self.length=arr.length;return this};function $(selector,context){var arr=[];var i=0;if(selector&&!context)if(selector instanceof
Dom7)return selector;if(selector)if(typeof selector==="string"){var els;var tempParent;var html=selector.trim();if(html.indexOf("<")>=0&&html.indexOf(">")>=0){var toCreate="div";if(html.indexOf("<li")===0)toCreate="ul";if(html.indexOf("<tr")===0)toCreate="tbody";if(html.indexOf("<td")===0||html.indexOf("<th")===0)toCreate="tr";if(html.indexOf("<tbody")===0)toCreate="table";if(html.indexOf("<option")===0)toCreate="select";tempParent=doc.createElement(toCreate);tempParent.innerHTML=html;for(i=0;i<tempParent.childNodes.length;i+=
1)arr.push(tempParent.childNodes[i])}else{if(!context&&selector[0]==="#"&&!selector.match(/[ .<>:~]/))els=[doc.getElementById(selector.trim().split("#")[1])];else els=(context||doc).querySelectorAll(selector.trim());for(i=0;i<els.length;i+=1)if(els[i])arr.push(els[i])}}else if(selector.nodeType||selector===win||selector===doc)arr.push(selector);else if(selector.length>0&&selector[0].nodeType)for(i=0;i<selector.length;i+=1)arr.push(selector[i]);return new Dom7(arr)}$.fn=Dom7.prototype;$.Class=Dom7;
$.Dom7=Dom7;function unique(arr){var uniqueArray=[];for(var i=0;i<arr.length;i+=1)if(uniqueArray.indexOf(arr[i])===-1)uniqueArray.push(arr[i]);return uniqueArray}function addClass(className){if(typeof className==="undefined")return this;var classes=className.split(" ");for(var i=0;i<classes.length;i+=1)for(var j=0;j<this.length;j+=1)if(typeof this[j]!=="undefined"&&typeof this[j].classList!=="undefined")this[j].classList.add(classes[i]);return this}function removeClass(className){var classes=className.split(" ");
for(var i=0;i<classes.length;i+=1)for(var j=0;j<this.length;j+=1)if(typeof this[j]!=="undefined"&&typeof this[j].classList!=="undefined")this[j].classList.remove(classes[i]);return this}function hasClass(className){if(!this[0])return false;return this[0].classList.contains(className)}function toggleClass(className){var classes=className.split(" ");for(var i=0;i<classes.length;i+=1)for(var j=0;j<this.length;j+=1)if(typeof this[j]!=="undefined"&&typeof this[j].classList!=="undefined")this[j].classList.toggle(classes[i]);
return this}function attr(attrs,value){var arguments$1=arguments;if(arguments.length===1&&typeof attrs==="string"){if(this[0])return this[0].getAttribute(attrs);return undefined}for(var i=0;i<this.length;i+=1)if(arguments$1.length===2)this[i].setAttribute(attrs,value);else for(var attrName in attrs){this[i][attrName]=attrs[attrName];this[i].setAttribute(attrName,attrs[attrName])}return this}function removeAttr(attr){for(var i=0;i<this.length;i+=1)this[i].removeAttribute(attr);return this}function data(key,
value){var el;if(typeof value==="undefined"){el=this[0];if(el){if(el.dom7ElementDataStorage&&key in el.dom7ElementDataStorage)return el.dom7ElementDataStorage[key];var dataKey=el.getAttribute("data-"+key);if(dataKey)return dataKey;return undefined}return undefined}for(var i=0;i<this.length;i+=1){el=this[i];if(!el.dom7ElementDataStorage)el.dom7ElementDataStorage={};el.dom7ElementDataStorage[key]=value}return this}function transform(transform){for(var i=0;i<this.length;i+=1){var elStyle=this[i].style;
elStyle.webkitTransform=transform;elStyle.transform=transform}return this}function transition(duration){if(typeof duration!=="string")duration=duration+"ms";for(var i=0;i<this.length;i+=1){var elStyle=this[i].style;elStyle.webkitTransitionDuration=duration;elStyle.transitionDuration=duration}return this}function on(){var assign;var args=[],len=arguments.length;while(len--)args[len]=arguments[len];var eventType=args[0];var targetSelector=args[1];var listener=args[2];var capture=args[3];if(typeof args[1]===
"function"){assign=args,eventType=assign[0],listener=assign[1],capture=assign[2];targetSelector=undefined}if(!capture)capture=false;function handleLiveEvent(e){var target=e.target;if(!target)return;var eventData=e.target.dom7EventData||[];if(eventData.indexOf(e)<0)eventData.unshift(e);if($(target).is(targetSelector))listener.apply(target,eventData);else{var parents=$(target).parents();for(var k=0;k<parents.length;k+=1)if($(parents[k]).is(targetSelector))listener.apply(parents[k],eventData)}}function handleEvent(e){var eventData=
e&&e.target?e.target.dom7EventData||[]:[];if(eventData.indexOf(e)<0)eventData.unshift(e);listener.apply(this,eventData)}var events=eventType.split(" ");var j;for(var i=0;i<this.length;i+=1){var el=this[i];if(!targetSelector)for(j=0;j<events.length;j+=1){var event=events[j];if(!el.dom7Listeners)el.dom7Listeners={};if(!el.dom7Listeners[event])el.dom7Listeners[event]=[];el.dom7Listeners[event].push({listener:listener,proxyListener:handleEvent});el.addEventListener(event,handleEvent,capture)}else for(j=
0;j<events.length;j+=1){var event$1=events[j];if(!el.dom7LiveListeners)el.dom7LiveListeners={};if(!el.dom7LiveListeners[event$1])el.dom7LiveListeners[event$1]=[];el.dom7LiveListeners[event$1].push({listener:listener,proxyListener:handleLiveEvent});el.addEventListener(event$1,handleLiveEvent,capture)}}return this}function off(){var assign;var args=[],len=arguments.length;while(len--)args[len]=arguments[len];var eventType=args[0];var targetSelector=args[1];var listener=args[2];var capture=args[3];if(typeof args[1]===
"function"){assign=args,eventType=assign[0],listener=assign[1],capture=assign[2];targetSelector=undefined}if(!capture)capture=false;var events=eventType.split(" ");for(var i=0;i<events.length;i+=1){var event=events[i];for(var j=0;j<this.length;j+=1){var el=this[j];var handlers=void 0;if(!targetSelector&&el.dom7Listeners)handlers=el.dom7Listeners[event];else if(targetSelector&&el.dom7LiveListeners)handlers=el.dom7LiveListeners[event];if(handlers&&handlers.length)for(var k=handlers.length-1;k>=0;k-=
1){var handler=handlers[k];if(listener&&handler.listener===listener){el.removeEventListener(event,handler.proxyListener,capture);handlers.splice(k,1)}else if(listener&&handler.listener&&handler.listener.dom7proxy&&handler.listener.dom7proxy===listener){el.removeEventListener(event,handler.proxyListener,capture);handlers.splice(k,1)}else if(!listener){el.removeEventListener(event,handler.proxyListener,capture);handlers.splice(k,1)}}}}return this}function trigger(){var args=[],len=arguments.length;
while(len--)args[len]=arguments[len];var events=args[0].split(" ");var eventData=args[1];for(var i=0;i<events.length;i+=1){var event=events[i];for(var j=0;j<this.length;j+=1){var el=this[j];var evt=void 0;try{evt=new win.CustomEvent(event,{detail:eventData,bubbles:true,cancelable:true})}catch(e){evt=doc.createEvent("Event");evt.initEvent(event,true,true);evt.detail=eventData}el.dom7EventData=args.filter(function(data,dataIndex){return dataIndex>0});el.dispatchEvent(evt);el.dom7EventData=[];delete el.dom7EventData}}return this}
function transitionEnd(callback){var events=["webkitTransitionEnd","transitionend"];var dom=this;var i;function fireCallBack(e){if(e.target!==this)return;callback.call(this,e);for(i=0;i<events.length;i+=1)dom.off(events[i],fireCallBack)}if(callback)for(i=0;i<events.length;i+=1)dom.on(events[i],fireCallBack);return this}function outerWidth(includeMargins){if(this.length>0){if(includeMargins){var styles=this.styles();return this[0].offsetWidth+parseFloat(styles.getPropertyValue("margin-right"))+parseFloat(styles.getPropertyValue("margin-left"))}return this[0].offsetWidth}return null}
function outerHeight(includeMargins){if(this.length>0){if(includeMargins){var styles=this.styles();return this[0].offsetHeight+parseFloat(styles.getPropertyValue("margin-top"))+parseFloat(styles.getPropertyValue("margin-bottom"))}return this[0].offsetHeight}return null}function offset(){if(this.length>0){var el=this[0];var box=el.getBoundingClientRect();var body=doc.body;var clientTop=el.clientTop||body.clientTop||0;var clientLeft=el.clientLeft||body.clientLeft||0;var scrollTop=el===win?win.scrollY:
el.scrollTop;var scrollLeft=el===win?win.scrollX:el.scrollLeft;return{top:box.top+scrollTop-clientTop,left:box.left+scrollLeft-clientLeft}}return null}function styles(){if(this[0])return win.getComputedStyle(this[0],null);return{}}function css(props,value){var i;if(arguments.length===1)if(typeof props==="string"){if(this[0])return win.getComputedStyle(this[0],null).getPropertyValue(props)}else{for(i=0;i<this.length;i+=1)for(var prop in props)this[i].style[prop]=props[prop];return this}if(arguments.length===
2&&typeof props==="string"){for(i=0;i<this.length;i+=1)this[i].style[props]=value;return this}return this}function each(callback){if(!callback)return this;for(var i=0;i<this.length;i+=1)if(callback.call(this[i],i,this[i])===false)return this;return this}function html(html){if(typeof html==="undefined")return this[0]?this[0].innerHTML:undefined;for(var i=0;i<this.length;i+=1)this[i].innerHTML=html;return this}function text(text){if(typeof text==="undefined"){if(this[0])return this[0].textContent.trim();
return null}for(var i=0;i<this.length;i+=1)this[i].textContent=text;return this}function is(selector){var el=this[0];var compareWith;var i;if(!el||typeof selector==="undefined")return false;if(typeof selector==="string"){if(el.matches)return el.matches(selector);else if(el.webkitMatchesSelector)return el.webkitMatchesSelector(selector);else if(el.msMatchesSelector)return el.msMatchesSelector(selector);compareWith=$(selector);for(i=0;i<compareWith.length;i+=1)if(compareWith[i]===el)return true;return false}else if(selector===
doc)return el===doc;else if(selector===win)return el===win;if(selector.nodeType||selector instanceof Dom7){compareWith=selector.nodeType?[selector]:selector;for(i=0;i<compareWith.length;i+=1)if(compareWith[i]===el)return true;return false}return false}function index(){var child=this[0];var i;if(child){i=0;while((child=child.previousSibling)!==null)if(child.nodeType===1)i+=1;return i}return undefined}function eq(index){if(typeof index==="undefined")return this;var length=this.length;var returnIndex;
if(index>length-1)return new Dom7([]);if(index<0){returnIndex=length+index;if(returnIndex<0)return new Dom7([]);return new Dom7([this[returnIndex]])}return new Dom7([this[index]])}function append(){var args=[],len=arguments.length;while(len--)args[len]=arguments[len];var newChild;for(var k=0;k<args.length;k+=1){newChild=args[k];for(var i=0;i<this.length;i+=1)if(typeof newChild==="string"){var tempDiv=doc.createElement("div");tempDiv.innerHTML=newChild;while(tempDiv.firstChild)this[i].appendChild(tempDiv.firstChild)}else if(newChild instanceof
Dom7)for(var j=0;j<newChild.length;j+=1)this[i].appendChild(newChild[j]);else this[i].appendChild(newChild)}return this}function prepend(newChild){var i;var j;for(i=0;i<this.length;i+=1)if(typeof newChild==="string"){var tempDiv=doc.createElement("div");tempDiv.innerHTML=newChild;for(j=tempDiv.childNodes.length-1;j>=0;j-=1)this[i].insertBefore(tempDiv.childNodes[j],this[i].childNodes[0])}else if(newChild instanceof Dom7)for(j=0;j<newChild.length;j+=1)this[i].insertBefore(newChild[j],this[i].childNodes[0]);
else this[i].insertBefore(newChild,this[i].childNodes[0]);return this}function next(selector){if(this.length>0){if(selector){if(this[0].nextElementSibling&&$(this[0].nextElementSibling).is(selector))return new Dom7([this[0].nextElementSibling]);return new Dom7([])}if(this[0].nextElementSibling)return new Dom7([this[0].nextElementSibling]);return new Dom7([])}return new Dom7([])}function nextAll(selector){var nextEls=[];var el=this[0];if(!el)return new Dom7([]);while(el.nextElementSibling){var next=
el.nextElementSibling;if(selector){if($(next).is(selector))nextEls.push(next)}else nextEls.push(next);el=next}return new Dom7(nextEls)}function prev(selector){if(this.length>0){var el=this[0];if(selector){if(el.previousElementSibling&&$(el.previousElementSibling).is(selector))return new Dom7([el.previousElementSibling]);return new Dom7([])}if(el.previousElementSibling)return new Dom7([el.previousElementSibling]);return new Dom7([])}return new Dom7([])}function prevAll(selector){var prevEls=[];var el=
this[0];if(!el)return new Dom7([]);while(el.previousElementSibling){var prev=el.previousElementSibling;if(selector){if($(prev).is(selector))prevEls.push(prev)}else prevEls.push(prev);el=prev}return new Dom7(prevEls)}function parent(selector){var parents=[];for(var i=0;i<this.length;i+=1)if(this[i].parentNode!==null)if(selector){if($(this[i].parentNode).is(selector))parents.push(this[i].parentNode)}else parents.push(this[i].parentNode);return $(unique(parents))}function parents(selector){var parents=
[];for(var i=0;i<this.length;i+=1){var parent=this[i].parentNode;while(parent){if(selector){if($(parent).is(selector))parents.push(parent)}else parents.push(parent);parent=parent.parentNode}}return $(unique(parents))}function closest(selector){var closest=this;if(typeof selector==="undefined")return new Dom7([]);if(!closest.is(selector))closest=closest.parents(selector).eq(0);return closest}function find(selector){var foundElements=[];for(var i=0;i<this.length;i+=1){var found=this[i].querySelectorAll(selector);
for(var j=0;j<found.length;j+=1)foundElements.push(found[j])}return new Dom7(foundElements)}function children(selector){var children=[];for(var i=0;i<this.length;i+=1){var childNodes=this[i].childNodes;for(var j=0;j<childNodes.length;j+=1)if(!selector){if(childNodes[j].nodeType===1)children.push(childNodes[j])}else if(childNodes[j].nodeType===1&&$(childNodes[j]).is(selector))children.push(childNodes[j])}return new Dom7(unique(children))}function remove(){for(var i=0;i<this.length;i+=1)if(this[i].parentNode)this[i].parentNode.removeChild(this[i]);
return this}function add(){var args=[],len=arguments.length;while(len--)args[len]=arguments[len];var dom=this;var i;var j;for(i=0;i<args.length;i+=1){var toAdd=$(args[i]);for(j=0;j<toAdd.length;j+=1){dom[dom.length]=toAdd[j];dom.length+=1}}return dom}var Methods={addClass:addClass,removeClass:removeClass,hasClass:hasClass,toggleClass:toggleClass,attr:attr,removeAttr:removeAttr,data:data,transform:transform,transition:transition,on:on,off:off,trigger:trigger,transitionEnd:transitionEnd,outerWidth:outerWidth,
outerHeight:outerHeight,offset:offset,css:css,each:each,html:html,text:text,is:is,index:index,eq:eq,append:append,prepend:prepend,next:next,nextAll:nextAll,prev:prev,prevAll:prevAll,parent:parent,parents:parents,closest:closest,find:find,children:children,remove:remove,add:add,styles:styles};Object.keys(Methods).forEach(function(methodName){$.fn[methodName]=Methods[methodName]});var Utils={deleteProps:function deleteProps(obj){var object=obj;Object.keys(object).forEach(function(key){try{object[key]=
null}catch(e){}try{delete object[key]}catch(e$0){}})},nextTick:function nextTick(callback,delay){if(delay===void 0)delay=0;return setTimeout(callback,delay)},now:function now(){return Date.now()},getTranslate:function getTranslate(el,axis){if(axis===void 0)axis="x";var matrix;var curTransform;var transformMatrix;var curStyle=win.getComputedStyle(el,null);if(win.WebKitCSSMatrix){curTransform=curStyle.transform||curStyle.webkitTransform;if(curTransform.split(",").length>6)curTransform=curTransform.split(", ").map(function(a){return a.replace(",",
".")}).join(", ");transformMatrix=new win.WebKitCSSMatrix(curTransform==="none"?"":curTransform)}else{transformMatrix=curStyle.MozTransform||curStyle.OTransform||curStyle.MsTransform||curStyle.msTransform||curStyle.transform||curStyle.getPropertyValue("transform").replace("translate(","matrix(1, 0, 0, 1,");matrix=transformMatrix.toString().split(",")}if(axis==="x")if(win.WebKitCSSMatrix)curTransform=transformMatrix.m41;else if(matrix.length===16)curTransform=parseFloat(matrix[12]);else curTransform=
parseFloat(matrix[4]);if(axis==="y")if(win.WebKitCSSMatrix)curTransform=transformMatrix.m42;else if(matrix.length===16)curTransform=parseFloat(matrix[13]);else curTransform=parseFloat(matrix[5]);return curTransform||0},parseUrlQuery:function parseUrlQuery(url){var query={};var urlToParse=url||win.location.href;var i;var params;var param;var length;if(typeof urlToParse==="string"&&urlToParse.length){urlToParse=urlToParse.indexOf("?")>-1?urlToParse.replace(/\S*\?/,""):"";params=urlToParse.split("&").filter(function(paramsPart){return paramsPart!==
""});length=params.length;for(i=0;i<length;i+=1){param=params[i].replace(/#\S+/g,"").split("=");query[decodeURIComponent(param[0])]=typeof param[1]==="undefined"?undefined:decodeURIComponent(param[1])||""}}return query},isObject:function isObject(o){return typeof o==="object"&&o!==null&&o.constructor&&o.constructor===Object},extend:function extend(){var args=[],len$1=arguments.length;while(len$1--)args[len$1]=arguments[len$1];var to=Object(args[0]);for(var i=1;i<args.length;i+=1){var nextSource=args[i];
if(nextSource!==undefined&&nextSource!==null){var keysArray=Object.keys(Object(nextSource));for(var nextIndex=0,len=keysArray.length;nextIndex<len;nextIndex+=1){var nextKey=keysArray[nextIndex];var desc=Object.getOwnPropertyDescriptor(nextSource,nextKey);if(desc!==undefined&&desc.enumerable)if(Utils.isObject(to[nextKey])&&Utils.isObject(nextSource[nextKey]))Utils.extend(to[nextKey],nextSource[nextKey]);else if(!Utils.isObject(to[nextKey])&&Utils.isObject(nextSource[nextKey])){to[nextKey]={};Utils.extend(to[nextKey],
nextSource[nextKey])}else to[nextKey]=nextSource[nextKey]}}}return to}};var Support=function Support(){var testDiv=doc.createElement("div");return{touch:win.Modernizr&&win.Modernizr.touch===true||function checkTouch(){return!!(win.navigator.maxTouchPoints>0||"ontouchstart"in win||win.DocumentTouch&&doc instanceof win.DocumentTouch)}(),pointerEvents:!!(win.navigator.pointerEnabled||win.PointerEvent||"maxTouchPoints"in win.navigator&&win.navigator.maxTouchPoints>0),prefixedPointerEvents:!!win.navigator.msPointerEnabled,
transition:function checkTransition(){var style=testDiv.style;return"transition"in style||"webkitTransition"in style||"MozTransition"in style}(),transforms3d:win.Modernizr&&win.Modernizr.csstransforms3d===true||function checkTransforms3d(){var style=testDiv.style;return"webkitPerspective"in style||"MozPerspective"in style||"OPerspective"in style||"MsPerspective"in style||"perspective"in style}(),passiveListener:function checkPassiveListener(){var supportsPassive=false;try{var opts=Object.defineProperty({},
"passive",{get:function get(){supportsPassive=true}});win.addEventListener("testPassiveListener",null,opts)}catch(e){}return supportsPassive}(),gestures:function checkGestures(){return"ongesturestart"in win}()}}();var Browser=function Browser(){function isSafari(){var ua=win.navigator.userAgent.toLowerCase();return ua.indexOf("safari")>=0&&ua.indexOf("chrome")<0&&ua.indexOf("android")<0}return{isIE:!!win.navigator.userAgent.match(/Trident/g)||!!win.navigator.userAgent.match(/MSIE/g),isEdge:!!win.navigator.userAgent.match(/Edge/g),
isSafari:isSafari(),isUiWebView:/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(win.navigator.userAgent)}}();var SwiperClass=function SwiperClass(params){if(params===void 0)params={};var self=this;self.params=params;self.eventsListeners={};if(self.params&&self.params.on)Object.keys(self.params.on).forEach(function(eventName){self.on(eventName,self.params.on[eventName])})};var staticAccessors={components:{configurable:true}};SwiperClass.prototype.on=function on(events,handler,priority){var self=
this;if(typeof handler!=="function")return self;var method=priority?"unshift":"push";events.split(" ").forEach(function(event){if(!self.eventsListeners[event])self.eventsListeners[event]=[];self.eventsListeners[event][method](handler)});return self};SwiperClass.prototype.once=function once(events,handler,priority){var self=this;if(typeof handler!=="function")return self;function onceHandler(){var args=[],len=arguments.length;while(len--)args[len]=arguments[len];handler.apply(self,args);self.off(events,
onceHandler);if(onceHandler.f7proxy)delete onceHandler.f7proxy}onceHandler.f7proxy=handler;return self.on(events,onceHandler,priority)};SwiperClass.prototype.off=function off(events,handler){var self=this;if(!self.eventsListeners)return self;events.split(" ").forEach(function(event){if(typeof handler==="undefined")self.eventsListeners[event]=[];else if(self.eventsListeners[event]&&self.eventsListeners[event].length)self.eventsListeners[event].forEach(function(eventHandler,index){if(eventHandler===
handler||eventHandler.f7proxy&&eventHandler.f7proxy===handler)self.eventsListeners[event].splice(index,1)})});return self};SwiperClass.prototype.emit=function emit(){var args=[],len=arguments.length;while(len--)args[len]=arguments[len];var self=this;if(!self.eventsListeners)return self;var events;var data;var context;if(typeof args[0]==="string"||Array.isArray(args[0])){events=args[0];data=args.slice(1,args.length);context=self}else{events=args[0].events;data=args[0].data;context=args[0].context||
self}var eventsArray=Array.isArray(events)?events:events.split(" ");eventsArray.forEach(function(event){if(self.eventsListeners&&self.eventsListeners[event]){var handlers=[];self.eventsListeners[event].forEach(function(eventHandler){handlers.push(eventHandler)});handlers.forEach(function(eventHandler){eventHandler.apply(context,data)})}});return self};SwiperClass.prototype.useModulesParams=function useModulesParams(instanceParams){var instance=this;if(!instance.modules)return;Object.keys(instance.modules).forEach(function(moduleName){var module=
instance.modules[moduleName];if(module.params)Utils.extend(instanceParams,module.params)})};SwiperClass.prototype.useModules=function useModules(modulesParams){if(modulesParams===void 0)modulesParams={};var instance=this;if(!instance.modules)return;Object.keys(instance.modules).forEach(function(moduleName){var module=instance.modules[moduleName];var moduleParams=modulesParams[moduleName]||{};if(module.instance)Object.keys(module.instance).forEach(function(modulePropName){var moduleProp=module.instance[modulePropName];
if(typeof moduleProp==="function")instance[modulePropName]=moduleProp.bind(instance);else instance[modulePropName]=moduleProp});if(module.on&&instance.on)Object.keys(module.on).forEach(function(moduleEventName){instance.on(moduleEventName,module.on[moduleEventName])});if(module.create)module.create.bind(instance)(moduleParams)})};staticAccessors.components.set=function(components){var Class=this;if(!Class.use)return;Class.use(components)};SwiperClass.installModule=function installModule(module){var params=
[],len=arguments.length-1;while(len-- >0)params[len]=arguments[len+1];var Class=this;if(!Class.prototype.modules)Class.prototype.modules={};var name=module.name||Object.keys(Class.prototype.modules).length+"_"+Utils.now();Class.prototype.modules[name]=module;if(module.proto)Object.keys(module.proto).forEach(function(key){Class.prototype[key]=module.proto[key]});if(module["static"])Object.keys(module["static"]).forEach(function(key){Class[key]=module["static"][key]});if(module.install)module.install.apply(Class,
params);return Class};SwiperClass.use=function use(module){var params=[],len=arguments.length-1;while(len-- >0)params[len]=arguments[len+1];var Class=this;if(Array.isArray(module)){module.forEach(function(m){return Class.installModule(m)});return Class}return Class.installModule.apply(Class,[module].concat(params))};Object.defineProperties(SwiperClass,staticAccessors);function updateSize(){var swiper=this;var width;var height;var $el=swiper.$el;if(typeof swiper.params.width!=="undefined")width=swiper.params.width;
else width=$el[0].clientWidth;if(typeof swiper.params.height!=="undefined")height=swiper.params.height;else height=$el[0].clientHeight;if(width===0&&swiper.isHorizontal()||height===0&&swiper.isVertical())return;width=width-parseInt($el.css("padding-left"),10)-parseInt($el.css("padding-right"),10);height=height-parseInt($el.css("padding-top"),10)-parseInt($el.css("padding-bottom"),10);Utils.extend(swiper,{width:width,height:height,size:swiper.isHorizontal()?width:height})}function updateSlides(){var swiper=
this;var params=swiper.params;var $wrapperEl=swiper.$wrapperEl;var swiperSize=swiper.size;var rtl=swiper.rtlTranslate;var wrongRTL=swiper.wrongRTL;var isVirtual=swiper.virtual&&params.virtual.enabled;var previousSlidesLength=isVirtual?swiper.virtual.slides.length:swiper.slides.length;var slides=$wrapperEl.children("."+swiper.params.slideClass);var slidesLength=isVirtual?swiper.virtual.slides.length:slides.length;var snapGrid=[];var slidesGrid=[];var slidesSizesGrid=[];var offsetBefore=params.slidesOffsetBefore;
if(typeof offsetBefore==="function")offsetBefore=params.slidesOffsetBefore.call(swiper);var offsetAfter=params.slidesOffsetAfter;if(typeof offsetAfter==="function")offsetAfter=params.slidesOffsetAfter.call(swiper);var previousSnapGridLength=swiper.snapGrid.length;var previousSlidesGridLength=swiper.snapGrid.length;var spaceBetween=params.spaceBetween;var slidePosition=-offsetBefore;var prevSlideSize=0;var index=0;if(typeof swiperSize==="undefined")return;if(typeof spaceBetween==="string"&&spaceBetween.indexOf("%")>=
0)spaceBetween=parseFloat(spaceBetween.replace("%",""))/100*swiperSize;swiper.virtualSize=-spaceBetween;if(rtl)slides.css({marginLeft:"",marginTop:""});else slides.css({marginRight:"",marginBottom:""});var slidesNumberEvenToRows;if(params.slidesPerColumn>1){if(Math.floor(slidesLength/params.slidesPerColumn)===slidesLength/swiper.params.slidesPerColumn)slidesNumberEvenToRows=slidesLength;else slidesNumberEvenToRows=Math.ceil(slidesLength/params.slidesPerColumn)*params.slidesPerColumn;if(params.slidesPerView!==
"auto"&&params.slidesPerColumnFill==="row")slidesNumberEvenToRows=Math.max(slidesNumberEvenToRows,params.slidesPerView*params.slidesPerColumn)}var slideSize;var slidesPerColumn=params.slidesPerColumn;var slidesPerRow=slidesNumberEvenToRows/slidesPerColumn;var numFullColumns=Math.floor(slidesLength/params.slidesPerColumn);for(var i=0;i<slidesLength;i+=1){slideSize=0;var slide=slides.eq(i);if(params.slidesPerColumn>1){var newSlideOrderIndex=void 0;var column=void 0;var row=void 0;if(params.slidesPerColumnFill===
"column"){column=Math.floor(i/slidesPerColumn);row=i-column*slidesPerColumn;if(column>numFullColumns||column===numFullColumns&&row===slidesPerColumn-1){row+=1;if(row>=slidesPerColumn){row=0;column+=1}}newSlideOrderIndex=column+row*slidesNumberEvenToRows/slidesPerColumn;slide.css({"-webkit-box-ordinal-group":newSlideOrderIndex,"-moz-box-ordinal-group":newSlideOrderIndex,"-ms-flex-order":newSlideOrderIndex,"-webkit-order":newSlideOrderIndex,order:newSlideOrderIndex})}else{row=Math.floor(i/slidesPerRow);
column=i-row*slidesPerRow}slide.css("margin-"+(swiper.isHorizontal()?"top":"left"),row!==0&&params.spaceBetween&&params.spaceBetween+"px").attr("data-swiper-column",column).attr("data-swiper-row",row)}if(slide.css("display")==="none")continue;if(params.slidesPerView==="auto"){var slideStyles=win.getComputedStyle(slide[0],null);var currentTransform=slide[0].style.transform;var currentWebKitTransform=slide[0].style.webkitTransform;if(currentTransform)slide[0].style.transform="none";if(currentWebKitTransform)slide[0].style.webkitTransform=
"none";if(swiper.isHorizontal()){var width=parseFloat(slideStyles.getPropertyValue("width"));var paddingLeft=parseFloat(slideStyles.getPropertyValue("padding-left"));var paddingRight=parseFloat(slideStyles.getPropertyValue("padding-right"));var marginLeft=parseFloat(slideStyles.getPropertyValue("margin-left"));var marginRight=parseFloat(slideStyles.getPropertyValue("margin-right"));var boxSizing=slideStyles.getPropertyValue("box-sizing");if(boxSizing&&boxSizing==="border-box")slideSize=width+marginLeft+
marginRight;else slideSize=width+paddingLeft+paddingRight+marginLeft+marginRight}else{var height=parseFloat(slideStyles.getPropertyValue("height"));var paddingTop=parseFloat(slideStyles.getPropertyValue("padding-top"));var paddingBottom=parseFloat(slideStyles.getPropertyValue("padding-bottom"));var marginTop=parseFloat(slideStyles.getPropertyValue("margin-top"));var marginBottom=parseFloat(slideStyles.getPropertyValue("margin-bottom"));var boxSizing$1=slideStyles.getPropertyValue("box-sizing");if(boxSizing$1&&
boxSizing$1==="border-box")slideSize=height+marginTop+marginBottom;else slideSize=height+paddingTop+paddingBottom+marginTop+marginBottom}if(currentTransform)slide[0].style.transform=currentTransform;if(currentWebKitTransform)slide[0].style.webkitTransform=currentWebKitTransform}else{slideSize=(swiperSize-(params.slidesPerView-1)*spaceBetween)/params.slidesPerView;if(slides[i])if(swiper.isHorizontal())slides[i].style.width=slideSize+"px";else slides[i].style.height=slideSize+"px"}if(slides[i])slides[i].swiperSlideSize=
slideSize;slidesSizesGrid.push(slideSize);if(params.centeredSlides){slidePosition=slidePosition+slideSize/2+prevSlideSize/2+spaceBetween;if(prevSlideSize===0&&i!==0)slidePosition=slidePosition-swiperSize/2-spaceBetween;if(i===0)slidePosition=slidePosition-swiperSize/2-spaceBetween;if(Math.abs(slidePosition)<1/1E3)slidePosition=0;if(index%params.slidesPerGroup===0)snapGrid.push(slidePosition);slidesGrid.push(slidePosition)}else{if(index%params.slidesPerGroup===0)snapGrid.push(slidePosition);slidesGrid.push(slidePosition);
slidePosition=slidePosition+slideSize+spaceBetween}swiper.virtualSize+=slideSize+spaceBetween;prevSlideSize=slideSize;index+=1}swiper.virtualSize=Math.max(swiper.virtualSize,swiperSize)+offsetAfter;var newSlidesGrid;if(rtl&&wrongRTL&&params.effect==="slide")$wrapperEl.css({width:swiper.virtualSize+params.spaceBetween+"px"});if(params.slidesPerColumn>1){swiper.virtualSize=(slideSize+params.spaceBetween)*slidesNumberEvenToRows;swiper.virtualSize=Math.ceil(swiper.virtualSize/params.slidesPerColumn)-
params.spaceBetween;if(swiper.isHorizontal())$wrapperEl.css({width:swiper.virtualSize+params.spaceBetween+"px"});else $wrapperEl.css({height:swiper.virtualSize+params.spaceBetween+"px"});if(params.centeredSlides){newSlidesGrid=[];for(var i$1=0;i$1<snapGrid.length;i$1+=1){var slidesGridItem=snapGrid[i$1];if(snapGrid[i$1]<swiper.virtualSize+snapGrid[0])newSlidesGrid.push(slidesGridItem)}snapGrid=newSlidesGrid}}if(!params.centeredSlides){newSlidesGrid=[];for(var i$2=0;i$2<snapGrid.length;i$2+=1){var slidesGridItem$1=
snapGrid[i$2];if(snapGrid[i$2]<=swiper.virtualSize-swiperSize)newSlidesGrid.push(slidesGridItem$1)}snapGrid=newSlidesGrid;if(Math.floor(swiper.virtualSize-swiperSize)-Math.floor(snapGrid[snapGrid.length-1])>1)snapGrid.push(swiper.virtualSize-swiperSize)}if(snapGrid.length===0)snapGrid=[0];if(params.spaceBetween!==0)if(swiper.isHorizontal())if(rtl)slides.css({marginLeft:spaceBetween+"px"});else slides.css({marginRight:spaceBetween+"px"});else slides.css({marginBottom:spaceBetween+"px"});Utils.extend(swiper,
{slides:slides,snapGrid:snapGrid,slidesGrid:slidesGrid,slidesSizesGrid:slidesSizesGrid});if(slidesLength!==previousSlidesLength)swiper.emit("slidesLengthChange");if(snapGrid.length!==previousSnapGridLength)swiper.emit("snapGridLengthChange");if(slidesGrid.length!==previousSlidesGridLength)swiper.emit("slidesGridLengthChange")}function updateProgress(translate){if(translate===void 0)translate=this&&this.translate||0;var swiper=this;var params=swiper.params;var translatesDiff=swiper.maxTranslate()-
swiper.minTranslate();var progress=swiper.progress;var isBeginning=swiper.isBeginning;var isEnd=swiper.isEnd;var wasBeginning=isBeginning;var wasEnd=isEnd;if(translatesDiff===0){progress=0;isBeginning=true;isEnd=true}else{progress=(translate-swiper.minTranslate())/translatesDiff;isBeginning=progress<=0;isEnd=progress>=1}Utils.extend(swiper,{progress:progress,isBeginning:isBeginning,isEnd:isEnd});if(isBeginning&&!wasBeginning)swiper.emit("reachBeginning toEdge");if(isEnd&&!wasEnd)swiper.emit("reachEnd toEdge");
if(wasBeginning&&!isBeginning||wasEnd&&!isEnd)swiper.emit("fromEdge");swiper.emit("progress",progress)}function updateSlidesClasses(){var swiper=this;var slides=swiper.slides;var params=swiper.params;var $wrapperEl=swiper.$wrapperEl;var activeIndex=swiper.activeIndex;var realIndex=swiper.realIndex;var isVirtual=swiper.virtual&&params.virtual.enabled;slides.removeClass(params.slideActiveClass+" "+params.slideNextClass+" "+params.slidePrevClass+" "+params.slideDuplicateActiveClass+" "+params.slideDuplicateNextClass+
" "+params.slideDuplicatePrevClass);var activeSlide;if(isVirtual)activeSlide=swiper.$wrapperEl.find("."+params.slideClass+'[data-swiper-slide-index="'+activeIndex+'"]');else activeSlide=slides.eq(activeIndex);activeSlide.addClass(params.slideActiveClass);if(params.loop)if(activeSlide.hasClass(params.slideDuplicateClass))$wrapperEl.children("."+params.slideClass+":not(."+params.slideDuplicateClass+')[data-swiper-slide-index="'+realIndex+'"]').addClass(params.slideDuplicateActiveClass);else $wrapperEl.children("."+
params.slideClass+"."+params.slideDuplicateClass+'[data-swiper-slide-index="'+realIndex+'"]').addClass(params.slideDuplicateActiveClass);var nextSlide=activeSlide.nextAll("."+params.slideClass).eq(0).addClass(params.slideNextClass);if(params.loop&&nextSlide.length===0){nextSlide=slides.eq(0);nextSlide.addClass(params.slideNextClass)}var prevSlide=activeSlide.prevAll("."+params.slideClass).eq(0).addClass(params.slidePrevClass);if(params.loop&&prevSlide.length===0){prevSlide=slides.eq(-1);prevSlide.addClass(params.slidePrevClass)}if(params.loop){if(nextSlide.hasClass(params.slideDuplicateClass))$wrapperEl.children("."+
params.slideClass+":not(."+params.slideDuplicateClass+')[data-swiper-slide-index="'+nextSlide.attr("data-swiper-slide-index")+'"]').addClass(params.slideDuplicateNextClass);else $wrapperEl.children("."+params.slideClass+"."+params.slideDuplicateClass+'[data-swiper-slide-index="'+nextSlide.attr("data-swiper-slide-index")+'"]').addClass(params.slideDuplicateNextClass);if(prevSlide.hasClass(params.slideDuplicateClass))$wrapperEl.children("."+params.slideClass+":not(."+params.slideDuplicateClass+')[data-swiper-slide-index="'+
prevSlide.attr("data-swiper-slide-index")+'"]').addClass(params.slideDuplicatePrevClass);else $wrapperEl.children("."+params.slideClass+"."+params.slideDuplicateClass+'[data-swiper-slide-index="'+prevSlide.attr("data-swiper-slide-index")+'"]').addClass(params.slideDuplicatePrevClass)}}function updateActiveIndex(newActiveIndex){var swiper=this;var translate=swiper.rtlTranslate?swiper.translate:-swiper.translate;var slidesGrid=swiper.slidesGrid;var snapGrid=swiper.snapGrid;var params=swiper.params;
var previousIndex=swiper.activeIndex;var previousRealIndex=swiper.realIndex;var previousSnapIndex=swiper.snapIndex;var activeIndex=newActiveIndex;var snapIndex;if(typeof activeIndex==="undefined"){for(var i=0;i<slidesGrid.length;i+=1)if(typeof slidesGrid[i+1]!=="undefined")if(translate>=slidesGrid[i]&&translate<slidesGrid[i+1]-(slidesGrid[i+1]-slidesGrid[i])/2)activeIndex=i;else{if(translate>=slidesGrid[i]&&translate<slidesGrid[i+1])activeIndex=i+1}else if(translate>=slidesGrid[i])activeIndex=i;if(params.normalizeSlideIndex)if(activeIndex<
0||typeof activeIndex==="undefined")activeIndex=0}if(snapGrid.indexOf(translate)>=0)snapIndex=snapGrid.indexOf(translate);else snapIndex=Math.floor(activeIndex/params.slidesPerGroup);if(snapIndex>=snapGrid.length)snapIndex=snapGrid.length-1;if(activeIndex===previousIndex){if(snapIndex!==previousSnapIndex){swiper.snapIndex=snapIndex;swiper.emit("snapIndexChange")}return}var realIndex=parseInt(swiper.slides.eq(activeIndex).attr("data-swiper-slide-index")||activeIndex,10);Utils.extend(swiper,{snapIndex:snapIndex,
realIndex:realIndex,previousIndex:previousIndex,activeIndex:activeIndex});swiper.emit("activeIndexChange");swiper.emit("snapIndexChange");if(previousRealIndex!==realIndex)swiper.emit("realIndexChange");swiper.emit("slideChange")}function updateClickedSlide(e){var swiper=this;var params=swiper.params;var slide=$(e.target).closest("."+params.slideClass)[0];var slideFound=false;if(slide)for(var i=0;i<swiper.slides.length;i+=1)if(swiper.slides[i]===slide)slideFound=true;if(slide&&slideFound){swiper.clickedSlide=
slide;if(swiper.virtual&&swiper.params.virtual.enabled)swiper.clickedIndex=parseInt($(slide).attr("data-swiper-slide-index"),10);else swiper.clickedIndex=$(slide).index()}else{swiper.clickedSlide=undefined;swiper.clickedIndex=undefined;return}}var update={updateSize:updateSize,updateSlides:updateSlides,updateProgress:updateProgress,updateSlidesClasses:updateSlidesClasses,updateActiveIndex:updateActiveIndex,updateClickedSlide:updateClickedSlide};function getTranslate(axis){if(axis===void 0)axis=this.isHorizontal()?
"x":"y";var swiper=this;var params=swiper.params;var rtl=swiper.rtlTranslate;var translate=swiper.translate;var $wrapperEl=swiper.$wrapperEl;var currentTranslate=Utils.getTranslate($wrapperEl[0],axis);if(rtl)currentTranslate=-currentTranslate;return currentTranslate||0}function setTranslate(translate,byController){var swiper=this;var rtl=swiper.rtlTranslate;var params=swiper.params;var $wrapperEl=swiper.$wrapperEl;var progress=swiper.progress;var x=0;var y=0;var z=0;if(swiper.isHorizontal())x=rtl?
-translate:translate;else y=translate;if(Support.transforms3d)$wrapperEl.transform("translate3d("+x+"px, "+y+"px, "+z+"px)");else $wrapperEl.transform("translate("+x+"px, "+y+"px)");swiper.previousTranslate=swiper.translate;swiper.translate=swiper.isHorizontal()?x:y;var newProgress;var translatesDiff=swiper.maxTranslate()-swiper.minTranslate();if(translatesDiff===0)newProgress=0;else newProgress=(translate-swiper.minTranslate())/translatesDiff;if(newProgress!==progress)swiper.updateProgress(translate);
swiper.emit("setTranslate",swiper.translate,byController)}function minTranslate(){return-this.snapGrid[0]}function maxTranslate(){return-this.snapGrid[this.snapGrid.length-1]}var translate={getTranslate:getTranslate,setTranslate:setTranslate,minTranslate:minTranslate,maxTranslate:maxTranslate};function setTransition(duration,byController){var swiper=this;swiper.$wrapperEl.transition(duration);swiper.emit("setTransition",duration,byController)}function transitionStart(runCallbacks,direction){if(runCallbacks===
void 0)runCallbacks=true;var swiper=this;var activeIndex=swiper.activeIndex;var params=swiper.params;var previousIndex=swiper.previousIndex;var dir=direction;if(!dir)if(activeIndex>previousIndex)dir="next";else if(activeIndex<previousIndex)dir="prev";else dir="reset";swiper.emit("transitionStart");if(runCallbacks&&activeIndex!==previousIndex){if(dir==="reset"){swiper.emit("slideResetTransitionStart");return}swiper.emit("slideChangeTransitionStart");if(dir==="next")swiper.emit("slideNextTransitionStart");
else swiper.emit("slidePrevTransitionStart")}}function transitionEnd$1(runCallbacks,direction){if(runCallbacks===void 0)runCallbacks=true;var swiper=this;var activeIndex=swiper.activeIndex;var previousIndex=swiper.previousIndex;swiper.animating=false;swiper.setTransition(0);var dir=direction;if(!dir)if(activeIndex>previousIndex)dir="next";else if(activeIndex<previousIndex)dir="prev";else dir="reset";swiper.emit("transitionEnd");if(runCallbacks&&activeIndex!==previousIndex){if(dir==="reset"){swiper.emit("slideResetTransitionEnd");
return}swiper.emit("slideChangeTransitionEnd");if(dir==="next")swiper.emit("slideNextTransitionEnd");else swiper.emit("slidePrevTransitionEnd")}}var transition$1={setTransition:setTransition,transitionStart:transitionStart,transitionEnd:transitionEnd$1};function slideTo(index,speed,runCallbacks,internal){if(index===void 0)index=0;if(speed===void 0)speed=this.params.speed;if(runCallbacks===void 0)runCallbacks=true;var swiper=this;var slideIndex=index;if(slideIndex<0)slideIndex=0;var params=swiper.params;
var snapGrid=swiper.snapGrid;var slidesGrid=swiper.slidesGrid;var previousIndex=swiper.previousIndex;var activeIndex=swiper.activeIndex;var rtl=swiper.rtlTranslate;if(swiper.animating&&params.preventInteractionOnTransition)return false;var snapIndex=Math.floor(slideIndex/params.slidesPerGroup);if(snapIndex>=snapGrid.length)snapIndex=snapGrid.length-1;if((activeIndex||params.initialSlide||0)===(previousIndex||0)&&runCallbacks)swiper.emit("beforeSlideChangeStart");var translate=-snapGrid[snapIndex];
swiper.updateProgress(translate);if(params.normalizeSlideIndex)for(var i=0;i<slidesGrid.length;i+=1)if(-Math.floor(translate*100)>=Math.floor(slidesGrid[i]*100))slideIndex=i;if(swiper.initialized&&slideIndex!==activeIndex){if(!swiper.allowSlideNext&&translate<swiper.translate&&translate<swiper.minTranslate())return false;if(!swiper.allowSlidePrev&&translate>swiper.translate&&translate>swiper.maxTranslate())if((activeIndex||0)!==slideIndex)return false}var direction;if(slideIndex>activeIndex)direction=
"next";else if(slideIndex<activeIndex)direction="prev";else direction="reset";if(rtl&&-translate===swiper.translate||!rtl&&translate===swiper.translate){swiper.updateActiveIndex(slideIndex);swiper.updateSlidesClasses();if(direction!=="reset"){swiper.transitionStart(runCallbacks,direction);swiper.transitionEnd(runCallbacks,direction)}return false}if(speed===0||!Support.transition){swiper.setTransition(0);swiper.setTranslate(translate);swiper.updateActiveIndex(slideIndex);swiper.updateSlidesClasses();
swiper.emit("beforeTransitionStart",speed,internal);swiper.transitionStart(runCallbacks,direction);swiper.transitionEnd(runCallbacks,direction)}else{swiper.setTransition(speed);swiper.setTranslate(translate);swiper.updateActiveIndex(slideIndex);swiper.updateSlidesClasses();swiper.emit("beforeTransitionStart",speed,internal);swiper.transitionStart(runCallbacks,direction);if(!swiper.animating){swiper.animating=true;if(!swiper.onSlideToWrapperTransitionEnd)swiper.onSlideToWrapperTransitionEnd=function transitionEnd(e){if(!swiper||
swiper.destroyed)return;if(e.target!==this)return;swiper.$wrapperEl[0].removeEventListener("transitionend",swiper.onSlideToWrapperTransitionEnd);swiper.$wrapperEl[0].removeEventListener("webkitTransitionEnd",swiper.onSlideToWrapperTransitionEnd);swiper.onSlideToWrapperTransitionEnd=null;delete swiper.onSlideToWrapperTransitionEnd;swiper.transitionEnd(runCallbacks,direction)};swiper.$wrapperEl[0].addEventListener("transitionend",swiper.onSlideToWrapperTransitionEnd);swiper.$wrapperEl[0].addEventListener("webkitTransitionEnd",
swiper.onSlideToWrapperTransitionEnd)}}return true}function slideToLoop(index,speed,runCallbacks,internal){if(index===void 0)index=0;if(speed===void 0)speed=this.params.speed;if(runCallbacks===void 0)runCallbacks=true;var swiper=this;var newIndex=index;if(swiper.params.loop)newIndex+=swiper.loopedSlides;return swiper.slideTo(newIndex,speed,runCallbacks,internal)}function slideNext(speed,runCallbacks,internal){if(speed===void 0)speed=this.params.speed;if(runCallbacks===void 0)runCallbacks=true;var swiper=
this;var params=swiper.params;var animating=swiper.animating;if(params.loop){if(animating)return false;swiper.loopFix();swiper._clientLeft=swiper.$wrapperEl[0].clientLeft;return swiper.slideTo(swiper.activeIndex+params.slidesPerGroup,speed,runCallbacks,internal)}return swiper.slideTo(swiper.activeIndex+params.slidesPerGroup,speed,runCallbacks,internal)}function slidePrev(speed,runCallbacks,internal){if(speed===void 0)speed=this.params.speed;if(runCallbacks===void 0)runCallbacks=true;var swiper=this;
var params=swiper.params;var animating=swiper.animating;var snapGrid=swiper.snapGrid;var slidesGrid=swiper.slidesGrid;var rtlTranslate=swiper.rtlTranslate;if(params.loop){if(animating)return false;swiper.loopFix();swiper._clientLeft=swiper.$wrapperEl[0].clientLeft}var translate=rtlTranslate?swiper.translate:-swiper.translate;function normalize(val){if(val<0)return-Math.floor(Math.abs(val));return Math.floor(val)}var normalizedTranslate=normalize(translate);var normalizedSnapGrid=snapGrid.map(function(val){return normalize(val)});
var normalizedSlidesGrid=slidesGrid.map(function(val){return normalize(val)});var currentSnap=snapGrid[normalizedSnapGrid.indexOf(normalizedTranslate)];var prevSnap=snapGrid[normalizedSnapGrid.indexOf(normalizedTranslate)-1];var prevIndex;if(typeof prevSnap!=="undefined"){prevIndex=slidesGrid.indexOf(prevSnap);if(prevIndex<0)prevIndex=swiper.activeIndex-1}return swiper.slideTo(prevIndex,speed,runCallbacks,internal)}function slideReset(speed,runCallbacks,internal){if(speed===void 0)speed=this.params.speed;
if(runCallbacks===void 0)runCallbacks=true;var swiper=this;return swiper.slideTo(swiper.activeIndex,speed,runCallbacks,internal)}function slideToClosest(speed,runCallbacks,internal){if(speed===void 0)speed=this.params.speed;if(runCallbacks===void 0)runCallbacks=true;var swiper=this;var index=swiper.activeIndex;var snapIndex=Math.floor(index/swiper.params.slidesPerGroup);if(snapIndex<swiper.snapGrid.length-1){var translate=swiper.rtlTranslate?swiper.translate:-swiper.translate;var currentSnap=swiper.snapGrid[snapIndex];
var nextSnap=swiper.snapGrid[snapIndex+1];if(translate-currentSnap>(nextSnap-currentSnap)/2)index=swiper.params.slidesPerGroup}return swiper.slideTo(index,speed,runCallbacks,internal)}var slide={slideTo:slideTo,slideToLoop:slideToLoop,slideNext:slideNext,slidePrev:slidePrev,slideReset:slideReset,slideToClosest:slideToClosest};function loopCreate(){var swiper=this;var params=swiper.params;var $wrapperEl=swiper.$wrapperEl;$wrapperEl.children("."+params.slideClass+"."+params.slideDuplicateClass).remove();
var slides=$wrapperEl.children("."+params.slideClass);if(params.loopFillGroupWithBlank){var blankSlidesNum=params.slidesPerGroup-slides.length%params.slidesPerGroup;if(blankSlidesNum!==params.slidesPerGroup){for(var i=0;i<blankSlidesNum;i+=1){var blankNode=$(doc.createElement("div")).addClass(params.slideClass+" "+params.slideBlankClass);$wrapperEl.append(blankNode)}slides=$wrapperEl.children("."+params.slideClass)}}if(params.slidesPerView==="auto"&&!params.loopedSlides)params.loopedSlides=slides.length;
swiper.loopedSlides=parseInt(params.loopedSlides||params.slidesPerView,10);swiper.loopedSlides+=params.loopAdditionalSlides;if(swiper.loopedSlides>slides.length)swiper.loopedSlides=slides.length;var prependSlides=[];var appendSlides=[];slides.each(function(index,el){var slide=$(el);if(index<swiper.loopedSlides)appendSlides.push(el);if(index<slides.length&&index>=slides.length-swiper.loopedSlides)prependSlides.push(el);slide.attr("data-swiper-slide-index",index)});for(var i$1=0;i$1<appendSlides.length;i$1+=
1)$wrapperEl.append($(appendSlides[i$1].cloneNode(true)).addClass(params.slideDuplicateClass));for(var i$2=prependSlides.length-1;i$2>=0;i$2-=1)$wrapperEl.prepend($(prependSlides[i$2].cloneNode(true)).addClass(params.slideDuplicateClass))}function loopFix(){var swiper=this;var params=swiper.params;var activeIndex=swiper.activeIndex;var slides=swiper.slides;var loopedSlides=swiper.loopedSlides;var allowSlidePrev=swiper.allowSlidePrev;var allowSlideNext=swiper.allowSlideNext;var snapGrid=swiper.snapGrid;
var rtl=swiper.rtlTranslate;var newIndex;swiper.allowSlidePrev=true;swiper.allowSlideNext=true;var snapTranslate=-snapGrid[activeIndex];var diff=snapTranslate-swiper.getTranslate();if(activeIndex<loopedSlides){newIndex=slides.length-loopedSlides*3+activeIndex;newIndex+=loopedSlides;var slideChanged=swiper.slideTo(newIndex,0,false,true);if(slideChanged&&diff!==0)swiper.setTranslate((rtl?-swiper.translate:swiper.translate)-diff)}else if(params.slidesPerView==="auto"&&activeIndex>=loopedSlides*2||activeIndex>=
slides.length-loopedSlides){newIndex=-slides.length+activeIndex+loopedSlides;newIndex+=loopedSlides;var slideChanged$1=swiper.slideTo(newIndex,0,false,true);if(slideChanged$1&&diff!==0)swiper.setTranslate((rtl?-swiper.translate:swiper.translate)-diff)}swiper.allowSlidePrev=allowSlidePrev;swiper.allowSlideNext=allowSlideNext}function loopDestroy(){var swiper=this;var $wrapperEl=swiper.$wrapperEl;var params=swiper.params;var slides=swiper.slides;$wrapperEl.children("."+params.slideClass+"."+params.slideDuplicateClass+
",."+params.slideClass+"."+params.slideBlankClass).remove();slides.removeAttr("data-swiper-slide-index")}var loop={loopCreate:loopCreate,loopFix:loopFix,loopDestroy:loopDestroy};function appendSlide(slides){var swiper=this;var $wrapperEl=swiper.$wrapperEl;var params=swiper.params;if(params.loop)swiper.loopDestroy();if(typeof slides==="object"&&"length"in slides)for(var i=0;i<slides.length;i+=1){if(slides[i])$wrapperEl.append(slides[i])}else $wrapperEl.append(slides);if(params.loop)swiper.loopCreate();
swiper.update()}function prependSlide(slides){var swiper=this;var params=swiper.params;var $wrapperEl=swiper.$wrapperEl;var activeIndex=swiper.activeIndex;if(params.loop)swiper.loopDestroy();var newActiveIndex=activeIndex+1;if(typeof slides==="object"&&"length"in slides){for(var i=0;i<slides.length;i+=1)if(slides[i])$wrapperEl.prepend(slides[i]);newActiveIndex=activeIndex+slides.length}else $wrapperEl.prepend(slides);if(params.loop)swiper.loopCreate();swiper.update();swiper.slideTo(newActiveIndex,
0,false)}function addSlide(index,slides){var swiper=this;var $wrapperEl=swiper.$wrapperEl;var params=swiper.params;var activeIndex=swiper.activeIndex;var activeIndexBuffer=activeIndex;if(params.loop){activeIndexBuffer-=swiper.loopedSlides;swiper.loopDestroy();swiper.slides=$wrapperEl.children("."+params.slideClass)}var baseLength=swiper.slides.length;if(index<=0){swiper.prependSlide(slides);return}if(index>=baseLength){swiper.appendSlide(slides);return}var newActiveIndex=activeIndexBuffer>index?activeIndexBuffer+
1:activeIndexBuffer;var slidesBuffer=[];for(var i=baseLength-1;i>=index;i-=1){var currentSlide=swiper.slides.eq(i);currentSlide.remove();slidesBuffer.unshift(currentSlide)}if(typeof slides==="object"&&"length"in slides){for(var i$1=0;i$1<slides.length;i$1+=1)if(slides[i$1])$wrapperEl.append(slides[i$1]);newActiveIndex=activeIndexBuffer>index?activeIndexBuffer+slides.length:activeIndexBuffer}else $wrapperEl.append(slides);for(var i$2=0;i$2<slidesBuffer.length;i$2+=1)$wrapperEl.append(slidesBuffer[i$2]);
if(params.loop)swiper.loopCreate();swiper.update();if(params.loop)swiper.slideTo(newActiveIndex+swiper.loopedSlides,0,false);else swiper.slideTo(newActiveIndex,0,false)}function removeSlide(slidesIndexes){var swiper=this;var params=swiper.params;var $wrapperEl=swiper.$wrapperEl;var activeIndex=swiper.activeIndex;var activeIndexBuffer=activeIndex;if(params.loop){activeIndexBuffer-=swiper.loopedSlides;swiper.loopDestroy();swiper.slides=$wrapperEl.children("."+params.slideClass)}var newActiveIndex=activeIndexBuffer;
var indexToRemove;if(typeof slidesIndexes==="object"&&"length"in slidesIndexes){for(var i=0;i<slidesIndexes.length;i+=1){indexToRemove=slidesIndexes[i];if(swiper.slides[indexToRemove])swiper.slides.eq(indexToRemove).remove();if(indexToRemove<newActiveIndex)newActiveIndex-=1}newActiveIndex=Math.max(newActiveIndex,0)}else{indexToRemove=slidesIndexes;if(swiper.slides[indexToRemove])swiper.slides.eq(indexToRemove).remove();if(indexToRemove<newActiveIndex)newActiveIndex-=1;newActiveIndex=Math.max(newActiveIndex,
0)}if(params.loop)swiper.loopCreate();swiper.update();if(params.loop)swiper.slideTo(newActiveIndex+swiper.loopedSlides,0,false);else swiper.slideTo(newActiveIndex,0,false)}function removeAllSlides(){var swiper=this;var slidesIndexes=[];for(var i=0;i<swiper.slides.length;i+=1)slidesIndexes.push(i);swiper.removeSlide(slidesIndexes)}var manipulation={appendSlide:appendSlide,prependSlide:prependSlide,addSlide:addSlide,removeSlide:removeSlide,removeAllSlides:removeAllSlides};var Device=function Device(){var ua=
win.navigator.userAgent;var device={ios:false,android:false,androidChrome:false,desktop:false,windows:false,iphone:false,ipod:false,ipad:false,cordova:win.cordova||win.phonegap,phonegap:win.cordova||win.phonegap};var windows=ua.match(/(Windows Phone);?[\s\/]+([\d.]+)?/);var android=ua.match(/(Android);?[\s\/]+([\d.]+)?/);var ipad=ua.match(/(iPad).*OS\s([\d_]+)/);var ipod=ua.match(/(iPod)(.*OS\s([\d_]+))?/);var iphone=!ipad&&ua.match(/(iPhone\sOS|iOS)\s([\d_]+)/);if(windows){device.os="windows";device.osVersion=
windows[2];device.windows=true}if(android&&!windows){device.os="android";device.osVersion=android[2];device.android=true;device.androidChrome=ua.toLowerCase().indexOf("chrome")>=0}if(ipad||iphone||ipod){device.os="ios";device.ios=true}if(iphone&&!ipod){device.osVersion=iphone[2].replace(/_/g,".");device.iphone=true}if(ipad){device.osVersion=ipad[2].replace(/_/g,".");device.ipad=true}if(ipod){device.osVersion=ipod[3]?ipod[3].replace(/_/g,"."):null;device.iphone=true}if(device.ios&&device.osVersion&&
ua.indexOf("Version/")>=0)if(device.osVersion.split(".")[0]==="10")device.osVersion=ua.toLowerCase().split("version/")[1].split(" ")[0];device.desktop=!(device.os||device.android||device.webView);device.webView=(iphone||ipad||ipod)&&ua.match(/.*AppleWebKit(?!.*Safari)/i);if(device.os&&device.os==="ios"){var osVersionArr=device.osVersion.split(".");var metaViewport=doc.querySelector('meta[name="viewport"]');device.minimalUi=!device.webView&&(ipod||iphone)&&(osVersionArr[0]*1===7?osVersionArr[1]*1>=
1:osVersionArr[0]*1>7)&&metaViewport&&metaViewport.getAttribute("content").indexOf("minimal-ui")>=0}device.pixelRatio=win.devicePixelRatio||1;return device}();function onTouchStart(event){var swiper=this;var data=swiper.touchEventsData;var params=swiper.params;var touches=swiper.touches;if(swiper.animating&&params.preventInteractionOnTransition)return;var e=event;if(e.originalEvent)e=e.originalEvent;data.isTouchEvent=e.type==="touchstart";if(!data.isTouchEvent&&"which"in e&&e.which===3)return;if(!data.isTouchEvent&&
"button"in e&&e.button>0)return;if(data.isTouched&&data.isMoved)return;if(params.noSwiping&&$(e.target).closest(params.noSwipingSelector?params.noSwipingSelector:"."+params.noSwipingClass)[0]){swiper.allowClick=true;return}if(params.swipeHandler)if(!$(e).closest(params.swipeHandler)[0])return;touches.currentX=e.type==="touchstart"?e.targetTouches[0].pageX:e.pageX;touches.currentY=e.type==="touchstart"?e.targetTouches[0].pageY:e.pageY;var startX=touches.currentX;var startY=touches.currentY;var edgeSwipeDetection=
params.edgeSwipeDetection||params.iOSEdgeSwipeDetection;var edgeSwipeThreshold=params.edgeSwipeThreshold||params.iOSEdgeSwipeThreshold;if(edgeSwipeDetection&&(startX<=edgeSwipeThreshold||startX>=win.screen.width-edgeSwipeThreshold))return;Utils.extend(data,{isTouched:true,isMoved:false,allowTouchCallbacks:true,isScrolling:undefined,startMoving:undefined});touches.startX=startX;touches.startY=startY;data.touchStartTime=Utils.now();swiper.allowClick=true;swiper.updateSize();swiper.swipeDirection=undefined;
if(params.threshold>0)data.allowThresholdMove=false;if(e.type!=="touchstart"){var preventDefault=true;if($(e.target).is(data.formElements))preventDefault=false;if(doc.activeElement&&$(doc.activeElement).is(data.formElements)&&doc.activeElement!==e.target)doc.activeElement.blur();var shouldPreventDefault=preventDefault&&swiper.allowTouchMove&&params.touchStartPreventDefault;if(params.touchStartForcePreventDefault||shouldPreventDefault)e.preventDefault()}swiper.emit("touchStart",e)}function onTouchMove(event){var swiper=
this;var data=swiper.touchEventsData;var params=swiper.params;var touches=swiper.touches;var rtl=swiper.rtlTranslate;var e=event;if(e.originalEvent)e=e.originalEvent;if(!data.isTouched){if(data.startMoving&&data.isScrolling)swiper.emit("touchMoveOpposite",e);return}if(data.isTouchEvent&&e.type==="mousemove")return;var pageX=e.type==="touchmove"?e.targetTouches[0].pageX:e.pageX;var pageY=e.type==="touchmove"?e.targetTouches[0].pageY:e.pageY;if(e.preventedByNestedSwiper){touches.startX=pageX;touches.startY=
pageY;return}if(!swiper.allowTouchMove){swiper.allowClick=false;if(data.isTouched){Utils.extend(touches,{startX:pageX,startY:pageY,currentX:pageX,currentY:pageY});data.touchStartTime=Utils.now()}return}if(data.isTouchEvent&&params.touchReleaseOnEdges&&!params.loop)if(swiper.isVertical()){if(pageY<touches.startY&&swiper.translate<=swiper.maxTranslate()||pageY>touches.startY&&swiper.translate>=swiper.minTranslate()){data.isTouched=false;data.isMoved=false;return}}else if(pageX<touches.startX&&swiper.translate<=
swiper.maxTranslate()||pageX>touches.startX&&swiper.translate>=swiper.minTranslate())return;if(data.isTouchEvent&&doc.activeElement)if(e.target===doc.activeElement&&$(e.target).is(data.formElements)){data.isMoved=true;swiper.allowClick=false;return}if(data.allowTouchCallbacks)swiper.emit("touchMove",e);if(e.targetTouches&&e.targetTouches.length>1)return;touches.currentX=pageX;touches.currentY=pageY;var diffX=touches.currentX-touches.startX;var diffY=touches.currentY-touches.startY;if(swiper.params.threshold&&
Math.sqrt(Math.pow(diffX,2)+Math.pow(diffY,2))<swiper.params.threshold)return;if(typeof data.isScrolling==="undefined"){var touchAngle;if(swiper.isHorizontal()&&touches.currentY===touches.startY||swiper.isVertical()&&touches.currentX===touches.startX)data.isScrolling=false;else if(diffX*diffX+diffY*diffY>=25){touchAngle=Math.atan2(Math.abs(diffY),Math.abs(diffX))*180/Math.PI;data.isScrolling=swiper.isHorizontal()?touchAngle>params.touchAngle:90-touchAngle>params.touchAngle}}if(data.isScrolling)swiper.emit("touchMoveOpposite",
e);if(typeof data.startMoving==="undefined")if(touches.currentX!==touches.startX||touches.currentY!==touches.startY)data.startMoving=true;if(data.isScrolling){data.isTouched=false;return}if(!data.startMoving)return;swiper.allowClick=false;e.preventDefault();if(params.touchMoveStopPropagation&&!params.nested)e.stopPropagation();if(!data.isMoved){if(params.loop)swiper.loopFix();data.startTranslate=swiper.getTranslate();swiper.setTransition(0);if(swiper.animating)swiper.$wrapperEl.trigger("webkitTransitionEnd transitionend");
data.allowMomentumBounce=false;swiper.emit("sliderFirstMove",e)}swiper.emit("sliderMove",e);data.isMoved=true;var diff=swiper.isHorizontal()?diffX:diffY;touches.diff=diff;diff*=params.touchRatio;if(rtl)diff=-diff;swiper.swipeDirection=diff>0?"prev":"next";data.currentTranslate=diff+data.startTranslate;var disableParentSwiper=true;var resistanceRatio=params.resistanceRatio;if(params.touchReleaseOnEdges)resistanceRatio=0;if(diff>0&&data.currentTranslate>swiper.minTranslate()){disableParentSwiper=false;
if(params.resistance)data.currentTranslate=swiper.minTranslate()-1+Math.pow(-swiper.minTranslate()+data.startTranslate+diff,resistanceRatio)}else if(diff<0&&data.currentTranslate<swiper.maxTranslate()){disableParentSwiper=false;if(params.resistance)data.currentTranslate=swiper.maxTranslate()+1-Math.pow(swiper.maxTranslate()-data.startTranslate-diff,resistanceRatio)}if(disableParentSwiper)e.preventedByNestedSwiper=true;if(!swiper.allowSlideNext&&swiper.swipeDirection==="next"&&data.currentTranslate<
data.startTranslate)data.currentTranslate=data.startTranslate;if(!swiper.allowSlidePrev&&swiper.swipeDirection==="prev"&&data.currentTranslate>data.startTranslate)data.currentTranslate=data.startTranslate;if(params.threshold>0)if(Math.abs(diff)>params.threshold||data.allowThresholdMove){if(!data.allowThresholdMove){data.allowThresholdMove=true;touches.startX=touches.currentX;touches.startY=touches.currentY;data.currentTranslate=data.startTranslate;touches.diff=swiper.isHorizontal()?touches.currentX-
touches.startX:touches.currentY-touches.startY;return}}else{data.currentTranslate=data.startTranslate;return}if(!params.followFinger)return;swiper.updateProgress(data.currentTranslate);swiper.setTranslate(data.currentTranslate)}function onTouchEnd(event){var swiper=this;var data=swiper.touchEventsData;var params=swiper.params;var touches=swiper.touches;var rtl=swiper.rtlTranslate;var $wrapperEl=swiper.$wrapperEl;var slidesGrid=swiper.slidesGrid;var snapGrid=swiper.snapGrid;var e=event;if(e.originalEvent)e=
e.originalEvent;if(data.allowTouchCallbacks)swiper.emit("touchEnd",e);data.allowTouchCallbacks=false;if(!data.isTouched){data.isMoved=false;data.startMoving=false;return}var touchEndTime=Utils.now();var timeDiff=touchEndTime-data.touchStartTime;if(swiper.allowClick){swiper.updateClickedSlide(e);swiper.emit("tap",e);if(timeDiff<300&&touchEndTime-data.lastClickTime>300){if(data.clickTimeout)clearTimeout(data.clickTimeout);data.clickTimeout=Utils.nextTick(function(){if(!swiper||swiper.destroyed)return;
swiper.emit("click",e)},300)}if(timeDiff<300&&touchEndTime-data.lastClickTime<300){if(data.clickTimeout)clearTimeout(data.clickTimeout);swiper.emit("doubleTap",e)}}data.lastClickTime=Utils.now();Utils.nextTick(function(){if(!swiper.destroyed)swiper.allowClick=true});if(!data.isTouched||!data.isMoved||!swiper.swipeDirection||touches.diff===0||data.currentTranslate===data.startTranslate){data.isTouched=false;data.isMoved=false;data.startMoving=false;return}data.isTouched=false;data.isMoved=false;data.startMoving=
false;var currentPos;if(params.followFinger)currentPos=rtl?swiper.translate:-swiper.translate;else currentPos=-data.currentTranslate;var stopIndex=0;var groupSize=swiper.slidesSizesGrid[0];for(var i=0;i<slidesGrid.length;i+=params.slidesPerGroup)if(typeof slidesGrid[i+params.slidesPerGroup]!=="undefined"){if(currentPos>=slidesGrid[i]&&currentPos<slidesGrid[i+params.slidesPerGroup]){stopIndex=i;groupSize=slidesGrid[i+params.slidesPerGroup]-slidesGrid[i]}}else if(currentPos>=slidesGrid[i]){stopIndex=
i;groupSize=slidesGrid[slidesGrid.length-1]-slidesGrid[slidesGrid.length-2]}var ratio=(currentPos-slidesGrid[stopIndex])/groupSize;if(timeDiff>params.longSwipesMs){if(!params.longSwipes){swiper.slideTo(swiper.activeIndex);return}if(swiper.swipeDirection==="next")if(ratio>=params.longSwipesRatio)swiper.slideTo(stopIndex+params.slidesPerGroup);else swiper.slideTo(stopIndex);if(swiper.swipeDirection==="prev")if(ratio>1-params.longSwipesRatio)swiper.slideTo(stopIndex+params.slidesPerGroup);else swiper.slideTo(stopIndex)}else{if(!params.shortSwipes){swiper.slideTo(swiper.activeIndex);
return}if(swiper.swipeDirection==="next")swiper.slideTo(stopIndex+params.slidesPerGroup);if(swiper.swipeDirection==="prev")swiper.slideTo(stopIndex)}}function onResize(){var swiper=this;var params=swiper.params;var el=swiper.el;if(el&&el.offsetWidth===0)return;if(params.breakpoints)swiper.setBreakpoint();var allowSlideNext=swiper.allowSlideNext;var allowSlidePrev=swiper.allowSlidePrev;var snapGrid=swiper.snapGrid;swiper.allowSlideNext=true;swiper.allowSlidePrev=true;swiper.updateSize();swiper.updateSlides();
swiper.updateSlidesClasses();if((params.slidesPerView==="auto"||params.slidesPerView>1)&&swiper.isEnd&&!swiper.params.centeredSlides)swiper.slideTo(swiper.slides.length-1,0,false,true);else swiper.slideTo(swiper.activeIndex,0,false,true);swiper.allowSlidePrev=allowSlidePrev;swiper.allowSlideNext=allowSlideNext}function onClick(e){var swiper=this;if(!swiper.allowClick){if(swiper.params.preventClicks)e.preventDefault();if(swiper.params.preventClicksPropagation&&swiper.animating){e.stopPropagation();
e.stopImmediatePropagation()}}}function attachEvents(){var swiper=this;var params=swiper.params;var touchEvents=swiper.touchEvents;var el=swiper.el;var wrapperEl=swiper.wrapperEl;{swiper.onTouchStart=onTouchStart.bind(swiper);swiper.onTouchMove=onTouchMove.bind(swiper);swiper.onTouchEnd=onTouchEnd.bind(swiper)}swiper.onClick=onClick.bind(swiper);var target=params.touchEventsTarget==="container"?el:wrapperEl;var capture=!!params.nested;{if(!Support.touch&&(Support.pointerEvents||Support.prefixedPointerEvents)){target.addEventListener(touchEvents.start,
swiper.onTouchStart,false);doc.addEventListener(touchEvents.move,swiper.onTouchMove,capture);doc.addEventListener(touchEvents.end,swiper.onTouchEnd,false)}else{if(Support.touch){var passiveListener=touchEvents.start==="touchstart"&&Support.passiveListener&&params.passiveListeners?{passive:true,capture:false}:false;target.addEventListener(touchEvents.start,swiper.onTouchStart,passiveListener);target.addEventListener(touchEvents.move,swiper.onTouchMove,Support.passiveListener?{passive:false,capture:capture}:
capture);target.addEventListener(touchEvents.end,swiper.onTouchEnd,passiveListener)}if(params.simulateTouch&&!Device.ios&&!Device.android||params.simulateTouch&&!Support.touch&&Device.ios){target.addEventListener("mousedown",swiper.onTouchStart,false);doc.addEventListener("mousemove",swiper.onTouchMove,capture);doc.addEventListener("mouseup",swiper.onTouchEnd,false)}}if(params.preventClicks||params.preventClicksPropagation)target.addEventListener("click",swiper.onClick,true)}swiper.on(Device.ios||
Device.android?"resize orientationchange":"resize",onResize,true)}function detachEvents(){var swiper=this;var params=swiper.params;var touchEvents=swiper.touchEvents;var el=swiper.el;var wrapperEl=swiper.wrapperEl;var target=params.touchEventsTarget==="container"?el:wrapperEl;var capture=!!params.nested;{if(!Support.touch&&(Support.pointerEvents||Support.prefixedPointerEvents)){target.removeEventListener(touchEvents.start,swiper.onTouchStart,false);doc.removeEventListener(touchEvents.move,swiper.onTouchMove,
capture);doc.removeEventListener(touchEvents.end,swiper.onTouchEnd,false)}else{if(Support.touch){var passiveListener=touchEvents.start==="onTouchStart"&&Support.passiveListener&&params.passiveListeners?{passive:true,capture:false}:false;target.removeEventListener(touchEvents.start,swiper.onTouchStart,passiveListener);target.removeEventListener(touchEvents.move,swiper.onTouchMove,capture);target.removeEventListener(touchEvents.end,swiper.onTouchEnd,passiveListener)}if(params.simulateTouch&&!Device.ios&&
!Device.android||params.simulateTouch&&!Support.touch&&Device.ios){target.removeEventListener("mousedown",swiper.onTouchStart,false);doc.removeEventListener("mousemove",swiper.onTouchMove,capture);doc.removeEventListener("mouseup",swiper.onTouchEnd,false)}}if(params.preventClicks||params.preventClicksPropagation)target.removeEventListener("click",swiper.onClick,true)}swiper.off(Device.ios||Device.android?"resize orientationchange":"resize",onResize)}var events={attachEvents:attachEvents,detachEvents:detachEvents};
function setBreakpoint(){var swiper=this;var activeIndex=swiper.activeIndex;var initialized=swiper.initialized;var loopedSlides=swiper.loopedSlides;if(loopedSlides===void 0)loopedSlides=0;var params=swiper.params;var breakpoints=params.breakpoints;if(!breakpoints||breakpoints&&Object.keys(breakpoints).length===0)return;var breakpoint=swiper.getBreakpoint(breakpoints);if(breakpoint&&swiper.currentBreakpoint!==breakpoint){var breakpointOnlyParams=breakpoint in breakpoints?breakpoints[breakpoint]:undefined;
if(breakpointOnlyParams)["slidesPerView","spaceBetween","slidesPerGroup"].forEach(function(param){var paramValue=breakpointOnlyParams[param];if(typeof paramValue==="undefined")return;if(param==="slidesPerView"&&(paramValue==="AUTO"||paramValue==="auto"))breakpointOnlyParams[param]="auto";else if(param==="slidesPerView")breakpointOnlyParams[param]=parseFloat(paramValue);else breakpointOnlyParams[param]=parseInt(paramValue,10)});var breakpointParams=breakpointOnlyParams||swiper.originalParams;var directionChanged=
breakpointParams.direction&&breakpointParams.direction!==params.direction;var needsReLoop=params.loop&&(breakpointParams.slidesPerView!==params.slidesPerView||directionChanged);if(directionChanged&&initialized)swiper.changeDirection();Utils.extend(swiper.params,breakpointParams);Utils.extend(swiper,{allowTouchMove:swiper.params.allowTouchMove,allowSlideNext:swiper.params.allowSlideNext,allowSlidePrev:swiper.params.allowSlidePrev});swiper.currentBreakpoint=breakpoint;if(needsReLoop&&initialized){swiper.loopDestroy();
swiper.loopCreate();swiper.updateSlides();swiper.slideTo(activeIndex-loopedSlides+swiper.loopedSlides,0,false)}swiper.emit("breakpoint",breakpointParams)}}function getBreakpoint(breakpoints){var swiper=this;if(!breakpoints)return undefined;var breakpoint=false;var points=[];Object.keys(breakpoints).forEach(function(point){points.push(point)});points.sort(function(a,b){return parseInt(a,10)-parseInt(b,10)});for(var i=0;i<points.length;i+=1){var point=points[i];if(swiper.params.breakpointsInverse){if(point<=
win.innerWidth)breakpoint=point}else if(point>=win.innerWidth&&!breakpoint)breakpoint=point}return breakpoint||"max"}var breakpoints={setBreakpoint:setBreakpoint,getBreakpoint:getBreakpoint};function addClasses(){var swiper=this;var classNames=swiper.classNames;var params=swiper.params;var rtl=swiper.rtl;var $el=swiper.$el;var suffixes=[];suffixes.push("initialized");suffixes.push(params.direction);if(rtl)suffixes.push("rtl");if(params.slidesPerColumn>1)suffixes.push("multirow");if(Device.android)suffixes.push("android");
if(Device.ios)suffixes.push("ios");if((Browser.isIE||Browser.isEdge)&&(Support.pointerEvents||Support.prefixedPointerEvents))suffixes.push("wp8-"+params.direction);suffixes.forEach(function(suffix){classNames.push(params.containerModifierClass+suffix)});$el.addClass(classNames.join(" "))}function removeClasses(){var swiper=this;var $el=swiper.$el;var classNames=swiper.classNames;$el.removeClass(classNames.join(" "))}var classes={addClasses:addClasses,removeClasses:removeClasses};function loadImage(imageEl,
src,srcset,sizes,checkForComplete,callback){var image;function onReady(){if(callback)callback()}if(!imageEl.complete||!checkForComplete)if(src){image=new win.Image;image.onload=onReady;image.onerror=onReady;if(sizes)image.sizes=sizes;if(srcset)image.srcset=srcset;if(src)image.src=src}else onReady();else onReady()}function preloadImages(){var swiper=this;swiper.imagesToLoad=swiper.$el.find("img");function onReady(){if(typeof swiper==="undefined"||swiper===null||!swiper||swiper.destroyed)return;if(swiper.imagesLoaded!==
undefined)swiper.imagesLoaded+=1;if(swiper.imagesLoaded===swiper.imagesToLoad.length){if(swiper.params.updateOnImagesReady)swiper.update();swiper.emit("imagesReady")}}for(var i=0;i<swiper.imagesToLoad.length;i+=1){var imageEl=swiper.imagesToLoad[i];swiper.loadImage(imageEl,imageEl.currentSrc||imageEl.getAttribute("src"),imageEl.srcset||imageEl.getAttribute("srcset"),imageEl.sizes||imageEl.getAttribute("sizes"),true,onReady)}}var images={loadImage:loadImage,preloadImages:preloadImages};var defaults=
{init:true,direction:"horizontal",touchEventsTarget:"container",initialSlide:0,speed:300,preventInteractionOnTransition:false,edgeSwipeDetection:false,edgeSwipeThreshold:20,effect:"slide",breakpoints:undefined,breakpointsInverse:false,spaceBetween:0,slidesPerView:1,slidesPerColumn:1,slidesPerColumnFill:"column",slidesPerGroup:1,centeredSlides:false,slidesOffsetBefore:0,slidesOffsetAfter:0,normalizeSlideIndex:true,touchRatio:1,touchAngle:45,simulateTouch:true,shortSwipes:true,longSwipes:true,longSwipesRatio:.5,
longSwipesMs:300,followFinger:true,allowTouchMove:true,threshold:0,touchMoveStopPropagation:true,touchStartPreventDefault:true,touchStartForcePreventDefault:false,touchReleaseOnEdges:false,uniqueNavElements:true,resistance:true,resistanceRatio:.85,preventClicks:true,preventClicksPropagation:true,preloadImages:true,updateOnImagesReady:true,loop:false,loopAdditionalSlides:0,loopedSlides:null,loopFillGroupWithBlank:false,allowSlidePrev:true,allowSlideNext:true,swipeHandler:null,noSwiping:true,noSwipingClass:"swiper-no-swiping",
noSwipingSelector:null,passiveListeners:true,containerModifierClass:"swiper-container-",slideClass:"swiper-slide",slideBlankClass:"swiper-slide-invisible-blank",slideActiveClass:"swiper-slide-active",slideDuplicateActiveClass:"swiper-slide-duplicate-active",slideVisibleClass:"swiper-slide-visible",slideDuplicateClass:"swiper-slide-duplicate",slideNextClass:"swiper-slide-next",slideDuplicateNextClass:"swiper-slide-duplicate-next",slidePrevClass:"swiper-slide-prev",slideDuplicatePrevClass:"swiper-slide-duplicate-prev",
wrapperClass:"swiper-wrapper",runCallbacksOnInit:true};var prototypes={update:update,translate:translate,transition:transition$1,slide:slide,loop:loop,manipulation:manipulation,events:events,breakpoints:breakpoints,classes:classes,images:images};var extendedDefaults={};var Swiper=function(SwiperClass){function Swiper(){var assign;var args=[],len=arguments.length;while(len--)args[len]=arguments[len];var el;var params;if(args.length===1&&args[0].constructor&&args[0].constructor===Object)params=args[0];
else assign=args,el=assign[0],params=assign[1];if(!params)params={};params=Utils.extend({},params);if(el&&!params.el)params.el=el;SwiperClass.call(this,params);Object.keys(prototypes).forEach(function(prototypeGroup){Object.keys(prototypes[prototypeGroup]).forEach(function(protoMethod){if(!Swiper.prototype[protoMethod])Swiper.prototype[protoMethod]=prototypes[prototypeGroup][protoMethod]})});var swiper=this;if(typeof swiper.modules==="undefined")swiper.modules={};Object.keys(swiper.modules).forEach(function(moduleName){var module=
swiper.modules[moduleName];if(module.params){var moduleParamName=Object.keys(module.params)[0];var moduleParams=module.params[moduleParamName];if(typeof moduleParams!=="object"||moduleParams===null)return;if(!(moduleParamName in params&&"enabled"in moduleParams))return;if(params[moduleParamName]===true)params[moduleParamName]={enabled:true};if(typeof params[moduleParamName]==="object"&&!("enabled"in params[moduleParamName]))params[moduleParamName].enabled=true;if(!params[moduleParamName])params[moduleParamName]=
{enabled:false}}});var swiperParams=Utils.extend({},defaults);swiper.useModulesParams(swiperParams);swiper.params=Utils.extend({},swiperParams,extendedDefaults,params);swiper.originalParams=Utils.extend({},swiper.params);swiper.passedParams=Utils.extend({},params);swiper.$=$;var $el=$(swiper.params.el);el=$el[0];if(!el)return undefined;if($el.length>1){var swipers=[];$el.each(function(index,containerEl){var newParams=Utils.extend({},params,{el:containerEl});swipers.push(new Swiper(newParams))});return swipers}el.swiper=
swiper;$el.data("swiper",swiper);var $wrapperEl=$el.children("."+swiper.params.wrapperClass);Utils.extend(swiper,{$el:$el,el:el,$wrapperEl:$wrapperEl,wrapperEl:$wrapperEl[0],classNames:[],slides:$(),slidesGrid:[],snapGrid:[],slidesSizesGrid:[],isHorizontal:function isHorizontal(){return swiper.params.direction==="horizontal"},isVertical:function isVertical(){return swiper.params.direction==="vertical"},rtl:el.dir.toLowerCase()==="rtl"||$el.css("direction")==="rtl",rtlTranslate:swiper.params.direction===
"horizontal"&&(el.dir.toLowerCase()==="rtl"||$el.css("direction")==="rtl"),wrongRTL:$wrapperEl.css("display")==="-webkit-box",activeIndex:0,realIndex:0,isBeginning:true,isEnd:false,translate:0,previousTranslate:0,progress:0,velocity:0,animating:false,allowSlideNext:swiper.params.allowSlideNext,allowSlidePrev:swiper.params.allowSlidePrev,touchEvents:function touchEvents(){var touch=["touchstart","touchmove","touchend"];var desktop=["mousedown","mousemove","mouseup"];if(Support.pointerEvents)desktop=
["pointerdown","pointermove","pointerup"];else if(Support.prefixedPointerEvents)desktop=["MSPointerDown","MSPointerMove","MSPointerUp"];swiper.touchEventsTouch={start:touch[0],move:touch[1],end:touch[2]};swiper.touchEventsDesktop={start:desktop[0],move:desktop[1],end:desktop[2]};return Support.touch||!swiper.params.simulateTouch?swiper.touchEventsTouch:swiper.touchEventsDesktop}(),touchEventsData:{isTouched:undefined,isMoved:undefined,allowTouchCallbacks:undefined,touchStartTime:undefined,isScrolling:undefined,
currentTranslate:undefined,startTranslate:undefined,allowThresholdMove:undefined,formElements:"input, select, option, textarea, button, video",lastClickTime:Utils.now(),clickTimeout:undefined,velocities:[],allowMomentumBounce:undefined,isTouchEvent:undefined,startMoving:undefined},allowClick:true,allowTouchMove:swiper.params.allowTouchMove,touches:{startX:0,startY:0,currentX:0,currentY:0,diff:0},imagesToLoad:[],imagesLoaded:0});swiper.useModules();if(swiper.params.init)swiper.init();return swiper}
if(SwiperClass)Swiper.__proto__=SwiperClass;Swiper.prototype=Object.create(SwiperClass&&SwiperClass.prototype);Swiper.prototype.constructor=Swiper;var staticAccessors={extendedDefaults:{configurable:true},defaults:{configurable:true},Class:{configurable:true},$:{configurable:true}};Swiper.prototype.slidesPerViewDynamic=function slidesPerViewDynamic(){var swiper=this;var params=swiper.params;var slides=swiper.slides;var slidesGrid=swiper.slidesGrid;var swiperSize=swiper.size;var activeIndex=swiper.activeIndex;
var spv=1;if(params.centeredSlides){var slideSize=slides[activeIndex].swiperSlideSize;var breakLoop;for(var i=activeIndex+1;i<slides.length;i+=1)if(slides[i]&&!breakLoop){slideSize+=slides[i].swiperSlideSize;spv+=1;if(slideSize>swiperSize)breakLoop=true}for(var i$1=activeIndex-1;i$1>=0;i$1-=1)if(slides[i$1]&&!breakLoop){slideSize+=slides[i$1].swiperSlideSize;spv+=1;if(slideSize>swiperSize)breakLoop=true}}else for(var i$2=activeIndex+1;i$2<slides.length;i$2+=1)if(slidesGrid[i$2]-slidesGrid[activeIndex]<
swiperSize)spv+=1;return spv};Swiper.prototype.update=function update(){var swiper=this;if(!swiper||swiper.destroyed)return;var snapGrid=swiper.snapGrid;var params=swiper.params;if(params.breakpoints)swiper.setBreakpoint();swiper.updateSize();swiper.updateSlides();swiper.updateProgress();swiper.updateSlidesClasses();function setTranslate(){var translateValue=swiper.rtlTranslate?swiper.translate*-1:swiper.translate;var newTranslate=Math.min(Math.max(translateValue,swiper.maxTranslate()),swiper.minTranslate());
swiper.setTranslate(newTranslate);swiper.updateActiveIndex();swiper.updateSlidesClasses()}var translated;if((swiper.params.slidesPerView==="auto"||swiper.params.slidesPerView>1)&&swiper.isEnd&&!swiper.params.centeredSlides)translated=swiper.slideTo(swiper.slides.length-1,0,false,true);else translated=swiper.slideTo(swiper.activeIndex,0,false,true);if(!translated)setTranslate();swiper.emit("update")};Swiper.prototype.changeDirection=function changeDirection(newDirection,needUpdate){if(needUpdate===
void 0)needUpdate=true;var swiper=this;var currentDirection=swiper.params.direction;if(!newDirection)newDirection=currentDirection==="horizontal"?"vertical":"horizontal";if(newDirection===currentDirection||newDirection!=="horizontal"&&newDirection!=="vertical")return swiper;if(currentDirection==="vertical"){swiper.$el.removeClass(swiper.params.containerModifierClass+"vertical wp8-vertical").addClass(""+swiper.params.containerModifierClass+newDirection);if((Browser.isIE||Browser.isEdge)&&(Support.pointerEvents||
Support.prefixedPointerEvents))swiper.$el.addClass(swiper.params.containerModifierClass+"wp8-"+newDirection)}if(currentDirection==="horizontal"){swiper.$el.removeClass(swiper.params.containerModifierClass+"horizontal wp8-horizontal").addClass(""+swiper.params.containerModifierClass+newDirection);if((Browser.isIE||Browser.isEdge)&&(Support.pointerEvents||Support.prefixedPointerEvents))swiper.$el.addClass(swiper.params.containerModifierClass+"wp8-"+newDirection)}swiper.params.direction=newDirection;
swiper.slides.each(function(slideIndex,slideEl){if(newDirection==="vertical")slideEl.style.width="";else slideEl.style.height=""});swiper.emit("changeDirection");if(needUpdate)swiper.update();return swiper};Swiper.prototype.init=function init(){var swiper=this;if(swiper.initialized)return;swiper.emit("beforeInit");if(swiper.params.breakpoints)swiper.setBreakpoint();swiper.addClasses();if(swiper.params.loop)swiper.loopCreate();swiper.updateSize();swiper.updateSlides();if(swiper.params.preloadImages)swiper.preloadImages();
if(swiper.params.loop)swiper.slideTo(swiper.params.initialSlide+swiper.loopedSlides,0,swiper.params.runCallbacksOnInit);else swiper.slideTo(swiper.params.initialSlide,0,swiper.params.runCallbacksOnInit);swiper.attachEvents();swiper.initialized=true;swiper.emit("init")};Swiper.prototype.destroy=function destroy(deleteInstance,cleanStyles){if(deleteInstance===void 0)deleteInstance=true;if(cleanStyles===void 0)cleanStyles=true;var swiper=this;var params=swiper.params;var $el=swiper.$el;var $wrapperEl=
swiper.$wrapperEl;var slides=swiper.slides;if(typeof swiper.params==="undefined"||swiper.destroyed)return null;swiper.emit("beforeDestroy");swiper.initialized=false;swiper.detachEvents();if(params.loop)swiper.loopDestroy();if(cleanStyles){swiper.removeClasses();$el.removeAttr("style");$wrapperEl.removeAttr("style");if(slides&&slides.length)slides.removeClass([params.slideVisibleClass,params.slideActiveClass,params.slideNextClass,params.slidePrevClass].join(" ")).removeAttr("style").removeAttr("data-swiper-slide-index").removeAttr("data-swiper-column").removeAttr("data-swiper-row")}swiper.emit("destroy");
Object.keys(swiper.eventsListeners).forEach(function(eventName){swiper.off(eventName)});if(deleteInstance!==false){swiper.$el[0].swiper=null;swiper.$el.data("swiper",null);Utils.deleteProps(swiper)}swiper.destroyed=true;return null};Swiper.extendDefaults=function extendDefaults(newDefaults){Utils.extend(extendedDefaults,newDefaults)};staticAccessors.extendedDefaults.get=function(){return extendedDefaults};staticAccessors.defaults.get=function(){return defaults};staticAccessors.Class.get=function(){return SwiperClass};
staticAccessors.$.get=function(){return $};Object.defineProperties(Swiper,staticAccessors);return Swiper}(SwiperClass);var Device$1={name:"device",proto:{device:Device},"static":{device:Device}};var Support$1={name:"support",proto:{support:Support},"static":{support:Support}};var Browser$1={name:"browser",proto:{browser:Browser},"static":{browser:Browser}};var Resize={name:"resize",create:function create(){var swiper=this;Utils.extend(swiper,{resize:{resizeHandler:function resizeHandler(){if(!swiper||
swiper.destroyed||!swiper.initialized)return;swiper.emit("beforeResize");swiper.emit("resize")},orientationChangeHandler:function orientationChangeHandler(){if(!swiper||swiper.destroyed||!swiper.initialized)return;swiper.emit("orientationchange")}}})},on:{init:function init(){var swiper=this;win.addEventListener("resize",swiper.resize.resizeHandler);win.addEventListener("orientationchange",swiper.resize.orientationChangeHandler)},destroy:function destroy(){var swiper=this;win.removeEventListener("resize",
swiper.resize.resizeHandler);win.removeEventListener("orientationchange",swiper.resize.orientationChangeHandler)}}};var Navigation={update:function update(){var swiper=this;var params=swiper.params.navigation;if(swiper.params.loop)return;var ref=swiper.navigation;var $nextEl=ref.$nextEl;var $prevEl=ref.$prevEl;if($prevEl&&$prevEl.length>0){if(swiper.isBeginning)$prevEl.addClass(params.disabledClass);else $prevEl.removeClass(params.disabledClass);$prevEl["removeClass"](params.lockClass)}if($nextEl&&
$nextEl.length>0){if(swiper.isEnd)$nextEl.addClass(params.disabledClass);else $nextEl.removeClass(params.disabledClass);$nextEl["removeClass"](params.lockClass)}},onPrevClick:function onPrevClick(e){var swiper=this;e.preventDefault();if(swiper.isBeginning&&!swiper.params.loop)return;swiper.slidePrev()},onNextClick:function onNextClick(e){var swiper=this;e.preventDefault();if(swiper.isEnd&&!swiper.params.loop)return;swiper.slideNext()},init:function init(){var swiper=this;var params=swiper.params.navigation;
if(!(params.nextEl||params.prevEl))return;var $nextEl;var $prevEl;if(params.nextEl){$nextEl=$(params.nextEl);if(swiper.params.uniqueNavElements&&typeof params.nextEl==="string"&&$nextEl.length>1&&swiper.$el.find(params.nextEl).length===1)$nextEl=swiper.$el.find(params.nextEl)}if(params.prevEl){$prevEl=$(params.prevEl);if(swiper.params.uniqueNavElements&&typeof params.prevEl==="string"&&$prevEl.length>1&&swiper.$el.find(params.prevEl).length===1)$prevEl=swiper.$el.find(params.prevEl)}if($nextEl&&$nextEl.length>
0)$nextEl.on("click",swiper.navigation.onNextClick);if($prevEl&&$prevEl.length>0)$prevEl.on("click",swiper.navigation.onPrevClick);Utils.extend(swiper.navigation,{$nextEl:$nextEl,nextEl:$nextEl&&$nextEl[0],$prevEl:$prevEl,prevEl:$prevEl&&$prevEl[0]})},destroy:function destroy(){var swiper=this;var ref=swiper.navigation;var $nextEl=ref.$nextEl;var $prevEl=ref.$prevEl;if($nextEl&&$nextEl.length){$nextEl.off("click",swiper.navigation.onNextClick);$nextEl.removeClass(swiper.params.navigation.disabledClass)}if($prevEl&&
$prevEl.length){$prevEl.off("click",swiper.navigation.onPrevClick);$prevEl.removeClass(swiper.params.navigation.disabledClass)}}};var Navigation$1={name:"navigation",params:{navigation:{nextEl:null,prevEl:null,hideOnClick:false,disabledClass:"swiper-button-disabled",hiddenClass:"swiper-button-hidden",lockClass:"swiper-button-lock"}},create:function create(){var swiper=this;Utils.extend(swiper,{navigation:{init:Navigation.init.bind(swiper),update:Navigation.update.bind(swiper),destroy:Navigation.destroy.bind(swiper),
onNextClick:Navigation.onNextClick.bind(swiper),onPrevClick:Navigation.onPrevClick.bind(swiper)}})},on:{init:function init(){var swiper=this;swiper.navigation.init();swiper.navigation.update()},toEdge:function toEdge(){var swiper=this;swiper.navigation.update()},fromEdge:function fromEdge(){var swiper=this;swiper.navigation.update()},destroy:function destroy(){var swiper=this;swiper.navigation.destroy()},click:function click(e){var swiper=this;var ref=swiper.navigation;var $nextEl=ref.$nextEl;var $prevEl=
ref.$prevEl;if(swiper.params.navigation.hideOnClick&&!$(e.target).is($prevEl)&&!$(e.target).is($nextEl)){var isHidden;if($nextEl)isHidden=$nextEl.hasClass(swiper.params.navigation.hiddenClass);else if($prevEl)isHidden=$prevEl.hasClass(swiper.params.navigation.hiddenClass);if(isHidden===true)swiper.emit("navigationShow",swiper);else swiper.emit("navigationHide",swiper);if($nextEl)$nextEl.toggleClass(swiper.params.navigation.hiddenClass);if($prevEl)$prevEl.toggleClass(swiper.params.navigation.hiddenClass)}}}};
var Pagination={update:function update(){var swiper=this;var rtl=swiper.rtl;var params=swiper.params.pagination;if(!params.el||!swiper.pagination.el||!swiper.pagination.$el||swiper.pagination.$el.length===0)return;var slidesLength=swiper.virtual&&swiper.params.virtual.enabled?swiper.virtual.slides.length:swiper.slides.length;var $el=swiper.pagination.$el;var current;var total=swiper.params.loop?Math.ceil((slidesLength-swiper.loopedSlides*2)/swiper.params.slidesPerGroup):swiper.snapGrid.length;if(swiper.params.loop){current=
Math.ceil((swiper.activeIndex-swiper.loopedSlides)/swiper.params.slidesPerGroup);if(current>slidesLength-1-swiper.loopedSlides*2)current-=slidesLength-swiper.loopedSlides*2;if(current>total-1)current-=total;if(current<0&&swiper.params.paginationType!=="bullets")current=total+current}else if(typeof swiper.snapIndex!=="undefined")current=swiper.snapIndex;else current=swiper.activeIndex||0;if(params.type==="bullets"&&swiper.pagination.bullets&&swiper.pagination.bullets.length>0){var bullets=swiper.pagination.bullets;
var firstIndex;var lastIndex;var midIndex;if(params.dynamicBullets){swiper.pagination.bulletSize=bullets.eq(0)[swiper.isHorizontal()?"outerWidth":"outerHeight"](true);$el.css(swiper.isHorizontal()?"width":"height",swiper.pagination.bulletSize*(params.dynamicMainBullets+4)+"px");if(params.dynamicMainBullets>1&&swiper.previousIndex!==undefined){swiper.pagination.dynamicBulletIndex+=current-swiper.previousIndex;if(swiper.pagination.dynamicBulletIndex>params.dynamicMainBullets-1)swiper.pagination.dynamicBulletIndex=
params.dynamicMainBullets-1;else if(swiper.pagination.dynamicBulletIndex<0)swiper.pagination.dynamicBulletIndex=0}firstIndex=current-swiper.pagination.dynamicBulletIndex;lastIndex=firstIndex+(Math.min(bullets.length,params.dynamicMainBullets)-1);midIndex=(lastIndex+firstIndex)/2}bullets.removeClass(params.bulletActiveClass+" "+params.bulletActiveClass+"-next "+params.bulletActiveClass+"-next-next "+params.bulletActiveClass+"-prev "+params.bulletActiveClass+"-prev-prev "+params.bulletActiveClass+"-main");
if($el.length>1)bullets.each(function(index,bullet){var $bullet=$(bullet);var bulletIndex=$bullet.index();if(bulletIndex===current)$bullet.addClass(params.bulletActiveClass);if(params.dynamicBullets){if(bulletIndex>=firstIndex&&bulletIndex<=lastIndex)$bullet.addClass(params.bulletActiveClass+"-main");if(bulletIndex===firstIndex)$bullet.prev().addClass(params.bulletActiveClass+"-prev").prev().addClass(params.bulletActiveClass+"-prev-prev");if(bulletIndex===lastIndex)$bullet.next().addClass(params.bulletActiveClass+
"-next").next().addClass(params.bulletActiveClass+"-next-next")}});else{var $bullet=bullets.eq(current);$bullet.addClass(params.bulletActiveClass);if(params.dynamicBullets){var $firstDisplayedBullet=bullets.eq(firstIndex);var $lastDisplayedBullet=bullets.eq(lastIndex);for(var i=firstIndex;i<=lastIndex;i+=1)bullets.eq(i).addClass(params.bulletActiveClass+"-main");$firstDisplayedBullet.prev().addClass(params.bulletActiveClass+"-prev").prev().addClass(params.bulletActiveClass+"-prev-prev");$lastDisplayedBullet.next().addClass(params.bulletActiveClass+
"-next").next().addClass(params.bulletActiveClass+"-next-next")}}if(params.dynamicBullets){var dynamicBulletsLength=Math.min(bullets.length,params.dynamicMainBullets+4);var bulletsOffset=(swiper.pagination.bulletSize*dynamicBulletsLength-swiper.pagination.bulletSize)/2-midIndex*swiper.pagination.bulletSize;var offsetProp=rtl?"right":"left";bullets.css(swiper.isHorizontal()?offsetProp:"top",bulletsOffset+"px")}}if(params.type==="fraction"){$el.find("."+params.currentClass).text(params.formatFractionCurrent(current+
1));$el.find("."+params.totalClass).text(params.formatFractionTotal(total))}if(params.type==="progressbar"){var progressbarDirection;if(params.progressbarOpposite)progressbarDirection=swiper.isHorizontal()?"vertical":"horizontal";else progressbarDirection=swiper.isHorizontal()?"horizontal":"vertical";var scale=(current+1)/total;var scaleX=1;var scaleY=1;if(progressbarDirection==="horizontal")scaleX=scale;else scaleY=scale;$el.find("."+params.progressbarFillClass).transform("translate3d(0,0,0) scaleX("+
scaleX+") scaleY("+scaleY+")").transition(swiper.params.speed)}if(params.type==="custom"&&params.renderCustom){$el.html(params.renderCustom(swiper,current+1,total));swiper.emit("paginationRender",swiper,$el[0])}else swiper.emit("paginationUpdate",swiper,$el[0]);$el["removeClass"](params.lockClass)},render:function render(){var swiper=this;var params=swiper.params.pagination;if(!params.el||!swiper.pagination.el||!swiper.pagination.$el||swiper.pagination.$el.length===0)return;var slidesLength=swiper.virtual&&
swiper.params.virtual.enabled?swiper.virtual.slides.length:swiper.slides.length;var $el=swiper.pagination.$el;var paginationHTML="";if(params.type==="bullets"){var numberOfBullets=swiper.params.loop?Math.ceil((slidesLength-swiper.loopedSlides*2)/swiper.params.slidesPerGroup):swiper.snapGrid.length;for(var i=0;i<numberOfBullets;i+=1)if(params.renderBullet)paginationHTML+=params.renderBullet.call(swiper,i,params.bulletClass);else paginationHTML+="<"+params.bulletElement+' class="'+params.bulletClass+
'"></'+params.bulletElement+">";$el.html(paginationHTML);swiper.pagination.bullets=$el.find("."+params.bulletClass)}if(params.type==="fraction"){if(params.renderFraction)paginationHTML=params.renderFraction.call(swiper,params.currentClass,params.totalClass);else paginationHTML='<span class="'+params.currentClass+'"></span>'+" / "+'<span class="'+params.totalClass+'"></span>';$el.html(paginationHTML)}if(params.type==="progressbar"){if(params.renderProgressbar)paginationHTML=params.renderProgressbar.call(swiper,
params.progressbarFillClass);else paginationHTML='<span class="'+params.progressbarFillClass+'"></span>';$el.html(paginationHTML)}if(params.type!=="custom")swiper.emit("paginationRender",swiper.pagination.$el[0])},init:function init(){var swiper=this;var params=swiper.params.pagination;if(!params.el)return;var $el=$(params.el);if($el.length===0)return;if(swiper.params.uniqueNavElements&&typeof params.el==="string"&&$el.length>1&&swiper.$el.find(params.el).length===1)$el=swiper.$el.find(params.el);
if(params.type==="bullets"&&params.clickable)$el.addClass(params.clickableClass);$el.addClass(params.modifierClass+params.type);if(params.type==="bullets"&&params.dynamicBullets){$el.addClass(""+params.modifierClass+params.type+"-dynamic");swiper.pagination.dynamicBulletIndex=0;if(params.dynamicMainBullets<1)params.dynamicMainBullets=1}if(params.type==="progressbar"&&params.progressbarOpposite)$el.addClass(params.progressbarOppositeClass);if(params.clickable)$el.on("click","."+params.bulletClass,
function onClick(e){e.preventDefault();var index=$(this).index()*swiper.params.slidesPerGroup;if(swiper.params.loop)index+=swiper.loopedSlides;swiper.slideTo(index)});Utils.extend(swiper.pagination,{$el:$el,el:$el[0]})},destroy:function destroy(){var swiper=this;var params=swiper.params.pagination;if(!params.el||!swiper.pagination.el||!swiper.pagination.$el||swiper.pagination.$el.length===0)return;var $el=swiper.pagination.$el;$el.removeClass(params.hiddenClass);$el.removeClass(params.modifierClass+
params.type);if(swiper.pagination.bullets)swiper.pagination.bullets.removeClass(params.bulletActiveClass);if(params.clickable)$el.off("click","."+params.bulletClass)}};var Pagination$1={name:"pagination",params:{pagination:{el:null,bulletElement:"span",clickable:false,hideOnClick:false,renderBullet:null,renderProgressbar:null,renderFraction:null,renderCustom:null,progressbarOpposite:false,type:"bullets",dynamicBullets:false,dynamicMainBullets:1,formatFractionCurrent:function(number){return number},
formatFractionTotal:function(number){return number},bulletClass:"swiper-pagination-bullet",bulletActiveClass:"swiper-pagination-bullet-active",modifierClass:"swiper-pagination-",currentClass:"swiper-pagination-current",totalClass:"swiper-pagination-total",hiddenClass:"swiper-pagination-hidden",progressbarFillClass:"swiper-pagination-progressbar-fill",progressbarOppositeClass:"swiper-pagination-progressbar-opposite",clickableClass:"swiper-pagination-clickable",lockClass:"swiper-pagination-lock"}},
create:function create(){var swiper=this;Utils.extend(swiper,{pagination:{init:Pagination.init.bind(swiper),render:Pagination.render.bind(swiper),update:Pagination.update.bind(swiper),destroy:Pagination.destroy.bind(swiper),dynamicBulletIndex:0}})},on:{init:function init(){var swiper=this;swiper.pagination.init();swiper.pagination.render();swiper.pagination.update()},activeIndexChange:function activeIndexChange(){var swiper=this;if(swiper.params.loop)swiper.pagination.update();else if(typeof swiper.snapIndex===
"undefined")swiper.pagination.update()},snapIndexChange:function snapIndexChange(){var swiper=this;if(!swiper.params.loop)swiper.pagination.update()},slidesLengthChange:function slidesLengthChange(){var swiper=this;if(swiper.params.loop){swiper.pagination.render();swiper.pagination.update()}},snapGridLengthChange:function snapGridLengthChange(){var swiper=this;if(!swiper.params.loop){swiper.pagination.render();swiper.pagination.update()}},destroy:function destroy(){var swiper=this;swiper.pagination.destroy()},
click:function click(e){var swiper=this;if(swiper.params.pagination.el&&swiper.params.pagination.hideOnClick&&swiper.pagination.$el.length>0&&!$(e.target).hasClass(swiper.params.pagination.bulletClass)){var isHidden=swiper.pagination.$el.hasClass(swiper.params.pagination.hiddenClass);if(isHidden===true)swiper.emit("paginationShow",swiper);else swiper.emit("paginationHide",swiper);swiper.pagination.$el.toggleClass(swiper.params.pagination.hiddenClass)}}}};var components=[Device$1,Support$1,Browser$1,
Resize,Navigation$1,Pagination$1];if(typeof Swiper.use==="undefined"){Swiper.use=Swiper.Class.use;Swiper.installModule=Swiper.Class.installModule}Swiper.use(components);return Swiper});