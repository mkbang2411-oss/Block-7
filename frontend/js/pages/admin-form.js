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
import { htmlChon, ganChon } from "../chon.js";
import { htmlNguyenLieu, ganNguyenLieu } from "../chon-nhieu.js";

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
    else if (f.type === "select") {
      // ô chọn tự vẽ (giống thanh sắp xếp); giá trị thật nằm trong <input type="hidden"> cùng tên
      const ds = [
        ["", f.placeholder || "— Không chọn —"],
        ...options[f.name].map((x) => [x.value, x.label]),
      ];
      const hien = ds.some(([k]) => k === String(v ?? ""))
        ? String(v ?? "")
        : "";
      input = `<input type="hidden" name="${f.name}" value="${esc(hien)}">${htmlChon({ id, ten: f.name, gia: hien, ds })}`;
    } else if (f.type === "ingredients")
      input = htmlNguyenLieu({
        id,
        ten: f.name,
        ds: options[f.name],
        chon: v || [],
      });
    else if (f.type === "image")
      input = `<input type="file" id="${id}" name="${f.name}" accept="image/jpeg,image/png,image/webp">`;
    else
      input = `<input type="text" id="${id}" name="${f.name}" value="${esc(v)}"${f.inputmode ? ` inputmode="${f.inputmode}"` : ""}>`;
    // ô nguyên liệu: nhãn trỏ vào ô tìm kiếm
    o = `<label for="${id}${f.type === "ingredients" ? "-q" : ""}">${esc(f.label)}</label>${input}`;
  }
  return `<div class="truong" data-field="${f.name}">${o}${hint}</div>`;
}

// một tờ giấy (cùng kiểu tờ giấy sidebar: băng keo, lề đỏ, lỗ bấm kim, đường xé giấy ở phần đầu)
function toGiay({ tieuDe, phu, html }) {
  return `<section class="to-giay">
  <span class="to-bang" aria-hidden="true"></span>
  <header class="to-dau"><h2>${esc(tieuDe)}</h2>${phu ? `<p>${esc(phu)}</p>` : ""}</header>
  <div class="to-than">${html}</div>
</section>`;
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
          name: i.name,
          unit: i.unit,
        }))
      : [],
  };
  const values = record ? r.toValues(record) : r.empty();
  const tieuDe = (isEdit ? "Sửa " : "Thêm ") + r.singular;

  const truongs = (list) =>
    list
      .map((f) => truongHtml(f, values[f.name], options, opt.limits))
      .join("");
  const trai = r.fields.filter((f) => f.to !== "phai");
  const phai = r.fields.filter((f) => f.to === "phai");
  const haiTo = phai.length > 0; // món ăn: 2 tờ giấy (trái: thông tin chung, phải: nguyên liệu + ảnh); đầu bếp / nguyên liệu: 1 tờ
  const giay = haiTo
    ? toGiay({ tieuDe, phu: "Thông tin chung", html: truongs(trai) }) +
      toGiay({
        tieuDe: "Nguyên liệu & ảnh",
        phu: "Bấm vào nguyên liệu để chọn, bấm lần nữa để bỏ",
        html: truongs(phai),
      })
    : toGiay({
        tieuDe,
        phu: isEdit
          ? "Sửa xong bấm “Lưu thay đổi”"
          : "Điền xong bấm “Thêm mới”",
        html: truongs(trai),
      });

  return {
    title: tieuDe,
    am: "bep",
    html: `<div class="nen"></div><div class="mo"></div>
<main class="man bep cuon">
  ${thanhTren({ tabs: adminTabs(resKey), role: "admin" })}
  <form class="giay-form${haiTo ? " hai-to" : ""}" id="form" novalidate>
    <div class="bao-loi" id="loi" hidden></div>
    <div class="giay-luoi">${giay}</div>
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
    else if (f.type === "ingredients")
      v[f.name] = el.value ? el.value.split(",") : []; // <input type="hidden"> dạng "id,id,id"
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

  // ô chọn tự vẽ: chọn xong thì ghi giá trị vào <input type="hidden"> cùng tên để docForm đọc được
  ganChon(root, ctx.signal, (ten, gia) => {
    form.elements[ten].value = gia;
    $(`.truong[data-field="${ten}"]`, form)?.classList.remove("co-loi");
  });
  ganNguyenLieu(root, ctx.signal);

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
