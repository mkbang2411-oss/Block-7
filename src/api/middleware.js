const crypto = require("crypto");
const { ApiError, ERRORS } = require("./errors");
const { fail } = require("./response");

// ---------- Mã định danh request (để đối chiếu log khi báo lỗi, không lộ chi tiết nội bộ) ----------
function requestId(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

// ---------- CORS ----------
// Chỉ cần khi frontend chạy ở origin KHÁC backend (vd SPA ở http://localhost:5173, API ở :3000).
// Cấu hình bằng biến môi trường CORS_ORIGIN (phân tách bằng dấu phẩy), vd:
//   CORS_ORIGIN=http://localhost:5173,https://app.example.com
// Không đặt biến -> chỉ cho các origin dev thông dụng bên dưới.
// Đặt CORS_ORIGIN=*  -> cho mọi origin (KHÔNG kèm cookie; kém an toàn, chỉ nên dùng khi API hoàn toàn công khai).
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4200",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];
const allowed = () =>
  (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : DEV_ORIGINS)
    .map((s) => s.trim())
    .filter(Boolean);

function cors(req, res, next) {
  const origin = req.headers.origin;
  res.vary("Origin");
  if (origin) {
    const list = allowed();
    const all = list.includes("*");
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === req.headers.host;
    } catch (e) {}
    if (all || list.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", all ? "*" : origin);
      // cookie (role) chỉ được gửi kèm khi origin nằm trong danh sách cụ thể, không dùng với "*"
      if (!all) res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
    } else if (!sameOrigin) {
      // origin lạ: không thêm header CORS và chặn luôn ở server (kể cả request ghi dữ liệu)
      return fail(res, {
        ...ERRORS.CORS_NOT_ALLOWED,
        code: "CORS_NOT_ALLOWED",
      });
    }
  }
  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type",
    );
    res.setHeader("Access-Control-Max-Age", "600");
    return res.sendStatus(204);
  }
  next();
}

// ---------- Phân quyền (trả JSON, không redirect/render HTML) ----------
function requireAdminApi(req, res, next) {
  if (!req.role) return next(new ApiError("UNAUTHORIZED"));
  if (req.role !== "admin") return next(new ApiError("FORBIDDEN"));
  next();
}

// ---------- 404 (lỗi kỹ thuật, không theo shape nghiệp vụ) cho đường dẫn /api/... không tồn tại ----------
function apiNotFound(req, res, next) {
  next(new ApiError("ROUTE_NOT_FOUND"));
}

// ---------- Phân loại lỗi ----------
const DB_NAME_RE = /^Sequelize(.*Connection|Host|AccessDenied)/;
const DB_CODES = [
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNRESET",
  "EPIPE",
  "EAI_AGAIN",
  "57P01",
  "57P02",
  "57P03",
  "53300",
];
const DB_MSG_RE =
  /connection terminated|connection timeout|timeout exceeded when trying to connect|server closed the connection/i;

function isDbDown(err) {
  const code = (err.parent && err.parent.code) || err.code;
  return (
    DB_NAME_RE.test(err.name || "") ||
    DB_CODES.includes(code) ||
    (typeof code === "string" && code.startsWith("08")) || // PostgreSQL: class 08 = connection exception
    DB_MSG_RE.test(err.message || "")
  );
}

function classify(err) {
  if (err instanceof ApiError) return err;
  // lỗi đọc body (body-parser)
  if (err.type === "entity.parse.failed") return new ApiError("INVALID_JSON");
  if (err.type === "entity.too.large") return new ApiError("PAYLOAD_TOO_LARGE");
  if (err.status >= 400 && err.status < 500 && err.expose)
    return new ApiError("BAD_REQUEST");
  // lỗi cơ sở dữ liệu: tách hạ tầng (DB sập) khỏi nghiệp vụ (trùng, ràng buộc, validate)
  if (isDbDown(err)) return new ApiError("DB_UNAVAILABLE");
  switch (err.name) {
    case "SequelizeUniqueConstraintError":
      return new ApiError("ALREADY_EXISTS");
    case "SequelizeForeignKeyConstraintError":
      return new ApiError("RELATION_CONFLICT");
    case "SequelizeValidationError": {
      const fields = {};
      (err.errors || []).forEach((e) => {
        if (e.path && !fields[e.path]) fields[e.path] = "Giá trị không hợp lệ";
      });
      return new ApiError("VALIDATION_FAILED", { fields });
    }
    default:
      return new ApiError("INTERNAL_ERROR");
  }
}

// ---------- Bộ xử lý lỗi cuối cùng của /api ----------
// Chi tiết lỗi thật (SQL, host DB, stack...) chỉ ghi vào log máy chủ, KHÔNG bao giờ gửi cho client.
// eslint-disable-next-line no-unused-vars
function apiErrorHandler(err, req, res, next) {
  const apiErr = classify(err);
  if (apiErr.status >= 500) {
    console.error(
      `[api ${req.requestId}] ${req.method} ${req.originalUrl}`,
      err,
    );
  }
  // đã lỡ gửi một phần phản hồi thì không được gửi thêm lần nữa: giao cho Express đóng kết nối
  if (res.headersSent) return next(err);
  return fail(res, apiErr);
}

module.exports = {
  requestId,
  cors,
  requireAdminApi,
  apiNotFound,
  apiErrorHandler,
};
