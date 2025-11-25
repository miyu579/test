jQuery(function($){
  $(window).on("scroll", function() {
    if ($(this).scrollTop() > 0) {
      $('.closeinfo_popup').fadeIn(300); 
    } else {
      $('.closeinfo_popup').fadeOut(300);
    }
  });
});