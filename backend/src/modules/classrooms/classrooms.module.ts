import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomTemplateService } from './classroom-template.service';
import { ClassroomBookingService } from './classroom-booking.service';
import { ClassroomsGateway } from './classrooms.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [ClassroomsController],
  providers: [
    ClassroomsService,
    ClassroomTemplateService,
    ClassroomBookingService,
    ClassroomsGateway,
  ],
  exports: [
    ClassroomsService,
    ClassroomTemplateService,
    ClassroomBookingService,
    ClassroomsGateway,
  ],
})
export class ClassroomsModule {}