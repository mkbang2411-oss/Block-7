// ===== QUY ĐỊNH MÃ LỖI (error.code) CHO REST API =====
// Hai nhóm lỗi (xem response.js):
//   "business"  : lỗi nghiệp vụ đã biết -> trả HTTP 200, { ok:false, error:{ code, message, fields? } }
//   "technical" : lỗi kỹ thuật           -> trả đúng mã HTTP (4xx/5xx), { error:{ code, message, requestId } }
const BUSINESS = "business";
const TECHNICAL = "technical";

// code -> { status (chỉ dùng cho lỗi kỹ thuật), type, message mặc định }
const ERRORS = {
  // ---- nghiệp vụ (HTTP 200, ok:false) ----
  NOT_FOUND: {
    status: 200,
    type: BUSINESS,
    message: "Không tìm thấy bản ghi.",
  },
  VALIDATION_FAILED: {
    status: 200,
    type: BUSINESS,
    message: "Dữ liệu gửi lên không hợp lệ.",
  },
  ALREADY_EXISTS: {
    status: 200,
    type: BUSINESS,
    message: "Dữ liệu bị trùng với bản ghi đã có.",
  },
  RESOURCE_IN_USE: {
    status: 200,
    type: BUSINESS,
    message: "Bản ghi đang được dùng ở nơi khác nên không thể xóa.",
  },
  RELATION_CONFLICT: {
    status: 200,
    type: BUSINESS,
    message: "Thao tác vi phạm ràng buộc dữ liệu liên quan.",
  },
  // ---- kỹ thuật (đúng mã HTTP) ----
  INVALID_JSON: {
    status: 400,
    type: TECHNICAL,
    message: "Nội dung gửi lên không phải JSON hợp lệ.",
  },
  BAD_REQUEST: {
    status: 400,
    type: TECHNICAL,
    message: "Yêu cầu không hợp lệ.",
  },
  UNAUTHORIZED: {
    status: 401,
    type: TECHNICAL,
    message: "Bạn cần đăng nhập để thực hiện thao tác này.",
  },
  FORBIDDEN: {
    status: 403,
    type: TECHNICAL,
    message: "Bạn không có quyền thực hiện thao tác này (cần role admin).",
  },
  CORS_NOT_ALLOWED: {
    status: 403,
    type: TECHNICAL,
    message: "Nguồn (origin) này không được phép gọi API.",
  },
  ROUTE_NOT_FOUND: {
    status: 404,
    type: TECHNICAL,
    message: "Không tìm thấy đường dẫn API này.",
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    type: TECHNICAL,
    message: "Nội dung gửi lên quá lớn.",
  },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    type: TECHNICAL,
    message: "Content-Type phải là application/json.",
  },
  DB_UNAVAILABLE: {
    status: 500,
    type: TECHNICAL,
    message:
      "Hệ thống tạm thời không kết nối được cơ sở dữ liệu. Vui lòng thử lại sau.",
  },
  INTERNAL_ERROR: {
    status: 500,
    type: TECHNICAL,
    message: "Có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau.",
  },
};

// Lỗi chủ động ném ra từ route: throw new ApiError("NOT_FOUND", { message: "Không tìm thấy món ăn." })
class ApiError extends Error {
  constructor(code, { message, fields } = {}) {
    const def = ERRORS[code] || ERRORS.INTERNAL_ERROR;
    super(message || def.message);
    this.name = "ApiError";
    this.code = ERRORS[code] ? code : "INTERNAL_ERROR";
    this.status = def.status;
    this.type = def.type;
    this.fields = fields;
  }
}

module.exports = { ERRORS, ApiError, BUSINESS, TECHNICAL };
