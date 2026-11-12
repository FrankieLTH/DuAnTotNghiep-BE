import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AvailabilityService } from './availability.service';
import {
  SearchCriteria,
  Recommendation,
  recommendWithFallback,
} from '@shared/recommendation';

interface CacheEntry {
  data: Recommendation[];
  expiresAt: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 45 * 1000; // 45 giây cache

  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Sinh key cho cache dựa vào criteria
   */
  private buildCacheKey(criteria: SearchCriteria): string {
    return [
      criteria.apartmentId || 'all',
      criteria.checkIn,
      criteria.checkOut,
      criteria.stayType,
      criteria.adults,
      criteria.children,
      criteria.rooms,
      criteria.voucherCode || '',
    ].join(':');
  }

  /**
   * Xóa toàn bộ cache hoặc key cụ thể khi có sự kiện thay đổi phòng / booking
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Recommendation cache invalidated.');
  }

  /**
   * Đề xuất phòng tối ưu kèm fallback khi tiêu chí ban đầu không có phòng
   */
  async getRecommendations(criteria: SearchCriteria): Promise<Recommendation[]> {
    const now = Date.now();
    const cacheKey = this.buildCacheKey(criteria);

    // Kiểm tra cache còn hạn
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Lấy danh sách các chi nhánh hoạt động để phục vụ fallback chi nhánh khác
    const aptRows = await this.dataSource.query(
      `SELECT id, name FROM APARTMENT WHERE status = 'active'`
    );
    const apartments = aptRows.map((a: any) => ({
      id: Number(a.id),
      name: String(a.name),
    }));

    const recommendations = await recommendWithFallback(
      criteria,
      (c) => this.availabilityService.getAvailableRoomTypes(c),
      apartments
    );

    // Lưu vào cache
    this.cache.set(cacheKey, {
      data: recommendations,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    return recommendations;
  }
}
