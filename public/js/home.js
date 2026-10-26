(() => {
  const pho = $("#pho");
  let x = 0,
    v = 0,
    dn = false,
    sx = 0,
    x0 = 0,
    last = 0,
    moved = 0;
  const min = () => Math.min(0, innerWidth - pho.scrollWidth);
  // lớp xa trôi chậm, lớp gần (cột điện + dây) trôi nhanh hơn phố
  const LOP = [
    [".xa1", 0.12],
    [".xa2", 0.35],
    [".truoc", 1.3],
  ].map(([s, k]) => [$(s), k]);
  const set = (n) => {
    x = Math.max(min(), Math.min(0, n));
    pho.style.transform = `translateX(${x}px)`;
    LOP.forEach(([e, k]) => (e.style.backgroundPositionX = x * k + "px"));
  };

  pho.addEventListener("pointerdown", (e) => {
    dn = true;
    moved = 0;
    sx = last = e.clientX;
    x0 = x;
    v = 0;
    pho.classList.add("keo");
  });
  addEventListener("pointermove", (e) => {
    if (!dn) return;
    moved = Math.max(moved, Math.abs(e.clientX - sx));
    v = e.clientX - last;
    last = e.clientX;
    set(x0 + e.clientX - sx);
  });
  addEventListener("pointerup", () => {
    if (!dn) return;
    dn = false;
    pho.classList.remove("keo");
    (function quanTinh() {
      if (dn || Math.abs(v) < 0.4) return;
      set(x + v);
      v *= 0.94;
      requestAnimationFrame(quanTinh);
    })();
  });
  addEventListener("wheel", (e) => set(x - (e.deltaX || e.deltaY)), {
    passive: true,
  });

  // bấm (không kéo) vào quán Ba Cô Gái -> hộp chọn vai
  // Hộp chọn vai là <form method="post" action="/login"> thật (server đặt cookie role rồi redirect 303);
  // JS chỉ chen hiệu ứng chuyển cảnh trước khi gửi form.
  const hopVai = $("#hop-vai"),
    form = $("#form-vai"),
    vao = $("#vao");
  pho.addEventListener("click", (e) => {
    if (moved < 6 && e.target.closest(".nha-ba")) {
      hopVai.hidden = false;
      Am.phat("mo");
    }
  });
  form.addEventListener("change", () => (vao.disabled = false));
  $("#de-sau").onclick = () => (hopVai.hidden = true);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hopVai.hidden = true;
    chuyenCanh(() => form.submit()); // form.submit() không kích hoạt lại sự kiện submit
  });
})();
