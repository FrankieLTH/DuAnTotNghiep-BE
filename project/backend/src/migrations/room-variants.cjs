// One-time conversion of priced room characteristics into independently priced room types.
// Re-running is safe: migrated rooms have no legacy feature_ids.
require('dotenv').config({quiet:true});
const mysql = require('mysql2/promise');

async function main() {
  const db = await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE});
  try {
    const [typeColumns] = await db.query('SHOW COLUMNS FROM room_types');
    if (!typeColumns.some(c => c.Field === 'variant_group')) await db.query('ALTER TABLE room_types ADD COLUMN variant_group VARCHAR(120) NULL');
    if (!typeColumns.some(c => c.Field === 'variant_label')) await db.query("ALTER TABLE room_types ADD COLUMN variant_label VARCHAR(100) NOT NULL DEFAULT 'Tiêu chuẩn'");
    await db.query('UPDATE room_types SET variant_group=name WHERE variant_group IS NULL');
    const [roomColumns] = await db.query('SHOW COLUMNS FROM ROOMS');
    if (!roomColumns.some(c => c.Field === 'feature_ids')) await db.query('ALTER TABLE ROOMS ADD COLUMN feature_ids JSON NULL');
    const [tables] = await db.query("SHOW TABLES LIKE 'room_features'");
    if (!tables.length) return;
    const [features] = await db.query('SELECT id,name,category,extra_price_per_night FROM room_features');
    const catalog = new Map(features.map(f => [f.id, f]));
    const [rooms] = await db.query('SELECT room_id,room_type_id,feature_ids FROM ROOMS WHERE feature_ids IS NOT NULL');
    const [types] = await db.query('SELECT * FROM room_types');
    const typeMap = new Map(types.map(t => [t.id, t]));
    const variantMap = new Map();
    for (const room of rooms) {
      const ids = typeof room.feature_ids === 'string' ? JSON.parse(room.feature_ids) : room.feature_ids;
      if (!Array.isArray(ids) || !ids.length) continue;
      const selected = ids.map(id => catalog.get(id)).filter(Boolean);
      if (selected.length !== ids.length) throw new Error(`Unknown feature on room ${room.room_id}`);
      const type = typeMap.get(room.room_type_id);
      if (!type) throw new Error(`Unknown room type on room ${room.room_id}`);
      // Characteristics already included in the room price become included amenities.
      for (const feature of selected.filter(f => Number(f.extra_price_per_night) === 0)) {
        let [[amenity]] = await db.query('SELECT id FROM amenities WHERE name=? LIMIT 1',[feature.name]);
        if (!amenity) {
          const [insert] = await db.query('INSERT INTO amenities (name,category) VALUES (?,?)',[feature.name,feature.category]);
          amenity = {id:insert.insertId};
        }
        const [[link]] = await db.query('SELECT id FROM room_amenities WHERE room_id=? AND amenity_id=? LIMIT 1',[room.room_id,amenity.id]);
        if (!link) await db.query('INSERT INTO room_amenities (room_id,amenity_id) VALUES (?,?)',[room.room_id,amenity.id]);
      }
      const paid = selected.filter(f => Number(f.extra_price_per_night) > 0).sort((a,b)=>a.id-b.id);
      if (paid.length) {
        const key = `${type.id}:${paid.map(f=>f.id).join(',')}`;
        let targetId = variantMap.get(key);
        if (!targetId) {
          const label = paid.map(f=>f.name).join(' + ').slice(0,100);
          const variantName = `${type.name} - ${label}`.slice(0,255);
          const [[existing]] = await db.query('SELECT id FROM room_types WHERE apartment_id=? AND variant_group=? AND variant_label=? LIMIT 1',[type.apartment_id,type.variant_group,label]);
          if (existing) targetId = existing.id;
          else {
            const price = Number(type.base_price) + paid.reduce((sum,f)=>sum+Number(f.extra_price_per_night),0);
            const [insert] = await db.query('INSERT INTO room_types (name,apartment_id,base_price,max_occupancy,description,bed_config,area,is_active,variant_group,variant_label) VALUES (?,?,?,?,?,?,?,?,?,?)',[variantName,type.apartment_id,price,type.max_occupancy,type.description,type.bed_config,type.area,type.is_active,type.variant_group,label]);
            targetId = insert.insertId;
            await db.query('INSERT INTO ROOM_IMAGES (room_types_id,image_url,created_at) SELECT ?,image_url,NOW() FROM ROOM_IMAGES WHERE room_types_id=?',[targetId,type.id]);
            await db.query('INSERT INTO room_amenities (room_types_id,amenity_id) SELECT ?,amenity_id FROM room_amenities WHERE room_types_id=?',[targetId,type.id]);
          }
          variantMap.set(key,targetId);
        }
        await db.query('UPDATE ROOMS SET room_type_id=? WHERE room_id=?',[targetId,room.room_id]);
      }
      await db.query('UPDATE ROOMS SET feature_ids=NULL WHERE room_id=?',[room.room_id]);
    }
    await db.query('DROP TABLE room_features');
    console.log('Room variants migrated. Pricing now belongs to room_types.');
  } finally { await db.end(); }
}
main().catch(error => { console.error('Room variant migration failed:',error); process.exitCode=1; });
