// Convert flat variant_group model into parent->variant model.
// parent_id NULL = catalog parent (not sellable); parent_id set = sellable variant.
// Idempotent: gated on presence of the legacy variant_group column.
require('dotenv').config({quiet:true});
const mysql = require('mysql2/promise');

async function main() {
  const db = await require('./connection.cjs').connect();
  try {
    const [cols] = await db.query('SHOW COLUMNS FROM room_types');
    if (!cols.some(c => c.Field === 'parent_id')) {
      await db.query('ALTER TABLE room_types ADD COLUMN parent_id INT NULL');
    }
    const [cols2] = await db.query('SHOW COLUMNS FROM room_types');
    if (!cols2.some(c => c.Field === 'variant_group')) {
      console.log('Room parent model already migrated.');
      return;
    }
    const [groups] = await db.query(
      `SELECT apartment_id, COALESCE(variant_group, name) AS g, MIN(base_price) AS minp, MAX(max_occupancy) AS maxo
       FROM room_types WHERE parent_id IS NULL GROUP BY apartment_id, g`
    );
    for (const grp of groups) {
      const [children] = await db.query(
        `SELECT id, description, bed_config, area FROM room_types WHERE apartment_id=? AND COALESCE(variant_group,name)=? AND parent_id IS NULL ORDER BY id`,
        [grp.apartment_id, grp.g]
      );
      if (!children.length) continue;
      const rep = children[0];
      const [ins] = await db.query(
        `INSERT INTO room_types (name, apartment_id, base_price, max_occupancy, description, bed_config, area, is_active, parent_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,NULL,NOW())`,
        [grp.g, grp.apartment_id, grp.minp, grp.maxo, rep.description || '', rep.bed_config || '1 giường đôi', rep.area || 28, 1]
      );
      const pid = ins.insertId;
      const childIds = children.map(c => c.id);
      await db.query(`UPDATE room_types SET parent_id=? WHERE id IN (${childIds.map(()=>'?').join(',')})`, [pid, ...childIds]);
      // amenities: union of children -> parent, then remove child links
      await db.query(
        `INSERT INTO room_amenities (room_types_id, amenity_id)
         SELECT ?, t.amenity_id FROM (SELECT DISTINCT amenity_id FROM room_amenities WHERE room_types_id IN (${childIds.map(()=>'?').join(',')})) t
         WHERE NOT EXISTS (SELECT 1 FROM room_amenities x WHERE x.room_types_id=? AND x.amenity_id=t.amenity_id)`,
        [pid, ...childIds, pid]
      );
      await db.query(`DELETE FROM room_amenities WHERE room_types_id IN (${childIds.map(()=>'?').join(',')})`, childIds);
      // type-level images: dedup children -> parent, then remove child rows
      await db.query(
        `INSERT INTO ROOM_IMAGES (room_types_id, image_url, created_at)
         SELECT ?, t.image_url, NOW() FROM (SELECT DISTINCT image_url FROM ROOM_IMAGES WHERE room_id IS NULL AND room_types_id IN (${childIds.map(()=>'?').join(',')})) t
         WHERE NOT EXISTS (SELECT 1 FROM ROOM_IMAGES x WHERE x.room_types_id=? AND x.image_url=t.image_url)`,
        [pid, ...childIds, pid]
      );
      await db.query(`DELETE FROM ROOM_IMAGES WHERE room_id IS NULL AND room_types_id IN (${childIds.map(()=>'?').join(',')})`, childIds);
    }
    await db.query('ALTER TABLE room_types DROP COLUMN variant_group, DROP COLUMN variant_label');
    console.log('Room parent->variant migration complete.');
  } finally { await db.end(); }
}
main().catch(e => { console.error('Room parent migration failed:', e); process.exitCode = 1; });