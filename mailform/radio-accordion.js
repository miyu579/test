document.addEventListener("DOMContentLoaded", function () {
  const radioWrappers = document.querySelectorAll('.radioWrapper');
  const radioButtons = document.querySelectorAll('.radioButton');
  const accordionContents = document.querySelectorAll('.accordion_content');

  // ✅ ラジオ枠全体をクリック可能にする処理
  radioWrappers.forEach(wrapper => {
    wrapper.addEventListener("click", function () {
      const radio = wrapper.querySelector('.radioButton');
      if (radio && !radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change")); // 下のイベント連動用
      }
    });
  });

  // ✅ ラジオボタン変更時に背景＆アコーディオン切り替え
  function updateUI() {
    // 背景色切り替え
    radioWrappers.forEach(wrapper => wrapper.classList.remove('active'));

    radioButtons.forEach((radio, index) => {
      const wrapper = radio.closest('.radioWrapper');
      if (radio.checked && wrapper) {
        wrapper.classList.add('active');
      }

      // アコーディオン切り替え
      accordionContents.forEach((content, i) => {
        if (radio.checked && radio.value === "new_mail" && i === 0) {
          content.classList.add('open');
        } else {
          content.classList.remove('open');
        }
      });
    });
  }

  // ✅ 初期化
  updateUI();
  radioButtons.forEach(radio => {
    radio.addEventListener('change', updateUI);
  });
});
