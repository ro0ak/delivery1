import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type StaffRole =
  | "super_admin"
  | "branch_manager"
  | "branch_employee"
  | "driver"
  | "accountant"
  | "operations";

interface CreateStaffUserPayload {
  email?: unknown;
  temporaryPassword?: unknown;
  fullName?: unknown;
  phone?: unknown;
  role?: unknown;
  branch_id?: unknown;
  vehicle_number?: unknown;
  is_active?: unknown;
}

interface CallerProfile {
  id: string;
  role: StaffRole | null;
  branch_id: string | null;
  is_active: boolean | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const staffRoles: StaffRole[] = [
  "super_admin",
  "branch_manager",
  "branch_employee",
  "driver",
  "accountant",
  "operations",
];

const branchManagerCreatableRoles: StaffRole[] = [
  "branch_employee",
  "driver",
  "operations",
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s()-]{8,20}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
}

function validatePayload(payload: CreateStaffUserPayload) {
  const email = normalizeString(payload.email).toLowerCase();
  const temporaryPassword = normalizeString(payload.temporaryPassword);
  const fullName = normalizeString(payload.fullName);
  const phone = normalizeString(payload.phone);
  const role = normalizeString(payload.role) as StaffRole;
  const branchId = normalizeNullableString(payload.branch_id);
  const vehicleNumber = normalizeNullableString(payload.vehicle_number);
  const isActive = payload.is_active === undefined ? true : Boolean(payload.is_active);

  if (!emailPattern.test(email)) {
    return { error: "يرجى إدخال بريد إلكتروني صالح." };
  }

  if (
    temporaryPassword.length < 8 ||
    temporaryPassword.length > 72 ||
    !/[A-Za-z]/.test(temporaryPassword) ||
    !/[0-9]/.test(temporaryPassword) ||
    /\s/.test(temporaryPassword)
  ) {
    return {
      error:
        "كلمة المرور المؤقتة يجب أن تكون بين 8 و72 حرفًا وتحتوي على حروف وأرقام بدون مسافات.",
    };
  }

  if (fullName.length < 3 || fullName.length > 120) {
    return { error: "الاسم الكامل يجب أن يكون بين 3 و120 حرفًا." };
  }

  if (!phonePattern.test(phone)) {
    return { error: "يرجى إدخال رقم هاتف صالح." };
  }

  if (!staffRoles.includes(role)) {
    return { error: "الدور المحدد غير صالح." };
  }

  if (role === "super_admin") {
    if (branchId) {
      return { error: "حساب المشرف العام لا يجب ربطه بفرع." };
    }
  } else {
    if (!branchId || !uuidPattern.test(branchId)) {
      return { error: "يرجى اختيار فرع صالح لهذا الحساب." };
    }
  }

  if (role === "driver") {
    if (!vehicleNumber || vehicleNumber.length < 2 || vehicleNumber.length > 50) {
      return { error: "رقم المركبة مطلوب للسائق ويجب أن يكون صالحًا." };
    }
  }

  return {
    data: {
      email,
      temporaryPassword,
      fullName,
      phone,
      role,
      branchId,
      vehicleNumber: role === "driver" ? vehicleNumber : null,
      isActive,
    },
  };
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "الطريقة غير مدعومة." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase Edge Function secrets.");
    return jsonResponse(500, { error: "تعذر تنفيذ العملية حاليًا. حاول لاحقًا." });
  }

  const authHeader = request.headers.get("Authorization") || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!accessToken) {
    return jsonResponse(401, { error: "يجب تسجيل الدخول أولاً." });
  }

  let payload: CreateStaffUserPayload;

  try {
    payload = (await request.json()) as CreateStaffUserPayload;
  } catch {
    return jsonResponse(400, { error: "بيانات الطلب غير صالحة." });
  }

  const validation = validatePayload(payload);

  if ("error" in validation) {
    return jsonResponse(422, { error: validation.error });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);

  if (authError || !authData.user) {
    console.error("Failed to verify caller:", authError);
    return jsonResponse(401, { error: "تعذر التحقق من هوية المستخدم." });
  }

  const { data: callerProfileData, error: callerProfileError } = await admin
    .from("profiles")
    .select("id,role,branch_id,is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  const callerProfile = callerProfileData as CallerProfile | null;

  if (callerProfileError) {
    console.error("Failed to load caller profile:", callerProfileError);
    return jsonResponse(500, { error: "تعذر تنفيذ العملية حاليًا. حاول لاحقًا." });
  }

  if (!callerProfile?.is_active) {
    return jsonResponse(403, { error: "هذا الحساب غير مخول لتنفيذ العملية." });
  }

  const { data } = validation;

  if (!callerProfile.role || !["super_admin", "branch_manager"].includes(callerProfile.role)) {
    return jsonResponse(403, { error: "ليس لديك صلاحية لإنشاء حسابات الموظفين." });
  }

  if (callerProfile.role === "branch_manager") {
    if (!branchManagerCreatableRoles.includes(data.role)) {
      return jsonResponse(403, { error: "مدير الفرع يمكنه إنشاء موظف فرع أو سائق أو عمليات فقط." });
    }

    if (!callerProfile.branch_id || data.branchId !== callerProfile.branch_id) {
      return jsonResponse(403, { error: "يمكن لمدير الفرع إنشاء حسابات لفرعه فقط." });
    }
  }

  if (data.branchId) {
    const { data: branch, error: branchError } = await admin
      .from("branches")
      .select("id")
      .eq("id", data.branchId)
      .maybeSingle();

    if (branchError) {
      console.error("Failed to validate branch:", branchError);
      return jsonResponse(500, { error: "تعذر تنفيذ العملية حاليًا. حاول لاحقًا." });
    }

    if (!branch) {
      return jsonResponse(422, { error: "الفرع المحدد غير موجود." });
    }
  }

  const { data: existingProfiles, error: existingProfilesError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", data.email)
    .limit(1);

  if (existingProfilesError) {
    console.error("Failed to check duplicate emails:", existingProfilesError);
    return jsonResponse(500, { error: "تعذر تنفيذ العملية حاليًا. حاول لاحقًا." });
  }

  if ((existingProfiles || []).length > 0) {
    return jsonResponse(409, { error: "يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل." });
  }

  const { data: createdUserData, error: createUserError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName,
      phone: data.phone,
    },
    app_metadata: {
      role: data.role,
      branch_id: data.branchId,
    },
  });

  if (createUserError || !createdUserData.user) {
    console.error("Failed to create auth user:", createUserError);

    const duplicateMessage = createUserError?.message?.toLowerCase() || "";

    if (duplicateMessage.includes("already") || duplicateMessage.includes("exists") || duplicateMessage.includes("duplicate")) {
      return jsonResponse(409, { error: "يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل." });
    }

    return jsonResponse(500, { error: "تعذر إنشاء حساب المستخدم حاليًا." });
  }

  const createdUserId = createdUserData.user.id;

  const { error: profileInsertError } = await admin.from("profiles").insert({
    id: createdUserId,
    email: data.email,
    full_name: data.fullName,
    phone: data.phone,
    role: data.role,
    branch_id: data.branchId,
    vehicle_number: data.vehicleNumber,
    is_active: data.isActive,
  });

  if (profileInsertError) {
    console.error("Failed to create profile row:", profileInsertError);

    const { error: cleanupError } = await admin.auth.admin.deleteUser(createdUserId);

    if (cleanupError) {
      console.error("Failed to clean up auth user after profile error:", cleanupError);
    }

    const duplicateMessage = profileInsertError.message?.toLowerCase() || "";

    if (duplicateMessage.includes("duplicate") || duplicateMessage.includes("unique")) {
      return jsonResponse(409, { error: "يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل." });
    }

    return jsonResponse(500, { error: "تعذر حفظ بيانات الموظف الجديدة." });
  }

  return jsonResponse(201, {
    message: "تم إنشاء حساب الموظف بنجاح.",
    userId: createdUserId,
  });
});
