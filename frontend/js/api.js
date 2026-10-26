// Mọi lời gọi REST API đi qua file này. Các trang chỉ gọi api.xxx(), không tự fetch.
// Quy ước (xem API.md) - lớp này kiểm tra BA TẦNG trước khi trả dữ liệu cho trang:
//   1) có nhận được response không        (không -> ApiError code NETWORK_ERROR, status 0)
//   2) HTTP status có thành công không     (không -> lỗi kỹ thuật: 404 sai URL, 500 hỏng hệ thống... code lấy từ body nếu có)
//   3) trường ok trong body là true/false  (ok:false -> lỗi nghiệp vụ: NOT_FOUND, VALIDATION_FAILED... kèm fields)
// Các trang xử lý lỗi dựa vào err.code (không so sánh câu chữ err.message).
import { API_BASE } from "./config.js";

export class ApiError extends Error {
  constructor({ status = 0, code, message, fields } = {}) {
    super(message || "Có lỗi xảy ra, vui lòng thử lại.");
    this.status = status; // HTTP status; 0 = không kết nối được máy chủ
    this.code = code || (status === 0 ? "NETWORK_ERROR" : "UNKNOWN");
    this.fields = fields || {}; // { tênTrường: "thông báo lỗi" } (VALIDATION_FAILED)
  }
}

async function request(method, path, { query, json, form, signal } = {}) {
  let url = API_BASE + path;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    if ([...qs].length) url += "?" + qs;
  }
  const opts = {
    method,
    headers: { Accept: "application/json" },
    credentials: "include", // gửi cookie role kể cả khi API khác origin
  };
  if (signal) opts.signal = signal; // hủy request cũ khi người dùng gõ tiếp / đổi trang
  if (json !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(json);
  } else if (form) {
    opts.body = form; // FormData: trình duyệt tự đặt Content-Type + boundary
  }

  // tầng 1: có nhận được response không
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    if (e && e.name === "AbortError") throw e; // chủ động hủy: không phải lỗi mạng
    throw new ApiError({
      status: 0,
      message: "Không kết nối được máy chủ. Kiểm tra mạng hoặc thử lại sau.",
    });
  }
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    /* phản hồi không phải JSON */
  }
  // tầng 2: HTTP status (lỗi kỹ thuật: không theo shape nghiệp vụ, không đánh đồng với NOT_FOUND)
  if (!res.ok) {
    const e = (body && body.error) || {};
    throw new ApiError({
      status: res.status,
      code: e.code,
      message: e.message,
    });
  }
  // tầng 3: trường ok trong body
  if (!body || typeof body.ok !== "boolean") {
    throw new ApiError({
      status: res.status,
      code: "BAD_RESPONSE",
      message: "Máy chủ trả về dữ liệu không đúng định dạng.",
    });
  }
  if (!body.ok) {
    const e = body.error || {};
    throw new ApiError({
      status: res.status,
      code: e.code,
      message: e.message,
      fields: e.fields,
    });
  }
  return body; // { ok:true, data, meta? }
}

// Món ăn gửi bằng multipart/form-data (có thể kèm ảnh); đầu bếp / nguyên liệu gửi JSON
function dishForm(v) {
  const fd = new FormData();
  fd.set("name", v.name);
  fd.set("description", v.description);
  fd.set("price", v.price);
  fd.set("category", v.category);
  fd.set("available", v.available ? "true" : "false");
  fd.set("chefId", v.chefId);
  // không chọn nguyên liệu nào vẫn gửi khóa rỗng: PATCH coi khóa vắng mặt là "giữ nguyên", khóa rỗng là "xóa hết"
  if (v.ingredientIds.length)
    v.ingredientIds.forEach((id) => fd.append("ingredientIds", id));
  else fd.set("ingredientIds", "");
  if (v.image) fd.set("image", v.image);
  return fd;
}

export const api = {
  // ----- xác thực (chọn vai, không mật khẩu) -----
  me: () => request("GET", "/auth/me").then((r) => r.data.role),
  login: (role) =>
    request("POST", "/auth/login", { json: { role } }).then((r) => r.data.role),
  logout: () => request("POST", "/auth/logout"),

  // ----- dữ liệu dùng chung -----
  options: () => request("GET", "/options").then((r) => r.data), // { categories, units, limits }

  // ----- CRUD: resource = dishes | chefs | ingredients -----
  // params: { q, sort, page, ...bộ lọc } hoặc { all: true } (lấy hết, không phân trang). Trả { data, meta }
  // params: { q, sort, page, focus, category, available, minPrice, maxPrice, specialty, unit }; opts.signal: AbortSignal
  list: (resource, params, opts) =>
    request("GET", `/${resource}`, { query: params, signal: opts && opts.signal }),
  get: (resource, id) =>
    request("GET", `/${resource}/${id}`).then((r) => r.data),
  create: (resource, values) =>
    resource === "dishes"
      ? request("POST", "/dishes", { form: dishForm(values) }).then(
          (r) => r.data,
        )
      : request("POST", `/${resource}`, { json: values }).then((r) => r.data),
  update: (resource, id, values) =>
    resource === "dishes"
      ? request("PATCH", `/dishes/${id}`, { form: dishForm(values) }).then(
          (r) => r.data,
        )
      : request("PATCH", `/${resource}/${id}`, { json: values }).then(
          (r) => r.data,
        ),
  remove: (resource, id) => request("DELETE", `/${resource}/${id}`),
};
