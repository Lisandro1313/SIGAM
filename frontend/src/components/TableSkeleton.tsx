import { TableRow, TableCell, Skeleton } from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  columns: number;
}

export default function TableSkeleton({ rows = 5, columns }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton variant="text" width={c === 0 ? '60%' : '80%'} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
