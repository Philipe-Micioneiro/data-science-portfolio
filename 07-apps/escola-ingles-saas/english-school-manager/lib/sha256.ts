/**
 * Calcula o hash SHA-256 de um arquivo usando a Web Crypto API.
 * Sem dependências externas — funciona em browsers modernos e no Edge Runtime.
 *
 * Uso principal: detectar comprovantes duplicados antes do upload.
 * Ver SPEC/00 §0.7 — retorno de DUPLICATE_HASH nos Server Actions de upload.
 */
export async function calcSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
