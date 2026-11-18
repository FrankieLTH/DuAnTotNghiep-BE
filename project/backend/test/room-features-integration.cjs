// Real local MySQL/Redis + HTTP/auth; PayOS and SMTP are mocked. Never moves real money.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
require('../register-paths.cjs'); require('reflect-metadata');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { Test } = require('@nestjs/testing'), { ConfigModule, ConfigService } = require('@nestjs/config');
const { TypeOrmModule } = require('@nestjs/typeorm'), { ValidationPipe } = require('@nestjs/common'), { DataSource } = require('typeorm');
const users = require('../dist/backend/src/entities/user.entity'), rooms = require('../dist/backend/src/entities/room.entity'), entities = require('../dist/backend/src/entities/booking.entity');
const { RoomsModule } = require('../dist/backend/src/modules/rooms/rooms.module');
const { AdminModule } = require('../dist/backend/src/modules/admin/admin.module');
const { EventEmitterModule }=require('@nestjs/event-emitter');
const { PaymentsModule } = require('../dist/backend/src/modules/payments/payments.module');
const { PayosGateway } = require('../dist/backend/src/modules/payments/payos.gateway');
const { CustomerMailService } = require('../dist/backend/src/modules/customer/customer-mail.service');
const { CustomerAuthService } = require('../dist/backend/src/modules/customer/customer-auth.service');
const { createSignatureFromObj } = require('@payos/node/lib/utils/create-signature');
if (process.env.DB_DATABASE !== 'duanmoi' || !['127.0.0.1','localhost'].includes(process.env.DB_HOST)) throw new Error('Local duanmoi fixtures only');
const featureFixture={apartmentId:null,typeId:null,rooms:[],features:[]};
const states = new Map(), created = [], sessions = [], customers = [], mails = [];
const verifier = new PayosGateway({ get: key => ({ PAYOS_CLIENT_ID:'qa-client', PAYOS_API_KEY:'qa-api', PAYOS_CHECKSUM_KEY:'qa-signature' })[key] });
let app, db, auth, base, checks=0, creates=0, failCreate=false, failGet=false, badCreate=false, timeoutCreate=false, mailFails=false, day=0;
const gateway = {
  verify: body => verifier.verify(body),
  create: async data => {
    if (failCreate) throw new Error('Simulated gateway outage');
    if (!states.has(data.orderCode)) {
      creates++;
      const id=crypto.randomBytes(16).toString('hex');
      states.set(data.orderCode, { id, orderCode:data.orderCode, amount:data.amount, amountPaid:0, amountRemaining:data.amount, status:'PENDING' });
    }
    const state=states.get(data.orderCode);
    if (timeoutCreate) { timeoutCreate=false; throw new Error('Simulated timeout after provider created link'); }
    return { ...state, amount:badCreate?1:state.amount, currency:'VND', paymentLinkId:state.id, checkoutUrl:`https://pay.payos.vn/web/${state.id}` };
  },
  get: async code => { if (failGet || !states.has(code)) throw new Error('Simulated unavailable provider'); return {...states.get(code)}; },
};
function webhook(payment, overrides={}) {
  const state=states.get(payment.order_code);
  const data={ orderCode:state.orderCode, amount:state.amountPaid, currency:'VND', paymentLinkId:state.id, reference:'QA-REFERENCE', code:'00', description:'QA', accountNumber:'TEST', transactionDateTime:'2034-01-01 00:00:00', ...overrides };
  return { code:'00', desc:'success', success:true, data, signature:createSignatureFromObj(data,'qa-signature') };
}
(async()=>{
 const mod=await Test.createTestingModule({ imports:[ConfigModule.forRoot({isGlobal:true}),TypeOrmModule.forRoot({type:'mysql',host:process.env.DB_HOST,port:Number(process.env.DB_PORT),username:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE,entities:[...Object.values(users),...Object.values(rooms),...Object.values(entities)].filter(x=>typeof x==='function'),synchronize:false}),PaymentsModule,RoomsModule,AdminModule,EventEmitterModule.forRoot()] })
 .overrideProvider(PayosGateway).useValue(gateway).overrideProvider(CustomerMailService).useValue({send:async(to,subject,text)=>{assert.ok(to.endsWith('@example.test'));if(mailFails)throw new Error('Simulated SMTP outage');mails.push({to,subject,text});}}).compile();
 app=mod.createNestApplication({logger:['error']});app.setGlobalPrefix('api');app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');base=await app.getUrl();db=app.get(DataSource);auth=app.get(CustomerAuthService);
 for(let i=0;i<2;i++){const c=await db.getRepository(users.Customer).save({full_name:'QA PayOS',email:`qa-payos-${crypto.randomBytes(6).toString('hex')}@example.test`,phone:'0912345678',password_hash:await require('bcrypt').hash('QA-Test-2026',12),email_verified_at:new Date(),account_created_at:new Date()});customers.push(c);}
 async function token(customer,scope){const session=await auth.issueSession(customer,scope);sessions.push(JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url')).jti);return session.access_token;}
 const guest=await token(customers[0],'lookup'), account=await token(customers[0],'account'), stranger=await token(customers[1],'lookup');
 async function api(path,body,token=guest,status=body?(path==='/webhooks/payos'?200:201):200,method=body?'POST':'GET'){
  const response=await fetch(`${base}/api${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json();assert.equal(response.status,status,`${path}: ${JSON.stringify(data)}`);checks++;return data;
 }
 const type=await db.getRepository(rooms.RoomType).findOneByOrFail({is_active:true});
 async function prepare(complete=true){
  const d=++day, start=`2034-02-${String(d).padStart(2,'0')}`, end=`2034-02-${String(d+1).padStart(2,'0')}`;
  const result=await api('/customer/booking-drafts',{email:customers[0].email,full_name:'QA payos booker',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:type.id,quantity:1}],stay_type:'fullday',adults:1,children:0,check_in_date:start,check_out_date:end});
  created.push(result.booking_id);
  if(complete)await api(`/customer/bookings/${result.booking_id}/checkout`,{guests:[{full_name:'QA Test Guest',date_of_birth:'2000-01-01',guest_type:'adult',is_booker:true,is_foreigner:false,id_type:'passport',id_number:'QA-FAKE-DOCUMENT'}]},guest,200,'PUT');
  return result.booking_id;
 }
 const id=await prepare();
 await api('/payments/create-payos-url',{booking_id:id},null,401);
 await api('/payments/create-payos-url',{booking_id:id},stranger,404);
 await api(`/payments/bookings/${id}/status`,undefined,stranger,404);
 await api('/payments/create-payos-url',{booking_id:0},guest,400);
 await api('/payments/create-payos-url',{booking_id:999999999},guest,404);
 const incomplete=await prepare(false);await api('/payments/create-payos-url',{booking_id:incomplete},guest,409);
 const payment=await api('/payments/create-payos-url',{booking_id:id,amount:1,return_base_url:'https://evil.example',email:'evil@example.test'});
 const stored=await db.getRepository(entities.Booking).findOneByOrFail({id});assert.equal(payment.amount,Number(stored.total_price));assert.ok(payment.checkout_url.startsWith('https://pay.payos.vn/'));assert.equal(creates,1);
 const again=await api('/payments/create-payos-url',{booking_id:id},account);assert.equal(again.payment_id,payment.payment_id);assert.equal(creates,1);
 await api('/webhooks/payos',{booking_id:id,status:'PAID'},null,400);
 const fake=webhook(payment);fake.signature='invalid';await api('/webhooks/payos',fake,null,400);
 let state=states.get(payment.order_code);state.amountPaid=100;state.amountRemaining=state.amount-100;
 await api('/webhooks/payos',webhook(payment,{paymentLinkId:'wrong-link'}),null,400);
 await api(`/payments/bookings/${id}/status`);
 assert.equal((await api(`/customer/bookings/${id}`)).paid_amount,100);
 assert.equal((await api(`/customer/bookings/${id}`)).booking_status,'pending_payment');
 assert.equal((await api('/payments/create-payos-url',{booking_id:id})).payment_id,payment.payment_id);
 state.status='PAID';state.amountPaid=state.amount-1;state.amountRemaining=1;
 await api(`/payments/bookings/${id}/status`,undefined,guest,400);
 state.amountPaid=state.amount;state.amountRemaining=0;
 const mailCount=mails.length;
 await Promise.all([api('/webhooks/payos',webhook(payment),null),api(`/payments/bookings/${id}/status`)]);
 await api('/webhooks/payos',webhook(payment),null);
 const detail=await api(`/customer/bookings/${id}`);assert.equal(detail.booking_status,'confirmed');assert.equal(detail.paid_amount,payment.amount);assert.equal(detail.remaining_amount,0);assert.equal(mails.length,mailCount+1);assert.equal(await db.getRepository(entities.Transaction).countBy({booking_id:id}),2);assert.equal(await db.getRepository(entities.LockPin).countBy({booking_id:id}),0);
 await api('/payments/create-payos-url',{booking_id:id},account,409);
 // Late paid receipt is real money but must not resurrect an expired reservation.
 const late=await prepare(),latePayment=await api('/payments/create-payos-url',{booking_id:late});
 await db.getRepository(entities.Booking).update(late,{booking_status:'expired',hold_expires_at:new Date(Date.now()-60000)});
 const lateState=states.get(latePayment.order_code);lateState.status='PAID';lateState.amountPaid=lateState.amount;lateState.amountRemaining=0;
 const lateResult=await api(`/payments/bookings/${late}/status`);assert.equal(lateResult.payments[0].review_required,true);assert.equal((await api(`/customer/bookings/${late}`)).booking_status,'expired');
 // A cancelled provider link does not cancel a booking; create another attempt on the same booking.
 const retry=await prepare(),old=await api('/payments/create-payos-url',{booking_id:retry});states.get(old.order_code).status='CANCELLED';
 await api(`/payments/bookings/${retry}/status`);const replacement=await api('/payments/create-payos-url',{booking_id:retry});assert.notEqual(old.payment_id,replacement.payment_id);
 assert.equal(await db.getRepository(entities.Booking).countBy({id:retry}),1);
 // Lost create response recovers the same link/order code; no second receipt.
 const timeoutId=await prepare();timeoutCreate=true;const recovered=await api('/payments/create-payos-url',{booking_id:timeoutId});assert.ok(recovered.checkout_url);assert.equal(await db.getRepository(entities.Payment).countBy({booking_id:timeoutId}),1);
 // Provider outage and incorrect provider amount never claim success.
 const outageId=await prepare();failCreate=true;failGet=true;await api('/payments/create-payos-url',{booking_id:outageId},guest,500);failCreate=false;failGet=false;
 assert.equal((await api(`/customer/bookings/${outageId}`)).payment_status,'unpaid');
 badCreate=true;await api('/payments/create-payos-url',{booking_id:outageId},guest,400);badCreate=false;
 // SMTP failure after a verified receipt cannot revert or repeat the payment.
 const smtpId=await prepare(),smtpPayment=await api('/payments/create-payos-url',{booking_id:smtpId});const smtpState=states.get(smtpPayment.order_code);smtpState.status='PAID';smtpState.amountPaid=smtpState.amount;smtpState.amountRemaining=0;mailFails=true;
 await api(`/payments/bookings/${smtpId}/status`);await api(`/payments/bookings/${smtpId}/status`);mailFails=false;assert.equal((await api(`/customer/bookings/${smtpId}`)).booking_status,'confirmed');assert.equal(await db.getRepository(entities.Transaction).countBy({booking_id:smtpId}),1);
 // A partial receipt remains accounted for when its link expires, without confirming the room.
 const partialId=await prepare(),partial=await api('/payments/create-payos-url',{booking_id:partialId});const partialState=states.get(partial.order_code);partialState.status='EXPIRED';partialState.amountPaid=200;partialState.amountRemaining=partialState.amount-200;
 const closed=await api(`/payments/bookings/${partialId}/status`);assert.equal(closed.payments[0].review_required,true);assert.equal((await api(`/customer/bookings/${partialId}`)).paid_amount,200);assert.equal((await api(`/customer/bookings/${partialId}`)).booking_status,'pending_payment');
 // New basket API uses the real database, exact quantity and physical room IDs.
 const basketQuery=`/rooms/baskets?apartment_id=${type.apartment_id}&check_in=2034-05-01&check_out=2034-05-03&stay_type=fullday&adults=2&children=0&rooms=1`;
 const baskets=await api(basketQuery);
 assert.ok(baskets.length);assert.ok(baskets.every(b=>b.totalRooms===1&&b.apartmentId===type.apartment_id));
 const room=await db.getRepository(rooms.Room).findOneByOrFail({id:baskets[0].items[0].roomId});assert.equal(room.room_type_id,baskets[0].items[0].roomTypeId);
 const selected=baskets[0].items[0];
 const extra=await api('/customer/booking-drafts',{email:customers[0].email,full_name:'QA basket mattress',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:selected.roomTypeId,quantity:1,extra_beds:1}],stay_type:'fullday',adults:2,children:0,check_in_date:'2034-05-01',check_out_date:'2034-05-03',total_price:1,extra_bed_fee:1});created.push(extra.booking_id);
 const restored=await api(`/customer/bookings/${extra.booking_id}/checkout`);assert.equal(restored.extra_bed_fee,300000);assert.equal(restored.total_price,baskets[0].totalPrice+300000);assert.equal(restored.booking_rooms[0].has_extra_bed,true);assert.equal(restored.booking_rooms[0].price*2+300000,restored.total_price);
 await api('/customer/booking-drafts',{email:customers[0].email,full_name:'QA invalid mattress',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:selected.roomTypeId,quantity:1,extra_beds:2}],stay_type:'fullday',adults:2,children:0,check_in_date:'2034-05-01',check_out_date:'2034-05-03'},guest,400);
 await db.getRepository(entities.Booking).update(extra.booking_id,{booking_status:'expired',hold_expires_at:new Date(Date.now()-60000)});
 const resumedExtra=await api(`/customer/bookings/${extra.booking_id}/resume`,{});assert.equal(resumedExtra.extra_bed_fee,300000);assert.equal(resumedExtra.total_price,restored.total_price);
 await api(`/customer/bookings/${extra.booking_id}/checkout`,{guests:[{full_name:'QA Adult One',date_of_birth:'2000-01-01',guest_type:'adult',is_booker:true,is_foreigner:false,id_type:'passport',id_number:'QA-BED-1'},{full_name:'QA Adult Two',date_of_birth:'2001-01-01',guest_type:'adult',is_booker:false,is_foreigner:false,id_type:'passport',id_number:'QA-BED-2'}]},guest,200,'PUT');
 const extraPayment=await api('/payments/create-payos-url',{booking_id:extra.booking_id});assert.equal(extraPayment.amount,restored.total_price);
 // The only new table is room_features. Remaining room metadata stays on ROOMS.
 const [schema]=await db.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'");assert.equal(Number(schema.n),25);
 const forbidden=await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('room_groups','room_feature_map','room_blocks')");assert.equal(forbidden.length,0);
 const suffix=crypto.randomBytes(5).toString('hex');
 async function admin(path,body,role='admin',status=body?201:200,method=body?'POST':'GET'){
  const r=await fetch(`${base}/api/admin${path}`,{method,headers:{'Content-Type':'application/json','x-staff-role':role,'x-staff-actor':'QA features','x-staff-apartment-id':'999999'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));checks++;return data;
 }
 await admin('/room-features',{name:'QA denied',category:'view',extra_price_per_night:100000},'manager',403);
 await admin('/room-features',{name:'QA invalid '+suffix,category:'view',extra_price_per_night:-1},'admin',400);
 const view=await admin('/room-features',{name:'QA view '+suffix,category:'view',extra_price_per_night:100000});featureFixture.features.push(view.id);
 const free=await admin('/room-features',{name:'QA quiet '+suffix,category:'comfort',extra_price_per_night:0});featureFixture.features.push(free.id);
 await admin('/room-features',{name:'QA view '+suffix,category:'view',extra_price_per_night:100000},'admin',400);
 const apt=await db.getRepository(rooms.Apartment).save({name:'QA feature branch '+suffix,address:'QA only',status:'active'});featureFixture.apartmentId=apt.id;
 const roomType=await db.getRepository(rooms.RoomType).save({name:'QA Studio '+suffix,apartment_id:apt.id,base_price:700000,max_occupancy:2,description:'QA fixture',bed_config:'QA',area:30,is_active:true});featureFixture.typeId=roomType.id;
 async function createRoom(number,ids){const r=await admin('/rooms',{apartment_id:apt.id,room_type_id:roomType.id,room_number:number,floor:1,room_group_id:'Phòng góc QA',feature_ids:ids,status:'available'});featureFixture.rooms.push(r.room_id);return r.room_id;}
 const basic=await createRoom('QA101',[]),special=await createRoom('QA102',[view.id,free.id]);
 const roomList=await admin(`/rooms?apartment_id=${apt.id}`);assert.equal(roomList.find(r=>r.room_id===special).feature_surcharge_per_night,100000);assert.equal(roomList.find(r=>r.room_id===special).room_group_name,'Phòng góc QA');
 await admin('/rooms',{apartment_id:apt.id,room_type_id:roomType.id,room_number:'QA BAD FLOOR',floor:-1,feature_ids:[]},'admin',400);
 await admin('/rooms',{apartment_id:apt.id,room_type_id:roomType.id,room_number:'QA BAD LOCK',lock_id:99999999,feature_ids:[]},'admin',400);
 assert.equal(await db.getRepository(rooms.Room).countBy({room_type_id:roomType.id}),2,'Invalid room input must not create orphan rows');
 const beforeRoomCount=await db.getRepository(rooms.Room).countBy({room_type_id:roomType.id});
 await admin('/rooms',{apartment_id:apt.id,room_type_id:roomType.id,room_number:'QA103',feature_ids:[999999999]},'admin',400);assert.equal(await db.getRepository(rooms.Room).countBy({room_type_id:roomType.id}),beforeRoomCount);
 const query=`/rooms/baskets?apartment_id=${apt.id}&check_in=2037-06-01&check_out=2037-06-03&stay_type=fullday&adults=2&children=0&rooms=1`;
 let variants=await api(query);assert.equal(variants.length,2);assert.deepEqual(variants.map(v=>v.totalPrice).sort((a,b)=>a-b),[1400000,1600000]);
 const typeOptions=await api(`/room-types/${roomType.id}/options?check_in=2037-06-01&check_out=2037-06-03&adults=2`);assert.deepEqual(typeOptions.map(o=>o.totalPrice).sort((a,b)=>a-b),[1400000,1600000]);assert.equal(typeOptions.some(o=>Object.hasOwn(o,'room_number')),false);
 const quoted=await api('/customer/booking-drafts',{email:customers[0].email,full_name:'QA feature booker',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:roomType.id,quantity:1,room_ids:[special],extra_beds:1}],stay_type:'fullday',adults:2,children:0,check_in_date:'2037-06-01',check_out_date:'2037-06-03',total_price:1});created.push(quoted.booking_id);assert.equal(quoted.total_price,1900000);assert.equal((await api(`/customer/bookings/${quoted.booking_id}`)).rooms[0].room_number,null);
 let restoredFeatures=await api(`/customer/bookings/${quoted.booking_id}/checkout`);assert.equal(restoredFeatures.total_price,1900000);assert.equal(restoredFeatures.booking_rooms[0].feature_price_per_night,100000);assert.equal(restoredFeatures.extra_bed_fee,300000);
 await admin(`/room-features/${view.id}`,{extra_price_per_night:250000},'admin',200,'PUT');
 restoredFeatures=await api(`/customer/bookings/${quoted.booking_id}/checkout`);assert.equal(restoredFeatures.total_price,1900000);assert.equal(restoredFeatures.booking_rooms[0].features.find(f=>f.id===view.id).extra_price_per_night,100000);
 const snap=(await db.getRepository(entities.BookingRoom).findBy({bookings_id:quoted.booking_id}))[0];assert.equal(snap.room_id,special);assert.equal(snap.pricing_snapshot.room_total,1600000);
 await api('/customer/booking-drafts',{email:customers[0].email,full_name:'QA overlap',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:roomType.id,quantity:1,room_ids:[special]}],stay_type:'fullday',adults:1,children:0,check_in_date:'2037-06-01',check_out_date:'2037-06-03'},guest,400);
 const block=await admin(`/rooms/${basic}/blocks`,{from_at:'2037-06-01T14:00:00+07:00',to_at:'2037-06-03T12:00:00+07:00',reason:'QA maintenance'});assert.ok(block.success);assert.deepEqual(await api(query),[]);
 await admin(`/rooms/${basic}/blocks/${block.block_id}`,undefined,'admin',200,'DELETE');assert.ok((await api(query)).some(b=>b.items[0].roomIds.includes(basic)));
 await admin(`/rooms/${special}/blocks`,undefined,'manager',404);
 const conflict=await admin(`/rooms/${special}/blocks`,{from_at:'2037-06-01T14:00:00+07:00',to_at:'2037-06-03T12:00:00+07:00',reason:'QA conflict'});assert.equal(conflict.conflict,true);assert.equal((await admin(`/rooms/${special}/blocks`)).length,0);
 await admin('/rooms/features/bulk',{room_ids:[basic],add_feature_ids:[free.id]});assert.ok((await admin(`/rooms/${basic}`)).feature_ids.includes(free.id));
 await admin('/rooms/groups/bulk',{room_ids:[basic,special],room_group_id:'QA gần cầu thang'});assert.equal((await admin(`/rooms/${basic}`)).room_group_name,'QA gần cầu thang');
 const payload={apartment_id:apt.id,default_status:'available',common_feature_ids:[free.id],groups:[{label:'QA batch',roomTypeId:roomType.id,roomGroupId:'QA batch group',featureIds:[],roomNumbers:['QA201','QA202']}],dry_run:true};
 const preview=await admin('/rooms/batch-v2',payload);assert.equal(preview.errors.length,0);assert.equal(preview.plan.length,2);const savedBatch=await admin('/rooms/batch-v2',{...payload,dry_run:false});featureFixture.rooms.push(...savedBatch.room_ids);assert.equal(savedBatch.createdCount,2);
 const [{slot_status,...g}]=restoredFeatures.guests;const guests=[{full_name:'QA Feature One',date_of_birth:'2000-01-01',guest_type:'adult',is_booker:true,is_foreigner:false,id_type:'passport',id_number:'QA-FEATURE-1'},{full_name:'QA Feature Two',date_of_birth:'2001-01-01',guest_type:'adult',is_booker:false,is_foreigner:false,id_type:'passport',id_number:'QA-FEATURE-2'}];
 await api(`/customer/bookings/${quoted.booking_id}/checkout`,{guests},guest,200,'PUT');const featurePayment=await api('/payments/create-payos-url',{booking_id:quoted.booking_id});assert.equal(featurePayment.amount,1900000);
 const featureState=states.get(featurePayment.order_code);featureState.status='PAID';featureState.amountPaid=1900000;featureState.amountRemaining=0;await api(`/payments/bookings/${quoted.booking_id}/status`);assert.equal((await api(`/customer/bookings/${quoted.booking_id}`)).booking_status,'confirmed');assert.ok((await api(`/customer/bookings/${quoted.booking_id}`)).rooms[0].room_number);
 const adminDetail=await admin(`/bookings/${quoted.booking_id}`);assert.equal(adminDetail.total_amount,1900000);assert.equal(adminDetail.paid_amount,1900000);assert.equal(adminDetail.rooms[0].pricing_snapshot.feature_price_per_night,100000);
 await admin(`/room-features/${view.id}/toggle`,{});assert.equal((await api(`/customer/bookings/${quoted.booking_id}`)).total_price,1900000);
 // A newly confirmed maintenance block after checkout preparation must never auto-confirm the room on payment.
 const delayed=await api('/customer/booking-drafts',{email:customers[0].email,full_name:'QA blocked payment',phone:'0912345678',is_staying:true,selected_rooms:[{room_type_id:roomType.id,quantity:1,room_ids:[basic]}],stay_type:'fullday',adults:1,children:0,check_in_date:'2037-07-01',check_out_date:'2037-07-02'});created.push(delayed.booking_id);
 await api(`/customer/bookings/${delayed.booking_id}/checkout`,{guests:[guests[0]]},guest,200,'PUT');const delayedPayment=await api('/payments/create-payos-url',{booking_id:delayed.booking_id});
 await admin(`/rooms/${basic}/blocks`,{from_at:'2037-07-01T14:00:00+07:00',to_at:'2037-07-02T12:00:00+07:00',reason:'QA emergency maintenance',confirm:true});const delayedState=states.get(delayedPayment.order_code);delayedState.status='PAID';delayedState.amountPaid=delayedState.amount;delayedState.amountRemaining=0;const delayedResult=await api(`/payments/bookings/${delayed.booking_id}/status`);assert.equal(delayedResult.payments[0].review_required,true);assert.equal((await api(`/customer/bookings/${delayed.booking_id}`)).booking_status,'pending_payment');
 console.log(`PASS: ${checks} HTTP checks; ownership, both customer scopes, server pricing, real signature verification, partial/full/late payments, concurrent webhook+return idempotency, safe retries, timeout recovery and SMTP failure. Real basket availability, mattress persistence/repricing and PayOS total verified. One-table admin feature CRUD, roles, JSON groups/blocks, physical-room price variants, 1.900.000 VND example, snapshots and PayOS verified. All gateway and email calls mocked.`);
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{
 if(db?.isInitialized){for(const id of created){await db.getRepository(entities.AuditLog).delete({entity_type:'BOOKINGS',entity_id:id});await db.getRepository(entities.Transaction).delete({booking_id:id});await db.getRepository(entities.Booking).delete(id);}for(const c of customers)await db.getRepository(users.Customer).delete(c.id);
 for(const id of featureFixture.rooms){await db.getRepository(entities.AuditLog).delete({entity_type:'ROOMS',entity_id:id});await db.getRepository(rooms.Room).delete(id);}for(const id of featureFixture.features){await db.getRepository(entities.AuditLog).delete({entity_type:'room_features',entity_id:id});await db.getRepository(rooms.RoomFeature).delete(id);}if(featureFixture.typeId)await db.getRepository(rooms.RoomType).delete(featureFixture.typeId);if(featureFixture.apartmentId)await db.getRepository(rooms.Apartment).delete(featureFixture.apartmentId);}
 if(auth&&sessions.length)await auth.redis.del(...sessions.map(id=>`customer:session:${id}`));
 if(app)await app.close();
});
