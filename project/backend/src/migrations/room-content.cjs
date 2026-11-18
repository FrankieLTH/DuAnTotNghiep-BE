// Replace generic seed descriptions with factual details already stored for each room type.
// Keep any description an administrator has written.
require('dotenv').config({quiet:true});
const mysql=require('mysql2/promise');
async function main(){
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE});
  try{
    const [types]=await db.query('SELECT rt.id,rt.name,rt.description,rt.area,rt.max_occupancy,rt.bed_config,rt.variant_label,a.name AS apartment_name FROM room_types rt JOIN APARTMENT a ON a.id=rt.apartment_id');
    for(const type of types){
      const old=String(type.description||'').trim();
      if(old&&!old.startsWith('Căn hộ cao cấp đầy đủ tiện nghi tại'))continue;
      const name=String(type.name);
      const style=name.startsWith('Studio Cozy')?'Studio':name.startsWith('1-Bedroom Deluxe')?'Căn hộ một phòng ngủ':name.startsWith('2-Bedroom Suite')?'Căn hộ hai phòng ngủ':name.startsWith('Penthouse Panoramic')?'Căn hộ Penthouse':'Loại phòng';
      const variant=type.variant_label&&type.variant_label!=='Tiêu chuẩn'?` Đây là biến thể ${type.variant_label} có giá và lịch trống riêng.`:'';
      const description=`${style} diện tích ${type.area} m² tại ${type.apartment_name}, bố trí ${type.bed_config}, phù hợp tối đa ${type.max_occupancy} khách.${variant} Các tiện ích đã gồm được liệt kê bên dưới.`;
      await db.query('UPDATE room_types SET description=? WHERE id=?',[description,type.id]);
    }
    console.log('Room descriptions updated from verified room metadata.');
  }finally{await db.end();}
}
main().catch(error=>{console.error('Room content migration failed:',error);process.exitCode=1;});
