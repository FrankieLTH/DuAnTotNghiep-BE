// Seed a modest, editable demo amenity set for the original 36 rooms.
// These rows are linked at room-type level; room-specific amenities remain separate.
require('dotenv').config({quiet:true});
const mysql=require('mysql2/promise');

async function main(){
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE});
  try{
    const [[done]]=await db.query("SELECT id FROM AUDIT_LOGS WHERE action='SEED_ROOM_AMENITIES_V1' LIMIT 1");
    if(done)return;
    await db.beginTransaction();
    const standard=[
      ['Wi-Fi miễn phí','Tiện nghi'],
      ['Điều hòa','Thiết bị'],
      ['TV','Giải trí'],
      ['Phòng tắm riêng','Phòng tắm'],
    ];
    const amenityIds=[];
    for(const [name,category] of standard){
      let [[row]]=await db.query('SELECT id FROM amenities WHERE name=? LIMIT 1',[name]);
      if(!row){const [insert]=await db.query('INSERT INTO amenities (name,category) VALUES (?,?)',[name,category]);row={id:insert.insertId};}
      amenityIds.push(row.id);
    }
    const [types]=await db.query('SELECT id FROM room_types WHERE id BETWEEN 1 AND 12 OR id=25');
    for(const type of types){
      for(const amenityId of amenityIds){
        const [[linked]]=await db.query('SELECT id FROM room_amenities WHERE room_types_id=? AND amenity_id=? LIMIT 1',[type.id,amenityId]);
        if(!linked)await db.query('INSERT INTO room_amenities (room_types_id,amenity_id) VALUES (?,?)',[type.id,amenityId]);
      }
    }
    await db.query("INSERT INTO AUDIT_LOGS (actor,action,entity_type,entity_id,new_value) VALUES ('migration','SEED_ROOM_AMENITIES_V1','amenities',0,?)",[JSON.stringify({roomTypeIds:types.map(t=>t.id),amenities:standard.map(([name])=>name)})]);
    await db.commit();
    console.log('Baseline demo amenities linked to original room types.');
  }catch(error){
    await db.rollback();
    throw error;
  }finally{await db.end();}
}
main().catch(error=>{console.error('Room amenities migration failed:',error);process.exitCode=1;});
