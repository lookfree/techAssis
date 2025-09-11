import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as NodeCache from 'node-cache';

@Injectable()
export class CacheService {
  private cache: NodeCache;

  constructor(private configService: ConfigService) {
    this.cache = new NodeCache({
      stdTTL: this.configService.get<number>('CACHE_TTL', 600), // 默认10分钟
      checkperiod: this.configService.get<number>('CACHE_CHECK_PERIOD', 120), // 每2分钟检查过期键
      useClones: false,
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    return this.cache.set(key, value, ttl);
  }

  async del(key: string | string[]): Promise<number> {
    return this.cache.del(key);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async keys(): Promise<string[]> {
    return this.cache.keys();
  }

  async flushAll(): Promise<void> {
    this.cache.flushAll();
  }

  async getStats(): Promise<NodeCache.Stats> {
    return this.cache.getStats();
  }

  // 带前缀的缓存操作
  async getWithPrefix<T>(prefix: string, key: string): Promise<T | undefined> {
    return this.get<T>(`${prefix}:${key}`);
  }

  async setWithPrefix<T>(prefix: string, key: string, value: T, ttl?: number): Promise<boolean> {
    return this.set(`${prefix}:${key}`, value, ttl);
  }

  async delWithPrefix(prefix: string, key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.del(key.map(k => `${prefix}:${k}`));
    }
    return this.del(`${prefix}:${key}`);
  }

  // 用户相关缓存
  async getUserCache<T>(userId: string, key: string): Promise<T | undefined> {
    return this.getWithPrefix<T>('user', `${userId}:${key}`);
  }

  async setUserCache<T>(userId: string, key: string, value: T, ttl?: number): Promise<boolean> {
    return this.setWithPrefix(`user`, `${userId}:${key}`, value, ttl);
  }

  async delUserCache(userId: string, key?: string): Promise<number> {
    if (key) {
      return this.delWithPrefix('user', `${userId}:${key}`);
    }
    // 删除用户所有缓存
    const keys = await this.keys();
    const userKeys = keys.filter(k => k.startsWith(`user:${userId}:`));
    return this.del(userKeys);
  }

  // 签到相关缓存
  async getAttendanceCache<T>(courseId: string, date: string): Promise<T | undefined> {
    return this.getWithPrefix<T>('attendance', `${courseId}:${date}`);
  }

  async setAttendanceCache<T>(courseId: string, date: string, value: T, ttl: number = 300): Promise<boolean> {
    return this.setWithPrefix('attendance', `${courseId}:${date}`, value, ttl); // 5分钟过期
  }

  // 座位图缓存
  async getSeatMapCache<T>(classroomId: string, date: string): Promise<T | undefined> {
    return this.getWithPrefix<T>('seatmap', `${classroomId}:${date}`);
  }

  async setSeatMapCache<T>(classroomId: string, date: string, value: T, ttl: number = 300): Promise<boolean> {
    return this.setWithPrefix('seatmap', `${classroomId}:${date}`, value, ttl);
  }

  // 验证码缓存
  async setVerificationCode(courseId: string, code: string, ttl: number = 300): Promise<boolean> {
    return this.setWithPrefix('verification', courseId, code, ttl); // 5分钟过期
  }

  async getVerificationCode(courseId: string): Promise<string | undefined> {
    return this.getWithPrefix<string>('verification', courseId);
  }

  async delVerificationCode(courseId: string): Promise<number> {
    return this.delWithPrefix('verification', courseId);
  }
}