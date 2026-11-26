// Tests today's arrival on the running local app, with a temporary guest. No email/payment calls.
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'),crypto=require('node:crypto'),mysql=require('mysql2/promise'),Redis=require('ioredis');
const {JwtService}=require('@nestjs/jwt');
if(process.env.DB_DATABASE!=='duanmoi'||!['localhost','127.0.0.1'].includes(process.env.DB_HOST))throw new Error('Isolated local duanmoi only');
let db,redis,customerId,bookingId;const jti=crypto.randomUUID();
(async()=>{
 db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE});redis=new Redis(process.env.REDIS_URL);
 const email=`qa-same-day-${crypto.randomBytes(6).toString('hex')}@example.test`;
 const [customer]=await db.query('INSERT INTO CUSTOMER (full_name,email,phone) VALUES (?,?,?)',['QA same day',email,'0912345678']);customerId=customer.insertId;
 const token=new JwtService({secret:process.env.JWT_SECRET}).sign({sub:customerId,email,type:'customer',scope:'lookup',jti},{expiresIn:'2m'});await redis.set(`customer:session:${jti}`,String(customerId),'EX',120);
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'}), date=new Date(today+'T12:00:00+07:00');const datePlus=n=>new Date(date.getTime()+n*86400000).toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'});
 async function request(path,body,expected){const response=await fetch('http://localhost:5174/api/customer'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body?JSON.stringify(body):undefined});const result=await response.json();if(expected)assert.equal(response.status,expected,JSON.stringify(result));return {status:response.status,result};}
 const [types]=await db.query("SELECT DISTINCT rt.id FROM room_types rt JOIN ROOMS r ON r.room_type_id=rt.id WHERE rt.is_active=1 AND r.status='available' AND r.is_hidden=0 ORDER BY rt.id");
 for(const type of types){const attempt=await request('/booking-drafts',{email,full_name:'QA same day',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:type.id,quantity:1}],stay_type:'fullday',adults:1,children:0,check_in_date:today,check_out_date:datePlus(2)});if(attempt.status===201){bookingId=attempt.result.booking_id;break;}assert.equal(attempt.status,400);assert.match(attempt.result.message,/Không còn đủ phòng/);}
 assert.ok(bookingId,'At least one room type must be available today to run this local integration check');
 assert.equal((await request(`/bookings/${bookingId}/checkout`,null,200)).result.resume_stage,'guests');
 await db.query("UPDATE BOOKINGS SET booking_status='expired',hold_expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE id=? AND customer_id=?",[bookingId,customerId]);
 assert.equal((await request(`/bookings/${bookingId}`,null,200)).result.can_resume,true);
 assert.equal((await request(`/bookings/${bookingId}/resume`,{},201)).result.server_booking_id,bookingId);
 await request('/booking-drafts',{email,full_name:'QA same day',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:types[0].id,quantity:1}],stay_type:'fullday',adults:1,children:0,check_in_date:datePlus(-1),check_out_date:datePlus(1)},400);
 console.log('PASS: running Docker app accepts arrival today after nominal check-in, restores the same booking after hold expiry, and rejects yesterday. No payment or email sent.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(db){if(bookingId)await db.query('DELETE FROM BOOKINGS WHERE id=? AND customer_id=?',[bookingId,customerId]);if(customerId)await db.query('DELETE FROM CUSTOMER WHERE customer_id=?',[customerId]);await db.end();}if(redis){await redis.del(`customer:session:${jti}`);redis.disconnect();}});
