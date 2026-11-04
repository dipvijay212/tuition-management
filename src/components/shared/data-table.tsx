import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Pagination } from "./pagination";
import { EmptyState } from "./states";

export type Column<T> = { key: string; header: React.ReactNode; cell: (row: T) => React.ReactNode; className?: string; hideOnMobile?: boolean };

/** Server-rendered table. Data is already filtered/paginated on the server. */
export function DataTable<T>({ columns, rows, rowKey, total, page, pageSize, empty, footer }: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; total?: number; page?: number; pageSize?: number;
  empty?: { title: string; description?: string; action?: React.ReactNode }; footer?: React.ReactNode;
}) {
  if (rows.length === 0 && empty) return <EmptyState {...empty} />;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((c) => <TableHead key={c.key} className={cn("h-11 text-xs font-medium tracking-wide text-muted-foreground uppercase", c.hideOnMobile && "hidden md:table-cell", c.className)}>{c.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={rowKey(r)}>
                {columns.map((c) => <TableCell key={c.key} className={cn("py-3", c.hideOnMobile && "hidden md:table-cell", c.className)}>{c.cell(r)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
          {footer}
        </Table>
      </div>
      {total !== undefined && page !== undefined && pageSize !== undefined && total > 0 && (
        <div className="border-t px-4 py-3"><Pagination total={total} page={page} pageSize={pageSize} /></div>
      )}
    </div>
  );
}
