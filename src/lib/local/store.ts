import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { UserRole } from "@/lib/types";

type DealerRow = Database["public"]["Tables"]["dealers"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

export type LocalUserRecord = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  must_change_password: boolean;
  roles: UserRole[];
  dealer_ids: string[];
  created_at: string;
};

type LocalSessionRecord = {
  token_hash: string;
  user_id: string;
  expires_at: string;
};

type LocalRateLimitRecord = {
  ip_hash: string;
  dealer_slug: string;
  created_at: string;
};

type LocalActivityRecord = {
  id: number;
  actor_user_id: string | null;
  dealer_id: string | null;
  application_id: string | null;
  offer_id: string | null;
  action: string;
  metadata: Json;
  created_at: string;
};

export type LocalData = {
  version: 1 | 2;
  users: LocalUserRecord[];
  sessions: LocalSessionRecord[];
  dealers: DealerRow[];
  applications: ApplicationRow[];
  offers: OfferRow[];
  activity_log: LocalActivityRecord[];
  form_rate_limits: LocalRateLimitRecord[];
};

const LOCAL_DATA_DIRECTORY = path.resolve(/* turbopackIgnore: true */
  process.env.OTOPASS_LOCAL_DATA_DIR?.trim() || path.join(process.cwd(), ".local-data")
);
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIRECTORY, "otopass.json");
const LOCAL_PHOTO_DIRECTORY = path.join(LOCAL_DATA_DIRECTORY, "photos");

let mutationQueue: Promise<void> = Promise.resolve();

function isoOffset(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function hashLocalPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyLocalPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashLocalSessionToken(token: string): string {
  return scryptSync(token, "otopass-local-session", 32).toString("hex");
}

function createSeedData(): LocalData {
  const dealerId = "10000000-0000-4000-8000-000000000001";
  const pendingApplicationId = "20000000-0000-4000-8000-000000000001";
  const offeredApplicationId = "20000000-0000-4000-8000-000000000002";
  const soldApplicationId = "20000000-0000-4000-8000-000000000003";

  return {
    version: 2,
    users: [],
    sessions: [],
    dealers: [
      {
        id: dealerId,
        name: "Test Galeri",
        slug: "test-galeri",
        contact_name: "Test Galeri Yetkilisi",
        contact_phone: "+905325554433",
        contact_email: "galeri@otokopru.local",
        social_links: [
          { platform: "instagram", url: "https://instagram.com/testgaleri" },
          { platform: "whatsapp", url: "https://wa.me/905325554433" },
        ],
        legal_name: "Test Galeri",
        privacy_contact_email: "galeri@otokopru.local",
        logo_url: null,
        brand_color: null,
        is_active: true,
        created_at: isoOffset(-15),
        updated_at: isoOffset(-15),
        deactivated_at: null,
      },
    ],
    applications: [
      {
        id: pendingApplicationId,
        dealer_id: dealerId,
        dealer_slug: "test-galeri",
        owner_name: "Deniz Yılmaz",
        owner_phone: "0555 111 22 33",
        owner_email: "deniz@example.com",
        brand: "Renault",
        model: "Clio",
        vehicle_package: "Icon",
        engine_info: "1.0 TCe",
        model_year: 2022,
        km: 46500,
        fuel_type: "Benzin",
        transmission: "Otomatik",
        tramer_info: "Tramer kaydı bulunmuyor.",
        damage_info: "Sağ arka çamurluk lokal boyalı.",
        body_condition: { right_rear_fender: "local_paint" },
        photo_paths: [],
        reference_code: "OTP-DEMO-0001",
        status: "pending",
        created_at: isoOffset(-2),
        submitted_at: isoOffset(-2),
        privacy_version: "2026-08-17",
        privacy_acknowledged_at: isoOffset(-2),
        updated_at: isoOffset(-2),
        archived_at: null,
        purged_at: null,
      },
      {
        id: offeredApplicationId,
        dealer_id: dealerId,
        dealer_slug: "test-galeri",
        owner_name: "Ece Kaya",
        owner_phone: "0555 222 33 44",
        owner_email: "ece@example.com",
        brand: "Toyota",
        model: "Corolla",
        vehicle_package: "Flame X-Pack",
        engine_info: "1.8 Hybrid",
        model_year: 2021,
        km: 68300,
        fuel_type: "Hibrit",
        transmission: "Otomatik",
        tramer_info: "8.500 TL kayıt.",
        damage_info: "Ön tampon boyalı.",
        body_condition: { front_bumper: "painted" },
        photo_paths: [],
        reference_code: "OTP-DEMO-0002",
        status: "offered",
        created_at: isoOffset(-4),
        submitted_at: isoOffset(-4),
        privacy_version: "2026-08-17",
        privacy_acknowledged_at: isoOffset(-4),
        updated_at: isoOffset(-3),
        archived_at: null,
        purged_at: null,
      },
      {
        id: soldApplicationId,
        dealer_id: dealerId,
        dealer_slug: "test-galeri",
        owner_name: "Mert Aydın",
        owner_phone: "0555 333 44 55",
        owner_email: "mert@example.com",
        brand: "Fiat",
        model: "Egea",
        vehicle_package: "Urban",
        engine_info: "1.3 Multijet",
        model_year: 2020,
        km: 91200,
        fuel_type: "Dizel",
        transmission: "Manuel",
        tramer_info: "12.300 TL kayıt.",
        damage_info: "Sol ön kapı değişen.",
        body_condition: { left_front_door: "replaced" },
        photo_paths: [],
        reference_code: "OTP-DEMO-0003",
        status: "sold",
        created_at: isoOffset(-7),
        submitted_at: isoOffset(-7),
        privacy_version: "2026-08-17",
        privacy_acknowledged_at: isoOffset(-7),
        updated_at: isoOffset(-6),
        archived_at: null,
        purged_at: null,
      },
    ],
    offers: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        application_id: offeredApplicationId,
        dealer_id: dealerId,
        amount: 1045000,
        currency: "TRY",
        notes: "Ekspertiz kontrolü sonrası netleştirilecektir.",
        status: "pending",
        created_at: isoOffset(-3),
        updated_at: isoOffset(-3),
        responded_at: null,
        responded_by: null,
      },
      {
        id: "30000000-0000-4000-8000-000000000002",
        application_id: soldApplicationId,
        dealer_id: dealerId,
        amount: 745000,
        currency: "TRY",
        notes: "Satın alma tamamlandı.",
        status: "accepted",
        created_at: isoOffset(-6),
        updated_at: isoOffset(-6),
        responded_at: isoOffset(-6),
        responded_by: null,
      },
    ],
    activity_log: [
      {
        id: 1,
        actor_user_id: null,
        dealer_id: dealerId,
        application_id: null,
        offer_id: null,
        action: "LOCAL_SEED_CREATED",
        metadata: { source: "automatic-local-bootstrap" },
        created_at: isoOffset(-15),
      },
    ],
    form_rate_limits: [],
  };
}

async function ensureLocalDataFile(): Promise<void> {
  await mkdir(LOCAL_DATA_DIRECTORY, { recursive: true });
  await mkdir(LOCAL_PHOTO_DIRECTORY, { recursive: true });

  try {
    await readFile(LOCAL_DATA_FILE, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
    await writeFile(LOCAL_DATA_FILE, JSON.stringify(createSeedData(), null, 2), "utf8");
  }
}

export async function readLocalData(): Promise<LocalData> {
  await ensureLocalDataFile();
  const raw = await readFile(LOCAL_DATA_FILE, "utf8");

  try {
    const data = JSON.parse(raw) as LocalData;
    for (const dealer of data.dealers) {
      dealer.contact_name ??= null;
      dealer.contact_phone ??= null;
      dealer.social_links ??= [];
    }
    for (const application of data.applications) {
      application.engine_info ??= null;
    }
    return data;
  } catch {
    throw new Error("Yerel veri dosyası okunamadı. .local-data/otopass.json geçerli JSON olmalıdır.");
  }
}

export async function mutateLocalData<T>(mutation: (data: LocalData) => T | Promise<T>): Promise<T> {
  let resolveResult: (value: T | PromiseLike<T>) => void;
  let rejectResult: (reason?: unknown) => void;

  const resultPromise = new Promise<T>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  mutationQueue = mutationQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        const data = await readLocalData();
        const result = await mutation(data);
        const temporaryFile = `${LOCAL_DATA_FILE}.${process.pid}.${randomUUID()}.tmp`;
        await writeFile(temporaryFile, JSON.stringify(data, null, 2), "utf8");
        await rename(temporaryFile, LOCAL_DATA_FILE);
        resolveResult(result);
      } catch (error) {
        rejectResult(error);
      }
    });

  return resultPromise;
}

function resolvePhotoPath(relativePath: string): string {
  const normalizedPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolutePath = path.resolve(LOCAL_PHOTO_DIRECTORY, normalizedPath);
  const allowedPrefix = `${LOCAL_PHOTO_DIRECTORY}${path.sep}`;

  if (!absolutePath.startsWith(allowedPrefix)) {
    throw new Error("Geçersiz yerel fotoğraf yolu.");
  }

  return absolutePath;
}

export async function saveLocalPhoto(relativePath: string, bytes: Uint8Array): Promise<void> {
  const absolutePath = resolvePhotoPath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

export async function readLocalPhoto(relativePath: string): Promise<Buffer> {
  return readFile(resolvePhotoPath(relativePath));
}

export async function removeLocalPhoto(relativePath: string): Promise<void> {
  try {
    await unlink(resolvePhotoPath(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
