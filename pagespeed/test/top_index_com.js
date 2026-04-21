window.onunload = function(){};
//オブジェクト初期化処理
window.d3p = window.d3p || { cmd: [] };

/*------------------------------------
  定数
--------------------------------------*/
//カウントCGI
var CNTURL01 = "http://service.smt.docomo.ne.jp/cgi2/common/rd?id=",
	CNTURL02 = "&nl=";

// キャッシュ除けパラメータ
var NOW_NO = new Date().getTime();
// キャッシュ除けパラメータ(年月)
var NOW_Y = String(new Date().getFullYear());
var NOW_M = String(('0' + (new Date().getMonth()+1)).slice(-2));
var NOW_D = String('0' + new Date().getDate()).slice(-2);
var NOW_DATE = NOW_Y + NOW_M;
var NOW_T = ("0" + String(new Date().getHours())).slice(-2) + ("0" + String(new Date().getMinutes())).slice(-2) + ("0" + String(new Date().getSeconds())).slice(-2);
var NOW_FULL_DATE = NOW_Y + NOW_M + NOW_D + NOW_T;

function toDate (str) {
	var arr = (str.substr(0, 4) + '/' + str.substr(4, 2) + '/' + str.substr(6, 2)).split('/');
	return new Date(arr[0], arr[1] - 1, arr[2]);
};
//差分日数 [引数]'YYYYMMDD'
function getDiffDay(date1str, date2str) {
	var date1 = toDate(date1str).getTime();
	var date2 = toDate(date2str).getTime();
	var diff = date1 - date2;
	var diffDay = Math.floor(diff / (1000 * 60 * 60 * 24));
	return ++diffDay;
}
//userAgent
var UA = navigator.userAgent.toLowerCase();
//IOS
var IOS_FLG = /iphone|ipad/.test(UA);
//PC
var PC_FLG = !(UA.match(/(iphone|ipad|ipod|android)/i));
//OSバージョン
if(!PC_FLG){
	var OS_VER = IOS_FLG ? parseFloat(/os\s(\d{1,})/.exec(UA)[1]) : parseFloat(/android\s(\d{1,})/.exec(UA)[1]);
}

// HASH取得
var HASH = location.hash;

/*------------------------------------
  汎用定数・関数
--------------------------------------*/

/* ---- ローカルストレージ操作用 ---- */
var LOCAL_ST = {
	//疎通確認 戻り値:成功||失敗(TRUE||FALSE)
	connect: function(){
		try{ return (localStorage.length>=0); }catch(e){ console.log(e); return false; }
	},
	//データの取得 引数：KEY名／戻り値：取得データ||''
	get: function(strKey){
		try{ return localStorage.getItem(strKey) || '';}catch(e){ console.log(e); return ''; }
	},
	//データの設定 引数：KEY名,データ／戻り値：成功||失敗(TRUE||FALSE)
	set: function(strKey,strData){
		try{ localStorage.setItem(strKey, strData); return true; }catch(e){ console.log(e); return false; }
	},
	//データの削除 引数：KEY名／戻り値：成功||失敗(TRUE||FALSE)
	del: function(strKey){
		try{ localStorage.removeItem(strKey); return true; }catch(e){ console.log(e); return false; }
	}
};

/* ---- 訪問回数取得用 ---- */
var VISIT_SITE = {
	// パラメータ名ヘッダー
	paramHead: 'top_iapp_',
	//ラストアクセスKEY名
	lastAccessKey: 'top_iapp_lastAccess',
	//累計訪問回数KEY名
	totalCountKey: 'top_iapp_totalCount',
	//今月KEY名取得 (引数：現在日付／戻り値：KEY名)
	getCurrentMonthKey: function(current){
		return this._getKey(current,0);
	},
	//先月KEY名取得 (引数：現在日付／戻り値：KEY名)
	getOneMonthBeforeKey: function(current){
		return this._getKey(current,-1);
	},
	//先々月KEY取得 (引数：現在日付／戻り値：KEY名)
	getTwoMonthBeforeKey: function(current){
		return this._getKey(current,-2);
	},
	//ラストアクセスKEYパラメータ取得 (引数：現在日付／戻り値：パラメータ名)
	getLastAccessParam: function(current){
		return (current.getFullYear()+this._formatMonth(current)+this._formatTowDigit(current.getDate()));
	},
	//KEY取得
	_getKey:function(current,mNum){var newDay=this._addMonth(current,mNum);return this.paramHead+newDay.getFullYear()+this._formatMonth(newDay);},
	//月加算減算
	_addMonth:function(current,mNum){var dt=new Date(current.getTime());dt.setMonth(dt.getMonth()+mNum);return dt;},
	//月を2ケタの文字列に変換
	_formatMonth:function(current){return this._formatTowDigit(current.getMonth()+1);},
	//数値を2ケタ文字列に変換
	_formatTowDigit:function(num){return ('0'+String(num)).slice(-2);}
};

/* ----  配列の並びをランダムで並べ替える ---- */
function randomArray(ary) {
	var resAry = [].concat(ary),
		n = resAry.length, t, i;
	while(n) {
		i = Math.floor(Math.random() * n--);
		t = resAry[n];
		resAry[n] = resAry[i];
		resAry[i] = t;
	}
	return resAry;
}

/* ----  Cookie保存 ---- */
function cookieSave(name, val, time ) {
	var date = new Date();
	var unit = time.slice(-1);
	if(unit.match(/[A-Z][a-z]/)){ var ckLimit = unit.slice(0,unit.length-1); }
	else{ ckLimit = time; }
	switch(unit){	case'm': var ckUnit=1;break;	// m=分
					case'h': var ckUnit=60;break;	// h=時
					default: var ckUnit=60*24;}		// 単位が無ければ日数
	date.setTime(date.getTime() + ( ckUnit * parseInt(ckLimit) * 60 * 1000));
	$.cookie(name, val, { path:'/', expires: date});
	return false;
}

//イベント発火
function triggerEvent(elment, eventName){
	var evt = document.createEvent('HTMLEvents');
	evt.initEvent(eventName, true, true);
	return elment.dispatchEvent(evt);
}

// ニュース用不具合フラグ
var gNsTr = 0;

// 戦略ボタン表示フラグ
var G_amenuFlg = false;

//戦略ボタンidフラグ用
var G_categoryData = {};

// GTM広告出し分け用
var G_gtmDate = '260303';
if(!IOS_FLG) {
	var G_gtmTemplate = 'HS';
}

// タブ共有入稿データ
var COMMON_CONTENTS = {"common":{"category_modal":[],"season_theme_design":[],"notice_ahamo_list":[],"notice_list2":[{"position":"2","pattern":"2","lbl_bgcolor":"","lbl_txt":"","txt":"\u304a\u8a6b\u3073\uff1a\u682a\u60c5\u5831\u306e\u30ea\u30f3\u30af\u5148\u5909\u66f4","img":"top_cmn_notice2_0159.png","url":"https:\/\/smt.docomo.ne.jp\/portal\/src\/info_20260323_2.html","close_btn_flg":"1","head_disp_flg":"0","foot_disp_flg":"1","info_disp_flg":"1","info_start_datetime":"202604151700","info_end_datetime":"202604211000","id":"1725914","_cspid":"1725914"}],"balloon2":[]}};

/*--- 各種共通処理 ---*/
var TOP_INIT = {
//災害・リアルタイム告知
importantNews:function(replaceArea, data){
	if(data === undefined || !data.length) return;
	var tmpHtml = '';
	for(var i=0,len=data.length; i<len; i++){
		var lblTag = data[i].lblTxt && data[i].lblStyle ? '<span class="donation_lbl" style="background-color:'+ data[i].lblStyle +';">'+ data[i].lblTxt +'</span>': '';
		switch(data[i].close_btn_flg) {
			case '0' :
				var noticeRemove = '';
				break;
			case '1' :
				var noticeRemove = '<p class="donation-remove js-btn-remove"><a href="javascript:void(0)">非表示にする</a></p>';
				break;
			default :
				break;
		}
		tmpHtml += '<div id="'+ data[i].aid +'" class="js-donation mod-box-main wrp-donation js-notice"><p class="donation-inner"><a data-link-id="'+ data[i].cid +'" data-portalarea="top-'+ data[i].cid +'" href="'+ data[i].url +'">'+ lblTag + data[i].headline +'</a></p>'+ noticeRemove +'</div>';
	}
	$(replaceArea).replaceWith(tmpHtml);
},
//注目ワード
hotword: function(data){
	var WORD_MAX = 7,
		wordLen = data.length < WORD_MAX ? data.length : WORD_MAX,
		tmpHtml = '';

	for(var i = 0; i < wordLen; i++){
		tmpHtml += '<li class="riseWord_item-wrp"><a class="riseWord_item f_h-l_c-v-h" data-link-id="00hs120001" data-portalarea="top-00hs120001" '
			+ 'href="//service.smt.docomo.ne.jp/portal/search/news/result.html?q=' + encodeURIComponent(data[i].word) + '&utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202205_hotword">'
			+ '<span>'+ data[i].word +'</span></a></li>';
	}
	$('#RiseWords').html(tmpHtml).parents('.riseWord').removeClass('is_hide');
},
//戦略ボタン
amenuList: function(data) {
	G_categoryData = {straNewArr:[], recoNewArr:[], straReplaceId:''};//_stra = 戦略入替 _log = 利用ログ入替、_est = 推定入替、_rule = 補完入替、'' = 入替対象外
	var setArray = makeSetArray();
	setArray = makeSetStrategy(setArray)
	newLabelFnc(G_categoryData.straReplaceId);
	//DOM生成
	var tmpHtml = '';
	var liArr = [];
	for (var i = 0, len = setArray.length; i < len; i++) {
		var buf = TOP_INIT.makeBuf(data, setArray[i], i+1, G_categoryData);
		liArr.push('<li class="grid_item amenu_slide_item" data-genre-id="'+ setArray[i] +'">'+ buf +'</li>');
	}
	//優先度の高いものから表示させていくため、並び順を入れ替える。
	var upperArr = liArr.slice(0,5);
	var lowerArr = liArr.slice(5,10);
	for(var i = 10, len = liArr.length; i < len; i++){
		if(i%2 === 0){
			upperArr.push(liArr[i]);
		}else{
			lowerArr.push(liArr[i]);
		}
	}
	liArr = upperArr.concat(lowerArr);
	for(var i = 0, len = liArr.length; i < len; i++){
		tmpHtml += liArr[i];
	}
	$('#amenu_Cts').prepend(tmpHtml);
	//カテゴリクリック時にLSに日時を登録
	$('#amenu_Cts').on('click', '.amenu_item', function(e){
		if(!LOCAL_ST.connect()) return;
		if($(this).parent().hasClass('amenu_cate_list')) return; //「すべてのサービス」は対象外
		var amenuClickData = LOCAL_ST.get('smt_t_cm_clickfinal_day');
		if(!amenuClickData){
			amenuClickData = {};
		}else{
			amenuClickData = JSON.parse(amenuClickData);
		}
		amenuClickData[$(this).parent().data('genre-id')] = NOW_Y + NOW_M + NOW_D;
		LOCAL_ST.set('smt_t_cm_clickfinal_day', JSON.stringify(amenuClickData));
		return;
	});
	G_amenuFlg = true;

	function makeSetArray() {
		var defaultId = [].concat(idAryInfoFnc()); //初期値メニュー
		var additionalId = [].concat(defaultId); //29件不足時の追加メニュー

		//ローカルストレージがカラ、もしくは使用できない場合は、初期値メニューを返す。
		if(!LOCAL_ST.connect() || LOCAL_ST.get('smt_t_amenu') === '') return defaultId;

		// ローカルストレージ中の設定文字列を取得
		var lsAmenuWithFlg = LOCAL_ST.get('smt_t_amenu').split(',');

		var jsonAllId = [];
		for (var a = 0; a < data.genre.length; a++) {
			var len = data.genre[a].items.length;
			for(var i=0; i<len; i++) {
				var id = data.genre[a].items[i].id;
				jsonAllId.push(id);
			}
		}

		//フラグ付きの場合は外す
		var lsAmenu = [];
		var lsAmenuCount = [0,0];
		for(var i = 0, len = lsAmenuWithFlg.length; i < len; i++){
			var flgIdSplit = lsAmenuWithFlg[i].split('_');
			if(jsonAllId.indexOf(flgIdSplit[0]) > -1){ //JSONの中にないid（廃カテゴリ）は読み飛ばす
				if(flgIdSplit[1]){
					if(lsAmenuCount[0] < 5){
						lsAmenu.push(flgIdSplit[0]);
						G_categoryData[flgIdSplit[0]] = '_' + flgIdSplit[1];
						if(additionalId.indexOf(flgIdSplit[0]) > -1) { additionalId.splice(additionalId.indexOf(flgIdSplit[0]), 1); }
					}
					lsAmenuCount[0]++;
				}else{
					if(lsAmenuCount[1] < 5){
						lsAmenu.push(flgIdSplit[0]);
						G_categoryData[flgIdSplit[0]] = '';
						if(additionalId.indexOf(flgIdSplit[0]) > -1) { additionalId.splice(additionalId.indexOf(flgIdSplit[0]), 1); }
					}
					lsAmenuCount[1]++;
				}
			}
		}

		// 元配列が廃カテゴリのみだった場合、初期値メニューをコピー
		if(lsAmenu.length == 0){
			lsAmenu = defaultId.slice(0, 5);
			additionalId.splice(0, 5);
		}

		var upperList = [];
		var lowerList = [];
		//フラグ付きのものはフラグを付けてLSに保管
		var setLsArr = lsAmenu.slice(0, 10);
		for(var i = 0, len = setLsArr.length; i < len; i++){
			if(G_categoryData[setLsArr[i]]){
				lowerList.push(setLsArr[i]);
				setLsArr[i] += G_categoryData[setLsArr[i]];
			}else{
				upperList.push(setLsArr[i]);
			}
		}

		//ローカルストレージを更新
		LOCAL_ST.set('smt_t_amenu', setLsArr);
		LOCAL_ST.set('smt_t_amenu_time', NOW_FULL_DATE);

		//29件未満だった場合、表示用に追加メニューから補う（この段階でソートはしない。送信もしない）
		var upperSpace = 5 - upperList.length;
		var lowerSpace = 5 - lowerList.length;
		upperList = upperList.concat(additionalId.splice(0, upperSpace));
		lowerList = lowerList.concat(additionalId.splice(0, lowerSpace));
		var displayId = upperList.concat(lowerList);
		while(displayId.length < 29) { displayId.push(additionalId.splice(0, 1)[0]); }

		return displayId;
	};
	function makeSetStrategy(displayData){
		//戦略枠処理
		if(data.strategy.length > 0 && data.strategy[0].id){
			var straId = data.strategy[0].id;//入稿された戦略枠
			var firstViewArr = [];//FVの10カテゴリ
			var firstViewUpperArr = [];//FV上段
			var firstViewLowerArr = [];//FV下段
			var replaceBeforeLowerArr = [];//FV下段の入替対象のカテゴリ
			var clickFinalDay = LOCAL_ST.get('smt_t_cm_clickfinal_day');
			if(!clickFinalDay){
				clickFinalDay = false;
			}else{
				clickFinalDay = JSON.parse(clickFinalDay);
			}
			for(var i = 0, len = displayData.length; i < len; i++){
				if(i < 10){
					firstViewArr.push(displayData[i]);
					if(i < 5){
						firstViewUpperArr.push(displayData[i]);
					}else{
						firstViewLowerArr.push(displayData[i]);
						if(['003','004'].indexOf(displayData[i]) < 0){
							if(!clickFinalDay || !clickFinalDay[displayData[i]] || getDiffDay(NOW_Y + NOW_M + NOW_D, clickFinalDay[displayData[i]]) - 1 > 60){
								replaceBeforeLowerArr.push(displayData[i]);
							}
						}
					}
				}
			}
			if(firstViewArr.indexOf(straId) < 0 && replaceBeforeLowerArr.length > 0){
				var lsDisplayDay = LOCAL_ST.get('smt_t_stra_display_day');
				var clickDayObj = clickFinalDay ? clickFinalDay: {};
				var displayDayObj = lsDisplayDay ? JSON.parse(lsDisplayDay): {};

				clickDayObj[straId] = NOW_Y + NOW_M + NOW_D;
				displayDayObj[straId] = NOW_Y + NOW_M + NOW_D;

				LOCAL_ST.set('smt_t_cm_clickfinal_day', JSON.stringify(clickDayObj));
				LOCAL_ST.set('smt_t_stra_display_day', JSON.stringify(displayDayObj));

				var replaceId = replaceBeforeLowerArr[replaceBeforeLowerArr.length -1];//入れ替え対象の末尾ID
				G_categoryData['straReplaceId'] = replaceId;
				if(G_categoryData[replaceId]) delete G_categoryData[replaceId];

				var lsAmenuArr = LOCAL_ST.get('smt_t_amenu');
				lsAmenuArr = lsAmenuArr ? lsAmenuArr.split(','): [];
				var noFlgList = [];
				var withFlgList = [];
				for(var i=0,len=lsAmenuArr.length;i<len;i++){
					var lsAmenuArrSplit = lsAmenuArr[i].split('_');
					var lsIndex = lsAmenuArrSplit[0].indexOf(replaceId);
					if(lsIndex > -1){continue;}//入替対象はLSに格納しない
					if(lsAmenuArrSplit[1]){
						withFlgList.push(lsAmenuArr[i]);
					}else{
						noFlgList.push(lsAmenuArr[i]);
					}
				}
				withFlgList.unshift(straId + '_stra');
				var straLsSetArr = noFlgList.concat(withFlgList);
				G_categoryData[straId] = '_stra';

				var replaceIndex = firstViewLowerArr.indexOf(replaceId);
				firstViewLowerArr.splice(replaceIndex, 1);
				firstViewLowerArr.unshift(straId);
				var newFirstViewArr = firstViewUpperArr.concat(firstViewLowerArr);

				displayData = [].concat(newFirstViewArr);
				var additionalId = idAryInfoFnc(); //29件不足時の追加メニュー
				for(var i=0,len=additionalId.length;i<len;i++){
					if(displayData.length === 29) break; 
					if(newFirstViewArr.indexOf(additionalId[i]) === -1){
						displayData.push(additionalId[i]);
					}
				}

				//ローカルストレージを更新
				LOCAL_ST.set('smt_t_amenu', straLsSetArr);
				LOCAL_ST.set('smt_t_amenu_time', NOW_FULL_DATE);
			}
		}
		return displayData;
	}
	function idAryInfoFnc(){
		var idAryInfo = ['','','','','','','','','','','','','','','','','','','','','','','','','','','','',''];
		for (var i = 0, gLen = data.genre.length; i < gLen; i++) {
			for(var n=0, iLen = data.genre[i].items.length; n < iLen; n++) {
				if(G_ahamoFlg === '1'){
					if(data.genre[i].items[n].comp_ahamo){
						idAryInfo[data.genre[i].items[n].comp_ahamo] = data.genre[i].items[n].id;
					}
				}else{
					if(data.genre[i].items[n].comp_normal){
						idAryInfo[data.genre[i].items[n].comp_normal] = data.genre[i].items[n].id;
					}
				}
			}
		}
		return idAryInfo;
	}
	function newLabelFnc(replaceCategory){
		//戦略最終発動日から7日以内はnewフラグを表示にする
		var lsDisplayDay = LOCAL_ST.get('smt_t_stra_display_day');
		var displayDayObj = lsDisplayDay ? JSON.parse(lsDisplayDay): {};
		checkLabelDate(displayDayObj, G_categoryData.straNewArr);

		//レコメンド最終発動日から7日以内はnewフラグを表示にする
		var rcmDate = LOCAL_ST.get('smt_t_cat_rcm_date');
		if(rcmDate){
			rcmDate = JSON.parse(rcmDate);
			//旧フォーマットのLSで来訪した場合、新フォーマットへ変換する
			if(!rcmDate.cat_rcm_date){
				rcmDate = {rcm_date: JSON.stringify(rcmDate),cat_rcm_date:{}};
				var lsArr = LOCAL_ST.get('smt_t_amenu');
				lsArr = lsArr ? lsArr.split(','): [];
				for(var i=0,len=lsArr.length;i<len;i++){
					var id = lsArr[i].split('_');
					if(id[1] && id[1] !== 'stra'){
						rcmDate.cat_rcm_date[id[0]] = rcmDate.rcm_date;
					}
				}
				LOCAL_ST.set('smt_t_cat_rcm_date', JSON.stringify(rcmDate));
			}
			if(replaceCategory && rcmDate.cat_rcm_date[replaceCategory]){
				delete rcmDate.cat_rcm_date[replaceCategory];
			}
			checkLabelDate(rcmDate.cat_rcm_date, G_categoryData.recoNewArr);
		}
	}
	function checkLabelDate(dateList, pushArr){
		var limitKeys = Object.keys(dateList);
		for(var i=0,len=limitKeys.length;i<len;i++){
			if(G_categoryData[limitKeys[i]]){
				var date = dateList[limitKeys[i]];
				if(date && getDiffDay(NOW_Y + NOW_M + NOW_D, date) < 8){
					pushArr.push(limitKeys[i]);
				}
			}
		}
	}
},
// 戦略ボタンDOM生成
makeBuf: function(data, idArray, amenuRank, recoFlgData) {
	var buf = '';
	var recoFlg = recoFlgData[idArray] ? recoFlgData[idArray] : '';//レコメンドフラグ確認
	switch (idArray) {
		case '003': //天気
			buf = '<a id="Amenu_Wthr" class="amenu_item f_h-l_c-v-h" data-link-id="00hs010001_' +('0'+ amenuRank).slice(-2)+ recoFlg + '" data-portalarea="top-00hs010001_' +('0'+ amenuRank).slice(-2)+ '" href="https://service.smt.docomo.ne.jp/portal/weather/src/index.html?city=13101&utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202001_static"><div class="amenu_wthr_l" id="Amenu_WthrDate"></div><div class="amenu_wthr_r"><p id="Amenu_WthrIcon" class="amenu_wthr_icon"></p><p id="Amenu_WthrArea" class="amenu_wthr_place maxRow-1"></p></div></a>';
			return buf;
		case '004': //占い
			buf = '<a id="Amenu_Frtn" class="amenu_item f_v-t_c-v-h" data-link-id="00hs080001_' +('0'+ amenuRank).slice(-2)+ recoFlg + '" data-portalarea="top-00hs080001_' +('0'+ amenuRank).slice(-2)+ '" href="https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_ranking.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202001_static"><p id="Amenu_FrtnIcon" class="amenu_frtn_icon"></p><p id="Amenu_FrtnName" class="amenu_txt"></p></a>';
			return buf;
		default:
			for (var a = 0; a < data.genre.length; a++) {
				for (var j = 0; j < data.genre[a].items.length; j++) {
					if(data.genre[a].items[j].id === idArray) {
						var liveIconFlg = sportsLiveFnc(idArray);
						var bufItem = makeBufItem(data, a, j);
						var amenuId = '', amenuIdHead = '240' + bufItem.amenuData.dlink_id, amenuIconId = '', iconImg = '<img src="./' + bufItem.amenuIconImg + '">';
						if(idArray === '005'){
							var amenuId = ' id="Amenu_Trans"', amenuIdHead = '180001', amenuIconId = ' id="Amenu_TransIcon"', iconImg = '';
						}
						var idType = '';
						var lbl = '';
						var iconWrp = '<div class="amenu_icon_new_wrp f_h-l_c-v-h">';
						if((recoFlgData.recoNewArr.indexOf(idArray) > -1 && G_categoryData[idArray].match(/^_log$|^_est$|^_rule$/)) || (recoFlgData.straNewArr.indexOf(idArray) > -1 && G_categoryData[idArray].match(/^_stra$/))){//newあり
							idType = '_NEW';
							lbl = '<p class="amenu_icon-new_lbl">NEW</p></div>';
						}else if(liveIconFlg || idArray ==='035' && sportsLiveFlg){//LIVEあり
							idType = '_LIVE';
							lbl = '<p class="amenu_icon-new_lbl amenu_icon-live_lbl_blue">LIVE</p></div>';
						}else{//new、LIVEなし
							iconWrp = '';
						}
						buf = '<a' + amenuId + ' class="amenu_item f_v-t_c-v-h"' + ' data-link-id="00hs' + amenuIdHead  + '_' + ('0'+ amenuRank).slice(-2) + recoFlg + idType + '" data-portalarea="top-00hs' + amenuIdHead + '_' + ('0'+ amenuRank).slice(-2) + '" href="' + bufItem.amenuData.url + '">' + iconWrp + '<p' + amenuIconId + ' class="' + bufItem.amenuIconClass + '">' + iconImg + '</p>' + lbl + '<p class="' + bufItem.amenuTxtClass +'">' + bufItem.amenuTitle + '</p></a>';
						return buf;
					}
				}
			}
	}

	function makeBufItem(data, array, len){
		var amenuData = data.genre[array].items[len];
		var items = {
			amenuData : amenuData,
			amenuIconClass : 'amenu_icon-' + amenuData.keyword1.toLowerCase() + ' amenu_icon-' + amenuData.keyword2,
			amenuIconImg : amenuData.img,
			amenuTxtClass : amenuData.txt_class ? 'amenu_txt ' + amenuData.txt_class : 'amenu_txt',
			amenuTitle : amenuData.title2 ? amenuData.title2 : amenuData.title1
		};
		return items;
	}

	function sportsLiveFnc(id){
		if(SPORTS_ID[id]){
			for(var i=0,len=LIVE_ICON_ARR.length;i<len;i++){
				if(LIVE_ICON_ARR[i] === SPORTS_ID[id]){
					return true;
				}
			}
		}
		return false;
	}
},
//天気
weather: function(data, cityCode){
	if(!$('#Amenu_Wthr').length) return;
	var dateStr;

	if(cityCode && cityCode != '-'){
		var top_city = decodeURIComponent(cityCode).split(':', 1);
		top_city = top_city[0];
		weatherHtml(data,top_city);
	}else{
		areaNone();
	}
	$('#Amenu_WthrDate').html(dateStr);

	//設定エリアのデータを取得してCookie登録と一致するデータを表示
	function weatherHtml(data,area){
		var param = 'city='+ area +'&';
		if(data){
			var dateToUse = Number(NOW_T) < 190000 ? 'today' : 'tomorrow'
			var weatherCode = data[dateToUse].w_code;
			amenuWthr(param,data.name,weatherCode);
			var isToday = (data.c_code && dateToUse == 'today') ? true : false;
			dateStr = generateDateStr(isToday);
		}else{
			areaNone();
		}

		function amenuWthr(param,name,code){
			$('#Amenu_Wthr').attr('href', 'https://service.smt.docomo.ne.jp/portal/weather/src/index.html?' + param + 'utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202001_static');
			$('#Amenu_WthrArea').text(name);
			$('#Amenu_WthrIcon').append('<img src="/dmenu/weather/img/top_weather3_'+ code +'.png">');
		}
		function generateDateStr(generateDateFlg){
			if(generateDateFlg){
				var nowObj = new Date(),
					dNum = nowObj.getDate(),
					wStr = (['日','月','火','水','木','金','土'])[nowObj.getDay()];
				return '<p class="amenu_wthr_date">' + dNum + '</p><p class="amenu_wthr_weekday">(' + wStr + ')</p>';
			}else{
				return '<p class="amenu_wthr_tomorrow">あす<br>の<br>天気</p>';
			}
		} 
	}

	//未設定・エラーハンドリング処理
	function areaNone(){
		var dataAttr = $('#Amenu_Wthr').data();
		var wthrHtml = '<a id="Amenu_Wthr" class="amenu_item amenu_wthr amenu_wthr_noset f_v-t_c-v-h" data-link-id="' +dataAttr.linkId+ '" data-portalarea="' +dataAttr.portalarea+ '" href="https://service.smt.docomo.ne.jp/portal/weather/src/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202001_static"><div id="Amenu_WthrDate" class="amenu_wthr_r f_v-t_c-v-h"><p id="Amenu_WthrIcon" class="amenu_wthr_icon"><img src="/dmenu/weather/img/top_weather3_noset.png"></p><p id="Amenu_WthrArea" class="amenu_txt amenu_wthr_noset_txt">天気</p></div></a>';
		$('#Amenu_Wthr').replaceWith(wthrHtml);
	}
},
//占い
fortune: function(data){
	if(!$('#Amenu_Frtn').length) return;
	var constellation_code = G_fortuneSet.code;	//星座コード
	//設定がない場合は、未設定表示
	if(!constellation_code || constellation_code === '-'){
			var dataAttr = $('#Amenu_Frtn').data();
			var frtnHtml = '<a id="Amenu_Frtn" class="amenu_item amenu_frtn_noset f_v-t_c-v-h" data-link-id="' +dataAttr.linkId+ '" data-portalarea="' +dataAttr.portalarea+ '" href="https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_ranking.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202001_static"><p id="Amenu_FrtnIcon" class="amenu_frtn_icon"><img src="/dmenu/fortune/img/top_fortune_noset.png"></p><p id="Amenu_FrtnDefName" class="amenu_txt">占い</p></a>';
			$('#Amenu_Frtn').replaceWith(frtnHtml);
	}else{
		//設定あり
		for (var i = 0, len = data.fortune_list.length; i < len ; i++) {
			if (constellation_code && (data.fortune_list[i].c_code == constellation_code)) {
				$('#Amenu_FrtnName').text(data.fortune_list[i].name);
				var ranknum = ("0"+data.fortune_list[i].rank).slice(-2);
				$('#Amenu_FrtnIcon').append('<img src="/dmenu/fortune/img/top_fortune_rank'+ ranknum +'.png">');
				$('#Amenu_Frtn').attr('href', 'https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_'+ data.fortune_list[i].c_code+'.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202001_static');
				break;
			}
		}
	}
},
//乗換
transfer: function(data){
	var trLineId = G_transferLineSet.code,	// 路線ID
		trInfoLevel = 0 + G_transferInfoSet.code,	// 路線通知レベル
		cName = 'amenu_icon-transfer-';
	if (trLineId && trLineId != '-') {
		var trRgList = trLineId.split(':'),
			thisState = 0;

		var trLineArray = data.transfer_state_list.filter(function(item) {
				if ( trRgList.indexOf(item.line) > -1 ){ return true; }//取得した路線情報内に登録した路線が含まれるか
			});
		if (trLineArray.length > 0) {
			thisState = Math.max.apply(null, trLineArray.map(function(el){ return el.state; }));//状態値が一番大きい路線にアイコンを合わせる （ 2:赤! > 1:黄! > 0:なし ）
		}
		thisState = (thisState == parseInt(trInfoLevel))? 0 : thisState; //[運行情報表示レベル]の設定をOFFにしたときに運転見合わせ時のみアイコン切り替え
		$('#Amenu_TransIcon').addClass(cName + thisState +' amenu_trns_icon');
	} else {
		$('#Amenu_TransIcon').addClass(cName + '99' +' amenu_trns_icon');
	}

	if(!IOS_FLG){
		// loaderAnimationを最低1秒は動かす
		$("#Amenu_Trans").on('click', function (event) {
			event.preventDefault();
			var linkUrl = $(this).attr('href');
			function makeLoader(){
				$('#SVG_Logo').before('');//生成
				$('#SVG_Logo').before('<div id="Loader_Gif" class="loader"><img src="./top_menu_loading.gif" alt="Now Loading..." /></div>');//生成
				$("#CtsWrp").css("pointer-events", "none");
			}

			if(document.getElementById("Loader_Gif") != null){
				$('#Loader_Gif').remove();
				makeLoader();
			} else {
				makeLoader();
			}
			function loaderAction() {
				location.href = linkUrl;//遷移先へ移動
				function removeAction() {
					$('#Loader_Gif').remove();
					$("#CtsWrp").css("pointer-events", "auto");
				}
				setTimeout(removeAction, 1500);
			}
			setTimeout(loaderAction, 1000);
		});
	}
},
//footer広告(Allox)
adFooter: function(ele, pid){
	var adTmp = '<div class="portal_adarea" data-portaladsystem="allox" data-portaladid="'+ pid +'"><div data-allox-placement="'+ pid +'"></div><sc'+'ript src="//alxc.addlv.smt.docomo.ne.jp/p/'+ pid +'.js"></sc'+'ript></div>';
	$(ele).after(adTmp);
},
//footer広告(Google Adsense)
adsenseFooter: function(adsenseEle, pid, slotNum, adNum){
	var adsenseTmp = '<!-- AdSense sp_footer'+ adNum +'_dmenu-top_dmenu-top --><div class="class_'+ pid + '" style="text-align:center; line-height:0; max-height:250px; margin:0 auto; padding-bottom:10px;"><sc'+'ript async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7341853905703022" crossorigin="anonymous"></sc'+'ript><ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-7341853905703022" data-ad-slot="'+ slotNum +'"></ins><sc'+'ript>(adsbygoogle = window.adsbygoogle || []).push({});</sc'+'ript></div>';
	$(adsenseEle).after(adsenseTmp);
}
};//TOP_INIT

//お知らせ削除
(function(){
	var ckName = 'smt_t_info2',
		ckLimit = '60',
		ckRmStr = $.cookie(ckName),
		ckRmArray = [];

	if(ckRmStr) {
		var styleStr = '<style type="text/css" id="DonationStyle">';
		ckRmArray = ckRmStr.split(',');
		while (10 < ckRmArray.length) {
			ckRmArray.pop();
		}
		// cookie value データ異常値救済
		cookieSave(ckName, ckRmArray, ckLimit);

		ckRmArray.forEach(function(el, i){
			styleStr += '[id="'+ el + '"],';
		});
		styleStr = styleStr.slice(0, -1) + '{display:none !important}</style>';
		$('head').append(styleStr);
	}
	$(function(){
		$('.donationBanner,.donationBannerHead,.disasterBanner,.os_link').on('click', '.donation-remove', function() {
			$targetElem = $(this).parent();
			$targetElem.hide();
			ckRmArray.unshift( $targetElem.attr('id') );
			cookieSave(ckName, ckRmArray, ckLimit);
			return false;
		});

		if(IOS_FLG) document.body.classList.add('is_ios');
	});
}());

/*------------------------------------
  検索処理
--------------------------------------*/
function getSuggestDispFlg(){} //空を宣言、使用しない
function suggestCallback(){}
//サジェストフラグ
var G_suggestFlg = false;
(function($, window, undefined){
'use strict';
$(function(){
	//サジェストフラグ取得
	$.ajax({
		url: '//service.smt.docomo.ne.jp/portal/search/data/get_suggest_display_flag.js',
		type: 'get',
		cache: false,
		dataType: 'jsonp',
		timeout: 60000,
		jsonpCallback: 'getSuggestDispFlg'
	}).done(function(data, status, xhr){
		if(xhr.status === 200){
			if(data && data.common && data.common.suggest_display_flag && data.common.suggest_display_flag === '1') G_suggestFlg = true;
		}
	});
});

//Suggest Class
function dSuggest(container, setting){
	this.rootEl = document.querySelector(container);
	this.$wrp = $('.sch', this.rootEl);
	this.$body = $(document.body);
	this.idName = container;
	this.headFlg = this.idName === '#HedSch';

	this.elForm = this.rootEl.querySelector('.sch_form');
	this.elSuggest = this.rootEl.querySelector('.sch_suggest');
	this.elSuggestList = this.rootEl.querySelector('.sch_suggest_item');
	this.elTxt = this.elForm.q;
	this.elBtnReset = this.elForm.resetBtn;
	this.elBtnSubmit = this.elForm.submitBtn;
	this.GID = setting.gid || false;

	this.hash = setting.hashStr;
	this.NS = '.'+ this.$wrp.attr('id');
	this.topBuf = setting.scrollBuffer;

	this.init();
}

dSuggest.prototype = {
	suggestTimeFlg: true,
	searchSuggestWord: '',
	headFlg: false,
	init: function(){
		//検索
		$(this.elBtnSubmit).on('click'+ this.NS, $.proxy(this.onClickSubmit, this));
		//textbox
		$(this.elTxt)
			.on('input'+ this.NS, $.proxy(this.onChangeText, this))
			.on('focusin'+ this.NS + ' focusout'+ this.NS, $.proxy(this.onFocusInOut, this))
			.on('click'+ this.NS, $.proxy(this.onClickTxtBox, this))
			.on('keypress'+ this.NS, $.proxy(this.onKeyPress, this));
		//リセット
		$(this.elBtnReset).on('click'+ this.NS, $.proxy(this.onClickReset, this));
		//入力箇所以外クリック時サジェスト非表示
		if(this.headFlg) $('body').on('touchend'+ this.NS + ' mouseup'+ this.NS, $.proxy(this.onClickInpuOther, this));

	},
	//検索クリック
	onClickSubmit: function(e){
		e.preventDefault();
		e.stopPropagation();
		this.exeSearch();
	},
	//keyword入力
	onChangeText: function(e){
		var keyword = this.elTxt.value;
		if(this.headFlg){
			if(this.elTxt.value.trim() !== ''){
				this.callSuggestApi();
			}else{
				this.hideSuggest();
				this.searchSuggestWord = '';
			}
		}
		this.toggleResetBtn(keyword != '');
	},
	//focusインアウト
	onFocusInOut: function(e){
		var keyword = this.elTxt.value,
			type = e.type.toLowerCase(),
			schMode;
		if(schMode = type == 'focusin'){
			location.hash = this.hash;
			if(G_suggestFlg && (this.headFlg && this.elTxt.value.trim() !== '' && this.elSuggestList.childNodes.length > 0)) this.showSuggest();
		}
		this.toggleResetBtn(keyword != '');
		this.toggleSchMode(schMode);
	},
	//textboxタップ
	onClickTxtBox: function(e){
		this.scrollTop();
	},
	//EnterKey
	onKeyPress: function(e){
		var code;
		if(document.all) code = e.keyCode;
		if(document.getElementById) code = (e.keyCode)? e.keyCode : e.charCode;
		if(document.layers) code = e.which;
		if(code == 13) this.onClickSubmit(e);
	},
	//Reset
	onClickReset: function(e){
		e.preventDefault();
		this.setTxtFocus(this.delete);
		if(this.headFlg){
			this.hideSuggest();
			this.searchSuggestWord = '';
		}
		this.elTxt.blur();
	},
	//検索実行
	exeSearch: function(){
		var cId = IOS_FLG? '00ip000000':'00hs000000';
		if(this.headFlg) this.hideSuggest();
		this.elForm.submit();
		this.pushGA4(cId,this.GID,this.elTxt.value);
	},
	//GA4送信
	pushGA4: function(ce_param,gid,term){
		if(!gid){
			dataLayer.push({'event':'DWEB_search', 'DWEB_dweb_click_url':'https://service.smt.docomo.ne.jp/portal/search/web/result.html', 'DWEB_dweb_click_countid':ce_param, 'DWEB_search_term':term});
		}
	},
	//削除
	delete: function(){
		this.elTxt.value = '';
		this.toggleResetBtn(false);
	},
	//検索モード
	toggleSchMode: function(flg){
		this.$wrp.toggleClass('is_active-mode', flg);
		this.$body.toggleClass('is_sch-mode', flg);
	},
	//focusセット
	setTxtFocus: function(callBack){
		this.elTxt.blur();
		this.elTxt.focus();
		if(!callBack) return;
		var self = this;
		setTimeout(function(){
			callBack.apply(self);
		}, 50);
	},
	//recetオンオフ
	toggleResetBtn: function(flg){
		this.$wrp.toggleClass('is_txt-mode' ,flg);
	},
	//トップへ移動
	scrollTop: function(){
		var self = this;
		var ua = navigator.userAgent.toLowerCase();
		var isIos = /iphone|ipad|macintosh/.test(ua);
		if(isIos){
			// iOSのみ タブ高さズレ対策
			setTimeout(function(){
				var pos = window.pageYOffset + self.rootEl.getBoundingClientRect().top - 5 - self.topBuf;
				window.scroll(0, pos);
			}, 60); //60ms未満はNG
		}else{
			var pos = window.pageYOffset + self.rootEl.getBoundingClientRect().top - 5 - self.topBuf;
			window.scroll(0, pos);
		}
	},
	//サジェスト非表示
	hideSuggest: function(){
		this.elSuggest.classList.remove('is-show');
	},
	//サジェスト表示
	showSuggest: function(){
		this.elSuggest.classList.add('is-show');
	},
	//input以外をクリックでサジェスト非表示
	onClickInpuOther: function(e){
		if($(e.target).closest(this.idName+' .sch_suggest').length > 0) return;
		if(!e.target.closest(this.idName+ ' .sch_form_txt')){
			this.hideSuggest();
			this.elTxt.blur();
			this.toggleSchMode(false);
		}
	},
	//サジェスト取得処理
	callSuggestApi: function(){
		var self = this;
		if(self.searchSuggestWord === self.elTxt.value) return self.searchSuggestWord = '';
		if(!G_suggestFlg) return self.hideSuggest();
		if(self.suggestTimeFlg){
			var encodeVal = encodeURIComponent(self.elTxt.value);
			var inputLen = self.elTxt.value.length;
			var path = 'https://clients1.google.com/complete/search?client=partner-web&hl=ja&sugexp=csems%2Cnrl%3D10&gs_rn=34&gs_ri=partner-web&partnerid=5eca485a72947d320&types=t&ds=cse&cp='+ inputLen +'&q='+ encodeVal +'&callback=suggestCallback';
			$.ajax({
				url: path,
				type: 'get',
				cache: false,
				dataType: 'jsonp'
			}).done(function(data){
				if(data[0] === self.elTxt.value){
					self.createSuggestHtml(data);
					self.suggestTimeFlg = false;
					self.searchSuggestWord = self.elTxt.value;
					setTimeout(function(){
						self.suggestTimeFlg = true;
					}, 150); //150ms後に解除
				}
			}).fail(function(XMLHttpRequest, textStatus, errorThrown){
				self.hideSuggest();
			});
		}else{
			self.hideSuggest();
		}
	},
	//サジェスト生成処理
	createSuggestHtml: function(ary){
		var self = this;
		var tmpHtml = '';
		for (var i=0; i<10; i++){
			if(ary[1] && ary[1][i] && ary[1][i][0]){
				var suggestWord = ary[1][i][0];
				if(suggestWord){
					tmpHtml += '<li class="sch_suggest_list"><a href="javascript:void(0)">'+ suggestWord +'</a></li>';
				}
			}
		}
		if(tmpHtml){
			this.elSuggestList.innerHTML = tmpHtml;
			this.showSuggest();
		}
		//サジェストクリックイベント
		$(this.idName + ' .sch_suggest_list a').on('click', function(e){
			e.preventDefault();
			e.stopPropagation();
			self.elTxt.value = $(this).text();
			self.onClickSubmit(e);
		});
	}
};//Suggest.prototype

window.dSuggest = dSuggest;

}(jQuery, this));

/*------------------------------------
  jQuery プラグイン
--------------------------------------*/
(function($, undefined){
var methods = {
	//開閉（アニメーション無し）
	accordion : function(setting){
		var $openBtn = this.find(setting.open_btn),
			$closeBtn = this.find(setting.close_btn),
			$hideItem = this.find(setting.hide);
		$openBtn.on('click',function(){
			$hideItem.removeClass('is_hide');
			$closeBtn.removeClass('is_hide');
			$openBtn.addClass('is_hide');
			return false;
		});
		$closeBtn.on('click',function(){
			$hideItem.addClass('is_hide');
			$closeBtn.addClass('is_hide');
			$openBtn.removeClass('is_hide');
			return false;
		}).trigger('click');
		return this;
	},
	//スクロール
	scroll : function(speed, buf){
		var $target = $(this.data('target') || 'html'),
			position = $target.offset().top - (buf|0);
		speed = speed === undefined ? 800 : speed|0;
		$('html, body').stop(false, true).animate({scrollTop: position}, speed);
		return this;
	},
	//タブ切り替え
	tabSwitch : function(setting){
		var callBack = setting.call_back || function(){},
			defIndex = setting.default || 0;
		this.on('click', function(e){
			var $this = $(this),
				$target = $('#'+ this.dataset.target);
			$this.addClass('is_current').siblings().removeClass('is_current');
			$target.addClass('is_current').siblings().removeClass('is_current');
			callBack($this.index(), $target[0]);
			return false;
		})
		.eq(defIndex).trigger('click');
		return this;
	},
	//画像フェードイン
	fadeImg : function(){
		var imgList = this.find('.img-fade').toArray(), len = imgList.length;
		if(len === 0) return this;
		imgList.forEach(function(target){
			if(target.tagName.toLowerCase() !== 'img') return;
			if(target.style.opacity === 1){
				target.classList.remove('img-fade');
				return;
			}
			(function checkImg(){
				if(target.complete === true){
					target.style.opacity = 1;
				}else{
					setTimeout(checkImg, 0);
				}
			}());
		});
		return this;
	},
	//非表示セクション表示
	showSection: function(tagName){
		if(!tagName) tagName = 'section';
		if(this[0].tagName.toLowerCase() === tagName){
			this.removeClass('is_hide');
		}else{
			this.parents(tagName).eq(0).removeClass('is_hide');
		}
		return this;
	},
	//非表示セクション削除
	hideSection: function(tagName){
		if(!tagName) tagName = 'section';
		if(this[0].tagName.toLowerCase() === tagName){
			this.remove();
		}else{
			this.parents(tagName).eq(0).remove();
		}
		return this;
	},
	//コンテンツ表示の監視
	observeShow: function(callBack, interval){
		interval = interval === undefined ? 200 : interval |0;
		this.each(function(i, el){
			var timer;
			if(methods._checkShow(el, null, callBack)) return;
			window.addEventListener('scroll', function onScroll(e){
				if(timer) clearTimeout(timer);
				timer = setTimeout(function(){
					if(methods._checkShow(el, e, callBack)){
						window.removeEventListener('scroll', onScroll, { passive: true });
					}
				}, interval);
			}, { passive: true });
		});
		return this;
	},
	_checkShow: function(el, e, callBack){
		var style = window.getComputedStyle(el);
		if(style.visibility.toLowerCase() != 'visible') return false;
		if(0 < el.getBoundingClientRect().bottom && window.innerHeight > el.getBoundingClientRect().top){
			callBack(el, e);
			return true;
		}
		return false;
	}
};

	$.fn.dmenuFnc = function(method) {
		if (methods[method]) { return methods[method].apply(this, Array.prototype.slice.call(arguments, 1)); }
		else { $.error('Method '+  method +' does not exist on jQuery.dmenuFnc'); }
	};
}(jQuery));

/*-------------------------------------------
  TOPへ戻る/target_brank
---------------------------------------------*/
$(function(){
	//TOPへ戻る
	var elTopBtn = document.getElementById('Fot_BtnTop');
	$(elTopBtn).on({
		'click': function(){
			$(this).dmenuFnc('scroll');//移動
			return false;
		}
	});
	$(window).on('scroll', function(){
		if(this.pageYOffset > 600){
			elTopBtn.classList.add('is_show');
		}else{
			elTopBtn.classList.remove('is_show');
		}
	});
	//別窓表示
	if(!IOS_FLG){
		$('#GenreWrp').on('click', 'a', function(e){
			if(!this.href || this.href == 'javascript:void(0);' || this.href == '#') return;
			this.target = '_blank';
		});
	}
});

/* --------------------------------------
  訪問回数計測処理
---------------------------------------- */
$(function(){
	if(!LOCAL_ST.connect()){ return; } //接続確認

	var dateCurrent = new Date(),
		strCurrent = VISIT_SITE.getLastAccessParam(dateCurrent),
		currentKey = VISIT_SITE.getCurrentMonthKey(dateCurrent),
		lastVst = LOCAL_ST.get(VISIT_SITE.lastAccessKey), //前回訪問日取得
		totalKey = VISIT_SITE.totalCountKey;

	//訪問日・訪問回数・累計訪問回数更新
	if(lastVst == '' || lastVst != strCurrent){
		LOCAL_ST.set(VISIT_SITE.lastAccessKey, strCurrent);
		var vstCount = Number(LOCAL_ST.get(currentKey));
		if(!vstCount){
			LOCAL_ST.set(currentKey, 1);
		}else if(vstCount < 31){
			LOCAL_ST.set(currentKey, vstCount + 1);
		}
		var vstTotalCount = Number(LOCAL_ST.get(totalKey));
		if(!vstTotalCount){
			LOCAL_ST.set(totalKey, 1);
		}else if(vstTotalCount < 10){
			LOCAL_ST.set(totalKey, vstTotalCount + 1);
		}
	}
	//3か月以前削除
	var pbjLs = localStorage,
		oneBefore = VISIT_SITE.getOneMonthBeforeKey(dateCurrent), //先月KEY
		twoBefore = VISIT_SITE.getTwoMonthBeforeKey(dateCurrent); //先々月KEY

	Object.keys(pbjLs).forEach(function(el){
		if(el.indexOf(VISIT_SITE.paramHead) < 0) return;
		if(el == VISIT_SITE.lastAccessKey) return;
		if(el == currentKey) return;
		if(el == oneBefore) return;
		if(el == twoBefore) return;
		if(el == totalKey) return;
		LOCAL_ST.del(el);
	});
});

/* --- GA送信 --- */
(function(window){
//送信データ
var tabType = {outer:'TabView', inner:'TabDetailView'},
	tabAction = {
		outer:{init:'Default', click:'Click_Tab', flick:'Flick_Tab', balloon:'Click_Balloon', foot:'Click_Footer', personalize:'Click_personalizeArea', banner:'Click_Banner', overlay:'Click_Overlay', fixedlink: 'Click_FixedLink'},
		inner:{click:'Click_TabDetail', cornerClick:'Click_TabCorner', cornerDetailClick:'Click_TabCornerDetail', flick:'Flick_TabDetail'}
	};
var dataHistory = '', count = 1;

var dwebTabviewData = {
	preOuter: '',
	preInner: '',
	outer: '',
	inner: ''
};

//DataPush
window.pushTabGA = function(params){
	var data = {
		outer: GENRE_DATA.items[params.outer].ga,
		inner: params.inner ? GENRE_DATA.items[params.outer].inner[params.inner] + (params.category ? '-' + GENRE_DATA.items[params.outer].category[params.category] : '') :'Default',
		action: tabAction[params.tabType][params.action],
		txt: params.txt
	};
	dwebTabviewData = {
		preOuter: dwebTabviewData.outer ? dwebTabviewData.outer : '',
		preInner: dwebTabviewData.inner ? dwebTabviewData.inner : 'Default',
		outer: GENRE_DATA.items[params.outer].ga,
		inner: params.inner ? GENRE_DATA.items[params.outer].inner[params.inner] + (params.category ? '-' + GENRE_DATA.items[params.outer].category[params.category] : '') :''
	};
	if(params.outer === 'g_news'){
		data.inner = 'Default';
		dwebTabviewData.inner = 'Default';
	}
	if(params.action == 'init') dwebTabviewData.preInner = '';

	var crntOuter = data.outer;
	if(count === 1) {
	dataHistory += crntOuter;
	}else{
		if(dataHistory.indexOf(crntOuter) !== -1){
			dataHistory = dataHistory;
		}else{
			dataHistory += ',' + crntOuter;
		}
	}
	count++;

	if(params.tabType == 'outer'){
		setTimeout(function(){
			dataLayer.push({
				'event': 'DWEB_tabview',
				'DWEB_tabview_currenttab': data.outer,
				'DWEB_tabview_currenttab_detail': (data.inner ? data.inner : 'undefined'),
				'DWEB_tabview_previoustab': (dwebTabviewData.preOuter ? dwebTabviewData.preOuter : 'undefined'),
				'DWEB_tabview_previoustab_detail': (dwebTabviewData.preInner ? dwebTabviewData.preInner : 'undefined'),
				'DWEB_tabview_action': data.action,
				'DWEB_tabview_history': (dataHistory ? dataHistory : 'undefined'),
				'DWEB_tabview_balloon_text': (data.txt ? data.txt : 'undefined')
			});
		}, 500);
	}
};
}(this));//GA送信

/* --------------------------------------
  きせかえ・ahamo表示
---------------------------------------- */
$(function(){
	var $bodyEl = $('body');
	var setTheme = G_themeSet || 'default';
	//ahamo契約ありの場合、bodyタグにクラス付与。
	if(G_ahamoFlg === '1') $bodyEl.addClass('ahamo_mode');
	switch(setTheme){
		case 'poinko':
			var headPkFlagImg = '<div class="hed_bg_flag"></div>',
				headPkCharaImg = '<div class="sch_form_poinko"></div>';
			$bodyEl.addClass('jack_mode poinko_mode');
			$('#HedBg').prepend(headPkFlagImg);
			$('#HedSch .sch_form').prepend(headPkCharaImg);
			break;
		default:
			if(COMMON_CONTENTS.common.season_theme_design && COMMON_CONTENTS.common.season_theme_design.length){
				var seasonTheme = COMMON_CONTENTS.common.season_theme_design[0];
				dmenuJackSeason({
					groupA: seasonTheme.color1,
					groupB: seasonTheme.color2,
					groupC: seasonTheme.color3,
					groupD: seasonTheme.color5,
					groupE: seasonTheme.color7,
					groupF: seasonTheme.color4,
					groupG: seasonTheme.color6,
					groupH: seasonTheme.color8,
					hedBgImg: seasonTheme.img1,
					hedSchImg: seasonTheme.img3,
					pgTopImg: seasonTheme.img2
				});
			}
			break;
	}

	function dmenuJackSeason(setting){
		dJackMemo = setting;
		if($('#JackStyle').length) return;
		var styleStr = '<style type="text/css" id="JackStyle">',
			changeFlg = false;
		//colorA [検索系]
		if(setting.groupA){
			styleStr += '.sch_form_exe';
			styleStr += '{background-color:'+ setting.groupA + '}';
			styleStr += '.sch_form';
			styleStr += '{border-color:'+ setting.groupA + '}';
			changeFlg = true;
		}
		//colorB [背景・タブメニュー]
		if(setting.groupB){
			styleStr += '#pageTop';
			styleStr += '{background-color:'+ setting.groupB + '}';
			styleStr += '@media screen and (min-width: 744px) {.df_hed-inner{border-color: '+ setting.groupB +';}}';
			changeFlg = true;
		}
		//colorC [急上昇-背景]
		if(setting.groupC){
			styleStr += '.riseWord_item, #News .nwsTab_wrp';
			styleStr += '{background-color:'+ setting.groupC + '}';
			changeFlg = true;
		}
		//colorD [ジャンルタブ-背景]
		if(setting.groupD){
			styleStr += '.genrTab_wrp, .df_hed, .df_isFix_tab .df_hed_fixtab_bk';
			styleStr += '{background-color:'+ setting.groupD + '}';
			changeFlg = true;
		}
		//colorE [文字色]
		if(setting.groupE){
			styleStr += '.df_hed, #RiseWords .riseWord_item, #News .df_tab-item, .tor_ttl, .riseWord_item:link, .riseWord_item:visited, .riseWord_item:active';
			styleStr += '{color:'+ setting.groupE + '}';
			changeFlg = true;
		}
		//colorF [強調色]
		if(setting.groupF){
			styleStr += '#CtsWrp .genrTab_pointer, #News .nws_pointer, .df_tab-item:nth-child(n+2)::before';
			styleStr += '{background-color:'+ setting.groupF + '}';
			styleStr += '#News .df_isCurrent_tab.nwsTab_item';
			styleStr += '{color:'+ setting.groupF + '}';
			styleStr += '.balloon_inner';
			styleStr += '{border-color:'+ setting.groupF + ';-webkit-box-shadow:none;box-shadow:none; }';
			styleStr += '.balloon_triangle::before';
			styleStr += '{border-color:'+ setting.groupF + ' transparent transparent transparent}';
			styleStr += '.balloon-point-left .balloon_triangle::before';
			styleStr += '{border-color:'+ ' transparent transparent transparent ' + setting.groupF + '}';
			styleStr += '.balloon-point-right .balloon_triangle::before';
			styleStr += '{border-color:'+ ' transparent ' + setting.groupF + ' transparent transparent}';
			styleStr += '.df_navArrow-left::before, .df_navArrow-right::before';
			styleStr += '{background-color:'+ setting.groupF + '}';
			changeFlg = true;
		}
		//colorG [すべてのサービス-背景]
		if(setting.groupG){
			styleStr += '.amenu_cate_list';
			styleStr += '{background-color:'+ setting.groupG + '}';
			changeFlg = true;
		}
		//colorH [すべてのサービス-文字]
		if(setting.groupH){
			styleStr += '.amenu_cate_txt';
			styleStr += '{color:'+ setting.groupH + '}';
			changeFlg = true;
		}
		//ヘッダー-背景画像
		if(setting.hedBgImg){
			styleStr += '.hed_bg';
			styleStr += '{background-image:url(/dmenu/hottopics/img/'+ setting.hedBgImg +'?'+ NOW_DATE + NOW_D +')}';
			changeFlg = true;
		}
		//ヘッダー-検索画像
		if(setting.hedSchImg){
			styleStr += '.sch_season_icon';
			styleStr += '{background-image:url(/dmenu/hottopics/img/'+ setting.hedSchImg +'?'+ NOW_DATE + NOW_D +')}';
			changeFlg = true;
		}
		//ページトップ画像
		if(setting.pgTopImg){
			styleStr += '.fot_gotop';
			styleStr += '{bottom: 10px;height: 104px;background-repeat: no-repeat;-webkit-background-size: 44px auto;background-size: 44px auto;';
			styleStr += 'background-image:url(/dmenu/hottopics/img/'+ setting.pgTopImg +'?'+ NOW_DATE + NOW_D +')}';
			changeFlg = true;
		}

		if(changeFlg){
			styleStr += '</style>';
			$('head').append(styleStr);
			$bodyEl.addClass('jack_mode');
		}
	}
});

/* 呼び出しエラー回避用 */
//フローティングバナー
function floatingShow(){}
function showDpcApp(){}

/* --------------------------------------
	避難情報
---------------------------------------- */
function evacuationInfoFunc(infoList, evaList){
	getEvacuationList(evaList);

	function getEvacuationList(json){ // 避難情報データ
		if(!Object.keys(json.evacuation_list).length) return; // 入稿が空か確認

		var cityCode = (G_weatherSet.code).split(':',1);
		if(json.evacuation_list.hasOwnProperty(cityCode[0])){ // マッチ情報があるか確認
			var ary = [];
			// 表示フラグデータ抽出
			for(var i=0,len=json.evacuation_list[cityCode[0]].detail.length; i<len; i++){
				if(json.evacuation_list[cityCode[0]].detail[i].flg_top_hide === 0){ //[0]は表示[1]は非表示
					for(var j=0, infoLen=infoList.length; j<infoLen; j++){
						if(
							infoList[j].top_flg === '1' &&
							infoList[j].frame === '0' &&
							json.evacuation_list[cityCode[0]].detail[i].dsid === infoList[j].dsid
					){
							ary.push(json.evacuation_list[cityCode[0]].detail[i]);
						}
					}
				}
			}

			// 配列が空なら処理終了
			var aryLen = ary.length;
			if(!aryLen) return;

			// 表示する情報の選択
			var setInfo = [];
			if(aryLen === 1){ // 1つのみ入稿
				setInfo = ary;
			}else if(aryLen > 1){ //dsid値の優先度決め。同値は最初の方を採用。
				setInfo.push(ary[0]);
				var setId = [parseInt(String(setInfo[0].dsid).slice(0,1)), parseInt(String(setInfo[0].dsid).slice(1,4))];
				for(var i=1; i<aryLen; i++){
					var aryId = [parseInt(String(ary[i].dsid).slice(0,1)), parseInt(String(ary[i].dsid).slice(1,4))];
					if(setId[0] === aryId[0]){
						if(setId[1] > aryId[1]){
							setInfo[0] = ary[i];
							setId = aryId;
						}
					}else if(setId[0] < aryId[0]){
						setInfo[0] = ary[i];
						setId = aryId;
					}
				}
			}

			var evacId = document.getElementById('Evac_Info');
			var evacuationLevel = parseInt(String(setInfo[0].dsid).slice(0,1));
			var equiv = '';
			var alertLevelHtml = '';
			if(evacuationLevel === 3 || evacuationLevel === 4 || evacuationLevel === 5){
				for(var i=0, infoLen=infoList.length; i<infoLen; i++){
					if(infoList[i].dsid === setInfo[0].dsid){
						if(infoList[i].keikai_flg === '0'){
							equiv = ' no_equiv';
						}else if(infoList[i].keikai_flg === '1'){
							equiv = ' no_equiv';
							alertLevelHtml = '<div class="sp_alert_level_wrp f_h-l_c-v">' + '<div class="sp_alert_level_num">'+ evacuationLevel +'</div></div>';
						}else if(infoList[i].keikai_flg === '2'){
							alertLevelHtml = '<div class="sp_alert_level_wrp f_h-l_c-v">' + '<div class="sp_alert_level_num">'+ evacuationLevel +'</div><div class="sp_alert_level_txt">相当</div></div>';
						}
					}
				}
			}

			// htmlの生成
			var htmlTmp = '';
			htmlTmp = '<div class="sp_alert alert_escape alert_0'+ evacuationLevel + equiv +' mod_bg_sub">'
					+ '<a data-link-id="00hs210008_hinan_'+ cityCode[0] +'_'+ setInfo[0].title +'" data-portalarea="top-00hs210008_hinan_'+ cityCode[0] +'_'+ setInfo[0].title +'" href="https://service.smt.docomo.ne.jp/portal/weather/src/disaster.html?utm_source=dmenu_top&utm_medium=topevacuation&utm_campaign=disaster_alert">'
					+ '<div class="sp_alert_ttl_wrp f_h-l_c-v"><div class="sp_alert_ttl">'+ setInfo[0].status +'</div>'
					+ '<div class="sp_alert_txt maxRow-1">'+ setInfo[0].title +'</div>' + alertLevelHtml + '</div></a></div>';
			evacId.innerHTML= htmlTmp;
			evacId.classList.remove('is_hide');

			dataLayer.push({
				'event': 'DWEB_dmenu_imp',
				'DWEB_dmenu_imp_corner': 'header_hinan_'+ cityCode[0] +'_'+ setInfo[0].title
			});
		}
	}
}

/* --------------------------------------
	災害情報
---------------------------------------- */
function disasterInfoFunc(info, json){
	var infoDsid = [];
	info.filter(function(a){infoDsid.push(parseInt(a.dsid));});

	//LS[smt_city_code]と各災害jsonのcitycodeかprefcodeを突合
	var weatherArea = G_regionSet.region1.cityCode;
	if(!G_regionSet.region1.cityCode.length){
		weatherArea = '99999';
	}
	for(var k = 0; k < 2; k++) {
		if(0 < k){
			if(G_regionSet['region' + (k+1)].cityCode.length) {
				weatherArea = G_regionSet.region2.cityCode;
			} else {
				continue;
			}
		}
		var code = {
			city: weatherArea,
			pref: weatherArea.slice(0,2)
		};
		var matchData = function() {
			var ary = [];
			for(var i=0, jsonLen=json.length; i<jsonLen; i++) {
				if(!json[i].data[json[i].list]) continue;
				var d = json[i].data[json[i].list], c = json[i].code;
				if(Object.keys(d).indexOf(code[c]) < 0) continue;
				if(Array.isArray(d[code[c]])) {
					var j = 0, dataLen = d[code[c]].length;
					while(j < dataLen) {
						ary.push(d[code[c]][j]);
						j++;
					}
				}else if(Array.isArray(d[code[c]].detail)) { // ライフライン災害情報
					var j = 0, dataLen = d[code[c]].detail.length;
					while(j < dataLen) {
						if (d[code[c]].detail[j].flg_top_hide === 0) { //[0]は表示[1]は非表示
							ary.push(d[code[c]].detail[j]);
						}
						j++;
					}
				} else {
					ary.push(d[code[c]]);
				}
			}
			return ary;
		}();

		//存在しないレコードの読み捨て
		var matchLen = matchData.length;
		for(var i=0; i < matchLen; i++) {
			var dsidIndex = infoDsid.indexOf(matchData[i].dsid);
			if(dsidIndex < 0) {
				matchData.splice(i, 1);
				matchLen = matchData.length;
				i--;
			}else{
				var topFlg = info[dsidIndex].top_flg;
				var frame = info[dsidIndex].frame;
				if(topFlg !== "1" || (frame !== "1" && frame !== "2")) {
					matchData.splice(i, 1);
					matchLen = matchData.length;
					i--;
				}
			}
		}

		if(!matchLen) continue; //マッチ情報が無ければ終了

		var setData = [];
		var setInfo = [];
		var setDsid = [parseInt(String(matchData[0].dsid).slice(0,1)), parseInt(String(matchData[0].dsid).slice(1,4))];
		if(matchLen === 1) {
			setData = matchData;
		} else if(matchLen > 1) { //dsid値の優先度決め。同値は最初の方を採用。
			setData.push(matchData[0]);
			for(var j=1; j < matchLen; j++) {
				var targetDsid = [parseInt(String(matchData[j].dsid).slice(0,1)), parseInt(String(matchData[j].dsid).slice(1,4))];

				if(setDsid[0] === targetDsid[0]) {
					if(setDsid[1] > targetDsid[1]) {
						setData[0] = matchData[j];
						setDsid = targetDsid;
					}
				} else if(setDsid[0] < targetDsid[0]) {
					setData[0] = matchData[j];
					setDsid = targetDsid;
				}
			}
		}
		setInfo.push(info[infoDsid.indexOf(setData[0].dsid)]);

		//警戒レベルと配色
		var alertBorderColor = '',
			equiv = '';
		if(!setData[0].hasOwnProperty('status')) { // ライフライン情報か確認
			var isComment = '',
				alertHtml = '',
				lifelineArDisplay = '';
			if(setDsid[0] === 3){
				var alertColor = 'alert_03';
				alertBorderColor = ' sp_alert_ar_org2';
			} else if(setDsid[0] === 4){
				var alertColor = 'alert_04';
				alertBorderColor = ' sp_alert_ar_ppl2';
			} else if(setDsid[0] === 5){
				var alertColor = 'alert_05';
				alertBorderColor = ' sp_alert_ar_blk2';
			}
			if(setInfo[0].keikai_flg === '0'){
				lifelineArDisplay = ' class="'+ alertBorderColor +'"' ;	
				alertBorderColor = '';		
			} else if(setInfo[0].keikai_flg === '1'){
				equiv = ' no_equiv';
				alertHtml = '<div class="sp_alert_txt f_h-l_c-v">警戒レベル</div>' +
					'<div class="sp_alert_level_wrp f_h-l_c-v">' +
					'<div class="sp_alert_level_num">'+ setDsid[0] +'</div></div>';
			} else if(setInfo[0].keikai_flg === '2'){
				alertHtml = '<div class="sp_alert_txt f_h-l_c-v">警戒レベル</div>' +
					'<div class="sp_alert_level_wrp f_h-l_c-v">' +
					'<div class="sp_alert_level_num">'+ setDsid[0] +'</div>' +
					'<div class="sp_alert_level_txt">相当</div></div>';
			}
		} else {
			var alertLevel = '',
				alertColor = 'alert_lifeline',
				alertHtml = '',
				lifelineArDisplay = ' class="sp_alert_ar_org2"',
				isComment = ' is_hide';
		}
		if(weatherArea === '99999') {
			alertBorderColor = '';
			lifelineArDisplay = '';
		}
		if(setData[0].shindo) {
			var disasterTitle = '地震情報　震度' + json[1].data.shindo_list[weatherArea].shindo,
				disasterUnixTime = json[1].data.quaketime,
				disasterSpot = '';
			if(weatherArea === '99999'){
				disasterSpot = json[1].data.spot;
			}else{
				disasterSpot = setData[0].name;
			}
		} else {
			var disasterUnixTime = setData[0].time,
				disasterTitle = !setData[0].hasOwnProperty('status') ? setData[0].warning : setData[0].status,
				disasterSpot = !setData[0].hasOwnProperty('status') ? setData[0].name: setData[0].title;
		}
		if(weatherArea === '99999') {
			var btnClass = setDsid[0] === 4 ? 'alert_04' : 'alert_05';
		}

		//表示
		var toTwoDigits = function(num) {
			num += "";
			if (num.length === 1) {
				num = "0" + num;
			}
			return num;
		};

		var disasterTime = new Date(disasterUnixTime * 1000);
			if(weatherArea === '99999') {
				var disasterBottomContent = '',
					tmpUrlHtml = '<div class="' + btnClass + '">'
						+ '<a data-link-id="00hs210005" data-portalarea="top-00hs210005" href="https://service.smt.docomo.ne.jp/portal/weather/src/areaconf.html" class="sp_alert_set_btn sp_alert_ar_w f_h-l_c-v-h"><span>地域を設定する</span></a>'
					+ '</div>';
			} else {
				var disasterBottomContent = '<div class="sp_alert_info">'
						+ '<div class="sp_alert_info_txt maxRow-1' + isComment + '">'+ setInfo[0].comment +'</div>'
						+ '<div class="sp_alert_info_time">'+ (disasterTime.getMonth() + 1) +'/'+ disasterTime.getDate() +' '+ disasterTime.getHours() +':'+ toTwoDigits(disasterTime.getMinutes()) +'発表</div>'
					+ '</div>',
					tmpUrlHtml = '';
			}
			var tmpHtml = '<a' + lifelineArDisplay + ' data-link-id="00hs210004_alert_'+ weatherArea +'_'+ disasterTitle +'_'+ disasterSpot +'" data-portalarea="top-00hs210004_alert_'+ weatherArea +'_'+ disasterTitle +'_'+ disasterSpot +'" href="https://service.smt.docomo.ne.jp/portal/weather/src/disaster.html?utm_source=dmenu_top&utm_medium=topalert&utm_campaign=disaster_alert">'
				+ '<div class="sp_alert_ttl_wrp f_h-l_c-v">'
					+ '<div class="sp_alert_ttl maxRow-1">'+ disasterTitle +'</div>'
					+ alertHtml
				+ '</div>'
				+ '<div class="sp_alert_txt_wrp'+ alertBorderColor +'">'
					+ '<div class="sp_alert_place maxRow-1">'+ disasterSpot +'</div>'
					+ disasterBottomContent
				+ '</div>'
			+ '</a>';
		G_regionSet['region'+(k+1)]['disaster'] = [tmpHtml, alertColor];
		if(0 < k) { continue; }
		var tmpSpAlert =  $('#box_info .sp_alert').append(tmpHtml);
		tmpSpAlert.addClass(alertColor + ' alert_disaster' + equiv + ' mod_bg_sub').after(tmpUrlHtml);
		$(function(){
			if(weatherArea === '99999') {
				$('#box_info .sp_alert').children('a').addClass('regional_set_btn');
			}
		});
		dataLayer.push({
			'event': 'DWEB_dmenu_imp',
			'DWEB_dmenu_imp_corner': 'header_alert_'+ weatherArea +'_'+ disasterTitle +'_'+ disasterSpot
		});
	}
}
