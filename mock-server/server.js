// MOCK SERVER: giả lập backend theo đúng hợp đồng trong API.md để chạy thử frontend khi backend thật chưa xong.
// Dữ liệu nằm trong bộ nhớ (tắt server là mất), ảnh upload được giữ dạng data URL.
//   npm run mock   ->  http://localhost:3000
// Khi ghép với backend thật: bỏ file này đi, backend serve thư mục frontend/ (xem API.md mục 7).
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const PORT = process.env.PORT || 3000;
const PER_PAGE = 9;
const UNITS = ["kg", "g", "lít", "ml", "quả", "củ", "bó", "gói", "hộp", "chai", "lon", "miếng", "muỗng"];
const CATEGORIES = ["Khai vị", "Món chính", "Tráng miệng", "Đồ uống", "Món chay"];
const LIMITS = {
  name: { min: 2, max: 120 },
  ingredientName: { min: 2, max: 60 },
  description: { max: 1000 },
  specialty: { max: 120 },
  price: { min: 1000, max: 100000000 },
};

// ---------- dữ liệu mẫu (lấy từ scripts/seed.js) ----------
const chefs = [
  [1, "Nguyễn Văn An", "Món Huế"],
  [2, "Trần Thị Bình", "Món Ý"],
  [3, "Cô Lan", "Phở, nước dùng"],
  [4, "Cô Mai", "Món nướng, bún chả"],
].map(([id, name, specialty]) => ({ id, name, specialty }));
const ingredients = [
  ["Thịt bò", "kg"], ["Bánh phở", "kg"], ["Hành lá", "g"], ["Mì Ý", "g"], ["Cà chua", "kg"], ["Trứng gà", "quả"],
  ["Bún", "kg"], ["Thịt ba chỉ", "kg"], ["Nước mắm", "chai"], ["Tôm", "kg"], ["Gạo nếp", "kg"],
  ["Cà phê", "g"], ["Sữa đặc", "lon"], ["Hạt sen", "g"], ["Long nhãn", "g"], ["Đậu hũ", "miếng"],
].map(([name, unit], i) => ({ id: i + 1, name, unit }));
const idNL = (ten) => ingredients.find((i) => i.name === ten).id;
const dishes = [
  ["Phở bò", "Phở bò nước dùng hầm xương 12 tiếng.", 65000, "Món chính", true, 1, ["Thịt bò", "Bánh phở", "Hành lá"]],
  ["Spaghetti sốt cà", "Mì Ý sốt cà chua tươi.", 89000, "Món chính", true, 2, ["Mì Ý", "Cà chua"]],
  ["Trứng chiên hành", "Món ăn nhanh.", 30000, "Khai vị", false, 1, ["Trứng gà", "Hành lá"]],
  ["Bún chả", "Thịt nướng than hoa, nước chấm chua ngọt.", 60000, "Món chính", true, 4, ["Bún", "Thịt ba chỉ", "Nước mắm"]],
  ["Bún đậu mắm tôm", "Bún lá, đậu hũ chiên giòn, mắm tôm.", 65000, "Món chính", true, 4, ["Bún", "Đậu hũ"]],
  ["Nem rán", "Nem rán giòn, nhân thịt và miến.", 50000, "Khai vị", true, 1, ["Thịt ba chỉ", "Trứng gà"]],
  ["Xôi xéo", "Xôi nếp đậu xanh, hành phi.", 30000, "Món chay", true, 1, ["Gạo nếp"]],
  ["Cà phê trứng", "Cà phê đậm phủ lớp kem trứng béo.", 40000, "Đồ uống", true, 3, ["Cà phê", "Trứng gà", "Sữa đặc"]],
  ["Bánh tôm Hồ Tây", "Bánh tôm khoai lang chiên giòn.", 48000, "Khai vị", true, 3, ["Tôm"]],
  ["Chè sen long nhãn", "Chè hạt sen, long nhãn, đường phèn.", 35000, "Tráng miệng", true, 3, ["Hạt sen", "Long nhãn"]],
].map(([name, description, price, category, available, chefId, ings], i) => ({
  id: i + 1, name, description, price, category, available, imageUrl: null, chefId, ingredientIds: ings.map(idNL),
}));
const next = { dishes: 11, chefs: 5, ingredients: 17 };

// ---------- tiện ích ----------
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
const boDau = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/đ/g, "d").replace(/\s+/g, " ").trim();
const khop = (ten, q) => boDau(q).split(" ").filter(Boolean).every((t) => boDau(ten).includes(t));
const clean = (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const raw = (v) => (typeof v === "string" ? v : "");
const trungTen = (list, name, ignoreId) =>
  list.some((x) => x.id !== ignoreId && x.name.toLowerCase() === name.toLowerCase());
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const parseId = (v) => (/^\d{1,9}$/.test(String(v)) && Number(v) > 0 ? Number(v) : null);

// ---------- chuyển bản ghi -> JSON trả về ----------
const outDish = (d) => {
  const chef = chefs.find((c) => c.id === d.chefId);
  return {
    id: d.id, name: d.name, description: d.description, price: d.price, category: d.category,
    available: d.available, imageUrl: d.imageUrl, chefId: d.chefId,
    chef: chef ? { id: chef.id, name: chef.name, specialty: chef.specialty } : null,
    ingredients: d.ingredientIds.map((id) => ingredients.find((i) => i.id === id)).filter(Boolean)
      .map((i) => ({ id: i.id, name: i.name, unit: i.unit })),
  };
};

// ---------- kiểm tra dữ liệu (đúng các luật của bản cũ) ----------
const lenMsg = (min, max) => `phải từ ${min} đến ${max} ký tự`;
const RES = {
  dishes: {
    store: dishes, out: outDish, sort: (a, b) => a.name.localeCompare(b.name, "vi"),
    parse(body, cur, file) {
      const errors = {};
      const name = clean(body.name), description = raw(body.description).trim(), category = raw(body.category).trim();
      const priceRaw = raw(body.price).trim(), chefIdRaw = raw(body.chefId).trim();
      const ingredientIds = [].concat(body.ingredientIds ?? []).map(String).filter(Boolean);
      if (!name) errors.name = "Tên món là bắt buộc";
      else if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) errors.name = `Tên món ${lenMsg(LIMITS.name.min, LIMITS.name.max)}`;
      else if (trungTen(dishes, name, cur && cur.id)) errors.name = "Tên món đã tồn tại";
      if (description.length > LIMITS.description.max) errors.description = `Mô tả tối đa ${LIMITS.description.max} ký tự`;
      const price = Number(priceRaw);
      if (priceRaw === "") errors.price = "Giá là bắt buộc";
      else if (!/^\d+$/.test(priceRaw)) errors.price = "Giá phải là số nguyên, không có dấu chấm, phẩy hay chữ";
      else if (price < LIMITS.price.min || price > LIMITS.price.max)
        errors.price = `Giá phải từ ${LIMITS.price.min.toLocaleString("vi-VN")} đến ${LIMITS.price.max.toLocaleString("vi-VN")} đ`;
      if (!category) errors.category = "Vui lòng chọn danh mục";
      else if (!CATEGORIES.includes(category)) errors.category = "Danh mục không hợp lệ";
      let chefId = null;
      if (!chefIdRaw) errors.chefId = "Vui lòng chọn đầu bếp";
      else if (!parseId(chefIdRaw) || !chefs.some((c) => c.id === Number(chefIdRaw))) errors.chefId = "Đầu bếp không tồn tại";
      else chefId = Number(chefIdRaw);
      const ids = [...new Set(ingredientIds.map(Number))];
      if (ingredientIds.some((id) => !parseId(id))) errors.ingredientIds = "Nguyên liệu không hợp lệ";
      else if (ids.some((id) => !ingredients.some((i) => i.id === id))) errors.ingredientIds = "Có nguyên liệu không tồn tại";
      if (file) errors.image = file.loi || undefined;
      if (!errors.image) delete errors.image;
      const data = {
        name, description: description || null, price, category, chefId, ingredientIds: ids,
        available: body.available === "true" || body.available === true || body.available === "on",
      };
      if (file && file.buffer) data.imageUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      return { errors, data };
    },
  },
  chefs: {
    store: chefs, out: (c) => c, sort: (a, b) => a.name.localeCompare(b.name, "vi"),
    parse(body) {
      const errors = {};
      const name = clean(body.name), specialty = clean(body.specialty);
      if (!name) errors.name = "Tên đầu bếp là bắt buộc";
      else if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) errors.name = `Tên ${lenMsg(LIMITS.name.min, LIMITS.name.max)}`;
      if (specialty.length > LIMITS.specialty.max) errors.specialty = `Chuyên môn tối đa ${LIMITS.specialty.max} ký tự`;
      return { errors, data: { name, specialty: specialty || null } };
    },
    blockDelete: (c) => {
      const n = dishes.filter((d) => d.chefId === c.id).length;
      return n ? `Không thể xóa: đầu bếp này đang phụ trách ${n} món. Hãy đổi đầu bếp của các món đó trước.` : null;
    },
  },
  ingredients: {
    store: ingredients, out: (i) => i, sort: (a, b) => a.name.localeCompare(b.name, "vi"),
    parse(body, cur) {
      const errors = {};
      const name = clean(body.name), unit = raw(body.unit).trim();
      const L = LIMITS.ingredientName;
      if (!name) errors.name = "Tên nguyên liệu là bắt buộc";
      else if (name.length < L.min || name.length > L.max) errors.name = `Tên ${lenMsg(L.min, L.max)}`;
      else if (trungTen(ingredients, name, cur && cur.id)) errors.name = "Nguyên liệu này đã tồn tại";
      if (!unit) errors.unit = "Vui lòng chọn đơn vị";
      else if (!UNITS.includes(unit)) errors.unit = `Đơn vị phải là một trong: ${UNITS.join(", ")}`;
      return { errors, data: { name, unit } };
    },
  },
};

// ---------- app ----------
const app = express();
app.use(cookieParser());
app.use(express.json());
const api = express.Router();
app.use("/api", api);

// Giả lập CORS nếu muốn chạy frontend ở origin khác (vd. npx serve frontend): MOCK_CORS=http://localhost:5173 npm run mock
if (process.env.MOCK_CORS) {
  api.use((req, res, next) => {
    res.set({
      "Access-Control-Allow-Origin": process.env.MOCK_CORS,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

// ----- vai (không mật khẩu) -----
const ROLES = ["user", "admin"];
api.use((req, res, next) => {
  req.role = ROLES.includes(req.cookies.role) ? req.cookies.role : null;
  next();
});
const canAdmin = (req, res, next) => {
  if (!req.role) return next(new HttpError(401, "UNAUTHORIZED", "Bạn chưa chọn vai. Vui lòng đăng nhập."));
  if (req.role !== "admin") return next(new HttpError(403, "FORBIDDEN", "Chỉ vai admin mới được dùng chức năng này."));
  next();
};

api.get("/auth/me", (req, res) => res.json({ data: { role: req.role } }));
api.post("/auth/login", (req, res, next) => {
  const role = req.body && req.body.role;
  if (!ROLES.includes(role)) return next(new HttpError(400, "VALIDATION_ERROR", "Vui lòng chọn role hợp lệ (user hoặc admin).", { role: "Role không hợp lệ" }));
  res.cookie("role", role, { httpOnly: true, sameSite: "lax" });
  res.json({ data: { role } });
});
api.post("/auth/logout", (req, res) => {
  res.clearCookie("role");
  res.status(204).end();
});
api.get("/options", (req, res) => res.json({ data: { categories: CATEGORIES, units: UNITS, limits: LIMITS } }));

// ----- upload ảnh (chỉ cho /dishes) -----
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) req.loiAnh = "Chỉ nhận ảnh JPG, PNG hoặc WEBP";
    cb(null, !req.loiAnh);
  },
});
const nhanAnh = (req, res, next) =>
  upload.single("image")(req, res, (err) => {
    if (err) req.loiAnh = err.code === "LIMIT_FILE_SIZE" ? "Ảnh tối đa 3MB" : "Không đọc được ảnh, vui lòng thử lại";
    next();
  });

// ----- CRUD -----
Object.entries(RES).forEach(([key, r]) => {
  const base = "/" + key;
  const doc = canAdmin; // dishes: đọc công khai; chefs/ingredients: chỉ admin
  const readGuard = key === "dishes" ? (req, res, next) => next() : doc;
  const find = (req) => {
    const id = parseId(req.params.id);
    const rec = id && r.store.find((x) => x.id === id);
    if (!rec) throw new HttpError(404, "NOT_FOUND", "Không tìm thấy dữ liệu bạn yêu cầu.");
    return rec;
  };

  api.get(base, readGuard, (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const list = r.store.filter((x) => khop(x.name, q)).sort(r.sort);
    if (req.query.all === "true") return res.json({ data: list.map(r.out), meta: { total: list.length } });
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    const asked = parseInt(req.query.page, 10);
    const page = Math.min(Math.max(Number.isInteger(asked) ? asked : 1, 1), totalPages);
    res.json({
      data: list.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(r.out),
      meta: { page, perPage: PER_PAGE, totalPages, total: list.length },
    });
  });
  api.get(`${base}/:id`, readGuard, (req, res) => res.json({ data: r.out(find(req)) }));

  const luu = (req, res, cur) => {
    const file = req.loiAnh ? { loi: req.loiAnh } : req.file;
    const { errors, data } = r.parse(req.body || {}, cur, file);
    if (Object.keys(errors).length) throw new HttpError(400, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ.", errors);
    return data;
  };
  api.post(base, canAdmin, nhanAnh, (req, res) => {
    const rec = { id: next[key]++, ...luu(req, res, null) };
    r.store.push(rec);
    res.status(201).set("Location", `/api${base}/${rec.id}`).json({ data: r.out(rec) });
  });
  api.put(`${base}/:id`, canAdmin, nhanAnh, (req, res) => {
    const rec = find(req);
    Object.assign(rec, luu(req, res, rec)); // không gửi ảnh -> imageUrl giữ nguyên (data không có imageUrl)
    res.json({ data: r.out(rec) });
  });
  api.delete(`${base}/:id`, canAdmin, (req, res) => {
    const rec = find(req);
    const why = r.blockDelete && r.blockDelete(rec);
    if (why) throw new HttpError(409, "CONFLICT", why);
    r.store.splice(r.store.indexOf(rec), 1);
    res.status(204).end();
  });
});

// /api/... không có -> 404 dạng JSON (không trả HTML)
api.use((req, res, next) => next(new HttpError(404, "NOT_FOUND", "Không tìm thấy API này.")));
// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) err = new HttpError(400, "BAD_REQUEST", "JSON gửi lên không hợp lệ.");
  if (!(err instanceof HttpError)) {
    console.error(err);
    err = new HttpError(500, "INTERNAL_ERROR", "Có lỗi xảy ra phía máy chủ.");
  }
  res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
});

// ----- serve frontend + SPA fallback -----
const FRONT = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONT));
app.get("*", (req, res) => res.sendFile(path.join(FRONT, "index.html")));

app.listen(PORT, () => console.log(`Mock server: http://localhost:${PORT}`));
