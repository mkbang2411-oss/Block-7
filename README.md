# CÁI QUÁN ĂN

**Website quản lý và giới thiệu món ăn** được xây dựng bằng Node.js, Express, EJS, Sequelize và PostgreSQL trên Supabase. Dự án kết hợp giao diện khám phá quán ăn mang phong cách con phố Việt Nam với hệ thống quản trị dữ liệu món ăn, đầu bếp và nguyên liệu.

Các trang được render ở phía máy chủ (Server-Side Rendering – SSR) bằng EJS. Dữ liệu chính được lưu trong cơ sở dữ liệu PostgreSQL, thay vì chỉ khai báo trực tiếp trên giao diện.

## 0. Đã chuyển giao diện sang SPA + REST API

Giao diện được viết lại thành **Single-Page Application** trong thư mục `frontend/` (HTML/CSS/JavaScript thuần, ES modules, không cần build). Trình duyệt chỉ tải `index.html` một lần, router phía client (`frontend/js/router.js`) đổi màn hình bằng History API và lấy dữ liệu qua **REST API** (`/api/...`) bằng `fetch`.

- Hợp đồng giữa frontend và backend (endpoint, định dạng JSON, mã lỗi, CORS, routing): xem **[API.md](API.md)**.
- **Backend và frontend đã được ghép**: Express + Sequelize trả JSON ở `/api` (xem mục 9) và phục vụ luôn thư mục `frontend/`, nên cùng một origin, không cần CORS. Các thư mục `src/views`, `public/` và các route SSR cũ đã được bỏ.
- Chạy: `npm install`, tạo `.env` từ `.env.example`, (tùy chọn) `npm run db:seed`, rồi `npm start` và mở <http://localhost:3000>.
- (Chỉ để tham khảo) chạy thử frontend không cần DB: `npm install` rồi `npm run mock`, mở <http://localhost:3000>. Mock server giả lập đúng `API.md` với dữ liệu trong bộ nhớ (vào quán chọn vai **Đầu bếp** để thử khu quản trị).

```text
frontend/
├── index.html            # trang HTML duy nhất
├── css/  img/            # giao diện và hình ảnh (chuyển từ public/)
└── js/
    ├── main.js           # khai báo route
    ├── router.js         # router phía client (History API, chặn vai, màn hình lỗi)
    ├── api.js            # mọi lời gọi REST API + lỗi ApiError
    ├── config.js         # API_BASE
    ├── state.js          # vai hiện tại
    ├── effects.js        # hiệu ứng chuyển cảnh (cành cây, đĩa trắng)
    ├── resources.js      # cấu hình cột / ô nhập của món, đầu bếp, nguyên liệu
    ├── pho.js            # sinh con phố ngẫu nhiên (trước đây ở server)
    ├── utils.js  am-thanh.js
    └── pages/            # home, login, khach, listing (danh sách), dish-detail, admin-form, admin-delete, error
mock-server/server.js     # backend giả để chạy thử
```

### Danh sách: sắp xếp, lọc, giữ trạng thái trên URL

- **Tìm + lọc + sắp xếp + phân trang: ở server, bằng SQL trên PostgreSQL** (`src/utils/list-query.js`): `WHERE` (search + filter) → `ORDER BY` → `LIMIT/OFFSET`; `total` là `COUNT(*)` cùng mệnh đề `WHERE`. Mỗi bảng có allowlist cột sắp xếp/lọc, giá trị người dùng luôn là tham số (không ghép vào SQL). Chi tiết ở mục **10. Tìm kiếm trên PostgreSQL**.
- **Lọc tức thì: ở client** (`frontend/js/list-config.js`, `pages/listing.js`): gõ tới đâu lọc ngay trên dữ liệu đang có, sau 300ms mới hỏi server để phủ toàn bộ dữ liệu và có đúng số trang.
- **Trạng thái nằm trên URL**: `/dishes?q=pho&sort=price_desc&page=3&sel=45`. F5, bookmark, gửi link, nút Back/Forward đều ra đúng trang, đúng bộ lọc, đúng món đang mở. Vào bằng `?sel=45` (không có `page`) thì server tự tìm đúng trang chứa món 45.

### Ba chế độ hiển thị + dây kéo màn

Góc phải phía trên có **sợi dây kéo**. Kéo dây xuống (hoặc bấm / Tab tới rồi Enter) thì tấm màn hạ xuống với 3 lựa chọn; chọn xong màn tự cuộn lên, Esc hoặc bấm ra ngoài cũng đóng.

| Chế độ      | `?view=`                | Cách hoạt động                                                                     |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------- |
| Phân trang  | `pagination` (mặc định) | thay danh sách bằng trang được chọn, `?page=N`                                     |
| Load more   | `more`                  | bấm "Xem thêm" thì **nối** trang kế vào cuối danh sách                             |
| Cuộn vô hạn | `infinite`              | `IntersectionObserver` canh một vùng ở cuối danh sách, cuộn tới là tự nối trang kế |

- **Không có API mới**: cả 3 chế độ gọi cùng `GET /api/<resource>?q=&sort=&<bộ lọc>&page=`, nên **sắp xếp + lọc luôn do server làm trên toàn bộ dữ liệu**, rồi mới cắt trang. Server chưa đổi dòng nào.
- **Đồng bộ**: dùng chung `pages/listing.js` nên áp dụng cho cả 3 tab quản trị (món / đầu bếp / nguyên liệu) và trang khách `/dishes`. Chế độ được nhớ trong `localStorage` (`ds-view`) nên đổi ở tab này thì tab kia cũng theo; `?view=` trên URL luôn thắng giá trị đã nhớ.
- **Đổi chế độ / từ khóa / bộ lọc / sắp xếp** thì giữ nguyên các lựa chọn còn lại và **bắt đầu lại từ trang 1**, bỏ danh sách đã nối trước đó; kết quả của lần tải cũ về muộn bị bỏ nên không bao giờ trộn hai lần tìm.
- **Giữ trạng thái**: ở Load more / Cuộn vô hạn, `?page=N` nghĩa là "đã tải trang 1..N" (tối đa 30 trang). F5, bookmark, mở link ở tab mới, Back từ trang chi tiết đều tải lại đúng từng đó trang. Mở bằng `?sel=ID` (không có `page`) thì server tìm trang chứa món đó rồi client nối thêm các trang phía trước.
- **Chống lỗi**: có cờ chặn gọi trùng khi đang tải hoặc đã hết; lọc bỏ mục trùng id khi nối; lỗi tải thêm thì hiện nút "Thử lại" (không tự lặp vô hạn); rời màn hình thì ngắt observer và hủy request.
- **Truy cập**: dây là `<button>` có `aria-label`/`aria-expanded`, tab trong màn bị khóa (`inert`) khi đóng, và `prefers-reduced-motion` tắt hiệu ứng đung đưa / trượt.
- File: `frontend/js/day-keo.js` (dây + màn, chỉ là giao diện), `list-config.js` (`view` trên URL + lưu lựa chọn), `pages/listing.js` (nối trang, observer), CSS ở cuối `style.css` (nhớ `npm run build:css`).

- Từ trang chi tiết món, form sửa, trang xóa bấm quay lại → về đúng danh sách (đúng trang, bộ lọc, sắp xếp) nhờ nhớ URL danh sách gần nhất trong `sessionStorage`.
- **Chi tiết món có URL riêng** `/dishes/:id` (bookmark, F5, gửi link đều đúng món). Khung chi tiết trong danh sách có nút **Trang chi tiết** dẫn tới đó; còn `?sel=ID` mở khung chi tiết ngay trong danh sách (dùng cho cả 3 tab: món / đầu bếp / nguyên liệu).
- **Vị trí cuộn khi quay lại**: có `?sel` → cuộn tới đúng ô món vừa xem (không dùng `scrollTop` vì mở khung chi tiết làm đổi bố cục lưới); không có `?sel` (F5 / Back) → khôi phục `scrollTop` đã lưu theo URL danh sách. Ở Load more / Cuộn vô hạn, `?page=N` tải lại đủ trang 1..N trước nên chiều cao đủ để cuộn đúng chỗ.
- **Tìm nâng cao cho khách** (`/dishes`): ô từ khóa (tên món) + **Tên đầu bếp** + **Giá từ / đến** + danh mục + tình trạng + **khoảng giá (thanh kéo 7 nấc: 100.000 · 200.000 · 500.000 · 1.000.000 · 2.000.000 · 5.000.000 · trên 10.000.000)** + sắp xếp chia 2 khu (trường: tên / giá / mới thêm / độ liên quan; thứ tự: A → Z / Z → A). Ô tìm luôn dùng kiểu **gần đúng** (chứa từ khóa hoặc gõ sai chính tả vẫn ra), không còn ô chọn kiểu tìm. Các điều kiện kết hợp bằng AND, đều chạy ở server.

## 1. Công nghệ sử dụng

- **Node.js, Express.js:** xây dựng máy chủ và định tuyến.
- **EJS:** tạo giao diện HTML được render từ phía máy chủ.
- **Sequelize:** ánh xạ và thao tác với cơ sở dữ liệu thông qua mô hình (ORM).
- **PostgreSQL / Supabase:** lưu trữ dữ liệu món ăn, đầu bếp và nguyên liệu.
- **HTML, CSS, JavaScript:** xây dựng giao diện và các tương tác phía trình duyệt.
- **Web Audio API:** tạo hiệu ứng âm thanh trực tiếp trên trình duyệt.
- **Sharp:** hỗ trợ xử lý, tối ưu hình ảnh qua script của dự án.

## 2. Chức năng chính

### Giao diện khách hàng

- Khám phá con phố lấy ý tưởng từ Phố cổ Hội An (Việt Nam) và truy cập khu vực quán ăn.
- Xem danh sách món ăn lấy từ cơ sở dữ liệu.
- Tìm kiếm món theo tên.
- Mở trang chi tiết để xem thông tin món ăn.
- Xem các món trên giao diện bàn tròn và thao tác với món còn phục vụ.
- Thêm món vào hàng chờ đặt món tạm thời trên trình duyệt.

### Đăng nhập và phân quyền

- Chọn vai trò **Khách hàng** hoặc **Quản trị / Đầu bếp** tại trang đăng nhập.
- Khách hàng truy cập giao diện dành cho khách.
- Quản trị viên được phép truy cập khu vực quản lý dữ liệu.
- Các đường dẫn quản trị được kiểm tra quyền truy cập ở phía máy chủ.

> Lưu ý: phiên bản hiện tại dùng cơ chế chọn vai trò, chưa triển khai xác thực bằng mật khẩu hoặc tài khoản cá nhân.

### Quản trị dữ liệu

Quản trị viên có thể thực hiện các thao tác CRUD (thêm, xem danh sách, chỉnh sửa và xóa) đối với:

- **Món ăn:** tên, mô tả, giá, danh mục, trạng thái phục vụ, đầu bếp và nguyên liệu liên quan.
- **Đầu bếp:** tên và chuyên môn.
- **Nguyên liệu:** tên và đơn vị tính.

Khu vực quản trị sử dụng biểu mẫu được render từ máy chủ, có kiểm tra dữ liệu đầu vào, thông báo lỗi và phân trang danh sách.

## 3. Cài đặt và chạy dự án

### Yêu cầu

- Node.js và npm.
- Một cơ sở dữ liệu PostgreSQL; dự án được cấu hình để kết nối với Supabase.
- Chuỗi kết nối cơ sở dữ liệu hợp lệ.

### Bước 1: Cài đặt thư viện

Mở terminal tại thư mục dự án và chạy:

```bash
npm install
```

### Bước 2: Cấu hình biến môi trường

Sao chép `.env.example` thành `.env`, sau đó cập nhật thông tin kết nối:

```env
DATABASE_URL=postgresql://YOUR_CONNECTION_STRING
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Thay `DATABASE_URL` bằng chuỗi kết nối PostgreSQL thực tế trong phần **Project Settings → Database** của Supabase. Dự án khuyến nghị sử dụng **Session pooler, cổng 5432**.

Không đưa file `.env` hoặc khóa bí mật lên kho mã nguồn công khai.

### Bước 3: Tạo index tìm kiếm + nạp dữ liệu mẫu

```bash
npm run db:migrate   # tạo bảng còn thiếu + extension unaccent, pg_trgm + hàm f_norm/f_tsv + index (chạy lại an toàn, không xóa dữ liệu)
npm run db:seed      # nạp dữ liệu demo (chạy lại an toàn, không tạo trùng, không xóa gì)
```

Seed nạp đủ mức yêu cầu của tài liệu bổ sung (≥ 1.000 món, ≥ 60 đầu bếp):

| Bảng               | Số lượng  | Ghi chú                                                                                                                                                                                                                                                   |
| ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dishes`           | **1.000** | 10 món gốc + 12 món đặc biệt (tên không dấu, tên rất ngắn / rất dài, có `%` `_` `'` `&`, mô tả NULL) + món sinh theo công thức. ~15% mô tả NULL, ~15% hết món, 5 danh mục, giá 15.000–99.000đ (chỉ 80 mức giá nên trùng giá rất nhiều → thử sort ổn định) |
| `chefs`            | **60**    | 4 người gốc + 56 người thêm, vài người không có chuyên môn (NULL); mỗi người nấu 16–20 món                                                                                                                                                                |
| `ingredients`      | **120**   | đề không quy định số lượng, chọn 120 (đủ 13 đơn vị tính) để demo search/filter/sort                                                                                                                                                                       |
| `dish_ingredients` | ~4.900    | mỗi món 2–6 nguyên liệu                                                                                                                                                                                                                                   |

- Dữ liệu sinh theo công thức cố định → mỗi lần chạy ra đúng cùng một bộ dữ liệu. Chỉ tạo bản ghi **chưa có tên**, nên chạy lại không bị trùng.
- Chạy lại chỉ tạo phần **còn thiếu** để tổng đạt `TARGET` (đếm theo số bản ghi hiện có, kể cả món thêm tay qua CRUD): không bao giờ vượt, không trùng tên. Dữ liệu mẫu được kiểm tra (đủ số lượng, không trùng tên) **trước** khi ghi vào DB nên lỗi không để lại dữ liệu ghi dở.
- Cuối lệnh in số bản ghi từng bảng. Muốn đổi số lượng: sửa `TARGET` ở đầu `scripts/seed.js` (script tự báo nếu `CHEFS` / `INGREDIENTS` / `NHOM` × `BIEN_THE` không đủ tên duy nhất).
- `npm run db:seed:reset` (= `node scripts/seed.js --reset --yes`) mới **xóa sạch** 3 bảng rồi tạo lại; thiếu một trong hai cờ `--reset`, `--yes` thì script từ chối chạy.
- Server cũng tự chạy migration khi khởi động nếu DB chưa có `f_norm` (lỗi chỉ cảnh báo).
- Postgres chạy ở `localhost` tự tắt SSL; Supabase vẫn bật SSL. Ép tắt SSL bằng `DB_SSL=false`.

### Bước 4: Khởi động máy chủ

Chạy chế độ thông thường:

```bash
npm start
```

Hoặc chạy chế độ phát triển tự khởi động lại khi mã nguồn thay đổi:

```bash
npm run dev
```

Mở trình duyệt tại: <http://localhost:3000>

Nếu đã đổi giá trị `PORT` trong `.env`, hãy truy cập cổng tương ứng.

## 4. Các trang và đường dẫn

| Chức năng           | Phương thức và đường dẫn    | Mô tả                                                     |
| ------------------- | --------------------------- | --------------------------------------------------------- |
| Trang chủ           | `GET /`                     | Giao diện con phố Ba Cô Gái.                              |
| Giao diện khách     | `GET /khach`                | Bàn tròn hiển thị các món ăn từ cơ sở dữ liệu.            |
| Danh sách món       | `GET /dishes?q=`            | Hiển thị và tìm kiếm món ăn theo từ khóa.                 |
| Chi tiết món        | `GET /dishes/:id`           | Xem thông tin của một món; trả về 404 nếu không tìm thấy. |
| Đăng nhập           | `GET /login`, `POST /login` | Chọn vai trò sử dụng hệ thống.                            |
| Đăng xuất           | `POST /logout`              | Kết thúc phiên hiện tại.                                  |
| Quản lý món ăn      | `/admin/dishes`             | Danh sách và các thao tác quản trị món ăn.                |
| Quản lý đầu bếp     | `/admin/chefs`              | Danh sách và các thao tác quản trị đầu bếp.               |
| Quản lý nguyên liệu | `/admin/ingredients`        | Danh sách và các thao tác quản trị nguyên liệu.           |

Trong mỗi khu vực quản trị, các thao tác gồm xem danh sách, mở biểu mẫu thêm mới, tạo bản ghi, mở biểu mẫu chỉnh sửa, cập nhật và xác nhận xóa. Danh sách hỗ trợ phân trang bằng tham số `?page=`.

## 5. Cấu trúc thư mục

```text
Block-5-main/
├── public/
│   ├── css/style.css          # Giao diện và hiệu ứng CSS
│   ├── img/                   # Hình ảnh giao diện
│   └── js/                    # JavaScript phía trình duyệt
├── scripts/
│   └── seed.js                # Tạo bảng và dữ liệu mẫu
├── src/
│   ├── admin/resources.js     # Cấu hình trường dữ liệu quản trị
│   ├── config/database.js     # Kết nối PostgreSQL
│   ├── middleware/auth.js     # Kiểm tra quyền truy cập
│   ├── models/                # Các mô hình và quan hệ dữ liệu
│   ├── api/                   # Mã lỗi, định dạng phản hồi, CORS, xử lý lỗi cho REST API
│   ├── routes/                # api.js = REST API
│   ├── utils/                 # Hàm hỗ trợ dùng chung
│   ├── views/                 # Giao diện EJS
│   ├── app.js                 # Cấu hình Express
│   └── server.js              # Khởi tạo kết nối và máy chủ
├── .env.example               # Mẫu biến môi trường
├── package.json
└── README.md
```

## 6. Âm thanh và tương tác

Âm thanh được tạo bằng Web Audio API trong `public/js/am-thanh.js`, không cần tải sẵn các tệp MP3. Tùy trang, hiệu ứng có thể bao gồm tiếng chim, xe cộ, chén đĩa, dao thớt và âm thanh khi thao tác với giao diện.

- Nút loa ở góc dưới bên trái dùng để bật hoặc tắt âm thanh.
- Trạng thái bật/tắt được lưu trong `localStorage` của trình duyệt.
- Trình duyệt chỉ cho phép phát âm thanh sau khi người dùng tương tác lần đầu.

## 7. Một số giới hạn của phiên bản hiện tại

- Đăng nhập chỉ là chọn vai trò, chưa có xác thực bằng mật khẩu hoặc tài khoản cá nhân.
- Hàng chờ / thao tác đặt món ở giao diện khách chỉ lưu tạm trên trình duyệt; chưa có bảng đơn hàng trong cơ sở dữ liệu.
- Dữ liệu đầu bếp hiện chỉ gồm tên và chuyên môn.
- Dữ liệu nguyên liệu không có số lượng định mức theo từng món; giao diện hiển thị tên và đơn vị tính.
- Biểu tượng món ăn được chọn theo tên hoặc danh mục bằng logic trong mã nguồn, không phải ảnh riêng cho từng món.
- Các thao tác quản trị được xử lý bằng biểu mẫu và điều hướng phía máy chủ, không dùng fetch/AJAX cho CRUD.

## 8. Lệnh npm

| Lệnh                    | Công dụng                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `npm install`           | Cài đặt các thư viện cần thiết.                                                      |
| `npm start`             | Khởi động máy chủ.                                                                   |
| `npm run dev`           | Chạy máy chủ với nodemon trong quá trình phát triển.                                 |
| `npm run db:migrate`    | Tạo bảng còn thiếu + extension/hàm/index tìm kiếm (chạy lại an toàn).                |
| `npm run db:seed`       | Nạp 1.000 món / 60 đầu bếp / 120 nguyên liệu, không xóa, không trùng.                |
| `npm run db:seed:reset` | Xóa sạch rồi seed lại (cần `--reset --yes`).                                         |
| `npm run test:search`   | 102 kiểm tra API: phân trang, search, filter, sort, fulltext, fuzzy, ký tự đặc biệt. |

## 9. Backend REST API (`/api`)

Endpoint, mô hình dữ liệu và danh sách kiểm tra đầy đủ: xem **[API.md](API.md)** (backend làm đúng hợp đồng này). Mục này tóm tắt các quy ước chính và phần riêng của backend.

### Định dạng phản hồi

| Tình huống            | HTTP        | Body                                                                         |
| --------------------- | ----------- | ---------------------------------------------------------------------------- |
| Thành công            | `200`       | `{ "ok": true, "data": ..., "meta"?: ... }` (`meta` chỉ có ở danh sách)      |
| Xóa thành công        | `200`       | `{ "ok": true, "data": null }`                                               |
| Lỗi nghiệp vụ đã biết | `200`       | `{ "ok": false, "error": { "code", "message", "fields"? } }`                 |
| Lỗi kỹ thuật          | `4xx / 5xx` | `{ "error": { "code", "message", "requestId" } }` — **không có** trường `ok` |

Frontend kiểm tra ba tầng (có response không → HTTP status → `ok` true/false) rồi xử lý theo `error.code`, không so sánh nội dung `message`.

### Mã lỗi (`src/api/errors.js`)

- **Lỗi nghiệp vụ (HTTP 200, `ok: false`):** `NOT_FOUND`, `VALIDATION_FAILED` (kèm `fields` theo từng ô nhập), `ALREADY_EXISTS`, `RESOURCE_IN_USE`, `RELATION_CONFLICT`.
- **Lỗi kỹ thuật (đúng mã HTTP):**

| HTTP      | `code`                                        |
| --------- | --------------------------------------------- |
| 400       | `INVALID_JSON`, `BAD_REQUEST`                 |
| 401       | `UNAUTHORIZED` (chưa chọn vai)                |
| 403       | `FORBIDDEN` (vai `user`), `CORS_NOT_ALLOWED`  |
| 404       | `ROUTE_NOT_FOUND` (sai URL `/api/...`)        |
| 413 / 415 | `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` |
| 500       | `DB_UNAVAILABLE`, `INTERNAL_ERROR`            |

### Endpoint chính

| Phương thức | Đường dẫn                                       | Quyền     |
| ----------- | ----------------------------------------------- | --------- |
| GET         | `/api/auth/me`, `/api/options`                  | công khai |
| POST        | `/api/auth/login`, `/api/auth/logout`           | công khai |
| GET         | `/api/dishes`, `/api/dishes/:id`                | công khai |
| GET         | `/api/chefs`, `/api/ingredients` (+ `/:id`)     | admin     |
| POST        | `/api/dishes`, `/api/chefs`, `/api/ingredients` | admin     |
| PATCH       | `/api/:resource/:id`                            | admin     |
| DELETE      | `/api/:resource/:id`                            | admin     |

- Sửa dùng **PATCH** (không có PUT): trường không gửi thì giữ nguyên, nhưng mọi trường vẫn được validate lại.
- Thêm/sửa **món ăn** dùng `multipart/form-data` (có ảnh JPG/PNG/WEBP ≤ 3MB); đầu bếp và nguyên liệu dùng JSON.
- Danh sách: `?q=` (tìm theo tên, không phân biệt hoa/thường và dấu tiếng Việt, khớp chữ đầu/giữa/cuối), `?sort=` (tên A→Z / Z→A, mới thêm, giá tăng/giảm), bộ lọc (`category`, `available`, `minPrice`, `maxPrice`, `specialty`, `unit`), `?page=` (9 mục/trang), `?focus=<id>` (trả đúng trang chứa id đó) hoặc `?all=true`. Lọc và sắp xếp chạy trên toàn bộ dữ liệu rồi mới cắt trang; chi tiết ở **[API.md](API.md)**.
- Danh sách rỗng hoặc tìm không thấy → `200` với `data: []`; id không có (kể cả sai kiểu như `abc`) → `200` `ok: false` `NOT_FOUND`.
- Phân quyền kiểm tra **trước** khi đọc dữ liệu: không có vai → `401`, vai `user` → `403`. `GET` không bao giờ ghi dữ liệu.

### Phần bổ sung của backend

- Lỗi 5xx chỉ trả câu chung; chuỗi kết nối DB, SQL và stack trace chỉ nằm trong log kèm `requestId` (cũng gửi qua header `X-Request-Id`). Không kết nối được DB → `500 DB_UNAVAILABLE`.
- Thêm/sửa món (kèm nguyên liệu) chạy trong transaction; phản hồi chỉ gửi sau khi mọi thao tác bất đồng bộ hoàn tất. Chỉ các trường đã khai báo mới được ghi vào DB.
- `price` luôn trả về kiểu số.
- Vai (`role`) được lưu trong cookie, đọc ở `src/middleware/auth.js`.
- `GET /healthz` (ngoài `/api`, không đụng DB) dùng cho dịch vụ ping giữ máy chủ không "ngủ"; `GET /api/health` kiểm tra kết nối DB.
- **CORS** (chỉ cần khi SPA ở origin khác API): đặt `CORS_ORIGIN` trong `.env` (nhiều origin cách nhau bằng dấu phẩy); origin lạ bị `403 CORS_NOT_ALLOWED`; preflight `OPTIONS` trả `204`. Bỏ trống thì chỉ cho các origin dev thông dụng (`localhost:3000/5173/4200/5500`). Nên dùng origin cụ thể thay vì `*`.
- **Routing phía client:** server trả `index.html` cho mọi đường dẫn GET không phải `/api` và không có đuôi file, nên Reload ở `/dishes/2` hay `/admin/dishes/3/edit` vẫn đúng trang.

Các file backend: `src/app.js`, `src/routes/api.js`, `src/api/` (`errors.js`, `response.js`, `middleware.js`, `serializers.js`).

## 10. Tìm kiếm trên PostgreSQL

**Chạy ở đâu:** toàn bộ ở database. Client chỉ gửi tham số; ô lọc tức thì ở client chỉ để hiện kết quả tạm trong lúc chờ server.
**Thứ tự xử lý:** `WHERE` (search + filter, nối bằng AND) → `ORDER BY …, id ASC` → `LIMIT/OFFSET`. `total` = `COUNT(*)` với cùng `WHERE`, tính trước khi cắt trang.

### Tham số `GET /api/dishes | /api/chefs | /api/ingredients`

| Tham số     | Giá trị                                                                                                                                      | Ghi chú                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `mode`      | `basic` (mặc định) · `advanced` · `fulltext` · `fuzzy`                                                                                       | sai giá trị → `VALIDATION_FAILED`                                                            |
| `q`         | chuỗi ≤ 100 ký tự                                                                                                                            | trim, nhiều khoảng trắng → 1; rỗng = không có điều kiện                                      |
| `sortBy`    | `name` · `newest` · `price` (món) · `relevance`                                                                                              | `relevance` chỉ có nghĩa khi `mode=fulltext/fuzzy` và có `q` (là mặc định ở hai mode đó)     |
| `sortOrder` | `asc` · `desc`                                                                                                                               | `sort=price_desc`… kiểu cũ vẫn dùng được                                                     |
| `page`      | số nguyên ≥ 1                                                                                                                                | `0`, `-1`, `abc`, `1.5` → `VALIDATION_FAILED`; vượt tổng số trang → `items` rỗng (không kẹp) |
| `pageSize`  | 1…60 (mặc định 9)                                                                                                                            | ngoài khoảng → `VALIDATION_FAILED`                                                           |
| `focus`     | id                                                                                                                                           | trả đúng trang đang chứa id đó (bookmark `?sel=`)                                            |
| `all=true`  |                                                                                                                                              | lấy hết, không phân trang                                                                    |
| Món ăn      | `category`, `available` (`true`/`false`), `minPrice`, `maxPrice`, `chefId`, `chef` (tên đầu bếp, chứa chuỗi, không phân biệt hoa/thường/dấu) | `0` và `false` là giá trị hợp lệ; `minPrice > maxPrice` → lỗi                                |
| Đầu bếp     | `specialty`                                                                                                                                  | chứa chuỗi, không phân biệt hoa/thường/dấu                                                   |
| Nguyên liệu | `unit`                                                                                                                                       |                                                                                              |

Phản hồi: `{ ok, data: [...], meta: { total, page, pageSize, perPage, totalPages, sort, sortBy, sortOrder, mode } }`. Giữ đúng quy ước của dự án: lỗi nghiệp vụ trả HTTP 200 + `ok:false`, `code: VALIDATION_FAILED` kèm `fields` (tài liệu bổ sung gợi ý dùng status lỗi; mình giữ quy ước cũ vì frontend hiện tại dựa vào nó).

Ví dụ:

```text
/api/dishes?q=pho&minPrice=20000&maxPrice=80000&sortBy=price&sortOrder=asc&page=2&pageSize=12
/api/dishes?mode=fulltext&q=hầm xương
/api/dishes?mode=fuzzy&q=spagheti
/dishes?q=pho&sort=price_asc&page=2&view=pagination        (URL giao diện, bookmark được)
/dishes/45                                                   (chi tiết một món, mở trực tiếp / F5 đều đúng)
```

### Tiếng Việt không dấu + index (`db/migrations/001_search_setup.sql`)

- `f_norm(text)` = `lower(unaccent(...))` + `đ→d`, khai báo `IMMUTABLE` để dùng trong index. Được áp dụng **cho cả dữ liệu lẫn từ khóa** ngay trong SQL nên luôn nhất quán ("pho" ↔ "Phở", "bun bo" ↔ "Bún bò").
- `f_tsv(a, b)` = `to_tsvector('simple', f_norm(coalesce(a,'') || ' ' || coalesce(b,'')))`: mô tả NULL không làm hỏng kết quả.
- Index: GIN `gin_trgm_ops` trên `f_norm(name)` của 3 bảng (+ `chefs.specialty`) phục vụ `LIKE '%x%'` và fuzzy; GIN trên `f_tsv(...)` phục vụ full-text; B-tree cho giá, danh mục, `chefId`. Đã kiểm tra bằng `EXPLAIN`: cả 3 kiểu tìm đều dùng Bitmap Index Scan.

| Kiểu       | Điều kiện SQL                                                                                                 | Tìm trên                                                        | Sắp xếp mặc định              |
| ---------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------- |
| `basic`    | mỗi từ: `f_norm(name) LIKE '%từ%' ESCAPE` (AND giữa các từ)                                                   | tên (cả 3 tab)                                                  | tên A→Z, `id`                 |
| `advanced` | như `basic` (cùng luật khớp tên) + các bộ lọc `category`/`minPrice`/`maxPrice`/`available` ghép AND           | tên + bộ lọc                                                    | tên A→Z, `id`                 |
| `fulltext` | `f_tsv(...) @@ plainto_tsquery('simple', f_norm(q))`                                                          | món: tên + mô tả · đầu bếp: tên + chuyên môn · nguyên liệu: tên | `ts_rank` giảm dần, `id`      |
| `fuzzy`    | `f_norm(name) % f_norm(q)` (pg_trgm, **ngưỡng similarity 0.3** = mặc định của `pg_trgm.similarity_threshold`) | tên (cả 3 tab)                                                  | `similarity()` giảm dần, `id` |

- `%`, `_`, `\` người dùng gõ được escape trong SQL, chỉ khớp đúng ký tự đó. Input rỗng không tạo SQL lỗi; `plainto_tsquery` nuốt ký tự đặc biệt nên `& | ! ( ) :*` không gây lỗi cú pháp.
- Full-text dùng `plainto_tsquery` nên khớp **cả từ** (không khớp tiền tố) và cần có đủ các từ; muốn khớp một phần từ hãy dùng `basic`.
- Sắp theo tên dùng `f_norm(name)` (bỏ dấu) rồi tới `id`, nên "Phở…" và "Pho…" nằm lẫn nhau; không dùng collation `vi-VN` vì Supabase không bảo đảm có sẵn.
- **Chưa có sort theo điểm đánh giá**: schema không có cột rating, nên chưa tự thêm.

### Kiểm thử

```bash
npm run db:migrate && npm run db:seed && npm run test:search
```

`scripts/test-search.js` chạy 102 kiểm tra trên DB thật (chỉ đọc, trừ nhóm CRUD ở cuối: tạo rồi xóa 1 nguyên liệu tạm): seed, phân trang (page ngoài khoảng, pageSize sai, duyệt hết trang không mất/lặp), search hoa/thường/dấu/đầu/giữa/cuối, input rỗng, `%` `_` `'` và chuỗi kiểu SQL injection, filter kết hợp AND, `minPrice=0`, `available=false`, `minPrice>maxPrice`, sort tăng/giảm/trùng giá + id, full-text (mô tả NULL), fuzzy (gõ sai, không kết quả, thứ tự), `focus`, lọc theo tên đầu bếp, 401/403/404, CRUD ↔ total.

### Chưa làm / ghi chú

- Bằng chứng bàn giao (EXPLAIN, ví dụ API, ảnh chụp 3 chế độ + dây kéo, kiểm tra trình duyệt): xem **[docs/BAN_GIAO.md](docs/BAN_GIAO.md)**.
- URL giao diện dùng `sort=price_asc` (không phải `sortBy=&sortOrder=`) và chưa có `pageSize` trên URL (cố định 9/trang); API thì nhận cả hai kiểu và `pageSize` 1–60.
- Phản hồi danh sách là `{ ok, data: [...], meta: {...} }` thay vì `data: { items, total, ... }` như ví dụ của tài liệu bổ sung (giữ nguyên hợp đồng cũ để không phá frontend/CRUD).

- Giao diện đã chạy thử bằng Chromium headless (Playwright) với 1.000 món: 3 chế độ, dây kéo, lọc đầu bếp, bookmark, Back + cuộn (xem docs/BAN_GIAO.md). Chưa thử trên Safari / Firefox / thiết bị cảm ứng thật.
- `mock-server/` chưa hỗ trợ `mode` / `pageSize` / `sortBy` (chỉ dùng để xem giao diện không cần DB).
