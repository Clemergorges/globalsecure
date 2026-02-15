
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';

const addressSchema = z.object({
  streetLine1: z.string().min(5, "Endereço inválido"),
  streetLine2: z.string().optional(),
  city: z.string().min(2, "Cidade obrigatória"),
  postalCode: z.string().min(4, "CEP/Código Postal obrigatório"),
  region: z.string().optional(),
  country: z.string().length(2, "Selecione o país"),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export default function AddressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: 'BR'
    }
  });

  const { register, handleSubmit, formState: { errors }, setValue } = form;

  const onSubmit = async (data: AddressFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Falha ao salvar endereço');

      router.push('/onboarding/document');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Verifique o endereço e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#111116] border-white/10">
      <CardHeader>
        <CardTitle className="text-xl text-white">Endereço Residencial</CardTitle>
        <CardDescription className="text-slate-400">
          Onde você mora atualmente?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Rua, Número</Label>
            <Input {...register('streetLine1')} className="bg-white/5 border-white/10 text-white" />
            {errors.streetLine1 && <p className="text-xs text-red-400">{errors.streetLine1.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Complemento (Opcional)</Label>
            <Input {...register('streetLine2')} placeholder="Apto, Bloco, etc." className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Cidade</Label>
              <Input {...register('city')} className="bg-white/5 border-white/10 text-white" />
              {errors.city && <p className="text-xs text-red-400">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Código Postal / CEP</Label>
              <Input {...register('postalCode')} className="bg-white/5 border-white/10 text-white" />
              {errors.postalCode && <p className="text-xs text-red-400">{errors.postalCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Estado / Região</Label>
              <Input {...register('region')} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">País</Label>
              <Select onValueChange={(val) => setValue('country', val)} defaultValue="BR">
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="US">Estados Unidos</SelectItem>
                  <SelectItem value="LU">Luxemburgo</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-red-400">{errors.country.message}</p>}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black mt-6">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span className="flex items-center">Próximo <ArrowRight className="w-4 h-4 ml-2" /></span>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
