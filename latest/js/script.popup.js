jQuery(window).on("scroll", function ($) {
  if (jQuery(this).scrollTop() > 0) {
    jQuery('.popup').show(1000);
  } else {
    jQuery('.popup').hide();
  }
});

//ポップアップバナーの閉じるボタンがクリックされた場合の処理
$('.popup-close').on('click', function () {
    $('.popup').addClass('hidden');
});