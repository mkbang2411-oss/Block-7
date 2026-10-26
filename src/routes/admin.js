// ===== TRANG QUẢN TRỊ: CRUD theo bảng cho dishes, chefs, ingredients =====
//   GET    /admin/:resource             danh sách
//   GET    /admin/:resource/new         form thêm
//   POST   /admin/:resource             thêm            -> 303
//   GET    /admin/:resource/:id/edit    form sửa
//   PATCH  /admin/:resource/:id         sửa             -> 303
//   GET    /admin/:resource/:id/delete  trang xác nhận xóa
//   DELETE /admin/:resource/:id         xóa             -> 303
// Form HTML chỉ có GET/POST nên PATCH/DELETE đi qua method-override (?_method=...),
// hoàn toàn phía server, không dùng fetch/AJAX/JS client.
const express = require('express');
const resources = require('../admin/resources');
const { parseId, asyncHandler } = require('../utils/format');

const router = express.Router();
const PER_PAGE = 9; // lưới 3x3
const navResources = Object.values(resources).map(({ key, title }) => ({ key, title }));
const FLASH = {
  created: 'Thêm thành công.',
  updated: 'Cập nhật thành công.',
  deleted: 'Xóa thành công.',
};

router.use((req, res, next) => {
  res.locals.navResources = navResources;
  res.locals.flash = FLASH[req.query.success] || null;
  next();
});

router.get('/', (req, res) => res.redirect(303, '/admin/dishes'));

async function findRecord(r, idParam) {
  const id = parseId(idParam);
  if (!id) return null;
  return r.model.findByPk(id, { include: r.include });
}

async function renderForm(res, r, { record = null, values, errors = {}, status = 200 }) {
  const options = await r.loadOptions();
  res.status(status).render('admin/form', { r, record, values, errors, options });
}

Object.values(resources).forEach((r) => {
  const base = `/${r.key}`;

  router.get(
    base,
    asyncHandler(async (req, res) => {
      const all = await r.model.findAll({ include: r.include, order: r.order });
      // phân trang phía server: /admin/dishes?page=2
      const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
      const asked = parseInt(req.query.page, 10);
      const page = Math.min(Math.max(Number.isInteger(asked) ? asked : 1, 1), totalPages);
      const rows = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      res.render('admin/list', { r, rows, page, totalPages, total: all.length });
    })
  );

  router.get(
    `${base}/new`,
    asyncHandler(async (req, res) => {
      const empty = Object.fromEntries(
        r.fields.map((f) => [f.name, f.type === 'multiselect' ? [] : f.type === 'checkbox' ? true : ''])
      );
      await renderForm(res, r, { values: empty });
    })
  );

  router.post(
    base,
    asyncHandler(async (req, res) => {
      const { errors, values, data } = await r.parse(req.body, null);
      if (Object.keys(errors).length) {
        return renderForm(res, r, { values, errors, status: 400 });
      }
      const record = await r.model.create(data);
      if (r.afterSave) await r.afterSave(record, data);
      res.redirect(303, `/admin${base}?success=created`);
    })
  );

  router.get(
    `${base}/:id/edit`,
    asyncHandler(async (req, res, next) => {
      const record = await findRecord(r, req.params.id);
      if (!record) return next();
      await renderForm(res, r, { record, values: r.toValues(record) });
    })
  );

  router.patch(
    `${base}/:id`,
    asyncHandler(async (req, res, next) => {
      const record = await findRecord(r, req.params.id);
      if (!record) return next();
      const { errors, values, data } = await r.parse(req.body, record);
      if (Object.keys(errors).length) {
        return renderForm(res, r, { record, values, errors, status: 400 });
      }
      await record.update(data);
      if (r.afterSave) await r.afterSave(record, data);
      res.redirect(303, `/admin${base}?success=updated`);
    })
  );

  router.get(
    `${base}/:id/delete`,
    asyncHandler(async (req, res, next) => {
      const record = await findRecord(r, req.params.id);
      if (!record) return next();
      const blockReason = r.blockDelete ? await r.blockDelete(record) : null;
      res.render('admin/confirm-delete', { r, record, blockReason });
    })
  );

  router.delete(
    `${base}/:id`,
    asyncHandler(async (req, res, next) => {
      const record = await findRecord(r, req.params.id);
      if (!record) return next();
      const blockReason = r.blockDelete ? await r.blockDelete(record) : null;
      if (blockReason) {
        return res.status(409).render('admin/confirm-delete', { r, record, blockReason });
      }
      await record.destroy();
      res.redirect(303, `/admin${base}?success=deleted`);
    })
  );
});

module.exports = router;