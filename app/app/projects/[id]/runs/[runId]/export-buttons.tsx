'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { exportRunAsJSON, exportRunAsCSV } from '@/app/actions/runs';
import { Download } from 'lucide-react';

interface ExportButtonsProps {
  runId: string;
}

export function ExportButtons({ runId }: ExportButtonsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExportJSON = async () => {
    setLoading(true);
    const result = await exportRunAsJSON(runId);

    if (result.error) {
      toast({
        title: 'Export failed',
        description: result.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Download JSON
    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-${runId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported!',
      description: 'JSON file downloaded',
    });
    setLoading(false);
  };

  const handleExportCSV = async () => {
    setLoading(true);
    const result = await exportRunAsCSV(runId);

    if (result.error) {
      toast({
        title: 'Export failed',
        description: result.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Download CSV
    const blob = new Blob([result.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || `content-${runId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported!',
      description: 'CSV file downloaded',
    });
    setLoading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportJSON}>
          Download JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          Download CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
