"use strict";

var MISSION = MISSION || {};
var MISSION_CONST = MISSION_CONST || {};
MISSION_CONST = {
  MEDIA_ID: '01',
  SERVICE_ID: 'a4',
  TARGET_DEVICE: ['hs', 'app', 'ipn'],
  IS_DEBUG_USER: false,
  USER_SEGMENT: {
    DEBUG: [''],
    PROD: {
      LOTTERY_A: {
        FLOAT: [],
        HEADER: ['000', '001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '018', '019', '020', '021', '022', '023', '024', '025', '026', '027', '028', '029', '030', '031', '032', '033', '034', '035', '036', '037', '038', '039', '040', '041', '042', '043', '044', '045', '046', '047', '048', '049', '050', '051', '052', '053', '054', '055', '056', '057', '058', '059', '060', '061', '062', '063', '064', '065', '066', '067', '068', '069', '070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '080', '081', '082', '083', '084', '085', '086', '087', '088', '089', '090', '091', '092', '093', '094', '095', '096', '097', '098', '099']
      },
      LOTTERY_B: []
    }
  },
  PAGE_URLS: {
    LP: 'https://service.smt.docomo.ne.jp/portal/special/collab/auth/mission/src/dmenu_mission_lottery.html'
  },
  DATA_URLS: {
    // フロント用ミッションリスト
    MISSION_CONFIG: {
      LOCAL: '/portal/special/collab/mission/data/mission_config.js',
      STG: 'https://stg.service.smt.docomo.ne.jp/portal/special/collab/mission/data/mission_config.js',
      PROD: 'https://service.smt.docomo.ne.jp/portal/special/collab/mission/data/mission_config.js'
    },
    // 毎日くじの1等増額キャンペーンのフラグ取得用
    TOP_KUJI_POINTUP: {
      LOCAL: '/portal/special/collab/solution/data/top_kuji_pointup.json',
      STG: 'https://stg.smt.docomo.ne.jp/dmenu/hottopics/data/top_kuji_pointup.json',
      PROD: 'https://smt.docomo.ne.jp/dmenu/hottopics/data/top_kuji_pointup.json'
    },
    // dポイント情報取得API
    DPOINT_INFO: {
      DEV: 'https://apis.dev.raftel-d.com/v1/dpointinfo',
      PROD: 'https://apis.raftel-d.docomo.ne.jp/gx1/v1/dpointinfo'
    },
    // アカウント設定情報取得API
    ACCOUNT_INFO: {
      GET: 'https://service.smt.docomo.ne.jp/serverlessApi/dm/getdmenuinfo2.json',
      UPDATE: 'https://service.smt.docomo.ne.jp/serverlessApi/dm/regdmenuinfo2.json'
    },
    // テンプレ判定API
    TEMPLATE_CHECK_API: {
      PROD: 'https://smt.docomo.ne.jp/dmenu/data/api/tplChk.js'
    }
  },
  // 最後にミッションがアクティブになった日時を記録するCookie名
  LAST_ACTIVE_COOKIE_NAME: 'smt_plusone_mission_active_time',
  // 最終アクティブ日時からUIを表示する有効期間(日数)
  DISPLAY_EXPIRE_DAYS: 7,
  // 最終アクティブ日時を記録するCookieの有効期限(日数)
  ACTIVE_COOKIE_EXPIRE_DAYS: 400,
  // 高確率くじ設定
  UPLOTTERY_RESET_DAYS: 30,
  // 復帰ユーザーと判定する日数
  UPLOTTERY_MAX_COUNT: 3 // 期間内の最大実行回数
};
MISSION = {
  MISSION_LENGTH: 0,
  // ミッショントータル数 初期値
  rewardedLength: 0,
  // リワード済ミッション数 初期値
  missionConfig: null,
  // ミッション設定(productIdリスト)
  missionData: {},
  // 各ミッションのデータ(key: productId)
  currentUserSegment: null,
  // ユーザーセグメント情報
  TYPE: {
    // 各ミッション
    TOP: 'top',
    // topページではなくmissionページのミッション
    KUJI: 'kuji',
    NEWS: 'news',
    WEATHER: 'weather',
    FORTUNE: 'fortune',
    SPORTS: 'sports',
    // ポイント付与ミッション
    LOTTERY_A: 'lotterya',
    UPLOTTERY_A: 'uplotterya',
    LOTTERY_B: 'lotteryb'
  },
  isDevelopment: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
  isStaging: function () {
    var hostname = location.hostname;
    var urlParams = new URLSearchParams(location.search);
    return hostname.indexOf('stg') !== -1 || urlParams.has('debug');
  }(),
  MISSION_REQUEST_URL: 'https://service.smt.docomo.ne.jp/dmpf/reward/mission/rmn/missionAccept/index.do'
};

/**
 * 現在のユーザーがLOTTERY_Aセグメントか判定
 * @returns {boolean}
 */
MISSION.isLotteryAUser = function () {
  if (MISSION.currentUserSegment === null) return false;
  var lotteryA_segments = [...MISSION_CONST.USER_SEGMENT.PROD.LOTTERY_A.FLOAT, ...MISSION_CONST.USER_SEGMENT.PROD.LOTTERY_A.HEADER];
  return lotteryA_segments.includes(MISSION.currentUserSegment);
};
/**
 * 現在のユーザーがLOTTERY_Bセグメントか判定
 * @returns {boolean}
 */
MISSION.isLotteryBUser = function () {
  if (MISSION.currentUserSegment === null) return false;
  return MISSION_CONST.USER_SEGMENT.PROD.LOTTERY_B.includes(MISSION.currentUserSegment);
};

/**
 * ネストされたセグメントオブジェクトをフラットな配列に変換する再帰関数
 * @param {Object|Array} segments - ユーザーセグメントを含むオブジェクトまたは配列
 * @returns {Array<string>} フラット化されたセグメントIDの配列
 */
function flattenUserSegments(segments) {
  var flatList = [];
  if (Array.isArray(segments)) {
    // 配列の場合は、その要素をリストに追加
    flatList.push(...segments);
  } else if (typeof segments === 'object' && segments !== null) {
    // オブジェクトの場合は、各プロパティに対して再帰的に処理
    for (var key in segments) {
      if (segments.hasOwnProperty(key)) {
        flatList.push(...flattenUserSegments(segments[key]));
      }
    }
  }
  return flatList;
}
/**
 * URLとパラメータを条件と比較する
 * @param {Array}  target_url   判定対象のURLのリスト
 * @param {Object} target_parms 判定対象のパラメータのリスト(オブジェクトの配列)
 * @param {Array}  except_url   除外対象のURLのリスト
 * @param {Object} except_parms 除外対象のパラメータのリスト(オブジェクトの配列)
 * @returns {Boolean} 一致する場合はtrue、一致しない場合はfalse
 */
MISSION.checkURL = function (target_url, target_parms, except_url, except_parms) {
  var i, key, regex, check_match;
  // target_urlのリストのいずれにも一致しない場合はfalseを返す
  if (target_url) {
    check_match = false;
    for (i = 0; i < target_url.length; i++) {
      if (location.href.includes(target_url[i])) {
        check_match = true;
        break;
      }
    }
    if (!check_match) {
      return false;
    }
  }

  // except_urlに一つでも一致する場合はfalseを返す
  if (except_url) {
    for (i = 0; i < except_url.length; i++) {
      if (location.href.includes(except_url[i])) {
        return false;
      }
    }
  }

  // target_parmsのリスト中いづれかの全てのパラメータに一致しない場合はfalseを返す
  if (target_parms) {
    for (i = 0; i < target_parms.length; i++) {
      check_match = true;
      for (key in target_parms[i]) {
        regex = new RegExp('[?&]' + key + '=' + target_parms[i][key]);
        if (!regex.test(location.search)) {
          check_match = false;
        }
      }
      if (check_match) {
        break;
      }
    }
    if (!check_match) {
      return false;
    }
  }
  // except_parmsのリスト中いづれかの全てのパラメータに一致した場合はfalseを返す
  if (except_parms) {
    for (i = 0; i < except_parms.length; i++) {
      check_match = true;
      for (key in except_parms[i]) {
        regex = new RegExp('[?&]' + key + '=' + except_parms[i][key]);
        if (!regex.test(location.search)) {
          check_match = false;
          break;
        }
      }
      if (check_match) {
        return false;
      }
    }
  }
  return true;
};

// ------------------------------------------------------
// ミッションをアクティブにした期間判定
// それに伴うミッション機能の実行・表示制御
// ------------------------------------------------------
/**
 * Cookieの値を取得
 * @param {string} name 取得したいCookie名
 * @returns {string|undefined} Cookieの値, 見つからない場合はundefined
 */
MISSION.getCookieValue = function (name) {
  // 正規表現で指定された名前のCookieを検索して値を取得
  var match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : undefined;
};

/**
 * Cookieをセット
 * @private
 * @param {string} name - Cookie名
 * @param {string|number} value - セットする値
 * @param {number} [days] - 有効期限(日数), 省略した場合はセッションCookieとなる
 * @param {string} path - Cookieを有効にするパス
 * @param {string} [domain] - Cookieを有効にするドメイン
 * @returns {void}
 */
MISSION._setCookie = function (name, value, days, path, domain) {
  var cookieString = name + "=" + (value || "") + "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    cookieString += "; expires=" + date.toUTCString();
  }
  cookieString += "; path=" + path;
  if (domain) cookieString += "; domain=" + domain;
  document.cookie = cookieString;
};

/**
 * yyyymmddHHMMSS形式のタイムスタンプ文字列を生成
 * @private
 */
MISSION._getFormattedTimestamp = function () {
  var d = new Date();
  var pad = function (n) {
    return n < 10 ? '0' + n : n;
  };
  return "".concat(d.getFullYear()).concat(pad(d.getMonth() + 1)).concat(pad(d.getDate())).concat(pad(d.getHours())).concat(pad(d.getMinutes())).concat(pad(d.getSeconds()));
};

/**
 * ユーザーのミッションの最終アクティブ日時をCookieにセット/更新
 */
MISSION.setLastActiveTimeCookie = function () {
  var cookieName = MISSION_CONST.LAST_ACTIVE_COOKIE_NAME;
  var cookieDomain = MISSION.isDevelopment ? null : '.smt.docomo.ne.jp';
  var cookieExpireDays = MISSION_CONST.ACTIVE_COOKIE_EXPIRE_DAYS;
  MISSION._setCookie(cookieName, MISSION._getFormattedTimestamp(), cookieExpireDays, '/', cookieDomain);
};

/**
 * ユーザー訪問時Cookieの有効期限を延長する(ITP対策)
 */
MISSION.extendLastActiveTimeCookie = function () {
  var cookieName = MISSION_CONST.LAST_ACTIVE_COOKIE_NAME;
  var currentValue = MISSION.getCookieValue(cookieName);

  // Cookieが存在する場合のみ、有効期限を更新して再セットする
  if (currentValue) {
    var cookieDomain = MISSION.isDevelopment ? null : '.smt.docomo.ne.jp';
    var cookieExpireDays = MISSION_CONST.ACTIVE_COOKIE_EXPIRE_DAYS;
    MISSION._setCookie(cookieName, currentValue, cookieExpireDays, '/', cookieDomain);
  }
};

/**
 * [内部ヘルパー] ミッションのアクティブ期間が経過したか判定します
 * @private
 * @param {string|undefined} timestampString - YYYYMMDD...形式のタイムスタンプ
 * @returns {boolean} 期間が経過した場合 true
 */
MISSION._isActivePeriodExpired = function (timestampString) {
  if (!timestampString) {
    return false; // タイムスタンプがなければ期間切れではない
  }
  var year = parseInt(timestampString.substring(0, 4), 10);
  var month = parseInt(timestampString.substring(4, 6), 10) - 1;
  var day = parseInt(timestampString.substring(6, 8), 10);
  var hour = parseInt(timestampString.substring(8, 10), 10);
  var minute = parseInt(timestampString.substring(10, 12), 10);
  var second = parseInt(timestampString.substring(12, 14), 10);
  var timestampDate = new Date(year, month, day, hour, minute, second);
  if (isNaN(timestampDate.getTime())) {
    console.error('Invalid date parsed from cookie:', timestampString);
    return false;
  }
  var now = new Date();
  var expireDays = MISSION_CONST.DISPLAY_EXPIRE_DAYS;
  var EXPIRE_PERIOD_IN_MS = expireDays * 24 * 60 * 60 * 1000;
  var diff = now.getTime() - timestampDate.getTime();
  var isActivePeriodExpired = diff >= EXPIRE_PERIOD_IN_MS;
  return isActivePeriodExpired;
};

/**
 * ミッション関連機能の実行をスキップすべきか判定 & 必要に応じて最終アクティブ日時を更新
 * 最終アクティブ日時を記録するCookieの有無を確認し、なければ生成(アクティブ化)します。
 * @returns {boolean} 期間切れにより処理をスキップすべき場合は `true`、実行すべき場合は `false` を返します。
 */
MISSION.shouldSkipMissionByPeriod = function () {
  var cookieName = MISSION_CONST.LAST_ACTIVE_COOKIE_NAME;
  var lastActiveTime = MISSION.getCookieValue(cookieName);
  if (!lastActiveTime) {
    MISSION.setLastActiveTimeCookie();
    console.info('[INFO] First mission contact. Setting activity cookie.');
    return false;
  }
  return MISSION._isActivePeriodExpired(lastActiveTime);
};

/**
 * [読み取り専用] ミッション機能の有効期間が過ぎているか判定します。
 * ユーザーの最終アクティブ日時を更新せずに、期間のチェックのみを行いたい場合（例: トップページの導線表示制御）に使用します。
 * @returns {boolean} 有効期間が過ぎている場合は `true`、期間内の場合は `false` を返します。
 */
MISSION.hasActivePeriodExpired = function () {
  var cookieName = MISSION_CONST.LAST_ACTIVE_COOKIE_NAME;
  var lastActiveTime = MISSION.getCookieValue(cookieName);
  return MISSION._isActivePeriodExpired(lastActiveTime);
};

// ------------------------------------------------------
// デバイス判定
// ------------------------------------------------------
/**
 * デバイス判定(テンプレートチェック): scriptをloadする
 */
MISSION.loadTemplateCheckScript = function () {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  var apiUrl = MISSION_CONST.DATA_URLS.TEMPLATE_CHECK_API.PROD;
  script.src = apiUrl + '?' + new Date().getTime();
  script.async = true;
  document.head.appendChild(script);
};
/**
 * デバイス判定(テンプレートチェック): 対象の端末かを判定する(同期処理)
 * @param {Object} data        window.tplChkから返される結果データのオブジェクト
 * @param {String} data.result テンプレートID(端末文字列)
 * @returns {Boolean}
 */
MISSION.isTargetDevice = function (data) {
  var templateId = data.result;
  return MISSION_CONST.TARGET_DEVICE.includes(templateId);
};
/**
 * デバイス判定(テンプレートチェック)を実行, 結果をPromiseで返す(非同期)
 * テンプレートチェックスクリプトをロード、コールバック関数window.tplChkを利用して判定
 * @returns {Promise<boolean>} boolean値で解決されるPromiseを返す
 */
MISSION.checkDevice = function () {
  let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 5000;
  return new Promise(function (resolve, reject) {
    MISSION.loadTemplateCheckScript();
    window.tplChk = function (data) {
      var isTargetDevice = MISSION.isTargetDevice(data);
      resolve(isTargetDevice);
    };
  });
};

// ------------------------------------------------------
// ユーザーセグメント判定
// ------------------------------------------------------
/**
 * ユーザーセグメント判定API(SCレコ)をリクエスト
 * @returns {Promise<Object>} APIレスポンスデータで解決されるPromise。APIエラー時はrejectされる。
 */
MISSION.fetchRecommendApi = function () {
  return new Promise(function (resolve, reject) {
    var requestUrl = 'https://smt.docomo.ne.jp/dmpf/tagereco/owdrmd/recommendAccept/index.do';
    var params = {
      'requestKind': 1,
      'inputData': {
        'param': [{
          start: 1,
          number: 1,
          frameId: 'a28',
          getColumn: 'cid,reserved1'
        }]
      }
    };
    $.ajax({
      type: 'GET',
      dataType: 'jsonp',
      data: 'params=' + encodeURI(JSON.stringify(params)),
      url: requestUrl
    }).then(function (data) {
      if (data.status === 'ng') {
        console.error('fetchRecommendApi API status: ng', data);
        reject(new Error('fetchRecommendApi API status: ng: ' + data.error_cause));
      } else {
        resolve(data);
      }
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error('fetchRecommendApi Ajax Error:', textStatus, errorThrown);
      reject(errorThrown);
    });
  });
};

/**
 * ユーザーセグメントの判定(SCレコ)
 * ユーザーがターゲットセグメントに合致するかを非同期で判定
 * URLにdebug_userパラメータがある場合、API呼び出しをスキップしその値を優先
 * @returns {Promise<boolean>} 対象ユーザーか
 */
MISSION.recommend = function () {
  var urlParams = new URLSearchParams(window.location.search);
  var debugUserSegment = urlParams.get('debug_user');
  if (debugUserSegment) {
    console.log('[DEBUG] User segment overridden by URL parameter "debug_user":', debugUserSegment);
    MISSION.currentUserSegment = debugUserSegment;
    return Promise.resolve(MISSION.checkIsTargetUser());
  }

  // 通常時
  return MISSION.fetchRecommendApi().then(function (data) {
    MISSION.setUserSegmentFromApiData(data);
    return MISSION.checkIsTargetUser();
  }).catch(function (error) {
    console.error('Recommend Error:', error);
    MISSION.currentUserSegment = null; // エラー発生時 セグメント情報をクリア
    throw error;
  });
};
/**
 * APIレスポンスからユーザーセグメント情報抽出
 * MISSION.currentUserSegmentに格納
 * @param {Object} apiData ユーザーセグメント判定API(MISSION.fetchRecommendApi)からのレスポンスオブジェクト
 */
MISSION.setUserSegmentFromApiData = function (apiData) {
  var _apiData$items;
  var userSegment = apiData === null || apiData === void 0 || (_apiData$items = apiData.items) === null || _apiData$items === void 0 || (_apiData$items = _apiData$items[0]) === null || _apiData$items === void 0 || (_apiData$items = _apiData$items.contents) === null || _apiData$items === void 0 || (_apiData$items = _apiData$items[0]) === null || _apiData$items === void 0 ? void 0 : _apiData$items.reserved1;
  MISSION.currentUserSegment = userSegment !== null && userSegment !== void 0 ? userSegment : null;
  if (!userSegment) {
    console.warn('User segment (reserved1) not found or is falsy in setUserSegmentFromApiData:', apiData);
  }
};
/**
 * MISSION.currentUserSegment にセットされたユーザーセグメントに基づき
 * ユーザーがターゲットセグメントに合致するかを判定
 * @returns {boolean} 対象ユーザーか
 */
MISSION.checkIsTargetUser = function () {
  var userSegment = MISSION.currentUserSegment;
  if (userSegment === null) {
    console.warn('checkIsTargetUser: current User Segment is null:', userSegment);
    return false;
  }
  var prodSegments = flattenUserSegments(MISSION_CONST.USER_SEGMENT.PROD);
  var targetSegments = MISSION_CONST.IS_DEBUG_USER ? MISSION_CONST.USER_SEGMENT.DEBUG // デバッグ時
  : [...prodSegments, ...MISSION_CONST.USER_SEGMENT.DEBUG]; // prod+debug

  var isTargetUser = targetSegments.includes(userSegment);
  return isTargetUser;
};

// ------------------------------------------------------
// くじ引きモジュール表示: 子ミッション全達成済時
// ------------------------------------------------------
MISSION.showLottery = function () {
  $('.js-mission-list').remove();
  $('.js-lottery-area').addClass('is-show');
};

// ------------------------------------------------------
// くじ実行後の表示制御
// ------------------------------------------------------
/**
 * くじ引き: 実行後の「結果」表示
 * APIのレスポンスに応じて当選(N等) or ハズレの表示 & 関連するUI要素の表示を切り替え
 * @param {number | null | undefined} earnRewardNum - 報酬獲得APIから返される当選等級の数値 or undefined(ハズレ)
 * @param {number | null | undefined} rewardPoint - 報酬獲得APIから返される獲得ポイント数 (ハズレの場合はnull)
 * @returns {void}
 * @returns {void}
 */
MISSION.showLotteryResult = function (earnRewardNum, rewardPoint) {
  $('.js-mission-fv').remove();
  $('.js-mission-list').remove();
  $('.js-lottery-area').remove();
  // 表示
  $('.js-lottery-footer-area').addClass('is-show');
  // 結果部分
  var $lotteryResultContainer = $('.js-lottery-result');
  var $resultImage = $('.js-lottery-result-image');
  var imagePath = '/portal/special/collab/mission/img/';
  var isWin = earnRewardNum != null && rewardPoint != null;
  var imageFileName = isWin ? "lottery_result_".concat(earnRewardNum, "_").concat(rewardPoint, "pt.png?2026") : 'lottery_result_lose.png?2026';
  $resultImage.attr('src', imagePath + imageFileName);
  $lotteryResultContainer.addClass('is-show');
};

/**
 * くじ引き: 実行後の再来訪時の「実行済」の結果表示
 * 当選等級と獲得ポイント数に基づいて、対応するテキストを画面に表示
 * ハズレの場合(ポイントが獲得されていない場合)、ポイント表示要素を非表示
 * @param {number | null | undefined} earnRewardNum - 報酬獲得APIから返される当選等級の数値 or undefined(ハズレ)
 * @param {number | null | undefined} earnRewardPoint - 報酬獲得APIから返される獲得ポイント数 (ハズレの場合はnull)
 * @returns {void}
 */
MISSION.showLotteryDone = function (earnRewardNum, earnRewardPoint) {
  $('.js-mission-list').remove();
  $('.js-progress-bar-area').remove();
  $('.js-about-button-area').remove();
  $('.js-status-text').remove();
  // 表示
  $('.js-status-text-all-rewarded').show();
  $('.js-lottery-done').addClass('is-show');
  $('.js-lottery-footer-area').addClass('is-show');
  // 更新: ボタンのdata-portalarea値
  $('.js-dpc-button').attr('data-portalarea', 'dpcMission_result_kuji');
  $('.js-back-top-button').attr('data-portalarea', 'back_to_top_result_kuji');

  // 結果内容の表示
  var prizeText = '';
  var pointText = '';
  var $resultPoint = $('.js-result-point');
  if (earnRewardNum === 1) {
    prizeText = '1等';
  } else if (earnRewardNum === 2) {
    prizeText = '2等';
  } else if (earnRewardNum === 3) {
    prizeText = '3等';
  } else {
    prizeText = 'はずれ';
  }
  $('.js-result-prize').text(prizeText);

  // earnRewardPoint の値を元にポイントテキストをセット
  var hasEarnedPoints = earnRewardPoint != null;
  if (hasEarnedPoints) {
    pointText = earnRewardPoint + 'pt';
    $('.js-result-point').text(pointText);
  } else {
    $resultPoint.remove();
  }
};

// ------------------------------------------------------
// ミッションページ共通処理
// ------------------------------------------------------
/**
 * ミッションページのエラー表示
 * @param {string} errorType 表示するエラーの種類(unavailable or maintenance), デフォルトはunavailable
 */
MISSION.showMissionPageError = function () {
  let errorType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unavailable';
  var isMissionPage = $('.js-mission-list').length > 0;
  if (!isMissionPage) return;
  $('.js-mission-list').remove();
  $(".js-mission-error[data-error-type=\"".concat(errorType, "\"]")).show();
};

/**
 * 全ミッションのプログレスバー更新処理
 * @param {Object} options
 * @param {number} options.rewardedLength 報酬獲得済ミッション数
 * @param {number} options.missionLength  ミッション数
 */
MISSION.updateTotalProgressBar = function (_ref) {
  let {
    rewardedLength,
    missionLength
  } = _ref;
  var progressRatio = missionLength > 0 ? rewardedLength / missionLength * 100 : 0;
  $('.js-progress-bar-value').css({
    'width': progressRatio + '%'
  });
  $('.js-rewarded-num').text(rewardedLength);
  $('.js-mission-num').text(missionLength);
};

// ------------------------------------------------------
// ミッション達成
// ------------------------------------------------------
/**
 * ミッション達成判定APIをリクエスト
 * @param {string} missionType ミッションタイプ
 * @returns {Promise<Object>}  APIレスポンスデータで解決されるPromise
 */
MISSION.fetchAchievementApi = function (missionType) {
  return new Promise(function (resolve, reject) {
    var params = {
      requestKind: 2,
      inputData: {
        param: [{
          mediaId: MISSION_CONST.MEDIA_ID,
          serviceId: MISSION_CONST.SERVICE_ID,
          cid: 'api01',
          operateList: [{
            operateKind: missionType
          }]
        }]
      }
    };
    $.ajax({
      type: 'GET',
      dataType: 'jsonp',
      data: 'params=' + encodeURI(JSON.stringify(params)),
      url: MISSION.MISSION_REQUEST_URL
    }).then(function (data) {
      if (data.status === 'ng') {
        console.error('fetchAchievementApi Error:', data);
        reject(new Error('API returned status: ng: ' + data.error_cause));
      } else {
        resolve(data);
      }
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error('fetchAchievementApi Ajax Error:', textStatus, errorThrown);
      reject(errorThrown);
    });
  });
};

/**
 * 情報取得APIにて達成状況を確認後、未達成の場合に達成APIをリクエスト
 * @param {string} missionType ミッションタイプ
 * @returns {Promise<Object|null>} 達成APIのレスポンスデータ、または達成済みの場合はnullで解決されるPromise
 */
MISSION.checkAndAchieveMission = function (missionType) {
  var params = {
    'requestKind': 3,
    'inputData': {
      'param': [{
        'mediaId': MISSION_CONST.MEDIA_ID,
        'serviceId': MISSION_CONST.SERVICE_ID,
        'cid': 'api01',
        'getKind': 1 // 0:ミッション情報取得, 1:ミッション状況取得, 2:ミッション情報&ミッション状況取得
      }]
    }
  };
  return MISSION.fetchMissionInfoApi(params).then(function (result) {
    var _MISSION$missionData$;
    var data = result.data;
    var xhr = result.xhr;

    // 時刻取得: サーバーヘッダーの時刻取得失敗時 & 開発環境時(クロスオリジン制約)を考慮
    MISSION.originDateTime = null;
    var ResponseHeaderDate = xhr.getResponseHeader('date');
    if (ResponseHeaderDate) {
      MISSION.originDateTime = new Date(ResponseHeaderDate).getTime();
    } else {
      MISSION.originDateTime = new Date().getTime();
    }

    // 本日のミッションデータを抽出・セット
    var serverDateString = MISSION.getTodayString(MISSION.originDateTime);
    // プロダクト側のjs用に対象のmissionTypeを追加指定(はmissionConfigは読み込まない為)
    MISSION.extractDailyMission(data, serverDateString, [missionType]);

    // 達成状況を確認
    if (((_MISSION$missionData$ = MISSION.missionData[missionType]) === null || _MISSION$missionData$ === void 0 ? void 0 : _MISSION$missionData$.missionStatus) === 1) {
      console.info("[INFO] ".concat(missionType, " mission is already achieved. Skipping achievement API call."));
      return null; // 次のthenにnullを渡す(処理をスキップ)
    }
    return MISSION.fetchAchievementApi(missionType);
  });
};

/**
 * ミッション達成スナックバーを表示する
 * @param {Object} options
 * @param {Object} options.apiData     APIレスポンスデータ(ミッション達成判定API)
 * @param {string} options.missionType ミッションタイプ
 * @param {string} [options.achieveText="ミッションを達成しました！"] スナックバーに表示するテキスト (任意)
 * @param {boolean} [options.addLinkParam=false] スナックバーのリンクにパラメータを付与するか (任意)
 */
MISSION.showAchievementSnackbar = function (options) {
  var apiData = options.apiData;
  var missionType = options.missionType;
  var achieveText = options.achieveText !== undefined ? options.achieveText : 'ミッションを達成しました！';
  var addLinkParam = options.addLinkParam || false;
  var QUERY_PARAM = '?utm_source=dmenu&utm_medium=owned&utm_campaign=daily_mission_snackbar_';
  var hiddenSnackbarUserAgentList = ['dpointapp', 'dmenunewsapp', 'dmenusportsapp', 'ahamo', 'irumoapp', 'jp.kp.sp.apl.and',
  // d払いアプリ(Android)
  'jp.kp.sp.sdk.and',
  // d払いアプリ(Android)
  'jp.kp.sp.apl.ios',
  // d払いアプリ(iOS)
  'jp.kp.sp.sdk.ios' // d払いアプリ(iOS)
  ];
  // スナックバー非表示対象のURLリスト
  var hiddenSnackbarUrlList = ['portal/special/collab/solution/src/solkuji_01.html', 'portal/special/collab/auth/solution/src/solkuji_01.html'];

  // 達成の判定
  var achievedMissionIdList = apiData.achievedMissionIdList || [];
  var isMissionAchieved = achievedMissionIdList.length > 0;

  // スナックバー非表示対象のユーザーエージェントの判定
  var userAgent = window.navigator.userAgent.toLowerCase();
  var isHiddenSnackbarUserAgent = hiddenSnackbarUserAgentList.some(function (excludedUserAgent) {
    return userAgent.includes(excludedUserAgent);
  });
  // スナックバー非表示対象のURLの判定
  var currentUrl = location.href;
  var isHiddenSnackbarUrl = hiddenSnackbarUrlList.some(function (excludedUrl) {
    return currentUrl.includes(excludedUrl);
  });
  // スナックバー表示するかの判定
  var shouldShow = isMissionAchieved && !isHiddenSnackbarUserAgent && !isHiddenSnackbarUrl;
  if (!shouldShow) {
    console.info('[INFO] Snackbar not shown:', {
      isMissionAchieved,
      isHiddenSnackbarUserAgent,
      isHiddenSnackbarUrl
    });
    return;
  }

  // DOMのレンダリング
  var eventValue = missionType + '_snackbar_t001';
  var lpUrl = MISSION_CONST.PAGE_URLS.LP;
  var linkUrl = addLinkParam ? lpUrl + QUERY_PARAM + missionType : lpUrl;
  var snackbarHtml = '<div class="mission-snackbar js-snackbar">' + '<a href="' + linkUrl + '" class="mission-snackbar-link" data-portalarea="' + eventValue + '">' + '<p class="mission-snackbar-text">' + achieveText // 引数で受け取ったテキストを使用
  + '</p>' + '<div class="mission-snackbar-button">' + '詳細を見る' + '</div>' + '</a>' + '</div>';
  $('body').append(snackbarHtml);

  // 表示
  var $snackbar = $('.js-snackbar');
  $snackbar.addClass('is-show');
  // Analysis
  dataLayer.push({
    'event': 'DWEB_plusonemission_imp',
    'DWEB_plusonemission_imp_corner': eventValue
  });
};

// ------------------------------------------------------
// dポイント情報取得による表示切り替え
// ------------------------------------------------------
/**
 * dポイント情報取得APIより、ビジネスアカウント or dポイントクラブ非会員か判定
 * 上記ユーザー(ミッション非対象ユーザー)の場合: 専用モジュールを表示、後続処理を停止(Promiseをreject)
 * @returns {Promise<void>} 対象ユーザーの場合はresolve, 非対象ユーザーの場合はrejectされるPromise
 */
MISSION.checkDpointAccountStatus = function () {
  return new Promise(function (resolve, reject) {
    // [for Dev]
    if (MISSION.isDevelopment) {
      // 対象のユーザー時
      return resolve();
      // 非対象のユーザー時
      // $('.js-mission-list').remove();
      // $('.js-dpoint').addClass('is-show');
      reject(new Error('User is not eligible'));
    }

    // 開発環境以外は本番用URLを使用。
    var dpointInfoUrl = MISSION.isDevelopment ? MISSION_CONST.DATA_URLS.DPOINT_INFO.DEV : MISSION_CONST.DATA_URLS.DPOINT_INFO.PROD;
    var params = {
      'ptn_code': '0043'
    };
    $.ajax({
      type: 'GET',
      dataType: 'json',
      data: params,
      url: dpointInfoUrl,
      timeout: 3000,
      xhrFields: {
        withCredentials: true
      }
    }).then(function (data) {
      var resultCode = data.common.result_code;
      // 10EZ: ビジネスdアカウント, 10EP: dポイントクラブ非会員
      if (resultCode === '10EZ' || resultCode === '10EP') {
        $('.js-mission-list').remove();
        $('.js-dpoint').addClass('is-show');
        // 非対象ユーザー: 後続の関連処理は実行しない
        reject(new Error('User is not eligible for the mission (Business account or not a d POINT CLUB member).'));
      } else {
        // 対象ユーザー
        resolve();
      }
    }).fail(function (jqXHR, textStatus) {
      // APIエラー時: ミッションは利用可能として扱う(フォールバック)
      console.warn('dpoint info API failed, proceeding as eligible user. Status: ' + textStatus);
      resolve();
    });
  });
};

// ------------------------------------------------------
// ミッションの設定
// ------------------------------------------------------
/**
 * フロント用のミッションリストの取得
 * @returns {Promise<void>}
 */
MISSION.fetchMissionConfig = function () {
  var missionConfigUrl;
  if (MISSION.isDevelopment) {
    missionConfigUrl = MISSION_CONST.DATA_URLS.MISSION_CONFIG.LOCAL;
  } else if (MISSION.isStaging) {
    missionConfigUrl = MISSION_CONST.DATA_URLS.MISSION_CONFIG.STG;
  } else {
    missionConfigUrl = MISSION_CONST.DATA_URLS.MISSION_CONFIG.PROD;
  }
  return new Promise(function (resolve) {
    $.ajax({
      url: missionConfigUrl,
      type: 'GET',
      dataType: 'jsonp',
      jsonp: 'callback',
      jsonpCallback: 'missionConfig'
    }).then(function (data, status, xhr) {
      MISSION.missionConfig = data.productId || [];
      resolve();
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error('Failed to fetch mission config:', textStatus, errorThrown);
      MISSION.missionConfig = [];
      resolve();
    });
  });
};

// ------------------------------------------------------
// プロダクト処理判定
// ------------------------------------------------------
/**
 * 指定されたミッションが有効か(mission_config.jsのproductIdに含まれるか)を判定
 * @param {string} missionType
 * @returns {Promise<boolean>}
 */
MISSION.checkMissionActive = function (missionType) {
  return MISSION.fetchMissionConfig().then(function () {
    var config = MISSION.missionConfig || [];
    return config.includes(missionType);
  });
};

// ------------------------------------------------------
// ミッション情報
// ------------------------------------------------------
/**
 * ミッション情報取得APIをリクエスト(ミッションの一覧と達成状況)
 * @param {Object} params APIリクエストパラメータオブジェクト
 * @returns {Promise<{data: Object, xhr: Object}>} APIレスポンスデータとXHRオブジェクトで解決されるPromise
 */
MISSION.fetchMissionInfoApi = function (params) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: 'GET',
      dataType: 'jsonp',
      data: "params=" + encodeURI(JSON.stringify(params)),
      url: MISSION.MISSION_REQUEST_URL
    }).then(function (data, status, xhr) {
      if (data.status === 'ng') {
        console.error('fetchMissionInfoApi Error:', data);
        reject(new Error('API Error: status ng: ' + data.error_cause));
      } else {
        resolve({
          data: data,
          xhr: xhr
        });
      }
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error('fetchMissionInfoApi Ajax Error:', textStatus, errorThrown, jqXHR);
      reject(new Error('Ajax Error: ' + textStatus));
    });
  });
};

/**
 * 取得したミッション情報データに基づい処理する(データ整形・UI更新・分析)
 * @param {Object} result
 * @param {Object} result.data APIレスポンスデータ
 * @param {Object} result.xhr  XHRオブジェクト
 */
MISSION.processMissionInfoData = function (result) {
  // 1. データ整形・準備
  var preparedData = MISSION.prepareMissionData(result);
  if (!preparedData) return; // データ準備に失敗した場合は中断
  // 2. UI更新
  MISSION.updateMissionUI(preparedData);
  // 3. 分析データ送信
  MISSION.sendMissionStatusAnalytics(preparedData);
};

// -------------------------------
// ミッション情報: データ
// -------------------------------
/**
 * APIレスポンスからミッション関連データを整形・準備する
 * @param {Object} result
 * @param {Object} result.data APIレスポンスデータ
 * @param {Object} result.xhr  XHRオブジェクト
 * @returns {Object|null} 整形済みデータオブジェクト、またはエラー時にnull
 */
MISSION.prepareMissionData = function (result) {
  var data = result.data;
  var xhr = result.xhr;
  // 時刻取得: サーバーヘッダーの時刻取得失敗時 & 開発環境時(クロスオリジン制約)を考慮
  MISSION.originDateTime = null;
  var ResponseHeaderDate = xhr.getResponseHeader('date');
  if (ResponseHeaderDate) {
    MISSION.originDateTime = new Date(ResponseHeaderDate).getTime();
  } else {
    MISSION.originDateTime = new Date().getTime();
  }
  // 本日のミッションデータを抽出・セット
  var serverDateString = MISSION.getTodayString(MISSION.originDateTime);
  MISSION.extractDailyMission(data, serverDateString);
  // ミッション進捗(総数・達成数)を計算
  MISSION._calculateMissionProgress();
  // 各ミッションのステータスを取得
  var eachMissionStatus = MISSION.getMissionStatus();
  // ポイント報酬ステータスを取得
  var pointRewardStatus = MISSION.getPointRewardStatus();
  // 子ミッション(allex以外)が全て報酬獲得済みか
  var isAllMissionsRewarded = MISSION.MISSION_LENGTH > 0 && MISSION.rewardedLength === MISSION.MISSION_LENGTH;
  return {
    eachMissionStatus: eachMissionStatus,
    missionLength: MISSION.MISSION_LENGTH,
    rewardedLength: MISSION.rewardedLength,
    pointRewardStatus: pointRewardStatus,
    isAllMissionsRewarded: isAllMissionsRewarded
  };
};

/**
 * APIレスポンスから各ミッションの「本日」のデータを抽出 & MISSION.missionDataオブジェクトにセット
 * @param {Object} data APIレスポンスデータオブジェクト
 * @param {string} serverDateString サーバー時刻から算出した日付文字列(YYYYMMDD形式)
 * @param {Array<string>} [additionalKeys] 抽出対象に追加するミッションキーのリスト
 * @returns {void}
 */
MISSION.extractDailyMission = function (data, serverDateString, additionalKeys) {
  // ミッショングループ: 各ミッションのデータのまとまり
  var missionGroup = data.missionGroup || [];

  // ----------------------------------------------
  // 1. coreIdをキーとしたミッションデータのマップを作成
  // ----------------------------------------------
  var missionMap = {};
  var prefix = MISSION_CONST.MEDIA_ID + MISSION_CONST.SERVICE_ID; // 共通プレフィックス
  var datePattern = /^\d{8}/; // YYYYMMDD形式の正規表現

  missionGroup.forEach(function (mission) {
    var groupId = mission.missionGroupId;
    var coreId;
    // 共通プレフィックスの直後に日付(YYYYMMDD)があるかチェック
    var potentialDate = groupId.substring(prefix.length, prefix.length + 8);
    if (datePattern.test(potentialDate)) {
      // 日付がある場合: 共通プレフィックス + YYYYMMDD (12文字) を除去
      coreId = groupId.substring(12);
    } else {
      // 日付がない場合: 共通プレフィックス(4文字)のみ除去
      coreId = groupId.substring(4);
    }
    missionMap[coreId] = mission;
  });

  // ----------------------------------------------
  // 2. 対象のミッションデータを抽出・セット
  // ----------------------------------------------
  MISSION.missionData = {}; // 初期化
  // 処理対象のキーリストを作成
  var targetKeys = [];
  var hasAdditionalKeys = additionalKeys && additionalKeys.length > 0;
  if (!hasAdditionalKeys) {
    // LP: 設定ファイル全件 + くじ系ミッション
    targetKeys = (MISSION.missionConfig || []).concat(['lotterya', 'lotteryb', 'uplotterya']);
  } else {
    // プロダクト側(ミッション対象): 指定されたIDのみ処理
    targetKeys = additionalKeys;
  }
  targetKeys.forEach(function (key) {
    // APIレスポンスのID(lookupKey)を決定 くじ系は'ex'が付与されているため対応、それ以外はkeyそのまま
    var lookupKey = key;
    if (['lotterya', 'lotteryb', 'uplotterya'].includes(key)) {
      lookupKey += 'ex';
    }
    var missionData = missionMap[lookupKey] || {};
    // 日別のミッションデータのリストを取得
    var missionDailyList = missionData.mission || [];
    // 本日のミッションデータをセット
    MISSION.missionData[key] = MISSION.getTodayMission(missionDailyList, serverDateString) || {};
  });

  // ----------------------------------------------
  // 3. 本日のミッションIDを設定 (報酬獲得時に使用)
  // ----------------------------------------------
  MISSION.todayMissionIds = {};
  Object.keys(MISSION.missionData).forEach(function (key) {
    var _MISSION$missionData$2;
    MISSION.todayMissionIds[key] = ((_MISSION$missionData$2 = MISSION.missionData[key]) === null || _MISSION$missionData$2 === void 0 ? void 0 : _MISSION$missionData$2.missionId) || '';
  });
};

/**
 * デイリーのミッションデータの配列から、本日に合致したミッションデータを返す
 * @param {Array} missionDailyList 日別ミッションデータのリスト
 * @param {String} dateString      検索する日付文字列 (YYYYMMDD形式)
 * @returns {Object | undefined}   合致した最初のミッションを返す (見つからない場合は undefined)
 */
MISSION.getTodayMission = function (missionDailyList, dateString) {
  var matchingMission = missionDailyList.filter(function (mission) {
    return mission === null || mission === void 0 ? void 0 : mission.missionId.includes(dateString);
  });
  return matchingMission[0];
};

/**
 * ミッション設定(mission_config.js)を基にミッションの総数と達成済み数を計算 & MISSIONオブジェクトの進捗情報を更新
 * @private
 */
MISSION._calculateMissionProgress = function () {
  var validMissionCount = 0; // ミッションの数
  var rewardedCount = 0; // 獲得済のミッションの数
  var targetMissionKeys = MISSION.missionConfig || [];

  // 設定済みの各ミッションの状態を集計
  targetMissionKeys.forEach(function (key) {
    var missionData = MISSION.missionData[key];
    // データが存在する場合のみ集計
    var isValidMission = missionData && !$.isEmptyObject(missionData);
    if (!isValidMission) return;
    validMissionCount++;
    // 達成かつ報酬獲得済の場合
    var isRewarded = missionData.missionStatus === 1 && missionData.rewardStatus === 1;
    if (isRewarded) rewardedCount++;
  });
  MISSION.MISSION_LENGTH = validMissionCount;
  MISSION.rewardedLength = rewardedCount;
};

/**
 * 指定されたタイムスタンプ(ミリ秒)から日付文字列を返す
 * @param {number} timestamp UNIXタイムスタンプ(ミリ秒)
 * @returns {String} YYYYMMDD形式の日付文字列
 */
MISSION.getTodayString = function (timestamp) {
  var date = new Date(timestamp);
  var year = date.getFullYear();
  var month = ("0" + String(date.getMonth() + 1)).slice(-2);
  var day = ("0" + String(date.getDate())).slice(-2);
  return year + month + day;
};
/**
 * 各子ミッション(allex以外)のステータスをオブジェクト化したものを返す
 * 未達成: missionStatus: false, rewardStatus: false
 * 達成済: missionStatus: true,  rewardStatus: false
 * 獲得済: missionStatus: true,  rewardStatus: true
 * @returns {Object}
*/
MISSION.getMissionStatus = function () {
  var status = {};
  var keys = MISSION.missionConfig || [];
  keys.forEach(function (key) {
    var missionData = MISSION.missionData[key] || {};
    status[key] = {
      isAchieved: missionData.missionStatus === 1,
      isRewarded: missionData.missionStatus === 1 && missionData.rewardStatus === 1
    };
  });
  return status;
};
/**
 * 達成状況と獲得状況を返す
 * @returns {Object}
*/
MISSION.getPointRewardStatus = function () {
  var status = {
    isAchieved: false,
    isRewarded: false,
    earnRewardNum: null,
    earnRewardPoint: null
  };

  // LOTTERY_Aユーザーは通常くじ(lotterya)と高確率くじ(uplotterya)のいずれかを実行するため、両方のステータスを確認する
  if (MISSION.isLotteryAUser()) {
    var _MISSION$missionData$3, _MISSION$missionData$4, _MISSION$missionData$5, _MISSION$missionData$6;
    status = {
      // どちらかのミッションが達成されていれば達成済みとみなす
      isAchieved: ((_MISSION$missionData$3 = MISSION.missionData.lotterya) === null || _MISSION$missionData$3 === void 0 ? void 0 : _MISSION$missionData$3.missionStatus) === 1 || ((_MISSION$missionData$4 = MISSION.missionData.uplotterya) === null || _MISSION$missionData$4 === void 0 ? void 0 : _MISSION$missionData$4.missionStatus) === 1,
      isRewarded: ((_MISSION$missionData$5 = MISSION.missionData.lotterya) === null || _MISSION$missionData$5 === void 0 ? void 0 : _MISSION$missionData$5.rewardStatus) === 1 || ((_MISSION$missionData$6 = MISSION.missionData.uplotterya) === null || _MISSION$missionData$6 === void 0 ? void 0 : _MISSION$missionData$6.rewardStatus) === 1
    };
  } else if (MISSION.isLotteryBUser()) {
    var _MISSION$missionData$7, _MISSION$missionData$8;
    status = {
      isAchieved: ((_MISSION$missionData$7 = MISSION.missionData.lotteryb) === null || _MISSION$missionData$7 === void 0 ? void 0 : _MISSION$missionData$7.missionStatus) === 1,
      isRewarded: ((_MISSION$missionData$8 = MISSION.missionData.lotteryb) === null || _MISSION$missionData$8 === void 0 ? void 0 : _MISSION$missionData$8.rewardStatus) === 1
    };
  }
  return status;
};

// -------------------------------
// ミッション情報: 計測
// -------------------------------
/**
 * 分析データを送信する
 * @param {Object} preparedData MISSION.prepareMissionDataで準備されたデータ
 */
MISSION.sendMissionStatusAnalytics = function (preparedData) {
  var eachMissionStatus = preparedData.eachMissionStatus;
  var rewardedLength = preparedData.rewardedLength;
  var missionLength = preparedData.missionLength;
  var achievedLength = Object.values(eachMissionStatus).filter(function (element) {
    return element.isAchieved;
  }).length;
  var missionStatus = "".concat(missionLength, "_").concat(achievedLength, "_").concat(rewardedLength);
  dataLayer.push({
    'event': 'DWEB_plusonemission_status',
    'DWEB_plusonemission_user_status': missionStatus
  });
};

// -------------------------------
// ミッション情報: UI制御
// -------------------------------
/**
 * ミッション情報APIデータ関連UIを更新
 * @param {Object} preparedData MISSION.prepareMissionDataで準備されたデータ
 */
MISSION.updateMissionUI = function (preparedData) {
  var eachMissionStatus = preparedData.eachMissionStatus;
  var pointRewardStatus = preparedData.pointRewardStatus;
  var isAllMissionsRewarded = preparedData.isAllMissionsRewarded;

  // 初期化: スケルトンスクリーン削除
  $('.js-mission-card-skelton').remove();

  // カウントダウンタイマー
  MISSION.updateCountdownDisplay();

  // 全体のプログレスバー更新
  MISSION.updateTotalProgressBar({
    rewardedLength: MISSION.rewardedLength,
    missionLength: MISSION.MISSION_LENGTH
  });
  // 各ミッションカードのプログレスバー更新
  MISSION.updateEachMissionProgressBar();

  // 全ミッション達成時
  if (isAllMissionsRewarded) {
    MISSION.handleAllMissionsCompletedUI(pointRewardStatus);
  }
  // 全達成でない場合: ミッションカード表示制御
  MISSION.renderMissionCards(eachMissionStatus);
};

/**
 * 全ミッション達成時, 完了モジュール or くじ引きモジュール 表示制御
 * @param {Object} pointRewardStatus ポイント報酬のステータス
 */
MISSION.handleAllMissionsCompletedUI = function (pointRewardStatus) {
  // ------------------------------------------------------
  // くじ引きモジュール
  // ------------------------------------------------------
  if (!pointRewardStatus.isRewarded) {
    // くじ引き画面表示: くじミッション 未reward時
    MISSION.showLottery();
  } else {
    // くじ引き結果表示: くじミッション reward済時
    var lotteryMissionData = null;
    if (MISSION.isLotteryAUser()) {
      var _MISSION$missionData$9;
      // 高確率くじが実行済みかチェックし、実行済みならそのデータを優先する
      if (((_MISSION$missionData$9 = MISSION.missionData.uplotterya) === null || _MISSION$missionData$9 === void 0 ? void 0 : _MISSION$missionData$9.rewardStatus) === 1) {
        lotteryMissionData = MISSION.missionData.uplotterya;
      } else {
        lotteryMissionData = MISSION.missionData.lotterya;
      }
    } else if (MISSION.isLotteryBUser()) {
      lotteryMissionData = MISSION.missionData.lotteryb;
    }
    MISSION.showLotteryDone(lotteryMissionData.earnRewardNum, lotteryMissionData.earnRewardPoint);

    // 計測
    dataLayer.push({
      'event': 'DWEB_mission_point_rewarded'
    });
  }
};
/**
 * 各ミッションカードの表示・非表示を制御
 * ミッション設定(mission_config.js)とAPIレスポンスに基づき、以下の処理を行う
 * 1. 設定に含まれない、またはデータが存在しないミッションカードをDOMから削除
 * 2. 有効なミッションについて、達成状況(未達成・達成済・獲得済)に応じて表示を更新
 * @param {Object} eachMissionStatus 各ミッションのステータス(達成済みか, 報酬獲得済みか)
 */
MISSION.renderMissionCards = function (eachMissionStatus) {
  var missionKeys = MISSION.missionConfig || [];

  // 設定に含まれないカードがDOMにある場合: 削除
  $('.js-mission-card').each(function () {
    var type = $(this).data('mission-type');
    if (missionKeys.indexOf(type) === -1) {
      $(this).remove();
      $('.js-reward-card-' + type).remove();
    }
  });

  // 設定済みの各ミッションについて、データの有無&ステータスに基づき表示を制御
  missionKeys.forEach(function (key) {
    var status = eachMissionStatus[key];
    var $missionCard = $('.js-mission-' + key);
    var $rewardCard = $('.js-reward-card-' + key);
    var missionData = MISSION.missionData[key];

    // データが存在しない場合: DOM要素を削除、存在する場合は表示を更新
    if ($.isEmptyObject(missionData)) {
      $missionCard.remove();
      $rewardCard.remove();
    } else {
      MISSION.updateMissionCardDisplay($missionCard, $rewardCard, status);
    }
  });
};
/**
 * ミッションカードをステータス（未達成/達成済/獲得済）に応じて表示を切り替える
 * @param {Object} $missionCard  ミッション未達成カード jQueryオブジェクト
 * @param {Object} $rewardCard   リワードカード(ミッション達成済) jQueryオブジェクト
 * @param {Object} missionStatus そのミッションカードのステータスオブジェクト
 * @returns null
 */
MISSION.updateMissionCardDisplay = function ($missionCard, $rewardCard, missionStatus) {
  // 未達成時
  if (!missionStatus.isAchieved) {
    $missionCard.addClass('is-show');
    $rewardCard.remove();
  }
  // 達成済
  if (missionStatus.isAchieved && !missionStatus.isRewarded) {
    $missionCard.remove();
    $rewardCard.addClass('show');
  }
  // 獲得済
  if (missionStatus.isRewarded) {
    $missionCard.remove();
    $rewardCard.remove();
  }
};

/**
 * プログレスバー & 進捗数の更新
 */
MISSION.updateEachMissionProgressBar = function () {
  var missionTypes = MISSION.missionConfig || [];
  missionTypes.forEach(function (missionType) {
    var missionData = MISSION.missionData[missionType]; // 各ミッションのデータ

    // missionDataが存在しない or achievementConditionList が空の場合 何もしない
    if (!missionData || !missionData.achievementConditionList || !missionData.achievementConditionList.length) {
      return;
    }
    var requiredNum = missionData.achievementConditionList[0].achievementDetail[0].requiredNum;
    var operateNum = missionData.achievementConditionList[0].achievementDetail[0].operateNum;
    // ミッションカードのプログレスバー
    var $missionCard = $(".js-mission-".concat(missionType));
    MISSION.updateProgressBarValue($missionCard, requiredNum, operateNum);
    // モーダル内のプログレスバー
    var $missionModal = $(".js-mission-modal-".concat(missionType));
    MISSION.updateProgressBarValue($missionModal, requiredNum, operateNum);
  });
};
/**
 * プログレスバー & 進捗数 valueをセット
 * @param {Object} $target     対象のDOMのjQueryオブジェクト
 * @param {Number} requiredNum 達成に必要な数
 * @param {Number} operateNum  実行数
 */
MISSION.updateProgressBarValue = function ($target, requiredNum, operateNum) {
  $target.find('.js-denominator').text(requiredNum);
  $target.find('.js-numerator').text(operateNum);
  var progressRatio = operateNum / requiredNum * 100;
  $target.find('.js-mission-card-progress-value').css({
    'width': progressRatio + '%'
  });
};

/**
 * カウントダウンタイマー
 */
MISSION.updateCountdownDisplay = function () {
  // 既存のインターバルがある場合(クリアされず重複呼び出しされた場合）クリア
  if (MISSION.countdownIntervalId) {
    clearInterval(MISSION.countdownIntervalId);
    MISSION.countdownIntervalId = null;
  }
  var hourElement = document.getElementById('hour');
  var minuteElement = document.getElementById('minute');
  var secondElement = document.getElementById('second'); // for DEBUG
  if (!hourElement || !minuteElement) return;
  var currentDateTime = new Date(MISSION.originDateTime);
  var expireDateTime = new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate(), 23, 59, 59, 0).getTime();
  MISSION.timeLeftMs = expireDateTime - currentDateTime.getTime();

  // 基準時刻が日の終わりを過ぎていた場合: 残り時間を0にする
  if (MISSION.timeLeftMs < 0) {
    MISSION.timeLeftMs = 0;
  }
  function updateTimer() {
    if (MISSION.timeLeftMs === null) {
      console.error('updateTimer called but timeLeftMs is null.');
      clearInterval(MISSION.countdownIntervalId);
      MISSION.countdownIntervalId = null;
      return;
    }
    var timeLeftMs = MISSION.timeLeftMs;
    // カウントダウン終了時
    if (timeLeftMs <= 0) {
      hourElement.innerHTML = '00';
      minuteElement.innerHTML = '00';
      if (secondElement) secondElement.innerHTML = '00'; // for DEBUG
      clearInterval(MISSION.countdownIntervalId);
      MISSION.countdownIntervalId = null;
      MISSION.timeLeftMs = 0;
      return;
    }
    var hours = Math.floor(timeLeftMs % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    var minutes = Math.floor(timeLeftMs % (1000 * 60 * 60) / (1000 * 60));
    var seconds = Math.floor(timeLeftMs % (1000 * 60) / 1000); // for DEBUG
    hourElement.innerHTML = String(hours);
    minuteElement.innerHTML = String(minutes);
    if (secondElement) secondElement.innerHTML = String(seconds); // for DEBUG

    MISSION.timeLeftMs -= 1000; // 1秒減
  }
  updateTimer(); // 初期表示 即時実行

  if (MISSION.timeLeftMs > 0) {
    MISSION.countdownIntervalId = setInterval(updateTimer, 1000);
  } else {
    console.log('[DEBUG] No time left to count down, interval not started.');
  }
};

// ------------------------------------------------------
// 報酬獲得(リワード)
// ------------------------------------------------------
/**
 * 現在のUNIXタイムスタンプ(ミリ秒)とランダム文字列をハイフンで連結した文字列を生成する。
 * 例: "1678886400000-aBcDeFgHiJ"
 * 報酬獲得APIのadIdentifierパラメータに使用
 * @returns {string} タイムスタンプとランダム文字列を連結した文字列
 */
MISSION.generateTimestampAndRandomString = function () {
  var timestamp = Date.now(); // ミリ秒単位のUNIXタイムスタンプ
  var randomString = MISSION.generateRandomString();
  return timestamp + '-' + randomString;
};
/**
 * 指定された長さのランダムな英数字文字列を生成する
 * @param {number} [length=10] 生成する文字列の長さ(任意 デフォルトは10)
 * @returns {string} 生成されたランダム文字列
 */
MISSION.generateRandomString = function () {
  let length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  for (let i = 0; i < length; i++) {
    var randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
};

/**
 * 報酬獲得APIをリクエストする
 * @param {string} missionId  報酬を獲得するミッションID
 * @returns {Promise<Object>} APIレスポンスデータで解決されるPromise
 */
MISSION.fetchRewardApi = function (missionId) {
  return new Promise(function (resolve, reject) {
    var requestParam = {
      'requestKind': 4,
      'inputData': {
        'param': [{
          'missionId': missionId,
          'mediaId': MISSION_CONST.MEDIA_ID,
          'serviceId': MISSION_CONST.SERVICE_ID,
          'adIdentifier': MISSION.generateTimestampAndRandomString(),
          'earnRewardNumReturnFlg': 1
        }]
      }
    };
    $.ajax({
      type: 'GET',
      dataType: 'jsonp',
      data: "params=" + encodeURI(JSON.stringify(requestParam)),
      url: MISSION.MISSION_REQUEST_URL
    }).then(function (data) {
      // API自体の成否に関わらずresolve (rewardResultで判定するため)
      resolve(data);
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error('fetchRewardApi Ajax Error:', textStatus, errorThrown, jqXHR);
      reject(new Error('Ajax Error: ' + textStatus));
    });
  });
};

/**
 * 報酬獲得処理を行うクラス: 個別ミッション(ex系以外)
 * 報酬獲得APIを呼び出し、結果に応じて対象のリワードカードの表示を更新
 * その後ミッション情報全体を再取得してUIを最新化する。
 * @constructor
 * @param {Object}  params               パラメータオブジェクト
 * @param {string}  params.missionId     報酬を獲得するミッションID
 * @param {jQuery}  [params.$rewardCard] クリックされたリワードカードのjQueryオブジェクト
 */
MISSION.MissionReward = function (params) {
  var self = this;
  self.missionId = params.missionId;
  self.$rewardCard = params.$rewardCard;
  MISSION.fetchRewardApi(self.missionId).then(function (apiResponseData) {
    self.processRewardResult(apiResponseData, self.$rewardCard);
  }).catch(function (error) {
    console.error('Error fetching reward:', error);
    self.showRewardCardError(self.$rewardCard);
  });
};
MISSION.MissionReward.prototype = {
  /**
   * 報酬獲得APIの結果を処理、UI更新・エラー表示を行う
   * @param {Object} apiResponseData APIレスポンスデータ
   * @param {jQuery} $rewardCard     対象のリワードカード
   */
  processRewardResult: function (apiResponseData, $rewardCard) {
    if (apiResponseData.status === 'ng') {
      console.error('API status: ng', apiResponseData);
      this.showRewardCardError($rewardCard);
      return;
    }
    var rewardResult = apiResponseData.rewardResult;
    var isRewarded = rewardResult == 0 || rewardResult == 10; // 0:OK, 10:OK(はずれ)

    // 獲得結果NG時: エラー表示
    if (rewardResult == 7) {
      // 7: 報酬獲得期間外
      this.showRewardCardErrorExpired($rewardCard);
      return;
    } else if (!isRewarded) {
      // その他のNGケース
      this.showRewardCardError($rewardCard);
      return;
    }

    // 獲得成功時: カードと表示された可能性のあるエラーメッセージを非表示
    $rewardCard.next('.js-reward-result-announce').find('.js-reward-error').removeClass('is-active');
    $rewardCard.next('.js-reward-result-announce').find('.js-reward-expired').removeClass('is-active');
    $rewardCard.addClass('rewarded');

    // MISSION.rewardedLengthはページ表示時点の獲得済ミッション数, 今回クリックされた分(+1)を加算し全達成したかを判定する
    var estimatedRewardedLength = MISSION.rewardedLength + 1;
    // ユーザーがその日の最後のミッションを達成&報酬獲得した瞬間のみ計測
    if (estimatedRewardedLength === MISSION.MISSION_LENGTH) {
      dataLayer.push({
        'event': 'DWEB_mission_all_achieved'
      });
    }

    // ミッション情報取得: UIを最新状態にする為に再取得・処理（progressbarの更新, 完了モジュール表示判定 等）
    var params = {
      'requestKind': 3,
      'inputData': {
        'param': [{
          'mediaId': '01',
          'serviceId': 'a4',
          'cid': 'api01',
          'getKind': 2,
          earnRewardReturnFlg: 1
        }]
      }
    };
    MISSION.fetchMissionInfoApi(params).then(MISSION.processMissionInfoData);
  },
  /**
   * リワードカード: APIエラー/その他のNG時
   * @param {Object} $rewardCard リワード獲得カード(jQueryオブジェクト)
   */
  showRewardCardError: function ($rewardCard) {
    $rewardCard.next('.js-reward-result-announce').find('.js-reward-error').addClass('is-active');
  },
  /**
   * リワードカード: 獲得期間外時
   * @param {Object} $rewardCard リワード獲得カード(jQueryオブジェクト)
   */
  showRewardCardErrorExpired: function ($rewardCard) {
    $rewardCard.next('.js-reward-result-announce').find('.js-reward-expired').addClass('is-active');
  }
};

/**
 * くじ引きのアニメーションを表示
 * モーダル内でコマ送り画像を表示、最後にホワイトアウト効果を行う
 * アニメーション完了後、指定されたコールバック関数を実行
 * @param {function(): void} [callback] - アニメーション完了後に実行されるコールバック関数
 * @returns {void}
 */
function lotteryAnimation(callback) {
  var $animationModal = $('.js-lottery-anim-modal');
  var $images = $('.js-lottery-anim-image');
  var $whiteOverlay = $('.js-lottery-anim-overlay');
  var currentIndex = 0;
  var totalImages = $images.length;
  var animationInterval = 33;

  // モーダルを表示
  $animationModal.addClass('is-active');

  // アニメーションを実行
  var timerId = setInterval(function () {
    $images.hide().eq(currentIndex++).show();
    if (currentIndex >= totalImages) {
      clearInterval(timerId);

      // 白レイヤーの透明度 1000ミリ秒で不透明にアニメーション(ホワイトアウト効果)
      $whiteOverlay.css('opacity', 0).show().animate({
        'opacity': 1
      }, 1000, function () {
        // ホワイトアウトのアニメーション完了後
        // 自身とアニメーションモーダル削除
        $whiteOverlay.remove();
        $animationModal.removeClass('is-active').remove();
        if (typeof callback === 'function') {
          callback();
        }
      });
    }
  }, animationInterval);
}

/**
 * くじ引き
 * @constructor
 * @param {Object}  params           - パラメータオブジェクト
 * @param {string}  params.missionId - 報酬を獲得するくじ引きミッションのID
 */
MISSION.MissionLottery = function (params) {
  var self = this;
  self.missionId = params.missionId;
  MISSION.fetchRewardApi(self.missionId).then(function (apiResponseData) {
    self.processLotteryResult(apiResponseData);
  }).catch(function (error) {
    console.error('Error fetching all reward:', error);
    self.showRewardError();
  });
};
MISSION.MissionLottery.prototype = {
  /**
  * 全ミッション報酬獲得APIの結果を処理し、UI更新やエラー表示を行う
  * @param {Object} apiResponseData APIレスポンスデータ
  */
  processLotteryResult: function (apiResponseData) {
    if (apiResponseData.status === 'ng') {
      console.error('API status: ng', apiResponseData);
      this.showRewardError();
      return;
    }
    var rewardResult = apiResponseData.rewardResult;
    // rewardResultが0の場合のみ当選として扱う
    var isWin = rewardResult === 0;

    // rewardResult 0 以外のステータスはハズレ扱いにする
    var earnRewardNum = isWin ? apiResponseData.earnRewardNum : null;
    var rewardPoint = isWin ? apiResponseData.rewardPoint : null;

    // アニメーション後に結果を表示
    lotteryAnimation(function () {
      MISSION.showLotteryResult(earnRewardNum, rewardPoint);
    });
  },
  // Error時: デフォルト
  showRewardError: function () {
    $('.js-point-error').addClass('is-active');
  },
  // Error時: 獲得期間外
  showRewardErrorExpired: function () {
    $('.js-point-expired').addClass('is-active');
  }
};

// ------------------------------------------------------
// 新規/復帰ユーザー向け高確率くじ
// ------------------------------------------------------
/**
 * アカウント設定情報API 取得
 * @returns {Promise<Object>} APIレスポンスデータで解決されるPromise
 */
MISSION.fetchAccountInfo = function () {
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: 'POST',
      url: MISSION_CONST.DATA_URLS.ACCOUNT_INFO.GET,
      data: JSON.stringify({
        'daily_mission': '1'
      }),
      contentType: 'application/json',
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      }
    }).then(function (data, textStatus, jqXHR) {
      var _data$common;
      if ((data === null || data === void 0 || (_data$common = data.common) === null || _data$common === void 0 ? void 0 : _data$common.result_code) === '0000') {
        var _data$data;
        resolve({
          accountInfo: ((_data$data = data.data) === null || _data$data === void 0 ? void 0 : _data$data.daily_mission) || {},
          xhr: jqXHR
        });
      } else {
        var _data$common2;
        reject(new Error('API error or invalid result_code: ' + ((_data$common2 = data.common) === null || _data$common2 === void 0 ? void 0 : _data$common2.result_code)));
      }
    }).fail(function (jqXHR, textStatus, errorThrown) {
      reject(new Error('Ajax Error: ' + textStatus));
    });
  });
};

/**
 * * アカウント設定情報API 更新
 * @param {Object} dailyMissionData 更新するデータ
 * @returns {Promise<Object>} APIレスポンスデータで解決されるPromise
 */
MISSION.updateAccountInfo = function (dailyMissionData) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: 'POST',
      url: MISSION_CONST.DATA_URLS.ACCOUNT_INFO.UPDATE,
      data: JSON.stringify({
        'daily_mission': dailyMissionData
      }),
      contentType: 'application/json',
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      }
    }).then(function (data) {
      var _data$common3;
      if ((data === null || data === void 0 || (_data$common3 = data.common) === null || _data$common3 === void 0 ? void 0 : _data$common3.result_code) === '0000') {
        resolve(data);
      } else {
        var _data$common4;
        reject(new Error('API error or invalid result: ' + (data === null || data === void 0 || (_data$common4 = data.common) === null || _data$common4 === void 0 ? void 0 : _data$common4.result_code)));
      }
    }).fail(function (jqXHR, textStatus, errorThrown) {
      reject(new Error('Ajax Error: ' + textStatus));
    });
  });
};

/**
 * [for DEBUG] URLパラメータに応じてアカウント情報をリセットする
 * アカウント情報を空のオブジェクトで更新(初回ユーザーの状態) ?debug_reset_mission_account=true
 */
(function () {
  try {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug_reset_mission_account')) {
      console.log('[DEBUG] Resetting mission account info...');
      // daily_missionに空のオブジェクトを送信してデータをリセット
      MISSION.updateAccountInfo({}).then(function () {
        console.log('[DEBUG] Mission account info reset successfully.');
        alert('ミッションのユーザー情報をリセットしました。ページをリロードします。');
        // 再実行を防ぐためにURLからパラメータを削除&リロード
        urlParams.delete('debug_reset_mission_account');
        window.location.search = urlParams.toString();
      }).catch(function (error) {
        console.error('[DEBUG] Failed to reset mission account info:', error);
        alert('ミッションのユーザー情報のリセットに失敗しました。');
      });
    }
  } catch (e) {
    console.error('Error in debug reset logic:', e);
  }
})();

/**
 * 高確率くじを実行すべきか判定 & 対応するミッションタイプと更新データを返す
 * @returns {Promise<{missionType: string, updateData: Object|null}>}
 */
MISSION.determineLotteryAction = function () {
  return MISSION.fetchAccountInfo().then(function (result) {
    var accountInfo = result.accountInfo;
    var xhr = result.xhr;

    // --------------------------------------------------
    // サーバー時刻 取得
    // --------------------------------------------------
    var originDateTime = null;
    var responseHeaderDate = xhr.getResponseHeader('date');
    if (responseHeaderDate) {
      originDateTime = new Date(responseHeaderDate).getTime();
    } else {
      originDateTime = new Date().getTime(); // 取得失敗時はクライアント時刻でフォールバック
    }
    var todayStr = MISSION.getTodayString(originDateTime);

    // --------------------------------------------------
    // ユーザー情報 取得・初期化
    // --------------------------------------------------
    // 最後にくじを引いた日付(YYYYMMDD), 存在しない場合はnull
    var lastUpdateStr = accountInfo.update || null;
    // 高確率くじの実行回数を数値に変換, 存在しない場合は0をセット(初回ユーザー)
    var lotteryCount = parseInt(accountInfo.new_lottery_count, 10) || 0;
    var isFirstTimeUser = !lastUpdateStr; // 初回ユーザー: 最終更新日(lastUpdateStr)が存在しない場合
    var isReturningUser = false; // 復帰ユーザーか: 最後にくじを引いてから一定期間が経過したユーザー
    var isUpLotteryTarget = false; // 高確率くじの対象ユーザーか

    // --------------------------------------------------
    // 復帰ユーザー判定, 最終利用日から一定期間経過か
    // --------------------------------------------------
    if (!isFirstTimeUser) {
      var lastUpdateDate = new Date(parseInt(lastUpdateStr.substring(0, 4), 10),
      // year
      parseInt(lastUpdateStr.substring(4, 6), 10) - 1,
      // month (0-indexed)
      parseInt(lastUpdateStr.substring(6, 8), 10) // day
      );
      // 復帰ユーザーと判定するための基準日
      var returnUserThresholdDate = new Date(lastUpdateDate);
      returnUserThresholdDate.setDate(returnUserThresholdDate.getDate() + MISSION_CONST.UPLOTTERY_RESET_DAYS);
      // 日付のみで比較
      var today = new Date(originDateTime);
      today.setHours(0, 0, 0, 0);
      isReturningUser = today >= returnUserThresholdDate;
    }

    // --------------------------------------------------
    // ユーザー種別に応じ、高確率くじ対象フラグと実行回数を設定
    // --------------------------------------------------
    var newLotteryCount = lotteryCount; // デフォルトでは現在のカウントを維持
    var isWithinMaxCount = lotteryCount < MISSION_CONST.UPLOTTERY_MAX_COUNT;
    if (isFirstTimeUser || isReturningUser) {
      // ユーザー種別: 初回 or 復帰ユーザー
      isUpLotteryTarget = true;
      newLotteryCount = 1; // カウントをリセット
    } else if (isWithinMaxCount) {
      // ユーザー種別: 期間内ユーザー & 実行上限回数に未達
      isUpLotteryTarget = true;
      newLotteryCount = lotteryCount + 1;
    }

    // --------------------------------------------------
    // 高確率くじの対象かどうかで返却値を分岐
    // --------------------------------------------------
    if (isUpLotteryTarget) {
      // 高確率くじの場合: UPLOTTERY_Aを実行 & アカウント情報更新用のデータを返す
      return {
        missionType: MISSION.TYPE.UPLOTTERY_A,
        updateData: {
          update: todayStr,
          new_lottery_count: String(newLotteryCount)
        }
      };
    } else {
      // 高確率くじ対象外の場合: LOTTERY_Aを実行 & アカウント情報の最終更新日のみを更新
      return {
        missionType: MISSION.TYPE.LOTTERY_A,
        updateData: {
          update: todayStr,
          new_lottery_count: String(lotteryCount) // カウントは維持
        }
      };
    }
  }).catch(function (error) {
    console.error('高確率くじの判定またはアカウント情報取得に失敗しました。通常のくじを実行します。', error);
    // エラー時は通常くじを実行 & DBは更新しない
    return {
      missionType: MISSION.TYPE.LOTTERY_A,
      updateData: null
    };
  });
};