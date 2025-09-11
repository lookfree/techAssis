import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationType, UserRole } from '@prisma/client';

interface LogOperationData {
  operationType: OperationType;
  module: string;
  action?: string;
  description?: string;
  targetType: string;
  targetId: string;
  affectedIds?: string[];
  operatorId: string;
  operatorName?: string;
  operatorRole: UserRole;
  details?: any;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  notes?: string;
}

@Injectable()
export class OperationLogService {
  constructor(private prisma: PrismaService) {}

  async log(data: LogOperationData) {
    try {
      return await this.prisma.operationLog.create({
        data: {
          operationType: data.operationType,
          module: data.module,
          action: data.action || 'operation',
          description: data.description || `${data.operationType} operation`,
          targetType: data.targetType,
          targetId: data.targetId,
          affectedIds: data.affectedIds || [],
          operatorId: data.operatorId,
          operatorName: data.operatorName || 'Unknown',
          operatorRole: data.operatorRole,
          details: data.details || {},
          beforeData: data.beforeData || {},
          afterData: data.afterData || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          notes: data.notes,
        },
        include: {
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            }
          }
        }
      });
    } catch (error) {
      // 记录日志失败不应该影响主业务流程
      console.error('Failed to log operation:', error);
      return null;
    }
  }

  // 批量记录操作日志
  async logBatch(operations: LogOperationData[]) {
    try {
      const createData = operations.map(data => ({
        operationType: data.operationType,
        module: data.module,
        action: data.action || 'batch_operation',
        description: data.description || `Batch ${data.operationType} operation`,
        targetType: data.targetType,
        targetId: data.targetId,
        affectedIds: data.affectedIds || [],
        operatorId: data.operatorId,
        operatorName: data.operatorName || 'Unknown',
        operatorRole: data.operatorRole,
        details: data.details || {},
        beforeData: data.beforeData || {},
        afterData: data.afterData || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
        notes: data.notes,
      }));

      return await this.prisma.operationLog.createMany({
        data: createData,
        skipDuplicates: true,
      });
    } catch (error) {
      console.error('Failed to log batch operations:', error);
      return null;
    }
  }

  // 查询操作日志
  async findLogs(params: {
    operationType?: OperationType;
    module?: string;
    targetType?: string;
    targetId?: string;
    operatorId?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      operationType,
      module,
      targetType,
      targetId,
      operatorId,
      startDate,
      endDate,
      success,
      page = 1,
      limit = 50
    } = params;

    const where: any = {};

    if (operationType) where.operationType = operationType;
    if (module) where.module = module;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (operatorId) where.operatorId = operatorId;
    if (success !== undefined) where.success = success;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        include: {
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.operationLog.count({ where })
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取操作统计
  async getOperationStats(params: {
    operatorId?: string;
    module?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { operatorId, module, startDate, endDate } = params;

    const where: any = {};
    if (operatorId) where.operatorId = operatorId;
    if (module) where.module = module;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalOps, successOps, operationsByType, operationsByModule] = await Promise.all([
      // 总操作数
      this.prisma.operationLog.count({ where }),
      
      // 成功操作数
      this.prisma.operationLog.count({ 
        where: { ...where, success: true } 
      }),
      
      // 按操作类型分组
      this.prisma.operationLog.groupBy({
        by: ['operationType'],
        where,
        _count: { operationType: true },
        orderBy: { _count: { operationType: 'desc' } }
      }),
      
      // 按模块分组
      this.prisma.operationLog.groupBy({
        by: ['module'],
        where,
        _count: { module: true },
        orderBy: { _count: { module: 'desc' } }
      })
    ]);

    return {
      total: totalOps,
      successful: successOps,
      failed: totalOps - successOps,
      successRate: totalOps > 0 ? (successOps / totalOps * 100).toFixed(2) : '0',
      byType: operationsByType.map(item => ({
        type: item.operationType,
        count: item._count.operationType
      })),
      byModule: operationsByModule.map(item => ({
        module: item.module,
        count: item._count.module
      }))
    };
  }

  // 清理旧日志（可以用于定时任务）
  async cleanupOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const result = await this.prisma.operationLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      return {
        deleted: result.count,
        cutoffDate,
      };
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
      throw error;
    }
  }
}