export const FRANCHISE_COOKIE = "fm-franchise";

export interface ActionState {
  status: "idle" | "ok" | "error";
  message?: string;
}

export const IDLE: ActionState = { status: "idle" };
