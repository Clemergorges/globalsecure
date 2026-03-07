
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ShieldAlert, Info, CheckCircle } from 'lucide-react';

export default async function AlertsPage() {
  await checkAdmin();

  const alerts = await prisma.auditLog.findMany({
    where: {
      action: { startsWith: 'ALERT_' }
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: true }
  });

  const getSeverityColor = (action: string) => {
    if (action.includes('CRITICAL') || action.includes('BLOCKER')) return 'destructive';
    if (action.includes('WARNING')) return 'warning'; // Custom or yellow
    return 'default';
  };

  const getIcon = (action: string) => {
    if (action.includes('CRITICAL')) return <ShieldAlert className="w-4 h-4 text-red-500" />;
    if (action.includes('WARNING')) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Security Alerts</h1>
        <Badge variant="outline" className="text-sm">Real-time Monitoring</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => {
                const metadata = alert.metadata as any;
                return (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {getIcon(alert.action)}
                      {alert.action.replace('ALERT_', '')}
                    </TableCell>
                    <TableCell>{metadata?.source || 'SYSTEM'}</TableCell>
                    <TableCell className="max-w-md truncate" title={metadata?.message}>
                      {metadata?.message || 'No message'}
                    </TableCell>
                    <TableCell>
                      {alert.user ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{alert.user.email}</span>
                          <span className="text-[10px] text-gray-500">{alert.user.id}</span>
                        </div>
                      ) : 'System'}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(alert.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    No security alerts found. System is healthy.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
