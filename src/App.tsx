/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, RefreshCw, Check, Shield, ShieldCheck, ShieldAlert, Lock, Info, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

type Mode = 'password' | 'token' | 'guid';

type ModeMetadata = {
  title: string;
  description: string;
};

const MODE_ROUTE: Record<Mode, string> = {
  password: '/pass',
  token: '/token',
  guid: '/guid',
};

const MODE_METADATA: Record<Mode, ModeMetadata> = {
  password: {
    title: 'DVF Pass',
    description: 'Genereer sterke wachtwoorden lokaal in je browser met Web Crypto API.',
  },
  token: {
    title: 'DVF Token',
    description: 'Genereer OpenSSL-achtige 256-bit tokens lokaal in je browser.',
  },
  guid: {
    title: 'DVF Guid',
    description: 'Genereer GUID\'s als unieke identifier (niet bedoeld als security-token).',
  },
};

function setMetaTagByName(name: string, content: string): void {
  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setMetaTagByProperty(property: string, content: string): void {
  let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function getModeFromPath(pathname: string): Mode {
  if (pathname === '/token') return 'token';
  if (pathname === '/guid') return 'guid';
  return 'password';
}

function getModeFromHostname(hostname: string): Mode | undefined {
  const subdomain = hostname.split('.')[0]?.toLowerCase();
  if (subdomain === 'token') return 'token';
  if (subdomain === 'guid') return 'guid';
  if (subdomain === 'pass') return 'password';
  return undefined;
}

function getModeFromLocation(pathname: string, hostname: string): Mode {
  return getModeFromHostname(hostname) ?? getModeFromPath(pathname);
}

// AFAS Brand Colors
const AFAS_BLUE = '#004b99';
const AFAS_LIGHT_BLUE = '#e6f0fa';
const AFAS_GRAY = '#f4f4f4';
const AFAS_TEXT = '#333333';
const AFAS_BORDER = '#dcdcdc';

export default function App() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'password';
    return getModeFromLocation(window.location.pathname, window.location.hostname);
  });
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(32);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [tokenUrlFriendly, setTokenUrlFriendly] = useState(true);
  const [guidUppercase, setGuidUppercase] = useState(false);
  const [guidWithoutHyphens, setGuidWithoutHyphens] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSecret = useCallback(() => {
    if (mode === 'password') {
      let charset = '';
      if (includeUppercase) charset += UPPERCASE;
      if (includeLowercase) charset += LOWERCASE;
      if (includeNumbers) charset += NUMBERS;
      if (includeSymbols) charset += SYMBOLS;

      if (charset === '') {
        setPassword('');
        return;
      }

      let generatedPassword = '';
      const array = new Uint32Array(length);
      window.crypto.getRandomValues(array);

      for (let i = 0; i < length; i++) {
        generatedPassword += charset[array[i] % charset.length];
      }

      setPassword(generatedPassword);
    } else if (mode === 'token') {
      // Token mode: 32 bytes (256 bits)
      const bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);
      
      // Convert to Base64
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      let base64 = window.btoa(binary);

      if (tokenUrlFriendly) {
        base64 = base64
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      }
      
      setPassword(base64);
    } else {
      let guidValue: string = window.crypto.randomUUID();

      if (guidWithoutHyphens) {
        guidValue = guidValue.replace(/-/g, '');
      }
      if (guidUppercase) {
        guidValue = guidValue.toUpperCase();
      }

      setPassword(guidValue);
    }
    setCopied(false);
  }, [mode, length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, tokenUrlFriendly, guidUppercase, guidWithoutHyphens]);

  useEffect(() => {
    generateSecret();
  }, [generateSecret]);

  useEffect(() => {
    const metadata = MODE_METADATA[mode];
    const currentUrl = `${window.location.origin}${window.location.pathname}`;

    document.title = metadata.title;

    setMetaTagByName('description', metadata.description);
    setMetaTagByName('twitter:card', 'summary');
    setMetaTagByName('twitter:title', metadata.title);
    setMetaTagByName('twitter:description', metadata.description);
    setMetaTagByName('twitter:image', `${window.location.origin}/favicon.ico`);

    setMetaTagByProperty('og:type', 'website');
    setMetaTagByProperty('og:title', metadata.title);
    setMetaTagByProperty('og:description', metadata.description);
    setMetaTagByProperty('og:url', currentUrl);
    setMetaTagByProperty('og:image', `${window.location.origin}/favicon.ico`);
  }, [mode]);

  useEffect(() => {
    const handlePopState = () => {
      setMode(getModeFromLocation(window.location.pathname, window.location.hostname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigateToMode = (nextMode: Mode) => {
    setMode(nextMode);

    const targetPath = MODE_ROUTE[nextMode];
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const getStrength = () => {
    if (mode === 'token') return { 
      label: 'Extreem Sterk', 
      color: 'text-indigo-600', 
      icon: ShieldCheck, 
      bg: 'bg-indigo-50',
      description: 'Dit is een cryptografisch sterke 256-bit token.'
    };

    if (mode === 'guid') return {
      label: 'Unieke Identifier',
      color: 'text-amber-600',
      icon: Info,
      bg: 'bg-amber-50',
      description: 'GUID\'s zijn niet bedoeld voor wachtwoorden of andere security-doeleinden.'
    };
    
    if (length < 12) return { 
      label: 'Zwak', 
      color: 'text-red-600', 
      icon: ShieldAlert, 
      bg: 'bg-red-50',
      description: 'Dit wachtwoord is te kort en niet veilig genoeg.'
    };
    if (length < 16) return { 
      label: 'Gemiddeld', 
      color: 'text-amber-600', 
      icon: Shield, 
      bg: 'bg-amber-50',
      description: 'Dit wachtwoord is redelijk, maar kan sterker.'
    };
    return { 
      label: 'Sterk', 
      color: 'text-emerald-600', 
      icon: ShieldCheck, 
      bg: 'bg-emerald-50',
      description: 'Dit wachtwoord voldoet aan de veiligheidsnormen.'
    };
  };

  const strength = getStrength();

  return (
    <div 
      className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4 font-sans text-[#333]"
      style={{ 
        backgroundImage: 'url(/images/patroon.png)',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center'
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[480px] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.15)] border border-[#dcdcdc] rounded-lg overflow-hidden relative z-10"
      >
        {/* AFAS Style Header */}
        <div className="bg-white p-8 border-b border-[#eee]">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#004b99] rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Lock className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[#004b99] tracking-tight mb-1">
              {mode === 'password' ? 'Wachtwoord Generator' : mode === 'token' ? 'Token Generator' : 'GUID Generator'}
            </h1>
            <p className="text-sm text-[#666]">
              {mode === 'guid'
                ? 'Maak een unieke identifier voor herkenning en koppelingen.'
                : `Beveilig uw account met een sterke ${mode === 'password' ? 'code' : 'token'}`}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-[#eee]">
          <button 
            onClick={() => navigateToMode('password')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'password' ? 'text-[#004b99] border-b-2 border-[#004b99]' : 'text-[#999] hover:text-[#666]'}`}
          >
            Wachtwoord
          </button>
          <button 
            onClick={() => navigateToMode('token')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'token' ? 'text-[#004b99] border-b-2 border-[#004b99]' : 'text-[#999] hover:text-[#666]'}`}
          >
            OpenSSL Token
          </button>
          <button 
            onClick={() => navigateToMode('guid')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'guid' ? 'text-[#004b99] border-b-2 border-[#004b99]' : 'text-[#999] hover:text-[#666]'}`}
          >
            GUID
          </button>
        </div>

        {/* Password Display Section */}
        <div className="p-8 space-y-6 md:min-h-[430px]">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#666] uppercase tracking-wider">
              Uw nieuwe {mode === 'password' ? 'wachtwoord' : mode === 'token' ? 'token' : 'guid'}
            </label>
            <div className="relative">
              <div className="w-full bg-[#f9f9f9] border border-[#dcdcdc] rounded p-4 pr-20 break-all min-h-[80px] flex items-center justify-center text-center transition-all focus-within:border-[#004b99] focus-within:ring-1 focus-within:ring-[#004b99]">
                <span className="text-lg font-mono text-[#333] font-medium selection:bg-[#004b99] selection:text-white leading-relaxed">
                  {password || 'Selecteer minimaal één optie'}
                </span>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button
                  onClick={generateSecret}
                  className="p-2 text-[#999] hover:text-[#004b99] transition-colors rounded hover:bg-[#f0f0f0]"
                  title="Nieuwe genereren"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={copyToClipboard}
                  className={`p-2 transition-colors rounded hover:bg-[#f0f0f0] ${copied ? 'text-emerald-600' : 'text-[#999] hover:text-[#004b99]'}`}
                  title="Kopiëren"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <AnimatePresence>
              {copied && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-emerald-600 font-bold text-right pr-2"
                >
                  Gekopieerd naar klembord!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Strength Indicator */}
          <div className={`flex items-center gap-3 p-3 rounded border ${strength.bg} border-current/10 transition-colors duration-300`}>
            <strength.icon className={`w-5 h-5 ${strength.color} transition-colors duration-300`} />
            <div className="flex-1">
              <div className={`text-sm font-bold ${strength.color} transition-colors duration-300`}>{strength.label}</div>
              <div className="text-[11px] text-[#666]">{strength.description}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {mode === 'password' ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-[#333]">Lengte</label>
                    <span className="text-lg font-bold text-[#004b99]">{length} tekens</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={length}
                    onChange={(e) => setLength(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#eee] rounded-lg appearance-none cursor-pointer accent-[#004b99]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Checkbox 
                    label="Hoofdletters (A-Z)" 
                    checked={includeUppercase} 
                    onChange={() => setIncludeUppercase(!includeUppercase)} 
                  />
                  <Checkbox 
                    label="Kleine letters (a-z)" 
                    checked={includeLowercase} 
                    onChange={() => setIncludeLowercase(!includeLowercase)} 
                  />
                  <Checkbox 
                    label="Cijfers (0-9)" 
                    checked={includeNumbers} 
                    onChange={() => setIncludeNumbers(!includeNumbers)} 
                  />
                  <Checkbox 
                    label="Symbolen (!@#$)" 
                    checked={includeSymbols} 
                    onChange={() => setIncludeSymbols(!includeSymbols)} 
                  />
                </div>
              </>
            ) : mode === 'token' ? (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 rounded border border-[#eee]">
                  <p className="text-xs text-[#666] leading-relaxed mb-4">
                    Genereert een cryptografisch veilige 32-byte (256-bit) token, vergelijkbaar met <code className="bg-zinc-200 px-1 rounded">openssl rand -base64 32</code>.
                  </p>
                  <Checkbox 
                    label="URL Friendly (Base64URL)" 
                    checked={tokenUrlFriendly} 
                    onChange={() => setTokenUrlFriendly(!tokenUrlFriendly)} 
                  />
                  <p className="text-[10px] text-[#999] mt-2 ml-8">
                    {tokenUrlFriendly 
                      ? "Vervangt '+' door '-', '/' door '_' en verwijdert '=' padding." 
                      : "Standaard Base64 codering inclusief '+', '/' en '='."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded border border-amber-200">
                  <p className="text-xs text-amber-800 leading-relaxed mb-4">
                    GUID&apos;s zijn bedoeld als unieke identifier en niet als wachtwoord of security-token.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <Checkbox 
                      label="To Upper" 
                      checked={guidUppercase} 
                      onChange={() => setGuidUppercase(!guidUppercase)} 
                    />
                    <Checkbox 
                      label="Zonder hyphens" 
                      checked={guidWithoutHyphens} 
                      onChange={() => setGuidWithoutHyphens(!guidWithoutHyphens)} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-[#f9f9f9] p-6 border-t border-[#eee] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#999] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#666] leading-relaxed flex-1">
            Deze {mode === 'password' ? 'code' : mode === 'token' ? 'token' : 'guid'} wordt lokaal op uw apparaat gegenereerd met de Web Crypto API. 
            Niets wordt verzonden naar de server.
          </p>
          <a
            href="https://github.com/derkveenhof/pass-and-opaque-token-generator"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open GitHub repository"
            className="text-[#999] hover:text-[#004b99] transition-colors self-center shrink-0"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-1">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${
          checked 
            ? 'bg-[#004b99] border-[#004b99]' 
            : 'bg-white border-[#dcdcdc] group-hover:border-[#999]'
        }`}>
          {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
        </div>
      </div>
      <span className={`text-sm font-medium transition-colors ${checked ? 'text-[#333]' : 'text-[#666]'}`}>
        {label}
      </span>
    </label>
  );
}
