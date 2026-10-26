const path = require("path");
const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { attachRole } = require("./middleware/auth");

const app = express();
// không để lộ "X-Powered-By: Express"
app.disable("x-powered-by");

// nén HTML/CSS/JS trước khi gửi về trình duyệt
app.use(compression());

// endpoint nhẹ, không đụng DB: dùng cho dịch vụ ping (UptimeRobot...) giữ Render free không "ngủ"
app.get("/healthz", (req, res) => res.type("text").send("ok"));

app.use(cookieParser());
app.use(attachRole); // đọc cookie role -> req.role

// ---------- REST API (JSON): có CORS, định dạng lỗi và xử lý lỗi riêng ----------
app.use("/api", require("./routes/api"));

// ---------- Frontend SPA (thư mục frontend/) ----------
const FRONT = path.join(__dirname, "..", "frontend");
// ảnh (/img) ít đổi nên cache 30 ngày, CSS/JS cache 1 ngày
app.use(
  express.static(FRONT, {
    maxAge: "1d",
    index: false, // index.html do route fallback bên dưới trả (không cache)
    setHeaders: (res, file) => {
      if (/[\\/]img[\\/]/.test(file)) res.setHeader("Cache-Control", "public, max-age=2592000");
    },
  }),
);

// Routing phía client: mọi đường dẫn GET còn lại (vd /admin/dishes/3/edit khi F5) đều trả index.html.
// Đường dẫn có đuôi file (.js, .css, .png...) mà không tồn tại thì trả 404 thật, không trả HTML.
app.get("*", (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(FRONT, "index.html"));
});

app.use((req, res) => res.status(404).type("text").send("Not found"));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).type("text").send("Có lỗi xảy ra phía máy chủ.");
});

module.exports = app;
