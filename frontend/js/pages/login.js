// Trang đăng nhập: chỉ chọn vai (không mật khẩu) -> POST /api/auth/login
import { api } from "../api.js";
import { setRole } from "../state.js";
import { navigate } from "../router.js";
import { $, chonVai } from "../utils.js";

export async function load() {
  return {
    title: "Đăng nhập",
    am: "quan",
    html: `<main class="man trang cuon">
  <div class="thanh"><a class="nut nut-phu" href="/">Ra phố</a></div>
  <form class="hop hop-giua" id="form-login" novalidate>
    <h2>Vào quán</h2>
    <p class="phu-chu">Không cần mật khẩu, chỉ chọn vai.</p>
    <div class="bao-loi" id="loi" hidden></div>
    ${chonVai}
    <div class="nut-hang"><button class="nut">Vào quán</button></div>
  </form>
</main>`,
    mount(root, ctx) {
      const form = $("#form-login", root), loi = $("#loi", root), nut = $(".nut-hang .nut", root);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const role = new FormData(form).get("role");
        loi.hidden = true;
        if (!role) {
          // chưa chọn vai: báo ngay, không cần gọi server
          loi.textContent = "Vui lòng chọn role hợp lệ (user hoặc admin).";
          loi.hidden = false;
          return;
        }
        nut.disabled = true;
        try {
          const r = await api.login(role);
          setRole(r);
          navigate(r === "admin" ? "/admin/dishes" : "/khach");
        } catch (err) {
          loi.textContent = err.message;
          loi.hidden = false;
          nut.disabled = false;
        }
      }, { signal: ctx.signal });
    },
  };
}

