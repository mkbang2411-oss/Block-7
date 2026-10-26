// Form thêm / sửa. Gửi bằng fetch:
//   thêm  -> POST  /api/<resource>
//   sửa   -> PATCH /api/<resource>/:id
// Lỗi nhập liệu: backend trả HTTP 200 { ok:false, error: { code: "VALIDATION_FAILED", fields: { tênTrường: "thông báo" } } },
// frontend chỉ việc gắn từng thông báo vào đúng ô (giữ nguyên những gì người dùng đã nhập).
import { api, ApiError } from "../api.js";
import { setRole } from "../state.js";
import { navigate } from "../router.js";
import { RES, adminTabs } from "../resources.js";
import { $, $$, esc, thanhTren } from "../utils.js";
import { quayLai } from "../list-config.js";

const MAX_ANH = 3 * 1024 * 1024; // khớp giới hạn 3MB của backend (backend vẫn kiểm tra lại)
const LOAI_ANH = ["image/jpeg", "image/png", "image/webp"];

// các ô nhập của form
function truongHtml(f, v, options, L) {
  const hint = f.hint
    ? `<small class="goi-y-nho">${esc(f.hint(L))}</small>`
    : "";
  const id = "f-" + f.name;
  let o;
  if (f.type === "checkbox") {
    o = `<label class="check"><input type="checkbox" name="${f.name}"${v ? " checked" : ""}> ${esc(f.label)}</label>`;
  } else {
    let input;
    if (f.type === "textarea")
      input = `<textarea id="${id}" name="${f.name}" rows="4">${esc(v)}</textarea>`;
    else if (f.type === "select")
      input = `<select id="${id}" name="${f.name}"><option value="">${esc(f.placeholder || "— Không chọn —")}</option>${options[
        f.name
      ]
        .map(
          (x) =>
            `<option value="${esc(x.value)}"${String(v) === x.value ? " selected" : ""}>${esc(x.label)}</option>`,
        )
        .join("")}</select>`;
    else if (f.type === "multiselect")
      input = `<select id="${id}" name="${f.name}" multiple size="6">${options[
        f.name
      ]
        .map(
          (x) =>
            `<option value="${esc(x.value)}"${(v || []).includes(x.value) ? " selected" : ""}>${esc(x.label)}</option>`,
        )
        .join(
          "",
        )}</select><small class="goi-y-nho">Giữ Ctrl/Cmd để chọn nhiều.</small>`;
    else if (f.type === "image")
      input = `<input type="file" id="${id}" name="${f.name}" accept="image/jpeg,image/png,image/webp">`;
    else
      input = `<input type="text" id="${id}" name="${f.name}" value="${esc(v)}"${f.inputmode ? ` inputmode="${f.inputmode}"` : ""}>`;
    o = `<label for="${id}">${esc(f.label)}</label>${input}`;
  }
  return `<div class="truong" data-field="${f.name}">${o}${hint}</div>`;
}

// isEdit: có id trong đường dẫn
export async function load(ctx, resKey) {
  const r = RES[resKey];
  const id = ctx.params.id;
  const isEdit = !!id;
  // gọi song song các API cần cho form
  const [opt, record, chefs, ingredients] = await Promise.all([
    api.options(),
    isEdit ? api.get(resKey, id) : null,
    resKey === "dishes" ? api.list("chefs", { all: true }) : null,
    resKey === "dishes" ? api.list("ingredients", { all: true }) : null,
  ]);
  const toOptions = (list) => list.map((x) => ({ value: x, label: x }));
  const options = {
    category: toOptions(opt.categories),
    unit: toOptions(opt.units),
    chefId: chefs
      ? chefs.data.map((c) => ({ value: String(c.id), label: c.name }))
      : [],
    ingredientIds: ingredients
      ? ingredients.data.map((i) => ({
          value: String(i.id),
          label: `${i.name} (${i.unit})`,
        }))
      : [],
  };
  const values = record ? r.toValues(record) : r.empty();
  const tieuDe = (isEdit ? "Sửa " : "Thêm ") + r.singular;

  return {
    title: tieuDe,
    am: "bep",
    html: `<div class="nen"></div><div class="mo"></div>
<main class="man bep cuon">
  ${thanhTren({ tabs: adminTabs(resKey), role: "admin" })}
  <form class="hop hop-giua rong" id="form" novalidate>
    <h2>${tieuDe}</h2>
    <div class="bao-loi" id="loi" hidden></div>
    ${r.fields.map((f) => truongHtml(f, values[f.name], options, opt.limits)).join("")}
    <div class="nut-hang">
      <a class="nut nut-phu" href="${esc(quayLai("/admin/" + resKey, isEdit ? { sel: id } : { giu: true }))}">Hủy</a>
      <button class="nut">${isEdit ? "Lưu thay đổi" : "Thêm mới"}</button>
    </div>
  </form>
</main>`,
    mount: (root, c) => mount(root, c, { r, id, isEdit }),
  };
}

// đọc giá trị người dùng đã nhập từ form
function docForm(form, r) {
  const v = {};
  r.fields.forEach((f) => {
    const el = form.elements[f.name];
    if (f.type === "checkbox") v[f.name] = el.checked;
    else if (f.type === "multiselect")
      v[f.name] = [...el.selectedOptions].map((o) => o.value);
    else if (f.type === "image") v.image = el.files[0] || null;
    else v[f.name] = el.value.trim();
  });
  return v;
}

function xoaLoi(form) {
  $$(".co-loi", form).forEach((t) => t.classList.remove("co-loi"));
  $$(".chu-loi", form).forEach((s) => s.remove());
}
function hienLoi(form, fields) {
  Object.entries(fields).forEach(([name, msg]) => {
    const t = $(`.truong[data-field="${name}"]`, form);
    if (!t) return;
    t.classList.add("co-loi");
    t.insertAdjacentHTML(
      "beforeend",
      `<small class="chu-loi">${esc(msg)}</small>`,
    );
  });
}

function mount(root, ctx, { r, id, isEdit }) {
  const form = $("#form", root),
    loi = $("#loi", root),
    nut = $(".nut-hang .nut:not(.nut-phu)", form);
  const baoLoi = (msg) => {
    loi.textContent = msg;
    loi.hidden = false;
    loi.scrollIntoView({ block: "nearest" });
  };

  form.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      xoaLoi(form);
      loi.hidden = true;
      const v = docForm(form, r);

      // kiểm tra nhanh ảnh ở trình duyệt cho đỡ upload phí (backend vẫn kiểm tra lại)
      if (
        v.image &&
        (!LOAI_ANH.includes(v.image.type) || v.image.size > MAX_ANH)
      ) {
        hienLoi(form, {
          image: !LOAI_ANH.includes(v.image.type)
            ? "Chỉ nhận ảnh JPG, PNG hoặc WEBP"
            : "Ảnh tối đa 3MB",
        });
        baoLoi(
          "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại (giá trị đã nhập được giữ nguyên).",
        );
        return;
      }

      nut.disabled = true; // tránh bấm 2 lần gửi trùng
      try {
        const saved = isEdit
          ? await api.update(r.key, id, v)
          : await api.create(r.key, v);
        // sửa: về danh sách cũ (giữ sắp xếp / bộ lọc) và mở lại món vừa sửa; thêm: mở thẳng món vừa tạo
        navigate(
          isEdit
            ? quayLai("/admin/" + r.key, { sel: saved?.id ?? id })
            : `/admin/${r.key}?sel=${saved?.id ?? ""}`,
          {
            flash: isEdit ? "Cập nhật thành công." : "Thêm thành công.",
          },
        );
      } catch (err) {
        nut.disabled = false;
        if (!(err instanceof ApiError)) throw err;
        if (err.code === "UNAUTHORIZED") {
          setRole(null);
          return navigate("/login");
        }
        if (err.code === "NOT_FOUND")
          return navigate("/admin/" + r.key, {
            flash: `Không tìm thấy ${r.singular} này (có thể đã bị xóa).`,
          });
        if (
          err.code === "VALIDATION_FAILED" &&
          Object.keys(err.fields).length
        ) {
          hienLoi(form, err.fields);
          baoLoi(
            "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại (giá trị đã nhập được giữ nguyên).",
          );
        } else baoLoi(err.message); // FORBIDDEN, ALREADY_EXISTS, lỗi 500, mất kết nối...
      }
    },
    { signal: ctx.signal },
  );
}
