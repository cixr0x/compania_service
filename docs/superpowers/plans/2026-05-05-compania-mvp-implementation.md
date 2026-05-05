# Compania MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working internal web application for product, stakeholder, project, sales CRUD, and staged CSV/XLSX sales imports.

**Architecture:** The repository contains two separate projects: `backend/` for a NestJS REST API and `frontend/` for a React Vite webapp. MySQL persistence is handled through Prisma migrations and Prisma Client. The staged import workflow stores parsed file rows in staging tables, lets the user review source/date/product matches, then transactionally commits valid rows to `sales`.

**Tech Stack:** NestJS, TypeScript, Prisma, MySQL, class-validator, Jest, React, Vite, React Router, TanStack Query, TanStack Table, Vitest, Testing Library.

---

## Scope Check

This is one MVP plan because the CRUD screens, API contract, Prisma schema, and staged import flow all depend on the same database model. Reports, auth, fee calculation, and profit allocation remain deferred and are not part of this plan.

## File Structure Map

Backend files to create or modify:

- `backend/.env.example`: database and server credential template.
- `backend/package.json`: scripts and dependencies.
- `backend/prisma/schema.prisma`: MySQL schema for products, models, projects, stakeholders, sales, and imports.
- `backend/src/main.ts`: API prefix, CORS, validation pipe.
- `backend/src/app.module.ts`: root module imports.
- `backend/src/prisma/prisma.module.ts`: Prisma module export.
- `backend/src/prisma/prisma.service.ts`: Prisma client lifecycle.
- `backend/src/common/constants/import-sources.ts`: source names and source-to-product-field mapping.
- `backend/src/common/dto/id-param.dto.ts`: shared numeric route parameter DTO.
- `backend/src/common/dto/pagination-query.dto.ts`: shared list query DTO.
- `backend/src/common/errors/http-exception.filter.ts`: consistent validation/error response shape.
- `backend/src/models/*`: pricing model CRUD module.
- `backend/src/products/*`: product CRUD module.
- `backend/src/stakeholders/*`: stakeholder CRUD module.
- `backend/src/projects/*`: project CRUD module.
- `backend/src/project-stakeholders/*`: project stakeholder CRUD module with total split validation.
- `backend/src/sales/*`: sales CRUD module.
- `backend/src/import-batches/*`: staged import upload, validation, review, commit, cancel.
- `backend/test/*`: backend e2e tests.

Frontend files to create or modify:

- `frontend/.env.example`: API base URL template.
- `frontend/package.json`: scripts and dependencies.
- `frontend/src/main.tsx`: React entrypoint.
- `frontend/src/App.tsx`: routes and layout.
- `frontend/src/api/client.ts`: REST client.
- `frontend/src/api/types.ts`: shared TypeScript DTOs.
- `frontend/src/components/AppLayout.tsx`: navigation and page shell.
- `frontend/src/components/DataTable.tsx`: reusable sortable/filterable table.
- `frontend/src/components/EntityForm.tsx`: reusable form wrapper.
- `frontend/src/features/entities/entityConfigs.ts`: field/table config for CRUD resources.
- `frontend/src/features/entities/EntityListPage.tsx`: generic table page.
- `frontend/src/features/entities/EntityEditPage.tsx`: generic create/edit page.
- `frontend/src/features/imports/SalesImportPage.tsx`: staged import UI.
- `frontend/src/test/setup.ts`: Testing Library setup.
- `frontend/src/**/*.test.tsx`: frontend component tests.

Documentation files to modify:

- `README.md`: local setup, scripts, and database instructions.
- `docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md`: update only when design decisions change.

## Implementation Conventions

- Use `npm.cmd` in PowerShell because this environment blocks `npm.ps1`.
- Keep database column names snake_case where the user specified them. Use camelCase in TypeScript DTOs and Prisma model fields, with Prisma `@map` for database columns.
- Use backend validation as the source of truth.
- Use class-validator DTOs in controllers.
- Return JSON errors in this shape:

```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "name must not be empty" }
  ]
}
```

- Commit after each task when its verification command passes.

---

### Task 1: Scaffold Backend And Frontend Projects

**Files:**
- Create: `backend/`
- Create: `frontend/`
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold the NestJS backend**

Run from `C:\PROJECTS\compania_service`:

```powershell
npx.cmd -y @nestjs/cli@latest new backend --package-manager npm --skip-git --strict
```

Expected: `backend/` exists with `src/app.module.ts`, `src/main.ts`, `package.json`, and Jest config.

- [ ] **Step 2: Scaffold the React Vite frontend**

Run from `C:\PROJECTS\compania_service`:

```powershell
npm.cmd create vite@latest frontend -- --template react-ts
```

Expected: `frontend/` exists with `src/main.tsx`, `src/App.tsx`, and `package.json`.

- [ ] **Step 3: Install backend dependencies**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd install @nestjs/config @nestjs/mapped-types @prisma/client class-validator class-transformer multer xlsx csv-parse decimal.js
npm.cmd install -D prisma @types/multer
```

Expected: install exits `0` and `backend/package-lock.json` is updated.

- [ ] **Step 4: Install frontend dependencies**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd install @tanstack/react-query @tanstack/react-table axios react-router-dom lucide-react
npm.cmd install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: install exits `0` and `frontend/package-lock.json` is updated.

- [ ] **Step 5: Add credential templates**

Create `backend/.env.example`:

```dotenv
DATABASE_URL="mysql://compania_user:compania_password@localhost:3306/compania_service"
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_DATABASE="compania_service"
MYSQL_USER="compania_user"
MYSQL_PASSWORD="compania_password"
PORT="3000"
CORS_ORIGIN="http://localhost:5173"
```

Create `frontend/.env.example`:

```dotenv
VITE_API_BASE_URL="http://localhost:3000/api"
```

- [ ] **Step 6: Update root README setup section**

Replace `README.md` with:

```markdown
# Compania Service

Enterprise web application for managing products, projects, stakeholders, and staged sales imports.

Project design is documented in [docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md](docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md).

## Projects

- `backend/`: NestJS REST API with Prisma and MySQL.
- `frontend/`: React Vite webapp.

## Local Setup

1. Copy `backend/.env.example` to `backend/.env` and set MySQL credentials.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Install backend dependencies with `npm.cmd install` inside `backend/`.
4. Install frontend dependencies with `npm.cmd install` inside `frontend/`.
5. Run backend tests with `npm.cmd test`.
6. Run frontend tests with `npm.cmd test`.

Use `npm.cmd` from PowerShell on Windows.
```

- [ ] **Step 7: Verify scaffold builds**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd run build
```

Expected: backend generated tests pass; frontend build exits `0`.

- [ ] **Step 8: Commit scaffold**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add README.md .gitignore backend frontend
git commit -m "chore: scaffold backend and frontend"
```

Expected: commit succeeds.

---

### Task 2: Define Prisma Schema And Backend Runtime Foundation

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/prisma/prisma.module.ts`
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/src/common/constants/import-sources.ts`
- Create: `backend/src/common/dto/id-param.dto.ts`
- Create: `backend/src/common/dto/pagination-query.dto.ts`
- Create: `backend/src/common/errors/http-exception.filter.ts`
- Modify: `backend/src/main.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/common/constants/import-sources.spec.ts`

- [ ] **Step 1: Write failing source mapping test**

Create `backend/src/common/constants/import-sources.spec.ts`:

```typescript
import { getProductExternalIdField, IMPORT_SOURCES } from './import-sources';

describe('import source mapping', () => {
  it('maps each supported import source to the correct product external ID field', () => {
    expect(IMPORT_SOURCES).toEqual(['ecommerce', 'store', 'event', 'surface']);
    expect(getProductExternalIdField('ecommerce')).toBe('idEcommerce');
    expect(getProductExternalIdField('store')).toBe('idStore');
    expect(getProductExternalIdField('event')).toBe('idEvent');
    expect(getProductExternalIdField('surface')).toBe('idSurface');
  });

  it('rejects unsupported import sources', () => {
    expect(() => getProductExternalIdField('marketplace')).toThrow('Unsupported import source: marketplace');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- import-sources.spec.ts
```

Expected: FAIL with module resolution error for `./import-sources`.

- [ ] **Step 3: Implement source mapping**

Create `backend/src/common/constants/import-sources.ts`:

```typescript
export const IMPORT_SOURCES = ['ecommerce', 'store', 'event', 'surface'] as const;

export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const PRODUCT_EXTERNAL_ID_FIELD_BY_SOURCE: Record<ImportSource, string> = {
  ecommerce: 'idEcommerce',
  store: 'idStore',
  event: 'idEvent',
  surface: 'idSurface',
};

export function isImportSource(value: string): value is ImportSource {
  return IMPORT_SOURCES.includes(value as ImportSource);
}

export function getProductExternalIdField(source: string): string {
  if (!isImportSource(source)) {
    throw new Error(`Unsupported import source: ${source}`);
  }

  return PRODUCT_EXTERNAL_ID_FIELD_BY_SOURCE[source];
}
```

- [ ] **Step 4: Run source mapping test to verify it passes**

Run:

```powershell
npm.cmd test -- import-sources.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Create Prisma schema**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npx.cmd prisma init --datasource-provider mysql
```

Replace `backend/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model PricingModel {
  idModel     Int       @id @default(autoincrement()) @map("id_model")
  name        String    @db.VarChar(255)
  description String?   @db.Text
  products    Product[]

  @@map("model")
}

model Product {
  id           Int       @id @default(autoincrement())
  name         String    @db.VarChar(255)
  description  String?   @db.Text
  image        String?   @db.Text
  idEcommerce  String?   @unique @map("id_ecommerce") @db.VarChar(255)
  idStore      String?   @unique @map("id_store") @db.VarChar(255)
  idEvent      String?   @unique @map("id_event") @db.VarChar(255)
  idSurface    String?   @unique @map("id_surface") @db.VarChar(255)
  idModel      Int?      @map("id_model")
  ownership    Decimal   @default(0) @db.Decimal(7, 2)
  tag          String?   @db.VarChar(255)
  model        PricingModel? @relation(fields: [idModel], references: [idModel], onDelete: SetNull)
  projects     Project[]
  sales        Sale[]
  importStages ImportStage[]

  @@map("product")
}

model Project {
  idProject    Int                  @id @default(autoincrement()) @map("id_project")
  idProduct    Int                  @map("id_product")
  units        Int
  unitCost     Decimal              @map("unit_cost") @db.Decimal(12, 2)
  adminCost    Decimal              @map("admin_cost") @db.Decimal(12, 2)
  product      Product              @relation(fields: [idProduct], references: [id], onDelete: Restrict)
  stakeholders ProjectStakeholder[]

  @@map("project")
}

model Stakeholder {
  idStakeholder Int                  @id @default(autoincrement()) @map("id_stakeholder")
  name          String               @db.VarChar(255)
  projects      ProjectStakeholder[]

  @@map("stakeholder")
}

model ProjectStakeholder {
  idProjectStakeholder Int         @id @default(autoincrement()) @map("id_project_stakeholder")
  idProject            Int         @map("id_project")
  idStakeholder        Int         @map("id_stakeholder")
  stakePercentage      Decimal     @map("stake_percentage") @db.Decimal(7, 2)
  project              Project     @relation(fields: [idProject], references: [idProject], onDelete: Cascade)
  stakeholder          Stakeholder @relation(fields: [idStakeholder], references: [idStakeholder], onDelete: Restrict)

  @@unique([idProject, idStakeholder])
  @@map("project_stakeholder")
}

model Sale {
  idSale    Int      @id @default(autoincrement()) @map("id_sale")
  date      DateTime
  idProduct Int      @map("id_product")
  quantity  Int
  amount    Decimal  @db.Decimal(12, 2)
  source    String   @db.VarChar(50)
  fee       Decimal  @default(0) @db.Decimal(12, 2)
  product   Product  @relation(fields: [idProduct], references: [id], onDelete: Restrict)

  @@map("sales")
}

model ImportBatch {
  idImportBatch   Int           @id @default(autoincrement()) @map("id_import_batch")
  source          String        @db.VarChar(50)
  importDate      DateTime?     @map("import_date")
  originalFilename String       @map("original_filename") @db.VarChar(255)
  status          ImportStatus  @default(uploaded)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  committedAt     DateTime?     @map("committed_at")
  stageRows       ImportStage[]
  errors          ImportError[]

  @@map("import_batch")
}

model ImportStage {
  idImportStage              Int          @id @default(autoincrement()) @map("id_import_stage")
  idImportBatch              Int          @map("id_import_batch")
  rowNumber                  Int          @map("row_number")
  externalProductId          String?      @map("external_product_id") @db.VarChar(255)
  importedProductDescription String?      @map("imported_product_description") @db.Text
  idProduct                  Int?         @map("id_product")
  quantity                   Int?
  amount                     Decimal?     @db.Decimal(12, 2)
  rawRow                     Json?        @map("raw_row")
  createdAt                  DateTime     @default(now()) @map("created_at")
  batch                      ImportBatch  @relation(fields: [idImportBatch], references: [idImportBatch], onDelete: Cascade)
  product                    Product?     @relation(fields: [idProduct], references: [id], onDelete: SetNull)
  errors                     ImportError[]

  @@index([idImportBatch])
  @@map("import_stage")
}

model ImportError {
  idImportError  Int          @id @default(autoincrement()) @map("id_import_error")
  idImportBatch  Int          @map("id_import_batch")
  idImportStage  Int?         @map("id_import_stage")
  rowNumber      Int?         @map("row_number")
  field          String?      @db.VarChar(100)
  message        String       @db.Text
  createdAt      DateTime     @default(now()) @map("created_at")
  batch          ImportBatch  @relation(fields: [idImportBatch], references: [idImportBatch], onDelete: Cascade)
  stage          ImportStage? @relation(fields: [idImportStage], references: [idImportStage], onDelete: Cascade)

  @@index([idImportBatch])
  @@map("import_error")
}

enum ImportStatus {
  uploaded
  validated
  has_errors
  committed
  cancelled
}
```

- [ ] **Step 6: Create Prisma service**

Create `backend/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Create `backend/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 7: Create shared DTOs and error filter**

Create `backend/src/common/dto/id-param.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class IdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;
}
```

Create `backend/src/common/dto/pagination-query.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @IsString()
  search?: string;
}
```

Create `backend/src/common/errors/http-exception.filter.ts`:

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message: string | string[] }).message;
      response.status(status).json({
        message: Array.isArray(message) ? 'Validation failed' : message,
        errors: Array.isArray(message)
          ? message.map((item) => ({ message: item }))
          : [],
      });
      return;
    }

    response.status(status).json({ message: exception.message, errors: [] });
  }
}
```

- [ ] **Step 8: Wire NestJS runtime**

Replace `backend/src/main.ts` with:

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
```

Update `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 9: Verify schema generation and tests**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npx.cmd prisma format
npx.cmd prisma generate
npm.cmd test -- import-sources.spec.ts
npm.cmd run build
```

Expected: Prisma format/generate exit `0`, source mapping test passes, backend build exits `0`.

- [ ] **Step 10: Commit backend foundation**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add backend
git commit -m "feat: add backend schema and runtime foundation"
```

Expected: commit succeeds.

---

### Task 3: Implement Simple Backend CRUD Modules

**Files:**
- Create: `backend/src/models/models.module.ts`
- Create: `backend/src/models/models.controller.ts`
- Create: `backend/src/models/models.service.ts`
- Create: `backend/src/models/dto/create-model.dto.ts`
- Create: `backend/src/models/dto/update-model.dto.ts`
- Create: `backend/src/products/products.module.ts`
- Create: `backend/src/products/products.controller.ts`
- Create: `backend/src/products/products.service.ts`
- Create: `backend/src/products/dto/create-product.dto.ts`
- Create: `backend/src/products/dto/update-product.dto.ts`
- Create: `backend/src/stakeholders/stakeholders.module.ts`
- Create: `backend/src/stakeholders/stakeholders.controller.ts`
- Create: `backend/src/stakeholders/stakeholders.service.ts`
- Create: `backend/src/stakeholders/dto/create-stakeholder.dto.ts`
- Create: `backend/src/stakeholders/dto/update-stakeholder.dto.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/models/models.service.spec.ts`
- Test: `backend/src/products/products.service.spec.ts`
- Test: `backend/src/stakeholders/stakeholders.service.spec.ts`

- [ ] **Step 1: Write failing model service test**

Create `backend/src/models/models.service.spec.ts`:

```typescript
import { ModelsService } from './models.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ModelsService', () => {
  const prisma = {
    pricingModel: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a pricing model with name and description', async () => {
    jest.spyOn(prisma.pricingModel, 'create').mockResolvedValue({
      idModel: 1,
      name: 'Retail',
      description: 'Retail pricing',
    });

    const service = new ModelsService(prisma);
    const result = await service.create({ name: 'Retail', description: 'Retail pricing' });

    expect(prisma.pricingModel.create).toHaveBeenCalledWith({
      data: { name: 'Retail', description: 'Retail pricing' },
    });
    expect(result.name).toBe('Retail');
  });
});
```

- [ ] **Step 2: Run model test to verify it fails**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- models.service.spec.ts
```

Expected: FAIL with module resolution error for `./models.service`.

- [ ] **Step 3: Implement model DTOs, service, controller, module**

Create `backend/src/models/dto/create-model.dto.ts`:

```typescript
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

Create `backend/src/models/dto/update-model.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateModelDto } from './create-model.dto';

export class UpdateModelDto extends PartialType(CreateModelDto) {}
```

Create `backend/src/models/models.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateModelDto) {
    return this.prisma.pricingModel.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.pricingModel.findMany({
      where: query.search ? { name: { contains: query.search } } : undefined,
      orderBy: { idModel: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.pricingModel.findUnique({ where: { idModel: id } });
    if (!record) throw new NotFoundException(`Model ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateModelDto) {
    await this.findOne(id);
    return this.prisma.pricingModel.update({ where: { idModel: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.pricingModel.delete({ where: { idModel: id } });
  }
}
```

Create `backend/src/models/models.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post()
  create(@Body() dto: CreateModelDto) {
    return this.modelsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.modelsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.modelsService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateModelDto) {
    return this.modelsService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.modelsService.remove(params.id);
  }
}
```

Create `backend/src/models/models.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';

@Module({
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
```

- [ ] **Step 4: Run model test to verify it passes**

Run:

```powershell
npm.cmd test -- models.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing product service test**

Create `backend/src/products/products.service.spec.ts`:

```typescript
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  const prisma = {
    product: {
      create: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a product with external IDs and ownership percentage', async () => {
    jest.spyOn(prisma.product, 'create').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      description: 'Kit',
      image: null,
      idEcommerce: 'EC-1',
      idStore: null,
      idEvent: null,
      idSurface: null,
      idModel: 2,
      ownership: '15.00',
      tag: 'starter',
    });

    const service = new ProductsService(prisma);
    await service.create({
      name: 'Starter Kit',
      description: 'Kit',
      image: undefined,
      idEcommerce: 'EC-1',
      idStore: undefined,
      idEvent: undefined,
      idSurface: undefined,
      idModel: 2,
      ownership: 15,
      tag: 'starter',
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Starter Kit',
        description: 'Kit',
        image: undefined,
        idEcommerce: 'EC-1',
        idStore: undefined,
        idEvent: undefined,
        idSurface: undefined,
        idModel: 2,
        ownership: 15,
        tag: 'starter',
      },
    });
  });
});
```

- [ ] **Step 6: Run product test to verify it fails**

Run:

```powershell
npm.cmd test -- products.service.spec.ts
```

Expected: FAIL with module resolution error for `./products.service`.

- [ ] **Step 7: Implement product DTOs, service, controller, module**

Create `backend/src/products/dto/create-product.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idEcommerce?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idStore?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idEvent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idSurface?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idModel?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ownership = 0;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tag?: string;
}
```

Create `backend/src/products/dto/update-product.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

Create `backend/src/products/products.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.product.findMany({
      where: query.search ? { name: { contains: query.search } } : undefined,
      include: { model: true },
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.product.findUnique({ where: { id }, include: { model: true } });
    if (!record) throw new NotFoundException(`Product ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
```

Create `backend/src/products/products.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.productsService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateProductDto) {
    return this.productsService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.productsService.remove(params.id);
  }
}
```

Create `backend/src/products/products.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

- [ ] **Step 8: Run product test to verify it passes**

Run:

```powershell
npm.cmd test -- products.service.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Write failing stakeholder service test**

Create `backend/src/stakeholders/stakeholders.service.spec.ts`:

```typescript
import { StakeholdersService } from './stakeholders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StakeholdersService', () => {
  const prisma = {
    stakeholder: {
      create: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a stakeholder by name', async () => {
    jest.spyOn(prisma.stakeholder, 'create').mockResolvedValue({
      idStakeholder: 1,
      name: 'Primary Investor',
    });

    const service = new StakeholdersService(prisma);
    const result = await service.create({ name: 'Primary Investor' });

    expect(prisma.stakeholder.create).toHaveBeenCalledWith({
      data: { name: 'Primary Investor' },
    });
    expect(result.idStakeholder).toBe(1);
  });
});
```

- [ ] **Step 10: Run stakeholder test to verify it fails**

Run:

```powershell
npm.cmd test -- stakeholders.service.spec.ts
```

Expected: FAIL with module resolution error for `./stakeholders.service`.

- [ ] **Step 11: Implement stakeholder DTOs, service, controller, module**

Create `backend/src/stakeholders/dto/create-stakeholder.dto.ts`:

```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateStakeholderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
```

Create `backend/src/stakeholders/dto/update-stakeholder.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateStakeholderDto } from './create-stakeholder.dto';

export class UpdateStakeholderDto extends PartialType(CreateStakeholderDto) {}
```

Create `backend/src/stakeholders/stakeholders.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';

@Injectable()
export class StakeholdersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStakeholderDto) {
    return this.prisma.stakeholder.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.stakeholder.findMany({
      where: query.search ? { name: { contains: query.search } } : undefined,
      orderBy: { idStakeholder: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.stakeholder.findUnique({ where: { idStakeholder: id } });
    if (!record) throw new NotFoundException(`Stakeholder ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateStakeholderDto) {
    await this.findOne(id);
    return this.prisma.stakeholder.update({ where: { idStakeholder: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.stakeholder.delete({ where: { idStakeholder: id } });
  }
}
```

Create `backend/src/stakeholders/stakeholders.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';
import { StakeholdersService } from './stakeholders.service';

@Controller('stakeholders')
export class StakeholdersController {
  constructor(private readonly stakeholdersService: StakeholdersService) {}

  @Post()
  create(@Body() dto: CreateStakeholderDto) {
    return this.stakeholdersService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.stakeholdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.stakeholdersService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateStakeholderDto) {
    return this.stakeholdersService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.stakeholdersService.remove(params.id);
  }
}
```

Create `backend/src/stakeholders/stakeholders.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StakeholdersController } from './stakeholders.controller';
import { StakeholdersService } from './stakeholders.service';

@Module({
  controllers: [StakeholdersController],
  providers: [StakeholdersService],
})
export class StakeholdersModule {}
```

- [ ] **Step 12: Register simple CRUD modules**

Update `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModelsModule } from './models/models.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { StakeholdersModule } from './stakeholders/stakeholders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ModelsModule,
    ProductsModule,
    StakeholdersModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 13: Verify simple CRUD modules**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- models.service.spec.ts products.service.spec.ts stakeholders.service.spec.ts
npm.cmd run build
```

Expected: all named tests pass and build exits `0`.

- [ ] **Step 14: Commit simple CRUD modules**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add backend/src backend/package.json backend/package-lock.json
git commit -m "feat: add core catalog crud modules"
```

Expected: commit succeeds.

---

### Task 4: Implement Projects And Stakeholder Split Validation

**Files:**
- Create: `backend/src/projects/*`
- Create: `backend/src/project-stakeholders/*`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/project-stakeholders/project-stakeholders.service.spec.ts`

- [ ] **Step 1: Write failing stakeholder split validation tests**

Create `backend/src/project-stakeholders/project-stakeholders.service.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { ProjectStakeholdersService } from './project-stakeholders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProjectStakeholdersService', () => {
  const prisma = {
    projectStakeholder: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('allows a project stakeholder write when the project total remains 100', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 1, idProject: 10, idStakeholder: 1, stakePercentage: '60.00' },
    ]);
    jest.spyOn(prisma.projectStakeholder, 'create').mockResolvedValue({
      idProjectStakeholder: 2,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '40.00',
    });

    const service = new ProjectStakeholdersService(prisma);
    await service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 40 });

    expect(prisma.projectStakeholder.create).toHaveBeenCalled();
  });

  it('rejects a project stakeholder write when the project total exceeds 100', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 1, idProject: 10, idStakeholder: 1, stakePercentage: '80.00' },
    ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 2: Run split validation tests to verify they fail**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- project-stakeholders.service.spec.ts
```

Expected: FAIL with module resolution error for `./project-stakeholders.service`.

- [ ] **Step 3: Implement project DTOs and service**

Create `backend/src/projects/dto/create-project.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  units!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  adminCost!: number;
}
```

Create `backend/src/projects/dto/update-project.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
```

Create `backend/src/projects/projects.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.project.findMany({
      include: { product: true, stakeholders: { include: { stakeholder: true } } },
      orderBy: { idProject: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.project.findUnique({
      where: { idProject: id },
      include: { product: true, stakeholders: { include: { stakeholder: true } } },
    });
    if (!record) throw new NotFoundException(`Project ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { idProject: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.delete({ where: { idProject: id } });
  }
}
```

Create `backend/src/projects/projects.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.projectsService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.projectsService.remove(params.id);
  }
}
```

Create `backend/src/projects/projects.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
```

- [ ] **Step 4: Implement project stakeholder DTOs and service**

Create `backend/src/project-stakeholders/dto/create-project-stakeholder.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class CreateProjectStakeholderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProject!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idStakeholder!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  stakePercentage!: number;
}
```

Create `backend/src/project-stakeholders/dto/update-project-stakeholder.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectStakeholderDto } from './create-project-stakeholder.dto';

export class UpdateProjectStakeholderDto extends PartialType(CreateProjectStakeholderDto) {}
```

Create `backend/src/project-stakeholders/project-stakeholders.service.ts`:

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';

@Injectable()
export class ProjectStakeholdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectStakeholderDto) {
    await this.assertProjectTotalIsValid(dto.idProject, dto.stakePercentage);
    return this.prisma.projectStakeholder.create({ data: dto });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.projectStakeholder.findMany({
      include: { project: true, stakeholder: true },
      orderBy: { idProjectStakeholder: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.projectStakeholder.findUnique({
      where: { idProjectStakeholder: id },
      include: { project: true, stakeholder: true },
    });
    if (!record) throw new NotFoundException(`Project stakeholder ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateProjectStakeholderDto) {
    const existing = await this.findOne(id);
    const idProject = dto.idProject ?? existing.idProject;
    const nextStake = dto.stakePercentage ?? Number(existing.stakePercentage);
    await this.assertProjectTotalIsValid(idProject, nextStake, id);
    return this.prisma.projectStakeholder.update({ where: { idProjectStakeholder: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.projectStakeholder.delete({ where: { idProjectStakeholder: id } });
  }

  private async assertProjectTotalIsValid(idProject: number, nextStake: number, excludingId?: number): Promise<void> {
    const existingRows = await this.prisma.projectStakeholder.findMany({ where: { idProject } });
    const existingTotal = existingRows
      .filter((row) => row.idProjectStakeholder !== excludingId)
      .reduce((sum, row) => sum + Number(row.stakePercentage), 0);
    const nextTotal = Number((existingTotal + nextStake).toFixed(2));

    if (nextTotal > 100) {
      throw new BadRequestException(`Project stakeholder percentages cannot exceed 100. Current total would be ${nextTotal}.`);
    }
  }
}
```

Create `backend/src/project-stakeholders/project-stakeholders.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';
import { ProjectStakeholdersTotalService } from './project-stakeholders-total.service';
import { ProjectStakeholdersService } from './project-stakeholders.service';

@Controller('project-stakeholders')
export class ProjectStakeholdersController {
  constructor(
    private readonly projectStakeholdersService: ProjectStakeholdersService,
    private readonly totalService: ProjectStakeholdersTotalService,
  ) {}

  @Post()
  create(@Body() dto: CreateProjectStakeholderDto) {
    return this.projectStakeholdersService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.projectStakeholdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.projectStakeholdersService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateProjectStakeholderDto) {
    return this.projectStakeholdersService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.projectStakeholdersService.remove(params.id);
  }

  @Post('projects/:id/validate-total')
  validateProjectTotal(@Param() params: IdParamDto) {
    return this.totalService.assertProjectHasExactTotal(params.id).then(() => ({ valid: true }));
  }
}
```

Create `backend/src/project-stakeholders/project-stakeholders.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ProjectStakeholdersController } from './project-stakeholders.controller';
import { ProjectStakeholdersTotalService } from './project-stakeholders-total.service';
import { ProjectStakeholdersService } from './project-stakeholders.service';

@Module({
  controllers: [ProjectStakeholdersController],
  providers: [ProjectStakeholdersService, ProjectStakeholdersTotalService],
})
export class ProjectStakeholdersModule {}
```

- [ ] **Step 5: Add commit-time exact-total endpoint behavior**

Add `backend/src/project-stakeholders/project-stakeholders-total.service.ts`:

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectStakeholdersTotalService {
  constructor(private readonly prisma: PrismaService) {}

  async assertProjectHasExactTotal(idProject: number): Promise<void> {
    const rows = await this.prisma.projectStakeholder.findMany({ where: { idProject } });
    const total = rows.reduce((sum, row) => sum + Number(row.stakePercentage), 0);
    if (Number(total.toFixed(2)) !== 100) {
      throw new BadRequestException(`Project ${idProject} stakeholder percentages must total 100. Current total is ${total}.`);
    }
  }
}
```

Verify the controller includes this route:

```typescript
@Post('projects/:id/validate-total')
validateProjectTotal(@Param() params: IdParamDto) {
  return this.totalService.assertProjectHasExactTotal(params.id).then(() => ({ valid: true }));
}
```

Verify the controller constructor includes both services:

```typescript
constructor(
  private readonly projectStakeholdersService: ProjectStakeholdersService,
  private readonly totalService: ProjectStakeholdersTotalService,
) {}
```

Verify `ProjectStakeholdersTotalService` is listed in the `providers` array of `ProjectStakeholdersModule`.

- [ ] **Step 6: Register project modules**

Update `backend/src/app.module.ts` imports to include:

```typescript
ProjectsModule,
ProjectStakeholdersModule,
```

- [ ] **Step 7: Verify project modules**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- project-stakeholders.service.spec.ts
npm.cmd run build
```

Expected: test passes and build exits `0`.

- [ ] **Step 8: Commit project split logic**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add backend/src
git commit -m "feat: add projects and stakeholder split validation"
```

Expected: commit succeeds.

---

### Task 5: Implement Sales CRUD

**Files:**
- Create: `backend/src/sales/sales.module.ts`
- Create: `backend/src/sales/sales.controller.ts`
- Create: `backend/src/sales/sales.service.ts`
- Create: `backend/src/sales/dto/create-sale.dto.ts`
- Create: `backend/src/sales/dto/update-sale.dto.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/sales/sales.service.spec.ts`

- [ ] **Step 1: Write failing sales service test**

Create `backend/src/sales/sales.service.spec.ts`:

```typescript
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SalesService', () => {
  const prisma = {
    sale: {
      create: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a sale with a default fee of zero when fee is omitted', async () => {
    jest.spyOn(prisma.sale, 'create').mockResolvedValue({
      idSale: 1,
      date: new Date('2026-05-05T00:00:00.000Z'),
      idProduct: 7,
      quantity: 2,
      amount: '120.00',
      source: 'ecommerce',
      fee: '0.00',
    });

    const service = new SalesService(prisma);
    await service.create({
      date: '2026-05-05',
      idProduct: 7,
      quantity: 2,
      amount: 120,
      source: 'ecommerce',
    });

    expect(prisma.sale.create).toHaveBeenCalledWith({
      data: {
        date: new Date('2026-05-05'),
        idProduct: 7,
        quantity: 2,
        amount: 120,
        source: 'ecommerce',
        fee: 0,
      },
    });
  });
});
```

- [ ] **Step 2: Run sales test to verify it fails**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- sales.service.spec.ts
```

Expected: FAIL with module resolution error for `./sales.service`.

- [ ] **Step 3: Implement sales DTOs and module**

Create `backend/src/sales/dto/create-sale.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { IMPORT_SOURCES } from '../../common/constants/import-sources';

export class CreateSaleDto {
  @IsDateString()
  date!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsIn(IMPORT_SOURCES)
  source!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee?: number;
}
```

Create `backend/src/sales/dto/update-sale.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateSaleDto } from './create-sale.dto';

export class UpdateSaleDto extends PartialType(CreateSaleDto) {}
```

Create `backend/src/sales/sales.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSaleDto) {
    return this.prisma.sale.create({
      data: {
        date: new Date(dto.date),
        idProduct: dto.idProduct,
        quantity: dto.quantity,
        amount: dto.amount,
        source: dto.source,
        fee: dto.fee ?? 0,
      },
    });
  }

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return this.prisma.sale.findMany({
      include: { product: true },
      orderBy: { idSale: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.sale.findUnique({ where: { idSale: id }, include: { product: true } });
    if (!record) throw new NotFoundException(`Sale ${id} was not found`);
    return record;
  }

  async update(id: number, dto: UpdateSaleDto) {
    await this.findOne(id);
    return this.prisma.sale.update({
      where: { idSale: id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.sale.delete({ where: { idSale: id } });
  }
}
```

Create `backend/src/sales/sales.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.salesService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateSaleDto) {
    return this.salesService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.salesService.remove(params.id);
  }
}
```

Create `backend/src/sales/sales.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
```

- [ ] **Step 4: Register sales module**

Update `backend/src/app.module.ts` imports to include:

```typescript
SalesModule,
```

- [ ] **Step 5: Verify sales CRUD**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- sales.service.spec.ts
npm.cmd run build
```

Expected: sales service test passes and build exits `0`.

- [ ] **Step 6: Commit sales CRUD**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add backend/src
git commit -m "feat: add sales crud"
```

Expected: commit succeeds.

---

### Task 6: Implement Staged Import Backend

**Files:**
- Create: `backend/src/import-batches/import-batches.module.ts`
- Create: `backend/src/import-batches/import-batches.controller.ts`
- Create: `backend/src/import-batches/import-batches.service.ts`
- Create: `backend/src/import-batches/import-parser.service.ts`
- Create: `backend/src/import-batches/import-validator.service.ts`
- Create: `backend/src/import-batches/dto/create-import-batch.dto.ts`
- Create: `backend/src/import-batches/dto/update-import-batch.dto.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/import-batches/import-validator.service.spec.ts`
- Test: `backend/src/import-batches/import-batches.service.spec.ts`

- [ ] **Step 1: Write failing import validator tests**

Create `backend/src/import-batches/import-validator.service.spec.ts`:

```typescript
import { ImportValidatorService, ParsedImportRow } from './import-validator.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ImportValidatorService', () => {
  const prisma = {
    product: {
      findFirst: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('matches ecommerce external IDs to product.idEcommerce', async () => {
    jest.spyOn(prisma.product, 'findFirst').mockResolvedValue({ id: 5, name: 'Starter Kit' });

    const service = new ImportValidatorService(prisma);
    const row: ParsedImportRow = {
      rowNumber: 2,
      externalProductId: 'EC-401',
      importedProductDescription: 'Starter kit black bundle',
      quantity: 3,
      amount: 900,
      rawRow: { id: 'EC-401' },
    };

    const result = await service.validateRows('ecommerce', [row]);

    expect(prisma.product.findFirst).toHaveBeenCalledWith({ where: { idEcommerce: 'EC-401' } });
    expect(result.stageRows[0].idProduct).toBe(5);
    expect(result.errors).toEqual([]);
  });

  it('returns an import error for unmatched external product IDs', async () => {
    jest.spyOn(prisma.product, 'findFirst').mockResolvedValue(null);

    const service = new ImportValidatorService(prisma);
    const result = await service.validateRows('store', [
      {
        rowNumber: 3,
        externalProductId: 'S-999',
        importedProductDescription: 'Imported description',
        quantity: 1,
        amount: 100,
        rawRow: { id: 'S-999' },
      },
    ]);

    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: 'externalProductId',
        message: 'No product matched external ID S-999 for source store',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run validator tests to verify they fail**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- import-validator.service.spec.ts
```

Expected: FAIL with module resolution error for `./import-validator.service`.

- [ ] **Step 3: Implement import validator**

Create `backend/src/import-batches/import-validator.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { getProductExternalIdField } from '../common/constants/import-sources';
import { PrismaService } from '../prisma/prisma.service';

export type ParsedImportRow = {
  rowNumber: number;
  externalProductId: string | null;
  importedProductDescription: string | null;
  quantity: number | null;
  amount: number | null;
  rawRow: Record<string, unknown>;
};

export type ImportValidationError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type ValidatedStageRow = ParsedImportRow & {
  idProduct: number | null;
};

@Injectable()
export class ImportValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async validateRows(source: string, rows: ParsedImportRow[]): Promise<{ stageRows: ValidatedStageRow[]; errors: ImportValidationError[] }> {
    const productField = getProductExternalIdField(source);
    const stageRows: ValidatedStageRow[] = [];
    const errors: ImportValidationError[] = [];

    for (const row of rows) {
      if (!row.externalProductId) {
        errors.push({ rowNumber: row.rowNumber, field: 'externalProductId', message: 'External product ID is required' });
      }
      if (!row.importedProductDescription) {
        errors.push({ rowNumber: row.rowNumber, field: 'importedProductDescription', message: 'Imported product description is required' });
      }
      if (!row.quantity || row.quantity < 1) {
        errors.push({ rowNumber: row.rowNumber, field: 'quantity', message: 'Quantity must be greater than 0' });
      }
      if (row.amount === null || row.amount < 0) {
        errors.push({ rowNumber: row.rowNumber, field: 'amount', message: 'Amount must be 0 or greater' });
      }

      let idProduct: number | null = null;
      if (row.externalProductId) {
        const product = await this.prisma.product.findFirst({ where: { [productField]: row.externalProductId } });
        if (product) {
          idProduct = product.id;
        } else {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'externalProductId',
            message: `No product matched external ID ${row.externalProductId} for source ${source}`,
          });
        }
      }

      stageRows.push({ ...row, idProduct });
    }

    return { stageRows, errors };
  }
}
```

- [ ] **Step 4: Run validator tests to verify they pass**

Run:

```powershell
npm.cmd test -- import-validator.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Implement CSV/XLSX parser**

Create `backend/src/import-batches/import-parser.service.ts`:

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { ParsedImportRow } from './import-validator.service';

type InputRow = Record<string, unknown>;

@Injectable()
export class ImportParserService {
  parseFile(file: Express.Multer.File): ParsedImportRow[] {
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (extension === 'csv') return this.parseCsv(file.buffer);
    if (extension === 'xlsx' || extension === 'xls') return this.parseWorkbook(file.buffer);
    throw new BadRequestException('Only CSV, XLSX, and XLS files are supported');
  }

  private parseCsv(buffer: Buffer): ParsedImportRow[] {
    const rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as InputRow[];
    return this.normalizeRows(rows);
  }

  private parseWorkbook(buffer: Buffer): ParsedImportRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<InputRow>(firstSheet, { defval: null });
    return this.normalizeRows(rows);
  }

  private normalizeRows(rows: InputRow[]): ParsedImportRow[] {
    return rows.map((row, index) => ({
      rowNumber: index + 2,
      externalProductId: this.readString(row, ['externalProductId', 'external_product_id', 'id', 'ID']),
      importedProductDescription: this.readString(row, ['productDescription', 'product_description', 'description', 'Description']),
      quantity: this.readNumber(row, ['quantity', 'Quantity', 'qty', 'Qty']),
      amount: this.readNumber(row, ['amount', 'Amount', 'total', 'Total']),
      rawRow: row,
    }));
  }

  private readString(row: InputRow, keys: string[]): string | null {
    const value = keys.map((key) => row[key]).find((candidate) => candidate !== undefined && candidate !== null && String(candidate).trim() !== '');
    return value === undefined ? null : String(value).trim();
  }

  private readNumber(row: InputRow, keys: string[]): number | null {
    const raw = this.readString(row, keys);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
```

- [ ] **Step 6: Write failing import commit test**

Create `backend/src/import-batches/import-batches.service.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { ImportBatchesService } from './import-batches.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidatorService } from './import-validator.service';

describe('ImportBatchesService', () => {
  const prisma = {
    importBatch: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    importError: {
      findMany: jest.fn(),
    },
    sale: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  } as any;

  const parser = {} as ImportParserService;
  const validator = {} as ImportValidatorService;

  beforeEach(() => jest.clearAllMocks());

  it('rejects commit when import date is missing', async () => {
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      source: 'ecommerce',
      importDate: null,
      status: 'validated',
      stageRows: [],
    });

    const service = new ImportBatchesService(prisma, parser, validator);

    await expect(service.commit(1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('commits staged rows to sales with fee zero', async () => {
    jest.spyOn(prisma.importBatch, 'findUnique').mockResolvedValue({
      idImportBatch: 1,
      source: 'ecommerce',
      importDate: new Date('2026-05-05T00:00:00.000Z'),
      status: 'validated',
      stageRows: [
        { idProduct: 10, quantity: 2, amount: '500.00' },
      ],
    });
    jest.spyOn(prisma.importError, 'findMany').mockResolvedValue([]);
    jest.spyOn(prisma.sale, 'createMany').mockResolvedValue({ count: 1 });
    jest.spyOn(prisma.importBatch, 'update').mockResolvedValue({ idImportBatch: 1, status: 'committed' });

    const service = new ImportBatchesService(prisma, parser, validator);
    await service.commit(1);

    expect(prisma.sale.createMany).toHaveBeenCalledWith({
      data: [
        {
          date: new Date('2026-05-05T00:00:00.000Z'),
          idProduct: 10,
          quantity: 2,
          amount: '500.00',
          source: 'ecommerce',
          fee: 0,
        },
      ],
    });
  });
});
```

- [ ] **Step 7: Run import batch service test to verify it fails**

Run:

```powershell
npm.cmd test -- import-batches.service.spec.ts
```

Expected: FAIL with module resolution error for `./import-batches.service`.

- [ ] **Step 8: Implement import batch DTOs**

Create `backend/src/import-batches/dto/create-import-batch.dto.ts`:

```typescript
import { IsIn } from 'class-validator';
import { IMPORT_SOURCES } from '../../common/constants/import-sources';

export class CreateImportBatchDto {
  @IsIn(IMPORT_SOURCES)
  source!: string;
}
```

Create `backend/src/import-batches/dto/update-import-batch.dto.ts`:

```typescript
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { IMPORT_SOURCES } from '../../common/constants/import-sources';

export class UpdateImportBatchDto {
  @IsOptional()
  @IsIn(IMPORT_SOURCES)
  source?: string;

  @IsOptional()
  @IsDateString()
  importDate?: string;
}
```

- [ ] **Step 9: Implement import batch service**

Create `backend/src/import-batches/import-batches.service.ts`:

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidatorService } from './import-validator.service';
import { CreateImportBatchDto } from './dto/create-import-batch.dto';
import { UpdateImportBatchDto } from './dto/update-import-batch.dto';

@Injectable()
export class ImportBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ImportParserService,
    private readonly validator: ImportValidatorService,
  ) {}

  async create(dto: CreateImportBatchDto, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Import file is required');
    const parsedRows = this.parser.parseFile(file);
    const validation = await this.validator.validateRows(dto.source, parsedRows);

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          source: dto.source,
          originalFilename: file.originalname,
          status: validation.errors.length > 0 ? 'has_errors' : 'validated',
        },
      });

      const createdRows = [];
      for (const row of validation.stageRows) {
        const created = await tx.importStage.create({
          data: {
            idImportBatch: batch.idImportBatch,
            rowNumber: row.rowNumber,
            externalProductId: row.externalProductId,
            importedProductDescription: row.importedProductDescription,
            idProduct: row.idProduct,
            quantity: row.quantity,
            amount: row.amount,
            rawRow: row.rawRow,
          },
        });
        createdRows.push(created);
      }

      for (const error of validation.errors) {
        const matchingStage = createdRows.find((row) => row.rowNumber === error.rowNumber);
        await tx.importError.create({
          data: {
            idImportBatch: batch.idImportBatch,
            idImportStage: matchingStage?.idImportStage,
            rowNumber: error.rowNumber,
            field: error.field,
            message: error.message,
          },
        });
      }

      return this.findOne(batch.idImportBatch);
    });
  }

  findAll() {
    return this.prisma.importBatch.findMany({ orderBy: { idImportBatch: 'desc' } });
  }

  async findOne(id: number) {
    const batch = await this.prisma.importBatch.findUnique({ where: { idImportBatch: id } });
    if (!batch) throw new NotFoundException(`Import batch ${id} was not found`);
    return batch;
  }

  async update(id: number, dto: UpdateImportBatchDto) {
    await this.findOne(id);
    return this.prisma.importBatch.update({
      where: { idImportBatch: id },
      data: {
        source: dto.source,
        importDate: dto.importDate ? new Date(dto.importDate) : undefined,
      },
    });
  }

  stageRows(id: number) {
    return this.prisma.importStage.findMany({
      where: { idImportBatch: id },
      include: { product: true, errors: true },
      orderBy: { rowNumber: 'asc' },
    });
  }

  errors(id: number) {
    return this.prisma.importError.findMany({
      where: { idImportBatch: id },
      orderBy: [{ rowNumber: 'asc' }, { idImportError: 'asc' }],
    });
  }

  async validate(id: number) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { idImportBatch: id },
      include: { stageRows: true },
    });
    if (!batch) throw new NotFoundException(`Import batch ${id} was not found`);

    const validation = await this.validator.validateRows(
      batch.source,
      batch.stageRows.map((row) => ({
        rowNumber: row.rowNumber,
        externalProductId: row.externalProductId,
        importedProductDescription: row.importedProductDescription,
        quantity: row.quantity,
        amount: row.amount ? Number(row.amount) : null,
        rawRow: (row.rawRow as Record<string, unknown>) ?? {},
      })),
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.importError.deleteMany({ where: { idImportBatch: id } });
      for (const row of validation.stageRows) {
        await tx.importStage.updateMany({
          where: { idImportBatch: id, rowNumber: row.rowNumber },
          data: { idProduct: row.idProduct },
        });
      }
      for (const error of validation.errors) {
        const stage = batch.stageRows.find((row) => row.rowNumber === error.rowNumber);
        await tx.importError.create({
          data: {
            idImportBatch: id,
            idImportStage: stage?.idImportStage,
            rowNumber: error.rowNumber,
            field: error.field,
            message: error.message,
          },
        });
      }
      return tx.importBatch.update({
        where: { idImportBatch: id },
        data: { status: validation.errors.length > 0 ? 'has_errors' : 'validated' },
      });
    });
  }

  async commit(id: number) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { idImportBatch: id },
      include: { stageRows: true },
    });
    if (!batch) throw new NotFoundException(`Import batch ${id} was not found`);
    if (!batch.importDate) throw new BadRequestException('Import date is required before commit');
    if (batch.status === 'committed') throw new BadRequestException('Import batch has already been committed');

    const errors = await this.prisma.importError.findMany({ where: { idImportBatch: id } });
    if (errors.length > 0) throw new BadRequestException('Import batch has validation errors');

    const invalidStageRow = batch.stageRows.find((row) => !row.idProduct || !row.quantity || row.amount === null);
    if (invalidStageRow) throw new BadRequestException(`Import row ${invalidStageRow.rowNumber} is incomplete`);

    return this.prisma.$transaction(async (tx) => {
      await tx.sale.createMany({
        data: batch.stageRows.map((row) => ({
          date: batch.importDate as Date,
          idProduct: row.idProduct as number,
          quantity: row.quantity as number,
          amount: row.amount,
          source: batch.source,
          fee: 0,
        })),
      });
      return tx.importBatch.update({
        where: { idImportBatch: id },
        data: { status: 'committed', committedAt: new Date() },
      });
    });
  }

  async cancel(id: number) {
    await this.findOne(id);
    return this.prisma.importBatch.update({
      where: { idImportBatch: id },
      data: { status: 'cancelled' },
    });
  }
}
```

- [ ] **Step 10: Implement import batch controller and module**

Create `backend/src/import-batches/import-batches.controller.ts`:

```typescript
import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdParamDto } from '../common/dto/id-param.dto';
import { CreateImportBatchDto } from './dto/create-import-batch.dto';
import { UpdateImportBatchDto } from './dto/update-import-batch.dto';
import { ImportBatchesService } from './import-batches.service';

@Controller('import-batches')
export class ImportBatchesController {
  constructor(private readonly importBatchesService: ImportBatchesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(@Body() dto: CreateImportBatchDto, @UploadedFile() file: Express.Multer.File) {
    return this.importBatchesService.create(dto, file);
  }

  @Get()
  findAll() {
    return this.importBatchesService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.importBatchesService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateImportBatchDto) {
    return this.importBatchesService.update(params.id, dto);
  }

  @Get(':id/stage')
  stageRows(@Param() params: IdParamDto) {
    return this.importBatchesService.stageRows(params.id);
  }

  @Get(':id/errors')
  errors(@Param() params: IdParamDto) {
    return this.importBatchesService.errors(params.id);
  }

  @Post(':id/validate')
  validate(@Param() params: IdParamDto) {
    return this.importBatchesService.validate(params.id);
  }

  @Post(':id/commit')
  commit(@Param() params: IdParamDto) {
    return this.importBatchesService.commit(params.id);
  }

  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.importBatchesService.cancel(params.id);
  }
}
```

Create `backend/src/import-batches/import-batches.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ImportBatchesController } from './import-batches.controller';
import { ImportBatchesService } from './import-batches.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidatorService } from './import-validator.service';

@Module({
  controllers: [ImportBatchesController],
  providers: [ImportBatchesService, ImportParserService, ImportValidatorService],
})
export class ImportBatchesModule {}
```

Update `backend/src/app.module.ts` imports to include `ImportBatchesModule`.

- [ ] **Step 11: Verify staged import backend**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd test -- import-validator.service.spec.ts import-batches.service.spec.ts
npm.cmd run build
```

Expected: import tests pass and build exits `0`.

- [ ] **Step 12: Commit staged import backend**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add backend/src backend/package.json backend/package-lock.json
git commit -m "feat: add staged sales import backend"
```

Expected: commit succeeds.

---

### Task 7: Build Frontend App Shell And API Client

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/test/setup.ts`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/types.ts`
- Create: `frontend/src/components/AppLayout.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`
- Test: `frontend/src/api/client.test.ts`

- [ ] **Step 1: Configure frontend tests**

Modify `frontend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Modify `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

Create `frontend/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Write failing API client test**

Create `frontend/src/api/client.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildApiUrl } from './client';

describe('buildApiUrl', () => {
  it('joins API base URL and path without duplicate slashes', () => {
    expect(buildApiUrl('http://localhost:3000/api/', '/products')).toBe('http://localhost:3000/api/products');
  });
});
```

- [ ] **Step 3: Run API client test to verify it fails**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test -- client.test.ts
```

Expected: FAIL with module resolution error for `./client`.

- [ ] **Step 4: Implement API types and client**

Create `frontend/src/api/types.ts`:

```typescript
export type ImportSource = 'ecommerce' | 'store' | 'event' | 'surface';

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  idEcommerce?: string | null;
  idStore?: string | null;
  idEvent?: string | null;
  idSurface?: string | null;
  idModel?: number | null;
  ownership: string | number;
  tag?: string | null;
};

export type PricingModel = {
  idModel: number;
  name: string;
  description?: string | null;
};

export type Stakeholder = {
  idStakeholder: number;
  name: string;
};

export type Project = {
  idProject: number;
  idProduct: number;
  units: number;
  unitCost: string | number;
  adminCost: string | number;
};

export type ProjectStakeholder = {
  idProjectStakeholder: number;
  idProject: number;
  idStakeholder: number;
  stakePercentage: string | number;
};

export type Sale = {
  idSale: number;
  date: string;
  idProduct: number;
  quantity: number;
  amount: string | number;
  source: ImportSource;
  fee: string | number;
};

export type ImportBatch = {
  idImportBatch: number;
  source: ImportSource;
  importDate?: string | null;
  originalFilename: string;
  status: 'uploaded' | 'validated' | 'has_errors' | 'committed' | 'cancelled';
};

export type ImportStageRow = {
  idImportStage: number;
  rowNumber: number;
  externalProductId?: string | null;
  importedProductDescription?: string | null;
  idProduct?: number | null;
  quantity?: number | null;
  amount?: string | number | null;
  product?: Product | null;
  errors?: ImportError[];
};

export type ImportError = {
  idImportError: number;
  rowNumber?: number | null;
  field?: string | null;
  message: string;
};
```

Create `frontend/src/api/client.ts`:

```typescript
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export function buildApiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export async function getJson<T>(path: string): Promise<T> {
  const response = await api.get<T>(path);
  return response.data;
}

export async function postJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await api.post<TResponse>(path, body);
  return response.data;
}

export async function patchJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await api.patch<TResponse>(path, body);
  return response.data;
}

export async function deleteJson<TResponse>(path: string): Promise<TResponse> {
  const response = await api.delete<TResponse>(path);
  return response.data;
}
```

- [ ] **Step 5: Build app layout**

Create `frontend/src/components/AppLayout.tsx`:

```tsx
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/products', label: 'Products' },
  { to: '/models', label: 'Models' },
  { to: '/projects', label: 'Projects' },
  { to: '/stakeholders', label: 'Stakeholders' },
  { to: '/project-stakeholders', label: 'Project Stakeholders' },
  { to: '/sales', label: 'Sales' },
  { to: '/imports', label: 'Sales Imports' },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Compania</h1>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
```

Replace `frontend/src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';

function ComingSoon({ title }: { title: string }) {
  return <h2>{title}</h2>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/products" replace />} />
        <Route path="products" element={<ComingSoon title="Products" />} />
        <Route path="models" element={<ComingSoon title="Models" />} />
        <Route path="projects" element={<ComingSoon title="Projects" />} />
        <Route path="stakeholders" element={<ComingSoon title="Stakeholders" />} />
        <Route path="project-stakeholders" element={<ComingSoon title="Project Stakeholders" />} />
        <Route path="sales" element={<ComingSoon title="Sales" />} />
        <Route path="imports" element={<ComingSoon title="Sales Imports" />} />
      </Route>
    </Routes>
  );
}
```

Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './style.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 6: Add base styles**

Replace `frontend/src/style.css`:

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #18202b;
  background: #f4f6f8;
}

body {
  margin: 0;
  min-width: 320px;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  background: #18202b;
  color: #ffffff;
  padding: 20px 16px;
}

.sidebar h1 {
  font-size: 20px;
  margin: 0 0 24px;
}

.sidebar nav {
  display: grid;
  gap: 6px;
}

.sidebar a {
  color: #d8e0ea;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 6px;
}

.sidebar a.active {
  background: #2f7d6d;
  color: #ffffff;
}

.main-panel {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.button {
  border: 0;
  background: #2f7d6d;
  color: #ffffff;
  border-radius: 6px;
  padding: 9px 12px;
  cursor: pointer;
}

.button.secondary {
  background: #dce4ea;
  color: #18202b;
}

.field {
  display: grid;
  gap: 6px;
}

.field input,
.field select,
.field textarea {
  border: 1px solid #cad3de;
  border-radius: 6px;
  padding: 9px 10px;
  background: #ffffff;
}
```

- [ ] **Step 7: Verify frontend shell**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test -- client.test.ts
npm.cmd run build
```

Expected: API client test passes and build exits `0`.

- [ ] **Step 8: Commit frontend shell**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add frontend
git commit -m "feat: add frontend shell and api client"
```

Expected: commit succeeds.

---

### Task 8: Build Frontend CRUD Tables And Forms

**Files:**
- Create: `frontend/src/components/DataTable.tsx`
- Create: `frontend/src/components/EntityForm.tsx`
- Create: `frontend/src/features/entities/entityConfigs.ts`
- Create: `frontend/src/features/entities/EntityListPage.tsx`
- Create: `frontend/src/features/entities/EntityEditPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/components/DataTable.test.tsx`
- Test: `frontend/src/features/entities/EntityListPage.test.tsx`

- [ ] **Step 1: Write failing DataTable test**

Create `frontend/src/components/DataTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  it('filters rows and calls onRowDoubleClick when a row is double clicked', async () => {
    const onRowDoubleClick = vi.fn();

    render(
      <DataTable
        rows={[
          { id: 1, name: 'Starter Kit' },
          { id: 2, name: 'Event Pack' },
        ]}
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Name' },
        ]}
        searchValue="Starter"
        onSearchChange={() => undefined}
        getRowId={(row) => row.id}
        onRowDoubleClick={onRowDoubleClick}
      />,
    );

    expect(screen.getByText('Starter Kit')).toBeInTheDocument();
    expect(screen.queryByText('Event Pack')).not.toBeInTheDocument();

    await userEvent.dblClick(screen.getByText('Starter Kit'));
    expect(onRowDoubleClick).toHaveBeenCalledWith({ id: 1, name: 'Starter Kit' });
  });
});
```

- [ ] **Step 2: Run DataTable test to verify it fails**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test -- DataTable.test.tsx
```

Expected: FAIL with module resolution error for `./DataTable`.

- [ ] **Step 3: Implement DataTable**

Create `frontend/src/components/DataTable.tsx`:

```tsx
import { useMemo, useState } from 'react';

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  getRowId: (row: T) => number | string;
  onRowDoubleClick: (row: T) => void;
};

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  searchValue,
  onSearchChange,
  getRowId,
  onRowDoubleClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(searchValue.toLowerCase())),
    );

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const left = String(a[sortKey] ?? '');
      const right = String(b[sortKey] ?? '');
      const result = left.localeCompare(right, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [rows, searchValue, sortDirection, sortKey]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  return (
    <div className="table-area">
      <input
        aria-label="Search table"
        className="table-search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>
                <button type="button" onClick={() => toggleSort(String(column.key))}>
                  {column.header}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={getRowId(row)} onDoubleClick={() => onRowDoubleClick(row)}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render ? column.render(row) : String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run DataTable test to verify it passes**

Run:

```powershell
npm.cmd test -- DataTable.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Implement entity config and CRUD pages**

Create `frontend/src/features/entities/entityConfigs.ts`:

```typescript
export type EntityConfig = {
  title: string;
  path: string;
  idField: string;
  columns: string[];
  fields: string[];
};

export const entityConfigs: Record<string, EntityConfig> = {
  products: {
    title: 'Products',
    path: 'products',
    idField: 'id',
    columns: ['id', 'name', 'idEcommerce', 'idStore', 'idEvent', 'idSurface', 'ownership', 'tag'],
    fields: ['name', 'description', 'image', 'idEcommerce', 'idStore', 'idEvent', 'idSurface', 'idModel', 'ownership', 'tag'],
  },
  models: {
    title: 'Models',
    path: 'models',
    idField: 'idModel',
    columns: ['idModel', 'name', 'description'],
    fields: ['name', 'description'],
  },
  projects: {
    title: 'Projects',
    path: 'projects',
    idField: 'idProject',
    columns: ['idProject', 'idProduct', 'units', 'unitCost', 'adminCost'],
    fields: ['idProduct', 'units', 'unitCost', 'adminCost'],
  },
  stakeholders: {
    title: 'Stakeholders',
    path: 'stakeholders',
    idField: 'idStakeholder',
    columns: ['idStakeholder', 'name'],
    fields: ['name'],
  },
  'project-stakeholders': {
    title: 'Project Stakeholders',
    path: 'project-stakeholders',
    idField: 'idProjectStakeholder',
    columns: ['idProjectStakeholder', 'idProject', 'idStakeholder', 'stakePercentage'],
    fields: ['idProject', 'idStakeholder', 'stakePercentage'],
  },
  sales: {
    title: 'Sales',
    path: 'sales',
    idField: 'idSale',
    columns: ['idSale', 'date', 'idProduct', 'quantity', 'amount', 'source', 'fee'],
    fields: ['date', 'idProduct', 'quantity', 'amount', 'source', 'fee'],
  },
};
```

Create `frontend/src/components/EntityForm.tsx`:

```tsx
import { FormEvent } from 'react';

type EntityFormProps = {
  fields: string[];
  values: Record<string, unknown>;
  isSaving: boolean;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
};

export function EntityForm({ fields, values, isSaving, onChange, onSubmit }: EntityFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label className="field" key={field}>
          {field}
          <input
            aria-label={field}
            value={String(values[field] ?? '')}
            onChange={(event) => onChange(field, event.target.value)}
          />
        </label>
      ))}
      <div>
        <button className="button" type="submit" disabled={isSaving}>
          Save
        </button>
      </div>
    </form>
  );
}
```

Create `frontend/src/features/entities/EntityListPage.tsx`:

```tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { entityConfigs } from './entityConfigs';

type EntityRow = Record<string, unknown>;

export function EntityListPage() {
  const { entityName = 'products' } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const config = entityConfigs[entityName];

  const query = useQuery({
    queryKey: ['entity-list', entityName],
    queryFn: () => getJson<EntityRow[]>(`/${config.path}`),
    enabled: Boolean(config),
  });

  if (!config) return <h2>Unknown entity</h2>;

  const rows = query.data ?? [];

  return (
    <section>
      <div className="page-header">
        <h2>{config.title}</h2>
        <Link className="button" to={`/${config.path}/new`}>
          Create
        </Link>
      </div>
      <DataTable
        rows={rows}
        columns={config.columns.map((column) => ({ key: column, header: column }))}
        searchValue={search}
        onSearchChange={setSearch}
        getRowId={(row) => String(row[config.idField])}
        onRowDoubleClick={(row) => navigate(`/${config.path}/${row[config.idField]}`)}
      />
    </section>
  );
}
```

Create `frontend/src/features/entities/EntityEditPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, patchJson, postJson } from '../../api/client';
import { EntityForm } from '../../components/EntityForm';
import { entityConfigs } from './entityConfigs';

type EntityRow = Record<string, unknown>;

export function EntityEditPage() {
  const { entityName = 'products', id = 'new' } = useParams();
  const navigate = useNavigate();
  const config = entityConfigs[entityName];
  const isNew = id === 'new';
  const [values, setValues] = useState<EntityRow>({});

  const query = useQuery({
    queryKey: ['entity-detail', entityName, id],
    queryFn: () => getJson<EntityRow>(`/${config.path}/${id}`),
    enabled: Boolean(config && !isNew),
  });

  useEffect(() => {
    if (query.data) setValues(query.data);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => {
      if (isNew) return postJson<EntityRow, EntityRow>(`/${config.path}`, values);
      return patchJson<EntityRow, EntityRow>(`/${config.path}/${id}`, values);
    },
    onSuccess: () => navigate(`/${config.path}`),
  });

  if (!config) return <h2>Unknown entity</h2>;

  return (
    <section>
      <div className="page-header">
        <h2>{isNew ? `Create ${config.title}` : `Edit ${config.title}`}</h2>
        <Link className="button secondary" to={`/${config.path}`}>
          Back
        </Link>
      </div>
      <EntityForm
        fields={config.fields}
        values={values}
        isSaving={mutation.isPending}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        onSubmit={() => mutation.mutate()}
      />
    </section>
  );
}
```

- [ ] **Step 6: Write failing EntityListPage test**

Create `frontend/src/features/entities/EntityListPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { EntityListPage } from './EntityListPage';

vi.mock('../../api/client', () => ({
  getJson: vi.fn(async () => [
    { id: 1, name: 'Starter Kit', ownership: 15, tag: 'starter' },
  ]),
}));

describe('EntityListPage', () => {
  it('shows a create button and navigates to edit on row double click', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/products']}>
          <Routes>
            <Route path="/:entityName" element={<EntityListPage />} />
            <Route path="/products/:id" element={<h2>Edit Product Route</h2>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('link', { name: 'Create' })).toHaveAttribute('href', '/products/new');
    await userEvent.dblClick(await screen.findByText('Starter Kit'));
    expect(await screen.findByText('Edit Product Route')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run EntityListPage test to verify it passes**

Run:

```powershell
npm.cmd test -- EntityListPage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Wire entity routes**

Update `frontend/src/App.tsx` routes:

```tsx
<Route path=":entityName" element={<EntityListPage />} />
<Route path=":entityName/new" element={<EntityEditPage />} />
<Route path=":entityName/:id" element={<EntityEditPage />} />
<Route path="imports" element={<SalesImportPage />} />
```

Place the `imports` route before `:entityName` so it is not captured as a generic entity.

- [ ] **Step 9: Verify CRUD frontend**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test -- DataTable.test.tsx
npm.cmd test -- EntityListPage.test.tsx
npm.cmd run build
```

Expected: DataTable and EntityListPage tests pass, and frontend build exits `0`.

- [ ] **Step 10: Commit frontend CRUD**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add frontend/src frontend/package.json frontend/package-lock.json frontend/vite.config.ts
git commit -m "feat: add frontend crud tables and forms"
```

Expected: commit succeeds.

---

### Task 9: Build Frontend Sales Import Workflow

**Files:**
- Create: `frontend/src/features/imports/SalesImportPage.tsx`
- Test: `frontend/src/features/imports/SalesImportPage.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing import page test**

Create `frontend/src/features/imports/SalesImportPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { SalesImportPage } from './SalesImportPage';

vi.mock('../../api/client', () => ({
  getJson: vi.fn(async (path: string) => {
    if (path === '/import-batches/1/stage') {
      return [
        {
          idImportStage: 1,
          rowNumber: 2,
          externalProductId: 'EC-401',
          importedProductDescription: 'Starter kit black bundle',
          product: { id: 5, name: 'Starter Kit', ownership: 0 },
          quantity: 3,
          amount: '900.00',
          errors: [],
        },
      ];
    }
    if (path === '/import-batches/1/errors') return [];
    return [];
  }),
  postJson: vi.fn(),
  patchJson: vi.fn(),
}));

describe('SalesImportPage', () => {
  it('shows imported description beside matched product name', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SalesImportPage initialBatchId={1} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Starter kit black bundle')).toBeInTheDocument();
    expect(await screen.findByText('Starter Kit')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run import page test to verify it fails**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test -- SalesImportPage.test.tsx
```

Expected: FAIL with module resolution error for `./SalesImportPage`.

- [ ] **Step 3: Implement SalesImportPage**

Create `frontend/src/features/imports/SalesImportPage.tsx`:

```tsx
import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson, postJson, api } from '../../api/client';
import { ImportBatch, ImportError, ImportSource, ImportStageRow } from '../../api/types';

type SalesImportPageProps = {
  initialBatchId?: number;
};

const sources: ImportSource[] = ['ecommerce', 'store', 'event', 'surface'];

export function SalesImportPage({ initialBatchId }: SalesImportPageProps) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<ImportSource>('ecommerce');
  const [importDate, setImportDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<number | undefined>(initialBatchId);

  const stageQuery = useQuery({
    queryKey: ['import-stage', activeBatchId],
    queryFn: () => getJson<ImportStageRow[]>(`/import-batches/${activeBatchId}/stage`),
    enabled: Boolean(activeBatchId),
  });

  const errorsQuery = useQuery({
    queryKey: ['import-errors', activeBatchId],
    queryFn: () => getJson<ImportError[]>(`/import-batches/${activeBatchId}/errors`),
    enabled: Boolean(activeBatchId),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Select a file before uploading');
      const formData = new FormData();
      formData.append('source', source);
      formData.append('file', file);
      const response = await api.post<ImportBatch>('/import-batches', formData);
      return response.data;
    },
    onSuccess: (batch) => {
      setActiveBatchId(batch.idImportBatch);
      void queryClient.invalidateQueries({ queryKey: ['import-stage', batch.idImportBatch] });
      void queryClient.invalidateQueries({ queryKey: ['import-errors', batch.idImportBatch] });
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: () =>
      patchJson<ImportBatch, { source: ImportSource; importDate: string }>(`/import-batches/${activeBatchId}`, {
        source,
        importDate,
      }),
  });

  const commitMutation = useMutation({
    mutationFn: () => postJson<ImportBatch, Record<string, never>>(`/import-batches/${activeBatchId}/commit`, {}),
  });

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    await uploadMutation.mutateAsync();
  }

  async function handleCommit() {
    await updateBatchMutation.mutateAsync();
    await commitMutation.mutateAsync();
  }

  const errors = errorsQuery.data ?? [];
  const rows = stageQuery.data ?? [];
  const canCommit = Boolean(activeBatchId && importDate && errors.length === 0 && rows.length > 0);

  return (
    <section>
      <div className="page-header">
        <h2>Sales Imports</h2>
      </div>

      <form className="import-toolbar" onSubmit={handleUpload}>
        <label className="field">
          Source
          <select value={source} onChange={(event) => setSource(event.target.value as ImportSource)}>
            {sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Import Date
          <input type="date" value={importDate} onChange={(event) => setImportDate(event.target.value)} />
        </label>
        <label className="field">
          File
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="button" type="submit">
          Upload
        </button>
        <button className="button secondary" type="button" disabled={!canCommit} onClick={handleCommit}>
          Commit Import
        </button>
      </form>

      {errors.length > 0 && (
        <div className="error-panel">
          <h3>Import Errors</h3>
          {errors.map((error) => (
            <p key={error.idImportError}>
              Row {error.rowNumber}: {error.message}
            </p>
          ))}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Row</th>
            <th>External ID</th>
            <th>Imported Description</th>
            <th>Matched Product</th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.idImportStage}>
              <td>{row.rowNumber}</td>
              <td>{row.externalProductId}</td>
              <td>{row.importedProductDescription}</td>
              <td>{row.product?.name ?? 'Unmatched'}</td>
              <td>{row.quantity}</td>
              <td>{row.amount}</td>
              <td>{row.errors && row.errors.length > 0 ? 'Error' : 'Valid'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 4: Add import screen styles**

Append to `frontend/src/style.css`:

```css
.import-toolbar {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(160px, 220px) minmax(220px, 1fr) auto auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 18px;
}

.error-panel {
  border: 1px solid #d85d5d;
  background: #fff3f3;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.table-area {
  display: grid;
  gap: 12px;
}

.table-search {
  width: min(360px, 100%);
  border: 1px solid #cad3de;
  border-radius: 6px;
  padding: 9px 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
}

th,
td {
  border-bottom: 1px solid #e4e9ef;
  padding: 10px;
  text-align: left;
}

th {
  background: #edf2f6;
}

th button {
  border: 0;
  background: transparent;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}
```

- [ ] **Step 5: Verify import page**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test -- SalesImportPage.test.tsx
npm.cmd run build
```

Expected: import page test passes and build exits `0`.

- [ ] **Step 6: Commit import frontend**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add frontend/src
git commit -m "feat: add staged import frontend"
```

Expected: commit succeeds.

---

### Task 10: Add Database Migration And Full Verification

**Files:**
- Create: `backend/prisma/migrations/*`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md` only if implementation uncovers a design change

- [ ] **Step 1: Create initial Prisma migration**

After `backend/.env` has real MySQL credentials, run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npx.cmd prisma migrate dev --name init
```

Expected: Prisma creates an initial migration under `backend/prisma/migrations/` and applies it to the configured MySQL database.

- [ ] **Step 2: Verify backend against generated Prisma client**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npx.cmd prisma generate
npm.cmd test
npm.cmd run build
```

Expected: Prisma generate exits `0`, all backend tests pass, backend build exits `0`.

- [ ] **Step 3: Verify frontend**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test
npm.cmd run build
```

Expected: all frontend tests pass and frontend build exits `0`.

- [ ] **Step 4: Run both development servers for manual smoke test**

Terminal 1:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd run start:dev
```

Expected: backend listens on `http://localhost:3000/api`.

Terminal 2:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd run dev -- --host 127.0.0.1
```

Expected: frontend prints a local Vite URL, usually `http://127.0.0.1:5173/`.

Manual smoke checks:

- Products page loads.
- Create product form saves a product.
- Double-clicking a product row opens the edit form.
- Sales Imports page accepts source, import date, and CSV/XLSX file selection.
- Staged import table displays imported product description beside matched product name.

- [ ] **Step 5: Update README runtime commands**

Add to `README.md`:

````markdown
## Development Commands

Backend:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npm.cmd run start:dev
```

Frontend:

```powershell
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd run dev -- --host 127.0.0.1
```

Database migration:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npx.cmd prisma migrate dev --name init
```
````

- [ ] **Step 6: Commit final MVP**

Run:

```powershell
Set-Location C:\PROJECTS\compania_service
git add README.md backend frontend docs
git commit -m "feat: complete compania mvp"
```

Expected: commit succeeds.

---

## Final Verification Commands

Run before claiming the MVP implementation is complete:

```powershell
Set-Location C:\PROJECTS\compania_service\backend
npx.cmd prisma generate
npm.cmd test
npm.cmd run build
Set-Location C:\PROJECTS\compania_service\frontend
npm.cmd test
npm.cmd run build
Set-Location C:\PROJECTS\compania_service
git status --short --branch
```

Expected:

- Prisma Client generation exits `0`.
- Backend tests pass.
- Backend build exits `0`.
- Frontend tests pass.
- Frontend build exits `0`.
- Git status shows only intentional files before the final commit, and clean status after the final commit.

## Plan Coverage Checklist

- Backend/frontend split: Task 1.
- Gitignored credential templates: Task 1.
- Prisma MySQL schema: Task 2.
- Product/model/stakeholder CRUD: Task 3.
- Project and stakeholder split validation: Task 4.
- Sales CRUD and imported fee default `0`: Task 5.
- Staged CSV/XLSX import backend: Task 6.
- Source-specific product matching: Task 2 and Task 6.
- Import date selected by user and stamped into `sales.date`: Task 6 and Task 9.
- Imported product description shown beside matched product name: Task 9.
- Table pages, create buttons, double-click edit: Task 8.
- Final verification and README commands: Task 10.
