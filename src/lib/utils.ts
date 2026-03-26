import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gera um slug URL-friendly a partir de um nome
 * Remove acentos, converte para minúsculas, substitui espaços por hífens
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, '');        // Remove hífens do início e fim
}

/**
 * Sanitiza o nome de um ficheiro para uso seguro em paths de storage.
 * Remove acentos e substitui caracteres não alfanuméricos (excepto ponto, hífen, underscore) por underscore.
 */
export function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
