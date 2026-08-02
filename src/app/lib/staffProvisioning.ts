import { supabase } from "../../utils/supabase";
import type { UserRole } from "../contexts/AuthContext";

export interface CreateStaffUserInput {
  email: string;
  temporaryPassword: string;
  fullName: string;
  phone: string;
  role: UserRole;
  branchId: string | null;
  vehicleNumber?: string | null;
  isActive: boolean;
}

interface CreateStaffUserResponse {
  message?: string;
  error?: string;
  userId?: string;
}

const fallbackError = "تعذر إنشاء الحساب حالياً. حاول مرة أخرى.";

async function extractFunctionError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "context" in error &&
    error.context instanceof Response
  ) {
    const payload = (await error.context.json().catch(() => null)) as CreateStaffUserResponse | null;

    if (payload?.error) {
      return payload.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackError;
}

export async function createStaffUser(input: CreateStaffUserInput) {
  const payload = {
    email: input.email,
    temporaryPassword: input.temporaryPassword,
    fullName: input.fullName,
    phone: input.phone,
    role: input.role,
    branch_id: input.branchId,
    vehicle_number: input.vehicleNumber ?? null,
    is_active: input.isActive,
  };

  const { data, error } = await supabase.functions.invoke<CreateStaffUserResponse>(
    "create-staff-user",
    { body: payload },
  );

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  if (!data?.userId) {
    throw new Error(data?.error || fallbackError);
  }

  return data;
}
