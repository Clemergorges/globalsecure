'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Search } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // TopUp State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupCurrency, setTopupCurrency] = useState('EUR');
  const [topupLoading, setTopupLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setTopupLoading(true);

    try {
      const res = await fetch('/api/admin/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseFloat(topupAmount),
          currency: topupCurrency
        })
      });

      if (!res.ok) throw new Error('Falha no depósito');

      toast({ title: 'Sucesso', description: 'Depósito realizado com sucesso' });
      setTopupAmount('');
      setSelectedUser(null);
      fetchUsers(); // Refresh
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao realizar depósito', variant: 'destructive' });
    } finally {
      setTopupLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Buscar por email ou nome..." 
            className="w-64"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead>Saldos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.country || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>{user.wallet?.primaryCurrency || 'USD'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {user.wallet?.balances.map((b: any) => (
                        <span key={b.currency}>{b.currency} {parseFloat(b.amount).toFixed(2)}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedUser(user);
                          setTopupCurrency(user.wallet?.primaryCurrency || 'EUR');
                        }}>
                          <PlusCircle className="w-4 h-4 mr-1" /> Add Saldo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Saldo para {user.firstName}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleTopup} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Valor</Label>
                            <Input 
                              type="number" 
                              value={topupAmount}
                              onChange={e => setTopupAmount(e.target.value)}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Moeda</Label>
                            <Select value={topupCurrency} onValueChange={setTopupCurrency}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="BRL">BRL</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full" disabled={topupLoading}>
                            {topupLoading ? <Loader2 className="animate-spin" /> : 'Confirmar Depósito'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}