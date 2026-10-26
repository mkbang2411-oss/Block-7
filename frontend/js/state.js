// Trạng thái dùng chung giữa các màn hình (SPA không tải lại trang nên giữ được trong bộ nhớ)
import { api } from "./api.js";

let role; // undefined = chưa hỏi server | null = chưa chọn vai | "user" | "admin"

export async function getRole() {
  if (role === undefined) role = await api.me();
  return role;
}
export const setRole = (r) => (role = r);
