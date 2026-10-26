// Sinh ngẫu nhiên con phố ở trang chủ (~10 căn); căn "Ba Cô Gái" nằm ở vị trí 3-6
const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (a) => a[rnd(0, a.length - 1)];
const TUONG = ['#e9b44c', '#d9774a', '#8fbfc2', '#e6c9a0', '#b9a0c9', '#a7c78a', '#e08a7b'];
const MAI = ['#8a4b3a', '#5f7d7a', '#a65a3d', '#6d5a7a'];
const TEN = ['Tạp hóa', 'Cà phê', 'Tiệm may', 'Sách cũ', 'Hoa tươi', 'Sửa xe', 'Nón lá', 'Giặt là', 'Bánh mì'];

function taoPho() {
  const ba = rnd(3, 6);
  return Array.from({ length: 10 }, (_, i) => ({
    ba: i === ba,
    w: i === ba ? rnd(340, 400) : rnd(250, 430),
    h: i === ba ? rnd(350, 420) : rnd(300, 470),
    tuong: pick(TUONG),
    mai: pick(MAI),
    ten: pick(TEN),
    cay: Math.random() < 0.4,
    cayX: rnd(0, 55),
    xe: i !== ba && Math.random() < 0.45,
    xeX: rnd(5, 55),
  }));
}

module.exports = { taoPho };
