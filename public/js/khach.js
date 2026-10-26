(() => {
  const MON = window.MON || [],
    N = MON.length;
  if (!N) return; // chưa có món nào trong DB
  const STEP = 360 / N,
    R = 58; // R: bán kính vòng món (vh)
  const vong = $("#vong"),
    mons = [...vong.querySelectorAll(".mon")];
  let idx = 0;
  const hang = new Map(); // id món -> { m, sl, cho }

  function cap() {
    const rg = -idx * STEP;
    vong.style.transform = `rotate(${rg}deg)`;
    mons.forEach((el, i) => {
      el.style.transform = `rotate(${i * STEP}deg) translateY(-${R}vh) rotate(${-(rg + i * STEP)}deg) translate(-50%,-50%)`;
      let d = Math.abs((((i - idx) % N) + N) % N);
      d = Math.min(d, N - d);
      el.className = "mon d" + Math.min(d, 2) + (MON[i].conBan ? "" : " het");
    });
  }
  const xoay = (k) => {
    if (N < 2) return;
    idx += k;
    cap();
    Am.phat("xoay");
  };
  const trai = $("#trai"),
    phai = $("#phai");
  if (trai) trai.onclick = () => xoay(-1);
  if (phai) phai.onclick = () => xoay(1);
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") xoay(-1);
    if (e.key === "ArrowRight") xoay(1);
  });

  vong.addEventListener("click", (e) => {
    const el = e.target.closest(".mon");
    if (!el) return;
    const i = +el.dataset.i,
      d = (((i - idx) % N) + N) % N;
    if (d === 0) moMon(MON[i]);
    else xoay(d <= N / 2 ? d : d - N); // bấm món bên cạnh -> xoay tới món đó
  });

  // Đơn gọi món hiện chỉ lưu tạm trên trình duyệt (DB chưa có bảng đơn hàng)
  function moMon(m) {
    const cho = Math.floor(Math.random() * 4) + 2; // 2-5 phút
    const nl = m.nguyenLieu.map((n) => esc(n.ten)).join(", ");
    const nut = m.conBan
      ? `<button class="nut nut-phu" data-a="hang">Thêm vào hàng chờ</button><button class="nut" data-a="ngay">Đặt ngay</button>`
      : `<button class="nut" data-a="dong" >Đóng</button>`;
    const h = hop(`<div class="anh-mon to">${esc(m.icon)}</div><h2>${esc(m.ten)}</h2>
      <p class="gia">${vnd(m.gia)}</p>
      ${m.moTa ? `<p>${esc(m.moTa)}</p>` : ""}
      <p class="phu-chu-nho">${esc(m.loai)}${m.dauBep ? " · Đầu bếp " + esc(m.dauBep) : ""}</p>
      ${nl ? `<p class="phu-chu-nho">Nguyên liệu: ${nl}</p>` : ""}
      ${m.conBan ? `<p>Dự kiến chờ khoảng <b>${cho} phút</b></p>` : `<p><b>Món này hiện đã hết.</b></p>`}
      <div class="nut-hang"><a class="nut nut-phu" href="/dishes/${m.id}">Chi tiết</a>${nut}</div>`);
    h.el.addEventListener("click", (e) => {
      const a = e.target.dataset.a;
      if (a === "dong") h.dong();
      if (a === "ngay") {
        Am.phat("ding");
        bao(`Đã gửi món ${m.ten}, chờ khoảng ${cho} phút`);
        h.dong();
      }
      if (a === "hang") {
        const c = hang.get(m.id) || { m, sl: 0, cho };
        c.sl++;
        c.cho = Math.max(c.cho, cho);
        hang.set(m.id, c);
        capNhat();
        Am.phat("them");
        bao(`Đã thêm ${m.ten} vào hàng chờ`);
        h.dong();
      }
    });
  }

  const nutHang = $("#nut-hang");
  const capNhat = () =>
    (nutHang.textContent = `Hàng chờ (${[...hang.values()].reduce((s, c) => s + c.sl, 0)})`);
  nutHang.onclick = () => {
    const ds = [...hang.values()];
    if (!ds.length) return bao("Hàng chờ đang trống");
    const tong = ds.reduce((s, c) => s + c.sl * c.m.gia, 0);
    const h =
      hop(`<h2>Hàng chờ</h2>${ds.map((c) => `<div class="dong-hang"><span>${esc(c.m.ten)} × ${c.sl}</span><span>${vnd(c.sl * c.m.gia)}</span><button class="xoa-nl" data-x="${c.m.id}" aria-label="Bỏ món">×</button></div>`).join("")}
      <p class="gia" style="margin-top:12px">Tổng: ${vnd(tong)}</p>
      <div class="nut-hang"><button class="nut nut-phu" data-a="dong">Đóng</button><button class="nut" data-a="dat">Đặt tất cả</button></div>`);
    h.el.addEventListener("click", (e) => {
      if (e.target.dataset.x) {
        hang.delete(+e.target.dataset.x);
        capNhat();
        h.dong();
        nutHang.click();
      }
      if (e.target.dataset.a === "dong") h.dong();
      if (e.target.dataset.a === "dat") {
        Am.phat("ding");
        bao(
          `Đã gửi ${ds.length} món, món lâu nhất khoảng ${Math.max(...ds.map((c) => c.cho))} phút`,
        );
        hang.clear();
        capNhat();
        h.dong();
      }
    });
  };
  cap();
})();
