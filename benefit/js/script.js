/*sticky navigation
==============================*/
document.addEventListener("DOMContentLoaded", function() {
	// 追従バー内メニュー用のの単・テキスト・追加の表示領域をそれぞれ取得
  const menuBtn = document.getElementById("menu-btn"); // sp側メニュー用ボタン
  const menuText = document.querySelector(".nav_item.menu"); // pc側メニューテキスト
  const menuText_span = menuText.querySelector("span"); // pc側メニューテキストspanタグ（hover時の下線用）
  const menuSlide = document.getElementById("menu-slide"); // sp側追加の表示領域
  const menuContainer = document.getElementById("menu-container"); //pc側追加の表示領域
	
	// 使用デバイスがPCかどうかの判定する関数
	function device_pc() {
    return window.matchMedia("(hover: hover)").matches; // マウスホバーをサポートするデバイスなら、戻り値としてtrueを返す
  }

	// メニューボタン・テキストをクリックした際の処理(sp・tabletOnly)
  menuBtn.addEventListener("click", function(event) {
    event.stopPropagation(); // 親要素へのイベント伝播を阻止する処理
    if (window.innerWidth >= 1100) return;
    menuSlide.classList.toggle("show");
    menuBtn.classList.toggle("active");
  });
  menuText.addEventListener("click", function(event) {
    event.stopPropagation(); // 親要素へのイベント伝播を阻止する処理
    if (window.innerWidth >= 1100) return;
    menuSlide.classList.toggle("show");
    menuBtn.classList.toggle("active");
  });

	// PC側限定処理
	if (device_pc()) {
		// メニューテキストをクリックした際の処理
		menuText.addEventListener("click", function(event) {
			if (window.innerWidth >= 1100) {
				event.stopPropagation();
				if (!menuContainer.classList.contains("show")) {
					menuContainer.classList.add("show");
					menuText_span.style.borderBottom = '2px solid #1eaa39';
				} else {
					menuContainer.classList.remove("show");
					menuText_span.style.borderBottom = '2px solid transparent';
				}
			}
		});
		
		// メニューor追加の表示領域をマウスオーバーした際の処理
		menuText.addEventListener("mouseenter", function() {
			if (window.innerWidth >= 1100) {
				menuContainer.classList.add("show");
				menuText_span.style.borderBottom = '2px solid #1eaa39';
			}
		});
		menuContainer.addEventListener("mouseenter", function() {
			if (window.innerWidth >= 1100) {
				menuContainer.classList.add("show");
				menuText_span.style.borderBottom = '2px solid #1eaa39';
			}
		});

		// メニューor追加の表示領域からマウスカーソルを離した際の処理
		menuText.addEventListener("mouseleave", function() {
			if (window.innerWidth >= 1100) {
				menuContainer.classList.remove("show");
				menuText_span.style.borderBottom = '2px solid transparent';
			}
		});
		menuContainer.addEventListener("mouseleave", function() {
			if (window.innerWidth >= 1100) {
				menuContainer.classList.remove("show");
				menuText_span.style.borderBottom = '2px solid transparent';
			}
		});
	}

	// 追加の表示領域の外をクリックした際に閉じる処理
  document.addEventListener("click", function(event) {
    if (window.innerWidth >= 1100) {
      if (!menuContainer.contains(event.target) && event.target !== menuText) {
				menuContainer.classList.remove("show");
				menuText_span.style.borderBottom = '2px solid transparent';
      }
    } else {
      if (!menuSlide.contains(event.target) && event.target !== menuBtn) {
        menuSlide.classList.remove("show");
        menuBtn.classList.remove("active");
      }
    }
  });
});
/*============================*/


/*smoothScroll
==============================*/
document.addEventListener('DOMContentLoaded', function () {
  const links = document.querySelectorAll('a[href^="#"]'); // ページ内アンカーリンクに該当するaタグをすべて取得

  links.forEach(link => { // 取得したaタグが複数存在する場合、そのひとつひとつに対して処理を行うループ
    link.addEventListener('click', function (event) { // ▼ここから内側はアンカーリンクをクリックしたときの動作処理▼
      event.preventDefault();

      let navHeight = 0; // 追従バーの高さ(PC・SPで値が変わるため、初期値を0で設定)

      if (window.innerWidth >= 1100) {
        const menuNav = document.querySelector('.sticky_block'); // 追従バーを取得
        if (menuNav) { // 追従バーの存在確認(エラー回避用)
          navHeight = menuNav.offsetHeight; // 追従バーの高さを取得
        }
      }
			
      const href = this.getAttribute('href'); // aタグ内のhrefを取得
      const target = (href === '#' || href === '') ? document.documentElement : document.querySelector(href); // 飛ばす先となる対象

      if (!target) return; // targetが存在しない場合、処理から抜ける(エラー回避用)

      const position = target.offsetTop; // アンカーリンクを押した際に飛ばす位置
      
      window.scrollTo({
        top: position - navHeight, // positionから追従バーの高さ(navHeight)分上にずらす
        behavior: 'smooth'
      });
    });
  });
});

/*============================*/