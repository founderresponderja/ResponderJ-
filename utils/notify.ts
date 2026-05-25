import { toast } from "sonner";

/**
 * Thin wrappers around sonner. Centralises styling and lets us
 * swap libraries with a single-file change. Strings should come
 * from translations.ts at callsites; this module is i18n-agnostic.
 */

export const notifySuccess = (message: string) => toast.success(message);

export const notifyError = (message: string) => toast.error(message);

export const notifyInfo = (message: string) => toast(message);

export const notifyLoading = (message: string) => toast.loading(message);

export const dismissNotify = (id?: string | number) => {
  if (id !== undefined) toast.dismiss(id);
  else toast.dismiss();
};

export { toast };
