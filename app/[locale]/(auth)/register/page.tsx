'use client';

import { useState, useEffect } from 'react';
import { useRouter, Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { Logo } from '@/components/ui/logo';
import { useTranslations } from 'next-intl';

// Schema de validação
const registerSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  country: z.string().min(2, "Selecione um país válido"),
  postalCode: z.string().min(4, "Código postal inválido"),
  address: z.string().optional(), // New
  city: z.string().optional(),    // New
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "Telefone inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter um número")
    .regex(/[^A-Za-z0-9]/, "Deve conter um caractere especial"),
  mainCurrency: z.enum(['EUR', 'USD', 'BRL']),
  language: z.enum(['pt', 'en', 'es', 'de', 'fr']) // Novo campo de idioma
});

// Lista de países europeus prioritários
const EUROPEAN_COUNTRIES = [
  { code: 'LU', name: 'Luxemburgo (Luxembourg)' },
  { code: 'DE', name: 'Alemanha (Germany)' },
  { code: 'FR', name: 'França (France)' },
  { code: 'ES', name: 'Espanha (Spain)' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IT', name: 'Itália (Italy)' },
  { code: 'NL', name: 'Holanda (Netherlands)' },
  { code: 'BE', name: 'Bélgica (Belgium)' },
  { code: 'AT', name: 'Áustria (Austria)' },
  { code: 'IE', name: 'Irlanda (Ireland)' },
  { code: 'GB', name: 'Reino Unido (United Kingdom)' }, // Non-EU but Europe
  { code: 'CH', name: 'Suíça (Switzerland)' },
];

const COUNTRY_PHONE_CODES: Record<string, string> = {
  LU: '+352',
  DE: '+49',
  FR: '+33',
  ES: '+34',
  PT: '+351',
  IT: '+39',
  NL: '+31',
  BE: '+32',
  AT: '+43',
  IE: '+353',
  GB: '+44',
  CH: '+41',
  BR: '+55',
  US: '+1'
};

const COUNTRY_POSTAL_PREFIXES: Record<string, string> = {
  LU: 'L-',
  PT: '',
  DE: '',
  FR: '',
  ES: '',
  IT: '',
  NL: '',
  BE: '',
  AT: '',
  IE: '',
  GB: '',
  CH: '',
  BR: '',
  US: ''
};

const COUNTRY_POSTAL_PLACEHOLDERS: Record<string, string> = {
  LU: 'L-1234',
  PT: '1000-000',
  DE: '10115',
  FR: '75001',
  ES: '28001',
  IT: '00100',
  NL: '1012 AB',
  BE: '1000',
  AT: '1010',
  IE: 'D02 X285',
  GB: 'SW1A 1AA',
  CH: '8001',
  BR: '01001-000',
  US: '90210'
};

export default function RegisterPage() {
  const t = useTranslations('Register');
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form States
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    country: '',
    postalCode: '',
    address: '', 
    city: '',    
    email: '',
    phone: '',
    password: '',
    mainCurrency: 'EUR',
    language: 'pt' // Default language
  });

  // Password Strength Calculation
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  useEffect(() => {
    let score = 0;
    if (formData.password.length >= 8) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/[0-9]/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;
    setPasswordStrength(score);
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-update phone prefix and postal code when country changes
    if (name === 'country') {
      const phonePrefix = COUNTRY_PHONE_CODES[value] || '';
      const postalPrefix = COUNTRY_POSTAL_PREFIXES[value] || '';
      
      setFormData(prev => ({ 
        ...prev, 
        country: value,
        phone: phonePrefix,
        postalCode: postalPrefix 
      }));
    } else if (name === 'language') {
      // Switch locale immediately when language changes
      setFormData(prev => ({ ...prev, language: value }));
      router.replace(pathname, { locale: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare data for API (match schema)
      const apiData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        country: formData.country,
        mainCurrency: formData.mainCurrency,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        language: formData.language
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(apiData),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha no registro');
      }
      
      if (data.requireVerification) {
        router.push(`/verify?email=${encodeURIComponent(formData.email)}`);
      } else {
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        // @ts-ignore
        const message = err.errors[0]?.message || "Erro de validação";
        setError(message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-6">
            <Logo showText={false} className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl text-center font-bold text-gray-900">{t('title')}</CardTitle>
          <CardDescription className="text-center text-gray-500">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-700">{t('firstName')}</Label>
                <Input 
                  id="firstName" 
                  name="firstName" 
                  placeholder="" 
                  required 
                  value={formData.firstName}
                  onChange={handleChange}
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-700">{t('lastName')}</Label>
                <Input 
                  id="lastName" 
                  name="lastName" 
                  placeholder="" 
                  required 
                  value={formData.lastName}
                  onChange={handleChange}
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country" className="text-gray-700">{t('country')}</Label>
                <select 
                  id="country" 
                  name="country" 
                  required 
                  value={formData.country}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                >
                  <option value="" disabled>Selecione</option>
                  <optgroup label="Europa (Prioritários)">
                    {EUROPEAN_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Outros">
                    <option value="BR">Brasil</option>
                    <option value="US">Estados Unidos</option>
                  </optgroup>
                </select>
              </div>
            </div>
            
            {/* Postal Code & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-gray-700">{t('postalCode')}</Label>
                <Input 
                  id="postalCode" 
                  name="postalCode" 
                  placeholder={COUNTRY_POSTAL_PLACEHOLDERS[formData.country] || 'ZIP Code'} 
                  required 
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="text-gray-700">{t('language')}</Label>
                <select 
                  id="language" 
                  name="language" 
                  value={formData.language}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>

            {/* Address & City */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-700">{t('address')}</Label>
                <Input 
                  id="address" 
                  name="address" 
                  placeholder="" 
                  value={formData.address}
                  onChange={handleChange}
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-700">{t('city')}</Label>
                <Input 
                  id="city" 
                  name="city" 
                  placeholder="" 
                  value={formData.city}
                  onChange={handleChange}
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">{t('email')}</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="" 
                required 
                value={formData.email}
                onChange={handleChange}
                className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700">{t('phone')}</Label>
              <Input 
                id="phone" 
                name="phone" 
                type="tel" 
                placeholder="+352 691 123 456" 
                required 
                value={formData.phone}
                onChange={handleChange}
                className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">{t('password')}</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                value={formData.password}
                onChange={handleChange}
                className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
              />
              {/* Password Strength Meter */}
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1 mt-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength >= level 
                            ? (passwordStrength <= 2 ? 'bg-red-500' : passwordStrength === 3 ? 'bg-yellow-500' : 'bg-emerald-500') 
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-right text-gray-500">
                    {passwordStrength < 2 ? t('passwordStrength.weak') : passwordStrength < 4 ? t('passwordStrength.medium') : t('passwordStrength.strong')}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainCurrency" className="text-gray-700">{t('mainCurrency')}</Label>
              <select 
                id="mainCurrency" 
                name="mainCurrency" 
                value={formData.mainCurrency}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                required
              >
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dólar Americano)</option>
                <option value="BRL">BRL (Real Brasileiro)</option>
              </select>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <Button className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold h-11 shadow-sm" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            {t.rich('loginLink', {
              link: (chunks) => <Link href="/login" className="text-[var(--color-primary)] hover:underline font-medium">{chunks}</Link>
            })}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
