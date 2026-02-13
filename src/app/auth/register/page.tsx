
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, AlertCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: 'BR',
    mainCurrency: 'BRL',
    gdprConsent: false,
    cookieConsent: false,
    marketingConsent: false
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (!formData.gdprConsent || !formData.cookieConsent) {
      setError('Você precisa aceitar os termos obrigatórios')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          country: formData.country,
          mainCurrency: formData.mainCurrency,
          gdprConsent: formData.gdprConsent,
          cookieConsent: formData.cookieConsent,
          marketingConsent: formData.marketingConsent,
          language: 'pt-BR' // Default
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao criar conta')
      }

      // Redirecionar para login ou verificação de email
      router.push('/auth/login?registered=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
        <CardDescription className="text-center">
          Comece a usar o GlobalSecure hoje mesmo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/10 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Ex: João Silva"
              required
              value={formData.fullName}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+55 11 99999-9999"
              required
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Select 
                name="country" 
                value={formData.country} 
                onValueChange={(val) => handleSelectChange('country', val)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="US">Estados Unidos</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="DE">Alemanha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mainCurrency">Moeda</Label>
              <Select 
                name="mainCurrency" 
                value={formData.mainCurrency} 
                onValueChange={(val) => handleSelectChange('mainCurrency', val)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="gdprConsent" 
                checked={formData.gdprConsent}
                onCheckedChange={(checked) => handleCheckboxChange('gdprConsent', checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="gdprConsent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Concordo com o processamento dos meus dados (GDPR/LGPD) *
                </Label>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="cookieConsent" 
                checked={formData.cookieConsent}
                onCheckedChange={(checked) => handleCheckboxChange('cookieConsent', checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="cookieConsent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Aceito o uso de cookies essenciais *
                </Label>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="marketingConsent" 
                checked={formData.marketingConsent}
                onCheckedChange={(checked) => handleCheckboxChange('marketingConsent', checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="marketingConsent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Gostaria de receber novidades e ofertas (Opcional)
                </Label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando Conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          Já tem uma conta?{' '}
          <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-500">
            Fazer Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
