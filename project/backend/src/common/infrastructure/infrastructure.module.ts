import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { JobLockService } from './job-lock.service';

@Global()
@Module({ providers: [RedisService, JobLockService], exports: [RedisService, JobLockService] })
export class InfrastructureModule {}
