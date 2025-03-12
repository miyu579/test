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
    if (window.innerWidth >= 1101) return;
    menuSlide.classList.toggle("show");
    menuBtn.classList.toggle("active");
  });
  menuText.addEventListener("click", function(event) {
    event.stopPropagation(); // 親要素へのイベント伝播を阻止する処理
    if (window.innerWidth >= 1101) return;
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
    if (window.innerWidth >= 1101) {
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