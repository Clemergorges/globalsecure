
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Log = {
  id: string;
  action: string;
  status: string;
  method: string;
  path: string;
  ipAddress: string;
  duration: number;
  createdAt: string;
  user?: {
    email: string;
  };
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getStatusColor = (status: string) => {
    if (status.startsWith('2')) return 'bg-green-100 text-green-800';
    if (status.startsWith('4')) return 'bg-yellow-100 text-yellow-800';
    if (status.startsWith('5')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <Button onClick={fetchLogs} variant="outline">Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.user?.email || 'Anonymous'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.method} {log.path}</TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                    <TableCell>{log.duration}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-2">
          <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
