"use strict";

var MISSION = MISSION || {};
$(function () {
  MISSION.checkDevice() // デバイス判定
  .then(function (isTargetDevice) {
    if (!isTargetDevice) {
      console.info('[INFO]: Mission LP button not shown: isTargetDevice: ', isTargetDevice);
      return false;
    }
    return true;
  }).then(function (isTargetDevice) {
    if (!isTargetDevice) {
      console.info('[INFO] Not a target device.');
      return;
    }
    // Cookieが存在する場合、有効期限を延長(for ITP)
    MISSION.extendLastActiveTimeCookie();
    // ヘッダーボタンとフローティング表示を動的に切替
    manageMissionLinkDisplay();
  }).catch(function (error) {
    console.error('Error:', error);
  });

  /**
   * 通知バッジを表示すべきか判定
   * Cookieに保存された最終アクセス日時が今日より前の場合にtrueを返す
   * @returns {boolean} バッジを表示すべき場合はtrue
   */
  function shouldShowNoticeBadge() {
    var YYYYMMDD_LENGTH = 8;
    var DATE_FORMAT_REGEX = /^\d{8}$/;
    var cookieName = MISSION_CONST.LAST_ACTIVE_COOKIE_NAME;
    var lastActiveTime = MISSION.getCookieValue(cookieName); // 'YYYYMMDDHHMMSS' or undefined

    // Cookieが存在しない、または'YYYYMMDD'として扱える最低限の長さがない場合は表示しない
    if (!lastActiveTime || lastActiveTime.length < YYYYMMDD_LENGTH) {
      return false;
    }

    // Cookieの日付部分(先頭8文字)を取得
    var lastActiveDate = lastActiveTime.substring(0, YYYYMMDD_LENGTH);

    // 日付が 'YYYYMMDD' 形式（8桁の数字）であるか正規表現でチェック
    if (!DATE_FORMAT_REGEX.test(lastActiveDate)) {
      console.warn('[WARN] Invalid date format in cookie:', lastActiveDate);
      return false;
    }

    // 今日の日付を'YYYYMMDD'形式で取得
    var today = MISSION.getTodayString(new Date());
    // Cookieの日付が今日より前の場合にtrueを返す
    return lastActiveDate < today;
  }

  /**
   * ヘッダーボタンとフローティングバナーの表示の切り替え
   * 画面幅とページテーマに応じ動的に管理
   */
  function manageMissionLinkDisplay() {
    var NARROW_DEVICE_BREAKPOINT = 360;
    var currentComponent = null; // 表示中のコンポーネントを保持

    /**
     * 現在の表示条件（画面幅）を取得
     * @returns {{isNarrowDevice: boolean}}
     */
    function getDisplayConditions() {
      var isNarrowDevice = window.innerWidth < NARROW_DEVICE_BREAKPOINT;
      return {
        isNarrowDevice: isNarrowDevice
      };
    }

    /**
     * 表示条件に基づき、表示すべきコンポーネントのクラスを決定する
     * @param {{isNarrowDevice: boolean}} conditions - 表示条件
     * @returns {Function|null} 表示すべきコンポーネントのコンストラクタ、またはnull
     */
    function determineComponentToShow(conditions) {
      // ヘッダーボタンの表示条件: 画面幅が360px以上
      var shouldShowHeaderButton = !conditions.isNarrowDevice;
      if (shouldShowHeaderButton) {
        return MISSION.ShowHeaderButton;
      }

      // ヘッダーボタン以外はフローティングバナーを表示する、有効期限をチェックし有効期間時内ならば
      if (MISSION.hasActivePeriodExpired()) {
        console.info('[INFO] Floating banner not shown: Exceeded active period.');
        return null; // 有効期限切れなら何も表示しない
      }
      return MISSION.ShowFloating;
    }

    /**
     * @summary UIコンポーネントの表示を更新する。
     * @description
     * 現在の画面幅やページテーマに基づいて、表示すべきUIコンポーネント（ヘッダーボタンまたはフローティングバナー）を決定する
     * 現在の表示状態と比較し、変更が必要な場合のみ、既存のコンポーネントを破棄して新しいコンポーネントを生成・表示する
     * 初回表示時とウィンドウのリサイズ時に実行する
     * @effects DOM操作を行いcurrentComponent変数を更新する
     */
    var updateDisplay = function () {
      var conditions = getDisplayConditions();
      var ComponentToShow = determineComponentToShow(conditions);

      // 1. 表示すべきコンポーネントが既に表示されているか
      var isCorrectComponentShowing = ComponentToShow && currentComponent instanceof ComponentToShow;
      // 2. 何も表示すべきではない & 何も表示されていない
      var isCorrectlyAbsent = !ComponentToShow && !currentComponent;

      // 現在の状態が正しければUI更新処理は不要 終了
      if (isCorrectComponentShowing || isCorrectlyAbsent) {
        return;
      }

      // 既存のコンポーネントがあれば破棄
      if (currentComponent && typeof currentComponent.destroy === 'function') {
        currentComponent.destroy();
        currentComponent = null;
      }

      // 新しいコンポーネントを生成&表示
      if (ComponentToShow) {
        currentComponent = new ComponentToShow();
        // 通知バッジの表示判定
        if (shouldShowNoticeBadge()) {
          $('.js-mission-floating-link, .js-mission-button').addClass('is-notice-active');
        }
      }
      console.log('[INFO] isNarrowDevice:', conditions.isNarrowDevice, 'ComponentToShow:', ComponentToShow ? ComponentToShow.name : 'null');
    };

    // 初回表示を実行
    updateDisplay();
    // 画面リサイズ時に表示を更新するためイベントリスナーを登録
    window.addEventListener('resize', updateDisplay);
  }

  /**
   * LP導線: フローティングバナー表示
   * ミッションページへの導線ボタン(フローティングバナー)を表示するクラス
   * @constructor
   */
  MISSION.ShowFloating = function ShowFloating() {
    this.SCROLL_RANGE = 30;
    // スクロールイベントハンドラをインスタンスにバインドして、後で削除できるようにする
    this.scrollHandler = this.onScroll.bind(this);
    this.render();
    this.show();
  };
  MISSION.ShowFloating.prototype = {
    render: function () {
      var eventValue = 'top_misshionFloat_001';
      var lpUrl = MISSION_CONST.PAGE_URLS.LP;
      this.floating = "<div class=\"mission-floating js-mission-floating\">\n          <a href=\"".concat(lpUrl, "\" class=\"mission-floating-link js-mission-floating-link\" data-portalarea=\"").concat(eventValue, "\"></a>\n        </div>");
      $('body').append(this.floating);
      dataLayer.push({
        'event': 'DWEB_plusonemission_imp',
        'DWEB_plusonemission_imp_corner': eventValue
      });
    },
    updatePosition: function () {
      if (window.scrollY > this.SCROLL_RANGE) {
        $('.js-mission-floating').addClass('is-active');
      } else {
        $('.js-mission-floating').removeClass('is-active');
      }
    },
    onScroll: function () {
      this.updatePosition();
    },
    show: function () {
      this.updatePosition(); // 初期表示の為の初期実行(現在のスクロール位置をチェック, 画面途中位置で画面リロードされた場合の考慮）
      window.addEventListener('scroll', this.scrollHandler, {
        passive: true
      });
    },
    destroy: function () {
      // イベントリスナーとDOM要素をクリーンアップ
      window.removeEventListener('scroll', this.scrollHandler);
      $('.js-mission-floating').remove();
    }
  };

  /**
   * LP導線: Header Button 表示
   * ヘッダーにミッションページへの導線ボタンを表示するクラス
   * dmenu TOPのヘッダーにある「毎日くじ」ボタンの前にミッションLPへのリンクボタンを挿入
   * @constructor
   */
  MISSION.ShowHeaderButton = function ShowHeaderButton() {
    this.main();
  };
  MISSION.ShowHeaderButton.prototype = {
    main: function () {
      // ボタンのレンダリング
      var eventValue = 'top_misshionLink_001';
      var lpUrl = MISSION_CONST.PAGE_URLS.LP;
      this.button = "<a href=\"".concat(lpUrl, "\" class=\"mission-button js-mission-button\" data-portalarea=\"").concat(eventValue, "\"></a>");
      $('#Hed_Kuji').before(this.button);

      // GTMイベント送信
      dataLayer.push({
        'event': 'DWEB_plusonemission_imp',
        'DWEB_plusonemission_imp_corner': eventValue
      });

      // 毎日くじの1等増額キャンペーンが開催中かを取得, 開催中ならボタンにクラスを追加しレイアウト調整する
      var topKujiPointupUrl;
      if (MISSION.isDevelopment) {
        topKujiPointupUrl = MISSION_CONST.DATA_URLS.TOP_KUJI_POINTUP.LOCAL;
      } else if (MISSION.isStaging) {
        topKujiPointupUrl = MISSION_CONST.DATA_URLS.TOP_KUJI_POINTUP.STG;
      } else {
        topKujiPointupUrl = MISSION_CONST.DATA_URLS.TOP_KUJI_POINTUP.PROD;
      }
      $.ajax({
        url: topKujiPointupUrl,
        dataType: 'json'
      }).done(function (data) {
        if (data) {
          var isKujiCampaignActive = data.pointup_cp_flg == 1;
          if (isKujiCampaignActive) {
            $('.mission-button').addClass('is-kuji-campaign-active');
          }
        }
      }).fail(function (jqXHR, textStatus, errorThrown) {
        console.error('Failed to fetch kuji_solution.json. Status:', textStatus, 'Error:', errorThrown, 'Response:', jqXHR.responseText);
      });
    },
    destroy: function () {
      // DOM要素をクリーンアップ
      $('.mission-button').remove();
    }
  };
});