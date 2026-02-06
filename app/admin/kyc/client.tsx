'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface UserWithKYC {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  kycDocuments: {
    id: string;
    documentType: string | null;
    documentNumber: string;
    issuingCountry: string;
    frontImageUrl: string | null;
    backImageUrl: string | null;
    selfieUrl: string | null;
    createdAt: Date;
  }[];
}

export default function AdminKYCClient({ users }: { users: UserWithKYC[] }) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserWithKYC | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleAction = async (userId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/kyc/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, action })
      });
      
      if (res.ok) {
        setSelectedUser(null);
        router.refresh(); // Reload server data
      } else {
        alert('Erro ao processar');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão');
    } finally {
      setProcessing(false);
    }
  };

  if (users.length === 0) {
    return (
        <Card>
            <CardContent className="pt-6 text-center text-gray-500">
                Nenhuma solicitação de KYC pendente.
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Solicitações Pendentes ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.kycDocuments[0]?.createdAt 
                        ? new Date(user.kycDocuments[0].createdAt).toLocaleDateString() 
                        : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Analisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análise de KYC: {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
            <DialogDescription>
                Revise os documentos abaixo cuidadosamente.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && selectedUser.kycDocuments[0] && (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-semibold">Tipo:</span> {selectedUser.kycDocuments[0].documentType}
                    </div>
                    <div>
                        <span className="font-semibold">Número:</span> {selectedUser.kycDocuments[0].documentNumber}
                    </div>
                    <div>
                        <span className="font-semibold">País:</span> {selectedUser.kycDocuments[0].issuingCountry}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <p className="font-medium text-center">Frente</p>
                        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                             {selectedUser.kycDocuments[0].frontImageUrl ? (
                               <Image 
                                  src={selectedUser.kycDocuments[0].frontImageUrl} 
                                  alt="Frente" 
                                  fill 
                                  className="object-contain"
                                  unoptimized
                               />
                             ) : (
                               <div className="flex items-center justify-center h-full text-gray-400">Sem imagem</div>
                             )}
                        </div>
                    </div>
                    {selectedUser.kycDocuments[0].backImageUrl && (
                        <div className="space-y-2">
                            <p className="font-medium text-center">Verso</p>
                            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                                <Image 
                                    src={selectedUser.kycDocuments[0].backImageUrl} 
                                    alt="Verso" 
                                    fill 
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </div>
                    )}
                    {selectedUser.kycDocuments[0].selfieUrl && (
                        <div className="space-y-2">
                            <p className="font-medium text-center">Selfie</p>
                            <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border">
                                <Image 
                                    src={selectedUser.kycDocuments[0].selfieUrl} 
                                    alt="Selfie" 
                                    fill 
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button 
                        variant="destructive" 
                        onClick={() => handleAction(selectedUser.id, 'REJECT')}
                        disabled={processing}
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <XCircle className="w-4 h-4 mr-2"/>}
                        Rejeitar
                    </Button>
                    <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAction(selectedUser.id, 'APPROVE')}
                        disabled={processing}
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2"/>}
                        Aprovar
                    </Button>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
