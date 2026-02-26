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
 * Sanitiza o nome de um ficheiro para uso como chave de storage (Supabase Storage, S3, etc.).
 * Remove acentos, espaços, parênteses e outros caracteres especiais,
 * mantendo apenas letras, números, pontos, hífens e underscores.
 */
export function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w.\-]+/g, '_');      // Substitui caracteres especiais por underscore
}
