/**
 * @file normalizers.ts
 * @version 2.0.0
 * @description Utilitários para normalização e validação de dados brasileiros.
 * Inclui funções para CPF, CNPJ, telefone, CEP e outras validações específicas.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa de normalizadores brasileiros
 * - Validação robusta de CPF e CNPJ
 * - Formatação de telefones e CEP
 * - Normalização de nomes e textos
 * - Utilitários para datas e valores monetários
 */

/**
 * Remove todos os caracteres não numéricos de uma string
 */
export const removeNonNumeric = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Remove acentos e caracteres especiais de uma string
 */
export const removeAccents = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '');
};

/**
 * Capitaliza a primeira letra de cada palavra
 */
export const capitalizeWords = (value: string): string => {
  return value
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Normaliza um nome próprio (remove acentos, capitaliza)
 */
export const normalizeName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  return capitalizeWords(
    name.trim()
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .replace(/[^\p{L}\s]/gu, '') // Remove caracteres que não são letras ou espaços
  );
};

/**
 * Normaliza um email (lowercase, trim)
 */
export const normalizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  return email.trim().toLowerCase();
};

// ==================== VALIDADORES BRASILEIROS ====================

/**
 * Valida um CPF
 */
export const isValidCPF = (cpf: string): boolean => {
  if (!cpf || typeof cpf !== 'string') return false;
  
  const cleanCPF = removeNonNumeric(cpf);
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se não são todos dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleanCPF.charAt(9)) !== firstDigit) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cleanCPF.charAt(10)) === secondDigit;
};

/**
 * Valida um CNPJ
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  if (!cnpj || typeof cnpj !== 'string') return false;
  
  const cleanCNPJ = removeNonNumeric(cnpj);
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se não são todos dígitos iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleanCNPJ.charAt(12)) !== firstDigit) return false;
  
  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cleanCNPJ.charAt(13)) === secondDigit;
};

/**
 * Valida um CEP
 */
export const isValidCEP = (cep: string): boolean => {
  if (!cep || typeof cep !== 'string') return false;
  
  const cleanCEP = removeNonNumeric(cep);
  return cleanCEP.length === 8 && /^\d{8}$/.test(cleanCEP);
};

/**
 * Valida um telefone brasileiro
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleanPhone = removeNonNumeric(phone);
  
  // Aceita formatos: 11999999999, 1199999999, 11999999999 (com ou sem 9)
  return /^(\d{2})9?\d{8}$/.test(cleanPhone) && cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

// ==================== FORMATADORES ====================

/**
 * Formata um CPF
 */
export const formatCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  const cleanCPF = removeNonNumeric(cpf);
  
  if (cleanCPF.length !== 11) return cpf;
  
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata um CNPJ
 */
export const formatCNPJ = (cnpj: string): string => {
  if (!cnpj) return '';
  
  const cleanCNPJ = removeNonNumeric(cnpj);
  
  if (cleanCNPJ.length !== 14) return cnpj;
  
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formata um CEP
 */
export const formatCEP = (cep: string): string => {
  if (!cep) return '';
  
  const cleanCEP = removeNonNumeric(cep);
  
  if (cleanCEP.length !== 8) return cep;
  
  return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Formata um telefone brasileiro
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  const cleanPhone = removeNonNumeric(phone);
  
  if (cleanPhone.length === 10) {
    // Formato: (11) 9999-9999
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    // Formato: (11) 99999-9999
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

/**
 * Formata um valor monetário em reais
 */
export const formatCurrency = (value: number | string, options?: {
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}): string => {
  const {
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {};
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return 'R$ 0,00';
  
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numValue);
  
  return formatted;
};

/**
 * Formata um número para formato brasileiro
 */
export const formatNumber = (value: number | string, decimals: number = 0): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
};

// ==================== NORMALIZADORES ====================

/**
 * Normaliza um CPF (remove formatação)
 */
export const normalizeCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  const cleanCPF = removeNonNumeric(cpf);
  return isValidCPF(cleanCPF) ? cleanCPF : '';
};

/**
 * Normaliza um CNPJ (remove formatação)
 */
export const normalizeCNPJ = (cnpj: string): string => {
  if (!cnpj) return '';
  
  const cleanCNPJ = removeNonNumeric(cnpj);
  return isValidCNPJ(cleanCNPJ) ? cleanCNPJ : '';
};

/**
 * Normaliza um telefone (remove formatação)
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  
  const cleanPhone = removeNonNumeric(phone);
  
  // Se tem 10 dígitos, adiciona o 9 para celular
  if (cleanPhone.length === 10 && ['8', '9'].includes(cleanPhone.charAt(2))) {
    return cleanPhone.slice(0, 2) + '9' + cleanPhone.slice(2);
  }
  
  return isValidPhone(cleanPhone) ? cleanPhone : '';
};

/**
 * Normaliza um CEP (remove formatação)
 */
export const normalizeCEP = (cep: string): string => {
  if (!cep) return '';
  
  const cleanCEP = removeNonNumeric(cep);
  return isValidCEP(cleanCEP) ? cleanCEP : '';
};

// ==================== UTILITÁRIOS DE DATA ====================

/**
 * Valida uma data no formato brasileiro (DD/MM/AAAA)
 */
export const isValidBrazilianDate = (date: string): boolean => {
  if (!date || typeof date !== 'string') return false;
  
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  const dateObj = new Date(year, month - 1, day);
  
  return dateObj.getDate() === day &&
         dateObj.getMonth() === month - 1 &&
         dateObj.getFullYear() === year;
};

/**
 * Converte data brasileira (DD/MM/AAAA) para ISO (AAAA-MM-DD)
 */
export const brazilianDateToISO = (date: string): string => {
  if (!isValidBrazilianDate(date)) return '';
  
  const [day, month, year] = date.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Converte data ISO (AAAA-MM-DD) para formato brasileiro (DD/MM/AAAA)
 */
export const isoDateToBrazilian = (date: string): string => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
};

/**
 * Formata uma data para exibição em português
 */
export const formatBrazilianDate = (date: string | Date, options?: {
  includeTime?: boolean;
  timeOnly?: boolean;
}): string => {
  const { includeTime = false, timeOnly = false } = options || {};
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '';
    
    if (timeOnly) {
      return dateObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    const dateString = dateObj.toLocaleDateString('pt-BR');
    
    if (includeTime) {
      const timeString = dateObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateString} às ${timeString}`;
    }
    
    return dateString;
  } catch {
    return '';
  }
};

// ==================== UTILITÁRIOS DE URL E SLUG ====================

/**
 * Converte texto para slug (URL-friendly)
 */
export const textToSlug = (text: string): string => {
  if (!text) return '';
  
  return removeAccents(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens múltiplos
    .replace(/^-|-$/g, ''); // Remove hífens do início e fim
};

/**
 * Converte slug para texto legível
 */
export const slugToText = (slug: string): string => {
  if (!slug) return '';
  
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

// ==================== UTILITÁRIOS DE ARQUIVO ====================

/**
 * Gera nome de arquivo único
 */
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const cleanName = textToSlug(nameWithoutExt);
  
  return `${cleanName}-${timestamp}-${random}.${extension}`;
};

/**
 * Valida extensão de arquivo
 */
export const isValidFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  if (!filename || !allowedExtensions.length) return false;
  
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
};

// ==================== EXPORTAÇÃO DE UTILITÁRIOS ====================

/**
 * Conjunto de utilitários para validação
 */
export const validators = {
  cpf: isValidCPF,
  cnpj: isValidCNPJ,
  cep: isValidCEP,
  phone: isValidPhone,
  email: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  brazilianDate: isValidBrazilianDate,
  fileExtension: isValidFileExtension,
};

/**
 * Conjunto de utilitários para formatação
 */
export const formatters = {
  cpf: formatCPF,
  cnpj: formatCNPJ,
  cep: formatCEP,
  phone: formatPhone,
  currency: formatCurrency,
  number: formatNumber,
  brazilianDate: formatBrazilianDate,
};

/**
 * Conjunto de utilitários para normalização
 */
export const normalizers = {
  name: normalizeName,
  email: normalizeEmail,
  cpf: normalizeCPF,
  cnpj: normalizeCNPJ,
  phone: normalizePhone,
  cep: normalizeCEP,
  slug: textToSlug,
  removeAccents,
  removeNonNumeric,
  capitalizeWords,
};

/**
 * Conjunto de utilitários para datas
 */
export const dateUtils = {
  brazilianToISO: brazilianDateToISO,
  isoToBrazilian: isoDateToBrazilian,
  format: formatBrazilianDate,
  isValid: isValidBrazilianDate,
};

/**
 * Conjunto de utilitários para arquivos
 */
export const fileUtils = {
  generateUniqueName: generateUniqueFileName,
  isValidExtension: isValidFileExtension,
  slugify: textToSlug,
};
