import { Controller, Headers, HttpCode, Post, UnauthorizedException, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { JobLockService } from '../../common/infrastructure/job-lock.service';
import { PaymentsService } from '../payments/payments.service';
import { CronService } from './cron.service';

@Controller('internal/jobs')
export class ScheduledJobsController {
  constructor(
    private readonly config: ConfigService,
    private readonly locks: JobLockService,
    private readonly cron: CronService,
    private readonly payments: PaymentsService,
  ) {}

  private authorize(authorization?: string) {
    const secret = this.config.get<string>('CRON_SECRET');
    const expected = Buffer.from(`Bearer ${secret || ''}`);
    const actual = Buffer.from(authorization || '');
    if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException();
    }
  }

  @Post('maintenance')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  maintenance(@Headers('authorization') authorization?: string) {
    this.authorize(authorization);
    return this.locks.run('maintenance', async () => {
      await this.payments.syncPending();
      await this.cron.handleExpireOverdueHolds();
      await this.cron.handleAutoCheckOutCron();
    });
  }

  @Post('photo-cleanup')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  photoCleanup(@Headers('authorization') authorization?: string) {
    this.authorize(authorization);
    return this.locks.run('photo-cleanup', () => this.cron.handlePhotoCleanupJob());
  }

  @Post('anonymization')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  anonymization(@Headers('authorization') authorization?: string) {
    this.authorize(authorization);
    return this.locks.run('anonymization', () => this.cron.handleAnonymizationJob());
  }
}
