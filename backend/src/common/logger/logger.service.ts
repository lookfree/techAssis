import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private logLevel: LogLevel;
  private logDir: string;

  constructor(private configService: ConfigService) {
    const levelStr = this.configService.get<string>('LOG_LEVEL', 'info').toLowerCase();
    this.logLevel = LogLevel[levelStr.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO;
    this.logDir = this.configService.get<string>('LOG_DIR', './logs');
    
    // 确保日志目录存在
    this.ensureLogDir();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // 创建子目录
    const subDirs = ['app', 'error', 'access', 'security'];
    subDirs.forEach(dir => {
      const subDir = path.join(this.logDir, dir);
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: string, trace?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    const traceStr = trace ? `\n${trace}` : '';
    return `[${timestamp}] [${level}]${contextStr} ${message}${traceStr}`;
  }

  private writeToFile(filename: string, message: string) {
    try {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFile = path.join(this.logDir, filename, `${date}.log`);
      fs.appendFileSync(logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(message: string, context?: string) {
    this.info(message, context);
  }

  info(message: string, context?: string) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formatted = this.formatMessage('INFO', message, context);
    console.log(formatted);
    this.writeToFile('app', formatted);
  }

  error(message: string, trace?: string, context?: string) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formatted = this.formatMessage('ERROR', message, context, trace);
    console.error(formatted);
    this.writeToFile('error', formatted);
  }

  warn(message: string, context?: string) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formatted = this.formatMessage('WARN', message, context);
    console.warn(formatted);
    this.writeToFile('app', formatted);
  }

  debug(message: string, context?: string) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formatted = this.formatMessage('DEBUG', message, context);
    console.debug(formatted);
    this.writeToFile('app', formatted);
  }

  verbose(message: string, context?: string) {
    this.debug(message, context);
  }

  // 自定义日志方法
  access(message: string, data?: any) {
    const formatted = this.formatMessage('ACCESS', message);
    if (data) {
      const dataStr = JSON.stringify(data, null, 2);
      this.writeToFile('access', formatted + '\n' + dataStr);
    } else {
      this.writeToFile('access', formatted);
    }
  }

  security(message: string, data?: any, context?: string) {
    const formatted = this.formatMessage('SECURITY', message, context);
    console.warn(formatted);
    
    if (data) {
      const dataStr = JSON.stringify(data, null, 2);
      this.writeToFile('security', formatted + '\n' + dataStr);
    } else {
      this.writeToFile('security', formatted);
    }
  }

  audit(action: string, userId?: string, resourceType?: string, resourceId?: string, details?: any) {
    const auditData = {
      action,
      userId,
      resourceType,
      resourceId,
      details,
      timestamp: new Date().toISOString(),
      ip: details?.ip,
      userAgent: details?.userAgent,
    };
    
    const message = `AUDIT: ${action} by user ${userId || 'anonymous'}`;
    const formatted = this.formatMessage('AUDIT', message);
    
    this.writeToFile('security', formatted);
    this.writeToFile('security', JSON.stringify(auditData, null, 2));
  }

  // 性能日志
  performance(operation: string, duration: number, context?: string) {
    const message = `PERFORMANCE: ${operation} took ${duration}ms`;
    const formatted = this.formatMessage('PERF', message, context);
    
    if (duration > 1000) { // 超过1秒记录警告
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
    
    this.writeToFile('app', formatted);
  }
}