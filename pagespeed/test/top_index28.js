/* --------------------------------------
  アカウント設定情報更新API
---------------------------------------- */
function apiUpdate(updateName,updateVal){
	var obj = {};
	obj[updateName] = updateVal;
	var updateData = JSON.stringify(obj);
	$.ajax({
		url: "//service.smt.docomo.ne.jp/serverlessApi/dm/regdmenuinfo2.json",
		type: "POST",
		contentType: "application/json",
		dataType: "json",
		xhrFields: {
			withCredentials: true
		},
		cache: false,
		timeout: 60000,
		data: updateData,
	}).done(function(data){
		console.log(data);
	});
}

/* LS同期 */
function lsUpdate(updateName,updateVal){
	var strVal = JSON.stringify(updateVal);
	LOCAL_ST.set(updateName,strVal);
}
function lsGet(keyName){
	var LsValue = JSON.parse(LOCAL_ST.get(keyName)),
			LsValueTheme = LsValue.theme;
	return LsValueTheme;
}

// 更新日時フォーマット確認
// 更新日時の正常値は[yyyymmddhhmmss]
function ckDateFormat(value){
	value = String(value);
	if (!value.match(/^\d{14}$/)) return false; //[0-9]の14桁か確認
	var year = Number(value.slice(0, 4));
	var month = Number(value.slice(4, 6)) - 1;
	var day = Number(value.slice(6, 8));
	var hours = Number(value.slice(8, 10));
	var minutes = Number(value.slice(10, 12));
	var seconds = Number(value.slice(12, 14));
	var date = new Date(year, month, day, hours, minutes, seconds);
	if (date.getFullYear() != year || date.getMonth() != month || date.getDate() != day || date.getHours() != hours || date.getMinutes() != minutes || date.getSeconds() != seconds) return false;
	if (NOW_NO < date.getTime()) return false;
	return true;
}

//[yyyymmddhh]10桁を日付型に変更
function changeDateType(value){
	value = String(value);
	if (!value.match(/^\d{10}$/)) return false; //[0-9]の10桁か確認
	var year = Number(value.slice(0, 4));
	var month = Number(value.slice(4, 6)) - 1;
	var day = Number(value.slice(6, 8));
	var hours = Number(value.slice(8, 10));
	var date = new Date(year, month, day, hours);
	if (date.getFullYear() != year || date.getMonth() != month || date.getDate() != day || date.getHours() != hours) return false;
	return date.getTime();
}

/* ======================================
　設定情報連携 カスタマイズメニュー
====================================== */
(function(){
	if(!LOCAL_ST.connect()){ return; } //接続確認

	var keyName = 'smt_t_amenu';
	var keyNameTime = 'smt_t_amenu_time';
	var lsAmenu = LOCAL_ST.get(keyName);
	var lsAmenuTime = LOCAL_ST.get(keyNameTime);
	var errDateFlg = {local: false, api: false};//更新日時不正値フラグ,不正値はtrue
	if(lsAmenuTime && !ckDateFormat(lsAmenuTime)){//更新日時(local)が不正値
		lsAmenu = '';
		lsAmenuTime = '';
		errDateFlg.local = true;
	}

	// APIのアクセス確認
	if(G_resultCode !== '0000'){ // 非認証
		var item = {apiFlg: false};
	}else{ // 認証
		if(!G_accountSetting.data || !G_accountSetting.data.hasOwnProperty(keyName)){
			var item = {apiFlg: true};
		}else if(G_accountSetting.data[keyName].update && !ckDateFormat(G_accountSetting.data[keyName].update)){//更新日時(api)が不正値
			var item = {apiFlg: true};
			errDateFlg.api = true;
		}else{
			var item = G_accountSetting.data[keyName];
			item.apiFlg = true;
		}
	}

	if((!lsAmenu && !lsAmenuTime) && !item.update){//LSとAPIで値がない場合はスキップ
		if(errDateFlg.local || errDateFlg.api){
			var defaultAmenuStr = G_ahamoFlg === '1' ? '003,004,081,006,005': '003,004,031,006,051';
			lsUpdateVal([keyName,keyNameTime],[defaultAmenuStr,NOW_FULL_DATE]);
			if(item.apiFlg) apiUpdate(keyName,{'amenu': defaultAmenuStr,'update': NOW_FULL_DATE});
		}
		return;
	}

	// smt_t_amenuが設定ありかつ、初回アクセスか確認
	if(lsAmenu && !lsAmenuTime) {
		LOCAL_ST.set(keyNameTime,NOW_FULL_DATE);
		lsAmenuTime = NOW_FULL_DATE;
	}

	if(!item.apiFlg) { return;} // 認証情報がなければ処理をスキップ

	// LS更新用関数
	function lsUpdateVal(aryKey,aryVal) {
		for(var i=0; i<2; i++){ // smt_t_amenuとsmt_t_amenu_timeの2項目の取得
			LOCAL_ST.set(aryKey[i],aryVal[i]);
		}
	}

	// LSとAPIの日付けを数値型に変換
	var numAccounUpdate = item.update === '' || !item.hasOwnProperty('update') ? 0 : Number(item.update);
	var numLsUpdate = lsAmenuTime === '' || lsAmenuTime === null ? 0 : Number(lsAmenuTime);

	// 設定更新日時をの比較
	if(!lsAmenuTime) {
		lsUpdateVal([keyName,keyNameTime],[item.amenu,Number(item.update)]); // LSの更新
	}else{
		if(numAccounUpdate < numLsUpdate) {
			apiUpdate(keyName,{'amenu': lsAmenu,'update': lsAmenuTime}); // APIの更新
		}else if(numAccounUpdate >= numLsUpdate) {
			lsUpdateVal([keyName,keyNameTime],[item.amenu,Number(item.update)]); // LSの更新
		}
	}
})();

/* --------------------------------------
  きせかえ対応
---------------------------------------- */
var dJackMemo = new Object();
var G_themeSet = setTheme();

function setTheme(){
	if(!LOCAL_ST.connect()){ return; } //接続確認

	var keyName = 'smt_t_theme';
	function updateVal(theme,update){
		return {
			'theme': theme,
			'update': update
		};
	}
	
	var LsValue = LOCAL_ST.get(keyName);
	var theme_Set = '';
	var errDateFlg = {local: false, api: false};//更新日時不正値フラグ,不正値はtrue
	var jsonFlg = LsValue.indexOf('{') > -1 ? true : false;
	if(LsValue && jsonFlg && !ckDateFormat(JSON.parse(LsValue).update)){//更新日時(local)が不正値
		LsValue = '';
		jsonFlg = false;
		errDateFlg.local = true;
	}
	if(LsValue){
		// 新フォーマット時
		if(jsonFlg){
			LsValue = JSON.parse(LsValue);
			var LsValueTheme = LsValue.theme,
					LsValueDate = LsValue.update;
		}
		theme_Set = LsValueTheme ? LsValueTheme : LsValue;
	}else{
		theme_Set = 'default';
	}
	
	if(G_resultCode !== '0000'){
		theme_Set = !theme_Set ? 'default' : theme_Set;
		if(errDateFlg.local) lsUpdate(keyName,updateVal(theme_Set,NOW_FULL_DATE)); //更新日時(local)が不正値
	}else{
		var item = G_accountSetting.data;
		// アカウント設定情報なし
		if(!item || !item.smt_t_theme){
			// 更新日時(local)が不正値orLSなしor旧フォーマット時
			if(errDateFlg.local || !LsValue || !jsonFlg){
				theme_Set = !LsValue ? 'default' : LsValue;
				lsUpdate(keyName,updateVal(theme_Set,NOW_FULL_DATE));
				apiUpdate(keyName,updateVal(theme_Set,NOW_FULL_DATE));
			// 新フォーマット時
			}else{
				apiUpdate(keyName,updateVal(LsValueTheme,LsValueDate));
				theme_Set = LsValueTheme;
			}
		// アカウント設定情報あり
		}else{
			var ApiValue = item.smt_t_theme,
					ApiValueTheme = ApiValue.theme,
					ApiValueDate = ApiValue.update;
			if(!ckDateFormat(ApiValueDate)) errDateFlg.api = true;//更新日時(api)が不正値
			if(errDateFlg.local && errDateFlg.api){
				theme_Set = 'default';
				lsUpdate(keyName,updateVal(theme_Set,NOW_FULL_DATE));
				apiUpdate(keyName,updateVal(theme_Set,NOW_FULL_DATE));
			// LSなしor旧フォーマット時
			}else if(!LsValue || !jsonFlg){
				if(errDateFlg.api){
					theme_Set = 'default';
					lsUpdate(keyName,updateVal(theme_Set,NOW_FULL_DATE));
					apiUpdate(keyName,updateVal(theme_Set,NOW_FULL_DATE));
				}else{//更新日時(local)が不正値の場合も含まれる
					lsUpdate(keyName,updateVal(ApiValueTheme,ApiValueDate));
					LsValueTheme = lsGet(keyName);
					theme_Set = LsValueTheme;
				}
			// 新フォーマット時
			}else{
				if(errDateFlg.api){
					apiUpdate(keyName,updateVal(LsValueTheme,LsValueDate));
					theme_Set = LsValueTheme;
				}else{
					var ApiDateNum = parseInt(ApiValueDate),
							LsDateNum = parseInt(LsValueDate);
					if(ApiDateNum < LsDateNum){
						apiUpdate(keyName,updateVal(LsValueTheme,LsValueDate));
						theme_Set = LsValueTheme;
					}else if(ApiDateNum > LsDateNum){
						lsUpdate(keyName,updateVal(ApiValueTheme,ApiValueDate));
						LsValueTheme = lsGet(keyName);
						theme_Set = LsValueTheme;
					}else if(ApiDateNum === LsDateNum){
						if(ApiValueTheme != LsValueTheme){
							lsUpdate(keyName,updateVal(ApiValueTheme,ApiValueDate));
							LsValueTheme = lsGet(keyName);
						}
						theme_Set = LsValueTheme;
					}
				}
			}
		}
	}
	return theme_Set;
}
/* --------------------------------------
  天気・占い・乗換路線情報対応
---------------------------------------- */
var G_weatherSet = syncDatabase('city_code', {code:'city_code',time:'update'}, {code:'smt_city_code',time:'smt_city_time'});
var G_fortuneSet = syncDatabase('fortune', {code:'code',time:'update'}, {code:'fortune_code',time:'fortune_time'});
var G_transferLineSet = syncDatabase('smt_transfer_line', {code:'smt_transfer_line',time:'update'}, {code:'smt_transfer_line',time:'smt_transfer_line_time'});
var G_transferInfoSet = syncDatabase('smt_transfer_infolevel', {code:'smt_transfer_infolevel',time:'update'}, {code:'smt_transfer_infolevel',time:'smt_transfer_infolevel_time'});
function syncDatabase(firstKey,secondKey,storageKey){
	var secondKeyCode = secondKey.code;
	var secondKeyTime = secondKey.time;
	var skCode = storageKey.code;
	var skTime = storageKey.time;
	var setData = {code:'', time:''}; //「天気・占い・乗換路線情報」値
	var dataList = {
		cookie:{code:'',time:''}, //「Cookie」値
		ls:{code:'',time:''}, //「LS」値
		data:{code:'',time:''}, //「Cookie・LS」値
		api:{code:'',time:''} //「POPLAR値」値
	};
	var setLsData = '';
	//dataFlg:Cookie/LS値の存在、apiFlg:ログイン認証、apiData:POPLAR値存在
	var flgList = { dataFlg:false, apiFlg:false, apiData:false};
	var errDateFlg = {local: false, api: false};//更新日時不正値フラグ,不正値はtrue
	//POPLAR値を天気・占い・乗換路線情報・Cookie・LSに設定
	function setApiData(){
		if(skCode === 'smt_city_code' && (/2213[1-7]/.test(dataList.api.code))){
			updateData = hamamatsuCityCheck(dataList.api.code);
			setData.code = updateData.code;
			setData.time = updateData.time;
		}else{
			flgList.apiFlg = false;
			setData.code = dataList.api.code;
			setData.time = dataList.api.time;
			dataUpdate(skCode,setData.code,skTime,setData.time);
		}
	}
	/* Cookie同期 */
	function cookieUpdate(updateName,updateVal){
		$.cookie(updateName, "",{path:"/",expires:-1});
		$.cookie(updateName,updateVal,{ domain: '.smt.docomo.ne.jp', expires: 1825, path: '/' });
	}
	/* セパレートチェック */
	function checkSeparate(data, dataType){ // data: city_code, dataType: cookieかLSかapi判断;
		var reg = new RegExp(/(%(25)+3A)|(%3A)/);
		if(data.match(reg)){
			var result = data.replace(reg,':');
			if(dataType === 'cookie'){
				cookieUpdate(skCode, result);
				cookieUpdate(skTime, NOW_FULL_DATE);
			}else if(dataType === 'LS'){
				LOCAL_ST.set(skCode, encodeURIComponent(result));
				LOCAL_ST.set(skTime, NOW_FULL_DATE);
			}else if(dataType === 'api'){
				apiUpdate('city_code', {city_code:encodeURIComponent(result), update:NOW_FULL_DATE});
				G_accountSetting['data'][firstKey][secondKeyTime] = NOW_FULL_DATE;
			}
			return result;
		}
		return data;
	}
	/* 浜松市行政区チェック */
	function hamamatsuCityCheck(checkCode){
		var checkCodeAry = checkCode.split(':');
		for(var i=0, len=checkCodeAry.length; i<len; i++){
			if((/2213[1-7]/.test(checkCodeAry[i]))){
				switch(checkCodeAry[i]){
					case '22131':
					case '22132':
					case '22133':
					case '22134':
					case '22135':
						checkCodeAry[i] = '22138';
						break;
					case '22136':
						checkCodeAry[i] = '22139';
						break;
					case '22137':
						checkCodeAry[i] = '22140';
						break;
					default:
						break;
				}
			}
		}
		if(checkCodeAry[0] === checkCodeAry[1]){
			checkCodeAry.pop();
		}
		var hamamatsuCitycode = checkCodeAry[0] + (checkCodeAry[1] ? ':'+ checkCodeAry[1] : '');
		var hamamatsuUpdateTime = NOW_FULL_DATE;
		dataUpdate(skCode,hamamatsuCitycode,skTime,hamamatsuUpdateTime);
		return {code: hamamatsuCitycode, time: hamamatsuUpdateTime};
	}
	/* cookie,LS,POPLAR更新用関数 */
	function dataUpdate(codeKey,code,timeKey,time){
		cookieUpdate(codeKey, code);
		cookieUpdate(timeKey, time);
		if(LOCAL_ST.connect()){
			setLsData = skCode === 'smt_transfer_line' ? code : encodeURIComponent(code);
			LOCAL_ST.set(codeKey, setLsData);
			LOCAL_ST.set(timeKey, time);
		}
		if(flgList.apiFlg){
			apiUpdate('city_code', {city_code:encodeURIComponent(code), update:time});
		}
	}

	//Cookie取得
	if(skCode === 'smt_transfer_line' && $.cookie(skCode)){
		cookieUpdate(skCode, $.cookie(skCode)); //路線情報はエンコード無しで設定されるため強制エンコードする
	}
	if($.cookie(skCode)) dataList.cookie.code = firstKey==='city_code' ? checkSeparate($.cookie(skCode), 'cookie') : $.cookie(skCode);
	if($.cookie(skTime)) dataList.cookie.time = $.cookie(skTime);
	//LS取得
	if(LOCAL_ST.connect()){
		if(LOCAL_ST.get(skCode)) dataList.ls.code = firstKey==='city_code' ? checkSeparate(decodeURIComponent(LOCAL_ST.get(skCode)), 'LS') : decodeURIComponent(LOCAL_ST.get(skCode));
		if(LOCAL_ST.get(skTime)) dataList.ls.time = LOCAL_ST.get(skTime);
	}
	//POPLAR値取得
	if(G_resultCode === '0000'){
		flgList.apiFlg = true; // 認証されていれば「true」
		if(G_accountSetting['data'] && G_accountSetting['data'][firstKey]){ // データが空かチェック
			if(G_accountSetting['data'][firstKey][secondKeyCode]) dataList.api.code = firstKey==='city_code' ? checkSeparate(decodeURIComponent(G_accountSetting['data'][firstKey][secondKeyCode]), 'api') : decodeURIComponent(G_accountSetting['data'][firstKey][secondKeyCode]);
			if(G_accountSetting['data'][firstKey][secondKeyTime]) dataList.api.time = G_accountSetting['data'][firstKey][secondKeyTime];
			if(dataList.api.time && !ckDateFormat(dataList.api.time)){
				errDateFlg.api = true;
				dataList.api.code = '';
				dataList.api.time = '';
			}
			if(dataList.api.code && dataList.api.time) flgList.apiData = true;
		}
	}

	//「設定情報」取得
	if(dataList.cookie.code){
		dataList.data.code = dataList.cookie.code;
		flgList.dataFlg = true;
	} else if (dataList.ls.code){
		dataList.data.code = dataList.ls.code;
		flgList.dataFlg = true;
	}
	//「設定更新日時」取得
	if(dataList.cookie.time){
		dataList.data.time = dataList.cookie.time;
	} else if (dataList.ls.time){
		dataList.data.time = dataList.ls.time;
	}
	if(dataList.data.time && !ckDateFormat(dataList.data.time)){
		errDateFlg.local = true;
		flgList.dataFlg = false;
		dataList.data.code = '';
		dataList.data.time = '';
	}
	if(dataList.data.code && !dataList.data.time){
		dataList.cookie.time = NOW_FULL_DATE;
		dataList.data.time = NOW_FULL_DATE;
		cookieUpdate(skTime, NOW_FULL_DATE);
	}
	//天気・占い・乗換路線情報に値を設定
	if(flgList.dataFlg){ //cookie・ls「あり」
		if(!flgList.apiData || Number(dataList.data.time) > Number(dataList.api.time)){ //poplar「なし」またはcookie・ls「更新日時」 > poplar「更新日時」
			setData.code = dataList.data.code;
			setData.time = dataList.data.time;
			if(firstKey === 'city_code'){
				if((/2213[1-7]/.test(setData.code))){
					var hamamatsuUpdateObj = hamamatsuCityCheck(setData.code);
					setData.code = hamamatsuUpdateObj.code;
					setData.time = hamamatsuUpdateObj.time;
					return setData;
				}
				if(flgList.apiFlg){
					apiUpdate('city_code', {city_code:encodeURIComponent(setData.code), update:setData.time});
				}
			} else if(firstKey === 'fortune' && flgList.apiFlg){
				apiUpdate('fortune', {code:setData.code, update:setData.time});
			} else if(firstKey === 'smt_transfer_line' && flgList.apiFlg){
				apiUpdate('smt_transfer_line', {smt_transfer_line:setData.code, update:setData.time});
			} else if(firstKey === 'smt_transfer_infolevel' && flgList.apiFlg){
				apiUpdate('smt_transfer_infolevel', {smt_transfer_infolevel:setData.code, update:setData.time});
			}
			//設定情報同期
			if(dataList.cookie.code !== dataList.ls.code){
				if(dataList.cookie.code){
					setLsData = skCode === 'smt_transfer_line' ? dataList.cookie.code : encodeURIComponent(dataList.cookie.code);
					if(LOCAL_ST.connect()) LOCAL_ST.set(skCode,setLsData);
				} else {
					cookieUpdate(skCode, dataList.ls.code);
				}
			}
			//設定更新日時同期
			if(Number(dataList.cookie.time) !== Number(dataList.ls.time)){
				if(dataList.cookie.time){
					if(LOCAL_ST.connect()) LOCAL_ST.set(skTime,dataList.cookie.time);
				} else {
					cookieUpdate(skTime, dataList.ls.time);
				}
			}
		} else {
			setApiData();
		}
	} else if (flgList.apiData){ //cookie・ls「なし」、poplar「あり」
		setApiData();
	} else if (errDateFlg.local || errDateFlg.api){
		var skData = skCode === 'smt_transfer_infolevel' ? '0' : '-';
		cookieUpdate(skCode, skData);
		cookieUpdate(skTime, NOW_FULL_DATE);
		if(LOCAL_ST.connect()){
			if(skData === '-' && skCode !== 'smt_transfer_line'){
				setLsData = encodeURIComponent(skData);
			}else{
				setLsData = skData;
			}
			LOCAL_ST.set(skCode, setLsData);
			LOCAL_ST.set(skTime, NOW_FULL_DATE);
		}
		if(firstKey === 'city_code' && flgList.apiFlg){
			apiUpdate('city_code', {city_code:encodeURIComponent('-'), update:NOW_FULL_DATE});
		} else if(firstKey === 'fortune' && flgList.apiFlg){
			apiUpdate('fortune', {code:'-', update:NOW_FULL_DATE});
		} else if(firstKey === 'smt_transfer_line' && flgList.apiFlg){
			apiUpdate('smt_transfer_line', {smt_transfer_line:'-', update:NOW_FULL_DATE});
		} else if(firstKey === 'smt_transfer_infolevel' && flgList.apiFlg){
			apiUpdate('smt_transfer_infolevel', {smt_transfer_infolevel:'0', update:NOW_FULL_DATE});
		}
		setData = {code:skData, time:NOW_FULL_DATE};
	}
	return setData;
}
/* --------------------------------
  ABテスト機能
------------------------------------*/
function checkUrl(){//主要ニュース10件パーソナライズ化 ABtest用 パラメータ・アンカー処理
	var findUrlParam = location.search;
	var replaceUrlParam = '';
	if (findUrlParam !== '') {
		var splitUrlParam = findUrlParam.substring(1).split('&');
		for(var i = 0; i < splitUrlParam.length; i++){
			var param = splitUrlParam[i].split("=");
			var key = param[0];
			var value = param[1];
			if (key === 'mp') continue;
			if (replaceUrlParam !== '') {
				replaceUrlParam += '&';
			} else {
				replaceUrlParam += '?';
			}
			if (value === undefined){
				replaceUrlParam += key;
			} else {
				replaceUrlParam += key + '=' + value;
			}
		}
	}
	if (HASH === undefined ){
		HASH = '';
	}
	return {replaceUrlParam: replaceUrlParam};
}

//主要ニュース10件パーソナライズ化用オブジェクト
var G_psnObj = {
	version: '', patternId: '', newsFlg: '', segment: '', number: '',
	newsData: '',
	loadFlg: 'loading',
	//news_flgをY/Nに置換
	changeNewsFlg: function() {
		switch(this.newsFlg){
			case '1':
				var result = 'Y';
				break;
			case '0':
				var result = 'N';
				break;
			default:
				var result = '';
				break;
		}
		return result;
	},
	//パラメーターセットデータ作成
	createParam: function() {
		return (
			this.patternId 
			+ (this.newsFlg ? '_' + this.changeNewsFlg() : '')
			+ (this.segment ? '_' + this.segment : '')
		);
	}
};

//常時ABテスト・240123タブABtest用・主要ニュース10件パーソナライズ化
//対応表
var confJson = {
	"items":[],
	"tab_item":{
		"version":"3",
		"pattern_list":[{
			"pattern_id":"A",
			"d3p_name":"dmenuTab",
			"rcm_num":"5",
			"ls_expire_day":"30",
			"rate":"0"
		},{
			"pattern_id":"B",
			"d3p_name":"dmenuTab2",
			"rcm_num":"",
			"ls_expire_day":"14",
			"rate":"100"
		},{
			"pattern_id":"C",
			"d3p_name":"dmenuTab3",
			"rcm_num":"",
			"ls_expire_day":"14",
			"rate":"0"
		}]
	},
	"topics_item":{
		"version":"8",
		"pattern_list":[
			{"pattern_id":"D", "news_flg":"", "group_no_list":[]},
			{"pattern_id":"E", "news_flg":"0", "group_no_list":["2"]},
			{"pattern_id":"F", "news_flg":"0", "group_no_list":["3"]},
			{"pattern_id":"G", "news_flg":"0", "group_no_list":["4"]}
		]
	},
	"header_ad_item":{
		"version":"3",
		"pattern_list":[
			{"pattern_id":"A", "rate":"100"}
		]
	}
};

var G_abTest = {
	data: {abtestId: "", ptnId: ""},
	tabData: {version: '', ptnId: '', d3pName: '', rcmNum: '' , lsExpireDay: '' , d3pRequestFlg: false}, //240123タブABtest用
	psnData: {version: '', ptnId: '', newsFlg: ''}, //主要ニュース10件パーソナライズ
	headerAdData: {ptnId: ''}, //250304ヘッダー広告ABテスト用
	// 初期化
	init: function() {
		if(!LOCAL_ST.connect()) return;

		// ABテストグループ番号取得、なければ抽選。
		var lsName = 'smt_t_abtest_group';
		var	groupNum = LOCAL_ST.get(lsName) ? LOCAL_ST.get(lsName) : this.lotteryNum(lsName);

		// ポインコモードは対象外
		var themeFlg = G_themeSet || 'default';
		if(themeFlg === 'poinko') {
			this.data = {abtestId: "", ptnId: ""};
			return;
		}

		//240123タブABtest・主要ニュース10件パーソナライズ化 終了後はこちら
		//対応表
		// var confJson = <sp**xt="http://smt.docomo.ne.jp/dmenu/data/top_abtest_conf6.json">;

		// パターン判定
		for(var i=0, itemLen=confJson.items.length; i<itemLen; i++) {
			for(var j=0, listLen=confJson.items[i].pattern_list.length; j<listLen; j++) {
				if(confJson.items[i].pattern_list[j].group_no_list.indexOf(groupNum) > -1) {
					this.data = {
						abtestId: confJson.items[i].abtest_id,
						ptnId: confJson.items[i].pattern_list[j].pattern_id
					};
					//ABテスト 広告効果測定機能
					var impDataAbTestId = this.data['abtestId'] + '_' + this.data['ptnId'];
					(window.googletag) || (window.googletag = {}); googletag.cmd = googletag.cmd || []; googletag.cmd.push(function(){ googletag.pubads().setTargeting("pageimp", impDataAbTestId);});
					break;
				}
			}
			if(this.data['ptnId']) break;
		}
		if(!this.data['ptnId']) { this.data['ptnId'] = 'Z'; }
	},
	// ABテストグループ番号抽選
	lotteryNum: function(lsName) {
		var num = String(Math.floor(Math.random() * 100 + 1));
		LOCAL_ST.set(lsName, num);
		return num;
	},
	// 簡易ABテスト呼び出し
	callSimpleAB: function(slideId, retryCount) {
		var flg = false, count = 1;
		var id = setInterval(function() {
			flg = abTestFunc(slideId);
			if(flg || count >= retryCount) clearInterval(id);
			count++;
		}, 500);
	},
	// タブABテスト
	genreTabAB:function() {
		var confTabData = confJson.tab_item;
		// LSとABテスト入稿データのバージョンが異なる時抽選
		if(G_ls_tabOrder.version && G_ls_tabOrder.version === confTabData.version){
			G_abTest.tabData.version = G_ls_tabOrder.version;
			G_abTest.tabData.ptnId = G_ls_tabOrder.patternId;
			G_abTest.tabData.rcmNum = G_ls_tabOrder.rcmNum;
			for(var i=0,len=confTabData.pattern_list.length;i<len;i++){
				if(confTabData.pattern_list[i].pattern_id === G_ls_tabOrder.patternId){
					G_abTest.tabData.d3pName = confTabData.pattern_list[i].d3p_name;
					G_abTest.tabData.lsExpireDay = Number(confTabData.pattern_list[i].ls_expire_day);
					break;
				}
			}
		}else{
			var	lotteryNum = Math.floor(Math.random() * 100 + 1);
			var startNum = 1;
			var lastNum = 0;
			for(var i=0, listLen=confTabData.pattern_list.length; i<listLen; i++){
				var rateNum = Number(confTabData.pattern_list[i].rate);
				lastNum = lastNum + rateNum;
				if(startNum <= lotteryNum && lotteryNum <= lastNum){
					G_abTest.tabData.version = confTabData.version;
					G_abTest.tabData.ptnId = confTabData.pattern_list[i].pattern_id;
					G_abTest.tabData.d3pName = confTabData.pattern_list[i].d3p_name;
					G_abTest.tabData.rcmNum = confTabData.pattern_list[i].rcm_num;
					G_abTest.tabData.lsExpireDay = Number(confTabData.pattern_list[i].ls_expire_day);
					break;
				}
				startNum = startNum + rateNum;
			}
			G_abTest.tabData.d3pRequestFlg = true;
		}
		//パターンID dataLayer処理
		dataLayer.push({'dweb_user_tab_ab': G_abTest.tabData.ptnId});
	},
	//パーソナライズエリアABテスト
	psnAreaAB: function() {
		var confTabData = confJson.topics_item;
		var notApplicable;
		if(!LOCAL_ST.connect()) return; //LS接続不可

		//グローバル変数にLSのデータ格納
		if(LOCAL_ST.get('smt_t_abtest_news_topics')) {
			var getData = JSON.parse(LOCAL_ST.get('smt_t_abtest_news_topics'));
			G_psnObj.version = getData.version;
			G_psnObj.patternId = getData.pattern_id;
			G_psnObj.newsFlg = getData.news_flg;
			G_psnObj.segment = getData.segment;
			G_psnObj.number = getData.number;
		}

		//バージョン無・version違いは抽選
		if(G_psnObj.version === '' || G_psnObj.version !== confTabData.version) {
			var lotNum = LOCAL_ST.get('smt_t_abtest_group');
			if(!lotNum) return;
			for(var i=0, len=confTabData.pattern_list.length; i<len; i++){
				if(!confTabData.pattern_list[i].group_no_list.length) notApplicable = confTabData.pattern_list[i]; //テスト対象外を取得
				if(confTabData.pattern_list[i].group_no_list.indexOf(String(lotNum)) > -1){
					getMuchData(confTabData.pattern_list[i], this);
					break;
				}
			}
			if(this.psnData.ptnId === '') getMuchData(notApplicable, this); //空の場合は、対象外を使用
		}else{
			this.psnData.ptnId = G_psnObj.patternId;
			this.psnData.version = G_psnObj.version;
			this.psnData.newsFlg = G_psnObj.newsFlg;
		}

		//データの格納
		function getMuchData(data, self) {
			self.psnData.version = confTabData.version;
			self.psnData.ptnId = data.pattern_id;
			self.psnData.newsFlg = data.news_flg;
		}
	},
	headerAdAB:function() {
		var confHeaderAdData = confJson.header_ad_item;
		var lotteryNum = Math.floor(Math.random() * 100 + 1);
		var startNum = 1;
		var lastNum = 0;
		for(var i=0, listLen=confHeaderAdData.pattern_list.length; i<listLen; i++){
			var rateNum = Number(confHeaderAdData.pattern_list[i].rate);
			lastNum = lastNum + rateNum;
			if(startNum <= lotteryNum && lotteryNum <= lastNum){
				G_abTest.headerAdData.ptnId = confHeaderAdData.pattern_list[i].pattern_id;
				break;
			}
			startNum = startNum + rateNum;
		}
	}
};
G_abTest.init();
G_abTest.psnAreaAB(); //パーソナライズエリアABテスト抽選

//PNS 10件データリクエスト処理
(function(){
	if(G_psnObj.patternId === '' || G_psnObj.patternId === 'A') return loadStatus('ok');

	//記事リクエスト
	switch(G_psnObj.patternId){
		case 'D':
		case 'E':
		case 'F':
		case 'G':
			if(G_psnObj.segment === '') return loadStatus('ok'); //D-Gかつセグメントなし
			sendApi('/portal/d3p/data/d3p'+ G_psnObj.patternId +'.json');
			break;
		default:
			loadStatus('fail');
			break;
	}

	//ニュース記事リクエスト
	function sendApi(path){
		$.ajax({
			type: 'get',
			async: false,
			url: path,
			dataType: 'json',
			timeout: 3000 //3秒
		}).done(function(data){
			if(!data.hasOwnProperty([G_psnObj.segment])) return loadStatus('fail'); //セグメントなし
			if(timeErrorCheck(data[G_psnObj.segment][0].t_time)) return loadStatus('fail'); //更新時間エラー
			G_psnObj.newsData = data[G_psnObj.segment][0];
			loadStatus('ok');
		}).fail(function(){
			loadStatus('fail');
		});
	}
	function loadStatus(status){
		G_psnObj.loadFlg = status;
	}
	//ニュース時刻確認
	//trueでエラー
	function timeErrorCheck(newsTime) {
		var now = new Date();
		var hours1 = 60; //1時間
		var hours24 = 1440; //24時間
		//時間を分に変換: 時*hours1 + 分
		var nowMsec = now.getHours() * hours1 + now.getMinutes();
		var newsMsec = Number(newsTime.split('時')[0]) * hours1 + Number(newsTime.split('時')[1].replace('分', ''));

		if(newsMsec > nowMsec){//前日
			return ((nowMsec + hours24) - newsMsec > hours1);
		}else{//当日
			return (nowMsec - newsMsec > hours1);
		}
	}
}());
// mpパラメータ付加処理 主要ニュース10件パーソナライズ化
(function () {
	if(!LOCAL_ST.connect()) return;
	var obj = checkUrl();
	var setPsnVal = G_psnObj.createParam(), normalABparam  = '';
	if(G_abTest.data.ptnId && G_abTest.data.ptnId !== 'Z'){
		normalABparam = G_abTest.data.abtestId + '_' + G_abTest.data.ptnId;
	}
	if(setPsnVal){
		history.replaceState(null, null, obj.replaceUrlParam + ((obj.replaceUrlParam === '')? '?' : '&') + 'mp='+ normalABparam + '-' + setPsnVal + HASH);
	}else{
		history.replaceState(null, null, obj.replaceUrlParam + ((obj.replaceUrlParam === '')? '?' : '&') + 'mp=' + normalABparam + '-' + G_abTest.psnData.ptnId + HASH);
	}
}());

/* --------------------------------
  毎日くじ未実施判定
------------------------------------*/
//管理用フラグ
var G_kujiMarkFlg = {
	serverDate:'',//サーバー時刻
	loginCode:0,//dpcログイン認証判定結果
	stageCode:'',//dポイントランク認証判定結果
	dotFlg:1,//毎日くじ通知ドット 1:通知あり、0:通知なし
	statusFlg: 0,//処理状況フラグ 0:未判定、1:異常、2:正常
};

//通知ドット判定処理
function checkHedKujiMark(flgName,val){
	if(G_kujiMarkFlg.dotFlg === 0){
		return;
	}else{
		//サーバー時刻
		if(flgName === 'serverDate'){
			//サーバー時刻の取得失敗時
			if(val === 'error'){
				G_kujiMarkFlg.statusFlg = 1;
				return deleteDot();
			}else{
				//サーバー時刻とUTC標準時との時差（分）取得
				var offset = val.getTimezoneOffset();
				var jpnDate = new Date(Date.parse(val) + (offset + 540) * 60 * 1000);
				G_kujiMarkFlg.serverDate = String(jpnDate.getFullYear()) +
											String(('0' + (jpnDate.getMonth() + 1)).slice(-2)) +
											String('0' + jpnDate.getDate()).slice(-2);
			}
		//dpcログイン
		}else if(flgName === 'loginCode'){
			G_kujiMarkFlg.loginCode = Number(val);
			//ログイン認証(エラーまたは未認証)
			if(G_kujiMarkFlg.loginCode < 1){
				return;
			}
		//ランク
		}else if(flgName === 'stageCode'){
			if(val != '1000'){
				G_kujiMarkFlg.statusFlg = 1;
				return deleteDot();
			}
			G_kujiMarkFlg.stageCode = val;
		}
		//サーバー時刻の取得、ランク認証処理済み
		if(G_kujiMarkFlg.serverDate && G_kujiMarkFlg.stageCode){
			if(G_resultCode === '0000'){
				var date = '';
				if(G_accountSetting['data'] && G_accountSetting['data']['dmenukuji'] && G_accountSetting['data']['dmenukuji']['update']){
					date = G_accountSetting['data']['dmenukuji']['update'].split(',')[0];
				}
				if(G_kujiMarkFlg.serverDate === date){
					G_kujiMarkFlg.statusFlg = 2;
					deleteDot();
				}else{
					G_kujiMarkFlg.statusFlg = 1;
				}
			}else{
				G_kujiMarkFlg.statusFlg = 1;
			}
		}
	}
	//通知ドット削除処理
	function deleteDot(){
		$(function(){
			var hedKuji = document.getElementById('Hed_Kuji');
			if(hedKuji.classList.contains('hed_kuji_mark')){
				hedKuji.classList.remove('hed_kuji_mark');
				G_kujiMarkFlg.dotFlg = 0;
			}
		});
	}
}
/* --------------------------------
ユーザレコメンド取得APIの返却値を格納
------------------------------------*/
try{
	var G_userRecoData = JSON.parse(document.getElementById("userRecoData").textContent);
}catch(e){
	var G_userRecoData = null;
}
/* --------------------------------
地域設定がない場合、dpc会員情報で補完
------------------------------------*/
function cityCookieSet(cityCode, updateTime){
	$.cookie('smt_city_code', "", {path:"/", expires:-1});
	$.cookie('smt_city_code', cityCode, { domain: '.smt.docomo.ne.jp', expires: 1825, path: '/' });
	$.cookie('smt_city_time', "", {path:"/", expires:-1});
	$.cookie('smt_city_time', updateTime, { domain: '.smt.docomo.ne.jp', expires: 1825, path: '/' });
}

(function(){
	if(G_weatherSet.code) return  //地域設定を削除している場合は書き換えの対象外

	if(G_userRecoData && G_userRecoData.common.result_code === '0000') {
		var items = G_userRecoData.data.items, itemData = {'a24':{index:'',flg:false}, 'a25':{index:'',flg:false}};
		for(var i=0, len = items.length; i < len; i++) {
			if(!items[i].hasOwnProperty('contents') || !(items[i].frameId === 'a24' || items[i].frameId === 'a25')) {
				continue;
			}
			itemData[items[i].frameId].index = i;
			itemData[items[i].frameId].flg = true;
		}

		if(itemData['a24'].flg && itemData['a25'].flg){
			var dpcCityCode = items[itemData['a24'].index].contents[0].reserved1.slice(-2) + items[itemData['a25'].index].contents[0].reserved1;
			// 浜松市行政区チェック
			if((/2213[1-7]/.test(dpcCityCode))){
				switch(dpcCityCode){
					case '22131':
					case '22132':
					case '22133':
					case '22134':
					case '22135':
						dpcCityCode = '22138';
						break;
					case '22136':
						dpcCityCode = '22139';
						break;
					case '22137':
						dpcCityCode = '22140';
						break;
				}
			}
			cityCookieSet(dpcCityCode, NOW_FULL_DATE);

			G_weatherSet.code = dpcCityCode;
		}
	}
}());

/* --------------------------------
  天気API
------------------------------------*/
var G_weatherInfo = {
	region1: {
		loadStatus: 'load',
		isRegion: false,
		weather: {},
	},
	region2: {
		loadStatus: 'load',
		isRegion: false,
		weather: {},
	},
};
//天気情報取得
(function(){
	var cityCode = G_weatherSet.code;
	if(!cityCode || cityCode === '-'){
		//未設定、削除、LS接続不可
		getWeatherAjax('13', 1);
	}else{
		//地域1、地域2つ設定
		var weatherCodeAry = cityCode.split(':');
		for(var i=0,len=weatherCodeAry.length; i<len; i++){
			G_weatherInfo['region'+ (i+1)]['isRegion'] = true;
			getWeatherAjax(weatherCodeAry[i], i+1);
		}
		cityCookieUpdate();
	}

	//天気情報リクエスト処理
	function getWeatherAjax(regionCode, index){
		var regionNum = regionCode.slice(0, 2);
		$.ajax({
			type: 'get',
			async: false,
			url: '/dmenu/weather/data/top_weather_city2_' + regionNum + '.json',
			dataType: 'json',
			timeout: 3000
		}).done(function(data, status, xhr){
			G_weatherInfo['region' + index]['weather'] = matchCityCode(data.weather_list, regionCode);
			G_weatherInfo['region' + index]['loadStatus'] = 'ok';
			if(index == 1) checkHedKujiMark('serverDate', new Date(xhr.getResponseHeader('Date')));
		}).fail(function(xhr, status, err){
			G_weatherInfo['region' + index]['loadStatus'] = 'ng';
			if(index == 1) checkHedKujiMark('serverDate', 'error');
		});
	}

	//天気情報の抽出
	function matchCityCode(data, regionCode){
		var result = false;
		for(var j=0,len=data.length; j<len; j++){
			if(data[j].c_code === regionCode){
				result = data[j];
				break;
			}
		}
		return result;
	}

	function cityCookieUpdate() {
		var cityCodeList = cityCode.split(':');
		var cityCodeListLen = cityCodeList.length;
		var checkFirstResult = false;
		var checkSecondResult = false;

		//地域1
		if(G_weatherInfo.region1.isRegion && Object.keys(G_weatherInfo.region1.weather).length){
			checkFirstResult = true;
		}
		//地域2
		if(G_weatherInfo.region2.isRegion && Object.keys(G_weatherInfo.region2.weather).length){
			checkSecondResult = true;
		}

		if(checkFirstResult === false || checkSecondResult === false){
			var falseDate = new Date();
			var falseYear = falseDate.getFullYear();
			var falseMonth = ('0' + (falseDate.getMonth() + 1)).slice(-2);
			var falseDay = ('0' + falseDate.getDate()).slice(-2);
			var falseHours = ('0' + falseDate.getHours()).slice(-2);
			var falseMinutes = ('0' + falseDate.getMinutes()).slice(-2);
			var falseSeconds = ('0' + falseDate.getSeconds()).slice(-2);
			var falseCurrentTime = falseYear + falseMonth + falseDay + falseHours + falseMinutes + falseSeconds;
		}
		if(checkFirstResult === false){
			G_weatherSet.code = '-';
			cityCookieSet(G_weatherSet.code, falseCurrentTime);
		} else if(cityCodeListLen === 2 && checkFirstResult === true && checkSecondResult === false){
			G_weatherSet.code = cityCodeList[0];
			cityCookieSet(G_weatherSet.code, falseCurrentTime);
		}
	}
})();

/* --------------------------------
  注目ワード
------------------------------------*/
var localHotword = [];
(function(){
	hotWordProc([{"word": "松山千春"}, {"word": "ウィキッド"}, {"word": "大谷翔平"}, {"word": "5時に夢中!"}, {"word": "豊臣兄弟!"}, {"word": "南丹市"}, {"word": "中尾明慶"}, {"word": "千鳥の鬼レンチャン"}, {"word": "ぐるぐるナインティナイン"}, {"word": "田鎖ブラザーズ"}]);;
	function hotWordProc(data){
		localHotword = data;
	}
}());

/* --------------------------------
  初期表示
------------------------------------*/
var AMENU_JSON = {
	"genre":[
		{
			"genre_id": "A",
			"genre_title": "",
			"items":[
				{
					"id": "003",
					"title1": "天気",
					"title2": "",
					"url": "",
					"url2": "https://weather.smt.docomo.ne.jp/area_index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_custommenu",
					"dlink_id": "901",
					"comp_normal": "0",
					"comp_ahamo": "0",
					"keyword1": "Wthr",
					"keyword2": "small",
					"txt_class": "",
					"img": ""
				},{
					"id": "049",
					"title1": "災害情報",
					"title2": "",
					"url": "https://weather.smt.docomo.ne.jp/disaster/index.html?utm_source=dmenu_top&utm_medium=category&utm_campaign=disaster_alert",
					"url2": "https://weather.smt.docomo.ne.jp/disaster/index.html?utm_source=dmenu_top&utm_medium=category&utm_campaign=disaster_alert",
					"dlink_id": "239",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Disaster",
					"keyword2": "large",
					"txt_class": "",
					"img": "top_icn_ctg_disaster_220324.png"
				},{
					"id": "004",
					"title1": "占い",
					"title2": "",
					"url": "",
					"url2": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_ranking.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "902",
					"comp_normal": "1",
					"comp_ahamo": "1",
					"keyword1": "Frtn",
					"keyword2": "large",
					"txt_class": "",
					"img": "top_icn_ctg_fortune_220324.png"
				},{
					"id": "005",
					"title1": "乗換/運行",
					"title2": "",
					"url": "https://transfer.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned",
					"url2": "https://transfer.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned",
					"dlink_id": "903",
					"comp_normal": "5",
					"comp_ahamo": "5",
					"keyword1": "Trans",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_trans_220324.png"
				},{
					"id": "048",
					"title1": "株価・マネー",
					"title2": "",
					"url": "https://stocks.monex.co.jp/market?utm_source=dmenu&utm_medium=referral&utm_campaign=custom-menu&utm_content=chart",
					"url2": "https://stocks.monex.co.jp/market?utm_source=dmenu&utm_medium=referral&utm_campaign=custom-menu&utm_content=chart",
					"dlink_id": "238",
					"comp_normal": "19",
					"comp_ahamo": "19",
					"keyword1": "kabukaMoney",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_money_260331.png"
				},{
					"id": "039",
					"title1": "毎日くじ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/collab/topics/src/dmenukuji_01.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=kuji_210201",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/collab/topics/src/dmenukuji_01.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "233",
					"comp_normal": "11",
					"comp_ahamo": "11",
					"keyword1": "dailyKuji",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_dailykuji_220324.png"
				},{
					"id": "006",
					"title1": "dポイント",
					"title2": "",
					"url": "https://dpoint.docomo.ne.jp/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-dpclink",
					"url2": "https://dpoint.docomo.ne.jp/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-dpclink",
					"dlink_id": "007",
					"comp_normal": "3",
					"comp_ahamo": "3",
					"keyword1": "dPoint",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_dpoint_220324.png"
				},{
					"id": "007",
					"title1": "dポイントマーケット",
					"title2": "dﾎﾟｲﾝﾄﾏｰｹｯﾄ",
					"url": "https://dmarket.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpm_202410_dtp_0000006",
					"url2": "https://dmarket.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpm_202410_dtp_0000006",
					"dlink_id": "001",
					"comp_normal": "6",
					"comp_ahamo": "6",
					"keyword1": "Dpmkt",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_dptmarket_241008.png"
				},{
					"id": "008",
					"title1": "dバリューパス",
					"title2": "dﾊﾞﾘｭｰﾊﾟｽ",
					"url": "https://www.sugotoku.docomo.ne.jp/cs/top.html?lan=004&utm_medium=web&utm_source=dmenu&utm_campaign=topdmenu1",
					"url2": "https://www.sugotoku.docomo.ne.jp/cs/top.html?lan=004&utm_medium=web&utm_source=dmenu&utm_campaign=topdmenu1",
					"dlink_id": "003",
					"comp_normal": "8",
					"comp_ahamo": "8",
					"keyword1": "Sugotoku",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_valuepass.png"
				},{
					"id": "050",
					"title1": "メニューリスト",
					"title2": "",
					"url": "http://service.smt.docomo.ne.jp/portal/list/menu/src/menulist_top.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202002_static",
					"url2": "http://service.smt.docomo.ne.jp/portal/list/menu/src/menulist_top.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202002_static",
					"dlink_id": "002",
					"comp_normal": "7",
					"comp_ahamo": "7",
					"keyword1": "menuList",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_menulist_220324.png"
				},{
					"id": "051",
					"title1": "マイメニュー",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/cgi/mymenu/top?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202002_static",
					"url2": "https://service.smt.docomo.ne.jp/cgi/mymenu/top?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_202002_static",
					"dlink_id": "005",
					"comp_normal": "4",
					"comp_ahamo": "4",
					"keyword1": "myMenu",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_mymenu_220324.png"
				},{
					"id": "031",
					"title1": "My docomo",
					"title2": "",
					"url": "https://www.docomo.ne.jp/mydocomo/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-top",
					"url2": "https://www.docomo.ne.jp/mydocomo/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-top",
					"dlink_id": "004",
					"comp_normal": "2",
					"comp_ahamo": "",
					"keyword1": "myDocomo",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_mydocomo_220324.png"
				},{
					"id": "081",
					"title1": "ahamo",
					"title2": "",
					"url": "https://ahamo.com/?utm_source=dmenu&utm_medium=free-display&utm_campaign=ahamo_202301_N011_general_eg",
					"url2": "https://ahamo.com/?utm_source=dmenu&utm_medium=free-display&utm_campaign=ahamo_202301_N010_general_eg",
					"dlink_id": "269",
					"comp_normal": "",
					"comp_ahamo": "2",
					"keyword1": "ahamo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_ahamo_a.png"
				},{
					"id": "118",
					"title1": "住宅・不動産",
					"title2": "",
					"url": "https://house.goo.ne.jp/sp/?utm_source=dmenu&utm_medium=referral&utm_campaign=dmenu_menu_202512",
					"url2": "https://house.goo.ne.jp/sp/?utm_source=dmenu&utm_medium=referral&utm_campaign=dmenu_menu_202512",
					"dlink_id": "306",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "gooHouse",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_gooHouse_260114.png"
				}
			]
		},{
			"genre_id": "B",
			"genre_title": "スポーツ・趣味",
			"items":[
				{
					"id": "035",
					"title1": "スポーツ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "223",
					"comp_normal": "9",
					"comp_ahamo": "9",
					"keyword1": "Sports",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_sports_230228.png"
				},{
					"id": "035a",
					"title1": "プロ野球",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "224",
					"comp_normal": "10",
					"comp_ahamo": "10",
					"keyword1": "Sports",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_baseball_231108.png"
				},{
					"id": "103",
					"title1": "大谷翔平",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_m/memberdetail.html?teamid=19&memberid=727378&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_m/memberdetail.html?teamid=19&memberid=727378&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "291",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Ohtani",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_ohtani_240319.png"
				},{
					"id": "107",
					"title1": "読売ジャイアンツ",
					"title2": "巨人",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=1&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=1&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "295",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Giants",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_giants_240329.png"
				},{
					"id": "104",
					"title1": "阪神タイガース",
					"title2": "阪神",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=5&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=5&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "292",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Hanshin",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_hanshin_260114.png"
				},{
					"id": "106",
					"title1": "横浜ＤｅＮＡベイスターズ",
					"title2": "ＤｅＮＡ",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=3&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=3&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "294",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Dena",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_DeNA_240329.png"
				},{
					"id": "105",
					"title1": "広島東洋カープ",
					"title2": "広島",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=6&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=6&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "293",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Carp",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_carp_240329.png"
				},{
					"id": "108",
					"title1": "東京ヤクルトスワローズ",
					"title2": "ヤクルト",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=2&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=2&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "296",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Yakult",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_yakult_240329.png"
				},{
					"id": "109",
					"title1": "中日ドラゴンズ",
					"title2": "中日",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=4&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=4&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "297",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Chunichi",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_chunichi_240329.png"
				},{
					"id": "112",
					"title1": "福岡ソフトバンクホークス",
					"title2": "ソフトバンク",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=12&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=12&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "300",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Softbank",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_softbank_240329.png"
				},{
					"id": "115",
					"title1": "北海道日本ハムファイターズ",
					"title2": "日本ハム",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=8&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=8&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "303",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Nichiham",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_nichiham_240329.png"
				},{
					"id": "111",
					"title1": "千葉ロッテマリーンズ",
					"title2": "ロッテ",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=9&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=9&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "299",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Lotte",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_lotte_240329.png"
				},{
					"id": "113",
					"title1": "東北楽天ゴールデンイーグルス",
					"title2": "楽天",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=376&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=376&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "301",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Rakuten",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_rakuten_250205.png"
				},{
					"id": "110",
					"title1": "オリックス・バファローズ",
					"title2": "オリックス",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=11&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=11&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "298",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Orix",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_orix_260114.png"
				},{
					"id": "114",
					"title1": "埼玉西武ライオンズ",
					"title2": "西武",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=7&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_j/team.html?teamid=7&utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "302",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Seibu",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_seibu_240329.png"
				},{
					"id": "095",
					"title1": "プロ野球2軍",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_f/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_f/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "283",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Baseball2nd",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_baseball_231108.png"
				},{
					"id": "093",
					"title1": "MLB",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_m/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_m/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "281",
					"comp_normal": "12",
					"comp_ahamo": "12",
					"keyword1": "Mlb",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_MLB_231108.png"
				},{
					"id": "096",
					"title1": "高校野球",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/baseball_high/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/baseball_high/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "284",
					"comp_normal": "25",
					"comp_ahamo": "25",
					"keyword1": "Jhb",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_jhb_231212.png"
				},{
					"id": "035b",
					"title1": "Jリーグ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/soccer_jl/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/soccer_jl/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "225",
					"comp_normal": "21",
					"comp_ahamo": "21",
					"keyword1": "Sports",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_jleague_220324.png"
				},{
					"id": "084",
					"title1": "ゴルフ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/golf/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/golf/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "272",
					"comp_normal": "17",
					"comp_ahamo": "17",
					"keyword1": "Golf",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_golf_230629.png"
				},{
					"id": "085",
					"title1": "中央競馬",
					"title2": "",
					"url": "https://sports.smt.docomo.ne.jp/keiba/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://sports.smt.docomo.ne.jp/keiba/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "273",
					"comp_normal": "27",
					"comp_ahamo": "27",
					"keyword1": "Keiba",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_keiba_230629.png"
				},{
					"id": "097",
					"title1": "地方競馬",
					"title2": "",
					"url": "https://sports.smt.docomo.ne.jp/keiba/nar/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://sports.smt.docomo.ne.jp/keiba/nar/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "285",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Keiba_nar",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_keiba_nar_231212.png"
				},{
					"id": "086",
					"title1": "大相撲",
					"title2": "",
					"url": "https://sumo.sports.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://sumo.sports.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "274",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Sumo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_sumo_230629.png"
				},{
					"id": "087",
					"title1": "フィギュア",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/figureskate/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/figureskate/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "275",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Figure",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_figure_230629.png"
				},{
					"id": "088",
					"title1": "テニス",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/sports/tennis/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://service.smt.docomo.ne.jp/portal/sports/tennis/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "276",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Tennis",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_tennis_230629.png"
				},{
					"id": "089",
					"title1": "Bリーグ",
					"title2": "",
					"url": "https://sports.smt.docomo.ne.jp/basketball/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://sports.smt.docomo.ne.jp/basketball/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "277",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Bleague",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_bleague_230629.png"
				},{
					"id": "098",
					"title1": "ラグビー",
					"title2": "",
					"url": "https://sports.smt.docomo.ne.jp/rugby/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"url2": "https://sports.smt.docomo.ne.jp/rugby/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cm",
					"dlink_id": "286",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Rugby",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_rugby_231212.png"
				},{
					"id": "036",
					"title1": "毎日クイズ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/play/quiz/src/matome_01.html",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/play/quiz/src/matome_01.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "226",
					"comp_normal": "24",
					"comp_ahamo": "24",
					"keyword1": "Training",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_quiz_220324.png"
				},{
					"id": "037",
					"title1": "ラジオ体操",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/health/src/radio-taisou_202011.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/health/src/radio-taisou_202011.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "227",
					"comp_normal": "18",
					"comp_ahamo": "18",
					"keyword1": "Kenkou",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_kenkou_220324.png"
				},{
					"id": "090",
					"title1": "毎日ストレッチ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/stretch/src/stretch_2201.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/stretch/src/stretch_2201.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "278",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Stretch",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_stretch_230629.png"
				},{
					"id": "047",
					"title1": "毎日レシピ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/life/recipe/src/matome_01.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=cstmmenu",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/life/recipe/src/matome_01.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "237",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Recipe",
					"keyword2": "large",
					"txt_class": "",
					"img": "top_icn_ctg_recipe_220324.png"
				},{
					"id": "069",
					"title1": "どうぶつ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/animal/src/animal_2104.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/animal/src/animal_2104.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "257",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Animal",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_animal_220324.png"
				},{
					"id": "070",
					"title1": "ドラマ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/life/entertainment/src/drama_89.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/life/entertainment/src/drama_89.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "258",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Drama",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_drama_220324.png"
				},{
					"id": "072",
					"title1": "グルメ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/gourmet/src/gourmet_2112.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/gourmet/src/gourmet_2112.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "260",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Gourmet",
					"keyword2": "large",
					"txt_class": "",
					"img": "top_icn_ctg_gourmet_220324.png"
				},{
					"id": "073",
					"title1": "エンタメ",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/idol/src/idol_2202.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/idol/src/idol_2202.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "261",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Entame",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_entame_220324.png"
				},{
					"id": "092",
					"title1": "暮らし",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/living/src/living.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/living/src/living.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "280",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Living",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_living_230821.png"
				},{
					"id": "094",
					"title1": "タロット占い",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/fortune/src/tarot.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/fortune/src/tarot.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "282",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Tarot",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_tarot_231122.png"
				}
			]
		},{
			"genre_id": "C",
			"genre_title": "ポイント・キャンペーン",
			"items":[
				{
					"id": "006a",
					"title1": "ポイント詳細",
					"title2": "",
					"url": "https://dpoint.docomo.ne.jp/member/point_info/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-pointlink",
					"url2": "https://dpoint.docomo.ne.jp/member/point_info/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-pointlink",
					"dlink_id": "134",
					"comp_normal": "26",
					"comp_ahamo": "26",
					"keyword1": "dPoint",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_point_260216.png"
				},{
					"id": "119",
					"title1": "ミッション",
					"title2": "",
					"url": "https://dpoint.onelink.me/roGT?af_xp=custom&pid=dmenutop_allservice_mission_list_2512&af_dp=dpoint%3A%2F%2Fnormal_mission_list&af_ios_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fdpc%2Fmisstion_lp%2Findex.html&af_android_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fdpc%2Fmisstion_lp%2Findex.html",
					"url2": "https://dpoint.onelink.me/roGT?af_xp=custom&pid=dmenutop_allservice_mission_list_2512&af_dp=dpoint%3A%2F%2Fnormal_mission_list&af_ios_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fdpc%2Fmisstion_lp%2Findex.html&af_android_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fdpc%2Fmisstion_lp%2Findex.html",
					"dlink_id": "307",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Mission",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_mission_260216.png"
				},{
					"id": "120",
					"title1": "dポイントスタンプ",
					"title2": "dﾎﾟｲﾝﾄｽﾀﾝﾌﾟ",
					"url": "https://dpoint.onelink.me/roGT?af_xp=custom&pid=dmenutop_allservice_shopping_stamp_list_2512&af_dp=dpoint%3A%2F%2Fshopping_stamp_list&af_ios_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fguide%2Fhowto_dpoint%2Fapp%2Fshopping_stamp%2Findex.html&af_android_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fguide%2Fhowto_dpoint%2Fapp%2Fshopping_stamp%2Findex.html",
					"url2": "https://dpoint.onelink.me/roGT?af_xp=custom&pid=dmenutop_allservice_shopping_stamp_list_2512&af_dp=dpoint%3A%2F%2Fshopping_stamp_list&af_ios_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fguide%2Fhowto_dpoint%2Fapp%2Fshopping_stamp%2Findex.html&af_android_url=https%3A%2F%2Fdpoint.docomo.ne.jp%2Fguide%2Fhowto_dpoint%2Fapp%2Fshopping_stamp%2Findex.html",
					"dlink_id": "308",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "dptStamp",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_dptStamp_260216.png"
				},{
					"id": "006e",
					"title1": "ためる",
					"title2": "",
					"url": "https://dpoint.docomo.ne.jp/guide/howto_acc/index.html?utm_source=dmenu&utm_medium=owned&utm_campaign=dpc_202512_owned-dmenu-chargelink",
					"url2": "https://dpoint.docomo.ne.jp/guide/howto_acc/index.html?utm_source=dmenu&utm_medium=owned&utm_campaign=dpc_202512_owned-dmenu-chargelink",
					"dlink_id": "138",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "dPoint",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_save_260216.png"
				},{
					"id": "006c",
					"title1": "クーポン",
					"title2": "",
					"url": "https://dpoint.docomo.ne.jp/coupon.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-couponlink",
					"url2": "https://dpoint.docomo.ne.jp/coupon.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-couponlink",
					"dlink_id": "136",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "dPoint",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_coupon_260216.png"
				},{
					"id": "006h",
					"title1": "キャンペーン",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/campaign/src/campaign_2108.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/campaign/src/campaign_2108.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "240",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "dPoint",
					"keyword2": "large",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_dpoint_cp_220727.png"
				},{
					"id": "006d",
					"title1": "ポイントゲーム",
					"title2": "ﾎﾟｲﾝﾄｹﾞｰﾑ",
					"url": "https://dpoint.docomo.ne.jp/content/land/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-gamelink",
					"url2": "https://dpoint.docomo.ne.jp/content/land/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202001_owned-dmenu-gamelink",
					"dlink_id": "137",
					"comp_normal": "16",
					"comp_ahamo": "16",
					"keyword1": "dPoint",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_game_260216.png"
				},{
					"id": "007a",
					"title1": "くじ・無料抽選プレゼント",
					"title2": "くじ・ﾌﾟﾚｾﾞﾝﾄ",
					"url": "https://dmarket.docomo.ne.jp/kuji/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpm_202410_kuj_0002455",
					"url2": "https://dmarket.docomo.ne.jp/kuji/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpm_202410_kuj_0002455",
					"dlink_id": "141",
					"comp_normal": "15",
					"comp_ahamo": "15",
					"keyword1": "Sgrk",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_sgrk_220727.png"
				},{
					"id": "121",
					"title1": "ケータイ料金につかう",
					"title2": "料金につかう",
					"url": "https://dpoint.docomo.ne.jp/use/payment/index.html?utm_source=dmenu&utm_medium=owned&utm_campaign=dpc_202512_owned-dmenu-usepayment",
					"url2": "https://dpoint.docomo.ne.jp/use/payment/index.html?utm_source=dmenu&utm_medium=owned&utm_campaign=dpc_202512_owned-dmenu-usepayment",
					"dlink_id": "309",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Payment",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_payment_260216.png"
				}
			]
		},{
			"genre_id": "D",
			"genre_title": "お客様サービス",
			"items":[
				{
					"id": "031c",
					"title1": "ご契約内容",
					"title2": "",
					"url": "https://www.docomo.ne.jp/mydocomo/contract/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-contract",
					"url2": "https://www.docomo.ne.jp/mydocomo/contract/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-contract",
					"dlink_id": "220",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "myDocomo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_mydocomo_220324.png"
				},{
					"id": "031d",
					"title1": "設定",
					"title2": "",
					"url": "https://www.docomo.ne.jp/mydocomo/settings/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-settings",
					"url2": "https://www.docomo.ne.jp/mydocomo/settings/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-settings",
					"dlink_id": "221",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "myDocomo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_mydocomo_220324.png"
				},{
					"id": "031b",
					"title1": "データ・料金",
					"title2": "",
					"url": "https://www.docomo.ne.jp/mydocomo/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-top",
					"url2": "https://www.docomo.ne.jp/mydocomo/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-top",
					"dlink_id": "219",
					"comp_normal": "20",
					"comp_ahamo": "",
					"keyword1": "myDocomo",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_mydocomo_220324.png"
				},{
					"id": "031a",
					"title1": "お手続き",
					"title2": "",
					"url": "https://www.docomo.ne.jp/mydocomo/application/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-application",
					"url2": "https://www.docomo.ne.jp/mydocomo/application/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-application",
					"dlink_id": "218",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "myDocomo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_mydocomo_220324.png"
				},{
					"id": "031e",
					"title1": "おトク",
					"title2": "",
					"url": "https://www.docomo.ne.jp/mydocomo/perks/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-perks",
					"url2": "https://www.docomo.ne.jp/mydocomo/perks/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mydocomo_202105_dmenu-bottom-to-myd-perks",
					"dlink_id": "222",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "myDocomo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_mydocomo_220324.png"
				},{
					"id": "082",
					"title1": "データ・料金",
					"title2": "",
					"url": "https://ahamo.com/myportal/home/auth/?utm_source=dmenu&utm_medium=free-display&utm_campaign=ahamo_202301_N008_general_eg",
					"url2": "https://ahamo.com/myportal/home/auth/?utm_source=dmenu&utm_medium=free-display&utm_campaign=ahamo_202301_N007_general_eg",
					"dlink_id": "270",
					"comp_normal": "",
					"comp_ahamo": "20",
					"keyword1": "ahamo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_ahamo_a.png"
				}
			]
		},{
			"genre_id": "E",
			"genre_title": "ドコモショップ・d garden",
			"items":[
				{
					"id": "068",
					"title1": "店舗検索・予約",
					"title2": "",
					"url": "https://shop.smt.docomo.ne.jp/index.html",
					"url2": "https://shop.smt.docomo.ne.jp/index.html",
					"dlink_id": "256",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Docomoshopreserve",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_docomosp_220727.png"
				},{
					"id": "067",
					"title1": "スマホ教室",
					"title2": "",
					"url": "https://study.smt.docomo.ne.jp/",
					"url2": "https://study.smt.docomo.ne.jp/",
					"dlink_id": "255",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Spschool",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_docomosp_220727.png"
				}
			]
		},{
			"genre_id": "F",
			"genre_title": "製品・料金",
			"items":[
				{
					"id": "043",
					"title1": "ドコモオンラインショップ",
					"title2": "ｵﾝﾗｲﾝｼｮｯﾌﾟ",
					"url": "https://onlineshop.docomo.ne.jp/top-ols?utm_source=dmenu_menulist&utm_medium=free-display&utm_campaign=ols_202102_ols-top&utm_content=category_setting",
					"url2": "https://onlineshop.docomo.ne.jp/top-ols?utm_source=dmenu_menulist&utm_medium=free-display&utm_campaign=ols_202102_ols-top&utm_content=category_setting",
					"dlink_id": "232",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Onlineshop",
					"keyword2": "large",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_online_220727.png"
				},{
					"id": "052",
					"title1": "製品ラインナップ",
					"title2": "製品ﾗｲﾝﾅｯﾌﾟ",
					"url": "https://www.docomo.ne.jp/product/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-top-to-crp-product",
					"url2": "https://www.docomo.ne.jp/product/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-top-to-crp-product",
					"dlink_id": "241",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "product",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_lineup_220727.png"
				},{
					"id": "053",
					"title1": "料金プラン",
					"title2": "",
					"url": "https://www.docomo.ne.jp/charge/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-top-to-crp-charge",
					"url2": "https://www.docomo.ne.jp/charge/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-top-to-crp-charge",
					"dlink_id": "242",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "chargePlan",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_plan_220727.png"
				},{
					"id": "054",
					"title1": "料金シミュレーション",
					"title2": "料金ｼﾐｭﾚｰｼｮﾝ",
					"url": "https://www.docomo.ne.jp/charge/simulation/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-to-crp-charge-simulation",
					"url2": "https://www.docomo.ne.jp/charge/simulation/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-to-crp-charge-simulation",
					"dlink_id": "243",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "simulation",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_sim_220727.png"
				},{
					"id": "056",
					"title1": "ドコモ光",
					"title2": "",
					"url": "https://www.docomo.ne.jp/hikari/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-top-to-crp-hikari",
					"url2": "https://www.docomo.ne.jp/hikari/?utm_source=dmenu&utm_medium=owned&utm_campaign=corp_202106_from-dmenu-top-to-crp-hikari",
					"dlink_id": "244",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "hikari",
					"keyword2": "large",
					"txt_class": "",
					"img": "top_icn_ctg_hikari_220727.png"
				},{
					"id": "077",
					"title1": "ドコモでんき",
					"title2": "",
					"url": "https://denki.docomo.ne.jp/pages/choice.html?utm_source=dmenu&utm_medium=free-display&utm_content=custommenu&utm_campaign=energy_202205",
					"url2": "https://denki.docomo.ne.jp/pages/choice.html?utm_source=dmenu&utm_medium=free-display&utm_content=custommenu&utm_campaign=energy_202205",
					"dlink_id": "265",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Docomodenki",
					"keyword2": "large",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_docomodenki.png"
				}
			]
		},{
			"genre_id": "G",
			"genre_title": "決済・金融",
			"items":[
				{
					"id": "002",
					"title1": "d払い",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/keitai_payment/?utm_source=dmenu_top&utm_medium=free-display&utm_campaign=dpayment_202001_dpay-top&utm_content=dm_topcustomize",
					"url2": "https://service.smt.docomo.ne.jp/keitai_payment/?utm_source=dmenu_top&utm_medium=free-display&utm_campaign=dpayment_202001_dpay-top&utm_content=dm_topcustomize",
					"dlink_id": "102",
					"comp_normal": "14",
					"comp_ahamo": "14",
					"keyword1": "dBara",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_dbarai_220727.png"
				},{
					"id": "040",
					"title1": "dカード",
					"title2": "",
					"url": "https://dcard.docomo.ne.jp/st/index.html?utm_source=dmenu_top&utm_medium=shortcut&utm_campaign=dcard_202511_dmenu-top-1106&argument=WUUq3J3f&dmai=a6909bfc4b9286",
					"url2": "https://dcard.docomo.ne.jp/st/index.html?utm_source=dmenu_top&utm_medium=shortcut&utm_campaign=dcard_202511_dmenu-top-1106&argument=WUUq3J3f&dmai=a6909bfc4b9286",
					"dlink_id": "229",
					"comp_normal": "13",
					"comp_ahamo": "13",
					"keyword1": "Dcard",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_dcard_251210.png"
				},{
					"id": "041",
					"title1": "電子マネーiD",
					"title2": "",
					"url": "https://id-credit.com/index.html?utm_source=web&utm_medium=dmenu&utm_campaign=iD_TOP",
					"url2": "https://id-credit.com/index.html?utm_source=web&utm_medium=dmenu&utm_campaign=iD_TOP",
					"dlink_id": "230",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "eMoneyID",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_iD_220727.png"
				},{
					"id": "042",
					"title1": "dポイント運用",
					"title2": "",
					"url": "https://dpoint-inv.smt.docomo.ne.jp/portal/top?fr=oldurl&utm_source=dmenu&utm_medium=referral&utm_campaign=dmenucategoryicon",
					"url2": "https://dpoint-inv.smt.docomo.ne.jp/portal/top?fr=oldurl&utm_source=dmenu&utm_medium=referral&utm_campaign=dmenucategoryicon",
					"dlink_id": "231",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Pointinvest",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_dpt-inv_220727.png"
				},{
					"id": "116",
					"title1": "dスマホローン",
					"title2": "",
					"url": "https://lp.loan.docomo.ne.jp/lp/generally01/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=icon&utm_term=customize_menu",
					"url2": "https://lp.loan.docomo.ne.jp/lp/generally01/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=icon&utm_term=service_tab",
					"dlink_id": "304",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Dloan",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_dloan_240730.png"
				},{
					"id": "125",
					"title1": "かんたん資産運用",
					"title2": "資産運用",
					"url": "https://monex.docomo.ne.jp/easy-nisa/lp/web/01/index.html?utm_source=dmenu&utm_medium=dmenu_customize_icon&utm_campaign=easy_nisa&utm_term=easy-nisa-lp-web-shin_easy-nisa-lp-web-shin&utm_content=2507_docomo&acOpenChannel=d05a36553",
					"url2": "https://monex.docomo.ne.jp/easy-nisa/lp/web/01/index.html?utm_source=dmenu&utm_medium=dmenu_customize_icon&utm_campaign=easy_nisa&utm_term=easy-nisa-lp-web-shin_easy-nisa-lp-web-shin&utm_content=2507_docomo&acOpenChannel=d05a36553",
					"dlink_id": "313",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "EasyNisa",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_nisa_260325.png"
				}
			]
		},{
			"genre_id": "H",
			"genre_title": "ショッピング・体験",
			"items":[
				{
					"id": "010",
					"title1": "dショッピング",
					"title2": "dｼｮｯﾋﾟﾝｸﾞ",
					"url": "https://dshopping.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dshopping_201910_senryaku",
					"url2": "https://dshopping.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dshopping_201910_senryaku",
					"dlink_id": "110",
					"comp_normal": "23",
					"comp_ahamo": "23",
					"keyword1": "Shopping",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_shopping_220727.png"
				},{
					"id": "014",
					"title1": "d fashion",
					"title2": "",
					"url": "https://dfashion.docomo.ne.jp/top/index/pt_0-tp_1?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dfashion_202006_senryaku",
					"url2": "https://dfashion.docomo.ne.jp/top/index/pt_0-tp_1?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dfashion_202006_senryaku",
					"dlink_id": "114",
					"comp_normal": "28",
					"comp_ahamo": "28",
					"keyword1": "Fashion",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_fashion_220727.png"
				},{
					"id": "057",
					"title1": "kikito",
					"title2": "",
					"url": "https://rental.kikito.docomo.ne.jp/?utm_source=dmenu&utm_medium=free-display&utm_campaign=kikito_202105_dmenyutop",
					"url2": "https://rental.kikito.docomo.ne.jp/?utm_source=dmenu&utm_medium=free-display&utm_campaign=kikito_202105_dmenyutop",
					"dlink_id": "245",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "kikito",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_kikito_220727.png"
				}
			]
		},{
			"genre_id": "I",
			"genre_title": "エンターテインメント",
			"items":[
				{
					"id": "025",
					"title1": "dヒッツ",
					"title2": "",
					"url": "https://dhits.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dhits_201910_senryaku",
					"url2": "https://dhits.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dhits_201910_senryaku",
					"dlink_id": "125",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Musicfa",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_musicfa_220727.png"
				},{
					"id": "016",
					"title1": "dミュージック",
					"title2": "dﾐｭｰｼﾞｯｸ",
					"url": "https://dmusic.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmusic_201910_senryaku",
					"url2": "https://dmusic.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmusic_201910_senryaku",
					"dlink_id": "116",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Music",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_music_220727.png"
				},{
					"id": "013",
					"title1": "dブック",
					"title2": "",
					"url": "https://dbook.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dbook_202012_senryaku",
					"url2": "https://dbook.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dbook_202012_senryaku",
					"dlink_id": "113",
					"comp_normal": "22",
					"comp_ahamo": "22",
					"keyword1": "Books",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_books_220727.png"
				},{
					"id": "024",
					"title1": "dマガジン",
					"title2": "",
					"url": "https://dmagazine.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmagazine_201910_senryaku",
					"url2": "https://dmagazine.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmagazine_201910_senryaku",
					"dlink_id": "124",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "dMagazine",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_dmagazine_220727.png"
				},{
					"id": "023",
					"title1": "Lemino",
					"title2": "",
					"url": "https://lemino.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=lemino_202304_top-senryaku-sp",
					"url2": "https://lemino.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=lemino_202304_senryaku-sp",
					"dlink_id": "123",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Lemino",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_lemino.png"
				},{
					"id": "027",
					"title1": "dアニメストア",
					"title2": "dｱﾆﾒｽﾄｱ",
					"url": "https://animestore.docomo.ne.jp/animestore/tp_nm?utm_source=dmenu_top&utm_medium=owned&utm_campaign=danime_201910_senryaku",
					"url2": "https://animestore.docomo.ne.jp/animestore/tp_nm?utm_source=dmenu_top&utm_medium=owned&utm_campaign=danime_201910_senryaku",
					"dlink_id": "127",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Anime",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_anime_220727.png"
				},{
					"id": "026",
					"title1": "dフォト",
					"title2": "",
					"url": "https://dphoto.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dphoto_201910_senryaku",
					"url2": "https://dphoto.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dphoto_201910_senryaku",
					"dlink_id": "126",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Photo",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_photo_220727.png"
				},{
					"id": "079",
					"title1": "ドコモスポーツくじ",
					"title2": "ﾄﾞｺﾓｽﾎﾟｰﾂくじ",
					"url": "https://toto.docomo.ne.jp/?utm_source=dmenu&utm_medium=owned&utm_campaign=ex-20220915-cmx0000-dme0004-notuse",
					"url2": "https://toto.docomo.ne.jp/?utm_source=dmenu&utm_medium=owned&utm_campaign=ex-20220915-cmx0000-dme0003-notuse",
					"dlink_id": "267",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "SportsKuji",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_sports_kuji.png"
				},{
					"id": "032",
					"title1": "DAZN for DOCOMO",
					"title2": "DAZN",
					"url": "https://www.docomo.ne.jp/special_contents/dazn/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=d4d_201912_senryaku",
					"url2": "https://www.docomo.ne.jp/special_contents/dazn/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=d4d_201912_senryaku",
					"dlink_id": "208",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "DAZN",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_dazn_220727.png"
				},{
					"id": "001",
					"title1": "ディズニープラス",
					"title2": "ﾃﾞｨｽﾞﾆｰﾌﾟﾗｽ",
					"url": "https://service.smt.docomo.ne.jp/site/special/src/all_100.html?ex_cmp=dp_ddcm_dmenu_topbt&utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_topbt",
					"url2": "https://service.smt.docomo.ne.jp/site/special/src/all_100.html?ex_cmp=dp_ddcm_dmenu_topbt&utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_topbt",
					"dlink_id": "101",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Disney",
					"keyword2": "large",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_disney_250424.png"
				},{
					"id": "117",
					"title1": "爆アゲ セレクション",
					"title2": "爆ｱｹﾞ ｾﾚｸｼｮﾝ",
					"url": "https://ssw.web.docomo.ne.jp/bakuage/?utm_source=dmenu&utm_medium=&utm_campaign=bakuage_202502_top_0000293",
					"url2": "https://ssw.web.docomo.ne.jp/bakuage/?utm_source=dmenu&utm_medium=&utm_campaign=bakuage_202502_top_0000293",
					"dlink_id": "305",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Bakuage",
					"keyword2": "large",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_bakuage_250304.png"
				}
				,{
					"id": "122",
					"title1": "爆アゲ×Netflix",
					"title2": "Netflix",
					"url": "https://ssw.web.docomo.ne.jp/bakuage/netflix/?utm_source=dmenu&utm_medium=owned&utm_campaign=bakuage_202602_ntf_0000477",
					"url2": "https://ssw.web.docomo.ne.jp/bakuage/netflix/?utm_source=dmenu&utm_medium=owned&utm_campaign=bakuage_202602_ntf_0000477",
					"dlink_id": "310",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Netflix",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_netflix_260306.png"
				}
				,{
					"id": "123",
					"title1": "Amazonプライム",
					"title2": "Amazonﾌﾟﾗｲﾑ",
					"url": "https://ssw.web.docomo.ne.jp/prime/?utm_source=dmenu&utm_medium=owned&utm_campaign=ap_202602_ap_0001063",
					"url2": "https://ssw.web.docomo.ne.jp/prime/?utm_source=dmenu&utm_medium=owned&utm_campaign=ap_202602_ap_0001063",
					"dlink_id": "311",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Amazon",
					"keyword2": "large",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_amazon_260325.png"
				}
				,{
					"id": "124",
					"title1": "Spotify Premium",
					"title2": "Spotify",
					"url": "https://ssw.web.docomo.ne.jp/bakuage/spotifypremium/?utm_source=dmenu&utm_medium=owned&utm_campaign=bakuage_202602_spt_0000202",
					"url2": "https://ssw.web.docomo.ne.jp/bakuage/spotifypremium/?utm_source=dmenu&utm_medium=owned&utm_campaign=bakuage_202602_spt_0000202",
					"dlink_id": "312",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Spotify",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_spotify_260325.png"
				}
			]
		},{
			"genre_id": "J",
			"genre_title": "健康・ライフサポート",
			"items":[
				{
					"id": "080",
					"title1": "美容・健康",
					"title2": "",
					"url": "https://service.smt.docomo.ne.jp/portal/special/beauty/src/beauty_2209.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://service.smt.docomo.ne.jp/portal/special/beauty/src/beauty_2209.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "268",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Beauty",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_beauty.png"
				},{
					"id": "044",
					"title1": "ドコモスマート保険ナビ",
					"title2": "ｽﾏｰﾄ保険ﾅﾋﾞ",
					"url": "https://hoken-navi.docomo.ne.jp/lk/lk651?utm_source=dmenu&utm_medium=referral&utm_campaign=dcm",
					"url2": "https://hoken-navi.docomo.ne.jp/lk/lk651?utm_source=dmenu&utm_medium=referral&utm_campaign=dcm",
					"dlink_id": "234",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Hokennavi",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_hokennavi_230228.png"
				},{
					"id": "029",
					"title1": "dヘルスケア",
					"title2": "",
					"url": "https://health.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dhealth_201910_senryaku",
					"url2": "https://health.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dhealth_201910_senryaku",
					"dlink_id": "129",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Health",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_health_220727.png"
				},{
					"id": "017b",
					"title1": "dジョブスマホワークアンケート",
					"title2": "ｽﾏﾎﾜｰｸｱﾝｹｰﾄ",
					"url": "https://sw.djob.docomo.ne.jp/search?prj_major_cate_cd%5B%5D=01&prj_major_cate_cd%5B%5D=07&prj_major_cate_cd%5B%5D=04&prj_major_cate_cd%5B%5D=05&prj_major_cate_cd%5B%5D=06&dscrning_cndtn%5B%5D=06&smt=1&tile=enq&utm_source=dmenu_top&utm_medium=free-display&utm_campaign=djob_2023_custom_menu_enquete&utm_content=txt&ch_param=free-display_dmenu_top_djob_2023_custom_menu_enquete",
					"url2": "https://sw.djob.docomo.ne.jp/search?prj_major_cate_cd%5B%5D=01&prj_major_cate_cd%5B%5D=07&prj_major_cate_cd%5B%5D=04&prj_major_cate_cd%5B%5D=05&prj_major_cate_cd%5B%5D=06&dscrning_cndtn%5B%5D=06&smt=1&tile=enq&utm_source=dmenu_top&utm_medium=free-display&utm_campaign=djob_2023_custom_menu_enquete&utm_content=txt&ch_param=free-display_dmenu_top_djob_2023_custom_menu_enquete",
					"dlink_id": "175",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Job",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow7",
					"img": "top_icn_ctg_djobsw_230801.png"
				},{
					"id": "017a",
					"title1": "dジョブスマホワーク",
					"title2": "スマホワーク",
					"url": "https://sw.djob.docomo.ne.jp/lp?utm_source=dmenu_top&utm_medium=free-display&utm_campaign=djob_2023_custom_menu_lp&utm_content=txt&ch_param=free-display_dmenu_top_djob_2023_custom_menu_lp",
					"url2": "https://sw.djob.docomo.ne.jp/lp?utm_source=dmenu_top&utm_medium=free-display&utm_campaign=djob_2023_custom_menu_lp&utm_content=txt&ch_param=free-display_dmenu_top_djob_2023_custom_menu_lp",
					"dlink_id": "174",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Job",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_djobsw_230801.png"
				},{
					"id": "018",
					"title1": "dカーシェア",
					"title2": "dｶｰｼｪｱ",
					"url": "https://dcarshare.docomo.ne.jp/portal/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dcarshare_201910_senryaku",
					"url2": "https://dcarshare.docomo.ne.jp/portal/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dcarshare_201910_senryaku",
					"dlink_id": "118",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Car_Share",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_car_share_220727.png"
				},{
					"id": "074",
					"title1": "gacco",
					"title2": "",
					"url": "https://gacco.org/",
					"url2": "https://gacco.org/",
					"dlink_id": "262",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Gacco",
					"keyword2": "large",
					"txt_class": "",
					"img": "top_icn_ctg_gacco_220727.png"
				},{
					"id": "101",
					"title1": "comotto",
					"title2": "",
					"url": "https://comotto.docomo.ne.jp/?utm_source=customize&utm_medium=owned&utm_campaign=comotto_202402&utm_content=dmenu",
					"url2": "https://comotto.docomo.ne.jp/?utm_source=customize&utm_medium=owned&utm_campaign=comotto_202402&utm_content=dmenu",
					"dlink_id": "289",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Comotto",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_comotto_240214.png"
				}
			]
		},{
			"genre_id": "K",
			"genre_title": "ニュース・情報マガジン",
			"items":[
				{
					"id": "034a",
					"title1": "ママテナ",
					"title2": "",
					"url": "https://mama.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://mama.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "211",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Topic",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_mama_220727.png"
				},{
					"id": "034f",
					"title1": "イチオシ",
					"title2": "",
					"url": "https://ichioshi.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned",
					"url2": "https://ichioshi.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=owned",
					"dlink_id": "216",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "ichioshi",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_ichioshi_220727.png"
				},{
					"id": "059",
					"title1": "Merkystyle",
					"title2": "",
					"url": "https://mama.smt.docomo.ne.jp/merkystyle/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://mama.smt.docomo.ne.jp/merkystyle/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "247",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Topic",
					"keyword2": "small",
					"txt_class": "amenu_txt-narrow6",
					"img": "top_icn_ctg_merky_220727.png"
				},{
					"id": "060",
					"title1": "ラナーヌ",
					"title2": "",
					"url": "https://mama.smt.docomo.ne.jp/ranune/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"url2": "https://mama.smt.docomo.ne.jp/ranune/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dmenu_top_customizebutton",
					"dlink_id": "248",
					"comp_normal": "",
					"comp_ahamo": "",
					"keyword1": "Topic",
					"keyword2": "small",
					"txt_class": "",
					"img": "top_icn_ctg_rana-nu_220727.png"
				}
			]
		}
	],
	"strategy": []
}
;
var SPORTS_JSON = {"sports_category":{"category":[{"order":1,"id":"baseball_j","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_baseball_j.png","name":"\u30d7\u30ed\u91ce\u7403","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_j\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=baseball_j","flash":""},{"order":2,"id":"baseball_m","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_baseball_m.png","name":"MLB","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=baseball_m","flash":1},{"order":3,"id":"golf","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_golf.png","name":"\u30b4\u30eb\u30d5","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/golf\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=golf","flash":""},{"order":4,"id":"soccer_jl","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_soccer_jl.png","name":"J\u30ea\u30fc\u30b0","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/soccer_jl\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=soccer_jl","flash":""},{"order":5,"id":"sumo","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_sumo.png","name":"\u5927\u76f8\u64b2","more_link":"https:\/\/sumo.sports.smt.docomo.ne.jp\/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=sumo","flash":""},{"order":6,"id":"soccer_jp","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_soccer_jp.png","name":"\u65e5\u672c\u4ee3\u8868","more_link":"https:\/\/soccer.sports.smt.docomo.ne.jp\/japan\/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=soccer_jp","flash":""},{"order":7,"id":"baseball_high","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_baseball_high.png","name":"\u9ad8\u6821\u91ce\u7403","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_high\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=baseball_high","flash":""},{"order":8,"id":"baseball_f","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_baseball_f.png","name":"\u30d7\u30ed\u91ce\u7403(2\u8ecd)","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_f\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=baseball_f","flash":""},{"order":9,"id":"keiba","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_keiba.png","name":"\u4e2d\u592e\u7af6\u99ac","more_link":"https:\/\/sports.smt.docomo.ne.jp\/keiba\/?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=keiba","flash":""},{"order":10,"id":"tennis","image":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_tennis.png","name":"\u30c6\u30cb\u30b9","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/tennis\/index.html?kd_page=index&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_category&utm_content=tennis","flash":""}],"flash_text":{"id":"","image":"","more_link":"","text":""}}};
//AMENU_JSON、SPORTS_JSONそれぞれのidで突合
var SPORTS_ID = {
	'035a': 'baseball_j', //プロ野球
	'035b': 'soccer_jl', //Jリーグ
	'084': 'golf', //ゴルフ
	'085': 'keiba', //中央競馬
	'086': 'sumo', //大相撲
	'087': 'figureskate', //フィギュア
	'088': 'tennis', //テニス
	'093': 'baseball_m', //MLB
	'096': 'baseball_high', //高校野球
	'095': 'baseball_f', //プロ野球2軍
	'098': 'rugby' //ラグビー
}
//スポーツLiveラベル用の除外対象競技ID
var EXC_SPORTS_ID = [
	'soccer_w', //海外サッカー
	'soccer_other', //その他サッカー
	'basketball', //Bリーグ
	'basketball_nba', //NBA
	'athletics', //陸上
	'swimming', //水泳
	'fight', //格闘技
	'f1', //モーター
	'volleyball', //バレー
	'student', //学生スポーツ
	'tabletennis', //卓球
	'esports', //eスポーツ
	'bicycle', //自転車
	'winter', //ウインタースポーツ
	'badminton', //バドミントン
	'other', //その他
	'dosports', //Doスポーツ
	'business', //ビジネス
	'keiba_nar', //地方競馬
	'basketball_wc' //バスケW杯
]
var LIVE_ICON_ARR = [];
var sportsLiveFlg = '';
for(var i=0,len=SPORTS_JSON.sports_category.category.length;i<len;i++){
	if(SPORTS_JSON.sports_category.category[i].flash === 1){
		LIVE_ICON_ARR.push(SPORTS_JSON.sports_category.category[i].id);
		if(EXC_SPORTS_ID.indexOf(SPORTS_JSON.sports_category.category[i].id) === -1){
			sportsLiveFlg = 1;
		}
	}
}
var FORTUNE_JSON;
fortuneContents({
    "fortune_date_list": [
        {
            "fortune_date": "20260420",
            "fortune_list": [
                {
                    "c_code": "11",
                    "name": "みずがめ座",
                    "rank": "1",
                    "whole_txt": "人脈を広げるようにしてみて。人付き合いを通じてチャンスが巡ってくるかも。",
                    "love_score": "5",
                    "love_txt": "積極的にアプローチしてみて。好きな人との距離が縮まりそう。",
                    "work_score": "5",
                    "work_txt": "丁寧に仕事に取り組んで。結果に結びつきそう。",
                    "money_score": "5",
                    "money_txt": "ちょっとした依頼がありそう。引き受けると臨時収入がもらえるかも。",
                    "color": "レッド",
                    "item": "ソーダ",
                    "action": "短歌を読んでみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_11.html"
                },
                {
                    "c_code": "05",
                    "name": "しし座",
                    "rank": "2",
                    "whole_txt": "コミュニケーション能力がいつもより高いかも。人と話すほど人望も集まりそう。",
                    "love_score": "4",
                    "love_txt": "無邪気さが魅力的に映りそう。そんなあなたに惹かれる人が現れるかも。",
                    "work_score": "5",
                    "work_txt": "仲間をサポートする役割で活躍できそう。周りから一目置かれるかも。",
                    "money_score": "5",
                    "money_txt": "友人に誘われたら参加してみて。ご馳走してもらえそう。",
                    "color": "ピンク",
                    "item": "スマホケース",
                    "action": "塩ラーメンを食べてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_05.html"
                },
                {
                    "c_code": "09",
                    "name": "いて座",
                    "rank": "3",
                    "whole_txt": "活動的に過ごせるかも。刺激を受けて良いアイデアも浮かびそう。",
                    "love_score": "4",
                    "love_txt": "笑顔でいるように意識してみて。ステキな人と知り合えるかも。",
                    "work_score": "5",
                    "work_txt": "思いついた企画を仲間に伝えてみて。すぐに形になりそう。",
                    "money_score": "5",
                    "money_txt": "資格取得にお金を使って。のちのち収入アップにつながるかも。",
                    "color": "オレンジ",
                    "item": "ペンダント",
                    "action": "豆乳を飲んでみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_09.html"
                },
                {
                    "c_code": "06",
                    "name": "おとめ座",
                    "rank": "4",
                    "whole_txt": "身の回りを整理整頓してみて。頭のなかもスッキリしてやる気が出てきそう。",
                    "love_score": "4",
                    "love_txt": "オシャレをして出かけて。意中の人が振り向いてくれそう。",
                    "work_score": "4",
                    "work_txt": "仲間と連携して進めてみて。プロジェクトが早く完遂しそう。",
                    "money_score": "5",
                    "money_txt": "副業を考えるのに良いタイミングかも。自分が得意なことに目を向けてみて。",
                    "color": "イエロー",
                    "item": "デニム",
                    "action": "栄養ドリンクを飲んでみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_06.html"
                },
                {
                    "c_code": "01",
                    "name": "おひつじ座",
                    "rank": "5",
                    "whole_txt": "頭の回転が速いかも。ちょっとしたトラブルに巻き込まれても乗り切れそう。",
                    "love_score": "3",
                    "love_txt": "初対面の人でも気軽に話しかけてみて。恋のきっかけになりそう。",
                    "work_score": "4",
                    "work_txt": "タスクをひとつに絞ってみて。その方が成果を出せそう。",
                    "money_score": "4",
                    "money_txt": "リサイクルショップに行ってみて。掘り出し物が見つかりそう。",
                    "color": "シルバー",
                    "item": "蛍光ペン",
                    "action": "パーカーを着てみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_01.html"
                },
                {
                    "c_code": "02",
                    "name": "おうし座",
                    "rank": "6",
                    "whole_txt": "やると決めたら一気に取りかかって。スピーディに進められて結果も出せそう。",
                    "love_score": "3",
                    "love_txt": "積極的に動いてみて。ステキな人に出会えるかも。",
                    "work_score": "4",
                    "work_txt": "仲間にやる気を見せると良いかも。チャンスが巡ってきそう。",
                    "money_score": "4",
                    "money_txt": "収支の整理をしてみて。散財を防げそう。",
                    "color": "グレー",
                    "item": "納豆巻き",
                    "action": "三角形を描いてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_02.html"
                },
                {
                    "c_code": "03",
                    "name": "ふたご座",
                    "rank": "7",
                    "whole_txt": "活動的になりそう。叶えたい夢があるなら、実行に移す良いタイミングかも。",
                    "love_score": "3",
                    "love_txt": "恋の相手は即決しないで。じっくり選べば長続きしそう。",
                    "work_score": "3",
                    "work_txt": "足りない部分を補ってみて。仕事の幅が広がるかも。",
                    "money_score": "4",
                    "money_txt": "たまには自分にご褒美を買ってみて。気分が上がりそう。",
                    "color": "パープル",
                    "item": "栄養ドリンク",
                    "action": "夕焼けの写真を撮ってみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_03.html"
                },
                {
                    "c_code": "07",
                    "name": "てんびん座",
                    "rank": "8",
                    "whole_txt": "何事もポジティブに考えるようにして。穏やかに過ごせるかも。",
                    "love_score": "3",
                    "love_txt": "普段行かない場所に恋のチャンスが潜んでいそう。行動範囲を広げてみて。",
                    "work_score": "3",
                    "work_txt": "後輩のフォローに徹してみて。のちのち強力な助っ人になってくれそう。",
                    "money_score": "3",
                    "money_txt": "家具や大型家電が欲しいのなら情報を集めてみて。納得の品を購入できそう。",
                    "color": "ゴールド",
                    "item": "ガイドブック",
                    "action": "デパートに行ってみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_07.html"
                },
                {
                    "c_code": "08",
                    "name": "さそり座",
                    "rank": "9",
                    "whole_txt": "今日は仲間と一緒に過ごしてみて。ストレスを解消できそう。",
                    "love_score": "2",
                    "love_txt": "勇気を出して動いてみると良さそう。気が合う人と縁ができるかも。",
                    "work_score": "3",
                    "work_txt": "得意な仕事に積極的に取り組むようにしてみて。上司からの評価も上がるかも。",
                    "money_score": "3",
                    "money_txt": "お世話になっている人にご馳走してみて。感謝の気持ちが伝わるかも。",
                    "color": "ホワイト",
                    "item": "マカロニグラタン",
                    "action": "じゃんけんをしてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_08.html"
                },
                {
                    "c_code": "10",
                    "name": "やぎ座",
                    "rank": "10",
                    "whole_txt": "見返りを求めることなく困っている人の手助けをしてあげて。心が満たされそう。",
                    "love_score": "2",
                    "love_txt": "誰に対しても丁寧に接することが大切かも。好きな人の心を動かしそう。",
                    "work_score": "2",
                    "work_txt": "気まぐれな行動は控えて。そうしないとトラブルに発展するかも。",
                    "money_score": "3",
                    "money_txt": "クーポンを活用してみて。お得に食事ができそう。",
                    "color": "グリーン",
                    "item": "ペットボトルの緑茶",
                    "action": "やりたいことリストを書いてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_10.html"
                },
                {
                    "c_code": "12",
                    "name": "うお座",
                    "rank": "11",
                    "whole_txt": "イメチェンしてみて。好感度が上がって、人間関係も良くなるかも。",
                    "love_score": "2",
                    "love_txt": "身だしなみに気をつけて。第一印象が良ければチャンスが巡ってきそう。",
                    "work_score": "2",
                    "work_txt": "知識不足なところがあるかも。スキルアップのために勉強を始めてみて。",
                    "money_score": "2",
                    "money_txt": "赤字間近かも。家族に相談すれば援助してもらえそう。",
                    "color": "ブルー",
                    "item": "牛乳",
                    "action": "好きな食べ物を思い浮かべてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_12.html"
                },
                {
                    "c_code": "04",
                    "name": "かに座",
                    "rank": "12",
                    "whole_txt": "困っている人を放っておけないかも。でもお節介にならないように気をつけて。",
                    "love_score": "1",
                    "love_txt": "情から始まる恋には注意して。冷静に人柄を見るようにしてみて。",
                    "work_score": "2",
                    "work_txt": "今日は後輩のサポートに回った方が良いかも。人を育てることで今後の作業がスムーズになりそう。",
                    "money_score": "2",
                    "money_txt": "予想外の出費がありそう。予算に余裕を持たせて。",
                    "color": "ブラック",
                    "item": "クッキー",
                    "action": "雲を見てみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_04.html"
                }
            ]
        },
        {
            "fortune_date": "20260421",
            "fortune_list": [
                {
                    "c_code": "02",
                    "name": "おうし座",
                    "rank": "1",
                    "whole_txt": "これまでの頑張りを周りに認めてもらえそう。自信につながるかも。",
                    "love_score": "5",
                    "love_txt": "落ち着いた振る舞いを意識してみて。魅力的に映りそう。",
                    "work_score": "5",
                    "work_txt": "あなたらしい方法で仕事を進めてみて。上司からの評価が上がるかも。",
                    "money_score": "5",
                    "money_txt": "価格比較サイトをチェックしてみて。欲しい物をお得に手に入れられそう。",
                    "color": "イエロー",
                    "item": "チーズリゾット",
                    "action": "動画を撮ってみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_02.html?days=1"
                },
                {
                    "c_code": "07",
                    "name": "てんびん座",
                    "rank": "2",
                    "whole_txt": "責任ある役割を引き受けてみて。思っていた以上に成長できそう。",
                    "love_score": "5",
                    "love_txt": "思い込みを捨ててみて。意外な人が恋人候補になるかも。",
                    "work_score": "4",
                    "work_txt": "リーダーシップを発揮できるかも。チームをまとめられて成果も出せそう。",
                    "money_score": "5",
                    "money_txt": "目標の貯金額を決めてみて。効率良く貯められるかも。",
                    "color": "レッド",
                    "item": "ポラロイドカメラ",
                    "action": "紅茶を飲んでみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_07.html?days=1"
                },
                {
                    "c_code": "06",
                    "name": "おとめ座",
                    "rank": "3",
                    "whole_txt": "相手の意見を尊重するようにして。人望を集められるかも。",
                    "love_score": "5",
                    "love_txt": "自然と魅力的な言動ができそう。好きな人の心をつかめるかも。",
                    "work_score": "4",
                    "work_txt": "丁寧な仕事がポイントかも。クライアントからの信頼度がアップしそう。",
                    "money_score": "5",
                    "money_txt": "お金に詳しい人に話を聞いてみて。効率の良い資産の運用法がわかるかも。",
                    "color": "グリーン",
                    "item": "専門書",
                    "action": "ぺペロンチーノを食べてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_06.html?days=1"
                },
                {
                    "c_code": "03",
                    "name": "ふたご座",
                    "rank": "4",
                    "whole_txt": "地味な作業でも最後までやり切って。そうすれば周りから一目置かれるかも。",
                    "love_score": "4",
                    "love_txt": "積極的にアプローチしてみて。受け入れてもらえるかも。",
                    "work_score": "5",
                    "work_txt": "冷静さがポイントかも。ちょっとしたトラブルがあっても上手く調整できそう。",
                    "money_score": "4",
                    "money_txt": "節約に努めて。余裕ができて貯金に回す金額を増やせそう。",
                    "color": "ゴールド",
                    "item": "ウエストポーチ",
                    "action": "テーブルコーディネートをしてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_03.html?days=1"
                },
                {
                    "c_code": "09",
                    "name": "いて座",
                    "rank": "5",
                    "whole_txt": "気になることがあればすぐに挑戦してみて。思っていた以上に上手くいくかも。",
                    "love_score": "4",
                    "love_txt": "気になる相手には直球で気持ちを伝えて。想いが届くかも。",
                    "work_score": "3",
                    "work_txt": "チームでの連携がカギかも。スムーズに仕事を進められそう。",
                    "money_score": "4",
                    "money_txt": "どうしても欲しかった物を買ってみて。心が満たされてモチベーションが上がりそう。",
                    "color": "シルバー",
                    "item": "ヘアオイル",
                    "action": "湯船に浸かってみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_09.html?days=1"
                },
                {
                    "c_code": "11",
                    "name": "みずがめ座",
                    "rank": "6",
                    "whole_txt": "冒険心を持って行動してみて。思わぬラッキーな出来事がありそう。",
                    "love_score": "4",
                    "love_txt": "相手の本質を見極めるようにして。そうすればあなたにピッタリな恋人候補が見つかりそう。",
                    "work_score": "3",
                    "work_txt": "独創的なアイデアが湧いてきそう。周りに伝えれば支持されるかも。",
                    "money_score": "4",
                    "money_txt": "定期預金を検討してみて。堅実に貯められそう。",
                    "color": "パープル",
                    "item": "ラメ入りの小物",
                    "action": "童話を読んでみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_11.html?days=1"
                },
                {
                    "c_code": "01",
                    "name": "おひつじ座",
                    "rank": "7",
                    "whole_txt": "周りとの距離を感じるかも。人に甘えることができれば運が開けてきそう。",
                    "love_score": "3",
                    "love_txt": "相手がこだわっていることには関心を示してみて。距離が縮まるかも。",
                    "work_score": "4",
                    "work_txt": "仲間たちの意見にも耳を傾けて。洗練された企画になるかも。",
                    "money_score": "3",
                    "money_txt": "徹底的にリサーチしてから購入して。満足度が高くなりそう。",
                    "color": "ピンク",
                    "item": "音楽雑誌",
                    "action": "自転車に乗ってみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_01.html?days=1"
                },
                {
                    "c_code": "05",
                    "name": "しし座",
                    "rank": "8",
                    "whole_txt": "安請け合いはしないで。忙しくなってやり遂げらなくなってしまうかも。",
                    "love_score": "3",
                    "love_txt": "好きな人の話をじっくり聞いてみて。信頼度がアップしそう。",
                    "work_score": "3",
                    "work_txt": "未経験の分野の勉強を始めてみて。視野が広がりそう。",
                    "money_score": "3",
                    "money_txt": "ハンドメイドに挑戦してみて。自分好みの物ができて節約にもつながりそう。",
                    "color": "オレンジ",
                    "item": "ヘッドホン",
                    "action": "アクション映画を観てみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_05.html?days=1"
                },
                {
                    "c_code": "12",
                    "name": "うお座",
                    "rank": "9",
                    "whole_txt": "冷静さがポイントかも。トラブルに巻き込まれても上手く乗り切れそう。",
                    "love_score": "3",
                    "love_txt": "好きな人には本音を打ち明けてみて。絆が深まりそう。",
                    "work_score": "2",
                    "work_txt": "アイデアが浮かんでもすぐには提案しないで。周りに相談してからにして。",
                    "money_score": "3",
                    "money_txt": "購入に迷ったら即決はしないで。しっかり調べてからにして。",
                    "color": "ブラック",
                    "item": "メイプルシロップ",
                    "action": "半身浴をしてみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_12.html?days=1"
                },
                {
                    "c_code": "08",
                    "name": "さそり座",
                    "rank": "10",
                    "whole_txt": "周りに影響されやすいかも。自分の軸で行動するように意識してみて。",
                    "love_score": "2",
                    "love_txt": "駆け引きはしないで。想いを正直に伝えれば信頼度が上がるかも。",
                    "work_score": "3",
                    "work_txt": "他部署の人と話すようにしてみて。教えてもらった情報が新しいアイデアにつながるかも。",
                    "money_score": "2",
                    "money_txt": "ムダ遣いが増えていそう。予算を決めてから出かけて。",
                    "color": "ブルー",
                    "item": "にんにく",
                    "action": "古い手紙を整理してみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_08.html?days=1"
                },
                {
                    "c_code": "04",
                    "name": "かに座",
                    "rank": "11",
                    "whole_txt": "周りに振り回されてしまいそう。ひとりの時間を作って心を整理してみて。",
                    "love_score": "2",
                    "love_txt": "理想を見直してみて。意外な人が恋人候補になるかも。",
                    "work_score": "2",
                    "work_txt": "警戒心を持って。うまい話は避けるのが良さそう。",
                    "money_score": "2",
                    "money_txt": "押しの強いセールスに気をつけて。負けてしまうと損してしまうかも。",
                    "color": "ホワイト",
                    "item": "柑橘系のアロマ",
                    "action": "マンホールを探してみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_04.html?days=1"
                },
                {
                    "c_code": "10",
                    "name": "やぎ座",
                    "rank": "12",
                    "whole_txt": "気分の浮き沈みが激しいかも。趣味の時間を増やせば気持ちが整いそう。",
                    "love_score": "2",
                    "love_txt": "自分の本心に従って。そうすれば恋に進展がありそう。",
                    "work_score": "1",
                    "work_txt": "作業が終わらないかも。スケジュールを見直してみて。",
                    "money_score": "2",
                    "money_txt": "散財してしまいそう。長期的な貯金の計画を立てれば防げるかも。",
                    "color": "グレー",
                    "item": "リップクリーム",
                    "action": "絵本を読んでみよう。",
                    "url": "https://service.smt.docomo.ne.jp/portal/fortune/src/fortune_10.html?days=1"
                }
            ]
        }
    ]
});
function fortuneContents(json){
	FORTUNE_JSON = json.fortune_date_list[0];
}
var TRANSFER_JSON = {"transfer_state_list":[{"line":"00020039","line_name":"ＪＲ南武線","state":"1","state_name":"列車遅延"},{"line":"00020045","line_name":"ＪＲ総武線","state":"1","state_name":"列車遅延"},{"line":"00020049","line_name":"ＪＲ東北本線","state":"1","state_name":"列車遅延"},{"line":"00020057","line_name":"ＪＲ横須賀線","state":"1","state_name":"列車遅延"},{"line":"00020058","line_name":"ＪＲ高崎線","state":"1","state_name":"列車遅延"},{"line":"00020059","line_name":"ＪＲ湘南新宿ライン","state":"1","state_name":"列車遅延"},{"line":"00020330","line_name":"ＪＲ左沢線","state":"1","state_name":"運転計画"},{"line":"00020335","line_name":"ＪＲ八戸線","state":"1","state_name":"その他"},{"line":"00020337","line_name":"ＪＲ花輪線","state":"1","state_name":"その他"},{"line":"00020343","line_name":"ＪＲ気仙沼線","state":"1","state_name":"運転計画"},{"line":"00020346","line_name":"ＪＲ大船渡線","state":"1","state_name":"その他"},{"line":"00020348","line_name":"ＪＲ大湊線","state":"1","state_name":"その他"},{"line":"00020351","line_name":"ＪＲ陸羽東線","state":"1","state_name":"その他"},{"line":"00020359","line_name":"ＪＲ津軽線","state":"1","state_name":"その他"},{"line":"00020363","line_name":"ＪＲ山田線","state":"1","state_name":"その他"},{"line":"00020364","line_name":"ＪＲ米坂線","state":"1","state_name":"その他"},{"line":"00021036","line_name":"ＪＲ宇都宮線","state":"1","state_name":"列車遅延"},{"line":"00030050","line_name":"ＪＲ東海道本線","state":"1","state_name":"列車遅延"},{"line":"00030078","line_name":"ＪＲ高山本線","state":"1","state_name":"その他"},{"line":"00040050","line_name":"ＪＲ東海道本線","state":"1","state_name":"列車遅延"},{"line":"00040060","line_name":"ＪＲ福知山線","state":"1","state_name":"列車遅延"},{"line":"00040062","line_name":"ＪＲ東西線","state":"1","state_name":"列車遅延"},{"line":"00040065","line_name":"ＪＲ片町線","state":"1","state_name":"列車遅延"},{"line":"00040069","line_name":"ＪＲ桜井線","state":"1","state_name":"列車遅延"},{"line":"00040072","line_name":"ＪＲ山陰本線","state":"1","state_name":"その他"},{"line":"00040073","line_name":"ＪＲ山陽本線","state":"1","state_name":"運転計画"},{"line":"00040373","line_name":"ＪＲ芸備線","state":"1","state_name":"運転計画"},{"line":"00040386","line_name":"ＪＲ美祢線","state":"1","state_name":"その他"},{"line":"00041060","line_name":"ＪＲ宝塚線","state":"1","state_name":"列車遅延"},{"line":"00042050","line_name":"ＪＲ京都線","state":"1","state_name":"列車遅延"},{"line":"00043050","line_name":"ＪＲ神戸線","state":"1","state_name":"列車遅延"},{"line":"00060288","line_name":"ＪＲ鹿児島本線","state":"1","state_name":"列車遅延"},{"line":"00060293","line_name":"ＪＲ肥薩線","state":"1","state_name":"その他"},{"line":"01110445","line_name":"わたらせ渓谷鐵道","state":"1","state_name":"その他"},{"line":"01140029","line_name":"いすみ鉄道","state":"1","state_name":"その他"},{"line":"01200283","line_name":"長良川鉄道","state":"1","state_name":"列車遅延"},{"line":"01320424","line_name":"阿佐海岸鉄道","state":"1","state_name":"その他"},{"line":"01390321","line_name":"くま川鉄道","state":"1","state_name":"その他"},{"line":"05450103","line_name":"小田急江ノ島線","state":"1","state_name":"運転状況"},{"line":"05450104","line_name":"小田急小田原線","state":"1","state_name":"運転状況"},{"line":"05450105","line_name":"小田急多摩線","state":"1","state_name":"運転状況"},{"line":"05460135","line_name":"東急目黒線","state":"1","state_name":"列車遅延"},{"line":"05460610","line_name":"東急新横浜線","state":"1","state_name":"列車遅延"},{"line":"05480025","line_name":"東京メトロ南北線","state":"1","state_name":"列車遅延"},{"line":"05480026","line_name":"東京メトロ千代田線","state":"1","state_name":"運転状況"},{"line":"05500121","line_name":"相鉄本線・いずみ野線","state":"1","state_name":"列車遅延"},{"line":"05690467","line_name":"大井川鉄道本線","state":"1","state_name":"その他"},{"line":"05740512","line_name":"万葉線鉄道","state":"1","state_name":"その他"},{"line":"05910235","line_name":"南海本線","state":"1","state_name":"列車遅延"},{"line":"05910237","line_name":"南海空港線","state":"1","state_name":"列車遅延"}]};

/**
 * ニュース共通タブのため移植(グローバル化)
 * ・HT_DATA
 * ・NEWS_JSON
 * ・CATEGORY_TABLE
 * ・COM_URL
 */
var PSN_INFO_JSON = {
	"personalize_area": [
		{
			"tab_type": "1",
			"ad_position": "7",
			"ad_ocn_rate": "0",
			"ad_gam_rate": "5",
			"block_1": [
				{"b1_position": "1","b1_type": "1","b1_format": "3"},
				{"b1_position": "2","b1_type": "1","b1_format": "1"},
				{"b1_position": "3","b1_type": "1","b1_format": "1"},
				{"b1_position": "4","b1_type": "1","b1_format": "1"},
				{"b1_position": "5","b1_type": "1","b1_format": "1"},
				{"b1_position": "6","b1_type": "5","b1_format": "4"},
				{"b1_position": "7","b1_type": "1","b1_format": "3"},
				{"b1_position": "8","b1_type": "1","b1_format": "1"},
				{"b1_position": "9","b1_type": "3","b1_format": "3"},
				{"b1_position": "10","b1_type": "1","b1_format": "1"},
				{"b1_position": "11","b1_type": "1","b1_format": "1"},
				{"b1_position": "12","b1_type": "5","b1_format": "4"},
				{"b1_position": "13","b1_type": "1","b1_format": "1"},
				{"b1_position": "14","b1_type": "1","b1_format": "1"},
				{"b1_position": "15","b1_type": "4","b1_format": "4"},
				{"b1_position": "16","b1_type": "1","b1_format": "3"},
				{"b1_position": "17","b1_type": "1","b1_format": "1"},
				{"b1_position": "18","b1_type": "1","b1_format": "1"},
				{"b1_position": "19","b1_type": "4","b1_format": "4"},
				{"b1_position": "20","b1_type": "2","b1_format": "3"},
				{"b1_position": "21","b1_type": "1","b1_format": "1"},
				{"b1_position": "22","b1_type": "1","b1_format": "1"},
				{"b1_position": "23","b1_type": "5","b1_format": "4"},
				{"b1_position": "24","b1_type": "1","b1_format": "1"},
				{"b1_position": "25","b1_type": "1","b1_format": "1"},
				{"b1_position": "26","b1_type": "4","b1_format": "4"},
				{"b1_position": "27","b1_type": "2","b1_format": "3"},
				{"b1_position": "28","b1_type": "1","b1_format": "3"},
				{"b1_position": "29","b1_type": "1","b1_format": "1"},
				{"b1_position": "30","b1_type": "1","b1_format": "1"},
				{"b1_position": "31","b1_type": "5","b1_format": "4"},
				{"b1_position": "32","b1_type": "1","b1_format": "1"},
				{"b1_position": "33","b1_type": "1","b1_format": "1"},
				{"b1_position": "34","b1_type": "1","b1_format": "3"},
				{"b1_position": "35","b1_type": "1","b1_format": "1"},
				{"b1_position": "36","b1_type": "1","b1_format": "1"},
				{"b1_position": "37","b1_type": "5","b1_format": "4"},
				{"b1_position": "38","b1_type": "1","b1_format": "1"},
				{"b1_position": "39","b1_type": "1","b1_format": "1"},
				{"b1_position": "40","b1_type": "1","b1_format": "3"},
				{"b1_position": "41","b1_type": "1","b1_format": "1"},
				{"b1_position": "42","b1_type": "1","b1_format": "1"},
				{"b1_position": "43","b1_type": "5","b1_format": "4"},
				{"b1_position": "44","b1_type": "1","b1_format": "1"},
				{"b1_position": "45","b1_type": "1","b1_format": "1"},
				{"b1_position": "46","b1_type": "1","b1_format": "3"},
				{"b1_position": "47","b1_type": "1","b1_format": "1"},
				{"b1_position": "48","b1_type": "1","b1_format": "1"},
				{"b1_position": "49","b1_type": "1","b1_format": "3"},
				{"b1_position": "50","b1_type": "1","b1_format": "1"},
				{"b1_position": "51","b1_type": "1","b1_format": "1"}
			],
			"block_2": [
				{"b2_position": "1","b2_type": "1","b2_format": "3"},
				{"b2_position": "2","b2_type": "1","b2_format": "1"},
				{"b2_position": "3","b2_type": "1","b2_format": "1"},
				{"b2_position": "4","b2_type": "5","b2_format": "4"},
				{"b2_position": "5","b2_type": "1","b2_format": "1"},
				{"b2_position": "6","b2_type": "1","b2_format": "1"}
			],
			"b2_repeat_count": "6",
			"b2_add_count": "3"
		},
		{
			"tab_type": "2",
			"ad_position": "7",
			"block_1": [
				{"b1_position": "1","b1_type": "1","b1_format": "3"},
				{"b1_position": "2","b1_type": "1","b1_format": "1"},
				{"b1_position": "3","b1_type": "3","b1_format": "3"},
				{"b1_position": "4","b1_type": "1","b1_format": "1"},
				{"b1_position": "5","b1_type": "1","b1_format": "1"},
				{"b1_position": "6","b1_type": "5","b1_format": "4"},
				{"b1_position": "7","b1_type": "1","b1_format": "1"},
				{"b1_position": "8","b1_type": "1","b1_format": "1"},
				{"b1_position": "9","b1_type": "4","b1_format": "4"},
				{"b1_position": "10","b1_type": "1","b1_format": "3"},
				{"b1_position": "11","b1_type": "1","b1_format": "1"},
				{"b1_position": "12","b1_type": "1","b1_format": "1"},
				{"b1_position": "13","b1_type": "4","b1_format": "4"},
				{"b1_position": "14","b1_type": "2","b1_format": "3"},
				{"b1_position": "15","b1_type": "1","b1_format": "1"},
				{"b1_position": "16","b1_type": "1","b1_format": "1"},
				{"b1_position": "17","b1_type": "5","b1_format": "4"},
				{"b1_position": "18","b1_type": "1","b1_format": "1"},
				{"b1_position": "19","b1_type": "1","b1_format": "1"},
				{"b1_position": "20","b1_type": "4","b1_format": "4"},
				{"b1_position": "21","b1_type": "1","b1_format": "3"},
				{"b1_position": "22","b1_type": "1","b1_format": "1"},
				{"b1_position": "23","b1_type": "1","b1_format": "1"},
				{"b1_position": "24","b1_type": "5","b1_format": "4"},
				{"b1_position": "25","b1_type": "1","b1_format": "1"},
				{"b1_position": "26","b1_type": "1","b1_format": "1"},
				{"b1_position": "27","b1_type": "1","b1_format": "3"},
				{"b1_position": "28","b1_type": "1","b1_format": "1"},
				{"b1_position": "29","b1_type": "1","b1_format": "1"},
				{"b1_position": "30","b1_type": "5","b1_format": "4"},
				{"b1_position": "31","b1_type": "1","b1_format": "1"},
				{"b1_position": "32","b1_type": "1","b1_format": "1"}
			],
			"block_2": [
				{"b2_position": "1","b2_type": "1","b2_format": "3"},
				{"b2_position": "2","b2_type": "1","b2_format": "1"},
				{"b2_position": "3","b2_type": "1","b2_format": "1"},
				{"b2_position": "4","b2_type": "5","b2_format": "4"},
				{"b2_position": "5","b2_type": "1","b2_format": "1"},
				{"b2_position": "6","b2_type": "1","b2_format": "1"}
			],
			"b2_repeat_count": "3",
			"b2_add_count": "6"
		}
	],
	"dpoint_hook": [],
	"kuji": {
		"pointup_cp_flg": "0"
	},
	"ad_header": {
		"fq_threshold": "15"
	}
};
var NEWS_INFO_DATA = ''; // 主要ニュースの設定情報入稿データ
var OTHER_NEWS_DATA = ''; // エンタメ、スポーツ、社会、政治経済、地域、国際科学の設定情報入稿データ
for(var i = 0, len = PSN_INFO_JSON.personalize_area.length; i < len; i++){
	if(PSN_INFO_JSON.personalize_area[i].tab_type === '1'){
		NEWS_INFO_DATA = PSN_INFO_JSON.personalize_area[i];
	}else if(PSN_INFO_JSON.personalize_area[i].tab_type === '2'){
		OTHER_NEWS_DATA = PSN_INFO_JSON.personalize_area[i];
	}
}
// +d枠用
var PLUSD = {news: {count: 0}, social:{count: 0}, poliecon:{count: 0}, sports:{count: 0}, entme:{count: 0}, world:{count: 0}},
	newsRecommend, tmpRecommend = {social:{}, poliecon:{}, sports:{}, entme:{}, world:{}},
	otherPlusdNum;

var HT_DATA = {"hottopics":{"flash":[],"ex_thumbnail_list":[{"category":"nc_popular","name":"\u6700\u65b0\u30b0\u30eb\u30e1\u60c5\u5831","image":"top_ex_th_list_0105.jpg","txt":"\u304a\u3046\u3061\u30ab\u30d5\u30a7\u30bf\u30a4\u30e0\u306b\u266a\u30b3\u30f3\u30d3\u30cb\u30b0\u30eb\u30e1\u3084\u65b0\u4f5c\u30b9\u30a4\u30fc\u30c4\u3092\u30c1\u30a7\u30c3\u30af\uff01","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/special\/gourmet\/src\/gourmet_2112.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=gourmet_2112&utm_content=he_ba_001","analyzeid":"1724003","_cspid":"1724003"},{"category":"nc_popular","name":"\u308f\u3093\u306b\u3083\u3093\u5927\u96c6\u5408","image":"top_ex_th_list_0106.jpg","txt":"\u304b\u308f\u3044\u3044\u30ef\u30f3\u3061\u3083\u3093\u30cd\u30b3\u3061\u3083\u3093\u305f\u3061\u306e\u8a18\u4e8b\u3092\u6bce\u65e5\u304a\u5c4a\u3051\u266a","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/special\/animal\/src\/animal_2104.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mm_202107_animal&utm_content=se_th","analyzeid":"1724002","_cspid":"1724002"},{"category":"nc_popular","name":"\u304a\u3046\u3061\u3067\u30e9\u30b8\u30aa\u4f53\u64cd","image":"top_ex_th_list_0107.jpg","txt":"\u4eca\u65e5\u304b\u3089\u306f\u3058\u3081\u3088\u3046\uff01\u6bce\u65e53\u5206\u306e\u5065\u5eb7\u7fd2\u6163","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/special\/health\/src\/radio-taisou_202011.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mm_202012_radio&utm_content=se_th","analyzeid":"1724001","_cspid":"1724001"},{"category":"nc_popular","name":"\u4eca\u65e5\u306e\u30ec\u30b7\u30d4","image":"top_ex_th_list_0108.jpg","txt":"\u3010\u6bce\u65e5\u66f4\u65b0\u3011\u65ec\u306e\u6625\u91ce\u83dc\u3092\u4f7f\u3063\u305f\u6804\u990a\u30d0\u30e9\u30f3\u30b9\u6e80\u70b9\u306e\u732e\u7acb\u30ec\u30b7\u30d4\u266a","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/special\/life\/recipe\/src\/matome_01.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mm_202103_recipe&utm_content=se_th","analyzeid":"1723998","_cspid":"1723998"},{"category":"nc_popular","name":"\u4eca\u65e5\u306e\u30af\u30a4\u30ba","image":"top_ex_th_list_0109.jpg","txt":"\u3042\u306a\u305f\u306f\u89e3\u3051\u308b?!\u304b\u3093\u305f\u30935\u79d2\u3067\u30af\u30a4\u30ba\u306b\u6311\u6226\uff01","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/special\/play\/quiz\/src\/matome_01.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=mm_202101_quiz&utm_content=se_th","analyzeid":"1723997","_cspid":"1723997"}]}};
/**
 * ニュースタブ・スポーツタブ共通読み込み
 * ・G_todayMatchData　今日の試合
 * ・G_flashSportsData　速報枠(スポーツ)
*/
var G_todayMatchData = {"today_match":{"pickup":{"id":"mlb_2026042027190","home_team_name":"MLBColorado","away_team_name":"MLBLadodgers","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042027190&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042027190&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042027190&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false,"is_display_news_tab_live":false},"baseball":{"npb":[],"mlb":[{"id":"mlb_2026042018240","home_team_name":"MLBHouston","away_team_name":"MLBStlouis","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042018240&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042018240&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042018240&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false},{"id":"mlb_2026042016210","home_team_name":"MLBChcubs","away_team_name":"MLBNymets","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042016210&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042016210&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042016210&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false},{"id":"mlb_2026042027190","home_team_name":"MLBColorado","away_team_name":"MLBLadodgers","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042027190&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042027190&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042027190&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false},{"id":"mlb_2026042011040","home_team_name":"MLBAthletics","away_team_name":"MLBChwhitesox","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042011040&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042011040&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042011040&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false},{"id":"mlb_2026042003250","home_team_name":"MLBLaangels","away_team_name":"MLBSandiego","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042003250&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042003250&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042003250&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false},{"id":"mlb_2026042029140","home_team_name":"MLBArizona","away_team_name":"MLBToronto","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042029140&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042029140&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042029140&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false},{"id":"mlb_2026042002060","home_team_name":"MLBBoston","away_team_name":"MLBDetroit","more_link":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042002060&utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_today_match#tab-inning","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042002060&utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashbanner_dmenusports#tab-inning","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/schedule_live.html?game_id=2026042002060&utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashbanner_202508_dmenusports#tab-inning","is_live":false}]},"football":{"j1":[]}}};
var G_flashSportsData = {"flash_sports":[{"flash_sports_list_id":"1_1","title":"\u30c9\u30b8\u30e3\u30fc\u30b9(\u5927\u8c37\u30fb\u4f50\u3005\u6728)\u6226 \u307b\u304b","category":"MLB","category_en":"baseball_m","category_class":"genre-baseball_m","sports_icon_url":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_dmenu_bn_baseball_m.png","is_live":true,"origin_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/index.html","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_flash&utm_content=genre-baseball_m","sports_top_topics_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/index.html?utm_content=topics_flash-baseball_m","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashtext_202407_dmenusports","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/baseball_m\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashtext_202508_dmenusports","is_display_sports_top_topics":true,"is_display_tab":true,"is_display_news_tab":true,"is_display_news_tab_live":false,"is_special_site":true,"credit":"","start_datetime":"2026\/04\/20 00:00:00"},{"flash_sports_list_id":"2_1","title":"JM\u30a4\u30fc\u30b0\u30ebLA\u9078\u624b\u6a29 \u307b\u304b","category":"\u30b4\u30eb\u30d5","category_en":"golf","category_class":"genre-golf","sports_icon_url":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_dmenu_bn_golf.png","is_live":false,"origin_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/golf\/index.html","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/golf\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_flash&utm_content=genre-golf","sports_top_topics_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/golf\/index.html?utm_content=topics_flash-golf","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/golf\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashtext_202407_dmenusports","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/golf\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashtext_202508_dmenusports","is_display_sports_top_topics":true,"is_display_tab":true,"is_display_news_tab":false,"is_display_news_tab_live":false,"is_special_site":false,"credit":"","start_datetime":"2026\/04\/20 06:00:00"},{"flash_sports_list_id":"3_1","title":"ACLE \u6e96\u6c7a\u52dd \u795e\u6238vs\u30a2\u30eb\u30a2\u30cf\u30ea\u30b5\u30a6\u30b8","category":"J\u30ea\u30fc\u30b0","category_en":"soccer_jl","category_class":"genre-soccer_jl","sports_icon_url":"https:\/\/smt.docomo.ne.jp\/portal\/sports\/img\/ico_dmenu_bn_soccer_jl.png","is_live":false,"origin_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/soccer_jl\/index.html","url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/soccer_jl\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=top_sports_flash&utm_content=genre-soccer_jl","sports_top_topics_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/soccer_jl\/index.html?utm_content=topics_flash-soccer_jl","news_tab_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/soccer_jl\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=flashtext_202407_dmenusports","news_tab_live_url":"https:\/\/service.smt.docomo.ne.jp\/portal\/sports\/soccer_jl\/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=liveflashtext_202508_dmenusports","is_display_sports_top_topics":true,"is_display_tab":true,"is_display_news_tab":false,"is_display_news_tab_live":false,"is_special_site":false,"credit":"","start_datetime":"2026\/04\/20 06:00:00"}]};

//カテゴリニュースJSON[主要～地域]
var NEWS_JSON = {"news_list":[{"t_id":"nc_topics","t_time":"10\u664222\u5206","article_list":[{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F9999%2F92234b9fa689edd41c85e2e7072f9862","a_title":"NY\u539f\u6cb9\u3000\u518d\u3073\u4e00\u664290\u30c9\u30eb\u8d85\u3048\u308b","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:54:33","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP1uhQAYxySTkAA8dznJ6DJ5Pb2r8ubsm+x9QaESBjknsePXt3Hoff8AClHX3ur+7+tALqqDknp6f59KoCwqFsYGBjBxnOBwSMnn0470m0tG7f1\/wAJlhXAznP4j9O3t7VDm09LfmAphX3\/yT\/MYHUd+lNTunsmu+z\/X5AMaHnC+nJ5Iznkk9hgenHU56U4yv2v2\/r+vuuBXdAQMY3DOT26jAPGTgA+vUc8YqgKzoCDkHP8Ak4I7jIBxkdPeh6pruBSkXkg5GOMdOnbn0Ofx61klyy8u\/wAvz6efzAz515Ddhxz168D+f61qBRKpk\/e6\/wB8f\/FUAbMankgcKoz7cgZ\/P\/PBqZP7PVr+rgaEQAUAe3rgk+mfy\/yKIppJP+tQLoXkKDnHGfXHfvVAXUXAAGegwOOOPYA59f5Zyaxk03ddv8wJFUscD\/6\/1\/zx70KLdmuoDzGccA5+h5\/w\/wA5qnDay9df6\/D7gI2Uj7wx25\/r\/wDX61DTi\/MCtMn8Q49e+e\/4d\/b6VrGSfrbX\/MCo4zyASen4c1QFOVOpHUZJ6\/iDz65xwOcipkm1ZdbfmBlzghWIHr19zjIHfjPPGKa0SXZICjgeg\/L\/ABz\/ADNMDWTofr\/hWU916fqwNKPonBHTg9uf5entVx+FfP8ANgXohlh7EH1HfII9\/wDPoSUred\/OwF6MZYY7c455\/wA98kcVlFXa\/H0Atqu0YwP5j+Q\/\/XW4DsH068\/z\/wADQBHIm4HsepGcA47H0\/Kpkrrpfv8AMCoy4OD+H05FZPRuz20vsBRlGGIwOnGOM5\/kf5VuC3XUozchjtUZyTsVEA99saquTkliBySWbLEkg27u9reRlzfdPP8ACQfXHPPTGPXnPpUp3bVtna4jNyPf8j\/hVAa6qVyCMN+HQ8Dn0yD+VZSeqad7W+\/f\/ISakk07p7M0IcgLnGPx69Dn36YP0zWkXdXGaMB+YjA6de+fr0xjPv6d6HFPcDQgGWJ54+mOc9c889sehz7zDZ+v6IC2qk89s8+tOTaV13\/zAmwPSs3Ju17aev8AmBE4wemARjj8j+laRbau+\/8AkBQkADkD27Y68\/j168VM4pa63b\/zAz5fvcZbjHTJ44IOBk85HPA6Z9NAM+U\/Iegz2Oent+nX6HrUybSurfMDNl5BHX5T+XOfyHNOO3q+b5tK\/wAtAM8lcnA\/Q\/8AxdMDXAkPIy2cKAOpAyRnJ5x0zn6+2clGN1Z3a08uncwoyioRi2k1ol3\/AOHbLsCyYxggqOP16Y+vU1UPhXz\/ADZvdXackrd7\/wCRowrIp5U4KjcT06Z559AevGcdez9P13\/yFeP8y\/H\/AC\/PT8S\/Cx3BeucAcj14HP1J4xUQa26t\/p\/wBl+ME8AZJORjBzkexPp3xVSV187\/AJ9g06tL1JCpU4IwevNZuLVttdt\/x08wIHIJzkYwOc8fn+NaRTSs+\/8AkBnzMAzHIwMAemf\/ANeTUNSk3G+zb1\/rzAzZMrzjbu5APoec\/iec9Oa1Az527c9CSf19evH61M\/hfl\/w36gZs74UFTyflcH0Byv\/AKCOAex9Kcdl6L8gM\/Df3v0FMDbgkBVQTzkjA7dSM8D3x16YB6VFVcrS30ve3nt8v1OCL5ZJ2vZ3sXoZFjcJuwD82SQQxJ6EjJHtx\/iZhe60bWq8l\/X6nVZVYX+G\/wA9m0u1y79oLIY+hJ5OQSVGMAZ44\/HjpwOLSab1vfX5\/wBeYQpcjvzX8rW\/Vna\/D2O0vPGfhqzvbVLy3uNThie3lCNAzPuEZuI5I2WeBJSry27bROimFpERi1ceYKf1Sr7Gp7KqlFRno7c04xirXVr6632v2uuyhKCknUs4Jtyj1klG9lbVXatez8tjAiuNw35CFssAo2gK4ztA7AA4AJOBgZ4rqp3jThGclKcYQUpXWslFKT3ejd2u5nU5JTnKEOWm5ycIvXlV3aN2le217K\/ZEpnByS4PrkjP5nk\/zq7p9UyCvJMPuqcc9c9QOuPb19vrUyb2Sfqr73\/4AGdK+7vhAQCT69z64HH9OpojG2rerWz\/AOHAZOQULE\/dUY6DcFxjJwCAepwMjOPeqbSV9NrrXf0OSMn7Zvu1Hlu9P+C76aLfzMZ90gxgZAB68cnHHH+ycfT6VCvKV7aflodU5KCbldW8m3r5blCUKJChwTtBBODz1IABPbn8Ce\/F3tu0v+GXe1\/kY1G5wjKN95bX2SWrtqt9U7WZFnHHy8f7WP6Vgc933f3s4OD4naJGzq9rqBmFuJ4oYf7OliupHMRhsEujqEcEGozW9xb3cFldyW9xJbzxuEHz48uedKqlNYDGRXuw9+HI+dq70knJrzUGlqrt7fpNDw6dd1YPiHKqUoRUlKcp046P3ld+1htreVSKXXTU2NQ8f6PpdxBBqdnf2r3MFlcKq3Xh66eGK9h8+I3kdjr101hIVPltFfC3kjmjuIJAs1ndxwKjm1Sql7PL8XUV3HTnjrd31lhUrfh95u+AsNRTjPirJIcnxKpWnGS1bensbWetmm01ZptHIX\/7RXwxtIbIx+KPC0FzdiylaPXfGvhDQ47W2upbYvNcOdavJ4wlk91cQh7ZEnmt47TzIXuVkj644zHVOf2eR5nNRVlKnCVdOouZNSjGhSsrpXftI8q1Snsc1ThPJ6MYOpxrkE3KUuaNOvBVIRTWijUnFSlrZxajLR6Juy1PBH7bv7N3hjxFcalreq3GsW\/hu5ub6x1fwv4g0O9hubmyaxFsLmxhW\/t49GRJtQvNU1GXVrL7GbO2jQzJOjTxWwXEmJlRpLLvYRq04SqU6lS80\/aKTjySp0pOUoxSgktHJtXXNbzcbhuE8Lg6ksLxLSxeL+sey9nUwsqNNUVBqVaFWNWorKb5feS0TaXfyvSP24vg34g8e6H8N\/All4w+Jev+ILzT9P01\/COl20OlCSeK7k1C5u9X12603Zpug2trFf6vqNpYajbw2k7NC9y1vdLb\/QwyHOFh6mJxOGhgaVKLv9bqxVVcrior2NKMmnUV1TvNybjNzjFct\/lK+Y5RCrRw2HxksdVbfN9ToVPYN3s069fkvKEnapyQ5EpQcZSvK32K8235R16E9vbGPXvx9PUcapxjdyunvHW6uvT5bmv9a7\/OxCZAxAZuB1yTz3PsM44\/rxQKXNyvl+LoIxQjIJKLk4HIYnOBn\/gPPGOBkjFJtLdnM6tRNp2TW+iK7uSOpAAwo57Djjp2z9e\/SsruTV+6X4k1HHn5oPV6t67rbdf8Ayrh2ySjks20HBx3xgAYzgEkntnk5rZRsrpad\/8AMqFV7Taas91fXp\/kZs3lOGbdnHQhzztyABj2zxjPPPes59Pn+hPtZLRWtr07\/PT0W3QpGRASCwyODWZmfzw6x8IPiZe2SiHwfr3mRGWPVmmuraWH7Wl9PHEsED+SYY0tZbZflnvlllZ7jzoo3MUX38M3ydP\/AH3DJPllT5Y1FdS\/lXskt+ra1M8Rw7xHKMnDLMc3Cp7Oq5OF4yj8UXzVbu2zaujj1\/Z\/+LaF9vgXVt6EjJW1ZFOCM7luCrsrYyE3bTnfgLg+lHP8ngrfX6UHFKTVpX062im\/PZrq2rnBPhPibmk3k+KvdxfM6Dulp\/z9ejWqv0du6KcvwH+LFuzpN4M1KJgx82R7nS1I6lQS1+G5wDzjnnkAYtZ\/lUkrZjTkpK9oqvJK9nqlSsr33628tMJ8I8RJK+S4lqze9BWt0\/i+m36Gumk\/HCw8KHwcs97YeEbzzw2lz6t4esoWhmkluLiNppbyO7NrPJe3D3Fsk5jl8+YSwlZQGPbZBWqRxsq1GriIyhJVZU61S0oLlgknRajy\/Zad9bW6i\/sXiKjRVJ4DEUqb5oyvUoRSg7tx0rXlG93zNXfokfrZ+wX4c8GeFPhLpnifWtU8EnxlPd+JrGz8kaXFr+g6HNrEkdxbalefaLi6a91h9Ms7iZYpo7P+xrTQ4YYmkS6urz5fOKU6uYYmvhnjKlHEwoKcG6jwylSi7unSaSi5uXM3yJtpt2vr7OAxkIZfhcFXhhKNTAzxKUkqP1ibxFSM5OvWu5NwUIxglKS5Gle6sfdT+MvCQIB8TaIGwDt\/tC33Z7kjzOO3HGOfYV46wOMk\/wDd6zStvCWz7aP8zX6\/hU7OtST2s6kd72t8ur1Vys3jbwgVDJ4m0VgxK7hfwEbgSpAYSEZDD37AgEitP7PxX\/QLW\/8AAJh\/aGFW9aC8+ZWXbXbXt+ug1vHfg5VIbxPo4AAHF\/CcE8AcMeSRwOpwceon+zsXd3w1VrovZy\/y6EvGYJ6urRs9pOpHXfz8tf10KUnxB8EquW8V6GCwXaTfwDJJA4w3UdDxgHg4OKweX47musHXUbppezd\/u\/4Jh9Zw\/SvTfza\/NW\/EbYfEb4bQXqf2x4i0uezKurx216jzK7KxgdVWaPeokALI7bHQuuVYh1mtl+azpuOHw9WnUdrSqUm47q612bV0mtU7WOzA4zKqdeMswqKeHWrjCTve2my97WzavZq6exma78Tfhgfsi6XrlhDcOrNqJkuI4ozO8smBaJ9omVYEjMSouNxxuO3mMLD5Pm37xVoSlFSvS5lZqNtpPdyvp2SZrmOY5HN0fqdSFOXLKVZOMop3d48itZR5d9tdEmrGSvxK+F+0eZ4htzJgbyupQhS+PmKg2DELnOAWYgcZPWtv7IzH\/oFqfcv8zJY7JrK7rXtrbmtfrbTY+KE8D2FrbtcDVdMVnYxpPY28dzb3DqUSKOC3W0nln2oyyTPE0qxSqVwqmbzfr3Xotwl7CnGDdvepwi3rsnKys\/uVvVHyTq4pq7xVa1ru2KxLVru7d69n5\/I2U+HmoWrxQw30c7yGSSaF9JtkitrSMErClyypFFd+WjTm3muP3oljX5GUCtHXoKLk8NSSulHlhTd76NLlvptq7rfXVh7XFOyjiq3No0nWq2a9VU53fR6zs7bdC9a\/D2ymaeJfEqpLFEzTJ\/wjivDDcFVmKPI0SRxypFuMG+6kRxIJZE8tPLoVemtVhYrs4qEXbzSs7+TswU8TLT6zWbW\/7+u1v\/1\/79+3kI\/gTSZk+zDXLZdQZEvIfKsdGnjV2ldBYvcoDcy3k\/lO5hjhcmZGjt5jMolTVYqaTkqKUVu20n68r36aq\/4GUvat8rxEnJpcvNLm\/F+jVvLR6llPBFvbefbw3WqIsKHfePZ2whQ8lU8iziupFLR4kkIexFum83Ygi2Er63zK7ilHe7kov53076dfLUUaLXvSk5N6Nq1m\/l6E0Pg6yv7R7\/T9W1K5sYfP824sonllFvAGjl8mKGERFGO8RSJJKkpjun8wPGFqpYqpG3NSjHm1heafMnsrraXe\/Rp7D9no2pq0buTcZJqN90nu0rtpGRbeFtLmtzcR67r1pp0RyLq\/tLmyZJVSV8rDs+3xrI2FZpI2t543YQvJGVKQ8ZUSv7FdNpxk\/uTu\/l67ELkd2p+6lrJwl7t9FeO+9kW7XwL9oig3XevmO4IYNb2S5mle1luBck3aJcQW+Y3dGuGtzbnEU0e4xxhfX72SjFvrBzSkn1bTenmt\/MpQbcbJuEn8Vrad7P8AUzbj4axQrFMNb1JnFpF5tt9i8+9t5pfNHlGfdPPc4uWZ1lgiRCil4Rv3SNlHGyTV3d3Vl0a7OTdlf0\/zCWG5YqUas07NuKpuWvS3LpfTZ6+lzEuPh9HdGMLrN8kC7isUiraX8s1ukwlilstQsXjh\/ewv5k0t7DEHVvOkjjmbfs8Y3H+G462c4yjNLXbR\/K\/fuEYScVeclLu48rtrvF6rv0vutymvw0he6tbSO41aW2nhluHvIZg0KbNh8q4FqHjjWWOZthiwUmiacRtHtas5YqcY83Ok3ZxUrrm8t09nqlr5GcqM1Ne9VcJLmcoq9m+mj0X3aDk+GXh7Yu7UbwttXcSEkJbAyTIjhX5z86gK33l4Ip\/WJ\/8APtf+Bf5l\/V6f\/QRiP\/Abf+2nzrbnx\/aPBq+na\/4yng1S92SXp+Lmg3M9zcl\/s1ql4\/2lNVufNlDQNbmSa7t4IFRBMqS+X6blRdqdT6v7rsuWM216O1m9u\/S90zyVHFwipKWIcZLmtKrFxfk5R2V+mj\/C3TarqfxL06SK\/wBX1XxHHDGltHENE+Iuj2UkN3KjQC+tZtSvoFuYZHu5LNdPmTzphakxuAXEcuGHbfL9Xk3p+8pTbtbVtpWWi02\/Ut1sVa83V5dFeFVObtsuW+1r300+8rHWNVmdrmTVfGl9Gv8ApTK3xH0dZ4pJUSOGGSS2tbYW9rcRCXPn\/aYWLK8UJe5aMpUILVUorzjFpP00vbXS+uqIdWpNazrztuuem2umt22m7W0u9NdLXbbL4k1W\/e5XVfEN3p1tazynTY\/iRYTfZ0tJLW2LRaL\/AGZb6hKhM+9b+3tb93eSWN5ot0LSUnTTs4JytdPkTSXm+ivv8rmalKSbjKrGOzi6sbNrVu1+Z3TS07ElvrHiR5bKZNS8RWCJsnht08e2WmW1tLCjm3kvbfUL2b7RH5byZdbSApKoeO7szmGOZU4tuT9lr09nJtfdp93fzY41JxbTqyUbaJSV0\/O\/399m7mlLd6w+qz\/2v4l1mLUtkcFle2niu7n1V3FubRr0aamlWeojRbOVZVn33UatbmY\/2grEzTHsotStTi+9opq723Wl3tcv2spSUXKcfdko2nFX\/vNyu0o6XcbNJ9blFbzX7G4N2vj7WHiubhvM0yz+KkFrcsyI\/wBnlFlp9ze61ZwuHlkEDW95HcKxj3gMY6inSpNOP1ZOd78\/I7PyslZtbPpsU5ThF3xMmna8Y1by0d1e+2v9as34YPE17f3cs3\/CTfZXsZkiu734k6Ak+rQxEW0d211qb6btKpJcu6XemXELJaukEkkomMkv2FNtckNHa0ac7q297rl36rfoEXUaTjzpdJyqxfN6pO979+xyGq6tZabcS2+peLdV0m4nuMGS3+MFjBBYW\/2V2Z4IpRBEx\/cyLcwCwuFe7drcmQJGx29jzR5o04RvG6U6UryS9Fotba6BKc4tKdWSbvblqwV1fVa36parppsZt74guZrdW0rx\/rGZmjE89146WQq10yyrbXXkWUUhiK8yJf2bwXCzCN72GUxl3ChHVzw8G5L3rU207K0bXXa3o9rIzc6mk4VZJ9HKp7yXqna99NNdDm9Q+Jn2ayu44NSsdUe1jjSbTh8Sl8yN5Lkxtc3F35UIubLbFsM1tfvO0Uc88wvJFlVE8PC91BO7+F07JLokrLS1lZvtayH9YdtanM7a\/vHe6Vm9dE763S33vsXLLx9ItnaKvjK\/RVtbdVSP9ob7KiKIkAVLY+EgbdFAwsBAMIAjIBWnaHWNC\/X\/AGH\/AO+SfbN7OtbpfGa\/O2Gtf0PDb3Stb0W21bT9Ah1TXhK82lW9kZ7b+xluXEss1rLdQ+LUh+ywLIlzcjThDMsC3alL6WURV3KUHyt8kZLeba5\/8Wqd2ul3bp68jjOMG05yWsVFJtfN3sl307nNW2h26aVbM2j+FdFGm7VudPuvE9joy6dcTmEWNxaxrc69a20csiw\/ZDdC3ARVvprZXnhik1ut\/aNqztPl3v0tGy69PLqY2lZq0b9Ycyv62tbr3vqdRdapcWj6fpunSaTPqVnZI\/2dfG\/hk6updYvtq280N7K5023EqrLe6jbaxBcW7+ZFAxjit0XuaucmrbPXX1V9emg\/eUrKLdlFySaVr9PztZ+hqDxlp7LFct4T+JPimfTjEb25t\/GdjcwW19ERJBFpc2ov4af7NCsUawyLpjfNGUjkQRfakydObtadFXtyuSS0utbWdtU\/PS5q5wSbjSxE2tlB317XS38rafPTGtvF0Vymo\/bfhh4y8KaiI7WTTjea3qep2Otxz3czXzfavPOk\/wBqve2RSO5uWAuCPOMqxKk6U6Lho6tGT0v7K19bPW1tFs\/OxnKSk7eyqwm9bz2a7Lu\/Pa19EdBc+JrWdLK4v9B8SNNHDCI9G1G30uaS2ghubgRJqF9ql1CC1rHJcxTfZNKKtv8AKub5RFEipRcHaPJJN+81KzXqrau1\/O+nUJSclazaittXqu\/Z6djO0vVrC5tr6MRy+FNZvLNrbUbyHSvDmqXMYjnMFs91DYaylxbWzWqxC3ldLTZA+5\/Jmmfz9ZwlFxb9+CSly8zje7s1dO66dVddkyadm9Yyje6bUOZbNq7ur66+uolz4l0fRLSCzfxjpvjm\/n0uzkTT9W8L6Vp82oSRu3nxNP4g8R6XqGp6asVxbxbVENvL5q+b9tYstU4wb5\/ZOmpaq1RyXXTXSyVm7Jdt2knL2cUkqilK8eZSpN25Wm1duybs4vV769bR6TBbTRTXl54T1Twfa2KLqdnKsPhSy8OXP9oqLaC3kX+ymurJm+0wzedCk2mtDaztFeQwLCHw5qkVCLqOdtHdK612XLa2j0vfXuEYJ7cq17a99P8AhyG80XzIJNJF1bx6xPIP7UsIpdLEM890Gks4Le6t9VuraC7SOPfstZbjVmWRY47GWSG5MKlUqLVpun2+1d9Xpffo7l+z83f1dvuvp07nJarc\/wBmXK6ZN4CtdVtrFbhtM1Ky8V2OqMl7pTCWO1mSLX5LXT1SK5S1gku9JOoW0U0sgUqJIRrTXNFy9tbf3JqK5fJXTbte1+3e5lJzjvTc0v78lZLtaz\/q\/Yunx7coSifD\/UoUQlUiX4i+GwsSrwsag6dnagAUZ5wOay5ZPeUf\/AF\/mVzpafVqummk1b5e5seioq3uu6LBeKLuF59BjeG5AnidJbuz81Hjl3oySYHmKQQ+BuBxXK\/4U\/n+htd+1hG75VOKS6Jc+1trHiGtWtrL+1faaXLbQS6Y11YW7adJDG9i1u8MLPAbRlNuYXaSQvEY9jF3JUlmz6FL+DH\/AAv8G7E4jStZaLnpqy0VuWOnofWa2ttN47ttOmt4JdPjj1SZLGWKOSzSaLT7WWKZLZ1MCyxSqskcgQOkih1IYA1wUW2pttt+0nq9XubRSc6aaTWujSttDp8397JPClzczXHiiCW4nlhh1S6lihklkeKKT+zpX8yONmKI+9mbeoDbmZs5JNbv+FR\/r+f\/ACRS932vLp78ttOi7HZ6KTfWuki9JvBHeoYxdE3AjMM17FCUE28KYomaKMrgpGzIuFJFc8m1J2dtvyR3RSlhacpJSlzLVpN71Or1Ot1HTNNs59bks9PsrR7i5mS4e2tIIHnQ+dGVmaKNDKpjAjKuWGwBMbQBXnqc+aj78tajv7z1\/eLfXU41GPNinyq\/NJ3st7S1PnG+jjsdDgjskSzjmaykmS1VbdJZLi\/uBO8iwhFd5xBCJmYFpRDEHLeWmPWu3u7nPNL2bdlfmSvbW3a547YW1td32mXV1bwXNzFa3TRXFxFHNPGz3niRXaOaRWkQusMSsVYFlijByEUDeOy9F+RgSeMkSa88OPMiyvNHcPM8iiRpXhmdYXlZgTI0SqoiZyTGFUIQAMc1Lp\/iX6AeG+NdW1Sy8b+JoLLUtQtIF17QgsNreXFvEok0i7MgWOKREAcqpcADcVBbOBXqUknGN0vif5M5qzalGza96OzfeP8Amz2bQtT1IPpdqNQvRayJpIktvtc\/2eQNdQIweHzPLbclzcI25TlZ5lORK4bzMT\/Gn6v82dsOvy\/U6qS3t1kkVYIVVXcKoiQAAMQAAFwABwAOAOBRHZei\/I0kld6Ld9F3P\/\/Z","a_rank":"14","a_hot_flg":"0","a_views":"146","a_active_users":"142"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F999%2F680585530ce76183a2785dd6a72b9161","a_title":"\u5185\u95a3\u652f\u6301\u7387\u306f\u5e74\u4ee3\u3067\u7570\u306a\u308b\u50be\u5411 \u8aad\u58f2","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:20:03","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWQMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP6Zk\/bL\/aP1H9sXx\/8AC9\/gn8b9C0T4c\/Gb4f8Awq0bSX8F6bcfDb4p\/DX4kQ6zqUPx\/wBE8cyaTHqsPh7wrpfhTxBH4ts4Le\/g0nXbPTdIi8S2qazqdrpcKd5Sja3Lb1e+vpfT+tKceWMJc0HzxUrRlzON+j0XfTvqfhb8Rv2r\/id4z\/a4+Mvh6b9v\/wAV\/CL4RfDX9prxNH8SvGumfF3xfruk\/DHw5L8TP2o\/2e7WW48D2\/x1tV0Lwlp3ia3+EviGHTNG8PaX4SspPG3gi314yLaeFrHxFzqUn8L5bb9brX0s18\/mdsKUFTppU3OU48yjzWvfpezbsvza9fFP2iP21v2j9N+Lv7V8Fp8avj9p3hHQv2kLvQYNK0P9uH4w+BPFlutrqv7WS3viL4feHrb4V3eieB\/h54esNM8SLF8HSLDWfEc3wW+FlxoGg\/E20OjyePF7Ty\/H\/gGsadONKk3Spvmi5W5VdO6vrfXbe3q0tT9K\/wBoT9rH9qyL4w\/G3xTqf7QPxx+A\/jH4W+Gf2kdL+C37PeleBdMtvAvxI+OGh+MPAOkfsW\/B7wN4e8TfDWTW\/wBprWPjr4R0P4ifEj4sP4e1TV7nwp4Y+IPhW3trj4Ytpdneroc8aMPZx0jbmbk4z1UV8UmraJLzte6vqz82vjf+2L+2j4b\/AGnv2n\/CPi7x3+114P8AD8X7WnxH1jw\/p\/gf4weLvD\/h\/wAHWPw6+H0WuxWmiT+KfDPjSKPwj4Y8P+KPCPjO38N6ZeaX8MLmLUW1Tx74C8d+H28Gw+E4c5L4ndPZdvz\/AF8vPaMaLVK1Ok17Pdx+L3nZ6NLXe3XXXqfWXxn\/AOChPxmsPE\/js6Z+3P8ACLwVBpnw6\/4KF2qab8Q\/iVYeH\/jJ4E1rwj4U+BmhaJaS+ANC8TeHfBmt+PZde0LxR4l\/Zeiu9J8MxeJLvXfFKW2kaBbXU9lb1eTScXytr13t5oxdBvalKzd009LPVW00VrdXbvqz1T9qf9pP9s\/wL\/wUR0qy8O\/tP+KPgp8I\/inofw+bwJ4F+O3xu\/Zw+EHw0s\/Aes2Xii9n+KlvrOufDbx\/NqOlal8QtNTwfH8PPDXg\/wAefF618P6SL7x38TvhjZ+P\/h5plwpSl7SKlKNnBL3nyJbNd7vf1b9C4wpOhLmpylUi2pOK5uXV8sLNq119rytZ6s+Kf2zv2p\/2r1\/ao\/aAtvhf8cPjRqGgaV8QPjTa+EdE8FftafEPwR4NtNc+Gs\/7SkXizw34s8J6Z8afBv8Awi3w18B+GfgRqXin+1PCmk+EJo5tAujrHiK8h1\/T9J1Cn1\/pFxp0o02\/Zpv2a0mr9noraO7XV223uzo\/iN+0F+1p4S+M37YFzonx\/wDjPa\/DHw3H+2W1hrTftHfFzxR4dtPBXh34iap4d+Hmq6LB4q8Q3Hgbw5beFbXVPCvhnT9d+FmpXt1Z6trGh6X4wvtI8Yapp2m3UqV21a1vO+2n9asjkpyjTjyQje2sUk9IN23d9tVZK+vSz9o\/aEvv2ofCmpfEzxjrvxR\/a9+GvgXUfFWr6b4R8R3vx7\/bB+HXhe7bU\/C\/w88ReDtR+HXi3Vv2rR4F8YX3izxJr3jHRbXwD4O+Dtpo+k6PpTjQzbxaTILdt2t5u2\/\/AAPX+tphGlO0YKnzJPm5vfeildOOltlre\/6eRftL\/tQ\/tKeDf2u\/jd8O\/D37Rv7U2l+G\/Dfx+17R\/CXhrVfihp+ieCdR0nwnB\/wrjStF0zxrrsvw5udP0eTRfD1zbaxr178TniHitdQ8Q+KtRu\/H+qT+PtJXNLmlFyvGLdtNrO2\/3\/1vrCEJU+Zwgm4XXLdNvS\/Vrr2fysfoV\/w1h41\/6Pc+EH\/f74n\/AP0b1Ucdqf8ALL\/yb\/5E\/phwM5xz0z3x6V0GJ+I\/w+8deBPiv+0d4uuNR\/4KQ3\/gbwFoXx\/+Jnwr8Q\/sH\/E\/R\/2JtO1Dxr468JfFC98KaZpVvDc\/D2H4vW\/w88V39il14H0LVRP8TfGWmajoPim18bLFq9ilzikne7stN7K\/4\/5nS+dQjFUo3cVKFaF+XW91F3s7dbNb6Xscn+zB8ftZ+PPxT+LPxF03Tf2PPFvwH+LHxZ8W+J\/hB8NfHvxB8BL+11c+G9D+Eml+BT8O9O+FunaInhrwlqPjL4z+HPiJ8RpJPiP4+1HxjZ6P8V\/EWi+MPC\/hLVbW8ghUWl0T\/T8BVIaQX7xyjBJtU26ejtfnuradLPtfQ+oNP\/aR\/bS+Dd3pjftUfs7aB4wsfiZot\/qnwz1n9l7R\/F3jC3+EnxIk0W\/1TTvgB8bIbmfxDq94t+1rbaHoX7SXhvTNG+HGs69Neaf4p8IfDm3GgX\/iK+aaXvJNPaz01+XbTzsSqdOWlObTV2\/aS0f+G9tdNfK3XQ\/H74SftM\/Hf44eM\/C+v3n7QXw++NPif9oL4p+D\/hb4Y+Amu\/Bj4NaJoEmnfET9lltZ\/aJ+LPw6ht\/hvN8dNH8B\/s4eOTp3wt1L4j+OPEHjvQ9Zg+E3jP4f+MbbXPEE+jx6PneTfvSv2SSVvzb6fj303lTjZJwcUkve57qXRffuvv6o+E\/2Kf2jf2zvjP8AGr9jr4Ya18ftO8WaR8X\/ABZ8RbX4geBpbvQtLm8a2vibw140+J\/xKs\/HaQ+HPFEmlTeDZ\/DP\/CvdJv73QPETWGpa+mkavb6HPfwtaxGcpOzd0lppbba+r6PpbzvoXOFJ05tQlzJJKXNs5aXa\/TqfXH7Kvx4\/aW+IX7SvwN1Pxd+0H8RfFXwa+K\/xI+DulfC\/4W67qXjiHwpHa3cXjHX\/ABZptn8XNR+GaXniu50jw94R07VRZeJ\/hH8PtB+J1pqd34V0+\/8AhHLoi694oG5OUVJpq7tZbJLrpfReerW5E1GNOSUVGVrSlG6crb31a1eu5\/WhN4I8HXWoWWsXfhTw7c6vp39qNp+p3GjadNqOntrsJg1w2N7Jbtc2jaxCzQ6q1vLGdQiJjuzMh211nEV9Y+HngLxFpM+g+IPBfhXXdCuTcm50XWPD+lanpNwbzVbbXbwz6de2s9nMbrXLO01m5MkLGfVrW31GUveQxTIAW\/EHgvwf4st9Ms\/FPhXw74ktNE1C01fRrXXtF07WLfSdW09JI7DVNNh1C2uI7HUrJJZUtL+1WK6tklkWGVA7AgGHqPwk+FesT6ldav8ADbwHqlzrXlf2xcaj4R0C9m1Xyb251KH+0pbmwle+8nUry71CL7U0vl311c3aYuJ5ZGAN3\/hDPCP\/AELGgf8AgosP\/jFAHS0AcdqXw78Aazrlt4n1fwR4R1TxLZS2s9n4h1Dw3o17rlnNYuslnNa6tc2UmoW8to6I9s8NwjQMqtEUYA0Du7Wu7duhhr8Ffg4ni5fiAnwo+GyePEunvk8br4H8Mr4vS+lRo5bxfEo0wa0t3KjuklyL0TOsjqzkO2QLu1ru3boemYGMY4HrzQI\/K79o3\/goB+z58F\/i38WPh943+AHjnxt4j8LeFvAXhnxZ4n0fwr8P9S0\/xV4Q8cC51jWPDEmpax4hs7250Lwl4d1W48R6zoXiGOz068Go3UFrbM1\/Bc6hn7Ty\/H\/gG1Ok6i3S0k+\/wpvut3ppe17lFv2kf2NB8QfhP8GfBP7NPhrxQ3w0+Idz4e8IDQ\/B\/wAFNN0j4D+MLX4oeGvhp\/afhvR9Q1uxvvBd5N4w1q7m0u70LTtH1TxHD4c1S68HxeJLprGG5Of+7+P\/AACOWXK3GVrJNrXVPpo+n59NdfuTw1+yv+zH4Q1Pw7rvhL9nb4G+GNb8J30eq+FdY8PfCfwJo2q+G9SS1ubNNQ0LUtP0G3vNJvVs728tRdWE1vOLa8uoN\/lXEqNas0vw8iE57N3XTf8Azt\/W57pd3Mdna3N3KGMVrbzXMgRS7lII2lcIigs7lVIVVBZmwACSKYH53\/Bn\/gpF8OfjJ8Rbz4bWPwy+IXh\/VdO0TxTrF5f3PiP4MeKLWR\/BdzqMHiTT\/Duk+Afin4r8W\/EG8sfs2nwG3+GnhvxneQavqUmh6tZ6VqemXsKSpXbVrW8\/M1dKSjGbTUZWs2urV0vmrWZ1Wi\/t3+G9X+GXib4jL8F\/jd5vhP4w+EPgdqfhSHwpDBr9z458Zaz4c8P2UWm2niC98O3j2Gn6x4q0bStXl1Sx0i8sdUuTYvYGWOYxy52bVtnbf\/gE8mqXNFe7zXbsvRP56d9bHtPw8\/aR8IfEjxZY+D9J8N+OtIv9TtvjNcWF14k0S00mxuj8BfHHgn4b\/EWGLOqz32\/T\/Gvji00KykayW31CbRtduYJvsMGnXWp1GXM7WsKUXG9+nKv\/AAJN\/hb\/ACJv+F6at\/0QX44\/+Cr4f\/8Azxaok9\/oAKAGNJGjIjOqtKxWNSQC7Kpcqo\/iIVWYgchVY9ASABguIGfyxKhfcU2bhu3BQ5XHXcEZXI6hCG+6QaAP5l\/21v2tf+CSyftJfHfQf2h9e+PT\/GvS77w34C1rU\/DPgqG5sPAdx4Bi8ryPBMw0qTTtSTVluZhrF14qtPE6s0rnRBo7RxyD7nKvDLjTPsswub5Vk\/1jAYxTeHrPGYKhzqEnCbUa+Ip6KStpd+VtT8+znxa4G4bzLE5Lm2dwweY4N0vrNH6njq\/I6+GoYmKcsPha2vs68FdqKdnrqkeUXn\/BR7\/gkZc\/ErQPi1B8X\/2vbLxl4c8YTeONPnt\/CEM2mpr+peMPin4s1+eHStR0S9s9Ng16H4z\/ABG8N3MGiJpa6ZpXiCTVfDx0XxpBB4sj9CHgz4iSbX9hRVtdczyr\/wCbTzP+I6+Gbi4viWFmrK2W5wrf+Y4+8l\/4OJP+Cb4AU+Ivi\/wAM\/8ACqtUJOBjoL7v+VX\/AMQe8Q0rLIYya0a\/tPKr6df99Mv+I4eGX\/RSw\/8ADbnP\/wA7hsv\/AAcQf8E254pIZNf+Lkkc0bxuknwn1R45EkUqyOjXpV0ZSVZWBVlJBBBNL\/iD\/iJ\/0T6\/8OeVf\/Ngf8Rw8Mv+ilh\/4bc5\/wDncfGHwE\/bX\/4Ja3\/xb8DeGPhP8Tv2sdX+JnxBvZfhL4Ptrb4bfDbwfrWreJPitJF4J0iV\/Heh+B\/BviJPEUN1rCW2h+JvEHjEnR767bWbu+W7hGowedmfhhxxkmX4vNcxyV0cDgqftcTVWOwFZwpucY83JRxNST96SV2oxu7cybSfq5T4v8BZ7mOCybLM\/jisfjqqoYTD\/Ucype0moyny8+IwdKmlyRldKV3ZWTSdv10l\/Zu+H50Hxx4KsfgR+0Novw18ZXMmuW\/wy8P3nwA0fwh4Q8bTeB7bwBcePfDS2XjJNfuPEd3pFsNUvbXxbrvinwreeMZrjxtc+GpfFdxLq7fBT1int1s7JrR6PVq\/km\/K5+kp66Simla+trK2ifLrd6p2i10seZ\/Dj4e\/s\/aF4S8C\/wDCEfC79pqy0zTPEfinxwL\/AErX\/ht4bg8WW\/xH8S6V428ceGtR8MaL480Hwp4a8C+MvFPh\/wANa3r3gr4f+FvAmhXdxoFpatp8WnX2v2GsdFLA4uUY1IUZSjOKlF3WqaTTXqjnqYukm4TqwTjJqS81db7t7rft3Ptz\/ho+y\/6I58Yv\/MZf\/PRrX6jjf+geX3oz+s4f\/n7D7z6grlNwoA\/m+\/4KU\/An9rL4i\/tieC\/GHwd8J\/tWeI\/Bfh6Tw7Bd+JPB3iH4e2Gj\/DJLTwjq+t3Ovfs83mr\/AA+8ReI\/h74o13xfa+DNF8feL9B1Y+JPFWlTeKfA2r2w8DTIIcJxkpcyvJNWcdrW69d+v\/Asb0pwUWpW9GrxlfpK2unl955Zq\/7GX\/BQLVv20Phb8V9EsvilrHw+079qL4mePvEWueJ\/2gPiJ8Kb3xv4O17wboei2CfE7wx8Ltb0Dw14Qn8HfDPStK+G\/gbxR4B0PU9R+IOu6SNF+KkF94K02z0C+TjUThLlbtvqr7Lqvu7W+43c6Xs3G8U1Tt8PXmbun5Xtrfvbt\/Ot\/wAFVxj\/AIKLftgA9f8AhdPibP1H2cV\/fXgo3\/xDnh+117mY6dv+FrM1b5JJeiS6H+b\/AI6\/8nP4ne\/7zKtf+6Dlf5mH\/wAE7PH37P3ww\/ag8A+N\/wBoaTUIfDuj614dTw9ef8IfonjbwnpWt6h4u8Pafq2tePtI1rxL4e8vw3pnge48WzQapp0evahoPiFtE8RQ+HNc\/sc6Vee54jYXP8fwzi8JkMqftq0azxUHisVhcTVw9HCYmvClgp4fD4hOvPFUsOpqq6MJ4ZV6HtYKs5R8Hw0zDhzK+KMJjeJFV+r0ZUPq844bD4nDUKtTFYehWxOPhXr0LYajhKtdxlSVapDEvD1o0p+ys\/vKf9qL9l34feAPgzD4Yuvhx4206HxP8INE8N6ZqPhBNG8YfCjw3pHhzxnY\/tJ+LfHNvZeFPGJgf4pfEOTwRr97oGn3vjSfxV4HfxBoOi6paOU1C2\/PFwtxXjcXm0cTTzHLMQ8JmWKrV41qtXB5pialbDvIsDhXUxmH5vqEHiaftKsaM8Ji6dKtUpVKns7fo0uLeFMtwGTrC1ctzGn7bLMLhcPLCYbDZplOFw1HEwz3G49RwmNpQeZ4mOBqOmniFjMDOtSoVMOvaVF+cn7Vuo\/s5eIR8OPE\/wABtQ1SC51DQLfTPE3gq88\/yPBmmaF4Q8A22h2kwPgXwlYJ4in8ST+P7TxBNpeteOLXxA2k2HjWbWrG88VXGjWf6LwZDibDf2phM\/w3LCjiXUw+OVTneMq1p1PbO8sRiJqlyQozoqMcOoc1SnVhWlCnVX5nxpV4YxTy7F8PVHCU6EaWJy9RpRjgaVKhh40Iz5MFh5+2lVWKhJ1MTjudUlUU6DnKkQ\/8E\/8A\/k\/H9if\/ALO2\/Zy\/9W\/4Prh8XG34c8U3bf8AsEd3\/wBRFE9Hwc\/5Odwd\/wBjOp\/6g4s\/1BV\/1Y\/3Afxx1r\/Pxa766v8ANn+ki2Xoj83\/AIS\/8kz8Df8AYtaX\/wCk619lhG1hcPZv+DT6\/wB1Hi1\/41X\/ABy\/M9Drou+7+9mR9wV8MfQBQAUANBQkgbSwAJAxkDt\/9b6e1AH8x\/7V\/wC0F\/wQf8NftHfGPQP2i\/gReeIfjhpPjbUrP4ma5F8PvGupJqfiqIRDULkX2n+JbGzuix2Bp4LWGORgWC5JJ\/WuG+HfFzFZJgcTwvWzilkdWFT6nHC51Sy+g7VJOpKFB43CWvUcm3zSTk2+XXmf4txTxJ4M4DP8dhOLaGRTz6msO8bLG8OV8wrL2mEw9ajGWJWTTU7UatOK96VlFJSskfPf\/DTv\/Btr\/wBG4ah\/4bD4g\/8AzYV7j4W8e2mniuIGndNPimi000001\/bWt02n5NrqeB\/rf9HW6f1bhe6d0\/8AU2vdNNNNP+xLpppO66pMX\/hp3\/g22\/6Nw1H\/AMNh8Qf\/AJsKX+qvj1r\/ALTn+suZ\/wDGUUdZfzP\/AIWtZeb1F\/rd9HVbYXhZaW\/5I2vtrp\/yI9tX977sD+07\/wAG23Gf2cNQ6cf8Ww+IPT\/wsKFwt49K9sVn6724oo\/jbOinxf8AR20vhuGNE0r8HYjROTk0v+ETROUpSdtHJt7tmz4c\/a\/\/AODdTwh4g0LxZ4V+BXiXw34n8MazpfiLw54h0L4f\/ErStb0LXtEvoNT0fWdI1Oy8ZxXmnanpmo21ve2N7aTRXFrdQRTQyK6A1z4zgrxvzHDVcHj5Z3i8JXjy1sPX4lwlWjVimpctSnWzarCUbxTa5U9N7aHRg+PPAHLsXh8dl74ewWMws\/aUMVheFMbh69KTjKDdOrQyilOLcZNXu15Xs1+kf7O\/\/BRr9hH9q34iw\/CP4BSftYePfiBcaLqviCLQF+Ivxe8MFtH0VYDqd6NT8Y\/G7w\/oy\/ZhdQf6O2oC5mMmIIJSjhfgeIOA+KeF8HSx2eZX9Rw1ausNTn9bwFe9aUak4wUMLiq9RJxpzak4citZyTaT\/SuGvEPg\/i\/GVsBw9nMcwxeHw0sXWpfU8ww8oUFWVFzcsVg6FNvnlBcqlzvmVotJtfUuoaL8HPA+oeHvBt58Bf2l9EutT0LWtU0DSrb41Xpt20XwrdeHdO1Z4Tp\/7S8tlax2Fz4q0GFbeaW3mmF9utIZo7a7a3+Zo\/Xa8lSoVaknGN4wUuVKEWlprbS6Xc+xm6cFzT5Ur2u1u38utiTy\/g\/\/ANEV\/ae\/8PZqn\/0S9dP1PN+9T\/wYv8zP2uG\/mp\/cv8j4x\/a7+Dv7SE3h79qHRfhrZ\/Go6Z4w\/bVfxp4Y1eC5+J\/xNt4fBWsf8E+PDWmRz6X4T0bxZaeML3wQ37S8s2h+ELHwtrWk+Efg58U4vDvxGudGk8G\/DrUvD1948k11ve\/5L\/hvQ9Gk4fu3JL3Y8rVleTTbvtva13vr53P068JaJ+1ZBZ+FL7UPG3wpg0i+tNAl1\/wb4j+HfirVPGfhCyjWwm1DRx470f4r\/wBleOPE8dil3ouo+IJvDuhaZfa\/J\/wlljYwaXCPCN5sczUZPVNLW1v+HXr+C7n46eKvgb+1B4mj+I1x8HovjJo9l4j\/AGh\/GCfAzQfEnhr44\/DrRfDd142+Hf7PdppfxqXR\/Evja71nwG37PXiDwB8QLnUdT+IWryeEvjV4g8f\/ABV8U+DvCVxf674d8Ha1ik3s9vN9b\/8ABOiMoe7zW0go7LXV6t+d1vZrS+lz53+E3wb\/AG3Jf+Cgfwr+KPjnwP8AtXaN8OrX4zX73WuTX\/iLxHpdt4I8UeLtU8ceGY\/Fmm+IZ9ag0jwsB4w1LRfE1voOsNeaFBr+tSeI30F\/Btt4SaYxm5Jtcqjve+u22i28\/wDM1c6Xs6iutUum299fut\/wD+fn\/gqv\/wApF\/2wP+y0+Jv529f3z4KpLw6yBpK\/JmKvbos6zNJeiSSS6JJbJH+b\/jokvE\/idpLWplOtkm\/+EHK3r+fqfn5X6ufkR+gX7Cut\/sxaHF8e4\/jvqtnpvizxR8DvjN4R+Hdx4l8FaT4q8K6Q+o\/A74qXX9s6dd6nr2l\/2R8UT46svh3p\/wAOp4bO7kuZ7jWNEtJ9P1bXtM1bSfzfjyjxVWqZE8jo1quAw2cZfi8xeExcsPiq0lmeDjGhViotzwMcOq7xEI2b92ck6UKil+leH9XhbDrPI8QVKVHGYrJ8yw+WPG4P6xhqTqZdio1a9KSvGnjJYh4X6s6lrQjVacZSg3wf7W3xO0vxlZ\/AjwZYXvgDxFqvgD4SaTeePfG3gPwf4D8MWviD4hfER18Z6tost14C0HQbDV4vhv4evPCvw4mkuYr14\/FHhjxbew3sy6rIx9Lg7K6uCnnmMmsXh6OYZpWhgMBjcXicRWo4HANYWGIUMTUqSpxxteNfG8ycFOGJpJQ5YRt5vGeb0sbDIcuhXwWNrZZlNGePx2Cw2HoRq5hj28RWw05YelShN4DDLB4RRtJwlSnzScpycvjmvtj4c\/dP\/g3YI\/4eP6OD0PwW+Kgx6nb4exX89fSJf\/GK5Xrr\/rFRXy\/s7FNr0u727u5\/R\/0ZklxpnNklfhtt2SV28ww127b38z+yz49Y\/wCF1fCAf9Ur+OePw8X\/ALPn\/wBav5OyX\/ea\/lG34r8D+1sb\/BX+OP5SMCvpjybLsvuR9vZQZ+6MYLdBjuCfp1z2618M0nuk\/U+hHUwGb4\/7y8e44z2+p9OvtSslskvkA3dDnqmc44xnJ7fjz9aYH8x37WHx7\/4IN+Hf2kPjHof7RfwK1HxF8cNL8a6lafE3XIfAvjq+j1PxVEsI1C5W807xTY2V0W\/dhp7a0hikZWdVJJdv1vhjh7xbxmS4XE8MV84oZHUVR4OGDzyOXYdr6ziadRwpvF4aWtajVlL3pxblzcsW23+M8U5\/4OYHPcbh+LMNkU8+X1eWNnjeHp4\/EtTweGq0VPEPKqkJKNCrSgrSbShy3cVE+e\/+Glf+DbH\/AKNx1b\/w3fxH\/wDm0r3\/APVbx4\/6DeIv\/Etj\/wDPY+e\/1r+j1\/0CcMf+Ij\/+Bxf+Glv+DbL\/AKNy1f8A8N38SP8A5tKX+qvjve\/1ziG6aaf+tkLprVO\/9rXunswXFX0eVzJYThhKfxW4RtzaW962T66aa30D\/hpX\/g2y7\/s46v2\/5p38R\/w\/5nT8qmPDHju20sZxGu\/\/ABltOztdLbN3e23dLyF\/rb9HqTSeE4ZfLe1+EJWV7KVm8mtrZXs9bLdIT\/hpX\/g2x\/6Nx1b\/AMN38R\/\/AJtKv\/Vbx4\/6DeIv\/Etj\/wDPYf8ArX9Hr\/oE4Y\/8RH\/8Dn0N+yt+0h\/wRC1P45eDPCn7JvwR+Jfh\/wCOnjiTUPCvhCXwBYfEb4eeIdRW50+41TVNKXxTL8TvD9rZWdxp+kzz3Ud7q1pa3AtUjYvN5KN8txZwz4pYTKauO4sqZricqwtWFWSx2ewzGlTr1H7GlNUXj8S41JOp7KNTkVuezklKz+q4O4o8JcRnVLBcGU8lw+dY2jVoxeAyGWW1quHpr6xWpzxCwGGTpRVL2rpyqNNwuoOSR+sfiyx+Emn+K\/DVl4t+C\/7U7eKr3w74tu\/DUl98b\/EN\/dJ4dsNS8GQ+LUtdQT9pO4SytpdT1LwW17ZtcQtqEsNjMkNwNNke2\/NKFPEVZuOFc1Uau\/ZyUW4ppO7bSaTa72P1qc0o3quChfS6Vr62dvNXZB9k+DX\/AERn9qL\/AMPd4h\/+iSrr+o5t\/PX\/APBkf\/kjL2uG\/mp\/cv8AI+PPjV8Ov2zrr9pj4yeLPif4U8beKf2bvE2s\/AWfWdE+BnxB+KHiO\/m+CHgn4m\/FbTbHwf4R8AeH\/B\/hHVoPFup2t94O+JHx10zwrr2v6\/f2l3qvhy21Dxf4Nn0bSdA8aanGbkveUrWV7ONt9\/X7l6HdB03FrmjdRktV1laz67Wetr66H3T+z74R\/bi0P4G\/Auz8Z\/Ef4UTeLrb4QfCzR\/HuhfET4deMtd8baH4ttPAvh208Xap4h+IGh\/GM2HjzxNb+JYdbn1aOLQPD9h4hmnt1g17Sns7rVdc1imr362\/XciTg5Sdmk5NxSsrRfTtp5WPzk+LXwf8A2jdb0n9o+w+Gml\/FrxHpVz8a9T8aeB7zUPB37Qvwt8XfF3x98U9E\/af064+F2oXU3jqGTRfAP7Nnirxp8KPiB8M\/jrb2\/wAOfgvqr6VoPhuaa31Lwfp3j6zXJK97697u5rF01KnJ25UkpLS7s9XZ6a313fmnofGms\/Bf\/goHe\/tj\/D\/xX4w8NftT3nh7wZ+0RpGr6v8AEbw4PF+taBrfgf8A4T6x8Larf6T4Y1H+19G0rQPEmm\/D\/wCGF1Jb2Q0rULKw1bVNevrH4f8AhC08UeL7bG8+aLSdot3u7XWysu22\/wDkzXmo+zlFcqlK\/vWV1e+l\/K\/Tz8j8Gf8Agqt\/ykV\/a\/8A+y0eJf8A23r+\/fBVv\/iHXD+r+DMVvslnWaWXoui2XQ\/ze8dYRfifxO3GLftMq1suuQ5W3ur6vU\/P2v1a77v72fkPJD+WP\/gK\/wAj9Bf2MNV\/Zg0r4f8A7TVr8Zda0rTfiX4r+C3xM8OfDibxX4J07xL4f0mBPhx4q1KC78Najf6xa\/2V8UdW8eQ+CrXwrfWlgdTtrLTNY0fTblpfFbyaf+a8b\/60zzHhqpklGrXy3B5vg8XmUMLmP1LF1n9foRqQxdJwk3ltPCxre0lUXsPazpSq+5Fp\/p3AcuD6eX8TUs9r4elmWLynHYXLp4vLJYrDUf8AYsRySweJXuwzKpipUVGMIzqypRqwpSp1eWUe3\/4KYap8A9V8RfCNvgXffC25tLDQvG2l6tH8MYPBD2dxpFr4rMngnxA9z4Eit4NF0LX9DuJH8J\/Djx2mofF74d6bYz6X8RPEWu3d7p08PN4ZRz+jTzqGeU8ypylXwc6TzBYqE1WVGccXRUMXOc6lWlP2c8Ti8PyYHFTrQnhqVLlnBdPilV4ar18k\/sCplM1DC4qNanln1WdJ0fbxeExF8JCMaVGtDmWGweJnVx2EpwcMRVqc0Zv8w6\/U7vu\/vZ+UckP5Y\/8AgK\/yP0o\/4I9f8pNP2P8A\/so2s\/8AqvPGlfkvjg2\/DjO022vbZZo32zHDNfc0mvNXP2XwDjFeJuTWjFXwuap2S1X9n19PQ\/vX+PIH\/C6vhAMDj4V\/HPHHTHi\/9nzp6V\/EWS64mv5RsvLVbfd+R\/oDjNaEb6+9Hf8AwyMCvpjyrLsvuR9vFkXGSq5zjJAzjrjOM4HWvhz6CyWySEEkZxh056fMOevTn2P5UDDzE6b1z1+8Onr16e9ADsqSRkE4BIyCcdiR6elAH8xX7Wfx4\/4ILeHv2kPjHon7RnwN1bxB8c9M8balafE\/WoPBHxEvY9S8VxiIahcreaX4psNPudx8vdNaWsMMjgsqn7x\/XeF+H\/F\/GZHhMXwziM3pZLVddYONDNYYSg1TxWJpVXSpxxNBqLr06s2rWvNya5pSt+K8VcQeDGCz\/G4TinD5LUz6nHDyxrxWS1MfiLTwuHqUXVqLB4xtqhUo04ttWjDkT5Yxv88f8NIf8G1v\/Ru+t+uP+Ff\/ABV\/+bOvd\/1Y8fb2+t57pf8A5qFdOv8AyMf6+TPnv9avo79cJw4raP8A4xWvo+3\/ACJBP+GkP+Da0dP2dtb\/AA+H\/wAVP\/m0FP8A1Z8fpaPGZ7pJSs+IU\/ei9JW\/tF6xez3XRh\/rT9Hd7YPhx3i07cK1\/hejTvkiumnZrZrc9k+Amo\/8ECP2nPibovwd+B\/7JOveNviL4htdYvdJ8PL4X8a6Cbq10HSrzW9WmOp+JfiRo2kQi102xubjZPfxyTFBFAkkrqh8TP6fjJwvgYZhnmb55gsFKvSw0av9t1ay9rUcnCPJRxs5JfHK7SS1tq7P6Hh2fgnxZj3leR5Tw5jMZGjPEujPh5Yf91TdKlOaliMqpwfJF0k0m5ckVpaKS\/Qgf8Ewf+CepAP\/AA7a8Qc\/9RjRf\/n918YuPeNmr\/62Z7rr\/wAjHHf\/ADUfaLw74GaT\/wBTuHVfo8qy669bYNr8Sj4Z\/Y\/\/AOCe3wg+KFje+DP2GviB4A+KngnTdI8Y6Tr3hXxI2ieIdAtPE03inw\/pmqaV4g0n48wzWc98fD\/iawf7FerdxwQzLcLFBeQNPz4riTi7PcLWwONzzNsywUpQ9th8RjcTVozcXzwbhWrzg5QnFSXu3i1eLTVzuwPCXCORYqjmGXZBkmW42CnGlisJl+FoVqfNHlnH2lHC052lFtOKk4yWklY+jr+P4O6rqFjquqfCf9qvUNS0yz1DTtPvr344eL7q7sbHVp9NudUs7W5m\/aPaaC21G40bSJr2CN1iuZdMsZJkd7WFk8eGCx9PWFKpCTSUnGoot22vJS5pbLc+hlicNO6lWpON7pODWve3Lb5JfkHlfBn\/AKJF+1N\/4e3xf\/8ARIVp7DNe1f8A8Hv\/AOSI9tgv56P\/AIA\/\/kD5a\/bb8HftseIPj38VZPg3ovjTX7DWPgTrvg34S\/2Paa1p3hzwfpOrfA745T+MvFvhb4gQ+NNG8NeCfj3f\/GGL4YeCtGfVtBuNbvvC\/iTSLrSb5NK0nXtb8F+S4z5pNSsna2r316bbW27Ho03StaSV1qm0tX0T0bcb3utrWvc\/NX9qX9nP9tbx+JPD3wq+Dv7Up+Dd5N45\/wCFPeFo\/EvinQ5fB2j658W\/HfjbwZpPibwr4j8QXNnZPHr\/AIH+GOuaFp\/jSw0vT\/BHhDWtH0XxXrGj2OmSeGbWZ88V1e+z7etvkaJ0f7n3L\/L\/ACPqbQ\/AX7WWk\/CHV\/CMPwM\/a913WvFvwW0Twr4a8Wv418LeH7rUNBl\/Zw+Enw5+KP8Awlvgi91nStPsNe0bUtM1nxJ8N9O8X2fwl+It98RPDXhzRvCmlad4Y8RfFKTRE3NWupeWq9P5vMyah\/NDp+Dv2+Xz1uffWq+OvGniD9s6y8Y6Npf7WngL4f2vw28A+Ar6LSv2e7+88IeOfEulfE\/xrf6rpPibUvFXw\/8AEN7oXhi30jVdNmfxh4V1Hw0JdP1K6l\/4SCUWELWOqUudyv7rjZRu9Hprbb7iXyqFrxcua91\/Lba7Se\/Q\/iD\/AOCrBx\/wUX\/bB3Hn\/hdXibOTznNv1\/Wv718Fkn4c8Ptr7GZJXXT+2800129D\/Onx1X\/GzuJU7Wc8rkl0X\/CFlabt3b3tv1N79jBvhBH8Ivj2vx5b4UQeArxPB6aVe+Jrv4OXXxBt9d0\/x98Pr\/X7Twp4emhX9pKS+1nwSNZ03w5rvgHUbf4d6RcSeJZPGGmawGuG07fjX+2ZZvkv9grM3jU8RSqQw9PMYYKpSrYHHUqNTE411FkEY0sROlKdKvR+uVeWnHDVqdWMObk4F\/sSGTZ9\/b7yqGD5sLUgsXLL6mMo1qGNwVWpSw2HdJ55zVsNCsoVcLWlg6SnN4mnOk5RXMf8FC5fhdJ8TvAv\/CvpPg7LrKeB\/EqeP5fgP\/wg4+GzXZ+N3xdf4ZLYH4dBfCL6vH8B3+FMesNYA6krrbReKz\/wmcfiIDt8PP7QeWY145Zr7OeLoPCrOniJY3mp5VlsMylH63\/tDw884eYOjzKMFBRVJKDUVw+JSypZpl8cueUyqLA4iWMeSxw\/1FKea5h\/ZkX9VXsViI5MsB7fepKq5upKUk5P6f8A+CBBB\/4Kc\/BjkH\/ilfi\/7\/8ANLfFVfDfSAv\/AKlUt\/8Akf4FfL2ONdvS6Ttton0R9z9G5Jcf4ppJP\/VzMdVpvi8uT+9Np+Ta2bP9CZeg+g\/lX8YrZeiP7yPiH4jf8nH+M\/8AsiXwX\/8AU9\/aFr6DJf4eJX9+D\/8AJVr+f4nnY3al61fziJXsnAFAH3BXw59AFABQAUAfxmft0\/DL4bat+19+0HqWqfD7wPqWo3vxF1We81DUPCeg3l7dzyRWpkmubq5sJJ55XPLySyO7HksTX3WWcRcQZfgaGEwGeZxgsLTjL2eGwmZ43DYenz1J1J8lGjXhThzVJzqS5YrmnOUneUm38NnfC\/DWY5jWxmYcO5FjsXVjT9risZlOAxWIqclOFOPtK9fDzqz5acIQjzSdoQjFWjFJfJ3\/AAqH4T5A\/wCFYfDzGDx\/whXhrHb\/AKhnufzNd74u4rdm+J+IW4\/C3nWZPl9P9p0+R5f+pXBrUk+EuGWuW1nkOVNWbV1Z4TbyF\/4VD8J\/+iYfDz\/wivDX\/wArKa4t4rSduJuIVrH\/AJnWZdFK3\/MT06dhf6lcG\/8ARJcM\/wDhhyrra\/8AzCdbL7l2PWfgfoGhfDL4l6D4v+G+iaR8PvFljFq8Fl4o8EabZ+FPEVnBfaNf2l7Da63oMNhqVvFeWssttdRw3KJcW8kkMweN2U+BxBnud5jg4UMwzjNcfQVeNVUcZmGLxVJVIxmo1PZ1604c8VKSU7cyUpJPVnu8P8O8P5XjKmJyzIsmy7E\/V5UvrGAyvBYSv7KU6blT9rh6FOp7OThByhzcrcYtpuKt97f8NAfHj\/otnxc\/8OR4y\/8AlzXxt33f3s+3SVlotl0RwuofGL4uXPim\/wBUuPin8Rp9TuNA0Kwn1Gbxv4mlvp7Gw1HxJcWNlNdvqbXElpZXGp6lPaW7yNDbzahfSwoj3c7SXCtWpX9nVq0+Z3lyVJQu+75Wrv1M6sIS5eaEZWva8U7Xte111Jf+Fx\/F3\/oqnxH\/APC48Tf\/AC0rT63i\/wDoJxH\/AIOqf\/JGPsaX\/Pqn\/wCAR\/yD\/hcfxd\/6Kp8R\/wDwuPE3\/wAtKPreL\/6CcR\/4Oqf\/ACQexpf8+qf\/AIBH\/I\/\/2Q==","a_rank":"9","a_hot_flg":"0","a_views":"407","a_active_users":"437"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2F3585462f3b7c2faede9a9b68004ccf02","a_title":"\u6751\u4e0a\u5b97\u9686\u3000\u5927\u8c37\u8d85\u3048MLB2\u4eba\u76ee\u306e\u5049\u696d","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:07:43","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP4kpPiJ4uvWu4tB1UaLZW4O9YokjmFmW8o3UlyUmlDRj53MSoEBIRdwG75\/CZVgqFpVI1K1SSUpuc+aKk0m7RaSunpd6rbW139jmfF2bZmnChVWGwVO8IUaMVSjKK0U7buTT3X5HXeEtM8X3d7u0y\/1O5uWuI2t55BH5U85cGZH\/dXXmOx\/dsZ2VGaQE7CC1PEV6HLKc46JqLk1oor3VeT0SSt06LfS3Jg54uXuQq1Zc65rzbd3e7SW2rb9Otj6W0\/Qr7VbUjUIorG\/e2b7ZaebFKILuNVWWJzFKywSo5\/eQORPCxaKeJJEZa9DKJxxDfsmlCk+STk9U5Wd47JR5bWfdv0MM3hKjR9nUTlUrQc3yq7i73s10k3r6PTueI+J9BS1e6jDxsyEjh1Bwu49Q7dSMDv0OK9OpD2c3G6kt012\/wA9Oh84k\/ZpPe2z37\/f5fIx9M0eGfT5ZwS8iI+EjBdgMbtpYrgAkjJDDHB4xXDKpOM5appaWafltZoORcvO1y6tOTXVbrp3X5Gx4bsGeYKYXOeVJOCG3YG35wDg984yc9OKurb3ZN62bSXVqz83\/XdijFO9+nb590dtp3iTVvBHiGCSGZLXT51Jv4pBLPHOsSSNEjwwpnzt+FguYLiKeAysVkSMykzzqvHklBPmfwyul7rT9du36MzlKVGrTqQbi4PmjK3VxaaT9H+h+l37K\/7Vus+GNWtdT0rVDc2E7W8Gt6FdytB5kcUymFNRjgLTIySnzdL1u2A8udd0XlyG7sR87Xw2IyqqsVg5O0ZOVSkoSSqJ3dnO1t+u2nofT0cbQzbD\/UswUIqS9ypytuMmuWN+nIru7a2vquv9YX7IX7aVv498Gr4eXxRq93o2rJFb6zAbya0ku7qItLb6bqsNtcwK2v2cdvviuo1ittTtkhu7GWO4idbL6D6zhs8wkYTdRVaabtTk1OGl78t7WTu9dfyPg8fgsw4bzB1qMPaUqjjzRdJzp1E2rSjZWacftJ3Wp+gHiq28H3eqfDfQPCE3iaPUPFcaWM+oS+IrvWm0nw3qOpanFFDNfskdiEmvvPnt7QWVm9jYTeTLIuy7tR87PLkpQgp1VGClzNq7k4SaipNrdRs0l0tbQ+ow2YVK2Fliqs6EYWUYUXUhKtKTi3JrZuMdXZK8I2T2PoD9jL4J+Adc0LVrjUrHUo\/FHgnx\/qVidTa30O90y\/t9kAt4I7S\/0u+WNJYVb7TDtMDsi3MEgBjWM+p05ypylVnCcasoxjyJ8yvq7JaJWXRJXeuhlHESlzXgrK1079W1Z679HbzPWNVtvgfb6pqUD+J7yB4L+8heCHwvpKxQtHcSI0USpoKoscZUogQBQoAUAYFc08TGMpR9rF8smrtu7s2rvXc7lTuk+Wnqk9+69T\/Gu8J6KuoTIttDBcRajdTxLGqwStCoO\/yGDNtPRmiCb0yrqN7Ruq\/QznaL1s7b7JPZ6vputbfjptDDfWJc1FWhO0oxs0nFW1dk+XXez6H6ofsc\/sa+Mv2kPiL4f8FeEJ7bRwsNxd65rF1pcX2DStL0+0jlv5p7WF4RObZZUuVlR45obeF7mWeOCNSPls0x8IOOGhKFWeInGnGlflcZSej0V7J+921S1TP1LhnhbGZxQxeMw7o0cLlWGVbFV6lObgrv2dOkrWi5VJacyXu7u7ucj4p0jRtP+IeoaZps0F7pcs2p\/YLm3jEUF5Cb+6aK8WLzLhIlugftbpFI0YlmkePO7cfvMqwSwWGpwlLmnOFOVWXLyuTaum0rJSUWoNRsvdvq3c\/KM8x8sTj66p2VKnOUacla0o7XT10un5q1umvjPiTwdJff22bW3V5IbeafahZmAiDFsgKACpXGCCRz04rrxUbTbinyqOmzaV3bS+6\/rueTF3Svvon62V+35H6nf8Ek\/wBjb4LftG+BPEGrfEzTY9dvtQ8b3vw6n0+7bUkistIEvw61x7rTZtPEFxpWt3Oly+LLW31u0vGvLK3WYJbRFxcr8LmmbVcJiFBTpxUvZtupG796TUkkk29Etbq1u5+xcEcN5TmmSV8RjcK8ROc61KrP28KPsaFJRqt0lOUY+1kk4qa95J2PzM+LvwM8SfAD4u23gPxF9glXV9F8O+ONEFlcXc7r4W8bWEWu+HIb576zs3XUo9KubZb8LFLb+dlrS5u4JI53+mp1I4nDxrw1inUhezSc6Vo1OW+6Utm90fk+aYSeV5nVwMrTThTxFPlatClXTlTg5a804w5ee7erVtDyr4lW5tb+BQFWAqcr+7cYbIzvZlRCAMDDxgAcGppRk58ylte0bLs76\/P\/AIY8+utIvz\/R\/wCb+8w\/Al\/daVr0F3ptybeaMghwylTG4KyQTRr5iz28qlo5IZFeORPlkRgTXbZyjyynJabauOz+y\/dt8jDml7tpNcruradLWdt15P13P13\/AGa\/2ida+Get6PeabKsM80ZubzTryRk03ULON1eSJEnaF5oo3XzIJY7l7\/T32zQSN5Lzt4GZ5XicvrxzDA1LxcYt0IOT5\/50rO0bWunvquh7+V4yhmeHnl+ZSm5LmeHrvlfK5SdopSVkktlayduup\/Vh+yx+0r4X+JHhrTtftkW9vbLT73S7q0v5beLVNLn1CwuVms5nHmxh5dxk03UPJazuplS7hiiuLS9tLb18pzCnmSp+0i4yo1abrU58kk+Wd2pxl7zUlvZtPtuj5LN8jqZJjIV8TSeJpUVWlhKiTlCnKvB0pSsm1Jezk+bmvFS1ilJXP0\/+EfjXx74W8C+OPEXhTVNP0XRNI8YaPda1ZahBLbX2pWV\/DbwNDZXEliVuHmmvUjS8tZooppbeU2xdAVPZj8mWYV8XiKNd4KhTxPLalHljKnJe0ahaK5VaSjHlslZ2tY9HA4+ODeGdWmsS8RQ5qMr35pRSUuZJ2dmnuru93qaI8dS6qBqghgI1L\/TwZbbTnlIvP9IBkeULK0hEmXaVVkZslwGJFeO+E8A2261Vtttv2r1fV7ntLPazSap0FdXsqasr62WmyP8APL\/Yw\/4JSaV8btE+HGoa7+0x8OfAHifWvEFlLqHw48Qy6XLfy6MrubZrC1stZXV5dQknlVfNktoIZUl+zI8bFGf43Ms+zCVSvTwuWVvq8IuEKqpzcvabTUotNOEVom9U1dOx+qZJwxltLDYWris7w8MTZTnhXOEI8s4\/BTad201dSbaV9j+i34++GP2Xv+CUf7KFz4c0bUdN1D44a74d8ceEvA3iVpYLTXPE2ufEPw+2j6n4gv7A3UyxaR4X00C9t4Wle3tmt7OzjVr3WhJN4vDOHqZznir42NSlHAVo1JSnywpKMVbmadnLW27dn6O\/2+f8TYTg7g3H4TBzVSedUXhqGHpv2kqta3tIznOK54wpczlo0rq9r7\/yDabrVxeeN9Hlnh1FbQ6fcqbue2khjeGNpY\/OicxpC8buiqZUCxAuVUgstftssdga06dOjicPOcaaVRUqkJuLV9J8rumneOvZ9EfylRli5Rbr0qlJc8lTck1GXNab5Hd3S5vne+9z3b9nv\/hSniv4k6r4W+L\/AI78U\/D7QdTsb6wsPFWheF4fGFrpupXDiKK\/8QaYmv6NqJ0K0iZ7m9XRo9Q1SVF2WtozgbvPx1fEQSdCkqjSblH2nJOzetlyu+nTve572TrLKlWdPMsXiMJdL6tOnShVpOrL3VGu5awg9NVfW2i3P6Y\/+CTP7K3hj9mLw9B4fn+J3gT4sv8AEn4j634r0XxJ4Lke+8MXmm2vh21s9MvtFn1CG2vopW8Oa7q0OqxXdvby2eoQlfJL2gkm\/Ls3rRzDNJzlKWHnRpwgoVLU5SV9Wk1JOzT1avs9dl\/QnBODxGS5HXw9SVLEwrVKteM8PLm9pTqKKcU2rRioK8+nM+Wzvc\/I3\/gtt8MPCnw+\/wCChGv6V4etYUtIfhp8GohZxAiDTXtPhl4as4rCK2LyC1jis7e1kigPO2480ZWUY\/RcqoOnk+Dp80puaxFRybbu61Ryv62aTl9q19FofhvGdWFbibMatOPs4xWGUI6XjGFGNNR0SSV4XtbTmtZvV\/jN8bLSNLWyuAixlXQhCoCkcnBAAJDDIOMfLx0Jz0QpypzSlo1fTpqnZ\/0j5mpJzjBpW953V76Wfl\/VjyXRJJhf2BjiCh0D7o4wvyLnaSxJwuBjHK5yAQcmt4e+5KzVm1te9u39aCjG29tejX+fU+w\/EVommeBvC+uQxi1v72Jl\/tFVEV9LFFMrIPtMSm48qOVEdVDKC6qwXcoI9nE0IKng58qTaqX0ajK0fhdrXV31d9PU82jWlLEVVblUf5bKLe97JJX7f8A+x\/2ZP2qPFfwq1zRdTTVo4L+MxW2LmWSSx8QWskYefS9TsIwiziSNCTs2EPHHeWz2uo28U0vy2bZLPDxhj8r9zEQfPLD027Vkkp83K3pJXdrN3066L6nL82o16Msozh+1w9enyxqtLng+Zx1cuaVl9p8ytvZvf+u39lD9pzQP2jvh5p2gWPiWbSr3SpYrnV\/CE16ZZLW6juILvyJolMT6jYyT2znT7x4VgDGQ3FtDerMlv35XntTM8FHDyr16OIoOU8ThJwjGdWUbtKKld2a1fM5csbK1keRisnjkWMjGVOGKwVaM54PFe1lJYaUmoyjFxfLGN27wtZ9+r\/QeGfSGhiZrmUM0UbMDPZxkEqCQY\/srbCDwUydp+XJxmvchhlOEZui05xjJrmWjkk2vg6Nmqp4VJJTqtJWT9k9Uv+3z+H39m3\/gnj\/wUW+BkHx8\/Z18GeGP2TLi71D4W3mu+ONV+IFnL4wvofC3xBn8b+D5B4S1rUtAudM0nxNot38IPEs1jqS6PFqOkSbZrTV5bXUHtY\/v8FluZ4DDVMLF5W41FKq6ip1XOUayjGNNydOKbftI7JRTd9lp8TiMzw2LdOtVjioctRU4wo15UVCUISnBpQaunyybTbTSa06+SfDLw\/8A8FfPhf4luvhp8E9e+NviTxFYfCHwT8dZ\/CHgrxDZ\/ELVNL+Hnj7w3p+o+BtZstFml1fVrSOXSTaT3eg6PbfbNOtkjmv7CC3jEo\/Pc98NuHM6qKpm2XYLEVIN0lVhVr0ea1RwcJqhOl7VxqKUUqnNqtLq1\/qMFxjmmHwsKWHx1dUYSlyRxFOniZU9FzKNWtGpKKdlKysmnu1ZHyF8d\/jn+3v8W5I7H47\/ABo+LXjuPTVtrpvA3xH1nVbO0tZb9DdWkbaHfC2s7dyRA0LyWUKvthaOYxLGw8bBeFWRcP1p4vJcky\/B4qDm5VaPPDEuMea8edzd7815pq8nZ373U4xzTHw9hjMxxOIw3NFrDz5FQWr+wqa0afS3Lay6nwzB4s+IHhvxNc6jqWm3un3dvsuriG8sZI4xDcpKrTb2AWWEmGULPGXjZonxIdpxtVo1aE\/Z1qcqc2nJRmrXSdm03o9ez11tsaRUKkeanNTWmsZRl66LW9tbbn7i\/wDBFD44+IT+03pvg\/VNdv30bWdL1O40exkupJNO0\/V2iIm1W3spHaJZVtZZYVljUPGtxIAzRyzKfzzizA2o4XGU4xp1lWlRqSS96onZ03Kzd0ldK1vXv+u+G2eYmnWx2UVq854VYN1qNKpKU1CpGqlUSlK8mpwkmoxe921ayXof\/BfyW28H\/t+6pPqOr2cWp+MPA3w18V28Kvm7udJk8CeG\/D9vemJ5WfyJb7w9qttD5WIQbV44wpjZE+8ySrCpkeXpyUq9KNWhNJO7VOpaMmne7dOUWut76dF+fcZUakuIcfUhNRo1eSqmrxvCaleLv1ik09NLn4s\/HjV9Nt\/h7oOrq0NzcaveR2VgAGSaaaKMy3EhDYCw20aL50gVz5k0MfBlyOqdNzcVBtybS11Vlu9Oyvrsra7M+dpOalKDs1CKs2111s2ml1TS89j7v+Bv\/BPvwJ8a\/hR4C8Y\/DD4+Wms\/EjxL8LJPEc3gy68Nz2unaL8StO1fXdN1T4VeI7+S6tbnQ31K3sdK1Lwt41EWp6JqNvrNut5bWEcV9daf9Hg8iU8FicZGrUVfDcrjS5FKnV5o3upxacUr2fMr32e55+MzR4bF4bDzpxdKrfnqc1pRd0oxjF6PR3b5umqWjXzD4zv2f4ceErSaGSK90+bV7S6tpTIk8MlvOpMLw\/ejkRg8ZWRVdZI9rjAXHDWrPEYDBNR96E60LX\/lXXzd9Un8jvhCMatSUVZ1Ic7SWmqdmutrXfXpsja8KahaweEr\/UJolkC2+nSRq5ADB7uO2lOSCGCLJliANoZR0JNaYWSr4XGTlJOdKEWoraNlb\/yZ7pHPiac6VfDVto1m1G99bJX8tlfU9w\/Zh\/bG8V\/AXx\/ZarFrF1a22kaqws9QQzTyWmnP5bCx1RVdV1DSjsSIhgZ7eFlMAZoLbyPkcdgfauONoyVHFQjzXppJVG1dcyg021tdttre7uz3sJmLp+2wWLp+3y+rHlcXZyoyb1nRbUmne0tHypt6Wtb+nLRP+CzvgGXRtIlvPBInu5NMsHuprfUNPkt5rl7WJp5YJBcqHhklLPE4VQyFWCjOByf23mkfddNtx91uM3ytrS602fTyOhcNYOSUoZrTjCSUoxkqrlGL1jFtStdJpO2l1ofCM3\/BwL8C7r4nfGDxbN8Avi5JL8S\/hRbfDXSNSuvE3hRNR0nW9O1r476vp02pQSNeibQ7Wz+NcNtALS9W7B8LK0dukV6ttbfts88w6nSSpVqKjUpKc60PcnTpzwr5EuZTTfsalm43tJddV+ZwyerapTnVpzXPKpTUW0o6SgrtJ3fJKS+fXRnCeIv2tP2Rvif8fPjj8R\/gf8eNb8BfEP8AaP8A2dvgX+yR8MY\/iv4Tm+Gtj8CrO81z4c\/Dv4g6\/deN9L8Qa9oraT4a+FngW51Q61FqGjXjTeIri00+xaW1ch0MVhqi9q6sZVHOTcIKTc17TEVVOKnGMVVdSspwV+VunFOVmzpq4WcZcqu6aUbyj9l8ijJysk0mle6u9nufHv8AwVn+O9xcfGPwx+z3Y6jPr3w3\/ZG8B+H\/AIP+FvG+s+JdD8c+LvifoN\/DaXerfFLXfGehalrdlf2esXtzpWp+EvD1lq91p3grwtZ6dolvHa3surLJxVsROjKNST96pUhXxEFdcqlC3KlJJtQtapKUk3NN22NKGHjOM22uWLVGk46xnNLmUrveTWjSurLTc+Hfh3qvgr4vrp\/wy+JUqaXpOt6ingxvFMew3vhbWrmO2sjq1hcKFLIwvIr64s7hmsb8TyRTLI0MUsZOODzeMsNipRpxVSMIVrLnpuagoy5tHaDnezk03e6sjGq8ZgajxGEhKTipTlQjHWpFJvlhfnSk0tuR2SurvQ+jf2Z\/2KP2jf2Lf25fhJrfxPfw7N4W1bWbjSPh3418K64dS8NfEjwzZyR2w8R+D7i3TybjT47uxa08Q6ZNJFrvh7UZre31\/TbOPU9Jub\/8j8Qcur5G6uW4mDqzpThVo4qjFzw86bgpwlzRb5ak4Si3CSWqk46WZ+weD+NpcS06HEmEUcJCtCeGxGWY2tCjmuFq00lW9vhZctqcasJQUoOT5rJK3vP9Ov8Ag4y\/ZnHjT4pfsSfGfTLbXJ\/FHj34Eaz8L4LbS\/C8mr6ZqF18MfHUfiVrnxLqkGow32gLZaJ8VLhbK4ttE146i+npazrpVnBNqUHh5Rm2Bw2V1q2KqVVayUYxTpzdRtTjUlb3LxVk1G13roj2uLskx2Nzun9Qo+\/U9xO0pNNWcG4pSbSfM9O6TaP54\/CPhqT4qftm+Cfgz8U\/FEPiLTF8Y6r4fv7uyh022jXXEt5I9Yt4VFs1jJqltqOkS6XbNNavBqV1HDJKGmujJXoU8NiJ5PN5VQnhVRwtfEQpTryg3ThGVabVTR3lBTkldNtKN9UjwYTwWX8RwhnuJjiMOsZhcFXxMKHNH29epSw9KTp\/ywq1YQlJRvFJy5G1r\/Wb+zh+xF8MvFf7O3xG+LGieNfF\/wAD9b8F+DvipN4V8TabP\/wr3RdPtUOsyeB9U1u8g0\/StO1GDS7ezsJdZjN5rGhxRpcWl3YzxTmKT4GGPzXLasK2CzXGp16lGUcK8RUrU6873lQqQnUlaM9YqyeltFoz92xOSZFjsByZlleAVGGGqR+sSwtGEqNGslL2znCMZxrU01ZXavdOVj+TvxH4i8EXXxC+JOgwfEKz8SaDo\/ivV49O8WajbWWhr4jknubw6jqVnpsE1\/aLaS3\/AJ4sprSTyrqyNrdrb2vnmzh\/XsDiaksvg60fY15J1pU7bSqJtqKa2Wy6fM\/mjMKVGGNxMMJU9rhqdSdLD17cqrUYPlhOMPecU1q1J6vVHvn7Enwj8Z\/tQ\/D744eBtG+Gk\/ivW7Gx8OD4V+KNF8f+G\/Cs2m31h4ojg8S6bqfh\/wATXdtb+MLHxVY3aQaddw3tld6N4i0rRLO0S5tNY1Mx5\/21luWQxMK0MVPFYxUoqVGMZQpwjz8ynF1I\/HzU2mou1ntrf0sPwtnvEGGpVcHPAYbC5epz9niaihVrx1cnTbfNdW00S73Wp8KahqVxo+rXun6ubix1WxnksNSsZbXy7i2vbVvJuIpI2zIkiPHhgynkZrCNVyvKK5VZuN072kvtRd0n5Wumu+3gTjKE5wl8UZyjJJqS5otp2a0eq0a0e60J18XQBVAvLjAAHKEHgemzj6U1g8RJKSoSaaTTstU9U\/mS6rTac5JptNXlo100P7Vf+CpP7Hv\/AATgvf2of+CfX7RH7TFjJ+yJ8Pv2jPAd943\/AGhvCvhmxl03TV1Pwt4R8P6n4a8JT6NoPh6W\/wBJ1rUdV15vCviLVdL0a0lFjYvdXFrb3iSXcX6XGH1mFaFd069fA4qpRwlavNU1iJU4p8lebdpOCfNdNvltHTc+bjN0q0oU0qcJxbqRhHSNvddottpWVmum9z07Q\/hb\/wAEZP8Agp58JP25Ph1+zh+yvb\/AXXf2W\/h5f+LdD\/aR0Pw9p2nQ3P8AwjUer3+heIdDks9YklvrS9bwwZb7T9agWe\/0m4uC88c0hL81SWKw+IwXtsVRxkMTiqeHq0I4R4WUJ1ITlzUKrpc1VUmkm1Ll1SWjVuyNHnpVpUoqnKFP2lOaqOqpJS5XCastbX0bltorH8Pvi57vWfDFxf2SC5n0WV7G+gCMXn0HXdNElnIF5YqLW4hUb2IW80xJXy024446pUqU3OLvOip05Nu7nBTdpS063bejT30RdGEKTjTqpRjJRnT1932lm5tyVkn8KXVa2dmYdnF4r8DazbWvj\/wl4u8JeH\/GVnpVxpOtav4e1fRoLm+g05LnRdZ0q41O0tre8F3psgWVreRoby2WKdWdJ9448JjFGrJ4mElCpFRhyqyUkkr6pKWyerW1rnViabqQ54KNTlvHk92XNs2tWujuk2kfv1+y38fvF\/7SPwbn+DH7QGi6B44+En7IP7O\/7Yfxl0X4hw3Gpw+IYtI1L4Ra9F4c0ya8Rp7ODV1+Lmq+BYfDWpRS6B4gtfEGo6f9qk1N7XShb\/Q1fZ4jD4j63So4j2ksHD206dOpFyUlC6hVpzSlGgnf3rqMG9IuTPNwrxGGxtCOCqVsK4KtJ06ftKDalaU23TqQb998zWt277pH5ifFn9uv9rTUvgr8DfBX\/C2vF2or8D\/HXirVPhb40m1W9vfGnhvTPFeiaNa+IPCLa5eS3M2o+GZ5vDei3+naZqazxaa8N7aWsi6fcraR\/D4vhjK8b7bFfUcPKMlKlUpcqjR9180K0KcdIzV5fCuW+2mh9hhuJ83wcqK\/tCvCvSbqUcRzXxMJJJNOpJS54PbllF3ta7Pi\/wCCutR3vxr0DV\/FesT+E9R13X9Tm1T4h3183nRXHiVb+11jUL64KbIodSGqXa3t9LK6qtzMzSW6fvE87NcHmWHyyqsto+0lSpeyeHpRV6lCScXFX5k04Nxatqnor2N8krZdic5w9TOantMO69OvUqYm7j9YjVU6dWfwczjVtNX0UkpNPld\/67f2ifin8BNK\/wCCXXxI\/Z2j\/a30L4g\/EXx\/ong\/wjpvh\/4feKNI+IN74eN1438My6gmsf8ACPam0FlYTeHtL1FZtO1rUdKkvLBruG3gkkin8v8ANuCuEuIs34lwuLxmX18LgsNKtiJPEUXRw8XGEo0Yezm+atLnlFrk0ajePQ\/WuN+McjwPC+Z4PLsbHEY7F04UoRo1\/rFSV6kJzTailTvGDTfNZX6o\/l+1T9nr4ZeG\/DmteINTi1jx5rOjQWdra+H\/AAPqlz4YutU1KXU4Y7mSZ9U8Pa\/FHpumeH1bWLzU7S0+yfaXlsTdz7Ybhv2rFZFj1OdOphm6cYpxxUH7s9bW9nZTSSTfXTd2Z+BYfMsJOhQqPFQU6jarYepBwqUuVXSi9YST2vdNPpsfop\/wSG+Puq\/BrVPiKLfTbq0n+F+h+PPH\/gOwvNZ06x1bVfE2raV\/YfgbwEz3WlrL4juPEWrvZaBaLolm11cX2qy3Y0m2crq2m\/G5hw\/jp5jSp4ejiakcQ6OHhOjZU6VWc4p1cRKS92EI7PRK2ttz9b4S40wmByXMaWJxGHUsvw1XEYXmqQjWqOVOUFSp0rN1U7uclzNq79yW5+Rfxh8PeKPDnigP42urS38feL9S1Dxbr8RSVBp0974o1iN7dZ4Y0sp1vYrF9XhuNFub2ya31K3shdJeWt1Y23sTyzFYOUcJOnfEpWnObcYtqyvzNNWlK7Xe6a0PyzC4ynjq9bEOUlSdWTlUScpOUm5tpad7aSv+n234U+DXwruPC\/hu4uf2tTpVzPoGjzXGlp4C1e6TTZ5dOt3lsFuUsJEuFs5Ga3WdZHWURiRXYMCepVM9ppQjhJuMFyJqvRs1HRNXp3s0rq+p7v1fgyXvVM6xsZy96cfqOIfLN6yV+bWzur9T+jf\/AIJpaX8dv+Ck\/wDwUB+LXx9\/4KrfCrxbqKfsy\/Be++Kvwv8Ag3458K694N+HugXdlrVjDpUej+C9btI4tV0628jV7uT7ct+L3WLe2uNSa9EfkH7LFOtSwsWsNHL\/APaqGHw0YSc4xddVXVqxqJubq\/u4p1Je9G3RJW+Fp06EasfZ1HiOWE5zaclJ2T5YuTim05b2Tt5Hg\/7Z\/wDwXN\/ad+Jv7P3xW+DXwm\/Ye0z9kLwl8Rrq98MfE\/4qeGvBuswXureAr9rnQrTSrq4uPBvh\/S9KuNYS\/j0691e7lupBb309npwtXumcY1cHUws3XnHMsTUw\/PGniMZXU8PQk271aVO7k1Jv3W5NpNWXbZVq1Rezbw9KE+XnVHm55Sjaym9Vv8VleyafW\/8AMT8P\/GPhjw1rY1HxrK0fhmC00K512BYjPNdWujatLbT6bbWrA\/aLu9ggaytIGxGZnUyssauw8qpiXGnW0UnbkktdLtp91LVbq+l3fvrWhWlGKhGMpKStdJR3XS90vxXc+1f26P8AgqH4s\/4KEaF8M\/gv40+HvhvwT8KPg94q8WeJvh1q8Gj3Oj\/EXxZJrsNrpej6\/wCM70avqejaffxeFrPTjN4d8NbfD6ahfahdS3OsIdGmsscO41KkaWJp1IpxUYys4qKve8VNWcm\/ta3TSWx31IunTvCVOUk71FTacY3SvZfHbmvrJJ2t0P6GP+CKP\/BO39lH9tn\/AIJ1\/F74d6Z8Q\/jF4P8AFPjr4r6B8PP2s9Y8Jar4Y0\/xwPCujyWHjn4S6d4Tv9Y8L+KNFj+Gmo+JrbSNQ8RaWNAttd1jV9L1I6nr0Wk+GLO21b0sdXpYWg8HToufNSeIhXqTm5TnTXvOLp+6pQp88eVp3T2ukcMVUeJjiJYimoQfJKm4pSpxktZSvqk7Ozas7tatafyiftCeCX+DPxO+NXwMudVn1qT4J\/F3xx8PZtQuLY2V3fxeFdf1Dwu2qzWr8RPeRaO15GqrthW4iiJd0dm0guXDVoQlyzjGnKdOcVKSVRPW0XdrtdJ7aPVqXJ1q9OurSoOM1CotFLlaSsmuZq8ey63t14LxZ4p1D4hGXxJqsXhyz1bypbfUG8K+DPBvguze5A3NeSaX4O0PQNNme6bFx9qe2a5YzSGR5JWmc9tOKlh1KEeWpTgnJpJOWmvMno0430d399jGrKUqnLPWLaVuln101ut15n6Z\/sL\/ALP\/AMQv20\/ipF8ALb4nah4Q8K+H\/CF543vLK7vRqsZ0\/wABaHfReHrfw94V1LxDoGgzasy+J7zSrG9vdS0jTtGTxPq2ra3qllp9xqtxN3vEUMvoOv7HmlKcIz9mmp8st5KST5eV6uy1StZ6HnU6NTGv2CqtOzaTlo7aNXk0k0ttejRJ+1T8A9b\/AGVPiN4s8Cajr8uvav4J0PTfE66g+g694Z1PT\/7YsYtSsLDX9H122VbbXrGCW3g1SLR7\/XvD5uVkttM1\/VLeP7QfXp4yOIwcsRGmoJQk4pyjU5nGOsozi3FqT15b3i0lJLY4q2FdLErDOXO5qMklFq0Z7Rbdlot3f0Prv\/gmn+yh47\/ay0nXfFXwh8NaO+utqWradcX+qeOtO0m1afTINN8U+EdL\/sBvC4bTLmw+I\/hXSvFOp6zJ4xmt38Pmx0qx8P291JHPq\/kUsZheSrWmk1KF4tU3Kcaibam1bbltFRavdJrSxeLoVKU1RSfJyQbUW0neCv719ru7T766XPiv\/gub+yprn7KPxh+DGjapplppE2veFvH0EMVp4vtfG8kg8L+JLa2uZbvW7Hw34ctLSW51TUtQ1S18MNBf3vhnTNRsLC+1TUZz9sn+dz3EUq0sJVptc1SlVm1KNqipyqfunON73tzKzt8NlY9vh+nOnQxPMpKn7eUItq8OaklGcYyW\/LeK66WabPlzwt+y38e9a8MeHNY0\/wAOaVNp+raDpGp2Mp8aeFoTLZ3+n291bSGGTVVkiLwSoxjdVdM7WUMCK+e\/1uyil+6liailT\/dySweIspQ91pWrNaNPZtebPvqXAmd4inTr08PQdOvCFam3iKMW4VIqcG48+jcZK66bH6WfDH\/g5R\/4KC6N498TfHG9s\/gZ4j+IF94S8NfDLXrzWfh\/eWcMfgzSNW1rXtKjg0\/SfEen2luya5q2oPeXKxbpzcwI5CxRKfpfrtPF4X2NbB0FTpVJVYwpVMTTXtZJqU7qu25csml6t6HwtDL4YevN06tT3qbcVK0ox1snyvRtX6vVaeZoftff8F3v2yP+ChP7PviH9mX4o+FPgr4f8HeKtR0DWb7UPAvh3XtI1vULnw1qcWr6daQ3994l1KySM39vbzTQS2xa5EIRCj7WKw1Kg3JUKDhVqwnTvUxVarBxlulCtKSjLRcvvPW70uy68qtFxdasqlO6aUaMKTjZreUXeSbu2ntfZn883xHMllpA+1W0trqB1qbTb6GRCqxvCG1JJGjbBUzTXLPARlJEMoGCoA8rExVK0bcsk5RdrXUo2Wvdpre+9+52UKqqP3dFUjzJpK1mr6X6Weh93\/BvT5\/2+de0nQrnwZ8M\/CNn8Avg9ofiT4tfGz4l\/EPxj4U8O23hPwJYWmgXWueLZfDKXmpTnX719J0xl0rTbjU4rOz0mw0250WCxvby+9\/BTXEFSNCthsHTjgsNGvWxFbF18PFU6CSc5ulDmcXFawjK+72evj5jRq5b\/tWGxmKpzxEvYOhTo4bEe0nU\/wCfUcTTqKNSKjdS1Wvw9T6f+OH\/AAUH\/b8\/4J96Bpn7L\/7PXxD+CHwP+Cnjzwfo\/wAYfBXib9lHwy\/lfEvwx4ms7zSrPxfd+P8A4nTeMPibca7Imnz2U+pahrFvrsB0u0WC8itrTT1hnOq2Ly6rQw6hlyw88PKtgq2Ei6qlh6+8lUqv2jbTUW5pSat0VjPJMtw1quKqVMbisdiqzjiqmYVIyqQdHSFL2dKFOjSjBX5adKCjZtu7k5P8UbHxrrPifX9c1rxFrWqa7q3izULxtd1jXL651HVdT1fWN13d6lqOo3ss11e3l7rWbi6vrqeaeeSe4mmleWRy3j4XFS+sylrJVlyTva8m03d99U2uzskrHuYik4U0owcnFxio007qCetlpolfRa67btf0Cf8ABWW0+AOifDn9nTUvgh4I+Avw6\/4TN9cvbjwz8NfD\/wAMP+E3v\/DUHh7wY3h\/xnrHjL4Y+NPEFtrXgzxLe6zrNjo+m+KtC8PeJrfW9A1u5urZIFgB+glUag4q8eaMY9OujXdLXzvvru\/HXPJ1JSjNKHM7zTTtrayeujej0+8+Qf2SP2g\/DP7Nvxq8OePtU+FnhP4qX1h4p8OPHeeI7zxNC3h3RE1OCbxHc+EbLQ9f8GSReMprQNaaZr+ratLp+lTWwltLKZLlrxe+vS9tTlTjJwvScLq3xctk3dP3W\/iVr2+554SSpzg+WLk5qSk1eySTj90lfsfqb\/wcXeN\/CEviP4E+LPhjq\/2G+vPh8ujeINK0XT\/DcOh6d4Rk1fX9FbRLo6Lq2qCG4tPEh8VWUmnGW8i0wabpokuf+EgOtCD5ylPE4bLqs1UnCMcTK6WvtFNpS5b7JvS+nXyZ6dWFGpj6cpRjPmpz95WclZPl17rVq2z1v3\/KH9jvx18RPg14d+HH7UuieCrrXfCXwi\/aG8Oz3lzrEN9\/wgniTW9Qgi8V6R4N1ZlaG3vJLzRfAGtT3MNq0k1ra3Ylu44jcWBk78A4yozpKpGNWr70ItNyUY39+1rNJ3Vr7q212YY3DzqOpLkXs1FR5o6qNkopStrFu2ztfXV3SP0E\/as+E3gv9rX\/AIJvXvxV8BafeaX8TP2XPib8QPihqXhuJhdxy\/Dz4vXXhSfxfpcbiGD7SfDOg2Pg3XrXU3SERaT4X8RRtbq13H5PyOfVnheJ6PtZqeHxeBw9CnHkUOSUHUjOo0nypSrOXwtvRPofXZFg6OK4QrSoOMcVlePxFepBJzlWpVvZqcpRerUXTe17Ra6H5FeGP2uvGXhjw34e8NQaXPPD4e0PSdDhmWS32zRaTYW9hHKu+3dsSJbhxuZmwfmYnJPztXhdTq1JradSc1ZSatKTejau1rofSYfjTFUaFCknZUqNOml2UIRil8XRKx85eF\/h98UPEtjr3i7wX4H8Qavo3hywkuvFPiTRfDviC+0LRtJMck08niO7s9P1HSbWyENvNPK+qSQQJFbyztJGsLyJ9xSw9ZPmoNuS93l5ebm292yT32tu77H5+50XpNwkmnaLkk790rptroup9peA\/wBgL9tTVLLT9ctP2VPiboWjanc6fbReI\/EvhTX\/AIfeG5JdWB\/s+RNR8S6lploIboj\/AEa4a3S3d3jjR1aaJG9PC4DGVlKawkOWP2lTlGzaUr3V7PW\/nezvc8TFYnDNzdTEVbr4aUZOPwuySei6F\/8AaX\/YP+J\/gG30mw+I3inw9YeNE+GPiv4oah4NS68T6prcej6IfF+iaLbw6pP4Ms\/Ds95b+M\/Buo+GdU01fFl\/clb211Dw+NQ0+SS5Tyc+xOGy+lClWrwjipujJUHGS9pTq1VCU6U3ZS5FzudrtcuvW3vZFgsTi6X1mNH2mESqpV043p1KdJ1IwqRV53m+SKfVu6vez8q\/4JheLdFg+Kfxn+FGveJdA8NWX7RX7M3xe+C2nXninVrXRdEm8W67pVnqfgqxu9Rv5IrO0lvfEWkWltayXMsUZmljjDq8gFaZJXjTxGJpSmoRxmBq0Iyk1GEpT1pqUnpyt2d09fS7M8yp+0p06kqbk6FWE4xs+snGbdrP3Y79tb2uegf8FJ9EtPAXgP8AYU+H+veKvBHiL41\/Cv8AZ41bwT8UtD8C+J9M8aad4c0218d65eeA7HUfEWgT3mi3GoXOhahdG8sbW9mnsnTLjy5raabszxWw+U0pVKc8VQwtSjWp03Gbio1ZTptyi3F+7LRxtdOzV0Y4JKdTG1OSVOlOtCVNSVve9moVHr0lyxcXromrn5hpcN9niiQwrFDDHNbGC3t7aaMyTyySC5lhhhnubiOWU4mu2llVNkcbrAsaL85Gc+a8m3ySXLfye3fotztk7xi27yd+Z+miv8v8uh1miar5t5YPdvCCL6yeaSJHVvK+1RtcZUHaCY1ZiFAXJB4XAr0cPiJTmnUlaKcdL6y1Vlr2aXT8jOcVKMoyV009O\/b8T6Ch1a0N7P8A2fk2rTzvZm5k82aO2aVmiMpRIFedItiyyrHbpvUusaLgH6dV4N80ZWc++ifXTbXT81boeRUpxhBtR5XHdaX7Wej6\/nbTZdb46v8AUNR+HJv21O8uptJ1jSp\/38j3y+VJe3Eq280UxkSeOa+vpbuW2CtCrzT3EkUjzOZM8ybeDnOPuuDi425WuZ3s0nFq6equmr2umZYSbhjoRTT0lZyf8q5uu19n5H9CXhHS9X+J\/wDwRz+Pmq694i1PxRP4Tt\/B\/iLwxBdSGXSvCVv4c+IfhS2\/sjwxo6qmn+HLT+yL3WrcW+kWtu2ozalcS3IuLq5mMn5PleY4unxbh54rF18TVlKpRnzyU5RpxpynGMYRjFRi2ldKKtfvq\/3HH5dgVwLiamGw9Gl7RUcZGVOFOHLPnpwUpTUOaUlTd3zTa6rTQ1P2S\/hx8R\/hN4K0W38beEJPD+nfGD4cHxnpUPiiz1Oz0f4mfDi706Twrr3hLxJY3MXn29oltp19ayxyaQt9BFfQ6pajUPD+v6Vd3v67m3C1HPMsr1vZ1MJmWChHF4Wo6ajOrRpw9pUoyUpU3KM0nOFk2uWTWzPxPIeKpZTmkIUeTGZbjq0sDjqSV4U6lR+xVRSWl1O0Yq7UuttD27Wv+Def9l2+1jVr3Sfi\/wCLtI0u81O\/utN0mDxV4duYdL0+4upZrPTobnUdAbULiKytnjto575mvJUiEl0xnZyfl6OKyCpSpTrfW4Vp04TqxTuo1JRTnFPqoybSfW1z6vFcOcSrE4hUKVaVFV6qoySVpUlUkqbWmzhZo\/of+Ef7LnwP+FPgnVPAfgb4d+D9F8E+ITeya34b\/sjT7\/RdXh1GxGm3dpqdjqFrdx6lp9xp26yk067aSxa1eaEQhZpzJ\/RX9nZdNOEKFFQleMoRXKmmtUkrW07W6d0fzxLFY+c4yeJqJx2badt\/K61tax9TzKviArH4puU8Q2s5t7e4tL+ysZrOS3spNlvB9llgliaOIwxyRJKZFiZEaMLtVqyll2GweErUcHhKVGmoymkuZpzaV3q3Jtv1uzKvicZWqxdTEVar5oJy5mm42UbaW2Wiem107n46f8F5PgTpdp8PvhF8bPhp4a0jSPHl9Z+LvhVrfiGDSL+SO3sX0p\/EHgvVdZk03TryJrHw5qkWtGQXBhNympR25laO0gjg\/nTjTI8yzfFYerQUJPB14uopVFTtRqSfuxu1onFu1rq6e97\/ALjwDnVDAYHGYSrVcIVoRnQU3Kc5Yle5GMFJuV6jcY9lLlWjlG\/8VP7Of\/BNSw8dWuo+LfiV4tM3hm7isG8P23hG\/MOqlZroSX+oapcaxo1tCxa1QLZWlrHLE7Xhnnvwtshuvp8i4Tnj6Mq2KrQjBwpxoQptuS5VaTm9Oa61TW+j0uzxc44ohha9OjCDqSk6zq1G2nNKUuVxunafNdSvpbsz6J07\/gjjp3j74taJcfC7xRqM\/wAF0vo4vEej+Jtcjh+Islut7dGT+xdW0rwpNoBu7jTHs4oWvbOGG31OOZ5PPs5VSL2K\/AlNYqFWliHLBqn+8hOo4YrmtZqNTlqLlbSsrX2d1y2PJocXN0p0qlBvFylL2U4tey5bpRlOLXM5K7X\/AADw39uf\/gm3B+zN8StH+FXgvVtc1X7V4S0jxzo+u+OLiys31fw94k1G\/wBKNnHqdjZ2OkSHQNa06e1Z0tIpZ5bydppEjt1RPmsfkcaFapGgqsoU2ubnacnzNWSSV3bZyst76Lb6HCZoqtGlUqxSlJS5+TWKatZxXxa6tptq+i0Pgfxh8GPHvwT8V6Pp\/wARvDOoWBngv9Y091Ftf6Xq2maSkkV9fW89pNOJILaRomuophDd20bxSTW0YliLcVSlSwFWmsXTnTTla1ne7Tdtfd6915O9j0I1IYmm\/Yy5no2k7SWq0a3T+77j6h\/Z5\/ZI\/aD\/AGq9Yv8ASvgB8OE8X3Vp4bn8Y3yjxN4R8P28GhRavY6VJNHN4l1\/SoyY9R1S2gSynnhuFIlKRSG0mMfq4eMMfW9lgKcqtWMfauMYe9GDajzSaXLu0t9L6nBiatLDwl9alGEedwvUk4LRN76XvZ66n3n8E\/2Gv2p\/gV8RvDniv44\/AfxFoXw68FeLbGz8R69rkXhbWPBN7ea1aQaTZQWt\/Y61q2neJbae78Radp4n0pNQsYNUmktpJ4rvTb2C3+jwNLEYfF0KeLwc6UVNxvXhaNROK2vpdWurax30PnsdiKOIpYl4HEUqlR05aU6q9okot3jreOu7T2012P65fhJ+znf\/ALPf7PXxO8aaR4X8P6f4c8b65pXxO8QeF9bbQDD4Ct7m98Fz2KW3gCaydprDxB4gsNauo7iSSBNB8QajZWcemI+jXwj8rCcP8KVuOZY2jm9SljsPjqdZZdHAU3gqtWVF\/WqSx05rknRc6ahCFKoqk6s480XC6tcb8TYjhKvw\/DKaNfJ40KmExObvF4iGYUcVCtSlScML7OWHqYVwclOp7alOm6KfLNTsY\/x30a0+Nf7O2meLLWJ7nxX8KfENu+jaxB++1K28O\/EO8sfCHiizWTaQbWa8u\/D+u3SsPJV9BjkaLajAfrmY4OF4Vk7VJ062GdSyThKtGcIzsvdk405S6crcrvW1vhMFVlh8Qqcajq01WpVp03pCpGlV9oo3VmnOUY++nzK109Wni6J8AfBY0bSBdWmp3V0NMsBc3V5rmszXdzOLWLzri6lM7GW5mk3STyFmLyszFjnNflU+B8oU5JutUalJObqtObTd5tRmopy3aikk3ZKx+3\/8RSz5\/BgsFCH2Ie8+SP2Y3km3yqyu227ats\/QvSvGMEVjBiyuogkCb5LhlQFAMoxO4lmAfkvhgCV6DA\/SVikpRcYuNmtpW21vpb5+R+MQwUrp3jUi5KDUb6N2d23orejtrumb+i+P9NvbiO2SaDc0hDBZUaRAHZchMd+RjaOpJzjcZqZhVqvli2km7+9e\/bRW8\/l6M1qYJwi5xppSukndN+fRPW2+34HwT\/wXI+yt\/wAE8p9anubhrvwh8TNBu9Jlikv1tbu18S+GfF\/hq6sdRezuoo4Xszq0eoaW96stidVs7BDa3F01vj8T8WqVWhgMLjsNCrUqVs0wGGlGlKrCVN4uo8LUrxhQnTVVRhUclGtzwVWMajXNFM\/ob6Oyw1biTOsHjqmDpYaPCmdY2ccf9U5K1bK1RzPBYeFTFxlOmq+OwmHo1JYRwrypzlHm5HOM\/wCWP4e+Obbwz4K0eKRrg2IhWCW6+2vNMkksZTNwr8zYeSEeYhLDegZFRSy\/ZZdinhsPTpwU4KycZSdnGDjGyfV2Stul0SR+T47CRxeKqVZ8k51JTk\/tLmnJzmo3Vlq9UknfbU\/QX9krx5b2WqFnZL6xuLyO4jE11dW0cschjkCteWMjzwqxdlEyW9yyum3aPlB+gwmL9qpN1JTezTk7Ly3fa76fM8HEYGFOsm6bhaNlbTX13tppY9P\/AOCiHw4i8V+Mv2SPijo6LDBNb+PvAGtK01pfIrwLpvjnwxbwahG6G7hkay8Quq3GmWVxNHb3q3BeYzJF59alz5ph4\/Zqxalo2rxtO8ls7uy11\/A7aWJ9ll+I5nZx5ZQcbp2u4vVWavo21bbc57wt8Mfgt8Sn\/sH4rfDfwh4og+y3cWnQ6tpNreW6XFzZeTeKhaFpIlu4gEEKSIszpHHMXiCIv0U8ry3Hx9nj8Nh61OC5k6lPmalvzJRcW22km29NPR+FTzHH0ZylgsbiIOd+ZRmtV2XMpa9W5qT+Z+ynwn+EP7N3wC8rRPgh8I\/AHg651mG2N0vhfw1pmhpOqxRCNtTvbWzFzdIgUtHbK1wgcs3loztNXflWWZdgeaWBwNGlGb5eaEUm18V7yTaTt8N279b6PmxuZ43Fe7jsXiKqj7vI53V7WvKMbRb0tflt5I+lPjNrN34U+Dt341bSvDPiaXwPb+IfGsOh+I9LuZvDk994P8AeMvFGlJeWFtdW08lnBqWl2dw7JqH2kSwxyW72zRqy+dxTCc4YWnGr7N1Kjj7ZxU3Bzi4c0U3q0ntone2t2b8POh9eqVaqk4QpNuhTl7OdSEdai9ok+WLinze673a16\/Nl98R\/FnxW\/Y08YXfiq6uNR8bt+z34g8bSa9NYaXcQW91441\/4meIp5b+a3vbSbQtF1N\/h74bhtbS5muI5n0GW0gt7V7Lw9b3X57WoYTKcfRxcpwnXweO9n7Z+7W9jTp4NOpKMYqMoxl7SClF6QjFO+rX1vtni44rB4TA1sFhM1d4YbDr2+HoRnNQSVWdpc0VZzlNXvdXSR80\/sjfF\/T9V+F3iPRNWvtMurTxV4H1pdEkGrWN1YXGpW+mzXljFNJbSiW1CX8Fqk6XVvbXNq26OaGOcFF\/V6uLpVMHBqcZxlGlOElUVR2Ud20tOZSWr37dV8VTw1WninB0nGUJTg03r7jaSb5Ut\/K2h7JZeJfD4s7QP4t8EQuLaDfFefETwtYXkTeUm6O6sZ9ajns7lDlZ7SaOOW3lDQyIroyj5l4mKbTlRum1\/GXT\/ALdPpoYefJG82nyxuuWWjsrr5C\/FjU9St\/DVwbfUL2A+UeYbueI\/6r\/YkWqxDfLFXduZfmhUYxVOTUUnd7Jdkct8Cr69ku7dpLy6kbKfM9xK552seWcnkkk+pJPUmoh8K+f5siey9f0Zt\/8ABZKaYf8ABLX4wsJZA3\/CR\/CsZDsDj\/hNtHbGc5xuVWx\/eVT1AI+a41\/5EsPKtgmvJrHU7P11ep9DwhKUeI6SjKUU8DjLpNpP\/Yaj1s9dT+PiZ3HwrunDMHWRSrhiGUi1mYFWzkENHGwweCiHqq4mh\/utP\/BH8x4n4oes\/wD0qZ9L\/sXanqT+H9MlfUL55DCuZGu7hnOBAwy5kLHDMxGTwSSOSa9LKfgq\/wCN\/oeTmX8d+kP\/AEln6nftJATfDb4A3MwEtxD8ZZY4riQB5okn+GfieSdI5WzIiTSRxySqrASOiM4ZlUjuX\/Ixwj63qL5ez29DzK\/+5Yv\/AAw\/NmB8PwG1iEsASJ1IJGcEByCM9CDyCORX0J4WD\/3j\/tx\/qforoeoX5+KXhu3N9eGCQFZITczGF1jjh8tXj37GEeTsDKQmTtxmvfppLD4dJWXLN2WivzR1stL+ZxVPiqvr7WSv1tbb08j7C\/alnmj\/AGTPie8c0sbjwP4wjDpI6sI5vAPiqGaPcpB2SxSPFImdskbujAqxB+a4hS9ll+n\/ADFU\/wD04zuyH\/e8R\/2B1T+Vz9rDxt4z0T4M2PhrRvF3ifSPDniP4Z\/DJvEPh\/TNf1Ww0TXmsvGvxkvLNtZ0q0u4rDVGtLuGG6tTfW85t7mKKeIpLGrD8t4zb+uxV3b6pR0u7a1NdPM\/UODYxlhcRJxTksS0m0m0uS9k3qtdfU+mP+CfCq3w9+HgZVYXOmac9wGAIuHvbW6kvHmBz5rXcjvJctJuM7uzSl2Yk\/oGUf8AIpw3nh6Lfm\/ZU3f1u2\/VtnyOZt\/2rW1f8Sp\/6Wd18TtJ0pfiT8QlXTNPCjxx4sAAsrYAAa9qAAAEeAAOABwBXyuI\/wB4r\/8AX6r\/AOlyPqKEpOjRvJ\/wqfV\/yI\/\/2Q==","a_rank":"3","a_hot_flg":"0","a_views":"938","a_active_users":"888"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F9999%2F9b3eb18e373445d1aac02b7645b79ab1","a_title":"\u3082\u306e\u307e\u306d\u30bf\u30ec\u30f3\u30c8 \u89e3\u96c7\u3067\u8eca\u4e2d\u751f\u6d3b\u306b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 01:41:54","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AOotb2G7QR3UYhuVO1pJB8zcY+dfmBOQMOACOmepr\/Rv2c6PVuP\/AJLr5bp\/P\/I\/nKrKNTpyy00Um7peTX69C8FmhfynQ3UD5Jw53IoH3on5DADkg9+BjqLTbfNF2e2quvPS61+ZwzUk7Sba6O92v1dtdPP0JY7FQQ9vJGyOMlM5dWBycrgYYZwTjpg45zW6np70XF9t\/n6Pc4qkU78r5133Sl1805aJ\/LobVmQStvccq3CsOmeeC2Sc8Z\/u89qd4x9+ne6bvzdnbZK39X8jmqtVHCnUuppXTj8M1rtvZWT9bdNjUOnNCeAGXqDn2JGSDnoPfP41106qklqtNGrWfTZdlf1smebLni5J2912\/L+um\/3benr8yKPQjA4A4245PUcce+K3M5Svq+i6eWp3Gnp93PPA65xk59Mdcc8e1S5Jb3OOVRatdXpdHZ2KZCgDuCc5J5wc59ePzxxzUOV00+trf1f\/ADKTUl91\/VWZ2lllcHjg5z3JwpPsfp6d\/SDePK7tNN9bd9e+3p6HV2LGQKNpI7d+mCCSByemPc+9KWz6dPv0G2km3okm\/uMTwb8W\/h54v8aa78PfDvia21Hxb4Yt7q71bTI7e9QR29hfxaVqMsF5LbrY3n2DVJU0+9S3uXlt7lxG6ADcfm8NnuU47McVleExca2NwkXPEUoxnaCU3CSVTkVNyjJNSipcy7M9irlOY4XBUMwxGHlTwmJko0ajcbu8eaLcU+ZKUdYu1rb2PaggAH7yMcD+6cfj3r1TgPx6guLa+SPedsiqCHUBXTnqc\/eOSM8H9KpRdNXWvrd2v93b8T6lzhJ6Xv106K5sW889nlJXM9sRkOAcYPIPHzK3bPAxjORzVezjJ80FaTbTXTprtu\/V\/LYxnNqHLKyvK\/y+9\/d2XoaNnHbzSRva745WbJ3klDnB\/e47kngjHUg9aqSkk1OyVul77\/M5ny2dm7\/15f8AB\/E6qG3WRyrRqkinBhOckgD54ycZ\/PAPrWesH5\/1\/wAOc9WKlo+3zTu7NeaOjs42TEU6FozwrHIIIwOcdO3J69eR0vn5WpxbUktN1vo7\/Jvqcs3HlcKqu7e618Vltr0u1r5duuguntG4ZFBU9l68+vfv7nsPWuyNdTW\/vbbaXsm3r8zzJxevktV6b\/p9x1GnwSNtBBAGR0zn1A5Hf06Zz2pPVt9zjerfqzt9PgKgHBwDgevUHj1PY8HjB96BHW2UTMwULwMnpx3GeOvA6c46Um0ld9P8y4uUVdW0d\/PXT7j5j\/aa\/bD8Bfs36RLpqPD4i+Il7CiaV4YtXExtZ7kxpbXGsLFKkscbNNHIlkrxTTI0ZmnsbeeO7PwXGHHGX8NUvYxlTxeaVEvq+EpzUnBy1UsQk3yRSSbg2p6q8UpJv6zhvhfGZ\/U553w+ATvPEtNKfLJqpCnfra6UrNJ\/Ddan5s\/CH9o3416J4k1P4m6Wvhe+13xN418Tr4x0BTpmnaprlodFsdT0Wx0vZ5NtNqRvbSS2vtKFrcXxGoteWumpcWVxcWn4TT4nz3BZnVznD1adLEYurU+uRVGHssRG0KkaNWMafJeU5NczcZtttO9z9Xr5NlGJwUMsrKtKnh6VJ4aXtZOdNqU4TlBymp6ws\/tWSaslc+tV\/wCCsPgC3VbfVPh\/4ytdSgUQ6jbf2ROv2e+iGy7g2rczKvk3CyR7VmlA24Esg+Y\/ZR8ZcSopTyCPOklO2MmlzW96yeEk0r3snKVlpzPc+cl4crmly5nFxu+VulBtxvo2763XU5e28yPaYyQV55756+nTp7V\/QLimrdOltP61\/rS58RKb+y2vNb\/j0+R1mn3m4eTOMK+Pm5Ib6gDAGSBgVEoNy5l2t0tv+fr2+QRxCqR95t2fxuy17W+b2OssrN1VJoJQiK4Yx55Kj+43BwfT9OKT5XL3ldWs\/VPd2\/rb5S5y6O2lrJK34pv8babHbaf9mvjkkrOCMbwQSQAMqRjYc9RypIJJArB89N25dHrfdK+lr3XbsLnhNXUrtabWvbV6W8zp4LdlJSdSCekgHytwMBjjIbBxke4BPOJV1eSto9vXy7a9zlrqD3vzWVl0au9\/xOitLbYVWRcrgYwCxIPA5PbnrnpmqlLVNPvddPu\/y7I5JP3XF7vt289Xrv1Z0tvp+0iZVJQ8AgdDgZUAdzyTx0565NbwqqT5evTR62V29W\/8+5wVIcrb6b+er9LdjoLSADacdATg9vqOcAA555GM8VrdK7bSSTbbdlp5mTdtfyTb+SWrfZLV9D89f2q\/27rP4eW+o\/D74LSWXiHx20c9tqfiVZYn0PwuFgdp5UuSTayXFqpRri7mdbe2M0CQebJM91p\/5Bxt4iQwPtMr4fcMVj3+7r4xNSoYRvdU5Rk\/aVY3XvK8ISbSu0mfo\/CvBM8c6ePzZToYO3tKWHceWriUvhUoSWlKdpPSV3Fapan4o+L\/ABZK1zP4r8Ta3eaxrus3Ul1NqsjzSavqU9zaaG96uiSTCR9Msru6gNzNeT2v9tyXMkjWFu8d1dXjfiihUq1Z4vHTlXxU6r9pOc5Tk5zjBucnNuWrWqb5n1vZn6koRUI4bBU1h6FKKUYxioKKV2urXl7umiVu\/wBXfAS0vtd8LNHDZ6w0M+veCbi60e00TS9St5tL1iyK3VvNY31yl1Jp9r5EvmeJbDUBr3h+dL3VvMu7ezuY5OqtdunzKVvrEHb2lONuZU2404Sco1I3TahOzjdycrJpcU1JX1u\/ZzfNGm5K6nU96UlJShJJKN4NaWVrtHo0fj3V7WNLZ\/AXxbhe3RYHhtp\/FDW0TQqI2it2i0LUomgjKlIjFqN\/GYwpS9ulxPJ9A+HoNt+3qxvryyyyrKSvrZypzcG1s3B8jesdLHhf21JaKrQSWllmmFilb+7UtUj6TSmtpJSufXcNs2QcE8A8dOMdOh\/z0r+oofEvn+R+Xe3n2j9z\/wAzWhgIYfKScDP8j\/icf0zUnPJtK67\/AOZ09g0iBR1AYcYIAOR0z0wBjp9O1BHtJeX4\/wCZ3+mCG5+YnbMFG1o1Ayf9oZxxyD2UfNyQc5yTinZOSer11v67JbdH18ipTUmpPSSjZJLTr6vrvfsd3YZT91dIpXjEnJBGMEKQOh64\/LBJrBxad4+ej8\/u\/pL5aPEOUbSS6LRO+mqd2\/617nTW0BVlzmWEnKEDLD057gdx1AOCOprK92\/V39epjO99bdbenmdFJf2Giadd6rq97a2GlWMLXV5fXsscFpbwRqS8ss0jKsYUcYOSWIVdzkA44jE0cJRqYjEVYUKNGDnUq1JqEYQjvJybS0XzfRMKdCpiJwo0ac6tSrJQp06cXKc5Nq0YxSbb+W12fj\/+1N+2vrHjybVvhv8ABaa90bwlGHtPEPjlUMV5rhM8ENzpWjQ5WYQzQSTb0DW4C+W+rXFraXE8Vt+FcU+I2IzmVbKsinKhlrvTr5hByVbFK\/Ly0\/dvSoy5m5SXvTSi5NJJL9WyHgejllOGZZsoV8a5c1DAv3oYd3V5VW+VTqwaTVk4J6Wkld\/lXrGoLonhuVrFrTUJYNZe2nur3UIL101GeL7VNqOoySky6vqALIxuVgk0rz5oUtLS6mMGo1+eQoxpRSg3KU\/tPWU2pN811b3paNvrsvL7acp4iV2mlHWMYxaSTSsk\/hUbN2vbvdX15fxU1ze+H\/Ct\/c\/bpbmaPVZZb19JNhNdPJa6K0ztrEkk0xTbHm6upS15FGsVlCDNBKa7lTailNTfuwbhKPLa6WvNe3LdXbbUm7RUbqVsopU5v4NXqlNzu9bJ0\/Z2k79E+VP3tUj7V\/Z4vtPt\/B2pTSv4EWO3uPhtqyjWrvxJaWynTor+2huBrVnItv4f1QywIdK1a7kXRY7a1k\/tmNYtUVZViVFQn8DalSm3GlKcbxpRd5SvJ0\/h0qRuoqNmmnI5Zybqc3LU1c4xUqkYNJybdoxUYzXNKTdOVk7tqUeXTA1fxTpOk6tqmlNp\/h2JtM1G908xJ4v8daYkZsrmW2Maabb33kaeqGPatlD+5tABBH8ka19RConCD9vQV4x0+sVlbRaW5dPToeBKC5pa1l7z0+qYKVtf5pe9L1lq93qfsBbWCsApUcAkZA56kgd+O3Qdsda\/pk\/InKLW7+7+tjTTS+QwQdMZAPT8B\/F+mBgnsGZo2+mtx8h9CRnAHXk9e\/t1680GVSTi00r2XfSzdtVv8\/JXR0+n2DxMpXgk43DOcdcEE4Iznk4Htgchz+0le6bWlt7\/ANf8A9G0uLzAI5VDrxkY6kYA288EdxnHOeKwqKzuu17aW1evba2htCrd2lZaab6vr5ei7mj4V8R+HPEEl7F4f1S21VdPuJLe9SDzAI2ilkgZ4y8SLcWxngmijvbR5rWR4nEU0gU48jB5tlmZVsVh8HjcPiMRg5uniKVKonKEk7bfbTaaUoOUW1a\/f1cXgMwwFHD1cXhqtHD4yEalGrOL5JXXMk5K\/LNpXcJcskk21Y\/Ov9vj4kaD4pg0P4b+E\/FL39hokus3fxIstOv\/ALHoccki6XFplhrWtRSLCDZourtfW9q0s1ulw0MnkObg2\/4t4pZ3hczeDyXB4yclha9WrmFOjUtRlO1NUqNWcJNSmlz88FpFStKXNZL9M4AyqvgI4vNcZhFavClDAutF+2p8s5OdSEWlJKd4qMvd0V0mflPd3ry6l4o0q1hsbbT9O8OX7mRpLgybkt7e6hjjudME8Wn2aieV1RnihuZlmur9L5klmf8AK4WjH2d3T5Pdbs3FvnaSTjzcu1+aTskl10P0OUdIyblUctWpSSkrrVy5ruV3dS5Vfd3VrnFr4dn1HwLDb2dtePczeMFSCOLTrCBZpZdOwBb3t05vIXKEs0+o\/vEheSdgLi9tQvRSqSpRhf2jj73I0ly8zk9+ZqUeWNlqrK7WjMKtJe0lJ8nLFPmg3PTlSSg+V2m97RSd7Wur3Omk8CxWun+HrDWtJmv7\/SDPK2g6ZNcXkdxcfZjIBrl5qLLZ6VZWSo2+7v7J\/wDSS91PbRm6D2\/b9YjFVFaNWU3SSUZOzvTi7zn70fiTbUWry1S1TXnqTk7Ko6MWp3nKmlJxjKyVOKbkr82vM7p6a6o+lvg3frbWnju2N1NbQp4DtL2SLwv4T0\/xlo9jDD4lTTZA9lrVy0Pi+xihaSTxJaXEd4I9N0+WfTUvt8EQ1qutUi4tVVPkjLkpv2cUo+0SUKk5NVIpRvOm1eS92N21bmlCCUeVxdqjUXVjzzmk483tIxuoOcm1Caa5VeUrRufQ+oeH9J1O\/vtSh0n4U3kOoXlzfRXl7J8RIby6ju5nuEubuK31mCCK5nWQSzxwQQwpK7rHFGgVBccXmnKuV13Gy5X7OGqto\/h6o8upTwXtKnP7FS558ydatdS5nzJ2TWjvs2uzZ96RaU2AMcY4bBwOBwRn9c9+2a\/rdVYpJK3no+\/+Vj8Xdr6O6\/ryRs2mmgZDqemcckeh4IwP8Mdeapzb8vS9\/wAyJSS9exqW9vZfaRarLE1xkAxBkMiP5fnLG6g7lleANPGjgM8SO65RSRzfWqHtXQ9vTdZWvTVROaum4ppNtXSbSerV2roh4fEzpe2cJ8l+VPlai0m1dNLlaUk03fdava8viPV\/Dngfw5q\/i7xXqlrovh7QbOW\/1XUrwssFrbR4UHYivJLLJI0cFvbwxyXNzcyQ29vFLPLHGzxGPw+EoVcViasKOHoU3Uq1KjcYwjFXbbfV7JWvdpakYXC1sbiKWFw9OdWtWmoU6cI80pSfTdWXVvWyT0Pzw8ff8FC\/B974N8aW3hLwP4uittQ0XXtI0DxLrUQ020vb2fS7yEXFvFAtwYjACLyNHuxMY4h5kcBLNH+Q574q0ZYfE0Mqy91Y1k6FPF4isqaUZtQqVVRpwnK8YSk4KU4tys3FLR\/puU+HkoYihVzHMaUalGUa8sJQpqo3Kk+eMZVpzjFLniua1KStdJ8zR+feg\/tJ+PPh5omoeGvCeoavb2Fxp9v4Wvzossr311bL\/Z1ktpanYy6YJrnS5WuNTtEn1Ca2ee1gFvDJc3LfhTz7GZXHFxwNSUKtePsKlWE4xrSpVXBypxq+86cZzpJ1FG0pK8W0pH68sowuZfVHjacZ06VRVoQmlOnGpG8ed027Tko1LQ5nZPllZuNzN1WTX9M0y3upLi0j1a610hLONNNvLfQ2kihZmhuJL64\/s7UBe3EwvJr2zudQGoxtKFudSNlqEfNlksRiHWrYupH6xOVlTl8NJRdo0pRkoKnUe95R6q7vt042FCm6VPCRl7CCs5S+KaTau3B3qU2tEnPRbaaOxY+Gr\/U9d8QalPLcWFlrunXen2kqanE9zfPcW9p58mmWmlRG11YAWkmGKmOR0inHkWP2dJ\/UelFe0SalK\/M2nNtczUYqCakmpWctrPddOF1INz9lbmgr8sYN01d8ururcrfw7p6a2bfVSXWg+B9CYyWY0do5Y4Y7eC5WTxDqUt1DNGJr3UX82HTJ7iSOeN7aI6lrimF7ScXEEv7vkadSMlKHsItLV61ZxUublcraKb+xB301b65qE6s3LmnVs2nG1oRko2c43u4pJPWTVk7WsmcZ8Q9Va+8IaRKlxe+HrXU7u1STSG0qRLjZGmrC2jQtPJdajdXa2qXWdThmXTLcwOsKvNJFbdVKcqEGqTmqajFxh7Nykm1JtRWrcr+7Kbtypq9ne2P1eFV3cYzlB1GpKslTacrrmlZL3bWlGLbeiV1v7p+ypa6hZhymm\/Em\/wDN8F+IY4LPRNUuYdRaa18U\/wBsRPpF3aT+bD4ruViW6MMNxbBtN0+K0SWGMmWz9K0cTTUOS0ZU6f8AHr8sVJ1Kkvdl73JNuUZPVJWinZM86vaMpSU0kpu7oUnzW5IqTUZJOUU04paN62u7p\/a+j+FdF1nSdL1i6s9Zu7nVtOstSuLrXbjU9K1y5nvraK6luNZ0y3vLqDTdVmklaTUbCC6uYbO7aa3juJkjWRohiKyjFctd2ilf2ktbJa6O2vlp2MXRlJuS+rpSbaXsG7J6pX5Xf1u7n3sujlVztznoexI\/L3+nfNf1smnsfgR88\/tJfGaP4EeCbe\/sbAar4v8AE11No\/hLT5VY2iXqQq9xqmo7D5h0\/TBNbtPHF80ss1skr21o11e23yvF\/E\/+rWXRq0qftsdjHOhgaT1gqsYxcqtXW\/s6SnF8vK+aTS2Ure\/w3kSzvHSpVavscJhoKviqjf7x0+ZRVKlolzzejbkuWN2k2fkNP40+MnhLxC\/xAuNeudRvdUeyk1Cd\/Hut+H7iG7Gj30+qXd5a6jBaeEb69g13xDPFpVhZT6dYyx2GmQ6mrw2Jtrb+YsZmGbU8dPM6mPr\/AFzESVWpiKOKnSrOo7pqo4KFnG7jFRaXs+VJODV\/3KhhcpqYeOBWGpOnShKjGnLDxqU1G8FFKTd+VwjzNTbfNzNNybu3xj+0n8YPiR4H8P8Aw6+KGt2uo+HJdW8PXV9qmveHF8N6j4h1t11m6tbZtV0vVdT8J6t4bsLf7Lb6y2mTPc2OvQ2rzQBbuEW2WbcecSVsoxGDxWOq4vCLlm6dWEKlWThzKC9olzSjeXNyv4pJN3aR05dwfkNDHwx2EwlLD4p80YzoykqdpJRbdObajK102mlayt3+f\/FjaLZalN4X0jxDpevfYtNsk1GTQ3sG0yC9vb7T7FYI59PtNMjurq5jnu7u8W3ju4A9s3k28Ee6W3+W4fzLHY+q5YmE4UFCVSnGouRpRum3C6drtbr0vuvoc5y3DYSjTVKrGdebjCo6afuwbbUXN2Ta5XKyur7PUqeDrSTVYbXUINJS5vLLXdMvbqWaLT7uN0\/tK51U3cgv7qxbT4IEa0t5bq2uFZCC7ia3kvYW6eepKtD2cFOr7em3opNqElUTafux5bOzdlY5ZRhTpyjVqezpujKKV9ueLg7ct2+a9tbpO1lofUnxe+Mniv40eN\/DfjbxzZeDodSit9O0vTrrT9Nl0+yks7fUrx7G6s7KZ01PxBr94NREQ1K8uNO8OWbLBbWiahHKUm++zHO8wzjEyxuMhhY4j2FKhelQpUrQpqTm7puMqktpTle\/NeOyt8tluAwWUUFhsJOt7J1alX2dWrKtOU6lru8ryjTjyrlhFXXvcyuzzrT\/ABQ15c+LbnS7fULC60W1lgutdkto9Tv5DarfWyo9mksBttItpITFZafo1vZ2RuZrK2V720MlyvlyiuWL5asedqLndc3K4u11ZKUG2vhatKzd0tfUbdR+46VRxtelFz5U+bm5lJJxjJRvzKWtrppSKElzcXfw1tRAPE1lcP4uitUluIbe\/luZJtO1ISrZQRRyWemapcQrkp5UdtY2LRN5kc97NIvNVhVoS5Kqrezaupxkq3uxbacYxT9m2t5KUkk7PoarkrPmpugp03JSjZ0YJNPSTbvUaaTa5V7SSUlpoWdWsGb4deHItYbxlpckuoxwW8Gxtek1GR7\/AMbPDp2lzGK7jt9YeHyZ9cugzpDbf2dBG8KxxSM51J0WpRVWEXGK0bqSlzSk5crSbTls5Wik9NNjFxU3JqOHnUjJt88PYRXKox5pJy1cWmowsubXXqfRn7K+j+RqGiWOpeHfE1mt3o3jrSGs7fWPtT3IutCgnaae5W21c2XifU9QEUWnNi5NqkXyWt2xjt45V+aMqFON5xfNHEyvRklUjLlqOOzkmouau+XqrXWGInCVOaqVHOdOz9pSoxi4RSndU1zJWh1TVnbS\/T6ZHxM8MaOP7IufG37QCXGl\/wDEunS98PWGoXiTWP8Ao0q3d+\/itHvblXiYT3bIrXMoeZlUuQMHipQbhKjXUoNxahUUoJxdmoyt70br3ZdVZnJGjNpONWHK0nG8bPlaurrSztuu5+r0elZABUk4Bz3A46joPx9\/TNf2RGbvdtpW6Xt93\/D9O2n86SvbS9\/J2\/U\/Iv8Ab216PUviz4X8FW7DyPCXheO9vZRsMlvdeJr37RqUaAkTRSR6Lpuk3hkQSKysu5AyRyD8X8RswVXNcPSXvLL8FUmru7VbEzTWl3q6dNadpcr10P0\/gXCuOX1a8k+bG4n2a3blCjHlsle1nOTSvvyt62R+SnxY8eXs+u20dhqmpaZfaRZSXF3b2k2r2ksLani9hMqRRGZXa1uNPjf7ToMctvsEf269tEjI\/D8xxc8RKMUkoU1yNK9tFCzs22ttEr7vTW5+s4TBwpKTs5xqWblJpSXLrFq0U9+t0766ngdj\/bHi64099SmjaO91qKzvZ4oreCW9gE9lNL9umtmia4uVWWVlMjWkiyxq8kcZKTL49RyrVadFaKTjdL7Vm2730t7t9dN+trevCFHDwnUStJJ2u31aVlu0nezWx3PhfwTeeDrbXLy+cq+qzWz2trLzfW8WmafrGpypfQ2095aW8hmOnpbxTXZvGEbztAsMkckvpZdRnh44qtOKipUnGEftRv3cW1Z3SVvnY5cdiKdedCjBu8KsZVXqo9trRbtp8ntbU6jQdS8RaZe6Jo2gxW097rd4sKGeWMy2iC0tYzPBYSFbRrhN0yG\/v0nlsbWQ3CPZKzXK8lTFVqXu4dOnVqXi5rl51G+8VblvNJx5nfqrI6IYelWbeJjGpThZqOtrp+7zte87OzUU7XXnZ9Xd2V9b6j4JTW38\/U3Gp6jdS6not3qkzwS3xvBevcLNK81qLa38i4vDm+hdb3TdNiS4hkd\/eylVPqCm1VlfnlUnUpttad3zKfu7dXokr2PEzJR+tSfPaMXGMIUqiiujSaV3zLe1lotVuQaD5sVp8S57SHTZ7h78rCmn3F8dT3zzazDssNbSRbY3scUjRy2DAjTbKW9jjT7W9nt9W9KSp00qblZuKi3GXNGMU37R\/DdNtrbokm0cnM4+\/Jzjd2TfLZPmu5Okrc1ntJ7+67rVHtmj+Erdvh\/p9t4rmg8CyC+t9Wmu7a+vbTUr22ki1dY9NubVLV9ZuZ52lF3NfwW1o1+CsEd1DDZyvJz1HTptwryi6U4axpzvO6lK8UtXJaxcmk7vVnQpyqNypv2lRSt7SqkoSdrqcIu1qi3ik3ppZ6X9X8MaDpzaNa6Zofh2a5gtbO3u9L1rxNMdO0ATSal4uuFIha9QyXkE94ZLiSfVb957XUdNluLFpo\/3mMp1YWeDop0qkI0tXJpNSn70IpNuVv4mqk5atW5ipQjiIp4irzVYzcpSlHljK3K3Fy25r3UVZX7K9l6n8I4dXtPHXgbT\/FniV9Q1HUtU1vTrOLw9Yw6Zodta6hp1lafZTE\/9lRyTafC8raZcxWD77i\/uC9wsazyyVPDVqUabrKU1ONRuE3yRjD3Fs7KzaSStqpXVusTnQnTqOlytq0ZxUVKSk1JWvbR2u3b3XKOr1PWNR03XodQvoYf2hf2h9MiivLqOLTUsUu10+OOd1SxW7i+K3l3S2igQC4jOyYR+anysKipluY+0nbC1oLnlaEMXScIrmdowftNYxWkX1STPMp4zAunB\/WajvCLvOhKM37q1nH2D5ZP7Svo7o\/UL9oT4x+Ff2c\/h5eeO\/FFvc6jK8\/8AZnh3w7YsqX+v621tcXMFlHNIjxWVqkVu81\/qMySpaQLthgu76eysbv8ApzOM+w2T4N4qrecpy9lQpRupVqrV1Btr3IW1lN3SWiTZ+F5RlOIzfGLCUbQtFVK1WXwUaXNZzaXxSesYQTTcmr2V2fg58TvGOqfELUPFnxF8TwWaeKvFfky6lp9ilxJpOlTSadaaHb6VaPNYa1tS20kJaJLeWE006RCS8FtGt9BJ\/P8An+bV8wqYrF1uSNXFTXM6V+WEUuSNOKkm+WEEld\/E7ybvJn7Zk+XUcFDD4Kg5Klhqb5Zys5zd25Tla3vSlJt9tFsj89vFt14Q16+ea90j+z1g862hmudMurC1gt4GFpZGG\/0y607TkjjtYYGVV0uZFiZE3Dyzj4eavqrPSzb2v52Tv06eR9dCTjZe0jJatQU4u+m6WstPLT8Sl4amsIL6fS9BhmvbrTtIu9StNRkF5qKbHWFYZLeeOzg1KdHmvkUNZi2kQTGOKd1Z4Zuf20Kbm1BOpGDanb3Yy1UXFPVpt216uz01fQqVSqoupKylK3s0knZa2clf\/grt06eaa8m8NoLycXN55mqIXSMR2ke280rSPs9nDH5f2SFJDqBNv9liPmySSvJJJPJHD1YSrU+o161VuTqVormbslGCfNGKV7RTjrsm7vUyqwisVShTgkow5m0nzSbcmubW8m7qz3tayR1MXhzVvFuuRW2n6fHbfZNMnknWG9zpeny2TXUUDTi5aW5sZZfsW63nuLuGAajM1gHhZFjj8+vGriKilhoKUuSLtB2UNWk5JpuOu\/NbW6tdnVSnToQlGo2o8zbvo2m72ukk7NpJpdNbs9GsPBekW2veHYtOvtV1O40XQQYY\/Ccl81r9pW1u4zrGo+Iprn+zbG4kwsFlcWZ1KHzLe1mWGGeWS5m+kwEp0MFChKMpYi0uecZShTipLzsrpaK17ux87iZxqYqpUhpBtOPMlKbjFX1bT926uluvTQ3hczafpWqNqWq6P4KsY1URL4Tli1DVLO3E0dtLJeeKr6SHTLOZ5byAC40a4iijSSYG3Z8pP2RhUr1IwnOFFT5rTTSUIxScvfS0urJWtdvRNnFzUqfNKEXWmnaXL7025dGtnyrVpu0bapaHNz+MtP0HwnFrngvT7TW\/P1e2sPtdze2XiPX5L0r4glub+Z9We2s7e1ikh2w6tBpqoJ7m7tLWeZodkPbQwlB4l0Ic2NcKSl+7fK+Z780p3bhGO8n8Tbs09BSxFeFPnqNYV87jF1Pei6d04csYuzqNK\/K23Hte53S+KtR1r4eWuv8AiTxHfeBtYY28V14luDb69aw2X9reIFtdMtftVpDGdVulkIfBnihtlskt7WbYXHRJ\/VsbaTpYKm6VNVJUbVvZwbnZQSTaqWd5tN6tdbpdNOUcRQTjTqY+bqz5YzTw\/PJTSbleSUowb9xv44q99menfs6+KNATXdHtP+En8TzLF438LG51HxjFqIh8RXmoG8XTdN0hXsYEhsIbizacBIrazQqpeadxGB42YYjBUXTq0cTicRSqc8JqpNuUq04tUlGLu4Ri0+aPuqy6XaPTo4XFVIVVXo0MNJRbpOiknGENWqkmlzNuyU03LW2yTP0Qu\/jJ8OLG7ubKb9qXwlazWdxNay2t1Kst1bSW8jQvb3Mt34IubqS4hZDHM9zcT3DyKzTTSyFnbNZxwbZc0cxUrLmSx\/KlLqlFq6Sd7J6paHjyybi\/mlyfUXC75XLL+aTjf3XJqaTbVrtJXetkfNH7T37Uuj\/tcJ4ITRPCup+G9C8FTa\/9osr+\/ivYdU1uS4sWu54rq1htzJaWSaNBYwyS28A3X95I+23Y7\/rc94nXEEML7OlVw9PCuTlGpOM\/aVallzRcbNRhFWu93skfO5Lw2+HpYj2uIp4iti\/ZJTpxqU\/Z0YN3UlK65nJp6X0R8ffE22u7HSbTTLS3ZtTFpdX1jFNHb+c0llZyjSXkSa9jv4A97czRgC11C3V0XbG1tc73+LzOveNGnFJy1u00m10be72ffZX3ufVZdCTlObtytKL\/AJuS7baerV762s9NnofButeH9csg0VxpWpaeWZFcDTXtFkZRliraRd2hfMqHBexIAYMrdN3iScr7yirfCmrPfV6b\/Pp1PdUINqSjFte7fW9tdlazWu97npHhTwvIL7UhfRw28E8Gnafay3dpb34uYFvY5bgW9sl1c3d83k6XaJ5tsomDXKy3Fqk8Dbz6u6impPkUowSb1TtJtqy12+QSxEYcr5nLllK6Ts9VZb2X4\/JmrqOlnTY9P0WCaR5xf2itPPaJYy\/atT1TWdZu2eA3Vy4+zzXEMY+13InEUMUTpbpHHBD1zccPg6MItyanKd4uzvGKs1brzJu97pp9WZUr1sRVbdkoKyd2mm7K91s9fLRvqdJF8Vtctobmx1Syg1S8nA8Q6j4m8Xaw80Fxqtwz3FzMmnJcWVtJqEl1PJe3xvZtTlvbgm4mhbGDxTzSvCcnShFzk7zqVYyrSbknd8qkryV2+Ztu+rutHqsvoTs5TfJCL5aUVyU+WPwqzV0l5WTsla10dvceJLyXxLY6bqWs2IsdN0fMuh31lNpsBkv4IZkkjewubfR9NiaWexPhmCKOCXWIn06MoVvPsVfSxqxhhVKpUp87hBzjUXK5\/A5Sk1KPKkruMVZOUUnFrfwq1CcsRUdOnUl7zUeSbVOKs0oxhZue\/vtp6OVmlt4xZ+K9Lvvh\/wCPZbC41e9E82m+bBd3qeJrS6OnapoDh9Skt7yCyiurM3gbS7SxKQzSz3UszWYto\/N56mZ4amvbUnOqqTs1ZTjJySV2pWV078tk1qrG0csxEnGFVwg5fD7K1NxUtZJNXavZqV1qrLW7MfVtW1e4+DNjqVrZWWP7ctYEvZbqXS9Sumgm8WoulXFlpOqiVNJiikjmt5CyLd3128M1\/MluYYMK2eYiVJ4mj+6crUUk0m1dr34RsraNtNu7l0dzvo5VhqddUqkVUjaU05NTSk1e6cl8TfZLayVlddD4Vd7v4Pap53iPWtCXTbPXb2Sy0m1vm0y0sdN8UaM93ryKL1ZJ9Z2X0dqyOrXs2myz774qFiPm1cTWxWEd6jdeV1GMXyRcYzV3o1eSVtOt79DvhSp4fEPljD2aSfvu7d4u6Ts7q+tn18tD2\/8AZwtryy13WrLTza+Lg6\/C3XINQ1G2uoJGsLfVr6LU9at7e5liuLbUNN8ye+t\/tUkiwzW7gRTv5K1wYN1acq0JQjNKdNzjJv3IubUqlOz0mr317arW69Kvy16VKSqKm+StFOLSjLlprlg0otpNrVp2bV30Z+lGv\/Cn4k3Ou61cab+zz+z3q+nT6tqM2n6tqdj4s\/tLU7KW8me11HUPs\/8Ao\/229gaO5u\/I\/c+fLJ5Xybawng6bnJxoYWUXKTjKU5KUotuzklKybWrS0T2OaOOnGMYvE4iLjFJxTo2TStZXi3ZbK+vfU+SvB1jYeHdN0rUZtL+yWty4v47W13WkFuup3T3kU9pI1tLAlsSIrOZjcWNxb33k3DXKS7w32cJxjTTVkpNu3wrVt27aXsr9F5WPjqkJV6skpc04LlXM3qk3eza3Wl1139PBPi38SiNWup00fTJXhi0mz8kStepEbqzbUbqGS2tbCR7YpOvmfaWknSR5W5Lxhz5eLqRlVclFLSy89dWnbRP0V7Hp4Kg4U0m2rN9Em9t9fPQ+apvGkKybVsILWaaF0e4t9WvYdrBWked7PZZ7lURljb29uHJyqM7Ntfz61WMVzNO6Vt9LNvp1e\/T\/ADXoqlJSVprk5feXLq3rdqS2e1ndtHQaTH4h1TwVqGqwjULkWd1qct2dEuTZGWK206yWys7mzED6rqEd1dyyx7XEpiBiaaNCED4zliKtKDjKbTbvGKSS2sm\/ia8726dzZRoUpSuoxSSvKVtL8zlq1fblXnzeViC3vNHMXhr+1dYsfClpPo+s619pvVvpIYH07wsdTs7VIdI067vXvNRvLZ7C2aKwEf266ie7mtYPtN1F3NRjhqFKdSNO1NyTmmkpa3i0k30eqe71sjljJ+1xM4xc71IQXI1zNNrq3stLJ9z1\/wCC\/hTwT45197jxLPDp\/hu6Tw1p\/wBr3KI7271HXbHTrHLX9oEtrOa2uR9lREuGilR\/NuSNwi58RgVOdFXq04V0qilFOPNG8I3i2mknfeztZq2gUcWmsQ1KnUlhpypSgmmotc75ZW62S1tdpp9UcNrt7p158YdXeKCwtbOy8DajdwQXt0upqri40fyooLqO3eGbUI5UV7CWNI44rmKF45YVjSaP08RGCqxhtGFGer96V+ZRSk9m7J6u2t7bsxw3O4yndydSpCXK38Ccbytq1ZNXdrayOH+HOjz3\/wALfFdpp9td6pJf65dEaTohkhtdQW3m8OTC4nRLmOUavZpFMLOFYHASa\/QPG7pFd+XGm3QrxipylzpKMYvpKL16vRNqyex6M5xVWldp2Tu77NJ\/1vr+fsmhfBfxrqvwyj0mH4b38t\/KVnj\/ALYuptDNzayX\/iANZTjVbZbS1lt0uZL+1vd0sskt5bKTFGiTnopYXESw6hGi+ZyTSqKylFycrPmWmtrPfo0ZVKtNV03U0itVZuza+JW+1Z272b2R7H4F+E3xC8L+HdS0wXfhzRJLy18QyWtldWtlr8VtrGoR6H\/ZF1dqLOSC8061e01OK+00XS2l0Hhke1lYxvB34XLcUqTp1PZ04uUp788lKTVleKb5VZvTq9EcmIxeHc00pVGkoXTcdNeZ2aum9Fd62W29vTNK+GllDqD6zqd5Gb2XStJ0y7tvC+mW3hjSVl0jWJ9Xtb21sIGvEtnkEscF5ChENzKtzdIsP2kQw7LJKMnUnOrJzm4pxglFLlld3ck7qW+lrDjjpQhSpQpr2fNOd5Pmfvpqz0vpzLf0VkfQd14js725uLy4tVM93PNczldY8QxKZp5GlkKxx6wkcal3bCIqogwqqqgAKWS4Byk5e15nJuX75rVtt6LRa9EbrF4iytOKVlZci0VvU+ftcAM8VuRmCLQWmjgPMMczaTppaVIz8iSEqpMiqGJUEngVnW0qwS0XJLRabKVvu6Hh4NtqTbberu3fW+58MfEC6urzxYou7me6CeJdeVRczSThVX+zyqqJWYKoLMQBgAsSOSa4q\/2f+3v0\/wA2erQ+18v1\/wAkeVLGl58Q\/Ddpdol1azW2mma2uFE9vKW08yMZYZQ0cm6QB23KcuAx+YZrysR\/Gj\/g\/WZ1UP4dXys15N7tepqozf8ACjdebc25fE1kqtk7lXz9MbaDnIG6aZsA43SynrI+bTf1WWr0rRS12XPDRdlq9DaOtTXW8Xe+t\/XudLoumabq3j3wrZ6rp1jqdn\/YcP8AouoWlve23zXZB\/cXMckXI4Py8jg8V2pKVSEZJSiqatGSTS97onojim3GEpRbi3Ubbi7Ntctm2rN28z7m8V6Zpuh+B9Vi0XT7HR4odNgMMel2kGnxxGO6thGY0tI4Vj8sABNoG0DC4r3ZJeyasrRtGKt8Mbx92PZeSsjhilebsryneTtrJrZyfVrpfY+YP2bdJ0rVfGKtqmmafqTMotWa\/s7a8ZrYAOLdjcRyEwB0RhCT5YZVbblQQqcYukpOMXL+ZpN7rruWm1dJtK+ybS2XQ\/Yq10LRNEsoYdG0bStIh+yxt5WmafaWEW54lLt5drDEm5jyxxlu5NCSj8KS9Fb8jtglyx0Xwp7Ley19TlNbAw\/A4Axx0+Tt6V20vhX9dEc1X4pPryy19FK33dOx5VrTMjLsJTMuDtJXIw3BxjI9ula3a2bRyuMeW\/Kr3Wtl\/Kn+epy2ozSgAiWQHOMh2BxyMZz0xxj046VxVZStfmd7Sd7u99NTrpJcs9Fpy20Wmr27HHPeXYdwLq4ADMABPKAACcAANgAdhXgTqVOeX7yfxS+1Lu\/M9aFOnyx9yHwr7Mey8j\/\/2Q==","a_rank":"1","a_hot_flg":"0","a_views":"1366","a_active_users":"1392"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fcf049053fca30ae0807610cd208a9deb","a_title":"\u67f4\u54b2\u30b3\u30a6\u300c\u30ac\u30ea\u30ec\u30aa\u300d\u4ea4\u4ee3\u5287\u306e\u771f\u76f8","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:45:32","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP1s8P8A\/BXz9h7WLqKzufHfizwysjhVu\/EHw\/8AE62al2ChpJtFtNakjQtwXaJQuMtiv8YcZ9GzxWwlGVdZRgcSoJuVLD5lSnXku1Ok4J1Jf3bxt1Z\/YNPi\/I6s1BYlxb25oSSb827JfNn3x8N\/iz8L\/jD4fXxR8MPHXhjx7oDuIpNR8N6ta6ktrcMoY22oQxSG70y9CHc9lqENtdJkF4hkGvxziDhrPuHMS8vz7KcblGLTb9ljaE6XMotrmpTs6dWL3bjPS6uj6HC4yjiIxq4atCpHRycJKTV9baP5X2O5ghiWRi5VhzsJ9MnJwR3ycY7A5rwYUXGSk5bdF6P+vS511a1SokrfJdbW\/wAk+u2ljL8WeLvCfgDwt4g8b+OPEej+FPCHhPSb3XvEXiTXL6DTtI0fR9Nhe4vb+\/u7h0it7e2hjZ3ZmyThEDOyqe\/AZfjc1x9DLsuw9XG43FzhQoYTDRlVxVSrVlGnTUKMVeScnFOXMoxv7zS1OHFYqnhKM61aSpwppyqSm7RgrNptvRtpPQ\/lL\/bN\/wCDovwf4P1jU\/BH7FXwjtviHPamS0HxY+Lv9paV4XkukmaJ5vD\/AIC0S70\/xBrFhLCFls9S1vxH4bm8xgZ9AmgXEn9veH\/0QsTj8Nh8bx7m2Iy9Vacakcnyl0pYmnGUVKLxOJqxnThWTetOnTqR5bPnUtD8iz7xPo0K06GVU6eJlT911638FyWrjGCtJ6WV1KyeltT8Pf2jP+CrHxT\/AGiPEOlfFXx\/8LPAWl\/FDXNKtLDxJrOgTeIbfwnq1poMVvpOjrpvhS7v7u\/0K9isreU6tdyeJ9Xt726Aa107TIk8qb+puBPDDLuBMBW4dyTNMVPJKFd4ihQxNHD1sXCribyxLq4tRgqyqVU5QX1eny+9rJtpfGZnxdicY8PjMRg6cK9Wmoy5ak5w5IWcVFVLtNXd2t7rsjyH4aft4adqHj3wxp\/xY8Nppfw+u9e06DxjqvgmKaXxJpHh2a6hj1TUtEsNa1B7TUdRtLPz57axungS4l2RGRMmvrc1ynFUsuxs8oUMRmcKE3gqOLdsPVrxs4QqSguanGVmnOFnG7tocGG4iVXEUKdekqNCVRKrUp25oQb1kvwula\/3H9bXwb\/4JU\/s2\/tMfCfwf8bPgR+1N4r8T\/Dnx5p02oeGNfk8B6ZJ5sdreXOm3tte2Vxf6Jf2Go6bqdjeWGo2N7b213aXltPDNErLiv4jz\/6R3GfCWc4rI+JuCMtwWb5dVVOvh1jsZVhGMrulOjOcnCrCtRXtac02krNPq\/13B8NZbmOGp4nB5jVrUK8L05NvdxvaaveMk907aqy31\/c\/4YfDmL4UfCj4ffDb+1jrMPw38EeHPCK69cWy6b\/aVv4a0i103+0Z7UXF1HZm4htPtEkIuZkgyV89wN1fyLxHmc+JuIc2zmGDnCvm+YVsb9XpOdf2Trycnqk5tQeisvJJI\/RMAqeDw1LDzqX9nSjS556aLTmb7euy69vlX4z\/APBRP9lD4Gre2Wq\/ECLx14otN6v4W+GccXiu\/jlTIMF5qsdxbeGdNnjYBZ7a\/wBdgu4s5+zMVKV99wj4IeIfFkaVXDZJVy7BV1zU8dm1sFRmnbVRm+fX7N0uZWfXTgx3EeVYG6qYiNSS3jTalL7vu8j62+Hfjnw38VPAfhL4jeD70XvhnxpoGneIdInYqJlttQt1l+zXSI7rFfWUpls7+33M1rewT27nfE1fnme5JmHDub47Jc0oSoY3L688PWi72c4SlFuN1rCUVGcZLSUZq3d+thMTTxmHpYml\/DqxU4a62avquj\/4J0\/kL\/ef\/wAd\/wDia8k9H26\/lf4H5OeL\/wDgjN+yB4h0u4s\/C5+I\/gDVDERZ6ppfi59ciiuFVhFLd6d4mtNVW6hDMPNigubGWRPkW6hJ8wfvWUfSr8S8DiFUzB5VmmHdaLqYaWDWHcqN\/eUatK0lJrRJ6LSz3PhcZwFlHsnGgqtOpK9pOrKaVrdHppvvfz6H4peM\/DXx7\/4Jc\/tQ2sOgeJ1u7mztLDX9K1GyFzbeF\/in8Pry9uLc2GvaI00oRZpbK903UrGWS4utE1S2a+0i+d49O1KX+usmxnB30huApVMbl0KVa1bBypvllicpx\/s1JVcNWk6lX2dScpOMueEox0s1v8DV\/tHhPM6dGliJSpQkrRaap1YVJJy57WTa0abTtfR73\/ru+GPjrRfi38M\/APxP8N700Xx34U0LxZp0MzK1xbW+t6fBffYrh0G37RZSTSWt3tG3z4ZFGOK\/zd4lyWrw1nmaZJiHzVMsxdbDNrVyhSm4wk21G7cOVu+7d9T9dw2LhXo0a0bp1IKWnR21s790z+ZH\/g5\/\/aY17wP8Gfg\/+zDoO22sfjHqN\/448XXiyait1PpngXUtPi0bR4hBew2Eljdaxeyajfx31peMbjS9Na1SBo3mX+sfoe8KYTMs8zvi\/Ec1SrktFZbgqLS5YSxtOU61WzUlKyikmmmrtdr\/AJr4n5vVoZdQy+lKyx1TnrScmpRjTtbVfZlfVK6fU\/mG\/ZB\/4J5+P\/2pNSXUdPuH0XwpC5Fxr9xazPLcSxuUMOlWJOy5KlGDzzSxWoYMYDIUYD+3+JePMDkKWFw8FjMZCMXJRmuSne9qbaafNbW3Ldp20sz5bgbwnzXjDlxdW+X5dZ2rzheUkrO8abi4tO6s7q\/3o\/bnwp\/wQns5dOsJ\/EviC98UWtvKktutqt7oVx9neTdfQyzW7XhxJgGMKjhNruAysQPzrEeI2ayqyrYbDwpe0+LRShJR1Vl0t72yW5+7YXwKyJwhRxmMqYx0VouX2cnzdLbRStZW6b7WPzE\/bS\/4JteMf2aPEV3qFp4d1C98C3jTvp+rQyXF1d2SIGl2XUZiKyeVbpJPPKNu9IjKsUQEiV9Zwzx1TzBKlmFWnTxLlonZRaUuVK7e7bVlZ7b7H5bxv4UTyWpUrZTQqVsBG6c1706btKVnZXcYKLu76dtUfTX\/AARt\/wCCs3i39iK+8e\/s1+JvD1\/8UPhz4wF7rXwr0tNZOmR+CPiOu6fU1M00N08fhfxNZLPca1FbWk13bazptjPYxRJqWq3FfnXjl4HZd4mVss4hwuJhlOb4SpDCZhiHSU1jcu5UqbnGLgniMLNqOHlKWtKcoOTj7r+R4M4qr5HXxWUVV9Yw0\/3mHk94V2neMr6qGm66paLY\/XKbVv8Agov\/AMFJL6dNIh1nSvhXdXDQvb2c118Pvg5ZwBwjxXmozu1941mtzjz4Gm8V6jDJlo7K3T5F\/Po4HwU8E8O\/rksFjuIqUlCbxFSlj81r1IJSlWoUI89HBJSty83KoKyk5PU+3lWz\/PZ8sXPD0uZ3lFSp03Tu0mnH4k0ru689T7L+Ef8AwRU8EaLHa3\/xy+J2seKr9kie48OeALaLw9oMcgO6S2l1\/Vbe+1nVIN3BltdO8PThTldhJx+W8U\/SozfETq0OGMlwuDgrwhmGOksTXnFXimqMbUuVRS5VK7umneNkevgOC8LK9XF1p1ZttTjC8W7pO3Omnr5+fc\/W\/wCFXwo8D\/A\/wNo3w2+GWkT+H\/B2iNfy6dpc2r6vrXkS6jdzX99ILzW73UL1Wur2ee6kiW4W3E80jxQxhyD\/ADDxHxPnnFWa4jOs6xEcVj8S4qpUVOlSi4wXLFqNOEEnypJ3TskknZH3GEwlHBUYYegnGlBJQTfM0l0cnq\/K+x6Hul\/vD8h\/8TXi3l3f3s9ZQhZe7F6L7K\/yHs0Nqk11dSRW9vbRyTT3NxIsMEEMKlppppXZY4oo0Uu8jkIiqWYhQTXmUcPXxFSFGhRqVq1ScacKNKLnVlOb5YpU43m7vra3mc9erTUVJySUU5Sk3aKSV\/idl6W3P5KP+Cpn7RXhD9oz9o3TrX4Z3cXiPwp8NvDUXgKx8QaYPtdv4o16XWb7UdYu9FeLJvdKju7y20jTp4Q0V\/NY3F5YtPaXlrNJ\/px9HDgbNeA+CcTjc\/5sLiM7xUc2qYaoox+o4Ojh4KnGtNNwpOUI+1k5zi4zm4VLS91finF+Z4fMsxpUKDU4UlOn7SKl71Rpxilom+WajZ\/D1V1qf07fsk\/DrWPhT+zN8DPhz4iie31\/wx8N\/DVlr1rISz2OtXVmuoarp75x82n3t5PYnnGbfjA4H8JeJecYXiLjribNcHC2HxWa4n2Ur\/xIU2qV+is5U3JNJJp3V07v9AyihUw+W4WnV5nUp0Kabk7O7gnJ6dm362urXsv5Rv8Ag5t8CaPrf7VH7H32Rp5te8SeArnQNWtWv\/Pj\/seLx7dLoJs9IO5rOSW71bxGJbtU8vU3jihKl9Pkz\/Wn0UMxq4LhDjSMqcYUMLi\/b0qqi4tz+pxlVjKpazUXKjaN3yqTdtXb4DjbBQx+b5FRfvurXhRlB3ekqqi1a1rNSd9V2u9j6p\/ZX8cfs6fAbwt4R8C618QPBfgu70m00rR3tdXuhpdv9oSFFHm3s8YtfN2IBKXutyFtkzeaQD9nTjis3q1ca3OrKvVnU5uZSc4Nu0mr6K2nvKLto7df6VyjGYHJMLg8HTccPGGGp0+RQmot8qfWLTbavu9+2p+08nxJ+FngL4YDxpqvjbS18IDTY5hrFjbPqscwkQSRm0FhFcXFy8vmfuBZrKZtxZUYkOPXjTgqUKLqxU0+WMXZe9Lb3naKvayu7abHdPFN4iOKcZypwtOUouVpqd2mlT+LbZK662TR8R\/Hz4jfDb4\/\/DG9fRPCPxAvtGljkk07xT4n+F\/ivwrpLXsEUxsLi3\/4SfS9Mvbu0uJUUSXsFlLpktm8kVxdqJ1U+biqM8HV541qU6kOWbpqcJX5ZJ2cqTbTTS15tLWepVTG4bMadWDw9SMGpU5urCag+eE4pckrNt35k7J2T13T\/iF8WfCq++Dv7b\/\/AAglpctDLpfxE0i4sri3MkO3StTvba6jhkgYNK63WnXLQ3EauBIZpQWMZJH7\/lWaxzLhTB42tFNuMo1Kdr8zpNQveas\/fSWvXXbU\/ijiHI3k\/GuNwMZe0XN7eNrJKFXmqRgrNaKN33SvfVJH+h5\/wS9+K158Vf2QvBQ1SY3GsfDfVdY+F99cNgPNbeG0s7zw+zgY+eHwxq2jWckhy88trJNIfMkav80PpA8O0+HvErNJYdv2Wb0KeaRjNKUoqtOMaseeXNLk53KLhzctlonFn7Pw9i1iMBBO0XTj7OUUrcqi+VLRK91Z7vfyPv66UOQp7Llfqev0JI28+melfh9VXjeK95drL3Vbpt38z6OlNRi0na8n39Fv5GURkEdDkj8sjoffB\/CsjsTTvZ3sReSp7t+Y\/wAKDT2k\/wCZn8l3iTV\/+CpP7bjN4dvtF+Mev+E9TeNZNLtPDMfwr+GssfBEWrX7WPhTw9qkMZIkVdZv9TmBG9QzpX+j2BwP0e\/C9fXqeI4fjj8Mm4Vp16OaZjJr3k6dOnVlUU4uzTdO2yR+K16vFGbKVB0cRGlKyaj7SjSW6sm49dE1dbPofqF+wx\/wSX0r4LeItE+Lv7QOqaL4x+IeiTwap4W8D6Iz3nhDwnqsO2S11jV9QuYLdvE2vafJtlsIYrS30fS7yMXkcmrTpZ3Nr+H+Lf0kq3FGExHDnB0cTl+T1Yyo4rNK83SxWZUKnNzU6VCNo4ehP3JWk1UaUbxTTt7uRcJrDVI4jHxdSrF88KXK3CMtGpc7TTcdUldbt6n7bDlhk\/xAnJ5OCCevX3\/Ov5Sg1dO6s7u9730et76tvd31Z91ytLr6tPTsumi2XlY\/kT\/4OIvCmry\/to\/sGeMrHT7xrFofC\/hrUNbWxum02xkh+KV\/eWtpfaimbSOS4ttT1S4gtHMdw0drdTKZYwwi\/tr6M+Nwb4K4+y6tiYe2qQxNWGGVWDrOnLL4c9WlQS9pJKVGCcleK1TSvd\/nPElPELP+HqsYS9lHH0OaSg9L1oXvLZOy92\/nZ9vSfBf7Hnx08d\/FTSfHGkfGjxTo\/wAMbd76G+8F2dzaHw5qGlXGkLaWdlqGk3SS2Q\/srVWfXP7TuLfUri\/iP9kzww2kcUkX6nwrj8Fg8oeFxOW0cTUq4eMaOMVWVOpT3a1U0lpuuW99G7n7lmGRZnisVgMVh8zxeFoYesqlXDwp0Z0sRQ5FGPN7Szc5J2Uo6cqTSPuL4XeCbLxH8KvGfwpk12U6TZ+P9RsdA8T6dFb6XNp9xfaFHDbXOn6eY7m2sdPXWlvNTs9NMUyWsc6QJkRK1ckpQddSlepBSjK17xbV371m7r0afpsfQYOnXdKcYqUOVSopctuWLW8U9p635tbnFfCX\/gnTpXwSk1LxLrPxP+IviW4GpeIdUvLfxN4v1TXIdVttZitFg0i7kmMENx4f0T7EJNC067h1K606a5vHh1VIbme3l9HOs5ljMPRw7wWGoQoRSjPD0IwnNJNN1HFc02925atpXV2mefkvDNPLq2NrRxuLxssVUlVq+3ryqezbldUqcJK0LJu1lstLJtH5A6d\/wTxk\/a9\/4KleIL+z8UzeDvCthHpd9qWr2lrp+oXD33h\/weplXTbC61OwkurmGWGxJhijeHyGvrh5VazMUvNn\/iO+DfDOriKWDhiMRha7apzqyhz0auIpO1oJz5m9tFo9Utz8l4n4MoZjxVmeeSxM8Ph4YalThG3P7SvFextzJWTSlrFPe2nQ\/q\/\/AGPP2T9H\/Y6+HHiXwFpPjbU\/Gdp4h8Y3Xja61LWdKtNFeyuLzRNE0V7OKC1u7yJoBHosMomkmEm+VoyMKrN\/E\/iZ4g4vxMzuhm9fKY5dPC4GOFisNKeIhVoqSrQbfLzJ81+abSSV10uaZVgKWWUJ0lUdRTtLmdovnb6x3il+OnmfWMib1x3HI7Z9s4P+frX5o1un816pNfemn6M9eDSTTdnfZ6dEZ08DCRVwTvxt24PzHqCcYz06E+uaycL25by721t2vbbrudNOsneyta12+u\/pYXyQODGSRxnA5xx2OPyquRdW\/wCvkX7R\/wAy\/A0FtnZCuCN4y3K57cFgR0Oc+pJznmud06suZ1eduaa55c7lo+8m7238r\/dwe3pczs0o9IxSSW92no9fPX1K6xP0AYYBAxjHHToAce5JyPqDXAqdWE5KV+RXUb+qt07aep0xrUrLd6LZp9PJAI5PmG30z6d8c9PbrXRCq1CSsrwsld7t2\/R9OzBzUlps+++j\/r1Phv8A4KK\/COP41fsz+LPBIt55LxWk8X6ZJp9gmoav\/bPw30PXfiDocOlQFWl+1XeseHLO1YW3+kz2s11ZwhzdMj\/ovhtm9XJ+KsBiqVSFKVVvASdSbp0p08wisPVVeV1HljGpeM5L3LXukYVHhoctbE0nWjQarKCgnJ8j5vcb+07aebttY\/Nf9ln43X2jeG9T0fXmbTITpbs51VGiGm\/abYsDewzBGRrXKefFLsw6ssgOCB\/aOS1HTpSwlaUJTw05YeU6VWFWE500lJwlHS3M7K+6P1XBY+jictoVk5K8YpRlbmSsklLfVLpp1t3G\/CzxL4E0rV9etr79rj4Y6X4T1XxENfn0m0i8Mxa1balaySrBYz6\/qN9fWbabdwvdx3E8Wm2t9b3sO+PULQNHEfo4xir\/ALmUe\/N132t+P9WvD4bG8kq1OlUq0Zzc5SSd438l0e69Gj7C+JvxesvE3hqLTPBviK08RafexxwWusWE8dyk6zxmWVUvYd6XkdrHuVrotvwq+YzEGQ+binz1HF2UVCe2luWLcUtersvnfXrvCVGFCsoc1OtVlFOV7uF5Wm0ndJ2TbSVr380fmE\/wD\/ab\/aB+GHgL4k\/s6fD6TwHdQfFn4m2dp4vh+Imk+HPF\/wAQdG0rxH4q8MR+MNG1VNc0m8sdA1tbFRDpmoQae0FvBpUthdavZ3s16\/l4njTwx4UzF5JxXmVTMsSsNSq47AyyeeNwGAq1acansa8k+WpUhzRV18NRraUXE\/D+Jc2zfO6NbAZbgo4bC0sTUti54iFOri\/Z1LOUFb3YNxbSb5na2qszsfhh+wT\/AMFCfEXxV+GmpfGe78Rz+BdA8feENb8Snxj8a7PxYraFo+v2GoapHaaZbeJ9fmup5LK3nS3hMESSSMiu8SsXXy+IfGDwXwmQZtQ4eoYKpmeKy7F4fBujw46VKnWlRnCjzTqLlo8ravK6s1dM+PweSZ+sVSeJqzjh4ThOq41uf3Fq\/eV46+Svq15P+lZnkOTlhkZHzHnOcZJ7n1PXrX8CQnKpeXNZStOKsnZVFzpa62XNpfZWWlj9JjSpqMbR3Svdt6pJdeumtm1fsLEkr7yzMWUHYGyCGx168DAxkHn0roim72k47bddwlaFuVJX336dd9N9SsXkyctL1PRAR+B7j0rG1v8Al5+P\/BN1KFl+6g9N+\/mfyz\/Hn9ij41\/ssWfhzVfid+2n4X8F6b4svL+w8OXFrrv7QV+t1d6TBb3N7E8XhHwVr0liIoryArJcRxJKHZY2kYFa\/wBHuEvEzg\/juvi8LlPhbisXVwFNVqsK2D4co8lOTcVKLrUoJtuLTSb26I\/F8wy7GYGFOdXOJQU5civiKkU27bOlq7bu90uiPVE\/YC\/4KB6b8Pl+K2iftdafdeBm8GDx\/b6xZfG7436S0vhhtE\/4SGG\/WzvvDFjPA0ukhblILhIJYiwjnjhdGC+FPxW8IK2dRyPGeG86eZzx\/wDZfs5cN5RXjDF+3eHnGdXDTqc0ITUlKqqcabtdOPMjaOBzqNJ1YZrUnCNL2i\/e6OnZNNOTcvhta6u023rvr\/8ABJLxz8efi1+0Vrs\/jX4yfFrxf4K8BfD3WNYvNF8TfELxZr+g3Wuaxf6foGiQXmmapq15Zzultc61qVoJoiYZ9NWaL95ErLxfSUyLgzhrgjBQyvh3JsuzfNM0oRp4jD4DD4XFLD0acqlXk9kvccfcp1FFu8ajWh3cJ4vH4rHVXXxdetRowaUZyvGW618lK9vwP6IPGejRX+iM8+fL0+SS7u0IYpcadPaXml61a7UIkeSfQtQ1OG22sjJePBINwBV\/4Yw0pRl7uspNRgv77at+Nl3Pvo1XWq8iim07QUvh57e630SvZvuk03bVfy3ftH\/FY\/s\/ftReOo\/HusxXvw48fa4niHwv8QLe0UWtvaareW80un+ITB51rZyadrEcbR6mPIsbuDUUhNvZrCok\/srwvq1cVkOX08NSr\/WsKq9PF0q8rpOnV92rQlypSUlL+CrzXLKbb5rR+ry7NY4WpPB45UZUVyyp1qUXJRvFJqaTvThGSt7WTavZaH038MvAH7Ndx4aTxpH8R7dbDUmk1WfSrbWUi8NiSVhMxmgjvEtEjkkkZ\/JTbE+4GSNmBx+syliYw5505xq\/bU4tPfS176JvVW29T7nD8Q4j2McNh8zgsN0SrKVtNdVt0Sv+hw3j\/wCLC+Lo\/Efh\/wCCUV3qU0GnX1tdeNGjK6PpdnHE8U02jkRrFfXcgWO1smtgbYMEBmKpKx8PM6tSjRq14JN0oKtNXSdqTjVaT6vmglb1eqVjyquJdb29OjzSnKNRe1a93mfxPzvq1Z677aH7b\/sffCL\/AIU78Bvht8Pru8XWZ\/A\/h238L21\/KMNHForXOnPtG+QtLLOl5PNcO800j3cm2YwSeWv8P8X5zLOeIs0zFxcXjcTWxFRSd3KU6srK7Sdlp0u7LofmGIpKhONK2lOVtdL2u30tb0Vt1bqfSk4ZJApPcjpkYzgD3x3\/AJ96+Qa5W1\/Wuv6nbQnzxUbWtFu977XIz8x4GRkjb6Y7+\/07jrg8BGz2fp\/WxZAwAB0A\/Hj0wQOe\/H5VpT6\/L9TjqdPn+g7b7n\/vpP6rn86n2FN\/Z\/r7h+2n3X3H8W\/7RHwJ+GPwq0Twrf8Aw8\/ax8FftHHWdR1KyvdJ8Made6ZceGIbW0guIL+8hu\/EGtDyr9j9kjCx27CSHl5Adq\/6ucA8WZvn2MxdDMeAcZwY6NGNWOJrvCcmMk5yTo03hqNKV4JKUlK6kpWPxjH4OVOFN0cydduT5k5yny2WjtK\/V6Na\/I+mfBf7Jek+J\/AXhu9h\/wCCkHwN8Mx+JvCGk3Go+BPEXxI1DS59CXVtIglu\/C2s6e3iNoBJpnnyaXe2j2cUYaCWFoVjJjX4nNvESlhM6x1Gp4MZ9jXgsdUtmeEy3KZxxDpYiXLi8POphvatVeX2kXKXMuZXbd2umll9apSX\/Cx70qcW6bqzXLdK6atZKO2t0vlr+8\/7Bv7M\/wAG\/gV8KdO1T4Zal4P8ZeI\/Fek6RY\/EL4meB\/E2oeJvDXjfWvCs+r2n2rSZ7jVL+wsYLW8vb+G4tNKhskW5Dx3MIkgUL\/GnjBx1xPxjxFiKGd0cflmX4HESxGT5NmEcHhq2Do4mPwVI\/unUcuWc5Omr8zhHVK59ll1Chl+Gpyw6g51YL21ZSVqjvq0n8Kva6jo2npqz0j9pD4s+GvAvhjWbAeJLQa3bwQrd6Lpt2l\/rsAvXVITNpNi09\/brKhXbcTW8cMaSCZpFRXdeHgjgLiPiPH4arg8mxlbCJRksTLDVqeFTTV261SmqU+V6tU5VHba739anneV5dhsTicbisNCpDlVKndTnK+7tbo7Wb1vfVH5HXnwX8HfEy1tbvx74P0zxhcWV9rvg\/SY57\/U7eCaDV0tre88M6nYSKbC9Oo6dY6bHLYa\/oV3BZSBnTSkvN08f92cO8LQyPKcNgpRjSnBxq1KsIr20a7glJwmkpWVrt80Xe6aW6+NlxHjlj3mWEnCdOo3SnQdnh6tC7fJOn8LT3cZQkk3da7XPgv8A8Eef2Vl8Y694g8J+B7u2tLSWyu4NH1rXPF3iDwnZXM1ul\/JbaUsV1qZ1KyFtd2Fyyanp8Vri4MMEbQRLv7MywWZYhpfX4OKT5G6EIyekficVd26av1Pr8n4zyXD1pfWMgqU6sYqU54TFc1KSi38NOqlC63SUY3v7zelvqfxT+z\/4L8D+FfEHh26vZptS1q+i8OwWvw8024s7jRrCe3ubG3afVNZ0qC10JoZoDHprHSr62vJRHHE1vaLcXtr52E4aVe8sdiXUjdKVJaRqrmSnB3ty80ea1k9Ultqa514t4Onh5UMqyuoq9dxpuviK8IqirNKSp0oW+Fb8yV9HF7n11+z141j1vQF095pGvILPTZb+3ndWuYLm4tVdLliZpZGS9gWOSVXdnjvor4FpG3mv4m8WuDsTwrxPjFHBSw2V4qc8VganvTp+zq1Xy03VcUk4p\/DJpLpra+2Bx1POsto46nVhVrUrUcTFOMZqSWs5Rvrdu3M9bWv5\/Rt3AXXgH5SWDc5IOOCcHPGDx3PWvyaUXrLS2+koyurb3i5R1Wu9+6T0OnDzUZNuWjbja+z2d1fuVoYSAzYB7AcHOAMkZxknoc9+nFSotq6saVqq50k3ay2em713H7CDyRjv6\/qK1slskiG29236jdjen6j\/ABqOWf8AN+LL5ofy\/gj+On9p\/XPgPrXhfwsnwj\/ZC8e\/s2a1F4guX1nWPFuteLdUs9fsDpsix6RaQ+I38qO5hulS6Z7eJZhFG6kBWxX+pHh1hOLMPmOYVs\/8Rsk4yw3sXKjgsDTwtOrg5RfvTaoVak5Rs4pcytdNpvW35FmFTCyw98Nl9bAzjKLlOomlNPRKOr1W+vR9en258Nf2X\/gB8ZPhj4GutF+AF54T1pND8OQ+LfE158QvG2reLtd16wtNBm8Rahovg6DUV8L6fpOrG4vJrl7zUFm0tLuG0\/szT7maGey2yqlxvhuIc1xOZ8YRxWWLHYqWAyzC5fF0aWEc17HD18TUlTqOtSV4TjGHs5SUnGfKot+bXxmDajRpYdU6vKlOrJ+9KolZtOLaScve110t5H3Hpnwd+JXwK+Hlp4A8O+I\/G3gTwDbSzaj4Om8Datqvjzwtpum6vqs+pzvf2+j+FtJ8Srq91daje6prNn4j1++0+4tdNltPD0sN3NaRHTMeDuFs3zipn2aZFgswzSuqcKmLxOGp1pSp00owUadV1KcFFWV4JO+rZ5+Lr5nQhTh9ZrworaUZXi4+9Jq6va8rpXt6uyPyXvP2b\/2z\/h9r2ofFj4Y6r4K+OOzW\/EWoa7f+DbrT\/DXjSPT7rWr\/AFKw1fUfBcwvNPutH13THt9WlsWln8mG9trW8tkkENxL95hpZZCisJGk8DRpqhGhSpx9nRioWWlKmuSNratJN2TuedDHScpONNVYrSo5Ti2+knKM5XSfdrZ3T3v+hn7O+ifFf4o+G9T8X\/EH4Faz8MNYebT4Dcx3h8H3ninU9HfzU1dvDtvbwTW9heW1xMqa1cQavb3jzO5hv4Lax\/s3z8xoUoSdKlONRW5lyu6jdvS+\/W+uuvoe1RpwxNNNQnRUYqTVN8sGr\/G76eSSfS5+jPh7xzq+m+F7fwjp2vahouy6vY5FS00rTtbNvenVHiL313o2q2mo2lvmeODVrC8hm+12FlaiU3RuIJ\/HrYXRPnbUb3011t83t\/XT0KVOpCk17V89nGM7rmn\/ADK1uiS28jxvxhJ4H0jV9SuPEV54uh8Y61Y6pDB4d1V7e5hfT4Lh2uLtIpPD+lPDa3GjO8EN7qF4W1BZ5phJG1xa3J0p4Pl9nJe9eUZWbSs2nrrK7fSz7u63PEr4fA0FN4mVedaV0op6pttuz+FJPTe+utrI+f8AwnrelQeJfDyeA9d8cWP\/AAldzoF3Y3WreKoNJ0q4it7rUre80TTL7VdAs9Y8MXOrzXmoWb6aPELauz29usnhqyuhZSCs0yjLc2wssFmuX4bMMPOclVoYiEJqVOS2VTlnKKWj9xr5dOXC4ytSnCGHnicM4pun+992okpazUJcr1X2vvPo3wt8dfjvpGk65r17p\/hX4keCdBszPd67NqI8P6hZXduNZ\/tGFr23s\/P1Sz+0aBfabY2dn4NvtYTUlmWe7v7cQs34DxJ9G3hLN5Va+Q4vE8P15Sb+rxlHF4FKWq5aU1GVOMftNSlNvXl1R9PgeK86oOca+Hw+LpwWjjLlqRW95PmV2vK99FrqjV8Jft9\/B\/XvNn8QQ6p4O0WO7tbNfFE4Gs+FRNcIm4z6jawW9\/ZwQXRa2uLq50dLK2dXe7urdYbv7N+NcRfRu4zyfC1sZleKwOfUqLTlh8OnhsW1dpWpybjUvpZJqbl7vLsfYZXxZhcXJQxOEq4WWkXOpJSp\/wCJcjbV293ou1j7E0LxFofifS7fW\/DWuaR4i0e+RmtNX0XULPV9MulVmR2t76xmmtpgkisj+VKdjqUYBlKj8Ax+Ex2XYmpg8wwdfAYuj\/Fw2JpypVo3copyp1EpRu4Ss7K9m03ufZUqtDEQVSjOFWF2lKDurrdXRr+Y4\/hB984z74zxn0rj55d\/wX+RpyR7fi\/8z+af9qLwD+3\/AOLbj4F+Cf2u\/FPgrxT4M8S\/FqxsdD\/4Q2DwhNe2t\/FYXLaxfzr4X8OaNfG3tvC7apLiUywkxg+XvCsv+inhFifCT+1M5xHAOX55g80qZVVVb+14Y+FDlnJKEYRxk5Q9o5qXLyrmuur0PybOFms6VKOMqYaUFN8saUoTldK9ny3att103Z91aNpug6rAtt4bstavfHfhqfwePCy6dba\/Fp97f3b6dF4tttHuLS20+OfQ1ijk0zxNNqt3cWUVqsc15dOtnZyQ\/sNODVrzjBzSqOCerlLVtvedm\/i673ex8JiHCNZzbbqKesVL3kpNyu4rVdN\/Tsj7m+Hnxqg1rQLVL6DTbTwv4ysptWGhavFFLqOlA63qNv4n0W5tTNaTXOphI4YrnTorOW0t76ab7LLLpNtNdzOTcLuMtY6qS\/F9dNdz6bDzWIw0FpVTSTi\/eV4ybs0tnZN2t52PgP8Abm\/b6\/Yv\/Yq8Y+APB+v\/AAV1XW\/EPxFs5JtXh8JW2i6HovhLwLfatB4d1LxB4g0nTtVSbWb+3srG61Tw\/oFlZ2supHR7aFdd0SeZJbX28ryTF5vRq4mFWKjTsrTV3NPdxurNLy036nlZlissy2oqf1WMq9ZRb9nZpRek4zjquVp9dtUnofclp4w8PeKNLm1TwtP4Uv8AwXq2lWWteDdV8MSxSaTJpGs2lle2eqaZezas3kWWrWOp2cttItpb2N9AZJbwwmWWCLxKlKWHnKla3LOaaa1i1Jp8zfvJPdXtolY+hpVI1sKlQioxqQjyyauowaUnFNXS969+13bY9X8BS6R4gtdR8D3RvPDnii3jlGia\/p0scGt2puImvlk07UrW0trSV9OxJMdO8iS1lsbhYrmzbT7iRLlR9pGVOSUKsW3dt8sdLa\/0+j6bzJ0pxjRUZe0hflqp2te0X1trpe33K1zzf40\/CTxcttJ4ssNTvfF3imDw54g0V\/EFxocd14luv7QtNZuvCt6mkaZFYeGLi38J30n2LUNETS7QajpkULzajZ3El1dy6xanVtUajTdWDhZ8vKuVqSv1vJ6fcu54uZZdUSjWUnUUbc\/K3J8tndu213b3ns7p6s\/LP9mr4n\/E74xaB4w8NfGL4deF\/Aes\/D746av4a8Pa0ngpPD8\/xDD2msQXCeHdet4NPlsrnwTqHh8WcPiDxHZeI5b\/AELVI4rzVJLn7d5fo5pRoYNYd0aqk6sFKpepHmpya+Bq+t37r738zw+f26UI05w5Jwgm005Lms3CVr23bavvpsj7KsX1jw5qlvfQXOp+HdZj1nxHY+G\/BvhvULfU9MibSbxp9YFwZ9S1PRdJ0jWbDRreGeTUvsOi6Ul5aTWjf2rpgvtH8qEb1Jys4ppWtdRbslddL73tv+B14Hmw85TlNKLk4qE3dxs2k5czu72vZvVeR9dfG\/4OfC7x74MttJ8X+CLK4SaHTLgvFd2Wi6pqGnWtrpd1ZWOpXNndW9zFcahrMa6PMsUls4tL67+wSrO6tV0as4+0ak7puK1teNk0pNJW1fxaJXW1j6RN1YxslyvVuKsr9V2elrr\/AIJ4L+yb4h0DSdc+L3wP0e2+wp8Mr\/wZrunQut+i3Og+PvDMGo2slm2oPIbm0025sp9IFxZsbIS2klpkXlreqn8YfSgyb2WZcPcQx92GOwU8DUppK1PEUZwcU5qK5pzjOUnzScnGLaS3Ps+DJ+zo4nDKTajWdS0nf43UbcL2ajpra6Wnkj7RyPUfmK\/lM+6P514\/+Cfc37C\/xg+AHj3XvitbfEjRvFnjnxP4GnsrPwnP4Sl0ddV+GfjInWvtU3iXXYphYxCScWpS38xo1TzwGIr\/AEX8OvGzA+ImNzLLMNw3SyOeFwdDFfWIVcLWVVTxlDDyhL2FKEoqNOrOpfW7iul7\/kuNy2pgoU51sQ6sKlaNJ3k3yOSk1LW6WqS7267n234q8K+KfDHhzTtW0XQJvFWrXfjnQfCc9v4cudW0zX9KtL27tNIvfEiJo8dj4jsI4\/Dset3baz4c8Srqmh2nhiO6hTWYornTbn9jpxpyipe1irx5ozls00moxtrbZpPXo+h8Vi6E3Uc+SCnU5XJLpZbb36pO+idrHCfH74u6p8FPg78VPE+n2F1p2v6HpHjK48JXepOmsltc8c674c0OfVX1EpNpF5PY63PqWualaWL3CQajZXOj2Ky6Bp2k6trfRg6KxFelTTU05e+k9JJXat15Xs29dXbudOBnOhh6ycpRUZcya3vs0r62s9dfPRH8cv7VHxI8UfFDxrF4h8Y+KtZ8U6tp2j2Hh77drt7Nf6mbTT0ljt4pb26aS7u2tQjxJcXDzSeSkUYk8iOEJ+s5bhYUsOqVOCoxlabVNb2Wkdd01a\/r5nyGZYl4rFXnqorkbbd2paO\/ay+f3n9oP7D\/AIZ1jwV+xj+zX4UvtVvJNWn+D3w11DUbSdLm6Oi6XrWjnX7uxSYC9nS509dSGnxl4ooNMkg+w2YtftRhk\/LM2qwrZnjZ048sPbWS2V4xSk\/nLe1j9Eyu+HwNCEopPkUpq7aSfw7vbl321fyPrbTY9N0y6\/tKGV9Fd5rCb7dIzaBp8bweXbWF7aRKJBZSw6lYIbOBhDJPJfss806bGTz0le62a0itlppa6Xzs7Poeg3BpzgtYbq2ju7a69LPz36XPdNJ+L17eTzwazpMFyU02TTrq\/ZLiwERfyoibi21W3jtruO6nF60Xm6XHFeXEM1pN9nktooplPllHlk3FaJSW6d1Zq\/pbW\/lpoRGKq80XopRd7dddtdt3597vU+NPE\/gDxQk+pf8ACtvFl94Q0iXUtPD+CJdI8L3+naTHOmnWmtx2N7HokmprdvY2fiK+07xLq66lqOmarfWpv\/7Q0TTLbTqu8Z8spxVSSStKbk3sle22+uiv5aHk18plGqp06tNRcudRd7xWjSurdf1+eavw38R3mp6bqWr6jY3Oky6Rc202gWqWb+HrTUZTF9qtLLxBf+H7TxNfW17HZ3Et5CYNEi1bSNX8Uabf2l1b67plxpTi38NlZvfTS+1n3XTd6W3Rx1ctrpyl7Sk025WSkm+rST\/Dytc+uNa8U6Fq\/hPw94S0O01W20\/SbTR\/D7XjmIQ6ZYeGiY3tFS5uJbie5eO3t1jnuZ0ENzHFKqKDJEMI6+0V95taei\/L8z2MHK0aVJK6vJTbWqajfTotPK267nnvw70+xsfiNZXiWsFrq8mh6r4duYrG3gsYV0pfsesW9pNa+UJ5Y9KNlp8cRZbX+z59QmtkghS6aE\/hf0g8qy\/F+HuIxGMnatluLo4jBVJfF7ab9k6d1ZKE1Lmla0m4RtpdH02Q1pU80hTgkoSTUtWk+ze609N30PqcQvgfP29TX8BqmrK7d7K\/r9x988VBNq60b\/rc\/l28L\/8ABRP9oP41eKfCXwt+Pnh3wFLoUniGzll1R\/A974Y8baJfRlrb7Xo2r3GoSxeHrm7jmk0\/VL+x0eG5Gk3eoWkMlqZ\/OT\/R3J\/BvgDhTMKHEHBua454qk3CWFjnGDxODxNGokpKVClUl7VwV3D3lyy11ufl9fM8wzDmwuNw9KFFR5nP2Lg1KGqabkryT62vuklqfsX4U1fxJexeF1t20NNZ0eW18MeMNU1W31fVdSPhm4sLyDT\/ABN4evNNvLRNO1jW3t9F0439xEwts6zdajE0dnaW15+pShT9nGMoScY8qhGTScWlZOVr6paNK6b6238WrRjiK1J017qtCc7votbrW97Xd\/lur\/GH\/BVlNZX9kzW\/FXh+yk17+xtZ06w1N9BV9QuZ9CXxTbahcTXao6RKIEtbltVLW8MFvfy3Wp385SMPa+hkdSEMySlP3pQttsrSa066Ky\/NE5hClQwVOpCS9i6jjFvT943ycl\/N6321t0Z\/Evqo8UeMPiPpfhCw06RNd8T+JdG0HToSU1aePU\/EF5b2Nrbm20qe4d5Wvb0I0NnHey8rHFHLIdh\/YqclHCfWOZctKk5t26U43vv2Wp+aV1OWKdLkanKaglfW7dl\/Vz+5b9rf4ofHP9k34I\/DD\/hn\/wCCt7+0J4rPiLwJ8M7nw\/o2ka34kt7bw5YeEJ9Tm1yXSvC1vc61pepXkVpDo9rfSxRaZptzfSalqMM0rwadd\/kuX0cHmmLxDx+JWGwqlWmpqSjNv2jtZ3Xu\/K79WfoeLrYvLMPh\/q1F4iranSqQ5HKLi4qVrJtJq91v3tc+rPhD408b+LfAPhXxF4y8BH4SeJ9Y0uL+1vhrr2paZrXiHQNetZ4GuNF1PWNLnntNSe1iki1fSJksraVdOufs95p32me7jTzMVTpUa06VGaq04tclZJxVWLWkuW8rbbKTtt0PSwk8VXpKpJRouST5JztJb6PRf1vY960Pwn4m1uS4TSNDae1aK3je9mEa6dCWWdJbq6eUtE0z2scIWSGWXUEYfaooorkwR1k3zU1JbKVvuW\/o9beh0OpK6iuSLcmnKK1a17PVPTyvY1PFngS00nwXpuu3DW+rXOoazPZX96tpcWsWnXX2+SOwAg0+7m85Ir21jtba4mmyXaOGI2UV80SaR+Fd7Lp5f10+YnXTprni5fDfW2vMl2fr+HmfJXxZvvFVnqtpD4A1+BNU0GSfX73R7iy064Hiaw1TME1ncGWzDxSzPpt1Z\/a7G6tZkke6DXSzwCeHvoU6fs5SmviUk32Sb16dl2asKpFcqcUlGPvcrV77O2lvmen+EfFa6jPpkc1rb6LqFvplpqGow2K2FzdXcU7ac9pdT28sEUcUsGoWmp6XIReaibyUR3CmzjTVtOk8ypGEZyULWbbdlbV+V3urP5nHhcTKvWqpJ0vZRtaEXKMm29dGkvO+qSu7LU7z4aadcTePv7SeVVRPDt9Np1vLHJDeNYvPYxxS3MDXMpjcxS6fJFE6ErFLJK0rTXEu7+f\/AKRtSMeAqVN\/FXznB04q9toVpN+eyVl33XX6jhqMnmHPKd+WlJJW\/mtfW+lrdvzPozzj3KA9xl+D3HBr+EHU1fu28r7fgfoypwaTtv5L\/I\/P3\/gq2iD9jLxPMFUTL4o8GgShQJQPt7nAkA3gZAOAeoB7V+x+BNas\/EDLsO61V0PqWYS9i6k\/Zc0aUXF+zvyXT1T5bp7HxWdRiqNVpJNclnZXV7X18+vc6z4fKsnivRvMAk83wJYCXeA3mBbLw7Ook3Z3hZpJJlDZAld5Bh2Yn\/Q6fwQ9F+p8vQjFY2MUko8s3ypJK6i7Oy00PnX\/AIKHxRP+yF8X4HjjeBPCWuXaQsitEt3b6Ve3dvcrGQUW4guv9JhmCiSK4\/fIyyfNVZf\/AL+n15I69d2vyOHHxi8vnFxTSxN0mk0mpxaaWyd9brrqfxj\/ALDFtbXn\/BR79n2G7t4LqFfjraXCxXEUc8az2D6hd2MypKrKJbK7t7e6tJAA9tcQQzQskkSMv61mDcchxXK3H\/Zeja3pTvt369z8\/wAKk8\/w10nfEwbur68z116n+gX4YubmWzgaW4nkZ5NWjdpJZHLx2+jxvboxZiWSB1DQqcrEwDIFIBr8dsuy130XV3f3vX1P0Ryl9ZprmdnUbau7N8trtbbJfcjUvrGyOszE2dqTJYtE5NvDl4mvIYWjf5PmjaK5uYihypjuJ0I2yyBn28lZeSWyXkFHWtWvrZRtfXrLufXhhht\/h+ywRRQLJ4XimdYY1jDyvpru8rhAoaR3AdnOWZgGJJGa2qaJJaL3XZbX5d7GqS9mnbX2klfrbtc86+IirZaDLa2araWsnh77VJbWwEEElzJeSvJcPDFsjad3kd3mZTIzO7MxLEnGbalSs2tHs\/7rOf7X\/b36n5bftPQw6V8R\/hq+mQxaa8nh3xDHI9hGlm0kdrr\/AIXmtUdrcRlktpby8lgViVhkurl4wrTyl\/Vy73qeIvrZxtfW2i2vsd0tZpPVfV5u3S\/K9bdz3L4QRxyeLviDayRo9rbR6ZcW1s6K0FvPNqkSTTQQsDHFLKkkiSyRqryLI6sxDsD5+NSUoWSV6zvbS+vkePw625Yu7b99769u5714J5+I+uE8ltI1FmJ6ljc+G4yxPcmOKJCTzsjjX7qKB\/On0k\/+SHwT6rPMLZ9V+4xGzPr+GP8Afq66XmrdLX2PaNqnqq\/kP8K\/hU+6u+7+9n\/\/2Q==","a_rank":"2","a_hot_flg":"0","a_views":"1184","a_active_users":"1248"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F1000%2F00ddae7a3984edbef54d1ec94d3269d1","a_title":"\u30c9\u8ecd\u6226\u3067\u5ba2\u4e71\u5165\u3000\u5927\u8c37\u30d9\u30f3\u30c1\u3067\u7206\u7b11","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:47:14","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWQMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/APp\/9nX4c+H\/ANv\/AOMPwz8a+Ovg58SPjH+yTpMvi7x+qxQeItAXV\/Eng2e3i0i6uvDviWXQV1\/TfD+r3cGl20WoeIl0ae41G4u5LC9utGkt7z9l8QuLeGOJcv8A9XuHMbjMLmNStSninUw8qM54J8yq4eliFB+xlXk6fNKClN04yinFtSj+kf6yYXC4H+1cJklevGs5wy\/FY+phFhqOMVRtVKmHp4p1K\/suSTp81N0ZStzc2z+sfjT8Av2G\/jB+0p8RbD4o\/Av9o3\/hGfA+h6n4ak8CaGbDSbXW9e+L3jbRtI1AamfEPjS4TxBLcfEX4hasIbnw9q0lvY6trBnnFtbaYi2H4fw5kuEhxJi4Qw2R5pRw+GpSWBx1GtiKVCdGjGEq04wVC1WnCClGr7aUk3LnXMjhzPi7iPGZJhcPVrZpQnKtKdXFU\/qtONenVlObpxtUco05KS5aTpwjZNRTTSX5CfDn4Rfsa6B+0f8AHYfEjw78ffG3wp8LSeJ\/g38IvgA9\/ojax4a+K3w\/8VeKtA1i88T3dlr2i6zqfg\/wjFBotvYQwXniDwjqfiuXxJdXVxq9taQw3ft4\/F0nJ5NQcKdKvWxVTCYSnTxVWnhqEuevOnQnKnUc4wk5yTrzm401GMZSlZnj4aWLrVMRxDPB13DL4YOOIxCq4Kkq9Wm6eHg52xcKvPUitZQoTjKT+FK\/Lx\/grX\/hf4Z8I\/D+X4m\/Br4e634y8JeI9P8ABviz4zeLJbweKPEHw\/8ACHwu8Uadonw+Hwu0Hxz4fu73QU1i00TWE8V6CmkabP4g07QI9Rhu5LSIXPz2TPB8OxzLCyrVK2YVMUq01hVN0VRq1KdOanKrSUYShOVPmjGb0drNrT6Di3F4rjL+xce8ulhsrpYWthsO82r4WSmsLgcXXVSnQoVquIbqQoz0lH3FFKM25pLxr4y6v8J\/EPwQ\/aJ1T4Mz+ELfQNM+NWlfDXwtdWPhjUbLWda8N6x4R1HxdoPiWXWNV1jV28JagLJLiwOmSx6lKtzbzb9ZW+WKJ\/0TJcdQxU6NSGGoVMTLByng3V9pUp1K7pKagqXNaLT5npGTvFre9vyPNMkxuT1MZT+vJYWGLVKrRjh3PkpqUoQcHKclKNNyaSgoc0W2nfUyfC\/7ZGu\/FLw1rWkaP8Nv2RtK0Hwr4X8ByafeXnw\/8SaRbaTonge217T4Na8ZNpvii6udV1qS91FGupr3TLlb7WNYhSSx1CKxsWsenI8tzHiPNpY6pntbKsVgOfGYXB06GWPBU48rpVoQoSwM51Y0oOMU6kKtRuUnfmqVJnrYrOcLkuUPL8Jw7luOwuLpUsDmGMkszq4mvKU41abr14Znh1QlOtCdWEKUqUWqcUozjTjBeF\/sW6Xr3xF+LKeOr6znm8O+LvFdp4A8R6loq6VpugjRbTwL4tmbwxDpWkPJbCXXtB0yO61uKFWl1WBtUgvbm5uNTuJZ\/lOJaVHL8JXwzrVK1eNR4mhVxMZTqp1cTKPtElHnp8s6kvZpcsaWjhblua5RVxObZ7ha9WlQoYONKeGrUsDRpYSEZfVWvYO05SqKeGpNVpScvauU3Um6s2n+4fxF0fw1H+0l+y5JZmSMrY\/GmMrFo8MZtIP+EQ0fyLaCNlWPyv3AUhioCqJGCFY4x+fRhCeDzCTnRbmqEvdjXTio1Xe7u5Nu\/dtrc+6xNTkzHKaajUUV9ZiuV0o6KEdXZWTtZO1ujse+2tjN8PPin8J\/2rPEHwob4g+BvAv\/AAn\/AIO+GWn6prGhaVc+Jfi3r0mixaV4gtvDsl9Dc674T8GT+G7qa8v1t7829\/Dda3p1gbrw1YNqnJSxNKhhsVhY4ij7eUqNapSWGq1KapR9pT5ZTqW5a1VVGqSaXvW1srPreBr4nH4TFypVI4OjTxFGNdYilz+2qTw7i+XkX7uMYSc5Rk76pO+h6T4e0rXda1TxB8RPH19\/bPxD8aaq2t+JdXaLyUjmmiTytK0y3DOtjouk26xabpNjE5jtNPtoIFZthZppws3LkjC60jG3LCLd+RWS73l05r9z1ZyT92MnKK0u225ySs5Pm1vulotNGr6l7VLgm2LBv+XgHvx5cmMDknkZGRnr2xxNSryRT0vLmjbXtr+D23\/NxZtN2uo2bfbVJee9vv8AU4rcv95v+\/hrk549\/wAH\/kX7Of8AKz4H\/Y9+KGifsfr8SL34p+K\/FsfhV9dttH8OeKbJrlfEXxN8Dah4bbUj4Xs9KubfTdQs7Dwr4hknufE3ic3trE1xZ6BoMlhcXpebS\/p834yx+OilhqsMCm\/aUqNNwWNw+Iw1ZLDVZVvehacElKi4SVS\/LK6YuC\/DjJ8mxGJxNWhLEwcqdJVsUqdbLsVSqUoqtDD4Z3qQnTqym3iIezcZRbVpQaOl8d\/Hz4b+Nf2cdf8A2vfD\/jCy8N+HfE\/jrWvhwIbufw\/4m8eyvpfjS\/uDfXdpqF1Y+HfCnii7j8GQa3pmoapbanqDTPZ6lbJogvYpp\/FwOLzChm6wOOxWLwn1+lTjjJYKqpVpRxEY1JTdapG3LKS5pxpNQhrGMeh9V\/ZXDFDJcXn2VUcPjJ4GriYUnmkf9npqhUlGVJUaVbk00p0KmIpynJ2lZSbi\/wA5v2YvF3hDStP\/AG2V+J\/xF0OTUtU1vTtJ+CPiXx3e2mvQ2tla+IPHPiDVdf8AC+o6dp17c3suoW8el6bd3vl3kMkt\/p8c11creQrH7nEVLOVWwryudRwwCnB4ilioPE1ozg6bTc01y+yd5OLtJtppSufFcJ4rg6NHNaWc4jDfWMxxcmsFXw3Ll+HpUXTr0akKkZrnrVa8qsYx5VyU6MZOT5+VfLHgfx5p+tWOvCXVbDVLl\/HsrafsnhuL3StJh1SPRLXTrCHT44j\/AGRrNzqNvOUntZ5EMUEVs8cXmpJjTWI9jRpVpSjJUKMsTL2tNqtXli8FNyrycmnOEVKV4xjZKW6i2vNzXEZXLG1KuDWGhThXzCOG9mp\/uMNDKs5w0IUI+zShTrylSceXmcr00mnJHsfxT8H\/AAz1H9lu60z4WfHfUZ\/iHqPxAXx7rXwb\/wCFcfGrS7S68sXlvoptfHE3h9vDlzPosGoXjvoMMdtpsaNJdDxDqOpSJpY+jpZ\/l+Fq03TzWhTq0aVKmk61CDjWhBKbpSU1OFoPVuSvK8UtLr53EZLUrQrVKWDqyWIrzr1E41akqvPJSScG3B8slzQ0jZJarY+1\/wDgn7+wvp7fBHTfi78RH+LUGraloHxEfxl4Cj1XRH8OeLdI1hbm1t01LWNHgg8aRavY2Vpp13FYT6j4d1LTtVtJbCyENpqN5JfeZU8QZ5Tjq08pzvLadWvSnhp4tYmhOvGlVkpVoKNVVKClNQSc\/iSk2nzRi16WD4RpZhhKKzLCYypD2ntpYd03Cm5xk405SdLlk3DmvFNPTyk2+1h\/Yk0\/4YfF1\/Dvwuk+Jmi6X4P+KVn4a03VNK0J7hJrMeBvi5qOo6rcWt3ousWMkk2oaPZaP50z3aDTdVNoWjuLiJ4Pn8Xx3leIweI\/tLOMnq1mlzfWc1w9Kqn9Yw0lTi4VYuKi\/aTcUo80lUbW9umPDE8JnWFngsNjaVKCdNSoYVzgoTw+L5ufmhKDbcYwU3Z2ko3u1f7Vk+Clz42\/aK+AjeNJ\/F\/hrwH4J0b4ka3498QQeB\/Epu7rRrzw9ZW0HhfS9R0\/R1S28ReL5bPUtN0uS0eXUrZIbm40+1OpnSxL87PjfhTC5fi6ks+4ao1JTpUqcZcQ4BSUtZe0lCvi1VcIJp6LlbtfZHtTyfF182wMZUcYoU416lRywbinT5UvZqcafJGVRxSV3e17b2PpmfTviL8XvHA8d6v8OvEXhLwh4W08eEPhB8NU8NahbW\/gPwVBFbrbh7CC1Nvb69rFvDaS6vJCv+jpHaaTBI9jplq7+NheNeC6UZ1KvF3DajGrNzqzzzLHKrWT9+cksU7qN0qezhvu7H0GJwWL5YQhgq8FyJRpxpS5Y01pCNlHVtXcnFNNrqdn\/wAIV45IZU8G+KdryMQf7B1UYG0hcn7JtwSR7dumaMR4l+H1GMlLjbhWOl7vP8ri79rfWrp76b6bbHNHKczklyYDFS3+GhVslfzgru\/kvXc4zUvh58RzDMI\/BXiN\/mfaX0i7i2\/Mx5MkceSxOeCDjIBHGPBr+LnhlT\/i8f8ACiiouV1nmBmlvfSFZu7t0T+5ad0MhziafLleMd7XSoPXVW0k4vfVNq2mj0ZyP\/Ctvin\/ANCLrX\/gvb\/47XB\/xGnwn\/6OBwx\/4c6P+Zt\/q9nv\/Qrx\/wD4K\/8Atz5Q\/aK\/bp8P\/BnSnm+J37H3gOPV9J17QdP1\/wAKNbeCNS8QWNiuoWj39uYZfhn\/AGdczS6PbNbW+lxX\/nz3U9to8sEN2J7e3\/Jqv0N\/EHE4KpjMN9JHiSvK84UKtPLMylCVenUcIOblxJObpxqJOpKOvs03G0rs6cR4vZfluYvI8Z4f4fBV4UVWq0K\/EDpwpU6uH+sxlaGBhSUqlKcakLyvzyipO\/unlnhn\/grJ4G1XwGda8G\/sRWUHhm\/18Wa+Hk8MfDLSLi6lj0+WdvE82iWHw9ktTo9rE72r6u7O4lleGJZIhcPHEfoUeM+OcXi\/HPiOpCdJ1XiqeRY+dJ2aTXtMRxFTnOV3dRjzKUdUtVfyq3jp4e4GjWpLI8pw1RV40auXVeJq7qylJKcqkqcMBWpRpp2vKXs7TVm21p5TN\/wXQ0m0aSDR\/wBiPVIfJuJIU+x2PhKBHeN5IgyGx8CRgrG0bY25LSAEElCgmH0IeMneGO8duJq0k7TjDhyrzabqM58QJ+79lOXe67aR8aOGJqNWhwhk01JKUKkuI5zTi9neng7NWey16Pub9v8A8FyfFcWhDxHJ+zePCelkxxJJqOrmOZLiS4uIbe2uIrPw\/ZRW0lz9me5gE80TTRG3+zCQ7lTHE\/QgnTlCOO8ZuM6k6qfs4rK8NRUuVwjKUZVszxEuaPPFyVmra8r6ell\/ixhMeq1TC8H8OxpUJQVeUcxxGLcVU5+S8ZYKNnP2biv3tNOSVpK5zvhX\/gvl8WPH95qNh8N\/g5pniG60eG3vNVgtvEmtQPYWV1OLWxv55bm40u0FjfPNCsNyJ0DzuEcRoFkfvwv0C+GsRZYnxO49xFW3NKVH+zcOn0UkpUa1t4rl3b96+ljix\/jJXwdRez4X4VVKSa58Sqqt5O0JXuldPmatpvt9D\/CT\/grH+0j8ULLxFd3ngHQvBY0e\/wBPsYW1JPGGq215JeJcSSZvoPFNhZRSQCJV+zC4a8nV0MFtOkU\/ke7hv2f3AcaqWJ488SqsZWcpTzLJIq92nFShk9SouZebjo1ZczZ87i\/pB47DUoyw3D\/BcqnNyrD0MJiarceWTdWbnUglG\/LFpRvu+bZFbwx\/wVC\/aL8YfD\/wx8RJLr4T+H9M8S\/Ep\/h3JYyaX8Ttb1TRfs9hrE+peJ7yw07Wpb690XSbrRZ7W8TSbS9v5I3+1WNrcsyWz88\/oM+GUJV4VM98S8TDDw5nOfEOTwo1J+1ilS5p5IvZuVLm9m0tFdWex69HxszutXweGWG4NhisVGVZYGnk+Lq16WG5KjWIlCeLinShVp8knTurxacUmr+13P7ZHxg8TXmo6t4D+K\/hC7+GFpZW72vj\/wASfCDxd4Wm1W7LNHdtaeGdV+JN3qFtpkcrwQ2dxqMlrfX0yTqNPhV7I3PFQ+hf4SzrLCzfHeIxNJt1Yx4swkqdJSbS9rOjklKHNZq8YJcuurPex3idn+Gw0MZKrw1h8NVko0pTyBwjUe0uSk8fJ25tIycE5X1ep80fBP8A4KR+OPjf8XtV+CXgH43fD7Wb1PAWp\/Ee38SWXw01q4sJJE8TSWHiHwfeGH4nWtpZeJ9BF5ZXUi2UOrWV3ok8t\/Dq0lxbTW0XXmP0GPB3CezxKxvH0KNZKU8NS4mw6oQqXlTb56uSVKs3KcJNpzhdLTy87BeMHEOMxNTBUpcMVK9Gnz8\/9kSnVjG7ajKlDMv3Sirct4JW0T5tD7Bk8fftERzbrj4veGzIzRtGbP4V2MKh1g8uMIupeKtWXMCRvtiYuolknEjBZDdHko\/Q78C8I3z5fxZjJKy\/2ninEK7unq8Ph8P6aWa2StqesvEPjWom4Y7JcPH4G8Pk\/JKOmqj7TFVFLa7U1a+r7Hn\/AI2+NH7QPhXwpf69J8ZNRMekWa3T6fpfgvwBYtPiWCLYLnUfCutyApG6O5khLSCJRKYmlu4rH6fJvoj\/AEfsXmGGwuK4Gq4inVnJS9vxPxTObtTlL7Ga043bjq2r2vqrK\/z\/ABJ4lcd5blGMzHD8QuNbDU1JRWV5XGHLKpGDWuHm9FNtJaOSV11Pmf8A4bo+P\/8A0VHxx\/4D\/Cr\/AOdVX6P\/AMSY\/Rw\/6Nvh\/wDw\/cS\/\/Pk\/IP8AiPPiP\/0UdX\/w35X\/APMZwX7bP7M3ibwlrt38DvCevxaj4yl8R+CINN1\/XfEur+PIZ9X8T3cWpSXN9q2r6VoMt1DJ\/a0zW1rDpum6RpcEsNtYRW+nW6bf6AyTEU6WRxrSrwq0qVatarluEqQg0sTy2oYePtJzi5Plcldyg25bSM+OcDLEcdzwlWjUpyxWAwk3TzfMoYisnLC0pOWMxlVwpxnGUG3flinFWi7rm\/MH4X\/BeL4G6\/qT6F+2v4I0vUNOuDdX9pdeC\/GGt6UL1riSGWUPLoj6V5gjQNdGO\/UxSN5F0Y5La7ay+rwmf15Uo1KaxCpz0gq2Aqx+BuN5RlaaSd1LmtLRp6o+DzTh7K6+IdHFVMuWLoR5OfDZnhatRxn70YwcHKnO97wi4yumld6n1h4l\/ZC+Ityljr3hf4zfDi00vXoTru7SPhjDf6fcXWqF9QnuNJk1K71GR9Nv3uxdfZnndLcvLa20a2sOn2Y1q0quKqVav1ipBVJuUoUpOnTvo3ywcZOLvq7t63OOFPLMBQw9BYGliHCkl7TEUYe2esrc7g6cNNUny7atvr9ufsk\/ADTrTwF8Wf2e\/jPbeC\/jkf2h9W+F+keBorv4RBbez8UWGuapoWkxS6fo0lxBcBLvxQmqprggs7jRJLXUbibWBYXN0U\/NuPchzivQy\/F5VWr1a2Dr1pVIe3jGsqc6ensbpKTnNKFSMr3he1mrn7F4TcTcJZZj8bgs8wmEoUMxp4eNDnwk54etWpVlPkxKjN8sIq7p1HZQqattOx8pXP8AwSe+IX7AB+LPgXxxdeFtB8Q\/Gq+0JvDviaXSX8feJfDHhHSfFNlrPhnStH1NfHGneFZBeaikUHi\/Tde8EX93qcFnJYQ6lbWkyySfWZBlGOlk2EzLHKNKrinUw37uq3KNSjGPPGcrcrk7qdot9Utj43jLM8upZvicLl6eKy6EvbUKlahKMJrmnyQ9lNqfs1FRhFtq0Wt3ZP0bTPAPiP4UeF7Dwjqnj8+KNPtpZNfk0uTwTpHg+7Ov+JVt2\/t28j0nVbmO5\/4prTvDumWaHTooYltrm8glW41TUGu\/a9j7CDV3Jc7es5Tbslrecptaxasnbd2Tu3+Z1Mwy\/FZjJUJUoYmOHiquHoKnTpUowk02oUoxipyclzNu7Tjbo18P6v8AENPhj+z5o9t4P+Nmp+Ftb8O+PNX1qy1Hwr4dez8SeH\/EPjjSfEI1bQLfX7DxX5s2m65u0TwbrUh01m0RL231thZk3umXPg18HQqUpwlOjXVStCtWw8o7P2Voc1t3DdXuk5a3PscHjKKzrB4+lLF0MXgsDiMuo14qfsZQnVVWvBXjyy96Lbak0lta7v8Ar1q\/w2+HvjaDwV8LdQ+Kmq+F7s3OhXWm+AvBWqeFLLW\/FmuXtq9noiXFjqGg67rF+oWa6s9L0rTYraC4nmmV4rwraJXweU0cfhsPUnhML7RYqdaVStUpuV1zyp2Ur6JpeeqTXQ\/V87xOR5jiaFHHY2VOpgoUlTw0KzpxjVcY1OedoyjJqXK1HVaWel0em+Mv+CWvxz+Df7XnhH4yfDf9ngWXgnXvA+kSeOT4L8P2WkwaJ4w8QaVrNjqVwtj4ejm06XXfEGoy2z6ppvhzRdG0fS55fNuHsrma1EvvcJ8MYviDMqmU5xnVDKsLRw+JrU8xzOvGpQhCPLUpQo01UpSr1YOLjOMZJwg3J369\/EOdcO5fgqGeZRl2DeZY10aGLwuV4XD4bF4mpGrWqYqWNmqE506DqVnXpuyU58sYPRW9b8VeG9R8O6odD8R6TqehazavbpcaXqts9neJ+6+ZhBKkfmRsNqrJErRMrxxqohayhg8jivhLMeGK9KWIr4LMcvxacsFm2WVniMDiorZKTjGdGqormlQrRVSKu\/eiuZzk+fYXNqc3RVbDV6Si6+FxMIwrU+azTUU5xnDVJVIO2qTs24rw\/wCMlpFL8O\/G0axhivh\/UZgC7HaIY0mGMuATiFejMxxIx3fvmu\/M4fT\/ALZy+90nXSvbpKMl+unc4OMJSnw1nEL\/APMHKSSb+xKMu+1l8j8osP7\/AJ\/\/AF6\/Zby\/l\/8AJkfzRr\/NL\/wKX+Z9h\/t0fDz4lfETTk8HeBPBvjLXvFFz4T+BNl53huTXtStBdaXpfgy18ReV8QLnTdQto7vRorXU4JtY1OM3sdxZNd3WmSXDC3m+Y4awOIwmV1sHXoTpzjmeYulT5ORKjPGTnTcFZWi4Pmjppo7X0P2\/jrMMPm\/FWEzbCyp4mhU4fyaniZ86qf7ZSyujDEwqQlJyc6dem41E0+Zrqnd\/Kfw2\/wCCRvjeK0Gvz+Gm0lb+0heTR9V+OXh1ruzv7ceVqGnzXK\/Ae1jW4t9SN5bXVxbG4MNxaym3mlhl2XXuvBSi0ufF6PZYitLXz5YWT3vsm73tqfLVMRUlytUMO2rrmeForR2tZJrZLRJ6JaH1L4f+C2t\/Bux+Anhbxm\/jrwpqWr33jrQPD\/hLR9f07xn4Rnlvr7b4a0XxffaSYLCWWQeILC3sJrPSrNtNvtH0+00yOXSnukk+fzLiRcP5pgcHXTWDrUHUrqs6irK9Vx9rTnKmoy5d5xlOzj1UtD7jIOB\/9bOHc4xsYTpZjSxUMPga6pQjhvawo0p+wrSUm6ca\/tEqb5LRqe7ezV\/1x\/YC\/ZTvNM\/bH034vfFmztvDmifB34ceKddsbnxD4ksrqz0Pxa9vBoYuRa\/25Pp2iW2mWGv3Guedc6dEF1i2i1GK8t5S51DbFZ7k+PlbBZjhsTUfJOdOjW5p+zVlJyin7id0rOzTdt1p5GH4P4jyejSrZtkOOwlONSVCjVxGCmqc67bahSrTppzqPldvZN6K7bVmeHfHOz1L40+JtZv\/ABK83i7xPaeNbnXtAuYTPqlw+tiDUNKRdNji+1S3ET6XrOo6bptvAZYxFPAsKskUan9WxeMhjMHRybC0KXsMBh5VnGhb2mFqU6EZyUuXl5ZzSqNv4nFt3u9fjsfQqTeJrTvGVaSp2nrePtJRSi3dx95xjZJWa7I+dfHH7F\/xw024u\/EPhT4W69q\/25JU1PQNNsNKvNeudSudTNyuqw+I7250aJtLjtlZH0eV7x7aaeCG3vLqCxFzP8dHDYiPtW8PV5pym9ITaak+ZK0tn35dNPVLzFgJRb9nRpU4yUVLkhCnOWiTc3CMZyXN7zu2tLrVI+OPCn\/BIT9pHxpZ+IG+JvgvWdGstZ1PQ7vQ9L06C7tr7w9bw6wNSv572KwTW9GvtTVEsWnMEcZvJrCaTz3mukuI+F5biI+2nRwrnXkk+WTdJTcU7c8nFuy0vZa681j6SlUcqlJOUnSo80VzJ1Eoz92fJCSVrx5tlJtNa6I\/fr9hf9mDxf4C\/apl+N3jD4faCzeGPAes6ho41LwPp1vrNx4kTwpoPhkzw+N7\/wAPxa7pUwitroQRxy3hlSd3DKqpBF4mB4fxuHeHjWj7CEnKk5ut7SnGc5ymn7P3Wrr3VLpLXufYYjNMPj3UpUoqLXs+Xmw8YScYxUZOVSzd29rbp7s\/Uj9sv9rDV\/2c\/wBm7x98c1uJNJufDem6AbDRZtJj1lm1O88RWulTQTw2\/wBonNs09\/Bp2p3MrfZrKOC+v4blLa1ur639nL8tw88UqeKlOUEqnOqabXuxTj7y93VtP3W2tnY8+rJ0aM5xSckrLpttd2T\/AD6dD+Sq5\/b+tviJ+1N+z\/8As4eOda8Qt8VNc0vVtPk1+88N6Nb+APFEfipfFPjjS9fvfE0+u2Mmjr9slXTIZNN0F4Swg0\/UbKC3A1K2+g4uwVPE5XLIXCdLG1ZYDH4ZSinh4KNCNKF6nOrqVL2j5nG8Zy5HGzZx5LmVTDYxZjOKqUKdPEYWrCMk6zjNrps3GVnHmkkkvk\/vzx58GbzW\/DPiLS4\/Hnwktb7U9E1OxgXVfiT4ZsLYXd3aSwwLd3El5M8EAlZPPmjtpmRFaRYmkSBY\/wA8wHBmY4TGYbFOrh2qFaFRxVTVqLu7XildrRK9r6N2ue5m3EVDMcuxuBhg8RGWKw9ShGc+RKLmrXdpSlZX2Sbd7W6n5+f8MP8AxL\/6Kr+yr\/4kBoX\/AMpq+6+rV\/5I\/wDgyH+Z+Tf6t4j\/AJ\/1P\/Ba\/wDkz8WrP\/gpL\/wVq1edvK+PH7RcxeNsLpXh2Sz5PQqNK8MQEcjjbjnke+f1jGL7ddXv9maWr846ep94qWHWihTvfR7td0rvb9B9p+1b\/wAFitbga+sfih+3Zdw3M+pSLNpEnxfSzeVtUumuDbrpdrHaqftBmWRIVwkgdSoIYDN1MU7tzrq+qurXv209LJ26A40VuqafS7S2+fREFz8Uv+Cy3iTP2rXP+ChmtI6GIiS1+P18jxSBw8JX7JInlyK7LJGAFYMdykMaipQrV481XD1aq5XDmqYfnXK27w9pKm4pNt3UZJvVO+xvRxMqFlQxEqUedT5aVaVOLmtpNQnG7Vla97W0tqft1+xf+0N\/wUp\/aJ+GXxJ\/Z5+P3wO+I\/hK4tvg1e6deftJ+LfhX4y8G+Mr74exa34b0LxFoWr6trHhX7D4p8R6domqS+KLCJ7vR5dUj8NXU+p39jcx3PiKL8wzHwzr4jMFiMoxksvoV69N18BiFKnRmnUjKUMPXjeaSl78KUm2ntKyVv2LIfFpYXL1hM5y2lmWJwtGusBmVOSdSjOeHqUFUrYeTdOVR06koTq00m1ZyjLVv6P\/AG0vCWq\/EL4QfFLwr+y\/e+KfAGr3XhHSNF+GmsT63JH4puLnwTYaA8pu9dspre5sNb8bxaM9learHdPNaX\/iK4upL24EMsr\/ANUZFwziqPC2Ly2EsHSzTGYWUp4mLqVsTWjBRq0aeIxla0abxFOl7K8byld1ZTSjUa\/nLM8ypVc5p4xqU8LGukqUVFUacqkpRuqKjrCldSSet9HFyufzWn9m7\/gsZrdqR\/wrP9u+7jlYSobpPjEiSLLtYOrXd2iFGU7lkBClSSGIPP5fLCZg270sWpRbi7upzJxdratu3ppZ6aH0fPh17\/PS00veCtfTpbv21ZoW37F\/\/BXq8tmF18If2t5FyDt1TVfF0DZ6Hf8Ab9bjIGOCTkDpmmsBmDV1h8XKyu3++bd1e7V\/038x\/WMP0qU16Pf8+\/4k1z+zR\/wU2+BGheLfix4o8IftBfDfQ\/DvhTV5fEXiyDxxeaTe6dpctqS8ksun+K49VlhF+tlK8MEcoMkUbyR7Yy6Kpl2PhTdWrh8TGlC0+epGbUO0m5Xa30b0V+isaUMRRlUUYVISlJNKN99LtdOiZ\/dn8ev2j\/g\/4n\/Z5+CfhXx38HPjr468PfG\/4UfD\/wAf6PcH4PTXfwkvj4j8D6dqWkxePfFF7cWdkl\/FpV48lz4US\/srotcS75Le6hiuY8sjWMq5jCGFwv1idSc6dTkftJxhpzylGfLRgpXV6tROKaWlkzXEVKUKFSVZqMN0rP3pfypJpu+3Kmm07Jn8SX\/BWT4PfE7xH8aPhK1l8LtM8KTeIbi40jRdRt9SstMs9QS98X+FrfQYddW\/03w\/4b8BaZFBqU00E0utXui2Oj2klxfataw2ckNv9lx3TrzWURlhsJSjShPD060MTTxGLqTi4e5iqkIU6MVHlTSpykpNyfuJJPxcnVNrHyVSpKTnGoqfsHRgo2k7wTbk4xWmsevxNngo\/wCCZH7VE8Dxtefs6wTSgxw29x+17+zAJric48u3hji+LcqvPK+2OJMjdKyqOSDXyLwdbdeztorOtT5rt26Pltqvtd\/Q9L20L297\/wAFz7X35bfLf8DA\/wCHSn\/BRr\/o1Tx7\/wCB\/hX\/AOX9ZfV63\/PuX4f5j9rD+9\/4BP8A+RP3A8LaD\/wU58eJ4csrX9pn4g6Z468c+DX8eeBvhJrn7R+vaD8TPGPhGO2ubmDWdE8Lza8kcQ1K0s7u90yx1e\/0nVNUtLae9sLKe1jM1f2hiMR4eYGdec8hwdXB4PFfU8ZmdHJFXy7CYlyUXSrYlUvsSajUlShVp05vk53zQ5vjWsbNJ\/WGptXjSVScKjW9+VbO13Z2bSstzxr4daL+2z43+HuufFTxx+1J4y+DvgCx+IfiPwAviz4z\/G74n+H4Nd8dw63qcmoeGtF0rSh4j8RajfaWEm\/tm7GjppmlGK5+3X8MlrdJF1yxPCOGxCy\/BcOYfNsdKNfFfV8ryrBYp0cD7T9zXqVKipU6dKalD2UPaOpKMocsLbJLEyj7SdaUKfLBJ1as1eXKr2jq3q7uX5u6Xtc\/7I\/7eVzod7ri\/tOxeIUs\/iHoHwufSdC+N3xa8Tatc+MvE1jpOt6NY2FtpGg31vf2l54X1yw8XDVbW6l05fDby6g9yrQTwR+NiuM+BMtpzr47JFgcPRy\/FZniMRicnwNClQwuDlWp15TlUkpqpGvRqYaNOUFOWItSjFu9u3CZdj8dXo4bCyeIrV6kaVOlSnUnOU2rpKPKtFG7bbSUddr2+pdR\/bLg\/YPsND+HP7OHxR134seOH0Kw\/wCF0fFzXL7w18SfC\/xM1OeMz3Wn+A9S8VQ6trvgvwlYyytBBBaR3A1iLT9E1iez0zUm1WTU\/wCI\/EXxJx2e5zVx2FwVDCZVRqSeW4SjPB4PDUKKs4yqypRlKviXHWVWabalywcYxaPs6GCp5bCWEm39bpSccRVaTqKpZqdNtP3UnZKCdtLt63PgDWP26vjL46v73QvCemeGPDuqS3UM+p65o\/h7UpYrSC4zLcRWb61f65pqXt1GGYXJtY4bY3AnhIIjir0+DOM+L89cYycMuy+lFwdahSlVqSpNRi\/Yyqyq04xqR92VVUoy5W1TcbqR4+NwWWUYqpye1quXPyvlSU+Z62S5n71rXk1d7XSPLvEHwovfEPgbx38Tj+0AIvFWm6TqHja8+HOt23jG1vNbt4\/E+kaJrK+HPF4Nx4M17WreXW7bxHqWh6dqX2qw0e8jYRGWO4trT+x+A+Jlj8vyrB4vKniZ08V\/Y9fNf9ga+sRpTq0KuIownOuqVSgqdNYqTmqlZTUrcsnH5vG4f2bnKM7KVpxg1UTtK10uaMdVPm9zeMV2snx\/wl\/ZX\/aj+PXhq48W\/Cj4Y+OfH3hu31W40O41nSWjksF1a0gtbq5sXnvL63Bngtr60lkBBwlxG2ck7fts04i4XySusPmeOwGArypqrGjVhao4O9pWhScVFu6j717pppWOGFLETgpRVRxezi7pNJaO8lrqlZJu91bvo6D+x98cNV+KHwr+E\/jfwnr\/AILk+NWq3uj6Pqd\/aW2txxaJpV\/c6T4419LCy1RRfL4LtrXVL3VtMe9sbvGnvBmJ5YnPzXGef5Li+COMquCrYfGvAZLjPaUqUZRqOvLByr4SklOkm3Xkqaoyjz3k1y6o9jIcN7bOsqw2JrxwtPEY7D0pYipecaUKtSNKVScOaHuQUru8opq75la5\/eZ8DfidoHhr4dfsgfByzl0HxxoGofB\/4X+E4PHH7ua31D+xfBmn6EL+xtGGoRyx61d6SY0xcyLbTXKmW4ljjLD+GcLhpV8oecQnUo1Kl5yoQqcqpuUYSbajyv3HJrRpPldo2P0TOMBDLszzHAe0jVWFxdejCcYr2dWEJNU6kUpNRhUjaUUnJKLWr3f8tX\/Bc39q7xn+y9+0J8Vb7wh9qey8d\/Dz4rfDbWJtR0rWfEy3eo6yPhTdeG9J0u9tvs+meGlsba21rWYLTxDeXGlzaToGvSx6drEkcOjj6riGMqPDPC06NaWGa9piaqw+GwtR1Y0lBKNZ4uhi6fJUkpyqzhSp15Rk\/Z16TvN+Bgq0VmGZ88I1VCjRpRjVnUUXzuLcoKE4SSSi4tRlrz3fZ\/y5fFD9nv4hfCzwB8DPiZ4l06afwV8fvhppXxE8GeJ7ezlg0u5nknutM8SeHpJAv2eDWPD+t2F1HNYrJ5j6Tc6TqixxQ6hHHH4UYVPquHrVNfrNFVE0tFdNrpZPTb59TbmUqkoJpWlyuN1aLaWrXS2j26H6G\/8AC4tb\/wChg1b\/AMG17\/8AHa9znn\/NL\/wJ\/wCZxe1fn\/4E\/wDI\/ef41+BNf8R\/8FAf2ev2q\/BF3pmn\/Biwj+Gt\/wCPvFc2uaTY6L8HX+GAOm\/EPwT46uGvVh8M6lpmmadNZf2ZemIale3s2nWC3U6yx1\/RuUY\/D0OCM\/4bxVOrPNZ1Mf8AUsOqdWVXM3jn7TBYjC3g241J1FzNtOiouVRwUHKPzlSL+sxrJrkj7Nzd37qjFJqVtm0rpX1UkeG\/tM6\/4V\/bt\/Z6sIP2fda8MN4o+D\/7T\/7SWtav8Ndb8T+GvBeta54N+LHxG1zxb4f+IejWvijVNFttRsxa3lkmpLHK13p1zqGoxyxrFbF5OrhOnieDc5xTzvD1o4bNcry7D08dTw9fFU6WLy6GHdfC1HQp1qlJ87cVFr33C8br3m8V\/tWHSo2vFpuPNGM+V6KUU3Zx636Wvrufd3\/BP\/wlpfwp\/Z6+PXwh8S\/GP4beL\/HU19feJtMu4\/HmieIby2+zfADwnpGtxaZB4Z8aHxXN4f8AAup2934Ck1jSdT8PTX2jaReHQrzSdLu7K8T+fvpSYp5rw5QxuEwOMwWCTw+CqKdDE4anUhLNcw9n7a9OlBTxcIfWZUZc3LKbcrta\/png9Sa4qw1JcjqfVq8oyqRhV9nKFNXqKDbu4K+qWib6pI\/MT9k34F\/DTRrz9p3xj4+8b\/sw6jb\/AB5\/ZV8Q6t4AvNV8d\/CTwpFpfxk8Z22nX2maXb+Ada8SpP4A8Y6BqNve6fda6dPsZ2W2ttQu9Zke\/wCOrw88P+FJeH3BGJlkOZZ9meNzDCY3Oq+Z5XicxhDL5yqTnh8vUcNOhTy2H7tQVP8AfSkqjnUfunh8Z5ji6vFGdQ\/c4eGHr16FOGF5KXtHSbiq9XVOVWpJSk23a3LZRfNfr\/iF8LfhD8Qf2Zv2GfC+t+OP2Tl8XfDEeL7j40arrPxu+Ftp4w0Hw9f63dXPh+2F5ZeLjD4kFloWs6pqB0G5i1dbLVrWyiRdPvInJ+q8RvDyhxhR4xwuDwmfZM3HA1uGauV5XjsNh6k8EqVSpg61COGap4XE\/V40ZTjThyU5uad9JePw\/j\/7OxeCq4pxnh41bYtJxlVjSqNqpOnKSkvaRupqN7N7tNWP0f0j9kT\/AIJzW3wB8f8A7LHwf+OvwY0L4efELRrD4k+A9D8X+MI\/FnxB+HnxY1fQtJtY\/Hul3E2qvq0mk+JrDTdGv9Q0u1Fkbxxe\/ZZ7rTdfaGy\/nXg7xizLw3zfEUc5wmOjjMDmXsMVl6cMD9XpUG6eLy7FUnhpRco1IRlRnFcurmm3KMz9cz3w8p51TwVfJ40aFOrRu6sa9OtSxlGpL2mGxdD2mIVROpTmuaM2vh5XBSTRy3wD\/wCCW\/x8+BWm\/HfS\/hP8S4\/iz8Ovid+yt8QPCmmeJtG1+w8KaL4a+NWtzaK2nxLpMnii7vLOF9NsPtq+LjaWsthawyWuom2kjg+0\/wBCx8d+EOO8JluZ1cDUy3E5Vn+Gr4ihOjHGTrZdSo1ZygsTClGEneok6NdU6bk4yvo7fmmccF5nw7ilha841VXpSlRlG8GmpqPtHTbty35lzQnJTaemiPh\/9m39rD4Q\/DT4IfFvwj8UfF8sP7Sf7FHir9oDwR8GYtbsdSt9T1\/xF8R9BuNA8SWmkzTxXMl9b+HviVF4os7vUprmNZVtHuAEVmRPo8rzReIuYyx\/DuAr0MlzXE5bhOIaEvYShhJZbWpYqjOUaclBfWMHOnzRS5uaXLK7im\/CxOFll8nDFSjKrCDnTesOZtNSUb6tp2ST0VtHsfe\/\/BN79oGK\/wD2U\/2WtZvLxdU1v4FfGzxJ8P8AWdMa636xd+Gm8RaX470ydI3ZS8MOleMrnSLFmWVA+nRRNJEqhZPj\/FjK3l\/EuZ4PD4eNKhm+GweYUpwgqdP20qSwleMIxSi26uFdWTS+Kpy2tFHr5Xifa4KM6sm5QqTjNylKc904ubk7uysm7t+e1va\/iL+zb+y3+27+0H8YLT9or4U\/27regeNb3X\/C+jX2t+INEW78OyWsnh3UI7pvD+tWC6vZ39mLCe9hlO3ytQ8u2EcD3iyfN18vo4nKsrVfnxNLCUvYybaUYVIO0o8lNpqCk5xlzpuVlzX0OH6y1jMXGMXTnL2cldJqUEnFSi23dPR7dfkvW\/22f2Pf2eP2hP2TNb+BPj6Tw78M\/BHgzw8NY+H\/AIhtf7E0Gw+E934N0m4\/sbU9LW4tjZaX4b0fT1bTtV02zitbd\/DDXWmwPaI0MsOFajRnT9jJKEFBJNaRpxjs1ZqySXRare92XTlUjNShzOWl29U7fzX6taXtfY\/hP\/sDw\/8A9FR8K\/8AgD4w\/wDmcrz7ruvvRv7n978D6GP7Y\/7GEEbG2\/Yx+L90pDEDUv2sLOPLAHBcWHwEjHQckEYOflxjH6dU8b+LJNcuHyxWVot4fWNt7fvmrNadE7tHO8jpNu9etq9lOTv5tvRf8C2r1OWsP22v2WrT+1Es\/wBhG9uY21a6kibWf2ovHNxcKJIbZyk76R4F0KCQK27DJbwMVKg5YF2414z8YwVRRng4qpUlVko4SjJc8t2k5NrpZtyaWl9C\/wCxqKt71TSKj8UdUv5urXzW7s9T7E\/Ya\/aZ8A\/GP49Wnwv+E37Flv4B8QfEHwX8SfA0nj3S\/jR8RvFUnh3\/AISrwB4ksNLF5Z+IvsnhiC31nXRpmix3erSQJFcX8bW0q3ot1P514q8acV8ecHYvIcZWoYhTxWAxdKhSw2GpVZVsLjKU1JVG4S92Mpt3qtOLejWj+14AlhOHuJcJmNaq6NF0cbh61SabjCFfB1qUXeEKktajglpu1eStc+StT\/at+G3wf1O7+FvjL9hr4c+J\/Gnw\/uJPCfifxH4h+MXxpt9Q1rXNEJsNR1K8sPCnjbT\/AA\/aTXN1FLK9rpCCxhLeXAxQBj73CfiDxhw1wzkvDuHxNLB0cpy+hgo4Z0MPiJUlGCnKLqzhNyalOWzVnfV2TPn87wWFzDOMxx8ZussTi6tWNRLl5oOXMmk94tt8ui21XQxNZ\/bz+FkmmajFafsD\/AGHfYXSB7v4h\/tHX7IXtnUNlfi5ag7QSQDgMevHB9up4r8aSi4yzOMqbTjyLC4SKtJNOzVD5nnLK6Oy5tOnuq1\/l+HqJL\/wUS8HNI1xB+wV+yoJJUjzJdal+0TeMYyuEVmb44KzLGmFQMxACgDjgeFiOO86xs6tbExyzEzxN3iKlbKMvqzxHS9acsK5VHZJe83zWSkpJtPpp4WUI06ccRjIwppKmo4mtHkjGzSi4Si42a0s0199\/cPgn\/wW9+NP7P8AdzW3wl\/Z\/wDgh8NfDWr6hY\/8JZo3gfVfjjbNrmjpd2v9sWcNt4q+Lvi7wxa6nqWkxXGlQ65d+F9TutOS5MsETGMRn5fG4ijjaU6f9nZPg3VkpOWX5Tl+XTlO+raweHoKUpq0XeLaSvFJtt9sXX9rTqVsZi8Q6a5YrE4mtXjbSySrTna1tOXls9eiOY\/ax\/b9s5f2wPib8X\/hr8LPg\/8AFL4VfGTwr4A8Z+D\/AAj8XvBFjeWPgabxD4V0LXfFVnbweBfGHh\/W7vxdYfEi\/wDiFoPi7XNWvDaa3q+m3moNpsrS2F4MuEOJs+4VlmGW5NjauX4StXWIxFGj7tKWLUVTVZ8yt7WVJRhKSesYpNaJk5jhaGNlGpWSq1IpJSutVZNxstFaWr67I\/XD\/gjp+1ZbftV+G\/2o\/gx4i+E3wW+FXiHwl4W8L\/HDwO3wk8Oaj4Qjnh8P3t74V8ZzXz654q1+e9u1l8R+Bkg+zzRYtY7tZYp5Dbvb\/QYriPM88zHC4jOMZUx1SnSqUabqNVZNOSnCCitlzpvZJu731MKOEp0aVSEI8kai96\/pbm1tff5aanUP+3T8Z\/ij+yP8Rv2qfh\/d+DNH\/aq\/ZS8e\/Fj4R+O7G28N2rWGreFzeal4x8DeMtV8K+Y9rs1Xwqnjnw3PLPcnztd8IS30ZV9kIxwWIrNZjhIRn7VQqYijGMXyx5HaonFXsovVrq3fqc+Kw9NPB1JL3ISWHqXVpVIzkrPTXRpWT21XXX8Jvir\/AMFhf2vvjPPpl98VvDv7N3xDn0G3u7fQpvHH7OPwy8Xy6LFfNBJeLph8U6Rq5tFuZbW2knSILHO1vC0qyGNdvmyx9WesvZSdrfAm7emt9+z+42+rU4KyUrX2cnFX849X1v8A5Hmf\/D1r9t\/\/AKHz4e\/+I9fs+f8Azsaj65V\/ko\/+CP8Agi9hS\/kX4\/5n65H9jPw7DAq2v\/BHvxnOD8irrn7fvhCEnJUfMdM1lXAUN+8KElFJI6oD+U\/8Rq4AunGriGl0eGx616358NB9tk12d727pYPGpNtxilvywu999X3026dyhpf7G+u2t3epaf8ABGr4XtZ3N+95by+KP29vFd1dQI1pZxC2caN4jRJl8y3lmBS23E3BiZQqK7S\/G\/gRP3aeKnZu9sNiWmu6vGL1t1SfZCeBxskmqrjf\/p3HZ28912af4n7Vf8E7vC37On7P14PEeo\/8E69K\/ZU+Ll94ZudH1j4l+HPjHB+0LobLbT2l9HZ6fF4g8QJ4r0O112\/skbUbbQ9GaaNEtbebXLqDY8PhVvGThaviFaviadOUm4Slgq8I02vehCTipuUdNWo6Pe2x30cO6cVGrebtyzUlyt3Wr926vs0mrdz8vviZ+zb468R\/FL4j+JNK\/wCCe37HvxUsNe+IHjHV7H4mfEv4p\/Gb4Z+JvFdrqviHUNRt9R1DwB4dA0XQbWCC5XT9Nt7KCF7vTLG1vri2gvLmeFe7\/iOvCVJxhiKWLxddxjOpiaGErzp1JTbs026bi0kk+eFO+lr7nFVy+u6klQrSjCCSjFQjom24rXRpa+qZw91+yV8bLyCe2tv+Ccf\/AATN0UXME1vG+p\/Fr9pDUpcPDIu5DbWR+ePJID4dpNqgZwDM\/H7g1Nr+z8fNrosM9Lrf\/eF2XlrfqZrL8R9rEyi7fFaGvl1+Xpuath+y98foY47X\/h37\/wAEm8wJFAHuPEf7QkzHyk2J5\/neGrxnkbZyRGg3Pyij5ayX0heEb8qyzHpr3VGOFs+mq\/2jXTv2+ZbwGKSv7acV\/eULX78zei8tfW7Nq3\/Zk\/aJwwtv2Hf+CP1m6qXYXGn\/ABx1Z0LMVQE3HgHbIXZWwrP90AnO4VjU+kPwvB+5k2YSadk5YaEbdnd19G3v1736QsBiHJp4ly10ShF26NJqyaelnt18y1H+zJ+1PJuEf7If\/BHq0dSTGU+F3xKvgFAZjzdeCo0LBBvAzuJ3DO5Tuxf0isgV+XIsa00k26OGSfL\/AHp4hXt5vvqEsurJa4iva9+VRpu3ouZvTc+qv2XPA\/7Tn7P3iXUviz4m+H\/7BPgDw9b+E\/FGjT+Ff2S\/gP4hsPjf8SLbVNNES+FdL8VXMHhq38EaFdXb6fqdx4m1G7uP3+lRfY9Iv1huLi09zKPGfhzPadV4qNDI40akHBZg6VKvWlGV5OnSpTqOdKS+GUnGM9Xbc6MPl0qb5qtarUgotOjKUYyk2tOV3ez++z2vc5fw83xzT9nn4y6DqPgXwB4f8dfFb4k+FvEfwp+HnhD9nO88K2lv4d8Hax4u0yXUv2tdbsrH\/hX\/AMTtS8WWuqRalp\/hvU7m9P2WWbVNeFjc6vdaXbby8ZuFqGLrz+uUeXDQqRpyo4OdaliI1Kd7w9jGa56k24uMkvhblJbOlgaaw9aNVybnNeyg5p1FOMo+zblpyQUmpXV5NJrZnz7D8CP+CkRbZHqn\/BMLQyVYhbT9jnT2CiMvvA874egb4wASpcfKd2fX5iX0iMCpPlySdk2k5fVYppSaTlGDlNcySaVr2cb6XZzLLnJX56l0\/hnKV3bz5XG3a8lr072P+FJf8FIP+ih\/8E2v\/EMNM\/8AmBqP+JiMJ\/0JH\/4HD\/IX9meUv\/Bh+vzWOqpMpLaW7RrI0rebaSuuwI25HNpGSNv38jcjJIr\/ACKu3+XPYYyLSp8iur8rrxcm+6Sik0krvfZ7nsXqS0lKTTtdXXyf3r\/IjNjqrESb7KMs+8HyyqxliGLCYTxLtZgF8olYn2AuUCJSdLGRfLKpG92pe+lZ6pbtPfpa+muupPLO+kpRXk1svxEbT7wQLvuEV1YsxSO5csgLbTF5OvQlssAFTcPNDje5csgl0sQr82Js3vHmnbyfuV6avp\/KvNstudtZc8u+trdtWn\/T8iaLT9yhU1C5AJIYKJRlEyzhzJ4uCyBgUZizMRsO92DSKLdKdv8AedW0pJSlNNdb8+Kf4X\/MHFStd281\/TH3WnW5ZfO1u\/eQkbEhVWdAwPmkGTV58gldz753UbMso52r2Dv\/ALwu7SVJdL2TdSf3dNrq1gdGNk\/aS125Va9r3\/5eRla9t1bXrYJYdMhwq6pq5RmeRY4Y0VhIqgbBcSXjKF2lJEKnDOWKFTualKCp\/DXmotczhGVJNN6W0qNtqy1U1+GrlTpv3nK7WnuqbdttFOXKu71WnS5nB9FtQZp1vplKKWEzwCNAGZ9o3zuuB5Z4Tc4ct3CMsqrRjf2iVTR2Uq9JNvTdOvfmulpdWfQzlCHXmae2rT\/8lf6teY+W98P+X5f9izkKkbti7s2LRvGhjUs+oRBWIQmRmEiqzAhEKsUl42hFcqwSm7r4a+Gv3158Qo6X9enquVW9zn3t7nvNXer993a66vt6GU1xoIlRk0SYPvYjzfENvAitlJCBt1JkCyKSxbgwrhV3bgaFmdO6tg5xStzc2IwkeS2jfNHEbPXa1kl1E3SW1Oo3az5qjWvoptb3e2m2w19Q0VWj2aLAJY9ygyeKdNDRIMO6\/wDIQkDfcRMbiqqiIQRucJZmnoqEJNXvfMaMbK71TWKd2ttrP7kH7tJctOSfVc7a\/Fv77313K8lzp7SbtsNquXbjxDoZUDeWjIc3Tui7tjEGQqcDYu0EtzVcQ5OUnKMVsuXH0ErdG1HEyd9WnprpdWQnSTafK4r+XnVuvVt2v2va\/ZszvtVr\/wBBmX\/wptK\/+S6y+sS\/5+L\/AMOUf\/lwclP+V\/8AgyP\/AMiR2t3d+ew+03GBHAQPOkwCCSCBuwCDyD689a82nVqJ1LVJr3L6Tlve1997aX7Gq+OS6ezTt589r+ttDGm1TUxIcajfDM3OLu4GeQef3nPPrU1a1a1R+2q3VrP2k9NZ7a6HLKUlKVpSXvS2bXUyn1TUylkDqN+QMYBu7g4+cjj95xxxxXnSxGI5o\/v63T\/l7Pu\/7xcpS5Xq+nV90RNfXqzqReXQIjkIIuJRgvsViMPxuX5W9Rwcim69e7\/fVfs\/8vJ\/zP8AvGanO696W6+0+\/qa9pdXRt2U3NwQZgSDNIQTvujnBbGc8\/XmvSpVKmnvz+Ffal5eYSlLmer+99h9pcXB3kzzErI4UmVyVDMwIU7uARwcYyODxXVh5Sc1eTfvPdt9ZdxxlJxq3k3aEGrtuzdRJtdtND0LwsBdXUn2kC4\/eIP34E3B4I\/ebuCCQR3BI6V9RhIQkmpRjJWlo4prdLqu2npodFLWmm9XzSV3rpppqeoWWj6RK8Jl0rTZDsPMljaueASPvRHoeR7816ksNhlZrD0LuKu\/ZU9f\/JTopRjKSUoxas9Gk19z0Nq00fSNsh\/svTsgy4P2G2yP9HhP\/PL15+vNbfVsNa31ehbt7Knb7uU6uSH8kf8AwFf5FK70jSUurPZpenJm8twdtlbLkM53A4iGQ2Bu9cDOcVE8LhUtMNQWvSjTXftExrRioq0Yr3l0XZ+RvLoujmME6TphJUAk2Frkjy84P7rnkk89+az+rYd74ei\/+4VP\/wCRNuSH8kf\/AAFf5FL+wNC\/6Auk\/wDgus\/\/AIzS+q4b\/oHof+Caf\/yIvZ0\/+fcP\/AY\/5H\/\/2Q==","a_rank":"4","a_hot_flg":"0","a_views":"950","a_active_users":"847"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2F39e2ea1ebf376443de930173641a8d84","a_title":"\u6771\u91ce\u572d\u543e\u6c0f\u300c\u6700\u5927\u306e\u554f\u984c\u4f5c\u300d\u6620\u753b\u5316","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:41:25","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP4edQ8a3oeRbaK3toYnKufLLShGAEYL7wGJLBiAqZZdq5GSvw2G4ewrUJVZTqylFWSl7idk5e6orWLur32S+f6ZiuIsQpy9ko0YQm4p8jdSau+W71smrPS2t7b688ni7XnDziaZEV8K7MDGSMkK1uYyDIcfKIy23rgAZr0pZJl8ZKDpQm+Xm5UnGSWmvOrXWtmnZt97HmQzvMJ3lzVIwTa5pTbTk9lyP4W1d9eupq2\/ji+kdo2gWfcxUNLGYwQgxKQsSrKxBKuFBBAJU5+Q1w1OHsMrzjUnCyukpSndNe67u8UrPqraep10uJMVOLhOMKnI3HmqaOyteKTtLmvfbTd9brutB8Q2OrsbUbY7yPIMZBCybc8ITzuABPltztXgsAceBmOWV8F+9avQavzXTkrO12ktF0vve2lmfVZNmtDMZSpq8a0Iq8Uvda30k27S0so2bdnrpY6gR4IwCOSDjn2IOfQ+4\/KvC9u77K3fX+l+Poe5ySejVk9Hqv8AM9H8JWok13QImG5JNQt1YHjcrBsDGDgEENjrg8dgPDxzdTC4unG3NKlNLXZtrezTt56fqatpK72R9j\/8IvLFYSzLbqECZBKDDAqN2G6E9RgHGR15BHzEKdKnCnCnoqSbdr255LlnPVbzjdO3Ta2luSpNe842d1rvbRW00W+r\/wAjB+CMwj+MtvbsFjbzI9yBcKQJVwSRgbcDI9wMZbFdmNjbCwcW2nCXNZO143tzN9UmrW3W+zv50bxqrl1s1LXq222tLbaP528z9gv2kf8AgpB4E\/ZG+GNh4a0Wwg8dfFa+0yOW18OR3Yt9P0VZIF8i6167gSaRZHZ1mh0yBFuJ7cGeaa0haKSTwOG+EsdxRmUoWeGwTqyjXxMoS0p3lb2abXNJpS1vbmtpqz18wzKjlWCeJqRlUnyJxoxvecnZRWibUXrzPorXasz8bNP\/AOCvP7SPi691xdd0XwPb21zBdCyutP0e8jl0aeZHFqTJLqVxb3CxSNEQbyBwTwdwOyv1nFeFGTYOlR+pYvETqKSVRVJW9ok03KCUFJN+8mldP7T6nw2H42xtadb22GhGjFuMJL3nCOt1fmvpZp32ejXQ+bdN\/b8\/aHsdbnk8TeJ7TxhpMtzIbrR9Z0vTLVGjldmKWd\/p9lYXcEgU4ieR5oN5AkgdGKt9DLgPJqmHhDDU6mExFOLarKpOouZJfFTm5JptaKPK0naLRwLiTHOqnUcZUZScuSagm4qV0oSilON4uzUm76KTl19si\/bL+F1xFHPdW+rW9zPGk1zbrbLIsE8ih5oVkyN4ikZkD4G4LuwM4r5OfB2fxnKMKGHqRUpKM1WUVOKbUZqLTcVJWdm21ezPbWeYNpN1FFtJuLi24tr4W1NJtbNpbn5e3Ia6V7hYNkH2iFfMkHzsUVwAxZsFXMnmSK2QvQnAIP67Tapr2Up68jaVkldyd7W6WSSdz5GcfaKVXktB1oJSV7NU3JKWr1ctXO+z+HueyfAj4VQfGT4jeG\/A+oXkukWmrXsiNcQoBPIiW73kiRF8pFLNDD+6ZlYDDlVcqFPzHF\/ENbhvJcXmGEowxNelCLiqjbhT5pxgpy5dXGLabjfV6XWjf1HCXD0OIs0o4LEOrhqLcneCjety2lGK1fLzJ35rXUFqrn7o65\/wS2+A1\/8AD+z03Sk17SfFFtA9yviO31GS5uLmcwYKTwXTSWskTFlZNkUb7owMlSFX+a8N4ucYUcdPFVMVQxNOaUXg6tCmsK4xekIKnGnOmmtOZTk7669P6FxXhPwvUwlPDU8NOlNU4yeIjVkqrqTjdyblGo5O7u7tLovL8GfiN4A174HfFTW\/AWtqsl3oeoJFZ3XkvbnUNOncyWV8y5+UnYGfJdSySL905P8ATOUZthOLeHaOZ0E6LrwksTQUvaRw+Jpxar0ebflTleGnMouN9UfzjmGXYvhPiHEZZUanyShKlV5XF1aM5y5HZ296Li1Pu9tG0vS7YxXdtBdRoFSeNJFBPzKW6qduQSrZB5OOMnPT4SrCdCtUpTvenOUX5pappuzemz76eT+\/pz9pTp1P+fkFPXfXe\/nc9L8FMi+J\/DefupqlmWzlQQHBIz64PfggmvJrNNVd7SjJfLz+7vvYKrUac29lF\/l5+Z97eItZWDQ9kW1dtsCoAA6LjsByd3fv6jg+ZRpKTTlT+0rXVrq\/T\/g23PMdSKja7TcVZW308v1a+Z8g6D4wvPB\/iLxJ8QWTdFo0DRWyuDiW\/YM8UY6bgio08uPuwxO\/zY216GOoTrVcvy3DpRrYl81TqoUpvkUptKTi3blgrXlJx2WqWApOoq2Nry5cNh7zd95ct1yK21vicm9Ek+p8e65deMPjr49t7RLy7vdV8U6rHcXt3PIdzT3cgeKYsAMQxRyFBH8wiMMwVVwqr+n03lvBWS1sbiWvZYOjOVpayqckW5J309pKXurs2tVe586o43jPOqGTYWapYeVSEZzhL3407Ss01JNqycmldy0va7R9v3n7A914T8KPdPqt++p3Ngtwy4RY\/tJUmIy7lEi7wWLhDlFKAgsN4\/DoeOWIxuY0an1HDwwMa3JJ80ueFKUpRvFPlTto\/et5Ox+uYrwdy\/B5U4UqtdYr2Skqj+21DmfNHlteTu3a++rfT86\/Hvg++8MX89ldgs8ZkXcySLMojIRopFYcbTypGcKTkKVRF\/oPh\/PMPnFCnWg1aSWqa5Z86Ti00\/J3Wlr9T8L4j4enlcoXnJwt7t7pwlq3TqKy1aikt91qebJevsTKknauSWGScDJPydSa+n5I9vxf+Z8Uqk7L3nsj2Dwz4X1jxbY3t1Z2001jp11Zx3s0YYQ20upPJHbiQ7QiJI8bIxY7Vi85tskjIj\/K5jmOGy+vQpzqctfEUq8qcdG5ww656iXRNKXu6ay0va9v07KculmGFqVrNUMNXo05Tg5Rs69uVRj8CTVnK6ukrq7bPr7wx4Ak8KeMPDHiTwl4kvNN0z4W6bfeI\/F\/j5NBvdQ0yO9sLQ+fJZQweYdRsRITA7yeTGqvtiluSsiQfnNbMqucYDMcFicFDFYvOaqpYDLJYqhRnQw0JRcZVastKdSfLdK3M5Sd0le\/6DHLpZZXwWYYTFTwWCylSqY3HxwdavOrVkuVxVOK56sIxk023y3hFb6n7D\/CL49\/FfUPhfqfxG13V9J8beD9Git7Sw1q28Ovock9zcyLDHFdweYwQRtLBE8c0NvNHIyq+5yWP89Zzg8Lh8yr4F4CtgKsK0ovDxxf1q81a841Iu0ubRvkur6rTRft2V47HPLI5licQsTRUIqlWWG+rSnz3kvaUnrFNWvezWzPxZ\/ba8Qa747+JWh+PfEGm+FNOkvrK60tYvC1+93M1vYXcUsLapDK8jW1+FvXiGJirBtjpbvGA39EeFU8Nh8nzHL8MsfGaq4bGTWOoOlTc62HcXLDVG06kJezTbnFPTeyP508RfrGPzjA5hVeEmnUrYdSwkuapywr0p8lX3pXmp1GlfZXW1jzTRIHg0myWUASeWTjkbCzlmQ8DGxiwBwQQAcYNbZpUjVxtdx2UuW+\/Mkl711vzfh951YOEoYempWu4ptdU3dOL81b+mdhZXLWcttdR4DwSRSoQxyrJggnAznIznP0Azx5E6ampw1Xuu1rN7ba+tu\/maYhpUpNuySv\/X9M9WuPjDMdLayu0eR1j2K2MkqPUjhcDBxxjIGOKxp4atKLimo2cWn1uttH579\/vPEq1FzU42UlLR69G0n968jwPxL4qi1Hw3rdjNLsFzdTXFtGrMWaYRW4clAQrA25ugWcMyIZEjAdzX1GT4Gcc1wmInHmfsoKo7aJRnJJtpaauNrdNbGWPxEaWT1\/ZySvOcFG\/wAUZxjzJ+lnctfs0Q6fH8bPAttqmrWGgW81vC5u9QnijiS4R2u4lkdnI3vG7AIpaRkuAEUg8rxLjXxnBub+wozxEo1lTUKanLlozkoTm1FbQtdtqyUeiuHh5TjDi7LrVYUqdTDJud4pupTbla8mldxVltrKKS1V\/wB0vjD8Xvht4X0TTdI1bXdQ8ReJ76KNNM0Hwxo19rmqXTYV43it7KGQmOaGWORXm8mM+YFQsVKj+R+H+FMfmVSrOmqNHCUE418Riq9LDUacXdKUp4idKDs1paei6OzP6qz\/ADbD4ShGMvbYmpNctOlhaM69RtpOLkqakoQaS956JPVt7\/gR+05q8beMtRuDpeqaTLdTXUq6dq1tHZXcKXP2e4ile0S4maFHZpVKSBCjMU2h1ZV\/sLwuwLpZLQo\/W8Nio0KUKLxGFre2pzqUJTg4xnyKDcYKCbpymrxb5tnL+U\/EzETjU9+hUoyq1ZyVOpFxnGLjSaclorc2l1e2vU+QM55Pfmv1xJpJXenp\/kfi71bfc\/o8\/ZI\/Y5n\/AOEJ+JnhHxlay6RrOseMLaKaylgXFlb6bcWV7pgJKO8xs5ozJE6Mgm3OCxhkYyfxtxfx7Vxmc5ZmOWyVSjhMF7Fc14qpUrwn7ZuL6TU0mvdaUVa2h\/eHBnANPD5XnWXZlT9lVxGY\/WJKMVenyShKlGEk2nGnKMoqztZtNPY\/YgfA34b23hR9Ei8P2rWtxbQxazFJEiLfeVGqNJsjwULqGDBGO4cOz4Vh+YvH42FZ16eIq05SqOXuVJc0btyspP3rJ+fQ\/ToZThKeGeGVGmlyqOi92SS+2tnd6vR6oo6tZ\/ADwx8KLj4W6rc+HfDWg+K9P1yybQ7i6gs5nSJ5Gu7+0gaQXLS2kxhvUvmAjguWtGMyyFVJQjmWKxMsxpQrYiWElRnOtZyVPmmo009480pLRJSk3sndhiMDgo4OWXVXRw+Hqqbhd2lKUIubk07JRg0m1zJJX0aVj+cD9tL9njw14Pn8BfEXwrrMetWvjfxJqSatKJxdNqNxeQTazDrSXEZMc0FykDLLMoVQXh52uu3+iPDri3MsbRznL80qVObB4ClLC1KqXtKUadWeHeHeik3GMoOMZc1R8srXSu\/5g434ZweDxeWYjBygqeKx9d16dGOjlKnDEOtzp8tqsqd3bljG6UYrVL5qklhA2hgoUfKo6YHHYcjvgk4PPWvSUZSu0nLXV7u\/z1\/4GhwPkjFcq5YpfK3rdks14qWLkEM0aFumc8L15JJ7DGMjjjiilTcqyTXxO1ndPRLfttf8zkxc4vD1ddOW9+m\/e6\/4f7zl7nUWKBmClgMsSeuMMeARgZwAc\/xYOeCPTp4NKe6s5Ky1el3a7fr2e2h8t7Wbs3NaW5b2T76aW6LS+7SW55N4n1BWgwrSCT7RtyrBVXcHV87sktIpWPBG35WJByMfb5NhuSfNKMbeyTXV7rlWq0tq9H1XovLx9dSwTotvnlXkle3K24qyWu7Wnw33s1ufr3+xD\/wTo+Lf7QHhbwV8Ubi5vdA8M65eieySXTdNFrqOhQhYWvEu7mM3byxyq7Ru6w206pEFuNkSxn8X8QeOsPhMwxvDuBy+niavtnQeKqV68XTxHM\/axUaVSnF3vy++mlo2mftvh1wbVhgsvz7E5hVwtOVKVSpg1QpOFai4xlS5pyhOo00m\/clG8k46xufbn7R3wr+FvgT4y6f4FSO7t1HgXw54d1e\/07Ur3TL97q3Mdyqi+tbm2uYxNsSyuo1u4jd2ebYOBI2fxGjmOaZViKdalUpYing8XLEuhXoQxFJVPZJSlKjU541FB\/DzxlTUkpxV0pL9TzHD4TFV6WFqucMPjsGqNSVKfsans22ouNSErxk7r3l761WiVj8\/vjB+x38L7PSZpZb25hd4JEsJYr++nvQzs0i3F1Le3N8txMzSYaaVg0oGB8qivtMl8YeKI5nSlRWGxNGviXOvQeHpU4xhFJOEFSpxdOKim1Zu127dD864n8Nspp5bKl+9dNQUKU6lapOsuVr35VpuUqjtJu8krtrdP3fzZuv2a\/EUV1cxQ6lYyQxTzRxSNIytJEkjLG7L5TBSygMV3NgnG44zX9C0fFLKZ0qU54bERnOnCcoqMWoylFOUU+dXSbaTsr2ufz7U8P8AGxqTjDEpxU5KLcdXFSai37q1ta+h\/UZ8MfFWn\/DfWNKt9ZJtNK8UWen3Wjald3EtxDNNHCry2kl5dO8rTRqyNE08u5422qWC\/L\/HOOjOtKdS\/PUp1ZRqRSSklGUo8zittdO100trH93YPGQw0qcKkpKGNp0qlGtVldNq7cG2lq0046+9e+5+glv4h0G80h7+Nhc\/uMiKLDvLlTlUCqoJYEjI6frXFzcqStqm7rtqfQzvGHNH3na6iuqt079unfofmb+1P8WvG9pZX2k3XgH4ZWGh6glzZQ6PrniqafXvEcMRka1gMC6Lb2FtA6vFJ9mXU7l47or5lxECGH2mR5XldWSqLOK0KySm17CoqdOzTTcueMpOLvrCEklaz5tDycfKksqxU8djMLSnyVeTBVK841Kq5XH3OWDhOTila84ptWelj8i\/2rvHMWv6r4N8P6davpOn6L4fTUZNEDIq6PeawIiumvHExijks7W0iKrGTGkVyqphTz+l8E5bGlRzDGVJurPFYuVONW8rVaeGlJc65rSacqjSdtUtz+cOJcbHFYjD0aacaVDD2UXa6lPlWum\/JGLezV10PkTZLKThjwM552nj16c8ZycD0r7lyp0r+61dXsur\/r5ny8adWV05y7Wa08r+SWmnTZkk9u6WM7M5yse8jgHAC9uhHGcDrkY9Kyo1YzxUUk9Wle2jtbrbW+39WMsXTawtVS0tG7avbfv8\/wDg9ThdRu38slc\/cwRjAPAx275zjuMZJr6XDUKcndq1nvq7uOyu+97+tj4ys429xNNRa1fVbNbaef5HL22kp4gklsJJPInkkh+zzHOI5WYhGZccqCfnXqQeDkAj1q2NWWcmLinOnGD9slr7vLZx7Xt18vU4nQji4yp1Zcj5lKDak0pRa5W7fdfZ\/l\/a\/wD8E9PiKPGf7GnwXjvb6Pw\/H4O8Ej4ceJ309rWC40\/Wvh+7eFJLpTLBPai51Gy07T9djE8cls8epQvcQsjsh\/lXivB4KfF+YVFUqPDYjERzWj70o+2p45QxEYxUteanUlOhNK6Uqc4\/Zsf1TwPmrxHCmAjGMfreGorBVFKKlyVcO1Qdr7RkoqrF6SUHGT3PyR\/bD1LwNH8XL68vv2j9U8VXc4tLK+tLu78PxpeDR7TT4YNXlvNJ0DTtOhub2\/j1GBLe0dVhS1drYtDJBcHatgM1dOrWwHCcMVUrVJyljp06tSvSjOn7sIxVfWklLm5PYNKScnN39708yoyoxoYnEYpwUIRpqEatKFOFpKUHP3VU5rW5bztbW1j58+Ifi8a\/bWUNtfPcQW1pbje8m57gLEiiaVgc4lMZffyHO5gx4A+ayLKXg69WrXoRo1KlSatGLjyybtNaveDt7vS9u9\/J4gzWWLoQpOo5QUU3ezTasotSTs1zJ69bLVngz38ZdizLuLMW+ZfvEnPV89fXmvu1RnZWi7WVtHtbTofm0pe9LWO7+3br25tPTofvfofw7g+Ivwx0Pwlq6Qxz2Gh6YpnmUO0N5BaQJvG5WKlSrZ2FT82NwJJP5bjZ\/wC315QuozqTbS6qVSc9ttpLs73P6awuDo4\/KMNTqpP2dGjHlkk+SrTpwjzb6PmUvNxauk0kvLfFd98bf2TdMTxLo88fxB8GlRG\/hqV557xQC3mCwmmSaVIYkBZvOmmSNdxXYqjHdg8JhMxrRoSrwwqnJL29T4acl\/Old8rs1pqr3SueVjamaZFSVenOOLwvM70Zyk5QjFXb5mpcqWiTv1St3+SPiZ+3P4e+JGmalq958IbyxmsreN7iO5k0\/ZDcs8cEUiy\/aDcpEty9u0gWIlmKtIgRSsn1eH4Nr0sTQwsM2wdWNZvkdOVZOaUZTnKNqK1jThKzU1ryvTc+JzrjSliaE6c8ByyjHlVqnMuaXNyv7MrJ7pdLPZtL8m9d1i913VdR1jUZDLeajdzXlw\/OA8zswjRcnZHGpWOGMHCRKiDgAD9lwNClhadPDUI8lKjRjThHyjypyfeUmnKTbbbere5+SVZTmpzm7ylJ1Jat666K+ySdklZWWxzo1GOFiCxJznAyOM8AlT9ejcg5PUV6MsLOpp7N3asm9tdVfWxwvGUqfVNbvVdPnv0166dGOn1NLi2mTJ\/eRsoPOcnjnI6fjnGKzpYSdKvC9rqaT1ez37\/LQ48VjY1MPVjzRXPFqKvrzdE\/mn92xw0si5YMAecYJyCF4IC8foRg4we9fWQjeK5bK1nb117O+vdnyUm2ved7J3tt522+Q2xEdtexXKHYRLG33gP+WgOSR04GBls5IHtSxVOVXDVaT1vCdrJPXlk+2nrZ+jJhZTjK6UW7K\/8AXk3ufvV\/wTn+N2meFfFo+Afjq1XVvhv8ernV9a0SGazN9aWPi3w54di1PxHHqNkUmjl0nXPDthu1N2SW3tZtF02O4QxanNLH\/PvEGR4nHZdVzulGrSqcO1qeFxM7OFOthq1ZxpRpyesq2GqyhN6vmpznHR8tv1ngjiGGAzCGTTcXHM4Tr0E2\/wB1iadN1HKTWsY1acGm3eKlGLajdyW9+2d8G\/g14d1S58Tx+MPh2mhNqJOnaD4X8A+HNEuiAgaT7VqFqplngchPMle0jDuTuUgBj4sOJeI8Qo4DB08RXrfw+eNTERV2kua0FC3LHZN2vbRu6P2bM84w9bL1RxEsFQoRV3KNCg67nFWbdRSu72t8K5lq5dT8r\/GnxMt9Xuv7J8IRC4QoLf7YkZjs4UHy4iwoExRf7qqmRt3AAA\/X5DwrUwVJY3Opypy5qlR0JzjOtUkryu7ykoqTd5czbd+rvf8AJ8yzhY6TwmBTnZ+z9oopQpwcrXvbmlLdp7J6WaPKptF8RGWU\/b5WzI53Ge4Utlj8xVU2qT1Kr8ozgcAV9bDH5UoRTw6TUYppezaTSWibabS7tJ9z52eAxXNK1R25nbV7Xdvsn9XfgSVbWJ7X5Xi1GBpbd9wXIO7aFGSAFUr1zgAHcDjH81Ymg4Vuacvfd3Lped2rPV2aSV1a5\/VmVV404qjJrVuUG7JNWXTZK1rWXVPQ8Q+PWj+LvGUmmeDdJ1uCDQS\/majlzLdzGZl8vT7dyPNit3ZFmukDtlUCKzIZQeqjCkqftJQ1WjstHfW7drKyXW+vXU4M\/WIxMo4WlOEaFW0qyck5O2vLFXW9ldb9emn5h\/tq6N4R+EPwi1nS7OwtIvE2uzaJpOn30cUS3REOr2WsX10xGHKNFp8ke4qRveMOMOVr9C8NMFiMw4qwqnOtUwuEoYqtOE5uUIqdCeHpxWjUpTlVdk3dKOivZn5Hx\/HC5Zks3Tp06WIk6MIzUOV2lWhLmve6f7u10ndSb0W\/5W6Fq76xH5JU\/awAAi5IuCQxDRIMkuVXeyAZxkqDhgv7lmWAjgZOcJXovVyaS9nfdSfZt6S2umnZ2PzHC1amPpaWdSabai76O+sUlsmntfRMuGxUzFZQ6sclg4KsACRgqQDx159DjgVzKvUai6clNNaOKUlp2tf+u5hLCUoS5anuu9mprl33ve2\/+XkWZLKGO3mPXapYZAXsSCcZ6ZPOTx26VhHE1JYiMXytcyWyWtl+T6dWkZ4vCUYYSs1G\/LTbVl89La6t30ZwsNlqOrakNN0yyu9Rv7iTbb21lA9xcSbu8ccQZzsGN7EbUGXYhVJH2VKn7SMOS8pTbjGMYuTctNEkm299Ervprv8AFylGLknJJJc15NLTVtu7VrW1vbU+hPhd+z9qni3VZB4r1FfDmiaXLGNTW3KXWqzSsPMbTrYAG0guWQqs8s0kz2fnRO1rKziM+7geH8biakHNRpU7rmbanNx2l+7j78dHa0kn2vucOJzPDU6doJ1WtmnGKjPWzd3qr\/y3Vt2mfbf7E3xA0DTP+Cmfwn8LtBaWvhjwTofifwL4YhuH3rZavrHhq8je5gknPOqahdyppslyT59157BnJkIr4bxfy+jguEMThMupSo0KGPwsq8KN4zrR9pzVJzsnKXNNqo21ePInstPovDjMHV4uwtTF8tSdXC4jD0pyipKFStHlgld2TVOMoJr4lLbo\/wBX\/wDgoX8IP2dtX+Hni3x7rfhDRLDxPoNrNJaatoOnQ6dd6hqxKhLTVF0yGJtQmuHkVkkuhO6nzGEg3YP845DmGaQxVOjl2KqUZzqRi1OUFG2id3OKdrL3pNrp6r+lcdl+WqM6uJoQtUg3ZxlK00l7tk7q7ukktfM\/nf0SzsLYHyrYW7TEuisMMkbY2jaRlVwc46schgORX6Dj62Iqyg5VnONOPJJwacZNP3m5Rdnd3117ptanw3sKOHxXNCk6cZLmjFpx5VryKz12a310V0tTpcIONqnHGdg5x3615pjKs1KS5VpJrd9z6A+G\/wDwVK+J\/hrwv4Z07xD8PPCviy90Swt7OLWY9Q1fQrrUIoYFhD6nDGNStZLligeWa0isopDu\/wBHXeRX1OaeFOVYjFVamGzDF4WEqs5+x9jQrRim2\/clUcZ2t0m5yd\/iP0XI+JMXPKsvxMsNCtWnhKb0c4RlKUEp88rTs3bRpW2srGRrf\/BSf4wahdX194Z8FeAvDOqXyTxR6ze2+p+ItQ01Js7m01dQvbbSVmAzh7vSr1TyAgzTw3hZktJpYrGY\/GUk0\/Yc9PC05K3X2dOpON7v4JxvvfdHo\/2tj6slKnTo0qslaMqnPW5bvtK0G9FvDbSx+fnxQ8fePfilq19rPj7xbqvinVplUxS3837i0VnZhBY2cKQafYQSuSTDZWsEW5VJBIGP0PJ8sy3JYUqGW4PD4KjHmjL2UEpyi42j7Sq7zqNd5ybttuz8f44pV8XiJ0sRjKlatUpRlGMm\/Y04wTlTWmic5aaRT2R5ppt89jcReU7pcoduwAAo0Z+X+JSRldrYJwGOK9PFUI16c3JRlTkmr73jLR2unZ63vZvRW0tb4DAYv6rOEbuNWnaMoq7cJQk2pJvRc13qrPlnt0PoTTvEVre29ul9DDfQyQRvAb2OOSdRIFZ41mAWdCJCyBVkDLwhywyPznFZXWo1assPUq4eopNT9jzKDcdFJQvyOy293X8F+mxq4LE06dStGE3OMZRc0nJX1+K97rW+uz+7p9J0jwZrmsaZo89xqWmxareQWkklnNBOI0kbMvkrcq77igYRu7uFYgsrBSh0yLBZtmGaYPDVHR5KteNKdWpTqKoo2fv+5JR5ko\/yqPzseLxBQwGEynMMQnJSo4edTkjU5r2XNyvmu0mtbp6aJe7oepavrnhXwAW0bwhotrocUmp6V4fjuw32rWdSl1NYXm1bUtVfNxcfZrKRntbaMw6dbXl1C8Vqhr9xw2BwmVOrThapXUqVCVSbTa9ry1HKmtl7ktkt9G9E3+CVq+Jxs5Sm\/ZUoxc1T0UXJO0U5WV5OT0Tvu35P0zRIx4Xu9B0QFltTFJdPO7Ei5v2nWb55CMmZ0eWZdzB3VGAJEZCfV4emqUlBysuVa7Nz1k9d7W0X5LW\/ly5p3krtad9LrTT87dz89b7xLqvh3486j410e8uLDUF8U3utaPf20z29xBPaak7W01tOmHSSOa3AjljZWEsLAHepx+c8VYeONwuMp1qaq0qk2pQnTUoTp7JNSTV7Jrbrue\/k06uFxuHq0ajpVXBTpOMuWamk3BxdrxkuVq62bS3Z+uuo\/tvWvxO8AjSPifE66nP9kkvNX0+aGG1v5rZVAur20lZI7W6cqGuGtRLbSuzSxw2kYEK\/zbmPAOIwtWrisnnHF4Wcpp4e7jicNNy5lTh7y9pFK0YvWSVk3oz98yvxIweJpUsFnv8AsuNpvl+s25qOK0X7yceVunNv4rcsb3aSTSPgTxr8RPAWiSX97pGpQ6xfXMjG0sLO6W9chmZv31xbq1tbJHkB1ZzNj\/VwkA49vJeFeIcxVGni8N9RwcG\/aVsQvZSUUkopU3JSnJtbu0b\/ABPWxzZ9xfkFCNWeGxKzDF2UaVDDOTjdbupUaUYQjonZNtt8utmfO83xP+IUksrxBIonkd441tWIjjZiUQEtkhFIUE8kDJr9Jhwtw9GEIzcpzjGMZy9qlzSSSlK3K7Xabtd2ufmE+Ls3lObjRhGLlJxjeOibbS+F7LTc+v8AS\/8Agnh\/wUCisIIz+w1+2FGQrKyN+zN8aVZSruB8v\/CFgjcMHnhhg8g17lXD1\/aS\/c1bOzV4S6q73WtndX7rU\/c+G+JskoZJgKVTOstw1SFKUZ0quMoRmpRqzXvR500mknG6V4tNaNGjH\/wTv\/b+XJ\/4Yc\/bAHHH\/GNXxmyc\/wDcljnj8vwFZewrN6Uaj1tpCTX32PoaXE3DXvTef5QrKyUsfh7t3Wv8S618l8kcxf8A\/BO3\/goPczzqv7DP7Y8aKyxKV\/Zk+NO2RRjcSR4I5CsTtwcAbiDycarD1opSVGo9G37k9NO2nrr326H5NxLxBluOzXF+xzPCqjCcKVJwxFFwrRhTg3KM0+WVNylKKkpW912bezof+Ca\/\/BQC\/RT\/AMMP\/tgW09u20u37NXxnimniIwpDS+CREWQ\/KX3RPsbkttVVzdSvh7p4atOnPVJUpzSm7p2UfeSaSVmlFNPqzxPaZVjeR\/2lgqFalK0nHGUKTrU2lpPnvFSg9pq7aaTV0aUX\/BPP\/goJZQfZIf2GP2wT5LLhl\/Zq+NrqVYK7bGl8FuwYlsswP3iRgbWxyVMFWr1PbVKFZOq78vs+VrycUnbXvv57HdTzvLMJT+r0sdhVyaRcsTCd\/Rykua19eVON72t0s6J+wX\/wUPsPEOm6m\/7DP7ZJXT7lLgg\/syfGoI6JklVJ8FYJIZgAAdxUDaBXoYTDVsFOGIo0KilCalTvBq0ldSu+V7pStfq0r9\/GzrOsJjMFjaH13DznPDzpqPtKVpOSUdEptyai78qVnZ69Tqdb\/YR\/4KA3\/jnQPM\/Yc\/bHutNXWNBumuP+GavjSttb23nadcSGa4Pgry4fLggjhneRlaLySrAFWA9CLxaxf1it7WcJqlVlGV\/ig20oqy96MWotWbdle1j89liqM6EsNyNVH7qqRsoRbaabemi730T1toe7fEj9l39uAx6rY6B+wz+2jrGorbRyWl3bfsu\/HC0srS4t7u2mtZIry58BbLq6hmSKZUt4JongF0GmjZQj\/Y18xo1ITdHmnzuKV4zhy2XLKzkk9007JJ9HazfmQhyyd52Svdxd79Fazs9emul2fIXiP\/gnj\/wUK1O5tdZf9hT9sZptPg0y2WGP9mX41vJcyW8avfzBR4JaQC5uTcTEuF+edghcLuPg11PEUqlOUGuaLS5uZ6tNb221tfW1+ux2wqKjKnUU05wlBXUr2jf3lGz66pPz2PRNP\/YS\/wCCgTae1lP+wr+15NA0IAhvf2X\/AI0Pjcq5Vv8Aii4plOSScOMYPOea\/Oq+U4uhVSpYetze0cnKCad7u003G0Xbrre+t+n0FTFYKoo1JVo8\/KlJKpG7uldS1Tdtn0f4GZB\/wTb\/AG752uLo\/sN\/tX6XZWsT3FwbX9mL40\/bp0QbhBZR3HhK5ke5kI2xCIIFZgXk2BiO+NPH1LQnSxlao2oxlXU5Qj9lX5aaTte6d7O17LZ88sRg6UG4zpSctHGErtpu\/vXS1u1te7XXQwo\/+CY3\/BRO7RLpf2Jf2sLdblFuFgk\/Z1+LCyQLMBIIXWbwZ5qvGG2MJf3gZSH+bNfUU8nruEGlQScIu0q3LJXS0kr6SXVdHdHE8TQbbU3Z6rWW33n+0tXr2T3SfyPHUUr2Vr6sQgYx0+nFNWTuox2tsM+G\/wBuH41\/GP4R\/DTVdT+BcvhLTvGMUWnaZJr\/AMVfAnj7WfhboN54x1mx8IeEr\/UfEHgb7V4juNYm8VavpemaT4X8GeD\/AImazq2qahpttrmg+GPDVzqPjPR23fovkiGkouy6\/l59La\/P11+TPDnxd\/bH8NL4M8XeJvEvxaufhl4E1\/8AZg+G\/wAVNIufhj8O\/jX8RtV16TQ\/iDqP7R+tTyfAD4cifxvZR61qXwd8Ex+JvhF4ct9J0jX4fGsseh2Nxo3iC00ueVdNPNWX36ambbas7NX666+vXtv+h+qngv4h2fi\/4Y6H8TdT0TxL4A0\/V\/C6eKNQ0P4gaNfeFPE\/hS0Fq93d23ijRNZgtL\/Q77Too5GvbXUbe3ltghM8SYKhuzs2ldbOyv8AfuaNKMXZJdmvuVtbr7\/v6\/G3\/BOX9ozxn8Xv2CPhF8df2jfFunt8SP8AhXI8afGfXdT0nRPBdv4ei1TR0+JGlXWu6RpVtp2j+HoofhZ4i8IeIJyttaRf2ZfQalOkZuHw07O9k\/Vaf16Djtfr1fXd\/Pp+B19x8evjn4k134VJ4R+H\/gXwTofxhn8TP4C0r4pX\/ih\/iJqujeH\/AApe+LLbxB4v8K6Jp1hD8MNN1e1sYbU293qHjTxFoE3iTwrB4n8OaP4hvNV8KaOX30Wt+i6ikne8UvWyvf5\/15nzN8Xf2uPi5r\/jz4LeB\/CE3iH4O\/EHwz8d\/iT8Iv2jvhtoVra+P0u7jTv2fbn4ueDL7wx4og+Avxd1rWPBGu6Zq\/gzxr4b8VaZ8NfDeo3NleXvhzxdaeFtc0zxBoGnpJLRKy7Ii9n72vol1+Wun4Hk\/wAO\/wBo39rLxHc\/AG01f4leOrmTxd8NP2wNZ8Zx6f8ADS1sbyfWPhp+1To3w4+F97qK6F+yR8TNU02bT\/AV1qOmCG48C\/Dm38RLEmu6rplvqwFhEBzS01220X+R+l\/7Enjnxz8UP2OP2Vvif8TvEKeK\/iJ8Sv2efg98Q\/G3iGLR9N0CHVPFHjfwBoHijWriDRdItbHTdNtxf6pPHb2lpZ20UUMcY8mNtyhOMXuk\/VJmkdYq\/wCXTY+oCAeoB+tNJRvaMdfJdNvuKsnuhMD0H5CgBaACgD8p\/wDgpX+zZqfxy0HwR4hj8C6VqGleBvjX+ybe61eeFfAeleNfjD428M6f+1N8Kb\/xPplxqFx4d1q+8PfB34c+Fr\/xZ8RfF2jWMeo3Hi650aaPW4tJ8CaX4n0n4ihDj7yfz+7u2\/XyVrHy58V\/2ObySb4YTfD39k\/TviT+zr8PdY+HOq\/tC6VY\/Br4IfBr42\/H2H4NeLr\/AMb\/AAu\/4U18L5NK+G3h\/S7fSPFA0qP4+6b4rt\/hcPix4G8M6T4U+GPh+\/067fS9TBON23fd9Nbfj8n29Nv0m+L0HjP9rD4WW\/we8L+FvH\/wu8D\/ABg0KDTvjZ4s8daPeeBvFvhb4T69Bs8X+AfC+kTSNqsnxO8f+H57jwjFqtlLBp3w003Vta8U3ms\/8Jl4e0HwfrwNPmTVraW6+n6bX118z59\/bL+CvxS8F6N8S7r4G\/DbxJ8TPgb+0Z8Jbn4DftGfBP4TXHhLR\/il4MW68GXHwz8H\/tEfAfTPGWp+H\/A3iPxH4W8F3On+C\/iP8OvEGs6OvijwV4S+HuoeGL1NQ8B33hfxwCs4arX5dPx7eXT0PR\/hj4Y\/aG8Na7aftDftH+Ho\/i98f9T8Cy\/Dn4dfCn4B6Inh34e\/CbwTeXeh6743nn174n+MLPT08a\/ErxDofhbVPHep6x4oS30\/S\/CHhPwV4A0jXX8NeIfFXjoCN1e9+nR9NH0e23Q8y8PfAf4s+Ef2svgZ8XvHmlNr\/jf4z\/GL42fE74v3ngWy1nWfht8HtH0b9mXS\/hF8KPh9b+KLrStNmuLCy0bRbSGbxT4h0\/Qbjxr8QNc8Valpeh6Hpl5pnhvRwfL713s\/K+vbd\/lZdOlv0f8AiX49g+GXhDU\/Gdz4R8d+NLPSE86+0b4beFL7xv4ta3IfdPpvhPRzJ4g15hJ5cRsPD9hqurO0yyx6fJbRXU8AVZdl9x49+xJ4O8W\/Dv8AY1\/ZO8AePtBuPC3jjwP+zd8EfCHjDwzeTWlzeeHvE3hr4beGtG1zRLu4sLi7sJrrS9SsrmyuZLK6ubR5oXNvcTwlJXBryt8j6clkWGOSV8hIkeRyqs7BUUs21EDO5wDhVVmY8KCSBQB5pJ8Yvh\/FI8b6rqavG7I4HhXxYwDISrDcuhsrYIIyrFT1BIwaAPTqACgAoAKACgAoAKACgAoAKACgBMD0H5CgD\/\/Z","a_rank":"5","a_hot_flg":"0","a_views":"519","a_active_users":"597"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fe23d89687310d6ce60a0026ec68231fa","a_title":"\u677e\u5c71\u5343\u6625 \u7537\u5150\u907a\u68c4\u4e8b\u4ef6\u306e\u5831\u9053\u306b\u79c1\u898b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 02:28:17","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP4yD2IUKCPQZLDjB2nAyQTk5AHA54ro\/pHnkhOUOcH36bgemOM49MgYPIBGa6XKUvile23S1\/v8iFKUvhfLbfrf8ttfXyDcAFDbRuHJJGcZxkdOTjBAAAx1GBujkpW\/ivS\/2bX9NX9+vkaQnUje81K7T+Hbv1e\/5feSIRkkDJPuBgDPJA4XJJPfjqQMVEZxind2b\/Hb+te\/qaxlzX02+Z7t8Iv2Wv2kvj9vk+CPwF+L3xZijn+zy3fw\/wDh54r8V2EEwKjybjUNG0m8sbeUEgeXNcI5zwtcsMdh1UdB1IKqrvklK22+qTvsul7ux2QyjM6kPbUcPV9gvirOm+R9Vyyurq17tNbrc7L4zfsNftjfs96OviP44fst\/Hv4U+HTtQ+IvHXwo8beG\/DavISqwnxDqOiwaL5pYbRGb4SEkAL0zrCpTlZ8zSv1jo+3Xroc1TB4iEHJKEmnooTUrb6uy3VtrdHqtj5T8sgk5wcHAI7g42kEjGQSSepwOQCc9cZUZJuEG7bO9lfRrp2\/rqcq9on+8tzbq1tl5eT\/ADJInCsFBC9shRyOSDx35GBuHTjGamL5lotb2SuVKcpayabS005f6uMuWw+7fjH3uCPlxjHJOcnJPJOM54rKcJQdpKzIjLmvpYrmQIfvKAcMTkkc8\/dBwCeegyTjnFVH4ZfP8kDim027L0211f3ALhc434wcdgcHPIOOeTx747cFRlZWt1KlKmtOdNtdvVa6638rj\/NQ87wc99x5\/N6ftPL8f+AZ+z8\/w\/4JEWOwZbkgEfM3AGDzjO3I7988jjlqMqvwx0jv13\/4Y0FB65ckYABUkAEnA2nHXsRjBJ5zVkqPLe2t\/wBP68hSm7B3ccepAB5BAwMDHXPc+9ZRlGN+aHM\/W1vwZDqWTdtl3\/4B+sP\/AATe\/Yv8HfGrVW+KXxljur7wHoepxweGPB0McyReONStJzDdXWqyReVM\/hzTbpTZtY20yyavqUV1a3EsVlYXlvffnvG3EeIyxU8vy2cViK7tXqyV3RpK13Tjb3ajbXLPm0V1yvc\/a\/C3gPDcQOrnWbe\/l2DrpYbCJ8ssbXhTUmptvWjHntOnyvn918y2P7O\/g549svgLpehz+D4IfD2laXYx2mnaFpGkjRtM061jtf8ARreGwsrCWySNI2VPISGNQpfy2jjZsfn2Eq47LcR\/aM8XWmp6zi2lee7lzXbfM3s4\/qfuGYYTKswwU8q+p4ejQpTcIOlCzjBWUYxStyxVtdXe600d\/Sviv\/wUN+InjfwzeeG9Z0qzuPBN7aS2WuWVxpFmI\/FOmGMxXdtMmoQz+bDIT5cqQu0dwpxIgG9F9XF8Z5rXjSp06MKVJNuTsozqrZJSUf3aV9bJ3e3n8phfDzh3AVJYpr2taMm4wm\/aUabm\/wCW6VrJqzei2s3Y\/l0\/at\/YK\/Z7+O9h4o8T\/BXw3p\/wX+K8cl7qVjpelZ0\/wL4kmLySppGo6BDHDpPh6WdVaK01bw5Y6XbwXDiTU7DUIi0sPqZJxbmGHrUKWN5q2DrSUXJvmlSk1aKU7XirWbSSu1f0+V4l4EybGUMRWwEYYbHU4t05r3aE5bul7O\/uyaWk7uzuktNf5wfEfhrWvB\/iDV\/DHiLTL3R\/EHh7UrzSNa0u+jaK807U9One2u7S4ibJWWGeKRGKllbBZS6MCf1nDTjWpQqR+Geqe+l0v6\/4KPwLFYadCrOjU0qUpShNW0Uou0ktdbPrZXMlkEsbBUJYZBGCqkgHHXoNueOCQQee+04K6u\/Pbp63WuhioVFfljzLrd2a6dnfp91rFORSindExGRtIBYd+\/tjr15z1FRKVCFoxlZSvfT5bfLrvp0NI06kvsJa\/wAy208rX12uQCJiylYn5PUqcYODwcFjzkHjoMgdRVRUElyybjfVtJW6Pq+wpQqRaXKmurvt6K2v9LQf9ml7RH\/vkD9O1Vel\/wA\/H\/4A3+ojfk0+BBKEeIsvyj5iemCdqgc5PXjPAIGDmvNhVqvmvNvby7+p2ezpq10l6\/8AB1\/EqKtpCm6RlyGHPJ6kclTjHpxkkAdySdJSxE7ckr2era9GtvPXb5q7vMoU07OKd997Jfr1+70NDTLay1G5itbfL3E8yW9vFGMvJLK4jijjUFTmR3VQBk5I4NYylVhrWvtdX0tbezV9vl3KVOnPSC5r6LS7u\/Vu5\/RJ+zR8SPB\/w1+GPhHQ7j4oeF\/hn\/wiHhLQn1TTPENha2Or654h\/suwuZrDT5\/EEOmaXb2zXpvru+e0utRvZ726cpa\/adk5\/L8ywuGxeKxmKTWJxMak5wTm6kIwjJJQkrLRdGm77Wsf0Vw5jKuAyzKst9\/AUPZRdZp06E51aiTk4KVS81FxtJxX2l5J\/aWt\/t030HgeHUrTUtNurqdvIGswww6mtjcyNJ9lS7trCLUYtLkv\/scvkRXdql5Jpr280TfZp7e4l8tYbG4qUZyjhI0GrpXbcErNq3Ld8zSb0W2x9v8AWMupUuaFTFV8TC8FRpxnGpVqNO1lVUFyxs+ZpvXRvZr5Y0L9rJLjxheSeLf2o\/APjHTrZNQt\/EHhPRtE0UGxmghlNpFa6tc3mmaoIUkiW2aM6fa3lswScxTSK1g\/bPLqEqacqLhza06\/ssR7Pl6pS9ktdnrbbc+TxeZ4iVWoo4ulWipLny9V6Ht4TjdNNe0d+V7Jc3N1sfUvh601bxZ4Nf4peAbPVfEOgQX948ut6do2pz2CJpesXMS6ramWDc+mSR2M4ivERrNZhFHdG3vEmtk8zEUXhoyq0qKxFKMklUpyu125lbR9dG7nHDMsBik8POu8JX0UqWJjyTTataNpNPoumujfQ\/Ar\/gp5Npdt+1bqOtw2cMM3i\/4f\/DzxDf8A2f5hPe2+gReGHu5yQT9svLfw7b3V45YtcXUsl3KRLcSIv6nkNfE4rLMPPVNRtyysn57PppfY\/FuJoU8NmlaKeju7pPVX33aW\/f7z8\/otetTMd1qzKRkkJj5hkKScDjbgg4xkcc17Hsq8mudL110X3Wfp+Op83LE042s02\/Va9tmR3GtQbCBZlgeOY26E57cHcOM5BHI5qvq76T16adfv72D2\/wDc\/wDJv+AZ66vIWVlspNu4McQseTxg+meT17nrxVKlUgrSq7vay18t\/UPb\/wB38f8AgGuPEhUBf7Pf5Rj\/AI9SenHXB\/mar2fn+H\/BD2\/9z\/yb\/gH1FcfsyWVrudvEkTsWO4LdoXIGMsVHJAxnnoCD\/FgeJQzKu+a0KSty7Q73\/pHvVMkw9OEpRxEZ7pr47LtdyjZvW9k728imn7O+iYje68RQjGRzPEActggnLMAFx1yOgwCTjr+uVns38r\/otP8Ah\/MwWUYd\/wDL+T9JXt63a\/U6Pw5+zz4OutY0qxttfMeoXepWNtbPbvunF1PdRxxPbRxssrTK8iCNUYM77QpBKmscZWxH1etKaa5IOdt1K17p2Vo+b73TT69OByfDV8dhMPTxFTnxGJoYenqtJ1qkYJvV3STctvs\/M\/RE\/sx+GLe707xV4isPEHjm\/wBItLq\/e6+JOmw6W3g+wntBFc6d4pvYNXuIY9V0wx3zf2fb2kV3amWC3e8mlS3u4fyVZ77PGcuHprDQqziqlOGqkmpcz+FXu7dNGt2ro\/p6jwfhY0aVLGuGPr4J+zhiZ6qKgrShFXdlblvLROystD6n034dfsvaV8AtK8N2nxZ8D+FvGWpeLbTxBdBPHWhxp4a1rRGXQdL0mz1C9nu\/DDL5CzOdCt7q8t5b4XFlM5JhlGFXEYmWKlXwtSUpQlLnpWs3Ti178W3rpvvo973O2ospwdCNOXu00+WVdWS9pFWlFSTcopeiTdm0rHJeE\/2a\/BU+qL4i1DwrovjDwhe41G4l0C10iZpr2NHMz3OnFo4be7jvnnFwbVosSGaPToYo2gZpeeY6pUVKUmqVtaers7+mvV2erd+5hjMmyqnQp14U6dSVduUa0FebjUXNdV99dE7pW12PRPGVn4WstRsbT4feGtK8KWFtbxvG2kaJYaNOZ7cM8jrHYh3jnd3LTym4lmZ1ZjKAqlvJq4mrGpJUqlWMuZy35Iczd48sU5WS6672d9Dhp4bCOjOlVwdGVNx5ffVOpJ7O7nOlJ32taz1ve9mfC\/xV8DeHf2gtd8Nzv4atvEfi691m++H+jaxYza4\/ijVtX0fXbW1n8PeIItW1RtFYi78Tm5g1S203Q\/KlsdauNWu9TjuBqEX2WQ55j4OngvawhSpwlVrS9nyzg23ecql9VdJu60T6nyvEXCmSYnC0cThsLiKuYyxFOkqVN+1VWjUU0kqbUYxVOy6u\/ZaX+W\/EHww+Fng2\/u9J8T6LqGhajYX2o6Xc22rWE1nIl9pF29nqlopmQJJNYXS\/ZrpIndYZBhyDItfZwxeY1oKdKuqsHtODvFpreLWrWr1dvQ\/McXl2U4GpKjisNKjVjdSpzi4yi0r8r0s3u\/Qz4tJ+AccZAiUknKny87dpJycKVAI+hO4jHcZ3zR6e08v06u3XqcsP7DSaXs4J3vF3vLTpp2uvuW7FM\/wGsyFXTfOIGAWiOC3ByDjHGMkl+MBcAZpxo5ndc9RXurXT208+9yJV8lpr3KVO1nJqUeZtrazdtHbbbuVzq\/wVyf8AiUxjk8fZTx7cjP5810+yx\/8AOYfXso\/58U\/\/AAW\/0Pkc6r8QJSZJdTuCrgjm5ds5ORnqFI5GOM4IxjlvqnhqP\/PuMf8ACuW9v8v1PlY1qkr+9a3r\/n\/X58f4n8X+LNDkie41K5cOV3bLhgO2RjJB67TkZ5JPHJhRjC9o8q3a1\/G1u7Yvf\/5+Tf8Aid\/u2seo+B\/jSukSaLrkcFxLqWi6hp+pRMJeWmsbqG6izITuUrJCMMMdc4wBROnGvhqsIyf72Di9NYvppez+bOvB4mWExWHxEPioYijXjd2tKlUjNPW66NX6Xv0P6GfE2qaF8a727m8MeIrJ\/h5491Dw1rWralpV59ut7Pwz9g0nVfEN3KLaORkmTTI72W\/s3Qy293HLbXTiVJGP8\/1MLUpZtCliaUqUpTnBOasklUnDmjrrdQvq0tfu\/s3CZpQxGWYjG4WtSqxeGpzqSpVYVW61SEJKL5G7SvJxs1d2el7nyHJ8Wfg94q1vxDd+Af2EPF+oeHtF1DUo9R1bw7ca5p0urK98Xl1Z9Fl0q58P6xevCxlMYgnlW4iVIpYITJbSfU0sLOHLTVSi6ru4Scn\/AAVZwi9Lbedz4jFxqVsTKr9Tx0ouUpVIUcBUjBVJNObUm03qrxeitfSyPp3wF4qsEt7zV\/h9\/wAJP4W8Ma5cefqXgzxfot94e1fw5qNxHB5mmzWd3DbRTlQy3Pm26LDLJcSybd8hZ\/nM\/pVKWIpV4SpfvvdlGlslBL4n1ey+HTTyPbySs6tCvg5KtGWG\/eOFeEoSjSney9+ybvo0np1Zc8a+KLfQ7DVPEd7MkVpo+m3FxhZUt4xDa27TuGmdzHA8ygRtI52oTuKBTz89SpVsXi6dKhf2lRpxiteZ8y0Wyb9L+ljTG4jCYOjKtXcVBXu3LSN1u7O6XV\/gfFui\/tdeFtN13\/hWHwg1C4j8JeJorW\/8c30s1xY2uoCy1OHUQsP9sRPc6lrlrchfEE95cI9sNQ03TFsInbTo2P274czLBZfPGYtyw8pz5J0pSak6PNdKfL1l9q6dm7a6HzuUcfZVVzWGVZfGnW5oSccVyJOGJpuzVOUvs8l20rOVr6HrXxY+Dfxp\/ai8B\/DDwYnjLwTLqfwrt9fttEuvFmt3OlaRceCPs9\/c3Xim3khs9b1JJfEt\/o+iSw6fa2RNxPrFrcGOK0jurq29TJMwhluIqU8TUk8LKlTUY2+DnkvdVk09Wtd7bra648yfHcWYbL6GX4ejDMcPXqVK1dRUI1KfI3ecr6zcXeN7avl7H4hSeIrq2nurd4ow8MjIy5ZmVlyjJlTwysMMASd3p3\/UqeHo1aSnFWUoKUVo\/dlFSi29r2t6PqfzFVdXD1qlGcv3lGUqdWOllOEnGUU3fZxevn5MrHxZeO2DGmRxuBdTwQcAB84wDnK5+bnIyKzWCpdm7avT87dvlsuyMXiJSa9xK\/m+v6Dj4oucnEceM8cv0\/Kj6nS8\/vf+ZXO+y\/H\/ADPB5PHviBgNt9Ku3rtcjjgYIO71HPTPBPXDjWmr83vbb6Wt2suun3Gpk3uuX2qPF9tuHmK9N\/PVhkn3yc98D6VM6jna6Stfbzt\/kBu2N99l2Mgbyxwy5G3GPxJ6noeOcDNVGPLfW9yZS5bW36eVj9h\/+CXnxGurvxdr3wmS3lura8hvPFtgIobq6kCz29roeq2fl2sc7sLmeTRY7a2jgZp3nusRTSFYpPjOKsnWYVMFUpyhTrOqqCm93Ukvd9L8uq6dNXr+r+G\/EyymnmFDFRnVwkYU8xnBRUrRw1T2uI32fs7yja95Rsf0W3P7OvgO0l0zU7PxZe+MNc8QWdxrz+G9G1DUI9J0e9dLtpbSW11bSQn9srb75YItDuFneJbefy3jVJEiHBuLpZe1LFxni4Qcpxk27y+zaTel730Wvbv72L8V8Nic2jP6lj6WWSk6dNRxUZScYW99UopRhHbmTabWi2PnT4s6l4d8Q6Xpth4fjsZbrRTIiRWzfZJraK3ZFvYru4mxZSwTS26x2\/ky3F19ptkDwJC4aT43HZLKnQk69eDlCUnKLbnab1q2bXWTvZqzs99D3qnFWHr1adXBUqqhUiudW+JTtaL7Jd7ea6o+IPjL8PfG\/wAXNA0v4UeEb3RNM8U\/FbxVpPgnQpvEOrpouiW808lxrV++p6i1vcNFZw6Louqhkt7a6u7uTba2NjdXk0EEnJw2sLTzijiJRcoYP99KVtNfdSuk9r37+RjneFx2a5dVweCSeJx0lRgpNJq3vzSbavJpPdryPz80X9n\/AOK37I37cnwr+FXxEtvD58SD4h+GdO0XX9E1W21\/wR4p0vxNqR8MweIfDutm3jS+0t3u7hZILyxstZ027tp9O1XS9O1a2mtI\/wBezPE4bH5LmLoTjUcaMJOUb3hJTTtbt1v0t0Py7JsozTh\/i7JMPmOFnh51cbCEY1YKcalKrzQlOLvZuMe2ib30uftr4t+Cfizw8I9cur\/SvFvhey0S5t9Z8TaIJdO1RPEc+uG70jQtQtLrUYr9LKLTYhLY31na3NvfTRz2t\/HY+ba7\/wAnnKso+25JThB2nJW93Zx0b1vK17LRas\/p\/F+3oVVToU3CEkouUmouEVTs0ktGrb6pp\/cfzHfGywtvC3xl+J\/h5NsUWl+OvFFnBCWJKWsesXn2VSeSWFuY+cg\/dOATmv2bKJupl2EqTdnKlHmVvhsku7b018z+Pc\/w8cPnOZ0lCNvrleUWnpzTk3J7WWr6dDytr60R1\/fKME8Fxn1J5XsckgYOT1r1FOnZ8rbV3d2tZ2V+p8\/UpVLqyi3be6Wt\/wCtL99b7y\/bbQ8\/aAM9vk49utTzUf5p\/wDgK\/Vi5cR3\/L\/5I8t0TwlqGtWz3NujbEXcTgtkKoLAYDDqMkHGT14Oa4YU5zu4q6XU6XU5NNG30b\/ruVLLTpX1ZdNaOR7hpVgjjRGeSWSR1RURFUszszKoRQWLEADOKUkozcE7yXT7X3b6Fwi5QUnppf8Ayu+np+p+xH7N\/wDwRM\/bc\/aR0bTPEdt4M0r4KeCtWzJp3jH493uo+ArXVEBUodD8MRaTrPjzV47iOTzdP1G28KDRNQxst9XZjgelh8oxmISmoezpu3vVWovX52W3XV6WTOSeJp0m4zkpSV23Tu4pLXqk29fl17H7P+NP2b\/Av\/BL79lTVfhj8Cptc+Kn7QXxL8UaF4et\/GD+HrRvFvxF+NfiS3g8F\/Djwt4U8NWcF7qFr4d0XU\/Eer694Y8MfbdZuJpo9Tnur3UNRvxHbZcTZTWw+EyWGDUP+RtRq4mu4puUKT5pqKergppK73vfoepwvmmGjWzqeOlKFOrlWLw2Fpxm1etUtCPPFapNa3tZ22sz807f9vr9qjSvG+s\/BX9qL4aa3o3jP4d2umrqiaz8PdN+FfjXTbDT7SGTQrbXfDeieGfBaHTfENreaQt5qPiDTdYvNY0efT9VsbjdFCmo8WPzCjgKFSrXvGd+Smra1Kkldc21ktdV\/wANrl2CxGZ4qnQppzjGPtKs0m1GmmrvqvvdrfNn0H8CfFmp+PoBq+pXhvpYZFFxAtzJIqor+YVWSSRp2U\/e8qUsCwO5dxwfxfOsXWqOq1Jx9pKU2k73u9vOz32v95+3ZLgqNCEKcIx92MFrBN6J+dk+un\/AW1+0p4O0XXNG+Humz+M7\/wCGniO6+IukXvwy+IcUpOheFPiLbafrFx4duPGlsltM9x4M1PF1ouuT27RXWk\/2jFrca38enz6NqXfwLRo18wxlDErlhVwjjTk9va865Ytb6p6NddNDl4zxmOyvBYHMMvqyhVwuPhUkkk7xUXvs97Le1m7q1z658Gfss+IPiv4g+CHiX9o\/wRJ4X+MHwQ1HT\/Gtn4Xu20rxBPq+vzWAWKPVPEFjfaxp2r+CtVv1sPFFhe6XNeQavDommfZptEVZY7v08Rl+PyTGY\/CzlKOGxEG1eTcWp+9Fxd9bLRrmfc++yHH5R4g5blOb4r2cMwyrEKtBxjatTxEKbp1Yygt6UndqPw8yUtWj034u6Q\/w5h1oQzabNoWoLbnU9G1q5vo7NLYTrcQixurIXN1JcQHyre3Erw3EIjjkNy0nm+Z845QpTkpc\/NF2T5nyapfHHRXv1ey9Ln21ajGpSqKUlNOMnGXVKzWqu7K+19fM\/lb\/AOCj\/wAP9T8KfH7XPiHZaaIfBPxOltrnR9QsmSWzTxTo3hrwu\/jHQ7x41At9at31fR\/EdzZzETtpXirRdQct9uO39M4feIllVCTnKaTkm5JrRytGPolot7rZd\/5C40jTjn+K9nFQjJQk1HZSatJX7ppt31TZ+fk9zKI0fzHySDzkYP19ffkkj8vafMr2k1o7q2\/f79j5Qrfb3\/vzfhnH4c9Kz532X4\/5gf3F\/sOf8EMf2VvhF4C0vW\/2tNZv\/jl8Tbi2tptf8B+EPFWo+Hvh34eunhjnl0Wyv\/DFzp3irxFc2Vw\/2a41m417S7TUAuI\/DNnEonuvv8Jw+o07VW6s1b4HKMY6NXul719ba6Weup8niM7lGvP2EIxjZO9ZRcnq9bJ6WW+25+x\/wy+Bf7Hv7P8Aquh3XwW\/Zs+B3hqx1SCS60zxhYfDnwp\/wnOl6rbtjbc+L7uwn8Wy3ETLHDJJc6m01qCksNxJvAPfTy3CUoJxw8I16PvTlKHNNw+07yjeTVtF1vskzieZYipKc6mIklUjKnyxqckHOVre6nZWs7vV3sc\/8UviHNNLLDoulaleaosxexhv4JtSNpcNCspSza+njmt0heSNJCbmK0t5Y3+0fuY2hk+P4w47wvDWDdDDSpYzNMQ5UcPh4UoT+r3taviE9LQvrFe876Kx+i8B8A4vivGUsTmDr0MloJVa2InOUJYi2jw9BR1bnLlak9LW1d0flb+1zo\/xg8X2vhiK1+E\/w68c6Zofiez8e6U3iX40a34D8W2Xi\/Q7e+t9I1TwpqGn2mgaVYajp41K9eG9tdVtbyKSdmSeVxl\/wTGcccYZpi4vFZpWw+GU3KMsPhU6acelSMbuNr3Tim3rtsf0ng\/D\/gXKMPKdDJpY3FNKPsauJ5ZTT6xnJNytp1Xna6Z5l+xP\/wAEsfi9+0X8IPi3+1F8XtS1LQPH\/wAcvH3iTwbpHhzx3qOv\/Eh9H+HHwsvE8FaJDN8Q7zW\/EfiHUYbPWdE1PR9LRbG+g\/4R\/wAMeGLnS706U9tZR\/d4rJsbxFlmU4jD5xCToQjKpKdGpJYuukuduzj7OzdtVd3TR+XYPOcs4azjPqOJyOrQ+sVHRpUI14XwVDmbpqPtItzUkrq2itotSx4Q\/wCCZX7S\/wAFPHuo6bpVp4L8QaNf3VpJDe22sahpsM0ibUnla313QtIv\/K2qQNtqQxKjZwWPHiuB84xMIWjQk7Ntxm7w20tKzd7O6s1ZdzaHHeR0JuovrdNt3aVB1Iu2nxRcVFpaap6a9z7T+Nv\/AAT6120\/Y8+O9\/45fRdZ8a3fgXTtY8M6NoCXd9B4cTwb4p0Hxne65JfXNhZTNdxPotnp9wltbixttOvr6a4u7ljC1t73C\/BtbKsRKrjq9CpiKqUaNGnzPkb95S52knKyt7ra18kfLcWcaxzvDSwOAw1aGGglWqV5SUZVVy35U4tOMUt09W\/nb5w8R+NfF3iD9mf4Z\/FbwnfXNr8Rfgxp2k\/D34k2UV\/5WrQeEJpGtfDPiMbtT824tbO587Tml1BRBPpd9ZiRZW0Ta\/6hiMDhZ0YPE4TD1\/dUVGpTjJrl00k1o+tlZJvdn5Zl+c5jg+eeXZljcJOnGWlDEypqfM37kox092902m\/Kx+anxs\/bUGpx3fgbxB4gtL\/xp\/ZdzqreGPGOkanbIqJ9plhvNM8R6AdPmv1ktrMiOyup9SRTEZYpPKO1vjsdkORzqyX1GEJykpRjFtRaT\/HXS3XtY+5wHiTxzgcLJQzzGVqM4qnPmlSqTV7XXPKF0mvPS+9yj8Lfib8J\/wBpa08Zfsx\/Hvwfc674RudF0G08TeJU0u0stR8BeO5bIpF8S\/hnNGJZrPxB4f1KSd4rB\/L03xL4cuNS8P3qXWlalOp+oweEwFShLL4YaNJ0KcJQcYOKcnFaW0Wj23v+fwOMzHNI4n+2MRiJ13i605VlOTnyxcrtcqVk3HqrpXunc\/Cj41fAjW\/gt8TPGnws1+S01DUPB+tTacmsWCzf2Xr2lSxxXuheI9JM6JM+k+IdFudP1rTJJUSZrG+hMsccm5B81iMLOniKkH9mdtdG1tfbv\/WjPpYYmnVpQq09YzgpJtpatXt+lnqeTf8ACMEdYue\/y9+\/8Q\/kPpS+q\/3v6+4Xt3\/KvvZ\/oUalrviH4e3Ftea5fJc6POlqll4itfPmudQ1HIe236UbwaVFYSRS2cYudKFvaTSwzIbeGKK1mH61TnKFOEbXmr89tUnpbla+f+Z+c1JRnUqVJ0+V1IuNptWSe7jZ+STv5HVan8Tra18OT6o0lxa2aXbXzzm2kn+xXdvayRXASEKbqRL6GZIJEjGGe1i4aZcrz47EToUcdiql5LDYSrOyileNk5NWV207Nb7O+h05XQp162EwiV3icZSi3OCk4yk9FazXK72b7tX6X8o1vxb4p+Ifws\/tHRPiDB4E8R6LqGkXF1rEt1cxJYR6PPZ3Wsx389pJbyXEN5BJJM1pIkcd+s32C8mFrcTyD+LaGZS\/tKrmGJtiK9SvWnF1\/fceZpxXLK+32L7q\/mf3dnmQQxmQLJMJicTlFCEcD++yyUMLU\/dU6M2lOnFyl7WUHzcmyTWup+cPxB\/a9+Eeu\/EW6+FXgj43694s8f6rcNZL4S8X6Ho\/ijwX4rvNSvbh4tIaLTtIg1LRzO5ltNOhhutYuhCYGGnX0skUh6Y5PmGZzli6OBr+zxFWTpwpOV2pNKLjCOlpbKytbX04JcQZNl6w2XYjMaFOthMOqdTE1sQ4Scopc7nJqSc39pO1tEknofvV\/wAEj7weAvhf42+HWpWPiTwt4o1bxC\/ioaLrniqDxLYW0LNNYPa6dp1vc32kadbJIqK5zLrDvc2NprOpXM0en6dpf7nkORYnJcqwqxtCeGnVjzVKTq+1cXG3K2nJqDle84q3R9GfgvEXEmF4gzzGfVcXHHU8PFRo14UIUnJJq6lKKTqxVrQk9tdUmfqB4rY6vYeRqdrZm8iBezvIrOGKWN8Mo\/1KINjA\/MCp91Ucj6GDakpRk7K6klqrPvbt+V1s2eBiVTcEnTbd1ZJOS3W+nf7tz8+v2uvFfifwz+zr8a\/EN7BMNJHw813w1ol4qzJFdS65NaaKZLeWONz5l9qd1BAkW2XbHpkcsUb\/AGlkGlFqriqXLf8AczunbVt6fLTXR+evTgrQdOhXhyKKnTkm46dG11td6Wv3Pwj0jVNW0u1aTTWvbGDxLol1oWv2CLNcaff6frifYbyyvtNGyO9giiiN9AksaR2t60VzEI2ijc\/YVKEZUU9ZN2dmr269O17300evVH5v9bqUK9WKpyScrO8oqWunR7rZdrXPyK\/aG+FfjDXrVtIuNI8G27eGdSv5tNvbaLTNG1a2h04SpdWOkt5rai+m3pmiH9iwQW8S3bjKRMVaT5XMcunX5pRgk4veLfNbVtK1rX\/m6O59BhMTRjSlGdXlUopOm4v3mtU7976WfQ434P8Ajz4j+ERL\/aF9pOr6Qy2dvZz6jorajqujR2socJBqxlivZkhto3tYU1P+1Rb2bGCyaHaN2GX1MXQaVWcalGOr5or2nNpZc695qKSS1X4nPiXRnrB1YNJtpTbi3r9l+6un9Wt9\/fHP4Q+Hv2u\/gfZ6bbaRYy\/HrwXaS\/8ACufEdtBbWereKbCaP7XpXgbUb0rGuqaLqtzb6lpugnU5lOha5qumzWl\/a6WNZs771cVhKGKoSnSh\/tLTcXouayva9r2b7b3t6xlWPr4STpTqN4dTcVzRuk5ddVolfVp6JN30ufztXKz2dxPaXVnNa3VrNLbXNtcIYZ7eeB2imgnhkVJIpoZFaOSN1V0dWVlDAgfMulUTalF3Wjt3Wj\/E+vVSDSfPDVJ6SVtV012P7jPEngnxFpljd33hW\/vLKZrW1WDw\/qCX\/ifQZJ7fYm4393cPd6TI8aOjS6dcJCjsZDZyOjGv1GFNxvyWd7X5raJX13Wmuu5+b+2U5qlJOFSPxKS5Yrbq2un9MqaPBrF18MnfVbK2Z5L06ba20M7ea5uJy1zd2SXCRyTWekTPaW8oSKZp57hYoUMNjqcun\/K8a4jEZVw7m1bCUJYpywcqc3TqczpRrwnTnVcbtyhSvrGK5m2r9T7zgPL8NmvE2VUK2LpYaisVSqN1ml7adCam6dO9oyg2o3au2no00fkT+3f+0rc\/CfStQ+HPw6lhPjDxTqMmnz3qyRCLTo5ppTdajNa7ltzPYwuXhDxtaAwRCaJokaM\/ylw5l0MfmVP2sHVpRmpVbLmk5RvaNvK7uraXSZ\/W3GnEUMty32dOfLiVClCLTuoKUX+80d010d7a9XZL5m\/4JK\/A\/T9e+P3ir4g3FtLdw\/C2XUPGN\/JdxQz2k2pa5aXvh74dwefbXOpxz6lJY3fxD8R6kwvpms9T0\/Q2klS5iEif0pw1gY1qqq06CoUMLpCDUYuMY3jCNlrazlulsul7\/wAmcR5jUjTqRc5VKmMm4zrSk5KcnbmkrtuMm7Kze97Xs2f07eB\/Hcvw48f6D4ytWla2tLpP7VWCSQi90eU+TqKOEc4lWNtlteJlk1GO1uo2M6pIPsc0wMcRQnSpvnau4y0aWndaLVeTvbXc+RyzFV8FjqFVpU6Upck05JycWr2kk9Fe2tr9T9m4tWtviWtnaaHqUUunxadBq\/iDW7C5t9z6JdwJLY\/YhC7tbXerKzxTmRYpNP8AKumtt7fYZ5PgYSnGs6KcouL9+2zt8rNW0\/NdD9RUoyhGcbvmi5dLNfZaavdNep+c\/wDwWp+Pdl8D\/wBmfwX4Us9OtbiTxPrOkXtvYkRhDpvhacawkEkMqmOS1W707T4roTEoY51BXLE124OvbEKTUVytqKb+K66bX\/4a3U48w\/3GrLqocy6K+iXW9ru+npd9PxM+DHxl0f4hWukjV4Eh1aSC2u5zCRBskPzRJbSlrmJZCVP7rYtpKU8uRJF3kfeUJxnh4VYNykouDjo7KS3a+JWXXTtsflFSDp4mU6jU+Z3UZPTtffVr7jxP9sLwTJp\/idda0+6stR0nxFp\/9u3Frp6K2o+H9Ue5u7N57dYXZYLNjHFLexTXKW11fXOoQ2sOneXCj8Fam0lpe+jTVlZvW+uiWt3a33HYqkY31i21orq77H5u2xjsNWuoSDFZai8qXEzMI4HkYW13b6hGwdxAzyNbrc21wyBopplIjV4VPiVKahOUdEm9WnffS7d+nmb87koykuVtbbfmfanwc8T\/AGew0gXM0rrp76hpt1vlELG3huoZbc3KyFEiX7KitZ3FpPJC8a5voFmjhuYu3DzUXGzTs0tHdqLtqtd\/PTa3c4sZKcKXLBu0nZ7vdNdNbd+umlmeu6p4S+Amt6nqOs678K\/hxrWuavf3mp6zrGqeHXutT1bVb+4ku9R1LUbkTKLi\/v7uWa6vJwqia4lkkwN2K2eGwkm5NTvJtvbdu76ChjMRGEYrEwSjGKS5ZaJJJLY+8z4o8E\/FDxO+jaR4n8Trb+F7AX003hTxBd6UupvbqkNlpt\/PBK9g0epXJnDF7a5uUjE8UFxFcPFcxfQV5eyUWldO929la1trdWVCNWcowr2qWcuWXKlJbNqTWsulr7dFrrp+P\/iRdWYhuwY1neM3FsINsIFtFCqJaRrGGtoYImjECWMcMMKlfLeFyQX8irCniKU6VaCqQnHllSabU4v4lZ3htvzK+unW3RTqSpVY1qdV0atOSnSnHmThKPWm4tKD2v307H82n7YOiaz8U\/iR4m8WeEry7tvELXCsNLvI7JLeztkVhONDnnmFnfRTgF7m0nFndK5RLSfUJX+yD8vq8J4LLcxq4jLl9VpVqk6k6bTc6UpaqMbJJLf5bn6ZW44xGZ5esPmMKtavTp06f1n3WrQTf7y2t3ptpvtZn6vfsXapovww\/Zu+F3if4W3Eni3U7C41Pw7+0F4W1WCz8P65feL7qPUNWlFpp8l08GmeKPD05sLLwdl7aw8U+Fbi3sNdl06\/SC+0T9EyeEKWBg6UfaOUHCs4q9abi1eV43iox6OSad3r2\/PcwrwxWIk606cFTnGVKTlKUI78yUIyakpaJN3a013R9wW\/xI0fxFp0er6LdR3Om3pkmjlWO+sr2CVJWt9TstS0+6hW8stUs75G03VdP1OFbu0voLjTr+Czvba8ig9+nOhGCtKTctZKydrW8nvfazv10PIrRdScpRlLlTduWzjNrezd07Ws+2tz63+Bn7Unwv8Ag\/oyJdeDdav\/ABxFpeptJqGj+JvDOjaF4t8O2982r2vhrVhrviux1N9SsdYlleWXRvCeuahDpl1p0MVnd\/uLavyri\/FYfI8ZLFexqVliY+0jL20aULreLWkVJ8y91arW6fX+gPCPgzG+IUKWDw2Z4bCTo4vD4WtHE0cVWrQhiJSiqiWGpVIqnHltGU0k+72Xwr\/wWr\/aeg+Pnw+8FPa\/C\/U9EtbeGO20vxfFrlr4l0eynu9R0qW40C5m0WzfSbG81CytNTuLf\/ic3F3I2iyQ3djZyK0I8rJc5eaYyjGGElTpciq+2jWjWjF8rXLNxjHlbu7Rs33Pq\/ErwvrcDZPXq4\/OKNbEzrxoRwUsDisHWqQlKbhWpRxXJUqUZQjf2jpQjqkk07n46\/BrxPc3Wn2qW1wE1K2kjhb7P5cswlh3CNFikIknMwdk8uOSNUkaMhpWZlj\/AFTCycYJqTTaafo9G7fNn8w4iKliUvZR5bNt2btrou34\/d1+z\/DWk6t8cNU+KEl\/vg1LwD8KfhnpPh03MbvFqXiTWdX8Xaprtmxljvmnmv8A7Hb6BJHM5YO8VzaqY7ZLNOlUZVFJqXPbR3tfW\/8AX5CnCgnHmVm21p0STaf3+ffZn5a\/GG1l8Ja6k9obRtGv5pSLcFv9GlvYt0i2kjCJ9ogt1gZRGIAuBJH8xEfy+Zwq0JcybUG3B30bk09FtfdX6+h2Yb2dRck072aUlrfs77b3PTPhD42gu4Jbe+lR1nENzcbR5Zcq0NheTJBtkdJfsMbebLZhzFCJpLmCa3luonnC1b8tnC\/K1utHrbr37\/duZV6UU7N+6nfmfz3e1n69Omh397H8S\/tl39nutQ+z\/aZ\/I+z6Upt\/J81\/K8gwRmEw7NvlGEmIptMZ2Yru58R\/PD7\/AP7YxtR\/ufev8z9xNDtraHQIbqG3giudQjuZr+4jijSe9mtRqRtpbuZVElzJbkAwPMztEQDGVwK+sxn8L5r80Y4Zv2ktX\/FqLd7e7p6eR87\/ABaubiG18Q+TPNFiG+I8uV48EJqKgjawwQqhcj+EAdAK8ebatZtb\/od00tNF16LyPyN8U\/6V4r0\/7V\/pO5r5W+0fvsqgOxT5m7ITA2g8LgYxgV4OI1qNvVtu7e72CLfs56veH\/tx9M\/su6tqoi8Q6WNT1AaYmgxXaacL25Fit0LnTXFytp5n2dbgPJI3nCMSbndt2WYn1Mj0nNLRewlotF16I8+ok7XSe+69D7S1sC2+JfxLjtwLeObS\/AGsTJCBEkur3qeILK81SVY9qyajd2dlZ2lzfMDcz21pbQSyvFBEielS3+cfzZ00Uvqa0W2I6eUTofhZPNc\/tG\/Bfw\/cTSz6Dr\/xO8LadruiTSPLpGtaeL+5IsdW01y1lqNmDDEfs15DNBmKM7MouPj\/ABBpUpYTKuanTl\/woRXvQi9HFXWqej6rY\/e\/o24jEYfM+K61CvWoVafC+KlTq0as6dSEoyXLKE4SjKMl0cWmuh81\/wDBYLTtP0b46eItJ0iwstK0uPxIJY9N021gsdPjlktxK8iWdrHFbLI8skkjusYZpHdySzMT+b8Ntx4ur04vlprDzaprSCfdRXup+dj998Zf3\/gDwrja\/wC+xk83nGeLq\/vMTOMZJRjOvO9WUYrRJzaS0R+Q+jXE9lc+Hp7OaW0nk8S+HInmtZHt5XjbxFZK0byRMjsjLwyElSOCMV+wUW9NX9nqz+D5\/wAV\/wCJfoftH+wncT3h+LE93PNdT2raFcW01zI88ttcXF\/eW088EkrM8M01vNLBNLGVeSGWSJ2ZHZT6+GbS0bXv9HbojLNdPZ201S000bd1p0Pgv9stEj0jxWkaqiQ+OrsRIihViH24HEaqAEGWY\/KByzHuc+TnqTpq6T\/fy3XZK33GmB1dG\/Zfmj5L+DhJ1aOMkmNrK5JQ8oT9skOSv3ScgHJGeK8DA\/H81+hWJ1jJPa6\/I\/V3wRa21x4L8IXFxbwTzz+F9Ammmmijllmll0m0eSWWR1Z5JJHZnd3Ys7EsxJJNeycNl2X3I\/\/Z","a_rank":"6","a_hot_flg":"0","a_views":"555","a_active_users":"505"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2F7a8dae100c07499c50f7fb6ff4b0db63","a_title":"\u798f\u5cf6\u7af6\u99ac\u5834\u306b\u4eba\u6c17\u5973\u512a\u3000\u30cd\u30c3\u30c8\u6b53\u559c","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 07:05:49","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP7nNS1zR0tbR9GliaYHBCEDeoXlWJJJckZ9PvdzX4VnGKyulHDLAQca0I01VSTTjbVpp6qVrPX01PRU6tn\/AMvG\/g01fkrb+i+85q+Gq61bNcW+lvNLwCXKJgLgHGSGOM5wAc446V46q4jExqcs6qpKLcnFN2ilrH3UneVn1s3rsFag5xhOpo7W5dnr5O+2v\/Db8H4k8M61NYSQXmnMsN0EhT7PhwGcAKzsBlcEnlhgcnPOK7smlRoyjVWJnGpTk+SFSMr2e6ipdWlbrbTexjOi\/ZThFN88OSz6KVtVZdLJu+2qOk8L\/Du30rS7a71Mrc3tpHmFJAjBNqkJksTzjbyMEDJFVis0q05YrExlyU5TXLBX5pc1lJpd0uXbRLzNcDgI0KV5S5qiT1i9FZRsrtXd9bpv7rss21g2p6ot3NpVu8kY2LMVX5VBwAvB2jIGCMHsK48LjJ4qnOc8RKUU24U5Rt719XzbNrVad\/IdKMq9VOdCyhK3NZ2dr6tu6226Loj1+yjSKONX2oI0GVzjkLjA+mOhI4rTBVaM601XqQpRgnq5KO6f871emnr1O6um1FRXM9kl0UrK71vtqtPvLFwbe6QoxHQ4DLnPsQcgg9jxzg9BmqxMcNiISSmnKmnKi21q3va2msdNO\/W9jOEKtF3STTtffa\/ys1c5S\/tPsdpdTGSCzs4UkuLi6kZIYYIYkMk0s8jsiRxRxqzyO7KkaguxABr576m67cnSnKSnye5FtN3suj1b2VtUdTnHZTUX8r22+0npqun6n42fFf8A4Lj\/ALIPwlHiKx8I33ir4zXfhnVoNH1EeDdMXTNCima4uIbryde8SPpqXwhjtbh7Z9MstQtL5lQw3a2zNdJ+j5Zwjn+JwkZKvSwVOUKjnCq\/a1LKNoKUafK43ejdrWOSriYczi4xk3pCV+9tbX3u\/Sy72Prz9kH9un4D\/t0eFNa1b4QeK7u21\/SY1udX8BeIIbaw8XaPAziNLySztru9s9R0ySdhAupaVe3ttFI8cN09tPNFE3gZrkWNyWlT+uv2sZycadelaVObS+B2XuzWtovVxV1ujGM+Z20uvi8u2np\/Wh9xaLqKmFLZo2S4hCpJG6lCpAC5IKgnPUZ7V4ca06CV1OXNqouLvG+vlZbdDbknp7r120Og8wnnJ5\/2gP8A2auxYyq0m4vVJ9Ov\/bguWS6P7meU\/wDCDXNjq0ENttax\/wBa8py0iOD0UHI5GOmcfnVV3Ck4U50J1sRJyVo\/ClHWUpySu7a2sylOEYxVLRJapq7T73d3\/WyPlb\/goh\/wUF+FP\/BNz4DRfFHx3ptz4r8TeIb6bw\/8OPh7p97Dpl94u162thd3jXeqS293Fo2g6NaPHc6zq7WV48JuLKytbK7vdQtYW+lyPLamZf7NhnCkpRU8TUlHnUKTk7pbvmbTUb2V73Rz16rveb0jZKy2vbtr56n8TvxQ\/wCDjr\/go\/438dzeKfCHjbwx8OvDcd076T4A8N\/DzwzqXhyC0MoEcF7e+K9H8Q63q0kkWyN7i51hA0oeSzFmrrGPvocG5NGly1qbrtxTU6tecHGVn8HJOMUvK17JKV+uDxLkr06d9WnJRk7v7tGtb3ulc\/oz\/wCCPP8AwVy17\/goVF4o+DPxi0zTfB37QXgvSovEENxpsR0vS\/iB4WjnS1v9RttIcyW+n63o01zYDULGwnkgvrS7XUbS0sYLe6t4vz3i7IP7JjCvhFLEYKq3DX3nRq2VuaabTpz2vK7TT7pG9OrUqQ9lf2VSX2WrN9XJcyvaye2mnXU\/oG0bTrjT1ZJJPMI4ZmJweAMjgdOeBkfXgj83wtTEe3nGLUaceRuKs7NuV7Xu9dGreR14alKnBwk076pp3v52d7f8HpZGtJHNKQdwUZ\/hPOPTng8\/T+WOirSnVlzW1s7O9tttrbWWr+7e\/Tov69F\/ViGWCRXSUOSQSShPGPcA\/wBccE8EmtXP2cIpyfNZJK930b+X+Qz8wv8Agr\/8eNc+Cf7BHxp1jwpMya\/4pj0b4c2jxyyRSRReNL5dKvlVonjfy7uxM+nXCiRWe2vJlQ+YVB9nhTGVK2dUcLzSdJTlKpF6p8kXO\/yir20Wy6gsPGo5SkmkouTabu22ox0v\/M10tbXY\/mCtv2Nv2d\/DP7NV4+oeLmv\/AIm67pej69rGux3surXmleMLqxS6g0tNC0RZms7W3lup4Liyli+0LavM8jRuokj\/AGn65Oko8tXld4+4knaM1dRtb3m1d63fS9tu2GXUHFQ+rpuVOX71uTlGWtpJN2XL0W3XoeD\/APBNT4zH4B\/tj\/DPV5dQutEn0rxlZaLrcmlaiLe18SeGtdm\/si+LQyn7BqumzWs8sc0jR+ZZSGO4mWyJEljOYwWYZXicOvZ81SjOdN1E\/wB3Xh70Zyj9mSasn26W0PKrYOMKijFuM4TjTtFuftVUmoxcd01qno1bV9Gf6FOk6nDrVvDqUcHlfa4klQsY2Z4nUOjBomZWDKwYbHZeeGI5r8Lx+Gr4zEtwd6sH7Or7Ne5dK7ldKyu772e6d2jqnR9gowUub3U1aza68rsrabX1v6mtiHvJg9xjofyrj\/s3GR09vLTTRVLaaaeRy2xHeP3r\/wCRMxvElqsjZkRTGDySp3L2IBOR3BGAfQ0pZzXptV6bjUklKDbirOLWqTs7tp79Nuolh02lKUUnJJ6W697r+vQ\/kA\/4OStJ1340\/HL9if4Z2TzRafq1t8Q9O057i5EOlSarr3iLwHpcsgMjCKO5iiFgZGIUywyRruKREp+r+GOJ+tYDN8XV5Yz9tQg+WK1jFV58qtayvyyaWnMrvVnBjYOVSlTgpJOShdXtOTdoptaPXZO9\/VnzV40u\/gp+zxqPhf4OaV8O9HluNPtLHSbjV7TSfDd7FqWrR6fay3jySXeof23eXwllM108elMUuX8pSTsD\/SZglXbqU8RCNm+WipSvd6tSa0i+6cb\/ACTPs8pUaFOlha+AqSU5W9rCMHa6u209ZR21un1ufUv7D9z8Mvid+0X8H\/Fvw50hPAfxY+D\/AMbPC6eI9et9O07TX8TeCPFepx+CfFng+6h0zUJZ7p7u2161uVXUtPsrm2isrq5iM0NrdGLz8zq4enwnnCq1YVHDA1XJKT51K6UZQbi7zpyl7tmrWbVunlZ7Dmx9GpRw04U01CFV8tm4xnzKUFa0b3fVdtGf2AsyKGMSMygYwDk9M9PU+3Pvg1+GLEYaMassNTcrqXPPmblzJtRd3tG1307aO9+VKenM0nrtbby09O\/foUIp3zu3YU8bHGGzk569x2655xnmuSGYNc0neKjFpqTcua6vporWtu++vno0nv0d\/mVdR1OKwhNy0isFxvhZsEqfvYzznGfY\/jXPCrWxNSM6D9tUU1+7bkoqN0mnr1TtpbWz8hpXdr2v+fQ\/Kj\/grn8KbX9oP9kHxl4Y0C6WC\/0vV\/CPi+8U7AsFh4b1y11DVL0qWI82y0hdQuYgAHkeJYxyePsssqUcBmuBx6oPDwqVKdKdr8rnKLjO137zb3a91q6a11rDRkqzTk5xnFwlFXWjcZJrV2d46WS\/Q\/n08VaX8I\/gf4Z+JXhNmvvHN5quueFA97418Uy34itdMs7q3tdR0nw1Y6XfNJpF0ryb4tDs7e1vHEkJuLSSSBx+w1ZUH7TlpxnKMqSlO9pJwV6c4pd5JRv\/ACpc10fW4LLsTj5U5YOnWrxdJ1al1FUYqaam5uo7RjFXfLbR3as9+jvfj5+zL4K\/ZG+Kfinxj8G9H0VPBLaFrnw\/0vRdC07T\/Ed3rt\/4l0\/wfZQ2sl2LXU7W7abU59ejlS+tr+K0sVuklt7qzilidGUKzlQqTlCVa6ck25Oy95tqzT03Z4+aOWFVCrSoQksGuSdKLUYucanxxcNObmem9mutkf0if8Eyfj5q37QX7JPwn8a61e21z4jtfD2n6J4q2t+9OqWtnDIl3IDzvu7OWB7n5IhHfreQKiiHFfjeIhiMnz\/MYKpJ4evWqVaEJbKnK9pR6LXdNX63XTgxdNRmmo2hOEJX1s5tJ1IrraMvdSu9Ffrr+hBS3YkllySSf3g6k5PetHik23zrVt\/CuvzOY\/L3w\/8AF7xD4t0Szv8ASblpp7ieBHiyWkaIyIr7UBLEnL54I4OTX1eN4PyrKcdVp16ahRpQnyO7UacpRa5nzOzSSTsrOyXo\/j6GZVsZhVUpSdRuS91bvbRXa\/4Pbt89\/tz\/ALKk\/wAYL\/4a\/G6OLTpX8DxaJYeLdI1ZA84stH18634M8Q6OszRrHd+Htb1bVzqSRyxPe2GopG0Vz9lTyfjODuJcNlud4vIqVWop4uriauEr0YSnh606WHqTqUakedKl7lLmpzd+dNx5ebV\/eZXmFCpltTK8fScefEUMXhKvJTlUpYqMop3npLlnGCTV3FJppKTcj+cD4+fFLTrf9oKTxK3gC21rS\/A0NxrtzqsujtLqOsapDJLDPJDf2unXSWRjuZhMJLqJTIB5UEsb+bOv6nhcRDEVFNS5HGTlUpSnFSnK7UXJuyaWqST5rJa9\/sKVNUuWKoqS5eZVFGLnC9uWMXK9nGyT93zR+hX\/AAR\/8Sav8SP22LbU9M+HWn2Pg\/xX8NNQ+Jvie+g0tYYdH8UaAbHSmvry8azgW7uNS8VTadqVu0ZZ4b+5cGR2s3evmuOcyjl\/D2OhKcYvGwoYanFSTUJyq3n7NJ35eWLlON2+Zp3s7Pxc2calJx9goTVVThU+Kc01Zwnro425rrTXbQ\/rWutXl04n5GeIbQXycZOT0PByPUggHkZzX8wVOIsbgnOlhHzSjG75mpRlFNXW2qd1e2re2iPA5Uviun10+a6P1Nay1JL2MuFUKQCCCOnTg8fTr6Ada7sn4nxGYyqxxeGjBUo3bj7qtrzP4dVdf5W1C0NNX\/Xpe3z+Xnj3WkW+qyuUu9oY4KNyBtPIwWGPTBHpyK9vK8zw7xt6FaFJ05vmpykk5tc2ltLpPs1sTOjUU1NOXIo3tundPV2Xz67bbnx7+3LpqeD\/ANkP9pjxRam5uL7Tvg749voktVzJCLHw1qU012CEZlSyt45r2aQBykMEjAgjcPqP7Qr18zyqi37Sj9dpJJXteVRSd23y26LRLqa4OMY4iNTpe8m7WS720flv1P4Of2Ff2oPi98V9Y8XfAbVtI0bxdaWfg3UPEPhXxf4i0wajrvhSw8O6tptppOgXl3cTGK40snXY9K0i7kt59TsJp7exSSaweNLD+jsZhHQwixNNXnCMIVF0lCT5IuTukpKWjbdrabtmmV5vUlipYWVSap1Z1VRUZ1Ip25qkYtQmlKMYRlKEZRaunzcybT9Q\/ab\/AGd\/2qPi38FfE\/jzWUi0\/wAIeEbCTxBaWBt7fS7fVNL8KpcajdagI2WBTAkdpIINSuhI9xIClioh896vLMuxNVLHSpSp0IR05mlOTas5KLV\/Z7pdW9VdXOXOc0oUZywUa8Z13U9+NKzhFp2cJSUpXqX96bWm97H9Gv8Awb3\/ABN1v4k\/sy3moS+EtU8PaN4fntfCN7qT2d1B4d1vxBoqykXOgXLx\/ZLiVtLurW48QRWs0scGoXMM0uJr8l\/ybjvJcww2L+v0qdarhHKc1iYwcoU4zUX7OcoR0cW2lporK7abNnj6OJw9Cm6lNYhRfPRcl7SLVlF8t72kk+jv5H78PPdb32odu5sfK\/TJx29K+C9rJ6qpOz296P8AmTzS\/u\/ev8zx\/wCFv7Mnw\/8AhdqVvYWlpez2rgCzvdQuXumlljHEZaR5NjFBuAVIkcltvIAr6CpmvFXGmfUMHxTjKeW5di5zVN5fCNBYmTWlptStGSaSvJtrXS9j43CZXRypqGH9pUgo2j7R81l8kldW0vfY+XP+CnP7Rnwp\/Zj+D93Hd6hZ6r4y8VOdC0zwSmoRtfvYy27XGoatLbWqXF5Y29lax7LS6nt5Lcalc2ZdJIEmWuzM+Esv4NzDCY7JMPmOazpVI4nGR5pVEkrq0a\/snGDkvebTqJq8XG90v1HwkyfhDxB4+wvCXFHiXwr4f2wdXFUsTnmYZbQrYnFKcaWCwGGwmKxuEdari8VONO\/PTjClGs4TlVUKcv4j\/iz+0Vp+sXeuWceh2BsNU+2SwavqEz2l7pcd2zb47+eBJbW8gijQbWuLS1dfLSaV225Hp5NnmGxWIhNwnSnOryfV5q\/NJydvfTlJK6092K11T1P6X8RPAHi7guGKrYTE5fnmV4TD1cRPHZZOdOusPRjOc60sDjG6rtGPvRoVcRyq1kk3I\/r6\/wCCP3hb4Y+Cf2TfCPifwTqOleJ\/FfimN7H4heJbbTltZbLWNOdZ08HW8pjEjWGgw6hDKz+Ywv768uL+Ty98NpafmXivi8yq55PC1JPD4bA4bCzwuF5NKv1ihTqVa0npebnKULq9nTaXLufyjjMS4VYOc6VSLblBqpGf2pRcpcjaTbjrF62tdbH6f6r4qtzfxaTO4kkuMeUIwCpOc5faGwBwcnCkcdsj4PLMsWLwUsxqwcKdCUozk7J+63f4rXvpbVrpdaI8nFZknOFCnZSlO1rabOzbd27X7adnfTori01E2EUOn3P2SaTaGdCBujBBYMMnqCcZ6cHnmsoZlhMNTrezw05rWK52oRs72l7qu9UndXVvI3oYWsleVZNtpyTjzXV3onpy6abPv5EmjWd9banbWsskkzySKuWOFkYgsSSB32nPBBJ6V6XCGXYbOs7oQVOm51JSapSq2bkndtPRtcrldSjbfvp1VcVLDRtUd6bSV0k5Xdkt7JpO2u6vtbf4s\/4KCftgfDn9mT4QePpvGt5oVs13oR0+zsNetYNZttel1a4n0nUNEtvD7vG2u3B01b+aewwYp7RZnuRHaRXEg\/srIPDHh7L8up5nnyeKxlWNOdDAqpUp0qLmk6Li6UqNSrVhpJvnUG18NrHxVXOcfi8f9WwMHTw1KfLVrW\/eTertzJSjCF9Fo3bXsfyJ\/wDBHf4ML458Rftq\/E7wb4DTUofEPh7w74F+CHgDWby5s7abU0+I+h\/Fez1rVNe02ezlg0\/wXaeBvDxvjaXkdlqc+sWunXc8cd7FG32tClCpgsZRjQVT286UKGHqQk0oRnOqpVZxu+WkoSk+Vq7sndCxVepQxOEq06zoxoqpOriINSceejOlJKLTblPnkotbXukmfUXxF+DP\/BRz9r74r\/C\/9mn4n6F4O+DvwntILeD4ta38P9dvbq48WfDHXX0i7urXWntpW0Ztbk0nQp7bS47WCyiuNSvLiGSCLTrmSzrtpYPG4urh6FSnClQXInVpKSvBpSV4uLSstGk0k1borTGrgMPTrYqFR16spTa50lJzu4t3b5tXeV3Z3S06H9Nfwy8WaH8BPCPgr4Y+BPCmhaB4C8JJZ+FtG8PaTHHa2dpo9nM1hD9ktLSOOztY2aN5snzpr25e6ubllu2ukj+gxOEw1fCuhKjSdKEfZ25IuM4pW1i7ptpJ8zV3u09z5inUqvEqc6k3Oa9om7QcU7ys5R1v0a+Ffl+gkFhp13BDdKfLW5ijuFj2j92syLIE\/wCAhgv4V+KYnw2yapiMRNRlBTrVZqMdIxUqkpKMVzaJXsl2R9bTzWSpwTjJtQjd3Wrsrs+Gf25\/2l7n9nr4N\/b9GvbOHx74nnOneEppljuP7IWFFbVPEbWkqSx3LaXFNBb2ULRyiXVdQ05GhniEsZ\/l\/LsbmMq2HljKtSssskq+HTfIvaxkkozaTvFOLbptKT+G61P6Z8BvBHEeNnGDyWpi8TlHDeXUaWM4kzfCU4TxlPCTquFLAZZKtCdCnmeYONSFCtWp1qeFoUsTi5UazoRo1P45Pjt8SZ\/ix4j1y78ZeItf1zV9Tmd73W9fvFvBdyPulaSVZbia4jQ3LyMskcCvCpQhESIKn0GH4mzrC4v61HE1cRzSXt6dZxnTqUvtQUbRUba2s21G6tJn+jPHf0GfowcbcHx4UXh\/l3CWNwtNzyvjThqjDBcV4HMNEs0xucy9tjM+rwa9pWpZ1LMaNeak1Tp15Rrw+Kz+zlofjWO5tbTxRc6bdXKSwG0WQXUX7qSSKaDy8OEfMf2mGWAwwtbSRvOhd9o+1liMPj8NS4iyrCYaFbCV4zx+Ampe\/UhZznFQsoq0ubmfuvex\/nnwznPHvhL4pZh9DLx14tzOeS8eZY8r8JPFvAYiNJ4R5jQr0sgo1ZYyVJPD1cfTWU1MG8XHEZfmsFgYzxGV4ynisP8Avt\/wTG+P+hfsi\/CTTvgp\/ZsN38PfD\/nahfWdjBBDrUeuajJNNqHiKO5naJ7+XXJLfM0GoXEqW8trHZWlxa2ccCQ+PxVk2D4zlDMliHTxGJo+zwWIc2vZ14QcZYDFRinanzK+Hm7OEqspNTU0o\/lnGHCGNyH\/AFj4HzfJKfDfih4Kyo4rxAp4WrjcXlPiF4V5hi6n1fxf4Yw9Z1cZ9a4cp4mjX4py7DcinkTq144aeNwbp0v3s+H2ty\/FTVPC\/wASPh3f2Gv+AfEmhPqem353RTo0E729xZXNtlmtr20u45bS7iYny5onAd02Ofm8Hw5h8y4cxmQKvVo53gqreKwujUac17lSFVKKlCcotJPle7tpJL4XiDh3NOGc7hhsXVwtenKhhsVhcXg60cRgsdgcbhqGNwGPwWJj7mJwmOwWIoYzC1oaVcPWhNJJtL6F0\/W1u540a4FvLGWiliJPylcrggk4z\/Dgkdx3r8R4pnX4fjLLsXSrSq0W1GcYTa00Sckmuivd7Hr4SvDG8qovZNSbaXldLTm1ve2ivq9S9qWpeItPMk9nouoa5HCvm276fBJLMHXJVfkX7wGNpyoIJyQevveG2BxebVo5hlzxeGr4evF\/WPq9Z0kknJuNZLkbmlKPIr2b1avdefnPtMK4pr2sHFu0GpS5rPS12ldpW79PL+VX\/g4H+EXxt+Kvxl\/Z+g8E\/DL4g+OvBQ0zxAnig+DfCuv+MBoGo3XiiGWa41jTtHsb14IZ7OeJo\/NQQyx6fcwKzCW4jf8A0ixWDxdShlE6VCriVSwFCnNxi5XqRpUrylZWV2m7762PjspxuForFwq1YU5zqKUXUnGEuVrW95LVOya1svvf2D8L\/ht4z\/4J4\/sCfF\/4taF4I\/tzx5ovhiDWbeC90jWY5rhdRvLPTLnWNfg0azm12y0vwtpuqan4g1FTaww6Zp+jzNNcQ2ivcr051iMRw7w9j8bSw9PEY6NO6g05cqnOMZNRhduFOE5SkrWaUk5JXa+z8MOF8l8R\/E\/hjhHOcyrZZk+aYmrQxeLpVqGGrN0MLWxNGjhquJjOkq+Nq0Y4WK9lXm3VThSqTShL8VP2e\/8Agrf+1Fc\/tE+GW8W+LdI1bw74p8W6TZ+JtIuvCOmWdlpduLyTxC2keHv7PGnatE2kvdyact9cG7totOawt7u3miSyLflGQcXcRTzfCwxmYPEYPE4iFOdCdHnpxjKtOTnThTinTldumpc8kqcbct0z+6vFrwL8IcJ4fZ5PhzhX+yM74by3E4ihmOGzirTxONzDC5bBrC5hXx8+XFy9nB4qcPq+H9piqyUJXqQpv+orxJZ3tlpHhLS9N3z6lLJpAacSMWuL3y4GmlkckyTOltBPP1EccNt5CJBbLa2yfvVWDp4V0203ZOUrdrN+bTfppv1P8wLv603zXTk4qTvZpXXNrb4tG1p2ufdmkfFSGPStMQzxts0+yTcXALbbaMbiOxOMke9eBKlGUpS7tvr1d+56qVkl2SX3H8oH7T\/7RPxD+NfiDUdR+IEWs6TqWjaLBYWHhfW5Ua+8O21te6hA8E8cdvYoJrl5ZNSMwtQJ4dUgWOSWK3t5G\/ljxUoPD8TVlSpUqGEjRhh6NKjRjThTlQi5VlJwSjKc3P2kpfauktVZf6yfs0+O+HeKPDvjzh3CYClhOLeB+MFTz\/E+1jVrZxg89y3C43Ksylz2r0nhuTM8plRUXQSwFTEUpf7TJr8dfGPie7i1y5kjhW6bzGjWCRgBIzB9kJBZVJmVXCguokZTH5kTkOPzunR5knK6STk2lfT0Wtut+m70P77zPMqlHEWoRjUtzwdOUuWM24p+zk3onJXte15WSbd7+BeHfjdqnhT4rxx2AmGk6dp0F1d2OoyNDaLJd3F3E1vMZUlzdQxWqWqqkDXclzHJGkDPJLbV+scFZVThleLxUlGbxOJVD2fNzRnTpR3lFOzjLnacna6Ub9D\/AA5\/aecT4jOOK+AOH8tji8JjeDsHUz7CZhSVSjjMHmWa4ylWwccHXgo1KNTCRyynVnJuE4VqaqqyUpH6KeDf2hvCyanpOqy6JrWkABRcTS+TJDqEMrRyzWY0+KCTUmsbhoI0869g0+5WQpKsCTwJj1YxyLD1JZTSWDpVn+9lhIS99uKdTmcXJ2kl7101K0Vvax\/DOfY\/6Yuc4DLfpJZvn3H+bYDI8LWyzK\/EzFTjXwuBy3GZhicor5dTxdWn9UngK+YY\/F4HE4J0amDxE8TWpYmnWp1qqn\/Qn+wh498ay\/CTxBH8OpPEknha28f6lNo8Gi6\/ZWNnYQal4c8MXl1aeRqifaIZW1F765e1iL21pHcQ28B8uNcfpnAmEwNfA5k1h8LieTMp0nVjTo1JQcaFNTpSqJOTtPVKTsm20tWff0M14wxXB\/h9R4xy\/McpzrLOE6OWwjj8NUwNbMMklj8bmnDWaUaEqdODwFXIs0wWCy6tRTozw+AUKUuWk4Q+yf8AhI\/jJvMi2fjEPnO7\/hLtEVs9ySkZ5z1I5\/EV9rVyPKq+lXK8FU0s+bCUZc3T3r03z22SldatW1OKGIr0m3Tr1oO7+GU0ld3draWfXoaOneJPjfeahYWbyeNbaK5vba1eQ+OrIiKK4njieXy4oy7BFdnKIMkLgdzV0Mjy3D0\/Z4fLMFQp83wUsNQoxvsrRhGGtnppfXQt43ETnFSxFZy1SblO6UlZ6vTba\/5Ox9gvrWlwapqiDbPqKaveWE5YhnTdH\/aqxljklfJulUDvIXGe9e9hrqjGm21yKNraO3LZLZbJWt+BjjKEvaqS1jON10fNdXvfW9tHfueN\/tIa54duPgN8bI\/FGiaV4h8P2vwm8YalqOg61Y21\/pOqwjRtXks7S+srqOW3uI5LnT9gVkcLL5ZGG2mvMzaNJ4DGRrQhVprB4mco1Ixqwko0pNxmmpRcNNYtNNXPq+A542HGvCf1DF4jA4qtxHk1Cli8LVnRxFB1MfRpzqUqtNqpSlGnUm\/aRcXGyakmj+dfwx+wz+zF8Af25v2Zfh\/8OdGvtQ1bxnoXxU1\/x7Pq+sSauhttGtvD1rpNtAjKsVpb2Ed74hjgECfaZUdXvbi7nVpz4uP4cyXh\/iPhfL8rw86cq+BzOpip1a9StOpKFTByp3VSThFU7VVTioJwjKSja6P6M4j4+4r8QPC\/xFznPp0KUMDxbwjQy2lgsLSw0FhauF4hhiYYqdKMZ4iVVwwNWpDEzq89aMavL7WNSofvD4nW28N6dqHi7Uyw1O9H9jeFoiSY9Mt5yLZ9USEgq05lllupgF3rplrOwYrG4H1eYT9lRlGy9pUg4xV9OWSTlqtnayTb0dz+VKUVUq2d2lJuVko7PySitnokl0Stoc7DqGnW0UVteJcR3lvGkF3Gn3I7mJRHOi5YHakquoyAcAcV8sqdRpP3ndXvz238uZfkjrdaKb99bvt\/kfz+f8FOfgh4k\/Zu\/bP8WwSaxqGqeAfiJ4csfEvhe81dxLP\/AGTrlv8A2ULWW8KhZrvR\/F+j3Omt8yytpzWd3LGhukVv5a40yrPauYYtSxGLzXBcjzKGMxCoOd+VwqqUoKjTUoxp25aNKPu20uf6j\/RQ8UPow+HWB4OoZhiuGOBPGDi6pT4Ax2Gw1HH0s14zq1c0pUclzDMqWCw1fC1liKtTCxWZYxUY4PERxtBYmnh8RUZ+PHiCGzu9Tna4YxlHZWkEbzRqpfJjuYYis0tuWClxC6XUbqk1lJFeRwSL+fQqyUYVIJtpJx769d9b\/itz\/SPHUMPUxE1Uk6bhCM+eEFUjKM+WXLOnvUjqneOsU+aOx8g\/HpJND+IHhXVbX7O0OoaHbTNNLMrmWaC61CznaG8tV8q5Mls1g0d\/HbobmIpLMkd08oH6x4cqVXCZjPnVqdSVOdGTk2pV4RnGSW3LaLXR36WP8lP2mtfLqUeEsheAqPE53ltLPKGa0aVCthqkcuqZnleKwNXEJ+1xU0sVha95pp0q0ZTcakpI9L8J\/Em4s9K0+3v9HW4ht2Ro7uw1BA7xRyKyGU3IdfOULtykLAlQWUnO70cXw5VqZ\/TzmliadOMY0VVoSpzcqrjS9lV\/eRnGPLNLZ05XSSb1tH+L+FvpS5BkH0UuMPo15zwtmma4zPJ55PLM+o4vCYfDZdUx+Ow+c4FVsLUw9aviIYPNqU68oRnGPsans4JSjd\/1Ef8ABKf9tP8AYs+HPgrxb4B+OfxCn8L\/ABB8X+JvDuq+BvB3h2fxtrniLxFZS+GXhvBHo\/gODUoYzazaTJOLvUbXSHmTULTTYzdS2ql\/XyXA4ijXzOhHNc4y2nVxsa1H+zqn1fD4ipiKfPU5m6FR1KtNRipSU4xSaXJJpyXXRzvL+PPDjwnzmssJHO+HOBqnAWZYGri6U8VPLPDydDD5fndPBzrOrSw+YYbNK8I0ZRqV51ctxlXDwWGptr9wf2bfiZ8Ff2g\/if8AFjQdBmurfwt4dbwrafD2x1q\/+I\/hzxp4jcaRf3HjzUNS0nxTfabMiaRrappFtYafpOLa20+XU7jU7w6k1npH1kcoxqvzcS8STva18z5Eu6tDDpu6\/vJp6Jrc8aOFwcVph6E76vmpp8vZK+1vS2i8z698UfC3wR4f0ebUdNtLyDUoZrb7BJc+ItXaIXTTxhNyXeotDKdm8pDIrpK4VWjYHFetkmU1I5thKlXPM+rQo1I4iVKvmVerRqqm7+yqQk7ThNpKUXvFs4cwp4Wjhas44ajz3jCEoUk5KTejTWtlfWx8heGpdQvPip4uVrq2utPiEWrnybqNri1uTbz2FlDe2mRLCt3dLLHbzMoE0dtchSwgZh+n6wk+Wopt2UrJLa13bZW1Vl32Pn69SNSjTajJTatdxlG2l3Ztd\/1tojzX9r2Waf4HeOPDMFxHbz+O7\/wp8NLBslpGj8VeItF8OKrshyyNNd310EUt+7nJYgswrgx9Lmw1SlfXGVcPg1Fq8WsViaOHcWuiftrO32ea\/Q+q8Oklxlkldx5ll88XmtTXlXs8qwOKx03zfZt7FO+ivbtc+Rvhf+zPc6F+1Rp37S3xPa\/tvA3w3+Dsth4Q8Tz3tnb6brHiDxFqHiaHxVCdOlmbVLiKfQtY0SfRL5IxFcXmlX8As5RNpt\/WucYWWL4up5xUjy4bK8rlhsLUhUpyp1cXiqnt8Q7Qb5oxoqhCFVXi5+1ine1\/u8242wWA8K8TwXllShUzLiPiynnOe0uSVSrhcLl2CWGyvDqrKKjCtLF1MfiMTCHO6cK+EhUlGVVQX0LfePD8Y\/iP4PsI1Ok6DZNHci18tGWCfWpVsNCtpYZWaOa4TQJ7m9nhcyMy61EFjkkjWNvNxeLdSa5tdFrHTfrd+TvtfXVbH5BQXs+acotSlePK7OUZJ2alqknfe2\/329DvPhn8Q7q7urmDw9f3ENxcTzw3GVPnxSytJHNkqhPmowfJRSd3Kr0HKq1OKUea\/KkrrZ20ucbhVu9Jbvr5+p+LP\/BWfx3rX7S\/wq8Ja7rvgjxJ4a8S\/D\/Vr2DTNZ1rRNY0eO90bXI4Li+0xJr2ygju7i01TSdH1S1hMoa2t4tVkiA8+bf8Vx7mGTyyKtmeU\/UMyqZY+bF4fB4nDylLAV\/3FecnTnO8acqlOU9U1S9pN25Uz2OAfC5eLPir4dcN47i3EeH+OxGexpZXxLiMrr5hUhmUaUsTl2Cw1H6zgowxeLxeHp4fCVKmJUfrNaleLSd\/58dRurm4vrTULUqs90ITKgjjeP7UzTWd9bSQMJI3j+2W+DC6MDHPGSo3JX8lJxXPpypuTUVJrkU3eC5l\/LFxWmjsf9KuFeKlTwcvrixePwtHC4XG4l0qdF4jF4emsNi6ksNCdSFH21SEK0aMZzhCjXpqDcHTb8B+NXh6Hxpplrd+FNJurrWvDV3eS3ljYXF\/OZYbp0TWG0aGGKeC6SG4tLa5mjjubuR5oNQDst6ux\/teCM3jk2ZVKGNxEMPg8fTjT56sU1SxEE1Qc5P3oc6bjJrdKLd22fxx9OHwfn4ueGeFzzgzJ8VmvF3AmOr4iWX5fS9vLEZNmEcPRz36ng7NYt4d4ejjIRw1eE6S+uzhTq1af1efKfD9xd+HEu5Tb3LwyTxIlz9pJAjUNsY29xEXIkLD94m9eAWyDX1XEmeY3L80wlDC1YLDYiNCpJOjCrGUZ15QnKM3duLppJ20S95Pc\/gz6MX0WvC3xa8K\/EXiXjHKczrcXcP55n2U4NUc4zDLqeEdDhzCZhgJ1MDh5QjKpTxlSvKca0Uqqi6M04RsbvwS8beBvBH7X2ieMfGWt3XguwudFGo6df6HI6zaX4jt\/Bmt6f4M1KCa9voJ7QWvjW00q4lvYb6G506BZLy0kSWCF1+0U413h6GJjXhg5TqTliaMuWeHl7jhNSSfs1qlzS2jJdWfzr4RcMRxfAX9q5ZnFTDcVZRnOYZDLJZVKVP+3cHj6c6lTDcjUJVJ1JxiqeHjG1V0opc05Xf9QX7Av7StzHqs0XhnXvE\/xl+KMPibWZvB\/hG1efxj43s9IttBEmu6pa6LpWq6x4i03Q7HVdb8S2+oXWpRtp1heyxWbNcza\/azw\/b5Zi8vyymp4zGKWHjXUIV8TUUoc3s3KMqlWTV1JVE43fvNxSvzG2eUcXLDqUMDONepTi\/ZU6MqVbn9ok4Oly88FSSTaklZN3Wl3+xXhn4vfH34qeJNF8C\/Ev4IfEPRvBWu6jFFquoeLPAuvaZo0QtS15bLLqGp21na2FzcXNvDBZXjzrJBdSxyW6XFx5VvP9PhM7yPMa0cJhMVgMRWqRk40qHK6nLBNzceVtpRUXJ20aXS58hTo5vSqRq1cPXw0IO7q1U1SWjaUr2Vp\/Bbq2tLany5+278TP22PB3jTwN8LP2H\/D\/w+8VeI\/EOo3kGtSfFO8u9GtfBWjaRNYQ6l4z8f6\/bXemX8\/hvSkv7Sy0eZ01HxDq0l6ttpuk6jeQSQ3nq45Ym1OOGlC02lCKmoqKjGzU2\/vXVpPc7KDw8oueIUqbd5Nwp3jJN3SpxWil\/Mkvd1WmxV\/ZC1n9uLU5PF9x\/wUEtvgh4emttRl0z4e\/C\/wCFcl74q1641XT79kT4geI\/Fs+u3+iWOj3toG\/4Rfw3b2b+IGgvhqGvzaJqFpFpNxOAwmJfNLGzi3FtQpxlzu6+GScX7jelr7PVXswr16VOKeXOcJTTU6ri4vkfxU0t25Rur2cdWm9LEf7Xv7RXwu+DPhG88a\/FLxXH4N8AeHmN\/c3HiPVJRN4u1SFJvJsvD2mPJJd3VgHjazsVso7i41\/V7lP7NSa30l5Z88wqU4JuLdOlBWftG1KpPRtLmtdK9k+\/uvy5sP7SpUXIva1535IRfvU7W55yve3N8bcu91sfiV+w7\/wUS+PX7d37Vfj\/AMA\/BLwdrsXgfwd4du\/iTpOmaBpV\/rHxA1+20zxV4Z0W51bXFs5o9N0fSd2r2QtbC1VxprPZWdxcamLmZ7f5XFZzl2GlCeNrxwuF5lFValOvOUpv7CjRpVXZ2Vm0r+dj08Vl2MhhlKjSqV60px5qVKpGMacX1b1c2r2faz7q\/wDSevxo\/baRVWP9nr4npGqhUUeHJ1CooAVQrSFlCqAAGJYYwSTWi444TSS+v4XRLfB4q\/z\/ANkPH\/szPv8AoAr\/APg2Bo\/8FWfjB8HfiR+yrLofhXxfofia\/j8e+G72ez02UzTQ6fHZa3a3k8m6MbIil2IdxOHaRVAPUfneR51wxxVUx2XZRVpV5yyzHrE040XTk6FSnCmm24xbXtXCyT3u9Rca8S1spwWV5vkOaRpZ7lGeZbm+TYnDzhVq4TMstqSxODxUY1FOnzUMVGhO04OLtaalG6P4oPjILPwH4k8QWUYWO2sfNvrFbVrqcxXRvpFmSMyvPNHFMqafcRs8myMxsV4mr8qzvhmFWjhv7KpJVcK\/Y4rCUmnVjRl7\/tqkXJyU4Ti07vnaqu+kEf2b9Bf6aXG1bNeKMB9IriPMquE46rzzrgfjXiXBPJsnqcQ5Xh8LhMx4ewGM+rYLKI4fE4GWExWHWFVOhSqYecJzU8VSdb4f0\/4lX2haml3byBJYZM7TI0XygeWkaKu1YYYYQI4oUG1R\/eVYVi4KmQqvTjKpC\/uct+VO7UVez0s018Ss+71sf6R4HxJxOV42FbD1P3dObnCCqqC5ZQlGDipcsfZqnKShFJ8qk3ZN3PUIPHPw08a20j+JdEGmao8hmuNe0O7l0S7LkjzbjUHtSdOvWcEB7nUrC6unZBEkwkaNXwoVOIMmcFh60cZh429ng8bSWKjZNtRpyqXqU47NKFWnazae54fGnhr4G+N2BzCpxJlGO4SzrGQlPG8U8FZrW4cxkqqo8ixWYUMNCrk2Z1OWTWIr4\/L6uMqRS5q1S\/K+W1r4afB\/4ga9oesaT4o1rSjocir9o1TTI5pNUjtdsoGnXVlf6bdwIbrzC7PFdq7SII4bco8kvu4XjXP8HVlCvgaUvrNNUYwwspwdOrVfJGfJUnUjz07pxTbUkl1ul+M4D6EPghl3DmYYHg\/j7PsNSw2Z4nPcPnHFWWZbjpuFLAUqM6NCrlryZxwUvqzxDnWwtacZ8lalLCVKM\/bf0h\/sjftO\/s2\/8E+\/Cvin4s\/s7fBjwJB8UPHvhaJPHPxI8darr17dt4e02VdTXwt4XSO3tLfwh4ZhukjvNRtEtdTN9qcME9xNb6TpegaLo36rldTFUMvp08VVq5hW\/iVK2J5FUlPkjFQUYpRXKoxjZK111uz+Icx4cy7F4yCdeFLD4OlVwlB4LDfV3XoQxOIqLFYx1q1adXFVnWbnOUuaNNU6TbVJJewP\/wAFiPip8Q\/+Ed+IGs+Ib6\/8OQzjUfD2gW+oWPhLT9fsYLyVxr8yeHhpb3GkMJZtLtNRtJZbmWL\/AESzu9bb7Zf2nq4PH1qdeNZ0nTUZJOEbU3Nc15RfLq03bV9vW\/j5nkuUwozo4ak5e0TtWk1VdKTjyQlefM4pSu58tk1JrZH1z4k\/4KH+F\/G1rpmq6DpGgWWjX+m2vje10uwkFvrWr26W53T6\/qbCW6bT7GfUTHqd1dRyi1bekISUeWf0ihj6blSkpU4zqQVRU51YOfsm0nNQu3FKVoN2Vm0pJXPwfEutQr1qHJK1KvOg5xi5x5ot8vJG8n70U3a1mlvc\/FD9pL\/g4Xk+EUfibwv8NvGa\/FXxzvurOO38J6N4etvh9oFxHI8P2d\/FuoWurz3cFk6Bl\/4RyHUri7ClLnWrS5la5XnxOcRoyl7GSq1r7xbUYvW0m1ZPlettXffY68Jk2KxEYynKWGpJaxmn7SXdJO9r66vr8z+V39pT9rn48ftc+Pbr4g\/HPx7q3i7VZZZDp+nSXVzH4f8AD9vIQBa6JpLTzQ2q7Fjjlu5TcaldpFEL2+uTFGV+exGKxGKlzV6jm7tpa2Sey87LS77H1OGweHwkVGjFppe9OTvOTercnu1fZdFp6fs7\/wAGzv7QXgP4B\/8ABSvw5qPj7WZtG0fxx8JPil4GiuIknljl1CXTbPxZZW1zFBkyxzyeE2it4ykga\/az2L5mxl+dz\/NsPkeV4jNcXTnUw+D9nOoqSvUip1adFTitFaDqKU39mmpS2TNK+Io4WlKtiKns6MLOc2m1FdG0tbXP9Fr\/AIbm\/ZxPTxfe\/wDgj1X\/AORa\/PP+Iu8L\/wDPrF\/+Caf\/AM0HB\/b+Tr\/mOgv+5ev\/APKT+Vzx54mGp\/DfxrbCZphDbWMpJyUBTUI4yoyOGAfkdBnODkV8Z9H2DhxLmmiSqZNKa1STjDFYeT5rXtezWvrsfz5nj\/2WPM3y+0XM7Sk+S3v2UYzk3y81uWMpX2T2PjD4k\/sfftBfFLwzqHifwx8GPiLr+neJvCelX3hnUPD3hXWILPVZbxtO1GXWG8Savb6boUkUcUJjb7Fql1EzWzA5MWw\/p2RcBcU1ONeIq+AyevVy7FYjESo4ubpUqFSVWrRqQVGdWpFSUFUkkklq5KOzP7Z+kFxfwrx\/9C36KuS5Pjsol4gcBZvLLMy4ahi6DzLLsgw2WZ7kWOzPGUI3dGOY1svyXFYalKU6844uFWtSjCKqS+E\/HH\/BLX9r640w6hH8PdS8K6kLRLlptQ8R+D\/s6PCwSSO4to9bu9kpdJV+y+XJPIVcGORlAr6LLvBjj6GZyjjMmwM8qniK2tfNMPCcaFScmpvkqKSmoqF0nzJt632\/oHiz6TPhnifCPJY8P8V59gfFTCcJZDCtQoZJXeEnxBg8JgVj8NiMTisLVwqwtStHExniadOpdcnK+WV38seNv2J\/2o\/hxoFx4g8X2\/h3UbK1vdOtRDZXF5eXUUuo3sGm28sljZ2yWpi+03UK3Fwi7LaFpbq62WkM88ft5l4N5rhIQqYbD4SKlONOtCljFUqKMpJQcJyg6lpOTUlz\/ZTb1sflnAv0p80xNDFw4+xLq4mnGFTLKuHy+lXjVcYVPaQxOHpYjDU4SbdOVOpTw\/vv2lknA+HNX8WfELStTMb6\/pFhLEJUWOxgfUJdPktbqa3MNxlkto7oG3V3gQXEcMEsStsuBNDB8\/HgrLMHXi61ByrYXENPnnfmrUWve\/vwUm0m3ZSj1auPH\/SK8Qc7weYYN4nC4PCZhhMTgE6GEnCcMFilUpN0nKtNQqVMJU5GrOKc5y1lGLX198Gf2tPF8SWvw\/8AHnh\/TNVtb2xTRbXXpNIl1CDel5Zyh9b0K9uUtY7CLThey3ko+2acQEXUNEn06S5ZPRr5e4U5TpKXLzNy+JJK7dk7tJau90+l7bn53lvE1RzqYeo6c61Wm4062t4Tle8pQUuXk5XJ3te0bqzR90fBLwv4k\/ab8c33h3wvqd\/D4f0GGwu\/GHj3ULzzrx7K6kuns9K0zTUkIll+1tqEFo19c22nJ9lvri00W1tvmk+C4y4xwHBGXLE1qbxWYYqM4ZdgVJydWrCN5VKijrChSvT553TbnGEbNNnh8W8U08iwsrzji8TXco4enGpLlrqMVLmqSXvwpKSScLuTStGUW1b8eP2ufjz4w8TfEv4hfDfw\/wCNPFMXwb8GeLvEHhfwb4QGu3h0aTSdE1SfTxql9bQvDBqd7rl3a3GvSz3yTm1udTmgsRa2ax28f3eQV8wrZJlNbMqvtMbWwVLEV3GKhGFTF3xM6VNRty0oKpCEYu+lNPyPm8DBOlDF16cfruJhCriJJKym1eKhdc0VGMnHe\/36fFTzkuQcZGMD0GB04PPv7nGK9Y9T9SRJsEDnOOevpxn\/APXjNAH03+yT40bwH+0h8EPFf2mGzt9K+JnhCW7u7qSeK3g06bWrS2v5Ll7eOSdbZbKac3PlRu7QhwEcnafE4mwf9ocOZ9gWqklisnzCHJSlFVZSjhak4qmpJx5rx0b26atHnZrS9vl2NpJOTnhqqSTSbsk3q+1tV19Uf3MLq86Kqf8AEz+QBOr\/AMIx\/Sv8\/PrMY6ONa60e260e7ufiN33a+bPNPiKqp8OfGJQBT9ji+6Av\/L9YHtjvz9a\/of6Nzb4ozRttv+x62rd\/+X9A8bOv92h\/18X5H9MfjC1tbH4Y+FNOsraCz0+y8AeGrOzsbWGO3s7S0g0Swt4LW2tYVSCC3hgAhigiRIo4gI0UIAtf6AcGpezoOyv9cp6216dT7XFaRwSWypUkl0S9lDRLZfI\/Fj9rS4uLfWXit55oIpLe1lkihleKOSQxKxkdEZVZyxLF2BbJJzkmv1qt8D9UY4r+DT\/6+1PyifmJ44mmZYYWmlaKUjzYjI5jkxcjHmITtfHbcDivlsS37dq7teOh2NL+zlOy5v3XvWXNv33\/ABP5TPjoqwfGL4nwwqsMUXxB8cJHFEBHHGi+LNZVUREAVFVVChVAAAAAwBX8\/Z9\/yMa3\/X3E\/wDp+R+nZd\/ulH\/r1S\/9IR7xptxcR\/s1+G5I55o5Ljx5aG4dJXV5z\/wkc4zMysDKcQwjLluIox0RcZVW1lEmnZ2m7re95a376LXfRHzlaUqfFXuScOXAxceRuPK0nZxtazV3qrPV9z+pP9lnwz4c8NfB\/wAKQ+HPD+iaBDfvrN9fxaJpVhpUd7etfz2rXl3HYW8C3N01tbW9u1xMHlMFvDEX8uKNV\/z74+xOJxXE98ViK+JccNGMXiKtSs4xXJaMXUlK0dForLQ+K4gr16+bVXWrVazjQiourUnU5V7W9lzydlfWy0P4XPGju3ivxMzOzM3iDV2ZmYlmY39wSzEkkkkkkk5J5Nf3NgdMDgUtvqeF\/wDTFM\/WqH8Cj\/16p\/8ApETkT9\/8R\/Suo1JaAOs8MSyw6lp80MskU0V7BJFLG7JJG6PEyPG6kMjowDKykFWAIIIzQ\/hn\/wBe6n\/puRFT+HU\/wS\/9JZ\/ftpf\/ACDdO\/68bT\/0njr\/ADvxsILG4y0I\/wC9Yj7K\/wCfs\/I\/B6rftaur\/iT6v+Zn\/9k=","a_rank":"7","a_hot_flg":"0","a_views":"489","a_active_users":"487"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F1000%2F834134a57771ba5eb5a930a03e5a5d91","a_title":"\u30c9\u8ecd\u76e3\u7763 78\u7403\u3067\u6717\u5e0c\u964d\u677f\u3055\u305b\u305f\u7406\u7531","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:04:36","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AKmq6qSJgcIYXESHLEyRtDvVxhQMAh42VS7ZHzbdy4\/gc\/6nMNl8lOKcHyTXNLZWt36J7aaro9dDzDUtTeSYDeHy8hJO4gl451DkDOWAYNyCu5RnGd1B7kcNGKdtLqyaja1r6u2jtqSalq8yeUqtnKlRgEYVduSFXACliSGJwcggE5NARwMZ3dk037ztFuT3T1at30vuVItUkmIywyCSec8HGRnHcDHQdfQGgp4JwXurkj1sk9e9rvfRbfM8t+L\/AMePAnwV0Wz1bxfeTyXOqNcQ6Lo2lxpc6lqUlskZupIo3lghhtLczW4u7q4lVIvPiSNJppUgf9C8O\/DHifxNzOtgOH6VGlQwShPMczxntFgcFGqpeyhN0oyqVcRW5ZOlQpLmkoTlJwguY\/AfHv6Q3h79HnIsHm3GeIxeJzDNp16WRcPZVTp1s0zerh1T9vKHt6lHD4bB4b21H6ziq9WEYOrShTjVq1Iwfx3oH7anxM+MXxD8M\/DP4JfDLwsfEvjLV4NA8ORfELxlpWjWt7qd0HW0SfW9a1vwf4a0Y3MiiK0i1HVVSe7eCxtZLi7ure3n\/qrLvomZBlmAq47iriLNsc6FP2tanleGp4OhTjH4rKUMdiayTXxRdKybbStdf5j8YftPePc2xMsNwBwFw3w7hZynCjiOIsXjOIcdN3bhJrCzyPB0ZcqsouniI81veaaT+4NB\/wCDgv8AbL\/Zn8XxfAr41\/DH4MeMND+E6Wfw5v7HwbqGoWF5DB4Mgj8PPaaN450HxD4n8M389qunfYbjUk0bW7R7uCYxoGVgv6PS8HMlnl2Elk+MxtKlHC0Vh1i6caklSjCMaXtYfuqi5qajK8mnKEozt7x\/nrn\/AB3nGecRZzn+cfV5Zlnma5hm2YfVoTp0HjcwxVTF4v2MOeap0\/bVqihFufIrRvJLX9+f2LP+CnvwG\/bk0\/UY\/hvr2veFviHoOnx6trvw28YPbQ63DYGSOGXVtCvbK4uLDxHottdTxW091B9lv7SSa3Op6Tp8V3ZvP+ccQ8HZnw61LGUKdTCSqezpYuik6UpW0TXNKVOTWym9XonfQ3wGaU8c7Up1FUSblCUlK97aw0XMls7K8bapKVj9MfC3xPkiuk03VJ\/NXcI\/PBGUIJUgDOSwxxuKgkY3DqPkZ4eL1ikttLvVJa6JPfyt+J68E9OdNLmSbaa00\/4J7AdYS5USRbMFVK4H8GwKnOdpAAznGSRksWJzmqC1um09rX8\/L9WdMqSktWrR\/hu7Vu\/M9nsu4C9lZDhuMkcL0wRwe2M8jJ65Bwear2Ee0vxMLzhJNOySs09m7ys+zWujHiWcgHceQD\/D6UvYw7P7zDnfZfj\/AJn8X2sXrZZAzEckbR8oIBUfMWAJ+9yOufmDA1\/Ih\/1aUMPzO6i9Omvdeen9WuebXt5KzNtZVCq+Szrkk5B6FflXaQecADaeW4D2qODhySlJ3tZ25bRacU7X6LXfS78tFqapMiXTIW+4zBmyWUtuOVyp38OCDnHIyOOoKlhHOKahFR2i1ouuis9bbX1t3ehDbzmRiMoo7Fk3n6ENJHnPHzAgckBAeAfiFbBqnZpOStFPW2vW3np3fofkD+2N4lXxp8Zb+2DH+zvBWnW\/he1QsfLe6tbi7vNWmMeSqz\/2leT2TFQC0NjbM+CNo\/1T+jBwdDhvwuy3HV1zYziitUz+reKjKFCsoUMBSbs3y\/VKFOuo3aUsRU5NJSb\/AObD9oL4kT48+kPn+VYeTeU+HuGo8GYL33JVcXgqlXF5xiOW7jCUs0xeJwlopOVHBUHK8k2ebfAePRLb4z\/CWbWNWvtA0q2+Ivg65vdc0vSbbWtR0uK316wnF3Y6Vd6v4etr+5ieNfKgudd0mAuQ0t9bRbnX98zaL\/srMVTpwqTeDxEY05PkUuelNO8lCbikm3dRbvt3P4jw7Sr0btxSqRk5Rvdcsk9LNPX1R\/RZ\/wAFfPh7+xn8UP2ffi9e\/D\/7VffGP9lgadrXw5udE8RfBeLTtU0H9pn4txfGf4k22uTeGfjB4s13xvafC7VdW+KumXUcPhjRNQ8PeLPF1tDYW\/ifw47+JrT8O4Vr5rhsywsMQ1DCZmlSxEasMQmngcP9Uw8YqVBeylVjCg4e84VIU5uUoSklL63Hxw1ehVUeWVWlqpqSdnKTlJcqbvy2fZp2b0Vj+dX\/AIJ+fFTxD8J\/2u\/gL4m0G+ubNx8SvC2g6mIZzCLnw94s1W28MeIrNzkIyXeiavqEOJQIwzBycLivqOLsuw2M4ezajOF5LBVq0ElzSVSjGVWnJLV3U4JJp2WqXVPxMrxE8NmGDqRent4Rkr2ThN8sk+lmnbU\/vj8P+ML0XRkmu2Zo5FZSzlsjcCSck85POc9+nIr+TJYe\/wAEbPXe+vlroj9el7OSTk003o721230+fQ\/QTwTq51HRra4aRWCC3jY5GSZ4ppEKk54UQtnkYLKOckrDoO0U0ovW7vzcy01S6Wv+K1BqPs2k0o20erVvzPSYNipgNzgjJ\/iB5wCM9CM\/h9BUKi7SlJ8sYStdrfpdaq61\/rpwzUpWTndR0jotum2\/q7lwRnA57D+I\/04\/Lir+rz7\/gyPZ+f4f8E\/iT1vVEG4AspHnEAHIVSCoBAJ52EhiMgEkkdTX8Xn\/WtgcC6mqso3W8dZddttr2vb7jhGlWSRMZLq6\/OuTtZnUjdgg5VvnLKAQMqoycqHvRw0owqJRbvGWj2k+VpcvTTS9npZdTX1G7he8nVJJ95nkV5XI8sEsdioo2uoVePmy7Z3A+oZYXB1fZRc0rW0XJ0sk9k7u+r87fJbK5bcCVc4b70krEFQcMdqBmO3+IBwScYHHA7rp0utte39Muvho8rta9vh5eVt67N2Wu2p+HXxYvZLn4m+PPNVnvJPFniOeWOPMjK0ut35clV3MFEmVBxgZx3AH+1Xh\/LC4XgPgujTqxdOnwrkChZpuUf7KwrjLlWq5lZ2a0vyuzVj\/kG8c6mJxPjP4sV8ZCaxNTxF4zlXVTeNX\/WHMeeN2vsu6Ud4pcv2Tgfs+qXOUjtorWIqN091KEK5wu5YYllbJyWQCTkfKQCQK+kq41xpyqWhCnFPnqVJxjGMejfNZKyTveSXnY\/JlTcpcsOac20lCMW5NvZJK7b9F+ZuQ\/Bvxb4qU3OnaN4x1dlgIe40Hwzqt\/ZmInnLQ2dxCcEdRKvocHNfnuc+IXB2W1OTHcUZHRqK6dGGMp16kZJ2acMN7WUZb3uu++h9Vl3BfF+ZQjLAcOZ1Wpyjfn+pVqVN8vVTqxpqXRK13t6vD0nw8fg\/488LeI\/Eep614Xj0HxBpOpXMuu+HNY02e1TT7+2umuIZILeZ5HgMQkCJDwEyZVzgeB\/r5wlmtKvQwme5fi3WoVaKjCU4pupTnGMZOtThFXbtq1vrZXssbwhxPlUozzDJsbhvZVKdSTlBfDGpG70k27K97X1Vt3Y\/t7\/Z+\/aN+CX7Rmm3GvfBj4meGPHlhbeUb+DSbxo9Y0c3BP2Zda0C+Sz13RjOEk+znUtOtFuTFMLdpTFJt\/AquAr4arGNeHLGbnySjKFWlNK\/wVaUpU5W0+GT\/A+2p4ujXpqEJWcbcyakpxbX2oNJp69Ve+l73P0o+HvjnUdLtIdPK3DxnyjvSMyIyoAFDHB5UsSpBJIJXABpSw0G1JJc0drK29r9bdAhi2oyjyuWyi27x0b6Po\/x+R9a+Fdck1mOHdEylolYu0flhWwQ64HBwQSpbDMuCVBIA5pUkm1s7u+2rvv6vX+t8JVZSu07X10fz0tZJeS\/I9AGAMbgMcY2jt\/wMfyFLkXd\/h\/kTzz\/AJpf+BP\/ADP4QL\/Vd4LFsbsqGxk574XGQPUEA9SQK\/iCMFfTrpr5\/I\/7FsPlyTtGNrb8rvpdadLevT5mHFfEOGSRHZm442g5YDDKrAlDxkEnggAA81bhy2ul5W6fhoegsKmnH2aikne7adrNvXV6fmackymVyRs3NnEUaKEBbJ2pGCIwc5CleAenzVm4pSXne60tt0ViIQjGChG7jZJX1eyS+f43O78F2dnqOvaFYX8hSyvtTs7G4kR3SRIbmZYPMTYyncu\/JAHKBtmGCmmoxTjdKSc1dS2a\/ldrOz2smvkfG+IM8xw3BvFGLySpLD5thcizHEYGvTp061SjiKWGqTjWpwqwqRlVgk5U3ytxqKMktLHY+Mf+Cev7PHiPXPEl9pL+NIvFGoxReItVP9vQSWd9qmsyf2hdzNEbBpxMFu4twguxbKroI7e2ClU\/ovIfpB8e5LkGV5NQrYGnhsDhqWAo15YGlUxccNhF7HDxjUqNwSpU4KKbouTtdyex\/wA8XHngrwzxPxfxFxNmcsXi8yzvNsZmuPaxP1ehiswzCtPFY3EujQpwVOeIxVWrVnCnKFPmqScIxjZKx8I\/2Ofhx4Ge31bT\/hX8RL24BvtSn8W6\/wCD\/CGp+EIBpMO660az1\/xxe6jrsNxNO4tNIlsNHjs9TuRI9rq5W3nktufMuOOJuLMNVxGbcQSxMOWbVDE5jiVGOttMLQUaEW9OWLily2ae6XzeWcB5Tw\/j6FLKMnnRcpKEsRSwGBkoNK8qk8Vir4iaSTcray195t6fYXxP0Cx8CfC\/QPFml6DpkU3iDX7HQ\/7ONnb6dqFlaa3c2kVrcS77e2t7edpZYEEMksUNkl6s08sUcU5r8wwWJWMx7oSa91vkjKTcXJR51FNXtFXVnq3sfrePwlbB5UsRTjzSXJFzUOXljOS5ZtWSS1aWiUb3ldXPzw8Z\/CJ9V+JXw41Hxl4R8V2s2reJx\/aOg+KJPh94h0K2lbUP7NitLZtE0Wwj33NmF1axKjxBafZXjg1O7TURJZJ+o8PYqnQrezhiMJOpN0aVOOFhiKdVTnU5byVeVSPwt2cZW1jaK6\/h\/F2Bx9ajKpj6WNTUa1arTxVTDV8O4UYSqc1J0FCSUmlF88LtKS5tUz9nPhl8GfhL4A8Qa14m8B\/C34e+B\/EfiKNo9f17wb4I8MeGNZ1xDOt0Y9Y1HRNKsrzUkN1tuWS8nmVpgJjmVQ4\/boKfL7P2lSUbqfLObkuZR5eZJ6KTTs311P5ulGCvJQim7q6WuuvVvS6\/4c\/Ur4X2CW+gWMklrBOzQw\/NKgLcoGPVSTwQPmwcevBA002nujGorRVkrNJt2V01dW721+fc+hdJvoo0WNbSOEHJ3RRKoHXIGDwOMAjOOcZ6ibLsvuOeUmtVa349f8vzO0jguZI45Ea2KSIroWv7FGKsoZSVe6V1JBGVZVZTwwBBFR7KHb8F\/kRzvsvx\/wAz+Ba5ndjuG3ggHB6ZyABg4BHBwcYxyOw\/hmMbevVn\/aFTopKy0V9NX913fV9r+hmBm8+ErlQZUUSYBZfmGTtDEdc4JUZB5yKbas29Vb8LHVGDcJLR2jJW3TbUrLWys3o9VY2BfF5nyxXMjbSFG5sHksRuwSOQATgYG4nFYRTbs7bb+en4Wv8A5GUcJGELpXk1FuN7JOy0jsrer6edjqtLucFdjkYbcrKxVlYEEOOYzlWAYHGVYA54+Vtcu+3fb\/hmceIw1KpCcKsE6c4OnUhJXjKErqSkneLi07O901dev3T8MfFFt4k1fT2W8Ml7NpGmy6rKkk25NW2NZzr+8RPKEq28bmO3aa2In87zTI0sQ9dwqfUKFaUJxo1ZyjCUoSjGbhrLlm0oz5XJRlyyfK04ys9D\/E7xn4IxnAnH2f5bWwqwuX4nMsfjMitXoVnWyiriZTwcuWlOU6Xs6FSjS5K0KU246Rk1Jn6NeFY9CsvCEV\/dW5uMSR29vp6XFxbrql3NcLFbW0qM+17eeXYGLF4DAcyxyw7g+mF5ve5JNNtxdm7WsrXte1tdfV+n5VCMW4+5DV7yirq6s9d02tGfM37TuseGtY+FviYeItYk0bUtPuIJYNKh0u6ikn1CKQu8eixy2rz6jIkoHkCCVlvgERA8JV097KMrqwxdCtGN1OV+ZuLXK\/4l5O3LeLbV3fTbcef43BzynE0KtRRnGHJFNOMnVTi6UKcdPaPnio6WUXu9m\/nmSKPxJqnwVu7iKJb7UNR0LULqOYRySWlzb3MEV5GrhnaD7PcxySyQb38jLoXkKbj9lwRgo1uIJUoScqdLEU1FNN3fPeMlo+blurNO3u3Tvt+NeKGLWH4XjWnHlr1MHU520udTdJXU5JXT11V3FbW0sfpf4VmjnmXbtfcHxnAUgMFPGOq4PBGeDxg1\/TWGovm1gk7atxd2m7OztvbbtZO6sfxlWrxcLNrmk1dRfzWr3uraK\/36n6Z\/Dm1tk0OwR4yQ6AqQQpAVFAG7BGASQRkHJB+t1sOnJPlUk9Fo5NJW8tHrrunu9jD2lo3TW11e3r\/W57Xb2UIgXywAilinyoH+fAwZNoLAbRhcgA5KqpdmMwwtOfMrRUr6Rtrp2tZq3XR+ZyyxOrSs227y2Ste++9+lnYcbaLJxBHjtx\/9etPqNHz+5f5Gf1mX9Jf5n8t3iL\/gmno\/h7QvGfxSH7Q3ha3+EGheFfhH8SPAeteK\/Cmq6Vq3xF8I\/GTRvEOpeDdJXTLK\/wBQfSfFl7r+gP4VfS5BPbMtydcnvLC2hlsU\/lOr4dYajTxGYyz3DQyqlDLcXhKmJw04vGYXM4Tnhqc4xm5QxE61N4ZwceRuSndR2\/6Q8s+nXnWaY\/IOAf8AiC+d4nxKzHOvEPg7irLOHeIsJi8DwnxD4eYzAYfPsxw+Lr4KEcfkOGyvMVnn111KNWmsPPB06WIc6eIlzn\/BRj9ji\/8AgZ8V\/HvxA8MaP4T8CfCfxB8SLjwz8K\/h5bXeqy+K9U0rw\/4W0K68R+LNH8PCyu\/K8EafrU93ZXes3ur26xapNHbRWv2a80+S54eP+EKuVZhjsfhKOFwWXYjGuhl+XUpTeJqwpUKUq9ahh4wn\/s0Kkmp1ZTjHndrK59H9Cn6UWA8TeBOE+CuI814i4q4\/yXhKec8ecbZhTwFPh3A43MuIs3w+SZDmed1cbhpVeJMZlsMJUw+X4bBV5TwsXOVXnw+LVL8u4zc3UvnLD5UCsUM8hEUDkE\/8tZWVGPAO0MWA6Djnx+EvDjjvjnEew4R4Tz3iCpGXLVlluXYith6D0jbEYvkjhcPZuzdatDXR2Z\/WfiR44+DXhDhKeL8TPEng\/g2Nej7bDUM6zvBYfH4qk4t82DyuNaeZY2DSkubDYSrG8ZJNyTRz3jbx6fCdja2+nrJd6tq9xNp9pOYfPtdMkSxvNTknuFnEZmle10+4g02KFZUuNQktonOxwsv9f+D\/ANDnjunxdkObeKnDeAwXCdHEVZ4zJsZmNLFY3MZxwmIqYfDTo5VipxoJVoRq2r4qEasqXsJQlGo7f5SfS3\/am+Ea8NeKeFfo58YZ7m\/iPmFChhMs4tyrI6uAynh+msbQeNx9OvxLgaNTGVqmFjWwlCWEy6oqM8RDG08VTlRhJ8t+wd4t+J2m+MfE\/jfxNLNN4K8TRnT\/ALdezzXF7e67pWv3dnFqwkZpIrfT2lbULNIcv5rND5f2WyhtFuMPpP8AEnDGdV8r4EyjKsLl9Tg6vjKFKphqdDDYWCrqEZ4KhQoxUI0oxpUpp2io1FJJWk2f5o\/R\/o8Zzr59x3xTm2Pzr\/XBUsVjMZmuLxWPzHFYuFWo\/rtfE4qdSrOrKdaspOU5c8ORaKCt+3E\/xn1O90nQNP8ABy6drusrM8dxpdxqX2GDS4vLVZtWuJktr5oRFbSMloJLZ\/MkuQ0YCHzof47wOXywlWu8wVWlhYO8ZxSc6km0oxp83LGVr3ld6R1tY\/p7FZi60KVLK5Ua2KqzSnCcnH6vDlblOektf5YtO77WPm347+J\/EsvhyeOw8YaVq2r3MG+80mHwj4mgWxd7m3d7Jr6XVJNNnkjmthK+rx6uLVbMyvFHGJFsV\/QcrjlcqUJRdXk5bxvUhCavbeDTfNbT3bp333t52c0\/Z5fVVHHxq4xR96EsLjHy1Hq3zWVNJSXx82i1V9E\/zk+Mv7UXiv4W+C\/Dk+i+MW074oalqaTaNNp0Flenw3HGLS71C9trPVbS5tLy0mihhtJ0u7IpM2sMvkq0e9P27wR4LpZ5xViMXPCzjlGDoTnKbU1KvVs4UYuS0i1UqKd4u6VJppptL+W\/G3i2eA4ZwuAqYqE80xdZc8ISbVKlCdOpUdpRs24RS10alZW3P0e\/4Jw\/t5678ZLubwf8Yl0m18XWP2S40nWNPthpEPinTiwjvXlsPOazh1G2mMcwWwSC3uLO4Z47SIWFzLN\/S3EnASyWhQzLAQrTwtW8Ksal6kqE2uaMuZRTVJxTTnPZ6X2R\/LuW8QPFTnh8ROCrRTnDlioqaTakv8UVZ2S1T1XU\/qp8AXFteaDpNxYypJbyW8csRBUnY+Cq4wDuU8Nu5Bx95Spr81qYeUJz54Wd+qdle7W6V0\/Tpboj6GNX2sIuN7dG7rVbprRdNndLoey2cpCbSxJAAyPU+xByOowOoOQcisfZcqurNpJXUbN9O77sxlPdWs77\/PtYt5zyS2T1+X\/7Gp9l\/d\/H\/gk88u\/4L\/I\/lA+Pnx+\/axvfhFok\/wAbPAngnw\/4V\/aY1Twl4o8DaTpem3nhCT4ceEf2YNZ1HwjZeDtM8Iozw+FPDMd3rNy1lY6imoancCUX1vKxvI45v5kyPIfErxDx2VcMZdkdHF4\/jLG4Opl1CjGeGp5Zg+HazjKOJpuDhgcDRjOVWcqzlNQTqR5nOKl\/0Z4PA\/Q+8E8dxpx5l\/iVxFQw\/wBG\/I+Jct40zrNMZgOJn4gcReOmWUsxnmuHzlV6eI4o4nxEcFQwjjl6weEhXisNWp0qVHFYmlB8fv8AgpZ8aPjL8StL+JHhMWvwo1vwqvjfRvBuveFNTu5fHuk+FPG72C634TvvF6jT4NT0eC806S80E\/2BYajo631zHb3ZO2Wv9ZOB\/on8K5fWy3PeNJviLP8ACwxD9iqtWjlODhi1CVTA06NL2FbH4eFSDlB42XLJ2bw9L+Gv+cvP\/pKZ3guF+J\/DbgVvLeA+I8XkGKzbDY3B4Wvjc6zXhermKyriWcMR9fhkeb1sNjnTxlPJ8UoS5fZzxOJhGMpflF45+K2ifadV1TxH4ivdQ1O6u7q91K+33WtXdzNcXLSXl9e6lI00txP59x5l\/NLdyTb5DNcsMyk\/0lgsu4e4dwlLB5dg8JgMFh21DD4LDUqOHpczalONGhThRitWpyitG1zbn8+Znn2e8QYueKzLMcbmGKlTpUXXxmKrV6\/sqMI0aNJ1sRVlNQpUoQpU6ako06cY04JRSS808beLLYz6FotpoYltNem03V9K1WOVLuPU7SxvrO41SGxETgf2zb6ZJNPpkSXLS3F6bJLUyyOmzfNp2WEw6w8PZYqVHEUa65asKtOlUpzrKiocv+0Qpxl7N811OUHG7i7ebgpRUqlVVJKpThVhOLi4uM3GUYObbk3BTs5pxd43u0tT7D\/Yy1Twd4q8NaP8JJJNNsbS9fUPFHhDXbpY9Oj1uwlvp9Q\/4RqWSfy\/s2t6TqFxIh09tlzKYZY2ijksbuJf8bPpZeDOb8KcUY3xDyiFXMeD+J8XLEwxVKDX9lYytJxxOBx8bylRnGu5wpSbUHyukrTpzhH\/AE1+jb4pZZxFkeD4Ix06WCz3JqapfVqk4L+0MNTlKVHE4eXM\/aRdOVN1Iq8k2p6xab+3PGPgzWvhjcp4l8O+Hp9avr+ew0tPDhlmt5NYuL2QQCOElGSz2eYs8l2UitFCzy3bTIzyR\/yRhMbTx1N4PG1HCjSTmqu8oOKulzSkuZPX3W09Ek7an9LY3LMTgcS8dl1CM6laai6EnNU5uVmuVQTlFq796MbK93fY+fP2kviX8VtA0HVoJ\/hT4esVGkmYPYa8Zru2sSsKrcXYh0G1UC9kRYIC1y8s+2QrGzM1fZ8L5TlObZjgMHg8XmONxeKxNHD4fBwwlGl7fEVpqnTpQSxFVpyqNK6jyxXxaNHzXFWecQZblmLr4vL8twWHp4WrWxGIWJr1ZUaVKm51JTTw9KMeWKk1F1Luz00Z\/Pn4j0nXdc8ZX\/jXx3dNqGo30cKWGlQlvKtEVrh4LC2gDSPBZW6sVBKRmYRSTMt5PuQ\/6jeEnhPmfA+XVln9LDwxeKnQlRy\/CVZVqlOCpL93ipxpxhBwqc0pulKpGTbaqSbsv80vEfjnB8V5pSq5dWr1MPRhUhPE16fso1JymnKdFOUpcjhGKgp8sk2rxXvM+mPhv4fGk2tr4hlvFF\/IgkjntZo4ksVidJIobTypGlilQsqBnjZTKI5EeYR+e39O5bw9SjhXHE0aWIVaChWjU5PZRi73pKLUtIxtF9NL819T8dxOMlKrJwlKHLdRs2nzfzN9\/uXkfsh+yv8A8FK\/jZ8D57HSPE2o3XjzwdC8KCPWZpF1q1swQvyalebYr4BCSst87OyKiR3MIYNX5txf4KZFnEKuJy2H9m4uTlKMKUZTws5NuSTgpRcLtL3qSemvLe1\/Yy3inHYRxhVnKvSVnyuyqJp3dptNu6+FTbiratJu39J37Of7cHwh+PWkWt1pGuW1jqZWIXem3UoiurSdyF8u6t3bzrfLnCSHzLaXlre4lTBP8qcS8FZ1wzXnQx+DqQ9793WipSoVYWT5qVVxjGXW8dJRs1JXtf8ARMtz\/CY+m506ibWkoyfvQkrKSlHeKvpe1m9mz7YTVtPdFdbu2KuqspE6MCrAEEEEggg5BBwetfI+xq\/yS+49321J\/bj95\/Jj\/wAFEf2+bv8Aae+H37OXh+w126aGaT4ufEnx74cjnuY7PRfEniX4y+P9P8F6Bdx4EM194T+HUFjDZTRSXEf9k69EiSGV7iEfv30IMJh8\/wCH864\/r01PE18dicjwzkpKWGhSxFTF4mFJu1pTo4jLac5w+KFKF5Si1GP6\/wDT98Lsd4B+L2N8IZ4Z0MFl3DvA+Z0McuVf25BcH5PgsXmkHGbboYziPC59iZwqQhVhiZVW1yuLl+Q\/ibxDrlhYabdxoW0SHVI01URwi5aSzeQpMLgtuZYirFkIG1o454J1Yy2\/l\/3liZToKhV5VOjGolWi4354NtcrfTe9uVqSUlpuv8\/4KM5VFJ+843iv7yXu20t23v8AectceHofDOoyOYYtZ8CeIgBJaSbZ\/wCybq4heOKe2XzGMWnyLIsD7NphR4yHTaYzP1SGFqTSpxr5VjHrC8uWjKaUYqCd1GFm1JRaXRFRryrRS5nTxVGzc729pFJ8ykrNX0TVktVbsyKLQJvD0EGjCObxL4G+2jUNBukWO41nwbdOSJrcJKGN1pbq8sYePbNBBJcW08SsQZc\/7OeDpxw8qf1zK3UVbCTTjLEZfJSanBRerpvRqz0s1bVt6PERqzlUUvY4iNPkqKycMRZWuru\/Oluno7O9r2K7Xev+Db6W88M3l1PqFpfnX30ZzNDFeiC5W7i1vTpjI50nW5\/M+XWbTbZ6nqce7UxaapeXN8\/zWecM5fmmXZnleLweGzTAZjGtHM8nx9CFXBY\/Dzt7Wqqc+ZU8ROF06lNQU6ihPmhXl7R+rlOd47LMZg8wweLrZfj8DONTB4\/DVfZ4jDVKdnTjGaV5U1LSMJLlUfcs4JRPqv8A4bb\/AGk49XsJb34h2t1ZW32aXTkufhhoGrXzWc9v5hiv5rfSonsrtP8Aj3luLiS3tbhZY5pZUVLlIf5hrfQl8AK3tPa8P5xh44hqrSq4LOM7qT5KrVTk5frlSlTnD4E5w9na0nJ3Z\/RFD6WnjLh3SUc8yyv7GPI4YzJ8q0dNJa1I4SNWcpWvKXPzXTu23d+FfE\/4jfF343arf\/2x4y8SzaZqFw9xfvrV3b2yW7W8KxLFpvhvRDb6DBbARAx3H2uHUVH73yJC4Vf17hLwN4C4Jp0cPwTwdlGQezhKjPOa+Gw2Nz+cPe5rY2tDEYp1JSd3OWNg4x9yMYqMYr8s4p8WeNeMqtarxVxPmWbxqS9ossjiamGyek7PlSwlB08PZJtRSoWum370pSl5Knw80TSSBBYya\/eosqqbpZvICqY2aS\/uBFDH5GRG76fZraxSsvn3CXMhLL+j4bhvCYBKUIVMTXs+aviHKc6ju\/4lRpwsrP8AdxtHrZt3PgKuZVsRKKlKFOCd1SpxaUVpdq93K6XxTk3olZaWNKsddu53ukvY9Ns7clGv7ZWjiUIxSS30pGPlmJgxSSXEkO4AHzieN6eDxNSUmpqjRi178IpW6ctOHup3V05XslrdvQiWIglp7zelvVaN21s\/J3a23udzp95dSoMRq1m03kR3s8qQ3V8VDStcX05jRkto9jFDArTyN5cR2L5rneNCU17NK9Nysqjf7xtXvKctVZ6cuslq1fYxVeak7y1bSSkvu5bWfTr0W9zqvC\/xT8R\/DnxLpfiPwhr13pGoafeK8NxZzTxLfC3kR7m0kQuEeykjZEu4UDi5RvnxEHkl+M4syTBZll1fCYnD0q9Grz03GdOM5c8l8cXJNqUH78XGzTV9NUd2BxNWliFWpycJws7xurrmTaavaSeqab1TZ+0Whf8ABS3SJtD0aa98R3VpeS6Vp0l3ahZmFtcvaQtPbhg+G8mUvHuHB25FfydifDbO4YjEQoQhKjCtVjRlJR5pUozkqcpfvFq4JN6LV7I\/R6XEGCdKm5wmpunBzSq2Sk4rmSXI7JO6Su9OrPwh8X+I57KbwkrMFtrm3u4FuHKtFFcNqN7LkgjlvKhlcs5XCKM4YoK936COIo0vArAw5LOpxTxBCpJac1ZVqTipecqatHr7nL0SP9G\/20dGuvpsZ65ylUovw84FeHjduNOi8vrRlGN7Wi60akrr3U6iTd9DudCvbfVNOkiYxzWtxJJFJHMwEJCTy2crAswDlWs0lQXG0hJFw6xjav8Ad9BUq1G9ozhJygk9dI2T31V3qnvZp9j\/AB+qTlCbjKMouLulbVLpZ31T\/rsXo1GjwGyvFa605yYpNzGRYoSQYw0aCTbGPlY+XlAg3htqswUU6MXCceek5cv2mopu3N08nva9l2C3tGpU3aoktbpNtd2nva6u9+4JBFbyAx72tZAmPLdXdCyZTyUMCgrIEjSQpuWQNtZDlTShBwb5X7j6XdmtbO1rdvuFJtt8zvJOz07b+d762Pcvgb8K\/hn8XPH1t4R+MHxT0X4M+Gn8MeM7vR\/iJremaxLp9j4ttPCupT+D9O1F\/D1pfa1pOkan4kTT7XW7myttzaY13aWqPeXNqy\/I8dZhnmU5E8w4d4ercTZnTx+XU3luGqwpYpYCri6ccxr4eUqtFOrTwntVSg6ij7aVOc4zpQnTn6uTUMHiMZ7LHY6GX0ZUazjiKkean7aMG6UJ+7O0XO3M7XSV072LnjP4O\/s0eBJZ7TRfjTq3xg8RWySKbjwV8NNW0PwVcEbUkEHjj4peIdP8UQv5iq3nD4T3EUkYUiVWK58rJ8Rxvmko1qvCOXcMYeTUlUzzPXm2ZckkmnLLcoo1MMp6p8lXOqUkk1JRdkunGxyfDqcHmVXH10rP6phHRoSklZr21eopLXe2Ha2a138X03Q7me8g03QNM1DV9S1G8Wz0vS7SGS+u9SubuYR2lrawxfvby5d5Yo8WtsFkll2QwxiTY\/6JWlSweEqYnE1aNGlh6XtMTiKklQw9OMIp1Ks51ZuNGlFKUvfqNRjo5Pd+BC9WpGnShOU5y5YQiuebbfuxSik5Sei0irvZdDP8SeG9b03VNQ0TxhaajpmsaLqF3o+peE7rTbvRNR0nUNOu5bS\/0zWrGeOK\/jvtOu4pba9sbpLXybmJ4rqDzkOOOlUw+YYfD42jXo4zBYqlTxOFq4aUZUK+HrQjUpVo1ablGtTqQalGcZOEoyTV1a201KjOdOVOVOrCTpzp1IuM4STtKE4StKM00042UlrezuijLpqXUaHUIUhgtyq2mnoocvg7VRnVSFDkbkVQ0QjBUFArg6SoqVtkrpKKS1SSSVnoo2ell87aGcZKN2+u\/S3mtV91rfrn+JYYtP0k26s\/2q\/mgtLNIlljijnRo7v5ihE0dlahI7W+kgQOq3kTIXcgNlmFOFGhChG7q4mSjTST5fc9+Tdn8EdFN6JXS6mtKbqTeyp0ldyVtHJxUU23a7d7K+uttklwZsIGaW5I8yOySWyt9+1BPdtujvJtoK26OjvNFsgWEoZbm18rZDGzfL4vDxqxlJyc6eHhOEE21KdVr97UutJOOsNlb305e7ynZSqShaWzk23HqoapKz1XvbvW6Su7pHHPG4dgJYgAzAApbkgAkAEsNxx0yeT35r4eeFXPPT7Utpq272u7\/fqeuq8Wk7PVJ7x66\/zHU+INOi1zSbewlcwv9jFzaTbxsjuotRvhFIFYKHAmEEjR+YissJ87dCziv5\/+gth6eI8BvZJqL\/1sz6rSkkrwqU6uGnB93Z35ldJptbWP9U\/2zuJnS+mpmU7c8V4c8D0pqT0nCeFxisuid1o0m1Kzvoafwl1GY2Go2N8UjubHVZ7OeNSImVJ4LSWORXdl8y2munkZWEYZlaTds+dV\/t7Ja8qlKvSqLlqYeryyVtFzRT5lLROM2nKPk1uf5F5hBe1pzXw1YXT3ejsk2nbmimlJWWvlZv8AoN\/Y6\/4JV+Efjr8K\/B\/x2+KHxG8VN8NNe8HeLvEHi228Aab4X05fDF7pnjuL4faF4dvPH3inU73RLTVreODVvHvjW3vvDUK6D4Ps9M+xPeXusxy2X83eJ\/0gc34Vz3OeFMnyLL1mWCxmAwWFr5rPHYieLp18vWY4rGU8uwFKjUnhb1KGXYGpDFSnWxnt5VIunTcT7vh7gjD47B4PMcVj6qo4inWqVKeGjSh7JxqulTpyrzc1GfuyqVVKFlBJRu2k\/wAyfG37Kfxn+HWseMbO5+GHxM0LwF4S+IVv4Ah8YePfBWr+CrC1u9fFvfeENP8AEkuvWdjbaBqmv+G9R0XxBBYahcLPDpmow3pZ7Vjcn9g4f8ROF8zy\/KYrPMqxOb5hk082\/svLcbSzCvJYalP+0aeFhQlOpXhhcVRxOHjJJuc6XKrtnzONyHMaOJxHLgcXDC08XHDLE1qE6VPmrTUaMqkpJJOpGUJ\/4Xex+8fhX\/glj4U\/Zu\/Z3+LWvfFPS\/hb8TfjDdfDHx59m8bfEHX9T8EfC34S63rt3b+BfhmPC9z8QIvBng7xBqN14hl8T+NNX8U+JLyaWz0Xwr4btPD3hknxhpWpar\/LGcePWb8Z8X5Dhcjr5\/kfDtDN8s9rlmT4eOMzzOsPQqPGZxPFf2fKtjaUY4VUMJh8FhYxpTlXr1MViE6E4L9EwPBmGyzLcVUxccLjMdLDVmq2Jq+xwmFnNKnh1RVf2dObc3OTrzu04x5IxbSPla0\/4Iz+OrHUPClt4o\/aB+GEWn6rrWm6N4iuPBGj+MvFWraB\/b9p8MYvD6WWj63pfgqPxFqmreKPjP8ADzwzBaR6nZW1mniO01O91K1jtdVtNM\/Sa\/0pMqdHGywPB2cyxNPDV8Rl8MyxeCwdHGTw9bMniPb1KM8XLC06WDyrH4q8lUqVJ4eWGhBynSqz8Kl4a4nmprEZrhIwk4xqujTrVJQUoRa9nzezVSbqThT3irPn5rXR9pfs0f8ABKnQvgl8QfAHxntvFPizx94k8GeIPFXxc+GzJpWj6N4L8T+GfBNj8Rbv4eT6pAl7f6lZa34k8Q+Gfh74tS2OrwRS+HvFV1pel2GvDwx4v17w7+X8a\/SLzbirJc24ZjleV5Zl+bZfh8lzf95isRj6GKzCtl6xzw05OnRlhqOGr43A2nQnONeh7erXpOvgqFX6PJ+AcLleLoY+eMr4ivhcQ8Rh7wjSoyp0lUUPaR99qcpqNX+JZR9ySkryOv139jv9hzwb8VYPC\/jhfhX4v8VeI9M8S\/8ACV\/EDxj8a7SfxF4n03xjpc+sXnx50zwbdeJ207V\/F3hnxLbWw0zwlo\/hWHTvFDePbrRNF8O+JE8Aav42v\/n8N4l+KmMyV1MvxefZXleCrYOjl+XZZkNSjhsJPL5Rw+F4cqZlTwscRRweIwUr4nFV8bOdJ4D6ziMRS+tww9Punw9w3Gu3VpYTEYutCcqlTEY1SrNVnJ1MZ7B1XGVSNV+5GNFXjJwipcspP+ab9pX4K+Jv2c\/jF4p+DHi680rVvEHg+XSM32hTTz6JcWHiDRtO8S6Pfx2+o2tlqNtPc6Jq1lPd6bqdhZano13LPp+o2kF3bSoP7h4N4vwXG3DmV8R5fQxGHo49VoyoYiMY1KOIwteeFxMIzhOrTrUo4ilVjRr0pzp16cY1Iyd9PxvOMtqZRmGIwFWUKk6LTjKHNadOcVODkppShNwlHmg0uWV420PlzxbrKt4kg0GCdw+kaTbebOjCeWG+16Z7q9FtEisDqElrpljFaRBpFiQm4k8wKIJPdzPE0pY+WGTt9UwdKlN6OUauJquvUUN3KpOnSpKKSum3oktfOw8ZLDKrbSvVqSjb+WjenF2a195yf97RpqzZnSottDEsp8qQK8VtaxSL5cMUTbQZCjSxvKUYtcyiYxK+YUkuXB83zMTC1LllDlmo2pUIpu0Xf4nq5N3blJt2u1rZt9NOV3F31veTv8WvNZrZa6W9NDiZNQ0hXdX1C3R1dg6+TOdrAkMuVtipwcjKkjjgkV8LVp4SNSpGWNcZKc1KPsqj5WpNNXVk7PS6ST3R6ihOytThayteWvz9w3bzdJb2XlsxJ06VVEYLOyi91BZYQCwB+0JJ5ShcHe655I3fzl9A1S\/4ga7c3LHi7PoweykorBttdHFylKN07Pl06n+rH7aB05fTOxkoSTc\/DXgeVSN07TjDMoRdk3ZqEIvbRu63ZxngHxNLH4t1bRbnaBqNml3Z5k8pDJZs8cygM3ySzi6+0ZXzIv3DNhFQiT+xcFjmsyr4WWn1uhJxnePKp04yVtfe5rNzTV3zKy1P8lp01UpyqNr9zLRO\/W2unmldbdGf2O\/sAfC7RfH37Onwe8R\/s4fs4\/HzUtJ034m\/Cv4yfEXWviJ8Rfhb4F+HfxV+Lnwht7\/R5tD0rVb2bxF4pu\/hl4Y8WT6tr0KaT8P549Y1+BdGub\/w\/caKyp\/F3ihnOa4fjHPqPFnFPDE8TUyfOuHMupZVk+Y47MslyXOZqrTr1aNOGDwMM3xGAawcnWzTnw2Hl7aMasqkEfrvD1DCTyvCTy\/AY1UliKGLq\/Wa9KFLEYihdNU3KdSfsadS8+WNGMHNKN04NL738c\/Cr4oXvhy+s\/2iNE\/Yo8MeBdR8Y2eqahp3xi+K2o6no+t+DtKVZozr\/hax+Fnw28Gj4q3urvqWs6p8TtH1iGMzavf2UPh37Ktmbb8qyvFZRhMfSq8NY3j7EZisDOlCrkWV0MHiqWZ1eenfB4mOaZtj3lHsfZ0ll1SlKpP2cXKtds+nrOvWoyWOo5VGl7dSviq1ScZ0YpJc8fYUqftoveopqMVok7Jnwv8AHHXv2Vtf8P8AjDwn8b\/+CkfwPm8NeJvif4C+IEngr4H\/AAg8XfEG10fQfhR4afwl8P8A4R6Hd6J8QvGOgr8PtFsx9turWTwzDqWr+IBJq2o6uqyXFs361wvlvHODxmXZhw14Q8SPHYLIszyeOYcR5vQyz61is8xM8Tmee1\/b5Xltd5lX55UKDhi5UcLhVGjTjKXNUn8zmWJymdOpRx3EWB9jUxeHxLoYSjOs4QwdOFOhhYqFevF0IqnGc2qKc5Xc5R5mz7C+FP7TXwH8FfB3xx+1xaftC\/Hz4o\/CvRNe+MviHVbLxRD8GfA3g29+JtxceEtS07wdbeHLLwzYfEBNa8X61rekD4U6NeanqNnotp4e1a5urfStGswurfn+e8D8U4zifKfDytwhw7kuf4vD5BhcPPByzvMcVTypwxcJY+rjFjsTlroYOjTxE86xFGhCpVq1FCPta0rUvXw+b4COBxGcwzLEYnA0ZYlzVT6rQpKtHkfs4U1TjVcpNxWHjKVkua7jH4vxl+JH\/BUfwZrEdv8A8IJ+yf4Q1RbOfWL3StS\/aa+KPxR\/abu7a61x5m17VdN8PeMvEum+EtFuNXllma9tLPSrjTpjI8MlvPAVjP8AVPD\/ANG7GYSipZ14g5lR9rRw9LEYXgzJcn4ThUp4Zx9hSxOPwuGqY3GRp8sXGdZRqc0PaOXO1M\/OMd4h0akuXC5RSkoylKFXMcTiMdL3rptUXKNGDabSUVJJOy0sz5R8Sf8ABRz9rzXY7nRfDXxUb4XaDOjZ0L4H+FfCfwX0+CBcqtqs3w10bw9qkkMUZVSbzV7mYxghrgFfKH6Jl\/gP4Z4SpGvisgnn+Lh7zxnE2Y5hn9ack+bmnDMcTXwzbl7zSw6Tbd01a3z+J43zytDlpYuOEpp8saWAo08Ioxd9E6ajU5bbWmrfgfn9q2p6pr3iPUvEGvanf6pql9PNqOq6jq91d39\/qt7dPJcXd7d3l3LNcXd1cSyPNc3FxJNcSySM0jNIzsPv8Bg8JgvZ4bDYfDYXBYOmqeHw1OFOhh6NKkuWnSp0qcYwhCKsoxjFRWmltDxMRVq1pSq1qtSpVqSbnVqSc6km73cpSu5P1ve2tzyHwbPBrh1\/xcltDPc+Jdf1U2G2X57jT9Kmj0Sye0aVGKWMkGmw301xtRC08bGOWV7O2Pk5JVhmFLMM6SjUnmOY4uWHmlrLCYeo8Fh3FtWjD2WHjUvFJNzd3do6cepYarQwd3GOGw9GNWnzfDVqKVer7quladRx1V1yu3creJI7je9srSF5MPqV2vytCgJIs4ZAwRZXRhsjldvJQiecFsefnj1UiqtOE7zcX7Wt0o03f3IO7vNqyUFqk+d6tEUpJOMn3SjFNR53ZNJ3Wujvro9u9+AaDUAzCLRlWIMfLXNuuEz8g2uN64XAw\/zDo3INfGSTjKShljlBNqEnUhFyinaMmnG6bVm09Vex38zesqkrvezdr9bW0tfa2nY6S7d1s4irspWzlKlWIKn7Td8qQRg+45r+b\/oLN\/8AECaOr04k4gt5f7RH\/JH+qH7Y\/wD5TOzX\/s3nAv8A6h4p\/nr6nlgjjh+KHhsRIkQN7qSkRqqZVbJsKdoGVG5sA8DccDk1\/UNX3c5wNtL1ne2l7wle9tz\/ACvh\/BxHlSdvuZ+5v\/BLD4s\/FTRv2oPAPhLSPiZ8QNK8KhfHtgPDOm+M\/Edj4fFifCPiLXjZjRrXUotOFodclk1o24tvJOrSPqOz7Y7TH898bskyWpwVxDmNTKMrqZh\/aGAn9fngMJLG8\/tcLQ5vrUqTr83sYxo83tL+yjGnfkSS+l4SxWKWMwNFYmuqLw9ZOkq1RU2k6skuTm5bKXvLT4tdz4e8deK\/FPjDXNa8R+LfEuv+KPEOpXss2o674i1nUdb1m\/l+1qfNvdU1O5ur66ky7nfPPI3ztz8xz+wZBl+Ay7LcBh8vwODwNBYWjajg8NRwtJXpRbtToQhBXertHfU+Zx1etWxVeVatVqv2s9atSdR6SdtZNvToYWnEum9zucFQHb5mAPlkjccnkgE88kA9q+poaQdtLt3t19e\/zPCm3KrLmbdkrX135W9+719dTRkAN7YoQChMblMfKXSCQo5XoWUgFWIypAIIIrXC06bxSqOEHOMJxjNxi5qN0+VStdRuk7J2uk9wqzn7CcOaXI3G8eZ8ru9fdvbXrobWrk+aDk5XcqnJyqqSFVfQKANoGAMcV6lTp8\/0OAyrAkwFiSWa6twxJJLDz2GCepGOOe3HSiPwS+f5IcEnUhdL4v0kefeMJ57fSNdkgmlhk\/s28bfFI8b7haSsG3IVbIYBgc5BAI5r4\/NpSjgcwlGTjJYbEtOLaaahKzTVmmj2sKk6lJNJr2kNHr\/y8ivy0OC+Ccaf8K\/8FJsTYPAOh3ITaNouTFIhuAuMCcp8vmgeZt+XdjivO4ISXDGTJJJLLsHJJJJKUqEJSaS2cpat7t6vU0ztv+18br\/zE1F8vaSVvuSXojdID2lgzgO0ru0jMNzSNJJc72cnJdnwN5bJbAyTiu2ok8JBtJuU5tt6tvnq6t9Xot+xmvj+b\/UxblVFzcAKMefL2H\/PRq+bq\/xav\/Xyf\/pTNFsvRH\/\/2Q==","a_rank":"8","a_hot_flg":"0","a_views":"420","a_active_users":"460"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F68ba880c204348b202f6b81fc1179625","a_title":"\u3057\u307e\u306a\u307f\u6d77\u9053\u3067\u8eca2\u53f0\u4e8b\u6545\u3000\u7537\u6027\u6b7b\u4ea1","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:33:08","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP4iynIwPr1IHOMkn6\/h+tewK6ezT+YwrgAjkEdcHg5xigLruvvQhOMjIOME459\/r0z6UEudna1\/O\/8AwA5HXIHr2OfQ\/wCc5oF7Ty\/H\/gCkbTz6j8enTjoc46EdjnmjdNd7\/wBf1+BLldp2tbz9PITjtzn347dsc9\/0HrWfs131\/rp\/wQc3zJp2S3W9\/n0+4Xr0zkk4weePUAfX0zzximoWad9vL\/gjc7pq2\/n\/AMAbxnPfpyfT29PT\/OBwu277+X\/BBTskrbef\/AA4PBweeh\/P8+P69qXs13Ibu2+7uGOTgEEjr35xjAOfw+lHs\/P8P+CA7nHTPTn8+n+Az349E4WTd7\/Lz\/yGnZp9hKg1vJ\/Z\/FGsUQnJAz6jr25PGD\/Oui19F10MRvlp1IJPrlv8f5VoqM7pO2vVbL11APKUnOMnA5PJGeoOO3Qdc9uKv2D\/AJl9zAcIEPG3AB6HsRzg4AP5\/wA8Uewf8y+5gMNunB5PJI569QQMYIGccY5rN0pxu2rry6Jd9X\/SAb9niz0OO\/r9Rjv04zjrUpN6JX6AL9kB5BJ6EEYHAyT3GcgAYI9Rj1bhJK7TS8wF+yr2B\/Nf1\/Xj3I6VI7O1+j9Bv2YYyV5yCcjvg859M8HHr9cghDbjBIAHK84PGOynnA4xzz6dTSeib7JgAgU5BBIxySDgEnsQR156\/gBisnJtW\/r+kA\/7L65\/76b\/AOKqSuaS6\/gv8jX0\/Sr\/AFe+s9L0mxu9R1PUbmGzsLCxt5ru8vbu4dYre1tLaBZJp7iaVhHHFEjyO5CqpJxWlavSw1KpiK9SNKjRi6k6kr2hGN25Oybskr7dGdmDy\/F5li8NgMvw9TFYzF1Y0MNh6VnUr1Z3cacFKUU5WTerXTuU2iYMVIIYEhxtwQw65HByT1yM\/TpXbQqKcd+Z+7JPvGcYyi\/nGSa8mmcc4TpzlTqRcKkJOFSEtJU5xdpQkukovSSu7PqSLEV68Hv7\/hnjrW5IpTA65\/D9etADMZOcHIzyM8fl0PvQAu09hz1xjGfcn1\/wo+77l\/lovJaAbvh+PRxrmmL4hS4fQze239qLZyGO5ayEgNwIJBHKySeUThhG5GPlUk1lXUpUqih8fK3H\/Elpvp96aHFXaXd+hf8AE1rpMfiHWk0KKeDR01O8TS7e5kM9xHYpO6W8c0jDdJIqAK8jYLH5iBnA4oXcY8zu7K787a7ab36EYqk78sE3Zq6Te9vXz2Rhi3BGGVvx5z\/TGevHQ496omnJtNNNWstV6\/N7dRn2ZucBgPTjH65J\/Ajj8TWc207dGtfxNCBoWViCMA8gj69wDyfduc1k2k7N2\/rvsA0RNjnIPcYJxRdd196A\/sa8df8ABIr\/AIJXeHbA6lrPxj0TwhaMsbJf6b8cI9Rt7d3bEYE9zc6\/biUsGaFQ0nmFCVEwBNfGYbF8aYqnGdHKnJVLR5MRClSlZv7UJyV4LRvmW5+2VOGfD\/Cy55cWww9WnJOE6VHEScdHyVo1IVny6t2cZKSuup8n+I\/+Ca\/\/AAST04SNa\/twNpbYbYureK7HUrZWYFhDv07wXbNKV2rtU3AlYEY3Fya7efj2l\/EyrDwta\/LWoJ8t+ym79912T0POfD3h3OMakOK6c1UfJdQruUpq0XKSlzuOiTvzcq1sm0X7j\/ggb4b8d+FNJ8cfAH46+E\/iD4d8T6db6z4Zvtbu9b8N6bq2mXSj7NNa6vb6RrTSZkWSGXdpaSx3EUsE1vHLDKg8Cv4h4zA4ueBx2F9niKD5cRSUY80G1GS1dk+aMlKL5tU1rc+up+B08dgaGPyfHUcdha8OejilWcoVYuUk04xvKMkrpKUV8N77Hxp8VP8Agi\/+1x8NTJJbfs\/3\/wAQtNEywJqnwy+KmieKV3MyKrnR59A0\/wARhcsrNnRgI8kSMFG8ezguPsvxKvPEPCybjFRxFD3feaS\/ew9pDTfe7TvpsfN5n4PcR4GFSpTy763TpLnm8PiJ8yhtzOMora9+WN\/K5+evjD4Ga38O9cuvDHj34PfEbwdrtlZX9y+l63qFzDcyixubiyEtsD4WiV7Oa9tbm3ivojc2kk1vJFE0jH5fp45k60YvD4uhNNq81GEor5q7SevXVJnxGJyNYKcqeJwGJjUtdRbnfTtppe+7vZ62a0PJHj8IRSNGfDOrI6uqPHN4lDmPy2Pmq6jQIH39FIEkZXaThScjpjPFzk74iHK04pwjFp3+0mtFvo91Y8OrHCx9xYatSkneSq1G5LyTUKejW3utX15rXS+7\/in8MPgz8ZvhJov7Q3wF8HWmkav4cs7HQfjz8DvDL31tJ8PJreFoLD4k6DCIb+61fwF4gEMv9ralNK1xoOqLEuq3Dreyy2fx2BzXNctzevlGc16s8Pi5zrZTmFSm3Cqpt\/7JWqNuEKsG+WnCTTnBJx7L9AzPLMhznJsBnuQYenTx+FwlClxBklGqqUqVWk1D6\/hoRtOpSqU4xlW5FyxnOcp++mfJOs+D76zs77xSfht4ik8LpdtBJ4luh4gOgPc3F0scJbVo7K3sg88sqJFF9saR3kjCyOXUN9NSrRlKnB4pOU0rQ5IP3nFzS0vrZtN3SvpqfDYulThUrThg5xhGbUpyq1HFRTUL2eqvLlWuqb21Z9pfsffsjaD+0VHqV\/b+GvC+uT6bbXtzNolz448faBDpUOnrMXPiGXTPDGrvNcanmFtMXSdZhhs4Y5JtUXzJ4reH4rjPjShwhh4YvEyxFaM6lPlo4elSlOUXUnTduecIpKSfNeSurWvbT7jgLw6xPiBjJ4DAYjDYGpCNSVTE4l1p0oShQlXVP3GkpyjFpOUXFvqtTtPiZ+zz8Nf2dNUtPEnxa+Efg6HwPqEt7Da2Phzxh438Sa5d3MVnqDWcOkzeIdY0\/ez3ttHbyte+FpLBpWjtb+70a0nm1eyx4c4xpcVqpDL54unOklKpKvh+SMF\/KqsW4OSve0ZO6e2zJ4y8OMZwR7GWZ4jCYqnVk1SnhcRFureD0UGoVI8r1blHtbU8e\/4aC\/ZH0nT7LTdH\/ZV13VxYJcRpqWtePfDeiXuoedcPP9p1NNJ+H1\/5043rGiLdeVBBEkEWEDbvsHQrPmcsVUfuq2it7uv3s\/M0veSaStdaNyutWnJy1v39Fvu8w\/tBfAlyXX9ka02sSy4+KbY2scjG3wCBjBGMAD0GK5bNaPEVbrf3UaWXZfcj+kT4W\/s7f8E4\/iR8L9Gm+Mvxw+Kfh3X9Q8DvYaz4KOj3Ov6FZeI9CmNvbtpAn1+G0uZby1eLVcw6XZ2to08lvaz\/ALsy081y7iqNSp\/Z1ejUoQnSnCEqOKhVg5QftKcuVwppU31m5J\/ypaP1MLmGCpRpQxOHm\/ac9PnhiHBOMfgk4+yla6tZX93ZN3ufm58Zf2Qf2NWOuXHgvx54vuNJgsllsCvhG30x4Ht1iVigPiLWJ\/PYB5pHup4ElUOABIfszbYbDcQU4y5\/ZyqQhH3ptqLb5edcqTfvaRUk3yuzs9UFbF4apT9nClBU5J\/ZfOr8yactLy05r2s77dT93\/8Agm\/D+zB+0Z8FvBWgLZ2fjbV\/A\/he18DtqOpQz6Zrmkz+FdU1i2lksI7C8S40hdbieDxXrE0Lxo+ueKokl3LIhPRQ4SwebVcXiMdCp7e+GrR9lVlGrTThN1KVaULOaVSjL2eseam1Fpcp+zeGnGeOweW1cnhWpz+rudWCq4eM5Kg1TjJ01KUlKOtNSurxVFtfG7foVrv7LXh6zUjwT48+KXgbUrWOR7S5sfG+s+KbB5YW8xLefwz8Qbnxd4aCN5ltg2umWriMztFcQr+8XDF8L4GE4VIQpclGcL0sRTp4uNW8k5OMZKL5Kb1kuacow5vek00\/1nCccY+ilhq65KdWzVehVlh4uUvtU4x5qdRPWnWoVYezd3GMNOdeHfFz9naX4keG7TwT+0J8IfDP7THgW302\/j1LxJoWlLoHxk8JSTzagra94X05Llbgiy01rWG8i8F+LdF1K7ube6uY\/DWrW7xaXVYHAZO6OLp18LUwssPzwo4zBzUvq04pyUqylev9WVrOcvaxjzKNqau3+ccXZtGeNqYhUsFXhKtCFWFTD0sO6lOrFqVKMqap4f20pRjKm3GjdRl8bat\/MV+2r\/wSm8f+Ao7\/AOK37Jt1b\/tL\/A+4u7i3vtG1CG71j4qfC6aO5MNxp3ifR72e2vbiLSJXEGqavZWOjapo0QFx4m8N6DamO\/u+TD5\/hMHiqWBzFUVUrU4yw+MgpKhXjKc40nKaXKpz5OWLp88XJWk42u\/zbPeG8XKniMbl8KeKw9Ks4VqcYqVSlFxi48vvq8W248uv7xTUZSVj84dK8Ex\/DS+8Mas2m3mm+I7G6v5PFEmjaDrkPh2\/8L2ejSatqtpBcar4p\/tLUINQsYpdI1q11jRdHsZrq4l0mLSLuFLq6h9vMZ0J0ErUai5FVpwlecXNzXJ7zUUpSVrTTur7NKx8phK+Np0qlajg3QjB1KMsTCEk7NSjNOSe3NeDi7q\/Vo+2fAx8L\/GLT\/hF4R+MeheMp5PEHieXw7448dvqMGs6FqWkeM4U0fVtX0lFew0Hw1feC7zVdJ1vw1pLaPepNqOixHVNcmeCKC3+ZdPFxqY6pSxeGqr6tKphMFGjGE6NalTbUHyJzrqTbjKcqsOVO7jLTleHzDB4uth8HioVoycl9bryqe1lVg5x99KalToqKbajGlKUraNJu\/3l8QPCfjv\/AIJ+J4R+I\/whnb4o\/s6fFnU7O2vNN1DXLbxV4v8AEGpPpHiW41HR7C98OeFdKs\/AZ0\/X7CODWI\/EHivxTfWmsXei6npOo6nCvjvS9V\/NsZhcLxfh5YHiPASy\/NatD2mHun7N0oVKcXXoOEn7aNKc5OSkqbumu8j9eybG47gGvVzHhTNaGc5ZDH08Lj4+zca1HE1Yy9jh6sLS5HVotP2q5octrLdL5k+J\/wCz\/wDET9ufRL\/xFJ4g8NfBfQ\/Cnj2TwZY+GfHzahfeObu08L6WsGt6tp3hvw\/bXf2rQV17U\/sOreIby80nTv8AhI7b+y9Pe+nTVzY\/S8M5VhuFMDShSksVOupTnWpNxp1Kk7pVNbta2bgk7JNJ6nx3iLxXmHFWcuNehVo0sFTpqlSklNU73jP94rJtJty5U7ebZ4yP+Cbv7NHgG5U\/Ez9pzWvGN5bsss2gfDXwjp+niR4nUz2j6prGralFHESrRPLF+8X5\/Lw4G336mbYhxklGCja1mnJpvS904977XW92fCUsDUrtuME+W15Sk4qOuitZuz0ulvs2r6+0ReIv2QtFij0ey8GeJ47PSY00y0jb+wGaO2sFFrAjNL4fupWZIokUtLdXMhIJeeZiZG8Z1MQ239ZratvRq2vyPYWXYuy\/3FeX1eTt5X9pqf0y\/Ef\/AIJc\/sv+ObzWNb0fX\/Efg7Utal+1xW3hPVUtNC0qd1IKWGja5oGpwwW8quzfZre9itokVIYEjhgiUb4TifOsBCFD+0cPjMPTajTeKpR9pKn0p87tNNJtRqTlKprdybVz9szLw7wmc4p16mTYvK6lWzrSwfJadVtOVblhifY8095QhTjTvpGEY3v8o+LP+CNljdw6nb+EvjzPFb3sV0lnb694W03Up7KO7YKI3ubDxXpBuGKhdwFhA7CLeipvKr2rjzHwqS9pl2DnCScb08TUUlFLmvyqFVPXS6d3f4Va587X8JcHFyisyzKlUg+VSqYGlOlKV9E5wqxUdGrtt6207637En\/BL34q\/sI\/EzVfGtj8ZvDHj34d+KLbxBf6tpyaB4i0nUbWW8sre+sFktLeLX7e5t7fxZonh+fUQlzFK2nWNykQnmeFH+ky7iqWHr0o4zA\/ucdSw0qFfC4iTtOeJjGClKpCjCM6DnUhJSntOaUXojDJeEK2Cr1qtLGzdbBVXSqUZ0fZTrUlvClUhiJJynHlnTi42fNZ9D9gG+IHgHU9cbwlZ+NfCuoeNI7JtUg8LaVrenahrk2myCaH+0YdL+1W+pz6DM8MlqNWi097a0uIZYpSLiCVT9HmeFx+EhLFvA1pUXNWlFxfsIybcYy5eblrTfLs3B2aV7pndgOKMozerVwsMThYywklGpGeKo0pSqQUZSlR9pK0qlKDTq0kuabfLGzaS+LP+Cj\/AO2vb\/sQ\/Anwx47t\/DN\/4n8U+N\/Hug+DrPTtPvb7S9Tt9HRLmTxXq9lc6fc6ffQ6la2JttI0yOC+tn\/tHXLC6M0SQeTczlFSNKar18PF06jrylQqxUVOnyOalOMop1KVScYx97mTSmkz8643zF4\/21HD47lpU43q1MPZex5qlSMPZzXNKblTpqbfM\/ZOz2lY\/GXwj\/wVB+FWqeMJvinbeGNd+F3juC3luNb1jxP8XbHTU+Jlpq\/2y6sNL8V\/D+y+FOoy+I4dDuJbO1+3x6lpfivRYZ2l0DxObm2fSZPG4o4Zw+ae2xrWDy2NVUp+wwmHVOhGLX7udLmr89GcXeS5ISjK\/vxnG0V8vwvxXj8idDAUKmY5xhKlZez+vVvbTpQlKHNH2rilUpSkptKrzuMX7jjoeb\/tB+BPgV+1f4K8I\/tC\/BFb7wdqfxQ1zQvAWv8Awf8AD+lTalo3iDxJfeI7Kx8f3Hh+LR9MtLvwtrWiWeleJZ9Q1aaPTvCGp6PFHrNxpmjXf2e11v8AK8sxfEeVZzjMonRo5jkuGo1MVSrVHKpjMKv3UqLp1vZ8tVVHKdH6vJynB+9CUYw5H+\/8S1OG8R4cYHGRxk8BnuMlKFPCYaFJ4TEpVKzr08VS54ThOjKCca9BTjz2hVi5zdSH0B+2J8LvCfgT4KeDPAnwktdEtbmTbqPi3TrDUJJbbRL3daSw6Lp+nW13e3ep+Jb\/AFuW2ll8QSrJCbpL6W5BE0V9FhkGbcSYrO8dUzTA18JldFRp4Op9XdCbdWaU5TVROUo+zUlNRs72ey1\/G6fD+VUsPlmIw+JWKzzEynLE0qdR1IU6Kt7k4Q0T1U4Xs00vspp3PHHw\/wDF3g34SfGlvGPhTWdN8afCqT9o341+EvCl7Z3n9hajpd\/b\/s+eIfDsNzo8UiW961xpXjPxDPqNrfEj\/SNSW4iF3DPaxc+YZphcbj40aNaCWHxzy2rO3s6saOJxdaKdGd7xjdR5mna8o82jVv1PLMDmGV5NDE+zXta1COZxpOKqQlVo0Iqo8VBxu5wSlGF37nI0ldM\/Ejwf4N8ZWl1eeOHfWPD1j4zW\/kl0S5vrueWGx1K\/m1YaXqNxdGG8vWs7\/wApANQjeaKaECV\/OWRz9RUxdDkjgqbjP2KivaXUk3FavmjaPM2rva7eiPjamBxGIpyxWIo+zdZyrKL3T5r2jdJ67W13V2+kXizxcnw7gm8RXcizT2aqIBcxrPHHcNuMc0sIXEyw7RIlu3yzymG33o06NV4fCyxMnBXV0nfolfVvR\/oeLXqQwykouMVF7X15k0mvXa\/\/AATxa7\/ba8UXd1c3U\/h6K8mubia4mvL1tEkvLuWaRpJLm7kk8PzySXM7sZZ3kmmdpXdnlkYlz6yyJ2X7+2i6x\/8AkDh\/t6qtOWOnfmb+dmf6Usfwk8cvHsOlXxB2Ai7vBtwDkBIUMUbIAFIadJGDIjFiyqa\/IP7d9vSjy4PMlK6uqkEnv2SStonqn8z+to8ccL0ajlPNcPUivejGnSdJ6J6v3qjbveyTTeqs07EX\/Cj\/AB7OrL9jS23HhmnVwpODhXQuPuYTbgYLA8jIGbxc63vfU8U0\/cbUOWolfVR0ilo93Z+eiJr+I\/CSUZLE1Jcj5moU1FPbdSirtOzffpsdAfgr4qk0ywtbiaGOa1847t6l4kkld8AjcJ4sOVKFVBDtJu2oXX362aVKmAwuGp4GtUeHU6fNVr0o83tG3GE0p2g4OXNGT5Xfl3aSPjZ8fcORx2MxUadapQxKg5QdJ3qSiknypQUYSVtJaKy13bPhT4Rf8E6B8J\/2iPHfx1n1fTPFLa\/4Lm8O6Fql64n1zQdQv\/E39oeI7GZXtI4P7K0qx09YNKK3s0nmXWoxx2WnklY\/3Ph\/xA5cvpYbNcI6eYQpYalVlCt7aeLwscO1TlOM6fKqyqqlNy53GbT5XJO7\/ljjLLaVfH4h8P15xweKq5hiXSxFOlSlhMRKqnFKcZv2jhSi1CckmpRu2pOz\/O7\/AILM\/A7wx8SfGmhaD4m8Yadotz4d+GeueI\/BOnnT7HWbbWfEKR2UVrofiK21PfBbx6j\/AMTqFruaSLVfIuNIu9KKXMbXC+PlWbZ5mOOxWKlTisO68nRpYtJ0K2EpJKM6KVmrOcnJWSuoJ+6ztxlTLsLw\/lmC9nVlKChHFYimpOu8TNTv7SUdJU6q2V2rRel2z+Z9vhXpuo\/2\/D4hvbfw1f317HqE3iDTdL8OaJrC3zSwy3QsXgtLS+0rw2ZbgS6Todo0NtYWayXk8CSwQB\/fxGLqYubi5Rqxi5cvI4qEUvd5eWLs0rOys99LdPBcv7PSnRhUbdJQjDmmuVPW9ntKzTd2nZO9+n1J+z14q0Pwt+yN+y3Lot5pT+JYvjF8eYtZGragLE37f2hosPh5NRvlvdPlsLaafWpWNwt7pkmZZGhu4jh4\/m8TRjDNcTFRjFY3A4Sly8rhz1I15qylo72pL7Sso3stT1VmLlQisROTpYKca8HVbnTpupScpqKd4pXk1OKT5pN3V2frT+wX+xlrvjv9onR9C+NNv4h0NNHnN\/rXh3xDpMkdrdJc2l7f2k9klyos\/syNolw1vqSfaknmMQjlaVi1eLxJh8ZDLK9an7Tmw9KSanpOFRNQpL3rOSu7W1Tum9Fc+g4bzqlgsU6uGhSxKxEYRjOFRShBSnCrUfuN8snGnypys4pu2p\/Rh4r+EmjeNPD\/AId0jxp4a8PeMLfVvCNu18+p2JaS6sbu2tU1Czi1GOa0udK802Fq720bXcV3FHEpkmS1zD+MY3KsfVxU\/qtJaVqlSrUnXlGftYVKdX3VCFOmnTaTtKUnf3b3vf8Ab8p4goY2jXk5Tw1OD+qLDQfNTqqpCpzzcXfmjNVJR2eqct9T+Yb9pf43\/wDBLDwZrGqeDvhf8Fvih4w1nw9reo2kXiqx8e6toPhyXVYZrmI3FivjOH4gpr2meeFdvtPh6xt7pJPMgPllJK+ly3LOIIunOtjHytRk1OCanGyfvPlT1V07K+\/oeLmuZZX7KeFnhqcJpyhzRcoNTty8ys7rlfayvZu+rX5Qw\/sWftPftoazIPhp8LvEr+G7jWtD03\/hLdUsrLwt4Kg0m6u3vPEGqW2t6g9jol8mlQW2lrHp+kTXmqSzC6UaezFQ33OHxtLCRV5wqVZUKjlCnzTjTmk4wp1Gk1Btvm5m0nt0Z+bZiqDalVnGlTdWmoQvecqd3KTUV7zTS3s\/KR+kEP8AwQF1lIYU\/wCFjfCmDZFGvkS+GfEN\/JDtQDypL5ltzevHjY92YIDcMDMYYy+xfIeZY9tv2VDXX+PXX4J2+7QxePy1NqNHENJ2T5cPstt1fbvr3P7vVnt7uCG5tJIri2uIo7i3uIXimglt5Y1lhnhljPlyRSoVlRlYh1ZWBIxnxcRSnSr1aVWlOnVpynCrGpFxlGpCcoThKLSalGUGmmu1up0YeVKrBVafLOnUg5RcUrSUl7slpZpq9ndOzM+4LkNkkEq3TnjAByCOQGAyRhCAcluBWHLHe1vRtfk0a+ypfyR+45+4Xcx5yQdwxjkggbozyUfO3KEAkMPl+5Ec61STU4qMW1GMZSd07XUkmrK+rvdX82mVK1lsrbaLVdUu3r003PiP4t\/G3wz+zxofjK1+IGqWkE2va9c634Ka\/E9nptzpviiazefT5rqGK6uVe31qXVraSOzt7zUWjljltdNu7a2do\/vfqWacR0sBjcjhgnj8FhaeW16OLxCwtKWJwsKkcPOpKMas\/ZzoRTc1Tc3JL3GlzHiUoZVh8fXhnEsxp5VUmsTicRg8LHG4inRq1I+2jh6cqlKE5wlO0VUqU4ae9JXsfnf4Z1v9jv8AaP8Ai0tv8SvBeteKfiH4gttW1y28Ta34w1m90Sy8Q6TaK80Ph2LQtR0a50hV0lrfRtJWyjP2zTdBs7Se0iu\/tZuPVz3Lc0oZPSrYjMVSqYOjhI16GFjGm4uXs6daMKqkp1KM60uZydOLaUXJJysssLiMFUzKtSw2GnUwU8XWjhsTjUoOrSpynHDSqUXKVOFZYdxc1Cc+StUmouUUpP8AE7\/gtl+z5+y38CtF0fVdB8T6rpnxI8b3EVpofwwkuL25vL\/wdpM6RXnji51KeK6ktNNjuxeaKqalbSC9hhjisJv7S8PX8TeVwVVzzFV60abVfL6LqyqVasJRnTk2vZxU2uWpfXmcXJxXxaWYcS08FCFJUKLpYlwWkZxlCrzNxtNL7SSVmtb6W3ZzH\/BHL9nTXPjNq\/wv8MWdl4a8VeGLK91XxN4p0HXdM0G\/txopltNc\/tSH\/hI9OuQksfiK38PQ7LPDz2drLby20kE0iJ18T8RxyarCticFicQpTjGCw0aLk6lOMnDWtOMVFOTvZOVnKycmrfCVY47FKlgcDhnUxVWpKbc5uNGMYXTTjqtbfy7+qP6R\/gLotv8ACH9o34s6dc6Ri++GvgXWdZgklitWt31fxHN4W8M+EvD+myQQw2hkvb281m1t1tESBp7uVPL3KzDhoZ3h+Mcic6Kq0oVMdSoVVOaVSMqNZ86ko+dNxTWnL0T0PVyCU446vTnCjhq2D9pRxNOCjGKqrljLmcFq5JuUHfWz1PpP4van4isfir4b+HouLi78B+LvhhF4MWGK31CKLTPGuhac1\/DJc6rps+n3mn2\/ifw1r2rRtc2OpxXNve+GraNjbpcmdfLy+lCWCr4WbSq1quIrUalm52clCpGTSvqowa3Td7tXP1bLaVSFPC4mLqclOvThVvJRhUhNXp1G29fe5otq2iVtGfz5fBr\/AIJGfAjw1+178UPGGl65rnxw+HHwq+H2kfEhfBvj2aNNC1v4qeNNZ\/4pnwN4lvrG\/lvdQ0vRoZY9e8QW8ptNSmW3Gn3cQSSWSf1ZzxcqcMHiVCpRi4YeNfD\/ALqvOkoJTqSlG\/LKzb5k7p9LWbx4gp4LAVKmLwsqjxEuaUqVStKpShPVpxvG0k37ySupKybV2l+23jn4h6J4S8NafrHjZfBfhI6DokdsdP8AD1pZ+GPB\/h7R7eJCq232qZIrGwtjGYRcalelhbx2sSDy4RHH59XBU6MpUsJSlFT5ZcrqOrOcru8nKUY30u7bKz3Z8Sq1XGS56slOcbqN1yqKevLGzen3dtEfEE\/\/AAUO\/ZQimmif4+fB1XjlkjdR8TvCBAZHKsMrqBU4IIypKnsSOaf9m417Yep\/4C\/8jT2E+8fvf+R9IeBf2ydf8HaJZ6HpfjPUkstJsrbS9NsNd0DT5dOsdPtY\/Kt7O1ms4L+WC3soRFDaKtuyxRxiNIvJOxvpa8KePn7fGUMLja1RXrVqlKVHEVajd5TrV6VRSqTm23Kco88Xd63KWJ9hCMcPReHio8qp0MTKrThFaKMY1VaNl8NpRStq1sdzpv7dvxUubgR2eo\/CDX42Kr\/xM213TrtMmMPl4bTQYdwJDudjBcdMYNefVyvLJPl\/smMIuOroZpiIPrpy1qeIpuzs7ypu7to9zWGPqOPN7fEQSesXhKGJj2vKcJ3s3q4qSate13r7h4V\/a\/1vW7XdrPhzwLOzqypN4Z8bq+ZGBUqtpNZ6jcmXeWG3KJ95kkkHzPwyyHAOpGccNmUYRTSSeFxkdenu4XDOcb72UbNW1tc6I4unODlPMqMZJ2adB0k1te6m+V67JO767M8X\/ar8dfCr41+CtH0\/xL4N1r+3vDPiPS9Y0q31HQr2bT7izttRhOsWg1a3gW50ye4sY3j03VLawuLq1u2DQraLdS3qehk8qHDuKeJVaUKUoP63Sr0amHqc+ns505KpKlCat8VSUYxgpQUtdb9pQxNKpRniaEou0lKE1O7p3bhOLS\/c1vhlFSum001JXXxlb+Lfh\/YfEb4Z+M\/AXgHQPDfiXwL4F1Gxms7kND8P77xu6azZQ3dxC2l3us3VrLDrTtdapdz2WspFY2sFpLaCUwV4uYUY5tnM8fgs2xvsq1JUYYLFVnKi8PJ\/vZJVpQwkqlv4U6k4OnOMJQVT7H6\/kHH+S4Xwszvw\/wA14dylYnMc+wWZ4TPaWW0KmZ4alQp0bpZhCFTMqcHWw0KfsaUZ4ethsXjKWIp88qVRfkB+29\/wTj\/bD\/bH+PnxA\/aKm+Lf7O+r6j4q0uLw3pXg3VPGekx2nhbwfZ2sem6NofhfTdQl1FzNpVm01zHd\/YIp5tYvr\/W447e\/nKJ9tw\/ndfIMCsFHLquIUYVqcsTWeXVlUVdWnWhTp4uUoVFG0VOjBySiuWL0Pw3N6FCrXc3jYOEWvZ06OHxlOFNxVnFyrUIt7t3bUX\/Ne5+7X\/BLH4C2\/wCxx4T+Hvwn1XTvC6eN9O8OXM\/xG8RaZdPdaZreo3V\/cxRXmj67dRiS\/sLDS7rT9Ktbe3CwSTafJeQ20L3lzJJ8PxljM0zfCxw+SZH\/AGnmU8dgaUsFUqrD1cJhnVqzxmMpVZSUebDQdOfK7c6kley5XwYShXwP\/ClJUq9Ki4xrVJS9nThh51Fzztdt1IKTkmuqt3PV9Am1HX\/2ufj3FeXFraafrHxD8NzvNLBc2dkmgeBbOWx8K2f2m\/hs4tRutc8W+JbjxRdHSGvotIfwFZSapLCmsWgPRwVluY4fIv8Ab8pjhMb7XH1sRRU41ZQlGdaFK7g1Fzmo+1ck370vhJeHpLGYjGQlRoxzDEU3QdOT\/fxbV6k2kldJJed+tj5O\/btP7QGr+L7y4sNX+LOpReL\/AIr6vZeFPh\/8KrbSbFPBfw\/8N3d3os3xA8S3WrX0Wj+ILjV7Wx03+zjqssLxJcjSrcz2yXcukYZfnFGCjQhSjSeGhN1JTw1WvKtUqS0ppUlzJc0ZJtzS667r9cnkmJoYPDe2qQqxrUqToqGMpUYUI25n7SM3C71vHRuOq0er+uvhL8LJPgp4WubfU4rm98SHw9o998UPGF7Y21nd+MvFOl6TJazatrYtQNPVlvb+8stMgizFaW80UYkmuGmuZvVk69FTqOk6d05SfsrQppLVq8pcsfK708z86xP1jEYivSlOdaFOpUhSU27xpptQj62+13vex\/F7\/wAFJf20PiJ+2T8f9c+HPgrWdSm+EvhLxBe6J4Y0LT7hLXT\/ABRf6O80Gp+NNbZBaWtzAxgun0uW\/cWOi6DBHckwSzahcy+3gcPSw+HWLxEXGrUpqcudqXIm1yqKaVm0lqu9tdwdP2P7qNO0lZPXW7tfW3n5+rufPMf7C\/xS8uPz9S8I20+xfOtp9Q1tp7eXaPMgmMPhqWEyxPmOQxSyxF1YxyOmGObz\/Cpte\/o2tG7afI6FQq2XvL5pX+Z\/VZdW6Q2144t5JjFFcTCGFA0s3k280hhgDMqtJMVEaZdQzMqlhgkqU4RjKUpJRjFuTWtopNvRauyWy1ey1PJcuZqEJRbn7sfeXxN2V\/v\/AK2PJfAHizRvFnhuy8b+Frm5n0DWotZa1N\/Y3Gn3Im0y6vtLvY5Le5VJ4nhvLG5hLZVW2BlLK65vEOnOMVG8o8kJU6qWkoSinF+V73WuqfbfGnOpRnOGlk3Ga+zdLXW9u2+x1UCTA7reRhGTkqJMFWVFLsxBUEuec7cEdOVArni3BaNqyavfo336ESSbk07tu9lZ7vyR3+jan4js4VNlrus2bRyK8Zh1C5gAJ+YFTHKqp8wBQ87vmAHJzr7abST5ZK2nMlJfjdGKo0ZT9+K1erva36HYxfEDxm8ZiutROrICEMWs2Vnq8ZRSgdSupWdyj5AyScfKOjAmuGtQ5pKUYUXd3knCN0utmtbv700vn0NUF8Lqxa0vCrUinZaN2dtHtb\/gELeMUeRl1Lwf4Wu1APmGDSzpEsmSTgSaJNp5UgHGQQTyVwRWcsPTeji1p3aaXl\/XVlPEVouHJVklBK12p37uTesm9LtsqQ+N\/ClvP58\/g\/VNIaL\/AFc\/hvxXe2kqAEtkHUbbUZMLkMB553EA\/KNwM08LShNVIV8VRqK\/LOlNpxurOz8+t35dr1PGV6lN0qio1YSTUoVaUJU5J7qUXo9NvOzIbLxP8LotcPie21Xxl4e8UG6jvDrraX4W1TURew3EdzFcPqaWenahJNFcxJKs0lwJFZS5bLNWNLLZUJylRzLGQjPmbVSo5Qlz35rxWrclKV9ba9DtpZrKnThR+rUFCkoqEaKVNR5GuSy0XKmk7bdbaXML4u33wl8a32meI\/iL8SPGGt6vCkcOkzyW+tRTLm7t7i3Fvp1l4nsNNimW7htDFcQxSXCF5RbsqSTpcZUMFPDTl7GtKMZNX9nendxd05OcZXTbbtG1nfdHrviHFYpJ1KLqqKSXNKErO1m1e9m7a28vV\/XWv+P\/ABJ8S\/h9r+gX\/jixNp490G4tr6fSodA0LxPp66tYzLvsJL\/xVd2NjqVkbqO4jNxo15Ha30MYe3lWJkl9PE1sVXoSov2c1NqVSaU7zcNYKSlpa6T0V+lrXOKjiKMa7qVo1Kcd21aa3V1aHvJu2kujf3fjH8Jf+CSuh\/Bz4jeLvFeheI7Xx34Y1zwudB03QfG934f1HWrWPVMDxTa6teaObTRdUg1m1RtNtrmHQrW90pLv+0rQHULCB7jLEY3G4iEKNaheMUknDSNkrRTja7s0ne1u6002xE8DKaeHxEtbSkpJ3T3ai5emz6X6u59R3P7IV3Nc3EqwS7ZZ5ZF3PbbtryMw3bbkrnB52krnoSOa8l4es29ay8lDT\/0k6FjcNb4IPz5t\/Pc9Q8OQ22tXsdvHdW1usiyK09zOsMce6JuHkcfKzj5E+YLuK\/MMlq+hlazurqzuu6tt8z5ODimnJ2s0769PNdt+nqcPrOg6R4aS98OaDbW0Gl2E2vyRR2gVrYz6vf3t9dyRFWdHjmvtQuZ0aNjGBKGXIGKyp81oqzjGEY01HmTtGEFCK0fZLua1XHuvejf1bvq\/N6ak+mIJrZiMKVfaw+bJDbkJ4BB5bkEZzn156Yq2rSs01d2a\/Hb17mMWk7t2\/X+t\/kdZYqqAIMlSo2EHg8nAOCMckEk4wCf9rKktb20e3T+tv+GE9W\/VmkgjU4Xbkk4wBuORgfOOWHJUAk8qD6gnLLt+QhJrWNtpKgHnIIPBI7AYGOARyerYAqJQV1zJ3t\/W2n3\/AIgc5q1miW93cABktra4uJFCjc6QRtIyruKRq8gCqpd4wCVZ2A3ET7Nb30vt1t69f+GV7u4bnzr8J\/iT4G+MkXiW48INqok8Jalbadrlrq+ly6dcWN7dNetHb4cSwTSIbG5E6wTyGLEfmBQyE6VYQjyWleMk2t+lt9FsnbbW+jvs5RcbcytdXWq2PD\/2k72UeOPh7ZRtgQ6joLhSXC+Ze+J7CIjavG4oh67cqxAbkA86s6\/Jf3OVN\/O\/W+nTv32ud+FvGlzLSDdubRq6b07918u59N6jcR20uyLscJgNwd2Bu54Y5wCMg9RuJqHG7T5pK3ROyfqbOUbbp6bWf4klheXxK\/vGUDONjMDk54PUnGScZ6ZxmmlZbt+b3Mr+S\/G\/4tnSi+1LAxLORgY+eTp\/33VXfl9y\/wAhFrQmYeThmGVTOCRnr1wefxraWz9H+R50tn6P8jT1jmWdjy2yPk8n\/XQ9zzSh8K+f5ly+z\/hX6kuifekX+HDHb\/DkyMScdMkgEnHJArb\/AJd\/13JOpTgS44wCBjjAzjHHtxU\/Y\/7e\/QBwJ82Pnuw\/DYeP0H5D0rVbL0QCzs25fmb\/AFidz6fWrsvZzdle0vyE\/wBV+aM7W+NB1ojg\/wBl3wyPQ2zgj6EEgj0OK5nu\/V\/mVHdeq\/M+O\/2WLa3t7r9ofyIIYM\/F27z5MSR5zoGnTHOxVzmWaaU5\/wCWksr\/AHpHJmr8FP1qf+2mtf4l\/hX5s8n\/AGgST8VvB4JJA1LwHgEkgZ8YWmcDoM9\/WsY\/70\/SK+Vtjto\/7n\/3FZ9TTgG5lyM\/O38qRB02mKuAMDG3pgY6Kf5k\/nQB1NAH\/9k=","a_rank":"10","a_hot_flg":"0","a_views":"336","a_active_users":"331"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fdf31dee03d95243520259b0d98652267","a_title":"\u65b0\u5c71\u5343\u6625\u300014\u6b73\u5e74\u4e0b\u592b\u3068\u30e9\u30d6\u30e9\u30d62S","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 04:36:44","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/APzr8A6p4Z8IiLUrtrq5mCowiDacsaSna8rxwTi5aaOIbPK82I5Z3ki8qUQ7P5io1o06im4upa94pO7v126b\/lqfS4eWGpL3vfevu2dm+jTa0s7Oz327M+3ovE15rmk6FrupeAtW1jw1qtnc+HbFrhtGt7K41hn8NadFqjpJ4nsrtPOa9vJhb3FnamXT9RknFjJplrHdH7CNec6FGpHBSlGUVGN9Gne3vK94\/F1\/RHPWxWJlJwde1J\/Coq\/Ktenp1\/AZe\/CX4e\/Ea+0zT7rTfE+i30d\/H4TsLnRLvwncz3\/i3RnvNR8SPNZ6t4pl8jULvT7CCBJbhrOyW3srvU5zI6uz41IQxk40atBU2pKEm2k46221eid7dNrozjGjXv7SUpezvZ2+K3yWret39xwPxI+EngD4deL9VtNEOpa14d8Tm5Gg69qlnfaTc6Pq+iSS6dq2k39guvxwQ6np\/iSNzPNveyv7C3ktbPT9PQwaldbYyjRwsYv2Ptqbj7ODdlyzte8U2rpJWva3XsZwwcK9ZqNVRbTe929Vo7620vfa+nQ9D+E3gKFrrWNaj1rV7DVIrKG6lXSLWMxXdxBavcTLaI8FnIjCQW7RxyC6t5bqaG2mkMDbK8\/DylB8\/tZQje6jGMny667J9NX+RrTwtPD1Xaop1Fo1f3tGkly9FbbTW1+h71B4Mt7DxLo+vwqsumaozXF3o0tsIGV5rB4bu1mspLeyMQnUObq3FxIjzXgaRfIVJK9rDYpVJpwocuj992TTtro2nZ+eut\/TvjTp+2jUlTlypSUlNSp3vFq6ul3Vn1872Nzw\/wDDvwvdXeqav4BkufDV3c3WrSxaa7zwX9jdvaXiPHpcqz3KXMYkvlkjs3uLYhQI42hkJZOyOO5JNvm9x2k+V2\/C99L3+XY2pYGjL2ksNJ0akpK6cG1N20fM9NNV03tofdfwd+InxB+D1zceNZ4LCbXri1stM1yDSPMm0+WwtLuZ11S6spJN5EtncFNSuoJ9Qa71FYbtxFMZZB72BzySq03Fr2agoR1tLolpv17X28jCplLu5VpU\/aTacrzV5N213\/D5vVH6T2f7YlrcaJDqMPhiyubidFSNYtRuI4lkEe0zOjWZeSB5kM8camNmgYQiZ3Tz5f03J8JhM0pRqRrctde9Ui\/dvTvFSV7W+JrTex8VnE62X1byoyqUnJwi4rmjd3aacdNk0te\/Y8Q8T\/G7x34sNzjWdQtY7xj9n0\/TyNP05AdwS3hjEkTTtgEKLl5JeFeRn25P1FLKsJRfN7GKglZzc46yWsttuuvzb7+BXx9arH93T5Nkov3V1vq7L1\/Lv8\/6xBrl9M7XKXd1IXaEXKqZImO4qFWVFaLZGwZWcMF4cnCoWPu4WpgsOuSnTi097Svb5dr+XpbU+fr4fG4yV6sm09ouyi1ro5aJWun0b1tvpkDwtfgAG4tAQACPtZ4PccWzDj2Yj0J612\/WcN\/z7j+C\/Qw\/sWv0iv8AwOP+Z\/Nz4X+BOteIddi1Tw1pGr+Nfhyniez0u58VaDPLpP8Aalot7ALgWtnfacmsW3nC5W2it4pzcl5oZIyQyyj+EaOTwnjOWjP+0MDCXv4zDz5KSe0VJ6T1lZaaa9mj9ml7T6tCpUXJUnZ8sb2Xo3rqr9fK7Ptm9+F3gDRLG98KWsPxC8P6nP4+sG0DRz4n1B7qDSdOTQftunRW1xourT2usWcSTWt1LMbw51K3j3TWThdN92vgMBTi4Rr4ik1Uhy041p2emtm3snbXs9i6dGU3FJykmm2306ab+ttdvMydH+Fl34c1PzdHX4navdt4qu\/7YhHjHT7K58Oy2vh3UYtWtlVdJ0rXbjVNFt9Tl1RFsdKka30Zh5cGi3018pynh6NCqpOvUac03ezaV7vXdtLq9W90tLdkMvrJSUJwTmnZyteLeztfp2s\/uM0\/DTUNd+JN7F4n+G3xHsdGa71bxbpuval4+8O6xPrljqbt5DaZ4VstN0C6tlvJbfUri+v4td1pmuori5mSea9iaTor4WjLEPE1Mwq1aEsMoUsJGMGqdTmjL2j15ruKcf8At690XQpUpxjCMI08VSqNVanM1GcOVpRvtfms9L7eZ9r+ANa8BfB3wDoOpxfDPxV4jm121u21DXPEMOhX3iG38yKO5uLaBb7U4bawje2utOEEemzyJI72ys4ne1jEYerg8PJyr3hC+jqrlhvbRvZ3vpfZ9ldenRymzlWpxVfEO93H3p2unHRdEuu7VvI0fhh8X\/Avj3X7\/T\/FvhvTV062vLW70W3v9Ma01DSo7eeZrO91JmeYXY1Fp5pNOu4b2AC8s3FpaiN0unyoZll+IxUIQr0oNuaXLKOtouyetrbJ6X6+T9VYPH1o1frmBqRhT5b1HCUVvG2q03ta78ltp5p8bP2ivhF+z5rNroK2C+JPFGox3uv6boGlzXhistPE7t4ekvLvUGvBZyXUMTQrbOktxFcW99cBI7W5ggk0zDNsHhH7GfJKfLeUYNtu7001u726Wevmzhr1aeF5LS5p3UYwaskuu2r6Wu93pZb9V8D\/ANq34a\/FrTZv7Y8IXegX\/lX0ktnPfXV4dTmwkU+nWTWktrBI0TtHcSwz6ZZyRwiSTnynYVleNwmK5pU4cj+K1W8XdWdrdXfoayjQrUJV5U5uVN3qJK8W0rys0r2tpv8AI+mdM+N3gGx0y4XRIYl+y2aSRW0Bd7lltIjK8UAEhM93BCvmJapIshjBWHc7qD9Xgs6xGFnajXlTcouN1defVLS6W13ZJbHl4ipgsVSlCWHlKMFzpOPwvVc2qu9G+vW97HMp8W77X9Dhun+2WOoSyPdWkJmuIJhska1t4bsSxzMzTRXsFw0LwWiK0TKv2kM0yfT8P8aVFiHRzWcqlCM5WTbs07au+7t2TW\/U+LxuU\/WadeWFpyjyXsrK99em+i7Xv32OX8T\/ABe1PRbGGNtSgu70+TYGLUtmnfY7mDZMs1vmaK7nmhbzopbaRogc70MgkkVP1KhiqFenOrGKpxaTozi5O6bW93vyt7XPjsUq1DlpOo3W2nCySSV3o1Z30779Tyh\/j5risyvdWLOrFWZbMFWYEhipGlyAqTkjEjjH8bfeNe2\/v3\/r\/EvyRiqjsven8rW+R5H8Afgzb33hfULLwp8TvGPh3ww2p2Ees6VqHiT4T6fJe3t3cW62dzs8W6ddapHLbHRonuGitovsiRQRmB4Z0L\/zDhcgx9CnJYfB18NKVpNqrKStFpv3FrJrva6bvft+rQxmV4q0\/rUHCN0oOrBxSa3Svbz20drM9D1L4R\/C+71LWLHWfjP8VrPxTo+v39pepPonh6WGPUbeTTo5TY+ItD+HlzpskiXenQXdzHBq9vo91Nb6VJGyybJZs6+WJQ5q6x08QqkbuMajaSSvpa6imn5beZ0RxOXxqLlr2ST1U4pK9n0s72flrstzpdO+EfwZs\/7JvtR+OPxNt7GHxHrKyRX\/AMM7No1vvEdlcWmp2VhqEPglNNhGqpLLbajFbyvBcC7kNlZFbWN5ollmHk06tTH+846TU1u1dWa\/p9ipYnCe0UvrCUXPSUqiSab03uuu19tLXdjn\/F\/ws+Cgkk1nw3+054jsNXEFxZSWmveArWbT76zN3sNuJLfRIJ\/svl2tqn2UxraSbpUmtYpbq+WtYZZgKcnP22KhKUeSL96Mn15U1a\/w3t0tddxe2wcqkl7enGKvK9Oa3el\/dd3567fh4P4h8Oax47+K\/gT4OeGPifr\/AMRtNvdB1fxx470vStEtfDt\/pXg\/SJNI0iKwstQjRNU1PUPEtxFDb3L3ss0ttZ2VuEkkVkVfk8\/h9aq4fL8PiKkqMZN42VWb9rGEm+VUtb319Vp8\/tODaVKea0qlOrWrJq8qcXKa5I6OUopy0WqbeiXXc7n9qS91v9lzwHN4q+G\/whv9Eu9VurXwv428W+MNOl1TTZfCniC0\/tfwlbaU2pzTQnULuyngs9TvbdRdaVquj7QsLtaXcvxGLy\/MMqxEMTSpSVCnNJupCSlebjTi1dLq1fTS5+s8W5zhqGR2o4elUVSUKVerCEZLn54KKqyS0lFtNKVrdtNPxf8Aif4hvvEHxQ8ZeJ9TN4LrVPEmqahGt6VN5BYvdSS6ZCyiSSIImlvaeR5Uj27xBfKd0wa6qmIqvEKtWtKpNJp6XSXd2aWtuz0fVa\/zvXqxqV6jk0+WXuybVtW3pttbp+W\/1R8APiallrUcut67DpBk8QaddWHidILWWW3tbm4jsr+3a182BJRNpqSST+e63KXUdlcQebcIiv72V5ipV1Gpa3tIrnm7K10ua99Er3v2XSx7eVzlVp1afO3GcZJ2fuvmTV7K6du\/VPY\/XWb9mHxxYeDD438F\/F74TavpK2FxqcU51PVku760eS8CahdrFDd\/v5YRqMWsXFukKC4ZLh3u1hXy\/wBGp5ZOvShWo14puV027pJrePT0t31ep49SrGlKrS5oRaqWbvFNxs043bva\/RPVpvQ9m0D9nnWNQ0zQrmHx38L9V8PX1nPpd79h1m6Eoe3uLa5si9p\/ZmjzwXXm27RKizWxjKQA3Qiaby+rD5NiXN3qykm\/sOXK33au9X3bfS\/YzhiqNNSSlTu37z5lr69Hp8\/xJ\/HP7CvxY1TW9T1vRfiF4AbS9ULHTZJbzVo5orUW\/wBmYxSpYNbxzTSKTdSLMZVYBUdwRLN+zZNVbwNDD1I8sqC1ctHP3eXruluvS\/r+a5zh6s8bWxFN0pKps6dnKnrd2ab5b7PTZ+bPnSf\/AIJ4fH1ppmXxX8JnVpZGDt4ovwzguSGYHw85DMDkguxyTlm6n1\/c\/u\/geN9VrPW03fW+uv4HvL\/slfBnwbe2+va98X\/F\/gmyvW1ODwpYz6faa\/cyy6FfaTGmp6ylvHPNaX9ta3MOpto+oXFk14l9FbqY1mku9K\/PcPUeIaeHpyrRtrKDSXle7Ts\/nZb7n1mNynDZWoTq4h4eMldJ8zt2SUbrV6J\/NtXPCrjxj8QLTU9f0zSfEfhfVtGk8QfbNO12bSJrG91D7FK8FnqJ0ry5ItPS4tVSBtNe7uFEJhyY7tXuT6dLL8XVUnKng4tWUYyTc2tbttRevztt0PmsRmUKU7UpVJQ1vOS0bvurO9rb3XX0PQvDGm\/HHxrHYQaNojeJre0v\/tMT+GvB+qXUqXyQG2LXV7pzXBtQIrtZ9pMHlyql3FJDJEk0Oqyqs7qs4W2jSjTgoPtBSlZ2e12r2d1YFm1atFKEJ2grJ6WaXWNrt3e3N+e3f6j+yJ8fPEOjxLq2laX4RtTLJJFrOsXOhNqdjbXl7c3d5PBosd1JrFwpuJruaO1dLdGvpkW5mtoy80fk5xw3Vx1FYXCVIYWurz9tRSfJZWcZ3Sate+l3detvqeE8XXlmdJVaHtaVRcs4SXNZXVnbRdLXv1sr6H5Jw\/CL4j\/Dz9tnxDZ2974j8VeHbnS9UXxb40sYbUXGkeGdUsClhql9punahq1n4V06Pxfp9pB4V0PUr24gvLCyisYpLu18yVP55zzhPOsuzfEeyq4jMadKFOWJxEE7Ubq79pdJcuuijd+Seh++cLe3wvE2HlRo0lRqUKlKpBe7ZVLNXukrLd6foZ37enxC8X6v4Y0XwdZa3r3iHw\/carY3+sz6jHNGpm0qyXTNLhhs5Zry6S2iM8Ma3d\/eXV3cSLFFHKlpDaW8fxuZ43F1KkqU5V5wpOMp3hU5WotPt0S0b69V0+u8QaNaGU4fB4fDxXtsV7WvKLg9JNcnwtu\/O1dWs13ucl8B\/wDgml8Sv2gbf4T+LfB\/ibwxonw28X6XBd+O\/EXie\/iW\/wDBGoWV5La61Z23h6KWO\/8AFEt\/bRQ3\/hy305reJzerZa3e6LbQLq9z9rl3BlbOMHgcxwddLCYr3sR7Tmc6fs7Jwjyp\/Em3dNab9z8Eq06+Fxs6cqLc6bT95e5K6utL3t302tfof0yfBX\/gkZ\/wTx8OWvhxZvB3i7xV4j0iOJLjxZrnxB8X2txrMjRo07XGj6HrOl6LY2U0rPPDa6bp1s8Ss6PcTyGWSb9LwHA3D9OEL4dTqxirVpVJ3c19tx1V+ZXetmvQqpisXh5SqQSi5vmcYppRfZK2zVtOr69V9X+JP2R\/h98OdCsYvBmh6ddeD9Js7PTorO4toLi90u0iCRWxmnMWL62LBFFyVWZJZI0mVmczP+lZdQwEaNLCKhTUaVO6k0pOUlZdVezvfv5HxmY0MTKU8U6lXnqVG2ouSilZvS\/W66fkcro\/gnwro7iSDQ9NhclvuWduuzjK8hATn5TxgLyOhIPpww+HpzvGjBR0duVJ3+6x5CnXlqq07aprmaenp0Xa3ex2EuolUyg2gfKqBgAFC8Yw5A57bei9B27IezVSKpRcY2d07auzfS9uhiq0lL3tUr39devr\/kUjfkkktznn5Yzz35PJ57nrXSX7dfyv70fCf\/BQjQvsfgv4K6ZZ3cDLpmqeLbDWleTdNqEuqW2h3Md0bnzVkt5kvLe+ewcBn8uS6hlEtobm3uPyfF5nDJqVOEG4KaalZ2t2ts\/Oys0pWP0aeVvN4RjNQlFaxdSKk1bVb3+W1tuiPy+03wBr6v52k+Lp7TazsrPEYr6A71IZLy1Me5onRVjubWWK4IAfyIWRwPOocS3k6lLFTg4t3U5OafW9pX0W3Z\/cclXgujKLhUlTSl0Sat6WWh7dJ4i+PP8AwjFj4Xm+MmsvoFvb3kFza33iHWPs0xuppopYnlW6uHvrWW2lSJlvpAiEzWsMXkrG0ndW4lxOIpr\/AGiTny+5KCUfet7rdnrq7kUuDKFNckKiSsopNtq3Tu1\/wdj7Y\/Ze8JN4Y8HmK88SWeqeJfF+t2Oh642m6naXNx4ZsdMjRbHw\/KVmlk0++srC9k1m8s3jhdI723guLVZrb5f0HhqDqYFqeJ9riqsXOrFtOcaUmut7r3muumj3Pe4fyvC4DC4vGSlGeKo3jTa0SSle7hopbNa6\/M+hPh\/8Bvhz8GrHU7Twn4anjtPEWp3Gr+I9X1K5vNd1\/wAQaxdMEa\/8Q6pqJur3VdiOsFkbmZoLGzAgtEt4FEdeph8rwmDjVpxoxn7aTlWdV+1dTmd+WTlduK2UXttsVLMsTi5ylQxjw+LtaTh7mkbqNktrq23+V\/Lfjh8Cfh94z8G+K7CXR9L8P32q6Ne6dpWsaHouniex8R3MTz6JqYQ2scs9zpWpR2+pyrJIlnssma8dLeMluTMOHcmrYPF0o5bgITxFKVP2jw9O6ctFZ2uuiXy7HZQzvNHS5K+LqV4c8OZ1m6jtGcJaSk7rRdNvz+P\/AIY+Ho\/g9pnhb4aPeefF4S05LOS+toZ7Hdd3kjXFzeW0LTXXn2sNxJLBJDM5nt45VwoBVG\/PKWAhkuCp5bRnyvDufPCHux993jdJLS17W\/U3xE4V8RPExV\/aKLV9VeKs7eX9dj9G\/hF47uDbrLFqPnrasIXjMisCdyI7ZUFo9hYMA5yVjVXcKqg1hZSbeu7t20fbz+9nn4yKlaTSbk5X2t02Xz+R+i3gfxFY+JtJOm3yR3EU9k8ckHmRFpYpIts9sQM4aWLcFTJ2s4yyllA9OnU9jUpy5pXcklZt32dtPTtbufP4lJqrTaVnFqOlrPTr16\/8PofIPiOE6RrWqaVmQ\/2fqF3bK7xuGkiiuGWOT7qnEkKo6kMrAMpyec\/WU6iqwjJNapbeXf5W\/wCAfF1MPWo1JQvo25J8t9JP5dNdvx0Obn1BQmxmAYknkngYC8txg5wPWt6X8SPz\/BM5p0ZxTlZtdXbS7fy+7UzTqS5PCH3yvPvXXdd196MDi\/2jPFnwX1dPCumeJdPPjIxapd3CQeH570TWSRRW813N5+nTJb3UKxyRDb5rzRXSwfvrYSTpP+M5s8rxUqUa6jGUU1JXbtdOyurp69ntbskftWBpYuk6tSNWOrXKtNd76aNdunloeP6B4B\/Za8UXGQW0Z7rUfMFlea9qFpLBbLawLOqzy6DOnmLetJLIT50rTW0dw9+\/nzKnmrK8n91Jx97ZKb9dddDsnicwhb3I1Lq91KKtvp70o669LpaPVnXXX7OXwctkk8SeHPEtzfWujI+s6hbTXmj3v25bFWvltlvItN06+smdYJIbm2jfzhHKpayuhEyyevlPD2Gq47CShWnGnHE0m4yjNRUFNXSlK0ZRtfVXVtVdMxeaYiMo05YSUZN8vtEuZJ3tzXTd7avS+i36r8vvCn7FmpWPxw8cfGvWPj\/44+F2t3viC414a58NNY03SF1\/TjePd303i8ahpFxpt\/d3rz2CX+ntaG2luYdQlu3uXntpU9Ph7gPOsvznEZjmfEWMiniZVcHTwkoRhPDOV44es22pU0vecV711e1j38VQyrM6FLE4DBSwmIpU1GvCLcpYiqvjmoLV33ty99t3+1HhHxz4gv8AS0XUdPLJsT99KrnMRRJHOAmVwrHZLgI5YuhYFa\/YHFXXKk01G7jGTUpNK7k3dcz+1+Z+c5pgcLhsdRcKtqs5e9HWLUmveTXRq1ndafLT4E\/aE+L2u6F8UPB+h+GxaqdeXUNWsrK6kmkgu7exurXQtS8SyNbxXLGDQLU3NvaRzbLe61S4s7h\/3EMtwnwnGPEVXJ6+U4XB0msVjnOL0bSiouU25Nci\/dqTs2rySS1sfqHD+WYDE5NjamMSlGjTcpRaSbmrezs2k3ao43s3a+uiueGaxqkkx1bVftckkiuzW8reWbiK4mDoFywZzLg7vveXIo8sggkt8ziVUc5Vpy53USm31TkrtWeu\/wDS2PlKa\/dp2cYudTli+kVLT8PN\/fc9e+EXxetfCPi\/RdP1O5E1n4hs7Z9XiSSPbpzTulvBI6bQYwxhY7woEihMBwSw5YVIe1jBP3tJtJPa+7drX06lVoOVNcqWiu9tkkfrl8Mdbk0LW7ScXSXGlzGAwSqct5UpIBO1ACoD\/MQePM+U7VzXsUovmjPRxTu3v07XTe\/4ddL+LikpU5wS9+z\/AE69d9PwPlX9rKW+sfjZrxGt3Vkl2dA8T6XBpviC\/wBEiWQaFapbPcSW89nHd2ss8V19p0ySTUNPvpVRb20lVkjPzOZ4mvhMVUX1x0Iu01CzlfmvqrKS1stN9Hpqd2XYbD4jDwcsJ7acW4ufuq3LZWV2ttD54Xxr4qs9KSzHiTV5RYKIftera5okmrtKszGcz\/Y4L8X020s7LcLJMsBL+TFFGWimhn9alBz\/ALRxNblSvSqSXLLW2ul7L4ktHpr57Vcnoyi1DDxUnteUbLW+vey00Mw\/FjxMCQPEO8DgP\/wjyybwOA3mC+gD7uu8Qwhs7hFGDsHUuNLJLnbsrXvPp6ROT\/Vug9Wld6vXv8j48uDFb6XLrN0LiCCxgyJpry7ljhZdqLEZItQupbUuFAW4m0+4RgihkkUhh5LwcKtJzqQs0k+Zu7to3073a8zqc5qXPGTSSfubpu2l+vy\/4N\/QPgQNb+ORuIPh19r1W40SVG1JrjQ9WurHTLuUgeVLqdxALOe5MZ3Jb2LSyyRIszJFAYzXTk3C+IzWspU6kaGH5klVxLnFO61cGrppdW3dPT183F8R4DAxtWm5VkpOdOCu4tXsurelnbdbLY9U+LepeMPgRHHo\/iQI2v3mntfabayW0+n6Xdw+WZI1gmhuhLOiO\/lXKAwNBNvhliimjMY\/X8k8O8LGMcXLMsViKuGqRm6dNr2DlTfM1C825U3ayuldWul1+LzDxBxFOryQowhh3FypSlJqpyO\/K5LlspW6XbTS0PkPw1+1x8KPiBcXmlfETxB46sUgu5dOufCV34XtdT8PTXLRXCoNU8VaJNPeXHh8vJC0ct9pWnXkdvLLBcRT2iyyL3wxFLH1Z0KUaknhqjoqnb7ULpyumn301X4I+wh4g5fQw2E9hD2OPcIydab\/AHfvJxbS5bSd3s3srbrX7j8N\/tOfC\/WvC9x8Gvhf8UdFuvGX9gStpnh7U9Ytde1vS4YA5lstLms5bQ6xp4giZ7BZ7iS90OOPOt2cempCF2pZnhoYxZZHF0aWL6YSfMqt5fac5RULO90uZ20vqZ1ZYbE4\/B46pUpV41JKrVcJ3anK19NUnrt02XS\/jvxhbwxc6x4av55Yp9V8KWF3oGixT6dGk\/h+CWytrW8jS\/nhaSb7ZaLbw3EiXZM+xjfRtPDbkfO8V4bCueGnOMatWm26cnvC+jtZ9VfXb12Pp1m0vq31SgvZxlbmalK84xkpWaslZ2XV\/mfPvjTxt4e8OeE7+\/vNRt4PsjG62xgM08NmGkkUq0bM08pMYjWN1DsI0YyNvkf4jH14UaNStPSOnux1dknotNd\/N333OVVIpJSduys7efpr6HFfCDxBD4ltdP8AEGqSynS\/Ht3HJo\/iVTuPh7xLJbJcN4E11lAjiiS3tXn8Lai4gTUbG2ntGQX1gTf8uV1KU6arTTdLEr2kalv3lHnulBxasrLfXtppcjmlJ6O6k9FbddOul\/T1P3e\/Zt1+\/vfBum2+rec9\/o8qWcxLM3n6cZWSG4QOqso8ltwLFEUKpmJMgC+5CUYrlg3KCWknZNu\/ZX\/VaWfVHBXhKM5uSstUr97p+mv5+iPWPj78P\/CniO78J+IL\/RdI1PUW0ubSNQnur2WG6GmWr3Qsr62022LXery\/a5oNMaO3VG0+2mn1BXaa0htbjycywFHFS9rUp88mlG99lG9l9z6dfUMsx1fDxdOm0o8zl21dvTb8dj5fX4G+CNSZLqC+u9K0a5udV064msp45NLF7LOlvHbRfbFGuW02n3EKrZG3ijE7Pax2l7cWZmivfE\/sWhGEo8srS\/C7Ttt3XTv1Wh6n19xfNFKUu3M1dvR62ttrbWz1fn5TN+zZKk0qzXV1HMsjrLG3iOxLJKGIkRiumBSVYFSVAUkcADiuB5BFt\/u57vt\/kdSx0LK9r2V9b6+tz8s9f\/bN8E2EFx4Ps10rUPsV61ldaNprQ6Tbi8sruWAJJPa22n3N9JDcYjSKAagLkqJUE5J3ZRzzCTrVcvp4lVa1WcadKHPFy5pNJKMVJtyadkre89FdanLz0aV6lVR9nC8p9rRTve2y730W7PRb348+KfhBp2leFPB9y3h7xV4qg0T4k6lJa3ErJo99rPivT7+x0OQnypp10vwxpWn2LLLDAbh77UZ3iZpnJ\/pvKsFSweW0cLUhC9PL4V3TlGKk5OCck425r336t9LH4DmuY+0x1bGUZ1IxqYutSSk3ZLntGSu9raJ7elz44+Pf7WHjj4t614X8U+JL+91nxF4zsLzQbfR4HU6doPiHR2m0vUtJ02AziLTLa31KWG7hiZQTaaj593PM5klPBV41w2WUcpwuXYS+LzWdbDKnTg2qeKw3uWqpJuDqz0akryu\/I4J5PjcbWrYjF4hKhCU5wlVkop0Y3knByaVuVaWv5XaPd\/2ev2H\/ABR4hsP+E+lu2fWLu+jOpWEev+FodKja6sZLyOMaVqtxb6nc28Ol2F7e6hfWKrbGzsbi7uWWDTXeD28FgcvyassXiK1aOYYmKxNfDQT9jB1GultJOTUbPo\/Owq8MfjIxhGjSqYWhaMaklq9LKUZdetmr2tpqeffHb9lz4n6t4m1rSfAXw98W2\/jPwMIZNe1hdMvtFXwylykyWd1f61JHAbGG6gWZtOkNy91dQl5LEXSZrw+LcsjneGi8oqYWGZVG3DE81OLpO+i9qmmpq75k3o+iPUynFPKqvtMY8Q8OkrRSm7LqkntHfVbo9V+JHh39rLQND0bwx4u8H3OqeKfh\/wCDbSfxlqdhoHiBI0tXlvYzreoNDpqxPBvs50vNduUt47+a3luX8lEMVt5WK4XzXGZTgKss5y2eJwuDlKq5xi51a8brknrdydrW3adz6CjxnKjiKlOrluLhG16dRTc7W1UVCN2+bSLS2TvokeaeEvgr8bfFmv6R4e19fhLqGseKfEcPhzQdFPjzw1f69baiEiuLGO00tfEtxZ\/Z9ZuLiLT\/ALbcw3TTzD7HZ+U7TOfy3JcyyrEcbY\/g3N5Yyvisuy+GOljY4WpDJsRWrP3cHRxUorD1asFdypwnKUbNOPb6\/M5Z\/HIaHEOHpYaVGvJf7NFr29KCsm5U170U9W7pd30v7D8LfD\/xE+DPiDVdO134U+K7TwVqX2+3+IvgXxP4Z16Pw3f+GrRNO1K41HSdZ+y240mXR7TUNJ15PtcllqPhq9udP1K38uRbfUpPrMxyOeTvEeyjCrgpSk70rSjCDTd\/d5kmlfbS8dbWaFk3EFLMMPCF\/Y4yEoRmqvuQc7q6p8\/LeN3ZWunquh+tX7P\/AIit\/D8VnrHhbW7rx18O2zZi\/Robrxb4SiYCRbHxTp8CrNf20Q3ww69ZQfY7xLZ5J7fTbtxBN4VGo6E1CNaFenP3ornTqRvaycbuy20fovL6ydJY+hJr9zVpK8re7CaSs7S2cm3eyb0u9ev2T8WviBqmj+HPhhqPhXRYfE2k+Jf+EhWWe3EFwimzOm3lvJaRi\/tdSKz2qX6TQwW0wikWaOcQ4ijm1zDHRwXseeKft\/dUGrWdvis313T02OTKcsniqmJhFSSw65+ZKXvJ30va2lt+j+bXz+fin4I8UXcWjeJvhZc2u6a51JVjt9V0+3+0xvHa3upaZYPY2a\/a7ZbncmqabOZbITpNDIhO5+dZjh5NRnGLi9+VXemqsrd0uvmdsshxNNOpDmclrFNSs76bffp5fI74ftLeEbQC0S68ZMlqBbq0vgjTrmVlh\/dq0ty+iO9xIQoLzs7tK2ZGZixJ6P7Qwq2VX\/wB\/wCRl\/ZOP\/kh\/wCAy\/8AkT8Z7T9nP4C61qFvrc3wt8NT6zBfrqMd3a29\/ayvfMwY3dwbO7jS7beolLXkdxH5zSSHMkjM363R4D4Nw+Io42hkuHpYylLn9rzTkudXaaUlr81puux+GV8\/z6vTnSnjq1WE1yyh7OMbxb953TurLVq1r6LQ9hX4HfCbX9aOp6r4S06+1yZv31y91rd1Mvk\/Pmcw34jiVPlVIo0dwCsSxqqqtfYqphoOdaUIOp7PkkmrL2aSXLG6bslrrY8SnhnUmqSk53Tfv6uNS7av1Sbd9OvTofUOl\/8ABOr4TeDJoNf8O+DvA914jn13Up75JNTltY7HxAqJHrl1aT6v4guLWK4sfOjivGuLHRHa3uZZtPS8tHuGX5DB4rJKGOxk6OB+rtydenUlCFZuvN3xVS0pfuvaPWDp3cW1omj2quWYx0IRdZSj7NKUI89uRatapaa2d0u+2p9Cad8B\/EvhvRbnwxY6PbQWOojTvE11pFvewWcd7q\/h6+0+0lsL3zNYg+122k3OvOAWS60vU78bI7WeWJpbXermmAxVSOKqSu1J0Gnbm9nZ2atdO\/KtOZNK70vY1WExNCi6EZRtKKcbNu1n10Xztppon1bL+z1rkNjcadL4I8P2+nxW\/jKC8ZtQ0KSSxGoyajZeL1WRNQa6gv8AVY\/E+oW5igl+13llqCmyCi3sntsqGMyvDykouXK5OSUU\/ta67Ld6tNarXezmrgsXiElKCnBRS06tJ3dv1unv0sdC\/wCyvodlP40vbzQvC9vqDz6vNd6omnWd5\/bupeG9FfSrHVEu7a8nu7S+bSfG2p2rzTxRy6al0QA95Bb\/AGHhqY\/D2tCNT2bunG6T11s9Wmk4rqrq+urT3p4GvFqUnSlOL0cruKV1fRptO1\/nbZXR8DfCr\/gjB+z18GPjX4Q8WeEPiL4yTx\/8NPG3grxnoGkeIry3vLQag3jKDS9Pa8tL\/wAMx3l34VtvEktvqunSwXksGuSmOD7ZCtobCLyo0cmjV+trLorFycnOtGMOdtbNNNNvXuj1518wqUo4T601RWkKfNJQSsk01Z9bWstVoz7u8Q\/AQa\/oOp+EZvB3hrxBoPiubQdEt7uS+0Xw\/p97pUaahq+l6JbaDJNHe6WdS1G3ne5c3kLarqemw2x+2iHzpPVjisFP3q9pQ5XN0ZJy5qiX23tKN7Jre3Y82eAxsE40pcmtnUi7NLX3oq17\/aV7PQ818N\/sV+DPAes29x4H8DabpN+kGiavY3OjeLdX0K7K6zKIobjTtPj8TWt0y\/2hb3ltK0cQjlNm006m2dGbnlg+GcTNVcRg4KbbsoXhCMk97w6PT0Tte6sdNHG55hYewoYqVWMdX7SUnJxtZLTrez3879tnxx4j1Ox1y10bxGsceraDa3Wl6bCmrR3ksVj4qj0zWZbmyu7K5kWU6tFBpl5\/aFpKblpVUi7EkjJXmZhLgyliMXh8bgPcwOT1s4qYytUnQwdGhQqezlSliK7p0lWtepyKXuwi3Jp2T9HC5pxXCnKrgcbKiq1WOHqUKcFVquUmlz8i5p8r0e3TS+rOKm1XRrOKSC4hgsYUsbLwvLEJ7i2S307TpJVg02KATAQLA89xHdvCkckiLHBeySLBbRp34HJ+EMwwOGzDAYXCYrBYyhGthcTh8W61GvG6vGM6UpRUlFtvmaW6TbMnxRxcqtTD1M0rUZU24z9thnRcbO11GpGM3ro2lp95a\/4T2wHC3+mlRwpEFsQVHQgiLBBHQjgjmu5ZHw4kl\/ZcNEv+X8xf6x8T\/wDQ7v8A9w1\/kfmTbfGPQhIY7FtTmQyN9t1JYodI0cQWvlm4NzdTR6lcnJYRgbAZWlVVVDIjLzy4khGN1FSaeiWrt969b\/gcSy6hN2UpU29ebm2tq+j3St6bW1OvsfFmqarDDaaNqM9mLpGmhtrWG1t9cubfLhv3017aveRsZIFzbLY3Ek0iwpE5Ixzz4jdROKozUXFqdRO0YptbpN69btrpbqawyujTmqkK8OdXXIl70\/Po7rr59un6Eat+3j4O0qy0Szgg8UHVItS1S+1HT7rSlsdPt9Q1WNr3UJ9Ouv8AhKL+ZdTt9Ulim0W8uNF0ifSYzdQ3dvq9xdHUI+GlR9rN1fbRcbWUdm4P7L3u2tPXW2umlXFqinT5VJy92cbe9tyuMbPRvpZaO7salr+394A\/tvSNZ8ZFoYLO\/ikntNC0211TVxpEvifQPFbaMLaXxDa2kvm3OiXUSPJdLJBBrF\/JcwSNFBG+c0qd6cUuW\/Nrq7u6vsrb9tNFsjeniKDjGpO17KCp2V4paqW6v5a\/mzsrD9rrwp4tspJU0vUpoJ7XxXGz3emy2z3EmvLZAXV3YR661pcpY22n20n2ORLj7TqSwajBcadcWkMSYVakoQcko9WrpPq\/P+rff34eFLEWlHm5XfRNrVaaf1\/kb\/iX9p21vtA1i5stLnnS9j16QQ2umSu9rc+IjoVvb6k62+srNdWuky6QpuYFSCSVLphJNapCZhnSrqc1FTUb3u5L3U0r67fj3vY2xWDnCjOUYOTjbZvZtJ7q\/rtc8m\/4bM0T\/hJrnWR4ajtfEcbaMpkubOWSU2+meOZvH2qW0rtqcc13p2oavcP\/AGXGWiTRLd1cHVJmZn9ZUHKKcZqd93G9lt6Wb8r9D5yeLUJpcjhKN0+Z6Pa1utla1vv6HVaF+2HBb31ksOgyNb6ZeadeadEqGG4hTSR4iisrUXkupgSTz2uvyQXtxFFEbuCyuoYoLdb4\/ZtPqjcPhV2use\/W\/wB7d+vlvtSxdWpJu91fSKvZ2TstGrp2Xn+RoQftZW8N6b670d9MuZNL8M6ZZ3dxaGOafS\/COoapd6fbXNqNYE1xE8upbZ1eS2jT7FYMnmNbRYj6tKyjZWi207aapKys+3lvexrFupKV6cqd1a97XXbb5\/JfL5y+IXxU03xH4s1XxF4dkbT7zydEOm3FxM8FxanQNM0rSbZIpM3EbzJbaWPtC7k86Sd518pQsDeLxRw\/LifKv7CxmJ5cqxtPG4XH4aWGc6dTD42i6FZKcXGak4Sbjq1CaUrd\/TyvE0ssqzxVGnUWMpyp1Y11Jt3p3cE1Zqy6prXfc8vTU7nVtQudYur21uhqjzXF5by3cVwt3J9pMsskK3EpuI5XYSJHJ5cUOxURJEjhUL0cNZJl\/B+Q4LhjJqKw2ByyjGjRpXlN+zVlGTlJtuUrJ3vfou5hjsRUzfH1czxtWeIliF8c+VOLV3aCikkla3X77Dlv\/DCKqSrAsqgLIrahllkUYdW+c\/MGBB9xXse3q\/zGX1bCfyv70fml8LNV8P6hqFvd+I9Ot9d0uK5F1q2lTRJbI1rkBItMSGWKOxTJgLqWtxcJDIszuGKr8HHGxTXMrrqkmn9\/b+rm2HcZQWl35x0\/L\/gWseneLdS8P3\/ii71zQdPm0\/Q9Jguylpd6rZwLb6HJPPaW8tteXF1eQ\/2nb31\/bm2sUdI2jsWPn3puylv6FLE\/upqFNx5ndp68ytp5a262vvqZYpJSg0knyvVW7+Wv3\/I7H\/hYfiDTxcW8HgzRbmx0j+yby+MV5PY32p2uo6RNPBDbfborm9uIrez0PWbfUrNhc3PnulpJbzO91Y3OlGrdx1aa5XNJS0tq9l0t0Of2kmlHkT6cz5b9Umtb36t2vrv0OB1rW59NuYGvPDOiTafpY1GwurpLua5s1sbi\/wBH1CwvVlij0W6livZQh0tmX7TKi6siW0CK8UHXOtBpe8737S81vb7vwMasLcraS1d3pfbyvf8APsdra\/GS8u20e+u5rHTpNO0qOxWSwtXhT7JYwyQwXGwBYHuYjAY7aWMlo45FVUjiMnlqp71JRXxWe+m7b6\/pbzTZ20MR7OWluTddNet1bv5dNLnqafGrRvDd34Yvb3xBZ2tt4kRoU02bXLSx1Ca9VoYhNbQC5MU0dyZZZ0S62GJ9sckQZpceRiczwmFqRpYmvSozk1ZSau\/LRdfu1+71aDxWJhGdCnOcJOyfNa76K0mnbztt1Om+ImtaTqdkviKNre1u7SDTbqFJYfIu5bO9vTYGO+gEh3TW1wtzHNEqoMbZIpD88dfUZbXhWSVOSnTmuZyi9LRXR77a+dttTyM3otJwrwdPEUZfA46tS1fvJcr1VtHe9zg4fifpzPHHYWMSai42y3bhk3RCLzP3UCO0cDztvkQRhhskJBUFyPZcf5XzQWz8rdnZr5q546xUU0lSfPolJuybeilb11fR\/NoyY\/Fd9HvmuLiSaSdwJI5XNw6opYghpH3OTPuEab1Ty22kAEmocVNWk2knfS+\/y\/rQ1liK0fiTttf+vlfp66XS61iVmt2ikikiu47kxtOqo0crbGlwZAFTcWHlqC2cNvYNhZNqaUY8qd0m93\/n5fr2BYjmu5Sab0e+q1te3l0138xlr46urS3NopEO5Xhi+UzRwqkD75UQuoUu5Lq8S8KOYsRqAexptuTer66t9PLt5taWv1OV4qUU1dpJ6K2i17evl8jhW+ImqyMzm7tgXYuQxXcCxJIbKE7gTzkk5zkk0ewpfzP7mcbxNW7069\/\/ALZfkjzj9mDSdK1DRbl7\/TNPvXfVdUgdruytrlngTTNOdIWaaJy0Su7ssZJRWdmABYk\/ktP44+p9xhUrbLafTyOO8Tqun6nqAsFFiLi2e3uBZgWwngcyb4ZhDsEsT7V3RvuRtoypwK+kw6XK9F06eR5+Ib9o9Qtoo7y+vhdxpdCO40m2jFwizhLaGSMQ26CUNtgiDMI4lxHGGO1Rk1th0uerovifRdzB7P0ZfttM006hpaHT7Io87b0NpAVb\/VfeUx4bqeoPWt5xjeHurfsvIwbb3bfqe43ejaRFa3Ii0rTYwHKgR2NqmF+3ou0bYhhdoC4HGABjAFddl2X3I1p\/BH0Py3+Imo6hD8avGEEN9eRQ\/wBt3Ft5MdzNHF9nt4W8iDy1cJ5MOT5UWNkeTsVa\/lzjarV\/t6sva1LLlsueVltsr2XyPvcnSTwSSSTnqkrJ+qP3k+GGmab4g+BHw81PXtPsdb1KT4fzGTUNXtINSvpDaSPHaF7u8jmuGNrGSluWkJhQlY9oOK\/dPDic55VRc5ym\/Z7yk5P+G+rbK47hBYvDWjFXoyvaKV\/ep76a\/MqajpemJr+iMmnWCM2nyxsy2dupMdvp\/h6O3jJEYJSBHdIUPyxIzKgUMQf0KLd0ru11pfzPzRpKTsravb1NiWKLES+XHt3TjbsXGBBIQMYxgFVIHYqpHQVsFfaPqzibKGGVXeWKORzKCWkjV2Jy3JZgST8q85zwPQVlJvmer+\/yOY6Gys7OQ3AktbZwRcgh4ImBBt1BBDIcghmBB6hmB4Jqbvu\/vZrNLlei6dF3RyD+HtALuToej53N\/wAwyy9T\/wBMKLvu\/vZjZdl9yP\/Z","a_rank":"11","a_hot_flg":"0","a_views":"271","a_active_users":"280"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F1000%2Facda1424222ff6c704a521191d5106ba","a_title":"\u30a4\u30e9\u30f3 \u7c73\u8ecd\u306e\u5546\u8239\u653b\u6483\u306b\u5831\u5fa9\u8b66\u544a","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:49:17","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AN\/V9aew1dYZQkFpdzCKCR\/lZJZUzbyBCCEzIJogmeXZSQuSU9DDUPrGGU4x5pwjKoqbf2FrN819Grxt7r31extiJxo1Fd3jUnGnTltzTbelt1vu+6XmW4glykk8jZN07IrzKxUEJveIfMBvDq0jxqGZUBLE\/Ktc85clqdr8vW7W\/lt03NIx5r62sYWoNFZs1ltZy1zbxRlyFKNNcxHkSEBVWNlPmjICyAYL4DdVD3\/3m3LGcrb\/AAtaX6XtvbTzMar+x\/NOML9Fzcy5mr7K3Xv00ZIZ3iuZ0UQyXNtskdiS4lVowZEAONp8to5VwdwcMhwjIaFqk2vcm3eO2z2u9LavpbUub5JOO9uu1\/w\/JtCab\/pd9PhlEMjmUKGIRiWKMrLgABWRWxnAxtwrbgdcSvZUqWvN7OCh2vZ79bb9um\/bCn+8lbbbXff7i7l57hVFxH+4Bnt3VVV2LLlCuwrgSMrDJO4xkk7mwV55yjG3LC1731\/4CNG4zk4xlfktfTe\/lfy7vf74tWWUxQ3LMAga1fcrBnmWbyQ6hduVQMzZGY2YxFpPLC4ow8veqwSvKUKkYra\/Jy3f3SWmuvdoKukVK1\/dUrf4r6fK2\/mU7uSeee3jePCM0ixHG0NG25mIGY0HyI6AEkHL7ssQW66NSnCnKpTV78t43S2cktbd79LkuXM4rbfX7vT8\/vK6anJaQBuWuEk\/dgrjbGGl87G0gN+58wEYVY33bsgEgVKnWlGDjyw15le\/MtLdFa2vcn2sqd1H7W\/y+\/v0+TG6gDaWW6OKJlW8tEVGQITE9za291GWMm1s2+1SzK+6JlIbbtFXh5qeJeiXPTrOOz5Z06cqkJ6pX0g420+K+trMqv2cVLf97QTW14VKipyjeztfnvf+7a1ndaqQyXNraq2xdkUZDjYrbTI8cQKhgWVQu0hF4WPJyxy\/HOap1a3u3vVlfX0b\/M2kudQd7Wio2tf4dne\/VNehSfRpy7EXSYLNjBBGMnGDhsjHQ5P1PWn9bq\/0yfZ+f4f8E2dUgsNQmuLS4bfbtEII3kjj3It2ZEC7ir4jjZCwJViC0BYFmGccLOth4U5UXecZqV7W2uktXa7u127p6mlX2dXnpv348ri+msrWeje3L872uZuiES6fBbPOtxNpl+tgWilAy1myxo8y7iwa5jW3lkiZhIS2ZGKNLv2xsLYiVT2U6Xt4Qr2kv57+6n9rltq9PiWhz4ZyVNU3LmVH90n35d3a7te+13bvrZGrJFe2N3qHmITF5IlQhS257oRoQA0siPID5aIFZUIMQZcACcLKpTq0oW5OZyfNo+ZK11a\/nbf8d98Ty1qdWqnbltpZPWSet76NJdV1KOrzR2VlFcXMINxYmaykdxEDdQQieJ5GeUIf36WiGIkg73CZwcnow8alWu6dK69rNzp0l8FOStrG1tVd+unbXKvOnToRc9fZxjFN\/HNO93KVn5W00111OS8J66JNVu9MnKiYvugkQGeORbmc7ZIiWKKI0eABg6xsGaUq3zmvXzXBSWEjiqSThyqNSLdpw5LcrkunM5O3e272PJyvGf7RUw09ZRmp0238fPdyi0l05VbXW6ulY7y4W4iWKcJJG6y3NrIVjiEbNItxDbbGCsCApJGGKgBGZiXIrxKDpz59OfljzvW3LGN+Z7O+8ex60lKO0rXvfT\/g+fy6GvcRLdwRxeUYTJZTGNWUbSWtySUJDhQoYyAttAVQcglQOSm506jc5e0s0108\/wC8unT72dEo+1i435fxTv3Whxz3DSANKRHLEUEcRdxtaR5nKbWdwSA3lKCGALyKvzfKO6EffUb\/AB9bbW8rnGpXvpa3\/B+4qi4Jsoi64V5GABHSWQuIhkB5DuWVVVVJB7diN50\/3tXX7PNt\/Lpbfr3\/AAJU\/dUuW176X7fL\/I0TFNcRy2DbmkaxnYyeV5hWR5AuQpLIzpsRkLZKkqF5ZisxlCFVVIwsnUp3jftzdbeb39LlSjzRnHbmhKF7Xte2tutrbGja3rPaWRZWSSOJYpyyxFlePbG6ZUt86yoRjJIkZwN4JFclan+9m1Leblt3tp8rf1sdMJc1Kn\/djyb78ttfm7\/k9UXRKpAJmKkgEqTcgj2IBwCOnFcwytf2st1bW6oZo5J4bq1leNAUn3PO8cjuSziRDHBsQsoAkLR4jAB2hONOTjOnCpadOSclty817dVe\/wCG3cnTiowjHS17ve\/w27WtbzOU8JRy2F\/r9kIpI5Wv4ryWWVn+ZN0sBKKxDEIVXfNwGM6M2FUA+nmtRVMNgqntIT5KU6SjF396PJyq60jz623ty6XvY87A0fY4jFw5JR9pVVRSkrX5+b3UrtPl5dXdb7X0OihXZc3elSBFinjkDqWYyed9uhv4HkBYMqKksIVQVJabazeYhU8FrRhiE\/fhOL7+79X9hOPdOWk7625bNO913QabqUXrGcbW2tPVQk79IPm0dr33VtV8Sr5qSMiLI88ZeKF4w6+fb27y7QVV\/wDWhHONxfczFAWJYmAq8s7PnjGHK3OM+X46sYJNW1+Nvdbed454uFoSa96U9o7bWvrfZaX8r2fQ8MsGhTxFYyIJIYLq7SMOPkV0kmBiw\/dY3aFCq5cFAXIYhh95VjVllleDUJzhRlzKUL8vNa27Td0u2jSPlKcqcMzpTScY1ZqMXe\/M+9rbxdlbbV9tfpC1Iuolsrj5xJNAQpUY3Exg7A0alWTKglskckckBvzWsuSbr0v3cou38z1v2t0T\/Q+1hGVRRoylfXSVtnbtfutr\/eRyxTxxx+Z5ZQMFBVgTIhUpJhmB2g4eE\/MP4923BItTpzv7NNNfF6v\/AIN\/vFKEoW5otX2v1tuc9r0SxTo3zJNII53fGACZWWJwSRuYhGn2k5VCXZQVxXZg8ROVL3lfS2+zu7\/gl5ddTnrxvUl0abv\/AJ+Xy07GPcyRvB5rSouySG4PzfI5hYTSJGyxgAr5O3neRyejZTsoaylD+eLhftfr8vVL9MaukU19mUZfJdPK+yOieWQ2c9\/CPMHnMkbIkgSW0VmjbesgZfkYeYwDhsMy8iuP\/l5Gi3acW7+Tb7X8n29WdUo81NVVfkvaLtve3npbS\/rvte2kca20kow4ldH4UK8R3yLnEhDFSRuBI3bw21ivAx5r1lG13G99d27abf11QRjZXv8AF07W\/wCHITtYkhZSCSQRswcnORkZx6ZrSz7P7mUaFvqVpGz\/ALyRYjNK62keXQBYDBE6gny2XypHjV2Yq7L5oLDAbllTqO3u\/iutu9iozUb367fL\/hzj9bv5LLyNRtZLZJLZkWRHDRq+ZYYplmmO0eWI5IIwG2t8gkwWaVm9HCUI1l9Wndxna7S7X6fPXXzWxy4mrKjTdSP2d0tG1Z9elrv7y7NKmoy2eoWiwlpWUSTAFWeCaF1VwRuC43IyjIDFCjlZH5zUVhoVcPU9zli5qOnuuOrXRvmb3aTSXpaub2qp1qa9pu5T2vazvazsk011+K3ka2piSfTF4Vb+0Md0in\/VOfLeOQxqVA2vGZcurZKB8qQ5VubDQ\/2luT\/dVYTjU391uzi1bfrpptf03q+\/QUUrSpzUlO93Zt3VtLrvr+p4xcaQPs0lwCkUtreyfYZN0m7zZpo5rdMuu10lukuoRhSA7KWKhWFfZ0sVUjUjStOcK+HhHEKMb25KUKdfqt+WElb+Z2fu3Plq+DpqnUq396lWqKjbVKfu+zjo0rxtLXZt6916xHq0JWI7CskYEhUiRC7xAMJBliVUZ2EMVIwcnCBq+SlhpJtydr3tpdv72vI+kU9Fpf5\/8A6G21KK8SRmcksskrRRrIiSAMnl7F7su4rt+dVLldwZhnjqUpUuXm+1e3yt5+Z206tLW8n0+y33\/wA\/zVlZnNa1cxXWrWyxOHCQGWdJcyLF837pAGDKfMZ2Z1JZUijZ2CEkS9ODpzhQnNr3HPmg9ubm0lp05bL1vsc+JcZ1I8sr83NdWty2t997vW\/TzKGyOTfDHHMzJEMwhMRrIMtGZWwzGPEbpkRtwzbgcZHbz1uWM3K0J35Zd7fF10tdd9zmtF\/FHm7eV\/kXrd5ooks3uoI0mAHzB0t4wySRyBYn2NuQuw5lIA3BiSOMakYc3to0ZS5fsx1av3lbROz6Pra2psuaFNwjNK+t2u3fW9rvvpchvJp4Yo7cTxvHwvlwPKFwhyHUtMUAARACdygFtoTIrShSpzqSqONrctldPo+tvS+mpM21GMYu2rbdt9uz0trtrZ99SymhXLoj\/arY7lVs+a5zuAPUSYPXqOPSqeMpJteyqaO3wGXsH\/z8pf8AgT\/yI7DbLfR2ZCp5s6qGmdY4w\/HyuwIzggqFLAAk7gSc1zVKlqctOsevm1fbpc1p7272\/r8fwMHxHbNff2jYySiJXhiumwjyKjKgSQkrKrSoJFJ25IQAgxksHrry+v7D6viOTm9\/l5eZr4uvNZrTXSyv5LbnxcHiYVqN\/Z83LaVr6a9Lxv23SStZG9Yw29rY6ekSk25t4IQNoQqCFVnKfdDLIrO6yBsBpFbAII5q05VK9ec3eUqsrvvtbf8Azt+Rth4Rp0adOCtGEVFLfbW9\/O+q6Pq7lTUJLlbiDmSKONFIlcMQ6GcxybAzFCqIuUTYCq4LoQwjCoSpTi5fHe2idrfOzbv8rW69KqKS5eZW33f3p7WsZV\/ZTyySaciC3kuV8zz4dsmY7W5t54dpw65DSz4jY79ygbisjyjtwteKarSquXs1OLpuPL786VSnKPNdr3W1K9kna1lo1yYjDS1oRhy+01cl3i10e+\/ddfUlitLxoDeNBuijbd5SgmeJirRs8yCQZLqrMJEAQoQpj81cHGrUoe1jTg7b3mrOEtE7xel7a3vbpa97m0adSNL2nLv9hu0l1tJWdr3ut0+nc0EvJYl86FvNbLKY1CJu8iQDynDGRUCk4lJRsFh5gbIC5ujaLjUjdS2d+nXp5rr\/AMHX2nl+P\/AMYxme7fUJWKTSBUkjQOGPlARxSmVQqcQhEC7lViFYx8Fj6MHyUpYaKXLT+F9ua99Pkuvf5YyjzVnWb96StLz3t6Wv87LU34Le3jSOc3CiedtxSKbAAIDkPIoABJILlsJkkDAGD5lSpKUnGSvybOpC17\/yrmfbU6\/ZRhGMo\/bburt25bbu+t+bVWXzIruISoSwcMFMjPuBxIxILZXgdjwMYbaSWPN0avsub3ebmt1ttfyff89yJR5ra2sUYbiMGO3zFEkdw7mVbdTMxlKBi+wB5Y0VAyxgE\/PKVDGQ5uUfcdbmnrZezcrwjr9hWXLv7297LaxEJcsVG17Pe9uiX6G6nh64dEcXdqQ6qwIljwQwBB6nqD61m8zpJteyq6Nr4X0+R0LB1Wk+alqr\/wARf5Fa+jnR40lWYRuQYW4E0eH+YK3AcRjIUjMigoQFeNmXCjKK5uV8211Zq3bfvf8ADr0wnzK11be2v\/AT0\/UqrcmRxPOcXEcBtTOrASTQCTfslChULKfk38O\/UjeAx2cPdlFO0XVVaMErQhVS1lFLa+l9ei7Bzp6uN5v4pX37WVtLa9Xp10LQljaBEVozGMAJjJCow8sOVaRnb+8SGLhfmycZzbvKUtua2noVCV4pWty9e9\/L5fMivrpru2hjcFvL2xoXykkXJPDSMrOrhQWdVk2\/L0YAFxpRhXqSire\/zW6Pmvp8rLXX0NZTlKmqbd7Pf\/gX9Ou6+Rq2d7o7WclrcQrHeNHts72NV+0W88KKyoxwRDbTtL5RfeGONuPmDjixNPGqpCvTlzRg5OrRcXySg7XlK7d+S3u6Wd91ud1KphHhpQqtKUtKdVK04SV\/djf+fS78krGFDcTb3uJYXEUJlMjOjRSDy48yO6L8zmMKpYx7lKKg5B+X0VCM17KCtKpZxW9+Xtfl2uvPyPKVS0k7Xt+O3ku3X5mbb3Uks80MsgY3Em+3a22Im3eCkUkfChWjJIVZJWIG5VcttXdxjTcanLKn7GKVWMlblirrmT3fW6sumtnd4xnKcrS9U7bbL8dLbbPubKWkjKSkEqiRJYirooYsI4wuBMC0aEPwR5asitiVSGFc\/taXNKPP8Nne26d\/P7tXc6lrFS7307WY5dNuXjPmPAGBRQu9i67RhtrxlkwhG18uxwNwAUgnN4imuk5f4I81l56q2n\/Dkyje3lf+t0Sw6MZVIFztDbWD7NmAScbcyhmUqeGKKflbocZVXMpLl5abjve899Vb7P8ATCNLmv71reX\/AASY6LGm3arS7lBLGMK6srOSMpJI7rx8sh5BIXagGFx+vVJ9LW\/vXvf5LsV7Pk63v5W2+b7kYiTA\/fRrwOGUbh7NhQNw6HAAz0AFY+08vx\/4AHEeJ\/iP4Ga70saL4l0PVIrTUFuGS6lvrUNZzWSpGy3BtGlEkE7efEogkkmJyZYw\/wA\/s5Zk+KccQsXQq4eVSkoxnSrYapyTjUhUUJJ1oOXPy2TvHl3tLY48yx+HcqLwMo1vZ1VzKdDErmg1dy\/gvl5bK696\/Nura87qPj+y0ktHqOqaTaRr5dyIpQ9jLFbRy+UJJTcxWoFvLMPKZ3BEsqvGp4Kr66yyhO8l7Xn2cvb03zSfwRtTdS1\/e1bV+l9zgljKsbNxgo\/alClUgovon7WEea+vwtW1u9iaD4ieHLi2E0es2RadWkjdbm18lvMClHjbdvMWw5iYhxjbhzlgZeQ4\/RwpSqQe0oxbvbe6vp5O+uvYUc4y\/WM8TRhONuaLn1d9rpdhV8eeH0UZ1izlfAYl7y3ADDPygeYVAHB2hQfm+ZwQwbSrkWP93lwtWO9\/cbvtbttqSs7y1\/8AMVR+c7foTT+MdPTSZ9VS7ElgJDYy3FoZZkinliDrbvcRxm1jkML+Z5ZnEwVd20K6F+ellFaeOp4RxTxEVHEQpTlSpSnSWrlBVKkefpe1+XT+Y0eaYV4WWJU3Ogny1K9JOpSpTV7qUly330drSs9FuVtB8Y+Ebq+R9X8S2cFrBkGRpFR7hVkACyRuqzmGZUd+I1mAK70jdirdmYZVmUKLjgcuqzqz6+zUrWta+tle762aTvY5sLmuXVKidTMcPCC0cpaNX7JO0vO7XSz6r1w+P\/gwIT9n8T2dtcD5SYY3jj2mbacrGiF2aMBnlYjlnAjUKkr\/ACf9gcVz\/iYHEVLbc0tvRKOz83pZep7ss24ZVr4+H\/bsklZb\/wA3la2m5Sb4j\/CJZI428URclxLJGtxIgUrI3yMzu7YBAcBt0jPE2UUTxCo8O8Ry0\/s+qnprZNfOyb\/HW5f9t8NLfGQj192pa\/qrdNlfXfXa1GT4j\/CXyjEvip23Gd0dlk2IwaRkV0QKWZ1MZ3gFN6zbcbVFUuGuJOuBqrqtl18r+du34HL\/AG7kH\/Qan\/im3p+FvPfzZkD4m\/DO3kiQeJrdY5bqaGaR\/PkMVusO8T5VCHV5SkcKoC5CyF0WRUV958M8RSi3LAVpyjbkg7+9zLW0rNdFtd\/cJ5\/kEZRj9doScua\/LVcrctn1it0\/I0bD4nfC3fay3fjVIYHnjWcpFNLcQxCZ42fy\/KdlEKAudsTyNCUeOJ5WRHmpwzxC7KGWVZT1tG7V9Unq46W+ffYf9v8AD3KpRzS3NfTmctvl3fzW2m1qH4t\/CNoYi\/ixY3MaF4yEJjYqCyEtpRYlTlSSSTjJJPNYy4a4kjKSWAqtKTSeuqTsnt19SP8AWDh\/rjaK8vavTyPys\/4WE0QCza9rzp8qKklzPC4jBQEnfEmcuwEbLIU2gFkB3LX7V\/YWULbLsKu96V72t5r9dH9\/5T\/rVnb+LOswdtV+9tbu1pv+K9SNfiFali39ua2QzLBh7tgzArKqRRne7HO8hU8shmf5dokFaLJ8qUYr+zcEmusaNru99fef\/BMXxdnfNKSzjHrmtp7W+3T4NNev6GYvivSDKY\/tOq7MsOI18xyTliD9o84OgdCweEsNxBYbST3wp8kVCjTioraEEoRin2V35s8itipTqTrYic6tWrNylUk1KcttJPS9ujtbW1l1f\/wk+jSYCX2pKACRINjgqXYBgFd2ydjbTlQwAUgf6w6ShKNuZWv\/AMD\/AD+8mNenK+rVrdG73\/rVa2Ot8OfG\/wAXeFPCeueBtD+IPjS08J6++pjVPD0jWuoWDS6vp99pWpy2cF5DLNZzz6NqN9p73WnvBevZSi1WcxeXt8PE8PZVjMbQzDFYb2uNw8qcqeJVSrTqr2d+Rc1OcW7Xerv5W1v6+E4kx+GwdXAUcRFYWq5e0pTpcyk6nxWfMrJ21vF6o80lvNBm8yNdb11GlcSzB5beG3lnMcULyFGjMrs0MMCSs3nARRIrgYOO15XhKspTn7eUna7lisTLvt+9Vvx\/Amhn+LpwVOCwtKMNl9Tw0r373pq1vxv5EYs\/CMF0zpqPiCAyyw3ckMepTJbSTW6hYnEAmiUMdgKoqbF+dVEYLCtKODdDlkqftJR+GpXanLXfW8b3SWt+nXc5q+bVZ8ylKlGNR2lChSVOOl7WTk+Xd91u+p0b+INJVFf7Ze7eV+YsfnPygb1lAbLgkeXvJBTKqu0t0nB7Tk6Xv52tb7+5FL4g0ZNhTU7uTeXcKvlhiq\/OMnzmZQwKovyk+aQoc4NbRjy31vcz9pF\/DeXe6tbt33\/rraJ\/EuhmQL9tv2xlXwytGrfKMuBCzxqzb9rudiBVJZieaH7Sn1k\/uT\/9u17\/APB0Bde0dxj7ddszAhGWSCRSxICFQYx164+oJUjcoCqR15ny9ut+\/by9SMeIdIYBlumZWAZWa6swzAjILDyWwSDkjJweMnrQL2nl+P8AwDyd4poIUkls3inmy7OYoI55DFtSQyBr4rcxZJUPBHGqqXj\/AHCBycZTlO3M72vbRLe3+RD5fsx5e+t\/0W39MZHFJG0R8hfnf\/Q4zLBbvIFA3qBJfpI8all27yjPCzmNHl2pRGXLfS9xyjy21vcmXTdTmxILSGSMLcMZZJrYSxKXWERTLHdiYOFZmZoVLTFt4aSNSgr2nl+P\/AJtJ\/DFy72ev3dfkMmtLmJo7dLaN5LiQQhIJbZ1CwFjKWc6ijIWZ9sgmO9S5DrJgux7Ty\/H\/gAV2tLzzA0drFtkd7czmVbyEyQvsCAx+bGEViciVXjDyMpaECOSqjLmvpawEItLmMzyypaxLEDHJcbmEAO5wd8yxRRFlcNHBCjKGe42lDLvaOfaeX4\/8ABTaTzAtJO8U8ihZPJe2IwitIDAIoxLJ5OVPmSIkGQxSVn25PaeX4\/8AmUea2trEC6VqEghb94wA2MZnghaSMAlxHK8EhbzHGVEM0kcsasNrYUtMZct9N7BKPNbW1js\/Bnw78UeN9ct\/DHh2ybVNVvbqKxhkjvdN0+ytpGiLwi\/1nUPsWn6ZHGkUks91qV3bWoijkZ2VTuTkzHNsuyqFWeOxVKj7Kg8VKmpKeIeHj8U44eN6tTlvG6pxny8y5mro9DAZRmOO9k8Lg69WnXxUMHCvGFsOsRO\/LCdeUo0qd7OzqTgpWfLezt9m6l\/wS4\/bW03wnaePbv4NWb+FbjRZ\/EcXiC2+JXwi1G3bQYLI6sL2AWHxBkurm3n0yBtQ3WcM6TWaGdPOHlrXy1PxJ4PqXSzKcZ6OMZYXELmTvez9m9tOmz9D6F8CcTr\/mAhLyjisNJr1\/epL0uxuof8E\/viL8N\/D3hfx38d7nwv8NPh\/qmvm2n1nVPELa49tZWcNje3FjeW3gOx8UPZ33iHT7u\/Gh2sokvIp\/C3iC31eOzuBoserefjPE3h6NRYbCYnEVp1IKKlTw1VRhOpfkrNzUL0qKjL2k18POr7pvop8BcQLDvEVsJSpctpqnWxNOM5Qh\/Eh+6dXl5uaPvNaWulLW30nZ\/sEfAHVrS11XRfjHbaho2p28GoaTf2fhz4vX1pfaZexLc2F5a3tj8P5rK8t7m1kimgurOaW1uInWa3keF0Y+cuOs2sv3dJ+fsMPr5\/7z1PCq5FmCq1VDA4CMFUmoJ5nmV1FSain\/wgbpWT8z8brf7J5NvstwY7rJP2wwtFJbRBlDw+ZIQkrybpGDhfOEjOLQGNi36mePKPLbW9yW4s7XBnhtQ1vKpe6k07+zwJ23usZRGP9oSqxl5jihldtrKElM3lgK9n5\/h\/wRsjTuxvbW51ORLeZ5Ft7ldMQyRgIpSQSaalzHGkkjxNC7eYZY12\/uApcD2fn+H\/AAR8a6w93NM6edL5IQL9r0meNFmAZHNxLBBNC3kvGs1qrQxB7f8AeiNsIwHs\/P8AD\/gjpbDWre2ljkN1N+9kky0SggLPJsjEkenktcFUMSI85k2sZtoWQYA9n5\/h\/wAEjsYNbukAWC1SSKYI7XNpfzLvZHVy8Kywv5KuyyO7eZgLKF82NSxqMuW+l7kyjy21vcsrbatZRp9oGmmMSI8Fu1hJZQTS3DGWSTT0Sa4VkCSzuYZJxdnzIQ8cUBmlhk0lHmtraxLBFqk0gWabTEjBE0sEmmCNJipaIRJdmWKyNxEjOv77eY4VRZWMjiVQIx5b63uPvU16FUe2vrGys2imJnNpcKw8kpLJK+oWOrKyFliIuAlxBbS4lgWdmjMjeJnuTYTO8FUwmJjyTlCcaGLpq2Iwspct5UZ393msueP2uWOqaPc4ezvE8PY+njKMY4mipweJwFfXCY2lHmvSr02pWfvPkr0uTEUdfZVYc0r+l6T8Xf2grTw+fDA\/aC+Il3oFvoJ0C00Sy8RfEa28I\/2UkDWJ0KHw5P8AFWbw\/c6MLS5ksriC50x\/Ks5p7KMrCESf8wj4VV6dX2kc3TurP2mDw8pvl6uV9euqV1f1t+sVfFvJ6tB0nwhh4Td+apHG4mblpp7telXUeXpySi23717K3OX2ofFK\/uo9Sk8VXOpT28F1ZRWmq+FLC+0qyWS+bV5Zre0v\/EF5apqLXstxcpqUVu14DdX7F4ZXnlX14+HDu+bNqMk9pLB4aNSPflld8t93pr26nh1vETL5cqhw7WcY3tTeZ4iEFe3xRw9DDqaXRTb5dWlG8r7Wm\/Fv4zaTp2n6VYePrbTbHTLK10+y0610Xw7b21haWcEdtbWVvBG3lwQWsMaQQwodkUcaovyqKqfh05TlL+2170pS\/grq2\/8AoIX5L0OBce0ErLJGktF\/wqYjZbf8ujy+EaK0EkMc2vl\/LkcyW1pPcNDHtuMxNMLKRpLpiytHOr3cIJeBY41csP0k\/PPj8rfPf7uwszrafZLeKXXdUu7MFnufs99FdRxs8mBeAwNo8rwpJ5kIXy2DO7PG+ZXbT2nl+P8AwDMYb3SbqdLS51TU5b4eV5drrMBeKabAt57WRgkPkO0UrN9ouI2b7NHcGUTAGRD2nl+P\/AA1I9PjuJJGiGpGG5trZs2dzaTrp6qksoNxabbO+jXhVV2e+dlZALZMPMmY1y680uXtpe\/4r+mVLUWUktv9ihl1gW08\/wBotZtllLcW8VowZZLa9tprVYIriGMRMmoWb3R27WuCqzOA+X7MeXvre\/4ItNLCHMdpbTLqHmREwWNqsK+a1wkkfmQvfnzoRHEizyNMwZU8tYrvZNCtSlzW0tYHy\/Zlzd9LW7dWS6vY2wuPss41S4jnOWltLzw7HDGksHlzJf2uqTxLdr5qbVHnbhLFINtwYzO9OpLpBy767fgCcF8cuXt7rlf7trab6CQJYafLMLe21W+VLdJr0arc2WmyiORpMwTtZGWC6jlV7cxlAHEiOr3DM6RJUZSlfmi42ta7vffyWxMpUlbT2l733hb0eu\/4W8yG5ubWFbvGiJFBHFbsivrNvfwBZ5o8o1pc6lZW1kkBmEg8uNVyojspDG7M02lT+KLXNtfy+8c5UVbkdr3vdW\/rr\/TL2dDvSZYYmkWXMN3FpWo2CQ5LQxxTm1gvL+9nvlEvAm2RPxHIqbUmNRhOHxRte1tVrbfb1X3mftIv4bu299PyvcvzRaTpUC\/a7LUr9rC0e5iv9Qme0ubeK4RkeOG6WSQ2ssUTHnz7SNBFsjkZNrPa1ko7Xvr6W\/z7h7Ty\/H\/gGBBr\/hxoYWGm3EgaKNhIfEng8mQFAQ5LahGxLZ3EtGjHOSinKjLk7Yqpbpqa39PuT\/Qo3F9fPbyb7y6fzXeOXdcTN5iJGGRJMud6IwBVWyFIBABFFPr8v1MqnT5\/oN1bUtRU+JIxf3ojt10YQILqcJADps7kQqJNsY3ojYQL8yK3VQRmaHOpd3SwRzrc3AnfT9zzCaQSuwMmGaQNvZh2JYketXW\/hv1RP\/Lyn\/29\/wC2lLQtW1WW9vLeXU9QkgVp4xBJe3LwiNbxWVBG0pQIrElVC7QSSACa1JqdPn+g3xLdXUOrW6w3NxEryJvEc0iBvJ07UDFuCsA3lFEMec7CqlcFRjOp0+f6BT6\/L9TvrACJdE8oCPzrm5E3l\/J5ocs7iXbjzA7qrOHyGYBjkgGiW+HXTlq6fKJmdf4dijuLa7iuI0njF5cxCOZFlQRefcR+XscMvl+WSmzG3YduNvFZnQZWtQQ2Udy9lDFaOl7fFGtY0t2UlbRCVaIIVJSWRCQRlZHU8OwO8\/4VT0X5nOvjj8\/ziVYJJJX1uOSR5I7fUrBIEd2dIEcQFkhViVjVi7FlQKGLMSCScsDzb4jXt5afZvst3c22LqVR9nnlhwqpPtA8t1wF3NgDgbjjqaxq\/Y\/xG1L7flG68n3N2H500uZ\/nmezKvK\/zSMp+zZVnOWYHJyCSDk56mtZ\/wAKp6L8zKP8SHr+sT06xRGsrNmVWZrW3LMVBJJiQkkkZJJ5JPJPJoWy9EI\/\/9k=","a_rank":"12","a_hot_flg":"0","a_views":"166","a_active_users":"163"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2Fde6de2341d213ad90cfbe61587e44121","a_title":"\u30df\u30bb\u30b9\u82b1\u706b\u3067\u8a66\u5408\u4e2d\u65ad \u30ca\u30a4\u30f3\u3089\u62cd\u624b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 05:08:00","a_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA8Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gMTAwCv\/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf\/AABEIAFoAWgMBEQACEQEDEQH\/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8\/T19vf4+fr\/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv\/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8\/T19vf4+fr\/2gAMAwEAAhEDEQA\/AP4Pp7c5bjnp1POAfUdD65rtk7WWiT0bfn09bf1oVGVtNLX1Mv7M8kqRRjMkjrGqsVUF3IRQzsyooLEDc21QMksBzScFa6u+23c2Wu2vpqV5YWjdopFw6MysvXDKSrDI6kc9CR+FRZx1tbX8QIpbeSGRo5EeOVGaOSOVWSSN0JDI6MAyMrAqykAhhgjIpyvzWl7rVk79L6q\/3oE09nffbyvf7rMv654d1bw7dQWOs2Umn3dzpWh65BBKUZpNK8SaLYeItCvRsZwItT0TVNP1G3DEP9nuoi6I5KhyUNeSSkk+VtNNXtrt5lJuL2s2k9V0ez+dtDEKkds\/TmuaSStZ379TW601328\/6uNwR1BFSMKBXTbV9VuGCegJqlF3V09+wXS3aXzHhD36fr\/hWigk76\/18hqSTumvvRMqcHHA98\/\/AF6oy55KUne927X2WrelrE\/kk8jbzz\/F\/jQHO+y\/H\/M9\/wDEWneH1+F\/gzUEtyvi2fxN4usdSuVkcRTeH7Kz8MXGiRfZ1IhWeC+1DWmluNgnmjuYYZJHS1jSPolJ89SjyRVONBVlUV3Pnc5QcNXy8qilJaXbbs7JnDC8qc5uceaOInScXZcsYUadTmdtbNzUb23btscj4q8JPoEvhQG7sbpfEHhjRPEKm2Mim0GqS3SfZb4Mq7buFoGMhj3o1u0Dly5cDKNSLa9m7xpyVOpzRd3Ug4yqWitWmuZJRavfRbGs1OnCXtLxTpzqRs1fklzKm1Z3W8ZNXvZO\/Vl\/4lad4T\/4XJ4y0\/wpZ3dj4K\/4WBrNnodnJdvNe2\/h\/wDt2eCzge+ulld7mKy2xm5uElYyjfIJOQYp1HWoQq1IKnOcW5U481oy7Rv71mrNX9L9yVSnTjLkk6lONNThUtZzjyXvZWte101q7+hQ+NGvnxj8WfiL4sEUcR8TeMfEGvPHCF8pJNV1Ke+kCeWiptaS4cjaoXrtyMGufCxksPS53KUmrzct3JSalr11Tttpa1tLdNepSlVm6UVGnOzhC3MoxcUuV8zbbvd3et3e\/Up+MtWufEni6wu75UuJI\/CvgTRVXYrIbbw\/4A8P+HrKIKPlUxWem28SfdMTRrgIUGLoQdOEoPZ1Jyjd3dnKctXq7vmXV22uc31mdaiqzdnpTV9dKdR0l6qyeu+vWyIbj4dajonxI074c+KLi00y\/fXvD+j6xcw3ltNa6YNbk09pXkvHkjtEfT4L8fa2klWCCeKVJJdkbPUudP2Uq0FzxjCc4tNtT5E7qNnd6pr12OpRbqRpzfJaUYuTslBSaV3\/AIVaTv0szG1rw2IW1vUtCTUL\/wAOafr2o6dDqElpKwhsI7hE0i41K5jijit5tRilUIksNtvnSRIo85jTWMOaEZuNuZPRvZpQckle7tzrX16IiU5qrKCekVzbLWLlKKe2l3Hb07libwXqSaf4Fv5VtYLbxtJf2+mXC3CTSu9jrj6RcPeQIxktRDOyKiOqtLCBMoYMKTdO0lzqTgnKUFvBJN6uy1stFfX8RL2ik29pu1N6Wk18eu+krJ3Wh1niH4fWXhLR\/irp19r9pe+IfAfxV8N+BYk0swXeja3p7wfEyPWtcsb5WLvBbX3hXR1sDDujurXWZJZWQwRh5jXhJRtGa54e0jKStHlvazja933vZbNX0LqRlGUuadNyhJ03FXlfvKMo2TS08r2vdGx4S+BPijxH8XL\/AOFGn3Ph6517RvF2seFZZtQ1CW10PUNR0DULmwuEj1AQmNLS9u7eK0tZp2tlkk1CyDyQrI8sWtOVKbjz14YenOLar1E3TTSbUZWu02ovpppfciSmnJQh7ScNXTT1a5lDWzTUeZr3jya006e7VbK1sZbvUpr8QW62yTz3EwWJw9vDbxFhKWdo2IEJmBChTtZ1q1TlJ+6lO+q5HdST6x5mm12vZtEuXK0pJp8qbva0dWtet7prrt56tFlckAi2mIIGCImIIx1zjnPWtvYv+R\/e\/wDMXOuz\/D\/M9h1+xuh4b8MTtDL9lnm1qOK4MREMs8C6T58UcgASSW3tprAzAZdPOiEgGUd+ibjOpdKMVonDSzWrSktFbRtXVtGeHhq051cVFNqDqpqSvfmcObSSs3yqCi0nd3W3Wn4i0u7m1\/QdNUCR\/wCxfCNtbEJJskF1pOn3HzZj3lUmupYzlCyeWyFQy+WOSKUdklecm7Kzcru7\/wAVtG99NSoY9VMFicTKa9mnj+WbacY06U67hFK+i9xJJNWvdLoSaz4V16P4kSWd5pOp6deah4jbULKLUrK4tLieyutWaS3vI4rqJGlhkQ70lAaN9rMrEA0uRvVPS+lle3ZXT6bGVLH4eOTwxEqtNwhgaaqSUrqM1RjFxd1spNrRuy0XlyHjHRLzTNe1RbmFod+pXqxhiSzBJcn7yoSFEiqCFC8YUYwSJKLUGru19V8Kf6N3fTfudmAxdLFYWhOnVVVqhCUpRT1st2+sna93rZp662XVLXb4nnhKYWPToUjDjAEUfh6JYS4deUWIIztIgZ0BZwHYqBw1fTytsZ0av\/Cepty1nOyTu7\/W5WSt0dmlbpornRzNca38SNe1bUAtzNPqutXt1c3GJ0jkP2lbd5Gk+Ut9pMEcbMCTK0aplyprKlQUaUIpWspRejd7Sl0eybk7Lrc1zDHXpRryk1UrSpyjFO3MveTu7u7UFeT15lG1u17w3b623w\/8X6XZLLJYanqGhXWpp8ypcpa3Zay3HaVkMc7zTlS67BGZAxODVyoKUqcm3zU5VGmk9XVjCNpWetlF6Pq+614q+cLD46FGrOMXiMNbVXadGftG0901GVnfWztrcztU06+s9B8Hv5d1LDp2p6qtqdpWIyrfWV7ci3dGdlLmWLrFGY2ViDIrxsH7ONqmus1FSfS0YtarTdNaPpfuVRzRVcRWh7Wko0aSdNJ++nUhKUpNXVnKUW4ve63erXPaql2G8Wi53yTnxpYTXJVQm+4jPije+wBUXDSONgQBckAqOGzjSXs7Oz5YuKbin7ttknoorojvp4n2n1SpSs41cFOrzSWs5cuGmra+7JObTlZ3s11du00LxDrmjeMdQ1CC6ntr6XxnPqTXcZAuDeNr+k3AkjkDj55GcFxGQzRtkOgHmKexj9WjRa91OTskk+aVOVK67LVOwRxab9vCTlKphea+1l7S9r6pqMo3vtdN22F+HViNHtbb4hW+qxWuq+FPHvh2ystHktmd9Qh1fR\/E+q3WoCfzNscOmt4YtrCeB4ZDM2uwSRyR\/Z5VkJuM6UqEfaKrOMvZuF3CMabj70p3i1K948qWjXxWZ2qrao67jFwpezjPmSfM6kp3STtazt3TsfcfgL9qjxV4d8DeC\/D9ve6IsGh+E\/DmjwLNbTmVYdM0ezso1lItmBkCQKHIYgsCQSOa5JwxznNxr11Fyk4pVZpcrba059NOh3wxdBQgpUqTkoxUn7KLu0ld35dbvr1P07+In\/BPLX\/gT4V\/Y2fxV4b0+fRvGWnf8LC0LyXh1m5\/tnxvpPhNdT0fxjos8cQgN7a+FZLX7HJLPYstvYag76ada1lD2OTnVxPsqkJVeSlH3Gn7OVKVSMU73u\/3kpO6SbtZbp\/yjhvE6soZjWeKo11PEV8ThaFKfJVpQm3RhCcWk41J+yjWpwcW3GcJJ20XA\/H\/APZU1T4H\/tjeAfh1rfhrSNPu9V1HRtTt5b7TtMutUXzfCWs6H4S1Rr2KfUIbOTSdR1W81CGxv7q3uU1DSNMv\/sVzBYWF3J14mjVjUnKVRxTp0nb3UrOqvaVLJaN0m43+K6v5PvyfjirR4DxrzWhCWaKOMtTpSU401iMPUp0VVcXHllGpJVJr7XvOLvZnmv7Rn7Paa9\/wUA8IeFtNj8Rx3t1qFgvi6\/168kvzf3up+P8AxDplvJBPJCIdOYaELGwlhvNkQ1LS5LwzH7SYl5oYii1VqwpOFCm2qcINObjBK8rXk3Z2vZN\/fczw3F+Fh4dxxcva1ZToyupTjz+0g+RJytyxlNpN8y5dJPZo5H9sn9jtPB37ZXh74XW8emap4W1ebwZo19qnhy90jVbOyn11rd7aGznF0ixa7baNotpD4hurryC1608+o3FvBrdqpUK1OdJVIyqJxpzm3Uj7zV21dK14KUoqNrNd9Ge1kPHNOpwVjsypclNUprB0qkasKkZyoYelG1OalFSlNKTkm4u\/NLlUeVHK\/tn\/ALC4+D\/\/AAUFtvgvYaZqNr4S8XeLNA0fSLa4u9O+1rYav4V8I6ldzW93aXl+405G8WxRaZq95AkbpB5Ml3c3thqklvFCr7VSlz881Bt3Vm5STcYtXdr2stdLatbnqZXxXOHAGIziqlSqYaGKnQjUqUn7SVCrGpGEXCq4v3km4qd7Sls07fSnwm\/Yi+G3wl\/b\/wDF\/wAG\/jd8NxqvhnxQ\/iWXwb4N1PxHfXN3Z2q6idZ0bUZ9U0e50+7DG0t4bQw6hLI11Ztd3FzFdJfKYCm\/a0Ze0quhOHK8Q6ceadOT1UVFvRSjKL1bvzeVj5fjDi3Hy4dyzMstnGkni4wlKVVTSpc9TDJSUGpNxnGTlaXLrK3lxHwZ\/YN8UePvg\/8AtTap4O0GKWP4N+NHsb2a0s7Wa+GkaPqus2OmSyW5vJLtLVJ5LFLx0juJElmWSSZhDKw9JfVoUZQqVbVElOHOlGcrWinu1rd3SXz1ODH8aTrZvks6Cr4mOIy+jiqtOCTjS+txw0HGvJ6pRmowaVryTtfmTXs3xx\/4J\/8Ag74afBD9nfVL3V7rU3+JugzeI0j0m2tHFjdSzaRpOpwNa2433N2+lWN5rsMS3MC24hsQl2bgpFcTiKdHljClJSlKKlJpJPVdJaRau7bXelup83gOOca82zHG0aslCk40J4OrU5pqNOtiJQbtFWjOnJckFeUYS1lfb5N+Nf7BWpeGtY8Qr4L8rXIBZ2N\/fTRxGCyn1vV7WOd4dOMnmIyzR3Op21t9vWzuwIrS6v49PmL6bp3PSkqtONSzSle0XvdTkkn\/AIoqL6bvXZL7PKPEHEL2GHxjjz4b2lOM41Oak6NWFF0k3zNxTbpRV2rKaul08zk\/ZKTxD8UNdvtPs3tPDN54is7jTbGU3aXiy6xLpWs6TarPc3FpdLEbV4PO1ORL2OFLgvFHqUlvFbSRep9W9uoXbhdW+FT5Zbq97KaUWrp269V9nR44ymUJKFbkoUIY2jTtOMpVacK9anT5X7sYzlHZNtvdJbHMWn7Iuu2dtr0djpy6laH4mR+GbEwalFZFb7V9P1vT9De2mv1jsL3T7O70\/XrNtVkis7W9vYjaGKwkeE20U5xlJVG\/ZNUKlaUZtaw5Yubio\/yNq6V3qly3TZ1z4ueLrRjg4tw9lRpyUpw5FXnKU6cp2nHlc4qXKpaRkpXk1ZGj4Xtf2f8ATvDPh3T\/ABD8J\/Ed3r9hoWkWeuXY1jxVai61i10+3g1O4FtBqCwW4nvUnlEEKrFDu8uNQiqAqlHNfaT9ksC6XPL2TlKbk6fM+RyanFOTjZtqKV9ktj6+GZ5NOEJ1HV55xjKfLiUo88knLlXLpG7dvKx\/eB+0l4H0Px7pPwO1TzoprjRdJhd7NLLTLRw1pPJZ2DqjSGaa2slvXgtzO6Q2xwLENMHih+OWcUY+1nSbjVnOXtW72lrzRtKCdlsved73s2rI\/wA6cJQVWlNwnXqYiUK9SvCtGhFVXNyb5ZQSl7OMbQgpu0EuWCimj4Y\/a9\/Zok1v9t7wV8RNZ0LGnHS\/Dn9kQzSl7WSO1s4IbRZYpXe6N60D3N1E8sk2ZJp5tNlt7j7VBF9Jisyf1Khz8ntMRRjGP7xTkoyd1JuM5NW5rtSta21lY+pwf9o4bJYUamFeBwmNiqqjy1VCdOcLUpVIc06kHUgk27xknLmik3ynm\/7TX7PujP8A8FJtN1+C00a08P6RpvgBNLt7O\/fVbfSXTQ7HXbl9StY7hJre+bUPE11eCa+tTLIb6W7jg+0Tm2jrGcmAwcacWo1KsVP3L+\/GUVKTTlZ6395Rto+trG8sTOhkkcLhpUI0KlP2yoQxFTF0KTcU4051KqjWUvdTfNT0bdoxd0vO\/wBtL4aeBV\/4KpWkXhyH7TpFl4a8GT61fmJo4D4kl8JeGLm7M8djd3MbCVL2z0+5igttMhFtZRWZiS4iub2bapi41cN7apKmm6UKS5I8tocsbRcU2laUG737X1ue1Vx8YcGQw+FxdbG4Oni78tenTp4mpOeHrSqSksP+7fs5OVNckYuUYw525OTO1\/bV+EHgrwb\/AMFNfCPi\/wAOeILH4ieX4d+F\/i650a8tILew8L63q9jHa3VrYGxjsJ45bmz0ay10SwHTbiO4ntfMmv4IIZKMRGhRwzlR56ca8KK5m1KpJe6pSv8ADZS5raLR663ZMMy5eFsPleEx31rA06cqlaeG9rRh9ZrYenPEUeVwozlGFX2kJK6vXlLVJJns3xr+Cnw2l\/4LM6O2qWC2ul3WkfD2W7jhnvrd0i8RaTY\/2r\/Z0uqXusLbtIiiyc2+UZUkMKs025n7CFoYelN2q4hU3VlrLWnTjFSfvO65YKKvJPld3a9+PE4p\/wBlLB16lWOWxxEalXD04zoypUudYirCi608TWjJzrVpucp1eacm4JRSiuK0XwjH4G079vDwJ4AGseG\/DbeL9RubyzW7utRu9a0qz1AMkl\/KrWsV75moNc3U5kjGxN0aW8NrLO59WWDhOrieZ051cNR1cluoyhdxWq5rc3a66I87GYio8bl7o1J0KXsYOjy1Zybp01GnQhVly0udKKuuaKXtEmo3Vzz\/APaXvfAeo\/Az9hjSdP8AC2oai1t4yv8ATPEuoXTTyaNPpsWlOl5omoWunrJetDePDHPabZLa+s4p9QSKe4CtcJx0k3DESjF2jNrm92Ku7Nxak0ly7JJarW2rObLakKVTPYVaTjjGo4qOLlUqXqLmqUqdJU23GEIzjeU42kk7Lmuzl\/HHiTwbo2n\/AB6tNM0BdM1e9vvDK2troU7po2ny2tvapJbwwSLcuILO\/tra5aGCW0lilt4Xjcy2q3TKnXg401zwc+Xm5XpzSjo0rJau2yt52OvByxvJh5wnGUsTGUMRKyjGajyShLlSkk4+zpuKTV1FLa6OMT4Lxax8YtV8QalZG11Jfh1Hq2l2enWaQ2rzT+G5Lu01GG2vbmW1gsllmtXv1kjF9fxySzQNpt3ff2hb7QxdCGGgpRXIm4Nxmn76V37kkpWvpe+6ui1Vq0sJKEnJR9rN+7L3ldtK3MpJe8r331vuXG\/Zo1RPEy694n0mC1utRutN1OwimbVWht54ptTtLXVLa1sFsE0u4Qh2iJNy15MNSmjSKzk+yT+dh8bh2nOOrXPFOUYO0Z25op3dk1FX19NDrwWe43C058lWTi5UvaSlNpSdJv2fM42blFt7rdvc+bX\/AOCc187u8elasY2ZmjLayxYoxJQkiAAkqRkgAE8gCupZ5RSSVbD2SS+GPT\/t09Rcb5lFJc6Vklbn2srW1g9j+nz4ypoSfCL9mrxHYPbabq2qp4ot7g2CQxXs8Gh62Wiub2Z7oOZIbhIIrWGKGLcvzTzwOLVa\/HPrCjlUJ2iq0sRVjKyalJQnyQdXd3Ufdb5dknZ7GDyLBUMjyLFqFOOMxH9sQxrowpxxU4YadScZVak5TSlB\/u4OKjFxSd07o8q\/biuNEuvjb8HZvD2l\/Z9PuPAnhXVmu5op4Jb3Ub+xguZ1VpPKa8NpEbWF\/JnMInEytsmFyj+s61GFKU4SdvY0Vy+9yKSs5tTl9lT5o86SXu26hjaGFp0sDHB4NrCTyvDynDklGrWrSoU5YyTlJx9pL27jCLpJpez11qu3yF+0R4l0W\/8A2ofF\/jKxurRdLjuvB1ho80LIIpJtD0jQ7bUIWiNxPzLewXkk8cscQgREjRZosufp80xdLEUMtqUpVJwlhoRi7c13ZKUrKzSUotat3S3PIp0IVMNUoUOaMLNJVNFBTp0WmlzS3kpOzty3tumcj8ctW0fxX+1v8TPFVpPEt3HYeBbDT5lUfZpn074c+EWIFol7frp4hMkSSLGbaRzCk32KC5aRS8fU58NgKlPSjUhGc7bybXsnzQvpaVJpK732vdO6T58roUoqKjyRaUE6Tu6UefmjeXvwqucHLTmjFe7Fux4n8afEFzqn7QSfEa6EWoNp3h\/w9obCwiltNKMvhfwH4Z1KSGC6mgke7iludYx5s08slnf\/AG5bpZY57FpdcyzCGFyueIcYy+rUac4QbcJzXPZpy1cY2jdtRavZ7b+nw5lix1GGSprD1cXim41HFuEI12pNuNlzXlC7XNC7vLm1sepeOvF3iLW\/+CgNx8QPE2pTz+ffeCbTw\/qsdwHTQ9P0Xw5oN3Zadbz2zS2sS2GrSanKywXc6RtKqTSvcF2k6J5gqjp4inTVBUpU51KOt5TStKXM7Pla5XFqNl0vdkV8txD4d\/fRlKrVeJiqt221TrSgpxak5OMYwTUudNKa1Vrn0L8KPEvhvxRrn7Wng\/xFoWl6VN4nufGegQ39s9rdabeW9hqcVnJrdhqSvfeZDcx6ZLefaba7Ritz50d8IpWJ75Z5hsJjMXX1qxx2ElToLl5kq1RLljON37snCSjJN69FZnnLA14YfD1VSVec8I6MHOcn7KtTqRnCX7yU3zJqLcXOK5W31s\/d9e+Fnwv+EH7HXwD8C6rO\/iuy8UfG\/wAS+IrbxJb60lx4qbS7SOG0lj07znt302xsNQ12Tw3Lb3NyjxXIS4kllnmnum8eeMrVqlKEnGiq9epy0oySVTkhTpSk4391c0Pier59Ip6npQyjE5pkWFqUqWEw2YYjOsZgXVm3GtWp0YYKDhOKbUKNLFYitJN\/E5dOQ\/H\/AOKek6j4b8efHTwL4kt7ZPEul+ILNb+OC4S4QfYbhRaFtRBEJkksYmZtk1+08oEjiTdFOFUrxhWpSjKahGVanCMbfFFNO9k243+1eK9LH01XhurkMp5diZwq4nL4xhWnCUZU1O11yyaTtLW91o\/lb0\/wVqLXer6lrCbrQaR8PY9Ns7\/7QW88ppMnnt+\/8\/aLWVF07bFLJDNaxxHakwMTZVq1BKEVKdT20pcjpSjGUJu7jzaySs\/iTaa1Vz5vHYOM3OMaVKCUea8L3ba53LdpNvV6ellqfqt8Nvhs3iK\/0SPxKsk82pfB+XxbbSmSe6mvzocmrWcKXA1aVrV0Z7KXThHDNE8AigKx26RR+Z5uGxM4uUJaLkr25rLmsr3fyi7tbNO2lzxP7NlRjRdSbdLEwxGIouEVyyeGnyzpydWVOE4x2qRTTkuW07Xv7ZafD34fvaWrrPpu1reBl3jy32tGpG9Et5ERsEbkSSRVOQrsAGP0NLIHUp05r2dpwhNe+tpRT7+Z5br4VtuMK3K23H3aa916rRzbWnRu62Z\/Hrr3\/BdvwDqum+A9Ml8D\/Fy\/0jwLoWv6TpdreS+H7XztQvtU1XWYb1vI8YTrbLG+pWdvKYAhcWwneC4MMUD\/AC8OFcW8JUwkqlBXrxq0pqU5RhBWbglKPMnKd5N+e9z+n\/8AiEubyjgKf9pZbCjg6eMg6ThiKkJPFqXMkuSLUXObk1fXuru03ij\/AIOCdJ19Phutx8AfEPiTXfAml61psGo+I\/HWnxNrUOsXF0\/h63vpxomrT2lp4d0ybS9PtFsFURJaTvFGfNjEfXLhfEzp+wqYyjCCo+ybhSnKUrz523KU0o2vyxSg37u61b7sJ4QVIYjD1cRmmDqRpR5ZQWFxE4tKjCm1GMqqsv3cZQjtdNuzd18zeM\/+Cz+neJbvTdb0n9nu5tNUstT1bWNd\/tb4lW95YaiNQNlaWdvp1na+A7VtOlthG889\/c3GoyXUlzcxLDBCVUevRympTwMMJ9Y5XSoeyhUUFe8ZScZ210lGTuu6d7aHPDwMoRWmf1YyneVRRwcfZpfDGNO9ZSTjFJPmclorPdvzzVv+Cw\/irUNeufFrfBrT4tR1HUpZ7mODxzJbQzRW9pZ28NvOYvCKyTpFapbKrMwkNxHNcMzCcwJv\/Zt8FRwc67mqMWo1HBX55ScnJK+z5mkntvZnXT8FMFCPI85rtbc31Wkklbtzt36vu2yTwn\/wVN1zxF4z0vw6\/wAHbGxtvHPi2Jbz7P4+vpI7KfxkuiafcTWkN34cmXNqwllWN5VheGSC0iSzit1L+Pn2WuOQY6KxEuejgavLUlBSk+Tmq2aTS01V76K1trHu5J4TYfBZjg5POa1WjTxFGpGlHB0oTlUSlCPNUU27R5r22s3v0t23\/BY7XrXXZNbPwG0t73TNTudRbZ8Sb5EmjkmgsxbKsng2cxFQ8TiVeAY2EUcKMqL6kctc8JCk6t5Tw0KXPZJqSaaqvo7xdratW9DnXhLg40fq6zesl7ScuaWEpySjKSbi17Ta17JJdb36epeCv+C7OqeFrnSbq9\/Zrt9Wt4LzWhdRx\/F1rK\/u7PWLiznv7SPUW+GV1Jb\/ACqfsjypdxQXJSdreVY2hl5cVkdXE6LF+ylzYeSmqalCPsOZ2jFtSjzOTvZW6O97nLPwhpyjTp\/27VVKlVqVoweX05LmnGMdGsRBpe5G65XbV22O+8Vf8HAGpeL\/AAZp3gO8\/ZtWxTRPEtxr\/g3UrX4qSXE3hiLxFc2t3rthGkfgOwkv4L1I0k8iZ1tV1CW5u0tgs7Qtmsjxca0ZfX5SoqElGDhFclWWvtVJe9v8UFdNea1xh4QOiqjpZz7zxNTE0E8NNQw7rcjrWjGu3KUp04STWiadlc818N\/8Fbvg\/qfi34h6941+C3xEgj8T6HCmkHRPFWha1qOn63aaXYm91DVJdTttFj1K3u9XTWrpYB5E8NnqVvbSXFxLp4muNKuUYt+wVHE0lyR5ajqKb5pOPLKpG3wqT1tvfdWDG+FucYiVWus7wdbE1JRk51qOJhGclK96slKq2kkvsyaWlpbHpWgf8Fhf2fNPSUTeBvjI9rLoJ0+cjQfAUcsOqzwalHFBBHb+MUSTSYwthK93K41Ccx3ED26ki8fGlkeJpxpL21NzjWlOcm5tOLbacY8t002tOruzireE+azlGbxuX1XUw0o1YJ1oKnXVNxg4zdDWDkot\/u7pO176n6D\/AA+\/4OJf2eNLi8E6XqmifEfRtK8OfAvx38MbO9vvD8F9drf+Kv8AhJ1s9Qa30\/W78xxabqF5p7ErcTvOtvNMU3FEaZ5NjqcXOLo1ZKVSEYczipUa0JxqNy0s0qkuW2t7e7Y8bGeGPFf1LAYWCyyv9RwucYSKjiOVxjmVOuk4e0w0E+WpWlOLk04zUJ\/Z5TtNK\/4Ls\/saDTNNF6dUF4LCzF2JPBniiSQXIt4xOJJItDkikcS79zxyPGzZZHZSGMLDZzBcsaWH5Y+7G+Jqp8q0V0nZOyV7aXPMXgZjmk5VMJzNLmtVVua2tv3e19j+KiG0E\/KoXgykvkrGyvE85MIRDlt6yiO3cy427g0cezO9vsbKmry5Wm7KUWpK\/SN1s+vz32P6mjCEpcsfetrK17qKer18n339B62yC7jR1jN0k0G1ZJIYk2wJGsSM8wAEkhlhz5UjplSdjhoylRnTv78W15JX\/FilT5ZPldkrWvvqtf1sVHs7gxz+XZNMLi2REEBjVnjtjC5KrEpU7FhV3JIeRVaQlpSUZS9nHVKTi7yvJJtX1tp0XReQuV6Wmm+q108n3\/rU2JPDVtPp1rLa30E8nnSxxWz7LeUl1t4\/JPnyqZZzLJi3jiE8UyB5Y5ljQtUacicF7RzenLuna7TbtskypxnFvm9xKKabvaUXKyktL2vfpfQ6n4XaUq\/Ev4e3h82P7L4y8DmQyQyiOEx6rpqsXfypopFkFs7xqpPmRgSxiSESEePn91kmbNxdv7PxSUunN7GWjdrR6q70T+R2YCF8bhYqcZONanJ2u7rmTtqvPXp57M4y60tYrnUwu4xXJkjSZd+wpHqVruvJF8nzI7Mnckc8se1XdIiRIMD16KiqNFtq86cfd35EorVvs07q3RX7HFJS5nrvJ2Sbu1fZefp56pFmLwtPM0lhFdaegjW5n+3yXfk2U9uht5F2SzwoxAW2a4CiMStvij2rM\/lVpGnGTcY1aTato5crbb0ST11V5eifYUlONp8lRxbasotq6S7XW79V2N+H4bavNe2pgv8Aw40baVb6kssniDSbeFrSwEaXK+beTwRRXQkty8VlM0N88ZicQlZDVvDyi4qVWhHmjKScqsUrRai03tzXfw72V7bmc6vutqFX3ZJSSpzclzJtXstFpZ362C4+Hut28F5rFxd6KbeDT5xtXX9Ge6mVLS6toIbK0Sfz7ySKKCISRQRPMYmgk2k3Ns8teyptPlq0uq96pHe3Ty19fUXNU\/krf+AT\/wAit\/wgEqWknmaxoRaQ2N0jQ6ibgIs0F4fLkNvayhGjLIbhP+XYDbO0T7VaFSipJTq0rP8AlmpPXbTy3dr\/AD2GpVFtCq32lCXwvRS1TVubT5drlhPh5c3Rgt4tb0R2t4IkDC6u5FlSa5v7hZIVh01pAkcSvI5mWNxG0cgJjkTGvsabfK6sZWfLHlv7zWklt0sr\/MiTktXCWt77X77aO\/lZa6HqkHwxuYYIYjqnh2YxRRxmUXmsgSlECmQA2UZAfG4AxxkZ5RT8o3+rT\/mh93\/AJ9ov5an\/AILn\/kXE+Hj2tm1vqlq6wWcNlqWvakYbtZ9KknvGsk+zlClteRNL9nsLZrq7tra\/WNJLWKW\/bfBz1YQpSlGcYp0m1XtGUpKaSbslZX5XGyeu3Sx0xvVjKUftJ+yj7SnZrRJz1ule92uib2Zjap4JuDpdhdwaMdGFnBfMl839qW91qUklzDb26W0F5DO0oSSa\/Z7iNorEXVvO0l6pisoT6znw\/PDUZ1XiKVapF05TjGs7VaajzSpymuWUIwlHns24ylY4oUs1hiKqhKlUgpJxhOpTa10W3XdK\/a2715e68IaiIptujGSJChlHkXLiELDbQmee6tLeG2iiWWWITRyJ9rt7gkMfOYO\/kV6FOFWUMHN16KUHTqck1FKUVK001f3U0ujlZ2vY9GlWk4c2Jiqc7tNRatzKTWl3s0rro1t2Ppj4nfsfeNPhd8D\/ANnj4x65emY\/HjSPiJ4gsdCtY3mbwx4H8HeL4vCvhvX9W1ZbtpbOLxJrFj4pEOn31laRabaaLZTXckD6xut6jRqulzyiop1ORSU17y5JSclBJzgk1Fc07RvJK9zL2tL2jh7RScUm48jjNNt6Xl7stl8Pm3bQ8i+E+kC78e+FLW0s31G5ttd8NX2mLpdrPP8AZpYPE1hbyrcytDeRl7ud44bZ7ieXe9zZ20F293JBLJ5+c0sdieHsfgKPtqnt6WJo06FGMpe0qVKdorlhaU+duK5LtN2erVjXBzoU8xo1JShGKlQlKUpJJcs2rN3SWnezSV9CnZeEdUupbu5tNLmnkF5e3dtYvd291cXAtNPGo30CtbJa2txHpsWNTuQ0MMB09be9uJ4oz5pdOrjJ04RputGVKKpxlKDmnyRimoqStJaLmSvo0nvrtKnThO9SNNJ8s7QerhNuzdn9pJ8rv0bWhsaV4D8T3lj\/AGh\/wiGpJbWOl29tfMmiXVpJosdw0ttBq2tKNMYzW3mzxi31C2keF5fJE8kd48G+6k63NUldycWr8mGnGTdop+9ayjd3S2TvrfaIqmouj7t4z0nKqtkm0kndtJS31s79DTn+HPiGytrNtW02a2k1eGzjtLvUJLKY6tYPLJbSS2MeoPHEkNtc6e8U9nbWWo4uGlSeW2vLeC1uco1+aKUuZKTlGKlQ525RdpfB9pPeMtVfVd24RT5VZO0ZSSd78yvGWur51qpr3WttzLXwquo38Mraek0aXunxW\/2OxhMkckepLJONXSK8FwHgbzWv7dY9MfyI5YxqEUk4WWadSlFRk3UlCCn7Sv7KXJGUdE6llo+ay0d9ElrqavD1qjhKKUqlRr92n7z5klFR39ZN3srPzNKTwvfXGqSLeaX5yX32S1aFLQtbTG4W6u7KGAx2UX2KdZ4Lqa6knubYRQs9uIDcWHzCxSlKTkp8ibTajokk2ldtWTcXPXW91snalRcIJt0+Z6p3cZd7Ja9Hq1dWV02ncv6H4Tsp7rXEXTJ5zb37NqMWiQRactlpWlym3neC4aaOWcQSRXX9pT3Tr57QXdt5IuXS5tqWLdKUYyjUalGdSEFQnCSV2pXqNKNRKLi24czXxSaTQ5YeValOryx5abpwlOdSMaSbXu3UrJuclJR52lJqXJd3t0KfC4XKJcWvhv4hX1rOqzW19a6XorW15bygPDdWzMoZoLiNlmhZgGMbqSATivQjXqcsbSrJcqsvq1aVlbRcyhaVtrrR7nHy20dOldaO9eknfrdc2jufXVp+xP8AtU6rch9T8DafpXm+el7fW\/hfSZp2jF6JLOMSQaTaT2kq25W3kvYXmdIoI7mNJtSAnb3qviRwQ8XGFKMXlccXiLqpk+HlilgopRwtOpOMozrzqQjH29XnpSjO\/LRcVzPiXBGaxoutDFUYYx0KPNfM68aCxCS9tL+HCMdfhtB01fSO59CxfsreKtG+CieALX4V\/Evxf4\/n8ceMfEmqeJ7zS\/BfhK0i0qX4c+D9C+HNlYXr6vfajIlh400zX9d8Uae+p3lqiXPmW1lLql3JqL5cP8ZcCYCpUq51jKWNwsPq8sFh5YaspJvEUpY3no0arVNzoQlClGU5QdRU5yXK5o5szybO48lPAvD0alqir+yx2HlGUeRug41MQ6fPJScfelFW1V2tTltK\/Yu+JE3huOy1f4T62mvXkenS6jM2sBdFm1aVdebxHefY49WkglfUr280S6gYW8ZL2N2JI4TOftH1WH8UvCClUhXxODpRqS+sPEUcFl01FTlNexdKeIqx92FJcsovmvNy0S5WeHU4e4tqt0sPVjOEfZqmp5tlkanLGNpc0pYqEX7yTio697J2P1d\/aU+D5+Jv7KH7Gnwp8M\/DHS9cufh18N9c0fxp4UsfGOs6hrWga\/LB8Po9QtvFrTRavPpOm6x4w0Pxn4s8LeHotMisX0rxJBrNtHaXMqXU3zOC458O8BmmdZlmOFxmLwmcYjnyxQy7CVadHB0atf2eH+rVcdhnTSi6PO3WblUUpKKUry9mfDfGeLwmDwmAoN18BC2M5MfluHtXrU4yqTdariqftm5XXtYSnDltCMvd5V+bvjL9hTx75fhq+8H\/AAn0XwTquj+L9J1ddU1C91qaYWWjm2ub2ztZU8LKk109ylleRB4YpbXFuJLuUKrv6tfxk8LaGGqUKHDuMnJ05U6Mv7PyvBxhWT5lWv8A2vOSqpSlTi1NrlnfeMeXz1wTxnhqntMTHD4SMtKlTEcQZDTUo6vlbqZmoO8knb4mk\/srThdB\/wCCe\/i6z8I2Gl6r8O\/B+p+Kodfv7y+8Qw+LfFtjHdaHdaINLj0T7JH4MuIYUjlRJpZkgW4nghNo9wYJTHF59Xxt8OVjVXjw1WhSjQVL6vLBZROPtHJuda8sy9\/2kWotKdrq+j2Fw1xAqbi8yyzndvfXE2Qq6u3ytLM7J09UkrWumns1tSfsBfEKewvrU+GtJF1dWk1lbz3nj3xddRxWyWdtbadbz2i\/D2EXdvpkltHdQwSSqjFYLd8Q28anrh4++HdOUX\/qzNU4uDlGGCyKnKUIte5HnzSajzr3XJyuk21bcxnwtnri5f2plOmjlLizh2NtUrPnzaL629XdFvwV\/wAE7fGelwXEfjbwL4H8ZyS6jpc9lfSeIPHGktpOnwyv\/bVlDZ2vhU2t6+swC3iE87xtZtbxyxBzuU8+P8efDXESU8JwpiMI\/Z1nUisNw9UVWtOzhUnOePlOChq3yNc9lzXuaUeG+ILWnm+UVGuVJ\/638PNwpJr92lTzd+7FXtfbp59YP2FPFFhqmr3GjfDv4c6Ro2pW80cOjDxR8TJkjup9Qtb1tRupIdEjW7utluIYjJbiOIx2FyY3ls2M\/H\/xHXw5+rxp1+GsTOvHltVWB4Vbai7rknPEyqwV97SjzNXd2bQ4b4jjK8c4yiCjbkT4yyGOytrzZqk7J2bbsvIu\/Dn9iPxh4f8A2gfhh8SvEVn4OXwR4S+Jvw68WeIPC9unjfVmm0fwr4gsdS1i3tLjVfDc0j3V3bDWJbbz2dIp9SuI1xDM6vWYePPhxj8nxeWQ4Tr0sdicPiKNPNZU+H+ajOqpeznOjRqzbpwbjCbp\/vfZczpyjUaaMPwxxHTxtDEyzbJKtKlUg5UXxnw9KLpuX7xe5nDk3ZyavtpFaJW0rv8AY38QNrHiW6tvAnwPe21TUtdnskuV8bWfmQandXk0Q1FYdPtJ5xJ9see9jtpbRZZWcIIYbvUI73kpeNvhzRo4aEOFc0dWjSjTnWiuGFUlNU4wqypu0ZWqtXftuapJNe0blzXynw5xJKdZPMcnlCVXn5VxZkjhKdOU3RnKKze0nSu3SclJwbk425mx9r+x744tLa3tY\/hr+zX5dtBDbpi38cqNkMaxr8onAX5VHAAA6ADpXSvHbw6tpwnniXZYXhZJeVlRsreWhj\/qzxG9Xj8iberb4nyFtt7tt5vdvzerP1Kh+L3gCaSZoBp9+wIRhaWlraPvOAFmjn1i7wFYNwjEqoYYLBlH8pUMHjIJr6vTrK1pctDB3u+i58XLW22q1e3U+6wvAniFlsIQ\/wCIfZVUcIu08dlWWYmo1vzTqYrGzc2no5c1JWV3rdnSH4\/+C9PgVYdA04yRFY9t7p3hl5MDAQoJIbiWQl9pZ3KE8yEnDMd54SooWWAxGrTd\/qUI31beldvfZXZ69LI\/FGnBOjwJw1HV2UsiyBJa6+\/LHOHoufyto0mP+1a9pvfTNOh0\/wAsOQyx6ZHGoZS0beXBaxArsz8sW0KwC7tx2jnlga1rxy+unq7rEYWKfW7UcRt6rTy6+nh8N4z0ocmG4aybBRS+Ghg8howldWsoxx7VlbRe6lfc5+7\/AGwPF8j4S+095GkEflPbKZAHxtYb5kw21k4fcMOu1SCWHM8HmDaX9nztG9ofWKNtddnidLuzt3Xqd8JePqvy5XgIWsuWK4dWkVprPH1ErJu14SSWyQ1P2svGLRLIk1lMpfyxIjWKJgldqqUOMhPmfaGGCrKQFNJYPMIvmjlai3o3LEYezva6v9Yet1+HyIrUvH+tGcfqlKCnq+WHDkouysk\/Zw1X\/cWS8rvTH1D9pDxBrA8q9W3mRVICiazZVjYr8kZZ1KLuIBKyKOVyoBO3o5M5jGMPqEIJRtBfW8LNJf3VKulG26SVm3oeFU4Y8a6kpTjgMHGcm3VlGnwvGU2\/tTcKVSTktbe01XS+py0nxkmjVt88Nujh2HmTWjRhYyNxyt0pCqMKwLEgg7utcdfA5tXSc8JDmjb3nWwae\/2rV1eyem9t7aHz2O8LfFTNJRnjstp1HGTkm8Xk1HVqz5vqsKLau9E1o920Z7\/GSzIPmXlkWOQGeRok5cDAXzizsrgrhehByvBFczynNFqsJC7srvEYSz9P3y0+7Tc4P+IL+Ie7yeg\/OOY4KT7vT21\/W\/WxmXHxxtLZikV5pLMSQjRalLvIHyEKof8Ad\/ONhEmDuGNoILVnHLs2taOBp7uyWKoJXe17YgX\/ABBXxAs1\/Y0OV782aZY2r6O18ZdW6der3Ik+PcKkr9ott2Msh1MMCseDuLm6QAAyKpIJycKSD8pipl+eWcVgYpaf8xWFsu9uevfe+j66bEf8QU49k1FZLGT31zLAfP3vrHs+mynf53Rr2vx2sZyrtcoqH5s+c3Hylvlad0RiApYqshO3adoVlpLBZxa31SN0tvrGEb7f8\/xS8F\/EGntkNV7r3cxyy2n8r+uarW6eie5e\/wCF76B3uznvgREZ74IBBGehBIPUVX1POf8AoDn\/AODcN\/8ANJn\/AMQa8QP+idr\/APhwy79MafAF5b2628BWCFS88m8iJAX2q5G4hfmwQCM5wQMdK2rV6yi7Vqq92W1Sa6eTP6wx2Z5lTs6eY46DUW04YvERaa5rNONRO67mHFFEGKiOMKZgpARQCu9BtIAwVwSMdMEjoTXF9ZxP\/QRX\/h3\/AItTfv8AFufOYjP89UtM6zZbbZjjF0fasalva23mj\/R4PlcFf3Mfynd1Hy8Hk9PU+tTPE4jmf7+t\/wCDZ9l\/eOf\/AFhz9bZ5nC\/7qeN\/+XmobS12Ofs1vkhcnyY8niM8nbk8knn1PqaUsRiHJt16zabterPTX\/EY\/wCsXECpyaz3OL\/9jPG+X\/T8gSwsWSVms7QssCFWNvCWUmSQkqSmQSeTg8nmqliK\/s4v29a\/Pa\/tJ3tdaX5jnXEnES2z\/Ol6Zrjl\/wC5yIWtqJsC2gAW3V1Hkx4V\/m+cDbw3A+Yc8DmsliMQ73r1naTterN22\/vG8OI+IXOs3n2dNpQs3mmOdvdk9L19NSW4srOQytJaWzsofazwRMVyecFkJH4Vp9Yr+0qr29a3s46e0nbr05vJfcTDiLiCVubPc5l7y+LNMa+3euZM1ra5A+zQY2Zx5MfX94M\/d64AH4D0ooV6zsnWqtW2dSbXxpbN9tDoqcQ5\/r\/wuZxu\/wDmZ43opW\/5f9BZUQFQEUDy0bAUD5jIyk8DqV+UnqRweK6ZVq14\/vam\/wDz8l3XmexQz\/PWpXzrNnqt8xxnb\/r8EbuJGAZgArgAMQMb+mM9OBVQq1XUadWo1bZzk1sul7HoU86zhwTebZm273bx+Kber6uqZ+sXVzDFC8NxPE5dwWilkjYgRSEAsrA4B5xmt5VKkfhnNaLaUl9hvo++vrqe\/hcdjZ04ynjMVOXJTfNPEVZSu43bu5t3b1b3b1ObbU9Syf8AiY33U\/8AL3cev\/XShVKll+8nsvty\/wAzo\/tPMv8AoY47\/wAK8R\/8sP\/Z","a_rank":"13","a_hot_flg":"0","a_views":"136","a_active_users":"154"}]},{"t_id":"nc_social","t_time":"08\u664255\u5206","article_list":[{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F6307ce4377b4c6c4c096db8b6df875c0","a_title":"\u7537\u5150\u907a\u68c4\u3000\u635c\u67fb\u306e\u91cd\u8981\u30dd\u30a4\u30f3\u30c8\u306f\uff1f","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 04:44:38","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/6\/s_6307ce4377b4c6c4c096db8b6df875c0.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F68ba880c204348b202f6b81fc1179625","a_title":"\u3057\u307e\u306a\u307f\u6d77\u9053\u3067\u8eca2\u53f0\u4e8b\u6545\u3000\u7537\u6027\u6b7b\u4ea1","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:33:08","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/6\/s_68ba880c204348b202f6b81fc1179625.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F4225c355ac01d3d995a444b83256bd1d","a_title":"\u6b7b\u4ea1\u3072\u304d\u9003\u3052\u7591\u3044\u3067\u7537\u3092\u902e\u6355\u3000\u5343\u8449","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:25:54","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/4\/s_4225c355ac01d3d995a444b83256bd1d.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F9844f92065cf7dfa17c542afd59cbb4e","a_title":"\u30c9\u30a2\u958b\u3051\u5f8c\u9000\u306e\u8eca\u304c\u52a0\u901f \u8ee2\u843d\u3057\u6b7b\u4ea1","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:43:26","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/9\/s_9844f92065cf7dfa17c542afd59cbb4e.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F973160b1d5e212a20985b92e397a7ecf","a_title":"\u5927\u962a\u306e\u9577\u5c4b\u3067\u706b\u4e8b\u30001\u4eba\u3068\u9023\u7d61\u3064\u304b\u305a","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:47:20","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/9\/s_973160b1d5e212a20985b92e397a7ecf.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F85992c67a1ce96617e18cfe136e4ecef","a_title":"\u685c\u5cf6\u3067\u5674\u706b\u3068\u7206\u767a\u3000\u5674\u71591500m","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:18:08","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/8\/s_85992c67a1ce96617e18cfe136e4ecef.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2Fb30d077a0599248c93cd315e7edb09f2","a_title":"\u8def\u4e0a\u306b\u5012\u308c\u3066\u3044\u305f\u7537\u6027\u3072\u304d\u9003\u3052 \u902e\u6355","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:38:38","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/b\/s_b30d077a0599248c93cd315e7edb09f2.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2Fd2036d594ca2d48d4df53b21d77d8ea3","a_title":"\u5317\u9678\u306a\u3069\u6674\u308c\u3000\u663c\u9593\u306f\u590f\u65e5\u4e88\u60f3\u3082","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 05:53:11","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/d\/s_d2036d594ca2d48d4df53b21d77d8ea3.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F75a8e33be1597d5d3fa48461fdd2898d","a_title":"\u9ec4\u7802\u304c21\u65e5\u306b\u98db\u6765\u3000\u6d17\u6fef\u7269\u306a\u3069\u6ce8\u610f","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 05:37:26","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/7\/s_75a8e33be1597d5d3fa48461fdd2898d.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F73f0405b12572342a1a469d7b84e81c7","a_title":"\u5b89\u9054\u5bb9\u7591\u8005\u300c\u8907\u6570\u5834\u6240\u306b\u907a\u68c4\u300d\u306e\u8b0e","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 02:24:21","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/7\/s_73f0405b12572342a1a469d7b84e81c7.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F9999%2F3afa7c92feade6cda7c4fc1818dec0e3","a_title":"\u672a\u6210\u5e74\u304c\u5ddd\u306b\u8ee2\u843d\uff1f\u6551\u52a9\u3082\u5fc3\u80ba\u505c\u6b62","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 01:25:49","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/3\/s_3afa7c92feade6cda7c4fc1818dec0e3.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2F9a5dfc4f4902cbc358453f46bcb3c786","a_title":"\u6771\u5317\u9053\u306b\u30af\u30de\u3000\u8efd\u4e57\u7528\u8eca\u3068\u885d\u7a81","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-19 23:48:31","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/9\/s_9a5dfc4f4902cbc358453f46bcb3c786.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F999%2Fb728c754375bbd6855be764eb891997d","a_title":"\u96fb\u8eca\u306e\u30c9\u30a2\u958b\u3051\u305a \u5ba2\u4e57\u308a\u964d\u308a\u3067\u304d\u305a","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-19 22:49:16","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/b\/s_b728c754375bbd6855be764eb891997d.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fnation%2F9999%2Fbb650dc169000a6e77589fb0d0af09a9","a_title":"\u5bcc\u58eb\u5c71\u3067\u8d8a\u56fd\u7c4d\u306e\u7537\u6027\u906d\u96e3 \u3051\u304c\u306a\u3057","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-19 22:43:10","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/b\/s_bb650dc169000a6e77589fb0d0af09a9.jpg?120x90"}]},{"t_id":"nc_poli_econ","t_time":"09\u664234\u5206","article_list":[{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F999%2Fe2d7949f40d551be2355167f6077a762","a_title":"\u9996\u76f8\u306f\u30c8\u30e9\u30f3\u30d7\u6c0f\u3068\u8ddd\u96e2\u309238\uff05 \u6bce\u65e5","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:46:11","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/e\/s_e2d7949f40d551be2355167f6077a762.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F999%2F4068a8dea8a7178978e51729d0d2be75","a_title":"\u77f3\u6cb9\u7bc0\u7d04\u547c\u3073\u304b\u3051\u308b\u3079\u304d6\u5272\u8d85\u3000ANN","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:33:20","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/4\/s_4068a8dea8a7178978e51729d0d2be75.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F999%2F680585530ce76183a2785dd6a72b9161","a_title":"\u5185\u95a3\u652f\u6301\u7387\u306f\u5e74\u4ee3\u3067\u7570\u306a\u308b\u50be\u5411 \u8aad\u58f2","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:20:03","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/6\/s_680585530ce76183a2785dd6a72b9161.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F999%2Feeacd0d46136c138ac90107499f3bc6b","a_title":"\u7d71\u4e00\u9078\u3000\u591a\u515a\u5316\u3067\u4e71\u6226\u6a21\u69d8\u306e\u53ef\u80fd\u6027","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:17:50","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/e\/s_eeacd0d46136c138ac90107499f3bc6b.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F999%2Fc4c903cecf55566753d7e5ff253c8b69","a_title":"\u300c\u30b5\u30ca\u30a8\u30c8\u30fc\u30af\u30f3\u554f\u984c\u300d\u53ce\u307e\u3089\u305a","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:13:57","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/c\/s_c4c903cecf55566753d7e5ff253c8b69.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F9999%2F92234b9fa689edd41c85e2e7072f9862","a_title":"NY\u539f\u6cb9\u3000\u518d\u3073\u4e00\u664290\u30c9\u30eb\u8d85\u3048\u308b","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:54:33","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/9\/s_92234b9fa689edd41c85e2e7072f9862.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F999%2F53dfdd3d3e66e358746b1c259e92dc01","a_title":"\u6b27\u5dde\u3067EV\u8ca9\u58f2\u6025\u5897\u3000\u30ac\u30bd\u30ea\u30f3\u9ad8\u3067","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:07:10","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/5\/s_53dfdd3d3e66e358746b1c259e92dc01.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F999%2Ff48d3d3e26e467f544920146811ae926","a_title":"\u65e5\u7523\u3000AI\u81ea\u52d5\u904b\u8ee2\u3067\u4f4e\u8ff7\u633d\u56de\u3078","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 10:01:56","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/f\/s_f48d3d3e26e467f544920146811ae926.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F999%2Fba0dfe2a46e4273cec801648abb596dd","a_title":"\u4e07\u535a\u9589\u5e55\u5f8c\u306e\u95a2\u897f\u7d4c\u6e08 \u6210\u9577\u6301\u7d9a\u306f\uff1f","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:22:06","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/b\/s_ba0dfe2a46e4273cec801648abb596dd.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F999%2F8faaaa15593f0710867b722a5c7b71da","a_title":"\u65b0\u5352\u300c\u6e1b\u3089\u3059\u300d5\u5e74\u3076\u308a\u5897\u3084\u3059\u4e0a\u56de\u308b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 07:07:05","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/8\/s_8faaaa15593f0710867b722a5c7b71da.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F999%2Ffebdc0e9cd630bbdec002c0fc1e20715","a_title":"\u56fd\u65d7\u640d\u58ca\u7f6a\u306e\u7f70\u5247\u4ed8\u304d\u652f\u630140\uff05 \u6bce\u65e5","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 07:11:29","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/f\/s_febdc0e9cd630bbdec002c0fc1e20715.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F999%2F0d4586f379c50e9f77fabd88c483c9ac","a_title":"\u30b5\u30a4\u30d0\u30fc\u653b\u6483\u3067\u8eab\u4ee3\u91d1\u652f\u6255\u3044222\u793e\u306b","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:04:47","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/0\/s_0d4586f379c50e9f77fabd88c483c9ac.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fpolitics%2F9999%2F2e66cc51ad264b71aae72f933a36125c","a_title":"\u9e7f\u5150\u5cf6\u770c\u3067\u521d\u306e\u5973\u6027\u9996\u9577\u8a95\u751f \u59f6\u826f\u5e02","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-19 23:57:21","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/2\/s_2e66cc51ad264b71aae72f933a36125c.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fbusiness%2F999%2Fadb345538998b5de7740be3c2e4a1541","a_title":"\u5317\u6d77\u9053\u3067\u5bbf\u6cca\u7a0e \u30c0\u30d6\u30eb\u8ab2\u7a0e\u306b\u60b2\u9cf4\u3082","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 00:36:30","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/a\/s_adb345538998b5de7740be3c2e4a1541.jpg?120x90"}]},{"t_id":"nc_entme","t_time":"08\u664244\u5206","article_list":[{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2F58f2598c867190201e73b78739398f0f","a_title":"\u6295\u8cc7\u30c8\u30e9\u30d6\u30eb\u5831\u9053\u306e\u962a\u795eOB \u756a\u7d44\u4f11\u6f14","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:37:06","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/5\/s_58f2598c867190201e73b78739398f0f.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2F39e2ea1ebf376443de930173641a8d84","a_title":"\u6771\u91ce\u572d\u543e\u6c0f\u300c\u6700\u5927\u306e\u554f\u984c\u4f5c\u300d\u6620\u753b\u5316","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:41:25","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/3\/s_39e2ea1ebf376443de930173641a8d84.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fcf049053fca30ae0807610cd208a9deb","a_title":"\u67f4\u54b2\u30b3\u30a6\u300c\u30ac\u30ea\u30ec\u30aa\u300d\u4ea4\u4ee3\u5287\u306e\u771f\u76f8","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:45:32","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/c\/s_cf049053fca30ae0807610cd208a9deb.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2F3f7502593289909e3c5b0f635f7e00c9","a_title":"\u98a8\u3001\u85ab\u308b \u4eca\u5f8c\u306f\u8996\u8074\u7387\u4e0a\u6607\uff1f\u306e\u7406\u7531","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:24:10","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/3\/s_3f7502593289909e3c5b0f635f7e00c9.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2F34db7ac10affd2c5ff09254b299905ea","a_title":"\u8c4a\u81e3\u5144\u5f1f\uff01\u306bSNS\u885d\u6483\u300c\u30c8\u30e9\u30a6\u30de\u56de\u300d","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:22:21","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/3\/s_34db7ac10affd2c5ff09254b299905ea.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fed3cd0d8867b6d8287f2c4f6128f57ca","a_title":"\u30a4\u30e2\u30c8\u3000\u4eba\u6c17\u6b4c\u624b\u30682\u30b7\u30e7\u30c3\u30c8\u306b\u53cd\u97ff","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 10:00:37","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/e\/s_ed3cd0d8867b6d8287f2c4f6128f57ca.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F1000%2Fadc9cd0c07aa422c3561c80fc84660ca","a_title":"\u30df\u30e3\u30af\u30df\u30e3\u30af\u3000\u521d\u5199\u771f\u96c6\u306e\u304a\u6e21\u3057\u4f1a","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 07:12:46","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/a\/s_adc9cd0c07aa422c3561c80fc84660ca.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fdf31dee03d95243520259b0d98652267","a_title":"\u65b0\u5c71\u5343\u6625\u300014\u6b73\u5e74\u4e0b\u592b\u3068\u30e9\u30d6\u30e9\u30d62S","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 04:36:44","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/d\/s_df31dee03d95243520259b0d98652267.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fad1412800a0c4d77c43b46b908a55442","a_title":"\u300c\u9280\u9b42\u300d\u4f5c\u8005\u30007\u5e74\u3076\u308a\u65b0\u9023\u8f09\u958b\u59cb","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 02:52:11","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/a\/s_ad1412800a0c4d77c43b46b908a55442.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F9999%2F685772bf8dfc8f22dae75469909297a5","a_title":"\u5143\u6771\u6620\u53d6\u7de0\u5f79\u306e\u5e78\u7530\u6e05\u3055\u3093\u6b7b\u53bb 94\u6b73","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 02:32:47","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/6\/s_685772bf8dfc8f22dae75469909297a5.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fe23d89687310d6ce60a0026ec68231fa","a_title":"\u677e\u5c71\u5343\u6625 \u7537\u5150\u907a\u68c4\u4e8b\u4ef6\u306e\u5831\u9053\u306b\u79c1\u898b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 02:28:17","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/e\/s_e23d89687310d6ce60a0026ec68231fa.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F9999%2F9b3eb18e373445d1aac02b7645b79ab1","a_title":"\u3082\u306e\u307e\u306d\u30bf\u30ec\u30f3\u30c8 \u89e3\u96c7\u3067\u8eca\u4e2d\u751f\u6d3b\u306b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 01:41:54","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/9\/s_9b3eb18e373445d1aac02b7645b79ab1.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F9999%2Ff5910bcd8fb05837fcf0dd8bbf92e0aa","a_title":"\u5742\u672c\u9f8d\u4e00\u3055\u3093\u3000\u9999\u6e2f\u6620\u753b\u8cde\u3092\u53d7\u8cde","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-19 23:45:37","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/f\/s_f5910bcd8fb05837fcf0dd8bbf92e0aa.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fentertainment%2F999%2Fea2348dbb46440ffc8dde32ce878d748","a_title":"\u9577\u702c\u667a\u4e5f \u30d0\u30a4\u30af\u30ec\u30fc\u30b92\u4f4d\u300c\u6700\u9ad8\u300d","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-19 23:42:50","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/e\/s_ea2348dbb46440ffc8dde32ce878d748.jpg?120x90"}]},{"t_id":"nc_sports","t_time":"07\u664224\u5206","article_list":[{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2Fe1544e4ee90ec0c9fa72f1b52893f89e","a_title":"\u4e2d\u65e5\u306b\u7570\u5e38\u4e8b\u614b \u30d5\u30a1\u30f3\u304c\u6708\u66dc\u306b\u5606\u304d","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 10:00:08","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/e\/s_e1544e4ee90ec0c9fa72f1b52893f89e.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2F3585462f3b7c2faede9a9b68004ccf02","a_title":"\u6751\u4e0a\u5b97\u9686\u3000\u5927\u8c37\u8d85\u3048MLB2\u4eba\u76ee\u306e\u5049\u696d","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:07:43","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/3\/s_3585462f3b7c2faede9a9b68004ccf02.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F1000%2F834134a57771ba5eb5a930a03e5a5d91","a_title":"\u30c9\u8ecd\u76e3\u7763 78\u7403\u3067\u6717\u5e0c\u964d\u677f\u3055\u305b\u305f\u7406\u7531","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:04:36","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/8\/s_834134a57771ba5eb5a930a03e5a5d91.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F1000%2F131d896815df2f6897bc0ef492250cd1","a_title":"\u30c9\u8ecd\u4eca\u5b63\u521d\u306e\u9023\u6557\u3000\u5927\u8c37\u7fd4\u5e73\u306f2\u5b89\u6253","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:04:17","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/1\/s_131d896815df2f6897bc0ef492250cd1.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F1000%2F00ddae7a3984edbef54d1ec94d3269d1","a_title":"\u30c9\u8ecd\u6226\u3067\u5ba2\u4e71\u5165\u3000\u5927\u8c37\u30d9\u30f3\u30c1\u3067\u7206\u7b11","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:47:14","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/0\/s_00ddae7a3984edbef54d1ec94d3269d1.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2F808e656342fee182f9baf9056641638f","a_title":"\u4e2d\u8c37\u6f64\u4eba \u5c1a\u5f25\u3078\u904e\u6fc0\u767a\u8a00\u306e\u771f\u610f\u8a9e\u308b","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:55:30","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/8\/s_808e656342fee182f9baf9056641638f.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2F638fa42e3960fe2fdfdb972e286c95c5","a_title":"\u5ca1\u672c\u548c\u771f\u30003\u53f7\uff06\u4e8c\u5841\u6253\u3067\u5fa9\u8abf\u306e\u5146\u3057","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:54:10","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/6\/s_638fa42e3960fe2fdfdb972e286c95c5.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2F7a8dae100c07499c50f7fb6ff4b0db63","a_title":"\u798f\u5cf6\u7af6\u99ac\u5834\u306b\u4eba\u6c17\u5973\u512a\u3000\u30cd\u30c3\u30c8\u6b53\u559c","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 07:05:49","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/7\/s_7a8dae100c07499c50f7fb6ff4b0db63.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F9999%2F80437d5f821aabe0bffe055b85478583","a_title":"\u6751\u4e0a\u5b97\u9686\u30002\u5ea6\u76ee3\u6226\u9023\u767a\u306e8\u53f7\u672c\u5841\u6253","a_new_flg":"0","a_photo_flg":"0","a_date":"2026-04-20 06:39:27","a_thumbnail":""},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2Ff57d4933354e4e7b3d1897b04abf6ae3","a_title":"\u6717\u5e0c\u7c98\u6295\u30825\u56de\u306b\u60aa\u5922\u3000\u521d\u52dd\u5229\u304a\u9810\u3051","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 06:20:04","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/f\/s_f57d4933354e4e7b3d1897b04abf6ae3.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2Fde6de2341d213ad90cfbe61587e44121","a_title":"\u30df\u30bb\u30b9\u82b1\u706b\u3067\u8a66\u5408\u4e2d\u65ad \u30ca\u30a4\u30f3\u3089\u62cd\u624b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 05:08:00","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/d\/s_de6de2341d213ad90cfbe61587e44121.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F9999%2F867e5b5ebcc96f8f6d0e77f677ca6f5f","a_title":"\u5927\u8c37\u304c51\u8a66\u5408\u9023\u7d9a\u51fa\u5841 \u30eb\u30fc\u30b9\u306b\u4e26\u3076","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 04:51:51","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/8\/s_867e5b5ebcc96f8f6d0e77f677ca6f5f.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F1000%2Fd7cea5a96990d45bd92f62d8d5801449","a_title":"\u4e09\u7b18\u304c\u4f1d\u8aac\u7d1a\u30dc\u30ec\u30fc\u5f3e \u6307\u63ee\u5b98\u3082\u79f0\u8cdb","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 03:59:56","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/d\/s_d7cea5a96990d45bd92f62d8d5801449.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fsports%2F999%2F1aa09e3218614938f6165d13adfc148c","a_title":"\u6751\u4e0a\u5b97\u9686\u300c3\u756a\u4e00\u5841\u300d3\u6226\u9023\u767a\u306a\u308b\u304b","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 01:52:54","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/1\/s_1aa09e3218614938f6165d13adfc148c.jpg?120x90"}]},{"t_id":"nc_world","t_time":"09\u664250\u5206","article_list":[{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F999%2F9561314cfc9879a174f0890c59c713c5","a_title":"\u30db\u30eb\u30e0\u30ba\u6d77\u5ce118\u65e520\u96bb\u8d85\u304c\u901a\u904e \u5206\u6790","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:22:27","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/9\/s_9561314cfc9879a174f0890c59c713c5.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F1000%2Facda1424222ff6c704a521191d5106ba","a_title":"\u30a4\u30e9\u30f3 \u7c73\u8ecd\u306e\u5546\u8239\u653b\u6483\u306b\u5831\u5fa9\u8b66\u544a","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:49:17","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/a\/s_acda1424222ff6c704a521191d5106ba.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F9999%2Fab6cc35599d8e40015db5113426486e5","a_title":"\u7c73\u8ecd \u30a4\u30e9\u30f3\u8239\u3092\u7832\u6483\u3057\u3066\u963b\u6b62\u3068\u767a\u8868","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 07:46:30","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/a\/s_ab6cc35599d8e40015db5113426486e5.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F999%2Fbe8831831d6fc936532297b02b7277ba","a_title":"\u30a4\u30b9\u30e9\u30a8\u30eb\u5175\u3000\u30ad\u30ea\u30b9\u30c8\u50cf\u3092\u640d\u58ca","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 10:19:26","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/b\/s_be8831831d6fc936532297b02b7277ba.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F999%2F7760593819350b0b5a1700a6268c4ee3","a_title":"\u5317\u671d\u9bae19\u65e5\u306b\u30af\u30e9\u30b9\u30bf\u30fc\u5f3e\u8a66\u5c04 \u5831\u9053","a_new_flg":"1","a_photo_flg":"0","a_date":"2026-04-20 09:37:40","a_thumbnail":""},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F1000%2F8cffa47b489e3ba3ad26e402fe62da5a","a_title":"\u7c73\u5236\u88c1\u7de9\u548c\u3000\u9732\u3092\u5229\u3059\u308b\u3068\u30a6\u304c\u8b66\u6212","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 09:12:36","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/8\/s_8cffa47b489e3ba3ad26e402fe62da5a.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F999%2F8e10b747837aad790949965a642991e4","a_title":"\u89b3\u8cde\u30e1\u30c0\u30ab\u306f\u300c\u702c\u6238\u5185\u7531\u6765\u300d\uff1f\u7814\u7a76","a_new_flg":"1","a_photo_flg":"1","a_date":"2026-04-20 08:51:17","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/8\/s_8e10b747837aad790949965a642991e4.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F999%2Fb643c877a5eed2163afcf8e148546abf","a_title":"\u7c73\u5927\u7d71\u9818\u3000\u7c73\u8ecd\u304c\u30a4\u30e9\u30f3\u8239\u3092\u505c\u6b62","a_new_flg":"0","a_photo_flg":"0","a_date":"2026-04-20 05:11:05","a_thumbnail":""},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F1000%2F52145463706fdbe05562bd2f046bf8bf","a_title":"\u30a4\u30e9\u30f3\u304c\u518d\u5354\u8b70\u3092\u62d2\u5426\u3000\u56fd\u55b6\u901a\u4fe1","a_new_flg":"0","a_photo_flg":"0","a_date":"2026-04-20 04:27:37","a_thumbnail":""},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F1000%2F30d33c371372654cb8da73d2b2aa9b49","a_title":"\u30d6\u30eb\u30ac\u30ea\u30a2\u8b70\u4f1a\u9078 \u91ce\u515a\u52dd\u5229\u306e\u898b\u901a\u3057","a_new_flg":"0","a_photo_flg":"0","a_date":"2026-04-20 03:29:08","a_thumbnail":""},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F9999%2F4c4b21ceac33aa49dc9d3ec2a149901e","a_title":"\u7c73\u5357\u90e8\u3067\u9283\u6483\u4e8b\u4ef6\u3000\u5b50\u3069\u30828\u4eba\u304c\u6b7b\u4ea1","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 02:23:47","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/4\/s_4c4b21ceac33aa49dc9d3ec2a149901e.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F999%2F7e9a13a6ce34f73fe58594d489ba2fc2","a_title":"\u7c73\u30a4\u30e9\u30f3\u518d\u5354\u8b70\u3000\u30d0\u30f3\u30b9\u6c0f\u3089\u53c2\u52a0\u3078","a_new_flg":"0","a_photo_flg":"0","a_date":"2026-04-20 01:51:11","a_thumbnail":""},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F9999%2F0e86fc9b5547c86aba6b2132e14c773c","a_title":"\u7c73\u5927\u7d71\u9818\u3000\u5408\u610f\u3057\u306a\u3051\u308c\u3070\u300c\u7834\u58ca\u300d","a_new_flg":"0","a_photo_flg":"1","a_date":"2026-04-20 00:47:25","a_thumbnail":"\/\/img.topics.smt.news.goo.ne.jp\/trimmed_picture\/0\/s_0e86fc9b5547c86aba6b2132e14c773c.jpg?120x90"},{"a_url":"https%3A%2F%2Ftopics.smt.docomo.ne.jp%2Ftopnews%2Fworld%2F999%2F2490094efe10834dba66cbc207357b9f","a_title":"\u7c73\u8ecd\u304c\u5c01\u9396\u7d99\u7d9a\u306a\u3089\u5354\u8b70\u305b\u305a\u3000\u5831\u9053","a_new_flg":"0","a_photo_flg":"0","a_date":"2026-04-19 23:49:33","a_thumbnail":""}]}],"sports_data":[{"sp_category_id":"1","sp_url":"https%3A%2F%2Fservice.smt.docomo.ne.jp%2Fportal%2Fsports%2Fstatic%2Findex.html%3Fstaticid%3Dshohei_ohtani%26utm_source%3Ddmenu_top%26utm_medium%3Downed%26utm_campaign%3Dso_to%26time%3D20260420102602","sp_title":"\u5927\u8c37\u7fd4\u5e73\u306e\u6700\u65b0\u60c5\u5831\u306f\u3053\u3061\u3089","sp_flash_flg":"0","sp_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK\/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU\/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU\/8AAEQgAfAB8AwEiAAIRAQMRAf\/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC\/\/EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29\/j5+v\/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC\/\/EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29\/j5+v\/aAAwDAQACEQMRAD8A+UtX+KvlWcmySsnwv48kv7yS4nkrzGXzLr\/rnUlt9otZPkrmnQ9z2Zr7f3\/aHvVl4y82Ty4P+Wld5pt\/dy2fmeXJXgXgDz5byOSevpfRJf8AiV\/PHHXh16EKcz16f+0HnXi3xvPYSfPJJXMS+LY\/L8zzJP8ArlUvxi10aDcJJJocOr2Tj9\/i7kt5EP8A2zrf\/Z9+KfwU8L31n4l1PStYj8X6JJ9osNF1e88\/Rr+4\/wCukcfmRyR\/8s\/M\/d16+X4SFT4DzK8\/ZzPavE\/h1PgH8EbnXNYutOvfiTd3FvbR6LfXEfl6b+8jkkt\/s\/8ArLi48vy\/M\/5Zx+Z\/rK838N\/tN+N7rXP7S1fw94c1zTpJP3mkx2H2OOP\/AK5yR15z4t8UXfjLxR5mo6ldanp1vJJ9g+0ySSR2kcknmSRx\/wDPOvX\/AAd4ctLDT45540l8yv1PCZJhMBh+SvCE+c+bqYqpXqe5M+gfB2v\/AAz+N1gI\/C+o3XgjxX5f\/Ir6\/J5kc8n\/AEzuK8l+MfgjVtBvJLHUbCfTL2P\/AJZy\/wDLT\/rnXIeMr\/Rb+3ktII\/s0kf+rrAtvjn4hsLP+wvEN3J4l0WP\/j3kuf3l7af9c5P+Wkf\/AEzrw8Rw1BfvMIdNPFfvP3hg3Og39rXOalf3dh5m+vW49esNZj+Ty5a868bWH+t2V8lDE15v2VQ+grQpwX7s8o1u\/kv7j\/WUabdSWv3PMrOvfLiuJK1tA0aS6k8yuiFT2ZwzO88LX93f3Ecbyfuq9Y0zwt51nG\/rXkeiaXPpckc\/7yWvZ9B8SpcaZE\/l9a8msp1XzwPRoz0PnXwl4Nn1n\/lnXT6l8L57C38yvQfhvpcf8f8Ay0rvdf0aOXT\/AJI60r1J06htDCwqUz5Njv5PDmqbHk8qvaPC3i3\/AIlcdeL\/ABR0aew1SST\/AKaV2Hhe1ni8N\/6v955dKcPrBzwqfV\/3ZznxW16e\/wBUjgh\/eyTyeXHVr4L+A4PFHxGt9NtdGutc+wJ9ou722uPs8cH+rj8z\/rn5kn\/bSuT8SazPYeKLa\/j2eZHH\/wAtf+WdfefwG8HaV4J+CHhnTNLksbqfxJBHrPiiU3Ekd7HPJ\/x72\/8Atxxx+X+7k\/56SSVnXqfVqBpQp\/Wa58+fEj4fX+l+NJdN06COW58uS4jj+z\/u5I\/+enmR\/wCr\/wC2lS+EviD\/AMI5HJoXiWOfSLaT\/V\/aY\/8Aj3kr7L0T4S2GqXEs97s\/1flyReZ\/yzqv8Z\/DfgXTPhfrQ1SwglsrC0k8ySSP\/pnXPl3FWLwkadB+\/A9bFZHQmp1EfEXim1u4rz9xPHc+Z\/q\/Lk\/1n\/XOuTuftcX+vgeKszwx4E8X\/wBhxz2OmX0WnX8+LCOX95HP5n+rj8uT\/wBGR1b8SaXf+F9Uk03UYHtr2OOOSSP\/AK6V+y5dnmEx69nT\/iH5\/XwNfD\/vD0D4XRSXWnyb\/wDVxyVt+NrW3is5K4\/wbrP\/AAjmh+W8n7ySTzKytS8R61481STSfDemX3iC9P8Ay7abbyXEkf8A37\/1dfmOY06k8dOpTPpKFSHsIe0POdb\/AOQp5aV6l4AsEuo443rCi+COo2Gp\/wDFX+IdL8LXMf8ArNMEn9qar\/4D2\/8Aq\/8AtpJHXsfhbwbaeF4\/M0jw1qWuSRx\/8fvim\/8A7Pto\/wDtnb\/+1JKmcKlQ8Wvz+0\/dm1pvhKC68uP\/AFskn+rj\/wCeldtZ\/BvxB5A8nw1qvl9v9Hkrhbn4jato0ckeo\/ELSvDNt\/y00jwdYR2\/mf8AbT\/Wf+RK5OX4u+Grdym\/XNTx\/wAvVzf\/ADv9a54YVr46h7GHxXs4fwza8AX8cUce+vSrm6jl0+vAbLVJNLk+SSvY\/gNoNp8bfHlt4QvvEL+Hri7t5JLSW2t\/tElxJH\/rI\/8Av3WuKoVMR+8OyhivZ0zxjx1pcGqaxHG\/72PzK3tE8j+z5Ld469R8Wfso+IdH+MH\/AAi83iTR\/wCydklxH4o3\/aLeOOP\/AJZyW8f7yO4\/6Z\/+RK9S074SfBr4f2JjlT\/hZOnxxyf2trcupSWlxYfu\/wDl3t4\/\/tldtDA16mlOmeZXr06lQ\/N\/xzYySajqKf8AXTy6\/SLwn4s8PfErRPDF9deE0i06fRbf7J5cH2fzI\/L8v\/ln\/wBc68J1L9n7VfiN4Yl8UeA\/Cd9rmjRyfY7j7DJ9ol+0f88\/+en\/AC0j8yuo+C8vxQ+HMt54P1L4f6\/qNtosce+OysJJL3TLeT\/np\/yzkj\/eeZ+7k8yvIzTBVmvYfbgenl1ahTqe0+wfQ2kXVpYWdtBaySeXb\/u4\/Mk8yTy\/+mlc74+0yx+IGiXuhXqeZp13\/r\/+mlZtz4onuvMj+yeVHH\/rJJK7PQPht4u8RWnnJ4f1SS3k\/wCWmzy\/M\/7+V+bezqzqfuz7f6xS9n+8PPPiV8dvht4A8MR3V1pV7req6Z\/xL9M0m3tPLto5P+un+r8v\/ppXxFpkuu\/Fvxz4h8Qa2l1PeX9\/JcXk1lb+Z5cn\/PP95JHHH\/20kr6o\/bG+CXxX1+Pw5BoPw28R32lWEcnmf2bH5nl\/9s46+J5dNhKCxu4ZIzbySb7KX935cn\/LTzI\/+elfo3D1Cph6ftIfGfD5viliKns18B9wfCH4c\/sk6Xo9nqXjv4gpdat5fm3ek+JLj\/j3k\/55+Xb\/ALuT\/v5JUN3+1V8Gvgdo99pngKDVfivrMk4+z3WtQf2foVpH\/wAs4\/s6eX5nl\/8AXP8A7aV8Y22l2nl\/6hKux+EpNU8vZH+7r6n2FeofP+0geg3Pxp8b+MtY1G\/0vSYP7R1O4kuLu5srSOPzJK2pPCXxC8Uafbf2jd\/Zo\/8Alp9tu\/M\/8hx1Z+Hmjf2XHHG8denSy\/u466aeB\/5+HNUxX\/Ps8x0n9n2wv7jzNX1qe5k\/55W0flx13EX7Pvw82DzdHkuH7yXN3JvP1retovNra8qSorZXCbuaQx1Q8P0jwvYfY49W1f7Xc232uO3k03TY\/MvbjzP3knl\/88\/9X\/rK9s+Ffn209zdeEvD118MfD\/7uJLi+j\/4qbUPLk8z95cf8s4\/M\/wCWcf8ArK8T1vQbu\/0+O0+1vY\/6RH+8tpPLk8uvUpPiDBFp9tYaXH9m+z2\/lxx\/88697h2lTxNSoqnwQOLOMVXw0OSn9s9J83WfFl5c6KljY23\/ADwtvtlvbyeZJJ\/rPLj\/ANZJ5kn\/AF0r1r4Ufs1ah8O\/iFZeIb\/xPe6jLpNp9iu5HtbeC21MSfvPs8ccf8Ecn\/LST95Xzj+zH\/xVH7VXgy3n\/wBVYyXGoeX\/ANNILeT\/AOOV936lqn2XzI\/9bbeZ\/qv+Wkf\/AE0rLO8bOlU+r0jiyui6lP2lQ2YvFH2WOO0tY47G3j\/1dtbR+XHHXSW10+qW8aTu8v8Ay0\/6514\/Fqnm3ld7omqf6uvkah9IZ178PrD\/AITSPxCmi2MutfaPLjuZI\/8AyJ\/10\/6aV1emxX0MkjvJ9pi8z\/WSSfvKsxX\/AJtWI5aytT7G12XbK\/k\/56V+ZH7e37Leq+KfEXjT4n+EtFnC2Ekf\/CQ6UIv3h8uP\/kIQeWfnjkj8vzI\/9ZH5fmV9v\/ELx9ouh67Hos2pal\/b09hJqiaTpwxJJZxyeXJJ\/wA8\/wDtn\/rP9ZXKfDjxvqeo6vpVp4kTVdH+33FxHaR29\/HqFtceXHHcRxySeX5n7yOT\/V\/9M5I67qEJqHtOQxPxy0397HHIn+rr0nSLqD7PHsjr6b\/aJ\/Zq8N+GPFFn4s8JeR\/wiHinzLi3trb\/AFVpcf6ySP8A6Zxyf6zy\/wDln+8rwfV\/h9Ja3HlpHWcM1hTr\/V6hrTwvtIe0LPhu6kv7iONP9ZXpNtoN3dW8e+s74XeA5LWTzJK95sfDkf2f\/V15GO4pp4Op7M1\/sr2nvnlum6NJFHWt9hkrvJNBjiqP+xqy\/wBbaBzf2UzwHxb4IjsI5JLXf5kdWfHXwq\/sa3ju\/Bsl9rn2jy5JNI8vzLmPzI\/9ZH\/z0jrnPG3xL8rzJEqv4b+Jf2q80m\/vY\/tMdpHJbxyf8+8ckflyf+Q69jA46vg5+0oHTisJDEU\/Z1z1H9hyZLn9qOK4uX8vzPD1\/JH5n7vzP9XX294g8uW4kgvfMtpPM8u31KL\/AFcn\/XSvzN+I\/wC0LB8B\/E9tc+Hvsmr+OLCOSK3uf9Zb2Eckfl\/vP+enmR\/8s6reAf24PjF8T\/iPp2iiXRz\/AGn+7+zRx\/Z45Jf+en\/XT\/pnXRisbUxlT2vIcNDC08PD2Z+jv9l\/ZZPM89Jf+uVdPoH7q8j\/AO\/leY+DpfEOgyRwavqWsfafL8ySK5jjkj\/8h16lpH72PzP+Wkn\/AKLri\/iHSdHY3X7ursUtZMUXlVZ82Py6APK\/2nrm18OaTpPje6u49MHh6\/jjuL6X\/V29vcfu\/wB5\/wBc7j7PJ\/38rz7wd4Y8ZaZ4T0G+0Hw3dW1vBcR6xBJqySSRx+ZcfaJI44\/9Z\/q5JLeP\/rpX0h9g\/tmPy\/M82ST\/AJZXMfmW1x\/0zkjrxG9\/af8ACHgN9VuYfFp06ysNauNBvLPW4LiS3kvI4\/Mk+z3H7z93+8\/5aV6+Fr1+T2dOnzmc+Q820Dwvfax8CfiLprvPKfCep3mqWFvJ\/wA8\/tkkn\/fz7P8Au68Qkv47+SvsXw5+0P8ACH4nz+K9M8Na7pd34v17SbiOSytpPMN\/5dvJ\/wCP18UeVBYWdtIn+s8uOvMzDD\/WK\/t\/Z8kztwtT2f7s9B0DVILD93XYWXjKD\/V+ZXjdtYXd\/b+ZBJJFXKX2qa14X1iPz\/MltpJK8h8L080V\/wDl4dVbG+zPqmK\/juo\/MSj7VHXn3hvXpJbOL95UV94p8m6dPM6V+X5nk9fC1nTOiFfQ8g+JHg2O6jkk\/wBVHWL4J8Gx12njbWY\/7P8ALeuL8LeI\/NuPL8z93HX31OpU9menUp0+c4P9o\/4TJLZR+JNLjzcQfu7+KP8Ajj\/5ZyV0f\/BO74c+GvGPxOvLjWtWh03UtKuLCfRYpH\/eXd59ok\/dx\/8AbOOStDxt4j+329zA\/wC9jkj8uSL\/AJ6R11H\/AATt8L+G9G+L\/wAQNS1vTY77VdB0H+2dIuZf9Zb+XJ+8kj\/6aeXXt4Kv+7\/eHz+Kp\/vP3Z+gni2\/tLq8j+1R+Vc\/6yP\/AKaVo6RrMkX36peCfFGk\/EvwXpOpeR5Vtr1vHe2Hm\/6y3k\/551HbWs9hcSR\/8vNv\/wA9a1OacPZz5Kh3H2+T+z\/tccf2mP8A55f+06P9VHbXcEn2rTrj\/j3ll\/8ARcn\/AE0rJ03UI9GP9u2UclzoM\/8Ao+rabL\/rLST\/AD\/5DrW8qDwvebHk+0+FNW\/eR3Mf\/LOT\/npWpkXL++\/sLRtS8QWSSXMVhZyXkll\/00jj8zy6\/MP4EWkn7R\/i3UvhZ4nv5\/C+ta1qdx4qjlFh5kkGoeX\/AKRbyRyf6uPy5P8AyHX6lW3n+HLz\/nrH\/wA9I6+K\/DOnaN4K\/wCCl3iyx1O3hltvFEckcEsn+sElxbx3Efl\/+A8lfR5RWnThX9n8fJznNXh8A34Xfs\/\/APDMvx0vrTV\/EOn65Zal4L1TUIL37N9nkg8iSPzP3fmV8p33jL7Vcfa0\/wCPaSSSSOL\/AKZ+Z+7r7U+Kun\/DvVP2rPDNj4o8SXt942fRb\/Rv7Jjl8y3uI\/s8v2f7QP8Al3eSOS4\/d\/8ALT93JXwJq9h9gkkg\/eeXH\/q\/M\/5517GHp\/2h+\/qfxOT\/AOSM\/afVz6l+F3kazZx\/cro\/GPw5g1SP95HXifwT8W\/ZZI4\/Mr6kj1SC\/wBL8x9nmV83U9pg650fxDxuKKTRv3D\/APLOuL1jWY\/t8ldh4\/1SOL7Ts\/1leQSX77zXyuOpe2qc50wOn+LVhHoNnJv\/AOWdeC6J4ogikk\/5ZV6D+0948+1ap\/ZNr\/20rwGKuqjhIUzaeKqVD0b7f\/aknlpXrfwTi8SxeINRsPD0cH22\/wBIuI5PtP8Ay0t45I7iSP8A79x1598LtB+3+XX058F9Lg8OfFzwXO8f+jSX\/wBnk\/65yRyR1w1OSnU9melhVf8Af\/yH0V4J8Rx69rnj2wT\/AJdNbjuII\/8AV\/6PcW8dxHXp+m+R4tjtv3\/lat\/y73Mv\/LTy\/wDWRyf9NK8O+C+lz2njj4g297aPFZQSWenfbf8AnpJbxyR+XH\/1zj8uvTo7WS1vJJJ455Y\/tHl38Vt\/rI7j\/lncR\/8ATT\/7ZHXfR\/hnLmMYQxXJT\/u\/+km7PZ6lod3Jq1laeZhPs9\/pMn\/LeP8A55\/\/ABuStLTLqxsNO8yGT7d4Mv5P+Wn+ssJP+mlS6R4yn0vy4Ne2anZeX5lvq1tH+7kt\/wDnpJVi+8OSaPcSazoKJfWV3H\/pem\/8s7iP\/wCOf9NK6DzS9psUmjSR6TeyebZSf8eF9\/7Tkr4U+P8Aaf8ACJf8FKvh\/qMyYt5JND5\/7+W9fbFtPZxabhJJLnwzcfuwJf8AWWEn\/POT\/nnXyB+3t4R1a08Y\/C74jWqXF9\/Zt5b6Xd3NvH5kn\/HxHcW8knl\/9tI69rKHTWK5Kn24TOet8B6n\/wAId8JL\/wDbE8ez6Z5n\/C34NFt7ye53+ZHaSf6vzI4\/+enl\/Z\/M\/wCmcn\/XSvhr4tWsF\/4w1GeytPs1tcXEnl23\/POvt74S6HBYfE\/41+Nb7Rp7HVdZ8VXGjR3Nynl+ZYQW8fl+X\/0zkk\/eV8kfFGwg\/tSS7T\/lpJJXsZbX+r16n+CJjXh7SmeSaJdSeHNYjkT\/AFde0WPxQji0\/wAvz68b1fy\/tFLL\/wAe9ednFenUqDoHX3Pi2TXtQkjT\/VVXlsPnP7ysDw3L\/plegxbNgr5mcDtPnT4mazHr3iy5u0rGttGnuo\/MgjqST99qEe7mvcfh94W026j\/AHsAf6murEz9hsduGoqvuYHwu1n+xpI0nj8qvebbxR5VxpN\/BJ\/x6Xdvcf8AfuSvOtS8LabDqHywAV02k26fZIosfJ6V8tXnz1D6CdJUKXIj791KWO1vI54I08uSTzP3X\/LTzK0bmL\/VX8Ef2r\/lyu4v+fiP\/WRyf9dP\/akdcxaTNfeEbKeY7pPsFvz\/ANs66fxN\/pvw1WGX5o57C43j18sean5PzX0a2Pk3uT2kscMcsonGz\/j9+1W0f+o8z\/l8jj\/55\/8APxHW3Y\/aPDmoGC1SC2kk\/ePpu\/8A0K7\/AOmlvJ\/yz\/651i20zRNbTKfn+yR6jn\/po\/8ArR\/uyfxjv7V2Fjp8FzFr+lSxh7LS5P8ARYz\/AMs6YiJ7Q3U0mq6Kf9O\/1d5ZXAx9oj\/55yf9NP8AppWKLpNLFtd6fI8enfaPLSOT\/WWFx\/z7yf8ATOtJP9FvLTyvk8+3+fHerXj\/AE+CZraZkzJfxfZ7g\/309KAPJ\/iZqk\/hfQ9e1ZP9J077HJcxxeZ\/q7iOPzI6\/N3xJ43\/ALekjj8yvuv9oXWbqx\/ZP1y+ik23U41S3d\/VJfvj8a\/NCyuX\/tSXmurCzZlWN25\/eyR10+m6N9qs653+CvRfCX\/HnXNUmIwLbRvstx5iR1vfanrTvYE8zpWJL981iM\/\/2Q=="},{"sp_category_id":"1","sp_url":"https%3A%2F%2Fservice.smt.docomo.ne.jp%2Fportal%2Fsports%2Fstatic%2Findex.html%3Fstaticid%3Dstoveleague%26utm_source%3Ddmenu_top%26utm_medium%3Downed%26utm_campaign%3Dso_to%26time%3D20260420102602","sp_title":"\u3010\u30d7\u30ed\u91ce\u7403\u3011FA\u30fb\u6226\u529b\u5916\u30fb\u79fb\u7c4d\u306e\u6700\u65b0\u60c5\u5831","sp_flash_flg":"0","sp_thumbnail":"data:image\/jpeg;base64,\/9j\/4AAQSkZJRgABAQEAYABgAAD\/\/gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK\/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU\/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU\/8AAEQgAfAB8AwEiAAIRAQMRAf\/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC\/\/EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29\/j5+v\/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC\/\/EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29\/j5+v\/aAAwDAQACEQMRAD8A+Eba68qvpf8AZCv\/ALfJrUf\/AFzr5sGhY\/jr6H\/ZI+waFqurfbb7ypJI6\/UMVQqexPz6E6fOeWfGf\/RfiJrUfmf6u4krj47qvSvjFoWm6n8QNRu7S7SWO4k8yuQufDsEUfySfvK7adP2lM4p16Ziy3PmVraRf\/v7f\/rpWLdW3lyUaZL\/AKXb0cgTgqkD65uf7MtfD9lI\/wDra9o\/Zv0u0v7iSfy0r5S1vxRYXWl6Tsn\/ANXX0N+zp8QdJ0GP9\/dpFXz+LwtQ9vA17Uz62k0uP\/nnVnTfL0uTzEjrgv8Ahd3h7zP+P+Cun8HeMtJ8ZSSRwXyfu68j2bPR9oXdSij1S48x46r\/ANjR\/wDPOq2v+LdJ8L6p9knv4P8Av5VKP4oeHv8An\/gp+zgP2hynxj0aOLw\/cyJJJFJH\/wAtIpK+QPHfiOS10eSSDWrqK5jk\/wCWVxX1t8WvG+i6p4TuY0v4\/Mkr86vGOqfatQvY0k82Pz\/3detl+EhUmeHmlecP3aPcPBPjK7l0OOOfVrqXzI\/9Z9oqvq97qMV2DDr19DHIocJ9o6ZrgpdBk0HwfHd\/a4JfMj\/eRRf8s65jUtYjmuA\/2jqoru\/s6n9g8P6\/Xo+4eZRyvs++9WLa6kik+SSSL\/tpUdJJ0r6DnR3Gl9q\/vvS3Emf46zbb97V6KOtPQ4501BlWS1k+\/wD6yq\/2c\/3K1fsskVEkVPkL9qZ81zMP460NN127tY\/3E8kX\/XOSqVzFRZRVia39w3o9e1P\/AJ\/5\/wDv5W\/4X+KvizwbcefpGtXVtLXKcetHl+1a\/V6Zxc7Om1f4n+KfE95Jd6jrV1c3NUv+Ey1r\/oJ3f\/fysqKo5DiSj2FM09pM2ZfGWtfZ5I31KeWOT\/ppWDc3XmVLMP3dUZf+eiU1Tp09gh+83NaXxHf3Wnx2jz\/6PHWdJcybz+8oj\/e0\/wDd\/wDPOiwz7ij\/AGHvD0sn+sf\/AL+Vtf8ADCnhb7PX1T9gt\/SpPsscVfyn\/rZmX\/Pw\/d\/9WcCfIupfsFaFLH+4neKsX\/hgqDzPkv56+2fsEcn\/AC0pI9MT+\/mtKfGGa0\/+XhlU4WwNQ+J5f2Co\/wDn\/nrOuf2BriST93qU9fd39mH\/AJ6UfYJIv+WldX+u+a\/znP8A6p4E+BdW\/YC1AW\/7i\/fzKfoH7A1+YP8ASr95f+uVfe\/2CT\/npUf2CetP9d8yM\/8AVPC7HwzL+wNcfwXc9Vrn9hS7ij+S7kr7vtopPtEcb\/6uvQNN0HSpbePfHHiu7C8YZjiN6hyYrhrCYc\/MiL9h6\/i+\/PJRc\/sNXfl+Yl3PHJX6kf8ACMaPIP8Aj2g\/74qnc+EtJl\/5ZpH\/ANcq9epxHjqf\/Lw8n+w8Kz8tpf2HtW8v\/j7nrOl\/Yp1q1\/5eJP8Av3X6Vato0FhceXD+9rO+yx\/88xXkf69Y6melT4WoVIH5nyfseeJYpPkk\/wDIdU5f2S\/Eu8\/\/ABuv0zktY\/8AnhUflR\/8+9dH+v2OD\/U+H\/PwrabqlpdW\/wAk\/wDq60o7+wlt\/wDXx+bXz7H4jk\/24o\/+mVaNl4ok+2eW8kkVfGzy4zp54e0RXUfmfJVn7fHF\/wAtK8+sr+7it\/38E\/7z\/j3ufs\/7uSshPFWsr4j\/ALGk8CeILqSOOTzNWknggsv9X\/yzkkkjj\/8AInmf6z93+7rOGW+0PXwuOr19T1iW\/wD+mlXbaWSW38zy\/wB3J\/q6+b\/HPjO7t9Oi1v8A4S\/QPAWiwT3FnPcy6nb6h9ok\/wCWf7z\/AJZ\/9s5K1vBOqfDbw55f2Lxfpt1r2tWn2i4lkvJJLm7t\/L8zzPtEnmSeX\/37jrT+yju9pXPevt8fmeX\/AMtKkiuo\/wCOTyq+ffFH7QWm+EtYvdN0u0vvF2owf6yLTfMvI7f\/AJafvP8AlpH\/ANtK4e9\/aW8Z\/aZJLXwLGI\/M\/d\/abu3t\/wDtp\/pFxHXTDJJ1DpvXPr79x5n+sol8z\/lhJJXyD\/w038SrX95P4Mtfs3\/YT0\/zP\/Sirtj+194h0uSP+2\/hzrksfmfvPsVv9o\/9F0\/7BqLYU6lY+traW78zy3kk\/wC\/lVpJbvzP9ZJ\/38rwHwt+0Ff\/ABB8eSR6JHY23hi3sPtE8V9JJ\/asdx5n+r8v\/V+X\/wBdK72P4jXcscn\/AD0jrhr4KpT\/AHdQ8yeNWHn+8PQZJZPMqPzZ\/wDnnXnP\/Cxp7ry5E8vzKs2Xjy7ik8x40ljrg+pEf2wei\/ZH+z+ZVLD1ylz8WrCX935nleZUv\/CW2E3z+f1p\/VDo\/thfzniWm3WkxXH2T+2ki8iPzLjzf3fl\/wDXSvD\/AIu\/tZeDPAFxLHp2pT+Kr3\/lnLpN55ccf\/bSP95HJ\/37r5w\/ac+OPinWtXl0ZNCn8D6TOguPsOfLubj\/AK+H\/wDaddj+zR8DrfwxdaJ46+IuiQSaVP5cmm6dqyRyW8tvJ+7+0SRyRyeZ5kkkf2eP\/lp\/rP8AVx\/vP0X6r7P36h8\/gcug56Hr\/gXxR45k8B3njfVNdtPhZ4d8z97babaSXGu3kfl+ZHJJcXHmSfvP3fl+Z5lcD8cP2mp5vHniPUtB0mCxubuOOzj1aWSSS58z935n\/XOP935flx\/89PMrmPit8VdS8Wx3sjz\/APEu+0eZb23mf88\/M\/eSSf8ALSSTzPMkrxu9lv8AxlqltYWsc8tz5cf\/AFzj\/wCuldWFwvtPjPqa0\/q1P2Z3P\/C5NWtdLsoP7NtYre0t\/wB55txJb+Zcf8tJP9Hkj\/5Z+XH5f\/TOqVjdfFD4oW2pXfh7SdV1y3uLjzLu502w\/dyfvPM8vzP+ef8Aq\/3f\/TOP\/nnXvv7Pn7Edh4t\/eeK50vr2OPzI4rmOT7NX1Br\/AMCNS+C3wnvrfwpr19ofl+XFaWMkcd5b2\/mSfvPLjkjk\/wCmn+rrpr06dP3KZ5Pt69Q\/L\/xb\/wAJv8PpLKDxDaa5odzJ+8tI7n935n\/LPzKpeG5dd8eaxb6Tp1\/qV9qt55nl232\/y45P3fmSfvJP+uddZ+0da+PbX4gSWnxFu577Xo7ePyLmVPLjktP9ZH5f\/TP95\/388yvMJbWC10+98\/8A5aRxx\/8AkT\/7XXTCh+79oZ\/WJ0z07xR8PvH3gPwfJrWt38EVlBJHH5cXiK3vP3kn\/TOPzK4f\/hY3iGw8yeDWtStvM\/1kUVxJ+8rnLKwktbiTfaTxeZH+782Py\/MrVvbWD7RbRx\/8tI61hD93cPbs+7\/2NbXxR4j8LxeKNeu3ispPtFvYWUUfl\/aI\/wDlpJJ\/20\/9F179FYW9\/eeQ9\/8AZo44\/M\/e1w3w71SPwR8P\/DEEEb31tHpFn+6\/7Zx+ZXo0XiPRfEf7v+zZ7a58v\/ln+8r4zF89Spznytev9YqfvCPRNBj+0fa\/Mj+zeZ\/38rVubWP7PJH9rgi8z\/llV22tYJfD8kl15emeX+7jtpaxdNtfN0uSO12X1lb+ZJ9pk\/1kkdeRNe0NIfuyOXRoNLjjn\/1sclEV1pGwebaPv7\/u6pS38n2eSe1uJJY7CP8A1Usnl+ZJ\/wA86z7zUvEt3OZfs9r83NdEKczKdbkPl7xF8OrD9or4uxwQPaXWnaELjUJIpbv7PJeW8cn\/AB7x+Z\/z0k\/79x+ZWB8WvFF\/rNvbQWUfm6d4anksoJZY\/L8yT\/npHb\/8s445PtEccf8Ayzj8uvSdE8eat4S1i5+1eCPA8n2S4kj\/ALNtvLj8u8jk\/wBZJcSfvJP+ukdZfjb9nnUfjTP\/AMJf4Yey8GNJJJ\/a1vc3nlxX9xJ+8\/4l\/wC8\/eeZ+8\/dyeX\/ANs6+wrV4VJ++fo2CwtTB0D5a1Hx3b21pJPqlglz5f7yO28v93JJ\/wAs\/M\/6Z16j+ypo1pKbLVrqP7TcTySef+7\/ANXXlPxQ+H11pWo3lpPpk+kSW\/3LW5k8yTy\/+enmf6uTzP8AWeZH+7\/eV1HwD8Y3WiwGOxuEjvI\/v21z\/q\/\/AN3\/AORP+edejD4P3Z5tf2lSp+8P2J8AaXBdaHbSfPF5dx\/pEcn\/AC08uT\/V\/wDfysz4u6\/a+N9c0vwhpgguJHuI\/tcn\/LOP\/wDdxySSf58yvA\/CXjfx3rOn21ol\/BY6dJJJJHJLJHHJJH\/yzjk8uSST\/wCOf9M69O8Hf2L4D8PxXE93JfajH\/x8al\/y0jj\/ANZJHH\/00k\/5aSf8tP8ApnH5ccfiufIL2B4D\/wAFY\/BthLp\/gLxRZR+Xcx3FxpUn\/TSPy\/Mj\/wDRcn\/fyvmz9ie\/+wfFDWkTZ\/aMmkSfZPM\/56eZHJ\/6Lr0b9u\/40wePNc8MeE0uJL7+xfMvLySL\/n4kj8uOP\/v3\/wCjK8F+G+syeEvElt4hsrSPzII\/9bJceX\/rI\/Lr24QqVMKcVTCup7lM9k\/bdi1LVPEnguTUbtL6P7PeR+ZFJ\/q\/9XJXhVl8L9Sv\/EnkWWm3d9Jb38kdx9mt5JPLj\/1n\/LOvY9W1Sf4l28d3rc8EWnW8nmRy\/wDLOOT\/AKZyeXHH\/wCRK6jw1qcdjKH0tI9fsbRJLiS3j+0eU9xH\/q4\/3n7v95J5f\/LT\/np+8ohU+r0PZnp4LA1KdD94e++G\/tf\/AAjei3E\/\/HtJYW8cf2m38uT\/AFf+r\/66VJfapf2F5cx6XJH5cH+ri\/1cklSf8JF4v8ZfDCz0PS59N0y3P7zzdff7P5dx5n+s\/wBH8yPzP+mdeSP8K\/iDofxHvF1rTZ\/7VsZJJbuxsrv7RH5ckfmeZ\/rP9XXz8KPtP3lQ+HzjA1MPXuvtnp\/hfxbd69qn2DV5Hij8zy\/9Z\/yz8v8A56VteErXxLa2dzaQTyW3mf6P\/q\/Mj\/6aeX\/n\/lpXmNz4ck1TULL+yNS\/siS48u38qX\/WSR+X+7k8v\/ppXp3g3WbvQdLstJ17UtNi1H\/V\/bZZLfy5JP8AV28cf7yuWvT\/AOfZwUKdT\/l4Uo4pPFEf2+CS6ubL\/lp\/yzjjrMmi037RL\/ah1XTL3efMtftEnyV3McV\/FqEkel\/2H+7uLj\/Rvt\/lxx+X\/wBtI6R\/Blh4nCXF94x0jUbmBRbPcXPw9uEdtnHJ\/j\/3+\/4VywnUNfYXPzf8W\/F+\/wDDniy5sbWeSxksJPLjtpJPMj+z\/wDLOOT\/AK5\/89KydN+NM91eR74LW1kjk\/0Py\/3ccckkn7z\/AJafu\/8AtnXmOraXqX2i9n+f93\/pH+k\/6yqUdhqV1LL50H7zy\/8Av3X1f1Q+zhmv7v8AiH27H+2EP7K03whNoVlfafIn\/Ew1LW7u3uJLiT\/WfvJJI\/L8uP8A8if+jIL7w5+zz4t1e10nwrdTeGtejj82\/wBbtbufy45P3f8Aq45PMg8v\/ln\/AMs\/3knl18gWPhO+EV7du93bSQSeWn7vzPM\/56R+ZWhbeGLz7P5kdikllJ\/rLm5\/1fmf6z\/2n\/6MrP6lUp\/ww\/tSnU\/iH3v\/AMIv4XsNH0G++HnjfUrmSS7uLe4ubm4s7yPy\/wDV\/aP+Wf7vzI\/+mn\/XOrGreDfH3ijQ7b+xPH2gXMcnmfvLaP8Aef8AfvzP3dfnNc\/aLH9xNBJHHH\/zykk8vzP8\/wDoyu+sviz47+HyjTrXU7q2+yQHzIrY\/wCr3\/8ALP8A+OVlChXp\/Gd8MdhD650n9kvWpf3mqa7o0tzcfvJPNsJI\/M\/6aeZJW9Y\/stWFh5cj6t4fikj\/AOmkcnl\/9NI\/3lfFmoftA\/EjUIZIlvXsLLzPMkjspI7eL\/v5\/wDbKLr4sfE\/xHZS2D3l7Lbx\/u7jzJPL\/wC\/knmf58uuift19s7IY7D\/APLs+5P+FS+DNGk+1634s07zP+fn7J5kkkf\/AF0k\/wDjlH\/CefA3w55kc+uvfSR\/u\/3knlx\/+Q\/Mr4Wk0XxpHaCbWtV0vSY5P+WmrXcfm+XWFrN34dh0uzgs72+1TVUeSS71IHyrd4\/3flRxx\/8ATP8AefvPM\/5aR\/u\/3dc9nUHPMVTgfdmv\/t9eHvC9vJaeF9Jjljj\/AOPeXzI4\/wDP\/furvw7\/AGtNW+JdvrV3ezwaHq0f2O30G9jtLeSS4\/ef6R\/rP9ZH5dfnZ4dijmvEkuYp3iMmXEX7yT\/43\/5Dr6X8OarpmhaLpxm0m6fWpLT95FeySeZ\/Z8cnmeZJ\/wAs4\/M\/1n\/tP\/V+Z0\/Vf3Z8tjs0p1ITPqPxB4j8NeLZLJ9Rjgvrm78yOS5ik+z+ZJH+8k\/d28n7v\/7ZWVoGvfDL7RqUet6brOp6dafvLS5ufLk8v\/j3\/wD3f\/PTy\/Mri\/Deu+E4tE16w0+TVb221OP\/AI8r7TI\/M8z\/AFn7vzLjy\/8Aln\/q5JP9XJ\/37pWNhYXX9o2Ekj3NtJaeXJcy2H7yS3\/dyRxyR+Z\/rP8AWf8A2yuH2B8fOvM9X\/4TLSdZvLK+06Oxl1GC8kuLv7T5ckdxHJ5kf\/LT\/pnW3oes\/wCiy\/ZfEv8ApHmv9r+zRx7PNzxj95\/zz8uvL7nVLCLR5LDTrR\/tP7uSS5ubSSOSz8vzI\/8AWR+Z+7k8uP8Aef8AXOOmalZ6pFcA2N\/afZXUOn2b7nPpWU6A\/bzPni9uo7rUYtSnsU+wx2n2hLK9\/d\/a\/wDWfZ\/M\/wCmfmeX\/wB\/Kz9E8JTfZ0gvb\/TtHMZuJLuS9iuJLiTy4\/M\/d\/Z4\/wDrp+8\/d16npXhjTtS0WE3FuHMHgjxFfJ7F5I9sX\/XOPzX2J0Ge9aHjTwvp2mfAf4J39pALe6jtY7kvHx5r\/aOr+v8Aqk\/KvpecqE7I4b+xrA3kmkpJ9u06OST7JbWUcnmXH2e38z\/V\/u\/9ZJJJ\/wB\/KwrPQ9Fu7CO1tRPa2VhJH9r1KSSOSST\/AFknmR2\/7uP93+8\/d\/8ALSOOvYPiVoWlyfFLUJotPS2kgk1DUUMc0xxJ5dvx8zn5faptZ0uDw7pfi3Wrbc8uiGO4t7WY77eR\/s9xzLH0f8aj2zOH2jhsebWWjeDLS432tprEuneZ\/aNvc6tBHbx+X5cn7uTy\/wDrn\/10qvfeHdN1TxJpqWUEdv589vrN35v7u3v5I\/8AWW8f\/XTy5JP+2lWPDXje\/wDFnhGz0bUoLSSzn1O30pzFAInNt+8+TK4q7f2sXhLxRc2NiubXf5myb5\/3v7v95z\/H+9fn3qdwnWftOc5C+8L6bFYaVf2umweWn7ueS5uPLuL+TzP+PiP93\/z08z\/v3\/zzqPX\/AABB4t1aQeHpr22067+zyXdlL+7jt4\/M\/wCecf8ArPLkk\/6af6z\/AJaf8s\/TfhrqA1TUbbw7d2ttcWNxcXG2R48zW\/8AxLfJ\/dP1T5OOKs6tff2D8TvFtvZQQRPZt5n2ny\/30g8uT93v6xp7RbKfMaPHVKPwHkFv+zhpumRxXd7JdeILby\/Mki0i3\/efvPM\/5aSf88\/+uddPH+zqn\/CB6hJZaTHplu8kf+k3tv5kscnl3EckfmSf9NPs\/wDq44\/9ZH\/008vq5r6+1T4peOvO1C6E9vfpbRXSSYmVP9I43df+XeL\/AL4Fe167ZfaCfDqTz2otI\/iFc\/2lbSbLmd7LUP3Rl\/5ZvnyIs\/J8uwbNlcc6sobHTDF1Km58rx\/BGCLwfbazZXcf2m7kkjjuZJI4\/L8v95\/q\/wDrnXr+m6Doug+A49S0uNP7ekv5PslzL+8kjk8u4+0Rx+X\/ANdI\/wDWf9NKpfCDVbrRfhrd39vPL9ugijvUuXkYuJvMk+bOetTKrat4l08XUskkV5cSbod3yR\/u9O+4O3\/HxN\/32ac6s5nJ7WZ2WpS6ZqniDWvEOnaba6ZZXf8Ax76b5Ef2eOT\/AKd\/L\/8Ajf8Ay0qv9qksLy2ggkjl06OOOS3+02\/mSfvPLkt\/+\/nlyR+X\/wBdKm8Hafb6z4G13TXjNsYEuLhL22kaO5D\/ALvnzM\/9Mk\/Kud+DmoXni3w\/qkd\/dSbpbXS9ReWFVRzN\/aUltuzj\/nlK6\/Q1zhOBpyaN4Xls7m\/jv5PD3kfvJJPs\/mRyW8cfmSf9c\/8AyJ\/yzjrBjv7Hw4g03\/hTPlR2\/wAkbfaI\/wB4nZ\/xq94316+vtJhEs5OfgpZ3vHr5n+q\/65\/7HSquq6RZ\/bj\/AKOn+otu3\/TvHXRCPOc7m0f\/2Q=="}]},
	COM_URL = {
		path:'https://topics.smt.docomo.ne.jp/', //ニューストップ
		param01: IOS_FLG ? '?utm_source=dmenu_top&utm_medium=iphonetop&utm_campaign=' : '?utm_source=dmenu_top&utm_medium=hstop&utm_campaign=', //共通パラメータ
		param02:'_0',
	};
var CATEGORY_TABLE = [{
	id:'nc_topics', tabName:'主要', thumbFlg :'1',
	btnName:['主要ニュース一覧へ'],
	urlStr:{path:[''], param:['main_bottom_top']},
	cntID:{aclID:'00hs190100', aclName:'main', btnID:['00hs190000']}
},{
	id:'nc_social', tabName:'社会', thumbFlg :'1',
	btnName:['社会ニュース一覧へ'],
	urlStr:{path:['topnews/nation'], param:['nation_bottom_nationtop']},
	cntID:{aclID:'00hsSC0200', aclName:'nation', btnID:['00hsSC0001']}
},{
	id:'nc_poli_econ', tabName:'政治<br>経済', thumbFlg :'1',
	btnName:['政治ニュース一覧へ','経済ニュース一覧へ'],
	urlStr:{path:['topnews/politics', 'topnews/business'], param:['pol_bus_bottom_poltop','pol_bus_bottom_bustop']},
	cntID:{aclID:'00hsPE0300', aclName:'pol_bus', btnID:['00hsPE0002','00hsPE0003']} //[0]政治,[1]経済
},{
	id:'nc_entme', tabName:'エンタメ', thumbFlg :'1',
	btnName:['エンタメニュース一覧へ'],
	urlStr:{path:['topnews/entertainment'], param:['ent_bottom_enttop']},
	cntID:{aclID:'00hsET0600', aclName:'ent', btnID:['00hsET0004']}
},{
	id:'nc_sports', tabName:'スポーツ',thumbFlg :'1',
	btnName:['スポーツニュース一覧へ'],
	urlStr:{path:['topnews/sports'], param:['sports_bottom_sportstop']},
	cntID:{aclID:'00hsSP0700', aclName:'sports', btnID:['00hsSP0005']}
},{
	id:'nc_world', tabName:'国際科学',thumbFlg :'1',
	btnName:['国際・科学ニュース一覧へ'],
	urlStr:{path:['topnews/world'], param:['world_bottom_worldtop']},
	cntID:{aclID:'00hsKO0800', aclName:'world', btnID:['00hsKO0006']}
}];

var G_regionSet = setRegion();
function setRegion(){
	var areaTbl = {"01":{"code":"hokkaido","name":"北海道"},"02":{"code":"aomori","name":"青森"},"03":{"code":"iwate","name":"岩手"},"04":{"code":"miyagi","name":"宮城"},"05":{"code":"akita","name":"秋田"},"06":{"code":"yamagata","name":"山形"},"07":{"code":"fukushima","name":"福島"},"08":{"code":"ibaraki","name":"茨城"},"09":{"code":"tochigi","name":"栃木"},"10":{"code":"gunma","name":"群馬"},"11":{"code":"saitama","name":"埼玉"},"12":{"code":"chiba","name":"千葉"},"13":{"code":"tokyo","name":"東京"},"14":{"code":"kanagawa","name":"神奈川"},"15":{"code":"niigata","name":"新潟"},"16":{"code":"toyama","name":"富山"},"17":{"code":"ishikawa","name":"石川"},"18":{"code":"fukui","name":"福井"},"19":{"code":"yamanashi","name":"山梨"},"20":{"code":"nagano","name":"長野"},"21":{"code":"gifu","name":"岐阜"},"22":{"code":"shizuoka","name":"静岡"},"23":{"code":"aichi","name":"愛知"},"24":{"code":"mie","name":"三重"},"25":{"code":"shiga","name":"滋賀"},"26":{"code":"kyoto","name":"京都"},"27":{"code":"osaka","name":"大阪"},"28":{"code":"hyogo","name":"兵庫"},"29":{"code":"nara","name":"奈良"},"30":{"code":"wakayama","name":"和歌山"},"31":{"code":"tottori","name":"鳥取"},"32":{"code":"shimane","name":"島根"},"33":{"code":"okayama","name":"岡山"},"34":{"code":"hiroshima","name":"広島"},"35":{"code":"yamaguchi","name":"山口"},"36":{"code":"tokushima","name":"徳島"},"37":{"code":"kagawa","name":"香川"},"38":{"code":"ehime","name":"愛媛"},"39":{"code":"kochi","name":"高知"},"40":{"code":"fukuoka","name":"福岡"},"41":{"code":"saga","name":"佐賀"},"42":{"code":"nagasaki","name":"長崎"},"43":{"code":"kumamoto","name":"熊本"},"44":{"code":"oita","name":"大分"},"45":{"code":"miyazaki","name":"宮崎"},"46":{"code":"kagoshima","name":"鹿児島"},"47":{"code":"okinawa","name":"沖縄"}};
	//@weatherData、@disasterを処理で追加
	var obj={'region1':{'prefix': '', 'cityCode': '', 'nameCode': '', 'name': ''},'region2':{'prefix': '', 'cityCode': '', 'nameCode': '', 'name': '' }};

	var weatherArea = G_weatherSet.code;
	if(weatherArea === '' || weatherArea === '-' || weatherArea === null) {
		return obj;
	}
	var cityCodeAry = weatherArea.split(':');
	var cityCodeAryLen = cityCodeAry.length;

	var areaKeys = Object.keys(areaTbl);
	for(var i=0, areaLen=areaKeys.length; i<areaLen; i++) {
		for(var j=0; j<cityCodeAryLen; j++ ) {
			regionCodepush(cityCodeAry[j], 'region' + (j+1));
		}
	}
	return obj;

	function regionCodepush(cityCode, regionCount){
		if(cityCode.indexOf(areaKeys[i]) === 0){
			var region = {'prefix': areaKeys[i], 'cityCode': cityCode, 'nameCode': areaTbl[areaKeys[i]].code, 'name': areaTbl[areaKeys[i]].name};
			obj[regionCount] = region;
		}
	}
};


//地域タブ　地域設定時にタブ名を変更
function customRegionTab(){
	var cityCodeArray = [];
	if(G_regionSet['region1']['cityCode'] === '') return;
	if(G_regionSet['region1']['cityCode']){ cityCodeArray.push(G_regionSet['region1']['cityCode']); }
	if(G_regionSet['region2']['cityCode']){ cityCodeArray.push(G_regionSet['region2']['cityCode']); }
	for(var i = 0,len = cityCodeArray.length; i < len; i++){
		if(G_allTabArr.indexOf('Region' + (i==0? '': 2)) === -1) continue;
		renameRegionTab(G_weatherInfo['region'+ (i+1)]['weather'], i);
	}
	function renameRegionTab(data,index){
		G_regionSet['region' + (index+1)].weatherData = data;
		var regionName = data.name;
		var tabNum = index === 0 ? '' : '2';
		var regionNameLen = regionName.length;
		if(regionNameLen > 3){
			if(regionNameLen > 4){
				if(regionNameLen > 8){
					regionName = regionName.substring(0, 7) + '…';
				}
				regionName = regionName.slice(0, 4) + '<br>' + regionName.slice(4);
			}
			$('.df_tab.genrTab > li:eq(' + $('#g_region' + tabNum).index() + ') div').addClass('genrTab_title_narrow');
		}
		$('.df_tab.genrTab > li:eq(' + $('#g_region' + tabNum).index() + ') span').html(regionName); //ジャンルタブ名を地域名に変更
	}
}

//「主要ニュース・エンタメ・社会・政治経済・地域・スポーツ・国際科学」タブcheckpoint設定用
/**
 * Tickerクラスのインスタンス生成関数。チェックポイント（checkPoint）設定用。
 * メンバ関数callData()呼び出し都度でtickerへ+1。tickerは最小値と最大値の間で循環する。
 * callDoc()は、tickerが最大値のときだけcouterを+1し、特定フォーマットのデータを生成する。
 */
var OBJ_TICKER = {
	init: function(conf){
			if(conf && conf.tickerMax){ this.tickerMax = conf.tickerMax; }else{ this.tickerMax = 10; }
			if(conf && conf.tickerMin){ this.tickerMin = conf.tickerMin; }else{ this.tickerMin = 1; }
			if(conf && conf.tickStart){ this.tickStart = conf.tickStart; }else{ this.tickStart = 1; }
			if(conf && conf.counterStart){ this.counterStart = conf.counterStart; }else{ this.counterStart = 1; }
			this.ticker = this.tickStart;
			this.counter = this.counterStart;
			this.addTicker = function(isFlg){
				this.ticker++;
				if(isFlg){ OBJ_TICKER.tStart++; }
				if(this.ticker > this.tickerMax){
					this.ticker = this.tickerMin;
					if(isFlg){ OBJ_TICKER.tStart = 1; }
				}
				return this.ticker;
			};
			this.addCounter = function(isFlg){
				this.counter++;
				if(isFlg){ OBJ_TICKER.cStart++; }
				return this.counter;
			};
			this.callData = function(isFlg){
				var data = {className: '', attr: ''};
				if(this.ticker == this.tickerMax){
					data = {className: ' ck_point', attr: ' data-ckpoint="CheckPoint' + this.counter + '"'};
					this.addCounter(isFlg);
				}
				this.addTicker(isFlg);
				return data;
			}
			return this;
		},
	tStart: 1,
	cStart: 1
}

/* ---- パーソナライズエリア ---- */
function dPersonalize(setting, data, exData, rankingData) {
	this.targetGenre = data.tab_type == '1' ? 'news' : 'other' ;
	this.data = this.sort(data, this.targetGenre);						// 設定情報入稿データ
	this.exData = randomArray(this.makeExData(exData, 'nc_popular'));	// 戦略枠の「人気のニュース」記事リスト
	this.rankingData = rankingData ? rankingData : [];				// ランキングニュース記事(エラーハンドリング用)

	this.mainSetting = setting.main;									// パーソナライズエリア設定
	this.serialPrefix = this.mainSetting.serialPrefix ? this.mainSetting.serialPrefix : ''; 		// ジャンル別枠通し番号の接頭辞
	this.repeatCount = this.data.b2_repeat_count === "" ? 1 : parseInt(this.data.b2_repeat_count);	// 繰り返し回数
	this.addCount = this.data.b2_add_count === "" ? 0 : parseInt(this.data.b2_add_count);			// 追加読込回数
	this.clickCount = 1;												// 「もっと見る」ボタン用
	this.scrollFunc = this.mainSetting.scrollFunc || function(){};		// 他タブのスクロール読み込み関数
	this.scrollFlg = true;
	window.d3pgtm = window.d3pgtm || { cmd: [] };
	OBJ_TICKER.tStart = 1;
	OBJ_TICKER.cStart = 1;
	this.plusdData = data.tab_type == '1' ? PLUSD.news : PLUSD[setting.main.genrePrefix];
	this.plusdRecommend =  data.tab_type == '1' ? newsRecommend : tmpRecommend[setting.main.genrePrefix];

	var self = this;

	// パーソナライズエリア
	var mainHtml = this.makeNewsBlock(1);
	$(this.mainSetting.container).html(mainHtml);
	this.loadD3pGTM(this.mainSetting.d3pTarget, 1); // gtm読み込み

	if(this.targetGenre === 'news') {
		if(this.mainSetting.addLoad && this.addCount > 0) {
			this.addButton(); // 追加読み込み
		} else {
			$('#Topics').addClass('nws_topics_all');
		}

		// エラーハンドリング
		this.errorHandling(this.mainSetting)
		.done(function() { // 正常時
			self.plusdRcmFunc(self.mainSetting.container);
		})
		.fail(function() { // エラー時
			if($('.topics_open').length) $('.topics_open').hide();
			$('#Topics').addClass('nws_topics_all');
			self.plusdRcmFunc(self.mainSetting.container);
		});
	} else {
		if(this.mainSetting.addLoad && this.addCount > 0) { this.scrollFunc(); } // 追加読み込み

		// エラーハンドリング
		this.errorHandling(this.mainSetting)
		.done(function() { // 正常時
			self.plusdRcmFunc(self.mainSetting.container);
		})
		.fail(function() { // エラー時
			self.scrollFlg = false;
			$(self.mainSetting.categoryNewsId +' .areaLinkBtn').removeClass('is_hide'); // 固定リンク表示
		});
	}
}

dPersonalize.prototype = {
	// 表示形式(共通)
	format: {1:'left', 3:'largeimg', 4:'', 5:''},
	// d3pgtm読み込み
	loadD3pGTM: function(target, blockNum) {
		var setting = this.mainSetting;
		var gtmObj = setting.gtm;
		var area = setting.area;
		var list = {};
		for(var i=0; i<target.length; i++) {
			var type = setting.type[target[i]];
			if(gtmObj[type].list.length === 0) continue;
			list[type] = gtmObj[type].list; // GTM側が参照するため別配列に格納・参照
		}

		if(list["base"] && list["base"].length) {
			window.d3pgtm.cmd.push(function(){ d3pgtm.loaded("base"+ area, list["base"]); });
			gtmObj["base"].list = [];
		}
		if(list["adInfeed"] && list["adInfeed"].length) {
			window.d3pgtm.cmd.push(function(){ d3pgtm.loaded("adInfeed", list["adInfeed"]); });
			gtmObj["adInfeed"].list = [];
		}
		if(list["adRectangle"] && list["adRectangle"].length) {
			window.d3pgtm.cmd.push(function(){ d3pgtm.loaded("adRectangle", list["adRectangle"]); });
			gtmObj["adRectangle"].list = [];
		}
	},
	// 昇順ソート
	sort: function(data, target) {
		for(var i=1; i<3; i++) {
			if(target === 'other' && i === 0) i++;
			if(!Object.keys(data['block_'+i]).length) continue;
			data['block_'+i] = MAKE_CTS.sortAry(data['block_'+i], 'b'+i+'_position');
		}
		return data;
	},
	// 任意カテゴリのデータ抽出
	makeExData: function(data, target) {
		var array = [];
		if(!data.length) return array;
		for (var i=0, len=data.length; i<len; i++ ) {
			if(data[i].category === target) array.push(data[i]);
		}
		return array;
	},
	// パーソナライズブロック生成
	makeNewsBlock: function(blockNum) {
		var setting = this.mainSetting;
		var gtmObj = setting.gtm;
		var block = this.data['block_'+ blockNum];

		if (this.targetGenre === 'news' && blockNum === 1){ //主要ニュースの最初のブロックの場合、cStartにニュース記事分のcounter追加（プラス1）
			OBJ_TICKER.cStart++;
			if(NEWS_JSON.sports_data[0]){ OBJ_TICKER.tStart++; } //スポーツ記事がある場合はtStartに1記事分カウント追加(tStartが1or2になる違いのため、counterへの配慮は無し)
		} else if (this.targetGenre === 'other' && blockNum === 1){　//主要以外ニュースタブの最初のブロックの場合、cStartにニュース記事分のcounter追加（プラス1）
			OBJ_TICKER.cStart++;
		}
		var checkPoint = OBJ_TICKER.init({tickStart: OBJ_TICKER.tStart, counterStart: OBJ_TICKER.cStart}); //チェックポイント生成用Ticker スポーツ分のtickStart。counterはニュース分除いて2から。

		var tmpHtml = '';
		for(var i=0, len=block.length; i<len; i++) {
			var gtmFlg = false;
			var typeNum = block[i]['b'+ blockNum +'_type'];
			var formatNum = block[i]['b'+ blockNum +'_format'];
			var serialNum = this.serialPrefix + ('00'+ gtmObj[setting.type[typeNum]].num).slice(-3);

			// 表示種別
			switch(setting.type[typeNum]) {
				case 'base': // 記事詳細, 戦略枠, +d枠, クーポン情報
					var plusdFlg = this.plusdData.data ? typeNum === '2' : false;
					var plusdClass = plusdFlg ? ' psn_plusd' : ''; //クーポン枠も使用

					switch(typeNum) {
						case '1': //記事詳細
							var tagHtml = this._addD3pTag(setting, typeNum, formatNum, serialNum, checkPoint);
							gtmFlg = true;
							break;
						case '2': //+d枠
							if(formatNum !== '5' && plusdFlg && this.plusdData.count < this.plusdData.data.contents.length) {
								var tagHtml = this._makeRcmPlusd(setting, checkPoint, setting.area, setting.countId.plusd, formatNum);
								this.plusdData.count++;
							} else {
								formatNum = '5';
							}
							break;
						case '3': //戦略枠
							if(formatNum !== '5' && this.exData.length) {
								var tagHtml = this._addExTag(setting, typeNum, formatNum, checkPoint);
								setting.countId.ex.num++;
							} else {
								formatNum = '5';
							}
							break;
						case '6' : //クーポン情報 ※ニュースタブblock_1 に1回以下
							if(formatNum !== '5' && PLUSCPN.hasOwnProperty('className') ) {
								var newsCouponData = makeNewsCoupon(checkPoint);
								if(newsCouponData) {
									var tagHtml = newsCouponData[1];
									if(newsCouponData[0]) { plusdClass = ' topic_nws_coupon_bn_item'; }
								} else {
									formatNum = '5';
								}
							}else{
								formatNum = '5';
							}
							break;
					}

					// 表示形式
					switch(formatNum) {
						case '1': // サムネイル（画像左寄せ）
						case '3': // 横長大画像
						case '4': //クーポン
							tmpHtml += '<li class="'+ setting.genrePrefix +'_vList_item'+ plusdClass +'">'+ tagHtml +'</li>';
							break;
						case '5': // 非表示
							tmpHtml += '';
							gtmFlg = false;
							break;
					}
					break;
				case 'adInfeed': // インフィード広告
				case 'adRectangle': // レクタングル広告
					var serialNum = this.serialPrefix + ('00'+ gtmObj[setting.type[typeNum]].num).slice(-3);
					var tagHtml = this._addD3pTag(setting, typeNum, formatNum, serialNum);

					// 表示形式
					switch(formatNum) {
						case '4': // 未指定
							tmpHtml += '<li class="'+ setting.genrePrefix +'_vList_item '+ setting.genrePrefix +'_topics_'+ setting.type[typeNum] +' ad_none_border" style="margin:0 -8px">'+ tagHtml +'</li>';
							gtmFlg = true;
							break;
						case '5': // 非表示
							tmpHtml += '';
							gtmFlg = false;
							break;
					}
					break;
				default:
					continue;
			}

			// 枠通し番号リストに追加
			if(gtmFlg) {
				gtmObj[setting.type[typeNum]].list.push(serialNum);
				gtmObj[setting.type[typeNum]].num++;
			}
		}
		return tmpHtml;
	},
	// エラーハンドリング
	errorHandling: function(setting) {
		var self = this;
		var defer = $.Deferred();
		setTimeout(function() {
			// 初回読み込み1件目のd3pタグ内が空だった場合
			if($('#d3pdiv_'+ setting.type[1] + setting.area +'_'+ self.serialPrefix +'001').find('a').length > 0) {
				defer.resolve();
			} else {
				if(setting.area === 'Add') {
					defer.reject();
				} else {
					var d3pLen = $(setting.container +' .d3pdiv_'+ setting.type[1] + setting.area).length;
					var dataLen = self.rankingData.length;
					var thumbNum = 0;

					for(var i=0; i<d3pLen; i++) {
						var $target = $('#d3pdiv_'+ setting.type[1] + setting.area +'_'+ self.serialPrefix +('00'+ (i+1)).slice(-3)).parent();

						if(self.targetGenre === 'news' && i < dataLen) {
							// ランキングニュースに置き換え
							var rankHtml = makeRankingNews(i, thumbNum);
							if(self.rankingData[i].image_flg != '1') thumbNum++;
							$target.replaceWith(rankHtml);
						} else {
							// 「記事詳細」各記事を削除
							$target.remove();
						}
					}
					defer.reject();
				}
			}
		}, 5000);
		return defer.promise();

		// ランキングニュース生成
		function makeRankingNews(i, thumbNum) {
			var data = self.rankingData[i];
			var index = i+1;
			var countId = self.targetGenre === 'news'
				? '00hs06news_'+ index +'_T'+ index
				: self.mainSetting.countId.ranking + ('00'+ index).slice(-3);
			var imgStr = data.image_flg == '1'
				? '<img class="lazyload" data-src="'+ (data.image_binary || data.image_url) +'">'
				: '<span class="topic_nws_thumb-def topic_nws_thumb-def-'+ (thumbNum%3+1) +'"></span>';

			var dateStr = '';
			var dateObj = new Date(data.date.replace(/-/g,'/'));
			if(dateObj && dateObj != 'Invalid Date'){
				dateStr = '<span class="topic_nws_date">'+ (dateObj.getMonth()+1) +'/'+('0'+ dateObj.getDate()).slice(-2) +'('+['日','月','火','水','木','金','土'][dateObj.getDay()] +')&nbsp;'+ dateObj.getHours() +':'+('0'+ dateObj.getMinutes()).slice(-2) +'</span>';
			}
			return '<li class="nws_vList_item border-t"><a class="f_h-l_c-v nws_topic_item" data-link-id="'+ countId +'" data-portalarea="top-'+ countId +'" href="'+decodeURIComponent(data.url) +'"><div class="vList_link_inner topic_thumb f_h-l_c-v-h">'+ imgStr +'</div><div class="vList_link_inner f_item-fit"><h3 class="item_ttl">'+ data.title +'</h3><p class="cornerName">'+ data.ip_name +'</p><p class="cornerName">dmenuニュース'+ dateStr +'</p></div></a></li>';
		}
	},
	// 「もっと見る」ボタン設置
	addButton: function() {
		$("#Topics").append('<a class="topics_open btn border-t f_h-l_c-v-h arrow-bottom pd-r-22 js_btn" href="javascript:void(0);"><span class="btn_inner">もっと見る</span></a>');

		var self = this;
		$('.topics_open').on('click', function(){
			var addHtml = '';
			for(var i=0; i<self.repeatCount; i++) { addHtml += self.makeNewsBlock(2); }
			$(self.mainSetting.container).append(addHtml);
			self.loadD3pGTM(self.mainSetting.d3pTarget, 2); // gtm読み込み
			dataLayer.push({'event': 'DWEB_click_specialtrack', 'dweb_click_specialtrack_value': 'News_PersonalizedArea_more', 'dweb_click_specialtrack_url': undefined, 'dweb_click_specialtrack_portalarea': 'News_PersonalizedArea_more'}); //GA4

			self.clickCount += 1;
			if(self.clickCount > self.addCount) {
				$(this).hide();
				$(this).parent().addClass('nws_topics_all');
				$("#Topics").append('<a class="btn border-t f_h-l_c-v-h" data-link-id="00hs063001" data-portalarea="top-00hs063001" href="https://topics.smt.docomo.ne.jp/?utm_source=dmenu_top&utm_medium=hstop&utm_campaign=main_bottom_top"><span class="btn_inner">主要ニュース一覧へ</span></a>');
			}
			self.plusdRcmFunc(self.mainSetting.container);
		});
	},
	// +d枠・先着クーポンレコメンド視聴登録関数
	plusdRcmFunc: function(container) {
		var $plusd = $(container +' .psn_plusd'), $coupon = $(container +' .topic_nws_coupon_bn_item');
		if(($plusd.length > 0 || $coupon.length > 0) && $plusd.parent().css('display') !== 'none') {
			// タゲレコ視聴登録関数(+d・先着クーポン枠用)
			var target = [];
			if($plusd.length > 0) { this.plusdRecommend.RequestDispItemView(this.plusdData.id, this.plusdData.className); }
			if($coupon.length > 0) { this.plusdRecommend.RequestDispItemView('.topic_nws_coupon_bn_item', this.plusdData.className); }
			var that = this;
			$(container + ' .'+ this.plusdData.className).on('click',function(){
				that.plusdRecommend._onRequestClickData(this);
			});
		}
	},
	// 戦略枠追加処理
	_addExTag: function(setting, typeNum, formatNum, checkPoint) {
		var exData = this.exData[0];
		var exPrefix = setting.countId.ex.prefix;
		var exNum = setting.countId.ex.num;
		var checkPointSrc = (formatNum !== '5' ? checkPoint.callData(true) : {className: '', attr: ''});

		var tagHtml = '<div class="'+ setting.genrePrefix +'_'+ setting.type[typeNum] + setting.area +'_'+this.format[formatNum] +'_list'+checkPointSrc.className +'" '+checkPointSrc.attr +'>'
					+ '<a class="'+ setting.genrePrefix +'_vList_link" href="'+ exData.url +'" data-link-id="'+ exPrefix + ('00'+ exNum).slice(-3) +'_'+ exData.analyzeid +'" data-portalarea="top-'+ exPrefix + ('00'+ exNum).slice(-3) +'">'
					+ '<div class="'+ setting.genrePrefix +'_'+ setting.type[typeNum] + setting.area +'_thumb"><img class="noObjectFit lazyload" data-src="//dflmubb37dbh9.cloudfront.net/dmenu/hottopics/img/'+ exData.image +'?'+ NOW_DATE +'" alt="'+ exData.txt +'"></div>'
					+ '<div class="'+ setting.genrePrefix +'_'+ setting.type[typeNum] + setting.area +'_txt"><h3 class="item_ttl">'+ exData.txt +'</h3><p class="cornerName">'+ exData.name +'</p></div></a></div>';
		this.exData.shift();

		return tagHtml;
	},
	// d3pタグ追加処理
	_addD3pTag: function(setting, typeNum, formatNum, serialNum, checkPoint) {
		if(!checkPoint) checkPoint = {class: '', attr: ''};
		switch(setting.type[typeNum]) {
			case 'base': // 記事詳細(@formatNum：横長大の場合、GTM側でテキスト記事/動画記事出し分け)
				var checkPointSrc = (formatNum !== '5' ? checkPoint.callData(true) : {className: '', attr: ''});
				return '<div class="d3pdiv_'+ setting.type[typeNum] + setting.area +' '+ setting.genrePrefix +'_'+ setting.type[typeNum] + setting.area +'_'+ this.format[formatNum] +'_list'+ checkPointSrc.className +'" id="d3pdiv_'+ setting.type[typeNum] + setting.area +'_'+ serialNum +'" '+ checkPointSrc.attr +'></div>';
			case 'adInfeed': // インフィード広告
			case 'adRectangle': // レクタングル広告
				return '<div class="d3pdiv_'+ setting.type[typeNum] + setting.area +'" id="d3pdiv_'+ setting.type[typeNum] +'_'+ serialNum +'"></div>';
		}
	},
	//パーソナライズエリア＞+d枠
	_makeRcmPlusd: function(setting, checkPoint, area, countId ,formatNum) {
		var checkPointSrc = (formatNum !== '5' ? checkPoint.callData(true) : {className: '', attr: ''});
		if(!area) area = '';
		var cId = countId ? countId.prefix : this.plusdData.cId;
		var tmpHtml = '<div class="'+ setting.genrePrefix +'_base'+ area +'_largeimg_list'+ checkPointSrc.className +'"'+ checkPointSrc.attr +'><a class="'+ setting.genrePrefix +'_vList_link '+ this.plusdData.className
					+ '" data-link-id="'+ cId + ('00'+ (this.plusdData.count+1)).slice(-3) +'_'+ this.plusdData.data.contents[this.plusdData.count].cid
					+ '" data-portalarea="top-'+ cId + ('00'+ (this.plusdData.count+1)).slice(-3)
					+ '" data-recommendOrder="' + this.plusdData.data.contents[this.plusdData.count].recommendOrder
					+ '" data-measureId="' + this.plusdData.data.contents[this.plusdData.count].measureId
					+ '" data-timerId="' + this.plusdData.data.contents[this.plusdData.count].timerId
					+ '" data-mediaId="' + this.plusdData.data.contents[this.plusdData.count].mediaId
					+ '" data-cid="'+ this.plusdData.data.contents[this.plusdData.count].cid
					+ '" data-start="' + this.plusdData.data.start
					+ '" data-frameId="' + this.plusdData.data.frameId
					+ '" data-groupId="'+ this.plusdData.data.groupId
					+ '" data-optOutUserFlg="' + this.plusdData.data.optOutUserFlg
					+ '" data-serviceId="' + this.plusdData.data.contents[this.plusdData.count].serviceId
					+ '" data-recommendMethodId="' + this.plusdData.data.contents[this.plusdData.count].recommendMethodId
					+ '" href="'+ this.plusdData.data.contents[this.plusdData.count].pageURL1 +'"><div class="'+ setting.genrePrefix +'_base'+ area +'_thumb"><img class="noObjectFit lazyload" data-src="'+ this.plusdData.data.contents[this.plusdData.count].picURL1 +'?'+ NOW_DATE +'" alt="'+ this.plusdData.data.contents[this.plusdData.count].title +'"></div><div class="'+ setting.genrePrefix +'_base'+ area +'_txt"><h3 class="item_ttl">'+ this.plusdData.data.contents[this.plusdData.count].title +'</h3><p class="cornerName">'+ this.plusdData.data.contents[this.plusdData.count].provider +'</p></div></a></div>';
		return tmpHtml;
	}
}

/* --------------------------------
  パーソナライズエリア/レコメンド生成
----------------------------------- */
function callPLusdRecommend(sendRecoTab) {
	// パーソナライズエリア＞+d枠の個数
	var plusdNum = otherPlusdNum !== undefined ? otherPlusdNum : makeOtherPlusdNum();

	var tabName = sendRecoTab.slice(8).toLowerCase();
	tmpRecommend[tabName] = new callSDRecommend([".psn_plusd"],{
		callBack: makePlusdRecommend,
		params: [
			{ //パーソナライズエリア＞+d枠
				"start" : 1,
				"number" : plusdNum,
				"frameId" : "j38",
				"getColumn" : "cid,title,provider,pageURL1,picURL1"
			}
		],
		className: sendRecoTab
	});
}
function makePlusdRecommend(o){
	var items = o.items[0];
	if(!items.hasOwnProperty('contents') || items.frameId !== 'j38') return;
	var tabName = this.className.slice(8).toLowerCase();
	PLUSD[tabName]['data'] = items;
	PLUSD[tabName]['id'] = this.id;
	PLUSD[tabName]['className'] = this.className;
	PLUSD[tabName]['cId'] = '00hs062';
}

function makeOtherPlusdNum() {
	otherPlusdNum = function(data) {
		var addCount = data.b2_add_count === '' ? 0 : parseInt(data.b2_add_count);
		var repeatCount = data.b2_repeat_count === '' ? 1 : parseInt(data.b2_repeat_count);
		var count = {block_1: 0, block_2: 0,};
		for(var i=1; i<3; i++) {
			var news = data['block_'+i];
			for(var j=0, len=news.length; j<len; j++) {
				if(news[j]['b'+i+'_type'] !== '2') continue;
				count['block_'+i]++;
			}
		}
		if(!count) return 0;
		return count['block_1'] + (count['block_2'] * repeatCount * addCount);
	}(OTHER_NEWS_DATA);	
	return otherPlusdNum;
}

//地震速報
function disasterBreakingNews(){
	var alertEleId = document.getElementById('dmenu_disaster_alert');
	if(alertEleId){
		var alertEleChild = alertEleId.getElementsByTagName('a')[0];
		alertEleChild.insertAdjacentHTML('afterbegin', '<span>速報</span>');
		// cid設定
		alertEleChild.setAttribute('data-link-id', '00hs210001');
		alertEleChild.setAttribute('data-portalarea', 'top-00hs210001');
	}
}

//災害情報
function runDisasterInfoFunc(){
	function getLifelineList(json){ //ライフライン情報取得
		return json
	};

	var wthrInfoDisasterList = {
	"weather_setting":{
		"notice_link":"",
		"holiday":[
			"20260101",
			"20260112",
			"20260211",
			"20260223",
			"20260320",
			"20260429",
			"20260503",
			"20260504",
			"20260505",
			"20260506",
			"20260720",
			"20260811",
			"20260921",
			"20260922",
			"20260923",
			"20261012",
			"20261103",
			"20261123"
		],
		"disaster_list":[
			{"dsid":5001,"frame":"0","keikai_flg":"1","top_flg":"1","comment":""},
			{"dsid":5011,"frame":"0","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":5101,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"海岸や河川から離れ至急避難"},
			{"dsid":5201,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"慌てず身の安全を確保"},
			{"dsid":5202,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"慌てず身の安全を確保"},
			{"dsid":5203,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"慌てず身の安全を確保"},
			{"dsid":5204,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"慌てず身の安全を確保"},
			{"dsid":5205,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"慌てず身の安全を確保"},
			{"dsid":5401,"frame":"1","keikai_flg":"2","top_flg":"1","comment":"命を守る行動をとってください"},
			{"dsid":5501,"frame":"1","keikai_flg":"2","top_flg":"1","comment":"命を守る行動をとってください"},
			{"dsid":5502,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"命を守る行動をとってください"},
			{"dsid":5503,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"命を守る行動をとってください"},
			{"dsid":5504,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"命を守る行動をとってください"},
			{"dsid":5505,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"命を守る行動をとってください"},
			{"dsid":5506,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"危険な暑さから命を守る行動を"},
			{"dsid":4001,"frame":"0","keikai_flg":"1","top_flg":"1","comment":""},
			{"dsid":4011,"frame":"0","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":4101,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"海岸や河川から離れ至急避難"},
			{"dsid":4102,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"海岸や河川から離れてください"},
			{"dsid":4201,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"強い揺れに警戒してください"},
			{"dsid":4301,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"危険な場所から避難"},
			{"dsid":4302,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"危険な場所から避難"},
			{"dsid":4401,"frame":"1","keikai_flg":"2","top_flg":"1","comment":"危険な場所から避難"},
			{"dsid":4501,"frame":"1","keikai_flg":"2","top_flg":"1","comment":"危険な場所から避難"},
			{"dsid":4502,"frame":"1","keikai_flg":"2","top_flg":"1","comment":"危険な場所から避難"},
			{"dsid":4503,"frame":"1","keikai_flg":"2","top_flg":"1","comment":"危険な場所から避難"},
			{"dsid":4504,"frame":"1","keikai_flg":"2","top_flg":"1","comment":"危険な場所から避難"},
			{"dsid":4505,"frame":"1","keikai_flg":"0","top_flg":"1","comment":"天気や自治体情報を随時確認"},
			{"dsid":4506,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"涼しい場所で水分塩分を補給"},
			{"dsid":4801,"frame":"2","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":4802,"frame":"2","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":4803,"frame":"2","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":4811,"frame":"2","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":4812,"frame":"2","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":4813,"frame":"2","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":3001,"frame":"0","keikai_flg":"1","top_flg":"1","comment":""},
			{"dsid":3011,"frame":"0","keikai_flg":"0","top_flg":"1","comment":""},
			{"dsid":3301,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"高齢者等は危険な場所から避難"},
			{"dsid":3401,"frame":"1","keikai_flg":"2","top_flg":"0","comment":"高齢者等は危険な場所から避難"},
			{"dsid":3501,"frame":"1","keikai_flg":"2","top_flg":"0","comment":"高齢者等は危険な場所から避難"},
			{"dsid":3502,"frame":"1","keikai_flg":"2","top_flg":"0","comment":"高齢者等は危険な場所から避難"},
			{"dsid":3503,"frame":"1","keikai_flg":"2","top_flg":"0","comment":"高齢者等は危険な場所から避難"},
			{"dsid":3505,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"高齢者等は危険な場所から避難"},
			{"dsid":3506,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"外出は控えてください"},
			{"dsid":3507,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"外出は控えてください"},
			{"dsid":3508,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"高齢者等は危険な場所から避難"},
			{"dsid":2301,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"今後の火山活動の推移に注意"},
			{"dsid":2302,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"今後の火山活動の推移に注意"},
			{"dsid":2303,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"今後の火山活動の推移に注意"},
			{"dsid":2304,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"今後の火山活動の推移に注意"},
			{"dsid":2305,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"今後の火山活動の推移に注意"},
			{"dsid":2306,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"付近の船舶は航行に注意"},
			{"dsid":2401,"frame":"1","keikai_flg":"2","top_flg":"0","comment":"今後の情報に留意してください"},
			{"dsid":2501,"frame":"1","keikai_flg":"1","top_flg":"0","comment":"天気や自治体情報を随時確認"},
			{"dsid":2502,"frame":"1","keikai_flg":"1","top_flg":"0","comment":"避難先や避難経路を確認"},
			{"dsid":2503,"frame":"1","keikai_flg":"1","top_flg":"0","comment":"避難先や避難経路を確認"},
			{"dsid":2504,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"天気や自治体情報を随時確認"},
			{"dsid":2505,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"天気や自治体情報を随時確認"},
			{"dsid":2506,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"天気や自治体情報を随時確認"},
			{"dsid":2507,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"沿岸には近づかないでください"},
			{"dsid":2508,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"屋内に避難し水回りから離れて"},
			{"dsid":2509,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"慎重な余裕ある行動を"},
			{"dsid":2510,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"火の元を確認しガス等に注意"},
			{"dsid":2511,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"急斜面に近づかないでください"},
			{"dsid":2512,"frame":"1","keikai_flg":"0","top_flg":"0","comment":""},
			{"dsid":2513,"frame":"1","keikai_flg":"0","top_flg":"0","comment":""},
			{"dsid":2514,"frame":"1","keikai_flg":"0","top_flg":"0","comment":"落雪に注意し急斜面から離れて"},
			{"dsid":2515,"frame":"1","keikai_flg":"0","top_flg":"0","comment":""},
			{"dsid":2516,"frame":"1","keikai_flg":"0","top_flg":"0","comment":""},
			{"dsid":1201,"frame":"1","keikai_flg":"0","top_flg":"0","comment":""},
			{"dsid":1202,"frame":"1","keikai_flg":"0","top_flg":"0","comment":""},
			{"dsid":1203,"frame":"1","keikai_flg":"0","top_flg":"0","comment":""}
		],
		"warning_list":[
			{"dsid":5101,"txt":"津波"},
			{"dsid":5401,"txt":"氾濫"},
			{"dsid":5501,"txt":"大雨"},
			{"dsid":5502,"txt":"大雪"},
			{"dsid":5503,"txt":"暴風"},
			{"dsid":5504,"txt":"暴風雪"},
			{"dsid":5505,"txt":"波浪"},
			{"dsid":5506,"txt":"熱中症"},
			{"dsid":4101,"txt":"津波"},
			{"dsid":4102,"txt":"津波"},
			{"dsid":4301,"txt":"噴火"},
			{"dsid":4302,"txt":"噴火"},
			{"dsid":4401,"txt":"氾濫"},
			{"dsid":4501,"txt":"土砂災"},
			{"dsid":4502,"txt":"高潮"},
			{"dsid":4503,"txt":"高潮"},
			{"dsid":4504,"txt":"高潮"},
			{"dsid":4505,"txt":"記録雨"},
			{"dsid":4506,"txt":"熱中症"},
			{"dsid":3301,"txt":"噴火"},
			{"dsid":3401,"txt":"氾濫"},
			{"dsid":3501,"txt":"大雨"},
			{"dsid":3502,"txt":"洪水"},
			{"dsid":3503,"txt":"高潮"},
			{"dsid":3505,"txt":"大雪"},
			{"dsid":3506,"txt":"暴風"},
			{"dsid":3507,"txt":"暴風雪"},
			{"dsid":3508,"txt":"波浪"},
			{"dsid":2301,"txt":"噴火"},
			{"dsid":2302,"txt":"噴火"},
			{"dsid":2303,"txt":"噴火"},
			{"dsid":2304,"txt":"噴火"},
			{"dsid":2305,"txt":"噴火"},
			{"dsid":2306,"txt":"噴火"},
			{"dsid":2401,"txt":"氾濫"},
			{"dsid":2501,"txt":"大雨"},
			{"dsid":2502,"txt":"洪水"},
			{"dsid":2503,"txt":"高潮"},
			{"dsid":2504,"txt":"大雪"},
			{"dsid":2505,"txt":"強風"},
			{"dsid":2506,"txt":"風雪"},
			{"dsid":2507,"txt":"波浪"},
			{"dsid":2508,"txt":"雷"},
			{"dsid":2509,"txt":"濃霧"},
			{"dsid":2510,"txt":"乾燥"},
			{"dsid":2511,"txt":"なだれ"},
			{"dsid":2512,"txt":"着氷"},
			{"dsid":2513,"txt":"着雪"},
			{"dsid":2514,"txt":"融雪"},
			{"dsid":2515,"txt":"霜"},
			{"dsid":2516,"txt":"低温"}
		]
	}
}
.weather_setting.disaster_list;

	var topDisasterJson = {"warning_list":{},"quake_list":{},"kasen_list":{},"dosha_list":{},"tsunami_list":{},"volcano_list":{},"kirokuame_list":{},"nechusho_list":{},"lifeline_list":{"39201":{"city":"高知市","detail":[{"status":"停電","dsid":4801,"title":"高知市の一部地域で停電(4/20)","text":"四国電力送配電の発表によると、20日06:28頃、高知県高知市の一部地域で停電が発生しました。現在、復旧作業が行われています。\n\n■影響地域\n高知市：10軒未満(土佐山中切)","time":1776640805,"flg_top_hide":0}]}},"evacuation_list":{}};

	var disasterCategryList = [
		{code: 'city', list: 'warning_list', data: {warning_list: topDisasterJson.warning_list}},
		{code: 'city', list: 'shindo_list', data: topDisasterJson.quake_list},
		{code: 'pref', list: 'kasen_list', data: {kasen_list: topDisasterJson.kasen_list}},
		{code: 'city', list: 'dosha_list', data: {dosha_list: topDisasterJson.dosha_list}},
		{code: 'pref', list: 'tsunami_list', data: {tsunami_list: topDisasterJson.tsunami_list}},
		{code: 'city', list: 'volcano_list', data: {volcano_list: topDisasterJson.volcano_list}},
		{code: 'pref', list: 'kirokuame_list', data: {kirokuame_list: topDisasterJson.kirokuame_list}},
		{code: 'pref', list: 'nechusho_list', data: {nechusho_list: topDisasterJson.nechusho_list}},
		{code: 'city', list: 'lifeline_list', data: {lifeline_list: topDisasterJson.lifeline_list}}
	];

	//災害情報
	disasterInfoFunc(wthrInfoDisasterList, disasterCategryList);

	//地震速報
	disasterBreakingNews();

	//避難情報
	evacuationInfoFunc(wthrInfoDisasterList, topDisasterJson);
};
$(function(){
//災害情報
runDisasterInfoFunc();

//災害・リアルタイム告知
(function(json){
	if(json === undefined || !json.length) return;
	// 規定順に並び替え
	var positionList = ['1', '2', '3', '4']; // リスト外の数字は先頭へ
	json.sort(function(a, b){ return positionList.indexOf(a.position) - positionList.indexOf(b.position)});

	// 災害告知作成
	var lastI = json.length - 1;
	if(json[lastI].position === '4'){
		TOP_INIT.importantNews('.disasterBannerInner', json.slice(lastI));
		json.pop();
	}

	// リアルタイム告知作成
	TOP_INIT.importantNews('#RealTimeNewsInner', json);
})({"realTime":[]}.realTime);

//注目ワード
if(localHotword && 0 < localHotword.length) TOP_INIT.hotword(localHotword);

//戦略ボタン
TOP_INIT.amenuList(AMENU_JSON); //カテゴリJSON

//天気
amenuWeather();

//占い
TOP_INIT.fortune(FORTUNE_JSON);

//乗り換え
TOP_INIT.transfer(TRANSFER_JSON);

G_abTest.callSimpleAB(false, 10);// 簡易ABテスト
});

function amenuWeather() {
	//天気コード
	var cityCode = G_weatherSet.code;
	if(cityCode && cityCode != '-'){
		if(G_weatherInfo.region1.isRegion && Object.keys(G_weatherInfo.region1.weather).length){
			return TOP_INIT.weather(G_weatherInfo.region1.weather, cityCode);
		}
	}
	return TOP_INIT.weather('', '');
}

//	お知らせ履歴バッジ表示
$(function(){
	var urlParam = location.search;
	if(urlParam === "") return;
	var splitUrlParam = urlParam.substring(1).split('&');
	var hbgButton = document.getElementById('HBG_button');
	var hbgInfo = document.getElementById('HBG_info');
	for(var i=0,len=splitUrlParam.length;i<len;i++){
		var param = splitUrlParam[i];
		if(param === "info_badge=1"){
			hbgButton.classList.add('hed_info_mark');
			hbgInfo.classList.add('hed_info_mark');
			return;
		}
	}
});

/* --------------------------------------
	災害関連
---------------------------------------- */
$(function(){
	var alertSpace = document.querySelector('.wrp-alert');
	if((document.querySelector('.sp_alert_ttl_wrp') || document.querySelector('.alert_escape') || document.querySelector('.disaster')|| document.querySelector('.network') !== null) || document.querySelector('.disasterBannerInner') === null) {
		alertSpace.style.marginBottom = '5px';
	}
	if(((document.querySelector('.disaster') || document.querySelector('.network')) !== null ) || document.querySelector('.sp_alert_ttl_wrp') !== null || document.querySelector('.alert_escape') !== null) {
		$('.alert_wrp').css({'padding-bottom' : '7px'});
	}
});

/* --------------------------------
  タブ設定
------------------------------------*/
var dmp_gender = {key: '' , el: ''};
//ジャンルエリアオブジェクト
var GENRE_AREA,
	GENRE_DATA = {
	saveName: 'smt_t_genre_index2',
	items:{
		g_news: {name:'top_g_news_2604.htm', saveName:'smt_opened_tab2', ga:'News', inner:{nc_topics:'Topics', nc_social:'Social', nc_poli_econ:'PoliEcon', nc_entme:'Entme', nc_sports:'Sports', nc_region:'Region', nc_world:'World'}}
		,g_coupon: {name:'top_g_coupon_2509.htm', ga:'Coupon', inner:''}
		,g_wadai: {name:'top_g_wadai_2511.htm', ga:'Wadai', inner:''}
		,g_docomo: {name:'top_g_docomo_260331.htm', ga:'Docomo', inner:''}
		,g_entme: {name:'top_g_entme_2509.htm', ga:'Entme', inner:''}
		,g_social: {name:'top_g_social_2509.htm', ga:'Social', inner:''}
		,g_poli_econ: {name:'top_g_poli_econ_2603.htm', ga:'PoliEcon', inner:''}
		,g_region: {name:'top_g_region_2603.htm', ga:'Region', inner:{set: G_regionSet.region1.cityCode, noset: 'Region_Notset'}}
		,g_region2: {name:'top_g_region2_2603.htm', ga:'Region2', inner:{set: G_regionSet.region2.cityCode}}
		,g_sports: {name:'top_g_sports_250930.htm', ga:'Sports', inner:''}
		,g_world: {name:'top_g_world_2509.htm', ga:'World', inner:''}
		,g_animal: {name:'top_g_animal_2509.htm', ga:'Animal', inner:''}
		,g_gourmet: {name:'top_g_gourmet_2509.htm', ga:'Gourmet', inner:''}
		,g_dpoint: {name:'top_g_dpoint_2512.htm', ga:'Dpoint', inner:''}
	},
	//News default
	getCurNews: function(el){
		var res = $.cookie(this.items.g_news.saveName),
			curTab = !res || !this.items.g_news.inner[res] ? 'nc_topics': res;
		if(el) el.dataset.ga = curTab;
		return curTab;
	},
	getRegion: function(category, el) {
		var target = category === 'g_region' ? 'region1' : 'region2';
		var curTab = G_regionSet[target].cityCode.length ? 'set' : 'noset';
		if(el) el.dataset.ga = curTab;
		return curTab;
	},
	getCurTab: function(category, el){
		if(category == 'g_news'){
			return this.getCurNews(el);
		}else if(category == 'g_region' || category == 'g_region2') {
			return this.getRegion(category, el);
		}else if(category == 'g_docomo'){
			$('.chatbot_wrp').addClass('bot_dcmtab');
		}
		//チャットボット・オーバーレイ告知非表示
		if(category != 'g_news'){
			if($('#OverLay_Banner') && !$('#OverLay_Banner').hasClass('is_hide')) $('#OverLay_Banner').removeClass('overlay_nwstab');
		}
		if(category != 'g_docomo'){
			$('.chatbot_wrp').removeClass('bot_dcmtab');
		}
	},
	setDefTab: function(slide, preSlide){
		if(slide.id == 'g_news'){
			if($('#OverLay_Banner') && !$('#OverLay_Banner').hasClass('is_hide')) $('#OverLay_Banner').addClass('overlay_nwstab');
		}else if(slide.id == 'g_docomo'){
			$('.chatbot_wrp').addClass('bot_dcmtab');
		}
		//チャットボット・オーバーレイ告知非表示
		if(slide.id != 'g_news'){
			if($('#OverLay_Banner') && !$('#OverLay_Banner').hasClass('is_hide')) $('#OverLay_Banner').removeClass('overlay_nwstab');
		}
		if(slide.id != 'g_docomo'){
			$('.chatbot_wrp').removeClass('bot_dcmtab');
		}
	}
};

/* --------------------------------
  目的別ジャンルタブ 並び替え
  入稿タブ設定
------------------------------------*/
var G_allTabArr = [];
var G_ls_tabOrder = {
	flg: false
};
var G_existGAArr = {
		'Dpoint':'Dp',
		'News':'Ne',
		'Wadai':'Wa',
		'Coupon':'Co',
		'Entme':'En',
		'Sports':'St',
		'Social':'So',
		'PoliEcon':'Po',
		'Region':'R1',
		'Region2':'R2',
		'World':'Wo',
		'Animal':'An',
		'Gourmet':'Gr',
		'Docomo':'Do'
	};//タブ追加時はここにも追加

(function(){
	if(LOCAL_ST.connect() && LOCAL_ST.get('smt_t_d3p_tab_order') && JSON.parse(LOCAL_ST.get('smt_t_d3p_tab_order')).version) {
		var getLsTabOrder = JSON.parse(LOCAL_ST.get('smt_t_d3p_tab_order'));
		G_ls_tabOrder.expireDate = getLsTabOrder.expire_date;
		G_ls_tabOrder.version = getLsTabOrder.version;
		G_ls_tabOrder.patternId = getLsTabOrder.pattern_id;
		G_ls_tabOrder.rcmNum = getLsTabOrder.rcm_num;
		if(getLsTabOrder.data) {
			G_ls_tabOrder.flg = true;
			G_ls_tabOrder.data = getLsTabOrder.data;
		}
	}

	var defTabArr = recDuplicationCheck(G_defTabOrder.rcm_tab_def_order);
	var fixTabObj = fixDuplicationCheck(G_defTabOrder.fix_tab);
	var fixedTabArr = [], resultTabArr = [], resultValFirst = '', resultValSecond = '', allTabArr = [];
	function getTabArr(lsData){
		var newExistArr = [];
		var existTabArr = fixedTabArr.concat(defTabArr);
		for(var i = 0, l = lsData.length; i < l; i++){//存在しないタブ削除
			var index = existTabArr.indexOf(lsData[i]);
			if(index > -1){
				newExistArr.push(lsData[i]);
			}
		}
		return newExistArr;
	}
	function removeTabArr(arr,removeArr){//タブ配列から不要なタブ排除
		for(var i = 0, l = removeArr.length; i<l; i++){
			var index = arr.indexOf(removeArr[i]);
			if(index > -1){
				arr.splice(index, 1);
			}
		}
		return arr;
	}
	function takeOutArr(arr,num){//numの数だけ取り出す
		var recNum = num ? Number(num) : arr.length;
		var newArr = [];
		for(var i = 0; i < recNum; i++){
			if(arr[i] == null){
				break;
			}
			newArr.push(arr[i]);
		}
		return newArr;
	}
	function recDuplicationCheck(arr){//レコタブ重複削除
		var result = [];
		for(var i=0,len=arr.length; i<len; i++){
			var val = arr[i];
			if(result.indexOf(val) === -1){
				result.push(val);
			}
		}
		return result;
	}
	function fixDuplicationCheck(obj){//固定タブ重複削除
		var result = [];
		var ckName = [], ckOrder = []; //値チェック用配列
		for(var i=0,len=obj.length; i<len; i++){
			if(obj[i].hasOwnProperty('name') && obj[i].hasOwnProperty('order')){ //name,orderを持っている要素のみ
				var name = obj[i].name, order = obj[i].order;
				if(ckName.indexOf(name) === -1 && ckOrder.indexOf(order) === -1){
					result.push(obj[i]);
					ckName.push(name);
					ckOrder.push(order);
				}
			}
		}
		return result;
	}
	function pushTabArr(pushArr, val, num, maxNum){//固定タブの追加
		if(num >= 1 && num <= maxNum){ //1-maxNumの間以外は最後尾へ
			pushArr.splice((num-1), 0, val);
		}else{
			pushArr.push(val);
		}
	}
	function postTabInit(postArr, tabArr){//入稿タブ初期化
		if(postArr.length){
			var setPostObj = {};
			var existGAArrKeys = Object.keys(G_existGAArr);
			// 重複の除外・GA集計用データ作成
			var postNo = [], postPos = [], postId = [], postShortId = []; //重複チェック用配列
			for(var i=0, iLen=postArr.length; i<iLen; i++){
				var postData = postArr[i];
				var postTabNo = postData.tab_no, postTabPos = postData.tab_position, postTabId = postData.ga_tab_id, postTabShortId = postData.ga_tab_id_short;
				if(G_existGAArr.hasOwnProperty(postTabId)) continue; //既にTOPにあるtabidは除外
				if((postTabNo !== '' && postNo.indexOf(postTabNo) == -1) &&
					(postTabPos === '' || postPos.indexOf(postTabPos) == -1) && 
					(postTabId !== '' && postId.indexOf(postTabId) == -1) &&
					(postTabShortId !== '' && postShortId.indexOf(postTabShortId) == -1)){
					var postShortIdFlg = true;

					//GA重複除外
					for(var j=0,jLen=existGAArrKeys.length; j<jLen; j++){
						if(G_existGAArr[existGAArrKeys[j]].toUpperCase() === postTabShortId.toUpperCase()){
							postShortIdFlg = false;
							break;
						}
					}

					//重複あり and 未設定タブの除外
					var postFixFlg = postTabPos !== '' || (postTabPos === '' && tabArr.indexOf(postTabId) > -1);
					if(postShortIdFlg && postFixFlg){
						var postGenreTabName = 'g_post' + postTabNo;
						//重複チェック用配列
						postNo.push(postTabNo); postPos.push(postTabPos);
						postId.push(postTabId); postShortId.push(postTabShortId);

						//管理用データ
						setPostObj[postTabId] = postData;
						G_existGAArr[postTabId] = postTabShortId;
						G_postTabAry.push({tabKey: postTabId, id: postGenreTabName, pos: postTabPos});

						//レコメンド枠から入稿固定枠を削除
						if(defTabArr.indexOf(postTabId) > -1 && postTabPos !== '') defTabArr.splice(defTabArr.indexOf(postTabId), 1);

						//読み込み先設定
						var postBaseFileName = 'top_g_post.htm';
						GENRE_DATA.items[postGenreTabName] = {name: postBaseFileName, ga: postTabId, inner: {setPostId: postTabId}};
					}
				}
			}
			G_postInfo.post_tab.tab_info = setPostObj; //初期化
		}
		//レコメンド枠にあるが、入稿されていない項目の除外
		var newDefArr = [];
		var gaArrKeys = Object.keys(G_existGAArr);
		for(var i=0, len=defTabArr.length; i<len; i++){
			if(gaArrKeys.indexOf(defTabArr[i]) > -1){
				newDefArr.push(defTabArr[i]);
			}
		}
		defTabArr = newDefArr;
	}
	//固定タブ用データ作成処理
	fixTabObj.sort(function(a,b){
		var aPos = Number(a.order), bPos = Number(b.order);
		if( aPos < bPos ) return -1;
		if( aPos > bPos ) return 1;
		return 0;
	});
	for(var i=0,len=fixTabObj.length; i<len; i++){
		fixedTabArr.push(fixTabObj[i].name);
	}
	defTabArr = removeTabArr(defTabArr,fixedTabArr);//デフォルトと固定タブの重複削除
	postTabInit(G_postInfo.post_tab.tab_info, defTabArr.concat(fixedTabArr));//入稿タブ処理準備
	//タブ選定処理
	if(G_ls_tabOrder.flg){
		var recTabArr = getTabArr(G_ls_tabOrder.data);
		recTabArr = removeTabArr(recTabArr,fixedTabArr);//固定タブ削除
		recTabArr = takeOutArr(recTabArr,G_ls_tabOrder.rcmNum);//レコメンドタブを抽出
		defTabArr = removeTabArr(defTabArr,recTabArr);//デフォルトからレコメンド枠削除
		resultTabArr= recTabArr.concat(defTabArr);
	}else{
		resultTabArr = defTabArr.concat();
	}
	//整形した内容をG_defTabOrderへ同期
	G_defTabOrder.rcm_tab_def_order = defTabArr;
	G_defTabOrder.fix_tab = fixTabObj;
	//固定・レコタブ結合
	for(var i=0,len=fixTabObj.length; i<len; i++){
		var fixVal = fixTabObj[i].name, fixPos = fixTabObj[i].order;
		pushTabArr(resultTabArr, fixVal, Number(fixPos), resultTabArr.length);
	}
	allTabArr = resultTabArr.concat();
	//入稿固定枠の追加
	if(G_postTabAry.length){
		G_postTabAry.sort(function(a,b){
			var aPos = Number(a.pos), bPos = Number(b.pos);
			if( aPos < bPos ) return -1;
			if( aPos > bPos ) return 1;
		return 0;
		});
		for(var i=0, len=G_postTabAry.length; i<len; i++){
			var postTabPos = G_postTabAry[i].pos;
			delete G_postTabAry[i].pos;
			if(postTabPos === '') continue;
			pushTabArr(allTabArr, G_postTabAry[i].tabKey, Number(postTabPos), allTabArr.length);
		}
	}
	//地域2が設定されていなければ削除
	if(G_regionSet['region2']['cityCode'] === ''){
		allTabArr = removeTabArr(allTabArr, ['Region2']);
	}
	G_allTabArr = allTabArr.slice();
}());

/* --------------------------------
  入稿タブ生成処理
------------------------------------*/
function setPostFun(ele, data){
	//idの付与
	var id = '#' + ele;
	var mianId = data.ga_tab_id, searchId = data.ga_tab_id +'_FotSch', overlayId = data.ga_tab_id + '_Overlay', fotAdId = data.ga_tab_id + 'WrpFotAd';
	$(id + ' .post_main').attr('id', mianId);
	$(id + ' .post_search').attr('id', searchId);
	$(id + ' .post_overlay').attr('id', overlayId);
	$(id + ' .post_fotAd').attr('id', fotAdId);

	//記事リクエスト
	postNewsSendJsonp(data);
}

//入稿タブ記事リクエスト処理
var G_postTabTimer = {};
function postNewsContents(data){};
function postNewsSendJsonp(postInfo){
	var callbackName = 'postNewsContents';
	var eventId = postInfo.event_id;
	var scriptEleId = 'post'+ eventId;
	var head = document.getElementsByTagName('head')[0];

	//コールバック関数
	window[callbackName] = function(data){
		var postId = 'post'+ data.event_id;
		if(checkId(postId)){
			var targetId = getPostTabId(data.event_id);
			if(targetId != ''){
				clearTimeout(G_postTabTimer[postId]);
				postMakeNew(data, targetId);
			}
		}
	}

	//タイムアウト処理
	G_postTabTimer[scriptEleId] = setTimeout(function(){
		if(checkId(scriptEleId)) failRequest(eventId);
	}, 3000);//3秒

	//リクエスト作成
	var url = 'https://smt.docomo.ne.jp/dmenu/news/data/event/'+ postInfo.event_file_name +'?callback='+ callbackName +'&'+ NOW_NO;
	var scriptEle = document.createElement('script');
	scriptEle.src = url;
	scriptEle.id = scriptEleId;
	scriptEle.onerror = function(){ //404エラー
		clearTimeout(G_postTabTimer[this.id]);
		if(checkId(scriptEleId)) failRequest(eventId);
	}
	head.appendChild(scriptEle);

	//idチェック
	function checkId(id){
		return document.getElementById(id) ? document.getElementById(id) : false;
	}
	//リクエスト失敗
	function failRequest(id){
		var tergetId = getPostTabId(id);
		postMakeNew({}, tergetId);
	}
	//イベントid突き合わせ処理
	function getPostTabId(eventId){
		var postKeys = Object.keys(G_postInfo.post_tab.tab_info);
		var targetId = '';
		for(var i=0,len=postKeys.length; i<len; i++){
			var postInfo = G_postInfo.post_tab.tab_info[postKeys[i]];
			if(eventId === postInfo.event_id){
				targetId = 'g_post' + postInfo.tab_no;
				$('#post'+ eventId).remove();//スクリプトタグの削除
				break;
			}
		}
		return targetId;
	}
}

//入稿タブコンテンツ生成
function postMakeNew(param, ele){
	var postTabId = document.getElementById(ele);
	var postTabKey = GENRE_DATA.items[ele].inner.setPostId;
	var postTabKeyId = '#' + postTabKey;
	var postTabData = G_postInfo.post_tab.tab_info[postTabKey];
	var gaShortId = G_postInfo.post_tab.tab_info[postTabKey].ga_tab_id_short;
	var gaTabId = G_postInfo.post_tab.tab_info[postTabKey].ga_tab_id;
	var postTabInfoNo = G_postInfo.post_tab.tab_info[postTabKey].tab_no;
	var otherUrl = G_postInfo.post_tab.tab_info[postTabKey].other_url;
	var cid = '00hs' + gaShortId;
	var postTagList = [
		{},//先頭に追加
		{},//記事5件下
		{} //記事10件下
	];

	var articleHtml = makeNews(param);

	if(articleHtml){
		var areaHtml = '<div id="'+ postTabKey +'_News"><ul id="'+ postTabKey +'_List" class="js_'+ postTabKey + '_list post_list vList border-list-mgn">'+ articleHtml +'</ul></div>';
		$(postTabKeyId + ' section').html(areaHtml);

		if(postTabData.fixed_link_list && postTabData.fixed_link_list.length){
			makePostContents(postTabData.fixed_link_list, 'fixLink', 'position1'); //固定リンク
		}
		if(postTabData.banner_list && postTabData.banner_list.length){
			makePostContents(postTabData.banner_list, 'bannerThumb', 'position1'); //バナーサムテキ
		}
		if(otherUrl){
			$.ajax({
				url: otherUrl +'?callback=getPostTabOther',
				type: 'GET',
				dataType: 'jsonp',
				cache: false,
				async: false,
				jsonpCallback: 'getPostTabOther'
			}).done(function(data, status, xhr){
				if(data.other.banner_list.length){
					makePostContents(data.other.banner_list, 'flashBnr', 'position'); //速報バナー
				}
				if(data.other.thumbnail_list.length){
					makePostContents(data.other.thumbnail_list, 'flashThumb', 'position'); //速報サムテキ
				}
			}).fail(function(data, status, xhr){
				console.log(xhr.statusText);
			}).always(function(){
				postAddContents();
			});
		}else{
			postAddContents();
		}

		function postAddContents(){
			var rectangleHtml = rectangleBnrAdd(postTabData.rectangle_banner);

			//各リンク・バナーのタグを結合させる
			postListJoin(postTagList);

			if(Object.keys(postTagList[0]).length || Object.keys(postTagList[1]).length || Object.keys(postTagList[2]).length){
				//postTagListのデータをそれぞれの位置に差し込む
				var postTag = $('.js_'+ postTabKey + '_list');
				var postLength = postTag.find('.js_post_news').length;
				if(postTagList[0]){
					postTag.prepend(postTagList[0].allData);
				}
				if(postTagList[1]){
					var num = postLength > 5 ? 5: postLength;
					if(num === 0){
						postTag.append(postTagList[1].allData);
					}else{
						if(postTag.find('.js_post_news').eq(num-1).next('.adDataStyle').length){
							postTag.find('.js_post_news').eq(num-1).next('.adDataStyle').after(postTagList[1].allData);
						}else{
							postTag.find('.js_post_news').eq(num-1).after(postTagList[1].allData);
						}
					}
				}
				if(postTagList[2]){
					var num = postLength > 10 ? 10: postLength;
					if(num < 6){
						postTag.append(postTagList[2].allData);
					}else{
						if(postTag.find('.js_post_news').eq(num-1).next('.adDataStyle').length){
							postTag.find('.js_post_news').eq(num-1).next('.adDataStyle').after(postTagList[2].allData);
						}else{
							postTag.find('.js_post_news').eq(num-1).after(postTagList[2].allData);
						}
					}
				}
			}
			if(rectangleHtml){
				postTag.append(rectangleHtml);
			}

			//文字サイズ調整
			var fixBtnWrp = $('.js_'+ postTabKey + '_list .post_fix_btn_wrp');
			for(var i=0;i<fixBtnWrp.length;i++){
				var postFixBtnItem = fixBtnWrp.eq(i).find('.post_fix_btn_item');
				if(postFixBtnItem.length >= 2){
					postFixBtnItem.find('.post_fix_btn_txt').addClass('post_fix_btn_small');
				}
			}
			//罫線調整
			var flashBtnWrpNext = $('.post_flash_bn_wrp').next('.post_flash_bn_wrp');
			if(flashBtnWrpNext){
				flashBtnWrpNext.prev('.post_flash_bn_wrp').find('.post_flash_bn .vList_item:last-child .post_flash_bn_link').addClass('border_b_none');
				flashBtnWrpNext.find('.post_flash_bn .vList_item:first-child').addClass('border_t_1px');
			}
			var lastContents = $('.post_fix_btn_wrp, .post_flash_bn_wrp');
			var lastContentsLength = lastContents.length;
			for(var i=0;i<lastContentsLength;i++){
				var nextContent = lastContents.eq(i).next();
				if(!nextContent.length){
					if(lastContents.eq(i).hasClass('post_fix_btn_wrp')){
						lastContents.eq(i).find('.post_fix_btn_item').addClass('border_b_none');
					}else if(lastContents.eq(i).hasClass('post_flash_bn_wrp')){
						lastContents.eq(i).find('.post_flash_bn .vList_item:last-child .post_flash_bn_link').addClass('border_b_none');
					}
				}
			}
		}
	}else{
		$(postTabKeyId + ' section').html('<div class="post_cp_empty_text"><p>読み込み中にエラーが発生しました。<br>しばらくしてから、もう一度お試しください。</p><div class="loadErr_btn" data-parentid="'+ postTabKey +'">再度読み込む</div></div>');
		$('[data-parentid="'+ postTabKey +'"]').on('click', function(){
			$(postTabKeyId + ' section').html('<div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div>');
			postNewsSendJsonp(postTabData);
		});
	}

	//オーバーレイ表示
	var postOverlayBanner = $('#'+ gaTabId +'_Overlay');
	var overlayData = postTabData.overlay_banner;
	if($('#'+ gaTabId +'_Overlay .js_overlay_post').length === 0){
		postOverlayContents();
	}

	if(!$(postTabKeyId).hasClass('js-post_make')) return; //作成済みの場合スキップ
	// フッター広告
	$(function(){
		TOP_INIT.adFooter(postTabKeyId +'WrpFotAd', 'f0ab20fblt5N');
	});

	// 広告遅延読み込み
	$(function(){
		var postAdPid = postTabData.allox_pid;
		document.addEventListener("lazybeforeunveil", function(e){
			if(!postTabId.classList.contains('df_isCurrent_slide')) return;
			if(e.target.parentElement.classList.contains('post_adInfeed')){
				$('#' + e.target.id).replaceWith('<div class="portal_adarea" data-portaladsystem="allox" data-portaladid="'+ postAdPid +'"><div data-allox-placement="'+ postAdPid +'" data-allox-infinite></div><sc' + 'ript async="async" src="//alxc.addlv.smt.docomo.ne.jp/p/'+ postAdPid +'.js"></sc' + 'ript></div>');
			}
		});
	});

	footSearchFnc(postTabKeyId +'_FotSch');
	$(postTabKeyId).removeClass('js-post_make'); //作成完了

	//ニュース記事作成
	function makeNews(data){
		var tmpHtml = '';
		if(data.tagged_news && data.tagged_news.length > 0){
			var postNewsData = data.tagged_news;
			var thumbNum = 0;
			var ckPointData = {count:0,ckCount:0,class:'',data:''};
			var adCount = 1;
			var postAdPid = postTabData.allox_pid;

			for(var i = 0, len = postNewsData.length; i < len; i++){
				var postNewsArticle = postNewsData[i].news_article;
				var postNewsNum = ('000' + (i+1)).slice(-3);
				var postNewsCid = cid + '2' + postNewsNum;
				var postUtmHead = postNewsArticle.path.indexOf('?') > 0 ? '&' : '?';
				var postUtmUa = IOS_FLG ? 'iphone' : 'hs';
				var postNewsURL = 'https://topics.smt.docomo.ne.jp'+ postNewsArticle.path + postUtmHead +'utm_source=dmenu_top&utm_medium='+ postUtmUa +'top&utm_campaign='+ gaTabId +'_'+ postNewsNum;
				var postNewsImgFlg = false;
				if(postNewsArticle.image && postNewsArticle.image.m_src != ''){
					var postNewsRegex = /^\/picture\//;
					if(postNewsRegex.test(postNewsArticle.image.m_src) === true){
						if((i+1)%5 === 1){
							var postNewsImgURL = 'https://img.topics.smt.news.goo.ne.jp/image_proxy/smartcrop/w_1200_h_628_q_80'+ postNewsArticle.image.m_src;
						} else {
							var postNewsImgURL = 'https://img.topics.smt.news.goo.ne.jp/image_proxy/smartcrop/w_180_h_180_q_80'+ postNewsArticle.image.m_src;
						}
					} else {
						var postNewsImgURL = 'https://img.topics.smt.news.goo.ne.jp'+ postNewsArticle.image.m_src;
					}
					postNewsImgFlg = true;
				} else {
					var postNewsImgURL = 'https://smt.docomo.ne.jp./top_thumb_def_0'+ (thumbNum%3+1) +'.png';
					thumbNum++;
				}
				var postNewsTime = makePostDate(postNewsArticle.date);

				ckPointData.count++;
				if(ckPointData.count % 10 === 0){
					ckPointData.ckCount++;
					ckPointData.class = ' ck_point';
					ckPointData.data = ' data-ckpoint = "CheckPoint'+ ckPointData.ckCount +'"';
				} else {
					ckPointData.class = '';
					ckPointData.data = '';
				}

				if((i+1)%5 === 1 && postNewsImgFlg){
					tmpHtml += '<li class="vList_item vList_item_11a js_post_news'+ ckPointData.class +'"'+ ckPointData.data +'>'
					+ '<a class="vList_link vList_link_11a f_v-t_c-v" data-link-id="' + postNewsCid +'_'+ postNewsArticle.news_article_id +'" data-portalarea="top-'+ postNewsCid +'" href="'+ postNewsURL +'">'
					+ '<div class="vList_link_inner vList_thumb_img_11a f_h-l_c-v-h">'
					+ '<img class="lazyload" data-src="'+ postNewsImgURL +'" alt="'+ postNewsArticle.title +'">'
					+ '</div><div class="nws_base_txt">'
					+ '<h3 class="item_ttl maxRow-3">'+ postNewsArticle.title +'</h3>'
					+ '<div class="thumb_news_info_18 mg-t-2 f_h-l_c-v">'
					+ '<div class="nws_tlbl mg-t-2">'+ postNewsArticle.ip_name +'</div>'
					+ '</div></div></a></li>';
				}else{
					tmpHtml += '<li class="vList_item js_post_news'+ ckPointData.class +'"'+ ckPointData.data +'>'
					+ '<a class="vList_link f_h-l_c-v" data-link-id="' + postNewsCid +'_'+ postNewsArticle.news_article_id +'" data-portalarea="top-'+ postNewsCid +'" href="'+ postNewsURL +'">'
					+ '<div class="vList_link_inner vList_thumb_img_10a f_h-l_c-v-h">'
					+ '<img class="lazyload" data-src="'+ postNewsImgURL +'" alt="'+ postNewsArticle.title +'">'
					+ '</div><div class="vList_link_inner f_item-fit">'
					+ '<h2 class="item_ttl maxRow-4">'+ postNewsArticle.title +'</h2>'
					+ '<div class="thumb_news_info_18 mg-t-2 f_h-l_c-v">'
					+ '<div class="nws_tlbl mg-t-2">'+ postNewsArticle.ip_name +'</div>'
					+ '<div class="nws_tlbl mg-t-2">'+ postNewsTime +'</div>'
					+ '</div></div></a></li>';
				}

				//インフィード広告
				if(postAdPid !== ''){
					if((i+1) % 5 === 0){
						if(i+1 !== len){
							tmpHtml += '<li class="adDataStyle" style="margin:0 -8px">'
								+ '<div class="post_adInfeed"><div id="PostAdInfeed'+ gaShortId + ('00'+ (adCount)).slice(-2) +'" class="lazyload">'
								+ '</div></div></li>';
							adCount++;
						}
					}
				}
			}
		}
		return tmpHtml;
	}

	// コンテンツ生成
	function makePostContents(data, area, posTxt){
		var postDataList = {position1:[], position2:[], position3:[]}
		for(var i = 0, len = data.length; i < len; i++){
			if(data[i][posTxt] && data[i][posTxt] === '1'){
				postDataList.position1.push(data[i]);
			}else if(data[i][posTxt] && data[i][posTxt] === '2'){
				postDataList.position2.push(data[i]);
			}else if(area !== 'fixLink' && data[i][posTxt] && data[i][posTxt] === '3'){ //固定バナーは最上部・記事リスト5件目下の2箇所のみ
				postDataList.position3.push(data[i]);
			}
		}
		var postDataListKeys = Object.keys(postDataList);
		var postCount = {
			fixLink: 0,
			flashBnr: 0,
			flashThumb: 0,
			bannerThumb: 0
		}
		for(var i=0,listLen=postDataListKeys.length;i<listLen;i++){
			if(area === 'fixLink' && i === 2) break;
			var tmpHtml = "";
			var itemList = postDataList[postDataListKeys[i]];
			if(area === 'fixLink' || area === 'bannerThumb'){
				postListSort(itemList);
			}
			var itemLen = itemList.length;
			for(var j=0,len=itemLen;j<len;j++){
				switch(area){
					case 'fixLink': //固定リンク
						if(j > 1) break;
						var dmenutopPosition = itemList[j].tab ? dmenutopPositionVal(postTabKey,"fixedlink_fixedlink",itemList[j].position1,itemList[j].position2):'';
						var fixLinkUrl = postMakeUrl(itemList[j].url, itemList[j].tab, dmenutopPosition);
						var postID = postCid(area, '3');
						tmpHtml += fixLinkUrl ? '<li class="post_fix_btn_item"><a class="post_fix_btn_link js_post_fix_btn_link f_h-l_c-v-h" data-link-id="'+ postID + '_' + itemList[j].id +'" data-portalarea="top-'+ postID +'"'+ fixLinkUrl +'<div class="post_fix_btn_txt">'+ itemList[j].txt +'</div></a></li>': "";
						postCount[area]++;
						break;
					case 'flashBnr': //速報バナー
						var postID = postCid(area, '4');
						tmpHtml += '<li class="vList_item"><a class="post_flash_bn_link" data-link-id="'+ postID +'" data-portalarea="top-'+ postID +'" href="'+ itemList[j].url +'"><img class="lazyload" data-src="'+ itemList[j].img +'?'+ NOW_FULL_DATE +'" alt=""></a></li>';
						postCount[area]++;
						break;
					case 'flashThumb': //速報サムテキ
						switch(itemList[j].label_flg){
							case '1':
								var liveLabel = '<div class="post_live_label lbl">LIVE</div>';
								break;
							case '2':
								var liveLabel = '<div class="post_new_label lbl">NEW</div>';
								break;
							default:
								var liveLabel = '';
								break;
						}
						var postID = postCid(area, '5');
						tmpHtml += '<li class="vList_item"><a class="vList_link f_h-l_c-v" data-link-id="'+ postID +'" data-portalarea="'+ postID +'" href="'+ itemList[j].url +'"><div class="vList_link_inner vList_thumb_img_10b f_h-l_c-v-h"><img class="lazyload" data-src="'+ itemList[j].img +'?'+ NOW_FULL_DATE +'" alt="'+ itemList[j].txt +'"></div><div class="vList_link_inner f_item-fit"><h2 class="item_ttl maxRow-4">'+ itemList[j].txt +'</h2><div class="thumb_news_info_18 mg-t-2 f_h-l_c-v">'+ liveLabel +'</div></div></a></li>';
						postCount[area]++;
						break;
					case 'bannerThumb': //バナーサムテキ
						var dmenutopPosition = '';
						if(itemList[j].tab) {
							var postPosition = itemList[j].position2 ? itemList[j].position2 : 1;
							dmenutopPosition = dmenutopPositionVal(postTabKey,"banner_banner",itemList[j].position1,postPosition);
						}
						var bannerThumbLink = postMakeUrl(itemList[j].url, itemList[j].tab, dmenutopPosition);
						var postID = postCid(area, '1');
						if(bannerThumbLink){
							if(itemList[j].txt !== ''){
								tmpHtml += '<li class="vList_item"><a class="vList_link f_h-l_c-v js_banner_thumb" data-link-id="'+ postID + '_' + itemList[j].id +'" data-portalarea="top-'+ postID +'"'+ bannerThumbLink +'<div class="vList_link_inner vList_thumb_img_10a f_h-l_c-v-h"><img class="lazyload" data-src="https://smt.docomo.ne.jp/dmenu/hottopics/img/'+ itemList[j].img +'?'+ NOW_DATE +'" alt="'+ itemList[j].txt +'"></div><div class="vList_link_inner f_item-fit"><h2 class="item_ttl">'+ itemList[j].txt +'</h2></div></a></li>';
							}else{
								tmpHtml += '<li class="vList_item"><a class="vList_link f_v-t_c-v js_banner_thumb" data-link-id="'+ postID + '_' + itemList[j].id +'" data-portalarea="top-'+ postID +'"'+ bannerThumbLink +'<div class="vList_link_inner vList_thumb_img_autotab_newsbn"><img class="lazyload" data-src="https://smt.docomo.ne.jp/dmenu/hottopics/img/'+ itemList[j].img +'?'+ NOW_DATE +'" alt=""></div></a></li>';
							}
						}
						postCount[area]++;
						break;
					default:
						break;
				}
			}
			postTagList[i][area] = tmpHtml;
		}
		// カウントID生成
		function postCid(area, num){
			var count = ('000' + (postCount[area] + 1)).slice(-3);
			var result = cid + num + count;
			return result;
		}
	}
	function dmenutopPositionVal(tabId,event,end,position) {
		var endTxt = end;
		if(position) endTxt += "_" + ('000'+position).slice(-3);
		return tabId + "_" + event + "_" + endTxt;
	}
	function postMakeUrl(link, tabName, position){
		var result = '';
		if(link){
			var result = ' href="'+ link +'">'
			return result;
		}else if(tabName){
			if($('#' + tabName).length === 0) return result;
			var result = ' data-target="'+ tabName +'" data-dmenutop-position="' + position + '" href="#">';
			return result;
		}
		return result;
	}
	function postListJoin(data){
		for(var i=0,len=data.length;i<len;i++){
			var contents = data[i];
			switch(i){
				case 0:
					var contentsKeys = ['fixLink','flashBnr','flashThumb','bannerThumb'];
					break;
				case 1:
					var contentsKeys = ['flashBnr','flashThumb','bannerThumb','fixLink'];
					break;
				case 2:
					var contentsKeys = ['flashBnr','flashThumb','bannerThumb'];
					break;
			}
			var tmpData = '';
			for(var j=0,len=contentsKeys.length;j<len;j++){
				if(contents[contentsKeys[j]]){
					var areaData = '';
					switch(contentsKeys[j]){
						case 'fixLink': //固定リンク
							areaData = '<li class="post_fix_btn_wrp"><ul class="post_fix_btn f_h-l_c-v-h">'+ contents[contentsKeys[j]] +'</ul></li>';
							break;
						case 'flashBnr': //速報バナー
							areaData = '<li class="post_flash_bn_wrp"><ul class="post_flash_bn">'+ contents[contentsKeys[j]] +'</ul></li>';
							break;
						case 'flashThumb': //速報サムテキ
							areaData = '<li class="flash_thumb_list_wrp"><ul class="flash_thumb_list vList_thumb_10b">'+ contents[contentsKeys[j]] +'</ul></li>';
							break;
						case 'bannerThumb': //バナーサムテキ
							areaData = '<li class="banner_thumb_list_wrp"><ul class="banner_thumb_list">'+ contents[contentsKeys[j]] +'</ul></li>';
							break;
						default:
							break;
					}
					tmpData = tmpData ? tmpData + areaData: areaData;
				}
			}
			if(tmpData){
				data[i]['allData'] = tmpData;
			}
		}
		return;
	}
	// 日付フォーマット
	function makePostDate(date){
		var dateArray = ['日','月','火','水','木','金','土'];
		date = date.replace(/:\d{2}.\d{3} \+\d{2}:\d{2}/g,"");
		date = date.replace(/-/g,"/");
		var timeDate = new Date(date);
		var strDate = (timeDate.getMonth() + 1) +'/'+
			('0'+ timeDate.getDate()).replace(/^0+/, '') +
			'('+ (dateArray[timeDate.getDay()]) + ') '+ timeDate.getHours()
			+':'+ ('0' + timeDate.getMinutes()).slice(-2);
		return strDate;
	}
	// 昇順ソート
	function postListSort(data){
		data.sort(function(a, b){
			if(Number(a.position2) > Number(b.position2)){
				return 1;
			} else if (Number(a.position2) < Number(b.position2)){
				return -1;
			} else {
				return 0;
			}
		});
	}
	// レクタングルバナー表示
	function rectangleBnrAdd(data) {
		var tmpHTML = "";
		for(var i=0,rectLen=data.length;i<rectLen;i++){
			var rectangleCount = ('000' + (i + 1)).slice(-3);
			var rectangleCid = cid +'6'+ rectangleCount;
			tmpHTML += '<li class="vList_item autotab_rectangle"><a class="vList_link autotab_rect_link" data-link-id="'+ rectangleCid + '_' + data[i].id +'" data-portalarea="top-'+ rectangleCid +'" href="'+ data[i].url +'"><div class="vList_link_inner autotab_rect_img"><img class="lazyload" data-src="https://smt.docomo.ne.jp/dmenu/hottopics/img/'+ data[i].img +'?'+ NOW_DATE +'" alt=""></div></a></li>';
		}
		return tmpHTML;
	}
	// オーバーレイ告知枠表示
	function postOverlayContents(){
		var lsOverlayFlg = false;
		if(overlayData[0]){
			if($.cookie('smt_t_overlay_post')){
				var cookieData = JSON.parse($.cookie('smt_t_overlay_post'));
				if(cookieData[postTabInfoNo]){
					lsOverlayFlg = cookieData[postTabInfoNo] === overlayData[0].id ? true: false;
				}	
			}
			if(!lsOverlayFlg){
				var dmenutopPosition = overlayData[0].tab ? dmenutopPositionVal(postTabKey,"overlay_tabtransition",overlayData[0].id,""):'';
				var overLayLink = postMakeUrl(overlayData[0].url, overlayData[0].tab, dmenutopPosition);
				if(!overLayLink) return;
				var overlayImg = '<img class="lazyload" data-src="https://smt.docomo.ne.jp/dmenu/hottopics/img/'+ overlayData[0].img +'?'+ NOW_DATE +'" alt="">';
				var overlayCid = cid + '7001';
				var tmpHtml = '<a class="overlay_bn_link js_overlay_post" data-link-id="'+ overlayCid + '_' + overlayData[0].id +'" data-portalarea="top-'+ overlayCid +'"'+ overLayLink +'<div class="overlay f_h-l_c-v">'+ overlayImg +'</div></a>';
				var missionCounter = 0;
				if(LOCAL_ST.connect() && PSN_INFO_JSON.dpoint_hook.length && !pointHook.checkLsOverlayId()){
					(function checkStatus(){
						if(!G_missionStatus){
							if(missionCounter < 9){
								setTimeout(checkStatus, 300);
								missionCounter++;
							}else{
								postOverlayFnc();
							}
						}else{
							var missionType = pointHook.checkMissionType();
							if(G_missionStatus === 1 ||
								pointHook.checkStatus() >= 2 ||
								((missionType === '+tab' || missionType === '+sports') && pointHook.checkStatus() < 2 && !pointHook.checkLsModalId())){
								postOverlayFnc();
								if(pointHook.checkStatus() < 2 && !pointHook.checkLsModalId()){
									pointHook.showOverlayBannerList.push({
										id: '#'+ gaTabId +'_Overlay',
										fun: postOverlayScroll
									});
								}
							}else{
								postOverlayBanner.removeClass('overlay_posttab');
								postOverlayBanner.find('.overlay_bn_inr').append(tmpHtml);
								pointHook.waitOverlayBannerList.push({
									id: '#'+ gaTabId +'_Overlay',
									fun: postOverlayEvent,
									view: 'overlay_posttab'
								});
							}
						}
					}());
				}else{
					postOverlayFnc();
				}
			}
		}
		function postOverlayFnc() {
			postOverlayBanner.find('.overlay_bn_inr').append(tmpHtml);
			postOverlayEvent();
		}
	}
	function postOverlayScroll() {
		if(this.pageYOffset > 600){
			postOverlayBanner.addClass('overlay_scroll');
			postOverlayBanner.removeClass('is_hide');
		}else{
			postOverlayBanner.removeClass('overlay_scroll');
		}
	}
	function gaDmenutopPosition(val) {
		if(val) {
			dataLayer.push({
				"event": "DWEB_click_specialtrack",
				"dweb_click_specialtrack_value": val,
				"dweb_click_specialtrack_url": undefined,
				"dweb_click_specialtrack_portalarea": val
			});
		}
	}
	function postOverlayEvent() {
		$(window).on('scroll', postOverlayScroll);
		// オーバーレイ告知枠非表示
		postOverlayBanner.on('click', '.js_overlay_post_close', function(){
			postOverlayBanner.removeClass('overlay_posttab').addClass('is_hide');
			//cookie保存処理
			if($.cookie('smt_t_overlay_post')){
				var ck = JSON.parse($.cookie('smt_t_overlay_post'));
			}else{
				var ck = {};
			}
			ck[postTabInfoNo] = overlayData[0].id;
			$.cookie('smt_t_overlay_post', JSON.stringify(ck), { domain: '.smt.docomo.ne.jp', expires: 60, path: '/' });
			if(overlayData[0].tab) gaDmenutopPosition(dmenutopPositionVal(postTabKey,"overlay_close",overlayData[0].id,""));
		});
	}
	$(function(){
		$(postTabKeyId).on('click', 'a.js_post_fix_btn_link, a.js_banner_thumb, a.js_overlay_post', function(e) {
			e.preventDefault();
			var getData = $(this)[0].dataset;
			var dmenutopPosition = getData.dmenutopPosition;
			gaDmenutopPosition(dmenutopPosition);
			if(!getData.target) {
				var getHref = $(this)[0].href;
				if(IOS_FLG){
					location.href = getHref;
				}else{
					window.open(getHref, '_blank');
				}
				return;
			}
			var targetSl = GENRE_AREA.findIndex('#' + getData.target)
			, res = GENRE_AREA.moveSlide(targetSl, {
				scrollOff: false,
				pos: GENRE_AREA.getTabPos(),
				speed: 800
			});
			if (this.classList.contains('js_post_fix_btn_link')) {
				var actionTxt = 'fixedlink'
			}else if(this.classList.contains('js_banner_thumb')){
				var actionTxt = 'banner'
			}else if(this.classList.contains('js_overlay_post')){
				var actionTxt = 'overlay'
			}
			pushTabGA({
				tabType: 'outer',
				action: actionTxt,
				outer: res.slide.id,
				inner: res.slide.dataset.ga,
				preOuter: res.preSlide.id,
				preInner: res.preSlide.dataset.ga
			});
		});
	});
}

//Genre defaultTab
GENRE_DATA.curGenre = (function(undefined){
	//AppPushParam
	var defParam, urlParam = location.search;
	GENRE_DATA.hasParam = urlParam.indexOf('tabDefault=');
	if(urlParam && ~GENRE_DATA.hasParam){
		var paramAry = urlParam.match('([^?|&])?tabDefault=([^&]*)(&|$)'),
			newParam = urlParam.replace(paramAry[0], '');
		defParam = paramAry[2];

		if((/[\?|&]/).test(newParam.slice(-1))) newParam = newParam.slice(0, -1);
		history.replaceState(null, null, location.pathname + newParam);

		if(GENRE_DATA.items[defParam]){
			$(window).on('load', function(){
				setTimeout(function(){
					var $tgtEl = HASH ?$(HASH):$('header'),
						pos = $tgtEl.offset().top + (HASH?$('.df_hed-inner').height()*-1:$tgtEl.height());
					window.scroll(0, pos);
				},500);
			});
		}else{
			defParam = undefined;
		}
	}
	if(!defParam){ //cookie
		defParam = $.cookie(GENRE_DATA.saveName);
		if(!defParam || !GENRE_DATA.items[defParam]){ defParam = 'g_news'; }
	}
	return defParam;
}());
//GA init data
pushTabGA({outer:GENRE_DATA.curGenre, inner:GENRE_DATA.getCurTab(GENRE_DATA.curGenre), tabType:'outer', action:'init'});

/* --------------------------------
  目的別ジャンルタブ 生成
------------------------------------*/
$(function() {
	//タブ追加時はここにも追加
	var allTabData = {
		'Dpoint': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner genrTab_title_10byte"><span>dポイント</span></div></li>',
			body: '<div id="g_dpoint" data-ga="" data-ckpoint="Dpoint" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'News': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner genrTab_title_narrow"><span>ニュース</span></div></li>',
			body: '<div id="g_news" data-ga="" data-ckpoint="News" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Wadai': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner"><span>ラン<br>キング</span></div></li>',
			body: '<div id="g_wadai" data-ga="" data-ckpoint="Wadai" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Coupon': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner genrTab_title_narrow"><span>クーポン</span></div></li>',
			body: '<div id="g_coupon" data-ga="" data-ckpoint="Coupon" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Entme': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner genrTab_title_narrow"><span>エンタメ</span></div></li>',
			body: '<div id="g_entme" data-ga="" data-ckpoint="Entme" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Sports': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner genrTab_title_narrow"><span>スポーツ</span></div></li>',
			body: '<div id="g_sports" data-ga="" data-ckpoint="Sports" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Social': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner"><span>社会</span></div></li>',
			body: '<div id="g_social" data-ga="" data-ckpoint="Social" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'PoliEcon': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner"><span>政治<br>経済</span></div></li>',
			body: '<div id="g_poli_econ" data-ga="" data-ckpoint="PoliEcon" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Region': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner"><span>地域</span></div></li>',
			body: '<div id="g_region" data-ga="" data-ckpoint="Region" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Region2': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner"><span>地域2</span></div></li>',
			body: '<div id="g_region2" data-ga="" data-ckpoint="Region2" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'World': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner"><span>国際<br>科学</span></div></li>',
			body: '<div id="g_world" data-ga="" data-ckpoint="World" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Animal': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner genrTab_title_narrow"><span>どうぶつ</span></div></li>',
			body: '<div id="g_animal" data-ga="" data-ckpoint="Animal" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Gourmet': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner"><span>グルメ</span></div></li>',
			body: '<div id="g_gourmet" data-ga="" data-ckpoint="Gourmet" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		},
		'Docomo': {
			head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner genrTab_title_narrow"><span>ドコモの<br>サービス</span></div></li>',
			body: '<div id="g_docomo" data-ga="" data-ckpoint="Docomo" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
		}
	};

	//入稿タブ設定
	for(var i=0,len=G_postTabAry.length; i<len; i++){
		var postTabData = G_postInfo.post_tab.tab_info[G_postTabAry[i].tabKey];
		var postTabNameClass = '';
		if(postTabData){
			//タブhtml設定
			var postTabName = postTabData.tab_name1;
			var tabName2Flg = postTabData.hasOwnProperty('tab_name2') && postTabData.tab_name2 !== '' ? true : false;
			if(tabName2Flg) postTabName += '<br>'+ postTabData.tab_name2;
			if(postTabData.tab_name1.length === 4 || (tabName2Flg && postTabData.tab_name2.length === 4)) postTabNameClass = ' genrTab_title_narrow'; //文字数が最大の時
			allTabData[G_postTabAry[i].tabKey] = {
				head: '<li class="df_tab-item genrTab_item"><div class="genrTab_inner'+ postTabNameClass +'"><span>'+ postTabName +'</span></div></li>',
				body: '<div id="'+ G_postTabAry[i].id +'" data-ga="" data-ckpoint="'+ G_postTabAry[i].tabKey +'" class="df_slide-item genrSlide_item"><div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div></div>'
			}
		}
	}

	makeGenrTab(G_allTabArr);//目的別ジャンルタブ生成
	customRegionTab();//地域タブカスタム
	setFlick();//フリックイベント設定
	setBalloon(G_allTabArr);//吹き出し処理

	if(!G_abTest.tabData.d3pRequestFlg){
		var lsExpireDate = G_ls_tabOrder.expireDate;
		var expireDate = Number(new Date(lsExpireDate.substring(0,4) + '/'
						+ lsExpireDate.substring(4,6) + '/'
						+ lsExpireDate.substring(6,8) + ' '
						+ lsExpireDate.substring(8,10) + ':'
						+ lsExpireDate.substring(10,12) + ':'
						+ lsExpireDate.substring(12,14)));
		var nowDate = Number(new Date());
		if((expireDate - nowDate) <= 0){ //有効期限外
			G_abTest.tabData.d3pRequestFlg = true;
		}
	}
	requestTabOrder();
	requestNewsAttribute();

	//segment,numberの取得更新
	//ABテスト抽選結果を格納
	function requestNewsAttribute(){
		var psnTestVer = G_abTest.psnData.version;
		var psnTestId = G_abTest.psnData.ptnId;
		if(/D|E|F|G/.test(psnTestId)){
			//segment,number取得・更新
			NewsSegmentRequest().then(function(data){
				var segment = '';
				var number = '';
				var newsFlg = G_abTest.psnData.newsFlg;
				if(data){
					segment = data['segment'][psnTestId] ? data['segment'][psnTestId] : '';
					number = data['number'];
				}
				if(psnTestId === 'D') newsFlg = ''; //Dの時は初期化
				var setObj = {
					version: psnTestVer,
					pattern_id: psnTestId,
					news_flg: newsFlg,
					segment: segment,
					number: number
				};
				if(LOCAL_ST.connect()) LOCAL_ST.set('smt_t_abtest_news_topics', JSON.stringify(setObj));
			});
		}else{
			//抽選結果更新
			var setObj = {
				version: psnTestVer,
				pattern_id: psnTestId,
				news_flg: '',
				segment: '',
				number: ''
			};
			if(LOCAL_ST.connect()) LOCAL_ST.set('smt_t_abtest_news_topics', JSON.stringify(setObj));
		}

		//segment,numberリクエスト
		function NewsSegmentRequest(){
			var d3pObj = false;
			var deferred = $.Deferred();
			d3p.cmd.push(function(){ d3p.getD3pData("majorNews", "segnolist,number", 60 * 60 * 24, function(data){
				if(data){
					d3pObj = {segment:"", number: ""};
					if(data.segnolist){
						d3pObj.segment = JSON.parse(data.segnolist);
					}
					if(data.number){
						d3pObj.number = data.number;
					}
				}else{
					d3pObj = {};
				}
			}, { await: true, skipCacheOnError: true })});
			var count = 0;
			dataCheck();

			//データチェック
			function dataCheck(){
				if(d3pObj){
					if((d3pObj.segment && Object.keys(d3pObj.segment).length) || d3pObj.number){
						return deferred.resolve(d3pObj);
					}else{
						return deferred.resolve(false);
					}
				}else if(count > 9){
					return deferred.resolve(false);
				}else{
					count++;
					setTimeout(dataCheck, 300);
				}
			}
			return deferred.promise();
		}
	}

	//タブ並び順 d3pリクエスト処理
	function requestTabOrder(){
		if(G_abTest.tabData.d3pRequestFlg){ //タブABテスト抽選済み or LS有効期限外
			d3p.cmd.push(function(){ d3p.getD3pData(G_abTest.tabData.d3pName, "tablist", 60 * 60 * 24, function(data){
				try {
					if(typeof data !== 'object' || Array.isArray(data)) throw 'dataの型が非正常です。'; //連想配列か確認
					var expire_date = new Date();
					if(data == null || data['tablist'] == null){
						var dataArr = "";
						dataLayer.push({'event':'DWEB_tab_ab_d3p'});
					}else{
					//正常系
						var dataArr = JSON.parse(data.tablist);
						expire_date.setDate(expire_date.getDate() + G_abTest.tabData.lsExpireDay);
					}
					expire_date = expire_date.getFullYear() + ('0' + (expire_date.getMonth() + 1)).slice(-2)
								+ ('0' + expire_date.getDate()).slice(-2) + ('0' + expire_date.getHours()).slice(-2)
								+ ('0' + expire_date.getMinutes()).slice(-2)+ ('0' + expire_date.getSeconds()).slice(-2);
					//LSセット
					LOCAL_ST.set('smt_t_d3p_tab_order', JSON.stringify({'data': dataArr,'expire_date': expire_date,'version': G_abTest.tabData.version,'pattern_id': G_abTest.tabData.ptnId, 'rcm_num': G_abTest.tabData.rcmNum}));
				} catch (error) { //非正常系
					console.log(error);
				}
			}, { await: true })});
		}
	}
	function makeGenrTab(tabArray){
		var tabHtml = '';
		var slideHtml = '';
		for(var i=0, len=tabArray.length; i<len; i++){
			var tabName = tabArray[i];
			if(!allTabData[tabName]){
				console.log('tab error! : '+ tabName);
				continue;
			}
			tabHtml += allTabData[tabName].head;
			slideHtml += allTabData[tabName].body;
		}
		$('.genrTab').html(tabHtml);
		$('.genrSlide_mask').html(slideHtml);
	}
}); //目的別ジャンルタブ 並び替え/生成

function categoryNewsArea(id, index) {
	$(id).data('category_data', CATEGORY_TABLE[index]);
	var newsList = NEWS_JSON.news_list;
	for(var i=0, len = newsList.length; i<len; i++){
		if(newsList[i].t_id === id.slice(1)){
			$(id).data('news_data', newsList[i]);
		}
	}
}
//コンテンツの挿入
function makeContents(index, elSlide, ckPoint){
	var $box = $(elSlide);
	if($box.hasClass('is_maked')) return;

	var cData = $box.data('category_data'), nData = $box.data('news_data'),
		aList = nData.article_list, aLen = aList.length,
		tmpHTML = '<ul class="vList border-list-mgn">', thumbCnt = 0,adData;
	var checkPoint = OBJ_TICKER.init(); //チェックポイント生成用Ticker

	//広告
	adData = makeAd();

	//主要ニュース10件パーソナライズ化
	if(elSlide.id === 'nc_topics'){
		var psnCounter = 0;
		aLen = 14;
		(function newsTabPsn(){
			if(G_psnObj.loadFlg === 'ok'){
				//取得成功
				if(G_psnObj.newsData.article_list){
					if(/E|F|G/.test(G_psnObj.patternId) && G_psnObj.newsFlg === '1'){
						//6JSONから 3件抽出
						var topRankArticle = aList.slice(0,3);
						var margeArticle = [].concat(topRankArticle, G_psnObj.newsData.article_list);

						//重複除外
						var newArticle = [];
						var dupeObj = []; //重複確認用
						for(var i=0,len=margeArticle.length; i<len; i++){
							if(dupeObj.indexOf(decodeURIComponent(margeArticle[i].a_url)) === -1){
								dupeObj.push(decodeURIComponent(margeArticle[i].a_url));
								newArticle.push(margeArticle[i]);
							}
						}
						aList = newArticle;
					}else{
						aList = G_psnObj.newsData.article_list;
					}

					if(G_psnObj.number){
						var psnNum = Number(G_psnObj.number);
						if(psnNum >= 5 && psnNum <= 25){
							aLen = psnNum > aList.length ? aList.length : psnNum;
						}else{
							errNewsNum();
						}
					}else{
						errNewsNum();
					}

					function errNewsNum() {
						aLen = 14 > aList.length ? aList.length : 14;
					}
				}
				makeArticle(aList, aLen);
			}else if(G_psnObj.loadFlg === 'fail'){
				//データ取得失敗
				failNewsTopics();
			}else{
				psnCounter++;
				if(psnCounter < 9){
					setTimeout(newsTabPsn, 300);
				}else{
					//データ取得失敗
					failNewsTopics();
				}
			}
		}());

		//データ取得エラー
		function failNewsTopics(){
			dataLayer.push({
				'event': 'dweb_dmenu_error',
				"dweb_dmenu_error_corner": G_psnObj.patternId + (G_psnObj.newsFlg ? '_' + G_psnObj.changeNewsFlg() : '')
			});
			makeArticle(aList, aLen);
		}
	}else{
		makeArticle(aList, aLen);
		return;
	}

	function makeArticle(data, dataLen){
		var maxLen = 10; // ニュースタブ以外の最大表示件数 10件
		for(var i = 0; i < dataLen; i++){
			if(elSlide.id !== 'nc_topics' && i === maxLen){
				break;
			}
			tmpHTML += makeList((i+1), data[i], checkPoint);
		}
		tmpHTML += '</ul>';
		tmpHTML += makeButton();
		tmpHTML += '</div>';
		//コンテンツの追加・データの削除
		$box.append(tmpHTML).addClass('is_maked').removeData();

		var adCount = 1;
		(function delayAddAD_ab(){
			var tmpData = adData.shift();
			if(tmpData.position !== 0) {
				$('#'+ cData.id + ' ul li').eq(tmpData.position - adCount++).after(tmpData.tag);
			} else {
				$('#'+ cData.id + ' ul').prepend(tmpData.tag);
				adCount++
			}
			if(!adData.length) return;
			setTimeout(delayAddAD_ab, 800);
		}());
	}

	//ニュースリスト
	function makeList(newsNum, itemData, checkPoint){
		var lbl = '', thmb = '', ipna = '', tlbl = '';
		var checkPointSrc = checkPoint.callData(false);
		//サムネイル画像 表示有無
		if( cData.thumbFlg == '1'){
			if(itemData.a_thumbnail){
				thmb = '<div class="vList_link_inner nws_thumb-2 f_h-l_c-v-h"><img src="'+ itemData.a_thumbnail +'"></div>';
			}else{
				thmb = '<div class="vList_link_inner nws_thumb-2 f_h-l_c-v-h"><span class="thmb_54-54 nws_thumb-def nws_thumb-def-'+ ((thumbCnt++)%3+1) +'"></span></div>';
			}
		}
		if(itemData.a_ip_name){
			ipna = '<div class="nws_tlbl mg-t-2">'+ itemData.a_ip_name +'</div>';
		}
		//日付
		if(itemData.a_date){
			var dateArray = ['日','月','火','水','木','金','土'],
				timeDate = new Date(itemData.a_date.replace(/-/g,'/')),
				strDate = (timeDate.getMonth() + 1) +'/'+ 
					('0' + timeDate.getDate()).replace(/^0+/, '') + 
					'('+ (dateArray[timeDate.getDay()]) +') '+ timeDate.getHours() 
					+ ':' + ('0' + timeDate.getMinutes()).slice(-2);
				tlbl = '<div class="nws_tlbl mg-t-2">'+ strDate +'</div>';
		}
		//NEW
		if(itemData.a_new_flg == '1'){ lbl = '<div class="lbl nws_lbl-new">NEW</div>'; }

		var idNum = ('0' + newsNum).slice(-2);
		var url = itemData.hasOwnProperty('a_ip_name') ? itemData.a_url : decodeURIComponent(itemData.a_url);
		if (elSlide.id === 'nc_topics') {
			function changeComma(num) {return String(num).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');}
			var newsViewNam = itemData.a_views,
				strNam = Math.round(newsViewNam / 10000),
				resultView='', hotFlag='', cidHotFlg = '';
			if (strNam === 0) {//四捨五入で一万未満の場合
				hotFlag = '';	cidHotFlg = '';
			} else {//四捨五入で一万以上の場合
				//NEW
				lbl = (itemData.a_new_flg == '1') ? '<div class="lbl nws_lbl-new">NEW</div>' : '';
				//アイコン表示
				if(itemData.a_hot_flg == '1'){
					hotFlag += '<div class="nws_tlbl nws_tp_icon_wrp f_h-l_c-v"><div class="nws_tp_arrow nws_tp_icon"></div>';
					cidHotFlg = '-s';
				} else if(itemData.a_hot_flg == '0'){
					hotFlag += '<div class="nws_tlbl nws_tp_icon_wrp f_h-l_c-v"><div class="nws_tp_pict nws_tp_icon"></div>';
					cidHotFlg = '-p';
				}
				if (strNam >= 10000) { //一億以上
					var viewStrNam = Math.floor(String(strNam)/10000);
					resultView = changeComma(viewStrNam);
					tlbl = '<div class="mg-t-2">'+ resultView +'億人が閲覧</div></div>' + '<div class="nws_tlbl mg-t-2">' + strDate + '</div>';
				} else { //一億未満で一万以上の場合
					resultView = changeComma(strNam);
					tlbl = '<div class="mg-t-2">'+ resultView +'万人が閲覧</div></div>' + '<div class="nws_tlbl mg-t-2">' + strDate + '</div>';
				}
			}
			var resHtml = '<li class="vList_item' + checkPointSrc.className + '"' + checkPointSrc.attr + '><a class="vList_link f_h-l_c-v nws_list_item" data-link-id="'+ cData.cntID.aclID + cidHotFlg +'" data-portalarea="'+ 'top-' + cData.cntID.aclID + '_' + idNum + cidHotFlg +'" href="' + url + COM_URL.param01 + cData.cntID.aclName + COM_URL.param02 + newsNum + '">'+ thmb +
				'<div class="vList_link_inner f_item-fit"><h2 class="item_ttl maxRow-4">'+ itemData.a_title + '</h2><div class="thumb_news_info_18 mg-t-2 f_h-l_c-v">' + hotFlag + ipna + tlbl + lbl +'</div></div></a></li>';
		} else {
			var resHtml = '<li class="vList_item' + checkPointSrc.className + '"' + checkPointSrc.attr + '><a class="vList_link f_h-l_c-v nws_list_item" data-link-id="'+ cData.cntID.aclID +'" data-portalarea="'+ 'top-' + cData.cntID.aclID + '_' + idNum +'" href="'
					+ url + COM_URL.param01 + cData.cntID.aclName + COM_URL.param02 + newsNum
					+ '">'+ thmb +'<div class="vList_link_inner f_item-fit"><h2 class="item_ttl maxRow-4">'+ itemData.a_title + '</h2><div class="thumb_news_info_18 mg-t-2 f_h-l_c-v">'+ ipna + tlbl + lbl +'</div></div></a></li>';
		}
		return resHtml;
	}

	//ボタン
	function makeButton(){
		var bLen = cData.btnName.length,
		resHtml = '<p class="f_h-l areaLinkBtn is_hide border-t">';

		for(var j = 0; j < bLen; j++){
			var myPath = cData.urlStr.path[j],
				myParam = cData.urlStr.param[j],
				myName = cData.btnName[j],
				myBtn = cData.cntID.btnID[j];
			resHtml += '<a class="btn f_item-fit f_h-l_c-v-h" data-link-id="'
					 + myBtn  +'" data-portalarea="'
					 + 'top-' + myBtn +'" href="'
					 + COM_URL.path + myPath + COM_URL.param01 + myParam
					 +'"><span class="btn_inner">'+ myName +'</span></a>';
		}
		resHtml += '</p>';
		return resHtml;
	}

	// 広告
	function makeAd(){
		var adKeyNum = {'nc_topics':'42ba6ab2qH3k', 'nc_social':'dbb33b08yDlH', 'nc_poli_econ':'acb40b9e86eQ', 'nc_entme':'32d09e3dBJIR', 'nc_sports':'45d7aeabIZRO', 'nc_world':'baa5a0b9l8qt'};
		var adKeyDec = adKeyNum[cData.id];
		var adPos = (cData.id == 'nc_topics' ? parseInt(NEWS_INFO_DATA.ad_position) : parseInt(OTHER_NEWS_DATA.ad_position));

		return makeAllox();

		//Allox
		function makeAllox(){
			var result = [];
			var adTmp = '';
			var paramLotFlg = false;
			var alloxAdArea = '<div class="portal_adarea" data-portaladsystem="allox" data-portaladid="' + adKeyDec + '">';
			var alloxAdAreaEnd = '</div>';

			if(cData.id === 'nc_topics'){
				var lotNumber = Math.floor(Math.random() * 100) + 1;
				var urlParam = location.search;
				if(urlParam !== ''){
					var splitUrlParam = urlParam.substring(1).split('&');
					for(var i = 0; i < splitUrlParam.length; i++){
						var param = splitUrlParam[i].split("=");
						var key = param[0];
						if(key === 'ad_gam_rate'){
							var value = param[1];
							if(value !== null && value !=='' && 0 <= Number(value) && Number(value) <= 100){
								var paramAgrNum = Math.floor(value);
								paramLotFlg = true;
								if(lotNumber <= paramAgrNum){
									adKeyDec = 'c7b63839SiTI';
									alloxAdArea = '';
									alloxAdAreaEnd = '';
								}
								break;
							}
						}
					}
				}
				if(adKeyDec !== 'c7b63839SiTI' && paramLotFlg === false){
					var dataAgr = NEWS_INFO_DATA.ad_gam_rate;
					var dataAgrNum = Math.floor(dataAgr);
					if(dataAgrNum < 0 || 100 < Number(dataAgr) || isNaN(dataAgrNum)){
						dataAgrNum = 0;
					}
					if(lotNumber <= dataAgrNum){
						adKeyDec = 'c7b63839SiTI';
						alloxAdArea = '';
						alloxAdAreaEnd = '';
					}
				}
			}
			adTmp = '<li class="adDataStyle" style="margin:0 -8px">' + alloxAdArea + '<div data-allox-placement="' + adKeyDec + '"></div><s'+'cript async="async" '+'src="//alxc.addlv.smt.docomo.ne.jp/p/' + adKeyDec + '.js"></s'+'cript>' + alloxAdAreaEnd + '</li>';
			result.push({position: adPos-1, tag: adTmp});
			return result;
		}
	}
}

function setFlick(){
	var elSlides = Array.prototype.slice.call(document.querySelectorAll('.genrSlide_item')),
		elDefSlide = document.getElementById(GENRE_DATA.curGenre),
		elTabWrp = document.querySelector('.genrTab_wrp'),
		changeBeforeTabName = '';
	if(elDefSlide === null) elDefSlide = document.getElementById('g_news');

	//フリックの設置
	GENRE_AREA = new dFlick({
		container: 'GenreWrp',
		name: 'genre',
		flick: true,
		defaultIndex: elSlides.indexOf(elDefSlide),
		pointerOff: false,
		//コールバック
		initAfter: function(index, slide){
			GENRE_DATA.getCurTab(slide.id, slide);
			callGenreData(slide.id);
			setCurrentTab(slide.id);
		},
		changeBefore: function(index, slide){
			changeBeforeTabName = this.currentSlide().id;
			$('#HedSch .sch_suggest').removeClass('is-show'); //タブ移動時サジェストを非表示
			if(slide.classList.contains('is_maked')) return;
			GENRE_DATA.getCurTab(slide.id, slide);
			callGenreData(slide.id);
		},
		changeAfter: function(index, slide){
			setCurrentTab(slide.id);
			setTimeout(pointBaloon, 500);
			cookieSave(GENRE_DATA.saveName, slide.id, '5m');//保存
			pointHookMissionAccomplished(slide);
		},
		clickChangeAfter: function(index, slide, preIndex, preSlide){
			GENRE_DATA.setDefTab(slide, preSlide);
			pushTabGA({tabType:'outer', action:'click', outer:slide.id, inner:slide.dataset.ga, preOuter:preSlide.id, preInner:preSlide.dataset.ga});
		},
		flickChangeAfter: function(index, slide, preIndex, preSlide){
			GENRE_DATA.setDefTab(slide, preSlide);
			pushTabGA({tabType:'outer', action:'flick', outer:slide.id, inner:slide.dataset.ga, preOuter:preSlide.id, preInner:preSlide.dataset.ga});
		}
	});

	//ポイントフック施策
	function pointHookMissionAccomplished(slide){
		var missionType = pointHook.checkMissionType();
		if(missionType === '+tab' || missionType === '+sports'){
			var pointHookStatus = pointHook.checkStatus();
			if(pointHookStatus < 2){
				var missionFlg = pointHookStatus === 0;
				if(missionType === '+tab' && changeBeforeTabName === 'g_news'){
					if(missionFlg){
						pointHook.sendMissionApi(
							'https://service.smt.docomo.ne.jp/dmpf/reward/mission/rmn/missionAccept/index.do',
							{
								requestKind: '2',
								inputData: {
									param:[{
										mediaId: '01',
										serviceId: 'a2',
										cid: 'api01',
										operateList: [pointHook.missionOperateKind]
									}]
								}
							}
						).then(function(data){
							if(data && data.achievedMissionIdList){
								pointHook.missionStatus = 1;
								pointHook.pointHookSetLS('modal_id', pointHook.segment.data.id);
								if($('#PtHook_OverLay_Banner').hasClass('is_hide')){
									pointHook.setMissionOverlayBanner();
									$(window).off('scroll', pointHook.missionModalScrollEvent);
								}else{
									if($('#Pthook_Img').length) pointHook.changeOverLayBanner();
								}
							}
						});
					}
				}
				//モーダル発火
				if(slide.id === 'g_news'){
					if(missionFlg && !pointHook.checkLsModalId()){
						pointHook.setMissionModal();
					}
				}
			}
		}
	}

	//クラスの付け替え
	function setCurrentTab(slideId){
		elTabWrp.className = elTabWrp.className.replace(/\bis_g_\w+\b/g, '');
		elTabWrp.classList.add('is_' + slideId);
	}

	//読了率 ※スクロール終了時に計測
	var readTimer,
		checkRead = function(winY, winH, slide){
			var list = slide.querySelectorAll('.ck_point'),
				len = list.length;
			if(!len) return;
			for(var i = 0; i < len; i++){
				var t = list[i].getBoundingClientRect().top;
				if(t < winH){
					var tabId = slide.dataset.ckpoint,
						secId = list[i].dataset.ckpoint;
					if(tabId =='Region' || tabId == 'Region2'){
						tabId += (tabId == 'Region' ? '_' + G_regionSet.region1.cityCode : '_' + G_regionSet.region2.cityCode);
					}
					//GA4
					dataLayer.push({
						'event':'DWEB_view', 
						'DWEB_view_tab_id': tabId,
						'DWEB_view_checkpoint_id': secId
					});

					list[i].classList.remove('ck_point');
				}
			}
		};
	GENRE_AREA.scrolled = function(winY, winH, slide){
		if(readTimer) clearTimeout(readTimer);
		readTimer = setTimeout(checkRead , 200, winY, winH, slide);
	};

	//ajax
	function callGenreData(targetId){
		var path = '/dmenu/data/'+ GENRE_DATA.items[targetId].name;

		$.ajax(path, {
			type:'get',
			timeout:60000,//1分
			dataType:'html',
			cache: false
		})
		.done(function(data){
			if(!data || data == ''){
				writeErr();
			}else{
				$(GENRE_AREA.findSlide('#'+ targetId)).empty()
				.append(data).addClass('is_maked');
				//入稿タブの時
				if(GENRE_DATA.items[targetId].inner.hasOwnProperty('setPostId')){
					var postTabKey = GENRE_DATA.items[targetId].inner['setPostId'];
					var postInfo = G_postInfo.post_tab.tab_info[postTabKey];
					setPostFun(targetId, postInfo);
				}
				G_abTest.callSimpleAB(targetId, 14);// 簡易ABテスト
			}
		})
		.fail(writeErr)
		.always(function(){
			//none
		});
		//エラー処理
		function writeErr(){
			var btnId = 'GenreErr_'+ targetId,
				errHtml = '<div class="loadErr_box"><p>読み込み中にエラーが発生しました。<br>しばらくしてから、もう一度お試しください。</p>'
						+ '<p><a id="'+ btnId +'" class="loadErr_btn" href="#GenrHed" data-target="'+ targetId +'">再度読み込む</a></p></div>';

			GENRE_AREA.findSlide('#'+ targetId).innerHTML = errHtml;
			$('#'+ btnId).one('click', function(){
				var target = this.dataset.target;
				callGenreData(target);
				GENRE_AREA.scrollTo(GENRE_AREA.getTabPos());//移動
				return false;
			});
		}
	};
}//タブ設定

/* --------------------------------
  フリック画像（初回アクセス時かつ画面スクロール停止後1回のみ表示）
------------------------------------*/
$(function(){
	if(!LOCAL_ST.connect()){ return; } //接続確認

	// 初回アクセス時1、2回目以降2をlocalStorageに格納
	var flick_status = LOCAL_ST.get('smt_t_flickpict');
	switch (flick_status) {
		case '1':
			flick_status = '2';
			LOCAL_ST.set('smt_t_flickpict',flick_status);
			break;
		case '2':
			break;
		default:
			flick_status = '1';
			LOCAL_ST.set('smt_t_flickpict',flick_status);
			break;
	};
	if (flick_status === '2') return;

	var moveFlick = false; //スクロール中のアニメーション停止防止
	var $flickSt = $('.flick_style');

	$(window).on('load, scroll', function(){
		var upTabHeight = $('.wrp-alert').height() + $('#WrpAd').height() + $('.hed-wrp').height();
		var showFlickHeight = upTabHeight - ($(window).height() * 0.1);
		var winPos = window.pageYOffset;

		// 画面スクロール停止後に、フリック画像を表示
		if($flickSt.hasClass('flick_hide')) return false;

		if(winPos > showFlickHeight){
			if (moveFlick) return;
			$flickSt.stop().animate({opacity: 1}, 200, function(){
				moveFlick = true;
				var slideLeftPos = ($(window).width() / 2) + ($flickSt.width() / 2);
				var returnLeftPos = $(window).width() / 2;

				setTimeout(function(){
					$flickSt.css('display', 'block');
					$flickSt.stop().animate({left: slideLeftPos}, 900, function(){
						$flickSt.stop().animate({left: slideLeftPos}, 500, function(){

							$flickSt.stop().animate({left: returnLeftPos}, 900, function(){
								$flickSt.stop().animate({opacity: 0}, 300);
								$flickSt.addClass('flick_hide');
								moveFlick = false;
							});
						});
					});
				}, 500);
			});
		} else {
			$flickSt.stop().animate({opacity: 0}, 200);
		}
	});
});
/* --------------------------------
  特設リンクバナー生成
------------------------------------*/
function spMakeBunner(data,id,prefix){
	var IMG_PATH = '/dmenu/hottopics/img/';
	var tmpHtml = '', dataLen = data.length;
	if(Object.keys(data).length === 0){
		$(id).remove();
		return;
	}
	var data1 = [], data2 = [];
	for(var i= 0; i < dataLen; i++){
		if(data[i]['position'] === "1"){
			data1.push(data[i]);
		} else {
			data2.push(data[i]);
		}
	}
	var data1Len = data1.length, data2Len = data2.length;
	var data3 = [];
	if(data1Len != 0){
		data1 = MAKE_CTS.sortAry(data1,'id');
		data3.push(data1[data1Len - 1]);
	}
	if(data2Len != 0) data3.push(data2[Math.floor(Math.random() * data2Len)]);
	var data3Len = data3.length;
	tmpHtml += '<div class="banner-wrp">';
	for(var i= 0; i < data3Len; i++){
		tmpHtml += '<a class="thumb_mw-400" style="margin:10px auto;" data-link-id="'
				+ prefix + ('0'+(i+1)).slice(-2) + '_' + data3[i].id + '" data-portalarea="'
				+ "top-" + prefix + ('0'+(i+1)).slice(-2) + '" href="'
				+ data3[i].url + '"><h3 class="item_ttl">' + data3[i].txt + '</h3><img class="lazyload" data-src="'
				+ IMG_PATH + data3[i].img + '?' + NOW_DATE + '" /></a>';
	}
	tmpHtml += '</div>';
	$(id).html(tmpHtml);
}

/* --------------------------------
    SDレコメンド生成
------------------------------------*/
function callSDRecommend(id,setting){
	this.id = id;
	this.callBack = setting.callBack || function(){};
	this.ngFunction = setting.ngFunction || function(){};
	this.params = setting.params;
	this.className = setting.className;
	this.classIcon = setting.classIcon;
	this.insertId = setting.insertId;
	this.loadError = setting.loadError || function(){};
	this.torutsumeFlg = typeof setting.torutsumeFlg === "boolean" ? setting.torutsumeFlg : false;
	this.optOutFlg = false;
	this.acordionItems = {};
	this.userRecoFlg = setting.userRecoFlg;

	/**
	 * request
	 */
	var self = this;

	if(self.userRecoFlg) {
		if(G_userRecoData && G_userRecoData.common.result_code === '0000') {
			var e = self.ResJsonParse(JSON.stringify(G_userRecoData.data));
		}else{
			return self.ngFunction(self.id);
		}
	}else{
		this.RequestParam().then(function(data){
			//response
			var e = self.ResJsonParse(data);
			if(e === null) { return self.ngFunction(self.id); }
			if(self.className === 'sendRecoCoupon'){
				if(self.insertId === 'Coupon_rcmd'){
					for(var i=0,len=self.id.length; i<len; i++){
						$(self.id[i] + ' .' + self.className).on('click',function(){
							self._onRequestClickData(this);
						});
					}
				}else{
					$('#' + self.insertId + ' .' + self.className).on('click',function(){
						self._onRequestClickData(this);
					});
				}
			}else{
				$('.' + self.className).on('click',function(){
					self._onRequestClickData(this);
				});
			}
			self.RequestDispItemView(self.id,self.className);
		});
	}
}

callSDRecommend.prototype = {
	RequestParam : function(){
		return recReqAccept(1,JSON.stringify({
			"param" : this.params
		}), false);
	},
	ResJsonParse : function(data){
		var o = JSON.parse(data);
		if(o.status !== 'ok') {
			if(this.torutsumeFlg) {
				$(this.id).parents().eq(0).hide();
				$(this.classIcon).hide();
			}
			if(this.insertId) { this.loadError(this.insertId, this.params[0].number); }
			return null;
		}
		this.callBack(o);
		this.recResId = o.items[0].recommendResponseId;
		return this;
	},
	RequestDispItemView : function(container,className){
		var self = this;
		if(typeof container === 'string'){ //インスタンス生成時にIDの引数が1件、追加で設定されたコンテンツ（PSNエリア+d、ヘッダー広告）
			if(className === 'sendRecoCoupon'){
				container = ('#' + self.insertId + ' .observe_list');
				$(container).dmenuFnc('observeShow', function(element, event){
					self.inviewAjax(element.parentElement,className,undefined,element);
				});
			}else{
				$(container).dmenuFnc('observeShow', function(element, event){
					self.inviewAjax(element,className);
				});
			}
		}else{ //インスタンス生成時にIDの引数が複数（配列）
			var len = container.length;
			var divFlg = false;
			var _className = className;
			while(len--){
				if(className === 'sendRecoCoupon' || className === 'sendRecoAnimal' || className === 'sendRecoGourmet'){
					if((/Coupon_rcmd_list/g).test(container[len]) || (/Animal_News/g).test(container[len]) || (/Gourmet_News_list/g).test(container[len])){
						$('#' + self.insertId + ' .observe_list').dmenuFnc('observeShow', function(element, event){
							self.inviewAjax(element.parentElement,_className,undefined,element);
						});
					}else{
						$(container[len]).dmenuFnc('observeShow', function(element, event){
							self.inviewAjax(element,_className);
						});
					};
				}else{
					$(container[len]).dmenuFnc('observeShow', function(element, event){
						if((/Region(2)?_(Coupon|Campaign|Dpointshop)_List/g).test(element.id)){
							self.inviewAjaxAccordion(element,className);
							return;
						}
						if(element.tagName.toLowerCase() === 'div'){
							divFlg = true;
							self.inviewAjax(element,_className,divFlg);
						}else{
							self.inviewAjax(element,_className);
						}
					});
				}
			}
		}
	},
	inviewAjax : function(element,className,divFlg,observeItem){
		var self = this;
		var len = element.childElementCount;
		if(!len) return;

		var frameidAry = this.makeFrameidArray(element, className, len);
		var cnt = 0;
		if((className === 'sendRecoCoupon' && !(/Coupon_Gift/g).test(element.id)) || className === 'sendRecoAnimal') {
			cnt = $(observeItem).index() || 0;
			len = cnt + 2;
		}
		if(className === 'sendRecoGourmet') {
			cnt = $(observeItem).index() || 0;
			len = cnt + 1;
		}
		for(var j = 0; j < frameidAry.length; j++){
			var target, targetList, targetObj;
			var dispItemParam = '[';
			for(var k = cnt; k < len; k++){
				targetList = element.children[k];
				if(!targetList || divFlg && targetList.tagName.toLowerCase() === 'a') continue;

				target = targetList.getElementsByClassName(className)[0];
				if(!target) continue;

				targetObj = target.dataset;
				if(frameidAry[j] !== targetObj.frameid) continue;

				dispItemParam += '{' +
					'"recommendOrder":' + targetObj.recommendorder + ',' +
					'"measureId":"' + targetObj.measureid + '",' +
					'"timerId":"' + targetObj.timerid + '",' +
					'"mediaId":"' + targetObj.mediaid + '",' +
					'"serviceId":"' + targetObj.serviceid + '",' +
					'"cid":"' + targetObj.cid + '",' +
					'"recommendMethodId":"' + targetObj.recommendmethodid +
					'"},';
				targetList.children[0].classList.remove(className);
			}
			dispItemParam = dispItemParam.slice(0,-1);
			dispItemParam += ']';

			this.sendRecoAjax(targetObj,dispItemParam,frameidAry[j]);
		}
	},
	inviewAjaxAccordion : function(element,className){
		var self = this;
		var len = element.childElementCount;
		if(!len) return;

		var frameidAry = self.makeFrameidArray(element, className, len);
		for(var i = 0; i < frameidAry.length; i++){
			var target, targetList, targetObj, param = '';
			var dispItemParam = '[', dispItemParamLatter = '[';
			for(var j = 0; j < len; j++){
				targetList = element.children[j];

				target = targetList.getElementsByClassName(className)[0];
				if(!target) continue;

				targetObj = target.dataset;
				if(frameidAry[i] !== targetObj.frameid) continue;

				param = '{' +
						'"recommendOrder":' + targetObj.recommendorder + ',' +
						'"measureId":"' + targetObj.measureid + '",' +
						'"timerId":"' + targetObj.timerid + '",' +
						'"mediaId":"' + targetObj.mediaid + '",' +
						'"serviceId":"' + targetObj.serviceid + '",' +
						'"cid":"' + targetObj.cid + '",' +
						'"recommendMethodId":"' + targetObj.recommendmethodid +
						'"},';
				if(!targetList.classList.contains('reco_latter')){
					dispItemParam += param;
				}else{
					dispItemParamLatter += param;
				}
				targetList.children[0].classList.remove(className);
			}
			dispItemParam = dispItemParam.slice(0,-1);
			dispItemParam += ']';
			dispItemParamLatter = dispItemParamLatter.slice(0,-1);
			dispItemParamLatter += ']';

			self.sendRecoAjax(targetObj,dispItemParam,frameidAry[i]);
			self.acordionItems[element.id] = [targetObj, dispItemParamLatter, frameidAry[i]];
		}
		if(!frameidAry.length) return;
		var container = '#' + element.parentElement.id; // 地域タブの処理
		$(container + ' .reco_latter_btn').on('click', function(){
			if(className === 'sendRecoRegion' || className === 'sendRecoRegion2'){
				// 地域タブの処理
				var items = self.acordionItems[this.parentElement.id + '_List'];
				self.sendRecoAjax(items[0], items[1], items[2]);
			}

			// 同タブ内に複数アコーディオンがない場合
			// for(var k = 0; k < frameidAry.length; k++){
			// 	if(targetObj.frameid === frameidAry[k]){
			// 		self.sendRecoAjax(targetObj,dispItemParamLatter,frameidAry[k]);
			// 	}
			// }
		});
	},
	makeFrameidArray : function(element,className,length){
		var targetData, array = [];
		for(var i = 0; i < length; i++){
			targetData = element.children[i].getElementsByClassName(className)[0];
			if(!targetData) continue;
			array.push(targetData.dataset.frameid);
		}
		//重複を除く配列生成
		if(array.length >= 2){
			var exist = {}, result = [];
			for(var i in array){
				var str = array[i];
				if(!exist[str]){
					exist[str] = true;
					result.push(str);
				}
			}
			array = result;
			return array;
		}
		return array;
	},
	sendRecoAjax : function(tarObj,param,frameid){
		var sendUrl = 'https://smt.docomo.ne.jp/dmpf/tagereco/owdrmd/recommendAccept/index.do';
		var sendData = {
			"params": '{ "requestKind": 7, "inputData": { "param": [ {'+
			'"start":'+ tarObj.start +','+
			'"frameId":"'+ frameid +'",'+
			'"groupId":'+ tarObj.groupid +','+
			'"visibleItems":' + param + '} ] } }',
			"recommendResponseId": this.recResId
		};
		return  $.ajax({
			url: sendUrl,
			type: 'GET',
			data: sendData,
			dataType: 'jsonp',
			cache: false,
			timeout: 60000,
		}).done(function (json, xhr, status) {
			console.log(json);
		}).fail(function (xhr, status, errorThrown) {
			console.log("fail");
		});
	},
	_onRequestClickData : function(obj){
		var data = $(obj).data();
		var sendData = {
			"param" : [
				{
					"recommendOrder" :data.recommendorder,
					"measureId" : data.measureid,
					"timerId" : data.timerid,
					"mediaId" : data.mediaid,
					"serviceId" : data.serviceid,
					"cid" : data.cid,
					"frameId" : data.frameid,
					"operateKind" : "301",
					"groupId" : data.groupid,
					"recommendMethodId" : data.recommendmethodid,
					"optOutUserFlg" : data.optoutuserflg
				}
			],
			"recommendResponseId" : this.recResId
		};
		return recReqAccept(3, JSON.stringify(sendData));
	}
}
/* --------------------------------
吹き出し、告知リンク
------------------------------------*/
var closeBalloon = function(){},
	pointBaloon = function(){};
function setBalloon(tabArr){
	var data = COMMON_CONTENTS;
	var IMG_PATH = '/dmenu/hottopics/img/';
	var balloonStr = LOCAL_ST.get('smt_t_balloon'),
		balloonObj = balloonStr ? JSON.parse(balloonStr) : null,
		history = balloonObj&&balloonObj.history?balloonObj.history:[];
	if(balloonObj&&balloonObj.balloon1_id) history = historyShift(balloonObj,history,"1");
	if(balloonObj&&balloonObj.balloon2_id) history = historyShift(balloonObj,history,"2");
	/*吹き出しの処理*/
	if(data.common.hasOwnProperty("balloon2") && data.common.balloon2.length > 0){
		var balloon2 = fixBalloonData(data.common.balloon2);
		var tap, article, date = NOW_DATE + NOW_D;
		// 同日処理：true, 別日処理またはLS無し：false
		if(balloonObj) {
			tap = balloonObj.date === date ? balloonObj.num : 0;
			article = tap < 5 ? getArticle(balloon2, history) : false;
		} else {
			tap = 0;
			article = getArticle(balloon2, history);
		}
		if(article) { makeBalloon(article, tap, tabArr); }
	}
	$('.genrTab_mask').on('scroll', function(){
		pointBaloon();
	});
	
	// タップ履歴
	function historyShift(obj,data,num) {
		if(5<=data.length) data.pop();
		if(num === "2") {
			data.unshift(obj.balloon2_id);
			obj.balloon2_id = '';
			
		}else {
			data.unshift(obj.balloon1_id);
			obj.balloon1_id = '';
		}
		var values = {
			"date": obj.date,
			"num": obj.num,
			"history": data
		};
		LOCAL_ST.set("smt_t_balloon", JSON.stringify(values));
		return data;
	}

	// 存在しないタブの記事除外
	function fixBalloonData(data) {
		var ary = [];
		for(var i=0; i<data.length; i++) {
			if((Object.keys(GENRE_DATA.items).indexOf(data[i].tab) > -1) && (document.getElementById(data[i].tab))) {
				ary.push(data[i]);
			}
		}
		return ary;
	}

	// 新着記事取得
	function getArticle(data, history) {
		data.sort(function(a, b) { // 昇順並び替え
			if(a.id > b.id){
				return 1;
			}else{
				return -1;
			}
		});	
		// 第1吹き出し記事IDチェック
		var article = checkBalloonId(data, "1", history);
		if(article) {
			return article;
		} else {
			// 第2吹き出し記事IDチェック
			return checkBalloonId(data, "2", history);
		}
	}

	// 吹き出しIDチェック
	function checkBalloonId(data, order, history) {
		for(var i = 0; i < data.length; i++) {
			var matchOrder = data[i].order === order;
			var matchId = checkBalloonHistory(data[i].id,history);
			if(matchOrder && !matchId) { return data[i]; }
		}
		return false;
	}

	// タップ履歴確認
	function checkBalloonHistory(id,history) {
		for(var i = 0; i < history.length; i++) {
			if(history[i] === id) return true;
		}
		return false;
	}

	//吹き出し生成
	function makeBalloon(data, tap, tabArr){
		var targetTab = data.tab,
			$balloon = $('#Balloon'),imgHtml,algnClass;
		// 地域タブが2つ設定されていた場合
		if(targetTab === 'g_region' && document.getElementById('g_region2')){
			for(var i=0, len=tabArr.length; i<len; i++){
				if(/^Region$|^Region2$/.test(tabArr[i])){
					targetTab = 'g_'+ tabArr[i].toLowerCase();
					break;
				}
			}
		}
		if(data.img === ""){
			imgHtml = '';
			algnClass = 'balloon_center';
		}else{
			imgHtml = '<img src="'+ IMG_PATH + data.img + '?' + NOW_DATE +'">';
			algnClass = '';
		}

		var tmpHtml = '<div class="balloon"><a class="balloon_inner f_h-l_c-v" href="javascript:void(0);">'+ imgHtml +'<p class="balloon_txt '+ algnClass +' maxRow-1">'+ data.txt +'</p></a><span class="balloon_triangle"></span></div>';

		//閉じる処理
		closeBalloon = function(moveFlg, effectFlg){
			var _$balloon = $('#Balloon');
			if(!_$balloon.hasClass('is_showBalloon')) return;

			var target = _$balloon.data('target');
			_$balloon.slideUp((effectFlg ? 300: 0), function(){
				_$balloon.remove();
				if(moveFlg){//タブの変更
					var index = GENRE_AREA.findIndex('#'+ targetTab),
						corner = data.corner,
						res = GENRE_AREA.moveSlide(index, {
							scrollOff: false,
							pos: GENRE_AREA.getTabPos(),
							speed: 0
						});
					if(corner) {
						setTimeout(function(){
							if(!$('#'+ corner).offset()) {
								; // 何もしない
							} else {
								var $pos = $('#'+ corner).offset().top - 50;
								GENRE_AREA.scrollTo($pos);
							}
						}, 2000);
					}
					GENRE_DATA.setDefTab(res.slide, res.preSlide);
					pushTabGA({tabType:'outer', action:'balloon', outer:res.slide.id, inner:res.slide.dataset.ga , preOuter:res.preSlide.id, preInner:res.preSlide.dataset.ga, txt:data.txt});
				}
			}).removeClass('is_showBalloon');

			history.unshift(data.id);
			if(5 < history.length) history.pop();

			var values = {
				"date": date,
				"num": ++tap,
				"history": history
			};
			LOCAL_ST.set("smt_t_balloon", JSON.stringify(values));

			$(window).off('.balloon');
			closeBalloon = function(){};
		};

		//吹き出し口移動
		pointBaloon = function(){
			var _$balloon = $('#Balloon');
			if(!_$balloon.length) return;
			var targetId = _$balloon.data('target'),
				targetIndex = GENRE_AREA.findIndex('#'+targetId),
				tab  = document.querySelectorAll('.genrTab_item')[targetIndex],
				genreWrpId = document.getElementById('GenreWrp'),
				genreWrpMarginRect = genreWrpId ? genreWrpId.getBoundingClientRect() : { left: 0, width: 0 },
				genreWrpMarginLeft = genreWrpMarginRect.left,
				genreWrpMarginWidth = genreWrpMarginRect.width,
				rect = tab.getBoundingClientRect(),
				left = (rect.left + (rect.width / 2) - 10) - genreWrpMarginLeft,
				leftFlg = 12 > left,
				rightFlg = (genreWrpMarginWidth - 33) < left;

			$balloon.toggleClass('balloon-point-left', leftFlg).toggleClass('balloon-point-right', rightFlg)
				.find('.balloon_triangle').css('left', (leftFlg || rightFlg ? '': left + 'px'));
		};

		$balloon
			.attr('data-target', targetTab)
			.attr('data-order', data.order)
			.on('click.balloon', function(e){
				var moveFlg = e.target.id != 'CancelBalloon';
				closeBalloon(moveFlg, !moveFlg);
			})
			.html(tmpHtml);
		pointBaloon();
		$(window).on('resize.balloon', pointBaloon);
		$balloon.slideDown(200).addClass('is_showBalloon');
	}

	/*告知リンク生成の処理*/
	function makeNotice(dataKey, sortFnc, noticeListName){
		var noticeInfo = dataKey;
		var noticeLen = noticeInfo.length;
		var noticeHtmlHeader = '', noticeHtmlFooter = '';
		var headerAry = [], footerAry = [];
		var cIdList = {'notice_list2': '00hs00009', 'notice_ahamo_list': '00hs00008'};

		for(var i=0; i < noticeLen; i++){
			if(noticeInfo[i].head_disp_flg === "1"){headerAry.push(noticeInfo[i]);}
			if(noticeInfo[i].foot_disp_flg === "1"){footerAry.push(noticeInfo[i]);}
		}

		if(headerAry){	//ヘッダー告知データあり
			var headerAryLen = headerAry.length;
			if(headerAryLen >= 2){headerAry = sortFnc(headerAry);}
			for(var i=0; i < headerAryLen; i++){
				var cId = cIdList[noticeListName] + (i + 10).toString(36).toUpperCase();
				noticeHtmlHeader += makeNoticeHtml(headerAry[i],headerAry[i].pattern,cId,'header');
			}
		}
		if(footerAry){	//フッター告知データあり
			var footerAryLen = footerAry.length;
			if(footerAryLen >= 2){footerAry = sortFnc(footerAry);}
			for(var i=0; i < footerAryLen; i++){
				var cId = cIdList[noticeListName] + (i + 2);
				noticeHtmlFooter += makeNoticeHtml(footerAry[i],footerAry[i].pattern,cId,'footer');
			}
		}
		//出力
		if(noticeHtmlHeader) $('.donationBannerHead').append(noticeHtmlHeader);
		if(noticeHtmlFooter) $('.donationBanner').append(noticeHtmlFooter);

		function makeNoticeHtml(noticeInfo,pattern,cId,area){
			var noticeRemove = '';
			var closeBtnFlg = noticeInfo.close_btn_flg;
			closeBtnFlg === '1' ? noticeRemove = '<p class="donation-remove js-btn-remove"><a href="javascript:void(0)">非表示にする</a></p>' : noticeRemove = '';
			var noticeHtml = '';
			var noticeAreaClass = ' js-notice-' + area;
			var ahamoClass = '';
			if(noticeListName === 'notice_ahamo_list') {
				ahamoClass = ' ahamo_on';
				noticeAreaClass += '-ahamo';
			}
			switch(pattern){
				//ラベルあり
				case '1' :
					noticeHtml = '<div id="'+ noticeInfo.id +'" class="js-donation mod-box-main wrp-donation'+ ahamoClass + noticeAreaClass +'"><p class="donation-inner"><a href="'+ noticeInfo.url 
							+'" data-link-id="'+ cId +'_'+ noticeInfo.id +'" data-portalarea="top-'+ cId +'"><span class="donation_lbl" style="color:#FFFFFF;background-color:'
							+ noticeInfo.lbl_bgcolor +';">'+ noticeInfo.lbl_txt +'</span>'+ noticeInfo.txt +'</a></p>'+ noticeRemove +'</div>';
					break;
				//ラベルなし
				case '2' :
					noticeHtml = '<div id="'+ noticeInfo.id +'" class="js-donation mod-box-main wrp-donation'+ ahamoClass + noticeAreaClass +'"><p class="donation-inner"><a href="'+ noticeInfo.url 
							+'" data-link-id="'+ cId +'_'+ noticeInfo.id +'" data-portalarea="top-'+ cId +'">'+ noticeInfo.txt +'</a></p>'+ noticeRemove +'</div>';
					break;
				default :
					break;
			}
			return noticeHtml;
		}
	}

	/*ヘッダー・フッター告知リンクの処理*/
	if(data.common.hasOwnProperty("notice_list2")){
		makeNotice(data.common.notice_list2, MAKE_CTS.sortArySameRank, "notice_list2");
	}
	//告知リンク → ahamo告知リンクの表示順のため順番は変えない。
	if(data.common.hasOwnProperty("notice_ahamo_list")){
		makeNotice(data.common.notice_ahamo_list, MAKE_CTS.sortArySameRank, "notice_ahamo_list");
	}
}//吹き出し、告知リンク

/* --------------------------------
  検索
------------------------------------*/
$(function(){

	//検索イベントセット
	new dSuggest('#HedSch', { //ヘッダ
		hashStr: 'open_search_header',
		scrollBuffer: 0
	});

	//検索窓の表示・非表示切り替え
	if(IOS_FLG ? (OS_VER < 10) : (OS_VER < 6)){
		var searchUnderHTML = '<div id="search_under"><a class="search_btn_under f_h-l_c-v-h" data-link-id="00hs040007" data-portalarea="top-00hs040007" href="https://www.google.com/"><div class="search_icon_under"></div><div class="search_txt_under">Googleで検索する</div></a></div>';

		$('#HedSch,#RiseWord').hide();
		$('#HedBg').addClass('hed_bg_under');
		$('#HedBg').append(searchUnderHTML);
	}
});

// footer検索処理
function footSearchFnc(genreFotSchId){
	//別窓表示
	if(!IOS_FLG){
		$(genreFotSchId).find('.sch_form')[0].target = '_blank';
	}

	//検索イベントセット
	new dSuggest(genreFotSchId, { //フッタ
		hashStr: 'open_search_footer',
		scrollBuffer: 50
	});

	//検索窓の表示・非表示切り替え
	if(IOS_FLG ? (OS_VER < 10) : (OS_VER < 6)){
		$(genreFotSchId).hide();
	}
	//検索窓非表示時
	if($(genreFotSchId).css('display')=='none'){
		$('.fot_sch').css({
			'margin-bottom' : '0'
		});
	}
}

/* --------------------------------
  ハンバーガー
------------------------------------*/
var hbgTimer;//タイムアウト処理用
$(function(){
	var bodyEl = document.body;

	$('#HBG_button').on('click',function(){
		bodyEl.classList.add('is_hbg_open-mode');
		dataLayer.push({'event':'DWEB_click_specialtrack', 'dweb_click_specialtrack_value':'Hamburger_action', 'dweb_click_specialtrack_url':undefined, 'dweb_click_specialtrack_portalarea':'News_HamburgerMenu_open'}); //GA4
		$('.hbg_none').removeClass();
		//dアカウント情報取得
		if(this.classList.contains('is_checkeddpc')) return;
		if(dPC_DB.lgFlg === null) return;
		if(dPC_DB.lgFlg){
			var url = 'https://service.smt.docomo.ne.jp/cgi7m/id/getdaccountinf?callback=dpcAccount&chk_mask_flg=1';
			$('head').append('<s'+'cript src="'+ url +'"></s'+'cript>');
			hbgTimer = setTimeout(dpcAccount, 30000, null);
		}
		this.classList.add('is_checkeddpc');
	});
	$('.hbg_close.hmgMenu').on('click',function(){
		bodyEl.classList.remove('is_hbg_open-mode');
		dataLayer.push({'event':'DWEB_click_specialtrack', 'dweb_click_specialtrack_value':'Hamburger_action', 'dweb_click_specialtrack_url':undefined, 'dweb_click_specialtrack_portalarea':'News_HamburgerMenu_close'}); //GA4
	});

	//お知らせ表示切り替え
	function androidVersion() {
		var use = window.navigator.userAgent;
		if( use.indexOf("Android") > 0 ) {
			var androidv = parseFloat(use.slice(use.indexOf("Android")+8));
			return androidv;
		}
		return 0;
	}
	if(androidVersion() >= 5.1) {
		// リンク表示（Android5.1以上）
		$('#HBG_info').removeClass('is_hide');
	}
});

/*---------------------------------
  +dエリア
-----------------------------------*/
//dPC情報共有用
var dPC_DB = {
	lgFlg: null,
	stgNo: null,
	setFunk: [],
	dispFlg: null
};
var G_loginStatus = false;
var G_missionStatus = 0; //0:未確認,1:対象外,2:対象者
// ログインAPI呼び出し
(function(){
	var url = 'https://cfg.smt.docomo.ne.jp/authx/cgi/idenstatus?callback=dpcLogin&'+ NOW_NO;
	$('head').append('<s'+'cript src="'+ url +'"></s'+'cript>');
}());

// コールバック関数
function dpcLogin(jsonp){
	(function weightHedLoad(){
		var hedEl = document.getElementById('Hed_dPoint');
		if(!hedEl){
			setTimeout(weightHedLoad, 0);
		}else{
			try{
				if(checkStatus()){
					//認証済み
					dPC_DB.lgFlg = true;
					$('#HBG_Loading').css('display', 'block');
					$('#HBG_isLogout').addClass('is_hide');
					var lsData = '';
					if(LOCAL_ST.connect()){
						lsData = LOCAL_ST.get('smt_t_dpoint_hook') ? JSON.parse(LOCAL_ST.get('smt_t_dpoint_hook')) : '';
					}
					//嗜好確認ダイアログ
					if((!PSN_INFO_JSON.dpoint_hook.length)){
						displayPrefDialog();
					}else{
						//ステータスチェック
						var modalCounter = 0;
						(function checkModalStatus(){
							if(G_missionStatus){
								var missionType = pointHook.checkMissionType();
								if(G_missionStatus === 1 ||
									missionType === '+news' ||
									((missionType === '+tab' || missionType === '+sports') && G_missionStatus === 2 && pointHook.checkLsModalId()) ||
									(G_missionStatus === 2 && pointHook.checkStatus() !== 0)
								) displayPrefDialog();
							}else{
								if(modalCounter < 9){
									setTimeout(checkModalStatus, 300);
									modalCounter++;
								}else{
									displayPrefDialog();
								}
							}
						}());
					}
				}else{
					//認証なし
					dPC_DB.lgFlg = false;
					G_missionStatus = 1;
					checkServiceModal();
				}
			}catch(e){
				dPC_DB.lgFlg = false;
				G_missionStatus = 1;
				checkServiceModal();
			}
		}
	}());

	function checkStatus(){
		var resStatus = jsonp.response.auth_info.auth_status;
		G_loginStatus = resStatus;
		var authStatusList = [
			{authStatus: 0, value: 'unauthenticated'},
			{authStatus: 1, value: 'authenticated_carrier'},
			{authStatus: 2, value: 'authenticated_id'},
			{authStatus: 3, value: 'verified_carrier_pin'},
			{authStatus: 4, value: 'verified_id'}
		];
		var authStatusValue = '';
		for(var i= 0,len=authStatusList.length; i < len; i++) {
			if(authStatusList[i].authStatus === Number(resStatus)){
				authStatusValue = authStatusList[i].value;
				break;
			}
		}
		if(authStatusValue !== ''){
			dataLayer.push({
				'event': 'dweb_option_auth',
				'dweb_option_authStatus': authStatusValue
			});
		}
		checkHedKujiMark('loginCode', resStatus);
		if(jsonp.result_code != '0000') return false;
		if(Number(resStatus) < 1) return false;

		// 初回アクセス更新処理
		if(LOCAL_ST.connect() && G_resultCode === '0000'){
			var getDataObj = {apiFlg:false, lsFlg:false}; // フラグ設定
			var datePadding = '000000'; // hhmmss 6桁 不正値チェック用パディング

			// LSの値取得
			if(LOCAL_ST.get('smt_t_first_access_day')){
				getDataObj.lsDate = LOCAL_ST.get('smt_t_first_access_day');
				getDataObj.lsFlg = ckDateFormat(getDataObj.lsDate + datePadding);
			}

			// DBの値取得
			var settingItems = G_accountSetting.data;
			if(settingItems && settingItems.first_access_date && settingItems.first_access_date.dmenu_top){
				getDataObj.apiData = settingItems.first_access_date.dmenu_top;
				getDataObj.apiFlg = ckDateFormat(getDataObj.apiData + datePadding);
			}

			// LS DB更新
			if(!getDataObj.lsFlg && !getDataObj.apiFlg){ // LS/DBなし
				var setDate = NOW_Y + NOW_M + NOW_D;
			}else{ // LS/DB両方あり、又は LSのみ or DBのみ
				var setDate = getDataObj.apiFlg ? getDataObj.apiData : getDataObj.lsDate; // 値はDBを優先
			}
			if(!getDataObj.apiFlg) apiUpdate('first_access_date', {'dmenu_top' : setDate});
			if(getDataObj.apiFlg || !getDataObj.lsFlg) LOCAL_ST.set('smt_t_first_access_day', setDate);
		}

		//ステージ情報問い合わせ
		$.ajax({
			url: 'https://apis.raftel-d.docomo.ne.jp/gx1/v1/dpointinfo',
			type: 'GET',
			dataType: 'json',
			data: 'ptn_code=0043',
			cache: false,
			timeout: 60000,
			xhrFields: {
				withCredentials: true
			},
		}).done(function(data, status, xhr){
			dpcStage(data);
		}).fail(function(data, status, xhr){
			console.log(xhr.statusText);
			dpcStage(false);
		});
		var resStatusNum = Number(resStatus);
		if(resStatusNum >= 1 && resStatusNum <= 4) return true;
		return false;
	}
}
//ポイントとステージ
function dpcStage(jsonp){
	try{
		if(!setStgArea()) dPC_DB.stgNo = 0;
	}catch(e){
		dPC_DB.stgNo = 0;
	}
	function setStgArea(){
		checkHedKujiMark('stageCode', jsonp ? jsonp.common.result_code : 'false');
		if(!jsonp || jsonp.common.result_code != '1000'){
			return headDpointNodisp(true);
		}

		// 星座設定情報（fortune_code）が無ければdpc会員情報から取得
		if(G_fortuneSet.code === ""){
			var dpcFortuneRecommend = new callSDRecommend("", {
				callBack: makeFortuneRecommend,
				userRecoFlg: true
			});
		}

		function makeFortuneRecommend(o){
			var items = o.items;
			var dpcFortuneCode = '';
			for(var i = 0; i < items.length; i++){
				if(items[i].frameId === 'a26'){
					if(!items[i].hasOwnProperty('contents') || !items[i].contents[0].reserved1) return;
					dpcFortuneCode = items[i].contents[0].reserved1.slice(-2);
					break;
				}
			}

			// 星座設定
			if(!(/^(0[1-9]|1[0-2])$/).test(dpcFortuneCode)) return;
			$.cookie('fortune_code', "", {path:"/", expires:-1});
			$.cookie('fortune_code', dpcFortuneCode, { domain: '.smt.docomo.ne.jp', expires: 1825, path: '/' });
			$.cookie('fortune_time', "", {path:"/", expires:-1});
			$.cookie('fortune_time', NOW_FULL_DATE, { domain: '.smt.docomo.ne.jp', expires: 1825, path: '/' });
			apiUpdate('auto_set',{'fortune_seiza':'1'});
		}

		//ステージ情報の代入
		var stgData, nextStgData;
		for(var i=0, len = jsonp.data.stg_info.com_stg_info_list.length; i<len; i++){
			if(jsonp.data.stg_info.com_stg_info_list[i].stg_div === '0'){ //当月ステージ情報
				stgData = jsonp.data.stg_info.com_stg_info_list[i];
			}else if(jsonp.data.stg_info.com_stg_info_list[i].stg_div === '1'){ //翌月ステージ情報
				nextStgData = jsonp.data.stg_info.com_stg_info_list[i];
			}
		}

		if(!stgData) return headDpointNodisp(true);
		var rankData = {'102':{rank:1,name:'1つ星'},'103':{rank:2,name:'2つ星'},'104':{rank:3,name:'3つ星'},'105':{rank:4,name:'4つ星'},'106':{rank:5,name:'5つ星'}}
		var stgNo = rankData.hasOwnProperty(stgData.stg_code) ? rankData[stgData.stg_code].rank : 0;
		if(stgNo < 1 || stgNo > 5) return headDpointNodisp(true);
		if(jsonp.data.user_info_disp_flg === '0'){
			var point = '****',
				limitP = '****';
		}else{
			var point = addFigure(jsonp.data.d_pt_info.total_d_pt);
			var limitP = '0';
			for(var i = 0,len= jsonp.data.d_pt_info.com_d_pt_info_list.length; i<len; i++){
				if(jsonp.data.d_pt_info.com_d_pt_info_list[i].d_pt_div === '1') limitP = jsonp.data.d_pt_info.com_d_pt_info_list[i].hasOwnProperty('total_value_d_pt') ? addFigure(jsonp.data.d_pt_info.com_d_pt_info_list[i].total_value_d_pt) : '0';
			}
		}
		var stgName = rankData[stgData.stg_code].name,
			registrationVal = false;
		//利用者情報登録有無判定処理
		if(jsonp.data.hasOwnProperty('generalresponseinfo_list')){
			var generalInfo = jsonp.data.generalresponseinfo_list;
			for(var i=0, len=generalInfo.length; i<len; i++){
				if(!generalInfo[i].hasOwnProperty('generalid') || !generalInfo[i].hasOwnProperty('generalvalue')) continue;
				if(generalInfo[i].generalid === 'G038' && generalInfo[i].generalvalue === '01') registrationVal = true;
			}
		}
		if(!stgName) return headDpointNodisp(true);

		//データ共有
		dPC_DB.stgNo = stgNo;
		dPC_DB.dpoint = point;
		dPC_DB.limitP = limitP;
		dPC_DB.stgName = stgName;
		dPC_DB.dispFlg = jsonp.data.user_info_disp_flg !== '0';
		dPC_DB.pointMinusClass = point.substr(0,1) === '-' ? 'is_dpoint_minus': '';
		dPC_DB.limitPminusClass = limitP.substr(0,1) === '-' ? 'is_dpoint_minus': '';
		dPC_DB.registrationVal = registrationVal; //trueで登録あり
		if(jsonp.data.d_pay_pointreturnrate){
			dPC_DB.pointReturnRate = expressAsPercentage(jsonp.data.d_pay_pointreturnrate);
			dPC_DB.pointReturnRateVal = true;
		}else{
			dPC_DB.pointReturnRateVal = false;
			return headDpointNodisp(true);
		}

		//ヘッダ・ハンバーガークラス処理
		var cNames = 'is_login is_login-0'+ stgNo;
		//ヘッダ・ハンバーガーテキスト処理
		var dotClass = String(dPC_DB.pointReturnRate).indexOf('.') !== -1 ? ' dpoint_cp_dot': ''; // 倍率に小数点があればclass追加
		var dpointCpText = '登録で最大';
		var dpointCpNum = '<span class="hed_dpoint_stg_pt">'+ dPC_DB.pointReturnRate +'</span>%';
		var dpointHbgCpNum = '<span>'+ dPC_DB.pointReturnRate +'</span>%';
		if(dPC_DB.registrationVal){
			dpointCpText = '最大';
			var reductionTxt = '還元';
			dpointCpNum += reductionTxt;
			dpointHbgCpNum += reductionTxt;
		}

		//ヘッダー
		var $hedDPoint = $('#Hed_dPoint');
		if(dPC_DB.dispFlg !== false){
			if(!dPC_DB.registrationVal) $hedDPoint.addClass('hed_dpoint_nocard');
			$hedDPoint.attr('href','https://dpoint.docomo.ne.jp/member/point_info/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202202_owned-dmenu-dmenutop-fixed-button-01').removeClass('is_logout');
			var tmpHtml = '<div class="hed_dpoint_inner"><div class="hed_dpoint_num_wrp"><span id="dPoint" class="hed_dpoint_num"></span>P</div>'
						+ '<div class="hed_dpoint_cp_wrp'+ dotClass +'"><div class="hed_dpoint_cp">'+ dpointCpText + dpointCpNum +'</div></div></div><div class="dpoint_star_icon"></div>';
			$hedDPoint.html(tmpHtml);
			$hedDPoint.addClass(cNames +' '+ dPC_DB.pointMinusClass);
		}else{
			headNodisp(false);
		}
		$('#dPoint').text(point);

		//既に読み込み済みコンテンツがあれば表示処理実行
		runSetFunk(stgNo, stgName, point, limitP);

		//ハンバーガー
		var $hbgDpc = $('#HBG_dpc');
		if(dPC_DB.dispFlg !== false){
			if(!dPC_DB.registrationVal) $hbgDpc.addClass('hbg_dpoint_nocard');
			$hbgDpc.attr('href','https://dpoint.docomo.ne.jp/member/point_info/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202202_owned-dmenu-dmenutop-fixed-button-03').removeClass('is_logout').addClass(cNames);
			var htmlTmp = '<div class="hbg_lbl_ttl hbg_icn_dpoint"></div><div class="hbg_lbl_dpoint"><div class="hbg_dpoint_num"><span id="HBG_dPoint"></span>P</div>'
						+ '<div class="hbg_dpoint_cp">'+ dpointCpText + dpointHbgCpNum +'</div></div><div class="dpoint_star_icon"></div>';
			$hbgDpc.html(htmlTmp).addClass(dPC_DB.pointMinusClass);
		}else{
			hbgNodisp(false);
		}
		$('#HBG_dPoint').text(point);

		return true;
	}
	// 与えられた数字に100をかけて返却
	function expressAsPercentage(num){
		return String(Math.round(num * 1000) / 10);
	}
	// 正負のカンマ区切り
	function addFigure(str) {
		var num1 = str|0;
		if(num1.toString().substr(0,1) === '-') { // 値が負の時:4桁
			var num2 = (Math.abs(num1)).toString().length > 4? -9999 : num1;
		}else { // 値が正の時:6桁
			var num2 = (Math.abs(num1)).toString().length > 6? 999999 : num1;
		}
		return (num2).toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,');
	}
	// ヘッダー ハンバーガーメニュー タブ エラー・非表示設定表示
	function headDpointNodisp(errorFlg) {
		headNodisp(errorFlg);
		hbgNodisp(errorFlg);

		//既に読み込み済みコンテンツがあれば表示処理実行
		runSetFunk(0, null, null, null);

		return false;
	}
	// ヘッダー エラー・非表示設定表示
	function headNodisp(errorFlg) {
		var poitTxt = errorFlg ? '---' : '****';
		var rateTxt = errorFlg ? '--' : '***';
		var dpoinID = document.getElementById('Hed_dPoint');
		var tmpHtml = '<div class="hed_dpoint_inner"><div class="hed_dpoint_num_wrp"><span id="dPoint" class="hed_dpoint_num">'+ poitTxt +'</span>P</div><div class="hed_dpoint_cp_wrp"><div class="hed_dpoint_cp">最大<span class="hed_dpoint_stg_pt">'+ rateTxt +'</span>%還元</div></div></div>';
		dpoinID.innerHTML = tmpHtml;
		dpoinID.classList.add('is_login');
		dpoinID.classList.remove('is_logout');
	}
	// ハンバーガーメニュー エラー・非表示設定表示
	function hbgNodisp(errorFlg) {
		var poitTxt = errorFlg ? '---' : '****';
		var rateTxt = errorFlg ? '--' : '***';
		document.getElementById('HBG_dpc').innerHTML = '<div class="hbg_lbl_ttl hbg_icn_dpoint"></div><div class="hbg_lbl_dpoint"><div class="hbg_dpoint_num"><span id="HBG_dPoint">'+ poitTxt +'</span>P</div><div class="hbg_dpoint_cp">最大<span>'+ rateTxt +'</span>%還元</div></div>';
	}
	//既に読み込み済みコンテンツがあれば表示処理実行
	function runSetFunk(stgNo, stgName, point, limitP) {
		var i = dPC_DB.setFunk.length;
		while(i--){
			var buf = dPC_DB.setFunk.shift();
			if(!buf)break;
			if(typeof buf[0] !== 'function')continue;
			buf[0](stgNo, stgName, point, limitP, buf[1]);
		}
	}
}
// タブ用 dポイントエリア作成
// 地域タブ・dポイントタブ
function setTabPoint(stgNo, stgName, dPoint, limitP, tabName){ // ステージランク, ステージ名, ポイント, 期間限定ポイント, タブ名
	if(!stgNo || !dPC_DB.pointReturnRateVal) return genreTabDpointNodisp(true, tabName); // エラー処理
	if(dPC_DB.dispFlg !== false){
		var htmlTmp = '';

		switch(tabName){
			case 'g_region':
				var ele = 'Region_dPointArea';
				var tllIcon = '<h2 class="region_dpoint_ttl tab_dpoint_ttl">dPOINT</h2>';
				var linkPara01 = '';
				var linkId01 = 'RG1890';
				break;
			case 'g_region2':
				var ele = 'Region2_dPointArea';
				var tllIcon = '<h2 class="region_dpoint_ttl tab_dpoint_ttl">dPOINT</h2>';
				var linkPara01 = '';
				var linkId01 = 'RG2890';
				break;
			case 'g_dpoint':
				var ele = 'Dpt_dPointArea';
				var tllIcon = '<h2 class="dpt_dpoint_ttl tab_dpoint_ttl">dPOINT</h2>';
				var linkPara01 = 'button-08';
				var linkId01 = 'DP1001';
				break;
		}
		var areaEle = document.getElementById(ele);
		if(!areaEle) return;

		// ログイン後URLの振り分け
		if(tabName.indexOf('g_region') === -1){ //地域タブ以外
			var pointUrl = 'https://dpoint.docomo.ne.jp/member/point_info/index.html?utm_source=dmenu_top&utm_medium=owned&utm_campaign=dpc_202202_owned-dmenu-dmenutop-fixed-';
		}else{
			var pointUrl = 'https://dpoint.docomo.ne.jp/member/point_info/index.html?utm_source=dmenu_top&utm_medium=free-display&utm_campaign=dpc_202211_free-display-dmenu-top-area-tab-02';
		}

		htmlTmp += '<ul class="tab_dpoint_hed_list tab_dpoint_new is_login is_login-0'+ stgNo +'">'
				+ '<li class="tab_dpoint_hed_item"><a class="tab_dpoint_link tab_dpoint_hed_link is_login section_hed arrow-right" data-link-id="00hs'+ linkId01 +'" data-portalarea="top-00hs'+ linkId01 +'" href="'+ pointUrl + linkPara01 +'">'
				+ '<div id="Nws_dPointTitle" class="tab_dpoint_logo_wrp">'+ tllIcon +'</div><div class="tab_dpoint_txt_wrp">'
				+ '<div class="tab_dpoint_current"><div class="tab_dpoint_total_txt tab_dpoint_inner">ポイント合計</div><div class="tab_dpoint_current_num tab_dpoint_inner tab_dpoint_num '+ dPC_DB.pointMinusClass +'"><span>'+ dPoint +'</span>P</div></div>'
				+ '<div class="tab_dpoint_cppoint"><div class="tab_dpoint_cppoint_txt tab_dpoint_inner">うち期間・用途限定</div><div class="tab_dpoint_cppoint_num tab_dpoint_inner tab_dpoint_num '+ dPC_DB.limitPminusClass +'"><span>'+ limitP +'</span>P</div></div></div></a></li>'
				+ '</ul>';

		areaEle.innerHTML = htmlTmp;
	}else{
		genreTabDpointNodisp(false, tabName);
	}

	function setDate(){
		var startMonth = Number(NOW_D) <= 2 ? (NOW_M ==='01' ? 12 : Number(NOW_M) -1) : Number(NOW_M);
		var endMonth = startMonth < 12 ? startMonth+1 : 1;
		return startMonth.toString() + '/3～' + endMonth.toString() + '/2';
	}
}
// タブ用 dポイントエリア作成 エラー/非表示
// 地域タブ・dポイントタブ
function genreTabDpointNodisp(errorFlg, tabName){
	var poitTxt = errorFlg ? '---' : '****';

	switch(tabName){
		case 'g_region':
			var linkEle = 'Region_dpoint_link', txtEle ='Region_dpoint_txt';
			break;
		case 'g_region2':
			var linkEle = 'Region2_dpoint_link', txtEle ='Region2_dpoint_txt';
			break;
		case 'g_dpoint':
			var linkEle = 'Dpt_Dpoint_Link', txtEle ='Dpt_Dpoint_Txt';
			break;
	}

	var linkTarget = document.getElementById(linkEle);
	var txtTarget = document.getElementById(txtEle);

	// クラスの調整
	linkTarget.classList.remove('is_logout');
	txtTarget.classList.remove('tab_dpoint_logout_txt');
	linkTarget.classList.add('is_error');
	txtTarget.classList.add('tab_dpoint_error_txt');

	// 要素の調整
	txtTarget.innerHTML = '<span>'+ poitTxt +'</span>P';
}
//アカウント
function dpcAccount(jsonp){
	if(hbgTimer) clearTimeout(hbgTimer);
	if(jsonp && jsonp.common.result_code === '1000' && jsonp.data.maskdocomoid) {
		$('#HBG_dName').text(jsonp.data.maskdocomoid);
	}
	setAccountArea();
	function setAccountArea(){
		$('#HBG_Account').fadeIn(200);
		$('#HBG_Loading').fadeOut(200);
		$('#HBG_isLogout').remove();
	}
}
//嗜好確認ダイアログ
function displayPrefDialog() {
	if(!LOCAL_ST.connect()) return;

	// 初回来訪日チェック
	var currentDate = NOW_Y + NOW_M + NOW_D;

	if(G_resultCode !== '0000' || (G_accountSetting.data && G_accountSetting.data.first_access_date)) return checkCustomizeMenu();

	// ジャンル数チェック
	var prefGenre = {
	"push_check":{
		"pattern":"2",
		"title": "気になるジャンルを<span class=\"pref_modal_emphasis\">１つ</span>選んでください",
		"txt1": "dメニューでアクセスしやすくなります！",
		"genre_list":[{
			"id":"112",
			"name":"ニュース",
			"img":""
			},{
			"id":"114",
			"name":"株価・マネー",
			"img":""
			},{
			"id":"101",
			"name":"プロ野球",
			"img":""
			},{
			"id":"100",
			"name":"Jリーグ",
			"img":""
			},{
			"id":"108",
			"name":"スポーツ全般",
			"img":""
			},{
			"id":"102",
			"name":"占い",
			"img":"top_custom_recom_fortune.png"
			},{
			"id":"113",
			"name":"dポイント",
			"img":""
			},{
			"id":"107",
			"name":"クイズ",
			"img":""
			},{
			"id":"104",
			"name":"健康",
			"img":""
			},{
			"id":"103",
			"name":"レシピ",
			"img":""
			},{
			"id":"116",
			"name":"ドラマ",
			"img":""
			},{
			"id":"117",
			"name":"将棋",
			"img":""
			},{
			"id":"106",
			"name":"どうぶつ",
			"img":""
			},{
			"id":"118",
			"name":"競馬",
			"img":""
		}],
		"txt_other_link": "この中にはない",
		"notice": "",
		"b_pattern": "1",
		"b_text": "ありがとうございます。<br>お知らせを受けとるため、通知設定を確認ください。",
		"b3_text": "",
		"b3_img": ""
	}
};
	var prefList = prefGenre.push_check.genre_list;
	if(!prefList.length) return checkCustomizeMenu();

	// ジャンル選択画面表示(1：アイコン形式, 2：テキスト形式)
	var outer = document.createElement('div');
	outer.classList.add('modal_outer');
	if(prefGenre.push_check.pattern === '1') {
		var classItem = [
			'modal_pref_inner', 'modal_pref_ttl_wrp', 'modal_pref_ttl', 'modal_pref_txt', 'pref_modal_list',
			'pref_modal_link_other', 'pref_modal_link_notice'
		];
		for(var i=0, tmpHtml=''; i < prefList.length; i++) {
			tmpHtml += '<li class="grid_item grid_item-3 pref_modal_btn"><a href="javascript:void(0)" data-genre-id="'+ prefList[i].id +'"><img class="lazyload" data-src="./'+ prefList[i].img +'" alt="'+ prefList[i].name +'"></a></li>';
		}
	} else if(prefGenre.push_check.pattern === '2') {
		var classItem = [
			'modal_pref_inner2', 'modal_pref_ttl_wrp2', 'modal_pref_ttl2', 'modal_pref_txt2', 'pref_modal_list2',
			'pref_modal_link_other2', 'pref_modal_link_notice2'
		];
		for(var i=0, tmpHtml=''; i < prefList.length; i++) {
			tmpHtml += '<li class="grid_item grid_item-2 pref_modal_btn2"><a href="javascript:void(0)" data-genre-id="'+ prefList[i].id +'">'+ prefList[i].name +'</a></li>';
		}
	} else {
		return checkServiceModal();
	}

	//トルツメ判定
	var prefTitle = prefGenre.push_check.title.length,
		prefTxt = prefGenre.push_check.txt1.length,
		prefOther = prefGenre.push_check.txt_other_link.length,
		prefNotice = prefGenre.push_check.notice.length;

	var titleHtml = !prefTitle ? '' : '<div class="modal_ttl_wrp '+ classItem[1] +'"><div class="modal_ttl '+ classItem[2] +'">'+ prefGenre.push_check.title +'</div></div>',
		txtHtml = !prefTxt ? '' : '<div class="'+ classItem[3] +'" style="max-height: 4em;">'+ prefGenre.push_check.txt1 +'</div>',
		otherHtml = !prefOther ? '' : '<li class="'+ classItem[5] +'"><a href="javascript:void(0)" data-genre-id="999">'+ prefGenre.push_check.txt_other_link +'</a></li>',
		noticeHtml02 = !prefNotice ? '' : '<p class="'+ classItem[6] +'">'+ prefGenre.push_check.notice +'</p>';

	outer.innerHTML = '<div id="GenreModal" class="modal_inner_wrp"><div class="modal_inner '+ classItem[0] +'">'
		+ '<div class="modal_pref_logo"><img src="./top_logo.png" alt="dmenu"></div>'
		+ titleHtml
		+ txtHtml
		+ '<div class="'+ classItem[4] +'"><ul id="Pref_Genre">'+ tmpHtml
		+ otherHtml + '</ul></div>'
		+ noticeHtml02
		+ '<p class="modal_close donation-remove js-btn-remove"><a href="javascript:void(0)">非表示にする</a></p></div></div>';

	document.body.appendChild(outer);
	//GA4
	dataLayer.push({
		'event':'DWEB_dmenu_imp',
		'DWEB_dmenu_imp_corner':'news_preference_dialog'
	});


	$('#Pref_Genre li a').on('click', function() {
		//GA4
		dataLayer.push({
			'event':'DWEB_click_specialtrack',
			'dweb_click_specialtrack_value':'news_preference_dialog_' + $(this).data().genreId,
			'dweb_click_specialtrack_url':undefined,
			'dweb_click_specialtrack_portalarea':'news_preference_dialog_' + $(this).data().genreId
		});

		// PUSH許諾チェック
		if(IOS_FLG || !$.cookie('dasg')) return document.body.removeChild(outer);

		var modalPattern = '<div id="GenreModal" class="modal_inner_wrp"><div class="modal_inner modal_pref_inner3">';

		switch(prefGenre.push_check.b_pattern) {
			case '1' :
				// PUSH許諾画面表示
				var ver = parseFloat(/android\s(\d{1,}\.\d|\d{1,})/.exec(UA)[1]);
				if(ver >= 5.1 && ~$.cookie('dasg').indexOf('c1v100.000') < 0) {
					//モーダルB-1
					modalPattern += '<div class="modal_pref_txt3">'+ prefGenre.push_check.b_text +'</div>'
						+ '<div class="pref_modal_appchk_wrp">'
						+ '<div class="pref_modal_appchk">'
						+ '<img class="lazyload" data-src="./top_modal_push_01.png" alt="dメニューからのお知らせ ここにチェック">'
						+ '</div></div>'
						+ '<div class="pref_modal_appbtn">'
						+ '<a class="pref_modal_applink" href="Intent://settings/#Intent;package=com.nttdocomo.android.dmenu2;scheme=dmenuapp;end" data-link-id="00hs240105" data-portalarea="top-00hs240105">'
						+ '<span class="pref_modal_apptxt">ｄメニューからの<br>お知らせを受け取る</span>'
						+ '</a></div>';
				}else{
					document.body.removeChild(outer);
					return;
				}
				break;
			case '2' :
				//モーダルB-2
				modalPattern += '<div class="modal_pref_txt3">'+ prefGenre.push_check.b_text +'</div>';
				break;
			case '3' :
				if($(this).attr('data-genre-id') === '999'){
					//モーダルB-2
					modalPattern += '<div class="modal_pref_txt3">'+ prefGenre.push_check.b_text +'</div>';
				}else{
					//モーダルB-3
					modalPattern += '<div class="modal_pref_txt4">'+ prefGenre.push_check.b3_text +'</div>'
					 	+ '<div class="pref_modal_btn-lot">'
					 	+ '<a href="//service.smt.docomo.ne.jp/portal/special/collab/thanks/src/dmenukuji_01.html" data-link-id="00hs240106" data-portalarea="top-00hs240106">'
					 	+ '<img class="lazyload" data-src="./'+ prefGenre.push_check.b3_img +'" alt="ポイントくじを引く">'
					 	+ '</div>';
					$.cookie('smt_t_lottery', '001', { expires: 30, path:'/', domain:'.smt.docomo.ne.jp' });
				}
				break;
		}
		
		modalPattern += '<p class="modal_close donation-remove js-btn-remove"><a href="javascript:void(0)">非表示にする</a></p></div></div>';
		outer.innerHTML = modalPattern;

		$('.modal_close').on('click', function(e){
			document.body.removeChild(outer);
		});
	});

	$('.modal_close').on('click', function(e){
		document.body.removeChild(outer);
	});

	$('.modal_outer').on('click', function(e){
		if(!$(e.target).closest('.modal_inner').length) {
			document.body.removeChild(outer);
		};
	});
}
//カスタマイズメニュー
function checkCustomizeMenu() {
	(function amenuLoad() {
		if(!G_amenuFlg) {
			setTimeout(amenuLoad, 300);
		} else {
			if(!LOCAL_ST.connect()) return checkServiceModal();

			// tabDefaultパラメータが含まれる場合は対象外
			if(GENRE_DATA.hasParam > 0) return checkServiceModal();

			// カスタマイズメニュー画面内表示チェック
			var positionTop = $('#amenu_Cts')[0].getBoundingClientRect().top;
			var clientHeight = $('#amenu_Cts')[0].getBoundingClientRect().height;
			if(!(0 < positionTop + clientHeight && positionTop < window.innerHeight)) return checkServiceModal();

			// 認証状態チェック
			if(!dPC_DB.lgFlg) return checkServiceModal();

			//初回来訪日確認
			if(!LOCAL_ST.get('smt_t_first_access_day') || !checkLastDate(LOCAL_ST.get('smt_t_first_access_day'), 90)) return checkServiceModal();

			// 前回表示日チェック
			if(!checkRcmDate()) return checkServiceModal();

			var d3pLogArr = [];//レコメンドデータ(利用ログ)
			var d3pEstArr = [];//レコメンドデータ(推定)
			var firstViewArr = [];//FVの10カテゴリ
			var firstViewUpperArr = [];//FVの上段
			var firstViewLowerArr = [];//FVの下段
			var replaceBeforeLowerArr = [];//入替対象の下段カテゴリ

			//各カテゴリの最終クリック日を確認
			var clickFinalDay = LOCAL_ST.get('smt_t_cm_clickfinal_day');
			if(!clickFinalDay){
				clickFinalDay = false;
			}else{
				clickFinalDay = JSON.parse(clickFinalDay);
			}
			var $amenuCtsList = $('#amenu_Cts li');
			for(var i = 0, len = $amenuCtsList.length - 1; i < len; i++){//-1は「すべてのサービス」
				var genreId = $amenuCtsList[i].dataset.genreId;
				if(i < 5 || (i > 14 && i < 20)){
					firstViewArr.push(genreId);
					if(i < 5){
						firstViewUpperArr.push(genreId);
					}
					//天気・占いを除く
					if(i > 14 && i < 20){
						firstViewLowerArr.push(genreId);
						if(['003','004'].indexOf(genreId) < 0){
							if(!clickFinalDay || !clickFinalDay[genreId] || checkLastDate(clickFinalDay[genreId], 60)){
								replaceBeforeLowerArr.push(genreId);
							}
						}
					}
				}
			}
			if(replaceBeforeLowerArr.length === 0) return checkServiceModal();
			for(var i=0,len=replaceBeforeLowerArr.length;i<len;i++){
				if(G_categoryData[replaceBeforeLowerArr[i]]) delete G_categoryData[replaceBeforeLowerArr[i]];
			}

			(function(){
				var menuArr = [false, false];
				var deferred = $.Deferred();
				d3p.cmd.push(function(){ d3p.getD3pData("customizeMenuUse", "menulist", 60 * 60 * 24, function(data){
					if(data && data.menulist) {
						menuArr[0] = makeMenuArr(data);
					}else{
						menuArr[0] = [];
					}
				}, { await: true })});
				d3p.cmd.push(function(){ d3p.getD3pData("customizeMenuPresume", "menulist", 60 * 60 * 24, function(data){
					if(data && data.menulist) {
						menuArr[1] = makeMenuArr(data);
					}else{
						menuArr[1] = [];
					}
				}, { await: true })});
				var count = 0;
				dataCheck();
				function dataCheck(){
					if(menuArr[0] && menuArr[1]){
						d3pLogArr = [].concat(menuArr[0]);
						d3pEstArr = [].concat(menuArr[1]);
						return deferred.resolve();
					}else if(count > 9){
						if(menuArr[0]) d3pLogArr = [].concat(menuArr[0]);
						if(menuArr[1]) d3pEstArr = [].concat(menuArr[1]);
						return deferred.resolve();
					}else{
						count++;
						setTimeout(dataCheck, 300);
					}
				}
				function makeMenuArr(data){
					var arr = [];
					data = JSON.parse(data.menulist);
					for(var i = 1, len = (Object.keys(data).length > 29) ? 29 : Object.keys(data).length; i <= len; i++){//最大29件
						if(data['menu' + i]){
							arr.push(data['menu' + i]);
						}
					}
					return arr;
				}
				return deferred.promise();
			}()).then(function() {
				swapCategory(AMENU_JSON);
			});
		}
		// 前回表示日チェック
		function checkLastDate(lastDateStr, diffNum) { //lastDateStr(YYYYMMDD):String,diffNum:number
			return (getDiffDay(NOW_Y + NOW_M + NOW_D, lastDateStr) - 1 > diffNum) ? true : false;
		}
		// 前回表示日チェック
		function checkRcmDate() {
			var rcmDate = LOCAL_ST.get('smt_t_cat_rcm_date');
			if(rcmDate){
				rcmDate = JSON.parse(rcmDate);
				if(!rcmDate.rcm_date){
					rcmDate = {rcm_date: JSON.stringify(rcmDate)};
				}
			}
			return (!rcmDate || !rcmDate.rcm_date || getDiffDay(NOW_Y + NOW_M + NOW_D, rcmDate.rcm_date) > 14) ? true : false;
		}
		function swapCategory(jsonData){
			//29件不足時の補完データ
			var additionalId = ['','','','','','','','','','','','','','','','','','','','','','','','','','','','',''];
			var jsonAllId = [];
			for (var i = 0, gLen = jsonData.genre.length; i < gLen; i++) {
				for(var n=0, iLen = jsonData.genre[i].items.length; n < iLen; n++) {
					var id = jsonData.genre[i].items[n].id;
					jsonAllId.push(id);
					if(G_ahamoFlg === '1'){
						if(jsonData.genre[i].items[n].comp_ahamo){
							additionalId[jsonData.genre[i].items[n].comp_ahamo] = id;
						}
					}else{
						if(jsonData.genre[i].items[n].comp_normal){
							additionalId[jsonData.genre[i].items[n].comp_normal] = id;
						}
					}
				}
			}

			//廃カテゴリはここで排除する。
			var newLogArr = [];
			var newEstArr = [];
			for(var i = 0, len = (d3pLogArr.length > d3pEstArr.length) ? d3pLogArr.length : d3pEstArr.length; i < len; i++){
				if(d3pLogArr[i] && jsonAllId.indexOf(d3pLogArr[i]) > -1) newLogArr.push(d3pLogArr[i]);
				if(d3pEstArr[i] && jsonAllId.indexOf(d3pEstArr[i]) > -1) newEstArr.push(d3pEstArr[i]);
			}
			d3pLogArr = [].concat(newLogArr);
			d3pEstArr = [].concat(newEstArr);

			// ローカルストレージ中の設定文字列を取得
			var lsAmenuWithFlg = LOCAL_ST.get('smt_t_amenu');
			lsAmenuWithFlg = lsAmenuWithFlg ? lsAmenuWithFlg.split(','): [];
			//LS内の戦略枠を取得
			var straArr = [];
			for(var i = 0, len = lsAmenuWithFlg.length; i < len; i++){
				if(lsAmenuWithFlg[i].indexOf('_') > -1){
					var arr = lsAmenuWithFlg[i].split('_');
					if(arr[1] === 'stra'){
						straArr.push(arr[0]);
					}
				}
			}

			var setArray = [];//表示用idデータ
			var otherArray = [];
			var count = replaceBeforeLowerArr.length;//ファーストビューに追加できる残数
			var rcmDateList = [];

			for(var i = 0, len = firstViewUpperArr.length; i < len; i++){
				setArray.push(firstViewUpperArr[i]);
				if(additionalId.indexOf(firstViewUpperArr[i]) > -1) { additionalId.splice(additionalId.indexOf(firstViewUpperArr[i]), 1); }
				if(d3pLogArr.indexOf(firstViewUpperArr[i]) > -1) { d3pLogArr.splice(d3pLogArr.indexOf(firstViewUpperArr[i]), 1); }
				if(d3pEstArr.indexOf(firstViewUpperArr[i]) > -1) { d3pEstArr.splice(d3pEstArr.indexOf(firstViewUpperArr[i]), 1); }
			}
			//下段の入れ替え対象外を取得
			var stayArr = firstViewLowerArr.filter(function (i) {
				return replaceBeforeLowerArr.indexOf(i) == -1;
			});
			for(var i = 0, len = stayArr.length; i < len; i++){
				if(additionalId.indexOf(stayArr[i]) > -1) { additionalId.splice(additionalId.indexOf(stayArr[i]), 1); }
				if(d3pLogArr.indexOf(stayArr[i]) > -1) { d3pLogArr.splice(d3pLogArr.indexOf(stayArr[i]), 1); }
				if(d3pEstArr.indexOf(stayArr[i]) > -1) { d3pEstArr.splice(d3pEstArr.indexOf(stayArr[i]), 1); }
				if(straArr.indexOf(stayArr[i]) > -1){
					//先に戦略枠を追加する。
					setArray.push(stayArr[i]);
				}else{
					otherArray.push(stayArr[i]);
				}
			}
			//戦略処理時、レコメンド処理時の入替対象と同じidはレコメンドリストから除く
			if(G_categoryData['straReplaceId']){
				if(d3pLogArr.indexOf(G_categoryData['straReplaceId']) > -1){ d3pLogArr.splice(d3pLogArr.indexOf(G_categoryData['straReplaceId']), 1); }
				if(d3pEstArr.indexOf(G_categoryData['straReplaceId']) > -1){ d3pEstArr.splice(d3pEstArr.indexOf(G_categoryData['straReplaceId']), 1); }
			}
			for(var i = 0, len = replaceBeforeLowerArr.length; i < len; i++){
				if(d3pLogArr.indexOf(replaceBeforeLowerArr[i]) > -1){ d3pLogArr.splice(d3pLogArr.indexOf(replaceBeforeLowerArr[i]), 1); }
				if(d3pEstArr.indexOf(replaceBeforeLowerArr[i]) > -1){ d3pEstArr.splice(d3pEstArr.indexOf(replaceBeforeLowerArr[i]), 1); }
			}
			//入替対象とレコメンドデータ(利用ログ)を入れ替える。
			for(var i = 0, len = count; i < len; i++){
				if(d3pLogArr[i]){
					setArray.push(d3pLogArr[i]);
					rcmDateList.push(d3pLogArr[i]);
					if(additionalId.indexOf(d3pLogArr[i]) > -1) { additionalId.splice(additionalId.indexOf(d3pLogArr[i]), 1); }
					if(d3pEstArr.indexOf(d3pLogArr[i]) > -1) { d3pEstArr.splice(d3pEstArr.indexOf(d3pLogArr[i]), 1); }
					G_categoryData[d3pLogArr[i]] = '_log';
					count--;
				}else{
					break;
				}
			}
			//入替対象とレコメンドデータ(推定)を入れ替える。
			for(var i = 0, len = count; i < len; i++){
				if(d3pEstArr[i]){
					setArray.push(d3pEstArr[i]);
					rcmDateList.push(d3pEstArr[i]);
					if(additionalId.indexOf(d3pEstArr[i]) > -1) { additionalId.splice(additionalId.indexOf(d3pEstArr[i]), 1); }
					G_categoryData[d3pEstArr[i]] = '_est';
					count--;
				}else{
					break;
				}
			}
			//補完データから足りない分を補充
			var additionalAfter10 = []; //入替対象カテゴリは11件目以降に表示
			for(var i = 0, len = additionalId.length; i < len; i++){
				if(count === 0) break;
				var id = additionalId.splice(0, 1)[0];
				if(G_categoryData['straReplaceId'] === id || replaceBeforeLowerArr.indexOf(id) > -1){
					additionalAfter10.push(id);
				}else{
					setArray.push(id);
					rcmDateList.push(id);
					G_categoryData[id] = '_rule';
					count--;
				}
			}
			//入れ替え対象外を追加する。
			for(var i = 0, len = otherArray.length; i < len; i++){
				setArray.push(otherArray[i]);
			}
			while(setArray.length < 29) {
				if(additionalAfter10.length){
					setArray.push(additionalAfter10.splice(0, 1)[0]);
				}else{
					setArray.push(additionalId.splice(0, 1)[0]);
				}
			}

			G_categoryData.recoNewArr = [].concat(rcmDateList);

			//DOM生成
			var tmpHtml = '';
			var liArr = [];
			for (var i = 0, len = setArray.length; i < len; i++) {
				var buf = TOP_INIT.makeBuf(jsonData, setArray[i], i+1, G_categoryData);
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
			$('#amenu_Cts li:not(:eq(29))').remove();
			$('#amenu_Cts').prepend(tmpHtml);
			//天気
			amenuWeather();
			//占い
			TOP_INIT.fortune(FORTUNE_JSON);
			//乗り換え
			TOP_INIT.transfer(TRANSFER_JSON);

			var recoLsData = [];
			var flgDataKeys = Object.keys(G_categoryData);
			var pushData = '';//フラグデータのみ送信
			//ファーストビューの10カテゴリにフラグ付与
			for(var i = 0; i < 10;i++){
				//補完サービスは除外する
				if(flgDataKeys.indexOf(setArray[i]) > -1){
					recoLsData.push(setArray[i] + G_categoryData[setArray[i]]);
				}
				if(G_categoryData[setArray[i]]){
					//ファーストビューの10カテゴリにフラグ付与
					setArray[i] += G_categoryData[setArray[i]];
					pushData += (pushData === '') ? setArray[i] : ',' + setArray[i];
				}
			}
			//ローカルストレージを更新
			var rcmDate = LOCAL_ST.get('smt_t_cat_rcm_date');
			if(rcmDate){
				rcmDate = JSON.parse(rcmDate);
				if(rcmDate.rcm_date){
					rcmDate.rcm_date = NOW_Y + NOW_M + NOW_D;
				}else{
					rcmDate = {rcm_date: NOW_Y + NOW_M + NOW_D, cat_rcm_date: {}}
				};
			}else{
				rcmDate = {rcm_date: NOW_Y + NOW_M + NOW_D, cat_rcm_date: {}};
			}
			for(var i = 0, len = rcmDateList.length; i < len; i++){
				rcmDate.cat_rcm_date[rcmDateList[i]] = NOW_Y + NOW_M + NOW_D;
			}
			rcmDate = JSON.stringify(rcmDate);
			LOCAL_ST.set('smt_t_amenu', recoLsData);
			LOCAL_ST.set('smt_t_amenu_time', NOW_FULL_DATE);
			LOCAL_ST.set('smt_t_cat_rcm_date', rcmDate);
			
			dataLayer.push({
				"event":"DWEB_CategoryRecommendShow",
				"DWEB_CategoryRecommendShowService":pushData
			});
		}
	}());
}

/* --------------------------------
  サービス訴求モーダル
------------------------------------*/
function checkServiceModal(){
	if(!LOCAL_ST.connect()) return;
	var serviceDate = LOCAL_ST.get('smt_t_service_rcm_date');
	if(!serviceDate) return showServiceModal();
	var lastAccessDate = serviceDate.substr(0, 4) + serviceDate.substr(4, 2) + serviceDate.substr(6, 2);
	if(getDiffDay(NOW_Y + NOW_M + NOW_D, lastAccessDate) > 30) return showServiceModal();
	function showServiceModal(){
		$(function(){
			var modalData = COMMON_CONTENTS.common.category_modal[0];
			//空の場合はモーダル非表示
			if(!modalData) return;
			//モーダル追加処理
			var outer = document.createElement('div');
			outer.classList.add('modal_outer');
			var btnHtml = '';
			if(modalData.url && modalData.url_txt && modalData.url_bg_color && modalData.url_color){
				btnHtml = '<div class="modal_amenu_btn_wrp"><a class="modal_amenu_btn f_h-l_c-v-h" data-link-id="00hs240107" data-portalarea="top-00hs240107" href="'
						+ modalData.url +'"><span class="modal_amenu_btn_txt">'
						+ modalData.url_txt +'</span></a></div>';
			}
			outer.innerHTML = '<div id="GenreModal" class="modal_inner_wrp modal_amenu_inner_wrp">'
								+ '<div class="modal_inner modal_amenu_inner">'
									+ '<div class="modal_amenu_cts">'
										+ '<div class="modal_amenu_visual"><img src="/dmenu/hottopics/img/'+ modalData.main_img + '?' + NOW_DATE + NOW_D + '"></div>'
										+ btnHtml + '</div>'
									+ '<div class="modal_amenu_close donation-remove js-btn-remove"><a href="javascript:void(0)">非表示にする</a></div>'
								+ '</div>'
							+ '</div>';
			if(modalData.url && modalData.url_txt && modalData.url_bg_color && modalData.url_color){
				outer.querySelector('.modal_amenu_btn_txt').style.color = modalData.url_color;
				outer.querySelector('.modal_amenu_btn').style.color = modalData.url_color;
				outer.querySelector('.modal_amenu_btn').style.backgroundColor = modalData.url_bg_color;
			}
			document.body.appendChild(outer);
			dataLayer.push({
				"event":"DWEB_CategoryServiceModalShow",
				"DWEB_CategoryServiceModalShow_id":modalData.main_img.substr(16, 8)
			});
			LOCAL_ST.set('smt_t_service_rcm_date', NOW_Y + NOW_M + NOW_D);
			//遷移ボタン
			if($('.modal_amenu_btn').length){
				$('.modal_amenu_btn').on('click', function(e){
					dataLayer.push({
						"event":"DWEB_CategoryServiceModal_button",
						"DWEB_CategoryServiceModal_button_id":"2"
					});
					document.body.removeChild(outer);
				});
			}
			//閉じるボタン
			$('.modal_amenu_close').on('click', function(e){
				dataLayer.push({
					"event":"DWEB_CategoryServiceModal_button",
					"DWEB_CategoryServiceModal_button_id":"1"
				});
				document.body.removeChild(outer);
			});
			//背景タップ時
			$('.modal_outer').on('click', function(e){
				if(!$(e.target).closest('.modal_inner').length) {
					document.body.removeChild(outer);
				};
			});
		});
	}
}

/* --------------------------------
  グローバルメニューフッター
------------------------------------*/
$(function(){
	var offset = 50;
	$(window).on('scroll', function() {
		var gFootScroll = $(window).scrollTop();
		var h = $(window).height();
		$('.global_menu:not(.done)').each(function(){
			var gFootPos = $(this).offset().top;
			if (gFootScroll > gFootPos - h + offset) {
				//GA4
				dataLayer.push({
					'event':'DWEB_view', 
					'DWEB_view_tab_id': 'Common',
					'DWEB_view_checkpoint_id': 'CheckPointglobalmenu'
				});
				$(this).addClass('done');
			}
		})
	}).trigger('scroll');
});

/*---------------------------------
  ポイントフック施策
-----------------------------------*/
function callback(){};
var pointHook = {
	scRecoID: 'a27',
	//ミッション達成フラグ
	missionStatus: null,
	rewardStatus: null,
	missionId: '',
	//セグメントデータ
	segment: {
		segmentId: '',
		data: null
	},
	lsKey: 'smt_t_dpoint_hook',
	getLs: function(){
		if(LOCAL_ST.connect()){
			return LOCAL_ST.get(this.lsKey) ? JSON.parse(LOCAL_ST.get(this.lsKey)): '';
		}
		return '';
	},
	//表示済みオーバレイ
	showOverlayBannerList: [
		//{
		// 	id: セレクタ,
		// 	fun: スクロール関数
		//}
	],
	//表示済みオーバレイ非表示
	showOverlayHide: function(){
		this.showOverlayBannerList.forEach(function(item){
			$(item.id).addClass('is_hide');
			$(window).off('scroll', item.fun);
		});
	},
	//表示済みオーバレイ再表示
	overlayShow: function(){
		this.showOverlayBannerList.forEach(function(item){
			$(item.id).removeClass('is_hide');
			$(window).on('scroll', item.fun);
		});
	},
	//待機オーバーレイ
	waitOverlayBannerList: [
		// {
		// 	id: セレクタ,
		// 	fun: イベント登録用関数,
		// 	view: 表示用クラス
		// }
	],
	//既存の広告表示処理
	waitOverlayBannerRun: function(){
		this.waitOverlayBannerList.forEach(function(item){
			$(item.id).removeClass('is_hide');
			if(this.pageYOffset > 600){
				$(item.id).addClass(item.view);
			}
			if(typeof item.fun === 'function'){
				item.fun();
			}
		});
	},
	//overlay_idチェック
	checkLsOverlayId: function(){
		var lsData = this.getLs();
		var id = pointHook.segment.data ? pointHook.segment.data.id : '';
		if(lsData && lsData.overlay_id && lsData.overlay_id === id){
			return true;
		}
		return false;
	},
	//modal_idチェック
	checkLsModalId: function(){
		var lsData = this.getLs();
		var id = pointHook.segment.data ? pointHook.segment.data.id : '';
		if(lsData && lsData.modal_id && lsData.modal_id === id){
			return true;
		}
		return false;
	},
	//キャンペーンステータス確認処理
	//0未達成,1達成-受け取り前,2達成-受け取り後,3対象外
	checkStatus: function(){
		if(this.missionStatus === null) return 3;
		if(this.missionStatus){
			if(this.rewardStatus){
				return 2;
			}else{
				return 1;
			}
		}else{
			return 0;
		}
	},
	//行動種別
	missionOperateKind: {operateKind: ''},
	//ミッション種別
	checkMissionType: function(){
		var id = this.segment.segmentId;
		var data = this.segment.data;
		if(id === null || data === null) return '';
		if(['001','002'].indexOf(id) > -1){
			return '+tab';
		}else if(['004'].indexOf(id) > -1){
			return '+news';
		}else{
			return '+sports';
		}
	},
	//api通信
	sendMissionApi: function(url, param){
		var deferred = new $.Deferred;
		$.ajax({
			type: 'GET',
			dataType: 'jsonp',
			data: { 'params': JSON.stringify( param ) },
			url: url,
			timeout: 3000, //3秒
			jsonpCallback: 'callback'
		}).then(function(res, status, xhr){
			if(!res || !res.status || res.status !== 'ok') deferred.resolve(false);
			deferred.resolve(res);
		}).fail(function(){
			deferred.reject();
		})
		return deferred.promise();
	},
	//モーダル作成
	modalFlg: true,
	missionModalScrollEvent: function(){
		if(GENRE_AREA.currentSlide().id !== 'g_news') return;
		var genrHed = $('.genrHed');
		if($('#GenreModal').length){
			pointHook.modalFlg = false;
			$(window).off('scroll', pointHook.missionModalScrollEvent);
		}
		if(genrHed.hasClass('df_isFix_tab') && pointHook.modalFlg){
			pointHook.modalFlg = false;
			pointHook.setMissionModal();
		}
	},
	setMissionModal: function(){
		var self = this;
		var cid = '00hs240108';
		var tmp = '<div class="modal_outer"><div id="GenreModal" class="modal_inner_wrp modal_pthook_inner_wrp"><div class="modal_inner modal_pthook_inner">';
			tmp += '<div class="modal_pthook"><div class="modal_pthook_visual"><img class="lazyload" data-src="'+ self.segment.data.modal_img +'" alt=""></div>';
			tmp += '<div class="modal_pthook_btn_wrp"><a class="modal_pthook_btn f_h-l_c-v-h" data-link-id="'+ cid +'_'+ self.missionId +'" data-portalarea="top-'+ cid +'" href="'+ self.segment.data.notice_link_url +'"><span class="modal_pthook_btn_txt">ポイントをもらう</span></a></div></div>';
			tmp += '<div class="modal_amenu_close donation-remove js-btn-remove"><a href="javascript:void(0);">非表示にする</a></div>';
			tmp += '</div></div></div>';
		$('body').append(tmp);
		//GA4
		dataLayer.push({
			'event': 'DWEB_dmenu_imp',
			'DWEB_dmenu_imp_corner': 'news_modal_campaign_' + self.segment.data.segment_no
		});
		//イベント登録
		var $modalClose = $('.modal_amenu_close');
		var $modaleOuter = $('.modal_outer');
		var $modaleLink = $('.modal_pthook_btn');
		//閉じるボタン
		$modalClose.on('click', function(){
			removeModal();
			//GA4
			dataLayer.push({
				'event': 'DWEB_click_specialtrack',
				'dweb_click_specialtrack_value': 'news_modal_campaign',
				'dweb_click_specialtrack_url': undefined,
				'dweb_click_specialtrack_portalarea': 'news_modal_campaign_'+ self.segment.data.segment_no +'_close'
			});
		});
		//画面背景
		$modaleOuter.on('click', function(e){
			if(!$(e.target).closest('.modal_inner').length){
				removeModal();
				dataLayer.push({
					'event': 'DWEB_click_specialtrack',
					'dweb_click_specialtrack_value': 'news_modal_campaign',
					'dweb_click_specialtrack_url': undefined,
					'dweb_click_specialtrack_portalarea': 'news_modal_campaign_backscreen_'+ self.segment.data.segment_no
				});
			};
		});
		//リンククリック
		$modaleLink.on('click', function(e){
			removeModal();
		});
		//削除イベント
		function removeModal(){
			$modaleOuter.remove();
			self.pointHookSetLS('modal_id', self.segment.data.id);
			$(window).off('scroll', self.missionModalScrollEvent);
			self.showOverlayHide();
			self.setMissionOverlayBanner();
		}
	},
	//LS保存
	pointHookSetLS: function(key, val){
		var lsData = this.getLs();
		if(LOCAL_ST.connect() && lsData){
			lsData[key] = val;
			LOCAL_ST.set(this.lsKey, JSON.stringify(lsData));
		}else{
			var obj = {};
			obj[key] = val;
			LOCAL_ST.set(this.lsKey, JSON.stringify(obj));
		}
	},
	//オーバーレイ告知
	showBannerFlg: true,
	beforeCid: '00hs340001',
	afterCid: '00hs340002',
	setMissionOverlayBanner: function(){
		var tmp = '';
		var overLayBannerId = document.getElementById('PtHook_OverLay_Banner');
		var self = this;
		var status = self.checkStatus();
		var missionType = self.checkMissionType();
		var url = self.segment.data.notice_link_url;
		if(self.checkLsOverlayId() || ((missionType === '+tab' || missionType === '+sports') && !self.checkLsModalId())) return;
		if(status > 0 && status !== 3){//達成
			var img = self.segment.data.overlay_img2;
			var cid = self.afterCid;
			if(missionType === '+sports' && self.segment.data.overlay_achieved_url){
				url = self.segment.data.overlay_achieved_url;
			}
		}else{//未達成
			var img = self.segment.data.overlay_img1;
			var cid = self.beforeCid;
			$('#PtHook_OverLay_Banner').addClass('pthookBefore');
		}
		tmp += '<div class="overlay_bn_inr"><a class="overlay_bn_link pthook_overlay_bn" data-link-id="'+ cid +'_'+ pointHook.segment.data.id +'_'+ pointHook.segment.data.segment_no +'" data-portalarea="top-'+ cid +'" href="'+ url +'">';
		tmp += '<div class="overlay f_h-l_c-v"><img id="Pthook_Img" class="lazyload" data-src="'+ img +'" alt=""></div></a></div>';
		tmp += '<div class="overlay_close_wrp"><a class="overlay_close" href="javascript:void(0);"></a></div>';
		overLayBannerId.innerHTML = tmp;
		overLayBannerId.classList.remove('is_hide');
		//スクロールイベント
		var bannershowFnc = function(){
			if(window.pageYOffset > 600){
				overLayBannerId.classList.add('overlay_scroll');
				if(self.showBannerFlg){
					self.showBannerFlg = false;
					var statusStr = self.checkStatus() === 0 ? '_unachieved': '_completed';
					dataLayer.push({
						'event': 'DWEB_dmenu_imp',
						'DWEB_dmenu_imp_corner': 'common_overlay_campaign_' + self.segment.data.id + statusStr
					});
				}
			}else{
				overLayBannerId.classList.remove('overlay_scroll');
			}
		}
		bannershowFnc();
		$(window).on('scroll', bannershowFnc);
		//クリックイベント
		$('#PtHook_OverLay_Banner .overlay_close').on('click', function(e){
			$('#PtHook_OverLay_Banner').addClass('is_hide');
			//既存の広告表示処理
			self.waitOverlayBannerRun();
			self.overlayShow();
			self.pointHookSetLS('overlay_id', self.segment.data.id);
			$(window).off('scroll', bannershowFnc);
			//GA4
			dataLayer.push({
				'event': 'DWEB_click_specialtrack',
				'dweb_click_specialtrack_value': 'common_overlay_campaign',
				'dweb_click_specialtrack_url': undefined,
				'dweb_click_specialtrack_portalarea': 'common_overlay_campaign_close_' + self.segment.data.id
			});
		});
	},
	//バナー変更
	changeOverLayBanner: function(){
		if(this.segment.data.overlay_img2){
			$('#Pthook_Img').replaceWith('<img id="Pthook_Img" class="lazyload" data-src="'+ this.segment.data.overlay_img2 +'" alt="">');
			$('#PtHook_OverLay_Banner a').attr({
				'data-link-id': this.afterCid +'_'+ pointHook.segment.data.id +'_'+ pointHook.segment.data.segment_no,
				'data-portalarea': 'top-' + this.afterCid
			});
			$('#PtHook_OverLay_Banner').removeClass('pthookBefore');
		}
	}
}
//ミッション施策 枠id変更
var urlParam = location.search.substring(1).split('&');
if(urlParam !== ''){
	for(var i = 0,len=urlParam.length; i < len; i++){
		var param = urlParam[i].split("=");
		var key = param[0];
		if(key === 'testRecomend'){
			if(param[1] === 'true'){
				pointHook.scRecoID = 'a29';
			}
		}
	}
}

var G_headerAdObj = {};
// ヘッダー広告ステータス取得
G_abTest.headerAdAB();
if(G_abTest.headerAdData.ptnId === 'A') {
	G_headerAdObj = {
		topAdHFlg: false, //トップ広告高さ判定処理（false:判定要）
		headerAdFlg: false,
		mainCtsSetFlg: false,
		scRecoFirstExecutionFlg: false,
		j53Data: {},
		j188Data: {}
	};
	var d2c;
	(function(d2c) {
		var allox = d2c.allox || (d2c.allox = {});
		var renderAdCallback = allox.renderAdCallback || (allox.renderAdCallback = {});
	})(d2c || (d2c = {}));

	(function(){
		if(!G_userRecoData || G_userRecoData.common.result_code !== '0000') return;
		var headerAdDataItems = G_userRecoData.data.items; 
		var headerAdData = null;
		var headerAdDateObj = {startDate: null, endDate: null};
		for(var i=0,len=headerAdDataItems.length;i<len;i++){
			if(headerAdDataItems[i].frameId === 'j188'){
				headerAdData = headerAdDataItems[i].contents;
				break;
			}
		}
		if(!headerAdData) return;
		if(!headerAdData[0].genre1 || !headerAdData[0].genre1.match(/^\d{10}-\d{10}$/)){
			G_headerAdObj.headerAdFlg = true;
			return;
		}

		dateSplit();
		G_headerAdObj.headerAdFlg = dateCheck(headerAdDateObj.startDate, headerAdDateObj.endDate);

		function dateSplit(){
			var dateArr = headerAdData[0].genre1.split('-');
			headerAdDateObj.startDate = dateArr[0];
			headerAdDateObj.endDate = dateArr[1];
		}
		function dateCheck(startDate,endDate){
			var startDate = changeDateType(startDate);
			var endDate = changeDateType(endDate);
			if(startDate && endDate &&  startDate <= NOW_NO && NOW_NO < endDate) return true;
			return false;
		}
	})();
	function headerAdAppend() {
		var matchStr = "apush";
		var queryStr = location.search.substr(1).split("&");
		// 広告の設置
		if(queryStr.indexOf(matchStr)<0) {
			if(queryStr.indexOf('apush2')<0) {
				$('#Header_AdArea').prepend("<div id='WrpAd'><div id='ad_height'><div data-allox-placement='a021929cSb6Y' data-allox-callback='adHeader'></div><sc"+"ript async='async' src='//alxc.addlv.smt.docomo.ne.jp/p/a021929cSb6Y.js'></sc"+"ript></div></div>");
			}else{
				$('#Header_AdArea').prepend("<div id='WrpAd'><div id='ad_height'><div data-allox-placement='b2d661e4T8dQ' data-allox-callback='adHeader'></div><sc"+"ript async='async' src='//alxc.addlv.smt.docomo.ne.jp/p/b2d661e4T8dQ.js'></sc"+"ript></div></div>");
			}
			$('.amenu_wrp').addClass('amenu_wrp_mb_0');
		}
		// ヘッダー広告処理
		// タイムアウト(11秒)判定
		setTimeout(function() {
			if(!G_headerAdObj.topAdHFlg && $('#ad_height').height() < 5) {
				makeTopAd();
			}
		}, 11000);
		// 広告ステータス判定
		d2c.allox.renderAdCallback["adHeader"] = function(status) {
			console.log(status);
			if(!G_headerAdObj.topAdHFlg && status == 'error'){
				makeTopAd();
			}
		}
		d2c.allox.renderAdCallback["adHeader2"] = function(status) {
			console.log(status);
			if(!G_headerAdObj.topAdHFlg && status == 'error'){
				makeTopAd();
			}
		}
	}
}

/* --------------------------------
  トップ部分SDレコメンド生成
------------------------------------*/
var topUserRecommend = new callSDRecommend([".rcmBanner"], {
	callBack: makeTopRecommend,
	ngFunction: ngTopUserRecommend,
	className: 'sendRecoTop',
	userRecoFlg: true
});

var topRecommend = new callSDRecommend([".rcmBanner"], {
	callBack: makeTopRecommend,
	ngFunction: ngTopRecommend,
	params: [
		{
			"start": 1,
			"number": 1,
			"frameId": pointHook.scRecoID, //ポイントフック
			"getColumn": "cid,reserved1"
		}
	],
	className: 'sendRecoTop'
});

function makeTopRecommend(o) {
	var items = o.items, className = this.className, itemData = {'j53':{index:'',flg:false}, 'j188':{index:'',flg:false}};
	itemData[pointHook.scRecoID] = {index:'',flg:false};
	for(var i=0, len = items.length; i < len; i++) {
		if(!items[i].hasOwnProperty('contents') || !(items[i].frameId === 'j53' || items[i].frameId === 'j188' || items[i].frameId === pointHook.scRecoID)) {
			continue;
		}
		itemData[items[i].frameId].index = i;
		itemData[items[i].frameId].flg = true;
	}
	if(this.userRecoFlg) {
		if(G_abTest.headerAdData.ptnId === 'A') {
			if(itemData['j53'].flg){
				G_headerAdObj.j53Data = {
					itemData: items[itemData['j53'].index],
					className: className
				}
			}
			if(itemData['j188'].flg){
				(function(){
					var item = items[itemData['j188'].index];
					if(G_headerAdObj.headerAdFlg){
						var sendRecoClass = 'sendRecoTopPureAd';
						if(G_headerAdObj.mainCtsSetFlg){
							if($('#WrpAd').length === 0){
								$('#Header_AdArea').prepend('<div id="WrpAd"></div>');
							}
							makeTopSdAdBunner('#WrpAd', item, sendRecoClass);
							$('.amenu_wrp').addClass('amenu_wrp_mb_0');
							G_headerAdObj.topAdHFlg = true;
						}else{
							G_headerAdObj.j188Data = {
								itemData: items[itemData['j188'].index],
								className: sendRecoClass
							}
						}
					}else{
						G_headerAdObj.scRecoFirstExecutionFlg = true;
					}
				}());
			}else{
				G_headerAdObj.scRecoFirstExecutionFlg = true;
			}
		}
	}else{
		if(itemData[pointHook.scRecoID].flg){
			//ログインステータスチェック
			var loginCounter = 0;
			(function checkLoginStatus(){
				if(!PSN_INFO_JSON.dpoint_hook.length) return G_missionStatus = 1;
				if(typeof G_loginStatus === 'string'){
					getPointHookSegment();
				}else{
					if(loginCounter < 9){
						setTimeout(checkLoginStatus, 300);
						loginCounter++;
					}else{
						G_missionStatus = 1;
					}
				}
			}());

			//ポイント施策処理
			function getPointHookSegment(){
				if(LOCAL_ST.connect() && Number(G_loginStatus) >= 2){
					var item = items[itemData[pointHook.scRecoID].index];
					if(!item.contents[0].reserved1) return G_missionStatus = 1;

					//PSNデータ突き合わせ処理
					pointHook.segment.segmentId = item.contents[0].reserved1;
					for(var i=0,len=PSN_INFO_JSON.dpoint_hook.length; i<len; i++){
						if(PSN_INFO_JSON.dpoint_hook[i].segment_no === pointHook.segment.segmentId){
							pointHook.segment.data = PSN_INFO_JSON.dpoint_hook[i];
							break;
						}
					}

					if(!pointHook.segment.data) return G_missionStatus = 1; //データが空の場合は処理終了
					pointHook.missionOperateKind = {operateKind: pointHook.segment.data.operate_kind};

					//ミッション状況取得
					pointHook.sendMissionApi(
						'https://service.smt.docomo.ne.jp/dmpf/reward/mission/rmn/missionAccept/index.do',
						{
							requestKind: '3',
							inputData: {
								param:[{
									mediaId: '01',
									serviceId: 'a2',
									cid: 'api01',
									getKind: '1'
								}]
							}
						}
					).then(function(data){
						if(!data || !data.missionGroup) return G_missionStatus = 1;

						//天気API時刻取得
						var serverDateCounter = 0;
						(function checkServerDate(){
							if(G_kujiMarkFlg.serverDate){
								pointHookFnc(G_kujiMarkFlg.serverDate);
							}else{
								if(serverDateCounter < 9){
									setTimeout(checkServerDate, 300);
									serverDateCounter++;
								}else{
									pointHookFnc(null);
								}
							}
						}());

						//ポイントフックメイン処理
						function pointHookFnc(time){
							if(time){
								var setTime = time;
							}else{
								var date = new Date();
								var JP_MINUTES_OFFSET = 540; // 日本時間の標準時からのズレ（分単位）
								var deviceMinutesOffset = date.getTimezoneOffset(); // 端末の標準時からのズレを分単位で取得
								var jpMillisecondsOffset = (deviceMinutesOffset + JP_MINUTES_OFFSET) * 60 * 1000 // 調整時間をミリ秒単位でまとめ
								var jpDate = new Date(date.getTime() + jpMillisecondsOffset); // ミリ秒単位調整し、新たにDateオブジェクトを生成

								jpDate.setDate(jpDate.getDate());
								var yyyy = jpDate.getFullYear(),
									mm = ('00' + (jpDate.getMonth() + 1)).slice(-2),
									dd = ('00' + jpDate.getDate()).slice(-2);
								var setTime = yyyy + mm + dd;
							}

							var psnGroupId = pointHook.segment.data.mission_group_id;
							var psnMissionPref = pointHook.segment.data.mission_id_pref + setTime;
							//グループidの突き合わせ
							var missionArr =[];
							for(var i=0,len=data.missionGroup.length; i<len; i++){
								if(data.missionGroup[i].missionGroupId === psnGroupId){
									missionArr = missionArr.concat(data.missionGroup[i].mission);
									break;
								}
							}
							if(!missionArr.length) return G_missionStatus = 1; //データが空の場合は処理終了

							//ミッションid突き合わせ
							var missionStatusObj;
							for(var i=0,len=missionArr.length; i<len; i++){
								if(missionArr[i].missionId === psnMissionPref){
									missionStatusObj = missionArr[i];
									break;
								}
							}
							if(!missionStatusObj) return G_missionStatus = 1;

							//ミッション対象処理
							pointHook.missionStatus = missionStatusObj.missionStatus;
							pointHook.rewardStatus = missionStatusObj.rewardStatus;
							pointHook.missionId =  missionStatusObj.missionId;
							G_missionStatus = 2;

							$(function(){
								setMissionNotice(); //告知リンク
								var missionType = pointHook.checkMissionType();
								if(missionType === '+tab' || missionType === '+sports'){
									//ポイントフック1or3
									switch(pointHook.checkStatus()){
										case 0:
											if(!pointHook.checkLsModalId()){
												$(window).on('scroll', pointHook.missionModalScrollEvent);
												if(GENRE_AREA.currentSlide().id !== 'g_news' && !$('#g_news').hasClass('is_maked')){
													pointHook.setMissionOverlayBanner();
												}
											}else{
												pointHook.setMissionOverlayBanner();
											}
											break;
										case 1:
											pointHook.setMissionOverlayBanner();
											break;
										case 2:
											break;
									}
								}else if(pointHook.checkMissionType() === '+news'){
									//ポイントフック2
									var kujiCounter = 0;
									(function checkKujiStatus(){
										if(G_kujiMarkFlg.statusFlg){
											switch(pointHook.checkStatus()){
												case 0:
													if(G_kujiMarkFlg.statusFlg === 2 && G_kujiMarkFlg.dotFlg === 0){
														pointHook.sendMissionApi(
															'https://service.smt.docomo.ne.jp/dmpf/reward/mission/rmn/missionAccept/index.do',
															{
																requestKind: '2',
																inputData: {
																	param:[{
																		mediaId: '01',
																		serviceId: 'a2',
																		cid: 'api01',
																		operateList: [pointHook.missionOperateKind]
																	}]
																}
															}
														).then(function(data){
															if(data && data.achievedMissionIdList){
																pointHook.missionStatus = 1;
															}
															pointHook.setMissionOverlayBanner();
														}).fail(function(){
															pointHook.setMissionOverlayBanner();
														});
													}else{
														pointHook.setMissionOverlayBanner();
													}
													break;
												case 1:
													pointHook.setMissionOverlayBanner();
													break;
												case 2:
													break;
											}
										}else{
											if(kujiCounter < 9){
												setTimeout(checkKujiStatus, 300);
												kujiCounter++;
											}else{
												switch(pointHook.checkStatus()){
													case 0:
													case 1:
														pointHook.setMissionOverlayBanner();
														break;
													case 2:
														break;
												}
											}
										}
									}());
								}
							});

							//告知リンク
							function setMissionNotice(){
								var tmp = '';
								var cid = '00hs000190';
								tmp += '<div id="PointHook_Notice" class="mod-box-main wrp-donation"><p class="donation-inner">';
								tmp += '<a href="'+ pointHook.segment.data.notice_link_url +'" data-link-id="'+ cid +'_'+ pointHook.segment.data.id +'_'+ pointHook.segment.data.segment_no +'" data-portalarea="top-'+ cid +'">';
								tmp += '<span class="donation_lbl" style="background-color:'+ pointHook.segment.data.notice_link_lbl_bgcolor +';">'+ pointHook.segment.data.notice_link_lbl_txt +'</span>' + pointHook.segment.data.notice_link_txt;
								tmp += '</a></p></div>';
								$('.donationBannerHead').after(tmp);
								dataLayer.push({
									'event': 'DWEB_dmenu_imp',
									'DWEB_dmenu_imp_corner': 'header_announcement_fvlink_'+ pointHook.segment.data.id
								});
							}
						}
					}).fail(function(){
						G_missionStatus = 1;
					});
				}
			}
		}else{
			G_missionStatus = 1;
		}
	}
}
function ngTopUserRecommend() {
	if(G_abTest.headerAdData.ptnId === 'A') {
		G_headerAdObj.scRecoFirstExecutionFlg = true;
		if(G_headerAdObj.mainCtsSetFlg && G_headerAdObj.headerAdFlg){
			headerAdAppend();
		}
	}
}
function ngTopRecommend() {
	G_missionStatus = 1;
}

function makeTopAd() {
	G_headerAdObj.topAdHFlg = true;
	if(Object.keys(G_headerAdObj.j53Data).length > 0){
		makeTopSdAdBunner('#WrpAd', G_headerAdObj.j53Data.itemData, G_headerAdObj.j53Data.className);
	}else{
		makeTopDefAdBunner('#WrpAd');
	}
	$("#ad_height").empty();
}

// ヘッダーデフォルトバナー広告作成
function makeTopDefAdBunner(ele) {
	$('#ad_height').addClass('is_hide');
	$(ele).append(G_defAdBunner);
	$('.alt_bnr a').attr({
		'data-link-id': adcId,
		'data-portalarea': 'top-' + adcId
	});
}

// ヘッダーSDレコメンド広告作成
function makeTopSdAdBunner(ele, item, className) {
	var dataLinkId = item.frameId === 'j188' ? '00hs330002':'00hs330001';
	$('#ad_height').addClass('is_hide');
	var tmpHtml ='<div class="alt_bnr rcmBanner"><a class="'+ className +'" href="'+ item.contents[0].pageURL1
				+ '" data-link-id="' + dataLinkId +'_'+ item.contents[0].cid
				+ '" data-portalarea="' + 'top-' + dataLinkId
				+ '" data-recommendOrder="' + item.contents[0].recommendOrder
				+ '" data-measureId="' + item.contents[0].measureId
				+ '" data-timerId="' + item.contents[0].timerId
				+ '" data-mediaId="' + item.contents[0].mediaId
				+ '" data-cid="' + item.contents[0].cid
				+ '" data-start="' + item.start
				+ '" data-frameId="' + item.frameId
				+ '" data-groupId="' + item.groupId
				+ '" data-optOutUserFlg="' + item.optOutUserFlg
				+ '" data-serviceId="' + item.contents[0].serviceId
				+ '" data-recommendMethodId="' + item.contents[0].recommendMethodId+'">'
				+ '<img src="' + item.contents[0].picURL1 +'" alt="">';
				+ '</a></div>';
	$(ele).prepend(tmpHtml);
	topUserRecommend.RequestDispItemView('#WrpAd', className);
	$('#WrpAd a').on('click',function(){
		topUserRecommend._onRequestClickData(this);
	});
}

// 複数タギングAPI
function callTaggetAPI(param, funcName, targetId, tabName, makeArticleFunc){
	var url = 'https://api.topics.smt.docomo.ne.jp/api/tagged_keywords/search_ids?' + param;
	if(funcName === undefined){
		funcName = 'callback';
	}
	//リクエスト
	$.ajax(url, {
		type:'get',
		dataType:'jsonp',
		cache:'false',
		jsonpCallback: funcName
	})
	.done(function(response){
		if(!response || response === ''){
			writeErr();
		}
	})
	.fail(function(){
		writeErr();
	});
	
	// エラーハンドリング
	function writeErr(){
		$('#' + targetId + ' section').html('<div class="' + tabName + '_cp_empty_text"><p>読み込み中にエラーが発生しました。<br>しばらくしてから、もう一度お試しください。</p><div class="loadErr_btn" data-parentid="' + targetId + '">再度読み込む</div></div>');

		$('[data-parentid="' + targetId + '"]').on('click', function(){
			$('#' + targetId + ' section').html('<div class="loading_box"><img src="./top_ajax_loading.gif" alt="Loading..."></div>');
			makeArticleFunc();
		});
	}
}

/* --------------------------------
  コンテンツ
------------------------------------*/
var MAKE_CTS = {
//jsonp
jsonp: function(url, noEscapeCash){
	var el = document.createElement('script');
	var junction = url.indexOf('?') > -1 ? '&' : '?';
	var escape = noEscapeCash?'':junction + NOW_NO;
	el.type = 'text/javascript';
	el.src = url + escape;
	el.async = true;
	document.body.appendChild(el);
},
//特殊文字
escapeHTML: function(str) {
	return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
},
//先頭並び替えと後半ランダム化
sortAry: function(ary, rankName){
	if(!rankName) rankName = 'position';
	var res = [], buf = [].concat(ary), n = buf.length, t, i, rank;
	while(n){
		i = Math.floor(Math.random() * n--);
		if(rank = buf[i][rankName]){
			res[(rank|0)-1] = buf.splice(i,1)[0];
			continue;
		}
		t = buf[n];
		buf[n] = buf[i];
		buf[i] = t;
	}
	Array.prototype.push.apply(res, buf);
	if(ary.length !== res.length) res = res.filter(function(el){ return el == 0 || el });
	return res;
},
//同数値ありの場合の並び替え　※値が空の場合がある際は先頭
sortArySameRank: function(ary, rankName){
	if(!rankName) rankName = 'position';
	var num_a = -1,
		num_b = 1;
		
	ary.sort(function(a, b){
		var x = a[rankName];
		var y = b[rankName];
		if (x < y) {
			return num_a;
		}else if (x > y) {
			return num_b;
		}
	});
	return ary;
},
/* --------------------------------
  特設リンク
------------------------------------*/
spBunner: function(data, prefix, className) {
	var rData = randomArray(data.contents);
	var buf = '';
	for(var i=0, len=data.contents.length; i<len; i++){
		buf += '<div><a class="thumb_mw-400 banner_center banner-list '+ className
			+ '" data-link-id="'+ prefix + ('0'+(i+1)).slice(-2) +'_'+ rData[i].cid
			+ '" data-portalarea="top-'+ prefix + ('0'+(i+1)).slice(-2)
			+ '" data-recommendOrder="' + rData[i].recommendOrder
			+ '" data-measureId="' + rData[i].measureId
			+ '" data-timerId="' + rData[i].timerId
			+ '" data-mediaId="' + rData[i].mediaId
			+ '" data-cid="'+ rData[i].cid
			+ '" data-start="' + data.start
			+ '" data-frameId="' + data.frameId
			+ '" data-groupId="'+ data.groupId
			+ '" data-optOutUserFlg="' + data.optOutUserFlg
			+ '" data-serviceId="' + rData[i].serviceId
			+ '" data-recommendMethodId="' + rData[i].recommendMethodId
			+ '" href="'+ rData[i].pageURL1 +'"><h3 class="item_ttl maxRow-2">'+ rData[i].title +'</h3><img class="lazyload" data-src="'
			+ rData[i].picURL1 +'?'+ NOW_DATE +'" alt="'+ rData[i].title +'" /></a></div>';
	}
	return buf;
}
};//MAKE_CTS

/* --------------------------------------
  告知リンク dataLayer送信
---------------------------------------- */
$(function(){
	$('.js-notice,.js-notice-main4,.js-notice-header,.js-notice-header-ahamo,.js-notice-footer,.js-notice-footer-ahamo').dmenuFnc('observeShow', function(element, event){
		var target = $(element);
		if(!target.length) return;

		var dataTxt = '';
		if(target.parent('.disasterBanner').length){
			dataTxt = 'header_disaster_disaster_' + element.id;
		}else if(target.parent('#RealTimeNews').length){
			dataTxt = 'header_announcement_immediately_' + element.id;
		}else if(target.hasClass('js-notice-main4')) {
			dataTxt = 'header_announcement_emergency';
		}else if(target.hasClass('js-notice-header')) {
			dataTxt = 'header_announcement_fvannouncement_' + element.id;
		}else if(target.hasClass('js-notice-header-ahamo')) {
			dataTxt = 'header_announcement_fvahamoannouncement_' + element.id;
		}else if(target.hasClass('js-notice-footer')) {
			dataTxt = 'footer_announcement_footerannouncement_' + element.id;
		}else if(target.hasClass('js-notice-footer-ahamo')){
			dataTxt = 'footer_announcement_footerahamoannouncement_' + element.id;
		}

		if(dataTxt && !target.hasClass('js-send-finished')){
			dataLayer.push({
				"event":"DWEB_dmenu_imp",
				"DWEB_dmenu_imp_corner": dataTxt
			});
			target.addClass('js-send-finished');
		}
	});
});