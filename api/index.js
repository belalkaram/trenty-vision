"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc14) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc14 = __getOwnPropDesc(from, key)) || desc14.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/config/index.ts
var import_dotenv, import_zod, envSchema, parsed, config;
var init_config = __esm({
  "src/config/index.ts"() {
    "use strict";
    import_dotenv = __toESM(require("dotenv"));
    import_zod = require("zod");
    import_dotenv.default.config();
    envSchema = import_zod.z.object({
      NODE_ENV: import_zod.z.enum(["development", "production", "test"]).default("development"),
      DEPLOYMENT_MODE: import_zod.z.enum(["local", "online"]).default("local"),
      PORT: import_zod.z.coerce.number().default(3e3),
      HOST: import_zod.z.string().default("0.0.0.0"),
      APP_URL: import_zod.z.string().default("http://localhost:3000"),
      DATABASE_URL: import_zod.z.string().default(
        "postgresql://neondb_owner:npg_AitEcqvL8d0T@ep-curly-mud-b24t81iw-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require"
      ),
      JWT_ACCESS_SECRET: import_zod.z.string().min(16).default("kenooz_jwt_access_secret_super_secure_key_2026_xyz!"),
      JWT_REFRESH_SECRET: import_zod.z.string().min(16).default("kenooz_jwt_refresh_secret_super_secure_key_2026_abc!"),
      JWT_ACCESS_EXPIRES_IN: import_zod.z.string().default("15m"),
      JWT_REFRESH_EXPIRES_IN: import_zod.z.string().default("7d"),
      ENCRYPTION_KEY: import_zod.z.string().length(64).default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
      COOKIE_SECRET: import_zod.z.string().min(16).default("kenooz_cookie_secret_super_long_random_string_2026"),
      DEFAULT_COMPANY_NAME: import_zod.z.string().default("Trenty Vision"),
      DEFAULT_TIMEZONE: import_zod.z.string().default("Asia/Kuwait"),
      STORAGE_DRIVER: import_zod.z.enum(["local", "r2"]).default("local"),
      STORAGE_LOCAL_PATH: import_zod.z.string().default("./storage/uploads"),
      LOG_LEVEL: import_zod.z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
      LANDING_SYNC_ENABLED: import_zod.z.string().transform((v) => v === "true").or(import_zod.z.boolean()).default(true),
      LANDING_SYNC_URL: import_zod.z.string().url().default("https://trintyvision.com/landing/api/submit.php")
    });
    parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.warn("Environment variables validation warnings:", parsed.error.format());
    }
    config = parsed.success ? parsed.data : envSchema.parse({});
  }
});

// src/utils/errors.ts
var AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError;
var init_errors = __esm({
  "src/utils/errors.ts"() {
    "use strict";
    AppError = class extends Error {
      statusCode;
      errors;
      constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
      }
    };
    NotFoundError = class extends AppError {
      constructor(message = "Resource not found") {
        super(message, 404);
      }
    };
    UnauthorizedError = class extends AppError {
      constructor(message = "Unauthorized") {
        super(message, 401);
      }
    };
    ForbiddenError = class extends AppError {
      constructor(message = "Forbidden - Insufficient permissions") {
        super(message, 403);
      }
    };
    ValidationError = class extends AppError {
      constructor(message = "Validation failed", errors = null) {
        super(message, 422, errors);
      }
    };
    ConflictError = class extends AppError {
      constructor(message = "Resource already exists") {
        super(message, 409);
      }
    };
  }
});

// src/utils/logger.ts
var import_pino, logger;
var init_logger = __esm({
  "src/utils/logger.ts"() {
    "use strict";
    import_pino = __toESM(require("pino"));
    init_config();
    logger = (0, import_pino.default)({
      level: config.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "password",
          "password_hash",
          "token",
          "refreshToken",
          "totp_secret",
          "*.password",
          "*.token"
        ],
        remove: true
      },
      transport: config.NODE_ENV === "development" ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      } : void 0
    });
  }
});

// src/database/schema/companies.ts
var import_pg_core, companies;
var init_companies = __esm({
  "src/database/schema/companies.ts"() {
    "use strict";
    import_pg_core = require("drizzle-orm/pg-core");
    companies = (0, import_pg_core.pgTable)("companies", {
      id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      timezone: (0, import_pg_core.varchar)("timezone", { length: 100 }).notNull().default("Asia/Kuwait"),
      settings: (0, import_pg_core.jsonb)("settings").$type().default({}),
      createdAt: (0, import_pg_core.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/departments.ts
var import_pg_core2, departments;
var init_departments = __esm({
  "src/database/schema/departments.ts"() {
    "use strict";
    import_pg_core2 = require("drizzle-orm/pg-core");
    init_companies();
    departments = (0, import_pg_core2.pgTable)("departments", {
      id: (0, import_pg_core2.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core2.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      name: (0, import_pg_core2.varchar)("name", { length: 150 }).notNull(),
      description: (0, import_pg_core2.text)("description"),
      active: (0, import_pg_core2.boolean)("active").default(true).notNull(),
      createdAt: (0, import_pg_core2.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core2.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/stations.ts
var import_pg_core3, stations;
var init_stations = __esm({
  "src/database/schema/stations.ts"() {
    "use strict";
    import_pg_core3 = require("drizzle-orm/pg-core");
    init_companies();
    init_departments();
    stations = (0, import_pg_core3.pgTable)("stations", {
      id: (0, import_pg_core3.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core3.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      departmentId: (0, import_pg_core3.uuid)("department_id").references(() => departments.id, { onDelete: "set null" }),
      name: (0, import_pg_core3.varchar)("name", { length: 150 }).notNull(),
      code: (0, import_pg_core3.varchar)("code", { length: 50 }),
      color: (0, import_pg_core3.varchar)("color", { length: 50 }).default("#1c9770"),
      description: (0, import_pg_core3.text)("description"),
      maxCapacity: (0, import_pg_core3.integer)("max_capacity").default(20),
      routingWeight: (0, import_pg_core3.integer)("routing_weight").default(1),
      active: (0, import_pg_core3.boolean)("active").default(true).notNull(),
      metadata: (0, import_pg_core3.jsonb)("metadata").$type().default({}),
      createdAt: (0, import_pg_core3.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core3.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/roles.ts
var import_pg_core4, roles;
var init_roles = __esm({
  "src/database/schema/roles.ts"() {
    "use strict";
    import_pg_core4 = require("drizzle-orm/pg-core");
    roles = (0, import_pg_core4.pgTable)("roles", {
      id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core4.varchar)("name", { length: 50 }).notNull().unique(),
      displayName: (0, import_pg_core4.varchar)("display_name", { length: 100 }).notNull(),
      description: (0, import_pg_core4.text)("description"),
      isSystem: (0, import_pg_core4.boolean)("is_system").default(false).notNull(),
      createdAt: (0, import_pg_core4.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/permissions.ts
var import_pg_core5, permissions;
var init_permissions = __esm({
  "src/database/schema/permissions.ts"() {
    "use strict";
    import_pg_core5 = require("drizzle-orm/pg-core");
    permissions = (0, import_pg_core5.pgTable)("permissions", {
      id: (0, import_pg_core5.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core5.varchar)("name", { length: 100 }).notNull().unique(),
      displayName: (0, import_pg_core5.varchar)("display_name", { length: 150 }).notNull(),
      groupName: (0, import_pg_core5.varchar)("group_name", { length: 50 }).notNull(),
      description: (0, import_pg_core5.text)("description"),
      createdAt: (0, import_pg_core5.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/role-permissions.ts
var import_pg_core6, rolePermissions;
var init_role_permissions = __esm({
  "src/database/schema/role-permissions.ts"() {
    "use strict";
    import_pg_core6 = require("drizzle-orm/pg-core");
    init_roles();
    init_permissions();
    rolePermissions = (0, import_pg_core6.pgTable)(
      "role_permissions",
      {
        roleId: (0, import_pg_core6.uuid)("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
        permissionId: (0, import_pg_core6.uuid)("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull()
      },
      (table) => [
        (0, import_pg_core6.primaryKey)({ columns: [table.roleId, table.permissionId] })
      ]
    );
  }
});

// src/database/schema/users.ts
var import_pg_core7, userStatusEnum, users;
var init_users = __esm({
  "src/database/schema/users.ts"() {
    "use strict";
    import_pg_core7 = require("drizzle-orm/pg-core");
    init_roles();
    userStatusEnum = (0, import_pg_core7.pgEnum)("user_status", ["active", "inactive", "suspended"]);
    users = (0, import_pg_core7.pgTable)("users", {
      id: (0, import_pg_core7.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core7.varchar)("name", { length: 150 }).notNull(),
      email: (0, import_pg_core7.varchar)("email", { length: 255 }).notNull().unique(),
      passwordHash: (0, import_pg_core7.varchar)("password_hash", { length: 255 }).notNull(),
      roleId: (0, import_pg_core7.uuid)("role_id").references(() => roles.id, { onDelete: "restrict" }).notNull(),
      avatar: (0, import_pg_core7.text)("avatar"),
      emailVerified: (0, import_pg_core7.boolean)("email_verified").default(false).notNull(),
      emailToken: (0, import_pg_core7.varchar)("email_token", { length: 255 }),
      resetToken: (0, import_pg_core7.varchar)("reset_token", { length: 255 }),
      resetExpires: (0, import_pg_core7.timestamp)("reset_expires", { withTimezone: true }),
      totpSecret: (0, import_pg_core7.text)("totp_secret"),
      totpEnabled: (0, import_pg_core7.boolean)("totp_enabled").default(false).notNull(),
      status: userStatusEnum("status").default("active").notNull(),
      lastLoginAt: (0, import_pg_core7.timestamp)("last_login_at", { withTimezone: true }),
      trialEndsAt: (0, import_pg_core7.timestamp)("trial_ends_at", { withTimezone: true }),
      createdAt: (0, import_pg_core7.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core7.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/employees.ts
var import_pg_core8, employeeStatusEnum, employees;
var init_employees = __esm({
  "src/database/schema/employees.ts"() {
    "use strict";
    import_pg_core8 = require("drizzle-orm/pg-core");
    init_users();
    init_companies();
    init_departments();
    init_stations();
    employeeStatusEnum = (0, import_pg_core8.pgEnum)("employee_status", ["active", "inactive", "away", "offline"]);
    employees = (0, import_pg_core8.pgTable)("employees", {
      id: (0, import_pg_core8.uuid)("id").defaultRandom().primaryKey(),
      userId: (0, import_pg_core8.uuid)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
      companyId: (0, import_pg_core8.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      departmentId: (0, import_pg_core8.uuid)("department_id").references(() => departments.id, { onDelete: "set null" }),
      stationId: (0, import_pg_core8.uuid)("station_id").references(() => stations.id, { onDelete: "set null" }),
      supervisorId: (0, import_pg_core8.uuid)("supervisor_id").references(() => employees.id, { onDelete: "set null" }),
      whatsappNumber: (0, import_pg_core8.varchar)("whatsapp_number", { length: 50 }),
      status: employeeStatusEnum("status").default("offline").notNull(),
      lastSeenAt: (0, import_pg_core8.timestamp)("last_seen_at", { withTimezone: true }),
      metadata: (0, import_pg_core8.jsonb)("metadata").$type().default({}),
      createdAt: (0, import_pg_core8.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core8.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/settings.ts
var import_pg_core9, settings;
var init_settings = __esm({
  "src/database/schema/settings.ts"() {
    "use strict";
    import_pg_core9 = require("drizzle-orm/pg-core");
    settings = (0, import_pg_core9.pgTable)("settings", {
      id: (0, import_pg_core9.uuid)("id").defaultRandom().primaryKey(),
      key: (0, import_pg_core9.varchar)("key", { length: 100 }).notNull().unique(),
      value: (0, import_pg_core9.jsonb)("value").notNull(),
      groupName: (0, import_pg_core9.varchar)("group_name", { length: 50 }).notNull().default("general"),
      description: (0, import_pg_core9.text)("description"),
      updatedAt: (0, import_pg_core9.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/audit-logs.ts
var import_pg_core10, auditLogs;
var init_audit_logs = __esm({
  "src/database/schema/audit-logs.ts"() {
    "use strict";
    import_pg_core10 = require("drizzle-orm/pg-core");
    init_users();
    auditLogs = (0, import_pg_core10.pgTable)("audit_logs", {
      id: (0, import_pg_core10.uuid)("id").defaultRandom().primaryKey(),
      actorId: (0, import_pg_core10.uuid)("actor_id").references(() => users.id, { onDelete: "set null" }),
      action: (0, import_pg_core10.varchar)("action", { length: 100 }).notNull(),
      entityType: (0, import_pg_core10.varchar)("entity_type", { length: 100 }).notNull(),
      entityId: (0, import_pg_core10.uuid)("entity_id"),
      ipAddress: (0, import_pg_core10.varchar)("ip_address", { length: 45 }),
      userAgent: (0, import_pg_core10.text)("user_agent"),
      oldValues: (0, import_pg_core10.jsonb)("old_values").$type(),
      newValues: (0, import_pg_core10.jsonb)("new_values").$type(),
      metadata: (0, import_pg_core10.jsonb)("metadata").$type().default({}),
      createdAt: (0, import_pg_core10.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/contacts.ts
var import_pg_core11, contacts;
var init_contacts = __esm({
  "src/database/schema/contacts.ts"() {
    "use strict";
    import_pg_core11 = require("drizzle-orm/pg-core");
    init_companies();
    contacts = (0, import_pg_core11.pgTable)("contacts", {
      id: (0, import_pg_core11.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core11.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      name: (0, import_pg_core11.varchar)("name", { length: 255 }).notNull(),
      phoneNumber: (0, import_pg_core11.varchar)("phone_number", { length: 50 }).notNull().unique(),
      whatsappJid: (0, import_pg_core11.varchar)("whatsapp_jid", { length: 100 }),
      avatarUrl: (0, import_pg_core11.text)("avatar_url"),
      source: (0, import_pg_core11.varchar)("source", { length: 100 }).default("direct"),
      metadata: (0, import_pg_core11.jsonb)("metadata").$type().default({}),
      createdAt: (0, import_pg_core11.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core11.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/leads.ts
var import_pg_core12, leadStageEnum, leads;
var init_leads = __esm({
  "src/database/schema/leads.ts"() {
    "use strict";
    import_pg_core12 = require("drizzle-orm/pg-core");
    init_contacts();
    init_employees();
    init_stations();
    leadStageEnum = (0, import_pg_core12.pgEnum)("lead_stage", ["new", "contacted", "qualified", "waiting", "converted", "lost"]);
    leads = (0, import_pg_core12.pgTable)("leads", {
      id: (0, import_pg_core12.uuid)("id").defaultRandom().primaryKey(),
      externalId: (0, import_pg_core12.varchar)("external_id", { length: 150 }).unique(),
      contactId: (0, import_pg_core12.uuid)("contact_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
      source: (0, import_pg_core12.varchar)("source", { length: 100 }).default("landing_page"),
      campaign: (0, import_pg_core12.varchar)("campaign", { length: 150 }),
      destination: (0, import_pg_core12.varchar)("destination", { length: 150 }),
      travelDate: (0, import_pg_core12.varchar)("travel_date", { length: 50 }),
      assignedEmployeeId: (0, import_pg_core12.uuid)("assigned_employee_id").references(() => employees.id, { onDelete: "set null" }),
      supervisorId: (0, import_pg_core12.uuid)("supervisor_id").references(() => employees.id, { onDelete: "set null" }),
      stationId: (0, import_pg_core12.uuid)("station_id").references(() => stations.id, { onDelete: "set null" }),
      crmId: (0, import_pg_core12.varchar)("crm_id", { length: 150 }),
      stage: leadStageEnum("stage").default("new").notNull(),
      metadata: (0, import_pg_core12.jsonb)("metadata").$type().default({}),
      createdAt: (0, import_pg_core12.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core12.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/whatsapp-accounts.ts
var import_pg_core13, whatsappAccountStatusEnum, whatsappAccounts;
var init_whatsapp_accounts = __esm({
  "src/database/schema/whatsapp-accounts.ts"() {
    "use strict";
    import_pg_core13 = require("drizzle-orm/pg-core");
    init_companies();
    whatsappAccountStatusEnum = (0, import_pg_core13.pgEnum)("whatsapp_account_status", [
      "disconnected",
      "initializing",
      "qr_required",
      "connecting",
      "connected",
      "logged_out",
      "error"
    ]);
    whatsappAccounts = (0, import_pg_core13.pgTable)("whatsapp_accounts", {
      id: (0, import_pg_core13.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core13.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      displayName: (0, import_pg_core13.varchar)("display_name", { length: 150 }).notNull(),
      phoneNumber: (0, import_pg_core13.varchar)("phone_number", { length: 50 }),
      jid: (0, import_pg_core13.varchar)("jid", { length: 100 }),
      status: whatsappAccountStatusEnum("status").default("disconnected").notNull(),
      deviceName: (0, import_pg_core13.varchar)("device_name", { length: 150 }),
      gatewayInstanceId: (0, import_pg_core13.varchar)("gateway_instance_id", { length: 100 }),
      isPrimaryDispatcher: (0, import_pg_core13.boolean)("is_primary_dispatcher").default(false).notNull(),
      dispatcherSlot: (0, import_pg_core13.integer)("dispatcher_slot"),
      connectedAt: (0, import_pg_core13.timestamp)("connected_at", { withTimezone: true }),
      lastSeenAt: (0, import_pg_core13.timestamp)("last_seen_at", { withTimezone: true }),
      bridgeStatus: (0, import_pg_core13.varchar)("bridge_status", { length: 20 }).default("unknown"),
      bridgeLastSeen: (0, import_pg_core13.timestamp)("bridge_last_seen", { withTimezone: true }),
      bridgeQrCode: (0, import_pg_core13.text)("bridge_qr_code"),
      createdAt: (0, import_pg_core13.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core13.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/whatsapp-sessions.ts
var import_pg_core14, whatsappSessions;
var init_whatsapp_sessions = __esm({
  "src/database/schema/whatsapp-sessions.ts"() {
    "use strict";
    import_pg_core14 = require("drizzle-orm/pg-core");
    init_whatsapp_accounts();
    whatsappSessions = (0, import_pg_core14.pgTable)("whatsapp_sessions", {
      id: (0, import_pg_core14.uuid)("id").defaultRandom().primaryKey(),
      accountId: (0, import_pg_core14.uuid)("account_id").references(() => whatsappAccounts.id, { onDelete: "cascade" }).notNull().unique(),
      qrCode: (0, import_pg_core14.text)("qr_code"),
      qrGeneratedAt: (0, import_pg_core14.timestamp)("qr_generated_at", { withTimezone: true }),
      encryptedAuthState: (0, import_pg_core14.text)("encrypted_auth_state"),
      lastHeartbeat: (0, import_pg_core14.timestamp)("last_heartbeat", { withTimezone: true }),
      reconnectAttempts: (0, import_pg_core14.varchar)("reconnect_attempts", { length: 10 }).default("0"),
      updatedAt: (0, import_pg_core14.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/whatsapp-auth-keys.ts
var import_pg_core15, whatsappAuthKeys;
var init_whatsapp_auth_keys = __esm({
  "src/database/schema/whatsapp-auth-keys.ts"() {
    "use strict";
    import_pg_core15 = require("drizzle-orm/pg-core");
    init_whatsapp_accounts();
    whatsappAuthKeys = (0, import_pg_core15.pgTable)("whatsapp_auth_keys", {
      id: (0, import_pg_core15.uuid)("id").defaultRandom().primaryKey(),
      accountId: (0, import_pg_core15.uuid)("account_id").references(() => whatsappAccounts.id, { onDelete: "cascade" }).notNull(),
      keyType: (0, import_pg_core15.varchar)("key_type", { length: 100 }).notNull(),
      keyId: (0, import_pg_core15.varchar)("key_id", { length: 255 }).notNull(),
      valueEncrypted: (0, import_pg_core15.text)("value_encrypted").notNull(),
      createdAt: (0, import_pg_core15.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core15.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/conversations.ts
var import_pg_core16, conversationStatusEnum, assignmentSourceEnum, conversations;
var init_conversations = __esm({
  "src/database/schema/conversations.ts"() {
    "use strict";
    import_pg_core16 = require("drizzle-orm/pg-core");
    init_companies();
    init_contacts();
    init_employees();
    init_stations();
    init_whatsapp_accounts();
    conversationStatusEnum = (0, import_pg_core16.pgEnum)("conversation_status", ["open", "pending", "waiting", "closed"]);
    assignmentSourceEnum = (0, import_pg_core16.pgEnum)("assignment_source", ["manual", "round_robin", "least_busy", "direct", "system"]);
    conversations = (0, import_pg_core16.pgTable)("conversations", {
      id: (0, import_pg_core16.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core16.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      contactId: (0, import_pg_core16.uuid)("contact_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
      whatsappAccountId: (0, import_pg_core16.uuid)("whatsapp_account_id").references(() => whatsappAccounts.id, { onDelete: "set null" }),
      assignedEmployeeId: (0, import_pg_core16.uuid)("assigned_employee_id").references(() => employees.id, { onDelete: "set null" }),
      assignedSupervisorId: (0, import_pg_core16.uuid)("assigned_supervisor_id").references(() => employees.id, { onDelete: "set null" }),
      assignedStationId: (0, import_pg_core16.uuid)("assigned_station_id").references(() => stations.id, { onDelete: "set null" }),
      assignmentSource: assignmentSourceEnum("assignment_source").default("manual").notNull(),
      assignedAt: (0, import_pg_core16.timestamp)("assigned_at", { withTimezone: true }),
      status: conversationStatusEnum("status").default("open").notNull(),
      lastMessageText: (0, import_pg_core16.text)("last_message_text"),
      lastMessageAt: (0, import_pg_core16.timestamp)("last_message_at", { withTimezone: true }),
      unreadCount: (0, import_pg_core16.varchar)("unread_count", { length: 10 }).default("0").notNull(),
      automationEnabled: (0, import_pg_core16.boolean)("automation_enabled").default(true).notNull(),
      humanMode: (0, import_pg_core16.boolean)("human_mode").default(false).notNull(),
      createdAt: (0, import_pg_core16.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core16.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    }, (table) => {
      return {
        contactIdIdx: (0, import_pg_core16.index)("conversations_contact_id_idx").on(table.contactId),
        assignedEmployeeIdIdx: (0, import_pg_core16.index)("conversations_assigned_employee_id_idx").on(table.assignedEmployeeId),
        statusIdx: (0, import_pg_core16.index)("conversations_status_idx").on(table.status),
        createdAtIndex: (0, import_pg_core16.index)("conversations_created_at_idx").on(table.createdAt)
      };
    });
  }
});

// src/database/schema/messages.ts
var import_pg_core17, messageDirectionEnum, messageSenderTypeEnum, messageTypeEnum, messageStatusEnum, messages;
var init_messages = __esm({
  "src/database/schema/messages.ts"() {
    "use strict";
    import_pg_core17 = require("drizzle-orm/pg-core");
    init_conversations();
    init_contacts();
    init_users();
    messageDirectionEnum = (0, import_pg_core17.pgEnum)("message_direction", ["incoming", "outgoing"]);
    messageSenderTypeEnum = (0, import_pg_core17.pgEnum)("message_sender_type", ["customer", "employee", "automation", "system"]);
    messageTypeEnum = (0, import_pg_core17.pgEnum)("message_type", [
      "text",
      "image",
      "video",
      "audio",
      "voice_note",
      "document",
      "location",
      "contact",
      "sticker",
      "system"
    ]);
    messageStatusEnum = (0, import_pg_core17.pgEnum)("message_status", ["pending", "queued", "sent", "delivered", "read", "failed"]);
    messages = (0, import_pg_core17.pgTable)("messages", {
      id: (0, import_pg_core17.uuid)("id").defaultRandom().primaryKey(),
      whatsappMessageId: (0, import_pg_core17.varchar)("whatsapp_message_id", { length: 150 }).unique(),
      conversationId: (0, import_pg_core17.uuid)("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
      contactId: (0, import_pg_core17.uuid)("contact_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
      senderType: messageSenderTypeEnum("sender_type").notNull(),
      senderUserId: (0, import_pg_core17.uuid)("sender_user_id").references(() => users.id, { onDelete: "set null" }),
      direction: messageDirectionEnum("direction").notNull(),
      type: messageTypeEnum("type").default("text").notNull(),
      text: (0, import_pg_core17.text)("text"),
      mediaId: (0, import_pg_core17.uuid)("media_id"),
      quotedMessageId: (0, import_pg_core17.uuid)("quoted_message_id"),
      timestamp: (0, import_pg_core17.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
      status: messageStatusEnum("status").default("sent").notNull(),
      metadata: (0, import_pg_core17.jsonb)("metadata").$type().default({}),
      createdAt: (0, import_pg_core17.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core17.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    }, (table) => {
      return {
        whatsappMsgIdIdx: (0, import_pg_core17.index)("messages_whatsapp_msg_id_idx").on(table.whatsappMessageId),
        conversationIdx: (0, import_pg_core17.index)("messages_conversation_id_idx").on(table.conversationId),
        senderTypeIdx: (0, import_pg_core17.index)("messages_sender_type_idx").on(table.senderType),
        createdAtIndex: (0, import_pg_core17.index)("messages_created_at_idx").on(table.createdAt)
      };
    });
  }
});

// src/database/schema/reminders.ts
var import_pg_core18, reminderStatusEnum, reminders;
var init_reminders = __esm({
  "src/database/schema/reminders.ts"() {
    "use strict";
    import_pg_core18 = require("drizzle-orm/pg-core");
    init_conversations();
    init_leads();
    init_users();
    reminderStatusEnum = (0, import_pg_core18.pgEnum)("reminder_status", ["pending", "completed", "cancelled", "overdue"]);
    reminders = (0, import_pg_core18.pgTable)("reminders", {
      id: (0, import_pg_core18.uuid)("id").defaultRandom().primaryKey(),
      conversationId: (0, import_pg_core18.uuid)("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
      leadId: (0, import_pg_core18.uuid)("lead_id").references(() => leads.id, { onDelete: "set null" }),
      assignedUserId: (0, import_pg_core18.uuid)("assigned_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      title: (0, import_pg_core18.varchar)("title", { length: 255 }).notNull(),
      note: (0, import_pg_core18.text)("note"),
      dueAt: (0, import_pg_core18.timestamp)("due_at", { withTimezone: true }).notNull(),
      status: reminderStatusEnum("status").default("pending").notNull(),
      completedAt: (0, import_pg_core18.timestamp)("completed_at", { withTimezone: true }),
      createdAt: (0, import_pg_core18.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core18.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/quick-replies.ts
var import_pg_core19, quickReplies;
var init_quick_replies = __esm({
  "src/database/schema/quick-replies.ts"() {
    "use strict";
    import_pg_core19 = require("drizzle-orm/pg-core");
    init_departments();
    quickReplies = (0, import_pg_core19.pgTable)("quick_replies", {
      id: (0, import_pg_core19.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core19.varchar)("name", { length: 150 }).notNull(),
      shortcut: (0, import_pg_core19.varchar)("shortcut", { length: 50 }).notNull().unique(),
      body: (0, import_pg_core19.text)("body").notNull(),
      departmentId: (0, import_pg_core19.uuid)("department_id").references(() => departments.id, { onDelete: "set null" }),
      active: (0, import_pg_core19.boolean)("active").default(true).notNull(),
      createdAt: (0, import_pg_core19.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core19.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/automation-rules.ts
var import_pg_core20, automationRules;
var init_automation_rules = __esm({
  "src/database/schema/automation-rules.ts"() {
    "use strict";
    import_pg_core20 = require("drizzle-orm/pg-core");
    automationRules = (0, import_pg_core20.pgTable)("automation_rules", {
      id: (0, import_pg_core20.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core20.varchar)("name", { length: 150 }).notNull(),
      triggerType: (0, import_pg_core20.varchar)("trigger_type", { length: 50 }).notNull(),
      // 'incoming_message', 'keyword', 'new_lead', etc.
      conditions: (0, import_pg_core20.jsonb)("conditions").$type().notNull().default({}),
      actions: (0, import_pg_core20.jsonb)("actions").$type().notNull().default([]),
      priority: (0, import_pg_core20.integer)("priority").default(0).notNull(),
      enabled: (0, import_pg_core20.boolean)("enabled").default(true).notNull(),
      scope: (0, import_pg_core20.varchar)("scope", { length: 50 }).default("global").notNull(),
      createdAt: (0, import_pg_core20.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core20.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/tags.ts
var import_pg_core21, tags, conversationTags;
var init_tags = __esm({
  "src/database/schema/tags.ts"() {
    "use strict";
    import_pg_core21 = require("drizzle-orm/pg-core");
    init_conversations();
    tags = (0, import_pg_core21.pgTable)("tags", {
      id: (0, import_pg_core21.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core21.varchar)("name", { length: 50 }).notNull().unique(),
      color: (0, import_pg_core21.varchar)("color", { length: 20 }).default("#10b981").notNull(),
      createdAt: (0, import_pg_core21.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
    });
    conversationTags = (0, import_pg_core21.pgTable)(
      "conversation_tags",
      {
        conversationId: (0, import_pg_core21.uuid)("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
        tagId: (0, import_pg_core21.uuid)("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull()
      },
      (table) => [
        (0, import_pg_core21.primaryKey)({ columns: [table.conversationId, table.tagId] })
      ]
    );
  }
});

// src/database/schema/crm.ts
var import_pg_core22, crmSyncStatusEnum, crmConnections, crmSyncLogs;
var init_crm = __esm({
  "src/database/schema/crm.ts"() {
    "use strict";
    import_pg_core22 = require("drizzle-orm/pg-core");
    crmSyncStatusEnum = (0, import_pg_core22.pgEnum)("crm_sync_status", ["pending", "success", "failed", "retrying"]);
    crmConnections = (0, import_pg_core22.pgTable)("crm_connections", {
      id: (0, import_pg_core22.uuid)("id").defaultRandom().primaryKey(),
      name: (0, import_pg_core22.varchar)("name", { length: 150 }).notNull(),
      provider: (0, import_pg_core22.varchar)("provider", { length: 50 }).notNull(),
      // 'webhook', 'generic_rest', 'hubspot', etc.
      apiUrl: (0, import_pg_core22.text)("api_url"),
      apiKeyEncrypted: (0, import_pg_core22.text)("api_key_encrypted"),
      webhookSecret: (0, import_pg_core22.text)("webhook_secret"),
      active: (0, import_pg_core22.varchar)("active", { length: 10 }).default("true").notNull(),
      createdAt: (0, import_pg_core22.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: (0, import_pg_core22.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    crmSyncLogs = (0, import_pg_core22.pgTable)("crm_sync_logs", {
      id: (0, import_pg_core22.uuid)("id").defaultRandom().primaryKey(),
      connectionId: (0, import_pg_core22.uuid)("connection_id").references(() => crmConnections.id, { onDelete: "set null" }),
      entityType: (0, import_pg_core22.varchar)("entity_type", { length: 50 }).notNull(),
      // 'lead', 'contact', 'note'
      entityId: (0, import_pg_core22.uuid)("entity_id").notNull(),
      direction: (0, import_pg_core22.varchar)("direction", { length: 20 }).notNull(),
      // 'incoming', 'outgoing'
      status: crmSyncStatusEnum("status").default("pending").notNull(),
      payload: (0, import_pg_core22.jsonb)("payload").$type(),
      response: (0, import_pg_core22.jsonb)("response").$type(),
      errorMessage: (0, import_pg_core22.text)("error_message"),
      retryCount: (0, import_pg_core22.varchar)("retry_count", { length: 10 }).default("0").notNull(),
      createdAt: (0, import_pg_core22.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/notifications.ts
var import_pg_core23, notifications;
var init_notifications = __esm({
  "src/database/schema/notifications.ts"() {
    "use strict";
    import_pg_core23 = require("drizzle-orm/pg-core");
    init_users();
    notifications = (0, import_pg_core23.pgTable)("notifications", {
      id: (0, import_pg_core23.uuid)("id").defaultRandom().primaryKey(),
      userId: (0, import_pg_core23.uuid)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      title: (0, import_pg_core23.varchar)("title", { length: 255 }).notNull(),
      message: (0, import_pg_core23.text)("message").notNull(),
      type: (0, import_pg_core23.varchar)("type", { length: 50 }).notNull(),
      link: (0, import_pg_core23.text)("link"),
      read: (0, import_pg_core23.boolean)("read").default(false).notNull(),
      data: (0, import_pg_core23.jsonb)("data").$type().default({}),
      createdAt: (0, import_pg_core23.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// src/database/schema/outbound-queue.ts
var import_pg_core24, outboundQueue;
var init_outbound_queue = __esm({
  "src/database/schema/outbound-queue.ts"() {
    "use strict";
    import_pg_core24 = require("drizzle-orm/pg-core");
    init_companies();
    init_whatsapp_accounts();
    init_conversations();
    init_messages();
    outboundQueue = (0, import_pg_core24.pgTable)("outbound_queue", {
      id: (0, import_pg_core24.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core24.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      accountId: (0, import_pg_core24.uuid)("account_id").references(() => whatsappAccounts.id, { onDelete: "set null" }),
      conversationId: (0, import_pg_core24.uuid)("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
      messageId: (0, import_pg_core24.uuid)("message_id").references(() => messages.id, { onDelete: "set null" }),
      toJid: (0, import_pg_core24.varchar)("to_jid", { length: 100 }).notNull(),
      type: (0, import_pg_core24.varchar)("type", { length: 20 }).default("text").notNull(),
      // text, image, video, audio, voice_note, document
      text: (0, import_pg_core24.text)("text"),
      mediaData: (0, import_pg_core24.text)("media_data"),
      // Base64 or URL
      mediaMime: (0, import_pg_core24.varchar)("media_mime", { length: 100 }),
      mediaFilename: (0, import_pg_core24.varchar)("media_filename", { length: 255 }),
      caption: (0, import_pg_core24.text)("caption"),
      quotedMessageId: (0, import_pg_core24.varchar)("quoted_message_id", { length: 150 }),
      status: (0, import_pg_core24.varchar)("status", { length: 20 }).default("pending").notNull(),
      // pending, processing, sent, failed
      priority: (0, import_pg_core24.integer)("priority").default(0).notNull(),
      // 0 = normal, 1 = high (auto-replies, system alerts)
      attempts: (0, import_pg_core24.integer)("attempts").default(0).notNull(),
      error: (0, import_pg_core24.text)("error"),
      createdAt: (0, import_pg_core24.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      sentAt: (0, import_pg_core24.timestamp)("sent_at", { withTimezone: true }),
      updatedAt: (0, import_pg_core24.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
    }, (table) => {
      return {
        statusIdx: (0, import_pg_core24.index)("outbound_queue_status_idx").on(table.status),
        companyIdx: (0, import_pg_core24.index)("outbound_queue_company_idx").on(table.companyId),
        createdAtIdx: (0, import_pg_core24.index)("outbound_queue_created_at_idx").on(table.createdAt),
        accountIdx: (0, import_pg_core24.index)("outbound_queue_account_idx").on(table.accountId)
      };
    });
  }
});

// src/database/schema/bridge-commands.ts
var import_pg_core25, bridgeCommands;
var init_bridge_commands = __esm({
  "src/database/schema/bridge-commands.ts"() {
    "use strict";
    import_pg_core25 = require("drizzle-orm/pg-core");
    init_companies();
    init_whatsapp_accounts();
    bridgeCommands = (0, import_pg_core25.pgTable)("bridge_commands", {
      id: (0, import_pg_core25.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core25.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      accountId: (0, import_pg_core25.uuid)("account_id").references(() => whatsappAccounts.id, { onDelete: "set null" }),
      action: (0, import_pg_core25.varchar)("action", { length: 50 }).notNull(),
      // connect, disconnect, logout, reset, restart, pairing_code
      payload: (0, import_pg_core25.jsonb)("payload").$type().default({}).notNull(),
      // e.g. { phoneNumber: "..." }
      status: (0, import_pg_core25.varchar)("status", { length: 20 }).default("pending").notNull(),
      // pending, processing, completed, failed
      result: (0, import_pg_core25.jsonb)("result").$type(),
      // e.g. { pairingCode: "1234-5678" }
      error: (0, import_pg_core25.varchar)("error", { length: 500 }),
      createdAt: (0, import_pg_core25.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
      completedAt: (0, import_pg_core25.timestamp)("completed_at", { withTimezone: true })
    }, (table) => {
      return {
        statusIdx: (0, import_pg_core25.index)("bridge_commands_status_idx").on(table.status),
        companyIdx: (0, import_pg_core25.index)("bridge_commands_company_idx").on(table.companyId),
        createdAtIdx: (0, import_pg_core25.index)("bridge_commands_created_at_idx").on(table.createdAt)
      };
    });
  }
});

// src/database/schema/bridge-heartbeats.ts
var import_pg_core26, bridgeHeartbeats;
var init_bridge_heartbeats = __esm({
  "src/database/schema/bridge-heartbeats.ts"() {
    "use strict";
    import_pg_core26 = require("drizzle-orm/pg-core");
    init_companies();
    bridgeHeartbeats = (0, import_pg_core26.pgTable)("bridge_heartbeats", {
      id: (0, import_pg_core26.uuid)("id").defaultRandom().primaryKey(),
      companyId: (0, import_pg_core26.uuid)("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
      bridgeId: (0, import_pg_core26.varchar)("bridge_id", { length: 100 }).notNull(),
      isOnline: (0, import_pg_core26.boolean)("is_online").default(true).notNull(),
      version: (0, import_pg_core26.varchar)("version", { length: 20 }).default("1.0.0").notNull(),
      uptimeSeconds: (0, import_pg_core26.integer)("uptime_seconds").default(0).notNull(),
      accountsSummary: (0, import_pg_core26.jsonb)("accounts_summary").$type().default([]).notNull(),
      // [{ accountId, status, phoneNumber, displayName }]
      lastSeenAt: (0, import_pg_core26.timestamp)("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
      createdAt: (0, import_pg_core26.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
    }, (table) => {
      return {
        companyIdx: (0, import_pg_core26.uniqueIndex)("bridge_heartbeats_company_idx").on(table.companyId),
        lastSeenIdx: (0, import_pg_core26.index)("bridge_heartbeats_last_seen_idx").on(table.lastSeenAt)
      };
    });
  }
});

// src/database/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  assignmentSourceEnum: () => assignmentSourceEnum,
  auditLogs: () => auditLogs,
  automationRules: () => automationRules,
  bridgeCommands: () => bridgeCommands,
  bridgeHeartbeats: () => bridgeHeartbeats,
  companies: () => companies,
  contacts: () => contacts,
  conversationStatusEnum: () => conversationStatusEnum,
  conversationTags: () => conversationTags,
  conversations: () => conversations,
  crmConnections: () => crmConnections,
  crmSyncLogs: () => crmSyncLogs,
  crmSyncStatusEnum: () => crmSyncStatusEnum,
  departments: () => departments,
  employeeStatusEnum: () => employeeStatusEnum,
  employees: () => employees,
  leadStageEnum: () => leadStageEnum,
  leads: () => leads,
  messageDirectionEnum: () => messageDirectionEnum,
  messageSenderTypeEnum: () => messageSenderTypeEnum,
  messageStatusEnum: () => messageStatusEnum,
  messageTypeEnum: () => messageTypeEnum,
  messages: () => messages,
  notifications: () => notifications,
  outboundQueue: () => outboundQueue,
  permissions: () => permissions,
  quickReplies: () => quickReplies,
  reminderStatusEnum: () => reminderStatusEnum,
  reminders: () => reminders,
  rolePermissions: () => rolePermissions,
  roles: () => roles,
  settings: () => settings,
  stations: () => stations,
  tags: () => tags,
  userStatusEnum: () => userStatusEnum,
  users: () => users,
  whatsappAccountStatusEnum: () => whatsappAccountStatusEnum,
  whatsappAccounts: () => whatsappAccounts,
  whatsappAuthKeys: () => whatsappAuthKeys,
  whatsappSessions: () => whatsappSessions
});
var init_schema = __esm({
  "src/database/schema/index.ts"() {
    "use strict";
    init_companies();
    init_departments();
    init_stations();
    init_roles();
    init_permissions();
    init_role_permissions();
    init_users();
    init_employees();
    init_settings();
    init_audit_logs();
    init_contacts();
    init_leads();
    init_whatsapp_accounts();
    init_whatsapp_sessions();
    init_whatsapp_auth_keys();
    init_conversations();
    init_messages();
    init_reminders();
    init_quick_replies();
    init_automation_rules();
    init_tags();
    init_crm();
    init_notifications();
    init_outbound_queue();
    init_bridge_commands();
    init_bridge_heartbeats();
  }
});

// src/database/client.ts
var import_node_postgres, import_pg, Pool, sanitizedDatabaseUrl, pool, db;
var init_client = __esm({
  "src/database/client.ts"() {
    "use strict";
    import_node_postgres = require("drizzle-orm/node-postgres");
    import_pg = __toESM(require("pg"));
    init_config();
    init_schema();
    init_logger();
    ({ Pool } = import_pg.default);
    sanitizedDatabaseUrl = config.DATABASE_URL.replace(
      /[?&]channel_binding=[^&]+/g,
      (match) => match.startsWith("?") ? "?" : ""
    ).replace(/\?$/, "");
    pool = new Pool({
      connectionString: sanitizedDatabaseUrl,
      ssl: sanitizedDatabaseUrl.includes("neon.tech") || sanitizedDatabaseUrl.includes("supabase.co") || sanitizedDatabaseUrl.includes("supabase.com") || sanitizedDatabaseUrl.includes("sslmode=require") || sanitizedDatabaseUrl.includes("ssl=true") || process.env.NODE_ENV === "production" && !sanitizedDatabaseUrl.includes("localhost") ? { rejectUnauthorized: false } : void 0,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 3e4
    });
    pool.on("error", (err) => {
      logger.error({ err }, "Unexpected PostgreSQL pool error");
    });
    db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
  }
});

// src/modules/audit/audit.service.ts
var import_drizzle_orm, AuditService;
var init_audit_service = __esm({
  "src/modules/audit/audit.service.ts"() {
    "use strict";
    init_client();
    init_schema();
    import_drizzle_orm = require("drizzle-orm");
    init_logger();
    AuditService = class {
      /**
       * Append an audit log entry.
       * Audit logs are strictly append-only.
       */
      static async log(params) {
        try {
          await db.insert(auditLogs).values({
            actorId: params.actorId || null,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId || null,
            ipAddress: params.ipAddress || null,
            userAgent: params.userAgent || null,
            oldValues: params.oldValues || null,
            newValues: params.newValues || null,
            metadata: params.metadata || {}
          });
        } catch (error) {
          logger.error({ error, params }, "Failed to write audit log");
        }
      }
      /**
       * List audit logs with pagination and optional filters
       */
      static async list(options) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const offset = (page - 1) * limit;
        const conditions = [];
        if (options.entityType) {
          conditions.push((0, import_drizzle_orm.eq)(auditLogs.entityType, options.entityType));
        }
        if (options.actorId) {
          conditions.push((0, import_drizzle_orm.eq)(auditLogs.actorId, options.actorId));
        }
        const whereClause = conditions.length > 0 ? (0, import_drizzle_orm.and)(...conditions) : void 0;
        const [items, totalResult] = await Promise.all([
          db.select().from(auditLogs).where(whereClause).orderBy((0, import_drizzle_orm.desc)(auditLogs.createdAt)).limit(limit).offset(offset),
          db.select({ count: auditLogs.id }).from(auditLogs).where(whereClause)
        ]);
        return {
          items,
          pagination: {
            page,
            limit,
            total: totalResult.length,
            totalPages: Math.ceil(totalResult.length / limit)
          }
        };
      }
    };
  }
});

// src/utils/phone.validator.ts
var phone_validator_exports = {};
__export(phone_validator_exports, {
  KNOWN_COUNTRY_CODES: () => KNOWN_COUNTRY_CODES,
  getCleanDigits: () => getCleanDigits,
  normalizePhoneNumber: () => normalizePhoneNumber,
  validateAndFormatPhone: () => validateAndFormatPhone
});
function validateAndFormatPhone(rawInput, defaultCountryCode = "966") {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      isValid: false,
      formatted: "",
      e164: "",
      digitsOnly: "",
      whatsappJid: "",
      nationalNumber: "",
      countryCode: "",
      countryName: "",
      error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641."
    };
  }
  let cleaned = rawInput.trim().replace(/[\s\-\(\)\.\[\]]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  const hasPlus = cleaned.startsWith("+");
  let digits = cleaned.replace(/\D/g, "");
  if (!digits || digits.length < 7) {
    return {
      isValid: false,
      formatted: cleaned,
      e164: cleaned,
      digitsOnly: digits,
      whatsappJid: "",
      nationalNumber: digits,
      countryCode: "",
      countryName: "",
      error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0642\u0635\u064A\u0631 \u062C\u062F\u0627\u064B \u0648\u063A\u064A\u0631 \u0635\u0627\u0644\u062D."
    };
  }
  let matchedCountry = KNOWN_COUNTRY_CODES.find((c) => digits.startsWith(c.code));
  if (matchedCountry) {
    const afterCode = digits.slice(matchedCountry.code.length);
    if (afterCode.startsWith("0")) {
      digits = matchedCountry.code + afterCode.replace(/^0+/, "");
    }
  } else if (hasPlus) {
    digits = digits.replace(/^0+/, "");
  } else {
    if (digits.startsWith("0")) {
      const withoutZero = digits.slice(1);
      if (withoutZero.startsWith("5") && withoutZero.length === 9) {
        digits = "966" + withoutZero;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === "966");
      } else if ((withoutZero.startsWith("10") || withoutZero.startsWith("11") || withoutZero.startsWith("12") || withoutZero.startsWith("15")) && withoutZero.length === 10) {
        digits = "20" + withoutZero;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === "20");
      } else if (defaultCountryCode) {
        digits = defaultCountryCode.replace(/\D/g, "") + withoutZero;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === defaultCountryCode);
      }
    } else {
      if (digits.startsWith("5") && digits.length === 9) {
        digits = "966" + digits;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === "966");
      } else if ((digits.startsWith("10") || digits.startsWith("11") || digits.startsWith("12") || digits.startsWith("15")) && digits.length === 10) {
        digits = "20" + digits;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === "20");
      } else if (defaultCountryCode) {
        digits = defaultCountryCode.replace(/\D/g, "") + digits;
        matchedCountry = KNOWN_COUNTRY_CODES.find((c) => c.code === defaultCountryCode);
      }
    }
  }
  if (!matchedCountry) {
    matchedCountry = KNOWN_COUNTRY_CODES.find((c) => digits.startsWith(c.code));
  }
  if (digits.length > 15) {
    return {
      isValid: false,
      formatted: `+${digits}`,
      e164: `+${digits}`,
      digitsOnly: digits,
      whatsappJid: `${digits}@s.whatsapp.net`,
      nationalNumber: digits,
      countryCode: matchedCountry?.code || "",
      countryName: matchedCountry?.country || "\u062F\u0648\u0644\u064A",
      error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u062F\u0648\u0644\u064A\u0629 (15 \u0631\u0642\u0645\u0627\u064B \u0648\u0641\u0642\u0627\u064B \u0644\u0644\u0645\u0639\u064A\u0627\u0631 \u0627\u0644\u062F\u0648\u0644\u064A E.164)."
    };
  }
  const countryCode = matchedCountry?.code || "";
  const nationalNumber = countryCode ? digits.slice(countryCode.length) : digits;
  return {
    isValid: true,
    formatted: `+${digits}`,
    e164: `+${digits}`,
    digitsOnly: digits,
    whatsappJid: `${digits}@s.whatsapp.net`,
    nationalNumber,
    countryCode,
    countryName: matchedCountry ? `${matchedCountry.country} ${matchedCountry.flag}` : "\u062F\u0648\u0644\u064A \u{1F310}"
  };
}
function normalizePhoneNumber(rawInput, defaultCountryCode = "966") {
  const result = validateAndFormatPhone(rawInput, defaultCountryCode);
  return result.isValid ? result.formatted : rawInput.trim();
}
function getCleanDigits(rawInput) {
  const result = validateAndFormatPhone(rawInput);
  return result.digitsOnly || rawInput.replace(/\D/g, "");
}
var KNOWN_COUNTRY_CODES;
var init_phone_validator = __esm({
  "src/utils/phone.validator.ts"() {
    "use strict";
    KNOWN_COUNTRY_CODES = [
      { code: "966", country: "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629", flag: "\u{1F1F8}\u{1F1E6}", localLen: 9, localPrefixes: ["5"] },
      { code: "20", country: "\u0645\u0635\u0631", flag: "\u{1F1EA}\u{1F1EC}", localLen: 10, localPrefixes: ["10", "11", "12", "15"] },
      { code: "965", country: "\u0627\u0644\u0643\u0648\u064A\u062A", flag: "\u{1F1F0}\u{1F1FC}", localLen: 8, localPrefixes: ["5", "6", "9"] },
      { code: "971", country: "\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A", flag: "\u{1F1E6}\u{1F1EA}", localLen: 9, localPrefixes: ["5"] },
      { code: "974", country: "\u0642\u0637\u0631", flag: "\u{1F1F6}\u{1F1E6}", localLen: 8, localPrefixes: ["3", "5", "6", "7"] },
      { code: "968", country: "\u0639\u064F\u0645\u0627\u0646", flag: "\u{1F1F4}\u{1F1F2}", localLen: 8, localPrefixes: ["7", "9"] },
      { code: "973", country: "\u0627\u0644\u0628\u062D\u0631\u064A\u0646", flag: "\u{1F1E7}\u{1F1ED}", localLen: 8, localPrefixes: ["3", "6"] },
      { code: "962", country: "\u0627\u0644\u0623\u0631\u062F\u0646", flag: "\u{1F1EF}\u{1F1F4}", localLen: 9, localPrefixes: ["7"] },
      { code: "964", country: "\u0627\u0644\u0639\u0631\u0627\u0642", flag: "\u{1F1EE}\u{1F1F6}", localLen: 10, localPrefixes: ["7"] }
    ];
  }
});

// src/utils/business-hours.converter.ts
function unifyBusinessHours(input) {
  if (!input || typeof input !== "object") {
    input = {};
  }
  const has7DayKeys = DAY_NAMES.some((d) => input[d] && typeof input[d] === "object");
  const hasScheduleObj = input.schedule && typeof input.schedule === "object";
  let defaultStart = input.start || input.businessHoursStart || "09:00";
  let defaultEnd = input.end || input.businessHoursEnd || "18:00";
  const timezone = input.timezone || "Asia/Kuwait";
  const isEnabled = input.enabled !== false;
  const scheduleMap = {};
  const activeDaysSet = /* @__PURE__ */ new Set();
  if (has7DayKeys || hasScheduleObj) {
    const source = has7DayKeys ? input : input.schedule;
    for (const day of DAY_NAMES) {
      const dayData = source[day] || {};
      const dayEnabled = dayData.enabled !== false;
      const dayStart = dayData.start || defaultStart;
      const dayEnd = dayData.end || defaultEnd;
      scheduleMap[day] = {
        enabled: dayEnabled,
        start: dayStart,
        end: dayEnd
      };
      if (dayEnabled) {
        activeDaysSet.add(DAY_NAME_TO_NUMBER[day]);
      }
    }
    const firstActiveDay = DAY_NAMES.find((d) => scheduleMap[d]?.enabled);
    if (firstActiveDay && scheduleMap[firstActiveDay]) {
      defaultStart = scheduleMap[firstActiveDay].start;
      defaultEnd = scheduleMap[firstActiveDay].end;
    }
  } else {
    const rawDays = input.workDays || input.activeDays || [0, 1, 2, 3, 4, 6];
    for (const d of rawDays) {
      activeDaysSet.add(Number(d));
    }
    for (const day of DAY_NAMES) {
      const dayNum = DAY_NAME_TO_NUMBER[day];
      const dayEnabled = activeDaysSet.has(dayNum);
      scheduleMap[day] = {
        enabled: dayEnabled,
        start: defaultStart,
        end: defaultEnd
      };
    }
  }
  const activeDaysArray = Array.from(activeDaysSet).sort((a, b) => a - b);
  return {
    enabled: isEnabled,
    timezone,
    start: defaultStart,
    end: defaultEnd,
    workDays: activeDaysArray,
    activeDays: activeDaysArray,
    businessHoursStart: defaultStart,
    businessHoursEnd: defaultEnd,
    ...scheduleMap,
    schedule: scheduleMap
  };
}
var DAY_NAMES, DAY_NAME_TO_NUMBER;
var init_business_hours_converter = __esm({
  "src/utils/business-hours.converter.ts"() {
    "use strict";
    DAY_NAMES = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ];
    DAY_NAME_TO_NUMBER = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
  }
});

// src/modules/settings/settings.service.ts
var import_drizzle_orm8, IGNORED_KEYS, SettingsService;
var init_settings_service = __esm({
  "src/modules/settings/settings.service.ts"() {
    "use strict";
    init_client();
    init_schema();
    import_drizzle_orm8 = require("drizzle-orm");
    init_errors();
    init_audit_service();
    init_logger();
    init_business_hours_converter();
    IGNORED_KEYS = /* @__PURE__ */ new Set(["list", "map", "results", "undefined", "null"]);
    SettingsService = class {
      /**
       * Cleans up junk keys (e.g. list, map) accidentally stored in the settings table
       */
      static async cleanupJunkSettings() {
        try {
          await db.delete(settings).where((0, import_drizzle_orm8.inArray)(settings.key, Array.from(IGNORED_KEYS)));
        } catch (err) {
          logger.debug({ err }, "Error cleaning up junk settings");
        }
      }
      static async getAll() {
        await this.cleanupJunkSettings();
        const list = await db.select().from(settings);
        const map = {};
        for (const item of list) {
          if (IGNORED_KEYS.has(item.key))
            continue;
          map[item.key] = item.value;
        }
        if (map["assignment_mode"] !== void 0 && map["routingStrategy"] === void 0) {
          map["routingStrategy"] = map["assignment_mode"];
        } else if (map["routingStrategy"] !== void 0 && map["assignment_mode"] === void 0) {
          map["assignment_mode"] = map["routingStrategy"];
        }
        if (map["assignment_enabled"] !== void 0 && map["autoAssignmentEnabled"] === void 0) {
          map["autoAssignmentEnabled"] = map["assignment_enabled"];
        } else if (map["autoAssignmentEnabled"] !== void 0 && map["assignment_enabled"] === void 0) {
          map["assignment_enabled"] = map["autoAssignmentEnabled"];
        }
        if (map["welcome_message_enabled"] !== void 0) {
          map["greetingBotEnabled"] = map["welcome_message_enabled"];
          map["welcomeMessageEnabled"] = map["welcome_message_enabled"];
        }
        if (map["welcome_message_template"] !== void 0) {
          map["greetingMessage"] = map["welcome_message_template"];
          map["welcomeMessageTemplate"] = map["welcome_message_template"];
        }
        const oohVal = map["out_of_hours_message_enabled"] ?? map["outOfHoursMessageEnabled"] ?? map["outOfOfficeBotEnabled"] ?? map["outOfOfficeEnabled"];
        if (oohVal !== void 0) {
          map["out_of_hours_message_enabled"] = oohVal;
          map["outOfHoursMessageEnabled"] = oohVal;
          map["outOfOfficeBotEnabled"] = oohVal;
          map["outOfOfficeEnabled"] = oohVal;
        }
        const oohTmpl = map["out_of_hours_message_template"] ?? map["outOfHoursMessageTemplate"] ?? map["outOfOfficeMessage"];
        if (oohTmpl !== void 0) {
          map["out_of_hours_message_template"] = oohTmpl;
          map["outOfHoursMessageTemplate"] = oohTmpl;
          map["outOfOfficeMessage"] = oohTmpl;
        }
        const rawBHours = map["business_hours"] ?? map["businessHours"];
        if (rawBHours) {
          const unified = unifyBusinessHours(rawBHours);
          map["business_hours"] = unified;
          map["businessHours"] = unified;
          map["businessHoursStart"] = unified.start;
          map["businessHoursEnd"] = unified.end;
          map["activeDays"] = unified.activeDays;
        }
        return {
          list: list.filter((i) => !IGNORED_KEYS.has(i.key)),
          map
        };
      }
      static async get(key) {
        if (IGNORED_KEYS.has(key))
          return null;
        const setting = await db.query.settings.findFirst({
          where: (0, import_drizzle_orm8.eq)(settings.key, key)
        });
        if (!setting) {
          if (key === "routingStrategy")
            return this.get("assignment_mode");
          if (key === "assignment_mode")
            return this.get("routingStrategy");
          if (key === "autoAssignmentEnabled")
            return this.get("assignment_enabled");
          if (key === "assignment_enabled")
            return this.get("autoAssignmentEnabled");
          if (key === "businessHoursStart" || key === "businessHoursEnd" || key === "activeDays") {
            const bh = await this.get("business_hours");
            return bh ? unifyBusinessHours(bh)[key === "activeDays" ? "workDays" : key] : null;
          }
          throw new NotFoundError(`Setting "${key}" not found`);
        }
        if (key === "businessHours" || key === "business_hours") {
          return unifyBusinessHours(setting.value);
        }
        return setting.value;
      }
      static async set(key, value, actorId) {
        if (!key || IGNORED_KEYS.has(key))
          return null;
        if (key === "businessHours" || key === "business_hours") {
          value = unifyBusinessHours(value);
        }
        const existing = await db.query.settings.findFirst({
          where: (0, import_drizzle_orm8.eq)(settings.key, key)
        });
        let updated;
        if (existing) {
          [updated] = await db.update(settings).set({
            value,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm8.eq)(settings.key, key)).returning();
          await AuditService.log({
            actorId,
            action: "setting.update",
            entityType: "setting",
            entityId: existing.id,
            oldValues: { [key]: existing.value },
            newValues: { [key]: value }
          });
        } else {
          [updated] = await db.insert(settings).values({
            key,
            value,
            groupName: "custom"
          }).returning();
          await AuditService.log({
            actorId,
            action: "setting.create",
            entityType: "setting",
            entityId: updated.id,
            newValues: { [key]: value }
          });
        }
        const mirrorPairs = {
          routingStrategy: ["assignment_mode"],
          assignment_mode: ["routingStrategy"],
          autoAssignmentEnabled: ["assignment_enabled"],
          assignment_enabled: ["autoAssignmentEnabled"],
          welcomeMessageEnabled: ["welcome_message_enabled", "greetingBotEnabled"],
          greetingBotEnabled: ["welcome_message_enabled", "welcomeMessageEnabled"],
          welcome_message_enabled: ["welcomeMessageEnabled", "greetingBotEnabled"],
          welcomeMessageTemplate: ["welcome_message_template", "greetingMessage"],
          greetingMessage: ["welcome_message_template", "welcomeMessageTemplate"],
          welcome_message_template: ["welcomeMessageTemplate", "greetingMessage"],
          outOfOfficeEnabled: ["out_of_hours_message_enabled", "outOfHoursMessageEnabled", "outOfOfficeBotEnabled"],
          outOfOfficeBotEnabled: ["out_of_hours_message_enabled", "outOfHoursMessageEnabled", "outOfOfficeEnabled"],
          outOfHoursMessageEnabled: ["out_of_hours_message_enabled", "outOfOfficeBotEnabled", "outOfOfficeEnabled"],
          out_of_hours_message_enabled: ["outOfHoursMessageEnabled", "outOfOfficeBotEnabled", "outOfOfficeEnabled"],
          outOfOfficeMessage: ["out_of_hours_message_template", "outOfHoursMessageTemplate"],
          outOfHoursMessageTemplate: ["out_of_hours_message_template", "outOfOfficeMessage"],
          out_of_hours_message_template: ["outOfHoursMessageTemplate", "outOfOfficeMessage"],
          businessHours: ["business_hours"],
          business_hours: ["businessHours"],
          landingSyncEnabled: ["landing_sync_enabled"],
          landing_sync_enabled: ["landingSyncEnabled"],
          landingSyncUrl: ["landing_sync_url"],
          landing_sync_url: ["landingSyncUrl"]
        };
        const targets = mirrorPairs[key];
        if (targets) {
          for (const targetKey of targets) {
            await db.insert(settings).values({ key: targetKey, value, groupName: "synced" }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: /* @__PURE__ */ new Date() } });
          }
        }
        return updated;
      }
      static async updateBatch(items, actorId) {
        const results = [];
        for (const [key, value] of Object.entries(items)) {
          if (IGNORED_KEYS.has(key) || !key || value === void 0)
            continue;
          const res = await this.set(key, value, actorId);
          if (res)
            results.push(res);
        }
        return results;
      }
    };
  }
});

// src/websocket/ws.hub.ts
var import_ws, WebSocketHub, wsHub;
var init_ws_hub = __esm({
  "src/websocket/ws.hub.ts"() {
    "use strict";
    import_ws = require("ws");
    init_logger();
    WebSocketHub = class _WebSocketHub {
      clients = /* @__PURE__ */ new Map();
      heartbeatInterval = null;
      static instance;
      constructor() {
      }
      static getInstance() {
        if (!_WebSocketHub.instance) {
          _WebSocketHub.instance = new _WebSocketHub();
        }
        return _WebSocketHub.instance;
      }
      /**
       * Register WebSocket upgrade handler on Fastify instance.
       */
      registerRoutes(app) {
        app.get("/ws", { websocket: true }, (socket, req) => {
          const clientId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const client = {
            ws: socket,
            subscribedEvents: /* @__PURE__ */ new Set([
              "*",
              "whatsapp.qr",
              "whatsapp.status",
              "whatsapp.connected",
              "whatsapp.disconnected",
              "message.created",
              "message.updated",
              "whatsapp.message",
              "new_message",
              "conversation.updated",
              "conversation_update",
              "assigned",
              "reminder.created",
              "reminder.updated",
              "reminder.due"
            ]),
            lastPing: Date.now()
          };
          this.clients.set(clientId, client);
          logger.info({ clientId, totalClients: this.clients.size }, "WebSocket client connected");
          this.sendTo(clientId, {
            type: "system",
            event: "connected",
            data: { clientId, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
          });
          socket.on("message", (data) => {
            try {
              const message = JSON.parse(data.toString());
              this.handleClientMessage(clientId, message);
            } catch (err) {
              logger.warn({ clientId, err }, "Invalid WebSocket message received");
            }
          });
          socket.on("pong", () => {
            const c = this.clients.get(clientId);
            if (c)
              c.lastPing = Date.now();
          });
          socket.on("close", () => {
            this.clients.delete(clientId);
            logger.info({ clientId, totalClients: this.clients.size }, "WebSocket client disconnected");
          });
          socket.on("error", (err) => {
            logger.error({ clientId, err }, "WebSocket client error");
            this.clients.delete(clientId);
          });
        });
        this.startHeartbeat();
        logger.info("WebSocket Hub initialized on /ws");
      }
      /**
       * Handle messages from client (subscribe/unsubscribe, identity, etc.)
       */
      handleClientMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client)
          return;
        switch (message.type) {
          case "subscribe":
            if (message.event) {
              client.subscribedEvents.add(message.event);
            }
            break;
          case "unsubscribe":
            if (message.event) {
              client.subscribedEvents.delete(message.event);
            }
            break;
          case "identify":
            client.userId = message.userId;
            client.accountId = message.accountId;
            break;
          case "ping":
            this.sendTo(clientId, { type: "pong", timestamp: Date.now() });
            break;
          default:
            break;
        }
      }
      /**
       * Send a message to a specific client.
       */
      sendTo(clientId, payload) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === import_ws.WebSocket.OPEN) {
          client.ws.send(JSON.stringify(payload));
        }
      }
      /**
       * Broadcast an event to all subscribed clients.
       */
      broadcast(event, data) {
        const payload = JSON.stringify({ type: "event", event, data, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        let sent = 0;
        for (const [clientId, client] of this.clients) {
          if (client.ws.readyState === import_ws.WebSocket.OPEN && (client.subscribedEvents.has("*") || client.subscribedEvents.has(event))) {
            client.ws.send(payload);
            sent++;
          }
        }
        if (sent > 0) {
          logger.debug({ event, sentTo: sent, totalClients: this.clients.size }, "Broadcast event");
        }
      }
      /**
       * Broadcast to clients subscribed to a specific WhatsApp account.
       */
      broadcastToAccount(accountId, event, data) {
        const payload = JSON.stringify({ type: "event", event, data, accountId, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        for (const [clientId, client] of this.clients) {
          if (client.ws.readyState === import_ws.WebSocket.OPEN && client.subscribedEvents.has(event)) {
            client.ws.send(payload);
          }
        }
      }
      /**
       * Heartbeat ping/pong every 30s to keep connections alive.
       */
      startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
          const now = Date.now();
          for (const [clientId, client] of this.clients) {
            if (now - client.lastPing > 6e4) {
              client.ws.terminate();
              this.clients.delete(clientId);
              logger.info({ clientId }, "WebSocket client terminated due to heartbeat timeout");
            } else if (client.ws.readyState === import_ws.WebSocket.OPEN) {
              client.ws.ping();
            }
          }
        }, 3e4);
      }
      /**
       * Shutdown the hub — close all connections.
       */
      shutdown() {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
        for (const [clientId, client] of this.clients) {
          client.ws.close(1001, "Server shutting down");
        }
        this.clients.clear();
        logger.info("WebSocket Hub shut down");
      }
      get clientCount() {
        return this.clients.size;
      }
    };
    wsHub = WebSocketHub.getInstance();
  }
});

// src/providers/whatsapp/baileys.provider.ts
var import_baileys, QRCode, import_events, import_path, import_promises, BaileysProvider;
var init_baileys_provider = __esm({
  "src/providers/whatsapp/baileys.provider.ts"() {
    "use strict";
    import_baileys = __toESM(require("@whiskeysockets/baileys"));
    QRCode = __toESM(require("qrcode"));
    import_events = require("events");
    import_path = __toESM(require("path"));
    import_promises = __toESM(require("fs/promises"));
    init_logger();
    BaileysProvider = class extends import_events.EventEmitter {
      sock = null;
      accountId;
      state = { status: "disconnected" };
      reconnectAttempt = 0;
      maxReconnectAttempts = 3;
      saveCreds = null;
      clearAuthState = null;
      isReconnecting = false;
      isShuttingDown = false;
      sessionDir;
      constructor(accountId) {
        super();
        this.accountId = accountId;
        this.sessionDir = import_path.default.join(process.cwd(), "storage", "whatsapp_sessions", accountId);
      }
      get connectionState() {
        return { ...this.state };
      }
      async connect() {
        if (this.sock && this.state.status === "connected") {
          logger.warn({ accountId: this.accountId }, "Already connected, skipping connect()");
          return;
        }
        this.isShuttingDown = false;
        this.updateState({ status: "initializing", error: void 0 });
        try {
          await import_promises.default.mkdir(this.sessionDir, { recursive: true });
          const { state: authState, saveCreds } = await (0, import_baileys.useMultiFileAuthState)(this.sessionDir);
          this.saveCreds = saveCreds;
          this.clearAuthState = async () => {
            try {
              await import_promises.default.rm(this.sessionDir, { recursive: true, force: true });
              logger.info({ accountId: this.accountId }, "Local session files purged");
            } catch (err) {
              logger.warn({ accountId: this.accountId, err }, "Failed to clear local session files");
            }
          };
          const { version } = await (0, import_baileys.fetchLatestBaileysVersion)();
          logger.info({ accountId: this.accountId, version }, "Fetched latest Baileys version");
          this.sock = (0, import_baileys.default)({
            version,
            auth: {
              creds: authState.creds,
              keys: (0, import_baileys.makeCacheableSignalKeyStore)(authState.keys, logger)
            },
            printQRInTerminal: false,
            generateHighQualityLinkPreview: false,
            logger,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            browser: ["Trenty Vision CRM", "Chrome", "1.0.0"]
          });
          this.registerEventHandlers(this.sock.ev);
        } catch (err) {
          logger.error({ accountId: this.accountId, err }, "Failed to initialize Baileys socket");
          this.updateState({ status: "error", error: err.message });
          throw err;
        }
      }
      async disconnect() {
        this.isShuttingDown = true;
        if (this.sock) {
          try {
            this.sock.end(void 0);
            this.sock = null;
          } catch (err) {
            logger.warn({ accountId: this.accountId, err }, "Error during disconnect");
          }
        }
        this.updateState({ status: "disconnected" });
        this.reconnectAttempt = 0;
      }
      async logout() {
        this.isShuttingDown = true;
        if (this.sock) {
          try {
            await this.sock.logout();
          } catch (err) {
            logger.warn({ accountId: this.accountId, err }, "Error during logout");
          }
          this.sock = null;
        }
        if (this.clearAuthState) {
          await this.clearAuthState();
        }
        this.updateState({ status: "logged_out", error: void 0 });
        this.reconnectAttempt = 0;
      }
      async getStatus() {
        return this.connectionState;
      }
      async getQRCode() {
        return this.state.qrCode || null;
      }
      async getPairingCode() {
        return this.state.pairingCode || null;
      }
      /**
       * Request an 8-character pairing code to link phone via phone number
       */
      async requestPairingCode(phoneNumber) {
        if (this.state.status === "connected") {
          throw new Error("\u062D\u0633\u0627\u0628 WhatsApp \u0645\u062A\u0635\u0644 \u0648\u0645\u0642\u062A\u0631\u0646 \u0628\u0627\u0644\u0641\u0639\u0644. \u0625\u0630\u0627 \u0643\u0646\u062A \u062A\u0631\u063A\u0628 \u0641\u064A \u0631\u0628\u0637 \u0631\u0642\u0645 \u062C\u062F\u064A\u062F\u060C \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0623\u0648\u0644\u0627\u064B.");
        }
        let cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
        cleanNumber = cleanNumber.replace(/^(966|965|971|974|968|973|962|20)0+/, "$1");
        if (!cleanNumber || cleanNumber.length < 8) {
          throw new Error("\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0644\u0637\u0644\u0628 \u0643\u0648\u062F \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u0646. \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0631\u0642\u0645 \u0645\u0639 \u0631\u0645\u0632 \u0627\u0644\u062F\u0648\u0644\u0629 (\u0645\u062B\u0644: 9665XXXXXXXX \u0623\u0648 201XXXXXXXXX)");
        }
        const isSocketOpen = this.sock?.ws?.isOpen;
        if (!this.sock || !isSocketOpen) {
          logger.info({ accountId: this.accountId }, "Socket not currently open for pairing code, preparing fresh connection...");
          if (this.sock) {
            try {
              this.sock.end(void 0);
            } catch {
            }
            this.sock = null;
          }
          await this.connect();
        }
        if (!this.sock) {
          throw new Error("\u062A\u0639\u0630\u0631 \u062A\u0647\u064A\u0626\u0629 \u0645\u0642\u0628\u0633 WhatsApp");
        }
        try {
          if (typeof this.sock.waitForSocketOpen === "function") {
            await this.sock.waitForSocketOpen();
          }
          await (0, import_baileys.delay)(1500);
          const code = await this.sock.requestPairingCode(cleanNumber);
          this.updateState({ status: "qr_required", pairingCode: code });
          logger.info({ accountId: this.accountId, code, cleanNumber }, "Pairing code generated successfully");
          return code;
        } catch (err) {
          logger.warn({ accountId: this.accountId, err: err?.message }, "First pairing code attempt failed, retrying with fresh socket...");
          try {
            if (this.sock) {
              try {
                this.sock.end(void 0);
              } catch {
              }
              this.sock = null;
            }
            await this.connect();
            if (typeof this.sock.waitForSocketOpen === "function") {
              await this.sock.waitForSocketOpen();
            }
            await (0, import_baileys.delay)(2e3);
            const activeSock = this.sock;
            if (!activeSock) {
              throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0639\u0627\u062F\u0629 \u062A\u0647\u064A\u0626\u0629 \u0645\u0642\u0628\u0633 WhatsApp");
            }
            const code = await activeSock.requestPairingCode(cleanNumber);
            this.updateState({ status: "qr_required", pairingCode: code });
            logger.info({ accountId: this.accountId, code, cleanNumber }, "Pairing code generated on retry");
            return code;
          } catch (retryErr) {
            logger.error({ accountId: this.accountId, retryErr }, "Failed to request pairing code from Baileys after retry");
            throw new Error(retryErr?.message || "\u0641\u0634\u0644 \u0637\u0644\u0628 \u0631\u0645\u0632 \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u0646 \u0645\u0646 \u062E\u0648\u0627\u062F\u0645 WhatsApp. \u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0627\u0644\u0631\u0642\u0645 \u0635\u062D\u064A\u062D \u0648\u063A\u064A\u0631 \u0645\u0642\u062A\u0631\u0646 \u0628\u062C\u0647\u0627\u0632 \u0622\u062E\u0631.");
          }
        }
      }
      // ─── Messaging Methods ─────────────────────────────────
      async sendText(toJid, text19, options) {
        this.ensureConnected();
        const content = { text: text19 };
        if (options?.quotedMessageId) {
        }
        const result = await this.sock.sendMessage(toJid, content);
        return {
          id: result?.key?.id || `msg_${Date.now()}`,
          timestamp: new Date((result?.messageTimestamp || Math.floor(Date.now() / 1e3)) * 1e3)
        };
      }
      async sendImage(toJid, buffer, mimeType, options) {
        this.ensureConnected();
        const result = await this.sock.sendMessage(toJid, {
          image: buffer,
          mimetype: mimeType,
          caption: options?.caption
        });
        return {
          id: result?.key?.id || `img_${Date.now()}`,
          timestamp: new Date((result?.messageTimestamp || Math.floor(Date.now() / 1e3)) * 1e3)
        };
      }
      async sendVideo(toJid, buffer, mimeType, options) {
        this.ensureConnected();
        const result = await this.sock.sendMessage(toJid, {
          video: buffer,
          mimetype: mimeType,
          caption: options?.caption
        });
        return {
          id: result?.key?.id || `vid_${Date.now()}`,
          timestamp: new Date((result?.messageTimestamp || Math.floor(Date.now() / 1e3)) * 1e3)
        };
      }
      async sendAudio(toJid, buffer, isVoiceNote = false, options) {
        this.ensureConnected();
        const result = await this.sock.sendMessage(toJid, {
          audio: buffer,
          mimetype: "audio/ogg; codecs=opus",
          ptt: isVoiceNote
        });
        return {
          id: result?.key?.id || `aud_${Date.now()}`,
          timestamp: new Date((result?.messageTimestamp || Math.floor(Date.now() / 1e3)) * 1e3)
        };
      }
      async sendDocument(toJid, buffer, fileName, mimeType, options) {
        this.ensureConnected();
        const result = await this.sock.sendMessage(toJid, {
          document: buffer,
          mimetype: mimeType,
          fileName,
          caption: options?.caption
        });
        return {
          id: result?.key?.id || `doc_${Date.now()}`,
          timestamp: new Date((result?.messageTimestamp || Math.floor(Date.now() / 1e3)) * 1e3)
        };
      }
      async sendLocation(toJid, latitude, longitude, name, address) {
        this.ensureConnected();
        const result = await this.sock.sendMessage(toJid, {
          location: {
            degreesLatitude: latitude,
            degreesLongitude: longitude,
            name,
            address
          }
        });
        return {
          id: result?.key?.id || `loc_${Date.now()}`,
          timestamp: new Date((result?.messageTimestamp || Math.floor(Date.now() / 1e3)) * 1e3)
        };
      }
      async sendContact(toJid, contactJid, displayName) {
        this.ensureConnected();
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
TEL;type=CELL;type=VOICE;waid=${contactJid.split("@")[0]}:+${contactJid.split("@")[0]}
END:VCARD`;
        const result = await this.sock.sendMessage(toJid, {
          contacts: {
            displayName,
            contacts: [{ vcard }]
          }
        });
        return {
          id: result?.key?.id || `cnt_${Date.now()}`,
          timestamp: new Date((result?.messageTimestamp || Math.floor(Date.now() / 1e3)) * 1e3)
        };
      }
      async sendReaction(toJid, messageId, emoji) {
        this.ensureConnected();
        await this.sock.sendMessage(toJid, {
          react: { text: emoji, key: { remoteJid: toJid, id: messageId } }
        });
      }
      async markRead(jid, messageIds) {
        this.ensureConnected();
        const keys = messageIds.map((id) => ({
          remoteJid: jid,
          id
        }));
        await this.sock.readMessages(keys);
      }
      async sendTyping(jid, isTyping) {
        this.ensureConnected();
        await this.sock.sendPresenceUpdate(isTyping ? "composing" : "paused", jid);
      }
      /**
       * Resolves a WhatsApp LID (e.g. 6073184461040) to its real phone number
       */
      async getPhoneNumberForLid(lid) {
        try {
          const cleanLid = lid.replace(/[^0-9]/g, "");
          if (!cleanLid)
            return null;
          const reverseFilePath = import_path.default.join(this.sessionDir, `lid-mapping-${cleanLid}_reverse.json`);
          try {
            const fileContent = await import_promises.default.readFile(reverseFilePath, "utf-8");
            const parsed2 = JSON.parse(fileContent.trim());
            if (parsed2 && typeof parsed2 === "string") {
              return parsed2.replace(/\D/g, "");
            }
          } catch {
          }
          const signalRepo = this.sock?.signalRepository;
          if (signalRepo?.lidMapping?.getPNForLID) {
            const pn = await signalRepo.lidMapping.getPNForLID(cleanLid);
            if (pn)
              return String(pn).replace(/\D/g, "");
          }
          return null;
        } catch (err) {
          logger.debug({ accountId: this.accountId, lid, err }, "Failed to resolve LID to PN");
          return null;
        }
      }
      // ─── Private Methods ───────────────────────────────────
      ensureConnected() {
        if (!this.sock || this.state.status !== "connected") {
          throw new Error(`WhatsApp account ${this.accountId} is not connected`);
        }
      }
      updateState(partial) {
        this.state = { ...this.state, ...partial };
        this.emit("status", this.accountId, this.connectionState);
      }
      registerEventHandlers(ev) {
        ev.on("creds.update", async () => {
          if (this.saveCreds) {
            await this.saveCreds();
          }
        });
        ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;
          if (qr) {
            try {
              const qrDataUrl = await QRCode.toDataURL(qr, {
                width: 300,
                margin: 2,
                color: { dark: "#000000", light: "#FFFFFF" }
              });
              this.updateState({ status: "qr_required", qrCode: qrDataUrl });
              this.emit("qr", this.accountId, qrDataUrl);
              logger.info({ accountId: this.accountId }, "QR code generated, waiting for scan");
            } catch (err) {
              logger.error({ accountId: this.accountId, err }, "Failed to generate QR code");
            }
          }
          if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = statusCode === import_baileys.DisconnectReason.loggedOut;
            const shouldReconnect = !isLoggedOut && statusCode !== 403;
            let errorMsg = "\u0627\u0646\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0645\u0642\u0628\u0633 WhatsApp";
            if (statusCode === import_baileys.DisconnectReason.loggedOut) {
              errorMsg = "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0645\u0646 \u062A\u0637\u0628\u064A\u0642 WhatsApp \u0639\u0644\u0649 \u0647\u0627\u062A\u0641\u0643. \u064A\u0644\u0632\u0645 \u0645\u0633\u062D \u0631\u0645\u0632 QR \u062C\u062F\u064A\u062F \u0644\u0644\u0627\u062A\u0635\u0627\u0644.";
            } else if (statusCode === import_baileys.DisconnectReason.timedOut) {
              errorMsg = "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 (QR) \u0623\u0648 \u0627\u0646\u0642\u0637\u0639\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0645\u0642\u0628\u0633.";
            } else if (statusCode === import_baileys.DisconnectReason.connectionReplaced) {
              errorMsg = "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0646 \u062C\u0647\u0627\u0632 \u0623\u0648 \u0645\u062A\u0635\u0641\u062D \u0622\u062E\u0631.";
            } else if (statusCode === import_baileys.DisconnectReason.restartRequired) {
              errorMsg = "\u062C\u0627\u0631\u064A \u0625\u0639\u0627\u062F\u0629 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062C\u0644\u0633\u0629 \u0644\u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0645\u0634\u0641\u0631\u0629.";
            }
            logger.info(
              { accountId: this.accountId, statusCode, shouldReconnect, errorMsg },
              "WhatsApp connection closed"
            );
            if (isLoggedOut) {
              this.updateState({ status: "logged_out", error: errorMsg });
              if (this.clearAuthState) {
                await this.clearAuthState();
              }
            } else if (shouldReconnect && !this.isShuttingDown) {
              this.scheduleReconnect();
            } else {
              this.updateState({ status: "disconnected", error: errorMsg });
            }
          }
          if (connection === "open") {
            const phoneNumber = this.sock?.user?.id?.split(":")[0] || this.sock?.user?.id?.split("@")[0] || "";
            const jid = this.sock?.user?.id || "";
            const deviceName = this.sock?.user?.name || "Unknown";
            this.reconnectAttempt = 0;
            this.isReconnecting = false;
            this.updateState({
              status: "connected",
              qrCode: void 0,
              phoneNumber: `+${phoneNumber}`,
              jid,
              deviceName,
              lastSeenAt: /* @__PURE__ */ new Date(),
              error: void 0
            });
            logger.info({ accountId: this.accountId, phoneNumber, jid, deviceName }, "WhatsApp connected successfully");
          }
        });
        ev.on("messages.upsert", async ({ messages: msgs, type }) => {
          for (const msg of msgs) {
            if (!msg.key.remoteJid)
              continue;
            if (msg.key.remoteJid === "status@broadcast")
              continue;
            this.emit("message", this.accountId, msg);
            logger.debug(
              { accountId: this.accountId, from: msg.key.remoteJid, messageId: msg.key.id, type },
              "WhatsApp message received / upserted"
            );
          }
        });
        ev.on("messages.update", async (updates) => {
          this.emit("message.update", this.accountId, updates);
        });
        ev.on("contacts.upsert", (newContacts) => {
          this.emit("contacts.sync", this.accountId, newContacts);
        });
        ev.on("contacts.set", ({ contacts: setContacts }) => {
          this.emit("contacts.sync", this.accountId, setContacts);
        });
        ev.on("contacts.update", (updatedContacts) => {
          this.emit("contacts.sync", this.accountId, updatedContacts);
        });
      }
      scheduleReconnect() {
        if (this.isReconnecting || this.isShuttingDown)
          return;
        if (this.reconnectAttempt >= this.maxReconnectAttempts) {
          logger.warn({ accountId: this.accountId }, "Max reconnect attempts reached, stopping retry loop");
          this.updateState({
            status: "error",
            error: '\u062A\u0639\u0630\u0631 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0639\u062F \u0639\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0627\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 "\u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0646\u0638\u064A\u0641\u0629" \u0644\u0625\u0639\u0627\u062F\u0629 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0645\u0642\u0628\u0633.'
          });
          return;
        }
        this.isReconnecting = true;
        this.reconnectAttempt++;
        const backoffMs = Math.min(1500 * Math.pow(2, this.reconnectAttempt - 1), 15e3);
        logger.info(
          { accountId: this.accountId, attempt: this.reconnectAttempt, backoffMs },
          "Scheduling reconnect"
        );
        this.updateState({ status: "connecting" });
        setTimeout(async () => {
          this.isReconnecting = false;
          if (!this.isShuttingDown) {
            try {
              await this.connect();
            } catch (err) {
              logger.error({ accountId: this.accountId, err }, "Reconnect failed");
            }
          }
        }, backoffMs);
      }
    };
  }
});

// src/services/outbound-queue.service.ts
var OutboundQueueService;
var init_outbound_queue_service = __esm({
  "src/services/outbound-queue.service.ts"() {
    "use strict";
    init_client();
    init_outbound_queue();
    init_config();
    init_logger();
    OutboundQueueService = class {
      /**
       * Universal message dispatcher:
       * - In local mode: attempts direct send via Baileys session socket
       * - In online mode (or if local socket offline): enqueues message into database outbound_queue
       */
      static async sendMessage(options) {
        const {
          companyId,
          accountId,
          conversationId,
          messageId,
          toJid,
          type = "text",
          text: text19,
          mediaBuffer,
          mediaUrl,
          mediaMime,
          mediaFilename,
          caption,
          quotedMessageId,
          priority = 0
        } = options;
        if (config.DEPLOYMENT_MODE === "local") {
          try {
            const { sessionManager: sessionManager2 } = await Promise.resolve().then(() => (init_session_manager(), session_manager_exports));
            const provider = sessionManager2.getProvider(accountId);
            if (provider) {
              let whatsappMessageId = `crm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              if (type === "text" && text19) {
                const res = await provider.sendText(toJid, text19, { quotedMessageId: quotedMessageId || void 0 });
                if (res?.id)
                  whatsappMessageId = res.id;
              } else if (type === "image" && mediaBuffer) {
                const res = await provider.sendImage(toJid, mediaBuffer, mediaMime || "image/jpeg", {
                  caption: caption || text19 || void 0,
                  quotedMessageId: quotedMessageId || void 0
                });
                if (res?.id)
                  whatsappMessageId = res.id;
              } else if (type === "video" && mediaBuffer) {
                const res = await provider.sendVideo(toJid, mediaBuffer, mediaMime || "video/mp4", {
                  caption: caption || text19 || void 0,
                  quotedMessageId: quotedMessageId || void 0
                });
                if (res?.id)
                  whatsappMessageId = res.id;
              } else if ((type === "audio" || type === "voice_note") && mediaBuffer) {
                const res = await provider.sendAudio(toJid, mediaBuffer, type === "voice_note", {
                  quotedMessageId: quotedMessageId || void 0
                });
                if (res?.id)
                  whatsappMessageId = res.id;
              } else if (type === "document" && mediaBuffer) {
                const res = await provider.sendDocument(
                  toJid,
                  mediaBuffer,
                  mediaFilename || "file",
                  mediaMime || "application/octet-stream",
                  {
                    caption: caption || text19 || void 0,
                    quotedMessageId: quotedMessageId || void 0
                  }
                );
                if (res?.id)
                  whatsappMessageId = res.id;
              }
              return {
                success: true,
                whatsappMessageId,
                status: "sent"
              };
            } else {
              logger.warn({ accountId }, "OutboundQueueService: Local provider not connected, falling back to queue");
            }
          } catch (err) {
            logger.error({ accountId, toJid, err: err?.message }, "OutboundQueueService: Error in local direct send, queuing message");
          }
        }
        try {
          const mediaData = mediaBuffer ? mediaBuffer.toString("base64") : mediaUrl || null;
          const [record] = await db.insert(outboundQueue).values({
            companyId,
            accountId,
            conversationId: conversationId || null,
            messageId: messageId || null,
            toJid,
            type,
            text: text19 || null,
            mediaData,
            mediaMime: mediaMime || null,
            mediaFilename: mediaFilename || null,
            caption: caption || null,
            quotedMessageId: quotedMessageId || null,
            priority,
            status: "pending"
          }).returning();
          return {
            success: true,
            status: "queued",
            queueId: record.id
          };
        } catch (err) {
          logger.error({ err, companyId, accountId, toJid }, "OutboundQueueService: Failed to enqueue outbound message");
          return {
            success: false,
            status: "failed",
            error: err?.message || "Failed to queue message"
          };
        }
      }
    };
  }
});

// src/modules/automations/assignment.service.ts
var import_drizzle_orm10, AssignmentService;
var init_assignment_service = __esm({
  "src/modules/automations/assignment.service.ts"() {
    "use strict";
    init_client();
    init_schema();
    import_drizzle_orm10 = require("drizzle-orm");
    init_logger();
    init_ws_hub();
    init_outbound_queue_service();
    init_phone_validator();
    AssignmentService = class _AssignmentService {
      /**
       * Helper to retrieve a setting by key
       */
      static async getSetting(key, defaultValue) {
        try {
          const setting = await db.query.settings.findFirst({
            where: (0, import_drizzle_orm10.eq)(settings.key, key)
          });
          if (setting && setting.value !== void 0 && setting.value !== null) {
            return setting.value;
          }
        } catch (err) {
          logger.warn({ err, key }, "Failed to fetch setting, using fallback default");
        }
        return defaultValue;
      }
      /**
       * Find sticky agent who previously interacted with this contact.
       * Checks contact metadata (persistent assignment) first, then previous conversations.
       */
      static async findStickyAgent(contactId) {
        const [contact] = await db.select().from(contacts).where((0, import_drizzle_orm10.eq)(contacts.id, contactId)).limit(1);
        const metaAssignedEmp = contact?.metadata?.assignedEmployeeId;
        if (metaAssignedEmp) {
          const emp = await db.query.employees.findFirst({
            where: (0, import_drizzle_orm10.and)(
              (0, import_drizzle_orm10.eq)(employees.id, metaAssignedEmp),
              (0, import_drizzle_orm10.ne)(employees.status, "inactive")
            )
          });
          if (emp) {
            const user2 = await db.query.users.findFirst({
              where: (0, import_drizzle_orm10.and)(
                (0, import_drizzle_orm10.eq)(users.id, emp.userId),
                (0, import_drizzle_orm10.eq)(users.status, "active")
              )
            });
            if (user2) {
              return {
                employeeId: emp.id,
                stationId: emp.stationId || null
              };
            }
          }
        }
        const prevConv = await db.query.conversations.findFirst({
          where: (0, import_drizzle_orm10.and)(
            (0, import_drizzle_orm10.eq)(conversations.contactId, contactId),
            import_drizzle_orm10.sql`${conversations.assignedEmployeeId} IS NOT NULL`
          ),
          orderBy: [(0, import_drizzle_orm10.desc)(conversations.lastMessageAt), (0, import_drizzle_orm10.desc)(conversations.updatedAt)]
        });
        if (!prevConv || !prevConv.assignedEmployeeId) {
          return null;
        }
        const employee = await db.query.employees.findFirst({
          where: (0, import_drizzle_orm10.and)(
            (0, import_drizzle_orm10.eq)(employees.id, prevConv.assignedEmployeeId),
            (0, import_drizzle_orm10.ne)(employees.status, "inactive")
          )
        });
        if (!employee) {
          return null;
        }
        const user = await db.query.users.findFirst({
          where: (0, import_drizzle_orm10.and)(
            (0, import_drizzle_orm10.eq)(users.id, employee.userId),
            (0, import_drizzle_orm10.eq)(users.status, "active")
          )
        });
        if (!user) {
          return null;
        }
        return {
          employeeId: employee.id,
          stationId: employee.stationId || prevConv.assignedStationId
        };
      }
      /**
       * Assign conversation using Round-Robin rotation among active employees.
       * If stationId provided, tries station first; falls back to all active company employees.
       */
      static async assignRoundRobin(stationId, maxCapacity = 10) {
        if (stationId) {
          const stationResult = await db.execute(import_drizzle_orm10.sql`
        SELECT e.id, COUNT(c.id) as open_chats
        FROM employees e
        INNER JOIN users u ON u.id = e.user_id
        LEFT JOIN (
          SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at
          FROM conversations
          WHERE assigned_employee_id IS NOT NULL
          GROUP BY assigned_employee_id
        ) conv ON conv.assigned_employee_id = e.id
        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
        WHERE e.station_id = ${stationId}
          AND e.status != 'inactive'
          AND u.status = 'active'
        GROUP BY e.id, e.created_at, conv.last_assigned_at
        HAVING COUNT(c.id) < ${maxCapacity}
        ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC
        LIMIT 1
      `);
          if (stationResult.rows && stationResult.rows.length > 0) {
            return stationResult.rows[0].id;
          }
        }
        const fallbackResult = await db.execute(import_drizzle_orm10.sql`
      SELECT e.id, COUNT(c.id) as open_chats
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      LEFT JOIN (
        SELECT assigned_employee_id, MAX(assigned_at) as last_assigned_at
        FROM conversations
        WHERE assigned_employee_id IS NOT NULL
        GROUP BY assigned_employee_id
      ) conv ON conv.assigned_employee_id = e.id
      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
      WHERE e.status != 'inactive'
        AND u.status = 'active'
      GROUP BY e.id, e.created_at, conv.last_assigned_at
      HAVING COUNT(c.id) < ${maxCapacity}
      ORDER BY conv.last_assigned_at ASC NULLS FIRST, e.created_at ASC
      LIMIT 1
    `);
        if (fallbackResult.rows && fallbackResult.rows.length > 0) {
          return fallbackResult.rows[0].id;
        }
        const anyEmployee = await db.execute(import_drizzle_orm10.sql`
      SELECT e.id
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      WHERE e.status != 'inactive'
        AND u.status = 'active'
      ORDER BY e.created_at ASC
      LIMIT 1
    `);
        return anyEmployee.rows?.[0]?.id || null;
      }
      /**
       * Assign conversation to the least busy active employee.
       * If stationId provided, tries station first; falls back to all active company employees.
       */
      static async assignLeastBusy(stationId, maxCapacity = 10) {
        if (stationId) {
          const stationResult = await db.execute(import_drizzle_orm10.sql`
        SELECT e.id, COUNT(c.id) as open_chats
        FROM employees e
        INNER JOIN users u ON u.id = e.user_id
        LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
        WHERE e.station_id = ${stationId}
          AND e.status != 'inactive'
          AND u.status = 'active'
        GROUP BY e.id, e.created_at
        HAVING COUNT(c.id) < ${maxCapacity}
        ORDER BY open_chats ASC, e.created_at ASC
        LIMIT 1
      `);
          if (stationResult.rows && stationResult.rows.length > 0) {
            return stationResult.rows[0].id;
          }
        }
        const fallbackResult = await db.execute(import_drizzle_orm10.sql`
      SELECT e.id, COUNT(c.id) as open_chats
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      LEFT JOIN conversations c ON c.assigned_employee_id = e.id AND c.status = 'open'
      WHERE e.status != 'inactive'
        AND u.status = 'active'
      GROUP BY e.id, e.created_at
      HAVING COUNT(c.id) < ${maxCapacity}
      ORDER BY open_chats ASC, e.created_at ASC
      LIMIT 1
    `);
        if (fallbackResult.rows && fallbackResult.rows.length > 0) {
          return fallbackResult.rows[0].id;
        }
        return this.assignRoundRobin(null, 999);
      }
      /**
       * Fallback to supervisor or administrator if no agents are available
       */
      static async fallbackToSupervisor(stationId) {
        if (stationId) {
          const stationResult = await db.execute(import_drizzle_orm10.sql`
        SELECT e.id
        FROM employees e
        INNER JOIN users u ON u.id = e.user_id
        INNER JOIN roles r ON r.id = u.role_id
        WHERE e.station_id = ${stationId}
          AND (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')
          AND u.status = 'active'
        LIMIT 1
      `);
          if (stationResult.rows && stationResult.rows.length > 0) {
            return stationResult.rows[0].id;
          }
        }
        const result = await db.execute(import_drizzle_orm10.sql`
      SELECT e.id
      FROM employees e
      INNER JOIN users u ON u.id = e.user_id
      INNER JOIN roles r ON r.id = u.role_id
      WHERE (r.name = 'adminstrator' OR r.name = 'admin' OR r.name = 'super_admin' OR r.name = 'supervisor')
        AND u.status = 'active'
      LIMIT 1
    `);
        return result.rows?.[0]?.id || null;
      }
      /**
       * Orchestrate full automated assignment for a conversation
       */
      static async autoAssignConversation(conversationId, options) {
        const assignmentEnabled = await this.getSetting("assignment_enabled", null) ?? await this.getSetting("autoAssignmentEnabled", true);
        if (!assignmentEnabled) {
          return {
            assignedEmployeeId: null,
            assignedStationId: options?.preferredStationId || null,
            assignmentSource: "manual"
          };
        }
        const conversation = await db.query.conversations.findFirst({
          where: (0, import_drizzle_orm10.eq)(conversations.id, conversationId)
        });
        if (!conversation) {
          throw new Error(`Conversation not found: ${conversationId}`);
        }
        if (conversation.assignedEmployeeId) {
          const existingEmp = await db.query.employees.findFirst({
            where: (0, import_drizzle_orm10.and)(
              (0, import_drizzle_orm10.eq)(employees.id, conversation.assignedEmployeeId),
              (0, import_drizzle_orm10.ne)(employees.status, "inactive")
            )
          });
          if (existingEmp) {
            logger.info(
              { conversationId, employeeId: conversation.assignedEmployeeId },
              "Conversation already persistently assigned to active employee, keeping assignment"
            );
            return {
              assignedEmployeeId: conversation.assignedEmployeeId,
              assignedStationId: options?.preferredStationId || conversation.assignedStationId,
              assignmentSource: conversation.assignmentSource
            };
          }
        }
        let targetStationId = options?.preferredStationId || conversation.assignedStationId;
        if (!targetStationId) {
          const defaultStation = await db.query.stations.findFirst({
            where: (0, import_drizzle_orm10.eq)(stations.active, true)
          });
          targetStationId = defaultStation?.id || null;
        }
        const sticky = await this.findStickyAgent(conversation.contactId);
        if (sticky) {
          logger.info(
            { conversationId, employeeId: sticky.employeeId, contactId: conversation.contactId },
            "Assigned via Persistent Sticky Agent"
          );
          const targetStation = sticky.stationId || targetStationId;
          await db.update(conversations).set({
            assignedEmployeeId: sticky.employeeId,
            assignedStationId: targetStation,
            assignmentSource: "direct",
            assignedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm10.eq)(conversations.id, conversationId));
          const [cont] = await db.select().from(contacts).where((0, import_drizzle_orm10.eq)(contacts.id, conversation.contactId)).limit(1);
          if (cont) {
            const meta = cont.metadata || {};
            if (meta.assignedEmployeeId !== sticky.employeeId) {
              meta.assignedEmployeeId = sticky.employeeId;
              await db.update(contacts).set({ metadata: meta, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm10.eq)(contacts.id, cont.id));
            }
          }
          const eventPayload = {
            id: conversationId,
            conversationId,
            assignedEmployeeId: sticky.employeeId,
            assignedStationId: targetStation,
            assignmentSource: "direct"
          };
          wsHub.broadcast("conversation.updated", eventPayload);
          wsHub.broadcast("conversation_update", eventPayload);
          wsHub.broadcast("assigned", {
            conversationId,
            assignedEmployeeId: sticky.employeeId
          });
          if (!options?.skipWhatsAppNotification) {
            _AssignmentService.notifyEmployeeViaWhatsApp({
              employeeId: sticky.employeeId,
              contactId: conversation.contactId,
              conversationId,
              lastMessageText: conversation.lastMessageText,
              whatsappAccountId: conversation.whatsappAccountId,
              sourceDescription: "\u062A\u0645 \u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0644\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0635\u0641\u062A\u0643 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u062A\u0627\u0628\u0639 \u0644\u0647\u0630\u0627 \u0627\u0644\u0639\u0645\u064A\u0644"
            }).catch((e) => logger.warn({ err: e?.message }, "Failed sticky employee WhatsApp notification"));
          }
          return {
            assignedEmployeeId: sticky.employeeId,
            assignedStationId: targetStation,
            assignmentSource: "direct"
          };
        }
        const strategy = options?.forceMode || await this.getSetting("assignment_mode", null) || await this.getSetting("routingStrategy", "round_robin");
        const maxCapacity = Number(
          await this.getSetting("maxConcurrentChatsPerAgent", null) || 10
        );
        if (strategy === "manual") {
          if (targetStationId) {
            await db.update(conversations).set({
              assignedStationId: targetStationId,
              assignmentSource: "manual",
              updatedAt: /* @__PURE__ */ new Date()
            }).where((0, import_drizzle_orm10.eq)(conversations.id, conversationId));
          }
          return {
            assignedEmployeeId: null,
            assignedStationId: targetStationId,
            assignmentSource: "manual"
          };
        }
        let chosenEmployeeId = null;
        let source = "round_robin";
        if (strategy === "least_busy") {
          chosenEmployeeId = await this.assignLeastBusy(targetStationId, maxCapacity);
          source = "least_busy";
        } else {
          chosenEmployeeId = await this.assignRoundRobin(targetStationId, maxCapacity);
          source = "round_robin";
        }
        let supervisorId = null;
        if (!chosenEmployeeId) {
          supervisorId = await this.fallbackToSupervisor(targetStationId);
          if (supervisorId) {
            chosenEmployeeId = supervisorId;
            source = "system";
            logger.info(
              { conversationId, targetStationId, supervisorId },
              "No station agents found, fell back to supervisor"
            );
          }
        }
        if (chosenEmployeeId) {
          const emp = await db.query.employees.findFirst({
            where: (0, import_drizzle_orm10.eq)(employees.id, chosenEmployeeId)
          });
          const finalStationId = emp?.stationId || targetStationId;
          await db.update(conversations).set({
            assignedEmployeeId: chosenEmployeeId,
            assignedStationId: finalStationId,
            assignedSupervisorId: supervisorId,
            assignmentSource: source,
            assignedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm10.eq)(conversations.id, conversationId));
          const [cont] = await db.select().from(contacts).where((0, import_drizzle_orm10.eq)(contacts.id, conversation.contactId)).limit(1);
          if (cont) {
            const meta = cont.metadata || {};
            meta.assignedEmployeeId = chosenEmployeeId;
            await db.update(contacts).set({ metadata: meta, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm10.eq)(contacts.id, cont.id));
          }
          logger.info(
            { conversationId, chosenEmployeeId, finalStationId, source },
            "Conversation successfully auto-assigned to employee and permanently bound to contact"
          );
          const eventPayload = {
            id: conversationId,
            conversationId,
            assignedEmployeeId: chosenEmployeeId,
            assignedStationId: finalStationId,
            assignmentSource: source
          };
          wsHub.broadcast("conversation.updated", eventPayload);
          wsHub.broadcast("conversation_update", eventPayload);
          wsHub.broadcast("assigned", {
            conversationId,
            assignedEmployeeId: chosenEmployeeId
          });
          if (!options?.skipWhatsAppNotification) {
            _AssignmentService.notifyEmployeeViaWhatsApp({
              employeeId: chosenEmployeeId,
              contactId: conversation.contactId,
              conversationId,
              lastMessageText: conversation.lastMessageText,
              whatsappAccountId: conversation.whatsappAccountId,
              sourceDescription: "\u062A\u0645 \u062A\u0648\u0632\u064A\u0639 \u0645\u062D\u0627\u062F\u062B\u0629 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F\u0629 \u0625\u0644\u064A\u0643 \u0622\u0644\u064A\u0627\u064B \u0639\u0628\u0631 \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0648\u0632\u064A\u0639"
            }).catch((e) => logger.warn({ err: e?.message }, "Failed auto-assigned employee WhatsApp notification"));
          }
          return {
            assignedEmployeeId: chosenEmployeeId,
            assignedStationId: finalStationId,
            assignmentSource: source
          };
        }
        if (targetStationId) {
          await db.update(conversations).set({
            assignedStationId: targetStationId,
            assignmentSource: "system",
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm10.eq)(conversations.id, conversationId));
        }
        return {
          assignedEmployeeId: null,
          assignedStationId: targetStationId,
          assignmentSource: "system"
        };
      }
      /**
       * Send an instant WhatsApp notification to the employee's personal phone number
       * alerting them of an assigned client, with a direct wa.me link.
       */
      static async notifyEmployeeViaWhatsApp(params) {
        try {
          const [emp] = await db.select({
            id: employees.id,
            companyId: employees.companyId,
            whatsappNumber: employees.whatsappNumber,
            name: users.name
          }).from(employees).leftJoin(users, (0, import_drizzle_orm10.eq)(employees.userId, users.id)).where((0, import_drizzle_orm10.eq)(employees.id, params.employeeId)).limit(1);
          const rawEmpPhone = (emp?.whatsappNumber || "").trim();
          if (!rawEmpPhone) {
            logger.info({ employeeId: params.employeeId }, "Employee has no WhatsApp number configured, skipping alert");
            return false;
          }
          const phoneValidation = validateAndFormatPhone(rawEmpPhone);
          const cleanEmpDigits = phoneValidation.digitsOnly || rawEmpPhone.replace(/\D/g, "");
          if (!cleanEmpDigits || cleanEmpDigits.length < 8) {
            logger.warn({ employeeId: params.employeeId, raw: rawEmpPhone }, "Invalid employee phone number for WhatsApp alert");
            return false;
          }
          const [contact] = await db.select().from(contacts).where((0, import_drizzle_orm10.eq)(contacts.id, params.contactId)).limit(1);
          const contactName = contact?.name || contact?.phoneNumber || "\u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F";
          const contactPhone = contact?.phoneNumber || "";
          const cleanCustDigits = contactPhone.replace(/\D/g, "");
          const waLink = cleanCustDigits ? `https://wa.me/${cleanCustDigits}` : "";
          const lastMsg = params.lastMessageText || "\u0645\u062D\u0627\u062F\u062B\u0629 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F\u0629 \u0648\u0627\u0631\u062F\u0629 \u0639\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645";
          const employeeName = emp.name || "\u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u0646\u062F";
          const alertMessage = [
            `\u{1F514} *\u0625\u0634\u0639\u0627\u0631 \u0625\u0633\u0646\u0627\u062F \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F*`,
            `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
            `\u0645\u0631\u062D\u0628\u0627\u064B *${employeeName}*\u060C ${params.sourceDescription || "\u062A\u0645 \u0625\u0633\u0646\u0627\u062F \u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0625\u0644\u064A\u0643"}:`,
            `\u{1F464} *\u0627\u0644\u0639\u0645\u064A\u0644:* ${contactName}`,
            `\u{1F4F1} *\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064A\u0644:* ${contactPhone}`,
            lastMsg ? `\u{1F4AC} *\u0622\u062E\u0631 \u0631\u0633\u0627\u0644\u0629:* ${lastMsg}` : "",
            waLink ? `\u{1F449} *\u0631\u0627\u0628\u0637 \u0645\u062D\u0627\u062F\u062B\u0629 \u0648\u0627\u062A\u0633\u0627\u0628 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0644\u0639\u0645\u064A\u0644:* ${waLink}` : "",
            `\u23F0 *\u0627\u0644\u0648\u0642\u062A:* ${(/* @__PURE__ */ new Date()).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
            `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
            `\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0639\u0645\u064A\u0644 \u0639\u0628\u0631 \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 CRM.`
          ].filter(Boolean).join("\n");
          let accountId = params.whatsappAccountId;
          if (!accountId) {
            const [defaultAcc] = await db.select().from(whatsappAccounts).limit(1);
            if (defaultAcc)
              accountId = defaultAcc.id;
          }
          if (!accountId || !emp.companyId) {
            logger.warn({ employeeId: params.employeeId }, "Cannot dispatch assignment WhatsApp alert: No WhatsApp account or company available");
            return false;
          }
          const empJid = `${cleanEmpDigits}@s.whatsapp.net`;
          await OutboundQueueService.sendMessage({
            companyId: emp.companyId,
            accountId,
            conversationId: params.conversationId,
            toJid: empJid,
            type: "text",
            text: alertMessage,
            priority: 1
          });
          logger.info(
            { employeeId: emp.id, employeePhone: phoneValidation.formatted || rawEmpPhone, contactPhone },
            "Successfully dispatched WhatsApp assignment alert to employee personal number"
          );
          return true;
        } catch (err) {
          logger.error(
            { err: err?.message, stack: err?.stack, employeeId: params.employeeId, conversationId: params.conversationId },
            "Failed to dispatch WhatsApp assignment alert to employee"
          );
          return false;
        }
      }
    };
  }
});

// src/modules/reminders/whatsapp-reminder.parser.ts
function isReminderMessage(text19, hasQuotedMessage = false) {
  if (!text19 || typeof text19 !== "string")
    return false;
  const trimmed = text19.trim();
  const lower = trimmed.toLowerCase();
  for (const prefix of REMINDER_PREFIXES) {
    if (lower.startsWith(prefix.toLowerCase()))
      return true;
  }
  if (hasQuotedMessage) {
    if (trimmed.startsWith("\u062A\u0630\u0643\u064A\u0631 ") || trimmed.startsWith("\u0645\u0644\u0627\u062D\u0638\u0629 ") || trimmed.startsWith("\u0645\u0644\u0627\u062D\u0638\u0647 ")) {
      return true;
    }
  }
  return false;
}
function normalizeArabicDigits(str) {
  const easternDigits = ["\u0660", "\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667", "\u0668", "\u0669"];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(easternDigits[i], String(i));
  }
  return res;
}
function extractTimeHoursMinutes(str) {
  const isPM = str.includes("\u0645\u0633\u0627\u0621") || str.includes("\u0639\u0635\u0631\u0627") || str.includes("\u0639\u0635\u0631\u0627\u064B") || str.includes("\u0644\u064A\u0644\u0627") || str.includes("\u0644\u064A\u0644\u0627\u064B") || str.includes("\u0628\u0644\u064A\u0644") || str.includes("\u0628\u0627\u0644\u0644\u064A\u0644") || str.includes("pm");
  const isAM = str.includes("\u0635\u0628\u0627\u062D\u0627") || str.includes("\u0635\u0628\u0627\u062D\u0627\u064B") || str.includes("\u0627\u0644\u0635\u0628\u062D") || str.includes("\u0641\u062C\u0631\u0627") || str.includes("\u0641\u062C\u0631\u0627\u064B") || str.includes("\u0627\u0644\u0641\u062C\u0631") || str.includes("am");
  if (str.includes("\u0641\u062C\u0631") || str.includes("\u0641\u062C\u0631\u0627\u064B"))
    return { hours: 5, minutes: 0 };
  if (str.includes("\u0638\u0647\u0631") || str.includes("\u0638\u0647\u0631\u0627\u064B") || str.includes("\u0627\u0644\u0638\u0647\u0631"))
    return { hours: 12, minutes: 30 };
  if (str.includes("\u0645\u063A\u0631\u0628") || str.includes("\u0627\u0644\u0645\u063A\u0631\u0628"))
    return { hours: 18, minutes: 30 };
  const sa3aMatch = str.match(/الساعة\s*(\d{1,2})(?::(\d{2}))?/);
  let timeMatch = sa3aMatch;
  if (!timeMatch) {
    timeMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(?:صباحا|صباحاً|عصرا|عصراً|مساء|مساءً|ليلا|ليلاً|بليل|بالليل|am|pm)/i);
  }
  if (!timeMatch) {
    if (str.includes("\u0639\u0635\u0631") || str.includes("\u0639\u0635\u0631\u0627\u064B") || str.includes("\u0627\u0644\u0639\u0635\u0631"))
      return { hours: 16, minutes: 0 };
    if (str.includes("\u0639\u0634\u0627\u0621") || str.includes("\u0627\u0644\u0639\u0634\u0627\u0621") || str.includes("\u0639\u0634\u0627") || str.includes("\u0627\u0644\u0639\u0634\u0627"))
      return { hours: 20, minutes: 30 };
    if (isPM)
      return { hours: 20, minutes: 0 };
    if (isAM)
      return { hours: 10, minutes: 0 };
    return null;
  }
  let h = parseInt(timeMatch[1], 10);
  const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  if (isPM && h < 12)
    h += 12;
  if (isAM && h === 12)
    h = 0;
  if (!isAM && !isPM && h >= 1 && h <= 6)
    h += 12;
  return { hours: h, minutes: m };
}
function parseDateTime(rawInput) {
  const now = /* @__PURE__ */ new Date();
  if (!rawInput || !rawInput.trim()) {
    const fallback2 = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    return { date: fallback2, raw: "\u0628\u0639\u062F 24 \u0633\u0627\u0639\u0629 (\u0627\u0641\u062A\u0631\u0627\u0636\u064A)" };
  }
  let clean = normalizeArabicDigits(rawInput.trim().toLowerCase());
  clean = clean.replace(/كمان/g, "\u0628\u0639\u062F");
  if (clean.includes("\u0627\u0648\u0644 \u0627\u0645\u0628\u0627\u0631\u062D") || clean.includes("\u0623\u0648\u0644 \u0627\u0645\u0628\u0627\u0631\u062D") || clean.includes("\u0627\u0648\u0644 \u0627\u0645\u0633") || clean.includes("\u0623\u0648\u0644 \u0623\u0645\u0633") || clean.includes("\u0642\u0628\u0644 \u0627\u0645\u0633") || clean.includes("\u0642\u0628\u0644 \u0623\u0645\u0633")) {
    const target = new Date(now);
    target.setDate(target.getDate() - 2);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 12, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0627\u0645\u0628\u0627\u0631\u062D") || clean.includes("\u0623\u0645\u0633") || clean.includes("\u0627\u0645\u0633")) {
    const target = new Date(now);
    target.setDate(target.getDate() - 1);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 12, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0631\u0628\u0639 \u0633\u0627\u0639\u0629") || clean.includes("15 \u062F\u0642\u064A\u0642\u0629")) {
    return { date: new Date(now.getTime() + 15 * 60 * 1e3), raw: rawInput };
  }
  if (clean.includes("\u062B\u0644\u062B \u0633\u0627\u0639\u0629") || clean.includes("20 \u062F\u0642\u064A\u0642\u0629")) {
    return { date: new Date(now.getTime() + 20 * 60 * 1e3), raw: rawInput };
  }
  if (clean.includes("\u0646\u0635\u0641 \u0633\u0627\u0639\u0629") || clean.includes("\u0646\u0635 \u0633\u0627\u0639\u0629") || clean.includes("30 \u062F\u0642\u064A\u0642\u0629")) {
    return { date: new Date(now.getTime() + 30 * 60 * 1e3), raw: rawInput };
  }
  const minuteMatch = clean.match(/بعد\s+(\d+|تلات|تلاتة|ثلاث|ثلاثة|اربع|اربعة|أربع|أربعة|خمس|خمسة|عشر|عشرة)\s*(دقيقة|دقايق|دقائق)/);
  if (minuteMatch) {
    const mins = wordToNumber[minuteMatch[1]] || parseInt(minuteMatch[1], 10);
    return { date: new Date(now.getTime() + mins * 60 * 1e3), raw: rawInput };
  }
  if (clean === "\u0628\u0639\u062F \u0633\u0627\u0639\u0629" || clean.includes("\u0628\u0639\u062F \u0633\u0627\u0639\u0647") || clean.includes("\u0628\u0639\u062F \u0633\u0627\u0639\u0647 \u0648\u0627\u062D\u062F\u0647")) {
    return { date: new Date(now.getTime() + 60 * 60 * 1e3), raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u0633\u0627\u0639\u062A\u064A\u0646")) {
    return { date: new Date(now.getTime() + 2 * 60 * 60 * 1e3), raw: rawInput };
  }
  const hourMatch = clean.match(/بعد\s+(\d+|تلات|تلاتة|ثلاث|ثلاثة|اربع|اربعة|أربع|أربعة|خمس|خمسة|ست|ستة|سبع|سبعة|تمن|تمانية|ثمان|ثمانية|تسع|تسعة|عشر|عشرة)\s*(ساعات|ساعة|ساعه)/);
  if (hourMatch) {
    const hours = wordToNumber[hourMatch[1]] || parseInt(hourMatch[1], 10);
    return { date: new Date(now.getTime() + hours * 60 * 60 * 1e3), raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u064A\u0648\u0645\u064A\u0646")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 2);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u064A\u0648\u0645") || clean.includes("\u0628\u0639\u062F \u064A\u0648\u0645 \u0648\u0627\u062D\u062F")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  const dayMatch = clean.match(/بعد\s+(\d+|تلات|تلاتة|ثلاث|ثلاثة|اربع|اربعة|أربع|أربعة|خمس|خمسة|ست|ستة|سبع|سبعة|تمن|تمانية|ثمان|ثمانية|تسع|تسعة|عشر|عشرة)\s*(أيام|ايام|يوم)/);
  if (dayMatch) {
    const days = wordToNumber[dayMatch[1]] || parseInt(dayMatch[1], 10);
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u063A\u062F") || clean.includes("\u0628\u0639\u062F \u0628\u0643\u0631\u0629") || clean.includes("\u0628\u0639\u062F \u0628\u0643\u0631\u0647")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 2);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u063A\u062F\u0627") || clean.includes("\u063A\u062F\u0627\u064B") || clean.includes("\u0628\u0643\u0631\u0629") || clean.includes("\u0628\u0643\u0631\u0647")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0627\u0644\u064A\u0648\u0645") || clean.includes("\u0627\u0644\u0646\u0647\u0627\u0631\u062F\u0629") || clean.includes("\u0627\u0644\u0646\u0647\u0627\u0631\u062F\u0647")) {
    const target = new Date(now);
    const t = extractTimeHoursMinutes(clean);
    if (t) {
      target.setHours(t.hours, t.minutes, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return { date: target, raw: rawInput };
    }
  }
  if (clean.includes("\u0627\u0648\u0644 \u0627\u0644\u0627\u0633\u0628\u0648\u0639 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u0623\u0648\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u0627\u0648\u0644 \u0627\u0644\u0627\u0633\u0628\u0648\u0639 \u0627\u0644\u0642\u0627\u062F\u0645") || clean.includes("\u0623\u0648\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0642\u0627\u062F\u0645")) {
    const target = new Date(now);
    const currentDay = target.getDay();
    const daysUntilNextSunday = (7 - currentDay) % 7 === 0 ? 7 : 7 - currentDay;
    target.setDate(target.getDate() + daysUntilNextSunday);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0627\u0633\u0628\u0648\u0639 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0627\u0633\u0628\u0648\u0639 \u0627\u0644\u0642\u0627\u062F\u0645") || clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0642\u0627\u062F\u0645")) {
    const target = new Date(now);
    const currentDay = target.getDay();
    const daysUntilNextSunday = (7 - currentDay) % 7 === 0 ? 7 : 7 - currentDay;
    target.setDate(target.getDate() + daysUntilNextSunday + 3);
    target.setHours(12, 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0627\u0633\u0628\u0648\u0639") || clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 3);
    target.setHours(12, 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0627\u062E\u0631 \u0627\u0644\u0627\u0633\u0628\u0648\u0639") || clean.includes("\u0622\u062E\u0631 \u0627\u0644\u0623\u0633\u0628\u0648\u0639") || clean.includes("\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0633\u0628\u0648\u0639") || clean.includes("\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639")) {
    const target = new Date(now);
    const currentDay = target.getDay();
    const daysUntilThursday = (4 - currentDay + 7) % 7 || 7;
    target.setDate(target.getDate() + daysUntilThursday);
    target.setHours(14, 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u0627\u0633\u0628\u0648\u0639\u064A\u0646") || clean.includes("\u0628\u0639\u062F \u0623\u0633\u0628\u0648\u0639\u064A\u0646")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 14);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u0627\u0633\u0628\u0648\u0639") || clean.includes("\u0628\u0639\u062F \u0623\u0633\u0628\u0648\u0639") || clean.includes("\u0627\u0644\u0627\u0633\u0628\u0648\u0639 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u0627\u0644\u0627\u0633\u0628\u0648\u0639 \u0627\u0644\u0642\u0627\u062F\u0645") || clean.includes("\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0642\u0627\u062F\u0645")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 7);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0627\u0648\u0644 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u0623\u0648\u0644 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u0627\u0648\u0644 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0642\u0627\u062F\u0645") || clean.includes("\u0623\u0648\u0644 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0642\u0627\u062F\u0645")) {
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0);
    const t = extractTimeHoursMinutes(clean);
    if (t)
      target.setHours(t.hours, t.minutes, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0642\u0627\u062F\u0645")) {
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 15, 12, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u062E\u0644\u0627\u0644 \u0627\u0644\u0634\u0647\u0631")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 14);
    target.setHours(12, 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0627\u062E\u0631 \u0627\u0644\u0634\u0647\u0631") || clean.includes("\u0622\u062E\u0631 \u0627\u0644\u0634\u0647\u0631") || clean.includes("\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0634\u0647\u0631")) {
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 14, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u0634\u0647\u0631\u064A\u0646")) {
    const target = new Date(now);
    target.setMonth(target.getMonth() + 2);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  if (clean.includes("\u0628\u0639\u062F \u0634\u0647\u0631") || clean.includes("\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062C\u0627\u064A") || clean.includes("\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0642\u0627\u062F\u0645")) {
    const target = new Date(now);
    target.setMonth(target.getMonth() + 1);
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  for (const [dayName, dayIndex] of Object.entries(weekdays)) {
    if (clean.includes(`\u064A\u0648\u0645 ${dayName}`) || clean.includes(`${dayName} \u0627\u0644\u062C\u0627\u064A`) || clean.includes(`${dayName} \u0627\u0644\u0642\u0627\u062F\u0645`)) {
      const target = new Date(now);
      const currentDay = target.getDay();
      const diff = (dayIndex - currentDay + 7) % 7 || 7;
      target.setDate(target.getDate() + diff);
      const t = extractTimeHoursMinutes(clean);
      target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
      return { date: target, raw: rawInput };
    }
  }
  const monthNamesPattern = Object.keys(arabicMonths).join("|");
  const namedDateRegex = new RegExp(`(?:\u064A\u0648\u0645\\s+)?(\\d{1,2})\\s*(?:\u0645\u0646\\s+)?(${monthNamesPattern})(?:\\s+(\\d{4}))?`, "i");
  const namedMatch = clean.match(namedDateRegex);
  if (namedMatch) {
    const day = parseInt(namedMatch[1], 10);
    const month = arabicMonths[namedMatch[2]];
    let year = namedMatch[3] ? parseInt(namedMatch[3], 10) : now.getFullYear();
    const target = new Date(year, month, day);
    if (!namedMatch[3] && target.getTime() < now.getTime()) {
      target.setFullYear(year + 1);
    }
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  const dmyMatch = clean.match(/(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{4}))?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : now.getFullYear();
    const target = new Date(year, month, day);
    if (!dmyMatch[3] && target.getTime() < now.getTime()) {
      target.setFullYear(year + 1);
    }
    const t = extractTimeHoursMinutes(clean);
    target.setHours(t ? t.hours : 10, t ? t.minutes : 0, 0, 0);
    return { date: target, raw: rawInput };
  }
  const tOnly = extractTimeHoursMinutes(clean);
  if (tOnly) {
    const target = new Date(now);
    target.setHours(tOnly.hours, tOnly.minutes, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return { date: target, raw: rawInput };
  }
  const fallback = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
  return { date: fallback, raw: rawInput };
}
function extractClientPhoneNumber(text19, quotedContext) {
  const explicitMatch = text19.match(/(?:العميل|الرقم|الهاتف|رقم|هاتف|client|phone)[\s:]*([+\d\s\-\(\)]{8,20})/i);
  if (explicitMatch && explicitMatch[1]) {
    const val = validateAndFormatPhone(explicitMatch[1]);
    if (val.isValid && val.formatted)
      return val.formatted;
    const digits = explicitMatch[1].replace(/\D/g, "");
    if (digits.length >= 8)
      return digits;
  }
  if (quotedContext) {
    const waLinkMatch = quotedContext.match(/wa\.me\/(\d{8,16})/);
    if (waLinkMatch && waLinkMatch[1]) {
      const val = validateAndFormatPhone(waLinkMatch[1]);
      return val.formatted || waLinkMatch[1];
    }
    const quotedPhoneMatch = quotedContext.match(/(?:رقم العميل|العميل)[\s:*]*([+\d\s\-]{8,20})/);
    if (quotedPhoneMatch && quotedPhoneMatch[1]) {
      const val = validateAndFormatPhone(quotedPhoneMatch[1]);
      if (val.isValid && val.formatted)
        return val.formatted;
    }
    const genericPhone = quotedContext.match(/\+?\d{10,15}/);
    if (genericPhone && genericPhone[0]) {
      const val = validateAndFormatPhone(genericPhone[0]);
      if (val.isValid && val.formatted)
        return val.formatted;
    }
  }
  return void 0;
}
function parseReminderCommand(messageText, quotedContext) {
  if (!isReminderMessage(messageText, Boolean(quotedContext))) {
    return null;
  }
  let normalizedText = messageText;
  const keywordPattern = /\s+(?=(?:العنوان|الموضوع|عنوان|title|الموعد|التاريخ|الوقت|تاريخ|وقت|due|date|time|التفاصيل|الملاحظة|ملاحظة|تفاصيل|الملاحظه|ملاحظه|note|details|العميل|الرقم|الهاتف|رقم|هاتف|client|phone)\s*[:：])/gi;
  normalizedText = normalizedText.replace(keywordPattern, "\n");
  const rawLines = normalizedText.split("\n").map((l) => l.trim()).filter(Boolean);
  let title = "";
  let dueAtText = "";
  let noteText = "";
  let clientPhone;
  for (const line of rawLines) {
    let cleanLine = line;
    for (const prefix of REMINDER_PREFIXES) {
      if (cleanLine.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleanLine = cleanLine.slice(prefix.length);
        break;
      }
    }
    cleanLine = cleanLine.replace(/^[#*_\-\s:]+/, "").trim();
    if (/^(العنوان|الموضوع|عنوان|title)\s*[:：]+/i.test(cleanLine)) {
      title = cleanLine.replace(/^(العنوان|الموضوع|عنوان|title)\s*[:：]+/i, "").trim();
    } else if (/^(الموعد|التاريخ|الوقت|تاريخ|وقت|due|date|time)\s*[:：]+/i.test(cleanLine)) {
      dueAtText = cleanLine.replace(/^(الموعد|التاريخ|الوقت|تاريخ|وقت|due|date|time)\s*[:：]+/i, "").trim();
    } else if (/^(التفاصيل|الملاحظة|ملاحظة|تفاصيل|الملاحظه|ملاحظه|note|details)\s*[:：]+/i.test(cleanLine)) {
      noteText = cleanLine.replace(/^(التفاصيل|الملاحظة|ملاحظة|تفاصيل|الملاحظه|ملاحظه|note|details)\s*[:：]+/i, "").trim();
    } else if (/^(العميل|الرقم|الهاتف|رقم|هاتف|client|phone)\s*[:：]+/i.test(cleanLine)) {
      const p = cleanLine.replace(/^(العميل|الرقم|الهاتف|رقم|هاتف|client|phone)\s*[:：]+/i, "").trim();
      const val = validateAndFormatPhone(p);
      if (val.isValid && val.formatted) {
        clientPhone = val.formatted;
      } else {
        const digits = p.replace(/\D/g, "");
        if (digits.length >= 8) {
          clientPhone = digits;
        }
      }
    }
  }
  if (!title && rawLines.length > 0) {
    const firstLine = rawLines[0];
    let stripped = firstLine;
    for (const prefix of REMINDER_PREFIXES) {
      if (stripped.toLowerCase().startsWith(prefix.toLowerCase())) {
        stripped = stripped.slice(prefix.length).trim();
        break;
      }
    }
    stripped = stripped.replace(/^[\s:\-_]+/, "").trim();
    if (stripped.includes("-")) {
      const parts = stripped.split("-");
      if (!dueAtText && parts.length >= 2) {
        dueAtText = parts[0].trim();
        title = parts.slice(1).join("-").trim();
      } else {
        title = stripped;
      }
    } else if (!dueAtText && /^(بعد\s+|غدا|غداً|بكرة|بكره|اليوم)/.test(stripped)) {
      dueAtText = stripped;
      title = "\u062A\u0630\u0643\u064A\u0631 \u0645\u062A\u0627\u0628\u0639\u0629";
    } else {
      title = stripped;
    }
  }
  if (!noteText && rawLines.length > 1) {
    const restLines = rawLines.slice(1).filter((l) => {
      const isKv = /^(العنوان|الموعد|التاريخ|الوقت|العميل|الرقم|الهاتف)[\s:]+/i.test(l.replace(/^[#*_\-\s]+/, ""));
      return !isKv;
    });
    if (restLines.length > 0) {
      noteText = restLines.join("\n");
    }
  }
  if (!title) {
    title = noteText ? noteText.slice(0, 50) : "\u062A\u0630\u0643\u064A\u0631 \u0645\u062A\u0627\u0628\u0639\u0629";
  }
  if (!clientPhone) {
    clientPhone = extractClientPhoneNumber(messageText, quotedContext);
  }
  const { date: dueAt, raw: parsedRawDue } = parseDateTime(dueAtText);
  return {
    isReminder: true,
    title,
    note: noteText || void 0,
    dueAt,
    rawDueAtText: dueAtText || parsedRawDue,
    clientPhone
  };
}
var REMINDER_PREFIXES, wordToNumber, arabicMonths, weekdays;
var init_whatsapp_reminder_parser = __esm({
  "src/modules/reminders/whatsapp-reminder.parser.ts"() {
    "use strict";
    init_phone_validator();
    REMINDER_PREFIXES = [
      "#\u062A\u0630\u0643\u064A\u0631",
      "#\u0645\u0644\u0627\u062D\u0638\u0629",
      "#\u0645\u0644\u0627\u062D\u0638\u0647",
      "#\u0631\u064A\u0645\u064A\u0646\u062F\u0631",
      "\u062A\u0630\u0643\u064A\u0631:",
      "\u0645\u0644\u0627\u062D\u0638\u0629:",
      "\u0645\u0644\u0627\u062D\u0638\u0647:",
      "\u0631\u064A\u0645\u064A\u0646\u062F\u0631:",
      "/reminder",
      "/note",
      "#reminder",
      "#note"
    ];
    wordToNumber = {
      "\u0648\u0627\u062D\u062F": 1,
      "\u0648\u0627\u062D\u062F\u0629": 1,
      "\u064A\u0648\u0645": 1,
      "\u0634\u0647\u0631": 1,
      "\u0633\u0627\u0639\u0629": 1,
      "\u0627\u0633\u0628\u0648\u0639": 1,
      "\u0623\u0633\u0628\u0648\u0639": 1,
      "\u064A\u0648\u0645\u064A\u0646": 2,
      "\u0633\u0627\u0639\u062A\u064A\u0646": 2,
      "\u0627\u0633\u0628\u0648\u0639\u064A\u0646": 2,
      "\u0623\u0633\u0628\u0648\u0639\u064A\u0646": 2,
      "\u0634\u0647\u0631\u064A\u0646": 2,
      "\u0627\u062A\u0646\u064A\u0646": 2,
      "\u0627\u062B\u0646\u064A\u0646": 2,
      "\u062A\u0644\u0627\u062A": 3,
      "\u062A\u0644\u0627\u062A\u0629": 3,
      "\u062B\u0644\u0627\u062B": 3,
      "\u062B\u0644\u0627\u062B\u0629": 3,
      "\u0627\u0631\u0628\u0639": 4,
      "\u0627\u0631\u0628\u0639\u0629": 4,
      "\u0623\u0631\u0628\u0639": 4,
      "\u0623\u0631\u0628\u0639\u0629": 4,
      "\u062E\u0645\u0633": 5,
      "\u062E\u0645\u0633\u0629": 5,
      "\u0633\u062A": 6,
      "\u0633\u062A\u0629": 6,
      "\u0633\u0628\u0639": 7,
      "\u0633\u0628\u0639\u0629": 7,
      "\u062A\u0645\u0646": 8,
      "\u062A\u0645\u0627\u0646\u064A\u0629": 8,
      "\u062B\u0645\u0627\u0646": 8,
      "\u062B\u0645\u0627\u0646\u064A\u0629": 8,
      "\u062A\u0633\u0639": 9,
      "\u062A\u0633\u0639\u0629": 9,
      "\u0639\u0634\u0631": 10,
      "\u0639\u0634\u0631\u0629": 10
    };
    arabicMonths = {
      "\u064A\u0646\u0627\u064A\u0631": 0,
      "\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A": 0,
      "\u0641\u0628\u0631\u0627\u064A\u0631": 1,
      "\u0634\u0628\u0627\u0637": 1,
      "\u0645\u0627\u0631\u0633": 2,
      "\u0627\u0630\u0627\u0631": 2,
      "\u0622\u0630\u0627\u0631": 2,
      "\u0627\u0628\u0631\u064A\u0644": 3,
      "\u0623\u0628\u0631\u064A\u0644": 3,
      "\u0646\u064A\u0633\u0627\u0646": 3,
      "\u0645\u0627\u064A\u0648": 4,
      "\u0627\u064A\u0627\u0631": 4,
      "\u0623\u064A\u0627\u0631": 4,
      "\u064A\u0648\u0646\u064A\u0648": 5,
      "\u062D\u0632\u064A\u0631\u0627\u0646": 5,
      "\u064A\u0648\u0644\u064A\u0648": 6,
      "\u062A\u0645\u0648\u0632": 6,
      "\u0627\u063A\u0633\u0637\u0633": 7,
      "\u0623\u063A\u0633\u0637\u0633": 7,
      "\u0627\u0628": 7,
      "\u0622\u0628": 7,
      "\u0633\u0628\u062A\u0645\u0628\u0631": 8,
      "\u0627\u064A\u0644\u0648\u0644": 8,
      "\u0623\u064A\u0644\u0648\u0644": 8,
      "\u0627\u0643\u062A\u0648\u0628\u0631": 9,
      "\u0623\u0643\u062A\u0648\u0628\u0631": 9,
      "\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u0627\u0648\u0644": 9,
      "\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u0623\u0648\u0644": 9,
      "\u0646\u0648\u0641\u0645\u0628\u0631": 10,
      "\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A": 10,
      "\u062F\u064A\u0633\u0645\u0628\u0631": 11,
      "\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0627\u0648\u0644": 11,
      "\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0623\u0648\u0644": 11
    };
    weekdays = {
      "\u0627\u0644\u0627\u062D\u062F": 0,
      "\u0627\u0644\u0623\u062D\u062F": 0,
      "\u0627\u062D\u062F": 0,
      "\u0623\u062D\u062F": 0,
      "\u0627\u0644\u0627\u062B\u0646\u064A\u0646": 1,
      "\u0627\u0644\u0625\u062B\u0646\u064A\u0646": 1,
      "\u0627\u062B\u0646\u064A\u0646": 1,
      "\u0625\u062B\u0646\u064A\u0646": 1,
      "\u062A\u0646\u064A\u0646": 1,
      "\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621": 2,
      "\u0627\u0644\u062A\u0644\u0627\u062A": 2,
      "\u062B\u0644\u0627\u062B\u0627\u0621": 2,
      "\u062A\u0644\u0627\u062A": 2,
      "\u062B\u0644\u0627\u062B": 2,
      "\u0627\u0644\u0627\u0631\u0628\u0639\u0627\u0621": 3,
      "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621": 3,
      "\u0627\u0644\u0627\u0631\u0628\u0639": 3,
      "\u0627\u0644\u0623\u0631\u0628\u0639": 3,
      "\u0627\u0631\u0628\u0639\u0627\u0621": 3,
      "\u0623\u0631\u0628\u0639\u0627\u0621": 3,
      "\u0627\u0644\u062E\u0645\u064A\u0633": 4,
      "\u062E\u0645\u064A\u0633": 4,
      "\u0627\u0644\u062C\u0645\u0639\u0629": 5,
      "\u0627\u0644\u062C\u0645\u0639\u0647": 5,
      "\u062C\u0645\u0639\u0629": 5,
      "\u062C\u0645\u0639\u0647": 5,
      "\u0627\u0644\u0633\u0628\u062A": 6,
      "\u0633\u0628\u062A": 6
    };
  }
});

// src/modules/reminders/whatsapp-reminder.service.ts
var import_drizzle_orm11, WhatsAppReminderService;
var init_whatsapp_reminder_service = __esm({
  "src/modules/reminders/whatsapp-reminder.service.ts"() {
    "use strict";
    init_client();
    init_schema();
    import_drizzle_orm11 = require("drizzle-orm");
    init_logger();
    init_ws_hub();
    init_whatsapp_reminder_parser();
    init_session_manager();
    WhatsAppReminderService = class {
      /**
       * Checks if an incoming message is a reminder command from an authorized employee or admin.
       * If so, parses and records the reminder, links it to the conversation/client,
       * sends an instant confirmation to the employee on WhatsApp, and updates WebSocket clients.
       */
      static async handleIncomingReminder(params) {
        try {
          const {
            senderPhoneOrJid,
            messageText,
            quotedMessageText,
            accountId,
            isFromMe,
            remoteJid,
            currentConversationId,
            currentContact,
            provider
          } = params;
          if (!isReminderMessage(messageText, Boolean(quotedMessageText))) {
            return { handled: false };
          }
          const cleanSenderDigits = senderPhoneOrJid.split("@")[0].replace(/\D/g, "");
          const allEmployees = await db.select({
            id: employees.id,
            userId: employees.userId,
            whatsappNumber: employees.whatsappNumber,
            status: employees.status,
            userName: users.name,
            userEmail: users.email
          }).from(employees).leftJoin(users, (0, import_drizzle_orm11.eq)(employees.userId, users.id));
          let matchedEmployee = allEmployees.find((emp) => {
            if (!emp.whatsappNumber)
              return false;
            const empDigits = emp.whatsappNumber.replace(/\D/g, "");
            return empDigits === cleanSenderDigits || cleanSenderDigits.endsWith(empDigits) || empDigits.endsWith(cleanSenderDigits);
          });
          if (!matchedEmployee && currentContact?.phoneNumber) {
            const contactDigits = currentContact.phoneNumber.replace(/\D/g, "");
            if (contactDigits) {
              matchedEmployee = allEmployees.find((emp) => {
                if (!emp.whatsappNumber)
                  return false;
                const empDigits = emp.whatsappNumber.replace(/\D/g, "");
                return empDigits === contactDigits || contactDigits.endsWith(empDigits) || empDigits.endsWith(contactDigits);
              });
            }
          }
          if (!matchedEmployee && (remoteJid?.endsWith("@lid") || senderPhoneOrJid.endsWith("@lid")) && provider) {
            const lid = remoteJid?.endsWith("@lid") ? remoteJid : senderPhoneOrJid;
            const resolvedPhone = await provider.getPhoneNumberForLid(lid);
            if (resolvedPhone) {
              const resDigits = resolvedPhone.replace(/\D/g, "");
              matchedEmployee = allEmployees.find((emp) => {
                if (!emp.whatsappNumber)
                  return false;
                const empDigits = emp.whatsappNumber.replace(/\D/g, "");
                return empDigits === resDigits || resDigits.endsWith(empDigits) || empDigits.endsWith(resDigits);
              });
            }
          }
          if (!matchedEmployee) {
            const [acc] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm11.eq)(whatsappAccounts.id, accountId)).limit(1);
            const isAccountOwner = isFromMe || acc?.phoneNumber && (cleanSenderDigits === acc.phoneNumber.replace(/\D/g, "") || cleanSenderDigits.endsWith(acc.phoneNumber.replace(/\D/g, "")) || acc.phoneNumber.replace(/\D/g, "").endsWith(cleanSenderDigits));
            if (isAccountOwner && acc) {
              const [companyEmp] = await db.select({
                id: employees.id,
                userId: employees.userId,
                whatsappNumber: employees.whatsappNumber,
                status: employees.status,
                userName: users.name,
                userEmail: users.email
              }).from(employees).leftJoin(users, (0, import_drizzle_orm11.eq)(employees.userId, users.id)).where((0, import_drizzle_orm11.eq)(employees.companyId, acc.companyId)).limit(1);
              if (companyEmp) {
                matchedEmployee = companyEmp;
              } else {
                const [firstUser] = await db.select({
                  id: users.id,
                  name: users.name,
                  email: users.email
                }).from(users).limit(1);
                if (firstUser) {
                  matchedEmployee = {
                    id: firstUser.id,
                    userId: firstUser.id,
                    whatsappNumber: acc.phoneNumber,
                    status: "active",
                    userName: firstUser.name,
                    userEmail: firstUser.email
                  };
                }
              }
            }
          }
          if (!matchedEmployee || matchedEmployee.status === "inactive") {
            return { handled: false, reason: "sender_not_an_employee" };
          }
          const parsed2 = parseReminderCommand(messageText, quotedMessageText || void 0);
          if (!parsed2) {
            return { handled: false, reason: "parse_failed" };
          }
          let targetContact = currentContact;
          let targetConversation;
          if (currentConversationId) {
            const [curConv] = await db.select().from(conversations).where((0, import_drizzle_orm11.eq)(conversations.id, currentConversationId)).limit(1);
            if (curConv)
              targetConversation = curConv;
          }
          if (parsed2.clientPhone) {
            const cleanCustDigits = parsed2.clientPhone.replace(/\D/g, "");
            const foundContacts = await db.select().from(contacts).where((0, import_drizzle_orm11.ilike)(contacts.phoneNumber, `%${cleanCustDigits.slice(-9)}%`)).limit(1);
            if (foundContacts.length > 0) {
              targetContact = foundContacts[0];
              const foundConversations = await db.select().from(conversations).where((0, import_drizzle_orm11.eq)(conversations.contactId, targetContact.id)).orderBy((0, import_drizzle_orm11.desc)(conversations.updatedAt)).limit(1);
              if (foundConversations.length > 0) {
                targetConversation = foundConversations[0];
              }
            }
          }
          let targetLeadId = null;
          if (targetContact) {
            const [lead] = await db.select({ id: leads.id }).from(leads).where((0, import_drizzle_orm11.eq)(leads.contactId, targetContact.id)).limit(1);
            if (lead) {
              targetLeadId = lead.id;
            }
          }
          const [newReminder] = await db.insert(reminders).values({
            assignedUserId: matchedEmployee.userId,
            conversationId: targetConversation ? targetConversation.id : null,
            leadId: targetLeadId,
            title: parsed2.title,
            note: parsed2.note || null,
            dueAt: parsed2.dueAt,
            status: "pending",
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          logger.info(
            {
              reminderId: newReminder.id,
              employeeId: matchedEmployee.id,
              employeeName: matchedEmployee.userName,
              clientPhone: parsed2.clientPhone || targetContact?.phoneNumber,
              dueAt: parsed2.dueAt.toISOString(),
              title: parsed2.title
            },
            "WhatsApp in-chat reminder successfully created and recorded"
          );
          const broadcastPayload = {
            ...newReminder,
            dueAt: newReminder.dueAt.toISOString(),
            assignedUserName: matchedEmployee.userName,
            contactName: targetContact?.name || null,
            contactPhone: targetContact?.phoneNumber || parsed2.clientPhone || null
          };
          wsHub.broadcast("reminder.created", broadcastPayload);
          wsHub.broadcast("reminders.update", broadcastPayload);
          let activeProvider = provider;
          if (!activeProvider || activeProvider.connectionState?.status !== "connected") {
            for (const [, p] of sessionManager.getActiveSessions()) {
              if (p.connectionState?.status === "connected") {
                activeProvider = p;
                break;
              }
            }
          }
          if (activeProvider && activeProvider.connectionState?.status === "connected") {
            const clientDisplayName = targetContact?.name && targetContact.name !== targetContact.phoneNumber ? `${targetContact.name} (${targetContact.phoneNumber})` : targetContact?.phoneNumber || parsed2.clientPhone || "\u0639\u0627\u0645 (\u0645\u0631\u0628\u0648\u0637 \u0628\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629)";
            const formattedDateString = parsed2.dueAt.toLocaleString("ar-EG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
            const confirmationMessage = [
              `\u2705 *\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u062A\u0630\u0643\u064A\u0631 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u0646\u062C\u0627\u062D!*`,
              `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
              `\u{1F4CC} *\u0627\u0644\u0639\u0646\u0648\u0627\u0646:* ${parsed2.title}`,
              `\u{1F464} *\u0627\u0644\u0639\u0645\u064A\u0644:* ${clientDisplayName}`,
              `\u23F0 *\u0645\u0648\u0639\u062F \u0627\u0644\u062A\u0646\u0628\u064A\u0647:* ${formattedDateString}`,
              parsed2.note ? `\u{1F4DD} *\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644:* ${parsed2.note}` : "",
              `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
              `\u{1F514} \u0633\u064A\u0642\u0648\u0645 \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u062A\u0646\u0628\u064A\u0647\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0641\u0648\u0631 \u062D\u0644\u0648\u0644 \u0627\u0644\u0645\u0648\u0639\u062F.`
            ].filter(Boolean).join("\n");
            const replyJid = remoteJid || `${cleanSenderDigits}@s.whatsapp.net`;
            await activeProvider.sendText(replyJid, confirmationMessage);
            logger.info({ replyJid, reminderId: newReminder.id }, "Dispatched WhatsApp confirmation for in-chat reminder");
          }
          return {
            handled: true,
            reminderId: newReminder.id
          };
        } catch (err) {
          logger.error(
            { err: err?.message, stack: err?.stack, sender: params.senderPhoneOrJid },
            "Error handling in-chat WhatsApp reminder command"
          );
          return { handled: false, reason: err?.message };
        }
      }
    };
  }
});

// src/services/landing-sync.service.ts
var import_drizzle_orm12, LandingSyncService;
var init_landing_sync_service = __esm({
  "src/services/landing-sync.service.ts"() {
    "use strict";
    import_drizzle_orm12 = require("drizzle-orm");
    init_client();
    init_schema();
    init_config();
    init_logger();
    init_settings_service();
    LandingSyncService = class {
      /**
       * Normalize any phone number (especially Egyptian numbers) into the 11-digit
       * local mobile format (01xxxxxxxxx) expected by the landing page validator.
       */
      static normalizeMobile(rawPhone) {
        if (!rawPhone)
          return "";
        let digits = rawPhone.replace(/\D/g, "");
        if (digits.startsWith("20") && digits.length === 12 && /^201[0125]/.test(digits)) {
          return "0" + digits.slice(2);
        }
        if (digits.startsWith("0020") && digits.length === 14) {
          return "0" + digits.slice(4);
        }
        if (/^01[0125][0-9]{8}$/.test(digits)) {
          return digits;
        }
        if (/^1[0125][0-9]{8}$/.test(digits)) {
          return "0" + digits;
        }
        return digits;
      }
      /**
       * Resolve the contact's name. If no valid name exists on WhatsApp or it equals the phone number,
       * provide a clean default to satisfy the landing page's mandatory full_name requirement.
       */
      static resolveContactName(contact) {
        const rawName = (contact.name || "").trim();
        const rawPhone = (contact.phoneNumber || "").trim();
        const pushName = (contact.metadata?.whatsappPushName || "").trim();
        if (rawName && rawName !== rawPhone && !/^\+?[0-9\s\-()]+$/.test(rawName)) {
          return rawName;
        }
        if (pushName && pushName !== rawPhone && !/^\+?[0-9\s\-()]+$/.test(pushName)) {
          return pushName;
        }
        return "\u0639\u0645\u064A\u0644 \u0648\u0627\u062A\u0633\u0627\u0628";
      }
      /**
       * Synchronize contact directly to the Trinity Vision landing page API.
       * Performs deduplication check and records sync status in contact metadata.
       */
      static async syncContact(contact) {
        let isSyncEnabled = config.LANDING_SYNC_ENABLED;
        try {
          const dbEnabled = await SettingsService.get("landingSyncEnabled");
          if (dbEnabled !== void 0 && dbEnabled !== null) {
            isSyncEnabled = dbEnabled === true || dbEnabled === "true";
          }
        } catch {
        }
        if (!isSyncEnabled) {
          logger.info({ contactId: contact.id }, "Landing page sync is disabled in settings, skipping");
          return { success: false, message: "Landing page sync is disabled in settings" };
        }
        const contactMeta = contact.metadata || {};
        if (contactMeta.trinityLandingSynced === true) {
          logger.debug(
            { contactId: contact.id, phoneNumber: contact.phoneNumber },
            "Contact already synced to Trinity Vision landing page, skipping"
          );
          return { success: true, message: "Already synced" };
        }
        const mobile = this.normalizeMobile(contact.phoneNumber);
        const fullName = this.resolveContactName(contact);
        const payload = {
          full_name: fullName,
          mobile,
          governorate: "\u0643\u0641\u0631 \u0627\u0644\u0634\u064A\u062E",
          notes: "\u0645\u0633\u062C\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628 \u0627\u0644\u0623\u062F\u0645\u0646 CRM",
          ad_code: "whatsapp_crm"
        };
        let targetUrl = config.LANDING_SYNC_URL;
        try {
          const dbUrl = await SettingsService.get("landingSyncUrl");
          if (dbUrl && typeof dbUrl === "string" && dbUrl.trim() !== "") {
            targetUrl = dbUrl.trim();
          }
        } catch {
        }
        try {
          logger.info(
            { contactId: contact.id, mobile, fullName, targetUrl },
            "Sending contact to Trinity Vision landing page"
          );
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1e4);
          const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json, text/plain, */*",
              "User-Agent": "TrentyVision-WhatsAppCRM/1.0"
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          let responseData = null;
          try {
            responseData = await response.json();
          } catch {
          }
          const isSuccess = response.ok && (!responseData || responseData.success !== false);
          if (isSuccess) {
            const updatedMeta = {
              ...contactMeta,
              trinityLandingSynced: true,
              trinityLandingSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
              trinityLandingResponse: responseData || { status: response.status }
            };
            await db.update(contacts).set({ metadata: updatedMeta, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm12.eq)(contacts.id, contact.id));
            logger.info(
              { contactId: contact.id, mobile, status: response.status },
              "Contact successfully synced to Trinity Vision landing page"
            );
            return {
              success: true,
              status: response.status,
              message: responseData?.message || "Successfully registered",
              payload
            };
          } else {
            const errorMsg = responseData?.message || `Landing page server responded with HTTP ${response.status}: ${response.statusText}`;
            const updatedMeta = {
              ...contactMeta,
              trinityLandingSynced: false,
              trinityLandingLastAttempt: (/* @__PURE__ */ new Date()).toISOString(),
              trinityLandingLastError: errorMsg,
              trinityLandingHttpStatus: response.status
            };
            await db.update(contacts).set({ metadata: updatedMeta, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm12.eq)(contacts.id, contact.id));
            logger.warn(
              { contactId: contact.id, mobile, status: response.status, error: errorMsg },
              "Trinity Vision landing page returned non-success response during contact sync"
            );
            return {
              success: false,
              status: response.status,
              message: errorMsg,
              payload
            };
          }
        } catch (err) {
          const errorMsg = err.name === "AbortError" ? "Connection timed out (10s)" : err.message || "Unknown network error";
          try {
            const updatedMeta = {
              ...contactMeta,
              trinityLandingSynced: false,
              trinityLandingLastAttempt: (/* @__PURE__ */ new Date()).toISOString(),
              trinityLandingLastError: errorMsg
            };
            await db.update(contacts).set({ metadata: updatedMeta, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm12.eq)(contacts.id, contact.id));
          } catch (dbErr) {
            logger.error({ contactId: contact.id, dbErr }, "Failed to persist landing sync error to contact metadata");
          }
          logger.warn(
            { contactId: contact.id, mobile, error: errorMsg },
            "Network/connection error when syncing contact to Trinity Vision landing page"
          );
          return {
            success: false,
            message: errorMsg,
            payload
          };
        }
      }
      /**
       * Non-blocking asynchronous sync execution. Fire-and-forget so that
       * WhatsApp incoming message handling is never delayed or blocked.
       */
      static syncContactAsync(contact) {
        setImmediate(() => {
          this.syncContact(contact).catch((err) => {
            logger.error({ contactId: contact.id, err }, "Unhandled error in syncContactAsync");
          });
        });
      }
    };
  }
});

// src/modules/automations/rules.engine.ts
var rules_engine_exports = {};
__export(rules_engine_exports, {
  RulesEngine: () => RulesEngine
});
var import_drizzle_orm13, RulesEngine;
var init_rules_engine = __esm({
  "src/modules/automations/rules.engine.ts"() {
    "use strict";
    init_client();
    init_schema();
    import_drizzle_orm13 = require("drizzle-orm");
    init_logger();
    init_outbound_queue_service();
    init_ws_hub();
    init_assignment_service();
    RulesEngine = class {
      /**
       * Check if current time is within configured business hours
       */
      static async isWithinBusinessHours(date = /* @__PURE__ */ new Date()) {
        const config2 = await AssignmentService.getSetting("business_hours", null);
        const scheduleByDay = await AssignmentService.getSetting("businessHours", null);
        if (config2 && config2.enabled === false) {
          return true;
        }
        try {
          const tz = config2?.timezone || "Asia/Kuwait";
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "numeric",
            minute: "numeric",
            hour12: false,
            weekday: "short"
          });
          const parts = formatter.formatToParts(date);
          let hour = 0;
          let minute = 0;
          let weekdayStr = "";
          for (const p of parts) {
            if (p.type === "hour")
              hour = parseInt(p.value, 10);
            if (p.type === "minute")
              minute = parseInt(p.value, 10);
            if (p.type === "weekday")
              weekdayStr = p.value;
          }
          const dayKeyMap = {
            Sun: "sunday",
            Mon: "monday",
            Tue: "tuesday",
            Wed: "wednesday",
            Thu: "thursday",
            Fri: "friday",
            Sat: "saturday"
          };
          const dayNumMap = {
            Sun: 0,
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6
          };
          const currentMinutes = hour * 60 + minute;
          const dayKey = dayKeyMap[weekdayStr];
          if (scheduleByDay && typeof scheduleByDay === "object" && dayKey && scheduleByDay[dayKey]) {
            const todaySchedule = scheduleByDay[dayKey];
            if (todaySchedule.enabled === false) {
              return false;
            }
            if (todaySchedule.start && todaySchedule.end) {
              const [startH, startM] = todaySchedule.start.split(":").map((v) => parseInt(v, 10));
              const [endH, endM] = todaySchedule.end.split(":").map((v) => parseInt(v, 10));
              const startMin = startH * 60 + (startM || 0);
              const endMin = endH * 60 + (endM || 0);
              return currentMinutes >= startMin && currentMinutes <= endMin;
            }
          }
          if (config2 && config2.workDays && config2.start && config2.end) {
            const dayNum = dayNumMap[weekdayStr] ?? date.getDay();
            if (!config2.workDays.includes(dayNum)) {
              return false;
            }
            const [startH, startM] = config2.start.split(":").map((v) => parseInt(v, 10));
            const [endH, endM] = config2.end.split(":").map((v) => parseInt(v, 10));
            const startMinutes = startH * 60 + (startM || 0);
            const endMinutes = endH * 60 + (endM || 0);
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
          }
          return true;
        } catch (err) {
          logger.error({ err }, "Error calculating business hours, failing open");
          return true;
        }
      }
      /**
       * Check if this is the first interaction from a contact
       */
      static async isFirstInbound(contactId) {
        const messageCount = await db.execute(import_drizzle_orm13.sql`
      SELECT COUNT(m.id) as count
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      WHERE c.contact_id = ${contactId}
    `);
        const count = parseInt(messageCount.rows[0]?.count || "0", 10);
        return count <= 1;
      }
      /**
       * Cooldown cache to prevent bot reply loops (conversationId:reason:hash -> timestamp)
       */
      static recentReplies = /* @__PURE__ */ new Map();
      /**
       * Helper to normalize Arabic and English text for accurate comparison
       */
      static normalizeText(text19) {
        if (!text19 || typeof text19 !== "string")
          return "";
        return text19.toLowerCase().trim().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآٱ]/g, "\u0627").replace(/ة/g, "\u0647").replace(/ى/g, "\u064A").replace(/\s+/g, " ");
      }
      /**
       * Match inbound message text against active keyword rules
       * Supports both frontend data structure and legacy formats:
       * - conditions.keyword (singular string) or conditions.keywords / contains (array)
       * - matchType: 'exact', 'contains', 'starts_with'
       * - actions: [{ type: 'reply', text: '...' }, { type: 'assign_station', stationId: '...' }]
       */
      static async matchKeywordRules(text19) {
        if (!text19 || typeof text19 !== "string") {
          return { matchedRules: [], tagsToAdd: [] };
        }
        const rawInput = text19.toLowerCase().trim();
        const normInput = this.normalizeText(text19);
        const rules = await db.query.automationRules.findMany({
          where: (0, import_drizzle_orm13.eq)(automationRules.enabled, true),
          orderBy: [automationRules.priority]
        });
        const matchedRules = [];
        const tagsToAdd = [];
        let targetStationId;
        let autoReplyText;
        for (const rule of rules) {
          const conditions = rule.conditions || {};
          const candidateKeywords = [];
          if (typeof conditions.keyword === "string" && conditions.keyword.trim() !== "") {
            candidateKeywords.push(conditions.keyword.trim());
          }
          if (Array.isArray(conditions.keywords)) {
            candidateKeywords.push(...conditions.keywords.filter((k) => typeof k === "string" && k.trim() !== ""));
          }
          if (Array.isArray(conditions.contains)) {
            candidateKeywords.push(...conditions.contains.filter((k) => typeof k === "string" && k.trim() !== ""));
          }
          if (candidateKeywords.length === 0)
            continue;
          const matchType = (conditions.matchType || "contains").toLowerCase();
          const isMatch = candidateKeywords.some((kw) => {
            if (!kw)
              return false;
            const rawKw = kw.toLowerCase().trim();
            const normKw = this.normalizeText(kw);
            if (matchType === "exact") {
              return normInput === normKw || rawInput === rawKw;
            } else if (matchType === "starts_with") {
              return normInput.startsWith(normKw) || rawInput.startsWith(rawKw);
            } else {
              return normInput.includes(normKw) || rawInput.includes(rawKw);
            }
          });
          if (isMatch) {
            matchedRules.push(rule);
            const actions = rule.actions || [];
            for (const action of actions) {
              if (action.type === "reply" && action.text) {
                autoReplyText = action.text;
              } else if (action.replyText) {
                autoReplyText = action.replyText;
              } else if (action.autoReply) {
                autoReplyText = action.autoReply;
              } else if (action.text && !autoReplyText) {
                autoReplyText = action.text;
              }
              if (action.type === "assign_station" && action.stationId) {
                targetStationId = action.stationId;
              } else if (action.assignStationId) {
                targetStationId = action.assignStationId;
              } else if (action.targetStationId) {
                targetStationId = action.targetStationId;
              } else if (action.stationId) {
                targetStationId = action.stationId;
              }
              if (action.addTags && Array.isArray(action.addTags)) {
                tagsToAdd.push(...action.addTags);
              }
            }
            logger.info(
              { ruleId: rule.id, ruleName: rule.name, matchType, autoReplyText, targetStationId },
              "Automation rule successfully matched incoming message"
            );
            if (autoReplyText) {
              break;
            }
          }
        }
        return { matchedRules, targetStationId, tagsToAdd, autoReplyText };
      }
      /**
       * Dispatch an automated WhatsApp response message from the bot
       * Includes anti-loop debounce protection and real-time broadcasts
       */
      static async sendAutomatedReply(params) {
        const { conversationId, contactId, accountId, toJid, text: text19, triggerReason } = params;
        if (!text19 || text19.trim() === "")
          return false;
        const now = Date.now();
        const replyHash = `${conversationId}:${triggerReason}:${text19.trim().slice(0, 30)}`;
        const lastSent = this.recentReplies.get(replyHash);
        if (lastSent && now - lastSent < 1e4) {
          logger.warn(
            { conversationId, triggerReason, elapsedMs: now - lastSent },
            "Skipped duplicate automated reply due to loop-prevention cooldown"
          );
          return false;
        }
        this.recentReplies.set(replyHash, now);
        if (this.recentReplies.size > 500) {
          for (const [k, v] of this.recentReplies.entries()) {
            if (now - v > 6e4)
              this.recentReplies.delete(k);
          }
        }
        const [acc] = await db.select({ companyId: whatsappAccounts.companyId }).from(whatsappAccounts).where((0, import_drizzle_orm13.eq)(whatsappAccounts.id, accountId)).limit(1);
        const companyId = acc?.companyId;
        const [savedMsg] = await db.insert(messages).values({
          conversationId,
          contactId,
          whatsappMessageId: void 0,
          direction: "outgoing",
          senderType: "automation",
          type: "text",
          text: text19,
          status: "pending",
          metadata: { triggerReason, automated: true }
        }).returning();
        let providerMessageId;
        let status = "pending";
        if (companyId) {
          const sendResult = await OutboundQueueService.sendMessage({
            companyId,
            accountId,
            conversationId,
            messageId: savedMsg.id,
            toJid,
            type: "text",
            text: text19,
            priority: 1
            // High priority for automated replies
          });
          status = sendResult.status === "sent" ? "sent" : "queued";
          if (sendResult.whatsappMessageId) {
            providerMessageId = sendResult.whatsappMessageId;
          }
          await db.update(messages).set({
            status,
            whatsappMessageId: providerMessageId,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm13.eq)(messages.id, savedMsg.id));
        }
        await db.update(conversations).set({
          lastMessageText: text19,
          lastMessageAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm13.eq)(conversations.id, conversationId));
        const broadcastPayload = {
          ...savedMsg,
          conversationId
        };
        wsHub.broadcast("whatsapp.message", broadcastPayload);
        wsHub.broadcast("message.created", { accountId, message: broadcastPayload });
        wsHub.broadcast("new_message", { conversationId, message: broadcastPayload });
        wsHub.broadcast("conversation.updated", {
          id: conversationId,
          conversationId,
          lastMessageText: text19,
          lastMessageAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        wsHub.broadcast("conversation_update", {
          id: conversationId,
          conversationId,
          lastMessageText: text19,
          lastMessageAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        logger.info({ conversationId, triggerReason, providerMessageId }, "Automated bot response sent and persisted");
        return true;
      }
      /**
       * Main processor for incoming messages
       */
      static async processInboundMessage(params) {
        const { conversationId, contactId, accountId, toJid, messageText } = params;
        const conversation = await db.query.conversations.findFirst({
          where: (0, import_drizzle_orm13.eq)(conversations.id, conversationId)
        });
        if (!conversation) {
          return { welcomeSent: false, outOfHoursSent: false, keywordMatched: false };
        }
        const systemAutomation = await AssignmentService.getSetting("automation_enabled", null) ?? await AssignmentService.getSetting("automationEnabled", true);
        const botRepliesAllowed = Boolean(systemAutomation) && conversation.automationEnabled && !conversation.humanMode;
        let keywordMatched = false;
        let preferredStationId;
        if (messageText && botRepliesAllowed) {
          const match = await this.matchKeywordRules(messageText);
          if (match.matchedRules.length > 0) {
            keywordMatched = true;
            preferredStationId = match.targetStationId;
            if (match.autoReplyText) {
              await this.sendAutomatedReply({
                conversationId,
                contactId,
                accountId,
                toJid,
                text: match.autoReplyText,
                triggerReason: "keyword"
              });
            }
          }
        }
        if (!conversation.assignedEmployeeId) {
          await AssignmentService.autoAssignConversation(conversationId, {
            preferredStationId
          });
        } else if (preferredStationId && preferredStationId !== conversation.assignedStationId) {
          await db.update(conversations).set({ assignedStationId: preferredStationId, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm13.eq)(conversations.id, conversationId));
        }
        let welcomeSent = false;
        let outOfHoursSent = false;
        if (!botRepliesAllowed) {
          return { welcomeSent, outOfHoursSent, keywordMatched };
        }
        const welcomeEnabled = await AssignmentService.getSetting("welcome_message_enabled", true);
        if (welcomeEnabled) {
          const isFirst = await this.isFirstInbound(contactId);
          if (isFirst) {
            const welcomeTemplate = await AssignmentService.getSetting(
              "welcome_message_template",
              "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A \u062A\u0631\u064A\u0646\u062A\u064A \u0641\u064A\u062C\u0646 (Trenty Vision) \u0644\u0644\u062E\u062F\u0645\u0627\u062A \u0648\u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629! \u064A\u0633\u0639\u062F\u0646\u0627 \u062A\u0648\u0627\u0635\u0644\u0643 \u0645\u0639\u0646\u0627\u060C \u0633\u064A\u0642\u0648\u0645 \u0623\u062D\u062F \u0623\u062E\u0635\u0627\u0626\u064A\u064A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0628\u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0643 \u0648\u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0641\u064A \u0623\u0642\u0631\u0628 \u0648\u0642\u062A."
            );
            await this.sendAutomatedReply({
              conversationId,
              contactId,
              accountId,
              toJid,
              text: welcomeTemplate,
              triggerReason: "welcome"
            });
            welcomeSent = true;
            return { welcomeSent, outOfHoursSent, keywordMatched };
          }
        }
        const oohEnabledRaw = await AssignmentService.getSetting("out_of_hours_message_enabled", false);
        const oohBotEnabledRaw = await AssignmentService.getSetting("outOfOfficeBotEnabled", null);
        const oohMessageEnabledRaw = await AssignmentService.getSetting("outOfHoursMessageEnabled", null);
        const oohEnabledFrontendRaw = await AssignmentService.getSetting("outOfOfficeEnabled", null);
        const isExplicitlyDisabled = oohEnabledRaw === false || oohEnabledRaw === "false" || oohBotEnabledRaw === false || oohBotEnabledRaw === "false" || oohMessageEnabledRaw === false || oohMessageEnabledRaw === "false" || oohEnabledFrontendRaw === false || oohEnabledFrontendRaw === "false";
        const isOohEnabled = !isExplicitlyDisabled && (oohEnabledRaw === true || oohEnabledRaw === "true" || oohBotEnabledRaw === true || oohMessageEnabledRaw === true || oohEnabledFrontendRaw === true);
        if (isOohEnabled) {
          const withinHours = await this.isWithinBusinessHours();
          if (!withinHours) {
            const oohTemplate = await AssignmentService.getSetting(
              "out_of_hours_message_template",
              "\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0648\u0627\u0635\u0644\u0643 \u0645\u0639 \u062A\u0631\u064A\u0646\u062A\u064A \u0641\u064A\u062C\u0646 (Trenty Vision) \u0644\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629! \u0646\u062D\u0646 \u062D\u0627\u0644\u064A\u0627\u064B \u062E\u0627\u0631\u062C \u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0631\u0633\u0645\u064A\u0629. \u0633\u0646\u0642\u0648\u0645 \u0628\u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0643 \u0648\u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0641\u0648\u0631 \u0628\u062F\u0621 \u062F\u0648\u0627\u0645 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0642\u0627\u062F\u0645."
            );
            await this.sendAutomatedReply({
              conversationId,
              contactId,
              accountId,
              toJid,
              text: oohTemplate,
              triggerReason: "out_of_hours"
            });
            outOfHoursSent = true;
          }
        }
        return { welcomeSent, outOfHoursSent, keywordMatched };
      }
    };
  }
});

// src/modules/whatsapp/inbound.handler.ts
function extractMessageContent(msg) {
  const message = msg.message;
  if (!message)
    return { type: "text", text: null, mediaId: null, metadata: {} };
  if (message.conversation) {
    return { type: "text", text: message.conversation, mediaId: null, metadata: {} };
  }
  if (message.extendedTextMessage) {
    return {
      type: "text",
      text: message.extendedTextMessage.text || "",
      mediaId: null,
      metadata: {
        contextInfo: message.extendedTextMessage.contextInfo ? {
          stanzaId: message.extendedTextMessage.contextInfo.stanzaId,
          participant: message.extendedTextMessage.contextInfo.participant
        } : void 0
      }
    };
  }
  if (message.imageMessage) {
    return {
      type: "image",
      text: message.imageMessage.caption || null,
      mediaId: null,
      metadata: {
        mimetype: message.imageMessage.mimetype,
        fileLength: message.imageMessage.fileLength,
        width: message.imageMessage.width,
        height: message.imageMessage.height
      }
    };
  }
  if (message.videoMessage) {
    return {
      type: "video",
      text: message.videoMessage.caption || null,
      mediaId: null,
      metadata: {
        mimetype: message.videoMessage.mimetype,
        fileLength: message.videoMessage.fileLength,
        seconds: message.videoMessage.seconds
      }
    };
  }
  if (message.audioMessage) {
    const isVoiceNote = message.audioMessage.ptt === true;
    return {
      type: isVoiceNote ? "voice_note" : "audio",
      text: null,
      mediaId: null,
      metadata: {
        mimetype: message.audioMessage.mimetype,
        fileLength: message.audioMessage.fileLength,
        seconds: message.audioMessage.seconds,
        ptt: message.audioMessage.ptt
      }
    };
  }
  if (message.documentMessage) {
    return {
      type: "document",
      text: message.documentMessage.caption || null,
      mediaId: null,
      metadata: {
        mimetype: message.documentMessage.mimetype,
        fileName: message.documentMessage.fileName,
        fileLength: message.documentMessage.fileLength
      }
    };
  }
  if (message.locationMessage) {
    return {
      type: "location",
      text: message.locationMessage.name || null,
      mediaId: null,
      metadata: {
        latitude: message.locationMessage.degreesLatitude,
        longitude: message.locationMessage.degreesLongitude,
        name: message.locationMessage.name,
        address: message.locationMessage.address
      }
    };
  }
  if (message.contactMessage || message.contactsArrayMessage) {
    return { type: "contact", text: null, mediaId: null, metadata: { contact: message.contactMessage || message.contactsArrayMessage } };
  }
  if (message.stickerMessage) {
    return { type: "sticker", text: null, mediaId: null, metadata: { mimetype: message.stickerMessage.mimetype } };
  }
  return { type: "text", text: null, mediaId: null, metadata: {} };
}
function runInSenderSequence(senderKey, task) {
  const current = senderQueues.get(senderKey) || Promise.resolve();
  const next = current.then(task, task);
  senderQueues.set(senderKey, next);
  next.finally(() => {
    if (senderQueues.get(senderKey) === next) {
      senderQueues.delete(senderKey);
    }
  });
  return next;
}
async function forwardInboundMessageToEmployee(params) {
  try {
    const { employeeId, conversationId, contact, message, accountId, accountPhoneNumber, isNewAssignment } = params;
    const rawText = (message.text || "").trim();
    if (rawText.startsWith("\u{1F514} *\u0625\u0634\u0639\u0627\u0631") || rawText.startsWith("\u{1F4E9} *\u0631\u0633\u0627\u0644\u0629 \u0648\u0627\u0631\u062F\u0629") || rawText.startsWith("\u{1F514} *\u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F") || rawText.includes("\u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 CRM") || rawText.includes("\u0645\u0631\u0633\u0644\u0629 \u0622\u0644\u064A\u0627\u064B \u0639\u0628\u0631 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u062A\u0633\u0627\u0628 CRM")) {
      logger.info({ conversationId }, "Skipping forward: Message is an internal CRM notification banner (anti-loop)");
      return { success: false, reason: "anti_loop_banner" };
    }
    const [emp] = await db.select({
      id: employees.id,
      whatsappNumber: employees.whatsappNumber,
      name: users.name,
      email: users.email,
      status: employees.status
    }).from(employees).leftJoin(users, (0, import_drizzle_orm14.eq)(employees.userId, users.id)).where((0, import_drizzle_orm14.eq)(employees.id, employeeId)).limit(1);
    if (!emp) {
      logger.warn({ employeeId, conversationId }, "Assigned employee record not found in database");
      return { success: false, reason: "employee_not_found" };
    }
    const employeeName = emp.name || "\u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u0646\u062F";
    if (emp.status === "inactive") {
      logger.info({ employeeId, name: employeeName }, "Employee is inactive, skipping WhatsApp forward");
      return { success: false, reason: "employee_inactive" };
    }
    const rawEmpPhone = (emp.whatsappNumber || "").trim();
    if (!rawEmpPhone) {
      logger.info({ employeeId, name: employeeName }, "Employee has no personal WhatsApp number configured in CRM");
      return { success: false, reason: "no_phone_configured" };
    }
    const phoneValidation = validateAndFormatPhone(rawEmpPhone);
    const cleanEmpDigits = phoneValidation.digitsOnly || rawEmpPhone.replace(/\D/g, "");
    if (!cleanEmpDigits || cleanEmpDigits.length < 8) {
      logger.warn({ employeeId, rawEmpPhone }, "Employee WhatsApp number is invalid or too short");
      return { success: false, reason: "invalid_employee_phone" };
    }
    const cleanAccountDigits = (accountPhoneNumber || "").replace(/\D/g, "");
    if (cleanAccountDigits && cleanEmpDigits === cleanAccountDigits) {
      logger.warn(
        { cleanEmpDigits, cleanAccountDigits },
        "Employee WhatsApp number is the same as the connected system WhatsApp account (skipping to prevent self-loop)"
      );
      return { success: false, reason: "same_as_system_account" };
    }
    let provider = accountId ? sessionManager.getProvider(accountId) : null;
    if (!provider || provider.connectionState?.status !== "connected") {
      for (const [, p] of sessionManager.getActiveSessions()) {
        if (p.connectionState?.status === "connected") {
          provider = p;
          break;
        }
      }
    }
    if (!provider || provider.connectionState?.status !== "connected") {
      const [connectedAccount] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm14.eq)(whatsappAccounts.status, "connected")).limit(1);
      if (connectedAccount) {
        const candidate = sessionManager.getProvider(connectedAccount.id);
        if (candidate && candidate.connectionState?.status === "connected") {
          provider = candidate;
        }
      }
    }
    if (!provider || provider.connectionState?.status !== "connected") {
      logger.warn(
        { accountId, employeeId },
        "Cannot forward message to employee: No active WhatsApp socket provider is currently connected"
      );
      return { success: false, reason: "no_active_provider" };
    }
    let contentSnippet = message.text || "";
    if (message.type === "image") {
      contentSnippet = message.text ? `\u{1F4F7} [\u0635\u0648\u0631\u0629 \u0645\u0631\u0641\u0642\u0629]: ${message.text}` : "\u{1F4F7} [\u0635\u0648\u0631\u0629 \u0645\u0631\u0641\u0642\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644]";
    } else if (message.type === "voice_note" || message.type === "audio") {
      contentSnippet = "\u{1F3A4} [\u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629 \u0648\u0627\u0631\u062F\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644]";
    } else if (message.type === "document") {
      const fileName = message.metadata?.fileName || "";
      contentSnippet = fileName ? `\u{1F4C4} [\u0645\u0633\u062A\u0646\u062F \u0645\u0631\u0641\u0642]: ${fileName}` : "\u{1F4C4} [\u0645\u0633\u062A\u0646\u062F \u0645\u0631\u0641\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644]";
    } else if (message.type === "video") {
      contentSnippet = message.text ? `\u{1F3A5} [\u0645\u0642\u0637\u0639 \u0641\u064A\u062F\u064A\u0648]: ${message.text}` : "\u{1F3A5} [\u0645\u0642\u0637\u0639 \u0641\u064A\u062F\u064A\u0648 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644]";
    } else if (message.type === "location") {
      contentSnippet = "\u{1F4CD} [\u0645\u0648\u0642\u0639 \u062C\u063A\u0631\u0627\u0641\u064A \u0645\u0631\u0633\u0644 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644]";
    } else if (!contentSnippet) {
      contentSnippet = `[\u0631\u0633\u0627\u0644\u0629 \u0645\u0646 \u0646\u0648\u0639: ${message.type}]`;
    }
    const cleanCustDigits = (contact.phoneNumber || "").replace(/\D/g, "");
    const directWaLink = cleanCustDigits ? `https://wa.me/${cleanCustDigits}` : "";
    const contactDisplayName = contact.name && contact.name !== contact.phoneNumber ? `${contact.name} (${contact.phoneNumber})` : contact.phoneNumber;
    const alertMessage = [
      isNewAssignment ? `\u{1F514} *\u0625\u0634\u0639\u0627\u0631: \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F \u0645\u0633\u0646\u062F \u0625\u0644\u064A\u0643*` : `\u{1F4E9} *\u0631\u0633\u0627\u0644\u0629 \u0648\u0627\u0631\u062F\u0629 \u0645\u0646 \u0639\u0645\u064A\u0644 \u0645\u0633\u0646\u062F \u0625\u0644\u064A\u0643*`,
      `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
      `\u0645\u0631\u062D\u0628\u0627\u064B *${employeeName}*\u060C \u0648\u0635\u0644\u062A\u0643 \u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644:`,
      `\u{1F464} *\u0627\u0644\u0639\u0645\u064A\u0644:* ${contactDisplayName}`,
      `\u{1F4F1} *\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064A\u0644:* ${contact.phoneNumber}`,
      `\u{1F4AC} *\u0627\u0644\u0631\u0633\u0627\u0644\u0629:*`,
      `${contentSnippet}`,
      ``,
      directWaLink ? `\u{1F449} *\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629:* ${directWaLink}` : "",
      `\u23F0 *\u0627\u0644\u0648\u0642\u062A:* ${(/* @__PURE__ */ new Date()).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
      `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
      `\u0645\u0631\u0633\u0644\u0629 \u0622\u0644\u064A\u0627\u064B \u0639\u0628\u0631 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u062A\u0633\u0627\u0628 CRM.`
    ].filter(Boolean).join("\n");
    const empJid = `${cleanEmpDigits}@s.whatsapp.net`;
    const sentResult = await provider.sendText(empJid, alertMessage);
    logger.info(
      {
        conversationId,
        employeeId: emp.id,
        employeeName,
        employeePhone: phoneValidation.formatted || rawEmpPhone,
        customerPhone: contact.phoneNumber,
        whatsappMessageId: sentResult?.id
      },
      "Successfully forwarded incoming customer message to assigned employee on WhatsApp"
    );
    return { success: true };
  } catch (forwardErr) {
    logger.error(
      {
        err: forwardErr?.message,
        stack: forwardErr?.stack,
        employeeId: params.employeeId,
        conversationId: params.conversationId
      },
      "Error in forwardInboundMessageToEmployee: Exception caught and handled safely"
    );
    try {
      const fallbackReason = forwardErr?.message || "unknown_error";
      await db.insert(messages).values({
        conversationId: params.conversationId,
        contactId: params.contact.id,
        senderType: "system",
        direction: "outgoing",
        type: "system",
        text: `\u26A0\uFE0F \u062A\u0639\u0630\u0631 \u0625\u0639\u0627\u062F\u0629 \u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0644\u0644\u0645\u0648\u0638\u0641 \u0639\u0628\u0631 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628. \u0627\u0644\u0633\u0628\u0628: ${fallbackReason}`,
        status: "sent"
      });
      wsHub.broadcast("conversation_update", { id: params.conversationId });
    } catch (dbErr) {
      logger.error({ dbErr }, "Failed to insert fallback system message for failed forward");
    }
    return { success: false, reason: forwardErr?.message || "unknown_error" };
  }
}
async function handleInboundMessage(accountId, msg) {
  const whatsappMessageId = msg.key?.id;
  const remoteJid = msg.key?.remoteJid;
  if (!whatsappMessageId || !remoteJid) {
    logger.warn({ accountId }, "Inbound message missing key data, skipping");
    return;
  }
  if (remoteJid === "status@broadcast")
    return;
  const normalizedRemoteJid = (0, import_baileys2.jidNormalizedUser)(remoteJid);
  return runInSenderSequence(normalizedRemoteJid, async () => {
    try {
      const existingMsg = await db.select({ id: messages.id }).from(messages).where((0, import_drizzle_orm14.eq)(messages.whatsappMessageId, whatsappMessageId)).limit(1);
      if (existingMsg.length > 0) {
        logger.debug({ whatsappMessageId }, "Duplicate message, skipping");
        return;
      }
      let resolvedPhoneDigits = null;
      const isLid = (0, import_baileys2.isLidUser)(remoteJid) || remoteJid.endsWith("@lid");
      if (isLid) {
        const provider = sessionManager.getProvider(accountId);
        if (provider) {
          resolvedPhoneDigits = await provider.getPhoneNumberForLid(remoteJid);
        }
      }
      if (!resolvedPhoneDigits) {
        resolvedPhoneDigits = normalizedRemoteJid.split("@")[0];
      }
      const phoneCheck = validateAndFormatPhone(resolvedPhoneDigits);
      const formattedPhone = phoneCheck.isValid ? phoneCheck.formatted : resolvedPhoneDigits.startsWith("+") ? resolvedPhoneDigits : `+${resolvedPhoneDigits.replace(/\D/g, "")}`;
      let contact = await db.select().from(contacts).where(
        (0, import_drizzle_orm14.or)(
          (0, import_drizzle_orm14.eq)(contacts.phoneNumber, formattedPhone),
          (0, import_drizzle_orm14.eq)(contacts.whatsappJid, normalizedRemoteJid),
          (0, import_drizzle_orm14.eq)(contacts.whatsappJid, remoteJid)
        )
      ).limit(1);
      const account = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm14.eq)(whatsappAccounts.id, accountId)).limit(1);
      if (account.length === 0) {
        logger.error({ accountId }, "WhatsApp account not found");
        return;
      }
      const companyId = account[0].companyId;
      if (contact.length === 0) {
        const displayName = msg.pushName && msg.pushName.trim() !== "" ? msg.pushName.trim() : formattedPhone;
        const [newContact] = await db.insert(contacts).values({
          companyId,
          name: displayName,
          phoneNumber: formattedPhone,
          whatsappJid: isLid ? normalizedRemoteJid : phoneCheck.whatsappJid || normalizedRemoteJid,
          source: "whatsapp",
          metadata: {
            whatsappPushName: msg.pushName || null,
            lid: isLid ? remoteJid : null,
            isSavedOnPhone: false
          }
        }).returning();
        contact = [newContact];
        logger.info({ phoneNumber: formattedPhone, contactId: newContact.id, displayName }, "Created new contact");
      } else {
        const existing = contact[0];
        const updates = { updatedAt: /* @__PURE__ */ new Date() };
        if (!existing.whatsappJid || existing.whatsappJid.endsWith("@lid") && !isLid) {
          updates.whatsappJid = normalizedRemoteJid;
        }
        if (msg.pushName && (existing.name === existing.phoneNumber || !existing.name)) {
          updates.name = msg.pushName.trim();
        }
        const existingMeta = existing.metadata || {};
        if (msg.pushName && existingMeta.whatsappPushName !== msg.pushName) {
          updates.metadata = { ...existingMeta, whatsappPushName: msg.pushName, lid: isLid ? remoteJid : existingMeta.lid };
        }
        if (Object.keys(updates).length > 1) {
          const [updated] = await db.update(contacts).set(updates).where((0, import_drizzle_orm14.eq)(contacts.id, existing.id)).returning();
          if (updated)
            contact = [updated];
        }
      }
      const isFromMe = Boolean(msg.key?.fromMe);
      if (!isFromMe && !remoteJid.endsWith("@g.us") && !remoteJid.includes("@broadcast")) {
        LandingSyncService.syncContactAsync(contact[0]);
      }
      const contactId = contact[0].id;
      const contactMeta = contact[0].metadata || {};
      let conversation = await db.select().from(conversations).where(
        (0, import_drizzle_orm14.and)(
          (0, import_drizzle_orm14.eq)(conversations.contactId, contactId),
          (0, import_drizzle_orm14.eq)(conversations.whatsappAccountId, accountId)
        )
      ).limit(1);
      let isNewConversation = false;
      if (conversation.length === 0) {
        const sticky = await AssignmentService.findStickyAgent(contactId);
        const [newConvo] = await db.insert(conversations).values({
          companyId,
          contactId,
          whatsappAccountId: accountId,
          status: "open",
          assignedEmployeeId: sticky?.employeeId || contactMeta.assignedEmployeeId || null,
          assignedStationId: sticky?.stationId || null,
          assignmentSource: sticky ? "direct" : "manual",
          lastMessageText: null,
          unreadCount: "1"
        }).returning();
        conversation = [newConvo];
        isNewConversation = true;
        logger.info({ contactId, conversationId: newConvo.id, assignedEmployeeId: newConvo.assignedEmployeeId }, "Created new conversation");
      } else if (!conversation[0].assignedEmployeeId) {
        const sticky = await AssignmentService.findStickyAgent(contactId);
        const persistentEmpId = sticky?.employeeId || contactMeta.assignedEmployeeId || null;
        if (persistentEmpId) {
          conversation[0].assignedEmployeeId = persistentEmpId;
          if (sticky?.stationId)
            conversation[0].assignedStationId = sticky.stationId;
          await db.update(conversations).set({
            assignedEmployeeId: persistentEmpId,
            assignedStationId: sticky?.stationId || conversation[0].assignedStationId,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm14.eq)(conversations.id, conversation[0].id));
          logger.info(
            { conversationId: conversation[0].id, assignedEmployeeId: persistentEmpId },
            "Restored persistent assigned employee from contact metadata / sticky agent"
          );
        }
      }
      const conversationId = conversation[0].id;
      const { type, text: text19, mediaId, metadata } = extractMessageContent(msg);
      const messageTimestamp = msg.messageTimestamp ? new Date((typeof msg.messageTimestamp === "number" ? msg.messageTimestamp : Number(msg.messageTimestamp)) * 1e3) : /* @__PURE__ */ new Date();
      const rawContextInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo || msg.message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo;
      const rawQuotedStanzaId = rawContextInfo?.stanzaId || metadata?.contextInfo?.stanzaId;
      if (text19) {
        const quotedMsg = rawContextInfo?.quotedMessage;
        let quotedText = "";
        if (quotedMsg && typeof quotedMsg === "object") {
          quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || quotedMsg.videoMessage?.caption || "";
        }
        if (!quotedText && rawQuotedStanzaId && typeof rawQuotedStanzaId === "string") {
          const [prevMsg] = await db.select({ text: messages.text }).from(messages).where((0, import_drizzle_orm14.eq)(messages.whatsappMessageId, rawQuotedStanzaId)).limit(1);
          if (prevMsg?.text) {
            quotedText = prevMsg.text;
          }
        }
        const reminderResult = await WhatsAppReminderService.handleIncomingReminder({
          senderPhoneOrJid: isFromMe ? account[0]?.phoneNumber || formattedPhone || remoteJid : formattedPhone || contact[0]?.phoneNumber || remoteJid,
          messageText: text19,
          quotedMessageText: quotedText || null,
          accountId,
          isFromMe,
          remoteJid,
          currentConversationId: conversationId,
          currentContact: contact[0],
          provider: sessionManager.getProvider(accountId) || null
        });
        if (reminderResult.handled) {
          logger.info(
            { reminderId: reminderResult.reminderId, remoteJid, isFromMe },
            "WhatsApp message successfully processed as in-chat reminder command"
          );
          return;
        }
      }
      const senderType = isFromMe ? "employee" : "customer";
      const direction = isFromMe ? "outgoing" : "incoming";
      const msgStatus = isFromMe ? "sent" : "delivered";
      let quotedMessageInternalId = null;
      if (rawQuotedStanzaId && typeof rawQuotedStanzaId === "string") {
        const [quotedRow] = await db.select({ id: messages.id }).from(messages).where((0, import_drizzle_orm14.eq)(messages.whatsappMessageId, rawQuotedStanzaId)).limit(1);
        if (quotedRow) {
          quotedMessageInternalId = quotedRow.id;
        }
      }
      const [savedMessage] = await db.insert(messages).values({
        whatsappMessageId,
        conversationId,
        contactId,
        senderType,
        direction,
        type,
        text: text19,
        mediaId,
        quotedMessageId: quotedMessageInternalId,
        timestamp: messageTimestamp,
        status: msgStatus,
        metadata
      }).returning();
      const currentUnread = parseInt(conversation[0].unreadCount || "0", 10);
      const newUnreadCount = isFromMe ? conversation[0].unreadCount : String(currentUnread + 1);
      await db.update(conversations).set({
        lastMessageText: text19 || `[${type}]`,
        lastMessageAt: messageTimestamp,
        unreadCount: newUnreadCount,
        status: "open",
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm14.eq)(conversations.id, conversationId));
      let wasNewlyAssigned = false;
      if (!isFromMe && (!conversation[0].assignedEmployeeId || isNewConversation)) {
        try {
          const assignResult = await AssignmentService.autoAssignConversation(conversationId, {
            skipWhatsAppNotification: true
          });
          if (assignResult?.assignedEmployeeId) {
            conversation[0].assignedEmployeeId = assignResult.assignedEmployeeId;
            conversation[0].assignedStationId = assignResult.assignedStationId;
            wasNewlyAssigned = true;
          }
        } catch (assignErr) {
          logger.error({ assignErr, conversationId }, "Failed to auto-assign incoming conversation");
        }
      }
      const broadcastMsg = {
        ...savedMessage,
        conversationId,
        contactName: contact[0].name,
        contactPhone: contact[0].phoneNumber,
        assignedEmployeeId: conversation[0].assignedEmployeeId,
        assignedStationId: conversation[0].assignedStationId,
        whatsappAccount: account[0].displayName || account[0].phoneNumber
      };
      wsHub.broadcast("message.created", {
        accountId,
        message: broadcastMsg
      });
      wsHub.broadcast("whatsapp.message", broadcastMsg);
      wsHub.broadcast("new_message", {
        conversationId,
        message: broadcastMsg
      });
      const convUpdatePayload = {
        id: conversationId,
        conversationId,
        lastMessageText: text19 || `[${type}]`,
        lastMessageAt: messageTimestamp,
        unreadCount: newUnreadCount,
        assignedEmployeeId: conversation[0].assignedEmployeeId,
        assignedStationId: conversation[0].assignedStationId,
        contact: {
          id: contact[0].id,
          name: contact[0].name,
          phoneNumber: contact[0].phoneNumber
        }
      };
      wsHub.broadcast("conversation.updated", convUpdatePayload);
      wsHub.broadcast("conversation_update", convUpdatePayload);
      if (!isFromMe && conversation[0].assignedEmployeeId) {
        wsHub.broadcast("employee.notification", {
          type: "new_inbound_message",
          assignedEmployeeId: conversation[0].assignedEmployeeId,
          conversationId,
          contactName: contact[0].name,
          contactPhone: contact[0].phoneNumber,
          messageText: text19 || `[${type}]`,
          timestamp: messageTimestamp,
          whatsappAccount: account[0].displayName || account[0].phoneNumber
        });
        forwardInboundMessageToEmployee({
          employeeId: conversation[0].assignedEmployeeId,
          conversationId,
          contact: {
            id: contact[0].id,
            name: contact[0].name,
            phoneNumber: contact[0].phoneNumber
          },
          message: { text: text19, type, mediaId, metadata },
          accountId,
          accountPhoneNumber: account[0].phoneNumber,
          isNewAssignment: isNewConversation || wasNewlyAssigned
        }).catch((forwardErr) => {
          logger.error(
            {
              err: forwardErr?.message,
              stack: forwardErr?.stack,
              conversationId,
              employeeId: conversation[0].assignedEmployeeId
            },
            "Background forward of inbound message to employee WhatsApp failed safely"
          );
        });
      }
      logger.info(
        { accountId, whatsappMessageId, conversationId, contactId, type, isFromMe, assignedEmployeeId: conversation[0].assignedEmployeeId },
        "WhatsApp message processed successfully"
      );
      if (!isFromMe) {
        try {
          const { RulesEngine: RulesEngine2 } = await Promise.resolve().then(() => (init_rules_engine(), rules_engine_exports));
          await RulesEngine2.processInboundMessage({
            conversationId,
            contactId,
            accountId,
            toJid: remoteJid,
            messageText: text19 || ""
          });
        } catch (autoErr) {
          logger.error({ autoErr, conversationId }, "Error running automation rules on inbound message");
        }
      }
    } catch (err) {
      logger.error({ accountId, whatsappMessageId, err }, "Failed to process inbound message");
    }
  });
}
var import_drizzle_orm14, import_baileys2, senderQueues;
var init_inbound_handler = __esm({
  "src/modules/whatsapp/inbound.handler.ts"() {
    "use strict";
    import_drizzle_orm14 = require("drizzle-orm");
    init_client();
    init_schema();
    init_ws_hub();
    init_logger();
    init_phone_validator();
    init_session_manager();
    import_baileys2 = require("@whiskeysockets/baileys");
    init_assignment_service();
    init_whatsapp_reminder_service();
    init_landing_sync_service();
    senderQueues = /* @__PURE__ */ new Map();
  }
});

// src/modules/whatsapp/session.manager.ts
var session_manager_exports = {};
__export(session_manager_exports, {
  sessionManager: () => sessionManager
});
var import_drizzle_orm15, WhatsAppSessionManager, sessionManager;
var init_session_manager = __esm({
  "src/modules/whatsapp/session.manager.ts"() {
    "use strict";
    import_drizzle_orm15 = require("drizzle-orm");
    init_client();
    init_schema();
    init_baileys_provider();
    init_ws_hub();
    init_logger();
    init_inbound_handler();
    WhatsAppSessionManager = class _WhatsAppSessionManager {
      sessions = /* @__PURE__ */ new Map();
      connectingLocks = /* @__PURE__ */ new Set();
      static instance;
      constructor() {
      }
      static getInstance() {
        if (!_WhatsAppSessionManager.instance) {
          _WhatsAppSessionManager.instance = new _WhatsAppSessionManager();
        }
        return _WhatsAppSessionManager.instance;
      }
      /**
       * Initialize — restore all previously connected sessions on server startup.
       */
      async initialize() {
        logger.info("WhatsAppSessionManager: Initializing and restoring sessions...");
        try {
          const accounts = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm15.eq)(whatsappAccounts.status, "connected"));
          logger.info({ count: accounts.length }, "WhatsAppSessionManager: Found accounts to restore");
          for (const account of accounts) {
            try {
              await this.connectAccount(account.id);
              logger.info({ accountId: account.id, displayName: account.displayName }, "Session restored");
            } catch (err) {
              logger.error({ accountId: account.id, err }, "Failed to restore session");
              await db.update(whatsappAccounts).set({ status: "disconnected", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, account.id));
            }
          }
        } catch (err) {
          logger.error({ err }, "WhatsAppSessionManager: Failed to initialize");
        }
      }
      /**
       * Connect a WhatsApp account — creates a new BaileysProvider and starts connection.
       */
      async connectAccount(accountId) {
        if (this.connectingLocks.has(accountId)) {
          logger.warn({ accountId }, "Connection already in progress, skipping duplicate connect");
          return;
        }
        this.connectingLocks.add(accountId);
        try {
          if (this.sessions.has(accountId)) {
            const existing = this.sessions.get(accountId);
            const status = await existing.getStatus();
            if (status.status === "connected" || status.status === "connecting" || status.status === "qr_required") {
              logger.warn({ accountId }, "Session already active, skipping duplicate connect");
              return;
            }
            await existing.disconnect();
            this.sessions.delete(accountId);
          }
          const provider = new BaileysProvider(accountId);
          provider.on("qr", async (accId, qrDataUrl) => {
            wsHub.broadcast("whatsapp.qr", { accountId: accId, qrCode: qrDataUrl });
            try {
              await db.update(whatsappAccounts).set({
                bridgeQrCode: qrDataUrl,
                bridgeStatus: "online",
                bridgeLastSeen: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, accId));
            } catch (err) {
              logger.debug({ accountId: accId, err }, "Failed to persist bridge QR code");
            }
          });
          provider.on("status", async (accId, state) => {
            wsHub.broadcast("whatsapp.status", { accountId: accId, ...state });
            try {
              const updateData = {
                status: state.status,
                bridgeStatus: "online",
                bridgeLastSeen: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              };
              if (state.phoneNumber)
                updateData.phoneNumber = state.phoneNumber;
              if (state.jid)
                updateData.jid = state.jid;
              if (state.deviceName)
                updateData.deviceName = state.deviceName;
              if (state.status === "connected") {
                updateData.connectedAt = /* @__PURE__ */ new Date();
                updateData.bridgeQrCode = null;
              }
              if (state.lastSeenAt)
                updateData.lastSeenAt = state.lastSeenAt;
              await db.update(whatsappAccounts).set(updateData).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, accId));
            } catch (err) {
              logger.error({ accountId: accId, err }, "Failed to persist WhatsApp status to database");
            }
          });
          provider.on("message", async (accId, message) => {
            try {
              await handleInboundMessage(accId, message);
            } catch (inboundErr) {
              logger.error({ accountId: accId, err: inboundErr }, "Failed to process inbound message in session manager");
            }
          });
          provider.on("message.update", (accId, updates) => {
            wsHub.broadcast("message.updated", { accountId: accId, updates });
          });
          provider.on("contacts.sync", async (accId, syncList) => {
            try {
              if (!Array.isArray(syncList) || syncList.length === 0)
                return;
              const [account] = await db.select({ companyId: whatsappAccounts.companyId }).from(whatsappAccounts).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, accId)).limit(1);
              if (!account)
                return;
              const { contacts: contactsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
              const { validateAndFormatPhone: validateAndFormatPhone2 } = await Promise.resolve().then(() => (init_phone_validator(), phone_validator_exports));
              const { or: or6 } = await import("drizzle-orm");
              for (const c of syncList) {
                const rawJid = c.id || "";
                if (!rawJid || rawJid.includes("@g.us") || rawJid === "status@broadcast")
                  continue;
                const name = c.name || c.notify || c.verifiedName;
                const digits = rawJid.split("@")[0].split(":")[0];
                const phoneValidation = validateAndFormatPhone2(digits);
                if (!phoneValidation.isValid)
                  continue;
                const formattedPhone = phoneValidation.formatted;
                const [existing] = await db.select().from(contactsTable).where(
                  or6(
                    (0, import_drizzle_orm15.eq)(contactsTable.phoneNumber, formattedPhone),
                    (0, import_drizzle_orm15.eq)(contactsTable.whatsappJid, rawJid)
                  )
                ).limit(1);
                if (existing) {
                  const meta = existing.metadata || {};
                  const updateData = {
                    metadata: { ...meta, isSavedOnPhone: true, phoneBookName: name || meta.phoneBookName },
                    updatedAt: /* @__PURE__ */ new Date()
                  };
                  if (name && (existing.name === existing.phoneNumber || !existing.name)) {
                    updateData.name = name;
                  }
                  await db.update(contactsTable).set(updateData).where((0, import_drizzle_orm15.eq)(contactsTable.id, existing.id));
                } else if (name) {
                  await db.insert(contactsTable).values({
                    companyId: account.companyId,
                    name,
                    phoneNumber: formattedPhone,
                    whatsappJid: rawJid,
                    source: "phone_address_book",
                    metadata: { isSavedOnPhone: true, phoneBookName: name }
                  });
                }
              }
            } catch (syncErr) {
              logger.debug({ accountId: accId, err: syncErr }, "Error syncing address book contacts");
            }
          });
          this.sessions.set(accountId, provider);
          await db.update(whatsappAccounts).set({ status: "initializing", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, accountId));
          await provider.connect();
        } finally {
          this.connectingLocks.delete(accountId);
        }
      }
      /**
       * Disconnect a WhatsApp account (keeps auth state for reconnect).
       */
      async disconnectAccount(accountId) {
        const provider = this.sessions.get(accountId);
        if (!provider) {
          logger.warn({ accountId }, "No active session to disconnect");
          return;
        }
        await provider.disconnect();
        this.sessions.delete(accountId);
        await db.update(whatsappAccounts).set({ status: "disconnected", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, accountId));
        logger.info({ accountId }, "WhatsApp account disconnected");
      }
      /**
       * Logout a WhatsApp account (clears auth state, requires new QR scan).
       */
      async logoutAccount(accountId) {
        const provider = this.sessions.get(accountId);
        if (provider) {
          try {
            await provider.logout();
          } catch (err) {
            logger.warn({ accountId, err }, "Error during provider.logout()");
          }
          this.sessions.delete(accountId);
        }
        try {
          const path5 = await import("path");
          const fs5 = await import("fs/promises");
          const sessionDir = path5.join(process.cwd(), "storage", "whatsapp_sessions", accountId);
          await fs5.rm(sessionDir, { recursive: true, force: true });
        } catch (err) {
          logger.warn({ accountId, err }, "Failed to remove local session dir");
        }
        try {
          const { whatsappAuthKeys: authKeysTable, whatsappSessions: sessionsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          await db.delete(authKeysTable).where((0, import_drizzle_orm15.eq)(authKeysTable.accountId, accountId));
          await db.update(sessionsTable).set({
            encryptedAuthState: null,
            qrCode: null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm15.eq)(sessionsTable.accountId, accountId));
        } catch (err) {
          logger.warn({ accountId, err }, "Failed to clear auth tables in PostgreSQL");
        }
        await db.update(whatsappAccounts).set({
          status: "disconnected",
          phoneNumber: null,
          jid: null,
          deviceName: null,
          connectedAt: null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, accountId));
        wsHub.broadcast("whatsapp.status", {
          accountId,
          status: "disconnected"
        });
        logger.info({ accountId }, "WhatsApp account logged out and auth state wiped");
      }
      /**
       * Reset an account: complete wipe and clean re-initialization
       */
      async resetAccount(accountId) {
        await this.logoutAccount(accountId);
        await this.connectAccount(accountId);
      }
      /**
       * Reconnect a disconnected account.
       */
      async reconnectAccount(accountId) {
        await this.disconnectAccount(accountId);
        await this.connectAccount(accountId);
      }
      /**
       * Restart an account completely (alias for reconnect).
       */
      async restartAccount(accountId) {
        await this.reconnectAccount(accountId);
      }
      /**
       * Request pairing code for an account using phone number.
       */
      async requestPairingCode(accountId, phoneNumber) {
        let provider = this.sessions.get(accountId);
        if (!provider) {
          await this.connectAccount(accountId);
          provider = this.sessions.get(accountId);
        }
        if (!provider) {
          throw new Error("Failed to create or find session for account " + accountId);
        }
        return await provider.requestPairingCode(phoneNumber);
      }
      /**
       * Get the current pairing code for an account.
       */
      async getPairingCode(accountId) {
        const provider = this.sessions.get(accountId);
        if (provider) {
          return provider.getPairingCode();
        }
        return null;
      }
      /**
       * Get the current connection status for an account.
       */
      async getAccountStatus(accountId) {
        const provider = this.sessions.get(accountId);
        if (provider) {
          return provider.getStatus();
        }
        return { status: "disconnected" };
      }
      /**
       * Delete a WhatsApp account permanently (logout + DB erase).
       */
      async deleteAccount(accountId) {
        logger.info({ accountId }, "WhatsAppSessionManager: Deleting account permanently");
        try {
          await this.logoutAccount(accountId);
        } catch (e) {
          logger.warn({ accountId, e }, "Logout failed during delete, forcing deletion anyway");
        }
        try {
          await db.delete(whatsappAccounts).where((0, import_drizzle_orm15.eq)(whatsappAccounts.id, accountId));
          logger.info({ accountId }, "Account deleted from postgres");
        } catch (e) {
          logger.error({ accountId, e }, "Failed to delete account from postgres");
          throw e;
        }
      }
      /**
       * Get the current QR code for an account.
       */
      async getQRCode(accountId) {
        const provider = this.sessions.get(accountId);
        if (provider) {
          return provider.getQRCode();
        }
        return null;
      }
      /**
       * Get the BaileysProvider instance for sending messages.
       */
      getProvider(accountId) {
        return this.sessions.get(accountId);
      }
      /**
       * Get all active sessions.
       */
      getActiveSessions() {
        return this.sessions;
      }
      /**
       * Graceful shutdown — disconnect all active sessions cleanly.
       */
      async shutdown() {
        logger.info({ activeSessions: this.sessions.size }, "WhatsAppSessionManager: Shutting down...");
        const promises = [];
        for (const [accountId, provider] of this.sessions) {
          promises.push(
            provider.disconnect().catch((err) => {
              logger.error({ accountId, err }, "Error disconnecting session during shutdown");
            })
          );
        }
        await Promise.allSettled(promises);
        this.sessions.clear();
        logger.info("WhatsAppSessionManager: All sessions disconnected");
      }
    };
    sessionManager = WhatsAppSessionManager.getInstance();
  }
});

// api/index.ts
var api_exports = {};
__export(api_exports, {
  default: () => handler
});
module.exports = __toCommonJS(api_exports);

// src/app.ts
var import_fastify = __toESM(require("fastify"));
var import_cookie = __toESM(require("@fastify/cookie"));
var import_cors = __toESM(require("@fastify/cors"));
var import_formbody = __toESM(require("@fastify/formbody"));
var import_rate_limit = __toESM(require("@fastify/rate-limit"));
var import_static = __toESM(require("@fastify/static"));
var import_websocket = __toESM(require("@fastify/websocket"));
var import_path4 = __toESM(require("path"));
var import_fs3 = __toESM(require("fs"));
init_config();

// src/middleware/request-id.middleware.ts
var import_uuid = require("uuid");
async function requestIdMiddleware(request, reply) {
  const existingId = request.headers["x-request-id"];
  const requestId = existingId || (0, import_uuid.v4)();
  request.id = requestId;
  reply.header("x-request-id", requestId);
}

// src/middleware/error-handler.ts
var import_zod2 = require("zod");
init_errors();

// src/utils/api-response.ts
function sendSuccess(reply, data, message = "Success", statusCode = 200, meta = {}) {
  const requestId = reply.request.id;
  const response = {
    success: true,
    data,
    message,
    errors: null,
    meta: {
      requestId,
      ...meta
    }
  };
  return reply.status(statusCode).send(response);
}
function sendError(reply, message, statusCode = 500, errors = null, meta = {}) {
  const requestId = reply.request.id;
  const response = {
    success: false,
    data: null,
    message,
    errors,
    meta: {
      requestId,
      ...meta
    }
  };
  return reply.status(statusCode).send(response);
}

// src/middleware/error-handler.ts
init_logger();
function errorHandler(error, request, reply) {
  logger.error(
    {
      err: error,
      url: request.url,
      method: request.method,
      requestId: request.id,
      userId: request.user?.id
    },
    "Request error occurred"
  );
  if (error instanceof import_zod2.ZodError) {
    const formattedErrors = {};
    for (const issue of error.issues) {
      const field = issue.path.join(".") || "body";
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push(issue.message);
    }
    return sendError(reply, "Validation error", 422, formattedErrors);
  }
  if (error instanceof AppError) {
    return sendError(reply, error.message, error.statusCode, error.errors);
  }
  if (error.statusCode === 429) {
    return sendError(reply, "Too many requests, please slow down.", 429);
  }
  if (error.statusCode === 404) {
    return sendError(reply, "Route not found", 404);
  }
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : error.message;
  return sendError(reply, message, error.statusCode || 500);
}

// src/modules/auth/auth.service.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
init_client();
init_schema();

// src/services/password.service.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var SALT_ROUNDS = 12;
var PasswordService = class {
  static async hash(password) {
    return import_bcryptjs.default.hash(password, SALT_ROUNDS);
  }
  static async compare(password, hash) {
    return import_bcryptjs.default.compare(password, hash);
  }
};

// src/modules/auth/auth.service.ts
init_config();
init_errors();
init_audit_service();

// src/utils/crypto.ts
var import_crypto = __toESM(require("crypto"));
init_config();
function generateRandomToken(bytes = 32) {
  return import_crypto.default.randomBytes(bytes).toString("hex");
}

// src/modules/auth/auth.service.ts
var import_drizzle_orm2 = require("drizzle-orm");
init_logger();
var AuthService = class {
  /**
   * Generate access and refresh tokens
   */
  static generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId
    };
    const accessToken = import_jsonwebtoken.default.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN
    });
    const refreshToken = import_jsonwebtoken.default.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN
    });
    return { accessToken, refreshToken };
  }
  /**
   * User login with email & password
   */
  static async login(input, context) {
    const user = await db.query.users.findFirst({
      where: (0, import_drizzle_orm2.eq)(users.email, input.email.toLowerCase())
    });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }
    if (user.status !== "active") {
      throw new UnauthorizedError("Account is inactive or suspended");
    }
    const isValid = await PasswordService.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }
    let remainingTrialDays = null;
    if (user.trialEndsAt) {
      const now = /* @__PURE__ */ new Date();
      if (now > user.trialEndsAt) {
        throw new UnauthorizedError("\u062A\u0645 \u062D\u0630\u0641\u0643 \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645 \u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629");
      }
      const diffMs = user.trialEndsAt.getTime() - now.getTime();
      remainingTrialDays = Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
    }
    await db.update(users).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(users.id, user.id));
    const userRole = await db.query.roles.findFirst({
      where: (0, import_drizzle_orm2.eq)(roles.id, user.roleId)
    });
    const assignedPerms = await db.select({ name: permissions.name }).from(rolePermissions).innerJoin(permissions, (0, import_drizzle_orm2.eq)(rolePermissions.permissionId, permissions.id)).where((0, import_drizzle_orm2.eq)(rolePermissions.roleId, user.roleId));
    const tokens = this.generateTokens(user);
    await AuditService.log({
      actorId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      metadata: { email: user.email }
    });
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: userRole?.name || "unknown",
        roleDisplayName: userRole?.displayName || "Unknown",
        permissions: assignedPerms.map((p) => p.name),
        remainingTrialDays
      },
      tokens
    };
  }
  /**
   * User registration (by default assigns 'employee' role if not specified)
   */
  static async register(input, context) {
    const existing = await db.query.users.findFirst({
      where: (0, import_drizzle_orm2.eq)(users.email, input.email.toLowerCase())
    });
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }
    let roleId = input.roleId;
    if (!roleId) {
      const defaultRole = await db.query.roles.findFirst({
        where: (0, import_drizzle_orm2.eq)(roles.name, "employee")
      });
      if (!defaultRole) {
        throw new Error("Default role not found in system");
      }
      roleId = defaultRole.id;
    }
    const passwordHash = await PasswordService.hash(input.password);
    const emailToken = generateRandomToken(16);
    const [newUser] = await db.insert(users).values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      roleId,
      emailToken,
      emailVerified: false,
      status: "active"
    }).returning();
    const userRole = await db.query.roles.findFirst({
      where: (0, import_drizzle_orm2.eq)(roles.id, newUser.roleId)
    });
    const assignedPerms = await db.select({ name: permissions.name }).from(rolePermissions).innerJoin(permissions, (0, import_drizzle_orm2.eq)(rolePermissions.permissionId, permissions.id)).where((0, import_drizzle_orm2.eq)(rolePermissions.roleId, newUser.roleId));
    const tokens = this.generateTokens(newUser);
    await AuditService.log({
      actorId: newUser.id,
      action: "auth.register",
      entityType: "user",
      entityId: newUser.id,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      metadata: { email: newUser.email }
    });
    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: userRole?.name || "employee",
        roleDisplayName: userRole?.displayName || "Employee",
        permissions: assignedPerms.map((p) => p.name)
      },
      tokens
    };
  }
  /**
   * Refresh access token using refresh token
   */
  static async refresh(refreshToken) {
    try {
      const decoded = import_jsonwebtoken.default.verify(refreshToken, config.JWT_REFRESH_SECRET);
      const user = await db.query.users.findFirst({
        where: (0, import_drizzle_orm2.eq)(users.id, decoded.userId)
      });
      if (!user || user.status !== "active") {
        throw new UnauthorizedError("User is no longer active");
      }
      return this.generateTokens(user);
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }
  }
  /**
   * Initiate forgot password flow
   */
  static async forgotPassword(input) {
    const user = await db.query.users.findFirst({
      where: (0, import_drizzle_orm2.eq)(users.email, input.email.toLowerCase())
    });
    if (!user) {
      return { message: "If the email exists, a password reset link has been sent." };
    }
    const resetToken = generateRandomToken(32);
    const resetExpires = new Date(Date.now() + 1e3 * 60 * 60);
    await db.update(users).set({ resetToken, resetExpires }).where((0, import_drizzle_orm2.eq)(users.id, user.id));
    logger.info(
      { email: user.email, resetToken, resetUrl: `${config.APP_URL}/reset-password?token=${resetToken}` },
      "Password reset requested"
    );
    return { message: "If the email exists, a password reset link has been sent." };
  }
  /**
   * Reset password using reset token
   */
  static async resetPassword(input) {
    const user = await db.query.users.findFirst({
      where: (0, import_drizzle_orm2.eq)(users.resetToken, input.token)
    });
    if (!user || !user.resetExpires || user.resetExpires < /* @__PURE__ */ new Date()) {
      throw new ValidationError("Invalid or expired reset token");
    }
    const passwordHash = await PasswordService.hash(input.password);
    await db.update(users).set({
      passwordHash,
      resetToken: null,
      resetExpires: null
    }).where((0, import_drizzle_orm2.eq)(users.id, user.id));
    await AuditService.log({
      actorId: user.id,
      action: "auth.reset_password",
      entityType: "user",
      entityId: user.id
    });
    return { message: "Password has been reset successfully. You may now log in." };
  }
  /**
   * Change password for logged-in user
   */
  static async changePassword(userId, input) {
    const user = await db.query.users.findFirst({
      where: (0, import_drizzle_orm2.eq)(users.id, userId)
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const matches = await PasswordService.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ValidationError("Incorrect current password");
    }
    const passwordHash = await PasswordService.hash(input.newPassword);
    await db.update(users).set({ passwordHash }).where((0, import_drizzle_orm2.eq)(users.id, user.id));
    await AuditService.log({
      actorId: user.id,
      action: "auth.change_password",
      entityType: "user",
      entityId: user.id
    });
    return { message: "Password changed successfully" };
  }
  /**
   * Get current user profile with role and permissions
   */
  static async getMe(userId) {
    const user = await db.query.users.findFirst({
      where: (0, import_drizzle_orm2.eq)(users.id, userId)
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const userRole = await db.query.roles.findFirst({
      where: (0, import_drizzle_orm2.eq)(roles.id, user.roleId)
    });
    const assignedPerms = await db.select({ name: permissions.name }).from(rolePermissions).innerJoin(permissions, (0, import_drizzle_orm2.eq)(rolePermissions.permissionId, permissions.id)).where((0, import_drizzle_orm2.eq)(rolePermissions.roleId, user.roleId));
    const [employee] = await db.select({ id: employees.id, stationId: employees.stationId }).from(employees).where((0, import_drizzle_orm2.eq)(employees.userId, user.id)).limit(1);
    return {
      id: user.id,
      employeeId: employee?.id || null,
      stationId: employee?.stationId || null,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: userRole?.name || "unknown",
      roleDisplayName: userRole?.displayName || "Unknown",
      permissions: assignedPerms.map((p) => p.name),
      createdAt: user.createdAt
    };
  }
};

// src/modules/auth/auth.schema.ts
var import_zod3 = require("zod");
var loginSchema = import_zod3.z.object({
  email: import_zod3.z.string().email("Invalid email address"),
  password: import_zod3.z.string().min(6, "Password must be at least 6 characters")
});
var registerSchema = import_zod3.z.object({
  name: import_zod3.z.string().min(2, "Name must be at least 2 characters").max(150),
  email: import_zod3.z.string().email("Invalid email address"),
  password: import_zod3.z.string().min(8, "Password must be at least 8 characters"),
  roleId: import_zod3.z.string().uuid("Invalid role ID").optional()
});
var forgotPasswordSchema = import_zod3.z.object({
  email: import_zod3.z.string().email("Invalid email address")
});
var resetPasswordSchema = import_zod3.z.object({
  token: import_zod3.z.string().min(1, "Token is required"),
  password: import_zod3.z.string().min(8, "Password must be at least 8 characters")
});
var changePasswordSchema = import_zod3.z.object({
  currentPassword: import_zod3.z.string().min(1, "Current password is required"),
  newPassword: import_zod3.z.string().min(8, "New password must be at least 8 characters")
});

// src/middleware/auth.middleware.ts
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
init_config();
init_errors();
init_client();
init_schema();
var import_drizzle_orm3 = require("drizzle-orm");
async function authenticate(request, reply) {
  let token;
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  if (!token && request.cookies?.access_token) {
    token = request.cookies.access_token;
  }
  if (!token && request.query?.token) {
    token = request.query.token;
  }
  if (!token) {
    throw new UnauthorizedError("Authentication required. Please log in.");
  }
  try {
    const decoded = import_jsonwebtoken2.default.verify(token, config.JWT_ACCESS_SECRET);
    const user = await db.query.users.findFirst({
      where: (0, import_drizzle_orm3.eq)(users.id, decoded.userId)
    });
    if (!user || user.status !== "active") {
      throw new UnauthorizedError("User account is inactive or not found.");
    }
    const userRole = await db.query.roles.findFirst({
      where: (0, import_drizzle_orm3.eq)(roles.id, user.roleId)
    });
    if (!userRole) {
      throw new UnauthorizedError("User role not found.");
    }
    const assignedPerms = await db.select({ name: permissions.name }).from(rolePermissions).innerJoin(permissions, (0, import_drizzle_orm3.eq)(rolePermissions.permissionId, permissions.id)).where((0, import_drizzle_orm3.eq)(rolePermissions.roleId, user.roleId));
    const permNames = assignedPerms.map((p) => p.name);
    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: userRole.name,
      permissions: permNames
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError("Invalid or expired token.");
  }
}

// src/modules/auth/auth.routes.ts
init_config();
function setAuthCookies(reply, tokens) {
  const isProd = config.NODE_ENV === "production" || !!process.env.VERCEL;
  reply.setCookie("access_token", tokens.accessToken, {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60
    // 15 mins in seconds
  });
  reply.setCookie("refresh_token", tokens.refreshToken, {
    path: "/api/v1/auth/refresh",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60
    // 7 days in seconds
  });
}
function clearAuthCookies(reply) {
  reply.clearCookie("access_token", { path: "/" });
  reply.clearCookie("refresh_token", { path: "/api/v1/auth/refresh" });
}
function getClientIp(request) {
  const xff = request.headers["x-forwarded-for"];
  if (typeof xff === "string")
    return xff.split(",")[0].trim();
  const xRealIp = request.headers["x-real-ip"];
  if (typeof xRealIp === "string")
    return xRealIp;
  try {
    return request.ip || "127.0.0.1";
  } catch (_e) {
    return "127.0.0.1";
  }
}
async function authRoutes(fastify2) {
  fastify2.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await AuthService.login(input, {
      ip: getClientIp(request),
      userAgent: request.headers["user-agent"]
    });
    setAuthCookies(reply, result.tokens);
    return sendSuccess(reply, { user: result.user, tokens: result.tokens }, "Login successful");
  });
  fastify2.post("/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const result = await AuthService.register(input, {
      ip: getClientIp(request),
      userAgent: request.headers["user-agent"]
    });
    setAuthCookies(reply, result.tokens);
    return sendSuccess(reply, { user: result.user, tokens: result.tokens }, "Registration successful", 201);
  });
  fastify2.post("/refresh", async (request, reply) => {
    let token = request.cookies?.refresh_token;
    if (!token && request.body && typeof request.body === "object" && "refreshToken" in request.body) {
      token = request.body.refreshToken;
    }
    if (!token) {
      return reply.status(401).send({
        success: false,
        data: null,
        message: "Refresh token missing",
        errors: null,
        meta: { requestId: request.id }
      });
    }
    const tokens = await AuthService.refresh(token);
    setAuthCookies(reply, tokens);
    return sendSuccess(reply, { tokens }, "Token refreshed");
  });
  fastify2.post("/logout", async (request, reply) => {
    clearAuthCookies(reply);
    return sendSuccess(reply, null, "Logged out successfully");
  });
  fastify2.post("/forgot-password", async (request, reply) => {
    const input = forgotPasswordSchema.parse(request.body);
    const result = await AuthService.forgotPassword(input);
    return sendSuccess(reply, result, result.message);
  });
  fastify2.post("/reset-password", async (request, reply) => {
    const input = resetPasswordSchema.parse(request.body);
    const result = await AuthService.resetPassword(input);
    return sendSuccess(reply, result, result.message);
  });
  fastify2.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const me = await AuthService.getMe(request.user.id);
    return sendSuccess(reply, me, "Current user profile");
  });
  fastify2.post(
    "/change-password",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const role = request.user?.roleName;
      if (role !== "adminstrator" && role !== "super_admin" && role !== "admin") {
        return reply.status(403).send({
          success: false,
          data: null,
          message: "\u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0642\u062A\u0635\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u062F\u064A\u0631 \u0641\u0642\u0637",
          errors: null,
          meta: { requestId: request.id }
        });
      }
      const input = changePasswordSchema.parse(request.body);
      const result = await AuthService.changePassword(request.user.id, input);
      return sendSuccess(reply, result, result.message);
    }
  );
}

// src/modules/roles/roles.service.ts
init_client();
init_schema();
var import_drizzle_orm4 = require("drizzle-orm");
init_errors();
init_audit_service();
var RolesService = class {
  static async listRoles() {
    const allRoles = await db.select().from(roles);
    const results = await Promise.all(
      allRoles.map(async (role) => {
        const assigned = await db.select({
          id: permissions.id,
          name: permissions.name,
          displayName: permissions.displayName,
          groupName: permissions.groupName
        }).from(rolePermissions).innerJoin(permissions, (0, import_drizzle_orm4.eq)(rolePermissions.permissionId, permissions.id)).where((0, import_drizzle_orm4.eq)(rolePermissions.roleId, role.id));
        return {
          ...role,
          permissions: assigned
        };
      })
    );
    return results;
  }
  static async listPermissions() {
    return db.select().from(permissions);
  }
  static async getRole(id) {
    const role = await db.query.roles.findFirst({
      where: (0, import_drizzle_orm4.eq)(roles.id, id)
    });
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    const assigned = await db.select({
      id: permissions.id,
      name: permissions.name,
      displayName: permissions.displayName,
      groupName: permissions.groupName
    }).from(rolePermissions).innerJoin(permissions, (0, import_drizzle_orm4.eq)(rolePermissions.permissionId, permissions.id)).where((0, import_drizzle_orm4.eq)(rolePermissions.roleId, role.id));
    return {
      ...role,
      permissions: assigned
    };
  }
  static async createRole(input, actorId) {
    const existing = await db.query.roles.findFirst({
      where: (0, import_drizzle_orm4.eq)(roles.name, input.name)
    });
    if (existing) {
      throw new ConflictError("A role with this name already exists");
    }
    const [newRole] = await db.insert(roles).values({
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      isSystem: false
    }).returning();
    const validPerms = await db.select().from(permissions).where((0, import_drizzle_orm4.inArray)(permissions.name, input.permissions));
    if (validPerms.length > 0) {
      await db.insert(rolePermissions).values(
        validPerms.map((p) => ({
          roleId: newRole.id,
          permissionId: p.id
        }))
      );
    }
    await AuditService.log({
      actorId,
      action: "role.create",
      entityType: "role",
      entityId: newRole.id,
      newValues: { name: newRole.name, permissions: input.permissions }
    });
    return this.getRole(newRole.id);
  }
  static async updateRole(id, input, actorId) {
    const role = await db.query.roles.findFirst({
      where: (0, import_drizzle_orm4.eq)(roles.id, id)
    });
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    if (role.isSystem && input.displayName && role.name === "super_admin") {
      throw new ValidationError("System super_admin role cannot be modified");
    }
    const oldRole = await this.getRole(id);
    await db.update(roles).set({
      displayName: input.displayName ?? role.displayName,
      description: input.description ?? role.description
    }).where((0, import_drizzle_orm4.eq)(roles.id, id));
    if (input.permissions) {
      await db.delete(rolePermissions).where((0, import_drizzle_orm4.eq)(rolePermissions.roleId, id));
      const validPerms = await db.select().from(permissions).where((0, import_drizzle_orm4.inArray)(permissions.name, input.permissions));
      if (validPerms.length > 0) {
        await db.insert(rolePermissions).values(
          validPerms.map((p) => ({
            roleId: id,
            permissionId: p.id
          }))
        );
      }
    }
    const updatedRole = await this.getRole(id);
    await AuditService.log({
      actorId,
      action: "role.update",
      entityType: "role",
      entityId: id,
      oldValues: oldRole,
      newValues: updatedRole
    });
    return updatedRole;
  }
};

// src/modules/roles/roles.schema.ts
var import_zod4 = require("zod");
var createRoleSchema = import_zod4.z.object({
  name: import_zod4.z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, "Name must be lowercase alphanumeric with underscores"),
  displayName: import_zod4.z.string().min(2).max(100),
  description: import_zod4.z.string().optional(),
  permissions: import_zod4.z.array(import_zod4.z.string()).min(1, "At least one permission must be assigned")
});
var updateRoleSchema = import_zod4.z.object({
  displayName: import_zod4.z.string().min(2).max(100).optional(),
  description: import_zod4.z.string().optional(),
  permissions: import_zod4.z.array(import_zod4.z.string()).optional()
});

// src/middleware/rbac.middleware.ts
init_errors();
function requirePermission(permissionName) {
  return async (request, reply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (request.user.roleName === "adminstrator" || request.user.roleName === "super_admin" || request.user.roleName === "admin") {
      return;
    }
    if (!request.user.permissions.includes(permissionName)) {
      throw new ForbiddenError(`Missing required permission: ${permissionName}`);
    }
  };
}

// src/modules/roles/roles.routes.ts
async function rolesRoutes(fastify2) {
  fastify2.addHook("preHandler", authenticate);
  fastify2.get(
    "/",
    { preHandler: [requirePermission("manage_roles")] },
    async (request, reply) => {
      const roles2 = await RolesService.listRoles();
      return sendSuccess(reply, roles2, "Roles retrieved");
    }
  );
  fastify2.get(
    "/permissions",
    { preHandler: [requirePermission("manage_roles")] },
    async (request, reply) => {
      const permissions2 = await RolesService.listPermissions();
      return sendSuccess(reply, permissions2, "Permissions retrieved");
    }
  );
  fastify2.get(
    "/:id",
    { preHandler: [requirePermission("manage_roles")] },
    async (request, reply) => {
      const { id } = request.params;
      const role = await RolesService.getRole(id);
      return sendSuccess(reply, role, "Role details");
    }
  );
  fastify2.post(
    "/",
    { preHandler: [requirePermission("manage_roles")] },
    async (request, reply) => {
      const input = createRoleSchema.parse(request.body);
      const role = await RolesService.createRole(input, request.user?.id);
      return sendSuccess(reply, role, "Role created successfully", 201);
    }
  );
  fastify2.put(
    "/:id",
    { preHandler: [requirePermission("manage_roles")] },
    async (request, reply) => {
      const { id } = request.params;
      const input = updateRoleSchema.parse(request.body);
      const role = await RolesService.updateRole(id, input, request.user?.id);
      return sendSuccess(reply, role, "Role updated successfully");
    }
  );
}

// src/modules/departments/departments.service.ts
init_client();
init_schema();
var import_drizzle_orm5 = require("drizzle-orm");
init_errors();
init_audit_service();
var DepartmentsService = class {
  static async getCompanyId() {
    const comp = await db.query.companies.findFirst();
    if (!comp) {
      throw new Error("Default company not found");
    }
    return comp.id;
  }
  static async list() {
    return db.select().from(departments);
  }
  static async getById(id) {
    const dept = await db.query.departments.findFirst({
      where: (0, import_drizzle_orm5.eq)(departments.id, id)
    });
    if (!dept) {
      throw new NotFoundError("Department not found");
    }
    return dept;
  }
  static async create(input, actorId) {
    const companyId = await this.getCompanyId();
    const [dept] = await db.insert(departments).values({
      companyId,
      name: input.name,
      description: input.description,
      active: input.active ?? true
    }).returning();
    await AuditService.log({
      actorId,
      action: "department.create",
      entityType: "department",
      entityId: dept.id,
      newValues: dept
    });
    return dept;
  }
  static async update(id, input, actorId) {
    const existing = await this.getById(id);
    const [updated] = await db.update(departments).set({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      active: input.active ?? existing.active,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm5.eq)(departments.id, id)).returning();
    await AuditService.log({
      actorId,
      action: "department.update",
      entityType: "department",
      entityId: id,
      oldValues: existing,
      newValues: updated
    });
    return updated;
  }
  static async delete(id, actorId) {
    const existing = await this.getById(id);
    await db.update(employees).set({ departmentId: null }).where((0, import_drizzle_orm5.eq)(employees.departmentId, id));
    await db.update(stations).set({ departmentId: null }).where((0, import_drizzle_orm5.eq)(stations.departmentId, id));
    await db.delete(departments).where((0, import_drizzle_orm5.eq)(departments.id, id));
    await AuditService.log({
      actorId,
      action: "department.delete",
      entityType: "department",
      entityId: id,
      oldValues: existing
    });
    return { success: true, message: "Department deleted successfully" };
  }
};

// src/modules/departments/departments.schema.ts
var import_zod5 = require("zod");
var createDepartmentSchema = import_zod5.z.object({
  name: import_zod5.z.string().min(2).max(150),
  code: import_zod5.z.string().optional(),
  description: import_zod5.z.string().optional(),
  active: import_zod5.z.boolean().default(true)
});
var updateDepartmentSchema = import_zod5.z.object({
  name: import_zod5.z.string().min(2).max(150).optional(),
  code: import_zod5.z.string().optional(),
  description: import_zod5.z.string().optional(),
  active: import_zod5.z.boolean().optional()
});

// src/modules/departments/departments.routes.ts
async function departmentsRoutes(fastify2) {
  fastify2.addHook("preHandler", authenticate);
  fastify2.get("/", async (request, reply) => {
    const depts = await DepartmentsService.list();
    return sendSuccess(reply, depts, "Departments retrieved");
  });
  fastify2.get("/:id", async (request, reply) => {
    const { id } = request.params;
    const dept = await DepartmentsService.getById(id);
    return sendSuccess(reply, dept, "Department details");
  });
  fastify2.post(
    "/",
    { preHandler: [requirePermission("manage_departments")] },
    async (request, reply) => {
      const input = createDepartmentSchema.parse(request.body);
      const dept = await DepartmentsService.create(input, request.user?.id);
      return sendSuccess(reply, dept, "Department created successfully", 201);
    }
  );
  fastify2.put(
    "/:id",
    { preHandler: [requirePermission("manage_departments")] },
    async (request, reply) => {
      const { id } = request.params;
      const input = updateDepartmentSchema.parse(request.body);
      const dept = await DepartmentsService.update(id, input, request.user?.id);
      return sendSuccess(reply, dept, "Department updated successfully");
    }
  );
  fastify2.delete(
    "/:id",
    { preHandler: [requirePermission("manage_departments")] },
    async (request, reply) => {
      const { id } = request.params;
      const result = await DepartmentsService.delete(id, request.user?.id);
      return sendSuccess(reply, result, "Department deleted successfully");
    }
  );
}

// src/modules/stations/stations.service.ts
init_client();
init_schema();
var import_drizzle_orm6 = require("drizzle-orm");
init_errors();
init_audit_service();
var StationsService = class {
  static async getCompanyId() {
    const comp = await db.query.companies.findFirst();
    if (!comp) {
      throw new Error("Default company not found");
    }
    return comp.id;
  }
  static async list() {
    const allStations = await db.select({
      id: stations.id,
      name: stations.name,
      code: stations.code,
      color: stations.color,
      description: stations.description,
      maxCapacity: stations.maxCapacity,
      routingWeight: stations.routingWeight,
      active: stations.active,
      departmentId: stations.departmentId,
      departmentName: departments.name,
      createdAt: stations.createdAt,
      updatedAt: stations.updatedAt
    }).from(stations).leftJoin(departments, (0, import_drizzle_orm6.eq)(stations.departmentId, departments.id));
    const stationsWithStaff = await Promise.all(
      allStations.map(async (st) => {
        const staff = await db.select({
          employeeId: employees.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          status: employees.status,
          whatsappNumber: employees.whatsappNumber
        }).from(employees).innerJoin(users, (0, import_drizzle_orm6.eq)(employees.userId, users.id)).where((0, import_drizzle_orm6.eq)(employees.stationId, st.id));
        const [chatsRow] = await db.select({ count: import_drizzle_orm6.sql`count(*)::int` }).from(conversations).where((0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(conversations.assignedStationId, st.id), (0, import_drizzle_orm6.eq)(conversations.status, "open")));
        return {
          ...st,
          code: st.code || "",
          color: st.color || "#1c9770",
          maxCapacity: st.maxCapacity,
          isUnlimited: st.maxCapacity === null,
          routingWeight: st.routingWeight ?? 1,
          status: st.active ? "active" : "inactive",
          assignedAgentsCount: staff.length,
          employeeCount: staff.length,
          activeChatsCount: chatsRow?.count || 0,
          employees: staff,
          employeeIds: staff.map((s) => s.employeeId)
        };
      })
    );
    return stationsWithStaff;
  }
  static async getById(id) {
    const st = await db.select({
      id: stations.id,
      name: stations.name,
      code: stations.code,
      color: stations.color,
      description: stations.description,
      maxCapacity: stations.maxCapacity,
      routingWeight: stations.routingWeight,
      active: stations.active,
      departmentId: stations.departmentId,
      departmentName: departments.name,
      createdAt: stations.createdAt,
      updatedAt: stations.updatedAt
    }).from(stations).leftJoin(departments, (0, import_drizzle_orm6.eq)(stations.departmentId, departments.id)).where((0, import_drizzle_orm6.eq)(stations.id, id)).then((rows) => rows[0]);
    if (!st) {
      throw new NotFoundError("Station not found");
    }
    const staff = await db.select({
      employeeId: employees.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      status: employees.status,
      whatsappNumber: employees.whatsappNumber
    }).from(employees).innerJoin(users, (0, import_drizzle_orm6.eq)(employees.userId, users.id)).where((0, import_drizzle_orm6.eq)(employees.stationId, st.id));
    const [chatsRow] = await db.select({ count: import_drizzle_orm6.sql`count(*)::int` }).from(conversations).where((0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(conversations.assignedStationId, st.id), (0, import_drizzle_orm6.eq)(conversations.status, "open")));
    return {
      ...st,
      code: st.code || "",
      color: st.color || "#1c9770",
      maxCapacity: st.maxCapacity,
      isUnlimited: st.maxCapacity === null,
      routingWeight: st.routingWeight ?? 1,
      status: st.active ? "active" : "inactive",
      assignedAgentsCount: staff.length,
      employeeCount: staff.length,
      activeChatsCount: chatsRow?.count || 0,
      employees: staff,
      employeeIds: staff.map((s) => s.employeeId)
    };
  }
  static async create(input, actorId) {
    const companyId = await this.getCompanyId();
    const [station] = await db.insert(stations).values({
      companyId,
      departmentId: input.departmentId || null,
      name: input.name,
      code: input.code || null,
      color: input.color || "#1c9770",
      description: input.description || null,
      maxCapacity: input.maxCapacity !== void 0 ? input.maxCapacity : 20,
      routingWeight: input.routingWeight ?? 1,
      active: input.active ?? true
    }).returning();
    if (input.employeeIds && input.employeeIds.length > 0) {
      await db.update(employees).set({ stationId: station.id }).where((0, import_drizzle_orm6.inArray)(employees.id, input.employeeIds));
    }
    await AuditService.log({
      actorId,
      action: "station.create",
      entityType: "station",
      entityId: station.id,
      newValues: station
    });
    return this.getById(station.id);
  }
  static async update(id, input, actorId) {
    const existing = await this.getById(id);
    const [updated] = await db.update(stations).set({
      name: input.name ?? existing.name,
      departmentId: input.departmentId !== void 0 ? input.departmentId : existing.departmentId,
      code: input.code !== void 0 ? input.code : existing.code,
      color: input.color !== void 0 ? input.color : existing.color,
      description: input.description !== void 0 ? input.description : existing.description,
      maxCapacity: input.maxCapacity !== void 0 ? input.maxCapacity : existing.maxCapacity,
      routingWeight: input.routingWeight !== void 0 ? input.routingWeight : existing.routingWeight,
      active: input.active !== void 0 ? input.active : existing.active,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm6.eq)(stations.id, id)).returning();
    if (input.employeeIds !== void 0) {
      await db.update(employees).set({ stationId: null }).where((0, import_drizzle_orm6.eq)(employees.stationId, id));
      if (input.employeeIds.length > 0) {
        await db.update(employees).set({ stationId: id }).where((0, import_drizzle_orm6.inArray)(employees.id, input.employeeIds));
      }
    }
    await AuditService.log({
      actorId,
      action: "station.update",
      entityType: "station",
      entityId: id,
      oldValues: existing,
      newValues: updated
    });
    return this.getById(id);
  }
  static async delete(id, actorId) {
    const existing = await this.getById(id);
    await db.update(employees).set({ stationId: null }).where((0, import_drizzle_orm6.eq)(employees.stationId, id));
    await db.update(conversations).set({ assignedStationId: null }).where((0, import_drizzle_orm6.eq)(conversations.assignedStationId, id));
    await db.update(leads).set({ stationId: null }).where((0, import_drizzle_orm6.eq)(leads.stationId, id));
    await db.delete(stations).where((0, import_drizzle_orm6.eq)(stations.id, id));
    await AuditService.log({
      actorId,
      action: "station.delete",
      entityType: "station",
      entityId: id,
      oldValues: existing
    });
    return { success: true, message: "Station deleted successfully" };
  }
};

// src/modules/stations/stations.schema.ts
var import_zod6 = require("zod");
var emptyToNull = (val) => val === "" || val === void 0 ? null : val;
var createStationSchema = import_zod6.z.object({
  name: import_zod6.z.string().min(2).max(150),
  departmentId: import_zod6.z.preprocess(emptyToNull, import_zod6.z.string().uuid().nullable().optional()),
  description: import_zod6.z.preprocess(emptyToNull, import_zod6.z.string().nullable().optional()),
  code: import_zod6.z.preprocess(emptyToNull, import_zod6.z.string().nullable().optional()),
  color: import_zod6.z.string().optional().default("#1c9770"),
  maxCapacity: import_zod6.z.preprocess(emptyToNull, import_zod6.z.coerce.number().min(1).max(1e3).nullable().optional()),
  routingWeight: import_zod6.z.coerce.number().min(1).max(50).optional().default(1),
  active: import_zod6.z.boolean().default(true),
  status: import_zod6.z.enum(["active", "inactive"]).optional(),
  employeeIds: import_zod6.z.array(import_zod6.z.string().uuid()).optional()
}).transform((data) => {
  if (data.status !== void 0) {
    data.active = data.status === "active";
  }
  return data;
});
var updateStationSchema = import_zod6.z.object({
  name: import_zod6.z.string().min(2).max(150).optional(),
  departmentId: import_zod6.z.preprocess(emptyToNull, import_zod6.z.string().uuid().nullable().optional()),
  description: import_zod6.z.preprocess(emptyToNull, import_zod6.z.string().nullable().optional()),
  code: import_zod6.z.preprocess(emptyToNull, import_zod6.z.string().nullable().optional()),
  color: import_zod6.z.string().optional(),
  maxCapacity: import_zod6.z.preprocess(emptyToNull, import_zod6.z.coerce.number().min(1).max(1e3).nullable().optional()),
  routingWeight: import_zod6.z.coerce.number().min(1).max(50).optional(),
  active: import_zod6.z.boolean().optional(),
  status: import_zod6.z.enum(["active", "inactive"]).optional(),
  employeeIds: import_zod6.z.array(import_zod6.z.string().uuid()).optional()
}).transform((data) => {
  if (data.status !== void 0 && data.active === void 0) {
    data.active = data.status === "active";
  }
  return data;
});

// src/modules/stations/stations.routes.ts
async function stationsRoutes(fastify2) {
  fastify2.addHook("preHandler", authenticate);
  fastify2.get("/", async (request, reply) => {
    const list = await StationsService.list();
    return sendSuccess(reply, list, "Stations retrieved");
  });
  fastify2.get("/:id", async (request, reply) => {
    const { id } = request.params;
    const station = await StationsService.getById(id);
    return sendSuccess(reply, station, "Station details");
  });
  fastify2.post(
    "/",
    { preHandler: [requirePermission("manage_stations")] },
    async (request, reply) => {
      const input = createStationSchema.parse(request.body);
      const station = await StationsService.create(input, request.user?.id);
      return sendSuccess(reply, station, "Station created successfully", 201);
    }
  );
  fastify2.put(
    "/:id",
    { preHandler: [requirePermission("manage_stations")] },
    async (request, reply) => {
      const { id } = request.params;
      const input = updateStationSchema.parse(request.body);
      const station = await StationsService.update(id, input, request.user?.id);
      return sendSuccess(reply, station, "Station updated successfully");
    }
  );
  fastify2.delete(
    "/:id",
    { preHandler: [requirePermission("manage_stations")] },
    async (request, reply) => {
      const { id } = request.params;
      const result = await StationsService.delete(id, request.user?.id);
      return sendSuccess(reply, result, "Station deleted successfully");
    }
  );
}

// src/modules/employees/employees.service.ts
init_client();
init_schema();
var import_drizzle_orm7 = require("drizzle-orm");
var import_pg_core27 = require("drizzle-orm/pg-core");
init_errors();
init_audit_service();
var supervisorEmployee = (0, import_pg_core27.alias)(employees, "supervisor_employee");
var supervisorUser = (0, import_pg_core27.alias)(users, "supervisor_user");
var EmployeesService = class {
  static async getCompanyId() {
    const comp = await db.query.companies.findFirst();
    if (!comp) {
      throw new Error("Default company not found");
    }
    return comp.id;
  }
  static async list(filters) {
    const conditions = [];
    if (filters?.departmentId) {
      conditions.push((0, import_drizzle_orm7.eq)(employees.departmentId, filters.departmentId));
    }
    if (filters?.stationId) {
      conditions.push((0, import_drizzle_orm7.eq)(employees.stationId, filters.stationId));
    }
    if (filters?.supervisorId) {
      conditions.push((0, import_drizzle_orm7.eq)(employees.supervisorId, filters.supervisorId));
    }
    if (filters?.status) {
      conditions.push((0, import_drizzle_orm7.eq)(employees.status, filters.status));
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm7.and)(...conditions) : void 0;
    const rows = await db.select({
      id: employees.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      roleId: roles.id,
      roleName: roles.name,
      roleDisplayName: roles.displayName,
      departmentId: departments.id,
      departmentName: departments.name,
      stationId: stations.id,
      stationName: stations.name,
      supervisorId: employees.supervisorId,
      supervisorName: supervisorUser.name,
      whatsappNumber: employees.whatsappNumber,
      phone: employees.whatsappNumber,
      status: employees.status,
      lastSeenAt: employees.lastSeenAt,
      createdAt: employees.createdAt
    }).from(employees).innerJoin(users, (0, import_drizzle_orm7.eq)(employees.userId, users.id)).innerJoin(roles, (0, import_drizzle_orm7.eq)(users.roleId, roles.id)).leftJoin(departments, (0, import_drizzle_orm7.eq)(employees.departmentId, departments.id)).leftJoin(stations, (0, import_drizzle_orm7.eq)(employees.stationId, stations.id)).leftJoin(supervisorEmployee, (0, import_drizzle_orm7.eq)(employees.supervisorId, supervisorEmployee.id)).leftJoin(supervisorUser, (0, import_drizzle_orm7.eq)(supervisorEmployee.userId, supervisorUser.id)).where(whereClause);
    const withWorkload = await Promise.all(
      rows.map(async (emp) => {
        const [openChats, pendingLeads, pendingReminders] = await Promise.all([
          db.select({ count: import_drizzle_orm7.sql`count(*)` }).from(conversations).where(
            (0, import_drizzle_orm7.and)(
              (0, import_drizzle_orm7.eq)(conversations.assignedEmployeeId, emp.id),
              (0, import_drizzle_orm7.eq)(conversations.status, "open")
            )
          ).then((r) => Number(r[0]?.count || 0)),
          db.select({ count: import_drizzle_orm7.sql`count(*)` }).from(leads).where(
            (0, import_drizzle_orm7.and)(
              (0, import_drizzle_orm7.eq)(leads.assignedEmployeeId, emp.id),
              (0, import_drizzle_orm7.eq)(leads.stage, "new")
            )
          ).then((r) => Number(r[0]?.count || 0)),
          db.select({ count: import_drizzle_orm7.sql`count(*)` }).from(reminders).where(
            (0, import_drizzle_orm7.and)(
              (0, import_drizzle_orm7.eq)(reminders.assignedUserId, emp.userId),
              (0, import_drizzle_orm7.eq)(reminders.status, "pending")
            )
          ).then((r) => Number(r[0]?.count || 0))
        ]);
        return {
          ...emp,
          workload: {
            openConversations: openChats,
            newLeads: pendingLeads,
            pendingReminders,
            totalScore: openChats * 2 + pendingLeads * 3 + pendingReminders
          }
        };
      })
    );
    return withWorkload;
  }
  static async getById(id) {
    const rows = await db.select({
      id: employees.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      roleId: roles.id,
      roleName: roles.name,
      roleDisplayName: roles.displayName,
      departmentId: departments.id,
      departmentName: departments.name,
      stationId: stations.id,
      stationName: stations.name,
      supervisorId: employees.supervisorId,
      supervisorName: supervisorUser.name,
      whatsappNumber: employees.whatsappNumber,
      phone: employees.whatsappNumber,
      status: employees.status,
      lastSeenAt: employees.lastSeenAt,
      createdAt: employees.createdAt
    }).from(employees).innerJoin(users, (0, import_drizzle_orm7.eq)(employees.userId, users.id)).innerJoin(roles, (0, import_drizzle_orm7.eq)(users.roleId, roles.id)).leftJoin(departments, (0, import_drizzle_orm7.eq)(employees.departmentId, departments.id)).leftJoin(stations, (0, import_drizzle_orm7.eq)(employees.stationId, stations.id)).leftJoin(supervisorEmployee, (0, import_drizzle_orm7.eq)(employees.supervisorId, supervisorEmployee.id)).leftJoin(supervisorUser, (0, import_drizzle_orm7.eq)(supervisorEmployee.userId, supervisorUser.id)).where((0, import_drizzle_orm7.eq)(employees.id, id));
    const emp = rows[0];
    if (!emp) {
      throw new NotFoundError("Employee not found");
    }
    const [openChats, pendingLeads, pendingReminders] = await Promise.all([
      db.select({ count: import_drizzle_orm7.sql`count(*)` }).from(conversations).where(
        (0, import_drizzle_orm7.and)(
          (0, import_drizzle_orm7.eq)(conversations.assignedEmployeeId, emp.id),
          (0, import_drizzle_orm7.eq)(conversations.status, "open")
        )
      ).then((r) => Number(r[0]?.count || 0)),
      db.select({ count: import_drizzle_orm7.sql`count(*)` }).from(leads).where(
        (0, import_drizzle_orm7.and)(
          (0, import_drizzle_orm7.eq)(leads.assignedEmployeeId, emp.id),
          (0, import_drizzle_orm7.eq)(leads.stage, "new")
        )
      ).then((r) => Number(r[0]?.count || 0)),
      db.select({ count: import_drizzle_orm7.sql`count(*)` }).from(reminders).where(
        (0, import_drizzle_orm7.and)(
          (0, import_drizzle_orm7.eq)(reminders.assignedUserId, emp.userId),
          (0, import_drizzle_orm7.eq)(reminders.status, "pending")
        )
      ).then((r) => Number(r[0]?.count || 0))
    ]);
    return {
      ...emp,
      workload: {
        openConversations: openChats,
        newLeads: pendingLeads,
        pendingReminders
      }
    };
  }
  static async create(input, actorId) {
    const existing = await db.query.users.findFirst({
      where: (0, import_drizzle_orm7.eq)(users.email, input.email.toLowerCase())
    });
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }
    const companyId = await this.getCompanyId();
    const passwordHash = await PasswordService.hash(input.password || "Password123!");
    let roleId = input.roleId;
    if (!roleId) {
      const defaultRole = await db.query.roles.findFirst({
        where: (0, import_drizzle_orm7.or)((0, import_drizzle_orm7.eq)(roles.name, "employee"), (0, import_drizzle_orm7.eq)(roles.name, "staff"))
      }) || await db.query.roles.findFirst();
      if (!defaultRole) {
        throw new Error("No roles configured in system");
      }
      roleId = defaultRole.id;
    }
    const [newUser] = await db.insert(users).values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      roleId,
      emailVerified: true,
      status: "active"
    }).returning();
    const [newEmployee] = await db.insert(employees).values({
      userId: newUser.id,
      companyId,
      departmentId: input.departmentId || null,
      stationId: input.stationId || null,
      supervisorId: input.supervisorId || null,
      whatsappNumber: input.whatsappNumber || null,
      status: input.status
    }).returning();
    await AuditService.log({
      actorId,
      action: "employee.create",
      entityType: "employee",
      entityId: newEmployee.id,
      newValues: {
        id: newEmployee.id,
        name: newUser.name,
        email: newUser.email,
        departmentId: input.departmentId,
        stationId: input.stationId,
        supervisorId: input.supervisorId
      }
    });
    return this.getById(newEmployee.id);
  }
  static async update(id, input, actorId) {
    const current = await this.getById(id);
    if (input.name || input.email || input.roleId) {
      const userUpdates = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.name)
        userUpdates.name = input.name;
      if (input.email)
        userUpdates.email = input.email.toLowerCase();
      if (input.roleId)
        userUpdates.roleId = input.roleId;
      await db.update(users).set(userUpdates).where((0, import_drizzle_orm7.eq)(users.id, current.userId));
    }
    const empUpdates = { updatedAt: /* @__PURE__ */ new Date() };
    if (input.departmentId !== void 0)
      empUpdates.departmentId = input.departmentId;
    if (input.stationId !== void 0)
      empUpdates.stationId = input.stationId;
    if (input.supervisorId !== void 0)
      empUpdates.supervisorId = input.supervisorId;
    if (input.whatsappNumber !== void 0)
      empUpdates.whatsappNumber = input.whatsappNumber;
    if (input.status !== void 0)
      empUpdates.status = input.status;
    await db.update(employees).set(empUpdates).where((0, import_drizzle_orm7.eq)(employees.id, id));
    const updated = await this.getById(id);
    await AuditService.log({
      actorId,
      action: "employee.update",
      entityType: "employee",
      entityId: id,
      oldValues: current,
      newValues: updated
    });
    return updated;
  }
  static async updateStatus(id, status) {
    const [emp] = await db.update(employees).set({
      status,
      lastSeenAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm7.eq)(employees.id, id)).returning();
    if (!emp) {
      throw new NotFoundError("Employee not found");
    }
    return emp;
  }
  static async getSupervisors() {
    return db.select({
      id: employees.id,
      name: users.name,
      email: users.email,
      roleName: roles.name
    }).from(employees).innerJoin(users, (0, import_drizzle_orm7.eq)(employees.userId, users.id)).innerJoin(roles, (0, import_drizzle_orm7.eq)(users.roleId, roles.id)).where(
      (0, import_drizzle_orm7.or)(
        (0, import_drizzle_orm7.eq)(roles.name, "adminstrator"),
        (0, import_drizzle_orm7.eq)(roles.name, "supervisor"),
        (0, import_drizzle_orm7.eq)(roles.name, "admin"),
        (0, import_drizzle_orm7.eq)(roles.name, "super_admin")
      )
    );
  }
  static async delete(id, actorId) {
    const current = await this.getById(id);
    await db.update(conversations).set({ assignedEmployeeId: null }).where((0, import_drizzle_orm7.eq)(conversations.assignedEmployeeId, id));
    await db.update(leads).set({ assignedEmployeeId: null }).where((0, import_drizzle_orm7.eq)(leads.assignedEmployeeId, id));
    await db.update(employees).set({ supervisorId: null }).where((0, import_drizzle_orm7.eq)(employees.supervisorId, id));
    await db.delete(employees).where((0, import_drizzle_orm7.eq)(employees.id, id));
    if (current.userId) {
      await db.delete(users).where((0, import_drizzle_orm7.eq)(users.id, current.userId));
    }
    await AuditService.log({
      actorId,
      action: "employee.delete",
      entityType: "employee",
      entityId: id,
      oldValues: current
    });
    return { success: true, message: "Employee deleted successfully" };
  }
};

// src/modules/employees/employees.schema.ts
var import_zod7 = require("zod");
init_phone_validator();
var emptyToNull2 = (val) => val === "" || val === void 0 ? null : val;
var emptyToUndefined = (val) => val === "" || val === null ? void 0 : val;
var createEmployeeSchema = import_zod7.z.object({
  name: import_zod7.z.string().min(2).max(150).optional(),
  fullName: import_zod7.z.string().min(2).max(150).optional(),
  email: import_zod7.z.string().email(),
  password: import_zod7.z.string().min(6).optional().default("Password123!"),
  roleId: import_zod7.z.preprocess(emptyToUndefined, import_zod7.z.string().uuid().optional()),
  departmentId: import_zod7.z.preprocess(emptyToNull2, import_zod7.z.string().uuid().nullable().optional()),
  stationId: import_zod7.z.preprocess(emptyToNull2, import_zod7.z.string().uuid().nullable().optional()),
  stationIds: import_zod7.z.array(import_zod7.z.string()).optional(),
  supervisorId: import_zod7.z.preprocess(emptyToNull2, import_zod7.z.string().uuid().nullable().optional()),
  whatsappNumber: import_zod7.z.string().max(50).nullable().optional(),
  phone: import_zod7.z.string().max(50).nullable().optional(),
  status: import_zod7.z.enum(["active", "inactive", "away", "offline"]).default("active")
}).transform((data) => {
  const finalName = (data.name || data.fullName || "").trim();
  const rawPhone = (data.whatsappNumber || data.phone || "").trim();
  let normalizedPhone = null;
  if (rawPhone) {
    const val = validateAndFormatPhone(rawPhone);
    normalizedPhone = val.isValid ? val.formatted : rawPhone;
  }
  const finalStationId = data.stationId || (data.stationIds && data.stationIds.length > 0 ? data.stationIds[0] : null);
  return {
    ...data,
    name: finalName,
    whatsappNumber: normalizedPhone,
    phone: normalizedPhone,
    stationId: finalStationId
  };
});
var updateEmployeeSchema = import_zod7.z.object({
  name: import_zod7.z.string().min(2).max(150).optional(),
  fullName: import_zod7.z.string().min(2).max(150).optional(),
  email: import_zod7.z.string().email().optional(),
  roleId: import_zod7.z.preprocess(emptyToUndefined, import_zod7.z.string().uuid().optional()),
  departmentId: import_zod7.z.preprocess(emptyToNull2, import_zod7.z.string().uuid().nullable().optional()),
  stationId: import_zod7.z.preprocess(emptyToNull2, import_zod7.z.string().uuid().nullable().optional()),
  stationIds: import_zod7.z.array(import_zod7.z.string()).optional(),
  supervisorId: import_zod7.z.preprocess(emptyToNull2, import_zod7.z.string().uuid().nullable().optional()),
  whatsappNumber: import_zod7.z.string().max(50).nullable().optional(),
  phone: import_zod7.z.string().max(50).nullable().optional(),
  status: import_zod7.z.enum(["active", "inactive", "away", "offline"]).optional()
}).transform((data) => {
  const transformed = { ...data };
  if (data.name || data.fullName) {
    transformed.name = (data.name || data.fullName || "").trim();
  }
  if (data.whatsappNumber !== void 0 || data.phone !== void 0) {
    const raw = (data.whatsappNumber !== void 0 ? data.whatsappNumber : data.phone) || "";
    if (raw && typeof raw === "string" && raw.trim()) {
      const val = validateAndFormatPhone(raw.trim());
      transformed.whatsappNumber = val.isValid ? val.formatted : raw.trim();
      transformed.phone = transformed.whatsappNumber;
    } else {
      transformed.whatsappNumber = null;
      transformed.phone = null;
    }
  }
  if (data.stationId !== void 0 || data.stationIds && data.stationIds.length > 0) {
    transformed.stationId = data.stationId || (data.stationIds && data.stationIds.length > 0 ? data.stationIds[0] : null);
  }
  return transformed;
});
var updateEmployeeStatusSchema = import_zod7.z.object({
  status: import_zod7.z.enum(["active", "inactive", "away", "offline"])
});

// src/modules/employees/employees.routes.ts
async function employeesRoutes(fastify2) {
  fastify2.addHook("preHandler", authenticate);
  fastify2.get(
    "/",
    { preHandler: [requirePermission("manage_employees")] },
    async (request, reply) => {
      const query = request.query;
      const list = await EmployeesService.list(query);
      return sendSuccess(reply, list, "Employees retrieved");
    }
  );
  fastify2.get(
    "/supervisors",
    { preHandler: [requirePermission("manage_employees")] },
    async (request, reply) => {
      const supervisors = await EmployeesService.getSupervisors();
      return sendSuccess(reply, supervisors, "Supervisors retrieved");
    }
  );
  fastify2.get(
    "/:id",
    { preHandler: [requirePermission("manage_employees")] },
    async (request, reply) => {
      const { id } = request.params;
      const employee = await EmployeesService.getById(id);
      return sendSuccess(reply, employee, "Employee details");
    }
  );
  fastify2.post(
    "/",
    { preHandler: [requirePermission("manage_employees")] },
    async (request, reply) => {
      const input = createEmployeeSchema.parse(request.body);
      const employee = await EmployeesService.create(input, request.user?.id);
      return sendSuccess(reply, employee, "Employee created successfully", 201);
    }
  );
  fastify2.put(
    "/:id",
    { preHandler: [requirePermission("manage_employees")] },
    async (request, reply) => {
      const { id } = request.params;
      const input = updateEmployeeSchema.parse(request.body);
      const employee = await EmployeesService.update(id, input, request.user?.id);
      return sendSuccess(reply, employee, "Employee updated successfully");
    }
  );
  fastify2.patch("/:id/status", async (request, reply) => {
    const { id } = request.params;
    const { status } = updateEmployeeStatusSchema.parse(request.body);
    const employee = await EmployeesService.updateStatus(id, status);
    return sendSuccess(reply, employee, "Status updated");
  });
  fastify2.delete(
    "/:id",
    { preHandler: [requirePermission("manage_employees")] },
    async (request, reply) => {
      const { id } = request.params;
      const result = await EmployeesService.delete(id, request.user?.id);
      return sendSuccess(reply, result, "Employee deleted successfully");
    }
  );
}

// src/modules/audit/audit.routes.ts
init_audit_service();
async function auditRoutes(fastify2) {
  fastify2.addHook("preHandler", authenticate);
  fastify2.get(
    "/",
    { preHandler: [requirePermission("view_audit_logs")] },
    async (request, reply) => {
      const query = request.query;
      const result = await AuditService.list({
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 20,
        entityType: query.entityType,
        actorId: query.actorId
      });
      return sendSuccess(reply, result.items, "Audit logs retrieved", 200, result.pagination);
    }
  );
}

// src/modules/settings/settings.routes.ts
init_settings_service();

// src/modules/settings/settings.schema.ts
var import_zod8 = require("zod");
var updateSettingSchema = import_zod8.z.object({
  value: import_zod8.z.any()
});
var updateMultipleSettingsSchema = import_zod8.z.object({
  settings: import_zod8.z.record(import_zod8.z.any())
});

// src/modules/settings/settings.routes.ts
async function settingsRoutes(fastify2) {
  fastify2.addHook("preHandler", authenticate);
  fastify2.get(
    "/",
    { preHandler: [requirePermission("manage_settings")] },
    async (request, reply) => {
      const all = await SettingsService.getAll();
      return sendSuccess(reply, { ...all.map, list: all.list, map: all.map }, "Settings retrieved");
    }
  );
  fastify2.get("/:key", async (request, reply) => {
    const { key } = request.params;
    const val = await SettingsService.get(key);
    return sendSuccess(reply, { key, value: val }, "Setting value");
  });
  const handleBatchUpdate = async (request, reply) => {
    let settingsToUpdate = {};
    if (request.body && typeof request.body === "object") {
      if ("settings" in request.body && typeof request.body.settings === "object") {
        settingsToUpdate = request.body.settings;
      } else {
        settingsToUpdate = request.body;
      }
    }
    delete settingsToUpdate.list;
    delete settingsToUpdate.map;
    delete settingsToUpdate.results;
    const results = await SettingsService.updateBatch(settingsToUpdate, request.user?.id);
    const all = await SettingsService.getAll();
    return sendSuccess(reply, { ...all.map, results }, "Settings updated successfully");
  };
  fastify2.post("/", { preHandler: [requirePermission("manage_settings")] }, handleBatchUpdate);
  fastify2.put("/", { preHandler: [requirePermission("manage_settings")] }, handleBatchUpdate);
  fastify2.put(
    "/:key",
    { preHandler: [requirePermission("manage_settings")] },
    async (request, reply) => {
      const { key } = request.params;
      const input = updateSettingSchema.parse(request.body);
      const updated = await SettingsService.set(key, input.value, request.user?.id);
      return sendSuccess(reply, updated, `Setting "${key}" updated`);
    }
  );
}

// src/modules/health/health.routes.ts
init_client();
var import_drizzle_orm9 = require("drizzle-orm");
async function healthRoutes(fastify2) {
  fastify2.get("/", async (request, reply) => {
    return sendSuccess(
      reply,
      {
        status: "healthy",
        timestamp: /* @__PURE__ */ new Date(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: "1.0.0"
      },
      "Trenty Vision CRM is operational"
    );
  });
  fastify2.get("/database", async (request, reply) => {
    try {
      const start = Date.now();
      await db.execute(import_drizzle_orm9.sql`SELECT 1`);
      const latencyMs = Date.now() - start;
      return sendSuccess(
        reply,
        {
          status: "connected",
          latencyMs,
          totalPoolClients: pool.totalCount,
          idleClients: pool.idleCount
        },
        "Database connection active"
      );
    } catch (err) {
      return sendError(reply, `Database health check failed: ${err.message}`, 503);
    }
  });
  fastify2.get("/whatsapp", async (request, reply) => {
    return sendSuccess(
      reply,
      {
        status: "ready_for_phase_2",
        gateway: "Baileys",
        activeSessions: 0
      },
      "WhatsApp Gateway subsystem initialized"
    );
  });
  fastify2.get("/storage", async (request, reply) => {
    return sendSuccess(
      reply,
      {
        driver: "local",
        status: "writable"
      },
      "Storage provider active"
    );
  });
  fastify2.get("/crm", async (request, reply) => {
    return sendSuccess(
      reply,
      {
        status: "configured",
        connectionsCount: 0
      },
      "CRM integration layer active"
    );
  });
}

// src/modules/whatsapp/whatsapp.routes.ts
var import_drizzle_orm16 = require("drizzle-orm");
var import_zod9 = require("zod");
init_client();
init_schema();
init_config();
init_ws_hub();
init_logger();
async function getLocalSessionManager() {
  if (config.DEPLOYMENT_MODE === "local") {
    try {
      const mod = await Promise.resolve().then(() => (init_session_manager(), session_manager_exports));
      return mod.sessionManager;
    } catch (e) {
      logger.warn({ err: e }, "Could not load local sessionManager");
      return null;
    }
  }
  return null;
}
async function queueBridgeCommand(companyId, accountId, action, payload = {}) {
  const [cmd] = await db.insert(bridgeCommands).values({
    companyId,
    accountId,
    action,
    payload,
    status: "pending"
  }).returning();
  return cmd;
}
var createAccountSchema = import_zod9.z.object({
  displayName: import_zod9.z.string().min(1).max(150)
});
async function whatsappRoutes(app) {
  app.get("/accounts", async (request, reply) => {
    const accounts = await db.select().from(whatsappAccounts).orderBy(whatsappAccounts.createdAt);
    const sm = await getLocalSessionManager();
    let enriched;
    if (sm) {
      enriched = await Promise.all(
        accounts.map(async (account) => {
          const liveStatus = await sm.getAccountStatus(account.id);
          const liveQr = await sm.getQRCode(account.id) || liveStatus.qrCode || null;
          const livePairing = await sm.getPairingCode(account.id) || liveStatus.pairingCode || null;
          return {
            ...account,
            isPrimaryDispatcher: Boolean(account.isPrimaryDispatcher),
            dispatcherSlot: account.dispatcherSlot || null,
            status: liveStatus.status !== "disconnected" ? liveStatus.status : account.status,
            liveStatus: liveStatus.status,
            liveQrCode: liveQr,
            livePairingCode: livePairing,
            livePhoneNumber: liveStatus.phoneNumber || account.phoneNumber,
            liveDeviceName: liveStatus.deviceName || account.deviceName,
            liveError: liveStatus.error || null,
            bridgeStatus: "online"
          };
        })
      );
    } else {
      const [heartbeat] = await db.select().from(bridgeHeartbeats).orderBy((0, import_drizzle_orm16.desc)(bridgeHeartbeats.lastSeenAt)).limit(1);
      const isBridgeActive = heartbeat ? Date.now() - new Date(heartbeat.lastSeenAt).getTime() < 35e3 : false;
      enriched = accounts.map((account) => ({
        ...account,
        isPrimaryDispatcher: Boolean(account.isPrimaryDispatcher),
        dispatcherSlot: account.dispatcherSlot || null,
        liveStatus: isBridgeActive ? account.status : "disconnected",
        liveQrCode: isBridgeActive ? account.bridgeQrCode || null : null,
        livePairingCode: null,
        livePhoneNumber: account.phoneNumber,
        liveDeviceName: account.deviceName,
        liveError: isBridgeActive ? null : "\u0633\u064A\u0631\u0641\u0631 Baileys \u0627\u0644\u0645\u062D\u0644\u064A \u063A\u064A\u0631 \u0645\u062A\u0635\u0644",
        bridgeStatus: isBridgeActive ? "online" : "offline"
      }));
    }
    return reply.send({ success: true, data: enriched });
  });
  app.post("/accounts", async (request, reply) => {
    const parsed2 = createAccountSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid input", details: parsed2.error.format() });
    }
    const [company] = await db.select().from(companies).limit(1);
    if (!company) {
      return reply.status(500).send({ success: false, error: "No company found. Run db:seed first." });
    }
    const [account] = await db.insert(whatsappAccounts).values({
      companyId: company.id,
      displayName: parsed2.data.displayName,
      status: "disconnected"
    }).returning();
    logger.info({ accountId: account.id, displayName: account.displayName }, "WhatsApp account created");
    return reply.status(201).send({ success: true, data: account });
  });
  app.get("/accounts/:id", async (request, reply) => {
    const { id } = request.params;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id));
    if (!account) {
      return reply.status(404).send({ success: false, error: "Account not found" });
    }
    const sm = await getLocalSessionManager();
    if (sm) {
      const liveStatus = await sm.getAccountStatus(id);
      const liveQr = await sm.getQRCode(id) || liveStatus.qrCode || null;
      const livePairing = await sm.getPairingCode(id) || liveStatus.pairingCode || null;
      return reply.send({
        success: true,
        data: {
          ...account,
          liveStatus: liveStatus.status,
          liveQrCode: liveQr,
          livePairingCode: livePairing,
          livePhoneNumber: liveStatus.phoneNumber,
          liveJid: liveStatus.jid,
          liveDeviceName: liveStatus.deviceName
        }
      });
    }
    return reply.send({
      success: true,
      data: {
        ...account,
        liveStatus: account.status,
        liveQrCode: account.bridgeQrCode,
        livePairingCode: null,
        livePhoneNumber: account.phoneNumber,
        liveJid: account.jid,
        liveDeviceName: account.deviceName
      }
    });
  });
  app.post("/accounts/:id/connect", async (request, reply) => {
    const { id } = request.params;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id));
    if (!account) {
      return reply.status(404).send({ success: false, error: "Account not found" });
    }
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.connectAccount(id);
        return reply.send({ success: true, message: "Connection initiated. Watch WebSocket for QR code." });
      } catch (err) {
        logger.error({ accountId: id, err }, "Failed to connect WhatsApp account");
        return reply.status(500).send({ success: false, error: "Failed to start connection" });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, "connect");
      return reply.send({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0623\u0645\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A." });
    }
  });
  app.post("/accounts/:id/disconnect", async (request, reply) => {
    const { id } = request.params;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
    if (!account)
      return reply.status(404).send({ success: false, error: "Account not found" });
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.disconnectAccount(id);
        return reply.send({ success: true, message: "Account disconnected" });
      } catch (err) {
        logger.error({ accountId: id, err }, "Failed to disconnect WhatsApp account");
        return reply.status(500).send({ success: false, error: "Failed to disconnect" });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, "disconnect");
      return reply.send({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0623\u0645\u0631 \u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A." });
    }
  });
  app.post("/accounts/:id/logout", async (request, reply) => {
    const { id } = request.params;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
    if (!account)
      return reply.status(404).send({ success: false, error: "Account not found" });
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.logoutAccount(id);
        return reply.send({ success: true, message: "Account logged out. Auth state cleared." });
      } catch (err) {
        logger.error({ accountId: id, err }, "Failed to logout WhatsApp account");
        return reply.status(500).send({ success: false, error: "Failed to logout" });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, "logout");
      return reply.send({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0623\u0645\u0631 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A." });
    }
  });
  app.post("/accounts/:id/reconnect", async (request, reply) => {
    const { id } = request.params;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
    if (!account)
      return reply.status(404).send({ success: false, error: "Account not found" });
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.reconnectAccount(id);
        return reply.send({ success: true, message: "Reconnection initiated" });
      } catch (err) {
        logger.error({ accountId: id, err }, "Failed to reconnect WhatsApp account");
        return reply.status(500).send({ success: false, error: "Failed to reconnect" });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, "reconnect");
      return reply.send({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0623\u0645\u0631 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A." });
    }
  });
  app.post("/accounts/:id/restart", async (request, reply) => {
    const { id } = request.params;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
    if (!account)
      return reply.status(404).send({ success: false, error: "Account not found" });
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.restartAccount(id);
        return reply.send({ success: true, message: "Session restarted successfully" });
      } catch (err) {
        logger.error({ accountId: id, err }, "Failed to restart WhatsApp account");
        return reply.status(500).send({ success: false, error: "Failed to restart" });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, "restart");
      return reply.send({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0623\u0645\u0631 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A." });
    }
  });
  app.post("/accounts/:id/reset", async (request, reply) => {
    const { id } = request.params;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
    if (!account)
      return reply.status(404).send({ success: false, error: "Account not found" });
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.resetAccount(id);
        return reply.send({ success: true, message: "Account session reset. Ready for fresh pairing." });
      } catch (err) {
        logger.error({ accountId: id, err }, "Failed to reset WhatsApp account");
        return reply.status(500).send({ success: false, error: "Failed to reset" });
      }
    } else {
      await queueBridgeCommand(account.companyId, id, "reset");
      return reply.send({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0623\u0645\u0631 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0636\u0628\u0637 \u0625\u0644\u0649 \u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A." });
    }
  });
  app.delete("/accounts/:id", async (request, reply) => {
    const { id } = request.params;
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        await sm.deleteAccount(id);
      } catch (err) {
        logger.error({ accountId: id, err }, "Failed to delete local session");
      }
    }
    await db.delete(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id));
    return reply.send({ success: true, message: "Account deleted successfully" });
  });
  app.post("/accounts/:id/pairing-code", async (request, reply) => {
    const { id } = request.params;
    const { phoneNumber } = request.body || {};
    if (!phoneNumber || phoneNumber.trim().length < 6) {
      return reply.status(400).send({
        success: false,
        error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0635\u0627\u0644\u062D \u0645\u0639 \u0631\u0645\u0632 \u0627\u0644\u062F\u0648\u0644\u0629 (\u0645\u062B\u0627\u0644: +965XXXXXXXX \u0623\u0648 +201XXXXXXXXX)"
      });
    }
    const sm = await getLocalSessionManager();
    if (sm) {
      try {
        const code = await sm.requestPairingCode(id, phoneNumber.trim());
        return reply.send({
          success: true,
          data: {
            pairingCode: code,
            formattedCode: code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code,
            phoneNumber: phoneNumber.trim()
          },
          message: "Pairing code generated successfully"
        });
      } catch (err) {
        logger.error({ accountId: id, phoneNumber, err }, "Failed to request pairing code");
        return reply.status(500).send({
          success: false,
          error: err.message || "\u0641\u0634\u0644 \u062A\u0648\u0644\u064A\u062F \u0643\u0648\u062F \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u0646. \u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0627\u0644\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0631\u062A\u0628\u0637 \u0628\u0627\u0644\u0641\u0639\u0644."
        });
      }
    } else {
      const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
      if (!account)
        return reply.status(404).send({ success: false, error: "Account not found" });
      const cmd = await queueBridgeCommand(account.companyId, id, "pairing_code", { phoneNumber: phoneNumber.trim() });
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const [updatedCmd] = await db.select().from(bridgeCommands).where((0, import_drizzle_orm16.eq)(bridgeCommands.id, cmd.id)).limit(1);
        if (updatedCmd && updatedCmd.status === "completed" && updatedCmd.result?.pairingCode) {
          const code = updatedCmd.result.pairingCode;
          return reply.send({
            success: true,
            data: {
              pairingCode: code,
              formattedCode: code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code,
              phoneNumber: phoneNumber.trim()
            },
            message: "Pairing code generated successfully"
          });
        }
      }
      return reply.send({
        success: true,
        data: { commandId: cmd.id, status: "pending" },
        message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0631\u0645\u0632 \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u0646 \u0625\u0644\u0649 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0645\u062D\u0644\u064A."
      });
    }
  });
  app.get("/accounts/:id/pairing-code", async (request, reply) => {
    const { id } = request.params;
    const sm = await getLocalSessionManager();
    if (sm) {
      const code = await sm.getPairingCode(id);
      if (!code) {
        return reply.status(404).send({ success: false, error: "No pairing code available" });
      }
      return reply.send({ success: true, data: { pairingCode: code } });
    } else {
      const [cmd] = await db.select().from(bridgeCommands).where((0, import_drizzle_orm16.and)((0, import_drizzle_orm16.eq)(bridgeCommands.accountId, id), (0, import_drizzle_orm16.eq)(bridgeCommands.action, "pairing_code"))).orderBy((0, import_drizzle_orm16.desc)(bridgeCommands.createdAt)).limit(1);
      const code = cmd?.result?.pairingCode;
      if (!code)
        return reply.status(404).send({ success: false, error: "No pairing code available" });
      return reply.send({ success: true, data: { pairingCode: code } });
    }
  });
  app.get("/accounts/:id/qr", async (request, reply) => {
    const { id } = request.params;
    const sm = await getLocalSessionManager();
    if (sm) {
      const qrCode = await sm.getQRCode(id);
      if (!qrCode) {
        return reply.status(404).send({ success: false, error: "No QR code available" });
      }
      return reply.send({ success: true, data: { qrCode } });
    } else {
      const [acc] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
      if (!acc?.bridgeQrCode) {
        return reply.status(404).send({ success: false, error: "No QR code available" });
      }
      return reply.send({ success: true, data: { qrCode: acc.bridgeQrCode } });
    }
  });
  app.patch("/accounts/:id/dispatcher", async (request, reply) => {
    const { id } = request.params;
    const schema = import_zod9.z.object({
      isPrimaryDispatcher: import_zod9.z.boolean(),
      dispatcherSlot: import_zod9.z.number().int().min(1).max(2).optional().nullable()
    });
    const parsed2 = schema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({
        success: false,
        error: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062F\u062E\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        details: parsed2.error.format()
      });
    }
    const { isPrimaryDispatcher, dispatcherSlot } = parsed2.data;
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).limit(1);
    if (!account) {
      return reply.status(404).send({ success: false, error: "\u062D\u0633\u0627\u0628 WhatsApp \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    }
    if (isPrimaryDispatcher) {
      const currentDispatchers = await db.select().from(whatsappAccounts).where(
        (0, import_drizzle_orm16.and)(
          (0, import_drizzle_orm16.eq)(whatsappAccounts.isPrimaryDispatcher, true),
          import_drizzle_orm16.sql`${whatsappAccounts.id} != ${id}::uuid`
        )
      );
      if (currentDispatchers.length >= 2) {
        return reply.status(400).send({
          success: false,
          error: "\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0645\u0648\u0632\u0639\u0629 \u0647\u0648 \u0631\u0642\u0645\u0627\u0646 \u0641\u0642\u0637 (\u0627\u0644\u0645\u0648\u0632\u0639 \u0627\u0644\u0623\u0648\u0644 \u0648\u0627\u0644\u0645\u0648\u0632\u0639 \u0627\u0644\u062B\u0627\u0646\u064A). \u064A\u0631\u062C\u0649 \u0625\u0644\u063A\u0627\u0621 \u062A\u0639\u064A\u064A\u0646 \u0623\u062D\u062F \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0645\u0648\u0632\u0639\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0644\u062A\u062A\u0645\u0643\u0646 \u0645\u0646 \u062A\u0639\u064A\u064A\u0646 \u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645.",
          currentDispatchers: currentDispatchers.map((d) => ({
            id: d.id,
            displayName: d.displayName,
            slot: d.dispatcherSlot,
            phoneNumber: d.phoneNumber
          }))
        });
      }
      let resolvedSlot = dispatcherSlot;
      const occupiedSlots = new Set(currentDispatchers.map((d) => d.dispatcherSlot));
      if (!resolvedSlot || occupiedSlots.has(resolvedSlot)) {
        if (!occupiedSlots.has(1)) {
          resolvedSlot = 1;
        } else if (!occupiedSlots.has(2)) {
          resolvedSlot = 2;
        } else {
          resolvedSlot = 1;
        }
      }
      const [updated] = await db.update(whatsappAccounts).set({
        isPrimaryDispatcher: true,
        dispatcherSlot: resolvedSlot,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).returning();
      wsHub.broadcast("whatsapp.dispatcher_updated", {
        accountId: id,
        isPrimaryDispatcher: true,
        dispatcherSlot: resolvedSlot
      });
      return reply.send({
        success: true,
        message: `\u062A\u0645 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0631\u0642\u0645 \u0643\u0631\u0642\u0645 \u0645\u0648\u0632\u0639 \u0623\u0633\u0627\u0633\u064A (${resolvedSlot === 1 ? "\u0627\u0644\u0645\u0648\u0632\u0639 \u0627\u0644\u0623\u0648\u0644" : "\u0627\u0644\u0645\u0648\u0632\u0639 \u0627\u0644\u062B\u0627\u0646\u064A"}) \u0628\u0646\u062C\u0627\u062D.`,
        data: updated
      });
    } else {
      const [updated] = await db.update(whatsappAccounts).set({
        isPrimaryDispatcher: false,
        dispatcherSlot: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm16.eq)(whatsappAccounts.id, id)).returning();
      wsHub.broadcast("whatsapp.dispatcher_updated", {
        accountId: id,
        isPrimaryDispatcher: false,
        dispatcherSlot: null
      });
      return reply.send({
        success: true,
        message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0631\u0642\u0645 \u0643\u0645\u0648\u0632\u0639 \u0623\u0633\u0627\u0633\u064A \u0628\u0646\u062C\u0627\u062D.",
        data: updated
      });
    }
  });
}

// src/modules/conversations/conversations.routes.ts
var import_drizzle_orm17 = require("drizzle-orm");
var import_zod10 = require("zod");
init_client();
init_schema();
init_outbound_queue_service();
init_config();
init_ws_hub();
init_logger();
init_phone_validator();
init_assignment_service();
var listConversationsQuerySchema = import_zod10.z.object({
  status: import_zod10.z.preprocess((val) => val === "resolved" ? "closed" : val, import_zod10.z.enum(["open", "pending", "waiting", "closed"]).optional()),
  stationId: import_zod10.z.string().uuid().optional(),
  assignedEmployeeId: import_zod10.z.string().uuid().optional(),
  search: import_zod10.z.string().optional(),
  page: import_zod10.z.coerce.number().min(1).default(1),
  limit: import_zod10.z.coerce.number().min(1).max(100).default(50),
  offset: import_zod10.z.coerce.number().min(0).default(0)
});
var assignSchema = import_zod10.z.object({
  assignedEmployeeId: import_zod10.z.string().uuid().nullable().optional(),
  assignedStationId: import_zod10.z.string().uuid().nullable().optional(),
  assignedSupervisorId: import_zod10.z.string().uuid().nullable().optional()
});
var statusSchema = import_zod10.z.object({
  status: import_zod10.z.enum(["open", "pending", "waiting", "closed"])
});
var modeSchema = import_zod10.z.object({
  humanMode: import_zod10.z.boolean().optional(),
  automationEnabled: import_zod10.z.boolean().optional()
});
async function conversationsRoutes(app) {
  app.addHook("preHandler", authenticate);
  app.get("/", async (request, reply) => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1e3);
      await db.update(conversations).set({ status: "closed", updatedAt: /* @__PURE__ */ new Date() }).where(
        (0, import_drizzle_orm17.and)(
          (0, import_drizzle_orm17.eq)(conversations.status, "open"),
          (0, import_drizzle_orm17.or)(
            (0, import_drizzle_orm17.lte)(conversations.lastMessageAt, fiveMinutesAgo),
            (0, import_drizzle_orm17.and)((0, import_drizzle_orm17.isNull)(conversations.lastMessageAt), (0, import_drizzle_orm17.lte)(conversations.createdAt, fiveMinutesAgo))
          )
        )
      );
    } catch {
    }
    const query = listConversationsQuerySchema.parse(request.query);
    const conditions = [];
    if (query.status) {
      conditions.push((0, import_drizzle_orm17.eq)(conversations.status, query.status));
    }
    if (query.stationId) {
      conditions.push((0, import_drizzle_orm17.eq)(conversations.assignedStationId, query.stationId));
    }
    if (query.assignedEmployeeId) {
      conditions.push((0, import_drizzle_orm17.eq)(conversations.assignedEmployeeId, query.assignedEmployeeId));
    }
    if (query.search && query.search.trim() !== "") {
      const rawSearch = query.search.trim();
      const s = `%${rawSearch}%`;
      const searchConditions = [
        (0, import_drizzle_orm17.ilike)(contacts.name, s),
        (0, import_drizzle_orm17.ilike)(contacts.phoneNumber, s),
        (0, import_drizzle_orm17.ilike)(contacts.whatsappJid, s),
        (0, import_drizzle_orm17.ilike)(conversations.lastMessageText, s)
      ];
      const cleanDigits = rawSearch.replace(/\D/g, "");
      if (cleanDigits.length >= 3) {
        searchConditions.push((0, import_drizzle_orm17.ilike)(contacts.phoneNumber, `%${cleanDigits}%`));
        const strippedZero = cleanDigits.replace(/^0+/, "");
        if (strippedZero.length >= 3 && strippedZero !== cleanDigits) {
          searchConditions.push((0, import_drizzle_orm17.ilike)(contacts.phoneNumber, `%${strippedZero}%`));
        }
      }
      const formatted = validateAndFormatPhone(rawSearch);
      if (formatted.isValid && formatted.e164) {
        searchConditions.push((0, import_drizzle_orm17.ilike)(contacts.phoneNumber, `%${formatted.e164}%`));
      }
      conditions.push((0, import_drizzle_orm17.or)(...searchConditions));
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm17.and)(...conditions) : void 0;
    const rows = await db.select({
      id: conversations.id,
      status: conversations.status,
      lastMessageText: conversations.lastMessageText,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      humanMode: conversations.humanMode,
      automationEnabled: conversations.automationEnabled,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      contact: {
        id: contacts.id,
        name: contacts.name,
        phoneNumber: contacts.phoneNumber,
        whatsappJid: contacts.whatsappJid,
        avatarUrl: contacts.avatarUrl
      },
      station: {
        id: stations.id,
        name: stations.name
      },
      assignedEmployee: {
        id: employees.id,
        name: users.name,
        email: users.email
      },
      whatsappAccount: {
        id: whatsappAccounts.id,
        displayName: whatsappAccounts.displayName,
        phoneNumber: whatsappAccounts.phoneNumber
      }
    }).from(conversations).innerJoin(contacts, (0, import_drizzle_orm17.eq)(conversations.contactId, contacts.id)).leftJoin(stations, (0, import_drizzle_orm17.eq)(conversations.assignedStationId, stations.id)).leftJoin(employees, (0, import_drizzle_orm17.eq)(conversations.assignedEmployeeId, employees.id)).leftJoin(users, (0, import_drizzle_orm17.eq)(employees.userId, users.id)).leftJoin(whatsappAccounts, (0, import_drizzle_orm17.eq)(conversations.whatsappAccountId, whatsappAccounts.id)).where(whereClause).orderBy((0, import_drizzle_orm17.desc)(conversations.lastMessageAt), (0, import_drizzle_orm17.desc)(conversations.updatedAt)).limit(query.limit).offset(query.offset);
    const [counts] = await db.select({
      openCount: import_drizzle_orm17.sql`count(*) filter (where ${conversations.status} = 'open')`,
      pendingCount: import_drizzle_orm17.sql`count(*) filter (where ${conversations.status} = 'pending')`,
      closedCount: import_drizzle_orm17.sql`count(*) filter (where ${conversations.status} = 'closed')`,
      totalCount: import_drizzle_orm17.sql`count(*)`
    }).from(conversations);
    const mappedRows = rows.map((row) => ({
      ...row,
      unreadCount: parseInt(row.unreadCount || "0", 10) || 0,
      contactId: row.contact?.id,
      contactName: row.contact?.name || row.contact?.phoneNumber || "\u0639\u0645\u064A\u0644 \u0648\u0627\u062A\u0633\u0627\u0628",
      contactPhone: row.contact?.phoneNumber || "",
      contactAvatar: row.contact?.avatarUrl || "",
      stationId: row.station?.id,
      stationName: row.station?.name || "",
      assignedAgentId: row.assignedEmployee?.id,
      assignedAgentName: row.assignedEmployee?.name || "",
      lastMessageTimestamp: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : row.updatedAt ? new Date(row.updatedAt).toISOString() : void 0
    }));
    return reply.send({
      success: true,
      data: mappedRows,
      meta: {
        limit: query.limit,
        offset: query.offset,
        counts: {
          open: Number(counts?.openCount || 0),
          pending: Number(counts?.pendingCount || 0),
          closed: Number(counts?.closedCount || 0),
          total: Number(counts?.totalCount || 0)
        }
      }
    });
  });
  app.post("/start", async (request, reply) => {
    const user = request.user;
    const schemaValidator = import_zod10.z.object({
      phoneNumber: import_zod10.z.string().min(1),
      contactName: import_zod10.z.string().optional(),
      messageText: import_zod10.z.string().optional(),
      whatsappAccountId: import_zod10.z.string().uuid().optional(),
      stationId: import_zod10.z.string().uuid().optional().nullable(),
      assignedEmployeeId: import_zod10.z.string().uuid().optional().nullable()
    });
    const parsed2 = schemaValidator.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        details: parsed2.error.format()
      });
    }
    const { phoneNumber, contactName, messageText, whatsappAccountId, stationId, assignedEmployeeId } = parsed2.data;
    const phoneCheck = validateAndFormatPhone(phoneNumber);
    if (!phoneCheck.isValid) {
      return reply.status(400).send({
        success: false,
        error: phoneCheck.error || "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"
      });
    }
    const formattedPhone = phoneCheck.formatted;
    let accountId = whatsappAccountId;
    if (!accountId) {
      const [slot1Account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm17.and)((0, import_drizzle_orm17.eq)(whatsappAccounts.isPrimaryDispatcher, true), (0, import_drizzle_orm17.eq)(whatsappAccounts.dispatcherSlot, 1))).limit(1);
      if (slot1Account) {
        accountId = slot1Account.id;
      } else {
        const [anyDispatcher] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm17.eq)(whatsappAccounts.isPrimaryDispatcher, true)).limit(1);
        if (anyDispatcher) {
          accountId = anyDispatcher.id;
        } else {
          const [connected] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm17.eq)(whatsappAccounts.status, "connected")).limit(1);
          if (connected) {
            accountId = connected.id;
          } else {
            const [firstAcc] = await db.select().from(whatsappAccounts).limit(1);
            if (!firstAcc) {
              return reply.status(400).send({
                success: false,
                error: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0623\u064A \u062D\u0633\u0627\u0628 \u0648\u0627\u062A\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0644\u0644\u0625\u0631\u0633\u0627\u0644 \u0645\u0646\u0647."
              });
            }
            accountId = firstAcc.id;
          }
        }
      }
    }
    const [account] = await db.select().from(whatsappAccounts).where((0, import_drizzle_orm17.eq)(whatsappAccounts.id, accountId)).limit(1);
    if (!account) {
      return reply.status(404).send({ success: false, error: "\u062D\u0633\u0627\u0628 WhatsApp \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    }
    let [contact] = await db.select().from(contacts).where((0, import_drizzle_orm17.eq)(contacts.phoneNumber, formattedPhone)).limit(1);
    if (!contact) {
      const remoteJid = `${formattedPhone.replace(/\D/g, "")}@s.whatsapp.net`;
      [contact] = await db.insert(contacts).values({
        companyId: account.companyId,
        name: contactName?.trim() || formattedPhone,
        phoneNumber: formattedPhone,
        whatsappJid: remoteJid,
        source: "manual_outbound"
      }).returning();
    } else if (contactName && contactName.trim() !== "" && contact.name === contact.phoneNumber) {
      [contact] = await db.update(contacts).set({ name: contactName.trim(), updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm17.eq)(contacts.id, contact.id)).returning();
    }
    let [convo] = await db.select().from(conversations).where(
      (0, import_drizzle_orm17.and)(
        (0, import_drizzle_orm17.eq)(conversations.contactId, contact.id),
        (0, import_drizzle_orm17.eq)(conversations.whatsappAccountId, account.id)
      )
    ).limit(1);
    if (!convo) {
      [convo] = await db.insert(conversations).values({
        companyId: account.companyId,
        contactId: contact.id,
        whatsappAccountId: account.id,
        assignedStationId: stationId || null,
        assignedEmployeeId: assignedEmployeeId || null,
        status: "open",
        lastMessageText: messageText?.trim() || null,
        lastMessageAt: messageText?.trim() ? /* @__PURE__ */ new Date() : null,
        unreadCount: "0"
      }).returning();
    } else {
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (convo.status === "closed") {
        updateData.status = "open";
      }
      if (stationId)
        updateData.assignedStationId = stationId;
      if (assignedEmployeeId)
        updateData.assignedEmployeeId = assignedEmployeeId;
      [convo] = await db.update(conversations).set(updateData).where((0, import_drizzle_orm17.eq)(conversations.id, convo.id)).returning();
    }
    if (messageText && messageText.trim() !== "") {
      const rawNumber = formattedPhone.replace(/\D/g, "");
      const toJid = contact.whatsappJid || `${rawNumber}@s.whatsapp.net`;
      let whatsappMessageId = `crm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const [savedMsg] = await db.insert(messages).values({
        conversationId: convo.id,
        contactId: contact.id,
        senderType: "employee",
        senderUserId: user.id,
        direction: "outgoing",
        type: "text",
        text: messageText.trim(),
        whatsappMessageId,
        status: "pending"
      }).returning();
      const sendResult = await OutboundQueueService.sendMessage({
        companyId: account.companyId,
        accountId: account.id,
        conversationId: convo.id,
        messageId: savedMsg.id,
        toJid,
        type: "text",
        text: messageText.trim()
      });
      const finalStatus = sendResult.status === "sent" ? "sent" : "queued";
      if (sendResult.whatsappMessageId) {
        whatsappMessageId = sendResult.whatsappMessageId;
      }
      await db.update(messages).set({
        status: finalStatus,
        whatsappMessageId,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm17.eq)(messages.id, savedMsg.id));
      await db.update(conversations).set({
        lastMessageText: messageText.trim(),
        lastMessageAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm17.eq)(conversations.id, convo.id));
      wsHub.broadcast("message.created", {
        accountId: account.id,
        message: {
          ...savedMsg,
          conversationId: convo.id,
          contactName: contact.name,
          contactPhone: contact.phoneNumber
        }
      });
    }
    wsHub.broadcast("conversation.created", {
      conversationId: convo.id,
      contactName: contact.name,
      contactPhone: contact.phoneNumber,
      accountId: account.id
    });
    return reply.status(201).send({
      success: true,
      data: {
        ...convo,
        contact,
        whatsappAccount: {
          id: account.id,
          displayName: account.displayName,
          phoneNumber: account.phoneNumber
        }
      }
    });
  });
  app.get("/:id/timeline", async (request, reply) => {
    const { id } = request.params;
    const [convo] = await db.select({
      id: conversations.id,
      contactId: conversations.contactId,
      status: conversations.status,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt
    }).from(conversations).where((0, import_drizzle_orm17.eq)(conversations.id, id)).limit(1);
    if (!convo) {
      return reply.status(404).send({ success: false, error: "\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
    }
    const convReminders = await db.select({
      id: reminders.id,
      title: reminders.title,
      note: reminders.note,
      dueAt: reminders.dueAt,
      status: reminders.status,
      completedAt: reminders.completedAt,
      createdAt: reminders.createdAt,
      assignedUserName: users.name,
      assignedUserEmail: users.email
    }).from(reminders).leftJoin(users, (0, import_drizzle_orm17.eq)(reminders.assignedUserId, users.id)).where(
      (0, import_drizzle_orm17.or)(
        (0, import_drizzle_orm17.eq)(reminders.conversationId, convo.id),
        (0, import_drizzle_orm17.eq)(reminders.leadId, convo.contactId)
      )
    ).orderBy((0, import_drizzle_orm17.desc)(reminders.dueAt));
    const internalNotes = await db.select({
      id: messages.id,
      text: messages.text,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
      timestamp: messages.timestamp,
      authorName: users.name
    }).from(messages).leftJoin(users, (0, import_drizzle_orm17.eq)(messages.senderUserId, users.id)).where(
      (0, import_drizzle_orm17.and)(
        (0, import_drizzle_orm17.eq)(messages.conversationId, convo.id),
        import_drizzle_orm17.sql`${messages.metadata}->>'isInternalNote' = 'true'`
      )
    ).orderBy((0, import_drizzle_orm17.desc)(messages.createdAt));
    const timelineItems = [
      ...convReminders.map((r) => ({
        id: r.id,
        type: "reminder",
        title: r.title,
        description: r.note,
        date: r.dueAt,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        status: r.status,
        author: r.assignedUserName || "\u0641\u0631\u064A\u0642 \u0627\u0644\u0639\u0645\u0644",
        badge: r.status === "completed" ? "\u062A\u0645\u062A \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629" : r.status === "cancelled" ? "\u0645\u0644\u063A\u064A" : "\u0645\u062A\u0627\u0628\u0639\u0629 \u0645\u0637\u0644\u0648\u0628\u0629"
      })),
      ...internalNotes.map((n) => ({
        id: n.id,
        type: "note",
        title: "\u0645\u0644\u0627\u062D\u0638\u0629 \u062F\u0627\u062E\u0644\u064A\u0629",
        description: n.text,
        date: n.createdAt,
        createdAt: n.createdAt,
        status: "note",
        author: n.authorName || n.metadata?.authorName || "\u0627\u0644\u0645\u0648\u0638\u0641",
        badge: "\u0645\u0644\u0627\u062D\u0638\u0629"
      })),
      {
        id: `created_${convo.id}`,
        type: "system",
        title: "\u0628\u062F\u0621 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0648\u0641\u062A\u062D \u0642\u0646\u0627\u0629 \u0627\u0644\u062A\u0648\u0627\u0635\u0644",
        description: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0639 \u0627\u0644\u0639\u0645\u064A\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645",
        date: convo.createdAt,
        createdAt: convo.createdAt,
        status: convo.status,
        author: "\u0627\u0644\u0646\u0638\u0627\u0645",
        badge: "\u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629"
      }
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return reply.send({
      success: true,
      data: timelineItems
    });
  });
  app.get("/:id", async (request, reply) => {
    const { id } = request.params;
    const [row] = await db.select({
      id: conversations.id,
      status: conversations.status,
      lastMessageText: conversations.lastMessageText,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      humanMode: conversations.humanMode,
      automationEnabled: conversations.automationEnabled,
      assignmentSource: conversations.assignmentSource,
      assignedAt: conversations.assignedAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      contact: {
        id: contacts.id,
        name: contacts.name,
        phoneNumber: contacts.phoneNumber,
        whatsappJid: contacts.whatsappJid,
        avatarUrl: contacts.avatarUrl,
        source: contacts.source,
        metadata: contacts.metadata
      },
      station: {
        id: stations.id,
        name: stations.name
      },
      assignedEmployee: {
        id: employees.id,
        name: users.name,
        email: users.email
      },
      whatsappAccount: {
        id: whatsappAccounts.id,
        displayName: whatsappAccounts.displayName,
        phoneNumber: whatsappAccounts.phoneNumber
      }
    }).from(conversations).innerJoin(contacts, (0, import_drizzle_orm17.eq)(conversations.contactId, contacts.id)).leftJoin(stations, (0, import_drizzle_orm17.eq)(conversations.assignedStationId, stations.id)).leftJoin(employees, (0, import_drizzle_orm17.eq)(conversations.assignedEmployeeId, employees.id)).leftJoin(users, (0, import_drizzle_orm17.eq)(employees.userId, users.id)).leftJoin(whatsappAccounts, (0, import_drizzle_orm17.eq)(conversations.whatsappAccountId, whatsappAccounts.id)).where((0, import_drizzle_orm17.eq)(conversations.id, id)).limit(1);
    if (!row) {
      return reply.status(404).send({ success: false, error: "Conversation not found" });
    }
    const [lead] = await db.select().from(leads).where((0, import_drizzle_orm17.eq)(leads.contactId, row.contact.id)).orderBy((0, import_drizzle_orm17.desc)(leads.createdAt)).limit(1);
    return reply.send({
      success: true,
      data: {
        ...row,
        unreadCount: parseInt(row.unreadCount || "0", 10) || 0,
        contactId: row.contact?.id,
        contactName: row.contact?.name || row.contact?.phoneNumber || "\u0639\u0645\u064A\u0644 \u0648\u0627\u062A\u0633\u0627\u0628",
        contactPhone: row.contact?.phoneNumber || "",
        contactAvatar: row.contact?.avatarUrl || "",
        stationId: row.station?.id,
        stationName: row.station?.name || "",
        assignedAgentId: row.assignedEmployee?.id,
        assignedAgentName: row.assignedEmployee?.name || "",
        lastMessageTimestamp: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : row.updatedAt ? new Date(row.updatedAt).toISOString() : void 0,
        lead: lead || null
      }
    });
  });
  const assignHandler = async (request, reply) => {
    const { id } = request.params;
    const raw = request.body || {};
    const updates = {
      updatedAt: /* @__PURE__ */ new Date(),
      assignedAt: /* @__PURE__ */ new Date(),
      assignmentSource: "manual"
    };
    const employeeId = raw.assignedEmployeeId !== void 0 ? raw.assignedEmployeeId : raw.assignedAgentId;
    if (employeeId !== void 0) {
      updates.assignedEmployeeId = employeeId;
    }
    const stationId = raw.assignedStationId !== void 0 ? raw.assignedStationId : raw.stationId;
    if (stationId !== void 0) {
      updates.assignedStationId = stationId;
    }
    if (raw.assignedSupervisorId !== void 0) {
      updates.assignedSupervisorId = raw.assignedSupervisorId;
    }
    const [updated] = await db.update(conversations).set(updates).where((0, import_drizzle_orm17.eq)(conversations.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, error: "Conversation not found" });
    }
    if (updated.contactId && employeeId) {
      const [cont] = await db.select().from(contacts).where((0, import_drizzle_orm17.eq)(contacts.id, updated.contactId)).limit(1);
      if (cont) {
        const meta = cont.metadata || {};
        meta.assignedEmployeeId = employeeId;
        await db.update(contacts).set({ metadata: meta, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm17.eq)(contacts.id, cont.id));
      }
      if (raw.notifyEmployeeWhatsApp !== false) {
        AssignmentService.notifyEmployeeViaWhatsApp({
          employeeId,
          contactId: updated.contactId,
          conversationId: id,
          lastMessageText: updated.lastMessageText,
          whatsappAccountId: updated.whatsappAccountId,
          sourceDescription: "\u0642\u0627\u0645 \u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u0625\u0633\u0646\u0627\u062F \u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0625\u0644\u064A\u0643 \u0645\u0628\u0627\u0634\u0631\u0629"
        }).catch((err) => logger.warn({ err: err?.message, employeeId }, "Failed manual assign employee WhatsApp alert"));
      }
    }
    const eventPayload = {
      id,
      conversationId: id,
      assignedEmployeeId: employeeId !== void 0 ? employeeId : updated.assignedEmployeeId,
      assignedStationId: stationId !== void 0 ? stationId : updated.assignedStationId,
      updates
    };
    wsHub.broadcast("conversation.updated", eventPayload);
    wsHub.broadcast("conversation_update", eventPayload);
    wsHub.broadcast("assigned", { conversationId: id, assignedEmployeeId: employeeId });
    logger.info({ conversationId: id, updates }, "Conversation reassigned and contact metadata updated");
    return reply.send({ success: true, data: updated });
  };
  app.post("/:id/assign", assignHandler);
  app.patch("/:id/assign", assignHandler);
  app.patch("/:id/status", async (request, reply) => {
    const { id } = request.params;
    const parsed2 = statusSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid status", details: parsed2.error.format() });
    }
    const [updated] = await db.update(conversations).set({ status: parsed2.data.status, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm17.eq)(conversations.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, error: "Conversation not found" });
    }
    wsHub.broadcast("conversation.updated", { conversationId: id, status: parsed2.data.status });
    return reply.send({ success: true, data: updated });
  });
  app.post("/:id/read", async (request, reply) => {
    const { id } = request.params;
    const [conv] = await db.select({
      id: conversations.id,
      whatsappAccountId: conversations.whatsappAccountId,
      contactJid: contacts.whatsappJid
    }).from(conversations).innerJoin(contacts, (0, import_drizzle_orm17.eq)(conversations.contactId, contacts.id)).where((0, import_drizzle_orm17.eq)(conversations.id, id)).limit(1);
    if (!conv) {
      return reply.status(404).send({ success: false, error: "Conversation not found" });
    }
    await db.update(conversations).set({ unreadCount: "0", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm17.eq)(conversations.id, id));
    if (config.DEPLOYMENT_MODE === "local" && conv.whatsappAccountId && conv.contactJid) {
      try {
        const { sessionManager: sessionManager2 } = await Promise.resolve().then(() => (init_session_manager(), session_manager_exports));
        const provider = sessionManager2.getProvider(conv.whatsappAccountId);
        if (provider) {
          await provider.markRead(conv.contactJid, []);
        }
      } catch (err) {
        logger.debug({ err }, "Failed to send read receipt to WA socket");
      }
    }
    wsHub.broadcast("conversation.read", { conversationId: id });
    wsHub.broadcast("conversation.updated", { conversationId: id, unreadCount: 0 });
    return reply.send({ success: true, message: "Conversation marked as read" });
  });
  app.patch("/:id/mode", async (request, reply) => {
    const { id } = request.params;
    const parsed2 = modeSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid mode payload" });
    }
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (parsed2.data.humanMode !== void 0)
      updates.humanMode = parsed2.data.humanMode;
    if (parsed2.data.automationEnabled !== void 0)
      updates.automationEnabled = parsed2.data.automationEnabled;
    const [updated] = await db.update(conversations).set(updates).where((0, import_drizzle_orm17.eq)(conversations.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, error: "Conversation not found" });
    }
    wsHub.broadcast("conversation.updated", { conversationId: id, ...updates });
    return reply.send({ success: true, data: updated });
  });
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params;
    const uuidSchema = import_zod10.z.string().uuid();
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return reply.status(400).send({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D (\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u0635\u064A\u063A\u0629 UUID)"
      });
    }
    try {
      const [existing] = await db.select({ id: conversations.id, contactId: conversations.contactId }).from(conversations).where((0, import_drizzle_orm17.eq)(conversations.id, id)).limit(1);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: "\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641\u0647\u0627 \u0628\u0627\u0644\u0641\u0639\u0644 \u0645\u0633\u0628\u0642\u0627\u064B"
        });
      }
      await db.transaction(async (tx) => {
        await tx.delete(messages).where((0, import_drizzle_orm17.eq)(messages.conversationId, id));
        await tx.delete(reminders).where((0, import_drizzle_orm17.eq)(reminders.conversationId, id));
        await tx.delete(conversationTags).where((0, import_drizzle_orm17.eq)(conversationTags.conversationId, id));
        await tx.delete(conversations).where((0, import_drizzle_orm17.eq)(conversations.id, id));
      });
      wsHub.broadcast("conversation.deleted", { id, conversationId: id });
      wsHub.broadcast("conversation_deleted", { id, conversationId: id });
      logger.info({ conversationId: id, contactId: existing.contactId }, "Conversation and associated data deleted successfully");
      return reply.send({
        success: true,
        message: "\u062A\u0645 \u0645\u0633\u062D \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0648\u0643\u0627\u0641\u0629 \u0631\u0633\u0627\u0626\u0644\u0647\u0627 \u0648\u0633\u062C\u0644\u0627\u062A\u0647\u0627 \u0628\u0646\u062C\u0627\u062D \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645",
        data: { id }
      });
    } catch (err) {
      logger.error({ err, conversationId: id }, "Database error while deleting conversation");
      return reply.status(500).send({
        success: false,
        error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u062D\u0630\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
        details: err?.message
      });
    }
  });
}

// src/modules/messages/messages.routes.ts
var import_drizzle_orm18 = require("drizzle-orm");
var import_zod11 = require("zod");
init_client();
init_schema();
init_outbound_queue_service();

// src/providers/storage/storage.provider.ts
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
init_config();
var LocalStorageProvider = class {
  basePath;
  constructor() {
    this.basePath = import_path2.default.resolve(config.STORAGE_LOCAL_PATH);
    if (!import_fs.default.existsSync(this.basePath)) {
      import_fs.default.mkdirSync(this.basePath, { recursive: true });
    }
  }
  async upload(fileBuffer, options) {
    const dir = options.directory ? import_path2.default.join(this.basePath, options.directory) : this.basePath;
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    const uniqueName = `${Date.now()}_${options.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = import_path2.default.join(dir, uniqueName);
    await import_fs.default.promises.writeFile(filePath, fileBuffer);
    const storageKey = options.directory ? `${options.directory}/${uniqueName}` : uniqueName;
    return {
      storageKey,
      size: fileBuffer.length
    };
  }
  async download(storageKey) {
    const safeKey = import_path2.default.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
    const filePath = import_path2.default.join(this.basePath, safeKey);
    return import_fs.default.promises.readFile(filePath);
  }
  async delete(storageKey) {
    const safeKey = import_path2.default.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
    const filePath = import_path2.default.join(this.basePath, safeKey);
    if (import_fs.default.existsSync(filePath)) {
      await import_fs.default.promises.unlink(filePath);
    }
  }
  async getSignedUrl(storageKey, expiresInSeconds = 3600) {
    return `${config.APP_URL}/api/v1/media/download?key=${encodeURIComponent(storageKey)}`;
  }
};

// src/modules/messages/messages.routes.ts
init_ws_hub();
init_logger();
var storage = new LocalStorageProvider();
var listMessagesQuerySchema = import_zod11.z.object({
  limit: import_zod11.z.coerce.number().min(1).max(100).default(50),
  offset: import_zod11.z.coerce.number().min(0).default(0)
});
var sendMessageSchema = import_zod11.z.object({
  text: import_zod11.z.string().optional(),
  type: import_zod11.z.enum(["text", "image", "video", "audio", "voice_note", "document", "location"]).default("text"),
  media: import_zod11.z.object({
    dataUrl: import_zod11.z.string().min(10),
    fileName: import_zod11.z.string().optional(),
    mimeType: import_zod11.z.string().optional(),
    caption: import_zod11.z.string().optional()
  }).optional(),
  quotedMessageId: import_zod11.z.string().uuid().optional()
});
async function messagesRoutes(app) {
  app.addHook("preHandler", authenticate);
  app.get("/:conversationId/messages", async (request, reply) => {
    const { conversationId } = request.params;
    const query = listMessagesQuerySchema.parse(request.query);
    const rows = await db.select({
      id: messages.id,
      whatsappMessageId: messages.whatsappMessageId,
      direction: messages.direction,
      senderType: messages.senderType,
      senderUserId: messages.senderUserId,
      senderUserName: users.name,
      type: messages.type,
      text: messages.text,
      mediaId: messages.mediaId,
      quotedMessageId: messages.quotedMessageId,
      status: messages.status,
      timestamp: messages.timestamp,
      metadata: messages.metadata,
      createdAt: messages.createdAt
    }).from(messages).leftJoin(users, (0, import_drizzle_orm18.eq)(messages.senderUserId, users.id)).where((0, import_drizzle_orm18.eq)(messages.conversationId, conversationId)).orderBy((0, import_drizzle_orm18.asc)(messages.timestamp)).limit(query.limit).offset(query.offset);
    try {
      const updated = await db.update(conversations).set({ unreadCount: "0", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm18.and)((0, import_drizzle_orm18.eq)(conversations.id, conversationId), (0, import_drizzle_orm18.ne)(conversations.unreadCount, "0"))).returning({ id: conversations.id });
      if (updated.length > 0) {
        wsHub.broadcast("conversation.read", { conversationId });
        wsHub.broadcast("conversation.updated", { conversationId, unreadCount: 0 });
      }
    } catch (err) {
      logger.debug({ err }, "Failed to clear unreadCount on fetch messages");
    }
    return reply.send({
      success: true,
      data: rows,
      meta: {
        limit: query.limit,
        offset: query.offset,
        count: rows.length
      }
    });
  });
  app.post("/:conversationId/messages", async (request, reply) => {
    const { conversationId } = request.params;
    const parsed2 = sendMessageSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid message payload", details: parsed2.error.format() });
    }
    const { text: text19, type, media, quotedMessageId } = parsed2.data;
    if (!text19 && !media) {
      return reply.status(400).send({ success: false, error: "Message must contain either text or media" });
    }
    const [conv] = await db.select({
      id: conversations.id,
      companyId: conversations.companyId,
      whatsappAccountId: conversations.whatsappAccountId,
      contactId: conversations.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phoneNumber,
      contactJid: contacts.whatsappJid
    }).from(conversations).innerJoin(contacts, (0, import_drizzle_orm18.eq)(conversations.contactId, contacts.id)).where((0, import_drizzle_orm18.eq)(conversations.id, conversationId)).limit(1);
    if (!conv) {
      return reply.status(404).send({ success: false, error: "Conversation not found" });
    }
    let accountId = conv.whatsappAccountId;
    if (!accountId) {
      const [defaultAccount] = await db.select().from(whatsappAccounts).limit(1);
      if (!defaultAccount) {
        return reply.status(400).send({ success: false, error: "No WhatsApp account configured on the system" });
      }
      accountId = defaultAccount.id;
    }
    const rawNumber = conv.contactPhone.replace(/\D/g, "");
    const toJid = conv.contactJid || `${rawNumber}@s.whatsapp.net`;
    let mediaUrl;
    let mediaBuffer = null;
    let resolvedMimeType = media?.mimeType || "application/octet-stream";
    let resolvedFileName = media?.fileName || `file_${Date.now()}`;
    const metadata = {};
    if (media && media.dataUrl) {
      try {
        const base64Data = media.dataUrl.includes(";base64,") ? media.dataUrl.split(";base64,")[1] : media.dataUrl;
        mediaBuffer = Buffer.from(base64Data, "base64");
        const { storageKey, size } = await storage.upload(mediaBuffer, {
          fileName: resolvedFileName,
          mimeType: resolvedMimeType,
          directory: "chat_media"
        });
        mediaUrl = `/api/v1/media/${encodeURIComponent(storageKey)}`;
        metadata.url = mediaUrl;
        metadata.fileName = resolvedFileName;
        metadata.mimeType = resolvedMimeType;
        metadata.fileLength = size;
        if (media.caption)
          metadata.caption = media.caption;
      } catch (err) {
        logger.error({ err }, "Failed to save outgoing media file");
        return reply.status(500).send({ success: false, error: "Failed to save media file" });
      }
    }
    const senderUserId = request.user?.id || null;
    const messageText = text19 || (type !== "text" ? `[${type}]` : "");
    let whatsappMessageId = `crm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [savedMsg] = await db.insert(messages).values({
      conversationId,
      contactId: conv.contactId,
      senderType: "employee",
      senderUserId,
      direction: "outgoing",
      type,
      text: messageText,
      whatsappMessageId,
      quotedMessageId: quotedMessageId || null,
      status: "pending",
      metadata
    }).returning();
    const sendResult = await OutboundQueueService.sendMessage({
      companyId: conv.companyId,
      accountId,
      conversationId,
      messageId: savedMsg.id,
      toJid,
      type,
      text: text19,
      mediaBuffer,
      mediaUrl,
      mediaMime: resolvedMimeType,
      mediaFilename: resolvedFileName,
      caption: text19 || media?.caption,
      quotedMessageId
    });
    const finalStatus = sendResult.status === "sent" ? "sent" : "queued";
    if (sendResult.whatsappMessageId) {
      whatsappMessageId = sendResult.whatsappMessageId;
    }
    await db.update(messages).set({
      status: finalStatus,
      whatsappMessageId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm18.eq)(messages.id, savedMsg.id));
    await db.update(conversations).set({
      lastMessageText: messageText,
      lastMessageAt: /* @__PURE__ */ new Date(),
      status: "open",
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm18.eq)(conversations.id, conversationId));
    const broadcastPayload = {
      ...savedMsg,
      status: finalStatus,
      whatsappMessageId,
      senderUserName: request.user?.name || "Staff",
      conversationId
    };
    wsHub.broadcast("whatsapp.message", broadcastPayload);
    wsHub.broadcast("conversation.updated", {
      conversationId,
      lastMessageText: messageText,
      lastMessageAt: savedMsg.createdAt
    });
    logger.info({ messageId: savedMsg.id, conversationId, toJid, status: finalStatus }, "Outbound message processed");
    return reply.status(201).send({
      success: true,
      data: broadcastPayload
    });
  });
  const notesHandler = async (request, reply) => {
    const { conversationId } = request.params;
    const raw = request.body || {};
    const noteText = (raw.text || raw.notes || "").trim();
    if (!noteText) {
      return reply.status(400).send({ success: false, error: "Note text is required" });
    }
    const [conv] = await db.select({ id: conversations.id, contactId: conversations.contactId }).from(conversations).where((0, import_drizzle_orm18.eq)(conversations.id, conversationId)).limit(1);
    if (!conv) {
      return reply.status(404).send({ success: false, error: "Conversation not found" });
    }
    const senderUserId = request.user?.id || null;
    const authorName = request.user?.name || "\u0641\u0631\u064A\u0642 \u0627\u0644\u0639\u0645\u0644";
    const [savedMsg] = await db.insert(messages).values({
      conversationId,
      contactId: conv.contactId,
      senderType: "employee",
      senderUserId,
      direction: "outgoing",
      type: "system",
      text: noteText,
      status: "sent",
      metadata: {
        isInternalNote: true,
        authorName
      }
    }).returning();
    const broadcastPayload = {
      ...savedMsg,
      senderUserName: authorName,
      conversationId
    };
    wsHub.broadcast("whatsapp.message", broadcastPayload);
    return reply.status(201).send({
      success: true,
      data: broadcastPayload
    });
  };
  app.post("/:conversationId/notes", notesHandler);
  app.patch("/:conversationId/notes", notesHandler);
}

// src/modules/contacts/contacts.routes.ts
var import_drizzle_orm19 = require("drizzle-orm");
var import_zod12 = require("zod");
init_client();
init_schema();
init_phone_validator();
init_landing_sync_service();
var listContactsQuerySchema = import_zod12.z.object({
  search: import_zod12.z.string().optional(),
  limit: import_zod12.z.coerce.number().min(1).max(100).default(50),
  offset: import_zod12.z.coerce.number().min(0).default(0)
});
var updateContactSchema = import_zod12.z.object({
  name: import_zod12.z.string().min(1).max(255).optional(),
  avatarUrl: import_zod12.z.string().url().nullable().optional(),
  metadata: import_zod12.z.record(import_zod12.z.any()).optional()
});
async function contactsRoutes(app) {
  app.addHook("preHandler", authenticate);
  app.get("/", async (request, reply) => {
    const query = listContactsQuerySchema.parse(request.query);
    let whereClause = void 0;
    if (query.search && query.search.trim() !== "") {
      const rawSearch = query.search.trim();
      const s = `%${rawSearch}%`;
      const searchConditions = [
        (0, import_drizzle_orm19.ilike)(contacts.name, s),
        (0, import_drizzle_orm19.ilike)(contacts.phoneNumber, s),
        (0, import_drizzle_orm19.ilike)(contacts.whatsappJid, s)
      ];
      const cleanDigits = rawSearch.replace(/\D/g, "");
      if (cleanDigits.length >= 3) {
        searchConditions.push((0, import_drizzle_orm19.ilike)(contacts.phoneNumber, `%${cleanDigits}%`));
        const strippedZero = cleanDigits.replace(/^0+/, "");
        if (strippedZero.length >= 3 && strippedZero !== cleanDigits) {
          searchConditions.push((0, import_drizzle_orm19.ilike)(contacts.phoneNumber, `%${strippedZero}%`));
        }
      }
      const formatted = validateAndFormatPhone(rawSearch);
      if (formatted.isValid && formatted.e164) {
        searchConditions.push((0, import_drizzle_orm19.ilike)(contacts.phoneNumber, `%${formatted.e164}%`));
      }
      whereClause = (0, import_drizzle_orm19.or)(...searchConditions);
    }
    const rows = await db.select({
      id: contacts.id,
      name: contacts.name,
      phoneNumber: contacts.phoneNumber,
      whatsappJid: contacts.whatsappJid,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt
    }).from(contacts).where(whereClause).orderBy((0, import_drizzle_orm19.desc)(contacts.updatedAt)).limit(query.limit).offset(query.offset);
    const contactIds = rows.map((r) => r.id);
    let enhancedRows = rows;
    if (contactIds.length > 0) {
      const pgArrayLiteral = `{${contactIds.join(",")}}`;
      const latestConversations = await db.execute(import_drizzle_orm19.sql`
        SELECT DISTINCT ON (c.contact_id)
          c.contact_id,
          u.name AS "assignedEmployeeName"
        FROM conversations c
        LEFT JOIN employees e ON c.assigned_employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        WHERE c.contact_id = ANY(${pgArrayLiteral}::uuid[])
        ORDER BY c.contact_id, c.created_at DESC
      `);
      const employeeMap = /* @__PURE__ */ new Map();
      for (const row of latestConversations.rows) {
        employeeMap.set(row.contact_id, row.assignedEmployeeName);
      }
      enhancedRows = rows.map((r) => ({
        ...r,
        assignedEmployeeName: employeeMap.get(r.id) || null
      }));
    }
    return reply.send({ success: true, data: enhancedRows });
  });
  app.get("/:id", async (request, reply) => {
    const { id } = request.params;
    const [contact] = await db.select().from(contacts).where((0, import_drizzle_orm19.eq)(contacts.id, id)).limit(1);
    if (!contact) {
      return reply.status(404).send({ success: false, error: "Contact not found" });
    }
    const contactConversations = await db.select().from(conversations).where((0, import_drizzle_orm19.eq)(conversations.contactId, id)).orderBy((0, import_drizzle_orm19.desc)(conversations.updatedAt));
    const contactLeads = await db.select().from(leads).where((0, import_drizzle_orm19.eq)(leads.contactId, id)).orderBy((0, import_drizzle_orm19.desc)(leads.createdAt));
    return reply.send({
      success: true,
      data: {
        ...contact,
        conversations: contactConversations,
        leads: contactLeads
      }
    });
  });
  app.patch("/:id", async (request, reply) => {
    const { id } = request.params;
    const parsed2 = updateContactSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid contact updates", details: parsed2.error.format() });
    }
    const [existing] = await db.select({ metadata: contacts.metadata }).from(contacts).where((0, import_drizzle_orm19.eq)(contacts.id, id)).limit(1);
    if (!existing) {
      return reply.status(404).send({ success: false, error: "Contact not found" });
    }
    const mergedMetadata = parsed2.data.metadata ? { ...existing.metadata || {}, ...parsed2.data.metadata } : existing.metadata;
    const [updated] = await db.update(contacts).set({ ...parsed2.data, metadata: mergedMetadata, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm19.eq)(contacts.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, error: "Contact not found" });
    }
    return reply.send({ success: true, data: updated });
  });
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params;
    const [deleted] = await db.delete(contacts).where((0, import_drizzle_orm19.eq)(contacts.id, id)).returning();
    if (!deleted) {
      return reply.status(404).send({ success: false, error: "Contact not found" });
    }
    return reply.send({ success: true, data: { id } });
  });
  app.post("/:id/sync-landing", async (request, reply) => {
    const { id } = request.params;
    const [contact] = await db.select().from(contacts).where((0, import_drizzle_orm19.eq)(contacts.id, id)).limit(1);
    if (!contact) {
      return reply.status(404).send({ success: false, error: "Contact not found" });
    }
    const contactForSync = {
      ...contact,
      metadata: {
        ...contact.metadata || {},
        trinityLandingSynced: false
      }
    };
    const result = await LandingSyncService.syncContact(contactForSync);
    return reply.send(result);
  });
  app.post("/sync-all-landing", async (_request, reply) => {
    const allContacts = await db.select().from(contacts).limit(200);
    const unsynced = allContacts.filter((c) => {
      const meta = c.metadata || {};
      return meta.trinityLandingSynced !== true;
    });
    let syncedCount = 0;
    let failedCount = 0;
    for (const c of unsynced) {
      const res = await LandingSyncService.syncContact(c);
      if (res.success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }
    return reply.send({
      success: true,
      data: {
        totalEvaluated: unsynced.length,
        syncedCount,
        failedCount
      }
    });
  });
}

// src/modules/leads/leads.routes.ts
var import_drizzle_orm20 = require("drizzle-orm");
var import_zod13 = require("zod");
init_client();
init_schema();
init_ws_hub();
var leadStages = ["new", "contacted", "qualified", "waiting", "converted", "lost"];
var listLeadsQuerySchema = import_zod13.z.object({
  stage: import_zod13.z.enum(leadStages).optional(),
  stationId: import_zod13.z.string().uuid().optional(),
  assignedEmployeeId: import_zod13.z.string().uuid().optional(),
  contactId: import_zod13.z.string().uuid().optional(),
  limit: import_zod13.z.coerce.number().min(1).max(100).default(50),
  offset: import_zod13.z.coerce.number().min(0).default(0)
});
var createLeadSchema = import_zod13.z.object({
  contactId: import_zod13.z.string().uuid(),
  source: import_zod13.z.string().optional(),
  campaign: import_zod13.z.string().optional(),
  destination: import_zod13.z.string().optional(),
  travelDate: import_zod13.z.string().optional(),
  stage: import_zod13.z.enum(leadStages).default("new"),
  stationId: import_zod13.z.string().uuid().optional(),
  assignedEmployeeId: import_zod13.z.string().uuid().optional(),
  metadata: import_zod13.z.record(import_zod13.z.any()).optional()
});
var updateStageSchema = import_zod13.z.object({
  stage: import_zod13.z.enum(leadStages)
});
var updateLeadSchema = import_zod13.z.object({
  destination: import_zod13.z.string().optional(),
  travelDate: import_zod13.z.string().optional(),
  campaign: import_zod13.z.string().optional(),
  assignedEmployeeId: import_zod13.z.string().uuid().nullable().optional(),
  stationId: import_zod13.z.string().uuid().nullable().optional(),
  metadata: import_zod13.z.record(import_zod13.z.any()).optional()
});
async function leadsRoutes(app) {
  app.addHook("preHandler", authenticate);
  app.get("/", async (request, reply) => {
    const query = listLeadsQuerySchema.parse(request.query);
    const conditions = [];
    if (query.stage)
      conditions.push((0, import_drizzle_orm20.eq)(leads.stage, query.stage));
    if (query.stationId)
      conditions.push((0, import_drizzle_orm20.eq)(leads.stationId, query.stationId));
    if (query.assignedEmployeeId)
      conditions.push((0, import_drizzle_orm20.eq)(leads.assignedEmployeeId, query.assignedEmployeeId));
    if (query.contactId)
      conditions.push((0, import_drizzle_orm20.eq)(leads.contactId, query.contactId));
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm20.and)(...conditions) : void 0;
    const rows = await db.select({
      id: leads.id,
      source: leads.source,
      campaign: leads.campaign,
      destination: leads.destination,
      travelDate: leads.travelDate,
      stage: leads.stage,
      metadata: leads.metadata,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      contact: {
        id: contacts.id,
        name: contacts.name,
        phoneNumber: contacts.phoneNumber
      },
      station: {
        id: stations.id,
        name: stations.name
      },
      assignedEmployee: {
        id: employees.id,
        name: users.name
      }
    }).from(leads).innerJoin(contacts, (0, import_drizzle_orm20.eq)(leads.contactId, contacts.id)).leftJoin(stations, (0, import_drizzle_orm20.eq)(leads.stationId, stations.id)).leftJoin(employees, (0, import_drizzle_orm20.eq)(leads.assignedEmployeeId, employees.id)).leftJoin(users, (0, import_drizzle_orm20.eq)(employees.userId, users.id)).where(whereClause).orderBy((0, import_drizzle_orm20.desc)(leads.createdAt)).limit(query.limit).offset(query.offset);
    return reply.send({ success: true, data: rows });
  });
  app.post("/", async (request, reply) => {
    const parsed2 = createLeadSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid lead payload", details: parsed2.error.format() });
    }
    const [created] = await db.insert(leads).values(parsed2.data).returning();
    wsHub.broadcast("lead.created", created);
    return reply.status(201).send({ success: true, data: created });
  });
  app.patch("/:id/stage", async (request, reply) => {
    const { id } = request.params;
    const parsed2 = updateStageSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid stage", details: parsed2.error.format() });
    }
    const [updated] = await db.update(leads).set({ stage: parsed2.data.stage, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm20.eq)(leads.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }
    wsHub.broadcast("lead.updated", { leadId: id, stage: parsed2.data.stage });
    return reply.send({ success: true, data: updated });
  });
  app.patch("/:id", async (request, reply) => {
    const { id } = request.params;
    const parsed2 = updateLeadSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid lead update", details: parsed2.error.format() });
    }
    const [updated] = await db.update(leads).set({ ...parsed2.data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm20.eq)(leads.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }
    return reply.send({ success: true, data: updated });
  });
}

// src/modules/quick-replies/quick-replies.routes.ts
var import_drizzle_orm21 = require("drizzle-orm");
var import_zod14 = require("zod");
init_client();
init_schema();
var createQuickReplySchema = import_zod14.z.object({
  name: import_zod14.z.string().min(1, "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0644\u0644\u0631\u062F").max(150),
  shortcut: import_zod14.z.string().min(1, "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u062E\u062A\u0635\u0627\u0631 \u0644\u0644\u0631\u062F").max(50).transform((val) => val.startsWith("/") ? val : `/${val}`).refine((val) => /^\/[a-zA-Z0-9_\u0600-\u06FF-]+$/.test(val), {
    message: "\u064A\u062C\u0628 \u0623\u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0627\u0644\u0627\u062E\u062A\u0635\u0627\u0631 \u0639\u0644\u0649 \u0645\u0633\u0627\u0641\u0627\u062A \u0623\u0648 \u0631\u0645\u0648\u0632 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645\u0629"
  }),
  body: import_zod14.z.string().min(1, "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0631\u062F"),
  departmentId: import_zod14.z.string().uuid().nullable().optional()
});
async function quickRepliesRoutes(app) {
  app.addHook("preHandler", authenticate);
  app.get("/", async (request, reply) => {
    const rows = await db.select({
      id: quickReplies.id,
      name: quickReplies.name,
      shortcut: quickReplies.shortcut,
      body: quickReplies.body,
      departmentId: quickReplies.departmentId,
      departmentName: departments.name,
      active: quickReplies.active,
      createdAt: quickReplies.createdAt
    }).from(quickReplies).leftJoin(departments, (0, import_drizzle_orm21.eq)(quickReplies.departmentId, departments.id)).where((0, import_drizzle_orm21.eq)(quickReplies.active, true)).orderBy((0, import_drizzle_orm21.desc)(quickReplies.createdAt));
    return reply.send({ success: true, data: rows });
  });
  app.post("/", async (request, reply) => {
    const parsed2 = createQuickReplySchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid quick reply payload", details: parsed2.error.format() });
    }
    const [created] = await db.insert(quickReplies).values({
      name: parsed2.data.name,
      shortcut: parsed2.data.shortcut.startsWith("/") ? parsed2.data.shortcut : `/${parsed2.data.shortcut}`,
      body: parsed2.data.body,
      departmentId: parsed2.data.departmentId || null,
      active: true
    }).returning();
    return reply.status(201).send({ success: true, data: created });
  });
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params;
    const [deleted] = await db.delete(quickReplies).where((0, import_drizzle_orm21.eq)(quickReplies.id, id)).returning();
    if (!deleted) {
      return reply.status(404).send({ success: false, error: "Quick reply not found" });
    }
    return reply.send({ success: true, message: "Quick reply deleted" });
  });
}

// src/modules/media/media.routes.ts
var import_zod15 = require("zod");
init_logger();
var storage2 = new LocalStorageProvider();
var uploadSchema = import_zod15.z.object({
  dataUrl: import_zod15.z.string().min(10),
  // data:[<mediatype>];base64,<data>
  fileName: import_zod15.z.string().min(1).max(255),
  mimeType: import_zod15.z.string().min(1).max(100)
});
async function mediaRoutes(app) {
  app.post("/upload", { preHandler: [authenticate] }, async (request, reply) => {
    const parsed2 = uploadSchema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid media payload", details: parsed2.error.format() });
    }
    const { dataUrl, fileName, mimeType } = parsed2.data;
    try {
      const base64Data = dataUrl.includes(";base64,") ? dataUrl.split(";base64,")[1] : dataUrl;
      const buffer = Buffer.from(base64Data, "base64");
      const { storageKey, size } = await storage2.upload(buffer, {
        fileName,
        mimeType,
        directory: "uploads"
      });
      const url = `/api/v1/media/${encodeURIComponent(storageKey)}`;
      logger.info({ fileName, storageKey, size }, "Media uploaded successfully");
      return reply.status(201).send({
        success: true,
        data: {
          storageKey,
          url,
          size,
          mimeType,
          fileName
        }
      });
    } catch (err) {
      logger.error({ err }, "Failed to process media upload");
      return reply.status(500).send({ success: false, error: "Failed to upload media file" });
    }
  });
  app.get("/:key", async (request, reply) => {
    const key = decodeURIComponent(request.params.key);
    try {
      const buffer = await storage2.download(key);
      const ext = key.split(".").pop()?.toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === "jpg" || ext === "jpeg")
        contentType = "image/jpeg";
      else if (ext === "png")
        contentType = "image/png";
      else if (ext === "webp")
        contentType = "image/webp";
      else if (ext === "mp4")
        contentType = "video/mp4";
      else if (ext === "ogg" || ext === "oga" || ext === "opus")
        contentType = "audio/ogg";
      else if (ext === "mp3")
        contentType = "audio/mpeg";
      else if (ext === "pdf")
        contentType = "application/pdf";
      reply.type(contentType);
      return reply.send(buffer);
    } catch (err) {
      return reply.status(404).send({ success: false, error: "Media file not found" });
    }
  });
}

// src/modules/automations/automations.routes.ts
init_client();
init_schema();
var import_drizzle_orm22 = require("drizzle-orm");
var import_zod16 = require("zod");
init_logger();
init_ws_hub();
init_business_hours_converter();
var automationsRoutes = async (app) => {
  app.addHook("preHandler", authenticate);
  const getSettingsHandler = async (request, reply) => {
    const allSettings = await db.query.settings.findMany();
    const settingsMap = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }
    const welcomeEnabled = settingsMap["welcome_message_enabled"] ?? true;
    const welcomeTmpl = settingsMap["welcome_message_template"] ?? "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A \u062A\u0631\u064A\u0646\u062A\u064A \u0641\u064A\u062C\u0646 (Trenty Vision) \u0644\u0644\u062E\u062F\u0645\u0627\u062A \u0648\u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629! \u064A\u0633\u0639\u062F\u0646\u0627 \u062A\u0648\u0627\u0635\u0644\u0643 \u0645\u0639\u0646\u0627\u060C \u0633\u064A\u0642\u0648\u0645 \u0623\u062D\u062F \u0623\u062E\u0635\u0627\u0626\u064A\u064A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0628\u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0643 \u0648\u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0641\u064A \u0623\u0642\u0631\u0628 \u0648\u0642\u062A.";
    const oohEnabled = settingsMap["out_of_hours_message_enabled"] ?? settingsMap["outOfHoursMessageEnabled"] ?? settingsMap["outOfOfficeBotEnabled"] ?? settingsMap["outOfOfficeEnabled"] ?? false;
    const oohTmpl = settingsMap["out_of_hours_message_template"] ?? settingsMap["outOfHoursMessageTemplate"] ?? settingsMap["outOfOfficeMessage"] ?? "\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0648\u0627\u0635\u0644\u0643 \u0645\u0639 \u062A\u0631\u064A\u0646\u062A\u064A \u0641\u064A\u062C\u0646 (Trenty Vision) \u0644\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629! \u0646\u062D\u0646 \u062D\u0627\u0644\u064A\u0627\u064B \u062E\u0627\u0631\u062C \u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0631\u0633\u0645\u064A\u0629. \u0633\u0646\u0642\u0648\u0645 \u0628\u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0643 \u0648\u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0641\u0648\u0631 \u0628\u062F\u0621 \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0642\u0627\u062F\u0645\u0629.";
    const assignMode = settingsMap["assignment_mode"] ?? "round_robin";
    const rawBHours = settingsMap["business_hours"] ?? settingsMap["businessHours"];
    const bHoursObj = unifyBusinessHours(rawBHours);
    const payload = {
      automationEnabled: settingsMap["automation_enabled"] ?? true,
      assignmentEnabled: settingsMap["assignment_enabled"] ?? true,
      assignmentMode: assignMode,
      routingStrategy: assignMode,
      welcomeMessageEnabled: welcomeEnabled,
      greetingBotEnabled: welcomeEnabled,
      welcomeMessageTemplate: welcomeTmpl,
      greetingMessage: welcomeTmpl,
      outOfHoursMessageEnabled: oohEnabled,
      outOfOfficeBotEnabled: oohEnabled,
      outOfOfficeEnabled: oohEnabled,
      outOfHoursMessageTemplate: oohTmpl,
      outOfOfficeMessage: oohTmpl,
      businessHours: bHoursObj,
      businessHoursStart: bHoursObj.start || "09:00",
      businessHoursEnd: bHoursObj.end || "18:00",
      activeDays: bHoursObj.workDays || [0, 1, 2, 3, 4, 6]
    };
    return reply.send({
      success: true,
      data: payload
    });
  };
  app.get("/settings", getSettingsHandler);
  app.get("/", getSettingsHandler);
  const updateSettingsHandler = async (request, reply) => {
    const raw = request.body || {};
    const updates = [];
    const autoEnabled = raw.automationEnabled;
    if (autoEnabled !== void 0) {
      updates.push({ key: "automation_enabled", value: autoEnabled, groupName: "automation" });
    }
    const assignEnabled = raw.assignmentEnabled;
    if (assignEnabled !== void 0) {
      updates.push({ key: "assignment_enabled", value: assignEnabled, groupName: "assignment" });
    }
    const assignMode = raw.assignmentMode || raw.routingStrategy;
    if (assignMode !== void 0) {
      updates.push({ key: "assignment_mode", value: assignMode, groupName: "assignment" });
    }
    const welcomeEnabled = raw.welcomeMessageEnabled ?? raw.greetingBotEnabled;
    if (welcomeEnabled !== void 0) {
      updates.push({ key: "welcome_message_enabled", value: welcomeEnabled, groupName: "automation" });
    }
    const welcomeTmpl = raw.welcomeMessageTemplate || raw.greetingMessage;
    if (welcomeTmpl !== void 0) {
      updates.push({ key: "welcome_message_template", value: welcomeTmpl, groupName: "automation" });
    }
    const oohEnabled = raw.outOfHoursMessageEnabled ?? raw.outOfOfficeBotEnabled ?? raw.outOfOfficeEnabled;
    if (oohEnabled !== void 0) {
      updates.push({ key: "out_of_hours_message_enabled", value: oohEnabled, groupName: "automation" });
      updates.push({ key: "outOfHoursMessageEnabled", value: oohEnabled, groupName: "automation" });
      updates.push({ key: "outOfOfficeBotEnabled", value: oohEnabled, groupName: "automation" });
      updates.push({ key: "outOfOfficeEnabled", value: oohEnabled, groupName: "automation" });
    }
    const oohTmpl = raw.outOfHoursMessageTemplate || raw.outOfOfficeMessage;
    if (oohTmpl !== void 0) {
      updates.push({ key: "out_of_hours_message_template", value: oohTmpl, groupName: "automation" });
      updates.push({ key: "outOfHoursMessageTemplate", value: oohTmpl, groupName: "automation" });
      updates.push({ key: "outOfOfficeMessage", value: oohTmpl, groupName: "automation" });
    }
    let bHours = raw.businessHours ?? raw.business_hours;
    if (raw.businessHoursStart !== void 0 || raw.businessHoursEnd !== void 0 || raw.activeDays !== void 0) {
      const existingBHours = await db.query.settings.findFirst({
        where: (0, import_drizzle_orm22.eq)(settings.key, "business_hours")
      });
      const current = existingBHours?.value || {
        enabled: true,
        timezone: "Asia/Kuwait",
        start: "09:00",
        end: "18:00",
        workDays: [0, 1, 2, 3, 4, 6]
      };
      bHours = unifyBusinessHours({
        ...current,
        start: raw.businessHoursStart ?? current.start ?? "09:00",
        end: raw.businessHoursEnd ?? current.end ?? "18:00",
        workDays: raw.activeDays ?? current.workDays ?? [0, 1, 2, 3, 4, 6],
        activeDays: raw.activeDays ?? current.workDays ?? [0, 1, 2, 3, 4, 6]
      });
    } else if (bHours !== void 0) {
      bHours = unifyBusinessHours(bHours);
    }
    if (bHours !== void 0) {
      updates.push({ key: "business_hours", value: bHours, groupName: "operational" });
      updates.push({ key: "businessHours", value: bHours, groupName: "operational" });
    }
    for (const item of updates) {
      const existing = await db.query.settings.findFirst({
        where: (0, import_drizzle_orm22.eq)(settings.key, item.key)
      });
      if (existing) {
        await db.update(settings).set({ value: item.value, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm22.eq)(settings.key, item.key));
      } else {
        await db.insert(settings).values({
          key: item.key,
          value: item.value,
          groupName: item.groupName
        });
      }
    }
    logger.info({ userId: request.user?.id }, "Automation settings updated");
    return reply.send({ success: true, message: "Settings updated successfully" });
  };
  app.put("/settings", updateSettingsHandler);
  app.put("/", updateSettingsHandler);
  app.get("/rules", async (request, reply) => {
    const rules = await db.query.automationRules.findMany({
      orderBy: [automationRules.priority, (0, import_drizzle_orm22.desc)(automationRules.createdAt)]
    });
    return reply.send({ success: true, data: rules });
  });
  app.post("/rules", async (request, reply) => {
    const ruleValidator = import_zod16.z.object({
      name: import_zod16.z.string().min(1),
      triggerType: import_zod16.z.string().default("keyword"),
      conditions: import_zod16.z.record(import_zod16.z.any()).default({}),
      actions: import_zod16.z.array(import_zod16.z.record(import_zod16.z.any())).default([]),
      priority: import_zod16.z.number().default(0),
      enabled: import_zod16.z.boolean().default(true),
      scope: import_zod16.z.string().default("global")
    });
    const data = ruleValidator.parse(request.body);
    const [rule] = await db.insert(automationRules).values({
      name: data.name,
      triggerType: data.triggerType,
      conditions: data.conditions,
      actions: data.actions,
      priority: data.priority,
      enabled: data.enabled,
      scope: data.scope
    }).returning();
    return reply.status(201).send({ success: true, data: rule });
  });
  const updateRuleHandler = async (request, reply) => {
    const { id } = request.params;
    const ruleValidator = import_zod16.z.object({
      name: import_zod16.z.string().optional(),
      triggerType: import_zod16.z.string().optional(),
      conditions: import_zod16.z.record(import_zod16.z.any()).optional(),
      actions: import_zod16.z.array(import_zod16.z.record(import_zod16.z.any())).optional(),
      priority: import_zod16.z.number().optional(),
      enabled: import_zod16.z.boolean().optional(),
      scope: import_zod16.z.string().optional()
    });
    const data = ruleValidator.parse(request.body);
    const [updated] = await db.update(automationRules).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm22.eq)(automationRules.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, message: "Rule not found" });
    }
    return reply.send({ success: true, data: updated });
  };
  app.patch("/rules/:id", updateRuleHandler);
  app.put("/rules/:id", updateRuleHandler);
  app.delete("/rules/:id", async (request, reply) => {
    const { id } = request.params;
    await db.delete(automationRules).where((0, import_drizzle_orm22.eq)(automationRules.id, id));
    return reply.send({ success: true, message: "Rule deleted" });
  });
  app.get("/reminders", async (request, reply) => {
    const user = request.user;
    const query = request.query;
    const conditions = [];
    const isAdmin = user.roleName === "adminstrator" || user.roleName === "admin" || user.roleName === "super_admin";
    if (!isAdmin || query.all !== "true") {
      conditions.push((0, import_drizzle_orm22.eq)(reminders.assignedUserId, user.id));
    }
    if (query.status && query.status !== "all") {
      conditions.push((0, import_drizzle_orm22.eq)(reminders.status, query.status));
    }
    if (query.conversationId) {
      conditions.push((0, import_drizzle_orm22.eq)(reminders.conversationId, query.conversationId));
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm22.and)(...conditions) : void 0;
    const list = await db.select({
      id: reminders.id,
      title: reminders.title,
      note: reminders.note,
      dueAt: reminders.dueAt,
      status: reminders.status,
      completedAt: reminders.completedAt,
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      conversationId: reminders.conversationId,
      leadId: reminders.leadId,
      assignedUserId: reminders.assignedUserId,
      assignedUserName: users.name,
      assignedUserEmail: users.email,
      contactName: contacts.name,
      contactPhone: contacts.phoneNumber
    }).from(reminders).leftJoin(users, (0, import_drizzle_orm22.eq)(reminders.assignedUserId, users.id)).leftJoin(conversations, (0, import_drizzle_orm22.eq)(reminders.conversationId, conversations.id)).leftJoin(contacts, (0, import_drizzle_orm22.eq)(conversations.contactId, contacts.id)).where(whereClause).orderBy((0, import_drizzle_orm22.desc)(reminders.dueAt));
    return reply.send({ success: true, data: list });
  });
  async function resolveAssignedUserId(rawId, fallbackUserId) {
    if (!rawId || typeof rawId !== "string" || rawId.trim() === "") {
      return fallbackUserId;
    }
    const cleanId = rawId.trim();
    const [existingUser] = await db.select({ id: users.id }).from(users).where((0, import_drizzle_orm22.eq)(users.id, cleanId)).limit(1);
    if (existingUser) {
      return existingUser.id;
    }
    const [employee] = await db.select({ userId: employees.userId }).from(employees).where((0, import_drizzle_orm22.eq)(employees.id, cleanId)).limit(1);
    if (employee && employee.userId) {
      return employee.userId;
    }
    return fallbackUserId;
  }
  app.post("/reminders", async (request, reply) => {
    const user = request.user;
    const validator = import_zod16.z.object({
      conversationId: import_zod16.z.string().uuid().optional().nullable(),
      leadId: import_zod16.z.string().uuid().optional().nullable(),
      assignedUserId: import_zod16.z.string().optional().nullable(),
      title: import_zod16.z.string().min(1),
      note: import_zod16.z.string().optional().nullable(),
      dueAt: import_zod16.z.string().datetime()
    });
    const data = validator.parse(request.body);
    const assignedUserId = await resolveAssignedUserId(data.assignedUserId, user.id);
    const [created] = await db.insert(reminders).values({
      assignedUserId,
      conversationId: data.conversationId || null,
      leadId: data.leadId || null,
      title: data.title,
      note: data.note || null,
      dueAt: new Date(data.dueAt),
      status: "pending"
    }).returning();
    wsHub.broadcast("reminder.created", created);
    return reply.status(201).send({ success: true, data: created });
  });
  app.patch("/reminders/:id/status", async (request, reply) => {
    const { id } = request.params;
    const { status } = import_zod16.z.object({
      status: import_zod16.z.enum(["pending", "completed", "cancelled"])
    }).parse(request.body);
    const [updated] = await db.update(reminders).set({
      status,
      completedAt: status === "completed" ? /* @__PURE__ */ new Date() : null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm22.eq)(reminders.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, message: "Reminder not found" });
    }
    wsHub.broadcast("reminder.updated", updated);
    return reply.send({ success: true, data: updated });
  });
  app.patch("/reminders/:id", async (request, reply) => {
    const user = request.user;
    const { id } = request.params;
    const validator = import_zod16.z.object({
      title: import_zod16.z.string().min(1).optional(),
      note: import_zod16.z.string().optional().nullable(),
      dueAt: import_zod16.z.string().datetime().optional(),
      status: import_zod16.z.enum(["pending", "completed", "cancelled", "overdue"]).optional(),
      assignedUserId: import_zod16.z.string().optional().nullable()
    });
    const data = validator.parse(request.body);
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (data.title !== void 0)
      updates.title = data.title;
    if (data.note !== void 0)
      updates.note = data.note;
    if (data.dueAt !== void 0)
      updates.dueAt = new Date(data.dueAt);
    if (data.assignedUserId !== void 0) {
      updates.assignedUserId = await resolveAssignedUserId(data.assignedUserId, user.id);
    }
    if (data.status !== void 0) {
      updates.status = data.status;
      if (data.status === "completed")
        updates.completedAt = /* @__PURE__ */ new Date();
      if (data.status === "pending")
        updates.completedAt = null;
    }
    const [updated] = await db.update(reminders).set(updates).where((0, import_drizzle_orm22.eq)(reminders.id, id)).returning();
    if (!updated) {
      return reply.status(404).send({ success: false, message: "Reminder not found" });
    }
    wsHub.broadcast("reminder.updated", updated);
    return reply.send({ success: true, data: updated });
  });
  app.delete("/reminders/:id", async (request, reply) => {
    const { id } = request.params;
    const [deleted] = await db.delete(reminders).where((0, import_drizzle_orm22.eq)(reminders.id, id)).returning();
    if (!deleted) {
      return reply.status(404).send({ success: false, message: "Reminder not found" });
    }
    wsHub.broadcast("reminder.deleted", { id });
    return reply.send({ success: true, message: "Reminder deleted successfully" });
  });
};

// src/modules/reports/reports.routes.ts
var import_drizzle_orm23 = require("drizzle-orm");
init_client();
init_schema();
init_logger();
function escapeCsv(value) {
  if (value === null || value === void 0)
    return "";
  const str = String(value).replace(/"/g, '""');
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str}"`;
  }
  return str;
}
function getPeriodDate(period) {
  if (!period || period === "all")
    return null;
  const now = /* @__PURE__ */ new Date();
  if (period === "today") {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today;
  }
  if (period === "24h") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1e3);
  }
  if (period === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
  }
  if (period === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
  }
  if (period === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}
async function reportsRoutes(app) {
  app.addHook("preHandler", authenticate);
  async function getMetricsData(period) {
    const fromDate = getPeriodDate(period);
    const convResult = await db.execute(import_drizzle_orm23.sql`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'waiting') AS waiting,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed
      FROM conversations
      ${fromDate ? import_drizzle_orm23.sql`WHERE created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
    `);
    const convStats = convResult.rows[0];
    const msgResult = await db.execute(import_drizzle_orm23.sql`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE direction = 'incoming') AS incoming,
        COUNT(*) FILTER (WHERE direction = 'outgoing') AS outgoing
      FROM messages
      ${fromDate ? import_drizzle_orm23.sql`WHERE created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
    `);
    const msgStats = msgResult.rows[0];
    const contactResult = await db.execute(import_drizzle_orm23.sql`
      SELECT COUNT(*) AS total
      FROM contacts
      ${fromDate ? import_drizzle_orm23.sql`WHERE created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
    `);
    const contactStats = contactResult.rows[0];
    const leadResult = await db.execute(import_drizzle_orm23.sql`
      SELECT stage, COUNT(*) AS count
      FROM leads
      ${fromDate ? import_drizzle_orm23.sql`WHERE created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
      GROUP BY stage
    `);
    const funnel = {
      new: 0,
      contacted: 0,
      qualified: 0,
      waiting: 0,
      converted: 0,
      lost: 0
    };
    for (const r of leadResult.rows) {
      if (r.stage)
        funnel[r.stage] = Number(r.count || 0);
    }
    const avgRespResult = await db.execute(import_drizzle_orm23.sql`
      WITH message_pairs AS (
        SELECT 
          m_in.id,
          m_in.conversation_id,
          m_in.created_at AS in_time,
          MIN(m_out.created_at) AS out_time
        FROM messages m_in
        INNER JOIN messages m_out 
          ON m_in.conversation_id = m_out.conversation_id
          AND m_out.direction = 'outgoing'
          AND m_out.created_at > m_in.created_at
        WHERE m_in.direction = 'incoming' ${fromDate ? import_drizzle_orm23.sql`AND m_in.created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
        GROUP BY m_in.id, m_in.conversation_id, m_in.created_at
      )
      SELECT 
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_response_seconds
      FROM message_pairs
    `);
    const avgResp = avgRespResult.rows[0];
    const stationsResult = await db.execute(import_drizzle_orm23.sql`
      SELECT 
        s.id,
        s.name,
        s.color,
        COUNT(c.id) AS total_conversations,
        COUNT(c.id) FILTER (WHERE c.status = 'open') AS open_conversations
      FROM stations s
      LEFT JOIN conversations c ON s.id = c.assigned_station_id ${fromDate ? import_drizzle_orm23.sql`AND c.created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
      WHERE s.active = true OR s.active IS NULL
      GROUP BY s.id, s.name, s.color
      ORDER BY total_conversations DESC, s.name ASC
    `);
    const employeesResult = await db.execute(import_drizzle_orm23.sql`
      WITH employee_convs AS (
        SELECT 
          assigned_employee_id,
          COUNT(id) AS total_assigned,
          COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved
        FROM conversations
        ${fromDate ? import_drizzle_orm23.sql`WHERE created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
        GROUP BY assigned_employee_id
      ),
      employee_msgs AS (
        SELECT 
          sender_user_id,
          COUNT(id) AS outgoing_messages
        FROM messages
        WHERE direction = 'outgoing' ${fromDate ? import_drizzle_orm23.sql`AND created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
        GROUP BY sender_user_id
      ),
      employee_resp AS (
        WITH emp_pairs AS (
          SELECT 
            c.assigned_employee_id,
            m_in.id,
            m_in.created_at AS in_time,
            MIN(m_out.created_at) AS out_time
          FROM messages m_in
          INNER JOIN conversations c ON m_in.conversation_id = c.id
          INNER JOIN messages m_out 
            ON m_in.conversation_id = m_out.conversation_id
            AND m_out.direction = 'outgoing'
            AND m_out.created_at > m_in.created_at
          WHERE m_in.direction = 'incoming' ${fromDate ? import_drizzle_orm23.sql`AND m_in.created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
          GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at
        )
        SELECT 
          assigned_employee_id,
          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds
        FROM emp_pairs
        GROUP BY assigned_employee_id
      )
      SELECT 
        e.id,
        e.status,
        u.name,
        u.email,
        s.name AS station_name,
        COALESCE(ec.total_assigned, 0) AS total_assigned,
        COALESCE(ec.total_resolved, 0) AS total_resolved,
        COALESCE(em.outgoing_messages, 0) AS outgoing_messages,
        COALESCE(er.avg_seconds, 0) AS avg_response_seconds
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN stations s ON e.station_id = s.id
      LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id
      LEFT JOIN employee_msgs em ON u.id = em.sender_user_id
      LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id
      ORDER BY total_assigned DESC, u.name ASC
    `);
    const totalConvs = Number(convStats?.total || 0);
    const closedConvs = Number(convStats?.closed || 0);
    const resolutionRate = totalConvs > 0 ? Math.round(closedConvs / totalConvs * 100) : 0;
    const employeeRows = employeesResult.rows;
    const stationRows = stationsResult.rows;
    return {
      overview: {
        totalConversations: totalConvs,
        openConversations: Number(convStats?.open || 0),
        pendingConversations: Number(convStats?.pending || 0),
        waitingConversations: Number(convStats?.waiting || 0),
        closedConversations: closedConvs,
        resolvedConversations: closedConvs,
        resolutionRate,
        totalMessages: Number(msgStats?.total || 0),
        totalMessagesSent: Number(msgStats?.outgoing || 0),
        totalMessagesReceived: Number(msgStats?.incoming || 0),
        incomingMessages: Number(msgStats?.incoming || 0),
        outgoingMessages: Number(msgStats?.outgoing || 0),
        totalContacts: Number(contactStats?.total || 0),
        activeAgentsCount: employeeRows.filter((e) => e.status === "active").length,
        avgResponseTimeSeconds: Number(avgResp?.avg_response_seconds || 0)
      },
      leadsFunnel: funnel,
      stations: stationRows.map((s) => ({
        id: s.id,
        stationId: s.id,
        name: s.name,
        stationName: s.name,
        color: s.color || "#1c9770",
        totalChats: Number(s.total_conversations || 0),
        activeChats: Number(s.open_conversations || 0),
        totalConversations: Number(s.total_conversations || 0),
        openConversations: Number(s.open_conversations || 0),
        conversationCount: Number(s.total_conversations || 0)
      })),
      employees: employeeRows.map((e) => {
        const avgSecs = Number(e.avg_response_seconds || 0);
        return {
          id: e.id,
          agentId: e.id,
          name: e.name,
          agentName: e.name,
          email: e.email,
          status: e.status,
          stationName: e.station_name || "\u063A\u064A\u0631 \u0645\u0633\u0646\u062F",
          totalAssigned: Number(e.total_assigned || 0),
          assignedConversations: Number(e.total_assigned || 0),
          totalResolved: Number(e.total_resolved || 0),
          closedConversations: Number(e.total_resolved || 0),
          resolvedConversations: Number(e.total_resolved || 0),
          outgoingMessages: Number(e.outgoing_messages || 0),
          avgResponseTimeSeconds: avgSecs,
          avgResponseMinutes: Math.round(avgSecs / 60),
          onlineHours: e.status === "active" ? 8 : 0
        };
      })
    };
  }
  app.get("/metrics", async (request, reply) => {
    try {
      const period = request.query?.period;
      const data = await getMetricsData(period);
      return reply.send({ success: true, data });
    } catch (err) {
      logger.error({ err }, "Failed to fetch reports metrics");
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });
  app.get("/overview", async (request, reply) => {
    try {
      const period = request.query?.period;
      const data = await getMetricsData(period);
      return reply.send({ success: true, data: data.overview });
    } catch (err) {
      logger.error({ err }, "Failed to fetch overview metrics");
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });
  app.get("/agents", async (request, reply) => {
    try {
      const period = request.query?.period;
      const data = await getMetricsData(period);
      return reply.send({ success: true, data: data.employees });
    } catch (err) {
      logger.error({ err }, "Failed to fetch agent metrics");
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });
  app.get("/stations", async (request, reply) => {
    try {
      const period = request.query?.period;
      const data = await getMetricsData(period);
      return reply.send({ success: true, data: data.stations });
    } catch (err) {
      logger.error({ err }, "Failed to fetch station metrics");
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });
  app.get("/conversations/export", async (request, reply) => {
    try {
      const period = request.query?.period;
      const fromDate = getPeriodDate(period);
      let query = db.select({
        id: conversations.id,
        status: conversations.status,
        contactName: contacts.name,
        contactPhone: contacts.phoneNumber,
        stationName: stations.name,
        employeeName: users.name,
        unreadCount: conversations.unreadCount,
        lastMessageText: conversations.lastMessageText,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt
      }).from(conversations).innerJoin(contacts, (0, import_drizzle_orm23.eq)(conversations.contactId, contacts.id)).leftJoin(stations, (0, import_drizzle_orm23.eq)(conversations.assignedStationId, stations.id)).leftJoin(employees, (0, import_drizzle_orm23.eq)(conversations.assignedEmployeeId, employees.id)).leftJoin(users, (0, import_drizzle_orm23.eq)(employees.userId, users.id));
      const rows = fromDate ? await query.where((0, import_drizzle_orm23.gte)(conversations.createdAt, fromDate)).orderBy((0, import_drizzle_orm23.desc)(conversations.createdAt)) : await query.orderBy((0, import_drizzle_orm23.desc)(conversations.createdAt));
      const headers = [
        "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
        "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644",
        "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
        "\u0627\u0644\u0645\u062D\u0637\u0629",
        "\u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u0646\u062F",
        "\u0627\u0644\u062D\u0627\u0644\u0629",
        "\u063A\u064A\u0631 \u0645\u0642\u0631\u0648\u0621\u0629",
        "\u0622\u062E\u0631 \u0631\u0633\u0627\u0644\u0629",
        "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0628\u062F\u0621",
        "\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B"
      ];
      const csvLines = [headers.map(escapeCsv).join(",")];
      for (const r of rows) {
        const line = [
          r.id,
          r.contactName,
          r.contactPhone,
          r.stationName || "\u063A\u064A\u0631 \u0645\u0633\u0646\u062F",
          r.employeeName || "\u063A\u064A\u0631 \u0645\u0633\u0646\u062F",
          r.status,
          r.unreadCount,
          r.lastMessageText || "",
          r.createdAt ? new Date(r.createdAt).toISOString() : "",
          r.updatedAt ? new Date(r.updatedAt).toISOString() : ""
        ];
        csvLines.push(line.map(escapeCsv).join(","));
      }
      const csvContent = "\uFEFF" + csvLines.join("\r\n");
      const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="trenty_vision_conversations_${dateStr}.csv"`);
      return reply.send(csvContent);
    } catch (err) {
      logger.error({ err }, "Failed to export conversations CSV");
      return reply.status(500).send({ success: false, error: "Failed to export conversations" });
    }
  });
  app.get("/contacts/export", async (request, reply) => {
    try {
      const period = request.query?.period;
      const fromDate = getPeriodDate(period);
      let query = db.select({
        id: contacts.id,
        name: contacts.name,
        phoneNumber: contacts.phoneNumber,
        whatsappJid: contacts.whatsappJid,
        source: contacts.source,
        createdAt: contacts.createdAt,
        leadStage: leads.stage,
        campaign: leads.campaign,
        destination: leads.destination
      }).from(contacts).leftJoin(leads, (0, import_drizzle_orm23.eq)(contacts.id, leads.contactId));
      const rows = fromDate ? await query.where((0, import_drizzle_orm23.gte)(contacts.createdAt, fromDate)).orderBy((0, import_drizzle_orm23.desc)(contacts.createdAt)) : await query.orderBy((0, import_drizzle_orm23.desc)(contacts.createdAt));
      const headers = [
        "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0645\u064A\u0644",
        "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644",
        "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
        "\u0645\u0639\u0631\u0641 \u0648\u0627\u062A\u0633\u0627\u0628",
        "\u0627\u0644\u0645\u0635\u062F\u0631",
        "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 (Lead Stage)",
        "\u0627\u0644\u062D\u0645\u0644\u0629 \u0627\u0644\u062A\u0633\u0648\u064A\u0642\u064A\u0629",
        "\u0627\u0644\u062E\u062F\u0645\u0629 \u0623\u0648 \u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0645\u0637\u0644\u0648\u0628",
        "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644"
      ];
      const csvLines = [headers.map(escapeCsv).join(",")];
      for (const r of rows) {
        const line = [
          r.id,
          r.name,
          r.phoneNumber,
          r.whatsappJid || "",
          r.source || "direct",
          r.leadStage || "none",
          r.campaign || "",
          r.destination || "",
          r.createdAt ? new Date(r.createdAt).toISOString() : ""
        ];
        csvLines.push(line.map(escapeCsv).join(","));
      }
      const csvContent = "\uFEFF" + csvLines.join("\r\n");
      const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="trenty_vision_contacts_leads_${dateStr}.csv"`);
      return reply.send(csvContent);
    } catch (err) {
      logger.error({ err }, "Failed to export contacts CSV");
      return reply.status(500).send({ success: false, error: "Failed to export contacts" });
    }
  });
  app.get("/employee-whatsapp-performance", async (request, reply) => {
    try {
      const period = request.query?.period;
      const fromDate = getPeriodDate(period);
      const employeesResult = await db.execute(import_drizzle_orm23.sql`
        WITH employee_convs AS (
          SELECT 
            assigned_employee_id,
            COUNT(id) AS total_assigned,
            COUNT(id) FILTER (WHERE status = 'closed') AS total_resolved
          FROM conversations
          ${fromDate ? import_drizzle_orm23.sql`WHERE created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
          GROUP BY assigned_employee_id
        ),
        employee_msgs AS (
          SELECT 
            sender_user_id,
            COUNT(id) AS outgoing_messages
          FROM messages
          WHERE direction = 'outgoing' ${fromDate ? import_drizzle_orm23.sql`AND created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
          GROUP BY sender_user_id
        ),
        employee_replied_convs AS (
          SELECT 
            sender_user_id,
            COUNT(DISTINCT conversation_id) AS replied_convs_count
          FROM messages
          WHERE direction = 'outgoing' ${fromDate ? import_drizzle_orm23.sql`AND created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
          GROUP BY sender_user_id
        ),
        employee_resp AS (
          WITH emp_pairs AS (
            SELECT 
              c.assigned_employee_id,
              m_in.id,
              m_in.created_at AS in_time,
              MIN(m_out.created_at) AS out_time
            FROM messages m_in
            INNER JOIN conversations c ON m_in.conversation_id = c.id
            INNER JOIN messages m_out 
              ON m_in.conversation_id = m_out.conversation_id
              AND m_out.direction = 'outgoing'
              AND m_out.created_at > m_in.created_at
            WHERE m_in.direction = 'incoming' ${fromDate ? import_drizzle_orm23.sql`AND m_in.created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
            GROUP BY c.assigned_employee_id, m_in.id, m_in.created_at
          )
          SELECT 
            assigned_employee_id,
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (out_time - in_time)))), 0) AS avg_seconds
          FROM emp_pairs
          GROUP BY assigned_employee_id
        )
        SELECT 
          e.id,
          e.status,
          e.whatsapp_number,
          u.name,
          s.name AS station_name,
          COALESCE(ec.total_assigned, 0) AS total_assigned,
          COALESCE(em.outgoing_messages, 0) AS outgoing_messages,
          COALESCE(erc.replied_convs_count, 0) AS replied_customers,
          COALESCE(er.avg_seconds, 0) AS avg_response_seconds
        FROM employees e
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN stations s ON e.station_id = s.id
        LEFT JOIN employee_convs ec ON e.id = ec.assigned_employee_id
        LEFT JOIN employee_msgs em ON u.id = em.sender_user_id
        LEFT JOIN employee_replied_convs erc ON u.id = erc.sender_user_id
        LEFT JOIN employee_resp er ON e.id = er.assigned_employee_id
        WHERE e.whatsapp_number IS NOT NULL AND e.whatsapp_number != ''
        ORDER BY total_assigned DESC, u.name ASC
      `);
      const employeeRows = employeesResult.rows;
      const data = employeeRows.map((e) => {
        const avgSecs = Number(e.avg_response_seconds || 0);
        return {
          id: e.id,
          name: e.name,
          status: e.status,
          whatsappNumber: e.whatsapp_number,
          stationName: e.station_name || "\u063A\u064A\u0631 \u0645\u0633\u0646\u062F",
          totalAssigned: Number(e.total_assigned || 0),
          totalRepliedToCustomers: Number(e.replied_customers || 0),
          totalOutgoingMessages: Number(e.outgoing_messages || 0),
          avgResponseTimeSeconds: avgSecs,
          avgResponseMinutes: Math.round(avgSecs / 60)
        };
      });
      return reply.send({ success: true, data });
    } catch (err) {
      logger.error({ err }, "Failed to fetch employee whatsapp performance");
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });
  app.get("/auto-registered-customers", async (request, reply) => {
    try {
      const period = request.query?.period;
      const fromDate = getPeriodDate(period);
      const queryResult = await db.execute(import_drizzle_orm23.sql`
        WITH first_conversations AS (
          SELECT DISTINCT ON (contact_id)
            id AS conversation_id,
            contact_id,
            assigned_employee_id,
            whatsapp_account_id,
            created_at
          FROM conversations
          ORDER BY contact_id, created_at ASC
        )
        SELECT 
          c.id,
          c.name,
          c.phone_number AS "phoneNumber",
          c.created_at AS "contactCreatedAt",
          fc.created_at AS "conversationCreatedAt",
          u.name AS "assignedEmployeeName",
          wa.display_name AS "dispatcherName"
        FROM contacts c
        INNER JOIN first_conversations fc ON c.id = fc.contact_id
        LEFT JOIN employees e ON fc.assigned_employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        INNER JOIN whatsapp_accounts wa ON fc.whatsapp_account_id = wa.id
        WHERE wa.is_primary_dispatcher = true
        ${fromDate ? import_drizzle_orm23.sql`AND c.created_at >= ${fromDate}` : import_drizzle_orm23.sql``}
        ORDER BY c.created_at DESC
      `);
      const rows = queryResult.rows;
      return reply.send({ success: true, data: rows });
    } catch (err) {
      logger.error({ err }, "Failed to fetch auto-registered customers");
      return reply.status(500).send({ success: false, error: "Internal Server Error" });
    }
  });
}

// src/modules/superadmin/superadmin.routes.ts
init_client();
init_users();
init_roles();
init_schema();
var import_drizzle_orm24 = require("drizzle-orm");
var import_zod17 = require("zod");
var import_fs2 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var SUPER_ADMIN_EMAIL = "belalkaram50@gmail.com";
var SUPER_ADMIN_PASSWORD = "12345678@Kag";
var SUPER_ADMIN_TOKEN = "super_secret_token_12345678_kag";
async function superAdminRoutes(fastify2) {
  fastify2.post("/login", async (request, reply) => {
    const schema = import_zod17.z.object({ email: import_zod17.z.string(), password: import_zod17.z.string() });
    const parsed2 = schema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.code(400).send({ success: false, error: "Invalid input" });
    }
    const inputEmail = parsed2.data.email.trim().toLowerCase();
    const inputPassword = parsed2.data.password.trim();
    if (inputEmail === SUPER_ADMIN_EMAIL.toLowerCase() && inputPassword === SUPER_ADMIN_PASSWORD) {
      return reply.send({ success: true, token: SUPER_ADMIN_TOKEN });
    }
    return reply.code(401).send({ success: false, error: "Invalid credentials" });
  });
  fastify2.addHook("preHandler", async (request, reply) => {
    if (request.url.includes("/login"))
      return;
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${SUPER_ADMIN_TOKEN}`) {
      return reply.code(401).send({ success: false, error: "Unauthorized Super Admin" });
    }
  });
  fastify2.get("/users", async (request, reply) => {
    const admins = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      trialEndsAt: users.trialEndsAt,
      createdAt: users.createdAt
    }).from(users).innerJoin(roles, (0, import_drizzle_orm24.eq)(users.roleId, roles.id)).where((0, import_drizzle_orm24.eq)(roles.name, "adminstrator")).orderBy((0, import_drizzle_orm24.desc)(users.createdAt));
    return reply.send({ success: true, data: admins });
  });
  fastify2.post("/users", async (request, reply) => {
    const schema = import_zod17.z.object({
      name: import_zod17.z.string().min(2),
      email: import_zod17.z.string().email(),
      password: import_zod17.z.string().min(6),
      trialDays: import_zod17.z.number().nullable().optional()
    });
    const parsed2 = schema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.code(400).send({ success: false, error: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
    }
    const [existing] = await db.select().from(users).where((0, import_drizzle_orm24.eq)(users.email, parsed2.data.email));
    if (existing) {
      return reply.code(400).send({ success: false, error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
    }
    const [adminRole] = await db.select().from(roles).where((0, import_drizzle_orm24.eq)(roles.name, "adminstrator"));
    if (!adminRole) {
      return reply.code(500).send({ success: false, error: "\u062F\u0648\u0631 \u0627\u0644\u0645\u0634\u0631\u0641 (adminstrator) \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645" });
    }
    const passwordHash = await PasswordService.hash(parsed2.data.password);
    let trialEndsAt = null;
    if (parsed2.data.trialDays !== void 0 && parsed2.data.trialDays !== null) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + parsed2.data.trialDays);
      trialEndsAt = d;
    }
    const [newUser] = await db.insert(users).values({
      email: parsed2.data.email,
      name: parsed2.data.name,
      passwordHash,
      roleId: adminRole.id,
      status: "active",
      trialEndsAt
    }).returning();
    return reply.send({ success: true, data: newUser });
  });
  fastify2.patch("/users/:id", async (request, reply) => {
    const schema = import_zod17.z.object({
      name: import_zod17.z.string().optional(),
      status: import_zod17.z.enum(["active", "inactive", "suspended"]).optional(),
      trialDays: import_zod17.z.number().nullable().optional()
    });
    const parsed2 = schema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.code(400).send({ success: false, error: "Invalid data" });
    }
    const updateData = {};
    if (parsed2.data.name)
      updateData.name = parsed2.data.name;
    if (parsed2.data.status)
      updateData.status = parsed2.data.status;
    if (parsed2.data.trialDays !== void 0) {
      if (parsed2.data.trialDays === null) {
        updateData.trialEndsAt = null;
      } else {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() + parsed2.data.trialDays);
        updateData.trialEndsAt = d;
      }
    }
    const [updated] = await db.update(users).set(updateData).where((0, import_drizzle_orm24.eq)(users.id, request.params.id)).returning();
    if (!updated) {
      return reply.code(404).send({ success: false, error: "User not found" });
    }
    return reply.send({ success: true, data: updated });
  });
  fastify2.delete("/users/:id", async (request, reply) => {
    const [deleted] = await db.delete(users).where((0, import_drizzle_orm24.eq)(users.id, request.params.id)).returning();
    if (!deleted) {
      return reply.code(404).send({ success: false, error: "User not found" });
    }
    return reply.send({ success: true, data: deleted });
  });
  fastify2.post("/clear-inbox", async (request, reply) => {
    const schemaObj = import_zod17.z.object({
      confirmText: import_zod17.z.string()
    });
    const parsed2 = schemaObj.safeParse(request.body);
    if (!parsed2.success || parsed2.data.confirmText !== "CLEAR_INBOX") {
      return reply.code(400).send({ success: false, error: "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" });
    }
    try {
      await db.delete(auditLogs);
      await db.delete(notifications);
      await db.delete(reminders);
      await db.delete(messages);
      await db.delete(conversations);
      await db.delete(leads);
      await db.delete(crmConnections);
      await db.delete(contacts);
      await db.delete(employees);
      await db.delete(stations);
      await db.delete(departments);
      return reply.send({ success: true, message: "\u062A\u0645 \u062A\u0641\u0631\u064A\u063A \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0628\u0646\u062C\u0627\u062D" });
    } catch (err) {
      request.log.error({ err }, "Clear inbox failed");
      return reply.code(500).send({ success: false, error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0641\u0631\u064A\u063A. \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062E\u0627\u062F\u0645." });
    }
  });
  fastify2.post("/factory-reset", async (request, reply) => {
    const schemaObj = import_zod17.z.object({
      confirmText: import_zod17.z.string()
    });
    const parsed2 = schemaObj.safeParse(request.body);
    if (!parsed2.success || parsed2.data.confirmText !== "RESET_ALL_DATA") {
      return reply.code(400).send({ success: false, error: "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" });
    }
    try {
      await db.delete(auditLogs);
      await db.delete(notifications);
      await db.delete(reminders);
      await db.delete(messages);
      await db.delete(conversations);
      await db.delete(leads);
      await db.delete(crmConnections);
      await db.delete(contacts);
      await db.delete(tags);
      await db.delete(quickReplies);
      await db.delete(automationRules);
      await db.delete(whatsappSessions);
      await db.delete(whatsappAuthKeys);
      await db.delete(whatsappAccounts);
      await db.delete(employees);
      await db.delete(stations);
      await db.delete(departments);
      const [adminRole] = await db.select().from(roles).where((0, import_drizzle_orm24.eq)(roles.name, "adminstrator"));
      if (adminRole) {
        await db.delete(users).where((0, import_drizzle_orm24.not)((0, import_drizzle_orm24.eq)(users.roleId, adminRole.id)));
      }
      const uploadsPath = import_path3.default.resolve(process.cwd(), "storage", "uploads");
      if (import_fs2.default.existsSync(uploadsPath)) {
        const files = import_fs2.default.readdirSync(uploadsPath);
        for (const file of files) {
          if (file !== ".gitkeep") {
            import_fs2.default.unlinkSync(import_path3.default.join(uploadsPath, file));
          }
        }
      }
      return reply.send({ success: true, message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0627\u0644\u0645\u0635\u0646\u0639 \u0628\u0646\u062C\u0627\u062D" });
    } catch (err) {
      request.log.error({ err }, "Factory reset failed");
      return reply.code(500).send({ success: false, error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0636\u0628\u0637 \u0627\u0644\u0645\u0635\u0646\u0639. \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062E\u0627\u062F\u0645." });
    }
  });
}

// src/modules/bridge/bridge.routes.ts
var import_drizzle_orm25 = require("drizzle-orm");
var import_zod18 = require("zod");
init_client();
init_schema();
init_logger();
async function bridgeRoutes(app) {
  app.get("/status", async (request, reply) => {
    try {
      const [heartbeat] = await db.select().from(bridgeHeartbeats).orderBy((0, import_drizzle_orm25.desc)(bridgeHeartbeats.lastSeenAt)).limit(1);
      if (!heartbeat) {
        return reply.send({
          success: true,
          data: {
            isOnline: false,
            bridgeId: null,
            lastSeenAt: null,
            uptimeSeconds: 0,
            version: "1.0.0",
            message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0623\u064A \u0627\u062A\u0635\u0627\u0644 \u0645\u0646 \u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A \u0628\u0639\u062F."
          }
        });
      }
      const diffMs = Date.now() - new Date(heartbeat.lastSeenAt).getTime();
      const isOnline = diffMs < 35e3;
      return reply.send({
        success: true,
        data: {
          isOnline,
          bridgeId: heartbeat.bridgeId,
          lastSeenAt: heartbeat.lastSeenAt,
          uptimeSeconds: heartbeat.uptimeSeconds,
          version: heartbeat.version,
          accountsSummary: heartbeat.accountsSummary,
          diffSeconds: Math.round(diffMs / 1e3),
          message: isOnline ? "\u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A \u0645\u062A\u0635\u0644 \u0648\u062C\u0627\u0647\u0632." : "\u0633\u064A\u0631\u0641\u0631 WhatsApp \u0627\u0644\u0645\u062D\u0644\u064A \u063A\u064A\u0631 \u0645\u062A\u0635\u0644 \u062D\u0627\u0644\u064A\u0627\u064B."
        }
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch bridge status");
      return reply.status(500).send({ success: false, error: "Failed to check bridge status" });
    }
  });
  app.get("/accounts", async (request, reply) => {
    try {
      const accounts = await db.select({
        id: whatsappAccounts.id,
        displayName: whatsappAccounts.displayName,
        phoneNumber: whatsappAccounts.phoneNumber,
        status: whatsappAccounts.status,
        bridgeStatus: whatsappAccounts.bridgeStatus,
        bridgeLastSeen: whatsappAccounts.bridgeLastSeen,
        hasQrCode: whatsappAccounts.bridgeQrCode
      }).from(whatsappAccounts);
      return reply.send({
        success: true,
        data: accounts.map((acc) => ({
          ...acc,
          hasQrCode: Boolean(acc.hasQrCode)
        }))
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch bridge accounts");
      return reply.status(500).send({ success: false, error: "Failed to fetch bridge accounts" });
    }
  });
  app.post("/command-result", async (request, reply) => {
    const schema = import_zod18.z.object({
      commandId: import_zod18.z.string().uuid(),
      status: import_zod18.z.enum(["completed", "failed"]),
      result: import_zod18.z.record(import_zod18.z.any()).optional(),
      error: import_zod18.z.string().optional()
    });
    const parsed2 = schema.safeParse(request.body);
    if (!parsed2.success) {
      return reply.status(400).send({ success: false, error: "Invalid payload" });
    }
    const { commandId, status, result, error } = parsed2.data;
    await db.update(bridgeCommands).set({
      status,
      result: result || null,
      error: error || null,
      completedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm25.eq)(bridgeCommands.id, commandId));
    return reply.send({ success: true, message: "Command result updated" });
  });
}

// src/app.ts
init_ws_hub();
async function buildApp() {
  const app = (0, import_fastify.default)({
    logger: false,
    // Using our custom Pino logger
    trustProxy: true
  });
  app.addHook("onRequest", requestIdMiddleware);
  await app.register(import_cookie.default, {
    secret: config.COOKIE_SECRET
  });
  await app.register(import_cors.default, {
    origin: true,
    credentials: true
  });
  await app.register(import_formbody.default);
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    if (!body || body.trim() === "") {
      if (req.raw?.body && typeof req.raw.body === "object") {
        done(null, req.raw.body);
        return;
      }
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body));
    } catch (err) {
      if (req.raw?.body && typeof req.raw.body === "object") {
        done(null, req.raw.body);
        return;
      }
      err.statusCode = 400;
      done(err, void 0);
    }
  });
  if (!process.env.VERCEL) {
    await app.register(import_rate_limit.default, {
      max: 100,
      timeWindow: "1 minute",
      keyGenerator: (req) => {
        const xff = req.headers["x-forwarded-for"];
        if (typeof xff === "string")
          return xff.split(",")[0].trim();
        return req.raw?.socket?.remoteAddress || req.ip || "127.0.0.1";
      }
    });
  }
  if (!process.env.VERCEL) {
    await app.register(import_websocket.default);
  }
  const clientDistDir = import_path4.default.resolve(process.cwd(), "dist/client");
  if (!process.env.VERCEL) {
    const publicDir = import_path4.default.resolve(process.cwd(), "public");
    try {
      if (import_fs3.default.existsSync(publicDir)) {
        await app.register(import_static.default, {
          root: publicDir,
          prefix: "/public/",
          decorateReply: true
        });
      }
    } catch (_e) {
    }
    if (import_fs3.default.existsSync(clientDistDir)) {
      await app.register(import_static.default, {
        root: clientDistDir,
        prefix: "/",
        decorateReply: false
      });
    }
  }
  app.setErrorHandler(errorHandler);
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes, { prefix: "/health" });
      await v1.register(authRoutes, { prefix: "/auth" });
      await v1.register(rolesRoutes, { prefix: "/roles" });
      await v1.register(departmentsRoutes, { prefix: "/departments" });
      await v1.register(stationsRoutes, { prefix: "/stations" });
      await v1.register(employeesRoutes, { prefix: "/employees" });
      await v1.register(auditRoutes, { prefix: "/audit" });
      await v1.register(settingsRoutes, { prefix: "/settings" });
      await v1.register(whatsappRoutes, { prefix: "/whatsapp" });
      await v1.register(conversationsRoutes, { prefix: "/conversations" });
      await v1.register(messagesRoutes, { prefix: "/conversations" });
      await v1.register(contactsRoutes, { prefix: "/contacts" });
      await v1.register(leadsRoutes, { prefix: "/leads" });
      await v1.register(quickRepliesRoutes, { prefix: "/quick-replies" });
      await v1.register(mediaRoutes, { prefix: "/media" });
      await v1.register(automationsRoutes, { prefix: "/automations" });
      await v1.register(reportsRoutes, { prefix: "/reports" });
      await v1.register(superAdminRoutes, { prefix: "/superadmin" });
      await v1.register(bridgeRoutes, { prefix: "/bridge" });
    },
    { prefix: "/api/v1" }
  );
  if (!process.env.VERCEL) {
    wsHub.registerRoutes(app);
  }
  const viewsDir = import_path4.default.resolve(process.cwd(), "views");
  const spaIndexHtml = import_path4.default.join(clientDistDir, "index.html");
  const serveSpaOrHtml = (fallbackRelativePath) => {
    return async (request, reply) => {
      if (import_fs3.default.existsSync(spaIndexHtml)) {
        reply.type("text/html");
        return import_fs3.default.createReadStream(spaIndexHtml);
      }
      const legacyPath = import_path4.default.join(viewsDir, fallbackRelativePath);
      if (import_fs3.default.existsSync(legacyPath)) {
        reply.type("text/html");
        return import_fs3.default.createReadStream(legacyPath);
      }
      return reply.redirect("/login");
    };
  };
  app.get("/", serveSpaOrHtml("dashboard/index.html"));
  app.get("/login", serveSpaOrHtml("auth/login.html"));
  app.get("/employees", serveSpaOrHtml("employees/index.html"));
  app.get("/stations", serveSpaOrHtml("stations/index.html"));
  app.get("/departments", async (_req, reply) => reply.redirect("/"));
  app.get("/settings", serveSpaOrHtml("settings/index.html"));
  app.get("/audit", serveSpaOrHtml("audit/index.html"));
  app.get("/whatsapp", serveSpaOrHtml("whatsapp/index.html"));
  app.get("/inbox", serveSpaOrHtml("inbox/index.html"));
  app.get("/automations", serveSpaOrHtml("automations/index.html"));
  app.get("/reports", serveSpaOrHtml("reports/index.html"));
  app.get("/contacts", serveSpaOrHtml("contacts/index.html"));
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/") || request.url.startsWith("/ws")) {
      reply.code(404).send({ success: false, message: "API Route Not Found" });
      return;
    }
    if (import_fs3.default.existsSync(spaIndexHtml)) {
      reply.type("text/html");
      return import_fs3.default.createReadStream(spaIndexHtml);
    }
    reply.code(404).send("Page Not Found");
  });
  return app;
}

// api/index.ts
if (process.env.VERCEL) {
  process.env.DEPLOYMENT_MODE = "online";
  process.env.NODE_ENV = "production";
} else {
  process.env.DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || "online";
}
var appInstance = null;
async function getApp() {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }
  return appInstance;
}
async function handler(req, res) {
  try {
    if (!req.socket) {
      req.socket = { remoteAddress: "127.0.0.1" };
    } else if (!req.socket.remoteAddress) {
      req.socket.remoteAddress = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "127.0.0.1";
    }
    const urlParts = (req.url || "").split("?");
    const queryString = urlParts.length > 1 ? `?${urlParts.slice(1).join("?")}` : "";
    const xMatched = req.headers["x-matched-path"];
    const xRouteMatches = req.headers["x-now-route-matches"];
    if (typeof xMatched === "string" && xMatched.startsWith("/api/")) {
      req.url = xMatched + queryString;
    } else if ((req.url === "/api" || req.url?.startsWith("/api?") || req.url === "/api/") && typeof xRouteMatches === "string") {
      const match = xRouteMatches.match(/1=([^&]+)/);
      if (match && match[1]) {
        req.url = "/api/" + decodeURIComponent(match[1]) + queryString;
      }
    } else if (req.url && !req.url.startsWith("/api") && req.url.startsWith("/v1")) {
      req.url = "/api" + req.url;
    }
    const app = await getApp();
    return new Promise((resolve, reject) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      res.on("error", reject);
      app.server.emit("request", req, res);
    });
  } catch (err) {
    console.error("Serverless Handler Error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, message: "Internal Server Error", error: err?.message || String(err) }));
    }
  }
}
