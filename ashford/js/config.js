// ═══════════════════════════════════════════════════════════════
//  config.js — Character definitions and constants
// ═══════════════════════════════════════════════════════════════

const CHAR_IDS = ['victor', 'eleanor', 'meera', 'marcus'];

const CHARS = {
  victor: {
    id: 'victor',
    name: 'Vikram Rao',
    role: 'The Butler',
    bg: ['#1a140c', '#2c2218'],
    skin: '#d2a37c',
    hair: '#1c1c1c',
    outfit: '#2c2a35',
    accent: '#e8d9c0',
    eyeColor: '#2c2a1f',
    hasGlasses: true,
    hasMustache: true,
    mustacheStyle: 'thin'
  },
  eleanor: {
    id: 'eleanor',
    name: 'Lakshmi Bai',
    role: 'The Widow',
    bg: ['#1f0f0f', '#2f1a1a'],
    skin: '#e0b38a',
    hair: '#2c1a12',
    outfit: '#3a1f2a',
    accent: '#f0e0d0',
    eyeColor: '#2c1f18',
    hasGlasses: false,
    hasMustache: false
  },
  meera: {
    id: 'meera',
    name: 'Meera Sharma',
    role: 'The Niece',
    bg: ['#1f1810', '#2f2418'],
    skin: '#d9a87f',
    hair: '#2c1f14',
    outfit: '#4a2a35',
    accent: '#d8c8b0',
    eyeColor: '#2c2218',
    hasGlasses: false,
    hasMustache: false
  },
  marcus: {
    id: 'marcus',
    name: 'Dr. Arjun Malhotra',
    role: 'The Doctor',
    bg: ['#0f1a12', '#1f2a22'],
    skin: '#cfa77a',
    hair: '#1f1f1f',
    outfit: '#2a3a32',
    accent: '#a09078',
    eyeColor: '#2c241c',
    hasGlasses: true,
    hasMustache: true,
    mustacheStyle: 'full'
  }
};

const TIME_LABELS = ['Morning', 'Afternoon', 'Evening', 'Late Night'];

// Featherless / Anthropic model selector — swap as needed
const API_CONFIG = {
  endpoint: 'https://api.featherless.ai/v1/chat/completions',
  model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
  authHeader: 'Bearer'   // Featherless uses Bearer; Anthropic uses x-api-key
};
