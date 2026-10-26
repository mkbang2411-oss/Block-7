// Địa chỉ gốc của REST API.
//  - Frontend và backend chạy CÙNG origin (backend serve thư mục frontend): để "/api".
//  - Backend chạy origin khác (vd http://localhost:3000) trong lúc dev: sửa thành
//    "http://localhost:3000/api" và nhớ bật CORS (có credentials) ở backend, xem API.md mục 6.
export const API_BASE = window.API_BASE || "/api";
