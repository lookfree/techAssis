import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassroomTemplateDto } from './dto';
import { LoggerService } from '../../common/logger/logger.service';
import { ClassroomType } from '@prisma/client';

@Injectable()
export class ClassroomTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async create(createTemplateDto: CreateClassroomTemplateDto) {
    this.logger.log('Creating new classroom template', 'ClassroomTemplateService');
    
    try {
      const template = await this.prisma.classroomTemplate.create({
        data: {
          ...createTemplateDto,
          layoutConfig: JSON.stringify(createTemplateDto.layoutConfig),
        },
      });

      this.logger.log(`Created classroom template with ID: ${template.id}`, 'ClassroomTemplateService');
      return {
        ...template,
        layoutConfig: JSON.parse(template.layoutConfig as string),
      };
    } catch (error) {
      this.logger.error('Failed to create classroom template', error.message, 'ClassroomTemplateService');
      throw new BadRequestException('Failed to create classroom template');
    }
  }

  async findAll(type?: ClassroomType) {
    this.logger.log('Fetching all classroom templates', 'ClassroomTemplateService');
    
    try {
      const where = type ? { type, isActive: true } : { isActive: true };
      const templates = await this.prisma.classroomTemplate.findMany({
        where,
        include: {
          _count: {
            select: {
              classrooms: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' },
        ],
      });

      return templates.map(template => ({
        ...template,
        layoutConfig: template.layoutConfig ? JSON.parse(template.layoutConfig as string) : null,
        usageCount: template._count.classrooms,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch classroom templates', error.message, 'ClassroomTemplateService');
      throw new BadRequestException('Failed to fetch classroom templates');
    }
  }

  async findOne(id: string) {
    this.logger.log(`Fetching classroom template with ID: ${id}`, 'ClassroomTemplateService');
    
    try {
      const template = await this.prisma.classroomTemplate.findUnique({
        where: { id },
        include: {
          classrooms: {
            select: {
              id: true,
              name: true,
              location: true,
              isActive: true,
            },
          },
        },
      });

      if (!template) {
        throw new NotFoundException(`Classroom template with ID ${id} not found`);
      }

      return {
        ...template,
        layoutConfig: template.layoutConfig ? JSON.parse(template.layoutConfig as string) : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch classroom template ${id}`, error.message, 'ClassroomTemplateService');
      throw new BadRequestException('Failed to fetch classroom template');
    }
  }

  async update(id: string, updateTemplateDto: Partial<CreateClassroomTemplateDto>) {
    this.logger.log(`Updating classroom template with ID: ${id}`, 'ClassroomTemplateService');
    
    try {
      const existingTemplate = await this.prisma.classroomTemplate.findUnique({ where: { id } });
      if (!existingTemplate) {
        throw new NotFoundException(`Classroom template with ID ${id} not found`);
      }

      const template = await this.prisma.classroomTemplate.update({
        where: { id },
        data: {
          ...updateTemplateDto,
          layoutConfig: updateTemplateDto.layoutConfig ? JSON.stringify(updateTemplateDto.layoutConfig) : undefined,
        },
      });

      this.logger.log(`Updated classroom template with ID: ${id}`, 'ClassroomTemplateService');
      return {
        ...template,
        layoutConfig: template.layoutConfig ? JSON.parse(template.layoutConfig as string) : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update classroom template ${id}`, error.message, 'ClassroomTemplateService');
      throw new BadRequestException('Failed to update classroom template');
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting classroom template with ID: ${id}`, 'ClassroomTemplateService');
    
    try {
      const existingTemplate = await this.prisma.classroomTemplate.findUnique({
        where: { id },
        include: {
          classrooms: true,
        },
      });

      if (!existingTemplate) {
        throw new NotFoundException(`Classroom template with ID ${id} not found`);
      }

      if (existingTemplate.classrooms.length > 0) {
        throw new ConflictException('Cannot delete template that is being used by classrooms');
      }

      if (existingTemplate.isDefault) {
        throw new ConflictException('Cannot delete default template');
      }

      await this.prisma.classroomTemplate.delete({ where: { id } });
      this.logger.log(`Deleted classroom template with ID: ${id}`, 'ClassroomTemplateService');
      
      return { message: 'Classroom template deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to delete classroom template ${id}`, error.message, 'ClassroomTemplateService');
      throw new BadRequestException('Failed to delete classroom template');
    }
  }

  async setAsDefault(id: string) {
    this.logger.log(`Setting classroom template ${id} as default`, 'ClassroomTemplateService');
    
    try {
      const template = await this.prisma.classroomTemplate.findUnique({ where: { id } });
      if (!template) {
        throw new NotFoundException(`Classroom template with ID ${id} not found`);
      }

      await this.prisma.$transaction(async (tx) => {
        // Remove default flag from all templates of the same type
        await tx.classroomTemplate.updateMany({
          where: { type: template.type, isDefault: true },
          data: { isDefault: false },
        });

        // Set the selected template as default
        await tx.classroomTemplate.update({
          where: { id },
          data: { isDefault: true },
        });
      });

      this.logger.log(`Set classroom template ${id} as default`, 'ClassroomTemplateService');
      return { message: 'Template set as default successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to set template ${id} as default`, error.message, 'ClassroomTemplateService');
      throw new BadRequestException('Failed to set template as default');
    }
  }

  async createDefaultTemplates() {
    this.logger.log('Creating default classroom templates', 'ClassroomTemplateService');
    
    const defaultTemplates = [
      {
        name: '标准阶梯教室模板',
        type: ClassroomType.lecture_hall,
        description: '适用于大型阶梯教室，座位呈倾斜排列，视野优化',
        capacity: 120,
        rows: 15,
        seatsPerRow: 8,
        layoutConfig: {
          aisles: [2, 6],
          specialSeats: {
            wheelchair: ['A1', 'A2'],
            frontPriority: ['B1', 'B2', 'B3'],
          },
          spacing: { horizontal: 60, vertical: 80 },
        },
        equipment: ['投影仪', '音响系统', '麦克风', '空调'],
        facilities: ['无障碍通道', '应急出口', '照明系统'],
        isDefault: true,
      },
      {
        name: '标准普通教室模板',
        type: ClassroomType.regular,
        description: '适用于中型普通教室，网格排列，规整布局',
        capacity: 48,
        rows: 8,
        seatsPerRow: 6,
        layoutConfig: {
          aisles: [3],
          specialSeats: {
            wheelchair: ['A1'],
          },
          spacing: { horizontal: 70, vertical: 90 },
        },
        equipment: ['黑板', '投影仪', '空调'],
        facilities: ['窗户', '照明系统'],
        isDefault: true,
      },
      {
        name: '标准实验室模板',
        type: ClassroomType.lab,
        description: '适用于实验室，实验台布局，小组座位',
        capacity: 24,
        rows: 4,
        seatsPerRow: 6,
        layoutConfig: {
          specialSeats: {
            wheelchair: ['A1'],
          },
          spacing: { horizontal: 120, vertical: 150 },
        },
        equipment: ['实验台', '通风设备', '安全设备', '水电设施'],
        facilities: ['紧急冲洗设备', '防火设施', '通风系统'],
        isDefault: true,
      },
      {
        name: '标准研讨室模板',
        type: ClassroomType.seminar,
        description: '适用于研讨室，圆桌布局，互动交流',
        capacity: 16,
        rows: 2,
        seatsPerRow: 8,
        layoutConfig: {
          specialSeats: {
            wheelchair: ['A1'],
          },
          spacing: { horizontal: 90, vertical: 90 },
        },
        equipment: ['圆桌', '白板', '投影仪'],
        facilities: ['舒适座椅', '茶水设施'],
        isDefault: true,
      },
    ];

    try {
      for (const template of defaultTemplates) {
        const existing = await this.prisma.classroomTemplate.findFirst({
          where: { name: template.name, type: template.type },
        });

        if (!existing) {
          await this.prisma.classroomTemplate.create({
            data: {
              ...template,
              layoutConfig: JSON.stringify(template.layoutConfig),
            },
          });
          this.logger.log(`Created default template: ${template.name}`, 'ClassroomTemplateService');
        }
      }
    } catch (error) {
      this.logger.error('Failed to create default templates', error.message, 'ClassroomTemplateService');
      throw new BadRequestException('Failed to create default templates');
    }
  }
}