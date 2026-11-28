import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { AvailabilityService } from './availability.service';
import {
  SearchCriteria,
  AvailableRoomType,
  Basket,
  BasketConfig,
  DEFAULT_BASKET_CONFIG,
  buildBaskets,
  fallbackBaskets,
  VoucherRule,
} from '@shared/index';

@Injectable()
export class BasketService {
  private readonly logger = new Logger(BasketService.name);
  private cache = new Map<string, { baskets: Basket[]; expiresAt: number }>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /**
   * Xóa toàn bộ cache khi có booking mới hoặc phòng thay đổi trạng thái
   */
  @OnEvent('booking.*')
  @OnEvent('room.*')
  public invalidateCache(): void {
    this.cache.clear();
    this.logger.log('Basket cache invalidated');
  }

  /**
   * Tìm kiếm và xây dựng danh sách Giỏ phòng
   */
  async getBaskets(criteria: SearchCriteria): Promise<Basket[]> {
    const cacheKey = [
      criteria.apartmentId || 'all',
      criteria.checkIn,
      criteria.checkOut,
      criteria.stayType,
      criteria.adults,
      criteria.children,
      criteria.rooms,
      criteria.autoRooms ? 'auto' : 'fixed',
      criteria.voucherCode || '',
      criteria.sort || 'default',
    ].join('_');

    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    // Availability and feature fees are read live so an admin change cannot leave a stale paid quote.

    // 1. Lấy danh sách loại phòng còn trống từ AvailabilityService
    const availableTypes = await this.availabilityService.getAvailableRoomTypes(criteria);

    // 2. Tra cứu voucher nếu khách có nhập mã
    let voucherRule: VoucherRule | null = null;
    if (criteria.voucherCode && criteria.voucherCode.trim().length > 0) {
      voucherRule = await this.findVoucher(criteria.voucherCode.trim());
    }

    // 3. Sinh danh sách Giỏ phòng chuẩn (0 <= spare <= 3, mỗi phòng >= 1 người lớn)
    let baskets: Basket[];
    if (criteria.autoRooms) {
      const flexible: Basket[] = [];
      const maxRooms = Math.min(10, criteria.adults);
      for (let roomCount = 1; roomCount <= maxRooms; roomCount++) {
        flexible.push(...buildBaskets({ ...criteria, rooms: roomCount }, availableTypes, DEFAULT_BASKET_CONFIG, voucherRule));
      }
      if (flexible.length === 0) {
        const widerFit = { ...DEFAULT_BASKET_CONFIG, maxSpare: 6 };
        for (let roomCount = 1; roomCount <= maxRooms; roomCount++) {
          flexible.push(...buildBaskets({ ...criteria, rooms: roomCount }, availableTypes, widerFit, voucherRule));
        }
      }
      const unique = new Map<string, Basket>();
      for (const basket of flexible) {
        const key = `${basket.apartmentId || 0}|${basket.items.map(item => `${item.variantKey || item.roomTypeId}x${item.quantity}`).sort().join('|')}`;
        if (!unique.has(key)) unique.set(key, { ...basket, id: `basket_auto_${unique.size + 1}` });
      }
      baskets = [...unique.values()];
      baskets.sort((a, b) => {
        if (criteria.sort === 'price_asc') return a.totalPrice - b.totalPrice;
        if (criteria.sort === 'price_desc') return b.totalPrice - a.totalPrice;
        if (a.spare !== b.spare) return a.spare - b.spare;
        if (a.totalRooms !== b.totalRooms) return a.totalRooms - b.totalRooms;
        return a.totalPrice - b.totalPrice;
      });
      baskets = baskets.slice(0, DEFAULT_BASKET_CONFIG.maxBaskets);
    } else {
      baskets = buildBaskets(criteria, availableTypes, DEFAULT_BASKET_CONFIG, voucherRule);
    }

    // 4. Nếu không có giỏ nào phù hợp, áp dụng cấp độ nới lỏng (fallback)
    if (baskets.length === 0 && !criteria.autoRooms) {
      baskets = fallbackBaskets(criteria, availableTypes, DEFAULT_BASKET_CONFIG, voucherRule);
    }

    // Sắp xếp lại danh sách kết quả nếu khách chọn sort
    if (criteria.sort === 'price_asc') {
      baskets.sort((a, b) => a.totalPrice - b.totalPrice);
    } else if (criteria.sort === 'price_desc') {
      baskets.sort((a, b) => b.totalPrice - a.totalPrice);
    }

    // Lưu cache 30 giây


    return baskets;
  }

  private async findVoucher(code: string): Promise<VoucherRule | null> {
    try {
      const rows = await this.dataSource.query(
        `SELECT code, discount_type, discount_value, max_discount_amount, min_order_value
         FROM vouchers
         WHERE UPPER(code) = UPPER(?) AND is_active = 1
           AND (valid_to IS NULL OR valid_to >= CURDATE())
         LIMIT 1`,
        [code]
      );
      if (rows && rows.length > 0) {
        return {
          code: rows[0].code,
          discount_type: rows[0].discount_type,
          discount_value: Number(rows[0].discount_value),
          max_discount_amount: rows[0].max_discount_amount ? Number(rows[0].max_discount_amount) : undefined,
          min_order_value: rows[0].min_order_value ? Number(rows[0].min_order_value) : undefined,
        };
      }
    } catch (err) {
      this.logger.warn(`Lỗi tra cứu voucher: ${err}`);
    }
    return null;
  }
}
