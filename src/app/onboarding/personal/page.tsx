
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

const personalSchema = z.object({
  firstName: z.string().min(2, "Nome obrigatório"),
  lastName: z.string().min(2, "Sobrenome obrigatório"),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18;
  }, { message: "Você deve ter pelo menos 18 anos" }),
  countryOfBirth: z.string().length(2, "Selecione o país"),
  nationality: z.string().length(2, "Selecione a nacionalidade"),
  phone: z.string().min(8, "Telefone inválido"),
});

type PersonalFormValues = z.infer<typeof personalSchema>;

export default function PersonalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
  });

  const { register, handleSubmit, formState: { errors }, setValue } = form;

  const onSubmit = async (data: PersonalFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Falha ao salvar dados');

      router.push('/onboarding/address');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#111116] border-white/10">
      <CardHeader>
        <CardTitle className="text-xl text-white">Dados Pessoais</CardTitle>
        <CardDescription className="text-slate-400">
          Precisamos conhecer você para cumprir regulações financeiras.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome</Label>
              <Input {...register('firstName')} className="bg-white/5 border-white/10 text-white" />
              {errors.firstName && <p className="text-xs text-red-400">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Sobrenome</Label>
              <Input {...register('lastName')} className="bg-white/5 border-white/10 text-white" />
              {errors.lastName && <p className="text-xs text-red-400">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Data de Nascimento</Label>
            <Input type="date" {...register('dateOfBirth')} className="bg-white/5 border-white/10 text-white" />
            {errors.dateOfBirth && <p className="text-xs text-red-400">{errors.dateOfBirth.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">País de Nascimento</Label>
              <Select onValueChange={(val) => setValue('countryOfBirth', val)}>
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
              {errors.countryOfBirth && <p className="text-xs text-red-400">{errors.countryOfBirth.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Nacionalidade</Label>
              <Select onValueChange={(val) => setValue('nationality', val)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="BR">Brasileira</SelectItem>
                  <SelectItem value="US">Americana</SelectItem>
                  <SelectItem value="LU">Luxemburguesa</SelectItem>
                  <SelectItem value="PT">Portuguesa</SelectItem>
                </SelectContent>
              </Select>
              {errors.nationality && <p className="text-xs text-red-400">{errors.nationality.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Celular</Label>
            <Input {...register('phone')} placeholder="+55..." className="bg-white/5 border-white/10 text-white" />
            {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black mt-6">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span className="flex items-center">Próximo <ArrowRight className="w-4 h-4 ml-2" /></span>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
