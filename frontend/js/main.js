// Điểm vào của SPA: khai báo bảng route rồi khởi động router.
import { addRoute, start } from "./router.js";
import * as home from "./pages/home.js";
import * as login from "./pages/login.js";
import * as khach from "./pages/khach.js";
import * as listing from "./pages/listing.js";
import * as dishDetail from "./pages/dish-detail.js";
import * as adminForm from "./pages/admin-form.js";
import * as adminDelete from "./pages/admin-delete.js";
import { RES } from "./resources.js";

// ----- khu vực khách -----
addRoute("/", home.load);
addRoute("/login", login.load);
addRoute("/khach", khach.load);
addRoute("/dishes", (ctx) => listing.load(ctx, "dishes", false));
addRoute("/dishes/:id", dishDetail.load);

// ----- khu vực quản trị (chỉ vai admin) -----
addRoute("/admin", () => ({ redirect: "/admin/dishes" }));
Object.keys(RES).forEach((key) => {
  // thứ tự quan trọng: /new phải đứng trước /:id
  addRoute(`/admin/${key}`, (ctx) => listing.load(ctx, key, true), { role: "admin" });
  addRoute(`/admin/${key}/new`, (ctx) => adminForm.load(ctx, key), { role: "admin" });
  addRoute(`/admin/${key}/:id/edit`, (ctx) => adminForm.load(ctx, key), { role: "admin" });
  addRoute(`/admin/${key}/:id/delete`, (ctx) => adminDelete.load(ctx, key), { role: "admin" });
});

start(document.getElementById("app"));
