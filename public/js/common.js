const $ = (s, r = document) => r.querySelector(s);
const vnd = (n) => Number(n).toLocaleString("vi-VN") + "đ";
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const SAC_LA = ["#5d9a52", "#7db35f", "#3f7d46", "#c9a43a"];

function bao(t) {
  const d = document.createElement("div");
  d.className = "bao";
  d.textContent = t;
  document.body.append(d);
  setTimeout(() => d.remove(), 2400);
}

// Pop up dùng chung: trả về { el, dong }
function hop(html) {
  Am.phat("mo");
  const o = document.createElement("div");
  o.className = "lop";
  o.innerHTML = `<div class="hop" role="dialog" aria-modal="true">${html}</div>`;
  const k = (e) => e.key === "Escape" && dong();
  const dong = () => {
    o.remove();
    document.removeEventListener("keydown", k);
  };
  document.addEventListener("keydown", k);
  o.addEventListener("pointerdown", (e) => {
    if (e.target === o) dong();
  });
  document.body.append(o);
  return { el: o.firstChild, dong };
}

// Lá bay; burst = bung ra từ bên phải khi chuyển cảnh
function thaLa(n = 1, burst = false) {
  for (let i = 0; i < n; i++) {
    const l = document.createElement("i");
    const s = 9 + Math.random() * 11;
    l.className = "la";
    l.style.cssText =
      `left:${burst ? 55 + Math.random() * 45 : Math.random() * 100}vw;` +
      (burst ? `top:${Math.random() * 60}vh;` : "") +
      `width:${s}px;height:${s}px;--dx:${(Math.random() - 0.5) * 180}px;` +
      `--t:${burst ? 2.5 + Math.random() * 2 : 7 + Math.random() * 6}s;--c:${SAC_LA[i % 4]}`;
    l.onanimationend = () => l.remove();
    document.body.append(l);
  }
}

// Lướt lên + nhành cây từ phải lòi ra rồi hụt vào + lá bay
// xong: đường dẫn (chuyển trang) hoặc hàm (vd. gửi form) chạy khi hiệu ứng kết thúc
function chuyenCanh(xong) {
  const v = document.createElement("div");
  v.className = "canh-leo";
  v.innerHTML =
    '<i class="cuong"></i>' +
    Array.from(
      { length: 16 },
      (_, i) =>
        `<i class="l" style="bottom:${i * 6}%;right:${Math.random() * 70}%;transform:rotate(${Math.random() * 360}deg);background:${SAC_LA[i % 3]}"></i>`,
    ).join("");
  document.body.append(v);
  document.body.classList.add("di-len");
  Am.phat("vut");
  thaLa(40, true);
  setTimeout(() => (typeof xong === "function" ? xong() : (location.href = xong)), 1300);
}

if (document.body.hasAttribute("data-la")) setInterval(() => thaLa(1), 900);
